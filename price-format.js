// 価格の表示ルール（2026-10-19オーナー指示）。サイトのすべての価格表示はこれを通す。
// ・数字があるとき：必ず「¥1,200（税込）」の形（3桁区切り、「〜」付きはそのまま「¥3,630〜（税込）」）
// ・価格が入っていない商品：「店頭表示中」
(function () {
  var NONE = "店頭表示中";
  function parse(raw) {
    var s = String(raw == null ? "" : raw).replace(/[（(]\s*税込\s*[）)]|税込み?|税抜.*$/g, "").trim();
    var m = s.match(/(\d[\d,，]*)/);
    if (!m || !/[1-9]/.test(m[1])) return null;
    var n = Number(m[1].replace(/[,，]/g, ""));
    if (!n) return null;
    var prefix = s.slice(0, m.index).replace(/[¥￥\s]+$/, "").trim(); // 「目安」など
    var rest = s.slice(m.index + m[1].length).replace(/^\s*円/, "");
    var from = /^\s*[〜～~]/.test(rest);
    return { n: n, prefix: prefix, from: from };
  }
  // 表示用の文字列。価格が無ければ「店頭表示中」
  function text(raw) {
    var p = parse(raw);
    if (!p) return NONE;
    return (p.prefix ? p.prefix + " " : "") + "¥" + p.n.toLocaleString("ja-JP") + (p.from ? "〜" : "") + "（税込）";
  }
  // HTML用（「（税込）」を少し小さく）。価格が無ければ「店頭表示中」
  function html(raw) {
    var t = text(raw);
    if (t === NONE) return '<span class="price-none">' + NONE + "</span>";
    return t.replace("（税込）", "<small>（税込）</small>");
  }
  function has(raw) { return !!parse(raw); }
  window.KoimariPrice = { text: text, html: html, has: has, NONE: NONE };
})();
