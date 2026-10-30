/* こいまり公式HPの公開モード（2026-10-28オーナー指示）
   スタッフの予約管理の運用が整うまで、ネット予約（LINE予約フォーム）とLINE友だち登録に関する案内を、すべてのページで隠して先行公開する。
   RESERVE_PUBLIC を true に戻すと、すべて元どおりに出る（このファイルの1か所だけを直す）。
   隠し方：
   ・予約ページ・予約フォーム・LINEへのリンクとボタンは、リンク先で見分けて隠す（データから後で作られるボタンにも効く）
   ・リンクでない部分（説明の欄など）は、HTMLに data-reserve-ui を付けて隠す
   ・代わりに出す案内は class="prelaunch-only"（ふだんは出ない）
   ページの読み込みの最初（<head>）で読むので、隠す前の一瞬の表示（ちらつき）は出ない。 */
(function () {
  // 2026-10-31オーナー決定：LINE友だち追加・予約システムは 10/31 18:00（日本時間）から公開。この時刻以降に開いたページでは予約・LINEの案内が出る
  var OPEN_AT = Date.parse("2026-10-31T18:00:00+09:00");
  var RESERVE_PUBLIC = Date.now() >= OPEN_AT;
  window.KOIMARI_RESERVE_PUBLIC = RESERVE_PUBLIC;
  var html = document.documentElement;
  var style = document.createElement("style");
  if (RESERVE_PUBLIC) {
    style.textContent = ".prelaunch-only{display:none!important}";
    document.head.appendChild(style);
    return;
  }
  html.classList.add("koimari-prelaunch");
  var links = ['a[href*="reservation.html"]', 'a[href*="member.html"]', 'a[href*="liff.line.me"]', 'a[href*="lin.ee"]', 'a[href*="page.line.me"]']; // ブログの「LINEで送る」（line.me/R/msg：記事の共有）は友だち登録ではないので残す
  var hide = links.slice();
  links.forEach(function (l) { hide.push("li:has(> " + l + ")"); });
  hide = hide.concat([
    "[data-reserve-ui]",
    ".fab", // トップ右下の「ご予約」ボタン
    ".line-card", // LINE公式アカウントの紹介
    ".event-banner:has(a[href*=\"lin.ee\"])", ".gal-campaign:has(a[href*=\"lin.ee\"])", // Wオープン記念クーポン（LINEで友だち追加。トップとギャラリーの帯）
    ".gal-card__reserve", "[data-reserve-no]", // ギャラリーの「この内容で予約する」
    ".pd-sticky", ".product-reserve", // 商品ページの予約ボタン
    ".xm-reserve" // クリスマスの「このケーキを予約する」
  ]);
  // メニューなどの見た目の指定（#globalNav .nav-link{display:…!important} のようなIDを使った強い指定）より必ず強くするため、:not(#…) で強さを上げる
  var root = "html.koimari-prelaunch:not(#kp-a):not(#kp-b) ";
  style.textContent = hide.map(function (s) { return root + s; }).join(",") + "{display:none!important}"; // prelaunch-only は、この間はそのまま出る
  (document.head || html).appendChild(style);
})();
