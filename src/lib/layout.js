export function computeLayout(dayBlocks) {
  if (!dayBlocks.length) return new Map();
  const sorted  = [...dayBlocks].sort((a, b) => a.hour - b.hour || a.id - b.id);
  const colEnds = [];
  const colMap  = new Map();

  for (const block of sorted) {
    const end = block.hour + (block.duration ?? 0.25);
    let col   = colEnds.findIndex(e => e <= block.hour);
    if (col === -1) { col = colEnds.length; colEnds.push(end); }
    else colEnds[col] = end;
    colMap.set(block.id, col);
  }

  const layout = new Map();
  for (const block of sorted) {
    const end  = block.hour + (block.duration ?? 0.25);
    let maxCol = colMap.get(block.id);
    for (const other of sorted) {
      if (other.id === block.id) continue;
      const otherEnd = other.hour + (other.duration ?? 0.25);
      if (other.hour < end && otherEnd > block.hour)
        maxCol = Math.max(maxCol, colMap.get(other.id));
    }
    layout.set(block.id, { colIdx: colMap.get(block.id), totalCols: maxCol + 1 });
  }
  return layout;
}
