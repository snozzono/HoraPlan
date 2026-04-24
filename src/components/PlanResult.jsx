/**
 * PlanResult.jsx
 * Muestra el plan generado como barras proporcionales al tiempo asignado.
 * No renderiza nada si el plan está vacío.
 *
 * Props:
 *   plan {Array} - Resultado de calculatePlan():
 *                  [{ name, minutes, priority, anxiety, hours, timeLeft }]
 *   th   {object} - Tokens del tema activo (de themes.js)
 */
import { useRef, useState } from "react";
import html2canvas from "html2canvas";

async function captureNode(node, dark) {
  return html2canvas(node, {
    backgroundColor: dark ? "#18181b" : "#ffffff",
    scale: 2,
    useCORS: true,
  });
}

export default function PlanResult({ plan, onPlanChange, onEditTask, th, dark, onPomodoro }) {
  if (!plan.length) return null;

  const cardRef = useRef(null);
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

  async function handleDownload() {
    const canvas = await captureNode(cardRef.current, dark);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "horaplan.png";
    a.click();
  }

  async function handleShare() {
    const canvas = await captureNode(cardRef.current, dark);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "horaplan.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mi plan — HoraPlan" });
      } else {
        await navigator.clipboard.writeText(
          plan.map(t => `${t.name}: ${t.minutes} min`).join("\n")
        );
        alert("Copiado al portapapeles");
      }
    }, "image/png");
  }

  return (
    <div className={`border ${th.planBorder} rounded-2xl ${th.planBg} p-5 mt-4`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>
          Plan generado
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${th.textSub}`}>
            {(totalMin / 60).toFixed(1)}h total
          </span>
          <button
            onClick={handleDownload}
            title="Descargar PNG"
            className={`text-xs font-mono border ${th.toggleBorder} ${th.textToggle} px-2 py-1 rounded-lg transition-colors hover:bg-amber-400/10`}
          >
            ↓ png
          </button>
          <button
            onClick={handleShare}
            title="Compartir"
            className={`text-xs font-mono border ${th.toggleBorder} ${th.textToggle} px-2 py-1 rounded-lg transition-colors hover:bg-amber-400/10`}
          >
            ↑ compartir
          </button>
        </div>
      </div>

      <div ref={cardRef} className={`${th.planBg} rounded-xl p-1`}>
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
                  <span>prioridad {item.priority === Infinity ? "∞" : item.priority.toFixed(2)}</span>
                  <span>·</span>
                  <span>
                    {item.timeLeft}h
                    {item.deadline && ` (${new Date(item.deadline).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit" })})`}
                    {" "}hasta deadline
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={onPomodoro}
          className={`text-xs font-mono border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-400/10`}
        >
          🍅 iniciar pomodoro
        </button>
      </div>
    </div>
  );
}
