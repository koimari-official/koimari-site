/* クリスマス特設ページの「入口」を出すかどうか（2026-10-28オーナー指示）
   入口＝トップの帯（ハロウィンと同じ形・お知らせとは別）／スクロールしてもついてくるボタン／ギャラリーの「クリスマスケーキ」カテゴリー。
   すべて管理画面「クリスマスケーキ」の設定（koimariContent/christmas）だけで決まる：
   ・「入口に出す」のチェックを外したら（entryOff）出さない
   ・入口の最終日（entryUntil。空欄ならお渡し期間の最終日 pickupTo）を過ぎたら出さない
   ・表示するケーキ（写真あり）が1つもなければ出さない
   読み込みが終わるまでは何も出さない（設定にないものを一瞬も出さないため）。 */
(function () {
  var DB = "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app";
  var loading = null;
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function itemsOf(conf) {
    var raw = conf && conf.items;
    return (Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : []).filter(function (c) { return c && c.visible !== false && c.img; });
  }
  function isActive(conf) {
    if (!conf || conf.entryOff === true) return false;
    var until = conf.entryUntil || conf.pickupTo;
    if (until && today() > until) return false;
    return itemsOf(conf).length > 0;
  }
  function load() {
    if (!loading) loading = fetch(DB + "/koimariContent/christmas.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return loading;
  }
  // 「12月22日（火）」の形（数字は装飾書体を使わない側で表示する）
  function mdw(ds) {
    var m = String(ds || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    var w = "日月火水木金土".charAt(new Date(+m[1], +m[2] - 1, +m[3]).getDay());
    return (+m[2]) + "月" + (+m[3]) + "日（" + w + "）";
  }
  // 受付状態。HPの予約を隠している間（site-mode.js）は、受付中でも「近日ご予約開始」として扱う
  function statusOf(conf) {
    var st = (conf && conf.status) || "preparing";
    if (st === "open" && window.KOIMARI_RESERVE_PUBLIC === false) st = "preparing";
    return st;
  }
  // 表題（ハロウィンの「★ ハロウィンフェア開催中 ★」と同じ形・2026-10-28オーナー指示）。管理画面で書いた表題があればそれを使う。絵文字は使わない
  function titleOf(conf) {
    var t = conf ? String(conf.title || "").trim() : "";
    if (t) return t;
    var st = statusOf(conf), plan = conf ? String(conf.openPlan || "").trim() : "";
    if (st === "preparing" && plan) return "★ クリスマスケーキ " + plan + "ご予約開始予定 ★"; // 受付開始の予定（例：10月後半）を管理画面で入れたとき
    return "★ クリスマスケーキ " + ({ open: "ご予約受付中", closed: "ご予約受付終了" }[st] || "近日ご予約開始") + " ★";
  }
  // 表題をHTMLに（空白の位置でだけ折り返す。先頭・末尾の★は隣の言葉と離さない）
  function titleHtml(conf) {
    var esc = function (x) { return String(x).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); };
    var w = titleOf(conf).split(/\s+/).filter(Boolean);
    if (w.length > 2 && w[0] === "★") w.splice(0, 2, w[0] + " " + w[1]);
    if (w.length >= 2 && w[w.length - 1] === "★") w.splice(w.length - 2, 2, w[w.length - 2] + " " + w[w.length - 1]);
    // 数字（日付など）は装飾書体を使わない（こいまりのきまり）
    return w.map(function (x) { return '<span style="display:inline-block">' + esc(x).replace(/(\d+)/g, '<span style="font-family:var(--font-sans,sans-serif)">$1</span>') + "</span>"; }).join(" ");
  }
  window.KoimariXmasEntry = {
    load: load, isActive: isActive, itemsOf: itemsOf, today: today, mdw: mdw, statusOf: statusOf, titleOf: titleOf, titleHtml: titleHtml,
    whenActive: function (cb) { load().then(function (c) { if (isActive(c)) cb(c); }); }
  };
})();
