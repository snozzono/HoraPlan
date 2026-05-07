import { describe, it, expect } from 'vitest';

// Lógica extraída de Planner.jsx para calcular el plan del pomodoro
function buildPomodoroplan(plan, scheduledEntries) {
  if (!scheduledEntries?.length) return plan;
  return scheduledEntries.map(({ name, minutes }) => {
    const existing = plan.find(t => t.name === name);
    return existing
      ? existing
      : { name, minutes, priority: Infinity, timeLeft: Infinity, deadline: null };
  });
}

const basePlan = [
  { name: 'Matemáticas', minutes: 90, priority: 4.5, timeLeft: '8.0', deadline: '2026-05-07' },
  { name: 'Física',      minutes: 60, priority: 3.0, timeLeft: '12.0', deadline: '2026-05-08' },
  { name: 'Historia',    minutes: 45, priority: 1.5, timeLeft: '24.0', deadline: '2026-05-09' },
];

// ── Sin filtro de calendario ───────────────────────────────────────────────

describe('buildPomodoroplan — sin filtro', () => {
  it('retorna el plan completo cuando scheduledEntries es null', () => {
    expect(buildPomodoroplan(basePlan, null)).toBe(basePlan);
  });

  it('retorna el plan completo cuando scheduledEntries es vacío', () => {
    expect(buildPomodoroplan(basePlan, [])).toBe(basePlan);
  });
});

// ── Filtro: tareas del planner ─────────────────────────────────────────────

describe('buildPomodoroplan — tareas del planner con bloques en calendario', () => {
  it('usa los minutos del plan (no del calendario) para tareas existentes', () => {
    const entries = [{ name: 'Matemáticas', minutes: 30 }]; // bloque de 30 min
    const result  = buildPomodoroplan(basePlan, entries);
    expect(result[0].minutes).toBe(90); // debe usar los 90 del plan
  });

  it('filtra solo las tareas con bloques en el calendario', () => {
    const entries = [
      { name: 'Matemáticas', minutes: 30 },
      { name: 'Historia',    minutes: 25 },
    ];
    const result = buildPomodoroplan(basePlan, entries);
    const names  = result.map(t => t.name);
    expect(names).toContain('Matemáticas');
    expect(names).toContain('Historia');
    expect(names).not.toContain('Física');
  });

  it('preserva todos los campos de la entrada original del plan', () => {
    const entries = [{ name: 'Física', minutes: 20 }];
    const result  = buildPomodoroplan(basePlan, entries);
    expect(result[0]).toEqual(basePlan[1]); // referencia exacta al objeto del plan
  });
});

// ── Bloques creados solo en el calendario (no están en el plan) ─────────────

describe('buildPomodoroplan — bloques puros del calendario', () => {
  it('crea entrada sintética para bloque sin tarea en el plan', () => {
    const entries = [{ name: 'Lectura libre', minutes: 45 }];
    const result  = buildPomodoroplan(basePlan, entries);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Lectura libre');
    expect(result[0].minutes).toBe(45);
    expect(result[0].priority).toBe(Infinity);
    expect(result[0].deadline).toBeNull();
  });

  it('mezcla tareas del plan y bloques puros del calendario', () => {
    const entries = [
      { name: 'Matemáticas', minutes: 30 }, // existe en plan
      { name: 'Yoga',        minutes: 20 }, // no existe en plan
    ];
    const result = buildPomodoroplan(basePlan, entries);
    const mate   = result.find(t => t.name === 'Matemáticas');
    const yoga   = result.find(t => t.name === 'Yoga');

    expect(mate.minutes).toBe(90);       // minutos del plan
    expect(yoga.minutes).toBe(20);       // minutos del bloque
    expect(yoga.priority).toBe(Infinity);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe('buildPomodoroplan — edge cases', () => {
  it('plan vacío con entradas del calendario crea sintéticos', () => {
    const entries = [{ name: 'Tarea X', minutes: 25 }];
    const result  = buildPomodoroplan([], entries);
    expect(result[0].name).toBe('Tarea X');
    expect(result[0].minutes).toBe(25);
  });

  it('respeta el orden de los scheduledEntries', () => {
    const entries = [
      { name: 'Historia',    minutes: 25 },
      { name: 'Matemáticas', minutes: 30 },
    ];
    const result = buildPomodoroplan(basePlan, entries);
    expect(result[0].name).toBe('Historia');
    expect(result[1].name).toBe('Matemáticas');
  });
});
