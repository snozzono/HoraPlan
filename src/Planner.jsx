import { useState, useEffect } from "react";

// ── Scheduler logic ──────────────────────────────────────────────────────────
function hoursUntil(deadline) {
  return (new Date(deadline) - new Date()) / (1000 * 60 * 60);
}
function calculatePriority(task) {
  const T = hoursUntil(task.deadline);
  if (T <= 0) return Infinity;
  return (task.anxiety * task.hours) / T * Math.log(task.hours + 1);
}
function roundMinutes(minutes) {
  if (minutes < 15) return 0;
  return Math.round(minutes / 5) * 5;
}
function calculatePlan(taskList, availableHours) {
  let weighted = taskList.map(t => ({ ...t, priority: calculatePriority(t) }));
  let total = weighted.reduce((s, t) => s + t.priority, 0);
  let remaining = availableHours * 60;
  let result = [];
  weighted.sort((a, b) => b.priority - a.priority).forEach(t => {
    if (remaining <= 0) return;
    let share = (t.priority / total) * (availableHours * 60);
    let minutes = Math.min(share, t.hours * 60);
    minutes = roundMinutes(minutes);
    if (minutes > 0) {
      result.push({ name: t.name, minutes, priority: t.priority, anxiety: t.anxiety, hours: t.hours, timeLeft: hoursUntil(t.deadline).toFixed(1) });
      remaining -= minutes;
    }
  });
  return result;
}
function randomTask() {
  const now = new Date();
  return {
    name: "Task_" + Math.floor(Math.random() * 100),
    hours: Math.floor(Math.random() * 10) + 1,
    anxiety: Math.floor(Math.random() * 100),
    deadline: new Date(now.getTime() + (Math.random() * 24 + 1) * 3600000).toISOString(),
  };
}

// ── Theme tokens ─────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:             "bg-zinc-950",
    surface:        "bg-zinc-900/40",
    surfaceHow:     "bg-zinc-900/60",
    surfaceFormula: "bg-zinc-950",
    surfaceStep:    "bg-zinc-800/50",
    surfaceDev:     "bg-zinc-900/20",
    border:         "border-zinc-800",
    borderStep:     "border-zinc-700/50",
    borderFormula:  "border-zinc-700",
    borderDevBtn:   "border-zinc-700 hover:border-zinc-600",
    divider:        "bg-zinc-800",
    text:           "text-zinc-100",
    textSub:        "text-stone-500",
    textMuted:      "text-zinc-600",
    textLabel:      "text-amber-400/70",
    textAccent:     "text-amber-400",
    textAccentSoft: "text-amber-300",
    textTaskName:   "text-zinc-100",
    textMeta:       "text-zinc-500",
    textAnxLabel:   "text-zinc-600",
    textAnxVal:     "text-zinc-500",
    textDevBtn:     "text-zinc-400 hover:text-zinc-200",
    textClear:      "text-zinc-600 hover:text-red-400",
    textToggle:     "text-zinc-500 hover:text-amber-400",
    inputBg:        "bg-zinc-800",
    inputBorder:    "border-zinc-700",
    inputText:      "text-zinc-100",
    inputPlaceholder: "placeholder-zinc-600",
    inputFocus:     "focus:border-amber-400/60",
    inputColorScheme: "[color-scheme:dark]",
    sliderEmpty:    "#3f3f46",
    sliderThumbBorder: "border-zinc-900",
    anxietyTrack:   "bg-zinc-700",
    planBg:         "bg-zinc-900/60",
    planBorder:     "border-amber-400/20",
    planBarBg:      "bg-zinc-800",
    howBorder:      "border-amber-400/20",
    taskNormal:     "border-zinc-700/50 bg-zinc-800/30",
    taskUrgent:     "border-orange-400/20 bg-orange-950/10",
    taskOverdue:    "border-red-500/30 bg-red-950/20",
    urgencyNormal:  "text-zinc-400",
    deleteBtn:      "text-zinc-600 hover:text-red-400",
    toggleBorder:   "border-zinc-700 hover:border-amber-400/40",
  },
  light: {
    bg:             "bg-stone-50",
    surface:        "bg-white",
    surfaceHow:     "bg-amber-50/70",
    surfaceFormula: "bg-amber-50",
    surfaceStep:    "bg-white",
    surfaceDev:     "bg-stone-100/60",
    border:         "border-stone-200",
    borderStep:     "border-stone-200",
    borderFormula:  "border-amber-200",
    borderDevBtn:   "border-stone-300 hover:border-stone-400",
    divider:        "bg-stone-200",
    text:           "text-stone-900",
    textSub:        "text-stone-500",
    textMuted:      "text-stone-400",
    textLabel:      "text-amber-600/80",
    textAccent:     "text-amber-600",
    textAccentSoft: "text-amber-500",
    textTaskName:   "text-stone-900",
    textMeta:       "text-stone-500",
    textAnxLabel:   "text-stone-400",
    textAnxVal:     "text-stone-500",
    textDevBtn:     "text-stone-500 hover:text-stone-800",
    textClear:      "text-stone-400 hover:text-red-500",
    textToggle:     "text-stone-500 hover:text-amber-600",
    inputBg:        "bg-white",
    inputBorder:    "border-stone-300",
    inputText:      "text-stone-900",
    inputPlaceholder: "placeholder-stone-400",
    inputFocus:     "focus:border-amber-400",
    inputColorScheme: "[color-scheme:light]",
    sliderEmpty:    "#d6d3d1",
    sliderThumbBorder: "border-white",
    anxietyTrack:   "bg-stone-200",
    planBg:         "bg-amber-50/60",
    planBorder:     "border-amber-300/50",
    planBarBg:      "bg-stone-200",
    howBorder:      "border-amber-300/50",
    taskNormal:     "border-stone-200 bg-stone-50/80",
    taskUrgent:     "border-orange-300/60 bg-orange-50",
    taskOverdue:    "border-red-300/60 bg-red-50",
    urgencyNormal:  "text-stone-400",
    deleteBtn:      "text-stone-300 hover:text-red-500",
    toggleBorder:   "border-stone-300 hover:border-amber-400/60",
  },
};

// ── Components ───────────────────────────────────────────────────────────────

function SliderField({ label, min, max, value, onChange, unit = "", th }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <label className={`text-xs font-mono ${th.textLabel} uppercase tracking-widest`}>{label}</label>
        <span className={`text-sm font-mono ${th.textAccentSoft} font-bold`}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-1 appearance-none rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-amber-400
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(251,191,36,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2
          ${th.sliderThumbBorder}`}
        style={{ background: `linear-gradient(to right, #f59e0b ${pct}%, ${th.sliderEmpty} ${pct}%)` }}
      />
    </div>
  );
}

function AnxietyBar({ value, th }) {
  const color = value < 33 ? "bg-emerald-500" : value < 66 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className={`w-full h-1 ${th.anxietyTrack} rounded-full overflow-hidden mt-1`}>
      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${value}%` }} />
    </div>
  );
}

function HowItWorksCard({ th }) {
  const steps = [
    { icon: "01", title: "Agrega tareas", desc: "Nombre, horas estimadas, nivel de ansiedad y deadline." },
    { icon: "02", title: "Define tu tiempo", desc: "Cuántas horas tienes disponibles hoy para estudiar." },
    { icon: "03", title: "Genera el plan", desc: "El algoritmo distribuye el tiempo según urgencia y ansiedad." },
  ];
  return (
    <div className={`border ${th.howBorder} rounded-2xl ${th.surfaceHow} p-5 mb-2`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>¿Cómo funciona?</span>
        <div className={`flex-1 h-px ${th.divider} opacity-40`} />
      </div>
      <div className={`${th.surfaceFormula} border ${th.borderFormula} rounded-xl p-3 mb-5 font-mono text-center`}>
        <div className={`text-xs ${th.textMuted} mb-1`}>prioridad =</div>
        <div className={`${th.textAccentSoft} text-sm`}>(ansiedad × horas) / T × ln(horas + 1)</div>
        <div className={`text-xs ${th.textMuted} mt-1`}>donde T = horas hasta el deadline</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map(s => (
          <div key={s.icon} className={`${th.surfaceStep} rounded-xl p-4 border ${th.borderStep} hover:border-amber-400/40 transition-colors shadow-sm`}>
            <div className={`text-2xl font-mono ${th.textAccent} opacity-30 font-bold mb-2`}>{s.icon}</div>
            <div className={`text-sm font-semibold ${th.text} mb-1`}>{s.title}</div>
            <div className={`text-xs ${th.textSub}`}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, index, onDelete, th }) {
  const hoursLeft = hoursUntil(task.deadline);
  const isUrgent = hoursLeft < 4;
  const isOverdue = hoursLeft <= 0;
  const urgencyColor = isOverdue ? "text-red-500" : isUrgent ? "text-orange-500" : th.urgencyNormal;
  const cardBase = isOverdue ? th.taskOverdue : isUrgent ? th.taskUrgent : th.taskNormal;
  return (
    <div className={`group flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${cardBase} hover:border-amber-400/40`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`font-semibold ${th.textTaskName} text-sm truncate`}>{task.name}</span>
          {isOverdue && <span className="text-xs bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded font-mono">VENCIDA</span>}
          {isUrgent && !isOverdue && <span className="text-xs bg-orange-400/10 text-orange-500 px-1.5 py-0.5 rounded font-mono">URGENTE</span>}
        </div>
        <div className={`flex gap-3 text-xs font-mono ${th.textMeta} flex-wrap`}>
          <span>{task.hours}h estimadas</span>
          <span className={urgencyColor}>{isOverdue ? "vencida" : `${hoursLeft.toFixed(1)}h restantes`}</span>
        </div>
        <div className="mt-1.5">
          <div className="flex justify-between text-xs mb-0.5">
            <span className={`${th.textAnxLabel} font-mono`}>ansiedad</span>
            <span className={`${th.textAnxVal} font-mono`}>{task.anxiety}</span>
          </div>
          <AnxietyBar value={task.anxiety} th={th} />
        </div>
      </div>
      <button onClick={() => onDelete(index)}
        className={`opacity-0 group-hover:opacity-100 transition-opacity ${th.deleteBtn} text-lg leading-none mt-0.5 flex-shrink-0`}>
        ×
      </button>
    </div>
  );
}

function PlanResult({ plan, th }) {
  if (!plan.length) return null;
  const totalMin = plan.reduce((s, t) => s + t.minutes, 0);
  return (
    <div className={`border ${th.planBorder} rounded-2xl ${th.planBg} p-5 mt-4`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>Plan generado</span>
        <span className={`text-xs font-mono ${th.textSub}`}>{(totalMin / 60).toFixed(1)}h total</span>
      </div>
      <div className="space-y-3">
        {plan.map((item, i) => {
          const w = Math.round((item.minutes / totalMin) * 100);
          return (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-1">
                <span className={`text-sm font-semibold ${th.text}`}>{item.name}</span>
                <span className={`text-xs font-mono ${th.textAccentSoft}`}>{item.minutes} min</span>
              </div>
              <div className={`w-full h-2 ${th.planBarBg} rounded-full overflow-hidden`}>
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700"
                  style={{ width: `${w}%` }} />
              </div>
              <div className={`flex gap-3 mt-1 text-xs font-mono ${th.textMuted}`}>
                <span>prioridad {item.priority === Infinity ? "∞" : item.priority.toFixed(2)}</span>
                <span>·</span>
                <span>{item.timeLeft}h hasta deadline</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function Planner() {
  const [dark, setDark] = useState(false);
  const th = dark ? THEMES.dark : THEMES.light;

  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tasks")) || []; }
    catch { return []; }
  });
  const [form, setForm] = useState({ name: "", hours: 2, anxiety: 50, deadline: "" });
  const [availableHours, setAvailableHours] = useState(4);
  const [plan, setPlan] = useState([]);
  const [msg, setMsg] = useState("");
  const [showHow, setShowHow] = useState(false);

  useEffect(() => { localStorage.setItem("tasks", JSON.stringify(tasks)); }, [tasks]);

  function addTask() {
    if (!form.name.trim() || !form.deadline) { setMsg("⚠ Completa nombre y deadline"); return; }
    setTasks(p => [...p, { ...form }]);
    setForm({ name: "", hours: 2, anxiety: 50, deadline: "" });
    setMsg("");
  }
  function deleteTask(i) { setTasks(p => p.filter((_, idx) => idx !== i)); setPlan([]); }
  function generate() {
    if (!tasks.length) { setMsg("⚠ No hay tareas"); return; }
    setPlan(calculatePlan(tasks, availableHours));
    setMsg("");
  }
  function loadTest() { setTasks(p => [...p, randomTask(), randomTask(), randomTask()]); setMsg("🧪 3 tareas aleatorias cargadas"); }
  function clearAll() { setTasks([]); setPlan([]); setMsg(""); }

  const inputClass = `w-full border ${th.inputBorder} ${th.inputBg} ${th.inputText} ${th.inputPlaceholder} ${th.inputFocus} rounded-xl px-4 py-2.5 text-sm outline-none transition-colors font-mono`;

  return (
    <div className={`min-h-screen ${th.bg} ${th.text} transition-colors duration-300`}
      style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@700;800&display=swap');
        .display-font { font-family: 'Syne', sans-serif; }
      `}</style>

      {/* Header */}
      <header className={`border-b ${th.border} px-4 py-4 max-w-2xl mx-auto flex items-center justify-between`}>
        <div>
          <h1 className={`display-font text-2xl font-extrabold ${th.textAccent} tracking-tight leading-none`}>PLANNER</h1>
          <p className={`text-xs ${th.textMuted} mt-0.5 font-mono`}>priority-based study scheduler</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark(v => !v)}
            className={`text-xs font-mono transition-colors border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg`}
          >
            {dark ? "☀ día" : "☾ noche"}
          </button>
          <button
            onClick={() => setShowHow(v => !v)}
            className={`text-xs font-mono transition-colors border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg`}
          >
            {showHow ? "ocultar" : "¿cómo?"}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {showHow && <HowItWorksCard th={th} />}

        {/* Nueva tarea */}
        <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
          <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-4`}>Nueva tarea</h2>

          <input type="text" placeholder="Nombre de la tarea..." value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && addTask()}
            className={`${inputClass} mb-4`} />

          <SliderField label="Horas estimadas" min={1} max={12} value={form.hours}
            onChange={v => setForm(f => ({ ...f, hours: v }))} unit="h" th={th} />
          <SliderField label="Nivel de ansiedad" min={0} max={100} value={form.anxiety}
            onChange={v => setForm(f => ({ ...f, anxiety: v }))} th={th} />

          <div className="mb-4">
            <label className={`text-xs font-mono ${th.textLabel} uppercase tracking-widest block mb-1`}>Deadline</label>
            <input type="datetime-local" value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className={`${inputClass} ${th.inputColorScheme}`} />
          </div>

          {msg && <p className={`text-xs font-mono ${th.textAccent} mb-3`}>{msg}</p>}

          <button onClick={addTask}
            className="w-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold rounded-xl py-2.5 text-sm transition-all duration-150 tracking-wide">
            + AGREGAR TAREA
          </button>
        </section>

        {/* Lista de tareas */}
        {tasks.length > 0 && (
          <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>
                Tareas <span className={th.textAccent}>{tasks.length}</span>
              </h2>
              <button onClick={clearAll} className={`text-xs font-mono ${th.textClear} transition-colors`}>limpiar todo</button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, i) => <TaskCard key={i} task={task} index={i} onDelete={deleteTask} th={th} />)}
            </div>
          </section>
        )}

        {/* Generar plan */}
        <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
          <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-4`}>Generar plan</h2>
          <SliderField label="Horas disponibles hoy" min={1} max={24} value={availableHours}
            onChange={setAvailableHours} unit="h" th={th} />
          <button onClick={generate}
            className={`w-full border border-amber-400/60 hover:bg-amber-400/10 active:scale-95 ${th.textAccent} font-bold rounded-xl py-2.5 text-sm transition-all duration-150 tracking-wide`}>
            ⚡ GENERAR PLAN
          </button>
          <PlanResult plan={plan} th={th} />
        </section>

        {/* Dev tools */}
        <section className={`border ${th.border} rounded-2xl ${th.surfaceDev} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-mono ${th.textMuted} uppercase tracking-widest`}>Dev tools</span>
            <div className={`flex-1 h-px ${th.divider}`} />
          </div>
          <button onClick={loadTest}
            className={`w-full border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all duration-150`}>
            🧪 cargar 3 tareas aleatorias
          </button>
          {msg && <p className={`mt-2 text-xs font-mono ${th.textSub} text-center`}>{msg}</p>}
        </section>

      </main>
    </div>
  );
}