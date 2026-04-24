/**
 * TaskCard.jsx
 * Tarjeta individual de tarea con indicadores de urgencia y barra de ansiedad.
 *
 * Estados visuales:
 *   - Normal:   borde gris
 *   - Urgente:  borde naranja  (menos de 4h hasta deadline)
 *   - Vencida:  borde rojo     (deadline ya pasó)
 *
 * Props:
 *   task    {object}   - { name, hours, anxiety, deadline }
 *   index   {number}   - Índice en el array de tareas (para eliminar)
 *   onDelete {function} - Callback que recibe el índice a eliminar
 *   th      {object}   - Tokens del tema activo (de themes.js)
 */
import { hoursUntil } from "../lib/scheduler";
import AnxietyBar from "./AnxietyBar";

export default function TaskCard({ task, index, onDelete, onEdit, isEditing, th }) {
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
    <div className={`group flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${cardBase} ${isEditing ? "border-amber-400/70" : "hover:border-amber-400/40"}`}>
      <div className="flex-1 min-w-0">

        {/* Nombre + badges */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <button
            onClick={() => onEdit(index)}
            className={`font-semibold ${th.textTaskName} text-sm truncate text-left hover:underline underline-offset-2`}
          >
            {task.name}
          </button>
          {isOverdue && (
            <span className="text-xs bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded font-mono">
              VENCIDA
            </span>
          )}
          {isUrgent && !isOverdue && (
            <span className="text-xs bg-orange-400/10 text-orange-500 px-1.5 py-0.5 rounded font-mono">
              URGENTE
            </span>
          )}
        </div>

        {/* Metadatos */}
        <div className={`flex gap-3 text-xs font-mono ${th.textMeta} flex-wrap`}>
          <span>{task.hours}h estimadas</span>
          <span className={urgencyColor}>
            {isOverdue ? "vencida" : `${hoursLeft.toFixed(1)}h restantes`}
          </span>
        </div>

        {/* Barra de ansiedad */}
        <div className="mt-1.5">
          <div className="flex justify-between text-xs mb-0.5">
            <span className={`${th.textAnxLabel} font-mono`}>ansiedad</span>
            <span className={`${th.textAnxVal} font-mono`}>{task.anxiety}</span>
          </div>
          <AnxietyBar value={task.anxiety} th={th} />
        </div>

      </div>

      {/* Botón eliminar (visible en hover) */}
      <button
        onClick={() => onDelete(index)}
        aria-label={`Eliminar tarea ${task.name}`}
        className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${th.deleteBtn} text-lg leading-none mt-0.5 flex-shrink-0`}
      >
        ×
      </button>
    </div>
  );
}
