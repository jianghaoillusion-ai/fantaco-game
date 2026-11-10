/** Irregular island unlock: crates/fog with coin badges, opening in clumps. */
import { clumpOf, isCellOpen, clumpCells, lockedClumpIds, CLUMP_COSTS, isAllOpen } from "./world.js";

export const GEN_POPS = 12;
export const GEN_COOL_MS = 30_000;

export function createFog(ctx) {
  const { toast, sfx, persist, refresh } = ctx;

  function isOpenIndex(i) {
    const cols = ctx.getCols();
    const r = Math.floor(i / cols), c = i % cols;
    return isCellOpen(ctx.getSave(), r, c, cols, ctx.getRows());
  }

  function decorateCell(slot, r, c, item) {
    const save = ctx.getSave();
    const cols = ctx.getCols(), rows = ctx.getRows();
    slot.classList.add((r + c) % 2 ? "odd" : "even");
    if (!isCellOpen(save, r, c, cols, rows)) {
      slot.classList.add("locked");
      const id = clumpOf(r, c, cols, rows);
      slot.dataset.clump = id;
      const crate = document.createElement("img");
      crate.className = "crate-art";
      crate.src = "assets/tiles/crate.png";
      crate.alt = "";
      crate.draggable = false;
      slot.appendChild(crate);
      const cells = clumpCells(id, cols, rows);
      const anchor = cells[Math.floor(cells.length / 2)] || cells[0];
      if (anchor && anchor.r === r && anchor.c === c) {
        const badge = document.createElement("div");
        badge.className = "fog-badge";
        badge.innerHTML = `<img src="assets/ui/coin.svg" alt="">${CLUMP_COSTS[id] || 0}`;
        slot.appendChild(badge);
      }
      return;
    }
    if (item && ctx.getSelected?.() === item.uid) {
      slot.classList.add("selected");
      const br = document.createElement("div");
      br.className = "brackets";
      br.innerHTML = "<i></i><i></i><i></i><i></i>";
      slot.appendChild(br);
    }
    if (item?.kind === "gen") decorateGen(slot.querySelector(".piece"), item);
  }

  function decorateGen(piece, item) {
    if (!piece) return;
    const left = (item.coolUntil || 0) - Date.now();
    if (left > 0) {
      piece.classList.add("cooling");
      piece.classList.remove("ready");
      piece.dataset.cool = Math.ceil(left / 1000) + "s";
    } else {
      piece.classList.add("ready");
      piece.classList.remove("cooling");
      delete piece.dataset.cool;
    }
  }

  function tryUnlockClump(id) {
    const save = ctx.getSave();
    if (!id || isAllOpen(save) || (save.unlockedClumps || ["start"]).includes(id)) return;
    const cost = CLUMP_COSTS[id] || 0;
    if ((save.coins || 0) < cost) {
      sfx.invalid();
      toast(`揭開這一區需要 ${cost} 金幣`);
      return;
    }
    save.coins -= cost;
    save.unlockedClumps = [...(save.unlockedClumps || ["start"]), id];
    sfx.order?.() || sfx.tap();
    toast(`揭開新的一區！（花了 ${cost} 金幣）`);
    persist();
    refresh();
  }

  function onLockedTap(slot) {
    tryUnlockClump(slot?.dataset?.clump);
  }

  function canDropAt(r, c) {
    return isCellOpen(ctx.getSave(), r, c, ctx.getCols(), ctx.getRows());
  }

  function tickCool() {
    document.querySelectorAll(".piece.gen").forEach((el) => {
      const loc = ctx.findCellByUid?.(el.dataset.uid);
      if (loc?.item?.kind === "gen") decorateGen(el, loc.item);
    });
  }

  return { decorateCell, decorateGen, tryUnlockClump, onLockedTap, isOpenIndex, canDropAt, isCellOpen, tickCool, GEN_POPS, GEN_COOL_MS };

}
