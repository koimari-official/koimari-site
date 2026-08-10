const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

admin.initializeApp({
  databaseURL: "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const LINE_CHANNEL_SECRET = defineSecret("LINE_CHANNEL_SECRET");
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const STORE_INFO = `
店名: こいまり（ケーキ屋）
住所: 大阪府大阪市城東区成育2丁目13-15 アイビーマンション1階
電話番号: 06-7221-0705
基本営業時間: 火〜土 10:00-20:00 ／ 日 10:00-19:00
定休日: 月曜日（祝日の場合は翌日）※臨時休業がある場合は上記と異なることがあります
`.trim();

// index.html の updateStatus()（L1090-1109）と同じロジック。
// 表示側とAI応答側で「本日の営業状況」の判定が食い違わないよう、必ずここを唯一の実装として保つ。
function computeTodayStatus(holidays, now) {
  const dow = now.getDay();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weeklyClosed = (holidays && holidays.weeklyClosed) || [1];
  const extraClosed = (holidays && holidays.extraClosed) || [];
  const isClosed = weeklyClosed.includes(dow) || extraClosed.includes(key);
  const hour = now.getHours() + now.getMinutes() / 60;
  const closeHour = dow === 0 ? 19 : 20;
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

async function replyToLine(replyToken, text, accessToken) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
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
- 標準語・関西弁どちらで聞かれても、内容を正しく理解して答えてください（無理に関西弁で返答する必要はありません）
- 営業時間・定休日・場所・電話番号・上記のFAQで答えられる質問には、その内容に沿って正確に答えてください
- アレルギーに関するご質問には、内容には一切触れず「恐れ入りますが、アレルギーに関するご質問はお電話（06-7221-0705）にて承っております」とご案内してください
- それ以外で、上記の情報だけでは答えられない質問（価格の詳細、在庫状況、予約の可否等）には、憶測で答えず「スタッフが確認してご連絡します」という趣旨で丁寧に答えてください
- 返信は3〜4文程度、簡潔にまとめてください
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
exports._internal = { computeTodayStatus, verifyLineSignature, isAllergyRelated, buildFaqKnowledgeText, extractReviewTag };

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
      if (event.type !== "message" || !event.message || event.message.type !== "text") continue;

      try {
        const [holidaysSnap, faqSnap] = await Promise.all([
          admin.database().ref("koimariContent/holidays").once("value"),
          admin.database().ref("koimariContent/faq").once("value"),
        ]);
        const todayStatus = computeTodayStatus(holidaysSnap.val(), new Date());
        const faqKnowledgeText = buildFaqKnowledgeText(faqSnap.val());
        const { text: replyText, reviewReason } = await buildReplyText(anthropic, event.message.text, todayStatus, faqKnowledgeText);
        await replyToLine(event.replyToken, replyText, LINE_CHANNEL_ACCESS_TOKEN.value());
        if (reviewReason) {
          await admin.database().ref("aiReviewQueue").push({
            question: event.message.text,
            aiAnswer: replyText,
            reason: reviewReason,
            userId: (event.source && event.source.userId) || null,
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
