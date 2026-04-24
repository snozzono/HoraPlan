/**
 * HowItWorksCard.jsx
 * Card explicativa con la fórmula del algoritmo y los 3 pasos de uso.
 * Se muestra/oculta desde Planner.jsx con el botón "¿cómo?".
 *
 * Props:
 *   th {object} - Tokens del tema activo (de themes.js)
 */
export default function HowItWorksCard({ th }) {
  const steps = [
    {
      icon: "01",
      title: "Agrega tareas",
      desc: "Nombre, horas estimadas, nivel de ansiedad y deadline.",
    },
    {
      icon: "02",
      title: "Define tu tiempo",
      desc: "Cuántas horas tienes disponibles hoy para estudiar.",
    },
    {
      icon: "03",
      title: "Genera el plan",
      desc: "El algoritmo distribuye el tiempo según urgencia y ansiedad.",
    },
  ];

  return (
    <div className={`border ${th.howBorder} rounded-2xl ${th.surfaceHow} p-5 mb-2`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>
          ¿Cómo funciona?
        </span>
        <div className={`flex-1 h-px ${th.divider} opacity-40`} />
      </div>

      {/* Fórmula */}
      <div className={`${th.surfaceFormula} border ${th.borderFormula} rounded-xl p-3 mb-5 font-mono text-center`}>
        <div className={`text-xs ${th.textMuted} mb-1`}>prioridad =</div>
        <div className={`${th.textAccentSoft} text-sm`}>
          (ansiedad × horas) / T × ln(horas + 1)
        </div>
        <div className={`text-xs ${th.textMuted} mt-1`}>
          donde T = horas hasta el deadline
        </div>
      </div>

      {/* Pasos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map(s => (
          <div
            key={s.icon}
            className={`${th.surfaceStep} rounded-xl p-4 border ${th.borderStep} hover:border-amber-400/40 transition-colors shadow-sm`}
          >
            <div className={`text-2xl font-mono ${th.textAccent} opacity-30 font-bold mb-2`}>
              {s.icon}
            </div>
            <div className={`text-sm font-semibold ${th.text} mb-1`}>{s.title}</div>
            <div className={`text-xs ${th.textSub}`}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
