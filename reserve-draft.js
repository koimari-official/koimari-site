/* ギャラリー（商品ページ）で選んだ仕様を、LINE友だち追加・予約フォームへ引き継ぐ仕組み（2026-09-24）。
   選択内容は短いコード付きでFirebase（reservationDrafts/{code}）に保存する。ブラウザとLINEアプリは
   保存領域が別で、localStorageでは友だち追加の前後で消えてしまうため、サーバー側に置いて
   コードで参照する。個人情報は一切含めない（商品名・サイズ等のみ）。 */
(function () {
  var DB = "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app";
  var ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 0/O・1/I/Lなど紛らわしい文字を除外
  var LINE_ADD_URL = "https://lin.ee/tgXqHoK";
  var LIFF_URL = "https://liff.line.me/2011059940-hMTBZaUz";
  var OA_ID = "@744lgqjn";
  var LS_KEY = "koimari_draft_code";

  function genCode() {
    var a = new Uint8Array(8);
    crypto.getRandomValues(a);
    var s = "";
    for (var i = 0; i < a.length; i++) s += ALPHABET[a[i] % ALPHABET.length];
    return s;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }

  async function saveDraft(pick) {
    var body = { name: String(pick.name || "").slice(0, 120), productType: String(pick.productType || "").slice(0, 30), createdAt: Date.now() };
    if (pick.idx != null) body.idx = Number(pick.idx);
    if (pick.img && String(pick.img).length <= 600 && /^https?:/.test(pick.img)) body.img = String(pick.img);
    if (pick.price) body.price = String(pick.price).slice(0, 60);
    if (pick.size) body.size = String(pick.size).slice(0, 40);
    for (var attempt = 0; attempt < 4; attempt++) {
      var code = genCode();
      var res = await fetch(DB + "/reservationDrafts/" + code + ".json", { method: "PUT", body: JSON.stringify(body) });
      if (res.ok) return code; // 既存コードと衝突した場合は上書き不可(401)なので別コードで再試行
    }
    throw new Error("保存に失敗しました");
  }

  function liffUrl(code) { return LIFF_URL + "?draft=" + encodeURIComponent(code) + "#reserve"; }
  function oaMessageUrl(code) { return "https://line.me/R/oaMessage/" + encodeURIComponent(OA_ID) + "/?" + encodeURIComponent("【ご希望仕様コード】" + code); }
  function isLineBrowser() { return /Line\//i.test(navigator.userAgent); }

  function showModal(code, pick) {
    var old = document.getElementById("draftModal");
    if (old) old.remove();
    var wrap = document.createElement("div");
    wrap.id = "draftModal";
    wrap.style.cssText = "position:fixed;inset:0;z-index:4000;background:rgba(30,20,14,.6);display:flex;align-items:center;justify-content:center;padding:20px;";
    wrap.innerHTML =
      '<div style="background:#fdfaf6;max-width:440px;width:100%;border-radius:14px;padding:28px 24px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto;">' +
      '<div style="font-size:13px;color:#a88a52;letter-spacing:.1em;margin-bottom:6px;">ご希望の商品を保存しました</div>' +
      '<div style="font-size:17px;font-weight:700;margin-bottom:16px;line-height:1.5;">' + esc(pick.name) + '</div>' +
      '<div style="background:#f3ece1;border-radius:10px;padding:14px;margin-bottom:16px;">' +
      '<div style="font-size:12px;color:#6b5a48;margin-bottom:4px;">仕様コード</div>' +
      '<div id="draftCode" style="font-size:26px;font-weight:700;letter-spacing:.2em;color:#2e2118;">' + esc(code) + '</div>' +
      '<button type="button" id="draftCopy" style="margin-top:8px;font-size:12px;padding:6px 14px;border:1px solid #c9a96e;background:#fff;border-radius:999px;cursor:pointer;">コードをコピー</button></div>' +
      '<ol style="text-align:left;font-size:13.5px;line-height:1.9;margin:0 0 18px 1.2em;padding:0;color:#3a2c20;">' +
      '<li>下のボタンで「こいまり公式LINE」を友だち追加</li>' +
      '<li>トーク画面下部メニューの「ご予約」をタップ</li>' +
      '<li>予約フォームにご希望の商品が自動で反映されます（うまく反映されない場合は、上のコードをフォームに入力してください）</li></ol>' +
      '<a href="' + LINE_ADD_URL + '" target="_blank" rel="noopener" style="display:block;padding:14px;border-radius:999px;background:#06c755;color:#fff;font-weight:700;text-decoration:none;margin-bottom:10px;">LINEで友だち追加して進む</a>' +
      '<a href="' + oaMessageUrl(code) + '" target="_blank" rel="noopener" style="display:block;font-size:12.5px;color:#6b5a48;margin-bottom:14px;">すでに友だちの方：コードをトークに送って続ける</a>' +
      '<button type="button" id="draftClose" style="font-size:13px;padding:8px 18px;border:none;background:none;color:#888;cursor:pointer;">閉じる</button></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) wrap.remove(); });
    document.getElementById("draftClose").addEventListener("click", function () { wrap.remove(); });
    document.getElementById("draftCopy").addEventListener("click", function () {
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { b.textContent = "コピーしました"; }, function () { b.textContent = "長押しでコピーしてください"; });
    });
  }

  // 商品ページの「この商品でご予約に進む」から呼ぶ。LINE内ブラウザなら予約フォームへ直行、
  // それ以外（通常のブラウザ）は友だち追加→引き継ぎの案内モーダルを出す。
  async function start(pick, btn) {
    var label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "準備中…"; }
    try {
      var code = await saveDraft(pick);
      try { localStorage.setItem(LS_KEY, code); } catch (e) {}
      if (isLineBrowser()) { location.href = liffUrl(code); return; }
      showModal(code, pick);
    } catch (e) {
      alert("保存に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  window.KoimariDraft = { start: start, liffUrl: liffUrl, LS_KEY: LS_KEY };
})();
