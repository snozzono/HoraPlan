export function buildSequence(plan, cfg) {
  if (cfg.preset === 'beast' || cfg.work === 0) {
    return plan.map(t => ({ type: 'work', task: t.name, duration: t.minutes * 60 }));
  }
  const workSec = cfg.work * 60;
  const sbSec   = cfg.shortBreak * 60;
  const lbSec   = cfg.longBreak  * 60;
  const blocks  = [];

  for (const t of plan) {
    let rem = t.minutes * 60;
    while (rem > 0) {
      const dur = workSec > 0 ? Math.min(rem, workSec) : rem;
      blocks.push({ type: 'work', task: t.name, duration: dur });
      rem -= dur;
      if (workSec <= 0) break;
    }
  }

  const seq = [];
  for (let i = 0; i < blocks.length; i++) {
    seq.push(blocks[i]);
    if (i < blocks.length - 1) {
      const n = i + 1;
      if (cfg.longBreakEvery > 0 && n % cfg.longBreakEvery === 0 && lbSec > 0)
        seq.push({ type: 'longBreak',  task: null, duration: lbSec });
      else if (sbSec > 0)
        seq.push({ type: 'shortBreak', task: null, duration: sbSec });
    }
  }
  return seq;
}
