/** Restoration world map: regions unlock gradually, buildings spend coins, weekly-friendly data/map.json. */
import {
  regionById, isRegionUnlocked, regionVisible, regionUnlockBlocked,
  allBuildings, buildingDef, formatCost, payCost, canAfford
} from "./world.js";

export function createMap(ctx) {
  const { $, toast, sfx, persist, refresh, refreshHud, show, startStory, applyChapterLook, playMusic } = ctx;

  let pendingRegion = null;

  function renderMap() {
    const box = $("#nodes");
    if (!box) return;
    const save = ctx.getSave();
    const map = ctx.getMap();
    box.innerHTML = "";
    box.classList.add("town-map");
    for (const region of map.regions || []) {
      if (!regionVisible(map, save, region)) continue;
      const open = isRegionUnlocked(save, region.id);
      const card = document.createElement("article");
      card.className = "region-card" + (open ? "" : " locked") + (save.region === region.id ? " active" : "");
      const src = region.source === "new" ? '<span class="src-new">新創作</span>' : "";
      const thumb = region.bg || "assets/bg/village.webp";
      const blocked = open ? null : regionUnlockBlocked(map, save, region);
      const cost = formatCost(region.unlock || {});
      card.innerHTML = `<header>
        <img class="thumb" src="${thumb}" alt="">
        <div>
          <div class="num">${open ? "已打開" : "還沒打開"}</div>
          <h3>${region.name}${src}</h3>
          <small>${region.subtitle || ""}</small>
          ${open ? "" : `<div class="costs">打開需要：${region.unlock?.type === "start" ? "開場即開放" : cost}${blocked ? "　（" + blocked + "）" : ""}</div>`}
        </div>
      </header>
      <div class="actions"></div>`;
      const actions = card.querySelector(".actions");
      if (open) {
        const go = document.createElement("button");
        go.type = "button";
        go.className = "btn green";
        go.style.minHeight = "40px";
        go.textContent = save.region === region.id ? "正在這裡玩" : "來這裡玩";
        go.addEventListener("click", () => enterRegion(region));
        actions.appendChild(go);
        for (const b of region.buildings || []) actions.parentNode.appendChild(buildingRow(region, b));
      } else {
        const buy = document.createElement("button");
        buy.type = "button";
        buy.className = "btn";
        buy.style.minHeight = "40px";
        buy.textContent = "打開地區";
        buy.disabled = !!blocked;
        buy.addEventListener("click", () => askUnlock(region));
        actions.appendChild(buy);
      }
      box.appendChild(card);
    }
    const soon = document.createElement("article");
    soon.className = "region-card";
    soon.innerHTML = `<header><div><div class="num"><span class="soon-mark">每週更新</span></div>
      <h3>新的小故事製作中</h3><small>之後只要在 data/map.json 加一個地區就能進來。訂單會一直出，可以一直玩。</small></div></header>`;
    box.appendChild(soon);
  }

  function buildingRow(region, b) {
    const save = ctx.getSave();
    const lv = save.buildings?.[b.id] || 0;
    const max = (b.costs || []).length;
    const row = document.createElement("div");
    row.className = "bldg";
    const next = b.costs?.[lv];
    const needOk = !b.need || (() => {
      const [id, n] = b.need.split(":");
      return (save.buildings?.[id] || 0) >= Number(n || 1);
    })();
    row.innerHTML = `<div class="body"><b>${b.name}</b><small>Lv.${lv}/${max}　${b.desc}</small></div>`;
    if (lv < max) {
      const go = document.createElement("button");
      go.type = "button";
      go.className = "btn green go";
      go.style.minHeight = "36px";
      go.style.padding = "6px 12px";
      go.textContent = needOk ? `修復 ${next} 金幣` : "先修好前面的";
      go.disabled = !needOk || (save.coins || 0) < next;
      go.addEventListener("click", () => restoreBuilding(b, region));
      row.appendChild(go);
    } else {
      const done = document.createElement("span");
      done.className = "price";
      done.textContent = "修好了";
      row.appendChild(done);
    }
    return row;
  }

  function askUnlock(region) {
    const save = ctx.getSave();
    const map = ctx.getMap();
    const blocked = regionUnlockBlocked(map, save, region);
    if (blocked) { sfx.invalid(); toast(blocked); return; }
    pendingRegion = region;
    $("#region-buy-title").textContent = "打開「" + region.name + "」";
    const tag = region.source === "new" ? "這是為遊戲新創作的地點。" : "";
    $("#region-buy-sub").textContent = (region.subtitle || "") + (tag ? " " + tag : "");
    $("#region-buy-cost").textContent = formatCost(region.unlock);
    $("#region-buy")?.classList.add("on");
  }

  function confirmUnlockRegion() {
    const region = pendingRegion;
    pendingRegion = null;
    $("#region-buy")?.classList.remove("on");
    if (!region) return;
    const save = ctx.getSave();
    const map = ctx.getMap();
    const blocked = regionUnlockBlocked(map, save, region);
    if (blocked) { sfx.invalid(); toast(blocked); return; }
    payCost(save, region.unlock || {});
    if (!save.unlockedRegions) save.unlockedRegions = ["village"];
    if (!save.unlockedRegions.includes(region.id)) save.unlockedRegions.push(region.id);
    sfx.level?.() || sfx.order();
    toast(`打開了${region.name}！`);
    persist();
    refreshHud();
    const after = () => { enterRegion(region); };
    if (region.intro && !save.flags["seen-region-" + region.id]) {
      save.flags["seen-region-" + region.id] = true;
      persist();
      startStory(region.intro, after);
    } else after();
  }

  function restoreBuilding(b, region) {
    const save = ctx.getSave();
    const lv = save.buildings?.[b.id] || 0;
    const cost = b.costs?.[lv];
    if (cost == null) return;
    if ((save.coins || 0) < cost) { sfx.invalid(); toast("金幣還不夠"); return; }
    if (b.need) {
      const [id, n] = b.need.split(":");
      if ((save.buildings?.[id] || 0) < Number(n || 1)) { toast("先修好前面的建築"); return; }
    }
    save.coins -= cost;
    save.buildings[b.id] = lv + 1;
    const xp = b.xp?.[lv] || 20;
    save.xp = (save.xp || 0) + xp;
    save.level = ctx.xpLevel(save.xp);
    const ch = region?.chapter || save.chapter;
    save.restore[ch] = (save.restore[ch] || 0) + 1;
    const unlockGen = b.unlocks?.[lv];
    if (unlockGen) ctx.grantGen(unlockGen);
    if (b.clump && save.unlockedClumps && !save.unlockedClumps.includes("all") && !save.unlockedClumps.includes(b.clump)) {
      save.unlockedClumps.push(b.clump);
    }
    sfx.order();
    toast(`修好了${b.name}！＋${xp} 經驗`);
    persist();
    refreshHud();
    renderMap();
    ctx.mascot?.cheer?.();
  }

  function enterRegion(region) {
    const save = ctx.getSave();
    save.region = region.id;
    if (region.chapter) save.chapter = region.chapter;
    persist();
    applyChapterLook();
    playMusic(region.music || region.chapter || save.chapter);
    sfx.tap();
    show("play");
  }

  function bind() {
    $("#btn-go-map")?.addEventListener("click", () => { sfx.tap(); show("map"); });
    $("#btn-region-cancel")?.addEventListener("click", () => { $("#region-buy")?.classList.remove("on"); pendingRegion = null; });
    $("#btn-region-ok")?.addEventListener("click", confirmUnlockRegion);
    $("#btn-discover-ok")?.addEventListener("click", () => { $("#discover")?.classList.remove("on"); });
  }

  return { renderMap, confirmUnlockRegion, restoreBuilding, enterRegion, askUnlock, bind };
}
