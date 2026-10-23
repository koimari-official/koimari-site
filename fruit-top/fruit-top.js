// こいまり新トップ（試作）の動き（2026-10-23）
// ・言葉と写真がふわっと現れる・数字が数え上がる（GSAP・無料）。動きを減らす設定の人や、GSAPが読み込めなかったときは動かさない
// ・看板商品の欄は、管理画面の商品データ（トップが読み込んだ siteImages）から組み立てる。
//   商品が非表示・見つからない・写真がないときは欄ごと出さない（設定にない写真・文言・価格は出さないルール／非表示の商品は出さないルール）
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var anim = !reduce && window.gsap && window.ScrollTrigger;
  var E = 'power3.out';
  if (anim) { gsap.registerPlugin(ScrollTrigger); gsap.config({ nullTargetWarn: false }); }

  function finalText(el) { return Number(el.getAttribute('data-to')).toFixed(Number(el.getAttribute('data-dec') || 0)); }
  function countUp(root) {
    [].slice.call(root.querySelectorAll('.kf-count')).forEach(function (el) {
      if (!anim) { el.textContent = finalText(el); return; }
      var to = Number(el.getAttribute('data-to')), dec = Number(el.getAttribute('data-dec') || 0), o = { v: 0 };
      el.textContent = (0).toFixed(dec);
      gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 85%' },
        onUpdate: function () { el.textContent = o.v.toFixed(dec); }, onComplete: function () { el.textContent = finalText(el); } });
    });
  }

  // ---- 看板商品：商品データから組み立てる ----
  var CFG = {};
  try { CFG = JSON.parse((document.getElementById('kfConfig') || {}).textContent || '{}'); } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function renderSignature(data) {
    var sc = CFG.signature, sec = document.getElementById('kfSignature');
    if (!sc || !sec) return false;
    var list = data && data[sc.list];
    var idx = -1;
    if (Array.isArray(list)) for (var i = 0; i < list.length; i++) { if (list[i] && list[i].name === sc.name) { idx = i; break; } }
    var it = idx >= 0 ? list[idx] : null;
    if (!it || it.visible === false || !it.img) { sec.hidden = true; return false; }
    sec.querySelector('.kf-sig__name').innerHTML = esc(it.name).replace(/の/g, 'の<wbr>');  // 「たっぷり苺の／ショートケーキ」のように「の」の後ろでだけ折り返す
    var desc = sec.querySelector('.kf-sig__desc');
    desc.textContent = it.desc || ''; desc.hidden = !it.desc;
    var p1 = sec.querySelector('.kf-sig__p1');
    if (p1.getAttribute('src') !== it.img) p1.src = it.img;
    p1.alt = it.name;
    var g = Array.isArray(it.gallery) ? it.gallery.filter(Boolean) : [];
    var p2 = sec.querySelector('.kf-sig__p2');
    if (g[0]) { if (p2.getAttribute('src') !== g[0]) p2.src = g[0]; p2.alt = it.name + 'の写真'; p2.hidden = false; } else { p2.hidden = true; p2.removeAttribute('src'); }
    var tag = sec.querySelector('.kf-sig__tag');
    if (window.KoimariPrice) { tag.innerHTML = window.KoimariPrice.html(it.price); tag.hidden = false; } else { tag.hidden = true; }
    var nums = sec.querySelector('.kf-nums');
    if (Array.isArray(sc.stats) && sc.stats.length) {
      nums.innerHTML = sc.stats.map(function (st) {
        var dec = Number(st.dec || 0);
        return '<li><span class="kf-nums__v"><b class="kf-count" data-to="' + Number(st.to) + '" data-dec="' + dec + '">' + Number(st.to).toFixed(dec) +
          '</b><span class="kf-nums__u">' + esc(st.unit) + '</span></span><small>' + esc(st.caption) + '</small></li>';
      }).join('');
      nums.hidden = false;
    } else { nums.hidden = true; }
    var pts = Array.isArray(it.points) ? it.points.filter(function (p) { return p && p.title; }) : [];
    var pw = sec.querySelector('.kf-points-wrap');
    if (pts.length) {
      sec.querySelector('.kf-points__head').textContent = pts.length + 'つのこだわり';
      sec.querySelector('.kf-points').innerHTML = pts.map(function (p, k) {
        return '<li><span class="kf-points__n">' + String(k + 1).padStart(2, '0') + '</span><b class="kf-points__t">' + esc(p.title) + '</b><span class="kf-points__x">' + esc(p.text || '') + '</span></li>';
      }).join('');
      pw.hidden = false;
    } else { pw.hidden = true; }
    var more = sec.querySelector('.kf-sig__more');  // 並び替えても正しい商品に飛ぶよう、表示のたびに番号を調べ直す
    more.href = 'product.html?type=' + encodeURIComponent(sc.productType) + '&idx=' + idx + '&n=' + encodeURIComponent(it.name);
    more.hidden = false;
    sec.hidden = false;
    if (window.kfBudoux) window.kfBudoux(sec);  // 組み立てた文も、文節の切れ目でだけ折り返す
    return true;
  }
  var sigAnimated = false;
  function animateSignature() {
    var sec = document.getElementById('kfSignature');
    countUp(sec);
    if (!anim) return;
    var st = { trigger: '#kfSignature', start: 'top 72%' };
    gsap.from('.kf-sig__p1', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'power3.inOut', scrollTrigger: st });
    gsap.from('.kf-sig__p2', { opacity: 0, y: 60, duration: 1.1, ease: E, delay: 0.25, scrollTrigger: st });
    gsap.from('.kf-sig__tag', { opacity: 0, scale: 0.6, duration: 0.7, ease: 'back.out(2)', delay: 0.7, scrollTrigger: st });
    gsap.to('.kf-sig__p2', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '#kfSignature', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.kf-sig__text > *', { opacity: 0, y: 26, duration: 0.9, stagger: 0.08, ease: E, scrollTrigger: { trigger: '.kf-sig__text', start: 'top 82%' } });
    gsap.from('.kf-points-wrap .kf-points__head, .kf-points li', { opacity: 0, y: 30, duration: 0.9, stagger: 0.12, ease: E, scrollTrigger: { trigger: '.kf-points-wrap', start: 'top 85%' } });
    ScrollTrigger.refresh();
  }
  function onMenu(data) {
    if (renderSignature(data) && !sigAnimated) { sigAnimated = true; animateSignature(); }
  }
  window.addEventListener('koimari:menu', function (e) { onMenu(e.detail); });  // トップが商品データを読み込むたび（管理画面で直したときも）届く
  if (window.__koimariMenu) onMenu(window.__koimariMenu);

  // ---- ほかの欄の動き ----
  if (!anim) return;
  gsap.from('.kf-hero__text > *', { opacity: 0, y: 24, duration: 0.9, stagger: 0.1, ease: E, delay: 0.15 });
  gsap.from('.kf-hero__media img', { scale: 1.08, duration: 1.8, ease: E });
  gsap.utils.toArray('.kf-occ .kf-title, .kf-occ .kf-label, .kf-tanuki .kf-title, .kf-tanuki .kf-lead, .kf-tanuki .kf-label, .kf-tanuki .kf-link, .kf-voices .kf-title, .kf-voices .kf-lead, .kf-voices .kf-label, .kf-voices .kf-cta-row, .kf-ec__text > *, .kf-up .kf-title, .kf-up .kf-label, .kf-up__block').forEach(function (el) {
    gsap.from(el, { opacity: 0, y: 26, duration: 0.9, ease: E, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.utils.toArray('.kf-tile, .kf-tanuki__photos img, .kf-strip img, .kf-ec__media img').forEach(function (el, i) {
    gsap.from(el, { opacity: 0, y: 40, duration: 1, ease: E, delay: (i % 4) * 0.06, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
})();
