// こいまりHPの公開データ（Firebase RTDB・公開読み取り）から、検索エンジン・AIが読める静的ファイルを作る。
// 作るもの：catalog.html（商品一覧）／index.html のメニュー構造化データ（AUTO:MENU-JSONLD）／llms.txt／sitemap.xml の catalog の更新日
// 決まり：価格は入れない（オーナー決定 2026-11-09）／非表示の商品は出さない（site の gallery と同じ条件）／取得に失敗したら何も書き換えずに止まる
// 使い方：node tools/build-static.mjs   （GitHub Actions の .github/workflows/build-static.yml が30分ごとに実行）
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://koimari-official.github.io/koimari-site/";
const DB = "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app";
const STORE = "ケーキ屋さん こいまり 城東店";
const ADDRESS = "〒536-0007 大阪府大阪市城東区成育2丁目13-15 アイビーマンション1階";
const TEL = "070-9158-0641";

const SOURCES = [
  { id: "decorationCakes", label: "デコレーションケーキ", path: "siteImages/decorationCakes" },
  { id: "cutcakes", label: "カットケーキ", path: "siteImages/cutcakes" },
  { id: "rollcakes", label: "ロールケーキ", path: "siteImages/rollcakes" },
  { id: "baked", label: "焼き菓子", path: "siteImages/baked" },
  { id: "gift", label: "ギフト", path: "siteImages/gift" },
  { id: "custom", label: "オーダーケーキの作例", path: "koimariContent/gallery", gallery: true },
];

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (s) => String(s ?? "").replace(/<\s*br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const paragraphs = (s) => String(s ?? "").replace(/<\s*br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
const jsonForHtml = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

async function fetchJson(url) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error("取得に失敗: " + url + " (" + last + ")");
}

function normalize(raw, src) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.visible === false) return null; // 非表示は出さない（gallery.html と同じ条件）
  const img = typeof raw.img === "string" ? raw.img : "";
  if (!img.startsWith("https://")) return null; // 写真のないもの・埋め込みデータは出さない（gallery.html と同じ）
  const name = plain(src.gallery ? raw.title : raw.name);
  if (!name || name === "新しい商品") return null;
  const descParas = src.gallery ? paragraphs([raw.lead, raw.desc].filter(Boolean).join("\n")) : paragraphs(raw.desc);
  const descText = descParas.join(" ");
  const first = descText.split("。")[0];
  const alt = (first && first !== descText ? first + "。" : descText).slice(0, 90);
  return {
    name,
    descParas,
    descText,
    img,
    alt: alt ? name + "。" + alt : name,
    size: src.gallery ? plain(raw.size) : "",
    notForSale: !!raw.notForSale,
    seasonal: !!raw.seasonal,
  };
}

function buildMenuJsonLd(sections) {
  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": SITE,
    hasMenu: {
      "@type": "Menu",
      name: "商品一覧",
      url: SITE + "catalog.html",
      hasMenuSection: sections.map((s) => ({
        "@type": "MenuSection",
        name: s.label,
        hasMenuItem: s.items.map((it) => {
          const o = { "@type": "MenuItem", name: it.name, image: it.img };
          if (it.descText) o.description = it.descText;
          return o;
        }),
      })),
    },
  };
}

function buildCatalogHtml(sections) {
  const desc = `大阪市城東区のケーキ屋さん ${STORE} の商品一覧。デコレーションケーキ・カットケーキ・ロールケーキ・焼き菓子・ギフト・オーダーケーキの作例を、文章と写真でご紹介します。`;
  const nav = sections.map((s) => `<a href="#cat-${s.id}">${esc(s.label)}</a>`).join("");
  const body = sections.map((s) => {
    const cards = s.items.map((it) => {
      const paras = it.descParas.map((p) => `<p>${esc(p)}</p>`).join("");
      const sizeLine = it.size ? `<p class="meta">サイズ：${esc(it.size)}</p>` : "";
      const note = it.notForSale ? `<p class="meta">ただいま販売をお休みしています。</p>` : "";
      return `<article class="item"><h3>${esc(it.name)}</h3><img src="${esc(it.img)}" alt="${esc(it.alt)}" loading="lazy" decoding="async">${sizeLine}${paras}${note}</article>`;
    }).join("\n");
    return `<section id="cat-${s.id}"><h2>${esc(s.label)}</h2><div class="grid">\n${cards}\n</div></section>`;
  }).join("\n");
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: STORE, item: SITE },
      { "@type": "ListItem", position: 2, name: "商品一覧", item: SITE + "catalog.html" },
    ],
  };
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>商品一覧｜${STORE}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${SITE}catalog.html">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${STORE}">
<meta property="og:title" content="商品一覧｜${STORE}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}catalog.html">
<meta property="og:image" content="${SITE}ogp.jpg">
<link rel="icon" href="favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${jsonForHtml(breadcrumb)}</script>
<style>
:root{--cream:#F7F3EE;--brown:#4A3A2A;--gold:#C9A96E;--line:#e3d6c2}
*{box-sizing:border-box}
body{margin:0;background:var(--cream);color:var(--brown);font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",sans-serif;font-size:17px;line-height:1.9}
header,main,footer{max-width:980px;margin:0 auto;padding:0 20px}
header{padding-top:28px}
header a{color:var(--brown);text-decoration:none;font-weight:700}
h1{font-size:28px;margin:22px 0 8px;line-height:1.5}
h2{font-size:23px;margin:48px 0 16px;padding-bottom:8px;border-bottom:1px solid var(--gold)}
h3{font-size:18px;margin:0 0 10px;line-height:1.6}
.lead{margin:0 0 18px}
.catnav{display:flex;flex-wrap:wrap;gap:10px 18px;margin:18px 0 0}
.catnav a{color:var(--brown)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:30px 24px}
.item{background:#fff;border:1px solid var(--line);padding:16px 16px 18px}
.item img{display:block;width:100%;height:auto;margin:0 0 12px}
.item p{margin:0 0 8px;font-size:16px}
.item .meta{font-size:15px}
.links{margin:40px 0 0}
.links a{color:var(--brown);margin-right:18px}
footer{padding-top:36px;padding-bottom:48px;font-size:15px}
</style>
</head>
<body>
<header><a href="./">${STORE}</a></header>
<main>
<h1>商品一覧</h1>
<p class="lead">大阪市城東区のケーキ屋さん「${STORE}」の商品を、文章と写真でご紹介します。お値段・販売の状況は日々変わるため、店頭・お電話・LINEでご確認ください。</p>
<nav class="catnav" aria-label="カテゴリー">${nav}</nav>
${body}
<p class="links"><a href="gallery.html">写真でじっくり見る</a><a href="shop.html">店舗情報・アクセス</a><a href="reservation.html">ご予約について</a><a href="faq.html">よくあるご質問</a></p>
</main>
<footer>${STORE}<br>${ADDRESS}<br>電話 ${TEL}</footer>
</body>
</html>
`;
}

function buildLlmsTxt(sections) {
  const lines = [
    `# ${STORE}`,
    "",
    `> 大阪市城東区のケーキ屋さん。「フルーツリッチ」が自慢で、果物をたっぷり使ったケーキ・焼き菓子・ギフト・オーダーケーキをお作りしています。`,
    "",
    `- 住所：${ADDRESS}`,
    `- 電話：${TEL}`,
    `- ご予約：LINE公式アカウントまたはお電話。営業日・営業時間は下の「営業日カレンダー」を参照`,
    `- お値段は載せていません。店頭・お電話・LINEでご確認ください`,
    "",
    "## 主なページ",
    "",
    `- [商品一覧（文章と写真）](${SITE}catalog.html): 公開中の商品の名前と説明`,
    `- [ギャラリー](${SITE}gallery.html): 写真で見る商品とオーダーケーキの作例`,
    `- [クリスマスケーキ](${SITE}christmas.html): クリスマスケーキの特設ページ`,
    `- [店舗情報・アクセス](${SITE}shop.html)`,
    `- [営業日カレンダー](${SITE}calendar.html)`,
    `- [ご予約について](${SITE}reservation.html)`,
    `- [よくあるご質問](${SITE}faq.html)`,
    `- [お知らせ](${SITE}news.html)`,
    `- [法人・企業・団体のお客様](${SITE}corporate.html)`,
    "",
    "## 商品のカテゴリー",
    "",
    ...sections.map((s) => `- ${s.label}（${s.items.length}品）`),
    "",
  ];
  return lines.join("\n");
}

async function writeIfChanged(rel, content) {
  const file = path.join(ROOT, rel);
  let old = null;
  try { old = await readFile(file, "utf8"); } catch { /* 無ければ新規 */ }
  if (old === content) return false;
  await writeFile(file, content, "utf8");
  return true;
}

async function main() {
  const sections = [];
  let hiddenCount = 0;
  for (const src of SOURCES) {
    const data = await fetchJson(`${DB}/${src.path}.json`);
    const list = Array.isArray(data) ? data : data && typeof data === "object" ? Object.values(data) : [];
    if (!list.length) throw new Error("データが空: " + src.path);
    const items = [];
    for (const raw of list) {
      const it = normalize(raw, src);
      if (it) items.push(it); else hiddenCount++;
    }
    sections.push({ id: src.id, label: src.label, items });
  }
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  if (total < 20) throw new Error("公開商品が少なすぎる（" + total + "件）。取得の異常とみなして中止");

  const warnings = [];
  for (const s of sections) for (const it of s.items) {
    if (!it.descText) warnings.push(`説明文が空: [${s.label}] ${it.name}`);
    if (/ハロウィン|限定/.test(it.name)) warnings.push(`名前に季節・限定の語: [${s.label}] ${it.name}`);
  }

  const changed = [];
  const catalogChanged = await writeIfChanged("catalog.html", buildCatalogHtml(sections));
  if (catalogChanged) changed.push("catalog.html");
  if (await writeIfChanged("llms.txt", buildLlmsTxt(sections))) changed.push("llms.txt");

  // index.html のメニュー構造化データ（マーカーの間だけ書き換える）
  const START = "<!--AUTO:MENU-JSONLD-START-->";
  const END = "<!--AUTO:MENU-JSONLD-END-->";
  const indexPath = "index.html";
  const indexHtml = await readFile(path.join(ROOT, indexPath), "utf8");
  const a = indexHtml.indexOf(START);
  const b = indexHtml.indexOf(END);
  if (a < 0 || b < a) throw new Error("index.html に AUTO:MENU-JSONLD のマーカーがありません");
  const block = `${START}\n<script type="application/ld+json" id="koimari-menu-jsonld">${jsonForHtml(buildMenuJsonLd(sections))}</script>\n${END}`;
  const nextIndex = indexHtml.slice(0, a) + block + indexHtml.slice(b + END.length);
  if (await writeIfChanged(indexPath, nextIndex)) changed.push(indexPath);

  // catalog が変わったときだけ sitemap の更新日を今日（日本時間）に
  if (catalogChanged) {
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const sm = await readFile(path.join(ROOT, "sitemap.xml"), "utf8");
    const re = /(<loc>[^<]*\/catalog\.html<\/loc><lastmod>)[0-9-]+(<\/lastmod>)/;
    if (!re.test(sm)) throw new Error("sitemap.xml に catalog.html の行がありません");
    if (await writeIfChanged("sitemap.xml", sm.replace(re, `$1${today}$2`))) changed.push("sitemap.xml");
  }

  console.log("カテゴリー別の公開数：" + sections.map((s) => `${s.label} ${s.items.length}`).join(" / "));
  console.log(`出さなかったもの（非表示・写真なし等）：${hiddenCount}件`);
  warnings.forEach((w) => console.log("注意: " + w));
  console.log(changed.length ? "更新: " + changed.join(", ") : "更新なし");
}

main().catch((e) => { console.error("失敗: " + e.message); process.exit(1); });
