// 「今月の主役」はお知らせの中から選ぶ（2026-10-19オーナー発案）。
// お知らせの記事に spotlight:true を付けると、トップの主役欄にもその記事が大きく出る。
// タイトル・写真・リンク先・本文はお知らせと共通（二重管理しない）。主役用の見せ方だけ sp〇〇 の欄で上書きできる。
// トップページ（index.html）と管理画面の確認ボタン（admin.html）の両方がこのファイルを使う。
(function () {
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  // 本文の最初の段落（主役欄の説明文に使う。主役用の説明文が入っていればそちらを優先）
  function firstParagraph(text) {
    const paras = String(text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return paras[0] || "";
  }
  // 公開中のお知らせのうち、主役に選ばれていて、最終日を過ぎていないもの（複数あれば上にあるもの）
  function pick(list) {
    const t = today();
    return (Array.isArray(list) ? list : []).find((n) => n && n.spotlight && n.visible !== false && (!n.spUntil || t <= n.spUntil)) || null;
  }
  function toSpotlight(n) {
    if (!n) return null;
    const link = n.url && n.url !== "#" && !/news\.html|blog\.html/.test(n.url) ? n.url : ""; // ブログへのリンクは使わない
    return {
      badge: n.spBadge || "今月の主役",
      period: n.spPeriod || "",
      en: n.spEn || "",
      title: n.spTitle || n.title || "",
      sub: n.spSub || "",
      desc: n.spDesc || firstParagraph(n.excerpt),
      img: n.img || "",
      photoAdjust: n.photoAdjust,
      cta: n.spCta || "詳しく見る",
      ctaUrl: n.spCtaUrl || link || (n.id ? "news.html?id=" + encodeURIComponent(n.id) : "index.html#news"),
      imgFit: n.spFit || "",
      titleFont: n.spFont || "",
      titleWeight: n.spWeight || "",
      picks: Array.isArray(n.picks) ? n.picks : [], // 選んだ商品はすべて（トップでは横スクロールで並べる）
      fromNewsId: n.id || "",
      theme: n.theme || "", // 特設ページのテーマ（あればトップに特設ページへの大きなボタンを出す）
      pageUrl: n.id ? "news.html?id=" + encodeURIComponent(n.id) : "",
    };
  }
  window.KoimariSpotlight = { pick, toSpotlight, fromNews: (list) => toSpotlight(pick(list)) };
})();
