export default function HowItWorksPomodoro({ th }) {
  const steps = [
    {
      icon: "01",
      title: "Genera un plan",
      desc: "Vuelve al planner, agrega tareas y presiona ⚡ Generar plan.",
    },
    {
      icon: "02",
      title: "Elige tu modo",
      desc: "Estándar (25/5 min), Bestia (sin descansos) o Custom con tus propios tiempos.",
    },
    {
      icon: "03",
      title: "Presiona ▶",
      desc: "El timer corre bloque a bloque. Navega con ◀ ▶ o salta desde los puntos de la secuencia.",
    },
  ];

  return (
    <div className={`border ${th.howBorder} rounded-2xl ${th.surfaceHow} p-5 mb-2`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>
          ¿Cómo funciona el pomodoro?
        </span>
        <div className={`flex-1 h-px ${th.divider} opacity-40`} />
      </div>

      {/* Modos */}
      <div className={`${th.surfaceFormula} border ${th.borderFormula} rounded-xl p-3 mb-5 font-mono text-center`}>
        <div className={`text-xs ${th.textMuted} mb-2`}>modos disponibles</div>
        <div className="flex justify-center gap-4 text-sm">
          <span className={th.textAccentSoft}>🍅 Estándar <span className={`text-xs ${th.textMuted}`}>25/5/15</span></span>
          <span className={th.textAccentSoft}>⚡ Bestia <span className={`text-xs ${th.textMuted}`}>sin descansos</span></span>
          <span className={th.textAccentSoft}>⚙ Custom</span>
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
