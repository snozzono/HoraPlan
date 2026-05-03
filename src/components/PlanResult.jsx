import { useState } from "react";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildCanvas(plan, dark, T) {
  const W       = 800;
  const PAD     = 40;
  const ROW     = 72;
  const HEADER  = 72;
  const FOOTER  = 40;
  const H       = HEADER + plan.length * ROW + FOOTER + PAD;
  const DPR     = 2;

  const canvas  = document.createElement("canvas");
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx     = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  const BG      = dark ? "#18181b" : "#f4f4f5";
  const FG      = dark ? "#fafafa" : "#18181b";
  const MUTED   = dark ? "#71717a" : "#a1a1aa";
  const BAR_BG  = dark ? "#3f3f46" : "#e4e4e7";
  const MONO    = "'IBM Plex Mono', 'Courier New', monospace";

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const totalMin = plan.reduce((s, t) => s + t.minutes, 0);

  ctx.fillStyle = "#f59e0b";
  ctx.font      = `bold 20px ${MONO}`;
  ctx.fillText("HORAPLAN", PAD, PAD + 20);

  ctx.fillStyle = MUTED;
  ctx.font      = `12px ${MONO}`;
  ctx.fillText(T.canvasSubtitle((totalMin / 60).toFixed(1)), PAD, PAD + 44);

  plan.forEach((item, i) => {
    const y = HEADER + PAD + i * ROW;

    ctx.fillStyle = FG;
    ctx.font      = `600 13px ${MONO}`;
    ctx.fillText(item.name, PAD, y + 14);

    ctx.fillStyle = "#f59e0b";
    ctx.font      = `12px ${MONO}`;
    const minLabel = `${item.minutes} min`;
    const minW     = ctx.measureText(minLabel).width;
    ctx.fillText(minLabel, W - PAD - minW, y + 14);

    const barY = y + 22;
    const barW = W - PAD * 2;
    ctx.fillStyle = BAR_BG;
    roundRect(ctx, PAD, barY, barW, 6, 3);
    ctx.fill();

    const fill = (item.minutes / totalMin) * barW;
    const grad = ctx.createLinearGradient(PAD, 0, PAD + fill, 0);
    grad.addColorStop(0, "#f59e0b");
    grad.addColorStop(1, "#fcd34d");
    ctx.fillStyle = grad;
    roundRect(ctx, PAD, barY, fill, 6, 3);
    ctx.fill();

    ctx.fillStyle = MUTED;
    ctx.font      = `11px ${MONO}`;
    const deadline = item.deadline
      ? ` · ${new Date(item.deadline).toLocaleDateString(T.dateLocale, { weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit" })}`
      : "";
    ctx.fillText(`${item.timeLeft}${T.canvasUntilDeadline}${deadline}`, PAD, y + 52);
  });

  ctx.fillStyle = MUTED;
  ctx.font      = `11px ${MONO}`;
  const foot    = "horaplan — snozz";
  ctx.fillText(foot, W - PAD - ctx.measureText(foot).width, H - 12);

  return canvas;
}

export default function PlanResult({ plan, onPlanChange, onEditTask, th, dark, onPomodoro, T }) {
  if (!plan.length) return null;

  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const totalMin = plan.reduce((s, t) => s + t.minutes, 0);

  function startEdit(i) {
    setEditIdx(i);
    setEditVal(String(plan[i].minutes));
  }

  function commitEdit(i) {
    const mins = Math.max(5, Math.round(Number(editVal) / 5) * 5);
    onPlanChange(i, mins);
    setEditIdx(null);
  }

  function handleDownload() {
    const canvas = buildCanvas(plan, dark, T);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "horaplan.png";
    a.click();
  }

  async function handleShare() {
    const canvas = buildCanvas(plan, dark, T);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "horaplan.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: T.myPlanShare });
      } else {
        await navigator.clipboard.writeText(
          plan.map(t => `${t.name}: ${t.minutes} min`).join("\n")
        );
        alert(T.copiedClipboard);
      }
    }, "image/png");
  }

  return (
    <div className={`border ${th.planBorder} rounded-2xl ${th.planBg} p-5 mt-4`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>
          {T.planGenerated}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${th.textSub}`}>
            {(totalMin / 60).toFixed(1)}h total
          </span>
          <button
            onClick={handleDownload}
            title={T.downloadTitle}
            className={`text-xs font-mono border ${th.toggleBorder} ${th.textToggle} px-2 py-1 rounded-lg transition-colors hover:bg-amber-400/10`}
          >
            ↓ png
          </button>
          <button
            onClick={handleShare}
            title={T.shareTitle}
            className={`text-xs font-mono border ${th.toggleBorder} ${th.textToggle} px-2 py-1 rounded-lg transition-colors hover:bg-amber-400/10`}
          >
            {T.shareBtn}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {plan.map((item, i) => {
          const widthPct = Math.round((item.minutes / totalMin) * 100);
          return (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-1">
                <button
                  onClick={() => onEditTask?.(item.name)}
                  className={`text-sm font-semibold ${th.text} text-left hover:underline underline-offset-2`}
                >{item.name}</button>
                {editIdx === i ? (
                  <input
                    type="number"
                    min={5} step={5}
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={() => commitEdit(i)}
                    onKeyDown={e => { if (e.key === "Enter") commitEdit(i); if (e.key === "Escape") setEditIdx(null); }}
                    autoFocus
                    className={`w-16 text-right text-xs font-mono bg-transparent border-b border-amber-400 outline-none ${th.textAccentSoft}`}
                  />
                ) : (
                  <button
                    onClick={() => startEdit(i)}
                    className={`text-xs font-mono ${th.textAccentSoft} hover:underline underline-offset-2`}
                  >
                    {item.minutes} min
                  </button>
                )}
              </div>
              <div className={`w-full h-2 ${th.planBarBg} rounded-full overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className={`flex gap-3 mt-1 text-xs font-mono ${th.textMuted}`}>
                <span>{T.priority} {item.priority === Infinity ? "∞" : item.priority.toFixed(2)}</span>
                <span>·</span>
                <span>
                  {item.timeLeft}h
                  {item.deadline && ` (${new Date(item.deadline).toLocaleDateString(T.dateLocale, { weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit" })})`}
                  {" "}{T.untilDeadline}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={onPomodoro}
          className={`text-xs font-mono border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-400/10`}
        >
          {T.startPomodoro}
        </button>
      </div>
    </div>
  );
}
