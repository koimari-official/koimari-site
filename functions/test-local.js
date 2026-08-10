// ローカル検証用スクリプト（デプロイ対象外）。
// 実行: node test-local.js
const assert = require("assert");
const crypto = require("crypto");
const { computeTodayStatus, verifyLineSignature } = require("./index.js")._internal;

function assertEqual(actual, expected, label) {
  assert.strictEqual(actual, expected, `${label}: expected "${expected}" but got "${actual}"`);
  console.log(`OK: ${label}`);
}

// --- computeTodayStatus ---

// 月曜（定休日）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 6, 13, 14, 0)), // 2026-07-13 は月曜
  "本日は定休日（または臨時休業日）です。",
  "月曜=定休日"
);

// 火曜、開店前（9:00）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 6, 14, 9, 0)), // 火曜
  "本日はこれから10:00に開店します（現在は営業時間外です）。",
  "火曜9時=開店前"
);

// 火曜、営業中（15:00）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 6, 14, 15, 0)),
  "本日はただいま営業中です。",
  "火曜15時=営業中"
);

// 火曜、閉店後（20:30、火-土は20時閉店）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 6, 14, 20, 30)),
  "本日の営業は終了しました。",
  "火曜20:30=閉店後"
);

// 日曜、19:30（日は19時閉店）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 6, 19, 19, 30)), // 2026-07-19 は日曜
  "本日の営業は終了しました。",
  "日曜19:30=閉店後（19時閉店）"
);

// 日曜、18:30（まだ営業中のはず）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 6, 19, 18, 30)),
  "本日はただいま営業中です。",
  "日曜18:30=営業中"
);

// 臨時休業日（火曜だが extraClosed に含まれる）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: ["2026-07-14"] }, new Date(2026, 6, 14, 15, 0)),
  "本日は定休日（または臨時休業日）です。",
  "臨時休業日"
);

// holidaysデータがnull（未設定時のデフォルト: 月曜定休）
assertEqual(
  computeTodayStatus(null, new Date(2026, 6, 13, 14, 0)), // 月曜
  "本日は定休日（または臨時休業日）です。",
  "holidaysがnullでもデフォルトの月曜定休が適用される"
);

// --- verifyLineSignature ---

const secret = "test-channel-secret";
const body = Buffer.from(JSON.stringify({ events: [] }));
const validSig = crypto.createHmac("sha256", secret).update(body).digest("base64");

assert.strictEqual(verifyLineSignature(body, validSig, secret), true, "正しい署名はtrueを返す");
console.log("OK: 正しい署名はtrueを返す");

assert.strictEqual(verifyLineSignature(body, "invalid-signature", secret), false, "不正な署名はfalseを返す");
console.log("OK: 不正な署名はfalseを返す");

console.log("\nすべてのローカルテストに合格しました。");
