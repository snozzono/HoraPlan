import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { hoursUntil } from "../lib/scheduler";
import AnxietyBar from "./AnxietyBar";

export default function TaskCard({ task, index, onDelete, onEdit, isEditing, th, T }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const hoursLeft = hoursUntil(task.deadline);
  const isUrgent  = hoursLeft < 4;
  const isOverdue = hoursLeft <= 0;

  const urgencyColor = isOverdue
    ? "text-red-500"
    : isUrgent
      ? "text-orange-500"
      : th.urgencyNormal;

  const cardBase = isOverdue
    ? th.taskOverdue
    : isUrgent
      ? th.taskUrgent
      : th.taskNormal;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors duration-200 ${cardBase} ${
        isEditing ? "border-amber-400/70" : "hover:border-amber-400/40"
      } ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`${th.textMuted} cursor-grab active:cursor-grabbing touch-none flex-shrink-0 mt-1 select-none text-base leading-none`}
        aria-label="drag"
        tabIndex={-1}
      >⠿</button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <button
            onClick={() => onEdit(index)}
            className={`font-semibold ${th.textTaskName} text-sm truncate text-left hover:underline underline-offset-2`}
          >
            {task.name}
          </button>
          {isOverdue && (
            <span className="text-xs bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded font-mono">
              {T.overdueBadge}
            </span>
          )}
          {isUrgent && !isOverdue && (
            <span className="text-xs bg-orange-400/10 text-orange-500 px-1.5 py-0.5 rounded font-mono">
              {T.urgentBadge}
            </span>
          )}
        </div>

        <div className={`flex gap-3 text-xs font-mono ${th.textMeta} flex-wrap`}>
          <span>{task.hours}h {T.estimated}</span>
          <span className={urgencyColor}>
            {isOverdue ? T.overdue : `${hoursLeft.toFixed(1)}h ${T.remaining}`}
          </span>
          {task.deadline && (
            <span>
              ({new Date(task.deadline).toLocaleDateString(T.dateLocale, { weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit" })}
              {" "}
              {new Date(task.deadline).toLocaleTimeString(T.dateLocale, { hour: "2-digit", minute: "2-digit" })})
            </span>
          )}
        </div>

        <div className="mt-1.5">
          <div className="flex justify-between text-xs mb-0.5">
            <span className={`${th.textAnxLabel} font-mono`}>{T.anxiety}</span>
            <span className={`${th.textAnxVal} font-mono`}>{task.anxiety}</span>
          </div>
          <AnxietyBar value={task.anxiety} th={th} />
        </div>
      </div>

      <button
        onClick={() => onDelete(index)}
        aria-label="delete"
        className={`${th.deleteBtn} text-lg leading-none mt-0.5 flex-shrink-0`}
      >
        ×
      </button>
    </div>
  );
}
