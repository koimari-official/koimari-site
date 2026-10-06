// Cloud Functionsはデフォルトで動作環境がUTCになるため、営業時間判定・リマインダー送信時刻の計算が
// 日本時間基準で正しく動くよう、Dateがロケール依存の値を返す前（ファイル先頭）で明示的に設定する。
process.env.TZ = "Asia/Tokyo";

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueCreated, onValueUpdated, onValueWritten } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const nodemailer = require("nodemailer");

admin.initializeApp({
  databaseURL: "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const LINE_CHANNEL_SECRET = defineSecret("LINE_CHANNEL_SECRET");
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
// 予約確認メールの送信元。完全無料のGmail SMTP（アプリパスワード認証）を使う（2026-09-04導入）。
// `firebase functions:secrets:set GMAIL_USER` / `GMAIL_APP_PASSWORD` --project koimari-tasting で設定する。
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

// あいさつメッセージのカード②「ご予約」の送信テキスト（LINE Official Account Manager側の設定と一致させること）。
// これに完全一致した場合はAIを呼ばず、予約フォーム（member.html）のLIFFリンクを確実に案内する
// （member.html:264のLIFF_IDと同じ値。#reserveでご予約セクションまで自動スクロールする）。
const RESERVE_CARD_TRIGGER_TEXT = "予約について教えてください";
const RESERVE_LIFF_URL = "https://liff.line.me/2011059940-hMTBZaUz#reserve";
const RESERVE_CARD_REPLY_TEXT = `ご予約はこちらからどうぞ🎂

${RESERVE_LIFF_URL}

◆ご予約できる商品
◇デコレーションケーキ
◇ロールケーキ
◇焼き菓子・ギフト

◆ネット予約の締切
◇お引き取り希望日の3営業日前まで

◆2営業日前以降・お急ぎの場合
◇お電話（070-9158-0641）へ

ホームページのギャラリーで選んだ仕様をお伝えいただくと、よりスムーズにご案内できます🍓`;

// リッチメニュー「スタンプカード」タップ時の送信テキスト・返信（2026-09-08、旧「よくある質問」タイルを差し替え）。
// LINE公式アカウント自体のショップカード機能への一本化を予定しているが、公開URLが未確定のため、
// 準備中の案内を返すのみにしている。URLが決まり次第、RICHMENU_AREASのactionをuri型に切り替える。
const STAMP_CARD_TRIGGER_TEXT = "スタンプカードについて教えてください";
const STAMP_CARD_REPLY_TEXT = [
  "スタンプカードは近日公開予定です🎁",
  "もうしばらくお待ちくださいませ。",
  "",
  "ご予約・クーポン・ギャラリーは、",
  "引き続きこちらのメニューから",
  "ご利用いただけます。",
].join("\n");

// 「予約」「注文」という言葉が自由入力メッセージ内に含まれていた場合、AIの返信に必ずこのボタンを
// 添付する。リッチメニューを一度折りたたんだお客様にも、毎回確実に予約フォームへの導線を出すため
// （2026-09-06オーナー指示：リッチメニューは自動で毎回開き直せないLINE側の仕様のための代替策）。
const RESERVE_OR_ORDER_KEYWORDS = ["予約", "注文"];
const RESERVE_QUICK_REPLY_ITEMS = [
  { type: "action", action: { type: "uri", label: "ご予約はこちら", uri: RESERVE_LIFF_URL } },
];

const STORE_INFO = `
店名: こいまり（ケーキ屋）
住所: 大阪府大阪市城東区成育2丁目13-15 アイビーマンション1階
電話番号: 070-9158-0641
基本営業時間: 火〜土 10:00-20:00 ／ 日 10:00-19:00
定休日: 月曜日（月曜が祝日の場合はその月曜は営業） ※臨時休業がある場合は上記と異なることがあります
`.trim();

// 国民の祝日（内閣府発表分、2026-2027年）。定休日(月曜)が祝日と重なる日は営業する。
// index.html（JP_HOLIDAYS・isWeeklyClosedDay）と同じデータ・同じロジックを保つこと。
// 出典: https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html
const JP_HOLIDAYS = new Set([
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20","2026-04-29",
  "2026-05-03","2026-05-04","2026-05-05","2026-05-06","2026-07-20","2026-08-11",
  "2026-09-21","2026-09-22","2026-09-23","2026-10-12","2026-11-03","2026-11-23",
  "2027-01-01","2027-01-11","2027-02-11","2027-02-23","2027-03-21","2027-03-22",
  "2027-04-29","2027-05-03","2027-05-04","2027-05-05","2027-07-19","2027-08-11",
  "2027-09-20","2027-09-23","2027-10-11","2027-11-03","2027-11-23",
]);
function isWeeklyClosedDay(holidays, dow, key) {
  return (holidays.weeklyClosed || []).includes(dow) && !JP_HOLIDAYS.has(key);
}

// index.html の updateStatus()（L1090-1113）と同じロジック。
// 表示側とAI応答側で「本日の営業状況」の判定が食い違わないよう、必ずここを唯一の実装として保つ。
function computeTodayStatus(holidays, now) {
  const dow = now.getDay();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const h = holidays || { weeklyClosed: [1], extraClosed: [] };
  const extraClosed = h.extraClosed || [];
  const isClosed = isWeeklyClosedDay(h, dow, key) || extraClosed.includes(key);
  const hour = now.getHours() + now.getMinutes() / 60;
  // 日曜・祝日は19時まで、それ以外(火-土)は20時まで
  const closeHour = dow === 0 || JP_HOLIDAYS.has(key) ? 19 : 20;
  const inHours = hour >= 10 && hour < closeHour;

  if (isClosed) return "本日は定休日（または臨時休業日）です。";
  if (hour < 10) return "本日はこれから10:00に開店します（現在は営業時間外です）。";
  if (inHours) return "本日はただいま営業中です。";
  return "本日の営業は終了しました。";
}

function verifyLineSignature(rawBody, signature, channelSecret) {
  const hash = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return hash === signature;
}

// 予約引き取りリマインダー（3日前・24時間前・1時間前）用ロジック。
// 「暑いのに/寒いのにすみません」という詫びの方向ではなく、実家に帰ってきたような温かみ・
// 感謝・お会いできる楽しみを伝える方向のトーンにする（2026-08-19オーナー指示、2回のフィードバックで確定）。
function getSeasonCareLine(now) {
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 5) return "過ごしやすい季節になりましたね。";
  if (month >= 6 && month <= 8) return "暑い日が続きますね。涼しい服装でゆっくりお越しくださいね。";
  if (month >= 9 && month <= 11) return "涼しく過ごしやすい季節になりましたね。";
  return "寒い日が続きますね。暖かくしてゆっくりお越しくださいね。";
}

// 1時間前メッセージ用：お店側の気遣いの一言と、それに合わせた絵文字。
function getStoreComfortLine(now) {
  const month = now.getMonth() + 1;
  if (month >= 6 && month <= 8) return { text: "店内を涼しくしてお待ちしております。", emoji: "🍹" };
  if (month === 12 || month <= 2) return { text: "店内を暖かくしてお待ちしております。", emoji: "☕" };
  return { text: "お店でお待ちしております。", emoji: "🍓" };
}

// AIチャット応答の「久しぶりの会話」判定（この間隔以上あいたら、新しい会話の最初の1通とみなす）。
// 最初の1通にだけ季節のあいさつを添える（毎回だとくどくなるため、2026-09-04オーナー指示）。
const AI_CHAT_SESSION_GAP_MS = 6 * 60 * 60 * 1000;
async function isFirstMessageOfChatSession(userId, now) {
  if (!userId) return false;
  try {
    const snap = await admin.database().ref(`koimariOps/lastAiReplyAt/${userId}`).once("value");
    const last = snap.val();
    return !last || now.getTime() - last > AI_CHAT_SESSION_GAP_MS;
  } catch (err) {
    console.warn("lastAiReplyAt取得失敗:", err);
    return false;
  }
}
async function markAiReplySent(userId, now) {
  if (!userId) return;
  try {
    await admin.database().ref(`koimariOps/lastAiReplyAt/${userId}`).set(now.getTime());
  } catch (err) {
    console.warn("lastAiReplyAt更新失敗:", err);
  }
}
// 会話の最初の1通にだけ添える、あいさつ+季節の一言（getSeasonCareLineと同じ、確定済みのトーンを流用）。
// 「暑いのに/寒いのにすみません」という詫びではなく、温かみ・感謝を伝える方向（2026-08-19確定分針を踏襲）。
function buildChatGreetingPrefix(now) {
  return `いつもこいまりをご利用いただき、ありがとうございます😊\n\n${getSeasonCareLine(now)}\n\n`;
}

// お客様にメッセージで案内する「商品名」を組み立てる。
// ロールケーキはフレーバー名自体が商品名（例:「こいまりロール」）だが、デコレーションケーキは
// フレーバーが「イチゴ」等の形容にとどまるため、カテゴリ名と組み合わせて商品名らしくする。
// ご利用シーン（バースデー／クリスマス／その他）に応じた商品名。指定が無ければnull（呼び出し側で通常名にフォールバック）。
// member.htmlのoccasionCategoryName()とロジックを揃えること（member.html側は常にbaseCategoryへフォールバックする仕様のため、
// 戻り値の扱いが異なる点に注意 — こちらはproductLabel()内でflavorへのフォールバックと組み合わせるためnullを返す）。
function occasionCategoryName(baseCategory, occasion, occasionOther) {
  const isRoll = baseCategory === "ロールケーキ";
  if (occasion === "バースデー") return isRoll ? "バースデーロールケーキ" : "バースデーケーキ";
  if (occasion === "クリスマス") return isRoll ? "クリスマスロールケーキ" : "クリスマスケーキ";
  if (occasion === "その他" && occasionOther) return isRoll ? `${occasionOther}ロールケーキ` : `${occasionOther}ケーキ`;
  return null;
}

function productLabel(data) {
  const item = data.items && data.items[0];
  if (!item) return data.type || "ご予約商品";
  // カットケーキ単体のご予約（2026-10-03）：「カットケーキ（チーズケーキ×2、ショート×1）」
  if (item.category === "カットケーキ") return "カットケーキ（" + data.items.map((i) => (i.flavor || "") + "×" + (i.qty || 1)).join("、") + "）";
  const isRoll = item.category === "ロールケーキ";
  const occasionName = occasionCategoryName(item.category, data.occasion, data.occasionOther);
  let base;
  if (isRoll) {
    base = occasionName || item.flavor || item.category;
  } else {
    const categoryName = occasionName || item.category;
    base = !item.flavor ? categoryName : `${item.flavor}の${categoryName}`;
  }
  return base + (data.items.length > 1 ? `（${data.items.length}段）` : "");
}

// 引き取り日時をJSTの絶対時刻として計算する。process.env.TZの設定に依存せず正しく動くよう、
// タイムゾーンオフセットをISO文字列に明示的に含める。
function computePickupDateTime(data) {
  if (!data || !data.pickupDate || !data.pickupTime) return null;
  const d = new Date(`${data.pickupDate}T${data.pickupTime}:00+09:00`);
  return isNaN(d.getTime()) ? null : d;
}

// "2026-09-07"・"15:00" → "2026年9月7日15時"（分が0以外の場合のみ「◯分」を付ける）。
function formatPickupDateTimeJp(pickupDate, pickupTime) {
  const [y, mo, d] = String(pickupDate || "").split("-").map(Number);
  const [h, mi] = String(pickupTime || "").split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h)) return `${pickupDate} ${pickupTime}`;
  return `${y}年${mo}月${d}日${h}時${mi ? `${mi}分` : ""}`;
}

function buildReminderMessage(stage, data, now) {
  const name = data.name || "お客様";
  const product = productLabel(data);
  if (stage === "threeDay") {
    return [
      name + "様、お引き取りまであと3日となりました🍓",
      "",
      "◆ご注文",
      diamondLine("商品", product),
      diamondLine("お引き取り", formatPickupDateTimeJp(data.pickupDate, data.pickupTime)),
      "",
      ...paymentLines(data, "reminder").slice(1),
      "",
      "◆ご変更・ご相談",
      "◇お電話（070-9158-0641）へ",
      "",
      getSeasonCareLine(now),
      "お会いできる日を、スタッフ一同楽しみにお待ちしております。",
    ].join("\n");
  }
  if (stage === "oneDay") {
    return [
      name + "様、いよいよ明日お引き取りの日です🍓",
      "",
      "◆お引き取り",
      "◇" + formatPickupDateTimeJp(data.pickupDate, data.pickupTime),
      "",
      "◆ご注文",
      diamondLine("商品", product),
      ...paymentLines(data, "reminder"),
      "",
      "道中お気をつけてお越しくださいね。",
      "お会いできるのを楽しみにしております。",
    ].join("\n");
  }
  const comfort = getStoreComfortLine(now);
  return [
    name + "様、まもなくお引き取りのお時間です" + comfort.emoji,
    "",
    "◆お引き取り",
    "◇本日 " + data.pickupTime + "〜",
    ...paymentLines(data, "reminder"),
    "",
    comfort.text,
    "ゆっくりいらしてくださいね。",
  ].join("\n");
}

// LINEの画像メッセージ（originalContentUrl・previewImageUrlはHTTPSのJPEG/PNG。Firebase StorageのURLを使う）
function imageMessage(url) {
  return { type: "image", originalContentUrl: url, previewImageUrl: url };
}
// 1回のpushで最大5通まで送れる（画像＋文章をまとめて送る用）
async function pushLineMessages(userId, messages, accessToken) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ to: userId, messages: messages.slice(0, 5) }),
  });
  if (!res.ok) {
    console.error("LINE push failed:", res.status, await res.text());
    return false;
  }
  return true;
}
async function pushLineMessage(userId, text, accessToken) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    console.error("LINE push failed:", res.status, await res.text());
    return false;
  }
  return true;
}

// quickReplyItemsを渡すと、返信メッセージの下にタップ可能なボタンを添付できる。
// リッチメニューは一度ユーザーが折りたたむと次回から自動再表示されない（LINE側の仕様でBot側から
// 制御不可）ため、「予約」「注文」等の話題では毎回このボタンで確実に導線を出す（2026-09-06指示）。
// 複数のメッセージ（文章＋カード等）をまとめて返信する（最大5通）
async function replyLineMessages(replyToken, messages, accessToken) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
  });
  if (!res.ok) console.error("LINE reply failed:", res.status, await res.text());
  return res.ok;
}
async function replyToLine(replyToken, text, accessToken, quickReplyItems) {
  const message = { type: "text", text };
  if (quickReplyItems && quickReplyItems.length) {
    message.quickReply = { items: quickReplyItems };
  }
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [message],
    }),
  });
  if (!res.ok) {
    console.error("LINE reply failed:", res.status, await res.text());
  }
}

// アレルギーは「HP上でもあまり触れず、聞かれたら電話で個別回答する」という運用方針（2026-08-10オーナー指示）。
// FAQデータの中にアレルギー関連の項目が将来紛れ込んでも、AIには絶対に渡さないための安全網。
function isAllergyRelated(text) {
  return /アレルギ|アレルゲン/.test(String(text || ""));
}

// faq.html・admin.html「FAQ管理」タブと同じ koimariContent/faq を読み、AIの回答知識として使う。
// ハードコードせずFirebaseから都度取得することで、HP掲載のFAQを更新すればAIの回答も自動的に同じ内容になり、
// 「HPとAIで言っていることが違う」という齟齬が起きない設計にしている。
function buildFaqKnowledgeText(faqData) {
  if (!Array.isArray(faqData) || !faqData.length) return "（FAQ未設定）";
  const lines = [];
  for (const cat of faqData) {
    if (isAllergyRelated(cat.category)) continue;
    for (const item of cat.items || []) {
      if (isAllergyRelated(item.q) || isAllergyRelated(item.a)) continue;
      lines.push(`Q: ${item.q}\nA: ${item.a}`);
    }
  }
  return lines.length ? lines.join("\n\n") : "（FAQ未設定）";
}

// AIが「店舗情報・FAQだけでは十分に答えられなかった」と自己判断した返信には、
// 末尾に [[REVIEW: 理由]] という内部タグが付く（プロンプト側で指示）。
// お客様には絶対に見せず、スタッフ確認用にこの関数で抽出・除去する。
const REVIEW_TAG_RE = /\n*\[\[REVIEW:\s*([^\]]*)\]\]\s*$/;

function extractReviewTag(rawText) {
  const text = String(rawText || "");
  const match = REVIEW_TAG_RE.exec(text);
  if (!match) return { text: text.trim(), reviewReason: null };
  return { text: text.slice(0, match.index).trim(), reviewReason: match[1].trim() || "要確認" };
}

async function buildReplyText(anthropic, userText, todayStatus, faqKnowledgeText) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: `あなたはケーキ屋「こいまり」の公式LINEアカウントの受付担当です。お客様からのメッセージに、丁寧かつ親しみやすい口調で答えてください。

【店舗情報】
${STORE_INFO}

【本日の状況（システムが自動算出した正確な情報です。この内容を優先してください）】
${todayStatus}

【よくあるご質問（HPのFAQページと同じ内容です。該当する質問にはここから正確に答えてください）】
${faqKnowledgeText}

【回答ルール】
- 地元の温かいケーキ屋さんの店員として、親しみやすく自然な日本語で答えてください。機械的・事務的な言い回しや、不自然に硬い敬語の連続は避けてください
- 内容の区切りごとに改行（空行）を入れ、詰まった長文にならないようにしてください。LINEのトーク画面では短い段落に分けたほうが読みやすいです
- 標準語・関西弁どちらで聞かれても、内容を正しく理解して答えてください（無理に関西弁で返答する必要はありません）
- 営業時間・定休日・場所・電話番号・上記のFAQで答えられる質問には、その内容に沿って正確に答えてください
- アレルギーに関するご質問には、内容には一切触れず「恐れ入りますが、アレルギーに関するご質問はお電話（070-9158-0641）にて承っております」とご案内してください
- それ以外で、上記の情報だけでは答えられない質問（価格の詳細、在庫状況、予約の可否等）には、憶測で答えず「スタッフが確認してご連絡します」という趣旨で丁寧に答えてください
- クーポン・過去の作品（ギャラリー）に関する話題やご質問があった場合は、その内容に答えたうえで「トーク画面下部のメニューからも『クーポン』『ギャラリー』にすぐアクセスいただけます」という案内を一言添えてください
- 【重要】ご予約に関する話題（予約したい、商品・サイズ・引き取り日時を伝えようとしている等）があった場合は、**チャット上でご希望の商品や日時をお伺いしないでください**。予約はチャットでは承っておらず、必ず専用フォームでのご入力が必要である旨を伝え、「トーク画面下部のメニューの『ご予約』ボタンからご入力ください」とご案内してください。お客様が商品名・日時等をすでにメッセージ内で伝えてきた場合も、その内容を承った体で返信せず、フォームでの入力をお願いする案内に徹してください
- 返信は3〜4文程度（メニュー案内を添える場合は4〜5文程度）、簡潔にまとめてください
- 【内部確認タグ・必須】上記の店舗情報・FAQだけでは十分に答えられなかった質問（憶測で答えた、「スタッフが確認します」で対応した等）には、返信の一番最後に改行してから \`[[REVIEW: 理由を15字以内で]]\` という内部タグを必ず付けてください。このタグはお客様には表示されず、後でスタッフが内容を確認して正しい情報を登録するための業務用マーカーです。FAQ等の情報で十分正確に答えられた場合や、アレルギー質問を電話案内した場合はタグを付けないでください。`,
    messages: [{ role: "user", content: userText }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    return { text: "申し訳ございません、うまく回答できませんでした。お手数ですが再度お試しください。", reviewReason: null };
  }
  return extractReviewTag(textBlock.text);
}

// ローカルテスト用に内部ロジックも公開する（Cloud Functionsとしてはデプロイされない、ただのプロパティ）。
exports._internal = {
  buildConfirmMessage, buildReceivedMessage,
  computeTodayStatus, verifyLineSignature, isAllergyRelated, buildFaqKnowledgeText, extractReviewTag,
  getSeasonCareLine, getStoreComfortLine, productLabel, computePickupDateTime, buildReminderMessage,
  buildStaffNotifyText, isFirstMessageOfChatSession, buildChatGreetingPrefix, formatPickupDateTimeJp,
  buildCustomerConfirmationEmailText, buildCouponReplyText, buildReceivedMessage, buildConfirmMessage, diamondLine,
  assignReservationNo, formatReservationNo, buildRevisionMessage, isPhotoChristmas, buildFollowMessage, buildReserveCard, mapCostPricesToPriceTable, syncPriceTableFromCost, customerFlagLines,
};

exports.lineWebhook = onRequest(
  {
    region: "asia-northeast1",
    secrets: [LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN, ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    const signature = req.get("x-line-signature");
    if (!signature || !verifyLineSignature(req.rawBody, signature, LINE_CHANNEL_SECRET.value())) {
      res.status(403).send("invalid signature");
      return;
    }

    const events = (req.body && req.body.events) || [];
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // LINEのWebhookは複数イベントを1リクエストにまとめて送ってくることがあるため、
    // 全イベントの処理が終わってからレスポンスを返す（Cloud Run はレスポンス送信後に
    // CPU割り当てを止めることがあるため、途中で先にres.send()しない）。
    for (const event of events) {
      // スタッフ用グループにBotが参加した・グループ内で発言があった場合、そのグループIDを
      // 新規予約通知の送信先として保存する（2026-08-19オーナー指示：スタッフへのLINE通知）。
      if (event.source && event.source.type === "group" && event.source.groupId) {
        try {
          await admin.database().ref("koimariOps/staffNotifyGroupId").set(event.source.groupId);
        } catch (err) {
          console.error("staffNotifyGroupId保存失敗:", err);
        }
      }

      if (event.type === "follow" && event.replyToken && event.source && event.source.type === "user") {
        try {
          const pick = await pendingPickFor(event.source.userId);
          const coupons = (await admin.database().ref("koimariOps/coupons").once("value")).val();
          const card = buildReserveCard(pick, await reserveCardImage());
          await replyLineMessages(event.replyToken, [{ type: "text", text: buildFollowMessage(pick, coupons) }, card], LINE_CHANNEL_ACCESS_TOKEN.value());
        } catch (err) {
          console.error("友だち登録への返信に失敗:", err);
        }
        continue;
      }
      if (event.type !== "message" || !event.message || event.message.type !== "text") continue;
      // グループ・複数人トークではAIの自動応答をしない（お客様向けのFAQ回答がスタッフの
      // 雑談に混ざってしまうのを防ぐ。1対1のトークのみ応答する）。
      if (event.source && event.source.type !== "user") continue;

      try {
        // カード②「ご予約について教えてください」はAIの生成に任せず、確実にLIFF予約フォームへ案内する。
        if (event.message.text.trim() === RESERVE_CARD_TRIGGER_TEXT) {
          await replyToLine(event.replyToken, RESERVE_CARD_REPLY_TEXT, LINE_CHANNEL_ACCESS_TOKEN.value(), RESERVE_QUICK_REPLY_ITEMS);
          continue;
        }

        // 商品ページで選んだ仕様のコード（例:【ご希望仕様コード】ABCD2345）が送られてきたら、
        // その内容を確認して、選択内容が引き継がれる専用の予約フォームリンクを返す（2026-09-24）。
        // 友だち追加前にブラウザで選んだ内容を、LINE内の予約フォームへ渡すための受け口。
        const draftMatch = event.message.text.match(/仕様コード[^A-Za-z0-9]*([A-Za-z0-9]{8})/);
        if (draftMatch) {
          const code = draftMatch[1].toUpperCase();
          const snap = await admin.database().ref("reservationDrafts/" + code).once("value");
          const d = snap.val();
          const link = RESERVE_LIFF_URL.replace("#reserve", "") + "?draft=" + code + "#reserve";
          const text = d && d.name
            ? ["ご希望の仕様を確認しました🎂", d.name + (d.size ? "（" + d.size + "）" : ""), "", "こちらから、この内容を引き継いだままご予約に進めます↓", link].join("\n")
            : ["コードが見つかりませんでした。お手数ですが、下のボタンからご予約フォームを開き、ご希望をご入力ください🙇", RESERVE_LIFF_URL].join("\n");
          await replyToLine(event.replyToken, text, LINE_CHANNEL_ACCESS_TOKEN.value(), RESERVE_QUICK_REPLY_ITEMS);
          continue;
        }

        // リッチメニュー「スタンプカード」タップ時も、AIの生成に任せず準備中の案内を確実に返す。
        if (event.message.text.trim() === STAMP_CARD_TRIGGER_TEXT) {
          await replyToLine(event.replyToken, STAMP_CARD_REPLY_TEXT, LINE_CHANNEL_ACCESS_TOKEN.value());
          continue;
        }

        // リッチメニュー「クーポン」タップ時も、AIの生成に任せずkoimariOps/couponsの実データをそのまま案内する。
        // SNS転載対策として、お客様の表示名を案内文に入れる（admin.htmlでクーポン利用を停止された
        // 会員には、クーポン内容自体を見せない＝実質のブラックリスト対応。2026-09-06オーナー指示）。
        if (event.message.text.trim() === COUPON_TRIGGER_TEXT) {
          const couponUserId = (event.source && event.source.userId) || null;
          const [couponsSnap, memberSnap, profile] = await Promise.all([
            admin.database().ref("koimariOps/coupons").once("value"),
            couponUserId ? admin.database().ref("lineMembers/" + couponUserId).once("value") : Promise.resolve(null),
            couponUserId
              ? lineApi("GET", `https://api.line.me/v2/bot/profile/${couponUserId}`, LINE_CHANNEL_ACCESS_TOKEN.value()).catch(() => null)
              : Promise.resolve(null),
          ]);
          const isCouponBlocked = !!(memberSnap && memberSnap.val() && memberSnap.val().couponBlacklisted);
          const couponReply = isCouponBlocked
            ? buildCouponReplyText([], todayDateKeyJST(new Date()))
            : buildCouponReplyText(couponsSnap.val(), todayDateKeyJST(new Date()), profile && profile.displayName);
          await replyToLine(event.replyToken, couponReply, LINE_CHANNEL_ACCESS_TOKEN.value());
          continue;
        }

        const [holidaysSnap, faqSnap] = await Promise.all([
          admin.database().ref("koimariContent/holidays").once("value"),
          admin.database().ref("koimariContent/faq").once("value"),
        ]);
        const now = new Date();
        const userId = (event.source && event.source.userId) || null;
        const todayStatus = computeTodayStatus(holidaysSnap.val(), now);
        const faqKnowledgeText = buildFaqKnowledgeText(faqSnap.val());
        const { text: aiText, reviewReason } = await buildReplyText(anthropic, event.message.text, todayStatus, faqKnowledgeText);
        const greet = await isFirstMessageOfChatSession(userId, now);
        const replyText = greet ? buildChatGreetingPrefix(now) + aiText : aiText;
        const mentionsReserveOrOrder = RESERVE_OR_ORDER_KEYWORDS.some((k) => event.message.text.includes(k));
        await replyToLine(event.replyToken, replyText, LINE_CHANNEL_ACCESS_TOKEN.value(), mentionsReserveOrOrder ? RESERVE_QUICK_REPLY_ITEMS : undefined);
        await markAiReplySent(userId, now);
        if (reviewReason) {
          await admin.database().ref("aiReviewQueue").push({
            question: event.message.text,
            aiAnswer: replyText,
            reason: reviewReason,
            userId,
            timestamp: Date.now(),
            status: "pending",
          });
        }
      } catch (err) {
        console.error("lineWebhook event processing error:", err);
      }
    }

    res.status(200).send("OK");
  }
);

// 予約引き取りリマインダー（3日前・24時間前・1時間前、2026-08-19オーナー指示）。
// 15分おきに全予約を確認し、各リマインダー段階の時間帯に入った未送信のものへLINEプッシュメッセージを送る。
// 「4日以上前に予約した人だけ3日前通知が届く」は、3日前の時点でその予約がまだ存在しない
// （まだ予約していない）人には自然に届かないため、時間帯判定だけで意図通りになる。
const REMINDER_STAGES = [
  { key: "threeDay", minHours: 66, maxHours: 78 },
  { key: "oneDay", minHours: 20, maxHours: 28 },
  { key: "oneHour", minHours: 0, maxHours: 2 },
];

exports.sendPickupReminders = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "asia-northeast1",
    timeZone: "Asia/Tokyo",
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async () => {
    const accessToken = LINE_CHANNEL_ACCESS_TOKEN.value();
    const snap = await admin.database().ref("reservations").once("value");
    const all = snap.val() || {};
    const now = new Date();

    for (const [key, data] of Object.entries(all)) {
      if (!data || data.channel !== "LINE" || !data.lineUserId || data.status === "キャンセル") continue;
      const pickupAt = computePickupDateTime(data);
      if (!pickupAt) continue;
      const hoursUntil = (pickupAt.getTime() - now.getTime()) / 3600000;
      const sent = data.reminderSent || {};

      for (const stage of REMINDER_STAGES) {
        if (sent[stage.key]) continue;
        if (hoursUntil < stage.minHours || hoursUntil > stage.maxHours) continue;
        const text = buildReminderMessage(stage.key, data, now);
        const ok = await pushLineMessage(data.lineUserId, text, accessToken);
        if (ok) {
          await admin.database().ref(`reservations/${key}/reminderSent/${stage.key}`).set(true);
        }
      }
    }
  }
);

// 新規予約が入るたび、スタッフ用LINEグループへ通知する（2026-08-19オーナー指示）。
// admin.htmlの予約一覧へのリンクを添えることで、通知をタップすればそのまま
// 「確認電話」「予約確定」のチェックができる画面に移動できるようにする。
const ADMIN_RESERVATIONS_URL = "https://koimari-official.github.io/koimari-site/admin.html";

// 2026-09-23オーナー指示：デコレーションケーキの予約フォーム（member.html）は送信時に
// お客様のLINEトークへ自動計算した基本料金の目安を案内している。スタッフ通知にも同じ
// 金額を載せ、「お客様には何と案内されているか」を確認電話の前に把握できるようにする。
// data.subtotal/data.priceNeedsConsultは予約データに既に保存されている値をそのまま使う
// （Functions側では再計算しない＝計算ロジックの二重管理を避ける）。
function buildStaffNotifyText(data) {
  const product = productLabel(data);
  const channel = data.channel === "LINE" ? "LINE公式アカウント" : "こいまりHP";
  const lines = [
    "📋 新しいご予約が入りました",
    ...(data.reservationNo ? [`予約番号: ${formatReservationNo(data.reservationNo)}`] : []),
    `受付経路: ${channel}`,
    `お名前: ${data.name || ""}`,
    `商品: ${product}`,
    `引き取り希望: ${data.pickupDate || ""} ${data.pickupTime || ""}`,
    `お電話番号: ${data.tel || ""}`,
  ];
  if (data.galleryPick && data.galleryPick.name) {
    lines.push("ギャラリーで選択: " + galleryPickLabel(data.galleryPick) + (data.galleryPick.size ? "（" + data.galleryPick.size + "）" : ""));
  }
  if (Array.isArray(data.decideLater) && data.decideLater.length) {
    lines.push("あとで相談: " + data.decideLater.join("・"));
  }
  if (data.omakaseDeco) lines.push("おまかせデコレーション: " + data.omakaseDeco);
  if (Array.isArray(data.toppings) && data.toppings.length) {
    lines.push("トッピング: " + data.toppings.join("・") + "（料金・納期は別途連絡）");
  }
  if (Array.isArray(data.tierSpecs) && data.tierSpecs.length) {
    data.tierSpecs.forEach(function (t) {
      lines.push(t.tier + ": " + String(t.size || "").replace(/\(.*$/, "") + " " + t.cream + ((t.colors || []).length ? "（" + t.colors.join("・") + "）" : ""));
    });
  }
  if (data.colorCream && !(Array.isArray(data.tierSpecs) && data.tierSpecs.length)) {
    lines.push("カラークリーム: " + data.colorCream.count + "色" + ((data.colorCream.colors || []).length ? "：" + data.colorCream.colors.join("・") : "") + (data.colorCream.note ? "（" + data.colorCream.note + "）" : ""));
  }
  if (Array.isArray(data.cutCakes) && data.cutCakes.length) {
    lines.push("上に載せるカットケーキ: " + data.cutCakes.map((c) => c.name + "×" + c.qty).join("、"));
  }
  if (data.topCut) {
    lines.push("カットケーキ載せ: 載せる（入れ物代あり）" + (data.topCut.note ? "：" + data.topCut.note : ""));
  }
  if (Array.isArray(data.specialReasons) && data.specialReasons.length) {
    lines.push("⚠ 特別仕様（納期要確認）: " + data.specialReasons.join("・"));
  }
  if (data.specialSpec) {
    lines.push("⚠ 特殊仕様: " + data.specialSpec + "（納期は通常と異なります・要確認）");
  }
  if (data.customBase) lines.push("⚠ " + data.customBase + "（フルオーダー）：お見積もり・納期を電話で回答してください");
  else if (data.quoteSeparately) lines.push("⚠ ギャラリーの写真の仕様で注文（プルダウンで表せない仕様）：お見積もり・納期を電話で回答してください" + (data.galleryPick && data.galleryPick.price ? "（お客様に表示した" + data.galleryPick.price + "）" : ""));
  if (isPhotoChristmas(data)) lines.push("📷 写真で選んだクリスマスケーキ：確認電話なし（LINE自動送信のみ）。仕様確定後に確定画像を送ってください");
  if (data.christmasOrder) {
    lines.push("🎄 クリスマスケーキ: 当日のお会計なし（" + XMAS_PAYMENT_DEADLINE + "までに店頭でお支払いいただく案内済み）");
  }
  if (data.priceNeedsConsult) {
    lines.push("⚠ 特殊仕様（原価表にない組み合わせ）：お電話で仕様・料金を確認してください");
  } else if (data.subtotal) {
    const detail = Array.isArray(data.estimateLines) && data.estimateLines.length
      ? ["", ...data.estimateLines.map((l) => "　" + l.label + " ¥" + Number(l.amount).toLocaleString())].join("\n")
      : "";
    // priceIsFixed（member.htmlが保存）がtrueなら、お客様には確定金額として案内済み。
    const shown = data.priceIsFixed
      ? `確定金額として案内済み: ¥${Number(data.subtotal).toLocaleString()}（税込）`
      : `お見積もり（お客様への表示）: ¥${Number(data.subtotal).toLocaleString()}〜（最低金額の目安・税込）`;
    lines.push(shown + detail);
  }
  if (data.note) lines.push(`ご要望・備考: ${data.note}`);
  lines.push("", "確認電話・予約確定のチェックは管理画面から↓", ADMIN_RESERVATIONS_URL);
  return lines.join("\n");
}

exports.notifyStaffOnNewReservation = onValueCreated(
  {
    ref: "/reservations/{pushId}",
    instance: "koimari-tasting-default-rtdb",
    region: "asia-southeast1",
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const raw = event.data.val();
    if (!raw) return;
    const reservationNo = await assignReservationNo(event.params.pushId);
    const data = Object.assign({}, raw, { reservationNo });
    const groupIdSnap = await admin.database().ref("koimariOps/staffNotifyGroupId").once("value");
    const groupId = groupIdSnap.val();
    if (!groupId) {
      console.warn("staffNotifyGroupId未設定のため、新規予約通知をスキップしました。");
      return;
    }
    let text = buildStaffNotifyText(data);
    try {
      const warn = customerFlagLines(data, (await admin.database().ref("customerFlags").once("value")).val());
      if (warn.length) text = warn.join("\n") + "\n\n" + text;
    } catch (e) { console.warn("要注意のお客様の確認に失敗:", e.message); }
    await pushLineMessage(groupId, text, LINE_CHANNEL_ACCESS_TOKEN.value());
  }
);
// 要注意のお客様（admin.html「要注意のお客様」、customerFlags）に電話・LINE・メールのどれかが一致したら、スタッフ通知の先頭に出す（2026-10-04）
function cfTelKey(t) { let d = String(t || "").replace(/\D/g, ""); if (d.indexOf("81") === 0 && d.length >= 11) d = "0" + d.slice(2); return d.length >= 10 ? d : ""; }
function customerFlagLines(data, flagsObj) {
  const t = cfTelKey(data.tel), m = String(data.email || "").trim().toLowerCase(), l = data.lineUserId || "";
  const levels = { caution: "注意して対応", prepay: "前払いをお願いする", decline: "ご予約をお断りする" };
  return Object.values(flagsObj || {}).filter((f) => f && ((t && cfTelKey(f.tel) === t) || (l && f.lineUserId === l) || (m && /@/.test(m) && String(f.email || "").trim().toLowerCase() === m)))
    .map((f) => "⚠⚠ 要注意のお客様（" + (f.type || "") + "／" + (levels[f.level] || "注意して対応") + "）" + (f.note ? "\n　" + f.note : ""));
}

// 予約内容の確定連絡（2026-09-26）：管理画面の予約一覧で「予約確定」にチェックが入った瞬間、
// お客様のLINEトークへ確定内容を自動送信する。二重送信しないよう confirmMessageSentAt を記録する。
// 「4号(約12cm/3-4名)」→「4号（直径約12cm）」
function sizeWithDiameter(size) {
  const m = String(size || "").match(/^(\d号)\((約\d+cm)/);
  return m ? m[1] + "（直径" + m[2] + "）" : String(size || "").replace(/\(.*$/, "");
}
// クリスマスケーキは引き渡し当日が大変混雑するため、当日のお会計を行わず、
// 12月20日までに店頭でお支払いいただく（2026-09-29オーナー指示）。それ以外は当日店頭でご精算。
// member.html の paymentNoticeText()・XMAS_PAYMENT_DEADLINE と内容をそろえること。
const XMAS_PAYMENT_DEADLINE = "12月20日";
// stage: "received"（予約直後）/ "confirmed"（確定連絡）/ "reminder"（リマインド）
function paymentLines(data, stage) {
  const lines = ["", "◆お支払い"];
  if (data && data.christmasOrder) {
    lines.push("◇" + XMAS_PAYMENT_DEADLINE + "までに店頭で", "　お願いしております");
    // 2026-10-02オーナー確認：LINEで予約 → 12/20までに店頭で前払い。お支払いの時点でご予約確定
    lines.push("◇お支払いの時点で", "　ご予約確定となります");
    if (stage === "reminder") lines.push("◇お済みでない場合は、", "　お早めにご来店ください");
    lines.push("◇お引き渡し当日はお会計を", "　承っておりません");
    return lines;
  }
  if (stage === "reminder") lines.push("◇当日、店頭でご精算を", "　お願いいたします");
  else lines.push("◇お引き取り日当日、", "　店頭でご精算をお願いいたします");
  return lines;
}

// 備考欄の「なし」「特になし」「ありません」等は、要望なしとして扱う（2026-10-03：「なし」と書いただけで確定価格にならなかった）
function hasMeaningfulNote(note) {
  const t = String(note || "").replace(/[\s　。．.、,！!]/g, "");
  return !!t && !/^(なし|無し|ナシ|特になし|特に無し|とくになし|ありません|ないです|ない|無|なしです|特にありません|-|ー|―|‐)$/.test(t);
}
// 「¥◯◯〜」で案内する理由の注記。備考にご希望がある場合は、内容確認のうえ電話で価格・納期を回答する。
function estimateReasonLines(data) {
  if (data && hasMeaningfulNote(data.note)) {
    return ["　※ご要望の内容を確認のうえ、", "　　お電話で価格・納期を", "　　ご案内いたします"];
  }
  return ["　※最低金額の目安です。", "　　確定金額はお電話でご案内します"];
}

// 予約番号（受付順の通し番号）。koimariOps/reservationCounterを唯一の採番元とし、
// reservations/{pushId}/reservationNoに一度だけ書き込む（早い者勝ち・番号の欠番は許容、重複は禁止）。
async function assignReservationNo(pushId) {
  try {
    const nodeRef = admin.database().ref("reservations/" + pushId + "/reservationNo");
    const existing = (await nodeRef.once("value")).val();
    if (existing) return existing;
    const counterRef = admin.database().ref("koimariOps/reservationCounter");
    const inc = await counterRef.transaction((cur) => (cur || 0) + 1);
    const n = inc.committed ? inc.snapshot.val() : null;
    if (!n) return existing || null;
    const claim = await nodeRef.transaction((cur) => (cur == null ? n : undefined));
    return claim.committed ? n : (claim.snapshot.val() || n);
  } catch (err) {
    console.error("予約番号の採番に失敗:", err);
    return null;
  }
}
// 1234 → "No.1234"（4桁未満は0埋め）。member.html・admin.htmlと表記をそろえること。
function formatReservationNo(n) {
  return n ? "No." + String(n).padStart(4, "0") : "";
}

// ギャラリーで選んだ商品の表示名。デコレーションケーキは固定番号「No.D01」を先頭に付ける（2026-10-02）
function galleryPickLabel(pick) {
  const no = Number(pick && pick.no) > 0 ? "No.D" + String(pick.no).padStart(2, "0") + " " : "";
  return no + ((pick && pick.name) || "");
}

// 友だち登録した直後にトークへ送る案内（2026-10-02オーナー指示：登録後に予約ページへのリンクと簡単な案内があれば離脱が減る）。
// ギャラリーでケーキを選んでから登録した方（予約フォームで読み込んだ仕様を lineMembers/{uid}/profile/pendingDraft に保存済み）には、
// そのケーキが入った予約フォームのリンクを送る。それ以外の方には、通常の予約フォームとギャラリーのリンクを送る。
function buildFollowMessage(pick, coupons) {
  const lines = ["友だち追加ありがとうございます🎂", ""];
  // 有効なクーポン（期限内）があれば、最初に案内する（2026-10-03：友だち登録キャンペーン）
  const active = (Array.isArray(coupons) ? coupons : []).filter((c) => c && c.discount && (!c.expiry || c.expiry >= todayDateKeyJST(new Date())));
  if (active.length) {
    lines.push("◆友だち限定クーポン");
    active.forEach((c) => {
      lines.push("◇" + c.discount);
      if (c.memo) lines.push("　" + c.memo);
      if (c.expiry) lines.push("　※" + formatCouponExpiry(c.expiry) + "まで");
    });
    lines.push("◇トーク画面下の「クーポン」から", "　いつでも表示できます", "");
  }
  if (pick && pick.code) {
    lines.push(
      "さきほどギャラリーで選んだケーキで、",
      "このままご予約いただけます。",
      "",
      "◆選んだケーキ",
      "◇" + (pick.name || "ギャラリーで選んだケーキ"),
      "",
      "▼ご予約はこちら",
      "（選んだケーキが入っています）",
      "https://liff.line.me/2011059940-hMTBZaUz?draft=" + encodeURIComponent(pick.code) + "#reserve"
    );
  } else {
    lines.push(
      "ケーキのご予約は、こちらの",
      "フォームから承っております。",
      "",
      "▼ご予約はこちら",
      RESERVE_LIFF_URL,
      "",
      "▼ケーキの写真から選ぶ方はこちら",
      GALLERY_URL
    );
  }
  lines.push(
    "",
    "◆ご予約の流れ",
    "◇予約フォームで日時・お名前を入力",
    "◇送信後、パティシエより",
    "　お電話で内容を確認いたします",
    "",
    "◆ご予約の締切",
    "◇お引き取りの3営業日前まで",
    "　※オーダーケーキの場合、14日程度お日にちを頂く場合がございます。",
    "◇お急ぎの方はお電話へ",
    "　（070-9158-0641）"
  );
  return lines.join("\n");
}
function buildReserveCard(pick, imageUrl) {
  const url = pick && pick.code ? "https://liff.line.me/2011059940-hMTBZaUz?draft=" + encodeURIComponent(pick.code) + "#reserve" : RESERVE_LIFF_URL;
  const bubble = {
    type: "bubble",
    body: {
      type: "box", layout: "vertical", spacing: "sm",
      contents: [
        { type: "text", text: "ケーキのご予約", weight: "bold", size: "xl", color: "#2e2118" },
        { type: "text", text: pick && pick.code ? "さきほど選んだケーキが入った予約フォームが開きます" : "写真から選んで、そのままLINEでご予約いただけます", wrap: true, size: "sm", color: "#4a3a2a" },
      ],
    },
    footer: {
      type: "box", layout: "vertical",
      contents: [{ type: "button", style: "primary", color: "#06c755", action: { type: "uri", label: "ご予約はこちら", uri: url } }],
    },
  };
  if (imageUrl && /^https:\/\//.test(imageUrl)) {
    bubble.hero = { type: "image", url: imageUrl, size: "full", aspectRatio: "1:1", aspectMode: "cover", action: { type: "uri", uri: url } };
  }
  return { type: "flex", altText: "ケーキのご予約はこちら", contents: bubble };
}
// 「ご予約」カードの写真：ギャラリーの「すべて」の写真（galleryCover）→ なければ先頭の作品
async function reserveCardImage() {
  try {
    const list = (await admin.database().ref("koimariContent/gallery").once("value")).val() || [];
    const arr = Array.isArray(list) ? list : Object.values(list);
    const pick = arr.find((g) => g && g.galleryCover && g.img) || arr.find((g) => g && g.img);
    return pick ? pick.img : "";
  } catch (err) { return ""; }
}

// 予約フォームで読み込んだギャラリーの仕様（30日以内）。予約フォーム（member.html）の PENDING_DRAFT_DAYS と同じ期間
async function pendingPickFor(userId) {
  try {
    const snap = await admin.database().ref("lineMembers/" + userId + "/profile").once("value");
    const p = snap.val() || {};
    if (!p.pendingDraft || !p.pendingDraftAt || Date.now() - p.pendingDraftAt > 30 * 86400000) return null;
    const code = String(p.pendingDraft).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const d = (await admin.database().ref("reservationDrafts/" + code).once("value")).val();
    return d && d.productType !== "autosave" ? { code, name: d.name || "" } : null;
  } catch (err) {
    console.warn("pendingDraftの取得に失敗:", err);
    return null;
  }
}

// ◇項目の1行を作る。LINEのトーク画面は1行あたり全角18文字前後で折り返され、箇条書きが長いと
// 折り返し行の頭がそろわず読みにくくなる。短ければ「◇項目：内容」の1行、長ければ「◇項目」の次の行に
// 全角スペース付きで内容を置く（2026-09-28オーナー指示：長文の箇条書きは折り返しで見づらい）。
function diamondLine(label, value) {
  const v = String(value == null ? "" : value).trim();
  if (!v) return "◇" + label;
  const oneLine = "◇" + label + "：" + v;
  return oneLine.length <= 18 ? oneLine : "◇" + label + "\n　" + v.split("\n").join("\n　");
}

// ご注文の仕様を「◇項目：内容」の行にまとめる（受付時メッセージと確定連絡メッセージで同じ書き方にそろえる）。
function orderDetailLines(data) {
  const lines = [];
  const it = (data.items && data.items[0]) || {};
  const isCakeLike = it.category === "デコレーションケーキ" || it.category === "ロールケーキ";
  lines.push(diamondLine("商品", productLabel(data)));
  if (data.galleryPick && data.galleryPick.name) {
    lines.push(diamondLine("ギャラリーで選択", galleryPickLabel(data.galleryPick) + (data.galleryPick.size ? "（" + data.galleryPick.size + "）" : "")));
  }
  if (Array.isArray(data.tierSpecs) && data.tierSpecs.length) {
    data.tierSpecs.forEach((t) => {
      lines.push(diamondLine(t.tier, sizeWithDiameter(t.size) + " " + t.cream + ((t.colors || []).length ? "（" + t.colors.join("・") + "）" : "")));
    });
  } else {
    if (it.size && it.size !== "ホール") lines.push(diamondLine("サイズ", sizeWithDiameter(it.size)));
    if (data.creamType) lines.push(diamondLine("クリーム", data.creamType + (data.creamTypeSub ? "（" + data.creamTypeSub + "）" : "")));
    if (data.colorCream && data.colorCream.count) {
      lines.push(diamondLine("カラークリーム", data.colorCream.count + "色" + ((data.colorCream.colors || []).length ? "（" + data.colorCream.colors.join("・") + "）" : "")));
    }
  }
  if (data.decoration) lines.push(diamondLine("飾り付け", data.decoration));
  if (isCakeLike) {
    lines.push(diamondLine("ろうそく", data.christmasOrder ? "無料でお付けします" : (data.candleNeeded ? data.candleType + " " + data.candleBags + "袋" : "なし")));
    if (data.christmasOrder) lines.push(diamondLine("プレート", "「メリークリスマス」"));
    else if (it.message) lines.push(diamondLine("プレート", "「" + it.message + "」"));
    else lines.push(diamondLine("プレート", data.messageCount > 0 ? data.messageCount + "枚（文字はご相談）" : "なし"));
  }
  const extras = [];
  if (data.creamTopping) extras.push("生クリームたっぷり");
  if (data.strawberryAdd) extras.push("いちごトッピング");
  if (data.topCut && !(data.cutCakes || []).length) extras.push("カットケーキ載せ" + (data.topCut.note ? "（" + data.topCut.note + "）" : ""));
  if (Array.isArray(data.cutCakes) && data.cutCakes.length) lines.push(diamondLine("カットケーキ", data.cutCakes.map((c) => c.name + "×" + c.qty).join("、")));
  if (data.onsiteAssembly) extras.push("出張組み立て");
  (data.addOns || []).forEach((a) => extras.push(a.name + (a.qty > 1 ? "×" + a.qty : "")));
  if (data.omakaseDeco) extras.push("おまかせデコレーション（" + data.omakaseDeco + "）");
  (data.toppings || []).forEach((t) => extras.push(t));
  if (extras.length) lines.push(diamondLine("オプション", extras.join("、")));
  if (Array.isArray(data.decideLater) && data.decideLater.length) lines.push(diamondLine("あとで相談", data.decideLater.join("・")));
  if (data.receiptNeeded) lines.push(diamondLine("領収書", "必要" + (data.receiptName ? "（宛名：" + data.receiptName + "）" : "")));
  if (data.note) lines.push(diamondLine("備考", data.note));
  return lines;
}

// ① 予約を受け付けた直後にお客様のLINEへ送る文面（2026-09-26オーナー確定文面を、2026-09-28に
// 「1通にまとめて◆◇で見やすく」へ再構成。以前はお客様側の自動投稿（【ご予約を送信しました】）とこの
// メッセージの計2通が長文で届いていたため、この1通に統合した）。
function buildReceivedMessage(data) {
  const name = data.name || "お客様";
  const lines = [
    name + "様、ご予約ありがとうございます🎂",
    "ご注文を以下の内容で承りました。",
  ];
  if (data.reservationNo) lines.push("", "◆予約番号", "◇" + formatReservationNo(data.reservationNo));
  lines.push("", "◆ご注文内容");
  lines.push(...orderDetailLines(data));
  const photoXmas = isPhotoChristmas(data);
  if (photoXmas) lines.push("", "◆お写真について", "◇写真は昨年のケーキです。", "　砂糖菓子や一部の仕様が", "　異なる場合がございます");
  // クリスマスケーキは店頭での前払いをもってご予約確定のため、受付時点では「確定」と書かない
  const fixedNow = data.priceIsFixed && !data.christmasOrder;
  lines.push("", data.quoteSeparately ? "◆お引き取り（ご希望）" : fixedNow ? "◆お引き取り（確定）" : "◆お引き取り");
  lines.push("◇" + formatPickupDateTimeJp(data.pickupDate, data.pickupTime));
  if (data.quoteSeparately) lines.push("　※納期は別途ご回答いたします");
  lines.push("", data.christmasOrder && data.priceIsFixed ? "◆お支払い金額" : fixedNow && !data.quoteSeparately ? "◆お支払い金額（確定）" : "◆お見積もり");
  if (data.quoteSeparately) {
    lines.push("◇別途、パティシエより", "　お見積もりをご回答いたします");
    const guide = data.galleryPick && /^目安/.test(String(data.galleryPick.price || "")) ? String(data.galleryPick.price).replace(/^目安\s*/, "") : "";
    if (guide) lines.push("　（目安：" + guide + "・税込）");
  }
  else if (data.priceNeedsConsult) lines.push("◇特殊仕様のため、スタッフが", "　お電話で仕様・料金を確認します");
  else if (data.subtotal && data.priceIsFixed) lines.push("◇¥" + Number(data.subtotal).toLocaleString() + "（税込）");
  else if (data.subtotal) lines.push("◇¥" + Number(data.subtotal).toLocaleString() + "〜（税込）", ...estimateReasonLines(data));
  else lines.push("◇お電話でご案内します");
  lines.push(...paymentLines(data, "received"));
  if (photoXmas) {
    lines.push("", "◆このあとの流れ", "◇仕様が確定しましたら、", "　確定のケーキ画像を", "　このトークでお送りします");
  } else {
    lines.push(
      "",
      "◆このあとの流れ",
      data.quoteSeparately ? "◇パティシエがお見積もり・納期を" : "◇パティシエが内容確認のお電話をします",
      data.quoteSeparately ? "　お電話でご回答します" : "　（070-9158-0641から発信）",
      "◇お電話がつながらない場合は、",
      "　ご予約をキャンセルさせて",
      "　いただくことがあります"
    );
  }
  lines.push(
    "",
    "◆ご変更・ご相談",
    "◇お電話（070-9158-0641）へ",
    "",
    "当日お会いできるのを楽しみにしております🍓"
  );
  return lines.join("\n");
}
// 写真で選ぶクリスマスケーキ（確認電話なし・LINEの自動送信のみ。2026-10-02オーナー指示）
function isPhotoChristmas(data) {
  return !!(data && data.christmasOrder && data.galleryPick && data.galleryPick.img);
}

// ③ 管理画面で「修正n」として変更を確定した時に送る文面（2026-10-02オーナー指示）。
// 変更点（変更前→変更後）と、変更後のご注文内容・お引き取り日時・金額をまとめて送る。
function buildRevisionMessage(data, rev) {
  const name = data.name || "お客様";
  const label = (rev && rev.label) || "修正";
  const lines = [name + "様", "ご予約内容を変更いたしました（" + label + "）。"];
  if (data.reservationNo) lines.push("", "◆予約番号", "◇" + formatReservationNo(data.reservationNo));
  const changes = (rev && Array.isArray(rev.changes)) ? rev.changes : [];
  if (changes.length) {
    lines.push("", "◆変更した内容");
    changes.forEach((c) => { lines.push("◇" + c.label, "　変更前：" + c.from, "　変更後：" + c.to); });
  }
  lines.push("", "◆変更後のご注文内容");
  lines.push(...orderDetailLines(data));
  const pd = data.finalPickupDate || data.pickupDate, pt = data.finalPickupTime || data.pickupTime;
  lines.push("", "◆お引き取り（確定）", "◇" + formatPickupDateTimeJp(pd, pt));
  lines.push("", "◆お支払い金額");
  if (data.finalPrice) lines.push("◇¥" + Number(data.finalPrice).toLocaleString() + "（税込）");
  else lines.push("◇お電話でご案内した金額です");
  lines.push(...paymentLines(data, "confirmed"));
  lines.push("", "◆ご変更・ご相談", "◇お電話（070-9158-0641）へ", "", "当日お会いできるのを楽しみにしております🍓");
  return lines.join("\n");
}

// ② パティシエの確認電話のあと、管理画面で「予約確定」にした時に送る文面。確定のお引き取り日時・税込確定金額を載せる。
function buildConfirmMessage(data) {
  const name = data.name || "お客様";
  const pd = data.finalPickupDate || data.pickupDate, pt = data.finalPickupTime || data.pickupTime;
  const lines = [
    name + "様、お電話でのご確認ありがとうございました🎂",
    "ご注文が以下の内容で確定いたしました。",
  ];
  if (data.reservationNo) lines.push("", "◆予約番号", "◇" + formatReservationNo(data.reservationNo));
  lines.push("", "◆ご注文内容");
  lines.push(...orderDetailLines(data));
  lines.push("", "◆お引き取り（確定）", "◇" + formatPickupDateTimeJp(pd, pt));
  lines.push("", "◆お支払い金額");
  if (data.finalPrice) lines.push("◇¥" + Number(data.finalPrice).toLocaleString() + "（税込）");
  else if (data.subtotal && data.priceIsFixed) lines.push("◇¥" + Number(data.subtotal).toLocaleString() + "（税込）");
  else if (data.subtotal && !data.priceNeedsConsult) lines.push("◇¥" + Number(data.subtotal).toLocaleString() + "〜（税込）", "　※確定金額はお電話でご案内した金額です");
  else lines.push("◇お電話でご案内した金額です");
  lines.push(...paymentLines(data, "confirmed"));
  lines.push(
    "",
    "◆ご変更・ご相談",
    "◇お電話（070-9158-0641）へ",
    "",
    "当日お会いできるのを楽しみにしております🍓"
  );
  return lines.join("\n");
}

exports.sendReservationReceivedMessage = onValueCreated(
  {
    ref: "/reservations/{pushId}",
    instance: "koimari-tasting-default-rtdb",
    region: "asia-southeast1",
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const raw = event.data.val();
    if (!raw || raw.channel !== "LINE" || !raw.lineUserId || raw.category === "kidsManager") return;
    const reservationNo = await assignReservationNo(event.params.pushId);
    const data = Object.assign({}, raw, { reservationNo });
    const messages = [];
    if (isPhotoChristmas(data)) messages.push(imageMessage(data.galleryPick.img));
    messages.push({ type: "text", text: buildReceivedMessage(data) });
    await pushLineMessages(data.lineUserId, messages, LINE_CHANNEL_ACCESS_TOKEN.value());
  }
);

// 管理画面で「修正n」を確定 → お客様のLINEに変更後の内容を送る（初回予約＝revisions/0 は送らない）
exports.sendReservationRevisionMessage = onValueCreated(
  {
    ref: "/reservations/{pushId}/revisions/{n}",
    instance: "koimari-tasting-default-rtdb",
    region: "asia-southeast1",
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const n = Number(event.params.n);
    const rev = event.data.val();
    if (!rev || !(n >= 1)) return;
    const snap = await admin.database().ref(`reservations/${event.params.pushId}`).once("value");
    const data = snap.val();
    if (!data || data.channel !== "LINE" || !data.lineUserId || data.status === "キャンセル") return;
    const ok = await pushLineMessage(data.lineUserId, buildRevisionMessage(data, rev), LINE_CHANNEL_ACCESS_TOKEN.value());
    if (ok) await admin.database().ref(`reservations/${event.params.pushId}/revisions/${n}/notified`).set(true);
  }
);

// 管理画面から「確定のケーキ画像」を送る（reservations/{id}/sentImages に登録 → お客様のLINEへ画像＋ひとこと）
exports.sendReservationImage = onValueCreated(
  {
    ref: "/reservations/{pushId}/sentImages/{imgId}",
    instance: "koimari-tasting-default-rtdb",
    region: "asia-southeast1",
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const img = event.data.val();
    if (!img || !img.url || img.deliveredAt) return;
    const snap = await admin.database().ref(`reservations/${event.params.pushId}`).once("value");
    const data = snap.val();
    if (!data || !data.lineUserId) return;
    const text = [
      (data.name || "お客様") + "様",
      "ご予約のケーキの仕様が確定しましたので、",
      "確定のケーキ画像をお送りします。",
      ...(data.reservationNo ? ["", "◆予約番号", "◇" + formatReservationNo(data.reservationNo)] : []),
      "",
      "◆お引き取り",
      "◇" + formatPickupDateTimeJp(data.finalPickupDate || data.pickupDate, data.finalPickupTime || data.pickupTime),
      "",
      "当日お会いできるのを楽しみにしております🍓",
    ].join("\n");
    const ok = await pushLineMessages(data.lineUserId, [imageMessage(img.url), { type: "text", text }], LINE_CHANNEL_ACCESS_TOKEN.value());
    if (ok) await admin.database().ref(`reservations/${event.params.pushId}/sentImages/${event.params.imgId}/deliveredAt`).set(new Date().toISOString());
  }
);

// LINE会員の予約フォームに、前回のご予約で入力したお名前・ふりがな・電話番号・メールを自動で入れる（2026-10-02オーナー指示）。
// 電話番号等を誰でも読める場所に置かないよう、LIFFのアクセストークンをLINEに問い合わせて本人確認できた場合だけ、
// その本人の直近の予約から連絡先を返す（他人のLINE IDを指定して読み出すことはできない）。
const LIFF_CHANNEL_ID = "2011059940";
exports.lookupMyContact = onRequest(
  { region: "asia-northeast1", cors: ["https://koimari-official.github.io"] },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).json({}); return; }
    const token = String((req.body && req.body.accessToken) || "");
    if (!token) { res.status(400).json({}); return; }
    try {
      const v = await fetch("https://api.line.me/oauth2/v2.1/verify?access_token=" + encodeURIComponent(token));
      if (!v.ok) { res.status(401).json({}); return; }
      const vj = await v.json();
      if (String(vj.client_id) !== LIFF_CHANNEL_ID || !(Number(vj.expires_in) > 0)) { res.status(401).json({}); return; }
      const pr = await fetch("https://api.line.me/v2/profile", { headers: { Authorization: "Bearer " + token } });
      if (!pr.ok) { res.status(401).json({}); return; }
      const userId = (await pr.json()).userId;
      if (!userId) { res.status(401).json({}); return; }
      const snap = await admin.database().ref("reservations").orderByChild("lineUserId").equalTo(userId).limitToLast(20).once("value");
      let latest = null;
      snap.forEach((c) => {
        const d = c.val();
        if (d && d.category !== "kidsManager" && d.tel && (!latest || String(d.submittedAt || "") > String(latest.submittedAt || ""))) latest = d;
      });
      if (!latest) { res.json({ found: false }); return; }
      res.json({ found: true, name: latest.name || "", furigana: latest.furigana || "", tel: latest.tel || "", email: latest.email || "", receiptName: latest.receiptName || "" });
    } catch (err) {
      console.error("lookupMyContact failed:", err);
      res.status(500).json({});
    }
  }
);

// 料金表のデコレーションケーキの金額は、原価計算アプリの商品一覧（koimariContent/costPublicPrices、税込の販売価格）に統一する
// （2026-10-03オーナー指示。以前は料金表に別途入力していて、タルト6号が7,200円/7,800円と食い違っていた）。
// 商品名「ミッシェルBOX　5号」のように「種類＋全角/半角スペース＋号数」のものを対象にする。
//  ・名前に「生クリーム」を含み「生チョコ」を含まない → 1段の基本料金（cakeSizePrices）
//  ・それ以外は、種類ごとの価格（cakeTypePrices）の該当する種類へ。グランマニエBOXはベースの種類「ムース」として扱う
//  ・号数の無い商品（例：グランマニエBOX）や当てはまらない商品は取り込まず、「未対応」として記録する
const COST_TYPE_ALIASES = { "グランマニエBOX": "ムース" };
// 原価表の商品名に号数が無い商品の号数（オーナー確認済みのものだけ。原価計算アプリで「グランマニエBOX　4号」と名前に付ければ不要）
const COST_DEFAULT_SIZE = { "グランマニエBOX": "4号" };
const COST_TYPE_NAMES = ["ミッシェルBOX", "ガトーショコラBOX", "フルーツタルトBOX", "ストロベリータルトBOX", "ブルーベリーケーキ", "ムース"];
function mapCostPricesToPriceTable(list) {
  const sizePrices = {}, typePrices = {}, mapped = [], unmapped = [];
  (Array.isArray(list) ? list : []).forEach((p) => {
    if (!p || p.category !== "ホールケーキ" || !(Number(p.salePrice) > 0)) return;
    const name = String(p.name || "").trim();
    let m = name.match(/^(.*?)[\s\u3000]+([3-7])号$/);
    if (!m && COST_DEFAULT_SIZE[name]) m = [name, name, COST_DEFAULT_SIZE[name].replace("号", "")];
    if (!m) { unmapped.push(name); return; }
    const base = m[1].trim(), size = m[2] + "号", price = Number(p.salePrice);
    if (base.indexOf("生クリーム") >= 0 && base.indexOf("生チョコ") < 0) { sizePrices[size] = price; mapped.push({ name, target: "基本料金", size, price }); return; }
    const type = COST_TYPE_ALIASES[base] || COST_TYPE_NAMES.find((t) => base === t || base.indexOf(t) === 0);
    if (!type) { unmapped.push(name); return; }
    (typePrices[type] = typePrices[type] || {})[size] = price;
    mapped.push({ name, target: type, size, price });
  });
  return { sizePrices, typePrices, mapped, unmapped };
}
async function syncPriceTableFromCost(list) {
  const r = mapCostPricesToPriceTable(list);
  const up = {};
  // 原価表にない組み合わせ（手入力で残っていた金額）は消す＝特殊仕様としてお電話で個別に確認する
  up["koimariContent/cakeSizePrices"] = r.sizePrices;
  up["koimariContent/cakeTypePrices"] = r.typePrices;
  up["koimariContent/priceTableSource"] = { syncedAt: new Date().toISOString(), mapped: r.mapped, unmapped: r.unmapped };
  await admin.database().ref().update(up);
  return r;
}
exports.syncPriceTableFromCost = onValueWritten(
  { ref: "/koimariContent/costPublicPrices", instance: "koimari-tasting-default-rtdb", region: "asia-southeast1" },
  async (event) => {
    const v = event.data.after.val();
    if (!v || !Array.isArray(v.list)) return;
    const r = await syncPriceTableFromCost(v.list);
    console.log("原価計算アプリから料金表へ反映:", r.mapped.length, "件／未対応:", r.unmapped.join("、"));
  }
);

exports.sendReservationConfirmedMessage = onValueUpdated(
  {
    ref: "/reservations/{pushId}",
    instance: "koimari-tasting-default-rtdb",
    region: "asia-southeast1",
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const before = event.data.before.val() || {};
    const after = event.data.after.val() || {};
    if (!after.reservationConfirmed || before.reservationConfirmed) return;
    if (after.channel !== "LINE" || !after.lineUserId || after.confirmMessageSentAt || after.status === "キャンセル") return;
    if (isPhotoChristmas(after)) return;
    const ok = await pushLineMessage(after.lineUserId, buildConfirmMessage(after), LINE_CHANNEL_ACCESS_TOKEN.value());
    if (ok) await admin.database().ref(`reservations/${event.params.pushId}/confirmMessageSentAt`).set(new Date().toISOString());
  }
);

// 予約完了メール（お客様宛）。完全無料のGmail SMTP（アプリパスワード認証）で送信する（2026-09-04導入）。
// Formspreeは店舗宛の通知用途のみで、お客様向けの自動返信は有料プランでしか使えないため別経路にした。
function buildCustomerConfirmationEmailText(data) {
  const product = productLabel(data);
  const pickupLine = data.pickupTime
    ? `引き取り希望日時: ${formatPickupDateTimeJp(data.pickupDate, data.pickupTime)}`
    : `参加希望日: ${data.pickupDate || ""}`;
  return [
    `${data.name || "お客様"} 様`,
    "",
    "この度はケーキ屋こいまりへご予約いただき、誠にありがとうございます。",
    "以下の内容でご予約を承りました。",
    "",
    `商品: ${product}`,
    pickupLine,
    "",
    "後ほど、詳細確認のためスタッフよりお電話またはチャットでご連絡いたします。ご予約内容の変更・キャンセルも、お電話にて承っております。",
    "",
    "店舗名: ケーキ屋こいまり",
    "電話番号: 070-9158-0641",
    "",
    "※このメールは自動送信されています。本メールへのご返信では確認できませんので、ご連絡はお電話にてお願いいたします。",
  ].join("\n");
}

async function sendCustomerConfirmationEmail(data) {
  if (!data.email) return false;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() },
    });
    await transporter.sendMail({
      from: `"ケーキ屋こいまり" <${GMAIL_USER.value()}>`,
      to: data.email,
      subject: "【こいまり】ご予約を承りました",
      text: buildCustomerConfirmationEmailText(data),
    });
    return true;
  } catch (err) {
    console.error("予約確認メール送信失敗:", err);
    return false;
  }
}

// メール送信に失敗した場合、お客様には気づく手段がないため、スタッフLINEグループに通知して
// 電話等での代替フォローを促す（2026-09-04オーナー指示：エラーで無言のまま止まらないようにする）。
async function notifyStaffOfEmailFailure(data) {
  try {
    const groupIdSnap = await admin.database().ref("koimariOps/staffNotifyGroupId").once("value");
    const groupId = groupIdSnap.val();
    if (!groupId) return;
    const text = `⚠️ 予約確認メールの送信に失敗しました\nお名前: ${data.name || "不明"} 様\nメール: ${data.email || "未入力"}\n電話番号でのご連絡・確認をお願いします。`;
    await pushLineMessage(groupId, text, LINE_CHANNEL_ACCESS_TOKEN.value());
  } catch (err) {
    console.error("メール送信失敗のLINE通知にも失敗:", err);
  }
}

exports.sendCustomerReservationEmail = onValueCreated(
  {
    ref: "/reservations/{pushId}",
    instance: "koimari-tasting-default-rtdb",
    region: "asia-southeast1",
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const data = event.data.val();
    if (!data) return;
    const sent = await sendCustomerConfirmationEmail(data);
    if (!sent && data.email) await notifyStaffOfEmailFailure(data);
  }
);

// ===== リッチメニュー（2026-08-31、6分割を常時表示する方式に変更） =====
// クーポンの有無でメニュー全体を切り替える方式（旧仕様）は廃止。常に
// 「季節限定メニュー/ご予約/ギャラリー/クーポン/店舗情報/スタンプカード」の6分割を表示する。
// 「クーポン」タップ時はメッセージが送信され、下のlineWebhook側でkoimariOps/coupons
// （admin.html「クーポン」タブ）を見て、有効なクーポンがあればその内容を、無ければ
// その旨を返信する。クーポン切れでもアイコン自体は常設のままでよいというオーナー判断（2026-08-31）。
const GALLERY_URL = "https://koimari-official.github.io/koimari-site/gallery.html";
const SHOP_INFO_URL = "https://koimari-official.github.io/koimari-site/index.html#shop";
const RICHMENU_MAIN_IMAGE_PATH = path.join(__dirname, "assets", "richmenu-main.jpg");
const COUPON_TRIGGER_TEXT = "クーポンについて教えてください";

// リッチメニューの画像・エリア配置を変更したら、このバージョン文字列を必ず更新すること。
// koimariOps/richMenuIds/version と一致しなくなった時点でensureRichMenuが自動的に
// 作り直す（画像だけ差し替えてこの値を更新し忘れると、古いデザインのままになる）。
// 詳しい変更手順は assets/richmenu-src/README.md を参照。
const RICHMENU_VERSION = "2026-09-08-stampcard-v1";

async function lineApi(method, url, accessToken, body, isBinary) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  headers["Content-Type"] = isBinary ? "image/jpeg" : "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? (isBinary ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LINE API ${method} ${url} failed: ${res.status} ${text}`);
  try {
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return null; // setDefault等、成功時に空ボディを返すエンドポイントがあるため
  }
}

// 2500x1686を2行3列に分割した6エリア（列幅833/834/833で合計2500、行高843で合計1686）。
// 画像(assets/richmenu-main.jpg)の並び「季節限定メニュー|ご予約|ギャラリー / クーポン|店舗情報|スタンプカード」と対応させること。
// 左上の「季節限定メニュー」は季節ごとに画像・タップ先を差し替えてよい（現在はギャラリーへのリンク）。
const RICHMENU_AREAS = [
  { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: "uri", uri: GALLERY_URL } },
  { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: { type: "uri", uri: RESERVE_LIFF_URL } },
  { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: "uri", uri: GALLERY_URL } },
  { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: "message", text: COUPON_TRIGGER_TEXT } },
  { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: "uri", uri: SHOP_INFO_URL } },
  { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: "message", text: STAMP_CARD_TRIGGER_TEXT } },
];

// リッチメニューが未設定、デザインのバージョンが古い、または旧仕様(2分割/3分割切替)のものが
// 残っている場合のみ、新規作成してデフォルトに設定する。それ以外の何か（LINE Official Account
// Manager側で手動設定したもの）が既にデフォルトになっている場合は、それを尊重して何もしない
// （毎日の自動実行が手動変更と競合しないように）。
async function ensureMainRichMenu(accessToken) {
  const configRef = admin.database().ref("koimariOps/richMenuIds");
  const existing = (await configRef.once("value")).val() || {};

  let currentDefaultId = null;
  try {
    const cur = await lineApi("GET", "https://api.line.me/v2/bot/user/all/richmenu", accessToken);
    currentDefaultId = cur && cur.richMenuId;
  } catch (e) {
    currentDefaultId = null; // 未設定時は404
  }

  // 既に正しいバージョンが設定済み → 何もしない
  if (existing.mainId && existing.version === RICHMENU_VERSION && currentDefaultId === existing.mainId) {
    return existing.mainId;
  }

  const knownOldIds = [existing.defaultId, existing.campaignId, existing.mainId].filter(Boolean);
  if (currentDefaultId && !knownOldIds.includes(currentDefaultId)) {
    console.log("リッチメニューは既に手動設定済みのため何もしません:", currentDefaultId);
    return currentDefaultId;
  }

  const created = await lineApi("POST", "https://api.line.me/v2/bot/richmenu", accessToken, {
    size: { width: 2500, height: 1686 },
    selected: false,
    name: `koimari-main-6panel-${RICHMENU_VERSION}`,
    chatBarText: "メニュー",
    areas: RICHMENU_AREAS,
  });
  const richMenuId = created.richMenuId;
  const imageBuffer = fs.readFileSync(RICHMENU_MAIN_IMAGE_PATH);
  await lineApi("POST", `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, accessToken, imageBuffer, true);
  await lineApi("POST", `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, accessToken);
  await configRef.set({ mainId: richMenuId, version: RICHMENU_VERSION });

  const staleIds = [existing.defaultId, existing.campaignId, existing.mainId].filter((id) => id && id !== richMenuId);
  for (const staleId of staleIds) {
    try {
      await lineApi("DELETE", `https://api.line.me/v2/bot/richmenu/${staleId}`, accessToken);
    } catch (e) {
      console.warn("旧リッチメニュー削除失敗:", staleId, e.message);
    }
  }

  console.log("6分割のリッチメニューを新規作成・デフォルト設定しました:", richMenuId, RICHMENU_VERSION);
  return richMenuId;
}

// リッチメニューの反映は、デザインを変えた時だけ手動で行う（2026-10-04オーナー判断：毎日4時の自動確認は不要。
// Cloud Schedulerの無料枠（3件）を空けるため定期実行は廃止）。反映手順は assets/richmenu-src/README.md の
// 「反映手順」を参照（scripts/apply-richmenu.js を実行）。Firebaseの関数として認識されないよう列挙不可で公開する
Object.defineProperty(exports, "__ensureMainRichMenu", { value: ensureMainRichMenu, enumerable: false });

function todayDateKeyJST(now) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// リッチメニュー「クーポン」タップ時の返信文をkoimariOps/couponsの実データから組み立てる
// （AIの生成に任せず、admin.htmlで発行している実際のクーポン内容を確実に案内するため）。
// expiryが未設定のクーポンは「友だち限定の常設特典」として期限なし・常に有効に扱う
// （店頭購入時の3%OFF等、キャンペーンではなく恒久的な会員特典に対応するため。2026-09-06）。
// displayNameを渡すと、案内文に宛名を入れてSNS等への転載を控えるよう一言添える
// （スクリーンショットが無断で拡散された場合に誰から漏れたか分かるようにする抑止策。2026-09-06）。
// "2026-09-30" → "2026年9月30日"（お客様向けの表記。ハイフン区切りのままだと日付として読みにくい）。
function formatCouponExpiry(expiry) {
  const m = String(expiry || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Number(m[1]) + "年" + Number(m[2]) + "月" + Number(m[3]) + "日" : String(expiry || "");
}
function buildCouponReplyText(coupons, todayKey, displayName) {
  const active = (Array.isArray(coupons) ? coupons : []).filter((c) => c && (!c.expiry || c.expiry >= todayKey));
  if (!active.length) {
    return "現在開催中のクーポンはございません🙏\n新しいクーポンが出た際は、あいさつメッセージ等でご案内いたしますので、またチェックしてみてくださいね🎂";
  }
  const lines = displayName
    ? [`${displayName}様への友だち限定クーポンのご案内です🎫`, "", "◆ご利用いただけるクーポン"]
    : ["ただいま開催中のクーポンはこちらです🎫", "", "◆ご利用いただけるクーポン"];
  active.forEach((c) => {
    lines.push("◇" + (c.discount || ""));
    if (c.memo) lines.push("　" + c.memo);
    if (c.expiry) lines.push("　※" + formatCouponExpiry(c.expiry) + "まで");
  });
  if (displayName) {
    lines.push("", "恐れ入りますが、画面のスクリーンショットの", "SNS等への投稿・転載はご遠慮ください。");
  }
  return lines.join("\n");
}
