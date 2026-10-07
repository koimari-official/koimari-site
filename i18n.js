/* Koimari i18n — English translation module
 * To update translations: open admin.html → 英語翻訳タブ → AI翻訳 → 保存
 */
const KOIMARI_I18N_EN = {
  // Navigation
  'nav.home':      'Home',
  'nav.about':     'About',
  'nav.menu':      'Menu',
  'nav.workshop':  'Workshops',
  'nav.gallery':   'Gallery',
  'nav.blog':      'Blog',
  'nav.faq':       'FAQ',
  'nav.shop':      'Visit Us',
  'nav.reserve':   'Reserve',
  'nav.bcal':      'Business Hours',

  // Header
  'header.hours': 'Tue–Sat&nbsp; 10:00–20:00<br>Sun (and holiday Mondays)&nbsp; 10:00–19:00&nbsp; /&nbsp; Closed Mon (except holidays)',

  // Status pill (JS will use these)
  'status.checking':   'Checking…',
  'status.open':       'Open Now',
  'status.closed.day': 'Closed Today',
  'status.before':     'Opens at 10:00',
  'status.after':      'Closed for Today',

  // USP strip
  'usp.1.title': 'Handmade, One at a Time',
  'usp.1.sub':   'Baked with care for quality ingredients, flavor, and presentation.',
  'usp.2.title': 'Now Taking Reservations',
  'usp.2.sub':   'Custom cakes &amp; baked goods for gifts and celebrations',
  'usp.3.title': 'Serving Joto, Tsurumi, Kyobashi, Gamo &amp; Sekime',
  'usp.3.sub':   'Bringing Japanese sweets loved around the world',
  'usp.4.title': "Kids' One-Day Manager Experience",
  'usp.4.sub':   'Workshops planned for young children&ndash;elementary students<br>Career experience ongoing for teens',

  // Greeting
  'greeting.heading': 'Four Seasons<br>on a Plate.',
  'greeting.body1':   'Koimari is a handcrafted cake and pastry shop rooted in the flavors of each season. Every piece is baked with care, bringing small moments of joy to everyday life.',
  'greeting.body2':   'From birthday and anniversary cakes to boxed pastry gifts, we are here to make your most cherished moments even more special. Please feel free to reach out.',
  'greeting.body3':   'We spare no time-honored effort and care for quality ingredients, making every single item by hand with attention to detail.',

  // Social
  'social.lead': 'We share our latest updates on social media too.<br>Following us means a lot to our team.<br>Our whole staff is looking forward to connecting with you.',
  'greeting.cta':     'Reserve / Inquire',

  // Section labels / titles
  'section.about.en':       'About',
  'section.about.title':    'About Koimari',
  'section.menu.en':        'Products',
  'section.menu.title':     'Product Categories',
  'section.rec.en':         'Recommended',
  'section.rec.title':      'Featured Items',
  'section.exp.en':         'Experience',
  'section.exp.title':      'Workshops',
  'section.news.en':        'News',
  'section.news.title':     'Latest News',
  'section.spotlight.en':   'Spotlight',
  'section.spotlight.title':'Pick of the Month',
  'section.stats.en':       'Numbers',
  'section.stats.title':    'Koimari by the Numbers',
  'section.voices.en':      'Reviews',
  'section.voices.title':   'Customer Reviews',
  'section.corp.en':        'Corporate',
  'section.corp.title':     'Corporate &amp; Bulk Orders',
  'section.stories.en':     'Stories',
  'section.stories.title':  'Our Stories',
  'section.insta.en':       'Instagram',
  'section.insta.title':    'Follow Us on Instagram',
  'section.shop.en':        'Shop',
  'section.shop.title':     'Visit Us',
  'section.cal.en':         'Calendar',
  'section.cal.title':      'Business Calendar',

  // Corporate banner
  'corp.body': 'We offer gift sets, event desserts, and bulk orders tailored to corporate occasions. Large orders and custom designs are welcome.',
  'corp.cta':  'Contact Us',

  // Business calendar
  'bcal.note': '* Hours may vary on public holidays. Please contact us to confirm.',
  'bcal.days': ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],

  // Shop info table
  'shop.address.label': 'Address',
  'shop.address.val':   '1F Ivy Mansion, 2-13-15 Naruiku, Joto-ku, Osaka 536-0007',
  'shop.tel.label':     'Phone',
  'shop.hours.label':   'Hours',
  'shop.hours.val':     'Tue – Sat&nbsp; 10:00 – 20:00<br>Sun (and holiday Mondays)&nbsp; 10:00 – 19:00',
  'shop.closed.label':  'Closed',
  'shop.closed.val':    'Mondays (following day on public holidays)',
  'shop.parking.label': 'Parking',
  'shop.parking.val':   '2 spaces available',

  // Buttons
  'btn.reserve':       'Reserve / Inquire',
  'btn.reserve.ghost': 'Make a Reservation',
  'fab.mobile':        'Reserve / Inquire',
  'fab.pc.label':      'RESERVE',

  // Footer
  'footer.hours': 'Tue–Sat 10:00–20:00&nbsp; /&nbsp; Sun 10:00–19:00&nbsp; /&nbsp; Mon closed',
  'footer.copy':  '© 2026 Koimari. All rights reserved.',

  // Experience card dynamic labels
  'exp.duration.label': 'Duration',
  'exp.fee.label':      'Fee',
  'exp.apply.btn':      'Apply Now',

  // News
  'news.empty': 'No announcements at this time.',

  // Misc
  'insta.follow': 'View on Instagram',
};

// Merge admin overrides (saved via translation tool)
try {
  const ov = localStorage.getItem('koimari_i18n_override');
  if (ov) Object.assign(KOIMARI_I18N_EN, JSON.parse(ov));
} catch(e) {}


// ── 文章まるごとの英訳（2026-10-07オーナー指摘：Englishボタンで英語にならない箇所があった） ─────────
// data-i18n を付けていない文章も、日本語の文面と完全一致すれば英語に置き換える（空白は無視して比べる）。
// 管理画面で文章を書き換えた場合は一致しなくなるので、ここへ追記すること。
const KOIMARI_I18N_PHRASES = [
  // ヘッダー・メニュー
  ['ケーキ屋さん こいまり 城東', 'Cake shop KOIMARI Osaka Joto'],
  ['営業日カレンダー', 'Business Calendar'],
  ['こいまりについて', 'About Koimari'],
  ['今日はどれにする？こいまりのお品書き', 'What will it be today?<br>The Koimari Menu'],
  ['おすすめ商品', 'Recommended'],
  ['こいまりの物語', 'Our Stories'],
  ['こいまりのこだわり', 'What We Care About'],
  ['お知らせ', 'News'],
  ['店舗情報・アクセス', 'Shop Info & Access'],
  ['SNSのご案内', 'Follow Us'],
  // ヒーロー・お知らせバナー
  ['季節のフルーツをたっぷり使った、', 'Generous with seasonal fruit —'],
  ['色とりどりの手作りケーキと焼き菓子', 'colorful handmade cakes and baked sweets'],
  ['LINE友だち限定', 'LINE friends only'],
  ['10月31日まで｜税込2,000円お買い上げごとに100円引き（店頭のお会計すべて・何度でも）', 'Until Oct 31 | ¥100 off for every ¥2,000 spent (tax incl.) — all in-store purchases, any number of times'],
  ['LINEで友だち追加する →', 'Add us on LINE →'],
  // 過去のケーキ集
  ['「こんなケーキ、できる？」過去につくったケーキ集から、お好みを見つけてください', '"Can you make a cake like this?"<br>Find your favorite in our collection of cakes we have made.'],
  ['「こんなケーキ、できる？」', '"Can you make a cake like this?"'],
  ['過去のケーキ集を見る →', 'See our cake collection →'],
  // ご予約の案内
  ['ご予約からお引き取りまでのお日にち', 'How far ahead to order'],
  ['定番ケーキは、3営業日以降のお引き取りが目安です。', 'For our <strong>standard cakes</strong>, pickup is available from <strong>3 business days</strong> after ordering.'],
  ['3営業日を切るお急ぎの場合（当日を含む）は、直接お電話いただければ対応可否を確認いたします。070-9158-0641', 'In a <strong>hurry</strong> (less than 3 business days, including same day)? Please <strong>call us</strong> and we will check whether we can help.<br><a class="quick-reserve__tel" href="tel:07091580641">070-9158-0641</a>'],
  ['過去のケーキ集からご希望の仕様をお伝えいただくと、スムーズにご注文いただけます。', 'Ordering is smoother if you tell us a design from our <strong>cake collection</strong>.'],
  ['オーダーケーキの場合、お引き渡し日は資材の在庫状況によります。お早めのご相談をおすすめいたします。（オーダーメイド・特殊な仕様は2週間程度かかる場合があります）', 'For <strong>custom cakes</strong>, the pickup date depends on <strong>material availability</strong>. Please contact us early. (Fully custom or special designs may take about two weeks.)'],
  ['ご予約はLINEまたはお電話で', '<span class="nb">Reserve via</span> <span class="nb">LINE or by phone</span>'],
  ['LINEなら、スマートフォンからご希望を選んでご予約いただけます。お電話でも同じようにご予約を承ります。', 'On LINE, you can <strong>choose your cake and reserve</strong> from your smartphone.<br><strong>You can also reserve by phone in the same way.</strong>'],
  ['LINEで友だち追加', 'Add us<br>on LINE'],
  ['トーク画面の下の「ご予約」を押す', 'Tap "Reserve"<br>below the chat'],
  ['ご希望を選んで送信', 'Choose and<br>send'],
  ['またはお電話で', 'Or call us'],
  ['またはお電話で予約', 'Or call us to reserve'],
  ['受付時間：火曜～土曜 10:00～20:00 ／ 日曜（月曜祝日）10:00～19:00（月曜定休・祝日の場合は翌平日）', 'Hours: Tue–Sat 10:00–20:00 / Sun 10:00–19:00 (closed Mon; open on national holidays)'],
  ['パソコンでご覧の方は、ボタンを押した先の画面のQRコードを、スマートフォンのカメラで読み取ってください。', 'On a computer? Scan the QR code shown after pressing the button with your smartphone camera.'],
  // 物語・ギャラリー
  ['作品ギャラリー・お客様の声', 'Gallery & Customer Voices'],
  ['これまでお作りしてきたオーダーケーキや、ご利用いただいたお客様からのお声をご紹介します。', 'Custom cakes we have made, and words from our customers.'],
  ['ギャラリーを見る →', 'View gallery →'],
  // こだわり
  ['地域に愛される店舗でありたい', 'A shop loved by our neighborhood'],
  ['地域に愛される店舗でありたいと考えています。地元中学校の職業体験では、毎年一番人気の職場としてご評価いただき、卒業後もアルバイトに来てくれるスタッフもいます。お子様からご年配の方まで、すべての世代のご家族に愛していただける、「実家みたい」と言っていただけるような安心できる存在を目指して日々お菓子を焼き上げております。この輪を、より広いエリアへと広げていきたいと考えています。', 'We want to be a shop the neighborhood loves. Every year, local junior high school students rate us the most popular workplace for their job experience, and some come back to work with us after graduating. We bake every day hoping to be a place families of every generation, from children to grandparents, can feel at home — "just like home," as some say. We hope to spread this circle to a wider area.'],
  ['小さなお子様からご年配の方まで安心して', 'Safe for everyone, from small children to seniors'],
  ['お菓子に使用するお酒は、素材の風味を引き立てるためのごく少量にとどめ、焼き上げの加熱工程でアルコール分はしっかりと飛ばすことを基本としています。小さなお子様やご年配の方はもちろん、妊娠中の方やお酒が苦手な方にも、安心して召し上がっていただけるお菓子作りに努めています。', 'We use only a very small amount of liqueur to bring out the flavor of our ingredients, and the alcohol is cooked off during baking. We aim to make sweets that small children, seniors, expectant mothers and anyone who avoids alcohol can enjoy with peace of mind.'],
  ['大阪市城東区から、大阪の魅力を', 'Sharing the charm of Osaka from Joto Ward'],
  ['私たちは大阪市城東区から、大阪の良さを伝えていきたいと考えています。地域に根差しながら、一つひとつ丁寧に作るお菓子を通じて、この街の温かさ、お菓子の美味しさをお届けしてまいります。', 'From Joto Ward in Osaka, we want to share what makes Osaka wonderful. Rooted in our community, we deliver the warmth of this town and the joy of good sweets through each carefully made treat.'],
  ['果実をたっぷりと、心まで満たす一切れに', 'Packed with fruit — a slice that fills your heart'],
  ['旬のフルーツを惜しみなく使い、ひと切れでも満足感のある食べ応えにこだわっています。断面いっぱいに広がる果実の彩りと、しっかりとしたボリューム感。見た目の華やかさだけでなく、口いっぱいに広がる果実の美味しさをお楽しみいただけます。', 'We use seasonal fruit generously so that even one slice is truly satisfying. Enjoy colorful fruit across every cross-section and a generous volume — not just beautiful to look at, but full of fruity flavor in every bite.'],
  // お知らせ・今月の主役
  ['春限定 苺のショートケーキ販売中', 'Spring special: strawberry shortcake now available'],
  ['おすすめ', 'Recommended'],
  ['母の日ケーキのご予約承り中', 'Now taking Mother\'s Day cake orders'],
  ['5月の営業日についてのご案内', 'Our business days in May'],
  ['今月の主役', 'This month\'s star'],
  ['濃厚ストロベリー', 'Rich strawberry'],
  ['チーズケーキフラッペ', 'cheesecake frappé'],
  ['SNSでバズり中。ケーキ屋さんが作る「食べる」フラッペ。', 'Trending on social media — a frappé you "eat," made by a cake shop.'],
  ['果肉たっぷりのイチゴピューレとチーズケーキ入りバニラフラッペをベースに、たっぷりの夏いちご・角切りレアチーズケーキ・クッキークランブルをのせ、生クリームとかりいちごで仕上げています。使用しているチーズケーキ・生クリームは店頭の定番商品と同じ材料・製法です。大人お二人でシェアしても大満足のボリュームです。', 'A vanilla frappé with chunky strawberry purée and cheesecake, topped with plenty of summer strawberries, cubes of rare cheesecake and cookie crumble, finished with fresh cream and crispy strawberries. The cheesecake and cream are the same as our in-store classics. Big enough for two adults to share.'],
  ['詳しくはこちら', 'Learn more'],
  // 営業日カレンダー
  ['定休日・臨時休業', 'Closed / special closure'],
  ['イベント', 'Event'],
  ['ハロウィン', 'Halloween'],
  ['基本定休日: 月曜日（祝日の場合は翌平日）　/　火曜～土曜 10:00～20:00、日曜（月曜祝日）10:00～19:00　/　臨時休業や営業時間変更がある場合は上記をご確認ください', 'Regular closing day: Monday (if a national holiday, the next weekday) / Tue–Sat 10:00–20:00, Sun 10:00–19:00 / Please check the calendar above for special closures or changed hours'],
  // 店舗情報
  ['店名', 'Shop'],
  ['住所', 'Address'],
  ['大阪府大阪市城東区成育2丁目13-15', '2-13-15 Seiiku, Joto-ku, Osaka-shi, Osaka'],
  ['アイビーマンション 1階', 'Ivy Mansion 1F'],
  ['電話', 'Phone'],
  ['営業時間', 'Hours'],
  ['火曜〜土曜 10:00 〜 20:00', 'Tue–Sat 10:00–20:00'],
  ['日曜 10:00 〜 19:00', 'Sun 10:00–19:00'],
  ['火曜～土曜 10:00～20:00', 'Tue–Sat 10:00–20:00'],
  ['日曜（月曜祝日）10:00～19:00', 'Sun (and holiday Mondays) 10:00–19:00'],
  ['火曜～土曜 10:00～20:00 / 日曜（月曜祝日）10:00～19:00 / 月曜定休（祝日の場合は翌平日）', 'Tue–Sat 10:00–20:00<br>Sun (and holiday Mondays) 10:00–19:00 / Closed Mon (next weekday if a holiday)'],
  ['定休日', 'Closed'],
  ['月曜日（祝日の場合は翌平日）', 'Mondays (if a national holiday, the next weekday)'],
  ['目印', 'Landmark'],
  ['スーパーライフ 関目店・コーナン 関目店と同じ交差点内', 'At the same intersection as Life Supermarket Sekime and Kohnan Sekime'],
  ['駐車場', 'Parking'],
  ['近隣駐車場をご利用ください。お電話頂ければお伝えも可能です。', 'Please use nearby parking. Call us and we can tell you where.'],
  ['近隣駐車場をご利用ください。', 'Please use nearby parking.'],
  ['お電話頂ければお伝えも可能です。', 'Call us and we can tell you where.'],
  ['ご予約・お問合せ', 'Reservations & Inquiries'],
  ['こいまりのルーツについて →', 'Our roots →'],
  ['法人・企業のお客様', 'For businesses'],
  ['詳しく見る →', 'Learn more →'],
  // SNS
  ['ケーキの新作や店内の様子を、毎日の投稿でお届けしています。', 'New cakes and scenes from the shop, posted every day.'],
  ['Instagramを見る ↗', 'View Instagram ↗'],
  ['LINE公式アカウント', 'LINE Official Account'],
  ['友だち追加で会員登録完了。ご予約のご相談はもちろん、新商品情報やお得なクーポンもお届けします。', 'Add us as a friend to become a member. Reserve, ask questions, and get news on new items and special coupons.'],
  ['友だち追加 ↗', 'Add friend ↗'],
  // フッター
  ['こ い ま り', 'K O I M A R I'],
  ['ご予約', 'Reserve'],
  ['火-土 10:00-20:00', 'Tue–Sat 10:00–20:00'],
  ['日 10:00-19:00', 'Sun 10:00–19:00'],
  ['過去につくった', 'From our collection of'],
  ['ケーキ集から、', 'cakes we have made,'],
  ['お好みを見つけてください', 'find the one you like'],
  ['火-土 10:00-20:00 / 日 10:00-19:00', 'Tue–Sat 10:00–20:00 / Sun 10:00–19:00'],
  ['定休日 月曜（祝日の場合は翌平日）', 'Closed Mondays (if a national holiday, the next weekday)'],
  ['ご案内', 'Guide'],
  ['ホーム', 'Home'],
  ['商品カテゴリー', 'Menu'],
  ['体験プログラム', 'Workshops'],
  ['店舗情報・地図', 'Shop & Map'],
  ['お役立ち', 'Help'],
  ['ギャラリー', 'Gallery'],
  ['よくある質問', 'FAQ'],
  ['フォロー', 'Follow'],
  ['LINE公式 ↗', 'LINE ↗'],
  ['管理ページ', 'Admin'],
  ['プライバシーポリシー', 'Privacy Policy'],
  ['利用規約', 'Terms of Use'],
  ['特定商取引法に基づく表記', 'Legal Notice (Specified Commercial Transactions Act)'],
];
const KoimariPhrase = (function () {
  const norm = (s) => String(s || '').replace(/\s+/g, '');
  const map = new Map(KOIMARI_I18N_PHRASES.map(([ja, en]) => [norm(ja), en]));
  const orig = new WeakMap(); // 置き換えた要素 → 元のHTML
  let textDone = []; // 改行（<br>）で区切られた文など、文字の部分だけを置き換えたもの [テキストノード, 元の文字]
  const SKIP = 'script,style,noscript,textarea,input,select,option,[data-i18n],[data-no-i18n]';
  function translate(root) {
    const els = (root || document.body).querySelectorAll('*');
    const done = new Set();
    els.forEach((el) => {
      if (el.closest(SKIP)) return;
      for (let p = el.parentElement; p; p = p.parentElement) if (done.has(p)) return; // 親をまとめて訳した場合は中身は触らない
      const key = norm(el.textContent);
      if (!key || !/[぀-ヿ一-龯]/.test(key)) return;
      const en = map.get(key);
      if (en === undefined) return;
      // 子要素（リンク等）が同じ文面なら、子の方を訳す（親ごと置き換えるとリンクや書式が消えるため。2026-10-07）
      if (Array.from(el.children).some((c) => norm(c.textContent) === key)) return;
      if (!orig.has(el)) orig.set(el, el.innerHTML);
      el.innerHTML = en;
      el.setAttribute('data-i18n-auto', '');
      done.add(el);
    });
    // 要素の中で<br>等で区切られた1行ずつの文字も訳す
    const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode, p = n.parentElement;
      if (!p || p.closest(SKIP) || p.closest("[data-i18n-auto]")) continue;
      const en = map.get(norm(n.nodeValue));
      if (en === undefined || /</.test(en)) continue;
      textDone.push([n, n.nodeValue]);
      n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), en);
    }
  }
  function restore() {
    textDone.forEach(([n, t]) => { n.nodeValue = t; }); textDone = [];
    document.querySelectorAll('[data-i18n-auto]').forEach((el) => {
      if (orig.has(el)) el.innerHTML = orig.get(el);
      el.removeAttribute('data-i18n-auto');
    });
  }
  // 後から描かれる部分（お知らせ・カレンダー・こだわり等）も英語にする
  let timer = null, observer = null;
  function watch(on) {
    if (on && !observer && window.MutationObserver) {
      observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => { observer.disconnect(); translate(); observer.observe(document.body, { childList: true, subtree: true }); }, 120); });
      observer.observe(document.body, { childList: true, subtree: true });
    } else if (!on && observer) { observer.disconnect(); observer = null; }
  }
  return { translate, restore, watch };
})();

// ── Language Controller ─────────────────────────────────────────
const I18nCtrl = {
  lang: localStorage.getItem('koimari_lang') || 'ja',

  init() {
    document.documentElement.lang = this.lang === 'en' ? 'en' : 'ja';
    this.apply();
    this.updateToggle();
  },

  setLang(lang) {
    this.lang = lang;
    localStorage.setItem('koimari_lang', lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'ja';
    this.apply();
    this.updateToggle();
    if (typeof renderDynamic === 'function') renderDynamic();
    if (typeof renderBcal === 'function') renderBcal();
    if (typeof updateStatus === 'function') updateStatus();
  },

  isEn() { return this.lang === 'en'; },

  t(key) {
    if (this.lang !== 'en') return '';
    return KOIMARI_I18N_EN[key] ?? '';
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.lang === 'en') {
        if (el.dataset.orig === undefined) el.dataset.orig = el.innerHTML;
        const tr = KOIMARI_I18N_EN[key];
        if (tr !== undefined) el.innerHTML = tr;
      } else {
        if (el.dataset.orig !== undefined) el.innerHTML = el.dataset.orig;
      }
    });
    if (this.lang === 'en') { KoimariPhrase.translate(); KoimariPhrase.watch(true); } else { KoimariPhrase.watch(false); KoimariPhrase.restore(); }
  },

  updateToggle() {
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const active = btn.getAttribute('data-lang-btn') === this.lang;
      btn.style.color      = active ? '#fff' : '';
      btn.style.fontWeight = active ? '700' : '';
      btn.style.background = active ? 'var(--color-accent)' : '';
      btn.style.borderColor = active ? 'var(--color-accent)' : '';
    });
  }
};
