import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hoursUntil, calculatePriority, roundMinutes, calculatePlan } from '../lib/scheduler';

// Fecha fija para todos los tests
const NOW = new Date('2026-05-06T12:00:00Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

// ── hoursUntil ───────────────────────────────────────────────────────────────

describe('hoursUntil', () => {
  it('retorna positivo para deadlines futuros', () => {
    const future = new Date(NOW.getTime() + 4 * 3600000).toISOString();
    expect(hoursUntil(future)).toBeCloseTo(4, 1);
  });

  it('retorna negativo para deadlines pasados', () => {
    const past = new Date(NOW.getTime() - 2 * 3600000).toISOString();
    expect(hoursUntil(past)).toBeCloseTo(-2, 1);
  });

  it('retorna ~0 para deadline en el momento exacto', () => {
    expect(hoursUntil(NOW.toISOString())).toBeCloseTo(0, 1);
  });
});

// ── calculatePriority ────────────────────────────────────────────────────────

describe('calculatePriority', () => {
  it('retorna Infinity para tareas vencidas', () => {
    const task = {
      anxiety: 80, hours: 3,
      deadline: new Date(NOW.getTime() - 3600000).toISOString(),
    };
    expect(calculatePriority(task)).toBe(Infinity);
  });

  it('retorna Infinity cuando deadline === ahora (T <= 0)', () => {
    const task = { anxiety: 50, hours: 2, deadline: NOW.toISOString() };
    expect(calculatePriority(task)).toBe(Infinity);
  });

  it('mayor ansiedad → mayor prioridad (mismas horas y deadline)', () => {
    const deadline = new Date(NOW.getTime() + 10 * 3600000).toISOString();
    const low  = calculatePriority({ anxiety: 20, hours: 2, deadline });
    const high = calculatePriority({ anxiety: 80, hours: 2, deadline });
    expect(high).toBeGreaterThan(low);
  });

  it('deadline más próximo → mayor prioridad (misma ansiedad y horas)', () => {
    const close = new Date(NOW.getTime() +  2 * 3600000).toISOString();
    const far   = new Date(NOW.getTime() + 24 * 3600000).toISOString();
    const pClose = calculatePriority({ anxiety: 60, hours: 2, deadline: close });
    const pFar   = calculatePriority({ anxiety: 60, hours: 2, deadline: far   });
    expect(pClose).toBeGreaterThan(pFar);
  });

  it('retorna número positivo para tarea normal', () => {
    const deadline = new Date(NOW.getTime() + 8 * 3600000).toISOString();
    const p = calculatePriority({ anxiety: 50, hours: 2, deadline });
    expect(p).toBeGreaterThan(0);
    expect(p).not.toBe(Infinity);
  });
});

// ── roundMinutes ─────────────────────────────────────────────────────────────

describe('roundMinutes', () => {
  it('redondea al múltiplo de 5 más cercano', () => {
    expect(roundMinutes(23)).toBe(25);
    expect(roundMinutes(22)).toBe(20);
    expect(roundMinutes(30)).toBe(30);
  });

  it('descarta bloques menores a 15 min', () => {
    expect(roundMinutes(14)).toBe(0);
    expect(roundMinutes(5)).toBe(0);
    expect(roundMinutes(0)).toBe(0);
  });

  it('acepta exactamente 15 min', () => {
    expect(roundMinutes(15)).toBe(15);
  });
});

// ── calculatePlan ────────────────────────────────────────────────────────────

describe('calculatePlan', () => {
  const deadline = (hoursFromNow) =>
    new Date(NOW.getTime() + hoursFromNow * 3600000).toISOString();

  it('retorna array vacío si no hay tareas', () => {
    expect(calculatePlan([], 4)).toEqual([]);
  });

  it('no supera las horas disponibles', () => {
    const tasks = [
      { name: 'A', hours: 5, anxiety: 70, deadline: deadline(6) },
      { name: 'B', hours: 4, anxiety: 50, deadline: deadline(10) },
      { name: 'C', hours: 3, anxiety: 40, deadline: deadline(20) },
    ];
    const plan = calculatePlan(tasks, 3);
    const totalMin = plan.reduce((s, t) => s + t.minutes, 0);
    expect(totalMin).toBeLessThanOrEqual(3 * 60 + 5); // margen de redondeo
  });

  it('incluye tareas vencidas antes que las normales', () => {
    const tasks = [
      { name: 'vencida', hours: 2, anxiety: 30, deadline: deadline(-1) },
      { name: 'urgente', hours: 2, anxiety: 90, deadline: deadline(4)  },
    ];
    const plan = calculatePlan(tasks, 4);
    const names = plan.map(t => t.name);
    expect(names.indexOf('vencida')).toBeLessThan(names.indexOf('urgente'));
  });

  it('ordena tareas normales por prioridad descendente', () => {
    const tasks = [
      { name: 'baja',  hours: 2, anxiety: 10, deadline: deadline(48) },
      { name: 'alta',  hours: 2, anxiety: 90, deadline: deadline(4)  },
      { name: 'media', hours: 2, anxiety: 50, deadline: deadline(12) },
    ];
    // Suficientes horas para que todas reciban tiempo (>=15 min cada una)
    const plan  = calculatePlan(tasks, 6);
    const names = plan.map(t => t.name);
    // 'alta' aparece antes que 'media'
    expect(names.indexOf('alta')).toBeLessThan(names.indexOf('media'));
    // 'baja' puede no aparecer si su share < 15 min; si aparece, va al final
    if (names.includes('baja')) {
      expect(names.indexOf('media')).toBeLessThan(names.indexOf('baja'));
    }
  });

  it('cada entrada tiene los campos requeridos', () => {
    const tasks = [{ name: 'X', hours: 2, anxiety: 60, deadline: deadline(8) }];
    const plan = calculatePlan(tasks, 2);
    expect(plan.length).toBeGreaterThan(0);
    const entry = plan[0];
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('minutes');
    expect(entry).toHaveProperty('priority');
    expect(entry).toHaveProperty('timeLeft');
    expect(entry.minutes).toBeGreaterThan(0);
  });

  it('con una sola tarea asigna todos los minutos disponibles (cap en hours)', () => {
    const tasks = [{ name: 'Única', hours: 1, anxiety: 80, deadline: deadline(5) }];
    const plan = calculatePlan(tasks, 4); // 4h disponibles, tarea de 1h
    expect(plan[0].minutes).toBe(60); // no puede superar hours × 60
  });

  it('múltiples tareas vencidas reparten el tiempo equitativamente', () => {
    const tasks = [
      { name: 'V1', hours: 3, anxiety: 50, deadline: deadline(-2) },
      { name: 'V2', hours: 3, anxiety: 50, deadline: deadline(-1) },
    ];
    const plan = calculatePlan(tasks, 2);
    const mins = plan.map(t => t.minutes);
    // Cada una debería recibir ~60 min (1h cada una de 2h disponibles)
    expect(Math.abs(mins[0] - mins[1])).toBeLessThanOrEqual(5);
  });
});
