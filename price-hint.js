/* 商品の「目安価格」とサイズ表示（2026-10-02オーナー指示：ギャラリー・商品紹介ページが質素で購買意欲をそそらない）。
   ギャラリー一覧（gallery.html）と商品紹介ページ（product.html）で同じ表示にするための共通部品。
   - 管理画面で商品に価格（price）が入っていれば、それをそのまま表示する
   - デコレーションケーキで価格が未入力なら、説明文先頭の【4号】と商品名（または管理画面の「予約フォームの自動選択」の
     クリーム）から、管理画面「料金表（単価）」の単価で「¥3,630〜」の目安を出す。どの種類か判定できない商品は価格を出さない
   cake-pricing.js（CakePricing.SPEC）を先に読み込んでおくこと。 */
(function (root) {
  var DB = "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app";
  var cache = null;
  function getJson(path) {
    return fetch(DB + "/" + path + ".json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  // 料金表の値（koimariContent/cakeSizePrices 等）を1回だけ取得する
  function load() {
    if (cache) return cache;
    cache = Promise.all([
      getJson("koimariContent/cakeSizePrices"),
      getJson("koimariContent/cakeTypePrices"),
      getJson("koimariContent/cakeChocoCreamSurcharge"),
      getJson("koimariContent/cakeSpecOverrides")
    ]).then(function (r) {
      // 料金表の詳細（フルーツトッピング・カラークリーム等）の上書き値を反映してから計算する
      if (r[3] && root.CakePricing && root.CakePricing.applyOverrides) root.CakePricing.applyOverrides(r[3]);
      return { sizePrices: r[0] || {}, typePrices: r[1] || {}, choco: Number(r[2]) || 0 };
    });
    return cache;
  }
  function sizeOf(item) {
    var m = String((item && item.desc) || "").match(/^【([^】]+)】/);
    if (!m) return "";
    var n = m[1].match(/([3-7])号/); // 【参考画像4号】等の書き方にも対応（2026-10-03）
    return n ? n[1] + "号" : m[1];
  }
  // 「4号」→「4号（直径約12cm・3〜4人前）」
  function sizeLabel(size) {
    var S = root.CakePricing && root.CakePricing.SPEC && root.CakePricing.SPEC.sizes;
    var k = String(size || "").replace(/\s/g, "");
    var info = S && S[k];
    if (!info) return size || "";
    return k + "（直径" + info.cm + (info.serves ? "・" + info.serves : "") + "）";
  }
  // 説明文から先頭の【4号】を取り除いた本文
  function descBody(item) {
    return String((item && item.desc) || "").replace(/^【[^】]+】/, "");
  }
  function creamOf(item, prices) {
    if (item && item.spec && item.spec.cream) return item.spec.cream;
    var name = String((item && item.name) || "").replace(/<[^>]*>/g, "");
    var names = ["生チョコクリーム", "生クリーム"].concat(Object.keys(prices.typePrices || {}));
    names.sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < names.length; i++) if (name.indexOf(names[i]) === 0) return names[i];
    return "";
  }
  // ご注文の受け方（admin.html の orderModeOf と同じ判定）。未設定は定番（standard）扱い
  function orderModeOf(item) {
    if (item && (item.orderMode === "custom" || item.orderMode === "standard")) return item.orderMode;
    return "standard"; // 未設定は従来どおり定番扱い（管理画面で警告を出す）
  }
  function yen(n) { return "¥" + Number(n).toLocaleString(); }
  // 表示用の価格テキスト（例：「¥3,630〜」）。出せない場合は空文字
  function priceText(item, productType, prices) {
    // 管理画面の価格欄。「¥0」「0円」など0円の入力は未入力として扱う（新規追加時の初期値対策）
    if (item && item.price && /[1-9]/.test(String(item.price))) return String(item.price);
    if (productType !== "decorationCake" || !prices) return "";
    if (orderModeOf(item) === "custom") return "";
    var size = (item.spec && item.spec.size ? String(item.spec.size).split("(")[0] : "") || sizeOf(item);
    var cream = creamOf(item, prices);
    if (!size || !cream) return "";
    var spec = (item && item.spec) || {};
    if (Number(spec.tiers) > 1) return ""; // 2段・3段は組み合わせ次第のため目安を出さない
    // 2026-10-02オーナー指摘：飾り付け（バラエティフルーツ＝フルーツトッピング）などの料金が入っていなかった。
    // 予約フォームと同じ計算（cake-pricing.js の estimate）で、サイズ・クリーム・飾り付け・シーンを含めた金額を出す。
    if (root.CakePricing && root.CakePricing.estimate) {
      var est = root.CakePricing.estimate({ tiers: [size], creamType: cream, tierSpecs: [{ cream: cream }], decoration: spec.decoration || "", includedDecoration: spec.decoration || "", occasion: spec.occasion || "" },
        { sizePrices: prices.sizePrices, typePrices: prices.typePrices, chocoCream: prices.choco || undefined });
      return est && !est.needsConsult && est.subtotal ? yen(est.subtotal) + "〜" : "";
    }
    var p = 0;
    if (cream === "生クリーム") p = Number(prices.sizePrices[size]) || 0;
    else if (cream === "生チョコクリーム") p = (Number(prices.sizePrices[size]) || 0) && (Number(prices.sizePrices[size]) + prices.choco);
    else p = Number(prices.typePrices[cream] && prices.typePrices[cream][size]) || 0;
    return p ? yen(p) + "〜" : "";
  }
  // 号数ごとのお値段（4号〜7号）。予約フォームと同じ計算で、ベース・飾り付け（標準の飾り付けは基本料金に含む）を反映。
  // 原価表にない号数は price: 0（＝特殊仕様。お電話で確認）。2段以上の商品・フルオーダーは空配列。
  function sizePriceRows(item, productType, prices) {
    var S = root.CakePricing && root.CakePricing.SPEC && root.CakePricing.SPEC.sizes;
    if (!S || productType !== "decorationCake" || !prices) return [];
    var spec = (item && item.spec) || {};
    if (Number(spec.tiers) > 1) return [];
    var custom = orderModeOf(item) === "custom";
    var cream = custom ? "" : creamOf(item, prices);
    return ["4号", "5号", "6号", "7号"].map(function (size) {
      var price = 0;
      if (cream && root.CakePricing.estimate) {
        var est = root.CakePricing.estimate({ tiers: [size], creamType: cream, tierSpecs: [{ cream: cream }], decoration: spec.decoration || "", includedDecoration: spec.decoration || "", occasion: spec.occasion || "" },
          { sizePrices: prices.sizePrices, typePrices: prices.typePrices, chocoCream: prices.choco || undefined });
        price = est && !est.needsConsult ? est.subtotal : 0;
      }
      return { size: size, cm: (S[size] || {}).cm || "", serves: (S[size] || {}).serves || "", price: price, custom: custom };
    });
  }
  root.KoimariPriceHint = { orderModeOf: orderModeOf, sizePriceRows: sizePriceRows, load: load, sizeOf: sizeOf, sizeLabel: sizeLabel, descBody: descBody, priceText: priceText };
})(typeof window !== "undefined" ? window : this);
