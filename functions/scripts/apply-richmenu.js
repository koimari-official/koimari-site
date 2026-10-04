// LINEのリッチメニューを手動で反映する（2026-10-04：毎日4時の自動確認 ensureRichMenu を廃止した代わり）。
// デザインを変えた時だけ実行する。RICHMENU_VERSION が前回と同じなら何もしない（index.jsのensureMainRichMenuと同じ判定）。
// 実行（functionsディレクトリで）： node scripts/apply-richmenu.js
// 必要なもの：firebase CLIにログイン済み（LINEのトークンをSecret Managerから取得するため）、dashboard配下の管理者キー
const path = require("path");
const { execSync } = require("child_process");

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(__dirname, "../../../company/dashboard/koimari-tasting-firebase-adminsdk-fbsvc-670f81cf1e.json");

const token = execSync("firebase functions:secrets:access LINE_CHANNEL_ACCESS_TOKEN --project koimari-tasting", { encoding: "utf8" }).trim();
if (!token) {
  console.error("LINEのトークンを取得できませんでした（firebase login を確認してください）");
  process.exit(1);
}

const fns = require("../index.js");
fns.__ensureMainRichMenu(token)
  .then((id) => {
    console.log("完了:", id || "（変更なし）");
    process.exit(0);
  })
  .catch((e) => {
    console.error("失敗:", e.message);
    process.exit(1);
  });
