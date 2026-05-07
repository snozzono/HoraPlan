import { describe, it, expect } from 'vitest';
import { buildSequence } from '../lib/sequence';

const STANDARD = { preset: 'standard', work: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4 };
const BEAST    = { preset: 'beast',    work: 0,  shortBreak: 0, longBreak: 0,  longBreakEvery: 0 };

const plan = [
  { name: 'Matemáticas', minutes: 50 },
  { name: 'Historia',    minutes: 25 },
];

// ── Modo Estándar ─────────────────────────────────────────────────────────────

describe('buildSequence — standard', () => {
  it('genera bloques de trabajo de 25 min', () => {
    const seq = buildSequence(plan, STANDARD);
    const workBlocks = seq.filter(b => b.type === 'work');
    workBlocks.forEach(b => expect(b.duration).toBeLessThanOrEqual(25 * 60));
  });

  it('intercala descansos cortos entre bloques', () => {
    const seq = buildSequence(plan, STANDARD);
    for (let i = 0; i < seq.length - 1; i++) {
      if (seq[i].type === 'work' && seq[i + 1].type === 'work') {
        // No debería haber dos work seguidos sin descanso
        expect(false).toBe(true);
      }
    }
  });

  it('el primer bloque siempre es de trabajo', () => {
    const seq = buildSequence(plan, STANDARD);
    expect(seq[0].type).toBe('work');
  });

  it('no termina con un descanso', () => {
    const seq = buildSequence(plan, STANDARD);
    expect(seq.at(-1).type).toBe('work');
  });

  it('la tarea del bloque coincide con el nombre del plan', () => {
    const seq = buildSequence(plan, STANDARD);
    const names = seq.filter(b => b.type === 'work').map(b => b.task);
    expect(names).toContain('Matemáticas');
    expect(names).toContain('Historia');
  });

  it('longBreak aparece cada 4 bloques de trabajo', () => {
    const bigPlan = [{ name: 'X', minutes: 200 }]; // 8 pomodoros de 25 min
    const seq = buildSequence(bigPlan, STANDARD);
    const workIndices = seq.map((b, i) => b.type === 'work' ? i : null).filter(i => i !== null);
    // Después del 4to bloque de trabajo debe haber longBreak
    const afterFourth = seq[workIndices[3] + 1];
    expect(afterFourth?.type).toBe('longBreak');
  });
});

// ── Modo Beast ────────────────────────────────────────────────────────────────

describe('buildSequence — beast', () => {
  it('no tiene descansos', () => {
    const seq = buildSequence(plan, BEAST);
    expect(seq.every(b => b.type === 'work')).toBe(true);
  });

  it('cada tarea es un solo bloque con su duración completa', () => {
    const seq = buildSequence(plan, BEAST);
    expect(seq[0].duration).toBe(50 * 60);
    expect(seq[1].duration).toBe(25 * 60);
  });
});

// ── work = 0 en modo custom ───────────────────────────────────────────────────

describe('buildSequence — custom work=0', () => {
  it('trata work=0 igual que beast (sin crash)', () => {
    const cfg = { preset: 'custom', work: 0, shortBreak: 5, longBreak: 15, longBreakEvery: 4 };
    const seq = buildSequence(plan, cfg);
    expect(seq.length).toBeGreaterThan(0);
    expect(seq.every(b => b.type === 'work')).toBe(true);
  });
});

// ── Plan vacío ────────────────────────────────────────────────────────────────

describe('buildSequence — plan vacío', () => {
  it('retorna array vacío', () => {
    expect(buildSequence([], STANDARD)).toEqual([]);
    expect(buildSequence([], BEAST)).toEqual([]);
  });
});
