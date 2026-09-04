// ローカル検証用スクリプト（デプロイ対象外）。
// 実行: node test-local.js
const assert = require("assert");
const crypto = require("crypto");
const {
  computeTodayStatus, verifyLineSignature, isAllergyRelated, buildFaqKnowledgeText, extractReviewTag,
  getSeasonCareLine, getStoreComfortLine, productLabel, computePickupDateTime, buildReminderMessage,
  buildStaffNotifyText, buildChatGreetingPrefix, formatPickupDateTimeJp,
} = require("./index.js")._internal;

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

// 月曜が祝日の場合は営業する（2026-01-12は成人の日、月曜）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 0, 12, 14, 0)),
  "本日はただいま営業中です。",
  "月曜祝日=営業（成人の日）"
);

// 月曜祝日は日曜と同じ19時閉店（20時ではない）
assertEqual(
  computeTodayStatus({ weeklyClosed: [1], extraClosed: [] }, new Date(2026, 0, 12, 19, 30)),
  "本日の営業は終了しました。",
  "月曜祝日19:30=閉店後（19時閉店）"
);

// --- verifyLineSignature ---

const secret = "test-channel-secret";
const body = Buffer.from(JSON.stringify({ events: [] }));
const validSig = crypto.createHmac("sha256", secret).update(body).digest("base64");

assert.strictEqual(verifyLineSignature(body, validSig, secret), true, "正しい署名はtrueを返す");
console.log("OK: 正しい署名はtrueを返す");

assert.strictEqual(verifyLineSignature(body, "invalid-signature", secret), false, "不正な署名はfalseを返す");
console.log("OK: 不正な署名はfalseを返す");

// --- isAllergyRelated / buildFaqKnowledgeText ---
// アレルギーはHP上でもAIでも触れず電話対応に一本化する方針（2026-08-10）のための安全網テスト。

assert.strictEqual(isAllergyRelated("アレルギー対応はしていただけますか？"), true, "「アレルギー」を含む文字列を検知する");
assert.strictEqual(isAllergyRelated("卵・乳・小麦等のアレルゲンを含みます"), true, "「アレルゲン」を含む文字列を検知する");
assert.strictEqual(isAllergyRelated("賞味期限はどのくらいですか？"), false, "無関係な文字列は検知しない");
console.log("OK: isAllergyRelated");

const faqWithAllergy = [
  { category: "商品について", items: [
    { q: "賞味期限はどのくらいですか？", a: "当日中を目安にお召し上がりください。" },
    { q: "アレルギー対応はしていただけますか？", a: "対応内容は非公開のはずのテキスト" },
  ]},
  { category: "アレルギーについて", items: [
    { q: "アレルゲン表示はありますか？", a: "これも除外されるべきテキスト" },
  ]},
];
const faqText = buildFaqKnowledgeText(faqWithAllergy);
assert.ok(faqText.includes("賞味期限"), "アレルギー以外のFAQは含まれる");
assert.ok(!faqText.includes("非公開のはず"), "アレルギー関連のQ&Aはカテゴリ内でも除外される");
assert.ok(!faqText.includes("除外されるべき"), "アレルギー関連カテゴリ自体が丸ごと除外される");
console.log("OK: buildFaqKnowledgeText はアレルギー関連を除外する");

assert.strictEqual(buildFaqKnowledgeText([]), "（FAQ未設定）", "空配列の場合のフォールバック文言");
assert.strictEqual(buildFaqKnowledgeText(null), "（FAQ未設定）", "nullの場合のフォールバック文言");
console.log("OK: buildFaqKnowledgeText の未設定時フォールバック");

// --- extractReviewTag ---
// AIが「答えに自信がない」と判断した際に付ける内部タグ [[REVIEW: 理由]] を、
// お客様向け本文から正しく分離できるかのテスト。

const withTag = extractReviewTag("スタッフが確認してご連絡いたします。\n[[REVIEW: 価格の詳細不明]]");
assert.strictEqual(withTag.text, "スタッフが確認してご連絡いたします。", "タグ部分が本文から除去される");
assert.strictEqual(withTag.reviewReason, "価格の詳細不明", "理由が正しく抽出される");
console.log("OK: extractReviewTag はタグと理由を分離する");

const withoutTag = extractReviewTag("本日は10:00〜20:00で営業しております。");
assert.strictEqual(withoutTag.text, "本日は10:00〜20:00で営業しております。", "タグが無い場合は本文をそのまま返す");
assert.strictEqual(withoutTag.reviewReason, null, "タグが無い場合はreviewReasonがnull");
console.log("OK: extractReviewTag はタグが無い場合そのまま返す");

const emptyReason = extractReviewTag("ご案内いたします。\n[[REVIEW:]]");
assert.strictEqual(emptyReason.text, "ご案内いたします。", "理由が空でも本文は除去される");
assert.strictEqual(emptyReason.reviewReason, "要確認", "理由が空文字の場合はデフォルト文言になる");
console.log("OK: extractReviewTag は理由が空でもデフォルト値を補う");

// --- 予約引き取りリマインダー関連 ---

assertEqual(getSeasonCareLine(new Date(2026, 7, 15)), "暑い日が続きますね。涼しい服装でゆっくりお越しくださいね。", "8月=夏の労わりメッセージ");
assertEqual(getSeasonCareLine(new Date(2026, 0, 15)), "寒い日が続きますね。暖かくしてゆっくりお越しくださいね。", "1月=冬の労わりメッセージ");
assertEqual(getSeasonCareLine(new Date(2026, 3, 15)), "過ごしやすい季節になりましたね。", "4月=春の労わりメッセージ");
assertEqual(getSeasonCareLine(new Date(2026, 9, 15)), "涼しく過ごしやすい季節になりましたね。", "10月=秋の労わりメッセージ");
assert.ok(!getSeasonCareLine(new Date(2026, 7, 15)).includes("申し訳"), "労わりメッセージに詫びの言葉を含まない（感謝・歓迎トーンの方針）");

assertEqual(getStoreComfortLine(new Date(2026, 7, 15)).emoji, "🍹", "8月=夏は涼しい系の絵文字");
assertEqual(getStoreComfortLine(new Date(2026, 0, 15)).emoji, "☕", "1月=冬は温かい系の絵文字");
assertEqual(getStoreComfortLine(new Date(2026, 3, 15)).text, "お店でお待ちしております。", "4月=春は季節を限定しない文言");

assertEqual(productLabel({ items: [{ category: "デコレーションケーキ" }] }), "デコレーションケーキ", "フレーバー未指定時は商品カテゴリのみ");
assertEqual(productLabel({ items: [{ category: "デコレーションケーキ", flavor: "イチゴ" }] }), "イチゴのデコレーションケーキ", "デコレーションケーキはフレーバー+カテゴリ名");
assertEqual(productLabel({ items: [{ category: "ロールケーキ", flavor: "こいまりロール" }] }), "こいまりロール", "ロールケーキはフレーバー名自体が商品名");
assertEqual(productLabel({ items: [{ category: "デコレーションケーキ", flavor: "イチゴ" }, { category: "デコレーションケーキ", flavor: "イチゴ" }] }), "イチゴのデコレーションケーキ（2段）", "複数段の商品ラベル");

const pickupAt = computePickupDateTime({ pickupDate: "2026-08-20", pickupTime: "15:00" });
assert.ok(pickupAt instanceof Date && !isNaN(pickupAt.getTime()), "引き取り日時が正しくDateに変換される");
assertEqual(pickupAt.toISOString(), "2026-08-20T06:00:00.000Z", "JST 15:00 は UTC 06:00 と一致する");
assert.strictEqual(computePickupDateTime({ pickupDate: "", pickupTime: "15:00" }), null, "引き取り日が空の場合はnull");

const reminderData = { name: "山田", items: [{ category: "デコレーションケーキ" }], pickupDate: "2026-08-20", pickupTime: "15:00" };
const summerNow = new Date(2026, 7, 17);
assert.ok(buildReminderMessage("threeDay", reminderData, summerNow).includes("あと3日"), "3日前メッセージに「あと3日」を含む");
assert.ok(buildReminderMessage("oneDay", reminderData, summerNow).includes("明日"), "24時間前メッセージに「明日」を含む");
assert.ok(buildReminderMessage("oneHour", reminderData, summerNow).includes("まもなく"), "1時間前メッセージに「まもなく」を含む");
console.log("OK: 予約引き取りリマインダー関連の関数");

// --- スタッフ通知メッセージ ---

const staffNotifyData = { name: "田中", items: [{ category: "デコレーションケーキ", flavor: "チョコ" }], pickupDate: "2026-08-25", pickupTime: "14:00", tel: "090-1111-2222", channel: "LINE" };
const staffText = buildStaffNotifyText(staffNotifyData);
assert.ok(staffText.includes("チョコのデコレーションケーキ"), "スタッフ通知に商品名を含む");
assert.ok(staffText.includes("田中"), "スタッフ通知にお名前を含む");
assert.ok(staffText.includes("LINE公式アカウント"), "スタッフ通知に受付経路を含む");
assert.ok(staffText.includes("admin.html"), "スタッフ通知に管理画面へのリンクを含む");
console.log("OK: buildStaffNotifyText");

// --- AIチャット応答：会話最初の1通に添える季節のあいさつ ---
// 2026-09-04オーナー指示：毎回だとくどいため最初の1通のみ。文面はgetSeasonCareLineと同じトーンを流用する。

const greetingPrefix = buildChatGreetingPrefix(new Date(2026, 7, 15));
assert.ok(greetingPrefix.includes("ありがとうございます"), "あいさつに感謝の一言を含む");
assert.ok(greetingPrefix.includes(getSeasonCareLine(new Date(2026, 7, 15))), "あいさつに季節の労わりメッセージ（getSeasonCareLineと同一）を含む");
assert.ok(greetingPrefix.endsWith("\n\n"), "本題との間に空行が入り、詰まった文章にならない");
console.log("OK: buildChatGreetingPrefix は感謝+季節の一言+空行で構成される");

// --- productLabel: items未指定（一日店長体験など）はdata.typeにフォールバックする ---

assertEqual(productLabel({ type: "一日店長体験", items: [] }), "一日店長体験", "itemsが空の予約はdata.typeを商品名として使う");
assertEqual(productLabel({ items: [] }), "ご予約商品", "itemsが空でdata.typeも無い場合の最終フォールバック");
console.log("OK: productLabel はitems未指定時にdata.typeへフォールバックする");

// --- productLabel: ご利用シーン（バースデー／クリスマス／その他）による呼び方の変化 ---
// 2026-09-04オーナー指示：デコレーションケーキ・ロールケーキともバースデー等の利用シーンで呼び方を変える。

assertEqual(
  productLabel({ occasion: "バースデー", items: [{ category: "デコレーションケーキ", flavor: "イチゴ" }] }),
  "イチゴのバースデーケーキ", "デコレーションケーキ+バースデーは「フレーバーのバースデーケーキ」"
);
assertEqual(
  productLabel({ occasion: "クリスマス", items: [{ category: "デコレーションケーキ", flavor: "チョコ" }] }),
  "チョコのクリスマスケーキ", "デコレーションケーキ+クリスマスは「フレーバーのクリスマスケーキ」"
);
assertEqual(
  productLabel({ occasion: "その他", occasionOther: "退職祝い", items: [{ category: "デコレーションケーキ", flavor: "イチゴ" }] }),
  "イチゴの退職祝いケーキ", "デコレーションケーキ+その他は記述内容を使う"
);
assertEqual(
  productLabel({ occasion: "バースデー", items: [{ category: "ロールケーキ", flavor: "こいまりロール" }] }),
  "バースデーロールケーキ", "ロールケーキ+バースデーはフレーバー名を出さず「バースデーロールケーキ」"
);
assertEqual(
  productLabel({ items: [{ category: "ロールケーキ", flavor: "こいまりロール" }] }),
  "こいまりロール", "利用シーン未指定のロールケーキは従来通りフレーバー名のまま"
);
console.log("OK: productLabel はご利用シーンに応じて呼び方を変える");

// --- formatPickupDateTimeJp: 引き取り日時を「2026年9月7日15時」のような日本語表記に整形する ---

assertEqual(formatPickupDateTimeJp("2026-09-07", "15:00"), "2026年9月7日15時", "分が0の場合は「◯分」を付けない");
assertEqual(formatPickupDateTimeJp("2026-09-07", "15:30"), "2026年9月7日15時30分", "分が0以外の場合は「◯分」を付ける");
console.log("OK: formatPickupDateTimeJp");

console.log("\nすべてのローカルテストに合格しました。");
