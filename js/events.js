/** Global side events: short (1 day) and long (3–5 days), 08:00 Asia/Taipei calendar, rewards scale with player level. */
import { todayKey, nextDailyReset, dailyResetLeftMs } from "./save.js";

/** Launch epoch: 2026-01-01 08:00 Asia/Taipei (00:00 UTC). All clients share this calendar. */
export const EVENT_EPOCH_MS = Date.parse("2026-01-01T00:00:00.000Z");

/** Coins to next level, from the year-long pacing table (每關約需金幣). Used when the live curve has no row. */
export const XP_SPAN_BANDS = [
  { maxLevel: 10, span: 110 },
  { maxLevel: 20, span: 180 },
  { maxLevel: 30, span: 260 },
  { maxLevel: 40, span: 350 },
  { maxLevel: 50, span: 450 },
  { maxLevel: 60, span: 560 },
  { maxLevel: 70, span: 600 },
  { maxLevel: 80, span: 720 },
  { maxLevel: 90, span: 860 },
  { maxLevel: 100, span: 900 },
  { maxLevel: 110, span: 1260 },
  { maxLevel: 120, span: 1760 },
  { maxLevel: 130, span: 2300 },
  { maxLevel: 140, span: 2880 },
  { maxLevel: 150, span: 3500 },
  { maxLevel: 160, span: 4160 },
  { maxLevel: 170, span: 5400 },
  { maxLevel: 180, span: 6160 },
  { maxLevel: 190, span: 6960 },
  { maxLevel: 200, span: 7800 },
  { maxLevel: 220, span: 8680 },
  { maxLevel: 240, span: 9450 },
  { maxLevel: 260, span: 9920 },
  { maxLevel: Infinity, span: 9920 }
];

export const DEFAULT_XP_CURVE = [0, 40, 100, 180, 280, 400, 540, 700, 880, 1100];

/** Short task (1 day) completion: 15% of xp-to-next. */
export const SHORT_COIN_FRAC = 0.15;
/** Long task (3–5 day) completion: 45% of xp-to-next. */
export const LONG_COIN_FRAC = 0.45;
/** Optional daily bite while a long event is running. */
export const LONG_DAILY_COIN_FRAC = 0.08;
export const SHORT_DIAMOND_FRAC = 0.02;
export const LONG_DIAMOND_FRAC = 0.06;
export const NEED_PER_LEVEL = 0.05;

/** New-creation short tasks. Rotate one per game day. */
export const SHORT_CATALOG = [
  { id: "smile-orders", name: "今日微笑", kind: "short", durationDays: 1,
    task: { type: "orders", baseCount: 3 }, blurb: "今天交完指定張數的訂單。" },
  { id: "garden-help", name: "花圃小幫手", kind: "short", durationDays: 1,
    task: { type: "merge", chain: "garden", baseTier: 1, baseCount: 1 }, blurb: "合成指定的花園物品。" },
  { id: "energy-walk", name: "散步加能量", kind: "short", durationDays: 1,
    task: { type: "orders", baseCount: 2 }, blurb: "再幫朋友交兩張訂單。" }
];

/** New-creation long events. A new one starts when the previous ends (every 3–5 days). */
export const LONG_CATALOG = [
  { id: "stage-practice", name: "舞台練習日", kind: "long", durationDays: 3,
    task: { type: "orders", baseCount: 8 }, blurb: "三天內交完練習訂單，幫微笑舞台暖身。" },
  { id: "sika-candy-week", name: "西卡的糖果週", kind: "long", durationDays: 5,
    task: { type: "orders", chain: "candy", baseCount: 6 }, blurb: "五天限時糖果訂單，幫西卡佈置攤位。" },
  { id: "lantern-walk", name: "夜燈散步", kind: "long", durationDays: 4,
    task: { type: "orders", baseCount: 7 }, blurb: "四天內點亮訂單，陪朋友走過夜晚。" }
];

export function gameDayIndex(now = new Date()) {
  const key = todayKey(now);
  const start = Date.parse(key + "T00:00:00.000Z");
  return Math.floor((start - EVENT_EPOCH_MS) / 86400000);
}

export function gameDayKeyFromIndex(index) {
  const ms = EVENT_EPOCH_MS + index * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function xpToNext(level, curve = DEFAULT_XP_CURVE, bands = XP_SPAN_BANDS) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  if (Array.isArray(curve) && L < curve.length) {
    const lo = curve[L - 1] ?? 0;
    const hi = curve[L];
    if (hi != null && hi > lo) return hi - lo;
  }
  for (const b of bands) {
    if (L <= b.maxLevel) return Math.max(1, b.span);
  }
  return 9920;
}

export function scaleCoins(level, frac, curve, bands) {
  return Math.max(1, Math.round(xpToNext(level, curve, bands) * frac));
}

export function scaleDiamonds(level, frac, curve, bands) {
  return Math.max(1, Math.round(xpToNext(level, curve, bands) * frac));
}

export function scaleNeedCount(level, baseCount, perLevel = NEED_PER_LEVEL) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  const n = Math.round((baseCount || 1) * (1 + (L - 1) * perLevel));
  return Math.min(99, Math.max(1, n));
}

export function scaleNeedTier(level, baseTier = 1, maxTier = 8) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  return Math.min(maxTier, Math.max(1, (baseTier || 1) + Math.floor((L - 1) / 20)));
}

export function rewardsFor(kind, level, curve, bands) {
  const short = kind === "short";
  return {
    coins: scaleCoins(level, short ? SHORT_COIN_FRAC : LONG_COIN_FRAC, curve, bands),
    diamonds: scaleDiamonds(level, short ? SHORT_DIAMOND_FRAC : LONG_DIAMOND_FRAC, curve, bands),
    dailyCoins: short ? 0 : scaleCoins(level, LONG_DAILY_COIN_FRAC, curve, bands)
  };
}

export function scaleTask(task, level) {
  const t = task || { type: "orders", baseCount: 1 };
  return {
    type: t.type || "orders",
    chain: t.chain || null,
    count: scaleNeedCount(level, t.baseCount || 1),
    tier: t.baseTier != null ? scaleNeedTier(level, t.baseTier) : null
  };
}

function longSchedule(dayIndex) {
  let cursor = 0;
  let i = 0;
  while (true) {
    const ev = LONG_CATALOG[i % LONG_CATALOG.length];
    const dur = ev.durationDays;
    if (dayIndex < cursor + dur) {
      return {
        ...ev,
        startIndex: cursor,
        endIndex: cursor + dur,
        startKey: gameDayKeyFromIndex(cursor),
        endKey: gameDayKeyFromIndex(cursor + dur),
        dayInEvent: dayIndex - cursor + 1,
        days: dur
      };
    }
    cursor += dur;
    i += 1;
    if (i > 10000) throw new Error("long schedule overflow");
  }
}

export function eventsAt(now = new Date(), level = 1, curve, bands) {
  const day = gameDayIndex(now);
  const shortDef = SHORT_CATALOG[((day % SHORT_CATALOG.length) + SHORT_CATALOG.length) % SHORT_CATALOG.length];
  const longDef = longSchedule(day);
  const short = {
    ...shortDef,
    startKey: todayKey(now),
    endKey: gameDayKeyFromIndex(day + 1),
    days: 1,
    dayInEvent: 1,
    reward: rewardsFor("short", level, curve, bands),
    need: scaleTask(shortDef.task, level)
  };
  const longEv = {
    ...longDef,
    reward: rewardsFor("long", level, curve, bands),
    need: scaleTask(longDef.task, level)
  };
  return {
    day,
    dayKey: todayKey(now),
    resetAt: nextDailyReset(now),
    resetLeftMs: dailyResetLeftMs(now),
    short,
    long: longEv
  };
}

export function syncEvents(save, now = new Date(), curve) {
  if (!save) return eventsAt(now, 1, curve);
  const level = save.level || 1;
  const ev = eventsAt(now, level, curve || undefined);
  if (!save.events) save.events = { short: {}, long: {} };
  if (save.events.short?.id !== ev.short.id || save.events.short?.startKey !== ev.short.startKey) {
    save.events.short = { id: ev.short.id, startKey: ev.short.startKey, progress: 0, claimed: false };
  }
  if (save.events.long?.id !== ev.long.id || save.events.long?.startKey !== ev.long.startKey) {
    save.events.long = { id: ev.long.id, startKey: ev.long.startKey, progress: 0, claimed: false };
  }
  return ev;
}

/** Instant the event ends: 08:00 Asia/Taipei on endKey (00:00 UTC that date). */
export function eventEndAt(endKey) {
  const parts = String(endKey || "").split("-").map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  if (!y || !m || !d) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

export function formatEventLeft(endKey, now = new Date(), compact = false) {
  const end = eventEndAt(endKey);
  const ms = Math.max(0, end.getTime() - now.getTime());
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (compact) {
    if (days >= 1) return `${days}\u00a0天`;
    if (h <= 0) return `${m}\u00a0分`;
    return `${h}\u00a0小時`;
  }
  if (days >= 1) return `${days}\u00a0天\u00a0${h}\u00a0小時`;
  if (h <= 0) return `${m}\u00a0分`;
  return `${h}\u00a0小時\u00a0${m}\u00a0分`;
}

function bumpEvent(save, ev, kind, pred) {
  const def = ev[kind];
  const st = save.events?.[kind];
  if (!def || !st || st.claimed) return;
  if (!pred(def)) return;
  st.progress = Math.min(def.need.count, (st.progress || 0) + 1);
}

export function noteOrder(save, order, now = new Date(), curve) {
  const ev = syncEvents(save, now, curve);
  const chain = order?.need?.chain || order?.chain || null;
  for (const kind of ["short", "long"]) {
    bumpEvent(save, ev, kind, (def) => {
      if (def.need.type !== "orders") return false;
      if (def.need.chain && def.need.chain !== chain) return false;
      return true;
    });
  }
  return ev;
}

export function noteMerge(save, cell, now = new Date(), curve) {
  const ev = syncEvents(save, now, curve);
  for (const kind of ["short", "long"]) {
    bumpEvent(save, ev, kind, (def) => {
      if (def.need.type !== "merge") return false;
      if (def.need.chain && def.need.chain !== cell?.chain) return false;
      if (def.need.tier != null && (cell?.tier || 1) < def.need.tier) return false;
      return true;
    });
  }
  return ev;
}

export function tryClaim(save, kind, now = new Date(), curve) {
  const ev = syncEvents(save, now, curve);
  const def = ev[kind];
  const st = save.events?.[kind];
  if (!def || !st || st.claimed) return null;
  if ((st.progress || 0) < def.need.count) return null;
  st.claimed = true;
  return { ...def.reward, name: def.name, kind: def.kind };
}

export function createEvents(ctx) {
  function curve() { return ctx.getGame?.()?.xpCurve; }
  function current() {
    const save = ctx.getSave?.() || {};
    return syncEvents(save, new Date(), curve());
  }
  return {
    current,
    sync: () => current(),
    noteOrder: (order) => noteOrder(ctx.getSave(), order, new Date(), curve()),
    noteMerge: (cell) => noteMerge(ctx.getSave(), cell, new Date(), curve()),
    tryClaim: (kind) => tryClaim(ctx.getSave(), kind, new Date(), curve()),
    formatEventLeft,
    eventEndAt,
    eventsAt,
    rewardsFor,
    xpToNext,
    scaleNeedCount
  };
}
