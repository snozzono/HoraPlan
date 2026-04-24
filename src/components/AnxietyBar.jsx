/**
 * AnxietyBar.jsx
 * Barra de progreso que cambia de color según el nivel de ansiedad.
 *
 * Rangos de color:
 *   0–32   → verde  (baja ansiedad)
 *   33–65  → amarillo (ansiedad media)
 *   66–100 → rojo   (alta ansiedad)
 *
 * Props:
 *   value {number} - Nivel de ansiedad (0–100)
 *   th    {object} - Tokens del tema activo (de themes.js)
 */
export default function AnxietyBar({ value, th }) {
  const color = value < 33
    ? "bg-emerald-500"
    : value < 66
      ? "bg-yellow-400"
      : "bg-red-500";

  return (
    <div className={`w-full h-1 ${th.anxietyTrack} rounded-full overflow-hidden mt-1`}>
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
