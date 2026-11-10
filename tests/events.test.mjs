/** Global side events share an 08:00 Taipei calendar; rewards and needs scale with player level. */
import assert from "node:assert/strict";
import {
  EVENT_EPOCH_MS, XP_SPAN_BANDS, DEFAULT_XP_CURVE,
  SHORT_COIN_FRAC, LONG_COIN_FRAC, NEED_PER_LEVEL,
  SHORT_CATALOG, LONG_CATALOG,
  gameDayIndex, xpToNext, scaleCoins, scaleNeedCount, scaleNeedTier,
  rewardsFor, eventsAt, syncEvents,
  noteOrder, noteMerge, tryClaim, formatEventLeft, eventEndAt
} from "../js/events.js";
import { todayKey, nextDailyReset } from "../js/save.js";

function atTaipei(isoLocal) { return new Date(isoLocal + "+08:00"); }

// Same instant, any device zone: Date is absolute
const mid = atTaipei("2026-03-15T15:00:00");
assert.equal(todayKey(mid), "2026-03-15");
assert.equal(gameDayIndex(mid), gameDayIndex(new Date("2026-03-15T07:00:00.000Z")));
assert.equal(gameDayIndex(new Date("2026-03-15T07:00:00.000Z")), gameDayIndex(new Date("2026-03-14T23:00:00-08:00")));

// Game day rolls at 08:00 Taipei, not midnight
assert.equal(todayKey(atTaipei("2026-03-15T07:59:59")), "2026-03-14");
assert.equal(todayKey(atTaipei("2026-03-15T08:00:00")), "2026-03-15");
assert.ok(gameDayIndex(atTaipei("2026-03-15T07:59:59")) === gameDayIndex(atTaipei("2026-03-14T08:00:00")));
assert.equal(gameDayIndex(atTaipei("2026-03-15T08:00:00")), gameDayIndex(atTaipei("2026-03-14T08:00:00")) + 1);

// Index 0 is the epoch day
assert.equal(gameDayIndex(atTaipei("2026-01-01T08:00:00")), 0);
assert.equal(EVENT_EPOCH_MS, Date.parse("2026-01-01T00:00:00.000Z"));

// Short event lasts 1 game day and changes at 08:00
const sA = eventsAt(atTaipei("2026-03-15T10:00:00"), 10);
const sB = eventsAt(atTaipei("2026-03-15T23:30:00"), 10);
const sC = eventsAt(atTaipei("2026-03-16T07:59:00"), 10);
const sD = eventsAt(atTaipei("2026-03-16T08:00:00"), 10);
assert.equal(sA.short.kind, "short");
assert.equal(sA.short.durationDays, 1);
assert.equal(sA.short.id, sB.short.id);
assert.equal(sA.short.id, sC.short.id);
assert.ok(SHORT_CATALOG.some((e) => e.id === sA.short.id));
assert.notEqual(sA.short.id, sD.short.id || sA.short.startKey !== sD.short.startKey);
assert.equal(sA.short.startKey, "2026-03-15");
assert.equal(sC.short.startKey, "2026-03-15");
assert.equal(sD.short.startKey, "2026-03-16");
assert.equal(sA.resetAt.toISOString(), nextDailyReset(atTaipei("2026-03-15T10:00:00")).toISOString());

// Long event lasts 3–5 days; a new one starts when it ends
const seen = [];
let prev = null;
for (let i = 0; i < 40; i++) {
  const t = new Date(EVENT_EPOCH_MS + i * 86400000 + 8 * 3600000); // 16:00 UTC = 00:00 next Taipei? 
  // epoch + i days at 08:00 Taipei = EVENT_EPOCH_MS + i*86400000, add 1h to be inside the day
  const now = new Date(EVENT_EPOCH_MS + i * 86400000 + 3600000);
  const ev = eventsAt(now, 20);
  assert.ok(ev.long.days >= 3 && ev.long.days <= 5, "long duration 3–5, got " + ev.long.days);
  assert.ok(LONG_CATALOG.some((e) => e.id === ev.long.id));
  if (!prev || prev.id !== ev.long.id || prev.startKey !== ev.long.startKey) {
    if (prev) {
      const len = ev.long.startIndex - prev.startIndex;
      assert.ok(len >= 3 && len <= 5, "gap/length between long starts: " + len);
    }
    seen.push({ id: ev.long.id, days: ev.long.days, start: ev.long.startKey });
    prev = ev.long;
  }
}
assert.ok(seen.length >= 2, "more than one long event in 40 days");
assert.ok(new Set(seen.map((s) => s.id)).size >= 2, "catalog rotates");

// Short tasks still appear on days inside a long event
const inside = eventsAt(new Date(EVENT_EPOCH_MS + 3600000), 8);
assert.equal(inside.short.kind, "short");
assert.equal(inside.long.kind, "long");
assert.ok(inside.short.id && inside.long.id);

// Scaling formula: reward is a fraction of xp-to-next at the player's current level
const curve = DEFAULT_XP_CURVE;
assert.equal(xpToNext(1, curve), 40);
assert.equal(xpToNext(5, curve), 120); // 400-280
assert.equal(xpToNext(80, curve), 720); // plan band Lv71–80
assert.equal(XP_SPAN_BANDS.find((b) => b.maxLevel === 80).span, 720);

const r5s = rewardsFor("short", 5, curve);
const r80s = rewardsFor("short", 80, curve);
assert.equal(r5s.coins, Math.round(120 * SHORT_COIN_FRAC));
assert.equal(r80s.coins, Math.round(720 * SHORT_COIN_FRAC));
assert.ok(r80s.coins > r5s.coins, "higher level gets a larger but proportional short reward");
assert.equal(r5s.coins / 120, r80s.coins / 720);

const r5l = rewardsFor("long", 5, curve);
const r80l = rewardsFor("long", 80, curve);
assert.equal(r5l.coins, Math.round(120 * LONG_COIN_FRAC));
assert.equal(r80l.coins, Math.round(720 * LONG_COIN_FRAC));

// Requirements scale with level
assert.equal(scaleNeedCount(1, 3), 3);
assert.equal(scaleNeedCount(5, 3), Math.round(3 * (1 + 4 * NEED_PER_LEVEL)));
assert.ok(scaleNeedCount(80, 3) > scaleNeedCount(5, 3));
assert.equal(scaleNeedTier(1, 1), 1);
assert.equal(scaleNeedTier(21, 1), 2);
assert.equal(scaleNeedTier(81, 1, 8), 5);

const ev5 = eventsAt(mid, 5, curve);
const ev80 = eventsAt(mid, 80, curve);
assert.equal(ev5.short.id, ev80.short.id, "same global short event");
assert.equal(ev5.long.id, ev80.long.id, "same global long event");
assert.ok(ev80.short.reward.coins > ev5.short.reward.coins);
assert.ok(ev80.short.need.count >= ev5.short.need.count);

// syncEvents rolls when the calendar day / long window changes
const save = { level: 12, events: {} };
const ev = syncEvents(save, atTaipei("2026-03-15T10:00:00"), curve);
assert.equal(save.events.short.id, ev.short.id);
assert.equal(save.events.short.startKey, ev.short.startKey);
save.events.short.progress = 2;
syncEvents(save, atTaipei("2026-03-15T20:00:00"), curve);
assert.equal(save.events.short.progress, 2, "same short day keeps progress");
syncEvents(save, atTaipei("2026-03-16T08:00:00"), curve);
assert.equal(save.events.short.progress, 0, "new short day resets progress");
assert.equal(save.events.short.startKey, "2026-03-16");


// Progress + claim
const mid15 = atTaipei("2026-03-14T10:00:00"); // day index 72, short = 今日微笑 (orders)
const save2 = { level: 5, events: {} };
syncEvents(save2, mid15, curve);
const evMid = eventsAt(mid15, 5, curve);
assert.equal(evMid.short.id, "smile-orders");
assert.equal(evMid.short.need.type, "orders");
noteOrder(save2, { need: { chain: "star" } }, mid15, curve);
assert.equal(save2.events.short.progress, 1);
noteOrder(save2, { need: { chain: "candy" } }, mid15, curve);
assert.equal(save2.events.short.progress, 2);
assert.equal(tryClaim(save2, "short", mid15, curve), null, "cannot claim early");
while (save2.events.short.progress < evMid.short.need.count) {
  noteOrder(save2, { need: { chain: "star" } }, mid15, curve);
}
const claimed = tryClaim(save2, "short", mid15, curve);
assert.ok(claimed && claimed.coins === evMid.short.reward.coins);
assert.equal(tryClaim(save2, "short", mid15, curve), null, "claim once");

// Candy-gated long event only counts candy orders
const candyNow = atTaipei("2026-01-04T10:00:00"); // day 3 of epoch: first long is 3d stage, then 5d candy starts day 3
// day index 3 = 2026-01-04 is first day of 西卡的糖果週 (start 3, dur 5)
const save3 = { level: 5, events: {} };
const evC = syncEvents(save3, candyNow, curve);
assert.equal(evC.long.id, "sika-candy-week");
noteOrder(save3, { need: { chain: "star" } }, candyNow, curve);
assert.equal(save3.events.long.progress, 0, "non-candy order ignored");
noteOrder(save3, { need: { chain: "candy" } }, candyNow, curve);
assert.equal(save3.events.long.progress, 1);

// Merge task
const gardenDay = atTaipei("2026-01-02T10:00:00"); // day 1: 花圃小幫手 is SHORT_CATALOG[1]
const save4 = { level: 1, events: {} };
const evG = syncEvents(save4, gardenDay, curve);
assert.equal(evG.short.id, "garden-help");
noteMerge(save4, { chain: "star", tier: 4 }, gardenDay, curve);
assert.equal(save4.events.short.progress, 0);
noteMerge(save4, { chain: "garden", tier: 1 }, gardenDay, curve);
assert.equal(save4.events.short.progress, 1);

// Countdown: endKey is 08:00 Taipei on that date
const end = eventEndAt("2026-03-16");
assert.equal(end.toISOString(), "2026-03-16T00:00:00.000Z");
const left = formatEventLeft("2026-03-16", atTaipei("2026-03-15T10:00:00"));
assert.ok(left.includes("時") || left.includes("分"));
const compact = formatEventLeft("2026-03-18", atTaipei("2026-03-15T10:00:00"), true);
assert.ok(compact.includes("天"));

console.log("events tests ok");
