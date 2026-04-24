import { useState, useEffect, useRef } from "react";

const PRESETS = {
  standard: { work: 25, shortBreak: 5,  longBreak: 15, longBreakEvery: 4 },
  beast:    { work: 0,  shortBreak: 0,  longBreak: 0,  longBreakEvery: 0 },
};

const BLOCK_LABELS = {
  work:       "trabajo",
  shortBreak: "descanso corto",
  longBreak:  "descanso largo",
};

function buildSequence(plan, cfg) {
  if (cfg.preset === "beast") {
    return plan.map(t => ({ type: "work", task: t.name, duration: t.minutes * 60 }));
  }
  const workSec = cfg.work * 60;
  const sbSec   = cfg.shortBreak * 60;
  const lbSec   = cfg.longBreak  * 60;
  const blocks  = [];

  for (const t of plan) {
    let rem = t.minutes * 60;
    while (rem > 0) {
      const dur = workSec > 0 ? Math.min(rem, workSec) : rem;
      blocks.push({ type: "work", task: t.name, duration: dur });
      rem -= dur;
      if (workSec <= 0) break;
    }
  }

  const seq = [];
  for (let i = 0; i < blocks.length; i++) {
    seq.push(blocks[i]);
    if (i < blocks.length - 1) {
      const n = i + 1;
      if (cfg.longBreakEvery > 0 && n % cfg.longBreakEvery === 0 && lbSec > 0)
        seq.push({ type: "longBreak",  task: null, duration: lbSec });
      else if (sbSec > 0)
        seq.push({ type: "shortBreak", task: null, duration: sbSec });
    }
  }
  return seq;
}

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function PomodoroView({ plan, planHistory = [], onLoadPlan, onDeleteEntry, th }) {
  const [preset, setPreset]     = useState("standard");
  const [cfg, setCfg]           = useState({ preset: "standard", ...PRESETS.standard });
  const [seq, setSeq]           = useState([]);
  const [cur, setCur]           = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning]   = useState(false);

  const stateRef = useRef({ seq: [], cur: 0, timeLeft: 0 });
  stateRef.current = { seq, cur, timeLeft };

  const block  = seq[cur];
  const isWork = block?.type === "work";
  const pct    = block ? ((block.duration - timeLeft) / block.duration) * 100 : 0;

  // Pedir permiso de notificaciones al montar
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Título de pestaña
  useEffect(() => {
    if (!block) return;
    const emoji = running ? (block.type === "work" ? "🍅" : "☕") : "⏸";
    const label = block.task ?? BLOCK_LABELS[block.type];
    document.title = `${emoji} ${fmt(timeLeft)} — ${label}`;
  }, [timeLeft, running, block]);

  useEffect(() => {
    const s = buildSequence(plan, cfg);
    setSeq(s);
    setCur(0);
    setRunning(false);
    setTimeLeft(s[0]?.duration ?? 0);
  }, [plan, cfg]);

  function notify(block) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const isWork = block.type === "work";
    new Notification(isWork ? "¡A trabajar! 🍅" : "¡Descansa! ☕", {
      body: isWork ? block.task : BLOCK_LABELS[block.type],
      icon: "/favicon.svg",
    });
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t > 1) return t - 1;
        const { seq: s, cur: c } = stateRef.current;
        const next = c + 1;
        if (next < s.length) {
          notify(s[next]);
          setCur(next);
          return s[next].duration;
        }
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("¡Plan completado! 🎉", { icon: "/favicon.svg" });
        }
        setRunning(false);
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!plan.length) {
    return (
      <div className="space-y-4">
        <div className={`border ${th.border} rounded-2xl ${th.surface} p-8 text-center`}>
          <p className={`text-sm font-mono ${th.textMuted}`}>
            genera un plan primero para usar el pomodoro
          </p>
        </div>
        {planHistory.length > 0 && (
          <HistorialSection planHistory={planHistory} onLoadPlan={onLoadPlan} onDeleteEntry={onDeleteEntry} th={th} />
        )}
      </div>
    );
  }

  function goTo(i) {
    setCur(i);
    setTimeLeft(seq[i].duration);
    setRunning(false);
  }

  function changePreset(p) {
    setPreset(p);
    if (p !== "custom") setCfg({ preset: p, ...PRESETS[p] });
    else setCfg(c => ({ ...c, preset: "custom" }));
  }

  return (
    <div className="space-y-4">

      {/* Modo */}
      <section className={`border rounded-2xl ${th.surface} shadow-sm overflow-hidden transition-all duration-500 ${running ? "max-h-0 p-0 opacity-0 border-transparent" : `max-h-[32rem] p-5 opacity-100 ${th.border}`}`}>
        <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-3`}>Modo</h2>
        <div>
        <div className="flex gap-2 mb-4">
          {[["standard","Estándar"],["beast","⚡ Bestia"],["custom","Custom"]].map(([k, l]) => (
            <button key={k} onClick={() => changePreset(k)}
              className={`flex-1 text-xs font-mono py-1.5 rounded-lg border transition-colors ${
                preset === k
                  ? "bg-amber-400 text-zinc-950 border-amber-400 font-bold"
                  : `${th.toggleBorder} ${th.textToggle}`
              }`}
            >{l}</button>
          ))}
        </div>

        {preset !== "beast" && (
          <div className="space-y-3">
            {[
              ["Trabajo (min)",        "work",          1, 120],
              ["Descanso corto (min)", "shortBreak",    0,  30],
              ["Descanso largo (min)", "longBreak",     0,  60],
              ["Desc. largo cada N",   "longBreakEvery",1,  10],
            ].map(([label, key, min, max]) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className={`text-xs font-mono ${th.textLabel}`}>{label}</span>
                  <span className={`text-xs font-mono ${th.textAccent}`}>{cfg[key]}</span>
                </div>
                <input type="range" min={min} max={max} value={cfg[key]}
                  onChange={e => {
                    setPreset("custom");
                    setCfg(c => ({ ...c, preset: "custom", [key]: Number(e.target.value) }));
                  }}
                  className="w-full accent-amber-400"
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </section>

      {/* Timer */}
      <section className={`border ${th.planBorder} rounded-2xl ${th.planBg} p-6 text-center`}>
        <p className={`text-xs font-mono ${th.textMuted} uppercase tracking-widest mb-1`}>
          {BLOCK_LABELS[block?.type]} · {cur + 1} / {seq.length}
        </p>
        <p className={`text-sm font-semibold ${th.text} mb-5 truncate px-4`}>
          {block?.task ?? "—"}
        </p>

        <div className="font-mono text-7xl font-bold text-amber-400 tabular-nums tracking-widest mb-5">
          {fmt(timeLeft)}
        </div>

        <div className={`w-full h-1.5 ${th.planBarBg} rounded-full overflow-hidden mb-6`}>
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isWork
                ? "bg-gradient-to-r from-amber-500 to-amber-300"
                : "bg-gradient-to-r from-emerald-500 to-emerald-300"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={() => goTo(Math.max(0, cur - 1))} disabled={cur === 0}
            className={`w-10 h-10 rounded-xl border ${th.toggleBorder} ${th.textToggle} disabled:opacity-30 transition-colors`}>
            ◀
          </button>
          <button onClick={() => setRunning(v => !v)}
            className="w-14 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold text-xl transition-all">
            {running ? "⏸" : "▶"}
          </button>
          <button onClick={() => goTo(Math.min(seq.length - 1, cur + 1))} disabled={cur === seq.length - 1}
            className={`w-10 h-10 rounded-xl border ${th.toggleBorder} ${th.textToggle} disabled:opacity-30 transition-colors`}>
            ▶
          </button>
        </div>
      </section>

      {/* Secuencia */}
      <section className={`border ${th.border} rounded-2xl ${th.surface} p-4`}>
        <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-3`}>Secuencia</h2>
        <div className="flex flex-wrap gap-1.5 items-center">
          {seq.map((b, i) => (
            <button key={i} onClick={() => goTo(i)}
              title={b.task ?? BLOCK_LABELS[b.type]}
              className={`rounded-full transition-all duration-200 ${
                i === cur ? "w-6 h-3 opacity-100" : "w-2 h-2 opacity-40 hover:opacity-75"
              } ${b.type === "work" ? "bg-amber-400" : "bg-emerald-400"}`}
            />
          ))}
        </div>
      </section>

      {/* Historial */}
      {planHistory.length > 0 && (
        <HistorialSection planHistory={planHistory} onLoadPlan={onLoadPlan} onDeleteEntry={onDeleteEntry} th={th} />
      )}

    </div>
  );
}

function HistorialSection({ planHistory, onLoadPlan, onDeleteEntry, th }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between">
        <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>
          Historial <span className={th.textAccent}>{planHistory.length}</span>
        </h2>
        <span className={`text-xs font-mono ${th.textMuted}`}>{open ? "▲ ocultar" : "▼ ver"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {planHistory.map(entry => {
            const date = new Date(entry.savedAt);
            const label = date.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
            const time  = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={entry.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${th.taskNormal} hover:border-amber-400/40 transition-colors`}>
                <button onClick={() => onLoadPlan?.(entry.plan)} className="flex-1 text-left flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-semibold ${th.text}`}>
                      {entry.plan.at(-1)?.name} — {label} · {time}
                    </span>
                    <div className={`text-xs font-mono ${th.textMuted} mt-0.5`}>
                      {entry.taskCount} tareas · {(entry.totalMinutes / 60).toFixed(1)}h
                    </div>
                  </div>
                  <span className={`text-xs font-mono ${th.textAccent} mr-2`}>cargar →</span>
                </button>
                <button
                  onClick={() => onDeleteEntry?.(entry.id)}
                  className={`${th.deleteBtn} text-lg leading-none flex-shrink-0`}
                  aria-label="Eliminar entrada"
                >×</button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
