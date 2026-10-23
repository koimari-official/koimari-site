// こいまり新トップ（試作）の動き（2026-10-23）：言葉と写真がふわっと現れる・数字が数え上がる（GSAP・無料）。
// 動きを減らす設定の人や、GSAPが読み込めなかったときは、動かさずに最後の数字をそのまま出す
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var counts = [].slice.call(document.querySelectorAll('.kf-count'));
  function finalText(el) { return Number(el.getAttribute('data-to')).toFixed(Number(el.getAttribute('data-dec') || 0)); }
  if (reduce || !window.gsap || !window.ScrollTrigger) { counts.forEach(function (el) { el.textContent = finalText(el); }); return; }
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  var E = 'power3.out';
  gsap.from('.kf-hero__text > *', { opacity: 0, y: 24, duration: 0.9, stagger: 0.1, ease: E, delay: 0.15 });
  gsap.from('.kf-hero__media img', { scale: 1.08, duration: 1.8, ease: E });
  gsap.utils.toArray('.kf-sig .kf-title, .kf-sig .kf-lead, .kf-sig .kf-label, .kf-sig .kf-link, .kf-nums li, .kf-occ .kf-title, .kf-occ .kf-label, .kf-tanuki .kf-title, .kf-tanuki .kf-lead, .kf-tanuki .kf-label, .kf-tanuki .kf-link, .kf-voices .kf-title, .kf-voices .kf-lead, .kf-voices .kf-label, .kf-cta-row, .kf-ec__text > *, .kf-up .kf-title, .kf-up .kf-label, .kf-up__block').forEach(function (el) {
    gsap.from(el, { opacity: 0, y: 26, duration: 0.9, ease: E, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.utils.toArray('.kf-sig__photos img, .kf-tile, .kf-tanuki__photos img, .kf-strip img, .kf-ec__media img').forEach(function (el, i) {
    gsap.from(el, { opacity: 0, y: 40, duration: 1, ease: E, delay: (i % 4) * 0.06, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  counts.forEach(function (el) {
    var to = Number(el.getAttribute('data-to')), dec = Number(el.getAttribute('data-dec') || 0), o = { v: 0 };
    el.textContent = (0).toFixed(dec);
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: function () { el.textContent = o.v.toFixed(dec); }, onComplete: function () { el.textContent = finalText(el); } });
  });
})();
