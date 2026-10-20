// ページ下部のクレジット（2026-10-20オーナー指示）。すべてのページの <footer> の最後に同じ表示を出す。
// 文言は「Produced by」のみ（運営の変更を告知する内容ではない。運営会社名は特商法・プライバシーポリシーにも記載済み）。
(function () {
  var URL = "https://koimari-official.github.io/NORI-TATE.official-site/";
  function add() {
    var foot = document.querySelector("footer");
    if (!foot || foot.querySelector(".nt-credit")) return;
    if (!document.getElementById("nt-credit-font")) {
      var l = document.createElement("link"); l.id = "nt-credit-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap";
      document.head.appendChild(l);
    }
    if (!document.getElementById("nt-credit-css")) {
      var st = document.createElement("style"); st.id = "nt-credit-css";
      st.textContent =
        ".nt-credit{display:flex;flex-direction:column;align-items:center;gap:6px;margin:26px auto 4px;padding:18px 16px 4px;max-width:520px;text-align:center;position:relative}" +
        ".nt-credit::before{content:'';position:absolute;top:0;left:50%;width:120px;height:1px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,#c9a96e,transparent)}" +
        ".nt-credit__by{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;letter-spacing:.32em;color:#b9a27a;text-transform:uppercase}" +
        ".nt-credit__name{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:22px;letter-spacing:.42em;color:#e6cf9f;text-decoration:none;padding-left:.42em;transition:color .3s,letter-spacing .4s}" +
        ".nt-credit__name:hover{color:#fff;letter-spacing:.48em}" +
        ".nt-credit__url{font-size:11px;letter-spacing:.08em;color:#9c8a6c;text-decoration:none;word-break:break-all}" +
        ".nt-credit__url:hover{color:#e6cf9f}" +
        ".nt-credit--light .nt-credit__by{color:#a88a52}.nt-credit--light .nt-credit__name{color:#6b5232}.nt-credit--light .nt-credit__name:hover{color:#2e2118}.nt-credit--light .nt-credit__url{color:#8a7766}";
      document.head.appendChild(st);
    }
    var bg = getComputedStyle(foot).backgroundColor.match(/\d+/g) || [0, 0, 0];
    var light = (Number(bg[0]) * 299 + Number(bg[1]) * 587 + Number(bg[2]) * 114) / 1000 > 150;
    var box = document.createElement("div");
    box.className = "nt-credit" + (light ? " nt-credit--light" : "");
    box.innerHTML = '<span class="nt-credit__by">Produced by</span>' +
      '<a class="nt-credit__name" href="' + URL + '" target="_blank" rel="noopener">NORI&amp;TATE</a>' +
      '<a class="nt-credit__url" href="' + URL + '" target="_blank" rel="noopener">株式会社NORI&amp;TATE ｜ koimari-official.github.io/NORI-TATE.official-site</a>';
    foot.appendChild(box);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
})();
