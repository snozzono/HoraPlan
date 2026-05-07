export default function HowItWorksCalendar({ th, locale }) {
  const en = locale === "en-US";

  const steps = [
    {
      icon: "01",
      title: en ? "Click to create" : "Click para crear",
      desc:  en ? "Tap any cell in the grid to create a block. Give it a name." : "Toca cualquier celda del grid para crear un bloque. Ponle un nombre.",
    },
    {
      icon: "02",
      title: en ? "Drag tasks" : "Arrastra tareas",
      desc:  en ? "Drag tasks from the side panel directly onto the calendar." : "Arrastra tareas del panel lateral directo al calendario.",
    },
    {
      icon: "03",
      title: en ? "Resize blocks" : "Cambia la duración",
      desc:  en ? "Drag the bottom edge of any block to make it longer or shorter." : "Arrastra el borde inferior de un bloque para alargar o acortar su duración.",
    },
  ];

  return (
    <div className={`border ${th.howBorder} rounded-2xl ${th.surfaceHow} p-5 mb-2`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>
          {en ? "How does the calendar work?" : "¿Cómo funciona el calendario?"}
        </span>
        <div className={`flex-1 h-px ${th.divider} opacity-40`} />
      </div>

      <div className={`${th.surfaceFormula} border ${th.borderFormula} rounded-xl p-3 mb-5 font-mono text-center`}>
        <div className={`text-xs ${th.textMuted} mb-1`}>
          {en ? "pomodoro reads visible blocks" : "el pomodoro lee los bloques visibles"}
        </div>
        <div className={`${th.textAccentSoft} text-sm`}>
          {en ? "calendar days → pomodoro tasks" : "días del calendario → tareas del pomodoro"}
        </div>
      </div>

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
