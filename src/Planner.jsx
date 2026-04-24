/**
 * Planner.jsx
 * Componente raíz. Maneja estado global y layout.
 * La lógica de negocio vive en lib/scheduler.js.
 * Los tokens visuales viven en theme/themes.js.
 */
import { useState, useEffect } from "react";
import { THEMES } from "./theme/themes";
import { calculatePlan, randomTask } from "./lib/scheduler";
import SliderField     from "./components/SliderField";
import AnxietyBar      from "./components/AnxietyBar";
import HowItWorksCard  from "./components/HowItWorksCard";
import TaskCard        from "./components/TaskCard";
import PlanResult      from "./components/PlanResult";
import PomodoroView   from "./components/PomodoroView";

// ── Hook: reloj en el título de la pestaña ───────────────────────────────────
function useTabClock(paused = false) {
  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const now = new Date();
      const hh  = now.getHours().toString().padStart(2, "0");
      const mm  = now.getMinutes().toString().padStart(2, "0");
      const ss  = now.getSeconds().toString().padStart(2, "0");
      document.title = `⚡ ${hh}:${mm}:${ss} — HoraPlan`;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [paused]);
}

// ── Planner ──────────────────────────────────────────────────────────────────
export default function Planner() {
  const [dark, setDark] = useState(false);
  const th = dark ? THEMES.dark : THEMES.light;

  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tasks")) || []; }
    catch { return []; }
  });
  const [form, setForm] = useState({ name: "", hours: 2, anxiety: 50, deadline: "" });
  const [editIndex, setEditIndex] = useState(null);
  const [availableHours, setAvailableHours] = useState(4);
  const [plan, setPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem("plan")) || []; }
    catch { return []; }
  });
  const [planHistory, setPlanHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planHistory")) || []; }
    catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [msg, setMsg]       = useState("");
  useTabClock(pomodoroMode);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("plan", JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem("planHistory", JSON.stringify(planHistory));
  }, [planHistory]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function addTask() {
    if (!form.name.trim() || !form.deadline) {
      setMsg("⚠ Completa nombre y deadline");
      return;
    }
    if (editIndex !== null) {
      setTasks(p => p.map((t, i) => i === editIndex ? { ...form } : t));
      setEditIndex(null);
    } else {
      setTasks(p => [...p, { ...form }]);
    }
    setForm({ name: "", hours: 2, anxiety: 50, deadline: "" });
    setMsg("");
  }

  function editTask(i) {
    const t = tasks[i];
    setForm({ name: t.name, hours: t.hours, anxiety: t.anxiety, deadline: t.deadline });
    setEditIndex(i);
    setMsg("");
  }

  function cancelEdit() {
    setForm({ name: "", hours: 2, anxiety: 50, deadline: "" });
    setEditIndex(null);
    setMsg("");
  }

  function deleteTask(i) {
    setTasks(p => p.filter((_, idx) => idx !== i));
    if (editIndex === i) cancelEdit();
    setPlan([]);
  }

  function generate() {
    if (!tasks.length) { setMsg("⚠ No hay tareas"); return; }
    const newPlan = calculatePlan(tasks, availableHours);
    setPlan(newPlan);
    if (newPlan.length) {
      const entry = {
        id: Date.now(),
        savedAt: new Date().toISOString(),
        plan: newPlan,
        tasks: tasks,
        taskCount: newPlan.length,
        totalMinutes: newPlan.reduce((s, t) => s + t.minutes, 0),
      };
      setPlanHistory(h => [entry, ...h].slice(0, 10));
    }
    setMsg("");
  }

  function loadTest() {
    setTasks(p => [...p, randomTask(), randomTask(), randomTask()]);
    setMsg("🧪 3 tareas aleatorias cargadas");
  }

  function clearAll() {
    setTasks([]);
    setPlan([]);
    setMsg("");
  }

  // ── Clase base de inputs ─────────────────────────────────────────────────────
  const inputClass = [
    "w-full border",
    th.inputBorder,
    th.inputBg,
    th.inputText,
    th.inputPlaceholder,
    th.inputFocus,
    "rounded-xl px-4 py-2.5 text-sm outline-none transition-colors font-mono",
  ].join(" ");

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen ${th.bg} ${th.text} transition-colors duration-300`}
      style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@700;800&display=swap');
        .display-font { font-family: 'Syne', sans-serif; }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className={`border-b ${th.border} px-4 py-4 max-w-2xl mx-auto flex items-center justify-between`}>
        <div>
          <h1
            onClick={() => setPomodoroMode(false)}
            className={`display-font text-2xl font-extrabold ${th.textAccent} tracking-tight leading-none sm:cursor-pointer`}
          >
            PLANNER
          </h1>
          <p className={`hidden sm:block text-xs ${th.textMuted} mt-0.5 font-mono`}>
            priority-based study scheduler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <img
            src="/favicon.svg"
            alt="HoraPlan"
            onClick={() => setPomodoroMode(false)}
            className="sm:hidden w-7 h-7 cursor-pointer"
          />
          <button
            onClick={() => setDark(v => !v)}
            className={`text-xs font-mono transition-colors border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg`}
          >
            {dark ? "☀ día" : "☾ noche"}
          </button>
          <button
            onClick={() => setPomodoroMode(v => !v)}
            className={`text-xs font-mono transition-colors border px-3 py-1.5 rounded-lg ${
              pomodoroMode
                ? "bg-amber-400 text-zinc-950 border-amber-400 font-bold"
                : `${th.toggleBorder} ${th.textToggle}`
            }`}
          >
            🍅
          </button>
          <button
            onClick={() => setShowHow(v => !v)}
            className={`text-xs font-mono transition-colors border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg`}
          >
            {showHow ? "ocultar" : "¿cómo?"}
          </button>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {pomodoroMode ? <PomodoroView plan={plan} planHistory={planHistory} onLoadPlan={p => setPlan(p)} onDeleteEntry={id => setPlanHistory(h => h.filter(e => e.id !== id))} th={th} /> : <>

        {showHow && <HowItWorksCard th={th} />}

        {/* Nueva tarea */}
        <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
          <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-4`}>
            {editIndex !== null ? "Editar tarea" : "Nueva tarea"}
          </h2>

          <input
            type="text"
            placeholder="Nombre de la tarea..."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && addTask()}
            className={`${inputClass} mb-4`}
          />

          <SliderField
            label="Horas estimadas" min={1} max={12}
            value={form.hours} onChange={v => setForm(f => ({ ...f, hours: v }))}
            unit="h" th={th}
          />
          <SliderField
            label="Nivel de ansiedad" min={0} max={100}
            value={form.anxiety} onChange={v => setForm(f => ({ ...f, anxiety: v }))}
            th={th}
          />

          <div className="mb-4">
            <label className={`text-xs font-mono ${th.textLabel} uppercase tracking-widest block mb-1`}>
              Deadline
            </label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className={`${inputClass} ${th.inputColorScheme}`}
            />
          </div>

          {msg && <p className={`text-xs font-mono ${th.textAccent} mb-3`}>{msg}</p>}

          <div className="flex gap-2">
            {editIndex !== null && (
              <button
                onClick={cancelEdit}
                className={`flex-1 border ${th.toggleBorder} ${th.textToggle} font-bold rounded-xl py-2.5 text-sm transition-all duration-150 tracking-wide active:scale-95`}
              >
                CANCELAR
              </button>
            )}
            <button
              onClick={addTask}
              className="flex-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold rounded-xl py-2.5 text-sm transition-all duration-150 tracking-wide"
            >
              {editIndex !== null ? "✓ ACTUALIZAR" : "+ AGREGAR TAREA"}
            </button>
          </div>
        </section>

        {/* Lista de tareas */}
        {tasks.length > 0 && (
          <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>
                Tareas <span className={th.textAccent}>{tasks.length}</span>
              </h2>
              <button
                onClick={clearAll}
                className={`text-xs font-mono ${th.textClear} transition-colors`}
              >
                limpiar todo
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <TaskCard key={i} task={task} index={i} onDelete={deleteTask} onEdit={editTask} isEditing={editIndex === i} th={th} />
              ))}
            </div>
          </section>
        )}

        {/* Generar plan */}
        <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
          <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-4`}>
            Generar plan
          </h2>
          <SliderField
            label="Horas disponibles hoy" min={1} max={24}
            value={availableHours} onChange={setAvailableHours}
            unit="h" th={th}
          />
          <button
            onClick={generate}
            className={`w-full border border-amber-400/60 hover:bg-amber-400/10 active:scale-95 ${th.textAccent} font-bold rounded-xl py-2.5 text-sm transition-all duration-150 tracking-wide`}
          >
            ⚡ GENERAR PLAN
          </button>
          <PlanResult
            plan={plan}
            onPlanChange={(i, mins) => setPlan(p => p.map((t, idx) => idx === i ? { ...t, minutes: mins } : t))}
            onEditTask={name => { const i = tasks.findIndex(t => t.name === name); if (i !== -1) editTask(i); }}
            th={th} dark={dark}
            onPomodoro={() => setPomodoroMode(true)}
          />
        </section>

        {/* Historial de planes */}
        {planHistory.length > 0 && (
          <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="w-full flex items-center justify-between"
            >
              <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>
                Historial <span className={th.textAccent}>{planHistory.length}</span>
              </h2>
              <span className={`text-xs font-mono ${th.textMuted}`}>
                {showHistory ? "▲ ocultar" : "▼ ver"}
              </span>
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2">
                {planHistory.map((entry) => {
                  const date = new Date(entry.savedAt);
                  const label = date.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
                  const time  = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={entry.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${th.taskNormal} hover:border-amber-400/40 transition-colors`}>
                      <button
                        onClick={() => {
                          const recovered = entry.tasks ?? entry.plan.map(({ name, hours, anxiety, deadline }) => ({ name, hours, anxiety, deadline: deadline ?? "" }));
                          setTasks(recovered);
                          setPlan([]);
                        }}
                        className="flex-1 text-left flex items-center justify-between"
                      >
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
                        onClick={() => setPlanHistory(h => h.filter(e => e.id !== entry.id))}
                        className={`${th.deleteBtn} text-lg leading-none flex-shrink-0`}
                        aria-label="Eliminar entrada"
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Dev tools */}
        <section className={`border ${th.border} rounded-2xl ${th.surfaceDev} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-mono ${th.textMuted} uppercase tracking-widest`}>
              Dev tools
            </span>
            <div className={`flex-1 h-px ${th.divider}`} />
          </div>
          <button
            onClick={loadTest}
            className={`w-full border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all duration-150`}
          >
            🧪 cargar 3 tareas aleatorias
          </button>
          {msg && (
            <p className={`mt-2 text-xs font-mono ${th.textSub} text-center`}>{msg}</p>
          )}
        </section>

        </> }

      </main>

      <footer className={`max-w-2xl mx-auto px-4 py-6 text-center text-xs font-mono ${th.textMuted}`}>
        <a
          href="https://github.com/snozz1001"
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:${th.textAccent} transition-colors`}
        >
          snozz
        </a>
        {" "}— 2026
      </footer>
    </div>
  );
}
