import { useState, useEffect } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { THEMES } from "./theme/themes";
import { calculatePlan, randomTask } from "./lib/scheduler";
import { ES, EN } from "./lib/i18n";
import SliderField     from "./components/SliderField";
import AnxietyBar      from "./components/AnxietyBar";
import HowItWorksCard     from "./components/HowItWorksCard";
import HowItWorksPomodoro from "./components/HowItWorksPomodoro";
import TaskCard        from "./components/TaskCard";
import PlanResult      from "./components/PlanResult";
import PomodoroView   from "./components/PomodoroView";

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

export default function Planner() {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "es");
  const T  = lang === "en" ? EN : ES;
  const th = dark ? THEMES.dark : THEMES.light;

  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);

  const [tasks, setTasks] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tasks")) || [];
      return stored.map((t, i) => t.id ? t : { ...t, id: Date.now() + i });
    }
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
  const [msg, setMsg] = useState("");
  useTabClock(pomodoroMode);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => { localStorage.setItem("tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("plan", JSON.stringify(plan)); }, [plan]);
  useEffect(() => { localStorage.setItem("planHistory", JSON.stringify(planHistory)); }, [planHistory]);

  function addTask() {
    if (!form.name.trim() || !form.deadline) {
      setMsg(T.fillNameDeadline);
      return;
    }
    if (editIndex !== null) {
      setTasks(p => p.map((t, i) => i === editIndex ? { ...t, ...form } : t));
      setEditIndex(null);
    } else {
      setTasks(p => [...p, { ...form, id: Date.now() }]);
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
    if (!tasks.length) { setMsg(T.noTasks); return; }
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
    const base = Date.now();
    setTasks(p => [...p,
      { ...randomTask(), id: base },
      { ...randomTask(), id: base + 1 },
      { ...randomTask(), id: base + 2 },
    ]);
    setMsg(T.randomLoaded);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setTasks(p => {
      const oldIdx = p.findIndex(t => t.id === active.id);
      const newIdx = p.findIndex(t => t.id === over.id);
      return arrayMove(p, oldIdx, newIdx);
    });
  }

  function clearAll() {
    setTasks([]);
    setPlan([]);
    setMsg("");
  }

  const inputClass = [
    "w-full border",
    th.inputBorder,
    th.inputBg,
    th.inputText,
    th.inputPlaceholder,
    th.inputFocus,
    "rounded-xl px-4 py-2.5 text-sm outline-none transition-colors font-mono",
  ].join(" ");

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
        <div className="flex items-center gap-2">
          <img
            src="/favicon.svg"
            alt="HoraPlan"
            onClick={() => setPomodoroMode(false)}
            className="sm:hidden w-7 h-7 cursor-pointer"
          />
          <div className="hidden sm:block">
            <h1
              onClick={() => setPomodoroMode(false)}
              className={`display-font text-2xl font-extrabold ${th.textAccent} tracking-tight leading-none sm:cursor-pointer`}
            >
              PLANNER
            </h1>
            <p className={`text-xs ${th.textMuted} mt-0.5 font-mono`}>
              priority-based study scheduler
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(v => v === "es" ? "en" : "es")}
            className={`text-xs font-mono transition-colors border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg`}
          >
            {lang === "es" ? "ENG" : "ESP"}
          </button>
          <button
            onClick={() => setDark(v => !v)}
            className={`text-xs font-mono transition-colors border ${th.toggleBorder} ${th.textToggle} px-3 py-1.5 rounded-lg`}
          >
            {dark ? T.day : T.night}
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
            {showHow ? T.hide : T.how}
          </button>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {showHow && (pomodoroMode
          ? <HowItWorksPomodoro th={th} T={T} />
          : <HowItWorksCard th={th} T={T} />
        )}

        {pomodoroMode
          ? <PomodoroView
              plan={plan}
              planHistory={planHistory}
              onLoadPlan={p => setPlan(p)}
              onDeleteEntry={id => setPlanHistory(h => h.filter(e => e.id !== id))}
              th={th}
              T={T}
            />
          : <>

        {/* Nueva tarea */}
        <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
          <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-4`}>
            {editIndex !== null ? T.editTask : T.newTask}
          </h2>

          <input
            type="text"
            placeholder={T.taskPlaceholder}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && addTask()}
            className={`${inputClass} mb-4`}
          />

          <SliderField
            label={T.estHours} min={1} max={12}
            value={form.hours} onChange={v => setForm(f => ({ ...f, hours: v }))}
            unit="h" th={th}
          />
          <SliderField
            label={T.anxietyLevel} min={0} max={100}
            value={form.anxiety} onChange={v => setForm(f => ({ ...f, anxiety: v }))}
            th={th}
          />

          <div className="mb-4">
            <label className={`text-xs font-mono ${th.textLabel} uppercase tracking-widest block mb-1`}>
              {T.deadline}
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
                {T.cancel}
              </button>
            )}
            <button
              onClick={addTask}
              className="flex-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold rounded-xl py-2.5 text-sm transition-all duration-150 tracking-wide"
            >
              {editIndex !== null ? T.update : T.addTask}
            </button>
          </div>
        </section>

        {/* Lista de tareas */}
        {tasks.length > 0 && (
          <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>
                {T.tasks} <span className={th.textAccent}>{tasks.length}</span>
              </h2>
              <button
                onClick={clearAll}
                className={`text-xs font-mono ${th.textClear} transition-colors`}
              >
                {T.clearAll}
              </button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {tasks.map((task, i) => (
                    <TaskCard key={task.id} task={task} index={i} onDelete={deleteTask} onEdit={editTask} isEditing={editIndex === i} th={th} T={T} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )}

        {/* Generar plan */}
        <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
          <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-4`}>
            {T.generatePlan}
          </h2>
          <SliderField
            label={T.availableHours} min={1} max={24}
            value={availableHours} onChange={setAvailableHours}
            unit="h" th={th}
          />
          <button
            onClick={generate}
            className={`w-full border border-amber-400/60 hover:bg-amber-400/10 active:scale-95 ${th.textAccent} font-bold rounded-xl py-2.5 text-sm transition-all duration-150 tracking-wide`}
          >
            {T.generateBtn}
          </button>
          <PlanResult
            plan={plan}
            onPlanChange={(i, mins) => setPlan(p => p.map((t, idx) => idx === i ? { ...t, minutes: mins } : t))}
            onEditTask={name => { const i = tasks.findIndex(t => t.name === name); if (i !== -1) editTask(i); }}
            th={th} dark={dark}
            onPomodoro={() => setPomodoroMode(true)}
            T={T}
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
                {T.history} <span className={th.textAccent}>{planHistory.length}</span>
              </h2>
              <span className={`text-xs font-mono ${th.textMuted}`}>
                {showHistory ? T.hideHistory : T.showHistory}
              </span>
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2">
                {planHistory.map((entry) => {
                  const date = new Date(entry.savedAt);
                  const label = date.toLocaleDateString(T.dateLocale, { weekday: "short", day: "numeric", month: "short" });
                  const time  = date.toLocaleTimeString(T.dateLocale, { hour: "2-digit", minute: "2-digit" });
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
                            {T.tasksCount(entry.taskCount)} · {(entry.totalMinutes / 60).toFixed(1)}h
                          </div>
                        </div>
                        <span className={`text-xs font-mono ${th.textAccent} mr-2`}>{T.loadEntry}</span>
                      </button>
                      <button
                        onClick={() => setPlanHistory(h => h.filter(e => e.id !== entry.id))}
                        className={`${th.deleteBtn} text-lg leading-none flex-shrink-0`}
                        aria-label="delete"
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
            {T.loadRandom}
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
