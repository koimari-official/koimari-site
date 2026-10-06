/* 写真ごとの色味・表示位置の調整（2026-10-06オーナー指示）。
   写真そのものは一切加工しない（解像度・画質を落とさない）。表示するときだけ CSS の filter と
   object-position で補正する。調整値は各商品の item.photoAdjust[写真のハッシュ] に保存する
   （写真URLが長いbase64でもキーにできるよう、URLの短いハッシュをキーにする。並び替え・トップ入れ替えにも追従する）。
   値：b=明るさ(%) c=コントラスト(%) s=鮮やかさ(%) w=色温度(-10寒色〜+10暖色) x,y=表示位置(%)
   公開ページは register(商品配列) を呼ぶだけで、ページ内の <img> に自動で反映される（ライトボックス・サムネイルも）。 */
(function (root) {
  function hash(src) {
    var s = String(src || ""), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return "h" + h.toString(36) + s.length.toString(36);
  }
  function isDefault(a) {
    return !a || ((a.b == null || a.b == 100) && (a.c == null || a.c == 100) && (a.s == null || a.s == 100) && !Number(a.w) && (a.x == null || a.x == 50) && (a.y == null || a.y == 50));
  }
  // 暖色↔寒色：赤を少し強く・青を少し弱く（暖色）、その逆（寒色）
  function ensureWarmFilter(n) {
    if (typeof document === "undefined" || !document.body) return false;
    var svg = document.getElementById("paFilters");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("id", "paFilters"); svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
      document.body.appendChild(svg);
    }
    var id = "paw" + (n < 0 ? "m" + (-n) : n);
    if (!document.getElementById(id)) {
      var t = n / 10, r = 1 + 0.10 * t, g = 1 + 0.02 * t, b = 1 - 0.14 * t;
      var f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      f.setAttribute("id", id); f.setAttribute("color-interpolation-filters", "sRGB");
      var m = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
      m.setAttribute("type", "matrix");
      m.setAttribute("values", r + " 0 0 0 0  0 " + g + " 0 0 0  0 0 " + b + " 0 0  0 0 0 1 0");
      f.appendChild(m); svg.appendChild(f);
    }
    return id;
  }
  function filterOf(a) {
    if (!a) return "";
    var parts = [], w = Math.round(Number(a.w) || 0);
    if (w) { var id = ensureWarmFilter(Math.max(-10, Math.min(10, w))); if (id) parts.push("url(#" + id + ")"); }
    if (a.b != null && a.b != 100) parts.push("brightness(" + a.b / 100 + ")");
    if (a.c != null && a.c != 100) parts.push("contrast(" + a.c / 100 + ")");
    if (a.s != null && a.s != 100) parts.push("saturate(" + a.s / 100 + ")");
    return parts.join(" ");
  }
  function applyTo(img, a) {
    if (!img) return;
    if (isDefault(a)) { img.style.filter = ""; img.style.objectPosition = ""; return; }
    img.style.filter = filterOf(a);
    // 表示位置は調整した時だけ上書きする（ヒーロー画像などの既存の位置指定を消さないため）
    if ((a.x != null && a.x != 50) || (a.y != null && a.y != 50)) img.style.objectPosition = (a.x == null ? 50 : a.x) + "% " + (a.y == null ? 50 : a.y) + "%";
    else if (img.dataset.paApplied) img.style.objectPosition = "";
  }
  // ---- 公開ページ用：登録した商品の写真に自動で反映 ----
  var map = {};
  function register(list) {
    (Array.isArray(list) ? list : list ? Object.values(list) : []).forEach(function (it) {
      if (it && it.photoAdjust) Object.keys(it.photoAdjust).forEach(function (k) { map[k] = it.photoAdjust[k]; });
    });
    scan(document);
  }
  function fix(img) {
    var src = img.getAttribute("src");
    if (!src) return;
    var a = map[hash(src)];
    if (a) applyTo(img, a);
    else if (img.dataset.paApplied) applyTo(img, null);
    img.dataset.paApplied = a ? "1" : "";
  }
  function scan(node) {
    if (!node || !node.querySelectorAll || !Object.keys(map).length) return;
    if (node.tagName === "IMG") fix(node);
    node.querySelectorAll("img").forEach(fix);
  }
  if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    new MutationObserver(function (muts) {
      if (!Object.keys(map).length) return;
      muts.forEach(function (m) {
        if (m.type === "attributes" && m.target.tagName === "IMG") fix(m.target);
        else m.addedNodes && m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); });
      });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  }
  root.PhotoAdjust = { hash: hash, filterOf: filterOf, applyTo: applyTo, isDefault: isDefault, register: register };
})(window);
