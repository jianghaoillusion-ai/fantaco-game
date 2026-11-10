/** Grid dimensions must be 7×9 on every viewport. */
import { BOARD_COLS, BOARD_ROWS, fitBoardCell, migrateToFixedBoard } from "../js/board-layout.js";
import { remapBoard, starterBoard, emptyBoard } from "../js/merge.js";
import assert from "node:assert/strict";

const viewports = [
  [200, 200], [320, 568], [375, 667], [393, 852], [430, 932],
  [768, 1024], [820, 1180], [1024, 1366], [1180, 820],
  [1280, 800], [1440, 900], [1920, 1080], [9000, 400], [400, 9000]
];

let failed = 0;
for (const [w, h] of viewports) {
  const a = fitBoardCell(w, h);
  const b = fitBoardCell(h, w);
  for (const p of [a, b]) {
    try {
      assert.equal(p.cols, BOARD_COLS, `${w}x${h} cols`);
      assert.equal(p.rows, BOARD_ROWS, `${w}x${h} rows`);
      assert.equal(p.cols, 7);
      assert.equal(p.rows, 9);
    } catch (e) {
      console.error(e.message);
      failed++;
    }
  }
}

// migrate a 10×7 board: all items survive on 7×9 or in the bag
const old = emptyBoard(10, 7);
old[0] = { kind: "item", chain: "star", tier: 1, uid: "a" };
old[69] = { kind: "item", chain: "garden", tier: 2, uid: "b" };
old[25] = { kind: "gen", gen: "star", tier: 1, uid: "c" };
const save = { board: old, boardCols: 10, boardRows: 7, inventory: [] };
const result = migrateToFixedBoard(save, { remapBoard, starterBoard });
assert.equal(save.boardCols, 7);
assert.equal(save.boardRows, 9);
assert.equal(save.board.length, 63);
const kept = save.board.filter(Boolean).length + save.inventory.filter(Boolean).length;
assert.equal(kept, 3, "no items lost");
assert.equal(result.migrated, true);

// already 7×9 stays put
const s2 = { board: starterBoard(7, 9), boardCols: 7, boardRows: 9, inventory: [] };
const before = s2.board.filter(Boolean).length;
assert.equal(migrateToFixedBoard(s2, { remapBoard, starterBoard }).migrated, false);
assert.equal(s2.board.filter(Boolean).length, before);

if (failed) {
  console.error(`FAIL: ${failed} viewport(s) changed grid size`);
  process.exit(1);
}
console.log(`ok: ${viewports.length} viewports all returned 7×9; migration keeps items`);
