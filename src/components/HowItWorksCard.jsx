export default function HowItWorksCard({ th, T }) {
  const steps = [
    { icon: "01", title: T.step1Title, desc: T.step1Desc },
    { icon: "02", title: T.step2Title, desc: T.step2Desc },
    { icon: "03", title: T.step3Title, desc: T.step3Desc },
  ];

  return (
    <div className={`border ${th.howBorder} rounded-2xl ${th.surfaceHow} p-5 mb-2`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-mono ${th.textAccent} opacity-80 uppercase tracking-widest`}>
          {T.howTitle}
        </span>
        <div className={`flex-1 h-px ${th.divider} opacity-40`} />
      </div>

      <div className={`${th.surfaceFormula} border ${th.borderFormula} rounded-xl p-3 mb-5 font-mono text-center`}>
        <div className={`text-xs ${th.textMuted} mb-1`}>{T.priorityLabel}</div>
        <div className={`${th.textAccentSoft} text-sm`}>
          (anxiety × hours) / T × ln(hours + 1)
        </div>
        <div className={`text-xs ${th.textMuted} mt-1`}>
          {T.formulaDesc}
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
