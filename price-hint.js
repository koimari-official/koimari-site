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
      getJson("koimariContent/cakeChocoCreamSurcharge")
    ]).then(function (r) { return { sizePrices: r[0] || {}, typePrices: r[1] || {}, choco: Number(r[2]) || 0 }; });
    return cache;
  }
  function sizeOf(item) {
    var m = String((item && item.desc) || "").match(/^【([^】]+)】/);
    return m ? m[1] : "";
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
  function yen(n) { return "¥" + Number(n).toLocaleString(); }
  // 表示用の価格テキスト（例：「¥3,630〜」）。出せない場合は空文字
  function priceText(item, productType, prices) {
    if (item && item.price) return String(item.price);
    if (productType !== "decorationCake" || !prices) return "";
    var size = (item.spec && item.spec.size ? String(item.spec.size).split("(")[0] : "") || sizeOf(item);
    var cream = creamOf(item, prices);
    if (!size || !cream) return "";
    var p = 0;
    if (cream === "生クリーム") p = Number(prices.sizePrices[size]) || 0;
    else if (cream === "生チョコクリーム") p = (Number(prices.sizePrices[size]) || 0) && (Number(prices.sizePrices[size]) + prices.choco);
    else p = Number(prices.typePrices[cream] && prices.typePrices[cream][size]) || 0;
    return p ? yen(p) + "〜" : "";
  }
  root.KoimariPriceHint = { load: load, sizeOf: sizeOf, sizeLabel: sizeLabel, descBody: descBody, priceText: priceText };
})(typeof window !== "undefined" ? window : this);
