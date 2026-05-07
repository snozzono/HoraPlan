import { describe, it, expect } from 'vitest';
import { computeLayout } from '../lib/layout';

// ── Sin bloques ───────────────────────────────────────────────────────────────

describe('computeLayout — vacío', () => {
  it('retorna Map vacío para array vacío', () => {
    expect(computeLayout([])).toEqual(new Map());
  });
});

// ── Un solo bloque ────────────────────────────────────────────────────────────

describe('computeLayout — un bloque', () => {
  it('colIdx=0, totalCols=1', () => {
    const layout = computeLayout([{ id: 1, hour: 9, duration: 1 }]);
    expect(layout.get(1)).toEqual({ colIdx: 0, totalCols: 1 });
  });
});

// ── Bloques consecutivos sin solapamiento ─────────────────────────────────────

describe('computeLayout — sin solapamiento', () => {
  it('bloques secuenciales van en la misma columna', () => {
    const blocks = [
      { id: 1, hour: 8,    duration: 1 },
      { id: 2, hour: 9,    duration: 1 },
      { id: 3, hour: 10,   duration: 1 },
    ];
    const layout = computeLayout(blocks);
    expect(layout.get(1).colIdx).toBe(0);
    expect(layout.get(2).colIdx).toBe(0);
    expect(layout.get(3).colIdx).toBe(0);
    expect(layout.get(1).totalCols).toBe(1);
  });
});

// ── Solapamiento exacto ───────────────────────────────────────────────────────

describe('computeLayout — solapamiento directo', () => {
  it('dos bloques al mismo tiempo → columnas distintas', () => {
    const blocks = [
      { id: 1, hour: 10, duration: 1 },
      { id: 2, hour: 10, duration: 1 },
    ];
    const layout = computeLayout(blocks);
    expect(layout.get(1).colIdx).not.toBe(layout.get(2).colIdx);
    expect(layout.get(1).totalCols).toBe(2);
    expect(layout.get(2).totalCols).toBe(2);
  });

  it('tres bloques simultáneos → tres columnas', () => {
    const blocks = [
      { id: 1, hour: 10, duration: 2 },
      { id: 2, hour: 10, duration: 2 },
      { id: 3, hour: 10, duration: 2 },
    ];
    const layout = computeLayout(blocks);
    const cols = [layout.get(1).colIdx, layout.get(2).colIdx, layout.get(3).colIdx];
    expect(new Set(cols).size).toBe(3);
    expect(layout.get(1).totalCols).toBe(3);
  });
});

// ── Solapamiento parcial ──────────────────────────────────────────────────────

describe('computeLayout — solapamiento parcial', () => {
  it('bloque que empieza antes de que acabe otro → columna distinta', () => {
    const blocks = [
      { id: 1, hour: 9,   duration: 2 }, // 9:00–11:00
      { id: 2, hour: 10,  duration: 1 }, // 10:00–11:00 (se solapa)
    ];
    const layout = computeLayout(blocks);
    expect(layout.get(1).colIdx).not.toBe(layout.get(2).colIdx);
    expect(layout.get(1).totalCols).toBe(2);
  });

  it('bloque que empieza exactamente al final del anterior → misma columna', () => {
    const blocks = [
      { id: 1, hour: 9,  duration: 1 }, // 9:00–10:00
      { id: 2, hour: 10, duration: 1 }, // 10:00–11:00 (no se solapa)
    ];
    const layout = computeLayout(blocks);
    expect(layout.get(1).colIdx).toBe(layout.get(2).colIdx);
    expect(layout.get(1).totalCols).toBe(1);
  });
});

// ── Slots de 15 min (duración 0.25) ──────────────────────────────────────────

describe('computeLayout — slots de 15 min', () => {
  it('bloques de 15 min consecutivos no solapan', () => {
    const blocks = [
      { id: 1, hour: 10,    duration: 0.25 }, // 10:00–10:15
      { id: 2, hour: 10.25, duration: 0.25 }, // 10:15–10:30
    ];
    const layout = computeLayout(blocks);
    expect(layout.get(1).colIdx).toBe(layout.get(2).colIdx);
    expect(layout.get(1).totalCols).toBe(1);
  });

  it('dos bloques de 15 min al mismo slot → columnas distintas', () => {
    const blocks = [
      { id: 1, hour: 10, duration: 0.25 },
      { id: 2, hour: 10, duration: 0.25 },
    ];
    const layout = computeLayout(blocks);
    expect(layout.get(1).colIdx).not.toBe(layout.get(2).colIdx);
    expect(layout.get(1).totalCols).toBe(2);
  });
});
