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
    // 管理画面で設定した「予約フォームの自動選択」（spec）。DBルールはspecを文字列6000字以内に制限している。
    if (pick.spec && String(pick.spec).length <= 6000) body.spec = String(pick.spec);
    // ご注文の受け方（standard＝プルダウンで選べる／custom＝フルオーダー。2026-10-02）
    if (pick.orderMode === "standard" || pick.orderMode === "custom") body.orderMode = pick.orderMode;
    if (Number(pick.no) > 0) body.no = Number(pick.no); // デコレーションケーキのギャラリー番号（No.D01）
    for (var attempt = 0; attempt < 4; attempt++) {
      var code = genCode();
      var res = await fetch(DB + "/reservationDrafts/" + code + ".json", { method: "PUT", body: JSON.stringify(body) });
      if (res.ok) return code; // 既存コードと衝突した場合は上書き不可(401)なので別コードで再試行
    }
    throw new Error("保存に失敗しました");
  }

  // 管理画面（商品カードの「予約フォームの自動選択」）で設定した値 cfg = {tiers, size, cream, decoration, occasion} を、
  // 予約フォーム(member.html)のapplyFormSpec()が受け取れる形式の文字列にする。未設定なら空文字（＝自動選択なし）。
  // 選択肢の値はmember.htmlのラジオ・サイズの値と完全に一致させること（admin.htmlのSPEC_OPTIONSと同じ）。
  function buildSpec(cfg) {
    if (!cfg || typeof cfg !== "object") return "";
    var tiers = Number(cfg.tiers) || 0, size = cfg.size || "", cream = cfg.cream || "", deco = cfg.decoration || "", occ = cfg.occasion || "";
    if (!tiers && !size && !cream && !deco && !occ) return "";
    tiers = tiers || 1;
    var specs = [];
    for (var i = 0; i < tiers; i++) specs.push({ cream: cream || "生クリーム", colors: [] });
    var s = { v: 1, type: "デコレーションケーキ", tiers: tiers, activeTier: 0, sizes: size ? [size] : [], specs: specs };
    if (deco) s.decoration = deco;
    if (cfg.creamSub) s.creamSub = cfg.creamSub; // タルトの「生クリームあり／なし」
    if (occ) s.occasion = occ;
    return JSON.stringify(s);
  }

  function liffUrl(code) { return LIFF_URL + "?draft=" + encodeURIComponent(code) + "#reserve"; }
  // ※ line.me/R/oaMessage/ 形式はPC等でLINE社のトップページに飛ぶため使わない（2026-10-02）。案内は LINE_ADD_URL に統一。
  function isLineBrowser() { return /Line\//i.test(navigator.userAgent); }
  function isMobile() { return /iPhone|iPad|Android/i.test(navigator.userAgent); }
  // PCで開いた場合：予約フォームURL（仕様コード付き）をQRコードにして、スマホで読み取ってもらう
  function drawQr(el, text) {
    if (!el) return;
    var render = function () {
      try { var qr = window.qrcode(0, "M"); qr.addData(text); qr.make(); el.innerHTML = qr.createImgTag(5, 8); var img = el.querySelector("img"); if (img) img.alt = "予約フォームのQRコード"; }
      catch (e) { el.style.display = "none"; }
    };
    if (window.qrcode) return render();
    var sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
    sc.onload = render; sc.onerror = function () { el.style.display = "none"; };
    document.head.appendChild(sc);
  }

  function showModal(code, pick) {
    var old = document.getElementById("draftModal");
    if (old) old.remove();
    var wrap = document.createElement("div");
    wrap.id = "draftModal";
    wrap.style.cssText = "position:fixed;inset:0;z-index:4000;background:rgba(30,20,14,.6);display:flex;align-items:center;justify-content:center;padding:20px;";
    wrap.innerHTML =
      '<div style="background:#fdfaf6;max-width:440px;width:100%;border-radius:14px;padding:28px 24px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto;">' +
      '<div style="font-size:15px;color:#a88a52;letter-spacing:.1em;margin-bottom:6px;">ご希望の商品を保存しました</div>' +
      '<div style="font-size:17px;font-weight:700;margin-bottom:16px;line-height:1.5;">' + esc(pick.name) + '</div>' +
      '<div style="background:#f3ece1;border-radius:10px;padding:14px;margin-bottom:16px;">' +
      '<div style="font-size:14px;color:#6b5a48;margin-bottom:4px;">仕様コード</div>' +
      '<div id="draftCode" style="font-size:26px;font-weight:700;letter-spacing:.2em;color:#2e2118;">' + esc(code) + '</div>' +
      '<button type="button" id="draftCopy" style="margin-top:8px;font-size:12px;padding:6px 14px;border:1px solid #c9a96e;background:#fff;border-radius:999px;cursor:pointer;">コードをコピー</button></div>' +
      '<ol style="text-align:left;font-size:16px;line-height:1.9;margin:0 0 18px 1.2em;padding:0;color:#3a2c20;">' +
      (isMobile() ? '<li>下の緑のボタンで、LINEの予約フォームを開きます</li>' : '<li>スマートフォンのカメラで下のQRコードを読み取ると、LINEの予約フォームが開きます</li>') +
      '<li>友だち追加がまだの方は、フォームの上の案内から追加してください</li>' +
      '<li>選んだケーキが入った状態で、ご予約いただけます</li></ol>' +
      (isMobile() ? '' : '<div id="draftQr" style="display:flex;justify-content:center;margin:0 0 14px;min-height:160px;"></div>') +
      '<a href="' + liffUrl(code) + '" style="display:block;padding:14px;border-radius:999px;background:#06c755;color:#fff;font-weight:700;text-decoration:none;margin-bottom:10px;font-size:16px;">選んだケーキでLINEの予約フォームを開く</a>' +
      '<a href="' + LINE_ADD_URL + '" target="_blank" rel="noopener" style="display:block;font-size:15px;color:#0b7a37;font-weight:700;margin-bottom:10px;">先に友だち追加だけする</a>' +
      '<a href="' + LINE_ADD_URL + '" target="_blank" rel="noopener" style="display:block;font-size:15px;color:#4a3a2a;margin-bottom:14px;line-height:1.7;">すでに友だちの方：LINEを開き、メニューの「ご予約」から進んでください（上のコードを入力すると商品が反映されます）</a>' +
      '<button type="button" id="draftClose" style="font-size:13px;padding:8px 18px;border:none;background:none;color:#888;cursor:pointer;">閉じる</button></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) wrap.remove(); });
    document.getElementById("draftClose").addEventListener("click", function () { wrap.remove(); });
    if (!isMobile()) drawQr(document.getElementById("draftQr"), liffUrl(code));
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
      // スマホ（LINE未起動のブラウザ）：LINEアプリで予約フォームを直接開く。登録済みの方はそのまま予約画面、
      // 未登録の方はLINE側の案内に従って友だち追加へ進める。アプリが開かなかった場合(LINE未導入・
      // PC等)は数秒後もこのページが見えたままなので、その時だけ案内モーダルを出す。
      if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
        location.href = liffUrl(code);
        setTimeout(function () { if (document.visibilityState === "visible") showModal(code, pick); }, 2800);
        return;
      }
      showModal(code, pick);
    } catch (e) {
      alert("保存に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  window.KoimariDraft = { start: start, liffUrl: liffUrl, buildSpec: buildSpec, LS_KEY: LS_KEY };
})();
