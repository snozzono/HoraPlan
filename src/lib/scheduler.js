/**
 * scheduler.js
 * Lógica pura de priorización y planificación de tareas.
 * No tiene dependencias de React ni del DOM.
 */

/**
 * Calcula cuántas horas faltan hasta un deadline.
 * @param {string|Date} deadline
 * @returns {number} horas restantes (puede ser negativo si ya venció)
 */
export function hoursUntil(deadline) {
  return (new Date(deadline) - new Date()) / (1000 * 60 * 60);
}

/**
 * Calcula la prioridad de una tarea.
 * Fórmula: (ansiedad × horas) / T × ln(horas + 1)
 * donde T = horas hasta el deadline.
 *
 * @param {{ anxiety: number, hours: number, deadline: string|Date }} task
 * @returns {number} prioridad (Infinity si la tarea ya venció)
 */
export function calculatePriority(task) {
  const T = hoursUntil(task.deadline);
  if (T <= 0) return Infinity;
  return (task.anxiety * task.hours) / T * Math.log(task.hours + 1);
}

/**
 * Redondea minutos al múltiplo de 5 más cercano.
 * Retorna 0 si el valor es menor a 15 (bloques muy pequeños se descartan).
 * @param {number} minutes
 * @returns {number}
 */
export function roundMinutes(minutes) {
  if (minutes < 15) return 0;
  return Math.round(minutes / 5) * 5;
}

/**
 * Genera un plan de estudio distribuido por prioridad.
 *
 * @param {Array} taskList - Lista de tareas con { name, hours, anxiety, deadline }
 * @param {number} availableHours - Horas disponibles para estudiar hoy
 * @returns {Array} Lista ordenada con { name, minutes, priority, anxiety, hours, timeLeft }
 */
export function calculatePlan(taskList, availableHours) {
  const weighted = taskList.map(t => ({ ...t, priority: calculatePriority(t) }));
  const total = weighted.reduce((s, t) => s + t.priority, 0);
  let remaining = availableHours * 60;
  const result = [];

  weighted.sort((a, b) => b.priority - a.priority).forEach(t => {
    if (remaining <= 0) return;
    let share = (t.priority / total) * (availableHours * 60);
    let minutes = Math.min(share, t.hours * 60);
    minutes = roundMinutes(minutes);
    if (minutes > 0) {
      result.push({
        name: t.name,
        minutes,
        priority: t.priority,
        anxiety: t.anxiety,
        hours: t.hours,
        deadline: t.deadline,
        timeLeft: hoursUntil(t.deadline).toFixed(1),
      });
      remaining -= minutes;
    }
  });

  return result;
}

/**
 * Genera una tarea aleatoria para testing.
 * @returns {{ name: string, hours: number, anxiety: number, deadline: string }}
 */
export function randomTask() {
  const now = new Date();
  return {
    name: "Task_" + Math.floor(Math.random() * 100),
    hours: Math.floor(Math.random() * 10) + 1,
    anxiety: Math.floor(Math.random() * 100),
    deadline: new Date(now.getTime() + (Math.random() * 24 + 1) * 3600000).toISOString(),
  };
}
