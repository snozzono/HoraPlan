import { useState, useEffect, useRef } from "react";

const PRESETS = {
  standard: { work: 25, shortBreak: 5,  longBreak: 15, longBreakEvery: 4 },
  beast:    { work: 0,  shortBreak: 0,  longBreak: 0,  longBreakEvery: 0 },
};

function buildSequence(plan, cfg) {
  if (cfg.preset === "beast") {
    return plan.map(t => ({ type: "work", task: t.name, duration: t.minutes * 60 }));
  }
  const workSec = cfg.work * 60;
  const sbSec   = cfg.shortBreak * 60;
  const lbSec   = cfg.longBreak  * 60;
  const blocks  = [];

  for (const t of plan) {
    let rem = t.minutes * 60;
    while (rem > 0) {
      const dur = workSec > 0 ? Math.min(rem, workSec) : rem;
      blocks.push({ type: "work", task: t.name, duration: dur });
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
        seq.push({ type: "longBreak",  task: null, duration: lbSec });
      else if (sbSec > 0)
        seq.push({ type: "shortBreak", task: null, duration: sbSec });
    }
  }
  return seq;
}

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function playSound(type) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (freq, t0, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + t0);
      g.gain.linearRampToValueAtTime(0.45, ctx.currentTime + t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + dur);
      o.start(ctx.currentTime + t0);
      o.stop(ctx.currentTime + t0 + dur + 0.05);
    };
    if (type === "work") {
      beep(523, 0, 0.12); beep(659, 0.15, 0.12); beep(784, 0.30, 0.30);
    } else if (type === "break") {
      beep(659, 0, 0.20); beep(523, 0.25, 0.40);
    } else {
      beep(523, 0, 0.10); beep(659, 0.12, 0.10); beep(784, 0.24, 0.10); beep(1047, 0.38, 0.50);
    }
  } catch {}
}

export default function PomodoroView({ plan, planHistory = [], onLoadPlan, onDeleteEntry, th, T }) {
  const [preset, setPreset]     = useState("standard");
  const [cfg, setCfg]           = useState({ preset: "standard", ...PRESETS.standard });
  const [seq, setSeq]           = useState([]);
  const [cur, setCur]           = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning]   = useState(false);
  const [freeMode, setFreeMode] = useState(false);

  const stateRef   = useRef({ seq: [], cur: 0, timeLeft: 0 });
  stateRef.current = { seq, cur, timeLeft };

  const blockEndRef = useRef(null);

  const swRef = useRef(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => { swRef.current = reg; });
    }
  }, []);

  const blockLabels = { work: T.work, shortBreak: T.shortBreak, longBreak: T.longBreak };

  const block  = seq[cur];
  const isWork = block?.type === "work";
  const pct    = block ? ((block.duration - timeLeft) / block.duration) * 100 : 0;

  const notifSupported = "Notification" in window;
  const [notifPermission, setNotifPermission] = useState(
    () => (notifSupported ? Notification.permission : "granted")
  );

  async function requestNotifPermission() {
    if (!notifSupported) return;
    const p = await Notification.requestPermission();
    setNotifPermission(p);
  }

  useEffect(() => {
    if (!block) return;
    const emoji = running ? (block.type === "work" ? "🍅" : "☕") : "⏸";
    const label = block.task ?? blockLabels[block.type];
    document.title = `${emoji} ${fmt(timeLeft)} — ${label}`;
  }, [timeLeft, running, block, T]);

  useEffect(() => {
    const s = buildSequence(plan, cfg);
    setSeq(s);
    setCur(0);
    setRunning(false);
    setTimeLeft(s[0]?.duration ?? 0);
    blockEndRef.current = null;
  }, [plan, cfg]);

  function notify(b) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const isW  = b.type === "work";
    const title = isW ? T.timeToWork : T.takeBreak;
    const opts  = { body: isW ? b.task : blockLabels[b.type], icon: "/favicon.svg" };
    if (swRef.current) swRef.current.showNotification(title, opts);
    else new Notification(title, opts);
  }

  function scheduleSwNotif(b, delayMs) {
    if (!swRef.current?.active) return;
    const isW = b.type === "work";
    swRef.current.active.postMessage({
      type:  "SCHEDULE_NOTIFICATION",
      delay: delayMs,
      title: isW ? T.timeToWork : T.takeBreak,
      body:  isW ? b.task : blockLabels[b.type],
    });
  }

  useEffect(() => {
    if (running) {
      blockEndRef.current = Date.now() + stateRef.current.timeLeft * 1000;
      const b = stateRef.current.seq[stateRef.current.cur];
      if (b) scheduleSwNotif(b, stateRef.current.timeLeft * 1000);
    } else {
      blockEndRef.current = null;
    }
  }, [running]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !blockEndRef.current) return;
      const rem = Math.ceil((blockEndRef.current - Date.now()) / 1000);
      if (rem > 0) setTimeLeft(rem);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!blockEndRef.current) return;
      const rem = Math.ceil((blockEndRef.current - Date.now()) / 1000);
      if (rem > 0) { setTimeLeft(rem); return; }

      const { seq: s, cur: c } = stateRef.current;
      const next = c + 1;
      if (next < s.length) {
        playSound(s[next].type === "work" ? "work" : "break");
        notify(s[next]);
        setCur(next);
        blockEndRef.current = Date.now() + s[next].duration * 1000;
        setTimeLeft(s[next].duration);
        scheduleSwNotif(s[next], s[next].duration * 1000);
      } else {
        playSound("done");
        if ("Notification" in window && Notification.permission === "granted") {
          const opts = { body: T.goodWork, icon: "/favicon.svg" };
          if (swRef.current) swRef.current.showNotification(T.planComplete, opts);
          else new Notification(T.planComplete, opts);
        }
        setRunning(false);
        blockEndRef.current = null;
        setTimeLeft(0);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!plan.length || freeMode) return;
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      setRunning(v => !v);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [freeMode, plan.length]);

  function goTo(i) {
    setCur(i);
    setTimeLeft(seq[i].duration);
    setRunning(false);
    blockEndRef.current = null;
  }

  function changePreset(p) {
    setPreset(p);
    if (p !== "custom") setCfg({ preset: p, ...PRESETS[p] });
    else setCfg(c => ({ ...c, preset: "custom" }));
  }

  return (
    <div className="space-y-4">

      {/* Tabs: Plan / Libre */}
      <div className="flex gap-2">
        {[["plan", `🍅 Plan`], ["libre", `⚡ ${T.standard === "Standard" ? "Free" : "Libre"}`]].map(([val, label]) => (
          <button key={val} onClick={() => setFreeMode(val === "libre")}
            className={`flex-1 text-xs font-mono py-2 rounded-xl border transition-colors ${
              freeMode === (val === "libre")
                ? "bg-amber-400 text-zinc-950 border-amber-400 font-bold"
                : `${th.toggleBorder} ${th.textToggle}`
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Banner de notificaciones */}
      {notifSupported && notifPermission !== "granted" && (
        <button
          onClick={requestNotifPermission}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-orange-400/40 bg-orange-400/10 text-left transition-colors hover:bg-orange-400/20 active:scale-[0.98]"
        >
          <span className="text-xl">🔔</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-orange-400 font-mono">
              {T.allowNotifs}
            </p>
            <p className={`text-xs font-mono ${th.textMuted} mt-0.5`}>
              {T.allowNotifsDesc}
            </p>
          </div>
          <span className="text-orange-400 text-sm">→</span>
        </button>
      )}

      {freeMode ? (
        <FreePomodoro th={th} T={T} />
      ) : !plan.length ? (
        <section className={`border ${th.border} rounded-2xl ${th.surface} p-8 text-center`}>
          <p className={`text-sm font-mono ${th.textMuted}`}>{T.noPlan}</p>
        </section>
      ) : <>

      {/* Modo */}
      <section className={`border rounded-2xl ${th.surface} shadow-sm overflow-hidden transition-all duration-500 ${running ? "max-h-0 p-0 opacity-0 border-transparent" : `max-h-[32rem] p-5 opacity-100 ${th.border}`}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>{T.mode}</h2>
        </div>
        <div>
        <div className="flex gap-2 mb-4">
          {[["standard", T.standard], ["beast", T.beast], ["custom", "Custom"]].map(([k, l]) => (
            <button key={k} onClick={() => changePreset(k)}
              className={`flex-1 text-xs font-mono py-1.5 rounded-lg border transition-colors ${
                preset === k
                  ? "bg-amber-400 text-zinc-950 border-amber-400 font-bold"
                  : `${th.toggleBorder} ${th.textToggle}`
              }`}
            >{l}</button>
          ))}
        </div>

        {preset !== "beast" && (
          <div className="space-y-3">
            {[
              [T.workMin,        "work",          1, 120],
              [T.shortBreakMin,  "shortBreak",    0,  30],
              [T.longBreakMin,   "longBreak",     0,  60],
              [T.longBreakEveryN,"longBreakEvery",1,  10],
            ].map(([label, key, min, max]) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className={`text-xs font-mono ${th.textLabel}`}>{label}</span>
                  <span className={`text-xs font-mono ${th.textAccent}`}>{cfg[key]}</span>
                </div>
                <input type="range" min={min} max={max} value={cfg[key]}
                  onChange={e => {
                    setPreset("custom");
                    setCfg(c => ({ ...c, preset: "custom", [key]: Number(e.target.value) }));
                  }}
                  className="w-full accent-amber-400"
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </section>

      {/* Timer */}
      <section className={`border ${th.planBorder} rounded-2xl ${th.planBg} p-6 text-center`}>
        <p className={`text-xs font-mono ${th.textMuted} uppercase tracking-widest mb-1`}>
          {blockLabels[block?.type]} · {cur + 1} / {seq.length}
        </p>
        <p className={`text-sm font-semibold ${th.text} mb-5 truncate px-4`}>
          {block?.task ?? "—"}
        </p>

        <div className="font-mono text-7xl font-bold text-amber-400 tabular-nums tracking-widest mb-6">
          {fmt(timeLeft)}
        </div>

        <div className="flex justify-center gap-3 mb-5">
          <button onClick={() => goTo(Math.max(0, cur - 1))} disabled={cur === 0}
            className={`w-10 h-10 rounded-xl border ${th.toggleBorder} ${th.textToggle} disabled:opacity-30 transition-colors`}>
            ◀
          </button>
          <button onClick={() => setRunning(v => !v)}
            className="w-14 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold text-xl transition-all">
            {running ? "⏸" : "▶"}
          </button>
          <button onClick={() => goTo(Math.min(seq.length - 1, cur + 1))} disabled={cur === seq.length - 1}
            className={`w-10 h-10 rounded-xl border ${th.toggleBorder} ${th.textToggle} disabled:opacity-30 transition-colors`}>
            ▶
          </button>
        </div>

        <p className={`text-xs font-mono ${th.textMuted} mt-2`}>{T.spacePlayPause}</p>
      </section>

      {/* Secuencia */}
      <section className={`border ${th.border} rounded-2xl ${th.surface} p-4`}>
        <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest mb-3`}>{T.sequence}</h2>
        <div className="flex flex-wrap gap-1.5 items-center">
          {seq.map((b, i) => (
            <button key={i} onClick={() => goTo(i)}
              title={b.task ?? blockLabels[b.type]}
              className={`rounded-full transition-all duration-200 ${
                i === cur ? "w-6 h-3 opacity-100" : "w-2 h-2 opacity-40 hover:opacity-75"
              } ${b.type === "work" ? "bg-amber-400" : "bg-emerald-400"}`}
            />
          ))}
        </div>
      </section>

      </> }

      {/* Historial */}
      {!freeMode && planHistory.length > 0 && (
        <HistorialSection planHistory={planHistory} onLoadPlan={onLoadPlan} onDeleteEntry={onDeleteEntry} th={th} T={T} />
      )}

      {/* Dev tools */}
      {!freeMode && (
        <section className={`border ${th.border} rounded-2xl ${th.surfaceDev} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-mono ${th.textMuted} uppercase tracking-widest`}>Dev tools</span>
            <div className={`flex-1 h-px ${th.divider}`} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setTimeLeft(5); if (running) blockEndRef.current = Date.now() + 5000; }}
              className={`flex-1 border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all`}
            >⚡ 5s</button>
            <button
              onClick={() => playSound("done")}
              className={`flex-1 border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all`}
            >🔊 sound</button>
            <button
              onClick={() => notify(block ?? { type: "work", task: "test" })}
              className={`flex-1 border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all`}
            >🔔 notif</button>
          </div>
        </section>
      )}

    </div>
  );
}

function FreePomodoro({ th, T }) {
  const [name, setName]         = useState("");
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [sessions, setSessions] = useState(0);

  const blockEndRef = useRef(null);
  const nameRef     = useRef("");
  nameRef.current   = name;

  useEffect(() => {
    if (!running) {
      setTimeLeft(duration * 60);
      setDone(false);
      blockEndRef.current = null;
    }
  }, [duration]);

  useEffect(() => {
    if (running) {
      blockEndRef.current = Date.now() + timeLeft * 1000;
    } else {
      blockEndRef.current = null;
    }
  }, [running]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !blockEndRef.current) return;
      const rem = Math.ceil((blockEndRef.current - Date.now()) / 1000);
      if (rem > 0) setTimeLeft(rem);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      setRunning(v => !v);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!blockEndRef.current) return;
      const rem = Math.ceil((blockEndRef.current - Date.now()) / 1000);
      if (rem > 0) {
        const label = T.freeLabel(nameRef.current);
        document.title = `🍅 ${fmt(rem)} — ${label}`;
        setTimeLeft(rem);
        return;
      }
      const label = T.freeLabel(nameRef.current);
      playSound("done");
      setSessions(s => s + 1);
      setRunning(false);
      setDone(true);
      blockEndRef.current = null;
      setTimeLeft(0);
      document.title = `${T.sessionDoneTitle} — ${label}`;
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(T.sessionComplete, { body: label, icon: "/favicon.svg" });
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, T]);

  function reset() {
    setRunning(false);
    setTimeLeft(duration * 60);
    setDone(false);
    blockEndRef.current = null;
  }

  const totalSec = duration * 60;
  const pct = totalSec > 0
    ? ((totalSec - (timeLeft > 0 ? timeLeft : 0)) / totalSec) * 100
    : 0;

  return (
    <div className="space-y-4">
      <section className={`border ${th.planBorder} rounded-2xl ${th.planBg} p-5`}>
      {sessions > 0 && (
        <p className={`text-xs font-mono ${th.textMuted} text-center mb-3`}>
          {T.completedSessions(sessions)}
        </p>
      )}

      <input
        type="text"
        placeholder={T.whatWorkOn}
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={running}
        className={`w-full mb-4 border ${th.inputBorder} ${th.inputBg} ${th.inputText} ${th.inputPlaceholder} ${th.inputFocus} rounded-xl px-4 py-2.5 text-sm outline-none transition-colors font-mono disabled:opacity-50`}
      />

      <div className="mb-5">
        <div className="flex justify-between mb-1">
          <span className={`text-xs font-mono ${th.textLabel}`}>{T.duration}</span>
          <span className={`text-xs font-mono ${th.textAccent}`}>{duration} min</span>
        </div>
        <input
          type="range" min={5} max={120} step={5}
          value={duration}
          onChange={e => { if (!running) setDuration(Number(e.target.value)); }}
          disabled={running}
          className="w-full accent-amber-400 disabled:opacity-50"
        />
      </div>

      {done && (
        <p className="text-sm font-mono text-emerald-400 text-center mb-3">{T.sessionComplete}</p>
      )}

      <div className="font-mono text-7xl font-bold text-amber-400 tabular-nums tracking-widest text-center mb-6">
        {fmt(timeLeft)}
      </div>

      <div className="flex justify-center gap-3 mb-5">
        <button
          onClick={reset}
          className={`w-10 h-10 rounded-xl border ${th.toggleBorder} ${th.textToggle} transition-colors text-lg`}
        >↺</button>
        <button
          onClick={() => { setDone(false); setRunning(v => !v); }}
          className="w-14 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold text-xl transition-all"
        >
          {running ? "⏸" : "▶"}
        </button>
      </div>

      <div className={`w-full h-1.5 ${th.planBarBg} rounded-full overflow-hidden mt-1`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`text-xs font-mono ${th.textMuted} text-center mt-3`}>{T.spacePlayPause}</p>
      </section>

      <section className={`border ${th.border} rounded-2xl ${th.surfaceDev} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-mono ${th.textMuted} uppercase tracking-widest`}>Dev tools</span>
          <div className={`flex-1 h-px ${th.divider}`} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTimeLeft(5); if (running) blockEndRef.current = Date.now() + 5000; }}
            className={`flex-1 border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all`}
          >⚡ 5s</button>
          <button
            onClick={() => playSound("done")}
            className={`flex-1 border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all`}
          >🔊 sound</button>
          <button
            onClick={() => { if ("Notification" in window && Notification.permission === "granted") new Notification(T.sessionComplete, { body: T.freeLabel(nameRef.current), icon: "/favicon.svg" }); }}
            className={`flex-1 border ${th.borderDevBtn} active:scale-95 ${th.textDevBtn} rounded-xl py-2 text-xs font-mono transition-all`}
          >🔔 notif</button>
        </div>
      </section>
    </div>
  );
}

function HistorialSection({ planHistory, onLoadPlan, onDeleteEntry, th, T }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`border ${th.border} rounded-2xl ${th.surface} p-5 shadow-sm`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between">
        <h2 className={`text-xs font-mono ${th.textSub} uppercase tracking-widest`}>
          {T.history} <span className={th.textAccent}>{planHistory.length}</span>
        </h2>
        <span className={`text-xs font-mono ${th.textMuted}`}>{open ? T.hideHistory : T.showHistory}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {planHistory.map(entry => {
            const date = new Date(entry.savedAt);
            const label = date.toLocaleDateString(T.dateLocale, { weekday: "short", day: "numeric", month: "short" });
            const time  = date.toLocaleTimeString(T.dateLocale, { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={entry.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${th.taskNormal} hover:border-amber-400/40 transition-colors`}>
                <button onClick={() => onLoadPlan?.(entry.plan)} className="flex-1 text-left flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-semibold ${th.text}`}>
                      {entry.plan.at(-1)?.name} — {label} · {time}
                    </span>
                    <div className={`text-xs font-mono ${th.textMuted} mt-0.5`}>
                      {T.tasksCount(entry.taskCount)} · {(entry.totalMinutes / 60).toFixed(1)}h
                    </div>
                  </div>
                  <span className={`text-xs font-mono ${th.textAccent} mr-2`}>{T.loadEntry}</span>
                </button>
                <button
                  onClick={() => onDeleteEntry?.(entry.id)}
                  className={`${th.deleteBtn} text-lg leading-none flex-shrink-0`}
                  aria-label="delete"
                >×</button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
