/** Title / home screen: icon dock, daily clock state, floating balloons. */

import { todayKey } from "./save.js?v=9";

const ICONS = [
  { id: "btn-map", icon: "assets/icons/map.png", label: "故事地圖", tip: "打開世界地圖，修復小建築" },
  { id: "btn-book", icon: "assets/icons/book.png", label: "魔法書", tip: "看看收集到的寶物" },
  { id: "btn-daily", icon: "assets/icons/clock.png", label: "每日禮物", tip: "每天都可以來領一份禮物" },
  { id: "btn-redeem", icon: "assets/icons/gift.png", label: "兌換禮品", tip: "用星星種子換禮物" },
  { id: "btn-lyrics", icon: "assets/icons/song.png", label: "飛向藍藍天", tip: "聽聽主題曲" },
  { id: "btn-howto", icon: "assets/icons/howto.png", label: "怎麼玩", tip: "合成與交給他的玩法" },
  { id: "btn-settings", icon: "assets/icons/gear.png", label: "設定", tip: "音樂、音效與名字" }
];

function midnightLeft() {
  const now = new Date();
  const tz = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const end = new Date(tz);
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end - tz) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h <= 0) return `${m} 分`;
  return `${h} 小時 ${m} 分`;
}

export function mountHome(ctx) {
  const { $ } = ctx;

  function dailyReady(save) {
    const today = todayKey();
    return !(save?.daily?.day === today && save.daily.claimed);
  }

  function refresh() {
    const save = ctx.getSave?.() || {};
    const dailyBtn = $("#btn-daily");
    if (!dailyBtn) return;
    const ready = dailyReady(save);
    dailyBtn.classList.toggle("gift-ready", ready);
    const badge = dailyBtn.querySelector(".home-dot");
    const count = dailyBtn.querySelector(".home-count");
    if (badge) badge.hidden = !ready;
    if (count) {
      count.hidden = ready;
      count.textContent = ready ? "" : midnightLeft();
    }
    dailyBtn.title = ready ? "今天的禮物可以領了" : `明天再來　還要 ${midnightLeft()}`;
    dailyBtn.setAttribute("aria-label", dailyBtn.title);
  }

  function paintBalloons() {
    const layer = $("#title .balloon-bg");
    if (!layer || layer.dataset.ready) return;
    layer.dataset.ready = "1";
    layer.innerHTML = "";
    const set = [
      { src: "assets/fx/balloons/pink.png", x: "6%", y: "16%", w: 86, d: 7.2, delay: "0s" },
      { src: "assets/fx/balloons/yellow.png", x: "22%", y: "5%", w: 64, d: 6.4, delay: ".4s" },
      { src: "assets/fx/balloons/green.png", x: "auto", right: "8%", y: "14%", w: 78, d: 8, delay: "1s" },
      { src: "assets/fx/balloons/white.png", x: "auto", right: "22%", y: "4%", w: 58, d: 7, delay: "1.6s" },
      { src: "assets/fx/balloons/pink.png", x: "auto", right: "4%", y: "38%", w: 48, d: 9, delay: "2.2s" },
      { src: "assets/fx/balloons/yellow.png", x: "8%", y: "48%", w: 42, d: 8.4, delay: "1.2s" }
    ];
    for (const b of set) {
      const img = document.createElement("img");
      img.src = b.src;
      img.alt = "";
      img.draggable = false;
      img.style.left = b.x || "auto";
      if (b.right) img.style.right = b.right;
      img.style.top = b.y;
      img.style.width = b.w + "px";
      img.style.animationDuration = b.d + "s";
      img.style.animationDelay = b.delay;
      layer.appendChild(img);
    }
  }

  refresh();
  setInterval(() => {
    if ($("#title")?.classList.contains("on")) refresh();
  }, 30000);
  return { refresh, icons: ICONS };
}
