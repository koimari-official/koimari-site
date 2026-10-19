// イベント特設ページのテーマ（2026-10-19オーナー指示）。
// 絵はすべて無料素材（CC0・パブリックドメイン・いらすとや）を event-assets/ に保存したもの（出典は event-assets/credits.json）。
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
      colors: { bg1: "#0f3d2e", bg2: "#7a1424", accent: "#e8c25a", ink: "#fffaf0", card: "#fffdf8" },
      font: { family: '"Kaisei Decol",serif', css: "Kaisei+Decol:wght@500;700" },
      enFont: { family: '"Mountains of Christmas",cursive', css: "Mountains+of+Christmas:wght@700" },
      deco: ["tree", "wreath", "bells", "gingerbread", "candy-canes", "snowman", "star", "gingerbread2", "santa"],
      flyer: { img: "sleigh", count: 1, every: 14000, trail: "common/sparkle", tint: "gold" },
      fall: { img: "snowflake", count: 16 },
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
@media (prefers-reduced-motion: reduce){.ev-deco,.ev-fall,.ev-rise{animation:none}}
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
  function apply(theme, heroHost) {
    const t = THEMES[theme]; if (!t) return null;
    injectCss(); loadFont(t.font); loadFont(t.enFont);
    const r = document.documentElement.style, c = t.colors;
    r.setProperty("--ev-bg1", c.bg1); r.setProperty("--ev-bg2", c.bg2); r.setProperty("--ev-accent", c.accent);
    r.setProperty("--ev-accent2", c.dark ? c.accent : c.bg2); r.setProperty("--ev-ink", c.ink); r.setProperty("--ev-card", c.card);
    r.setProperty("--ev-font", t.font.family); r.setProperty("--ev-en", t.enFont.family);
    document.body.classList.add("ev-on", "ev-" + theme);
    if (heroHost) {
      const hero = document.createElement("div"); hero.className = "ev-hero";
      hero.innerHTML = '<span class="ev-hero__en">' + t.en + '</span><span class="ev-hero__ja">' + t.label + "特集</span>";
      heroHost.parentNode.insertBefore(hero, heroHost);
      heroDeco(theme, t, hero);
    }
    if (!reduce()) {
      const layer = document.createElement("div"); layer.className = "ev-layer"; document.body.appendChild(layer);
      if (t.fall) particles(theme, t.fall, "ev-fall", layer);
      if (t.rise) particles(theme, t.rise, "ev-rise", layer);
      if (t.flyer) flyer(theme, t.flyer, layer);
    }
    return t;
  }
  window.KoimariEventTheme = {
    apply, THEMES,
    list: Object.keys(THEMES).map((k) => ({ key: k, label: THEMES[k].label })),
  };
})();
