/** Rewarded "ad": official 〈飛向藍藍天〉 MV via the YouTube IFrame Player API. Never real money. */
import { todayKey, formatDailyResetLeft, ensureDaily } from "./save.js?v=16";

export const AD_DAILY = 5;
export const AD_VIDEO_ID = "XPvIihQWrcA";

const PRIZES = [
  { energy: 20, label: "能量 +20" },
  { diamonds: 2, coins: 8, label: "鑽石 +2、金幣 +8" },
  { energy: 15, diamonds: 1, label: "能量 +15、鑽石 +1" },
  { coins: 12, label: "金幣 +12" },
  { diamonds: 3, label: "鑽石 +3" }
];

export function adsState(save) {
  ensureDaily(save);
  const used = Math.max(0, save.ads?.count || 0);
  const left = Math.max(0, AD_DAILY - used);
  return { day: todayKey(), used, left, max: AD_DAILY, until: formatDailyResetLeft() };
}

function loadApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (window.__ytApiPromise) return window.__ytApiPromise;
  window.__ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { prev?.(); } catch {}
      resolve();
    };
    if (!document.querySelector("script[data-yt-api]")) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.setAttribute("data-yt-api", "1");
      document.head.appendChild(s);
    }
    // If the script was already on the page and ready fired early
    const wait = setInterval(() => {
      if (window.YT && window.YT.Player) { clearInterval(wait); resolve(); }
    }, 200);
    setTimeout(() => { clearInterval(wait); resolve(); }, 8000);
  });
  return window.__ytApiPromise;
}

export function createAds(ctx) {
  const { $, toast, sfx, persist, refreshHud, ENERGY } = ctx;
  let player = null;
  let awarded = false;
  let pollId = 0;
  let prize = null;

  function syncLabels() {
    const st = adsState(ctx.getSave());
    document.querySelectorAll("[data-ad-left]").forEach((el) => { el.textContent = st.left; });
    document.querySelectorAll("[data-ad-max]").forEach((el) => { el.textContent = st.max; });
    document.querySelectorAll("[data-ad-reset]").forEach((el) => { el.textContent = st.until; });
    document.querySelectorAll(".ad-entry").forEach((el) => {
      el.classList.toggle("empty", st.left <= 0);
      const badge = el.querySelector(".ad-badge");
      if (badge) badge.textContent = `${st.left}/${st.max}`;
    });
  }

  function destroyPlayer() {
    clearInterval(pollId);
    pollId = 0;
    try { player?.stopVideo?.(); } catch {}
    try { player?.destroy?.(); } catch {}
    player = null;
    const host = $("#ad-player");
    if (host) host.innerHTML = "";
  }

  function closeAd() {
    const ok = awarded;
    destroyPlayer();
    $("#ad-sheet")?.classList.remove("on");
    ctx.resumeMusic?.();
    if (!ok) toast("要看到最後才會得到獎勵喔");
    syncLabels();
  }

  function grantPrize() {
    if (awarded || !prize) return;
    awarded = true;
    const save = ctx.getSave();
    const st = adsState(save);
    if (st.left <= 0) return;
    save.ads.count = (save.ads.count || 0) + 1;
    const bits = [];
    if (prize.energy) {
      const add = Math.min(prize.energy, (ENERGY.max - (save.energy || 0)));
      if (add > 0) { save.energy = (save.energy || 0) + add; bits.push(`能量 +${add}`); }
    }
    if (prize.diamonds) {
      save.diamonds = (save.diamonds || 0) + prize.diamonds;
      bits.push(`鑽石 +${prize.diamonds}`);
    }
    persist();
    refreshHud();
    if (prize.coins) ctx.grantCoins?.(prize.coins, $("#ad-sheet .ad-card") || $("#ad-sheet"));
    sfx.daily();
    toast(bits.length ? `看完了！${bits.join("、")}` : (prize.label || "看完了！"));
    const lab = $("#ad-prize");
    if (lab) lab.textContent = "已領取：" + (prize.label || "");
    syncLabels();
  }

  function maybeAward() {
    if (awarded || !player) return;
    let ended = false, ratio = 0;
    try {
      const state = player.getPlayerState?.();
      if (state === window.YT?.PlayerState?.ENDED) ended = true;
      const t = player.getCurrentTime?.() || 0;
      const d = player.getDuration?.() || 0;
      if (d > 0) ratio = t / d;
    } catch {}
    if (ended || ratio >= 0.95) grantPrize();
  }

  function openAd() {
    const save = ctx.getSave();
    const st = adsState(save);
    if (st.left <= 0) {
      sfx.invalid();
      toast(`今天的影片看完了，08:00 再來。還要 ${formatDailyResetLeft()}。`);
      return;
    }
    awarded = false;
    prize = PRIZES[st.used % PRIZES.length];
    const sheet = $("#ad-sheet");
    const lab = $("#ad-prize");
    if (lab) lab.textContent = "看完可以領：" + prize.label;
    syncLabels();
    sheet?.classList.add("on");
    ctx.pauseMusic?.();
    sfx.tap();
    const host = $("#ad-player");
    if (host) host.innerHTML = "";
    loadApi().then(() => {
      if (!sheet?.classList.contains("on")) return;
      if (!window.YT || !window.YT.Player) {
        toast("影片暫時打不開，請稍後再試");
        closeAd();
        return;
      }
      player = new window.YT.Player("ad-player", {
        videoId: AD_VIDEO_ID,
        width: "100%",
        height: "220",
        playerVars: {
          autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, fs: 0,
          origin: location.origin
        },
        events: {
          onStateChange(e) {
            if (e.data === window.YT.PlayerState.ENDED) maybeAward();
            if (e.data === window.YT.PlayerState.PLAYING && !pollId) {
              pollId = setInterval(maybeAward, 500);
            }
          },
          onError() { toast("影片暫時打不開，請稍後再試"); }
        }
      });
    });
  }

  function openEnergyPrompt() {
    const st = adsState(ctx.getSave());
    syncLabels();
    if (st.left <= 0) {
      toast(`能量還在慢慢回來。今天的影片看完了，08:00 再來（還要 ${formatDailyResetLeft()}）。`);
      return;
    }
    $("#energy-prompt")?.classList.add("on");
  }

  function closeEnergyPrompt() {
    $("#energy-prompt")?.classList.remove("on");
  }

  function bind() {
    document.querySelectorAll("[data-open-ad]").forEach((el) => {
      el.addEventListener("click", () => { closeEnergyPrompt(); openAd(); });
    });
    $("#btn-ad-close")?.addEventListener("click", () => { sfx.tap(); closeAd(); });
    $("#btn-energy-later")?.addEventListener("click", () => { sfx.tap(); closeEnergyPrompt(); });
    syncLabels();
  }

  return { openAd, closeAd, openEnergyPrompt, closeEnergyPrompt, adsState, syncLabels, bind };
}
