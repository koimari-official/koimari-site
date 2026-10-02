/* 予約の詳細・変更・変更履歴（2026-10-02オーナー指示）。admin.html から読み込む。
   - 予約ごとの詳細画面：ケーキの写真（ギャラリーで選んだ商品／予約フォームと同じ参考イメージ）と、整理した仕様を表示
   - お客様と電話しながら、各項目をプルダウンで変更 → その場で金額を再計算（cake-pricing.js と同じ計算）
   - 「この内容で確定」を押すたびに「初回予約 → 修正1 → 修正2 …」と変更履歴を下に積み上げる
     （reservations/{key}/revisions/{n}。修正のたびに Cloud Functions がお客様のLINEへ変更後の内容を送る）
   - 担当者プルダウン（reservationStaff。管理画面で編集）
   - 仕様が確定したケーキの画像をお客様のLINEへ送る（reservations/{key}/sentImages → Cloud Functions が送信）
   Firebaseの読み書きは admin.html のモジュール側が window.fbResEditorApi として公開する関数で行う。 */
(function () {
  "use strict";
  var DB = "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app";
  var SIZE_FULL = { "4号": "4号(約12cm/3-4名)", "5号": "5号(約15cm/5-6名)", "6号": "6号(約18cm/7-8名)", "7号": "7号(約21cm/9-10名)" };
  var BOTTOM_SIZES = ["4号", "5号", "6号", "7号"];
  var UPPER_SIZES = ["3号", "4号", "5号", "セルクル", "カットケーキ"];
  var CREAMS = ["生クリーム", "生チョコクリーム", "ミッシェルBOX", "ガトーショコラBOX", "フルーツタルトBOX", "ストロベリータルトBOX", "ブルーベリーケーキ"];
  var COLORS = ["黒", "グレー", "赤", "青", "紺", "黄色", "ピンク", "緑", "黄緑", "茶色", "水色"];
  var DECORATIONS = ["いちごのみ", "バラエティフルーツ"];
  var OCCASIONS = ["", "バースデー", "クリスマス", "その他"];
  var DEFAULT_STAFF = ["オーナー", "お母さん", "楠田", "永山"];
  var TIMES = (function () { var a = []; for (var m = 600; m <= 1170; m += 30) a.push(String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0")); return a; })();

  var priceBase = null, refCakes = null;
  function getJson(path) { return fetch(DB + "/" + path + ".json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function loadPriceBase() {
    if (priceBase) return Promise.resolve(priceBase);
    var keys = ["cakeSizePrices", "cakeTypePrices", "cakeCutContainerFee", "cakeCreamToppingPrice", "cakeChocoCreamSurcharge", "cakeCandleBagPricePlain", "cakeCandleBagPriceNumber", "cakeMessagePlatePrice", "cakeSpecOverrides"];
    return Promise.all(keys.map(function (k) { return getJson("koimariContent/" + k); })).then(function (v) {
      if (v[8] && window.CakePricing) window.CakePricing.applyOverrides(v[8]);
      priceBase = { sizePrices: v[0] || {}, typePrices: v[1] || {}, cutContainerFee: Number(v[2]) || 0, creamToppingPrice: Number(v[3]) || 0, chocoCream: v[4] != null ? Number(v[4]) : undefined, candlePlain: Number(v[5]) || 0, candleNumber: v[6] != null ? Number(v[6]) : 180, messagePlate: Number(v[7]) || 0 };
      return priceBase;
    });
  }
  function loadRefCakes() {
    if (refCakes) return Promise.resolve(refCakes);
    return getJson("siteImages/decorationCakes").then(function (d) {
      var arr = Array.isArray(d) ? d : Object.values(d || {});
      refCakes = arr.filter(function (it) { return it && it.img && it.visible !== false; }).map(function (it) { return { name: String(it.name || ""), img: it.img, cream: (it.spec && it.spec.cream) || "" }; });
      return refCakes;
    });
  }
  // 予約フォーム（member.html の refCandidates）と同じ選び方で、クリームの種類に近い商品写真を探す
  function refImageFor(cream) {
    var list = refCakes || [];
    if (!list.length) return null;
    var pick = list.filter(function (c) { return c.cream === cream; })[0]
      || list.filter(function (c) { return cream && c.name.indexOf(cream) === 0; })[0]
      || list.filter(function (c) { return cream && c.name.indexOf(cream) >= 0 && c.name.indexOf(cream + "なし") < 0 && c.name.indexOf(cream + "あり") < 0; })[0];
    return pick || null;
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  function yen(n) { return "¥" + Number(n || 0).toLocaleString(); }
  function plainSize(v) { v = String(v || ""); if (v.indexOf("カットケーキ") === 0) return "カットケーキ"; return v.split("(")[0]; }
  function tierName(i, n) { return n <= 1 ? "" : (n - i) + "段目" + (i === 0 ? "（一番下）" : i === n - 1 ? "（一番上）" : ""); }
  function formatNo(n) { return n ? "No." + String(n).padStart(4, "0") : "（採番待ち）"; }
  function isCakeRes(r) { var it = (r.items || [])[0] || {}; return it.category === "デコレーションケーキ"; }

  // 予約データ → 編集用のまとまった形（スナップショット）。変更履歴にもこの形で保存する。
  function snapshotOf(r) {
    var items = r.items || [];
    var specs = Array.isArray(r.tierSpecs) && r.tierSpecs.length === items.length ? r.tierSpecs.slice().reverse() : null;
    var tiers = items.map(function (it, i) {
      var cream = specs ? (specs[i].cream || "") : (i === 0 ? (r.creamType || "") : "");
      var colors = specs ? (specs[i].colors || []) : (i === 0 && r.colorCream ? (r.colorCream.colors || []) : []);
      return { size: plainSize(it.size), cream: cream, color: colors[0] || "" };
    });
    return {
      category: (items[0] || {}).category || r.type || "",
      flavor: (items[0] || {}).flavor || "",
      tiers: tiers,
      decoration: r.decoration || "",
      occasion: r.occasion || "",
      occasionOther: r.occasionOther || "",
      candleType: r.candleNeeded ? (r.candleType || "普通のろうそく") : "",
      candleCount: r.candleNeeded ? (Number(r.candleBags) || 1) : 0,
      messageCount: Number(r.messageCount) || 0,
      message: (items[0] || {}).message || "",
      creamTopping: !!r.creamTopping,
      strawberryAdd: !!r.strawberryAdd,
      onsiteAssembly: !!r.onsiteAssembly,
      pickupDate: r.finalPickupDate || r.pickupDate || "",
      pickupTime: r.finalPickupTime || r.pickupTime || "",
      price: Number(r.finalPrice) || (r.priceIsFixed ? Number(r.subtotal) || 0 : 0),
      priceIsRange: !r.finalPrice && !r.priceIsFixed && !!r.subtotal,
      subtotal: Number(r.subtotal) || 0
    };
  }
  // 表示・比較用の行 [項目, 内容]
  function rowsOf(s) {
    var rows = [];
    rows.push(["商品", s.category + (s.flavor ? "（" + s.flavor + "）" : "")]);
    if (s.tiers.length) {
      rows.push(["段数", s.tiers.length + "段"]);
      s.tiers.forEach(function (t, i) {
        var label = s.tiers.length > 1 ? tierName(i, s.tiers.length) : "サイズ・種類";
        rows.push([label, [t.size, t.cream, t.color ? "カラー：" + t.color : ""].filter(Boolean).join("　")]);
      });
    }
    if (s.decoration) rows.push(["飾り付け", s.decoration]);
    if (s.occasion) rows.push(["ご利用シーン", s.occasion === "その他" && s.occasionOther ? s.occasionOther : s.occasion]);
    rows.push(["ろうそく", s.candleType ? s.candleType + " " + s.candleCount + (s.candleType === "ナンバーろうそく" ? "文字" : "袋") : "なし"]);
    rows.push(["メッセージプレート", s.messageCount ? s.messageCount + "枚" + (s.message ? "「" + s.message + "」" : "") : "なし"]);
    var opts = [];
    if (s.creamTopping) opts.push("生クリームたっぷり乗せ");
    if (s.strawberryAdd) opts.push("いちごトッピング");
    if (s.onsiteAssembly) opts.push("出張組み立て");
    rows.push(["オプション", opts.length ? opts.join("、") : "なし"]);
    rows.push(["お引き取り", (s.pickupDate || "未定") + " " + (s.pickupTime || "")]);
    rows.push(["金額（税込）", s.price ? yen(s.price) + (s.priceIsRange ? "〜" : "") : (s.subtotal ? yen(s.subtotal) + "〜（目安）" : "お電話でご案内")]);
    return rows;
  }
  function diffRows(a, b) {
    var ra = rowsOf(a), rb = rowsOf(b), out = [], map = {};
    ra.forEach(function (r) { map[r[0]] = r[1]; });
    rb.forEach(function (r) { if (map[r[0]] !== r[1]) out.push({ label: r[0], from: map[r[0]] == null ? "—" : map[r[0]], to: r[1] }); });
    var labelsB = {}; rb.forEach(function (r) { labelsB[r[0]] = 1; });
    ra.forEach(function (r) { if (!labelsB[r[0]]) out.push({ label: r[0], from: r[1], to: "—" }); });
    return out;
  }
  function estimateOf(s, r) {
    if (!window.CakePricing || !priceBase || !s.tiers.length) return null;
    return window.CakePricing.estimate({
      tiers: s.tiers.map(function (t) { return t.size; }),
      creamType: (s.tiers[0] || {}).cream || "",
      tierSpecs: s.tiers.map(function (t) { return { cream: t.cream }; }),
      decoration: s.decoration, occasion: s.occasion,
      creamTopping: s.creamTopping, strawberryAdd: s.strawberryAdd, onsiteAssembly: s.onsiteAssembly,
      colorCreamCount: s.tiers.filter(function (t) { return t.color; }).length,
      candleNeeded: !!s.candleType, candleType: s.candleType, candleBags: s.candleCount,
      messageCount: s.messageCount,
      addOns: r.addOns || [], toppings: r.toppings || [], topCut: !!r.topCut, cutCakes: r.cutCakes || []
    }, priceBase);
  }
  // スナップショット → 予約データの更新内容（member.html が保存する形式にそろえる）
  function patchOf(s, r, est) {
    var n = s.tiers.length;
    var p = {
      items: n ? s.tiers.map(function (t, i) { return { category: s.category || "デコレーションケーキ", image: "", size: SIZE_FULL[t.size] || t.size, flavor: s.flavor || "", message: i === 0 ? s.message : "" }; }) : (r.items || null),
      creamType: n ? (s.tiers[0].cream || null) : (r.creamType || null),
      tierSpecs: n > 1 ? s.tiers.map(function (t, i) { return { tier: tierName(i, n), size: SIZE_FULL[t.size] || t.size, cream: t.cream || "", colors: t.color ? [t.color] : [] }; }).reverse() : null,
      decoration: s.decoration || null,
      occasion: s.occasion || null,
      occasionOther: s.occasion === "その他" ? (s.occasionOther || null) : null,
      christmasOrder: s.occasion === "クリスマス" ? true : null,
      candleNeeded: !!s.candleType, candleType: s.candleType || null, candleBags: s.candleType ? s.candleCount : 0,
      messageCount: s.messageCount,
      creamTopping: !!s.creamTopping, strawberryAdd: s.strawberryAdd || null, onsiteAssembly: s.onsiteAssembly || null,
      pickupDate: s.pickupDate, pickupTime: s.pickupTime, finalPickupDate: s.pickupDate, finalPickupTime: s.pickupTime,
      finalPrice: s.price || null,
      priceIsFixed: !!s.price, priceNeedsConsult: !s.price && !(est && est.subtotal)
    };
    var colors = s.tiers.filter(function (t) { return t.color; }).map(function (t) { return t.color; });
    p.colorCream = colors.length ? { count: colors.length, colors: colors, note: "" } : null;
    if (est && !est.needsConsult) { p.subtotal = est.subtotal; p.estimateLines = est.lines; p.estimateNotes = est.notes; }
    return p;
  }

  // ===== 画面 =====
  var state = { key: null, r: null, snap: null, edit: null, staff: DEFAULT_STAFF.slice() };
  function ensureModal() {
    var m = document.getElementById("resEditor");
    if (m) return m;
    m = document.createElement("div");
    m.id = "resEditor";
    m.className = "re-modal";
    m.innerHTML = '<div class="re-dialog" role="dialog" aria-modal="true"><button type="button" class="re-close" aria-label="閉じる">×</button><div id="reBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) close(); });
    m.querySelector(".re-close").addEventListener("click", close);
    return m;
  }
  function close() { var m = document.getElementById("resEditor"); if (m) m.classList.remove("show"); document.body.style.overflow = ""; state.edit = null; }

  function open(key) {
    var api = window.fbResEditorApi;
    if (!api || !key) return;
    var m = ensureModal();
    m.classList.add("show");
    document.body.style.overflow = "hidden";
    document.getElementById("reBody").innerHTML = '<p style="padding:30px;">読み込み中…</p>';
    Promise.all([api.getReservation(key), loadPriceBase(), loadRefCakes(), api.getStaff().catch(function () { return null; })]).then(function (v) {
      state.key = key; state.r = v[0] || {}; state.snap = snapshotOf(state.r); state.edit = null;
      if (Array.isArray(v[3]) && v[3].length) state.staff = v[3].filter(Boolean);
      renderView();
    }).catch(function (e) { document.getElementById("reBody").innerHTML = '<p style="padding:30px;color:#b03b48;">読み込みに失敗しました：' + esc(e && e.message || e) + "</p>"; });
  }

  function imageHtml(r, s) {
    var pick = r.galleryPick || {};
    var img = pick.img, label = "ギャラリーで選んだ商品";
    var name = pick.name || "";
    if (!img) {
      var ref = refImageFor((s.tiers[0] || {}).cream || r.creamType || "");
      if (ref) { img = ref.img; name = ref.name; label = "参考イメージ（予約フォームと同じ写真）"; }
    }
    var sent = r.sentImages ? Object.values(r.sentImages) : [];
    var html = "";
    if (img) html += '<figure class="re-photo"><img src="' + esc(img) + '" alt=""><figcaption><span>' + esc(label) + "</span>" + esc(name) + "</figcaption></figure>";
    else if (pick.name) html += '<div class="re-photo re-photo--none">ギャラリーで選択：' + esc(pick.name) + "（写真なし）</div>";
    sent.sort(function (a, b) { return String(a.sentAt).localeCompare(String(b.sentAt)); }).forEach(function (si) {
      html += '<figure class="re-photo re-photo--sent"><img src="' + esc(si.url) + '" alt=""><figcaption><span>お客様に送った確定画像</span>' + esc((si.sentAt || "").slice(0, 16).replace("T", " ")) + " " + esc(si.by || "") + "</figcaption></figure>";
    });
    return html;
  }
  function revisionsOf(r) {
    var revs = r.revisions ? (Array.isArray(r.revisions) ? r.revisions.map(function (v, i) { return v && Object.assign({ n: i }, v); }) : Object.keys(r.revisions).map(function (k) { return Object.assign({ n: Number(k) }, r.revisions[k]); })) : [];
    return revs.filter(Boolean).sort(function (a, b) { return a.n - b.n; });
  }
  function renderView() {
    var r = state.r, s = state.snap;
    var revs = revisionsOf(r);
    var html = '<div class="re-head"><div class="re-no">' + esc(formatNo(r.reservationNo)) + '</div><div class="re-name">' + esc(r.name || "") + ' 様</div>' +
      '<div class="re-contact">' + (r.tel ? '<a href="tel:' + esc(String(r.tel).replace(/[^0-9+]/g, "")) + '">' + esc(r.tel) + "</a>" : "") + (r.furigana ? "　" + esc(r.furigana) : "") + (r.channel === "LINE" ? '　<span class="re-tag">LINE</span>' : "") + (revs.length > 1 ? '　<span class="re-tag re-tag--rev">修正' + (revs.length - 1) + "まで反映</span>" : "") + "</div></div>";
    html += '<div class="re-grid"><div class="re-media">' + imageHtml(r, s) + (r.lineUserId ? '<label class="re-btn re-btn--ghost re-upload">確定のケーキ画像をLINEで送る<input type="file" accept="image/*" id="reSendImage" hidden></label><p class="re-hint">仕様が確定したケーキの写真を、お客様のLINEにお送りします。</p>' : "") + "</div>";
    html += '<div class="re-info"><h3 class="re-sec">現在のご予約内容</h3><table class="re-table">' + rowsOf(s).map(function (row) { return "<tr><th>" + esc(row[0]) + "</th><td>" + esc(row[1]) + "</td></tr>"; }).join("") + "</table>";
    if (r.note) html += '<div class="re-note"><b>お客様の備考</b><br>' + esc(r.note) + "</div>";
    html += '<button type="button" class="re-btn" id="reStartEdit">内容を変更する（電話しながら）</button></div></div>';
    html += '<h3 class="re-sec">変更履歴</h3>' + (revs.length ? '<ol class="re-history">' + revs.slice().reverse().map(function (v) {
      return '<li><div class="re-history__head"><b>' + esc(v.label || (v.n ? "修正" + v.n : "初回予約")) + "</b>　" + esc(String(v.savedAt || "").slice(0, 16).replace("T", " ")) + "　担当：" + esc(v.by || "—") + (v.notified ? '　<span class="re-tag">LINE送信済み</span>' : "") + "</div>" +
        (v.changes && v.changes.length ? '<ul class="re-changes">' + v.changes.map(function (c) { return "<li>" + esc(c.label) + "：<s>" + esc(c.from) + "</s> → <b>" + esc(c.to) + "</b></li>"; }).join("") + "</ul>" : "") +
        (v.memo ? '<div class="re-memo">' + esc(v.memo) + "</div>" : "") +
        '<details><summary>この時点の内容</summary><table class="re-table re-table--small">' + (v.snapshot ? rowsOf(v.snapshot) : []).map(function (row) { return "<tr><th>" + esc(row[0]) + "</th><td>" + esc(row[1]) + "</td></tr>"; }).join("") + "</table></details></li>";
    }).join("") + "</ol>" : '<p class="re-hint">まだ変更はありません。最初に「内容を変更する」で確定すると、ご予約時の内容が「初回予約」として記録され、その下に「修正1」が追加されます。</p>');
    document.getElementById("reBody").innerHTML = html;
    document.getElementById("reStartEdit").addEventListener("click", startEdit);
    var up = document.getElementById("reSendImage");
    if (up) up.addEventListener("change", function (e) { sendImage(e.target.files && e.target.files[0]); });
  }

  // ===== 変更（プルダウン） =====
  function sel(id, options, value, labelFn) {
    return '<select class="input select re-in" id="' + id + '">' + options.map(function (o) { return '<option value="' + esc(o) + '"' + (String(o) === String(value) ? " selected" : "") + ">" + esc(labelFn ? labelFn(o) : (o || "なし")) + "</option>"; }).join("") + "</select>";
  }
  function field(label, inner) { return '<div class="re-field"><label>' + esc(label) + "</label>" + inner + "</div>"; }
  function startEdit() {
    state.edit = JSON.parse(JSON.stringify(state.snap));
    // 金額は、手入力しない限り自動計算に追従させる（今の金額が自動計算と違う＝以前に手入力した金額なら、そのまま残す）
    var est0 = estimateOf(state.edit, state.r);
    state.edit._priceManual = !!(state.edit.price && !(est0 && !est0.needsConsult && est0.subtotal === state.edit.price));
    renderEdit();
  }
  function renderEdit() {
    var e = state.edit, r = state.r, cake = isCakeRes(r) || e.tiers.length > 0 && e.category === "デコレーションケーキ";
    var html = '<div class="re-head"><div class="re-no">' + esc(formatNo(r.reservationNo)) + '</div><div class="re-name">' + esc(r.name || "") + ' 様　<span class="re-tag re-tag--edit">変更中</span></div></div>';
    html += '<div class="re-form">';
    if (cake) {
      html += field("段数", sel("reTiers", [1, 2, 3], e.tiers.length || 1, function (n) { return n + "段"; }));
      e.tiers.forEach(function (t, i) {
        var n = e.tiers.length;
        html += '<div class="re-tier"><div class="re-tier__title">' + esc(n > 1 ? tierName(i, n) : "ケーキ") + "</div>" +
          field("サイズ", sel("reSize" + i, i === 0 ? BOTTOM_SIZES : UPPER_SIZES, t.size, function (o) { return o; })) +
          (t.size === "セルクル" || t.size === "カットケーキ" ? "" : field("クリーム・種類", sel("reCream" + i, CREAMS, t.cream || "生クリーム", function (o) { return o; })) +
          (t.cream === "生クリーム" || !t.cream ? field("カラー（1段1色）", sel("reColor" + i, [""].concat(COLORS), t.color)) : "")) + "</div>";
      });
      html += field("飾り付け", sel("reDeco", [""].concat(DECORATIONS), e.decoration, function (o) { return o || "指定なし"; }));
      html += field("ご利用シーン", sel("reOcc", OCCASIONS, e.occasion, function (o) { return o || "指定なし"; }) + (e.occasion === "その他" ? '<input class="input re-in" id="reOccOther" value="' + esc(e.occasionOther) + '" placeholder="例：結婚記念日">' : ""));
      html += field("ろうそく", sel("reCandle", ["", "普通のろうそく", "ナンバーろうそく"], e.candleType) + (e.candleType ? sel("reCandleN", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], e.candleCount || 1, function (o) { return o + (e.candleType === "ナンバーろうそく" ? "文字" : "袋"); }) : ""));
      html += field("メッセージプレート", sel("reMsgN", [0, 1, 2, 3], e.messageCount, function (o) { return o ? o + "枚" : "なし"; }) + (e.messageCount ? '<input class="input re-in" id="reMsg" value="' + esc(e.message) + '" placeholder="プレートの文字">' : ""));
      html += field("オプション", '<label class="re-check"><input type="checkbox" id="reTopping"' + (e.creamTopping ? " checked" : "") + "> 生クリームたっぷり乗せ</label>" +
        '<label class="re-check"><input type="checkbox" id="reStraw"' + (e.strawberryAdd ? " checked" : "") + "> いちごトッピング</label>" +
        (e.tiers.length === 3 ? '<label class="re-check"><input type="checkbox" id="reOnsite"' + (e.onsiteAssembly ? " checked" : "") + "> 出張組み立て</label>" : ""));
    }
    html += field("お引き取り日", '<input type="date" class="input re-in" id="reDate" value="' + esc(e.pickupDate) + '">');
    html += field("お引き取り時間", sel("reTime", [""].concat(TIMES), e.pickupTime, function (o) { return o || "選択"; }));
    var est = cake ? estimateOf(e, r) : null;
    if (!e._priceManual && est && !est.needsConsult) e.price = est.subtotal;
    html += '<div class="re-price"><div class="re-price__auto">' + (est ? (est.needsConsult ? "自動計算：この組み合わせは料金表にありません（金額を入力してください）" : "自動計算：<b>" + yen(est.subtotal) + "</b>（税込）") : "") +
      (est && est.lines && est.lines.length ? '<div class="re-lines">' + est.lines.map(function (l) { return esc(l.label) + "　" + yen(l.amount); }).join("<br>") + "</div>" : "") +
      (est && est.notes && est.notes.length ? '<div class="re-lines">※' + est.notes.map(esc).join("<br>※") + "</div>" : "") + "</div>" +
      field("確定金額（税込）", '<div class="re-yen"><input type="number" min="0" class="input re-in" id="rePrice" value="' + esc(e.price || "") + '"> 円' + (est && !est.needsConsult ? ' <button type="button" class="re-btn re-btn--small" id="reUseAuto">自動計算の金額を入れる</button>' : "") + "</div>") + "</div>";
    html += field("変更メモ（お客様のご要望など）", '<textarea class="input re-in" id="reMemo" rows="2" placeholder="例：お電話で5号に変更のご希望"></textarea>');
    html += field("担当者", sel("reStaff", [""].concat(state.staff), "", function (o) { return o || "選んでください"; }) + ' <button type="button" class="re-link" id="reEditStaff">担当者リストを編集</button>');
    var diffs = diffRows(state.snap, e);
    html += '<div class="re-diff"><b>変更点（' + diffs.length + "件）</b>" + (diffs.length ? "<ul>" + diffs.map(function (c) { return "<li>" + esc(c.label) + "：<s>" + esc(c.from) + "</s> → <b>" + esc(c.to) + "</b></li>"; }).join("") + "</ul>" : "<p>まだ変更はありません</p>") + "</div>";
    var nextN = Math.max(1, revisionsOf(r).length);
    html += '<div class="re-actions"><button type="button" class="re-btn re-btn--ghost" id="reCancel">やめる</button><button type="button" class="re-btn" id="reSave">この内容で確定（修正' + nextN + "）</button></div>";
    if (r.lineUserId) html += '<p class="re-hint">確定すると、お客様のLINEに「ご予約内容を変更しました（修正' + nextN + "）」と変更後の内容が自動で届きます。</p>";
    html += "</div>";
    document.getElementById("reBody").innerHTML = html;
    bindEdit();
  }
  function bindEdit() {
    var body = document.getElementById("reBody");
    body.querySelectorAll(".re-in, input[type=checkbox]").forEach(function (el) {
      el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" || el.type === "date" ? "change" : "input", function () { readEdit(el.tagName === "SELECT" || el.type === "checkbox"); });
    });
    var au = document.getElementById("reUseAuto");
    if (au) au.addEventListener("click", function () { var est = estimateOf(state.edit, state.r); if (est && !est.needsConsult) { state.edit.price = est.subtotal; state.edit._priceManual = false; renderEdit(); } });
    document.getElementById("rePrice").addEventListener("input", function () { state.edit._priceManual = true; });
    document.getElementById("reCancel").addEventListener("click", function () { state.edit = null; renderView(); });
    document.getElementById("reSave").addEventListener("click", save);
    document.getElementById("reEditStaff").addEventListener("click", editStaff);
  }
  // 入力内容を state.edit に読み込む。rerender=true ならプルダウンの変化に合わせて画面を作り直す
  function readEdit(rerender) {
    var e = state.edit, g = function (id) { return document.getElementById(id); };
    var memo = g("reMemo") ? g("reMemo").value : "", staff = g("reStaff") ? g("reStaff").value : "";
    if (g("reTiers")) {
      var n = Number(g("reTiers").value) || 1;
      e.tiers = e.tiers.map(function (t, i) {
        return { size: g("reSize" + i) ? g("reSize" + i).value : t.size, cream: g("reCream" + i) ? g("reCream" + i).value : (g("reSize" + i) && /セルクル|カットケーキ/.test(g("reSize" + i).value) ? "" : t.cream), color: g("reColor" + i) ? g("reColor" + i).value : "" };
      });
      while (e.tiers.length < n) e.tiers.push({ size: UPPER_SIZES[0], cream: "生クリーム", color: "" });
      e.tiers = e.tiers.slice(0, n);
      e.decoration = g("reDeco").value; e.occasion = g("reOcc").value; e.occasionOther = g("reOccOther") ? g("reOccOther").value : e.occasionOther;
      e.candleType = g("reCandle").value; e.candleCount = g("reCandleN") ? Number(g("reCandleN").value) : (e.candleType ? 1 : 0);
      e.messageCount = Number(g("reMsgN").value) || 0; e.message = g("reMsg") ? g("reMsg").value : e.message;
      e.creamTopping = g("reTopping").checked; e.strawberryAdd = g("reStraw").checked; e.onsiteAssembly = g("reOnsite") ? g("reOnsite").checked : false;
    }
    e.pickupDate = g("reDate").value; e.pickupTime = g("reTime").value;
    e.price = Number(g("rePrice").value) || 0; e.priceIsRange = false;
    if (rerender) {
      renderEdit();
      if (g("reMemo")) g("reMemo").value = memo;
      if (g("reStaff")) g("reStaff").value = staff;
    }
  }
  function save() {
    readEdit(false);
    var e = state.edit, r = state.r, api = window.fbResEditorApi;
    var staff = document.getElementById("reStaff").value, memo = document.getElementById("reMemo").value.trim();
    if (!staff) { alert("担当者を選んでください"); return; }
    if (!e.pickupDate || !e.pickupTime) { alert("お引き取り日時を選んでください"); return; }
    if (!e.price) { alert("確定金額を入力してください（自動計算の金額を入れるボタンも使えます）"); return; }
    e = JSON.parse(JSON.stringify(e)); delete e._priceManual;
    var changes = diffRows(state.snap, e);
    if (!changes.length && !memo) { alert("変更点がありません"); return; }
    var revs = revisionsOf(r), n = Math.max(1, revs.length);
    if (!confirm("修正" + n + "として確定します。\n\n" + changes.map(function (c) { return "・" + c.label + "：" + c.from + " → " + c.to; }).join("\n") + (r.lineUserId ? "\n\nお客様のLINEにも変更後の内容が届きます。" : ""))) return;
    var now = new Date().toISOString(), base = "reservations/" + state.key + "/", up = {};
    if (!revs.length) up[base + "revisions/0"] = { label: "初回予約", savedAt: r.submittedAt || now, by: r.channel === "LINE" ? "お客様（LINE予約フォーム）" : "お客様（予約フォーム）", snapshot: state.snap };
    var est = isCakeRes(r) ? estimateOf(e, r) : null;
    var patch = patchOf(e, r, est);
    if (!isCakeRes(r)) { patch = { pickupDate: e.pickupDate, pickupTime: e.pickupTime, finalPickupDate: e.pickupDate, finalPickupTime: e.pickupTime, finalPrice: e.price, priceIsFixed: true }; }
    up[base + "revisions/" + n] = { label: "修正" + n, savedAt: now, by: staff, byAccount: api.currentUserEmail() || "", memo: memo, changes: changes, snapshot: e };
    Object.keys(patch).forEach(function (k) { up[base + k] = patch[k]; });
    up[base + "revisionCount"] = n; up[base + "lastRevisionAt"] = now;
    document.getElementById("reSave").disabled = true;
    api.multiUpdate(up).then(function () {
      if (typeof window.showToast === "function") window.showToast("修正" + n + "として保存しました");
      open(state.key);
    }).catch(function (err) { alert("保存に失敗しました：" + (err && err.message || err)); document.getElementById("reSave").disabled = false; });
  }
  function editStaff() {
    var cur = state.staff.join("、");
    var v = prompt("担当者の名前を「、」で区切って入力してください", cur);
    if (v == null) return;
    var list = v.split(/[、,，\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!list.length) return;
    window.fbResEditorApi.setStaff(list).then(function () { state.staff = list; readEdit(true); }).catch(function (err) { alert("担当者リストの保存に失敗しました（店舗用アカウントでは編集できません）：" + (err && err.message || err)); });
  }
  function sendImage(file) {
    if (!file) return;
    var api = window.fbResEditorApi;
    var staff = prompt("送る担当者の名前を入力してください（例：" + state.staff[0] + "）", state.staff[0] || "");
    if (staff == null) return;
    if (!confirm("この画像を、" + (state.r.name || "お客様") + " 様のLINEに「仕様が確定したケーキの画像」として送ります。よろしいですか？")) return;
    api.uploadImage(file, file.type).then(function (url) {
      return api.pushSentImage(state.key, { url: url, by: staff, sentAt: new Date().toISOString() });
    }).then(function () { if (typeof window.showToast === "function") window.showToast("画像を送りました"); open(state.key); })
      .catch(function (err) { alert("画像の送信に失敗しました：" + (err && err.message || err)); });
  }

  window.ReservationEditor = { open: open, snapshotOf: snapshotOf, rowsOf: rowsOf, diffRows: diffRows, patchOf: patchOf };
})();
