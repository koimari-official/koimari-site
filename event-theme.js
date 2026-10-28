// イベント特設ページのテーマ（2026-10-19オーナー指示）。
// 絵はすべて無料素材（CC0・パブリックドメイン・いらすとや・LottieFiles・Fluent Emoji）を event-assets/ に保存したもの（出典は event-assets/credits.json と event-assets/christmas/lab/credits.json）。
// オリジナルの絵・背景画像は作らない。ここでは素材の「配置」と「動かし方」だけを決める。
// 使い方：KoimariEventTheme.apply(テーマ名, 飾りを入れる要素)。テーマ名が空なら何もしない。
(function () {
  const A = "event-assets/";
  const THEMES = {
    halloween: {
      label: "ハロウィン", en: "Happy Halloween",
      colors: { bg1: "#2b1740", bg2: "#5a2a6e", accent: "#ff8a1d", ink: "#fff6ea", card: "#fffaf3" },
      font: { family: '"Mochiy Pop One",sans-serif', css: "Mochiy+Pop+One" },
      enFont: { family: '"Creepster",cursive', css: "Creepster" },
      deco: ["pumpkin", "ghost", "witch-hat", "cat", "pumpkin2", "lollipop", "moon", "pumpkin3", "web"],
      flyer: { img: "bat", count: 3, every: 9000, trail: null },
      fall: null,
    },
    christmas: {
      label: "クリスマス", en: "Merry Christmas",
      // 2026-10-28：緑・赤・金のクリスマスカラー／そりはカラーの動く絵（LottieFiles「santa and reindeer」の家の層を外して加工）／軌跡はカラフルなキラキラ／電飾とキャンディのしま模様
      colors: { bg1: "#0b5d33", bg2: "#08391f", accent: "#ffd54a", accent2: "#c8102e", ink: "#fffaf0", card: "#fffdf8" },
      font: { family: '"Kaisei Decol",serif', css: "Kaisei+Decol:wght@500;700" },
      enFont: { family: '"Mountains of Christmas",cursive', css: "Mountains+of+Christmas:wght@700" },
      deco: ["tree", "wreath", "bells", "gingerbread", "candy-canes", "snowman", "star", "gingerbread2", "santa"],
      flyer: { lottie: "christmas/lab/sleigh-a.json", count: 1, every: 13000, trail: "color", size: [150, 230] },
      fall: { img: "snowflake", count: 16 },
      lights: true, stripe: true,
    },
    newyear: {
      label: "お正月", en: "Happy New Year",
      colors: { bg1: "#7d0f1c", bg2: "#b4202f", accent: "#e3be5c", ink: "#fff8ec", card: "#fffbf4" },
      font: { family: '"Yuji Syuku",serif', css: "Yuji+Syuku" },
      enFont: { family: '"Cinzel Decorative",serif', css: "Cinzel+Decorative:wght@700" },
      deco: ["kadomatsu", "daruma", "crane", "maneki", "kadomatsu2", "daruma2", "pine", "crane2", "firework"],
      flyer: { img: "crane", count: 1, every: 13000, trail: "common/sparkle" },
      fall: { img: "common/sparkle2", count: 10 },
    },
    valentine: {
      label: "バレンタイン", en: "Happy Valentine",
      colors: { bg1: "#4a1424", bg2: "#a3304b", accent: "#ffc2cf", ink: "#fff6f8", card: "#fffafb" },
      font: { family: '"Zen Kurenaido",sans-serif', css: "Zen+Kurenaido" },
      enFont: { family: '"Great Vibes",cursive', css: "Great+Vibes" },
      deco: ["chocolate", "heart", "rose", "letter", "chocolate2", "ribbon", "cupid", "heart2", "balloons"],
      flyer: null,
      rise: { img: "heart", count: 12 },
    },
    hinamatsuri: {
      label: "ひな祭り", en: "Hinamatsuri",
      colors: { bg1: "#f7d7e0", bg2: "#f2b7c8", accent: "#c2405f", ink: "#5a2233", card: "#fffafb", dark: true },
      font: { family: '"Kiwi Maru",serif', css: "Kiwi+Maru:wght@500" },
      enFont: { family: '"Great Vibes",cursive', css: "Great+Vibes" },
      deco: ["dolls", "hishimochi", "bonbori", "peach", "arare", "tsurushibina", "blossom", "sakura-tree"],
      flyer: null,
      fall: { img: "blossom", count: 14 },
    },
    kodomonohi: {
      label: "こどもの日", en: "Children's Day",
      colors: { bg1: "#bfe6fb", bg2: "#e6f6ff", accent: "#1f6fb2", ink: "#173a5c", card: "#ffffff", dark: true },
      font: { family: '"Mochiy Pop P One",sans-serif', css: "Mochiy+Pop+P+One" },
      enFont: { family: '"Fredoka",sans-serif', css: "Fredoka:wght@600" },
      deco: ["koinobori", "iris", "koi-blue", "balloons", "koi-red", "paper-plane", "koinobori2", "iris-row"],
      flyer: { img: "koi-blue", count: 1, every: 12000, trail: null, swim: true },
      fall: null,
    },
    sakura: {
      label: "卒業・入学", en: "Congratulations",
      colors: { bg1: "#fbe3ea", bg2: "#f6c9d6", accent: "#b8466a", ink: "#55263a", card: "#fffbfc", dark: true },
      font: { family: '"Klee One",serif', css: "Klee+One:wght@600" },
      enFont: { family: '"Great Vibes",cursive', css: "Great+Vibes" },
      deco: ["branch", "cap", "randoseru", "diploma", "branch2", "bouquet", "kids", "certificate", "tree"],
      flyer: { img: "cap2", count: 1, every: 13000, trail: "common/sparkle", toss: true },
      fall: { img: "hinamatsuri/blossom", count: 18 },
    },
    mothersday: {
      label: "母の日", en: "Mother's Day",
      colors: { bg1: "#fde6ea", bg2: "#f7c6cf", accent: "#c0394f", ink: "#5b2330", card: "#fffbfb", dark: true },
      font: { family: '"Zen Kurenaido",sans-serif', css: "Zen+Kurenaido" },
      enFont: { family: '"Great Vibes",cursive', css: "Great+Vibes" },
      deco: ["carnation", "bouquet", "gift", "flowers", "rose", "lily", "flower", "gift2"],
      flyer: null,
      fall: { img: "flower", count: 10 },
    },
  };
  const img = (theme, name) => A + (name.indexOf("/") >= 0 ? name : theme + "/" + name) + ".png";
  const reduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function loadFont(f) {
    if (!f || document.getElementById("evfont-" + f.css)) return;
    const l = document.createElement("link"); l.id = "evfont-" + f.css; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + f.css + "&display=swap"; document.head.appendChild(l);
  }
  function injectCss() {
    if (document.getElementById("ev-theme-css")) return;
    const st = document.createElement("style"); st.id = "ev-theme-css";
    st.textContent = `
.ev-on{background:linear-gradient(160deg,var(--ev-bg1),var(--ev-bg2)) fixed!important}
.ev-hero{position:relative;text-align:center;padding:26px 12px 18px;margin:0 0 22px;overflow:visible}
.ev-hero__en{display:block;font-family:var(--ev-en);font-size:clamp(34px,7vw,64px);color:var(--ev-accent);line-height:1.1;text-shadow:0 2px 0 rgba(0,0,0,.15);letter-spacing:.02em}
.ev-hero__ja{display:inline-block;margin-top:6px;font-family:var(--ev-font);font-size:clamp(15px,2.4vw,19px);color:var(--ev-ink);letter-spacing:.18em;padding:4px 14px;border-top:1px solid var(--ev-accent);border-bottom:1px solid var(--ev-accent)}
.ev-deco{position:absolute;pointer-events:none;z-index:2;filter:drop-shadow(0 4px 8px rgba(0,0,0,.18));animation:ev-bob 4.5s ease-in-out infinite}
@keyframes ev-bob{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-10px) rotate(calc(var(--r,0deg) + 4deg))}}
.ev-on .nw-head__en,.ev-on .nw-head__ja{color:var(--ev-ink)!important}
.ev-on .nw-head__line{background:linear-gradient(90deg,transparent,var(--ev-accent),transparent)!important}
.ev-on .nw-card{border-color:var(--ev-accent)!important;box-shadow:0 22px 60px rgba(0,0,0,.28)!important;background:var(--ev-card)!important}
.ev-on .nw-title{font-family:var(--ev-font)!important}
.ev-on .nw-tag{border-color:var(--ev-accent2)!important;color:var(--ev-accent2)!important}
.ev-on .nw-link{background:var(--ev-accent2)!important}
.ev-on .nw-back{color:var(--ev-ink)!important}
.ev-on .footer{background:rgba(0,0,0,.35)!important}
.ev-layer{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden}
.ev-fall{position:absolute;top:-60px;opacity:.85;animation:ev-fall linear infinite}
@keyframes ev-fall{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(var(--dx,40px),110vh) rotate(360deg)}}
.ev-rise{position:absolute;bottom:-60px;opacity:.8;animation:ev-rise linear infinite}
@keyframes ev-rise{0%{transform:translate(0,0) scale(.8)}100%{transform:translate(var(--dx,-30px),-115vh) scale(1.1)}}
.ev-flyer{position:absolute;left:0;will-change:transform}
.ev-spark{position:absolute;width:18px;height:18px;pointer-events:none;animation:ev-spark 1.3s ease-out forwards}
@keyframes ev-spark{0%{opacity:1;transform:translate(0,0) scale(1) rotate(0)}100%{opacity:0;transform:translate(var(--sx,0),var(--sy,30px)) scale(.3) rotate(160deg)}}
.ev-christmas .ev-fall{filter:brightness(0) invert(1) drop-shadow(0 0 3px rgba(255,255,255,.6))}
.ev-gold{filter:sepia(1) saturate(4) hue-rotate(5deg) brightness(1.15) drop-shadow(0 0 6px rgba(255,210,90,.8))}
.ev-flyer--lottie{top:0;visibility:hidden}
.ev-flyer--lottie svg{display:block;width:100%;height:auto}
.ev-cspark{position:absolute;pointer-events:none}
.ev-star4{clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)}
.ev-hero--lights{padding-top:40px}
.ev-lights{position:absolute;left:0;right:0;top:0;height:30px;z-index:3;display:flex;justify-content:space-around;align-items:flex-start;pointer-events:none}
.ev-lights::before{content:"";position:absolute;left:-4%;right:-4%;top:-12px;height:26px;border-bottom:2px solid rgba(20,40,28,.85);border-radius:0 0 50% 50%/0 0 100% 100%}
.ev-lights i{width:10px;height:15px;margin-top:11px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;animation:ev-twinkle 1.6s ease-in-out infinite}
.ev-lights i:nth-child(5n+1){background:#ff3b4e;box-shadow:0 0 9px #ff3b4e}
.ev-lights i:nth-child(5n+2){background:#ffd54a;box-shadow:0 0 9px #ffd54a;animation-delay:.3s}
.ev-lights i:nth-child(5n+3){background:#36d07a;box-shadow:0 0 9px #36d07a;animation-delay:.6s}
.ev-lights i:nth-child(5n+4){background:#4fc3ff;box-shadow:0 0 9px #4fc3ff;animation-delay:.9s}
.ev-lights i:nth-child(5n+5){background:#ff8fd0;box-shadow:0 0 9px #ff8fd0;animation-delay:1.2s}
@keyframes ev-twinkle{0%,100%{opacity:1}50%{opacity:.35}}
.ev-stripe{height:14px;margin:0 0 22px;border-radius:7px;background:repeating-linear-gradient(-45deg,#d7263d 0 12px,#fff 12px 24px);box-shadow:0 2px 8px rgba(0,0,0,.15)}
.ev-products{margin:32px 0 0}
.ev-products__title{text-align:center;font-family:var(--ev-font,inherit);font-size:clamp(20px,2.6vw,26px);margin:0 0 6px;letter-spacing:.1em}
.ev-products__lead{text-align:center;font-size:14px;color:#6b5a4a;margin:0 0 18px}
.ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.ev-item{display:block;background:#fff;border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:0 6px 18px rgba(0,0,0,.08);transition:transform .25s,box-shadow .25s;position:relative}
.ev-item:hover{transform:translateY(-4px) rotate(-.6deg);box-shadow:0 14px 30px rgba(0,0,0,.16)}
.ev-item img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#f3ece1}
.ev-item__name{font-size:14px;font-weight:700;line-height:1.45;padding:9px 10px 2px}
.ev-item__price{font-size:13.5px;color:var(--ev-accent2,#a88a52);font-weight:700;padding:0 10px 11px}
@media(max-width:600px){.ev-hero{padding:22px 54px 16px}.ev-grid{grid-template-columns:repeat(2,1fr);gap:10px}.ev-item__name{font-size:13px}}
@media (prefers-reduced-motion: reduce){.ev-deco,.ev-fall,.ev-rise,.ev-lights i{animation:none}}
`;
    document.head.appendChild(st);
  }
  // 見出し部分の飾り（左右に素材を散らす）
  function heroDeco(theme, t, host) {
    const spots = [[-2, 4, 70, -8], [86, 0, 76, 8], [4, 62, 58, 6], [90, 64, 54, -6], [18, -10, 46, 10], [74, -12, 48, -10]];
    const names = t.deco.slice(0, window.innerWidth < 600 ? 4 : 6);
    names.forEach((n, i) => {
      const s = spots[i]; const el = document.createElement("img");
      el.className = "ev-deco"; el.src = img(theme, n); el.alt = ""; el.loading = "lazy";
      const w = window.innerWidth < 600 ? s[2] * 0.72 : s[2];
      el.style.cssText = "left:" + s[0] + "%;top:" + s[1] + "%;width:" + w + "px;--r:" + s[3] + "deg;animation-delay:" + (i * 0.6) + "s";
      host.appendChild(el);
    });
  }
  // 降ってくる／昇っていく素材
  function particles(theme, conf, cls, layer) {
    const n = window.innerWidth < 600 ? Math.ceil(conf.count * 0.6) : conf.count;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("img");
      el.className = cls; el.src = img(theme, conf.img); el.alt = "";
      const size = 14 + Math.random() * 22;
      el.style.cssText = "left:" + (Math.random() * 100) + "%;width:" + size + "px;animation-duration:" + (9 + Math.random() * 10) + "s;animation-delay:" + (-Math.random() * 18) + "s;--dx:" + (Math.random() * 120 - 60) + "px";
      layer.appendChild(el);
    }
  }
  // ときどき画面の外から横切る（クリスマスはそりが金の星を散らしながら）
  function flyer(theme, conf, layer) {
    const once = () => {
      if (document.hidden) return;
      const w = window.innerWidth, h = window.innerHeight;
      const el = document.createElement("img");
      el.className = "ev-flyer" + (conf.tint === "gold" ? " ev-gold" : ""); el.src = img(theme, conf.img); el.alt = "";
      const size = conf.toss ? (w < 600 ? 70 : 110) : (w < 600 ? 140 : 230);
      const y0 = h * (0.12 + Math.random() * 0.25), y1 = y0 - h * 0.08;
      const ltr = Math.random() < 0.5 || conf.swim;
      el.style.width = size + "px"; el.style.top = "0";
      if (!ltr) el.style.transform = "scaleX(-1)";
      layer.appendChild(el);
      const dur = 7000 + Math.random() * 2500, t0 = performance.now();
      let lastSpark = 0;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const x = ltr ? -size + (w + size * 2) * p : w + size - (w + size * 2) * p;
        const y = conf.toss ? y0 + h * 0.25 - Math.sin(p * Math.PI) * h * 0.3 : y0 + (y1 - y0) * p + Math.sin(p * Math.PI * 3) * 14;
        el.style.transform = "translate(" + x + "px," + y + "px)" + (ltr ? "" : " scaleX(-1)") + (conf.swim ? " rotate(" + Math.sin(p * 20) * 4 + "deg)" : "") + (conf.toss ? " rotate(" + (p * 540) + "deg)" : "");
        if (conf.trail && now - lastSpark > 70) {
          lastSpark = now;
          const sp = document.createElement("img"); sp.className = "ev-spark ev-gold"; sp.src = img(theme, conf.trail); sp.alt = "";
          sp.style.left = (x + (ltr ? 10 : size - 20)) + "px"; sp.style.top = (y + size * 0.35 + Math.random() * 20) + "px";
          sp.style.setProperty("--sx", (Math.random() * 40 - 20) + "px"); sp.style.setProperty("--sy", (20 + Math.random() * 50) + "px");
          layer.appendChild(sp); setTimeout(() => sp.remove(), 1400);
        }
        if (p < 1) requestAnimationFrame(step); else el.remove();
      };
      requestAnimationFrame(step);
    };
    for (let i = 0; i < (conf.count || 1); i++) setTimeout(once, 1500 + i * 900);
    setInterval(() => { for (let i = 0; i < (conf.count || 1); i++) setTimeout(once, i * 900); }, conf.every || 12000);
  }
  // Lottie（動く絵）を読み込む。lottie-web は cdnjs から必要なときだけ読む
  let lottieLib = null;
  function loadLottieLib() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (!lottieLib) lottieLib = new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"; sc.onload = () => res(window.lottie); sc.onerror = rej; document.head.appendChild(sc); });
    return lottieLib;
  }
  // Lottie は中身の余白が大きいので、何コマか描いて、実際に絵がある範囲だけを見せる
  function cropLottie(anim, svg) {
    try {
      const g = svg.querySelector("g"); let box = null; const n = Math.max(1, Math.floor(anim.totalFrames));
      for (let i = 0; i < 8; i++) {
        anim.goToAndStop(Math.floor(n * i / 8), true);
        const b = g.getBBox(); if (!b.width) continue;
        box = box ? { x1: Math.min(box.x1, b.x), y1: Math.min(box.y1, b.y), x2: Math.max(box.x2, b.x + b.width), y2: Math.max(box.y2, b.y + b.height) } : { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height };
      }
      if (box) { svg.setAttribute("viewBox", (box.x1 - 6) + " " + (box.y1 - 6) + " " + (box.x2 - box.x1 + 12) + " " + (box.y2 - box.y1 + 12)); svg.removeAttribute("width"); svg.removeAttribute("height"); }
    } catch (e) {}
  }
  // カラフルなキラキラ（赤・緑・金・白・ピンクの星と光の粒が、瞬きながら舞い落ちる）。絵ではなく色の形だけ
  const SPARK_COLORS = ["#ff3b4e", "#36d07a", "#ffd54a", "#ffffff", "#ff8fd0"];
  function colorSpark(layer, x, y) {
    const s = document.createElement("span"), c = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)], dot = Math.random() < 0.4;
    const size = dot ? 3 + Math.random() * 4 : 7 + Math.random() * 11;
    s.className = "ev-cspark" + (dot ? "" : " ev-star4");
    s.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + size + "px;height:" + size + "px;background:" + c + ";border-radius:" + (dot ? "50%" : "0") + ";box-shadow:0 0 " + (dot ? 6 : 10) + "px " + c + (dot ? "" : ";filter:drop-shadow(0 0 4px " + c + ")");
    layer.appendChild(s);
    const dx = (Math.random() - 0.5) * 30, dy = 18 + Math.random() * 40, rot = (Math.random() - 0.5) * 180;
    if (!s.animate) { setTimeout(() => s.remove(), 1200); return; }
    s.animate([
      { opacity: 0, transform: "translate(0,0) scale(.2) rotate(0deg)" },
      { opacity: 1, transform: "translate(" + dx * 0.3 + "px," + dy * 0.2 + "px) scale(1.15) rotate(" + rot * 0.4 + "deg)", offset: 0.25 },
      { opacity: 0.85, transform: "translate(" + dx * 0.6 + "px," + dy * 0.6 + "px) scale(.75) rotate(" + rot * 0.8 + "deg)", offset: 0.6 },
      { opacity: 0, transform: "translate(" + dx + "px," + dy + "px) scale(.3) rotate(" + rot + "deg)" },
    ], { duration: 1300 + Math.random() * 700, easing: "ease-out" }).onfinish = () => s.remove();
  }
  // 動く絵のそりが、ときどき左から右へ横切る（1つの絵を使い回す）
  function lottieFlyer(conf, layer) {
    let el = null, anim = null, ready = null, flying = false;
    const make = () => ready || (ready = Promise.all([loadLottieLib(), fetch(A + conf.lottie).then((r) => r.json())]).then(([lot, data]) => {
      el = document.createElement("div"); el.className = "ev-flyer ev-flyer--lottie"; layer.appendChild(el);
      anim = lot.loadAnimation({ container: el, renderer: "svg", loop: true, autoplay: false, animationData: data });
      return new Promise((res) => anim.addEventListener("DOMLoaded", () => { cropLottie(anim, el.querySelector("svg")); res(); }));
    }));
    const once = () => {
      if (document.hidden || flying) return;
      make().then(() => {
        if (flying) return; flying = true;
        const w = window.innerWidth, h = window.innerHeight, size = w < 600 ? conf.size[0] : conf.size[1];
        el.style.width = size + "px"; el.style.visibility = "visible"; anim.play();
        const y0 = h * (0.1 + Math.random() * 0.22), dur = 7500 + Math.random() * 2500, t0 = performance.now(); let last = 0;
        const step = (now) => {
          const p = Math.min(1, (now - t0) / dur), H = el.offsetHeight || size * 0.5;
          const x = -size - 20 + (w + size + 60) * p, y = y0 - h * 0.1 * Math.sin(p * Math.PI) + Math.sin(now / 260) * 4;
          el.style.transform = "translate(" + x + "px," + y + "px) rotate(" + (-4 + Math.cos(p * Math.PI) * 4) + "deg)";
          if (conf.trail === "color" && now - last > 50 && x > -size * 0.6 && x < w) {
            last = now;
            colorSpark(layer, x + size * 0.12, y + H * 0.55 + (Math.random() - 0.5) * H * 0.3);
            colorSpark(layer, x + size * 0.05, y + H * 0.6 + (Math.random() - 0.5) * H * 0.4);
          }
          if (p < 1) requestAnimationFrame(step); else { el.style.visibility = "hidden"; anim.pause(); flying = false; }
        };
        requestAnimationFrame(step);
      }).catch(() => {});
    };
    setTimeout(once, 1500); setInterval(once, conf.every || 12000);
  }
  function apply(theme, heroHost) {
    const t = THEMES[theme]; if (!t) return null;
    injectCss(); loadFont(t.font); loadFont(t.enFont);
    const r = document.documentElement.style, c = t.colors;
    r.setProperty("--ev-bg1", c.bg1); r.setProperty("--ev-bg2", c.bg2); r.setProperty("--ev-accent", c.accent);
    r.setProperty("--ev-accent2", c.accent2 || (c.dark ? c.accent : c.bg2)); r.setProperty("--ev-ink", c.ink); r.setProperty("--ev-card", c.card);
    r.setProperty("--ev-font", t.font.family); r.setProperty("--ev-en", t.enFont.family);
    document.body.classList.add("ev-on", "ev-" + theme);
    if (heroHost) {
      const hero = document.createElement("div"); hero.className = "ev-hero";
      hero.innerHTML = '<span class="ev-hero__en">' + t.en + '</span><span class="ev-hero__ja">' + t.label + "特集</span>";
      heroHost.parentNode.insertBefore(hero, heroHost);
      heroDeco(theme, t, hero);
      if (t.lights) { hero.classList.add("ev-hero--lights"); const g = document.createElement("div"); g.className = "ev-lights"; g.innerHTML = "<i></i>".repeat(window.innerWidth < 600 ? 11 : 20); hero.appendChild(g); }
      if (t.stripe) { const st = document.createElement("div"); st.className = "ev-stripe"; heroHost.parentNode.insertBefore(st, heroHost); }
    }
    if (!reduce()) {
      const layer = document.createElement("div"); layer.className = "ev-layer"; document.body.appendChild(layer);
      if (t.fall) particles(theme, t.fall, "ev-fall", layer);
      if (t.rise) particles(theme, t.rise, "ev-rise", layer);
      if (t.flyer && t.flyer.lottie) lottieFlyer(t.flyer, layer); // 動く絵（Lottie）のそり
      else if (t.flyer) flyer(theme, t.flyer, layer);
    }
    return t;
  }
  window.KoimariEventTheme = {
    apply, THEMES,
    list: Object.keys(THEMES).map((k) => ({ key: k, label: THEMES[k].label })),
  };
})();
