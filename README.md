# HoraPlan

Priority-based study scheduler. Toma tus tareas, calcula prioridades según ansiedad, horas estimadas y deadline, y genera un plan de estudio distribuido para el día.

**Live:** [planner.snozz.xyz](https://planner.snozz.xyz)

---

## Features

**Planner**
- Agrega tareas con horas estimadas, nivel de ansiedad y deadline
- Genera un plan distribuido proporcionalmente por prioridad
- Plan editable: ajusta los minutos asignados por tarea
- Persiste tareas y plan al recargar
- Historial de los últimos 10 planes generados
- Descarga el plan como PNG o compártelo directo desde el móvil
- Modo claro / oscuro

**Pomodoro**
- Convierte el plan generado en sesiones pomodoro
- Modos: Estándar (25/5/15), Bestia (sin descansos), Custom
- Timer con countdown, controles de navegación y barra de progreso
- Notificaciones al cambiar de bloque
- Título de pestaña con timer en tiempo real
- Historial accesible desde el modo pomodoro

---

## Stack

- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Vite](https://vitejs.dev)

---

## Desarrollo local

```bash
npm install
npm run dev
```

---

## Algoritmo de prioridad

```
prioridad = (ansiedad × horas × ln(horas + 1)) / T
```

donde `T` es el tiempo restante hasta el deadline en horas. Las tareas vencidas reciben prioridad `∞`.

El tiempo disponible se distribuye proporcionalmente entre las tareas según su prioridad, respetando el máximo de horas estimadas por tarea.

---

Made by [snozz](https://github.com/snozz1001) — 2026
