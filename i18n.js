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

  // Header
  'header.hours': 'Tue–Sat&nbsp; 10:00–20:00<br>Sun&nbsp; 10:00–19:00&nbsp; /&nbsp; Mon closed',

  // Status pill (JS will use these)
  'status.checking':   'Checking…',
  'status.open':       'Open Now',
  'status.closed.day': 'Closed Today',
  'status.before':     'Opens at 10:00',
  'status.after':      'Closed for Today',

  // USP strip
  'usp.1.title': 'Handmade with Care',
  'usp.1.sub':   'Crafted from quality ingredients, baked one at a time',
  'usp.2.title': 'Custom Cakes Welcome',
  'usp.2.sub':   'For birthdays, anniversaries &amp; corporate gifts',
  'usp.3.title': 'Local to Joto-ku &amp; Kyobashi',
  'usp.3.sub':   'Seasonal flavors using local farm produce',
  'usp.4.title': 'Baking Workshops',
  'usp.4.sub':   'Hands-on programs for kids &amp; teens',

  // Greeting
  'greeting.heading': 'Four Seasons<br>on a Plate.',
  'greeting.body1':   'Koimari is a handcrafted cake and pastry shop rooted in the flavors of each season. Every piece is baked with care, bringing small moments of joy to everyday life.',
  'greeting.body2':   'From birthday and anniversary cakes to boxed pastry gifts, we are here to make your most cherished moments even more special. Please feel free to reach out.',
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
  'shop.hours.val':     'Tue – Sat&nbsp; 10:00 – 20:00<br>Sun&nbsp; 10:00 – 19:00',
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
  },

  updateToggle() {
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const active = btn.getAttribute('data-lang-btn') === this.lang;
      btn.style.color      = active ? 'var(--color-accent)' : '';
      btn.style.fontWeight = active ? '700' : '';
    });
  }
};
