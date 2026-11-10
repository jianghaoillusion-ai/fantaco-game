/** Daily systems reset at 08:00 Asia/Taipei, independent of the device timezone. */
import assert from "node:assert/strict";
import {
  todayKey, nextDailyReset, dailyResetLeftMs, formatDailyResetLeft, ensureDaily, DAILY_RESET_HOUR
} from "../js/save.js";

function atTaipei(isoLocal) {
  // isoLocal like "2026-11-11T07:59:59" meaning that wall time in Taipei
  return new Date(isoLocal + "+08:00");
}

assert.equal(DAILY_RESET_HOUR, 8);

// Before 08:00, still yesterday's game day
assert.equal(todayKey(atTaipei("2026-11-11T07:59:59")), "2026-11-10");
assert.equal(todayKey(atTaipei("2026-11-11T00:00:00")), "2026-11-10");
assert.equal(todayKey(atTaipei("2026-11-11T00:30:00")), "2026-11-10");

// 08:00 inclusive starts the new day
assert.equal(todayKey(atTaipei("2026-11-11T08:00:00")), "2026-11-11");
assert.equal(todayKey(atTaipei("2026-11-11T08:00:01")), "2026-11-11");
assert.equal(todayKey(atTaipei("2026-11-11T23:59:59")), "2026-11-11");

// After midnight but before 08:00, key stays on the previous calendar date
assert.equal(todayKey(atTaipei("2026-11-12T00:00:00")), "2026-11-11");
assert.equal(todayKey(atTaipei("2026-11-12T07:59:59")), "2026-11-11");
assert.equal(todayKey(atTaipei("2026-11-12T08:00:00")), "2026-11-12");

// Month / year / leap boundaries
assert.equal(todayKey(atTaipei("2026-03-01T07:00:00")), "2026-02-28");
assert.equal(todayKey(atTaipei("2024-03-01T07:00:00")), "2024-02-29");
assert.equal(todayKey(atTaipei("2027-01-01T07:59:59")), "2026-12-31");
assert.equal(todayKey(atTaipei("2027-01-01T08:00:00")), "2027-01-01");

// Next reset: before 08:00 → today 08:00; at or after 08:00 → tomorrow 08:00
assert.equal(nextDailyReset(atTaipei("2026-11-11T07:30:00")).toISOString(), "2026-11-11T00:00:00.000Z");
assert.equal(nextDailyReset(atTaipei("2026-11-11T08:00:00")).toISOString(), "2026-11-12T00:00:00.000Z"); // 12th 08:00 Taipei = 00:00 UTC
assert.equal(nextDailyReset(atTaipei("2026-11-11T08:00:00")).toISOString(), atTaipei("2026-11-12T08:00:00").toISOString());
assert.equal(nextDailyReset(atTaipei("2026-11-11T22:00:00")).toISOString(), atTaipei("2026-11-12T08:00:00").toISOString());

// Countdown
assert.equal(dailyResetLeftMs(atTaipei("2026-11-11T07:00:00")), 60 * 60 * 1000);
assert.equal(formatDailyResetLeft(atTaipei("2026-11-11T07:00:00")), "1\u00a0小時\u00a00\u00a0分");
assert.equal(formatDailyResetLeft(atTaipei("2026-11-11T07:45:00")), "15\u00a0分");
assert.equal(formatDailyResetLeft(atTaipei("2026-11-11T08:00:00")), "24\u00a0小時\u00a00\u00a0分");

// Same absolute instant, any "device" zone: Date is UTC under the hood
const instant = new Date("2026-11-10T23:30:00.000Z"); // 07:30 Taipei
assert.equal(todayKey(instant), "2026-11-10");
assert.equal(nextDailyReset(instant).toISOString(), "2026-11-11T00:00:00.000Z");

// ensureDaily rolls ads, challenge, and shop restock
const save = {
  daily: { day: "2026-11-10", streak: 3, claimed: true, challengeDay: "2026-11-10", challenge: 2, challengeClaimed: true },
  ads: { day: "2026-11-10", count: 5 },
  shopDaily: { day: "2026-11-10", bought: { "energy-20": 1 } }
};
const day = ensureDaily(save, atTaipei("2026-11-11T08:00:00"));
assert.equal(day, "2026-11-11");
assert.equal(save.daily.challenge, 0);
assert.equal(save.daily.challengeClaimed, false);
assert.equal(save.daily.challengeDay, "2026-11-11");
assert.equal(save.daily.claimed, true); // gift claimed flag stays on the old day key
assert.equal(save.daily.day, "2026-11-10");
assert.equal(save.daily.streak, 3);
assert.equal(save.ads.day, "2026-11-11");
assert.equal(save.ads.count, 0);
assert.equal(save.shopDaily.day, "2026-11-11");
assert.deepEqual(save.shopDaily.bought, {});

// Same game day does not wipe
save.ads.count = 2;
save.shopDaily.bought["energy-20"] = 1;
save.daily.challenge = 1;
ensureDaily(save, atTaipei("2026-11-11T21:00:00"));
assert.equal(save.ads.count, 2);
assert.equal(save.shopDaily.bought["energy-20"], 1);
assert.equal(save.daily.challenge, 1);
assert.equal(save.daily.challengeDay, "2026-11-11");

console.log("daily-reset tests ok");
