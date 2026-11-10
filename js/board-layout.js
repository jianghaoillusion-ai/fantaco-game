/** Fixed 7×9 merge board on every device. Only the cell pixel size changes. */

export const BOARD_COLS = 7;
export const BOARD_ROWS = 9;
export const MIN_CELL = 42;
export const MAX_CELL = 72;

/** Fit a 7×9 board into a box. cols/rows never depend on viewport. */
export function fitBoardCell(availW, availH) {
  const cols = BOARD_COLS;
  const rows = BOARD_ROWS;
  const gap = availW < 430 ? 3 : 5;
  const pad = availW < 430 ? 4 : 6;
  const border = 8;
  const cellW = (availW - pad * 2 - gap * (cols - 1) - border) / cols;
  const cellH = (availH - pad * 2 - gap * (rows - 1) - border) / rows;
  let cell = Math.floor(Math.min(cellW, cellH, MAX_CELL));
  if (!Number.isFinite(cell) || cell < 8) cell = 8;
  return { cols, rows, cell, gap, pad, minCell: MIN_CELL };
}

/**
 * Remap any saved board onto the standard 7×9 grid.
 * Leftover pieces always go into the magic bag — nothing is dropped.
 */
export function migrateToFixedBoard(save, { remapBoard, starterBoard }) {
  const cols = BOARD_COLS, rows = BOARD_ROWS;
  const oldC = save.boardCols || 7;
  const oldR = save.boardRows || (save.board && oldC ? Math.max(1, Math.floor((save.board.length || 0) / oldC)) : rows);
  if (!save.inventory) save.inventory = [];
  if (!save.board) {
    save.board = starterBoard(cols, rows);
    save.boardCols = cols;
    save.boardRows = rows;
    return { migrated: true, overflow: 0 };
  }
  if (oldC === cols && oldR === rows && save.board.length === cols * rows) {
    save.boardCols = cols;
    save.boardRows = rows;
    return { migrated: false, overflow: 0 };
  }
  const { board, overflow } = remapBoard(save.board, oldC, oldR, cols, rows);
  save.board = board;
  for (const cell of overflow) {
    if (cell) save.inventory.push(cell);
  }
  save.boardCols = cols;
  save.boardRows = rows;
  return { migrated: true, overflow: overflow.length };
}
