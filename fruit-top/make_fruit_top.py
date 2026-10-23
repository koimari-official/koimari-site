# こいまり新トップ（試作）を組み立てる（2026-10-23。オーナー「AとB、C-1を準備」「Dも画像を入れたらリリースできるように」「今のページを上書きしないで」）
# いまのトップ（index.html）は一切書き換えない。index.html を読み込み、新しい欄を差し込み、使わない欄は表示だけ隠した
# index-fruit.html（検索に出さない）を書き出す。いまのトップが更新されたら、これを実行し直せば新しい機能もそのまま入る。
# 使い方：python fruit-top/make_fruit_top.py
# 設定（BASEのURL・客単価アップDの画像）は fruit-top/config.json。空の項目は何も表示しない（設定にない画像・文言・価格は出さないルール）
import re, os, json, html as H
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
OUT = os.path.join(SITE, "index-fruit.html")
src = open(os.path.join(SITE, "index.html"), encoding="utf8").read()
cfg = json.load(open(os.path.join(HERE, "config.json"), encoding="utf8"))

def part(name):
    return open(os.path.join(HERE, "sections", name), encoding="utf8").read().strip()

def fill(text, mapping):
    for k, v in mapping.items():
        text = text.replace(k, v)
    left = re.findall(r"\{\{\w+\}\}", text)
    assert not left, left
    return text

def img_ok(name):
    return bool(name) and os.path.isfile(os.path.join(HERE, "img", name))

# ---- C-1 お取り寄せ：BASEのURLが入ったときだけ（最初の画面のボタン・目的別タイル・欄・スマホの固定ボタン） ----
base = (cfg.get("baseShopUrl") or "").strip()
assert base == "" or base.startswith("https://"), "baseShopUrl は https:// で始まるURLにする"
B_URL = H.escape(base, quote=True)
ec = {
    "{{EC_HERO_BUTTON}}": ('<a class="kf-btn" href="%s" target="_blank" rel="noopener">お取り寄せ</a>' % B_URL) if base else "",
    "{{EC_TILE}}": ('<a class="kf-tile kf-tile--wide" href="%s" target="_blank" rel="noopener"><img src="fruit-top/img/kf-osaka-roll.jpg" alt="大阪ロール" loading="lazy" decoding="async">'
                    '<span class="kf-tile__cap"><b>お取り寄せ（全国発送）</b><small>大阪ロール・こいまりロール、焼き菓子・バスクチーズケーキ</small></span></a>' % B_URL) if base else "",
    "{{EC_BAR}}": ('<a href="%s" target="_blank" rel="noopener">お取り寄せ</a>' % B_URL) if base else "",
}
sec_ec = fill(part("ec.html"), {"{{BASE_URL}}": B_URL}) if base else ""

# ---- D 客単価アップ：画像が入った項目だけ。全部空なら欄ごと出さない ----
up = cfg.get("upsell", {})
def up_items(lst):
    out = []
    for it in lst:
        if not img_ok(it.get("image")):
            continue
        name = H.escape(it.get("size") or it.get("name") or "")
        sub = H.escape(it.get("label") or "")
        inner = ('<img src="fruit-top/img/%s" alt="%s" loading="lazy" decoding="async">' % (H.escape(it["image"], quote=True), name)
                 + "<b>%s</b>" % name + ("<small>%s</small>" % sub if sub else ""))
        link = it.get("link")
        out.append('<li class="kf-up__item">%s</li>' % (('<a href="%s">%s</a>' % (H.escape(link, quote=True), inner)) if link else inner))
    return "".join(out)
up_blocks = []
s = up_items(up.get("sizes", []))
if s:
    up_blocks.append('<div class="kf-up__block"><p class="kf-up__ttl">人数の目安</p><p class="kf-up__hint">迷ったら、ひと回り大きいサイズがおすすめです。みんなで取り分けやすくなります。</p><ul class="kf-up__list">%s</ul></div>' % s)
s = up_items(up.get("options", []))
if s:
    up_blocks.append('<div class="kf-up__block"><p class="kf-up__ttl">お祝いを盛り上げるオプション</p><p class="kf-up__hint">ご予約のときに選べます。</p><ul class="kf-up__list">%s</ul></div>' % s)
s = up_items(up.get("gifts", []))
if s:
    up_blocks.append('<div class="kf-up__block"><p class="kf-up__ttl">手土産の焼き菓子も</p><ul class="kf-up__list">%s</ul></div>' % s)
sec_up = ('<!-- ===== 新トップ（試作）：ぴったりのケーキ選び（D）。config.json で画像が入った項目だけ ===== -->\n'
          '<section id="kfUpsell" class="kf-up"><div class="kf-wrap"><p class="kf-label">For your celebration</p><h2 class="kf-title">ぴったりのケーキ選び</h2>%s'
          '<a class="kf-link" href="reservation.html">ご予約はこちら →</a></div></section>' % "".join(up_blocks)) if up_blocks else ""

NEW = {"@kfHero": fill(part("hero.html"), ec), "@kfSignature": part("signature.html"), "@kfOccasions": fill(part("occasions.html"), ec),
       "@kfShop": sec_ec, "@kfUpsell": sec_up, "@kfTanuki": part("tanuki.html"), "@kfVoices": part("voices.html")}

# ---- いまのトップの欄を、入れ子を数えて切り出す（欄の直後の処理<script>はその欄と一緒に。名前のない欄は直前の欄とセット） ----
def section_blocks(text):
    out, pos = [], 0
    for m in re.finditer(r"<section\b", text):
        if m.start() < pos:
            continue
        depth, end = 0, None
        for t in re.finditer(r"<section\b|</section>", text[m.start():]):
            depth += 1 if t.group(0) == "<section" else -1
            if depth == 0:
                end = m.start() + t.end()
                break
        assert end, "section の閉じタグが見つからない"
        sid = (re.match(r'<section[^>]*\bid="([^"]+)"', text[m.start():]) or [None, None])[1]
        out.append((sid, m.start(), end))
        pos = end
    return out

blocks = section_blocks(src)
start, stop = blocks[0][1], blocks[-1][2]
units, seen = {}, []
for k, (sid, a, b) in enumerate(blocks):
    nxt = blocks[k + 1][1] if k + 1 < len(blocks) else stop
    if sid is None:
        units[seen[-1]] += src[a:nxt]
    else:
        units[sid] = src[a:nxt]
        seen.append(sid)

ORDER = ["@kfSignature", "spotlight", "@kfOccasions", "@kfShop", "reserveGuide", "@kfUpsell", "@kfTanuki",
         "recommended", "about", "news", "@kfVoices", "bcal", "shop", "statsKoimari"]
HIDDEN = ["categories", "sugar", "cakeShowcase", "philosophy", "social"]  # 表示だけ隠す（fruit-top.css）
listed = [x for x in ORDER if not x.startswith("@")] + HIDDEN
assert set(units) == set(listed), ("いまのトップの欄が変わったので、並び順（ORDER / HIDDEN）を見直す", set(units) ^ set(listed))
region = "\n\n".join((NEW[x] if x.startswith("@") else units[x]) for x in ORDER if (not x.startswith("@") or NEW[x]))
region += "\n\n<!-- ===== 以下、新トップでは表示しない欄（読み込みの処理を止めないため、HTMLは残す） ===== -->\n" + "\n".join(units[x] for x in HIDDEN)
out = src[:start] + region + src[stop:]

# ---- 新しい最初の画面は、いまの最初の画面（#hero・表示だけ隠す）の位置に置く。宣伝の帯（クーポン・フェア）とヘッダーは、いまと同じくその下に続く ----
old_hero = '<div class="hero" id="hero">'
assert out.count(old_hero) == 1, "いまの最初の画面（#hero）の書き方が変わった"
out = out.replace(old_hero, NEW["@kfHero"] + "\n" + old_hero, 1)

# ---- 看板商品の欄に、トップが読み込んだ商品データ（siteImages）を渡す（試作だけに差し込む。本番の index.html は変えない） ----
hook = "function applyFetchedFeaturedMenu(data){"
assert out.count(hook) == 1, "商品データを当てはめる処理（applyFetchedFeaturedMenu）の書き方が変わった"
out = out.replace(hook, hook + 'try{window.__koimariMenu=data;window.dispatchEvent(new CustomEvent("koimari:menu",{detail:data}));}catch(e){}', 1)
kf_config = json.dumps({"signature": cfg.get("signature")}, ensure_ascii=False).replace("</", "<\\/")

# ---- 隠した欄を指すリンク（上部メニュー「商品・ケーキ」・フッター「商品カテゴリー」など）は、実際にあるページへ付け替える ----
LINK_TO = {"categories": "gallery.html", "sugar": "gallery.html?cat=addon", "cakeShowcase": "gallery.html", "philosophy": "#kfSignature", "social": "#kfVoices"}
for sid in HIDDEN:
    out = out.replace('href="#%s"' % sid, 'href="%s"' % LINK_TO[sid])
assert not re.search(r'href="#(%s)"' % "|".join(HIDDEN), out), "隠した欄を指すリンクが残っている"

# ---- 検索に出さない・見た目と動き・スマホの固定ボタン ----
assert out.count("</head>") == 1 and 'name="robots"' not in out
out = out.replace("</head>", '<meta name="robots" content="noindex,nofollow">\n<link rel="stylesheet" href="fruit-top/fruit-top.css">\n</head>', 1)
out = re.sub(r"<title>(.*?)</title>", lambda m: "<title>%s（新トップ試作）</title>" % m.group(1), out, count=1, flags=re.S)
tail = (fill(part("bar.html"), {"{{EC_BAR}}": ec["{{EC_BAR}}"]}) + "\n"
        '<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>\n'
        '<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>\n'
        '<script id="kfConfig" type="application/json">' + kf_config + '</script>\n'
        '<script src="fruit-top/fruit-top.js"></script>\n'
        # BudouX（Googleの無料ライブラリ）：新しい欄の日本語を文節の切れ目でだけ折り返す（「に。」だけが次の行に落ちるのを防ぐ）
        '<script type="module">\n'
        "import { loadDefaultJapaneseParser } from 'https://cdn.jsdelivr.net/npm/budoux@0.9.3/+esm';\n"
        'const parser = loadDefaultJapaneseParser();\n'
        "const SEL = '.kf-title, .kf-lead, .kf-hero__sub, .kf-points__t, .kf-points__x, .kf-nums small, .kf-tile__cap b, .kf-tile__cap small, .kf-up__item b, .kf-up__hint';\n"
        'window.kfBudoux = (root) => { (root || document).querySelectorAll(SEL).forEach((el) => { if (el.dataset.bdx === el.textContent) return; try { parser.applyToElement(el); el.dataset.bdx = el.textContent; } catch (e) {} }); };\n'
        'window.kfBudoux(document);\n'
        '</script>\n')
i = out.rindex("</body>")
out = out[:i] + tail + out[i:]
open(OUT, "w", encoding="utf8").write(out)
print("written index-fruit.html", len(out), "| お取り寄せ:", "表示" if base else "非表示（BASEのURL未設定）", "| D:", len(up_blocks), "ブロック")
