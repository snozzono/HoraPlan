import { useState, useRef, useEffect, useMemo } from "react";
import {
  DndContext, DragOverlay, pointerWithin,
  useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";

const MIN_HOUR  = 0;
const MAX_HOUR  = 23;
const ROW_H     = 56;  // px por hora
const SLOT_MIN  = 15;  // minutos por slot
const SLOT_H    = ROW_H / (60 / SLOT_MIN); // 14px por slot

const COLORS = [
  "border-amber-400/70 bg-amber-400/10 text-amber-500",
  "border-blue-400/70 bg-blue-400/10 text-blue-400",
  "border-emerald-400/70 bg-emerald-400/10 text-emerald-500",
  "border-purple-400/70 bg-purple-400/10 text-purple-400",
  "border-rose-400/70 bg-rose-400/10 text-rose-400",
  "border-orange-400/70 bg-orange-400/10 text-orange-400",
  "border-cyan-400/70 bg-cyan-400/10 text-cyan-400",
  "border-pink-400/70 bg-pink-400/10 text-pink-400",
];

const MON_NAMES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmtDay(date, locale) {
  return new Intl.DateTimeFormat(locale || "es-CL", { weekday: "short" }).format(date);
}

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekOffset, dayCount) {
  const today  = getToday();
  const dow    = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Genera slots en fracciones de hora exactas: 7, 7.25, 7.5, 7.75, 8, ...
function buildSlots(startHour, endHour) {
  const total = (endHour - startHour + 1) * (60 / SLOT_MIN);
  return Array.from({ length: total }, (_, i) => {
    const h = Math.floor(i / (60 / SLOT_MIN)) + startHour;
    const m = (i % (60 / SLOT_MIN)) * SLOT_MIN;
    return h + m / 60;
  });
}

function fmtSlot(slot) {
  const h = Math.floor(slot);
  const m = Math.round((slot - h) * 60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function fmtDur(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const r = Math.round(hours * 10) / 10;
  return `${r}h`;
}

function computeLayout(dayBlocks) {
  if (!dayBlocks.length) return new Map();
  const sorted  = [...dayBlocks].sort((a, b) => a.hour - b.hour || a.id - b.id);
  const colEnds = [];
  const colMap  = new Map();

  for (const block of sorted) {
    const end = block.hour + (block.duration ?? 0.25);
    let col   = colEnds.findIndex(e => e <= block.hour);
    if (col === -1) { col = colEnds.length; colEnds.push(end); }
    else colEnds[col] = end;
    colMap.set(block.id, col);
  }

  const layout = new Map();
  for (const block of sorted) {
    const end  = block.hour + (block.duration ?? 0.25);
    let maxCol = colMap.get(block.id);
    for (const other of sorted) {
      if (other.id === block.id) continue;
      const otherEnd = other.hour + (other.duration ?? 0.25);
      if (other.hour < end && otherEnd > block.hour)
        maxCol = Math.max(maxCol, colMap.get(other.id));
    }
    layout.set(block.id, { colIdx: colMap.get(block.id), totalCols: maxCol + 1 });
  }
  return layout;
}

// ── Celda droppable ────────────────────────────────────────────────────────
function DroppableCell({ cellId, onClick, isHour, isHalf, th }) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{ height: SLOT_H }}
      className={`border-b cursor-pointer transition-colors ${
        isOver
          ? `bg-amber-400/10 ${th.border}`
          : isHour
            ? th.border
            : isHalf
              ? "border-zinc-700/30 dark:border-zinc-700/30 hover:bg-amber-400/5"
              : "border-zinc-700/15 dark:border-zinc-700/15 hover:bg-amber-400/5"
      }`}
    />
  );
}

// ── Bloque arrastrable con altura proporcional ─────────────────────────────
function DraggableBlock({ block, startHour, colIdx, totalCols, isEditing, onDelete, onStartEdit, onSave, onResize }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    data: { type: "block" },
  });
  const inputRef      = useRef(null);
  const resizeRef     = useRef({ active: false, startY: 0, startDur: 0 });
  const [resizingDur, setResizingDur] = useState(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleResizeStart(e) {
    e.stopPropagation();
    e.preventDefault();
    const r = resizeRef.current;
    r.active   = true;
    r.startY   = e.clientY;
    r.startDur = block.duration ?? 0.25;

    function onMove(ev) {
      if (!r.active) return;
      const dy         = ev.clientY - r.startY;
      const deltaSlots = Math.round(dy / SLOT_H);
      const newDur     = Math.max(0.25, r.startDur + deltaSlots * (SLOT_MIN / 60));
      setResizingDur(newDur);
      onResize(newDur);
    }
    function onUp() {
      r.active = false;
      setResizingDur(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const duration   = block.duration ?? 0.25;
  const top        = (block.hour - startHour) * ROW_H;
  const height     = Math.max(duration * ROW_H, SLOT_H);
  const colorClass = COLORS[block.colorIdx % COLORS.length];
  const leftPct    = (colIdx / totalCols) * 100;
  const rightPct   = ((totalCols - colIdx - 1) / totalCols) * 100;

  return (
    <div
      ref={setNodeRef}
      style={{ position: "absolute", top, height, left: `calc(${leftPct}% + 1px)`, right: `calc(${rightPct}% + 1px)`, zIndex: 10 }}
      className={`rounded border ${colorClass} flex flex-col px-1 py-0.5 overflow-hidden select-none transition-opacity ${isDragging ? "opacity-25" : ""}`}
    >
      <div className="flex items-center gap-0.5 min-h-0 shrink-0">
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[10px] opacity-40 shrink-0 touch-none">⠿</span>
        {isEditing ? (
          <input
            ref={inputRef}
            defaultValue={block.name}
            className="flex-1 bg-transparent outline-none text-[11px] font-mono min-w-0 cursor-text"
            onClick={e => e.stopPropagation()}
            onBlur={e => onSave(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") e.target.blur();
              if (e.key === "Escape") onSave(null);
            }}
          />
        ) : (
          <span className="flex-1 text-[11px] font-mono truncate cursor-pointer leading-tight" onClick={onStartEdit}>
            {block.name || "···"}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="shrink-0 opacity-30 hover:opacity-80 leading-none ml-0.5 px-1 py-0.5 text-xs">×</button>
      </div>
      {height > SLOT_H * 2 && (
        <span className="text-[9px] font-mono opacity-40 leading-none px-0.5">{fmtDur(duration)}</span>
      )}
      {resizingDur !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-mono font-bold opacity-90 bg-black/30 rounded px-1">
            {fmtDur(resizingDur)}
          </span>
        </div>
      )}
      {/* Handle de resize */}
      <div
        onPointerDown={handleResizeStart}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center opacity-30 sm:opacity-0 sm:hover:opacity-60 transition-opacity touch-none"
        title="Arrastra para cambiar duración"
      >
        <div className="w-6 h-0.5 rounded-full bg-current" />
      </div>
    </div>
  );
}

// ── Chip de tarea arrastrable ──────────────────────────────────────────────
function DraggableTask({ task, colorIdx, minutes, idx }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}-${idx}`,
    data: { type: "task", task, colorIdx },
  });
  const label = minutes != null
    ? `${task.name} · ${fmtDur(minutes / 60)}`
    : task.name;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`border rounded-lg px-2.5 py-1.5 text-[11px] font-mono cursor-grab active:cursor-grabbing select-none touch-none transition-opacity ${COLORS[colorIdx % COLORS.length]} ${isDragging ? "opacity-25" : ""}`}
    >
      {label}
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────
export default function TimeBlockView({ th, tasks = [], plan = [], onScheduledTasksChange, onPomodoro }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const [startHour, setStartHour]         = useState(7);
  const [endHour, setEndHour]             = useState(22);
  const [blocks, setBlocks]               = useState(() => {
    try { return JSON.parse(localStorage.getItem("timeBlocks")) || []; }
    catch { return []; }
  });
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [viewMode, setViewMode]           = useState(isMobile ? "daily" : "weekly");
  const [dayCount, setDayCount]           = useState(isMobile ? 1 : 5);
  const [offset, setOffset]               = useState(0);
  const [editingId, setEditingId]         = useState(null);
  const [activeDrag, setActiveDrag]       = useState(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(true);

  const lang   = localStorage.getItem("lang") || "es";
  const locale = lang === "en" ? "en-US" : "es-CL";

  const gridRef = useRef(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const nowH      = new Date().getHours() + new Date().getMinutes() / 60;
    const targetTop = Math.max(0, (nowH - startHour - 1) * ROW_H);
    gridRef.current.scrollTop = targetTop;
  }, []); // solo al montar

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  useEffect(() => {
    localStorage.setItem("timeBlocks", JSON.stringify(blocks));
  }, [blocks]);

  const plannedMinutes = plan.reduce((acc, t) => { acc[t.name] = t.minutes; return acc; }, {});
  const slots    = buildSlots(startHour, endHour);
  const today    = getToday();
  const todayKey = toKey(today);

  // Memoized so useEffect deps are stable
  const dayKeys = useMemo(() => {
    const base = getToday();
    if (viewMode === "daily") {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      return [toKey(d)];
    }
    return getWeekDays(offset, dayCount).map(toKey);
  }, [viewMode, offset, dayCount]);

  const days = dayKeys.map(k => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  // Notifica al padre con { name, minutes } agrupados por nombre
  useEffect(() => {
    if (!onScheduledTasksChange) return;
    const visible = blocks.filter(b => dayKeys.includes(b.dayKey) && b.name?.trim());
    const grouped = {};
    for (const b of visible) {
      const name = b.name.trim();
      grouped[name] = (grouped[name] ?? 0) + (b.duration ?? 0.25);
    }
    const entries = Object.entries(grouped).map(([name, hours]) => ({
      name,
      minutes: Math.max(5, Math.round(hours * 60)),
    }));
    onScheduledTasksChange(entries);
  }, [dayKeys, blocks]);

  function addBlock(dayKey, slot, name = "", colorIdx = blocks.length % COLORS.length, duration = 0.25) {
    const nb = { id: Date.now(), dayKey, hour: slot, name, colorIdx, duration };
    setBlocks(b => [...b, nb]);
    if (!name) setEditingId(nb.id);
  }

  function deleteBlock(id) {
    setBlocks(b => b.filter(x => x.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function resizeBlock(id, newDuration) {
    setBlocks(b => b.map(x => x.id === id ? { ...x, duration: newDuration } : x));
  }

  function saveBlock(id, value) {
    if (value === null) {
      const existing = blocks.find(b => b.id === id);
      if (!existing?.name) deleteBlock(id);
      else setEditingId(null);
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) deleteBlock(id);
    else {
      setBlocks(b => b.map(x => x.id === id ? { ...x, name: trimmed } : x));
      setEditingId(null);
    }
  }

  function handleDragEnd({ active, over }) {
    setActiveDrag(null);
    if (!over || !String(over.id).includes("|")) return;
    const parts = String(over.id).split("|");
    const dayKey = parts[0];
    const slot   = parseFloat(parts[1]);

    if (active.data.current?.type === "task") {
      const { task, colorIdx } = active.data.current;
      const mins     = plannedMinutes[task.name];
      const duration = mins != null ? mins / 60 : 0.25;
      addBlock(dayKey, slot, task.name, colorIdx, duration);
    } else {
      setBlocks(b => b.map(x => x.id === active.id ? { ...x, dayKey, hour: slot } : x));
    }
  }

  const d0 = days[0];
  const dN = days.at(-1);
  const hint             = locale === "en-US"
    ? "drag tasks to grid · click empty to create · ⠿ to move"
    : "arrastra tareas al grid · click en vacío para crear · ⠿ para mover";
  const tasksPendingLabel = locale === "en-US" ? "Pending tasks" : "Tareas pendientes";

  const periodLabel = viewMode === "daily"
    ? `${fmtDay(d0, locale)} ${d0.getDate()} ${MON_NAMES[d0.getMonth()]}`
    : `${d0.getDate()} ${MON_NAMES[d0.getMonth()]} – ${dN.getDate()} ${MON_NAMES[dN.getMonth()]}`;

  const nowH        = now.getHours() + now.getMinutes() / 60;
  const showTimebar = nowH >= startHour && nowH <= endHour + 1 && days.some(d => toKey(d) === todayKey);
  const timebarTop  = (nowH - startHour) * ROW_H;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => setActiveDrag({ id: active.id, data: active.data.current })}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="space-y-3">

        {/* Controles — fila 1: lo esencial */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className={`flex rounded-lg border ${th.toggleBorder} overflow-hidden`}>
            {[["daily", locale === "en-US" ? "Day" : "Día"], ["weekly", locale === "en-US" ? "Week" : "Sem"]].map(([v, l]) => (
              <button key={v} onClick={() => { setViewMode(v); setOffset(0); }}
                className={`text-xs font-mono px-3 py-1.5 transition-colors ${
                  viewMode === v
                    ? "bg-amber-400 text-zinc-950 font-bold"
                    : `${th.textToggle} hover:bg-amber-400/10`
                }`}
              >{l}</button>
            ))}
          </div>

          {/* Navegación */}
          <div className={`flex items-center rounded-lg border ${th.toggleBorder} overflow-hidden`}>
            <button onClick={() => setOffset(o => o - 1)}
              className={`w-8 h-8 ${th.textToggle} hover:bg-amber-400/10 flex items-center justify-center transition-colors`}
            >‹</button>
            <button onClick={() => setOffset(0)}
              className={`px-2 h-8 text-[10px] font-mono ${th.textToggle} hover:bg-amber-400/10 transition-colors border-x ${th.toggleBorder}`}
            >{locale === "en-US" ? "today" : "hoy"}</button>
            <button onClick={() => setOffset(o => o + 1)}
              className={`w-8 h-8 ${th.textToggle} hover:bg-amber-400/10 flex items-center justify-center transition-colors`}
            >›</button>
          </div>

          <span className={`text-[11px] font-mono ${th.textMuted} capitalize`}>{periodLabel}</span>

          <div className="flex-1" />

          {/* Ir a Pomodoro */}
          {onPomodoro && (
            <button
              onClick={onPomodoro}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold transition-all duration-150"
            >
              🍅<span className="hidden sm:inline"> Pomodoro</span>
            </button>
          )}
        </div>

        {/* Controles — fila 2: secundarios */}
        <div className="flex items-center gap-2">
          {/* Días visibles (solo semanal) */}
          {viewMode === "weekly" && (
            <div className={`flex items-center rounded-lg border ${th.toggleBorder} overflow-hidden`}>
              <button onClick={() => setDayCount(d => Math.max(1, d - 1))}
                className={`w-7 h-7 ${th.textToggle} hover:bg-amber-400/10 text-sm flex items-center justify-center transition-colors`}
              >−</button>
              <span className={`text-xs font-mono px-2 tabular-nums ${th.textMuted}`}>{dayCount}d</span>
              <button onClick={() => setDayCount(d => Math.min(7, d + 1))}
                className={`w-7 h-7 ${th.textToggle} hover:bg-amber-400/10 text-sm flex items-center justify-center transition-colors`}
              >+</button>
            </div>
          )}

          <div className="flex-1" />

          {/* Rango horario */}
          <div className={`flex items-center gap-1 rounded-lg border ${th.toggleBorder} px-2 py-1`}>
            <button onClick={() => setStartHour(h => Math.max(MIN_HOUR, h - 1))}
              className={`w-5 h-5 ${th.textToggle} hover:text-amber-400 text-xs flex items-center justify-center transition-colors`}
            >−</button>
            <span className={`text-[10px] font-mono tabular-nums ${th.textMuted} w-6 text-center`}>
              {String(startHour).padStart(2,"0")}
            </span>
            <button onClick={() => setStartHour(h => Math.min(endHour - 1, h + 1))}
              className={`w-5 h-5 ${th.textToggle} hover:text-amber-400 text-xs flex items-center justify-center transition-colors`}
            >+</button>
            <span className={`text-[9px] ${th.textMuted} mx-0.5`}>–</span>
            <button onClick={() => setEndHour(h => Math.max(startHour + 1, h - 1))}
              className={`w-5 h-5 ${th.textToggle} hover:text-amber-400 text-xs flex items-center justify-center transition-colors`}
            >−</button>
            <span className={`text-[10px] font-mono tabular-nums ${th.textMuted} w-6 text-center`}>
              {String(endHour).padStart(2,"0")}
            </span>
            <button onClick={() => setEndHour(h => Math.min(MAX_HOUR, h + 1))}
              className={`w-5 h-5 ${th.textToggle} hover:text-amber-400 text-xs flex items-center justify-center transition-colors`}
            >+</button>
            <span className={`text-[9px] font-mono ${th.textMuted} ml-0.5`}>h</span>
          </div>
        </div>

        {/* Panel de tareas */}
        {tasks.length > 0 && (
          <div className={`border ${th.border} rounded-2xl ${th.surface} overflow-hidden`}>
            <button
              onClick={() => setTaskPanelOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>{tasksPendingLabel}</span>
              <span className={`text-xs font-mono ${th.textMuted}`}>{taskPanelOpen ? "▲" : "▼"}</span>
            </button>
            {taskPanelOpen && (
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                {tasks.map((task, i) => (
                  <DraggableTask
                    key={task.id}
                    task={task}
                    idx={i}
                    colorIdx={i % COLORS.length}
                    minutes={plannedMinutes[task.name]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grid */}
        <div className={`border ${th.border} rounded-2xl ${th.surface} overflow-hidden`}>
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]" ref={gridRef}>
            <div style={{ minWidth: `${44 + days.length * 96}px` }}>

              {/* Cabecera días */}
              <div className={`flex border-b ${th.border}`}>
                <div className={`w-11 shrink-0 border-r ${th.border}`} />
                {days.map((d, i) => {
                  const key     = toKey(d);
                  const isToday = key === todayKey;
                  return (
                    <div key={key} className={`flex-1 text-center py-2 ${i < days.length - 1 ? `border-r ${th.border}` : ""}`}>
                      <p className={`text-[10px] font-mono uppercase tracking-wide ${isToday ? "text-amber-400" : th.textMuted}`}>
                        {fmtDay(d, locale)}
                      </p>
                      <p className={`text-xs font-bold leading-tight ${isToday ? "text-amber-400" : th.text}`}>
                        {d.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Cuerpo */}
              <div className="relative flex">

                {/* Columna de horas */}
                <div className={`w-11 shrink-0 border-r ${th.border}`}>
                  {slots.map(slot => {
                    const min     = Math.round((slot % 1) * 60);
                    const isHour  = min === 0;
                    const isHalf  = min === 30;
                    return (
                      <div
                        key={slot}
                        style={{ height: SLOT_H }}
                        className={`border-b ${isHour ? th.border : "border-transparent"} flex items-start justify-end pr-1.5`}
                      >
                        {isHour && (
                          <span className={`text-[9px] font-mono ${th.textMuted} leading-none mt-0.5`}>
                            {String(Math.floor(slot)).padStart(2,"0")}h
                          </span>
                        )}
                        {isHalf && (
                          <span className={`text-[7px] font-mono ${th.textMuted} opacity-40 leading-none mt-0.5`}>30</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Columnas por día */}
                {days.map((d, di) => {
                  const dayKey    = toKey(d);
                  const dayBlocks = blocks.filter(b => b.dayKey === dayKey);
                  const layout    = computeLayout(dayBlocks);
                  return (
                    <div key={dayKey} className={`flex-1 relative ${di < days.length - 1 ? `border-r ${th.border}` : ""}`}>
                      {/* Celdas droppables */}
                      {slots.map(slot => {
                        const min     = Math.round((slot % 1) * 60);
                        const isHour  = min === 0;
                        const isHalf  = min === 30;
                        const cellId  = `${dayKey}|${slot}`;
                        const covered = dayBlocks.some(b => {
                          const end = b.hour + (b.duration ?? 0.25);
                          return b.hour <= slot && end > slot;
                        });
                        return (
                          <DroppableCell
                            key={cellId}
                            cellId={cellId}
                            isHour={isHour}
                            isHalf={isHalf}
                            onClick={covered ? undefined : () => addBlock(dayKey, slot)}
                            th={th}
                          />
                        );
                      })}

                      {/* Bloques */}
                      {dayBlocks.map(block => {
                        const { colIdx, totalCols } = layout.get(block.id) ?? { colIdx: 0, totalCols: 1 };
                        return (
                          <DraggableBlock
                            key={block.id}
                            block={block}
                            startHour={startHour}
                            colIdx={colIdx}
                            totalCols={totalCols}
                            isEditing={editingId === block.id}
                            onDelete={() => deleteBlock(block.id)}
                            onStartEdit={() => setEditingId(block.id)}
                            onSave={val => saveBlock(block.id, val)}
                            onResize={dur => resizeBlock(block.id, dur)}
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {/* Barra de tiempo actual */}
                {showTimebar && (
                  <div
                    className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
                    style={{ top: timebarTop }}
                  >
                    <div className="w-11 flex justify-end pr-1.5">
                      <span className="text-[8px] font-mono text-amber-400 leading-none tabular-nums">
                        {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}
                      </span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" style={{ marginLeft: "-3px" }} />
                    <div className="flex-1 h-px bg-amber-400/50" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className={`text-xs font-mono ${th.textMuted} text-center`}>
          {hint}
        </p>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && (() => {
          if (activeDrag.data?.type === "task") {
            return (
              <div className={`rounded-lg border text-[11px] font-mono px-2.5 py-1.5 shadow-xl ${COLORS[activeDrag.data.colorIdx % COLORS.length]}`}>
                {activeDrag.data.task.name}
              </div>
            );
          }
          const block = blocks.find(b => b.id === activeDrag.id);
          if (!block) return null;
          return (
            <div className={`rounded border text-[11px] font-mono px-2 py-1 shadow-xl ${COLORS[block.colorIdx % COLORS.length]}`}>
              {block.name || "···"}
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}
