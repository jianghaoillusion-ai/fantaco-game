/** Connected center-out island; budget persists independently of responsive grid dimensions. */
export function openCells(save) {
  const cols = save.boardCols, rows = save.boardRows;
  if (save.fog.legacyOpen) return Array.from({ length: cols * rows }, (_, i) => i);
  const queue = [Math.floor(rows / 2) * cols + Math.floor(cols / 2)], seen = new Set(queue);
  for (let p = 0; p < queue.length && queue.length < Math.min(save.fog.openCount, cols * rows); p++) {
    const i = queue[p], r = Math.floor(i / cols), c = i % cols;
    for (const [dr, dc] of [[-1,0],[0,-1],[0,1],[1,0]]) {
      const nr = r + dr, nc = c + dc, j = nr * cols + nc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen.has(j)) continue;
      seen.add(j); queue.push(j);
      if (queue.length >= Math.min(save.fog.openCount, cols * rows)) break;
    }
  }
  return queue;
}

export function isCellOpen(save, i) { return openCells(save).includes(i); }
export function firstOpenEmpty(save) { return openCells(save).find(i => !save.board[i]) ?? -1; }

export function arrangeFogBoard(save, cols, rows) {
  const oldCols = save.boardCols, oldRows = save.boardRows, old = save.board || [];
  save.boardCols = cols; save.boardRows = rows;
  const cells = openCells(save), allowed = new Set(cells), next = Array(cols * rows).fill(null), pending = [];
  for (let i = 0; i < old.length; i++) {
    if (!old[i]) continue;
    const r = Math.round(Math.floor(i / oldCols) * (rows - 1) / Math.max(1, oldRows - 1));
    const c = Math.round((i % oldCols) * (cols - 1) / Math.max(1, oldCols - 1));
    const j = r * cols + c;
    if (allowed.has(j) && !next[j]) next[j] = old[i]; else pending.push(old[i]);
  }
  for (const item of pending) {
    const j = cells.find(i => !next[i]);
    if (j !== undefined) next[j] = item;
    else save.inventory.push(item); // overflow is retrievable, never truncated to bag capacity
  }
  save.board = next;
}
