# こいまりサイト — Claude 作業ルール & 実装詳細

> 作業ルールは上部に。実装詳細は下部に。  
> 汎用設計ルール・エラーバスターは `MANUAL.md` を参照。

---

## 作業ルール

### 確認ルール

- 同じ種類の変更を複数セクションに行う場合、最初の1回だけ確認を取ればよい。
  同じ内容の変更を他のセクションに展開する際は確認不要でそのまま実施する。

### Git

- 変更完了後は確認なしでそのまま `git commit & push` まで行う。

### UI追加・素材

- 新しいUIセクション（画像・動画・写真など素材が必要なもの）を追加した方が良いと判断した場合は、
  勝手にプレースホルダーで実装せず、まずユーザーに「素材を提供してください」と伝えてから実装する。

### デザイン・スタイル

- 色を指定する際はハードコードせず、サイトのCSS変数（`--color-accent` など）を優先使用する。
  既存の変数に合うものがない場合のみ確認する。

### 法的表記・事業者情報

- 運営責任者などの役職・肩書きは、法的に必要と判断される場合は記載する。
  例：特定商取引法の「代表者名」欄など法令上必須の箇所は肩書きも含める。
  それ以外のデザイン的な表示は勝手に肩書きを付けない。

---

## プロジェクト概要

- **店名**: こいまり (Koimari)
- **業態**: 手作りの和洋菓子・オーダーケーキ専門店
- **ターゲット層**: 老若男女、地域住民（城東区・京橋・蒲生四丁目）高齢者が多いエリア
- **デザイン方針**: 品格と温かみを両立。カーソルエフェクト・パララックスなど派手なギミックは不要

---

## 技術スタック

- **言語**: HTML / CSS / JavaScript（Vanilla JS、フレームワーク不使用）
- **CSSフレームワーク**: Tailwind CSS（CDN、`preflight:false`）+ オリジナルCSS変数
- **フォント**: Google Fonts（Shippori Mincho, Noto Sans JP, Cormorant Garamond, Playfair Display）
- **画像**: Unsplash の無料画像（本番差し替え予定）+ ユーザー提供画像
- **データ保存**: localStorage（端末ごとに保存。複数端末での共有不可）
- **フォーム送信**: Formspree（エンドポイント未設定、`FORMSPREE_ENDPOINT`定数を埋めるだけ）
- **アクセス解析**: Google Tag Manager（ID: `GTM-MB2XHF6J`、全ページ導入済み）＋ GA4（測定ID: `G-7VVE1ZEKD5`、2026-07-09設定・GTM経由で「Google タグ」を追加、トリガーはInitialization - All Pages）
- **デプロイ**: GitHub Pages（`koimari-official/koimari-site` リポジトリ、main ブランチ）
- **多言語**: 日英切り替え（`i18n.js`）

---

## ファイル構成

| ファイル | 役割 | 状態 |
|---------|------|------|
| `index.html` | トップページ | 完成 |
| `reservation.html` | 予約フォーム（のし対応含む） | 完成 |
| `experience.html` | 体験プログラム応募 | 完成 |
| `admin.html` | 管理画面（パスワード認証） | 完成 |
| `corporate.html` | 法人・企業向けLP | 完成 |
| `mothers-day.html` | 母の日特設LP（季節ページのテンプレ） | 完成 |
| `gallery.html` | 作品ギャラリー（カテゴリ絞り込み） | 完成 |
| `blog.html` | ブログ一覧 | 仮実装、要リニューアル |
| `faq.html` | よくある質問 | 完成 |
| `privacy.html` | プライバシーポリシー | 完成 |
| `terms.html` | 利用規約 | 完成 |
| `tokushoho.html` | 特定商取引法表記 | 完成 |
| `i18n.js` | 日英切り替え機能 | 完成 |
| `error-tracker.js` | エラー記録 | 完成 |
| `MANUAL.md` | 汎用HP設計ガイド（Claude作業指示含む） | 完成 |

### 管理画面のパスワード

`admin.html` ログインパスワード: `koimari2026`（sessionStorage・ハードコード）

---

## セクション構成（トップページ `index.html`）

上から順の最終構成：

1. **Header**（営業中ステータスピル付き、sticky）
2. **Hero**（スライドショー + SCROLLヒント）
3. **About / こいまりについて**（店主挨拶）
4. **News / お知らせ**（5件まで、日付+タイトル+矢印）
5. **Spotlight / 今月の主役**（特集ケーキ、来年再利用できるストック機能付き）
6. **Stats / 数字で見るこいまり**（4項目）
7. **Categories / 商品一覧**（カテゴリ画像）
8. **Recommended / おすすめ商品**（季節商品）
9. **Voices / お客様の声**（3件、星評価付き）
10. **Corporate Banner**（法人向け誘導）
11. **Calendar / 営業日カレンダー**（イベント表示機能、凡例：定休日・イベント）
12. **Experience / 体験プログラム**（3カード）
13. **Stories / ストーリーズ**（ギャラリー・ブログへの導線）
14. **Social / SNSのご案内**（Instagram投稿風カード + LINE）
15. **Shop / 店舗情報**（Googleマップ埋め込み、ライフ・コーナン関目店が目印）
16. **Footer**（法的リンク含む）
17. **FAB 予約ボタン**（PC・スマホ縦横向き共通で左下円形、88px）

### ナビゲーション（PC表示、900px超）

こいまりについて → 商品一覧 → 体験プログラム → ギャラリー → ブログ → よくある質問 → 営業日 → 店舗情報 → ご予約

---

## CSS変数（`:root` 実際の値）

### トップページ（`index.html`）

```css
:root {
  --color-bg: #f7f3ee;          /* ページ背景（クリーム） */
  --color-bg-soft: #ede3d4;     /* ナビ・カードの背景 */
  --color-text: #2e2118;        /* 本文（こげ茶） */
  --color-text-soft: #4a3a2a;   /* サブテキスト */
  --color-accent: #c9a96e;      /* アクセント（ゴールド） */
  --color-accent-dark: #a88a52; /* アクセント濃い版（ホバー） */
  --color-gold: #c9a96e;        /* ゴールド（装飾） */
  --color-line: #d8baa4;        /* ボーダー・区切り線 */
  --color-line-soft: #e8d4bc;   /* 薄いボーダー */
  --color-info: #4a6f9c;        /* 情報系（青） */
  --color-on-accent: #2e1a00;   /* アクセント背景上のテキスト */
  --font-mincho: "Shippori Mincho", "游明朝", serif;
  --font-sans: "Noto Sans JP", "ヒラギノ角ゴ ProN", sans-serif;
  --font-en: "Cormorant Garamond", serif;
  --font-display: "Playfair Display", serif;
  --max-w: 1180px;
}
```

### 管理画面（`admin.html`）は別パレット（赤系アクセント）

```css
--color-accent: #b03b48;  /* 赤（管理画面専用） */
```

### 母の日ページのみ追加変数

```css
--color-mom: #c75a6e;
--color-mom-soft: #ecd0d6;
--color-mom-deep: #9a3d50;
```

---

## レスポンシブブレークポイント

| ブレークポイント | 適用内容 |
|---------------|---------|
| `max-width: 900px` | モバイル全般。ナビ非表示、グリッド縮小、FAB表示切替 |
| `max-width: 480px` | 縦向きスマホ。本文17px、カード1列フル幅、カレンダーエッジ表示 |
| `max-width: 380px` | 超小型端末。カレンダーさらに縮小 |
| `orientation:landscape` + `max-width:900px` | 横向きスマホ。ヘッダー圧縮（サブテキスト非表示、KOIMARI 22px）、本文16px |

---

## localStorage キー一覧

```
koimari_admin_session    管理画面ログインセッション
koimari_images           ヒーロー/店舗紹介/カテゴリ画像
koimari_reservations     予約一覧
koimari_experiences      体験プログラム応募一覧
koimari_corporate        法人ご相談一覧
koimari_views            ページビュー記録（90日）
koimari_manual_sales     手動売上記録
koimari_sales_goal       売上目標
koimari_coupons          クーポン
koimari_newsletter       メルマガ
koimari_page_errors      エラーログ
koimari_news             お知らせ
koimari_holidays         営業日設定（定休日・臨時休業）
koimari_faq              FAQ
koimari_gallery          ギャラリー作品
koimari_voices           お客様の声
koimari_spotlight        今月の主役（配列形式、visible フラグで公開管理）
koimari_stats            「数字で見るこいまり」
koimari_insta            Instagram投稿カード内容
```

---

## 管理画面タブ構成（`admin.html`）

| タブ | 役割 |
|-----|-----|
| 予約カレンダー | 予約状況を月別カレンダー表示 |
| 統計・分析 | Chart.js で予約推移・ビュー数グラフ |
| 予約一覧 | テーブル表示・CSV出力 |
| 応募一覧 | 体験プログラム応募の管理 |
| 法人ご相談 | 法人問い合わせ一覧 |
| お知らせ | 5件管理 |
| 今月の主役 | ストック機能付き（visible フラグで公開/非公開） |
| Instagram投稿 | 投稿風カードの差し替え |
| 数字で見る | 統計数字の編集 |
| 営業日設定 | 定休曜日 + 臨時休業日 |
| FAQ管理 | カテゴリ別Q&A編集 |
| ギャラリー | 作品追加/削除/カテゴリ |
| お客様の声 | レビュー管理 |
| ブログ | 記事管理 |
| ヒーロー画像 | トップ画像差し替え |
| カテゴリ画像 | 商品カテゴリ画像 |

---

## 予約フォーム仕様（`reservation.html`）

- 生年月日の初期値: `2000-01-01`
- 種別が「ホールケーキ予約」または「焼き菓子予約」→ 引き取り希望日・時間が必須に切替
- 種別が「その他」→ 備考欄が必須に切替
- のし対応セクション（折りたたみ式）: 表書き・名入れ・メッセージカード・ラッピング
- URLパラメータ自動入力: `?type=`, `?season=`, `?cake=`, `?ref=`
- Formspree連携用コード（`FORMSPREE_ENDPOINT`定数を埋めるだけ）

---

## このサイトで発生した問題と解決策

### 今月の主役の来年再利用
- **問題**: 単一オブジェクト保存だと削除しない限り古いデータが残らない
- **解決**: localStorage を配列形式に変更。`visible: true/false` フラグで公開管理。`visible !== false` パターンで後方互換性を確保

### カレンダーの1画面表示
- **問題**: セル・余白が大きくスクロールしないと全体が見えない
- **解決**: `.bcal` padding・セル高さ・グリッドgap・DOW padding を段階的に縮小

### スマホ横向きでヘッダーが画面を占有
- **解決**: `orientation:landscape` メディアクエリでヘッダーのサブテキストを非表示・ロゴ縮小・上下余白を3pxに圧縮

### モバイルでの予約FAB表示
- **問題**: モバイルでは横長バーのみで円形FABが非表示だった
- **解決**: `@media(max-width:900px)` で `.fab--pc{display:flex!important}` に上書きし、円形FABを全デバイスで表示

---

## 残作業（優先度順）

### 高優先
- [x] 【重大バグ】法人相談フォーム(corporate.html)がFirebaseに保存されずlocalStorageのみだった → 2026-07-09修正。送信者本人のブラウザにしかデータが残らず、実際の見込み客からの問い合わせが管理画面に一切表示されない状態だった。reservation/experienceと同じFirebase(`corporate`ノード)への保存に統一し、admin.htmlの同期処理も追加済み
- [x] 管理画面の「全削除」ボタン(予約一覧・応募一覧・法人ご相談)がFirebase側を削除していなかった問題 → オーナー了承の上、2026-07-09に「ゴミ箱」方式で実装完了。「全削除」を押すと対象データを`trash/{reservations|experiences|corporate}`に退避してから本体を削除。各パネルの「ゴミ箱」ボタンから削除履歴（削除日時・件数）を確認でき、「復元」で元に戻す、「完全に削除」でゴミ箱からも消せる。あわせて応募一覧・法人ご相談に「未対応/対応完了」のステータス切替（予約一覧の4段階ステータスとは別に、オーナー希望の2段階でシンプルに）を追加。実データの削除操作を伴う変更だったため、実施前に一度オーナー確認を挟んだ
- [ ] ブログのリニューアル（マガジン風グリッド、記事詳細テンプレ）
- [ ] 実画像への差し替え（現状はUnsplash）
- [x] SEO整備(canonical・OGP・description) → 全11ページ対応済み（2026-07-09）。ただし構造化データ(schema.org JSON-LD)はindex.html(Bakery) / blog.html(Blog) / mothers-day.html(Event)の3ページのみで、他8ページは意図的に未設置。理由：FAQ・ギャラリーはlocalStorage経由で管理画面から動的に内容が変わるため、静的JSON-LDを書くと編集の度に陳腐化する。corporate等は既存のBakeryエンティティと重複するだけで追加の恩恵がない
- [x] sitemap.xml / robots.txt 作成 → 作成済み。canonical・OGP・schema.orgのURLがexample.comプレースホルダーのままだった致命的バグを2026-07-08修正（実ドメイン https://koimari-official.github.io/koimari-site/ に統一）。ogp.jpg実ファイルは依然未作成（下記中優先項目）

### 中優先
- [ ] 季節別LPの量産（父の日・お中元・敬老の日・お歳暮・バレンタイン・クリスマス）
- [x] Formspreeエンドポイント設定 → 2026-07-09完了。アカウント作成（noritate.official@gmail.com）・プロジェクト「こいまりサイト」・フォーム作成（エンドポイント`https://formspree.io/f/mwvddbqk`）を経て、reservation.html/experience.html/corporate.htmlの3ファイルに設定。予約・応募・法人相談の送信時に`noritate.official@gmail.com`へメール通知が届くようになった
- [ ] OGP画像作成（1200×630px）
- [ ] 「数字で見るこいまり」の4数値（創業12年／オーダーケーキ実績3,000件＋／リピート92%／Googleレビュー4.8）を実数値に差し替え → オーナー確認済み・仮の数値のまま（2026-07-09）。実数値が決まり次第、管理画面の「数字で見る」タブから入力すれば反映される
- [x] GTMコンテナ（GTM-MB2XHF6J）内にGA4計測タグが設定済みか確認 → 未設定と判明したため2026-07-09に新規設定・公開完了（測定ID `G-7VVE1ZEKD5`）。リアルタイムレポートで計測確認済み。管理画面の「統計・分析」タブのビュー数グラフは今後も同一ブラウザのみの簡易計測のままなので、全訪問者数はGoogleアナリティクス側で確認する運用とする
- [ ] index.html/blog.html/mothers-day.html以外の8ページの構造化データ要否を再検討（FAQPageスキーマ等。動的コンテンツとの同期方法が決まれば追加価値あり）
- [x] favicon未設定だった9ページ(reservation/experience/gallery/corporate/faq/privacy/terms/tokushoho/mothers-day)に追加。index.htmlと同じアイコンで統一（2026-07-09）
- [x] 予約・体験・法人相談の3フォームに、privacy.htmlへのリンク付き同意チェックボックス（必須）を追加（2026-07-09）。corporate.htmlは従来「個人情報」の文言・同意の仕組みとも無かったため今回新設。プライバシーポリシー本文の内容自体（第三者提供の記載・Cookie方針等）は変更していない
- [x] privacy.html・tokushoho.htmlのメールアドレスが`info@example.com`のプレースホルダーだった → オーナー確認済みの実アドレス`noritate.official@gmail.com`に修正（2026-07-09）
- [x] ヒーロースライド画像・ギャラリーのライトボックス画像でalt=""のまま放置されていた箇所を修正（2026-07-09）
- [x] プライバシーポリシーを専門家レビューを踏まえて全面改訂（2026-07-09）。8条→11条構成。事業者情報（法人名・代表者）、要配慮個人情報（アレルギー情報）の明示と個別同意条項、未成年者条項、DM/メルマガのオプトイン規定、外国第三者提供時の条項を追加。制定日はオーナー提供の指示文にあった「2026年7月26日」ではなく実作業日「2026年7月9日」を採用（未来日付を避けるため、Jobs判断で変更）
- [x] アレルギー情報を収集するreservation.html・experience.htmlに、プライバシーポリシー同意とは別の「アレルギー等の健康に関する情報の取得について同意します」チェックボックスを追加（2026-07-09）。オーナーの指示文は体験プログラム応募フォームのみ対象だったが、予約フォームにも同種のアレルギー収集項目があるため、Jobs判断で同様に追加（法20条2項の要配慮個人情報の同意要件は収集元フォームを問わず適用されるため）
- [ ] 【要確認】個人情報保護方針改訂に伴い、Formspree等の外部フォーム送信サービスを実際に導入する際は、privacy.html 6条の外国第三者提供条項に具体的な国名（Formspree社は米国）と当該国の個人情報保護制度に関する参考情報（施行規則17条2項が要求）を追記する必要がある
- [ ] NORI&TATEサイトのプライバシーポリシーは別途対応予定（オーナー指示）。現状ポリシーページ自体が存在しない

### 低優先
- [ ] 焼き菓子のオンライン販売（BASE/STORES連携）
- [ ] Stripe または Square 連携（事前カード決済）
- [ ] LINE公式アカウント連携
- [ ] PWA化

---

## 実装済みの改善（2026-07-09）

パティスリー向けサイトデザイナー視点のレビューを受けて実施。詳細はレビューArtifact参照。

- **画像のlazy loading**: ヒーロー以外（店舗紹介・カテゴリ・おすすめ・体験プログラム・今月の主役・Instagram投稿）の画像に`loading="lazy"`を追加。ヒーロー画像は常時DOM内でopacity切替のみのためlazy指定しても効果がなく、かつLCP候補のため対象外
- **管理画面タブのグルーピング**: 27タブをホーム／予約・問い合わせ管理／トップページコンテンツ／専用ページ・機能／販促・システム設定の5グループに整理。`data-panel`属性・クリックハンドラは変更していないため、機能面の挙動は変わらない
- **サイトチェック機能のSEO拡張**: 「SEOをチェック（公開ページ取得）」ボタンを追加。公開中の11ページを`fetch`で実際に取得し、title文字数・meta description有無/文字数・canonical有無・example.comプレースホルダーの残存（回帰検知）・画像のalt属性欠落・ストック写真(Unsplash等)の疑いをチェックする。GitHub Pages公開後の環境でのみ動作（ローカルでファイルを直接開く場合は`fetch`がブロックされる場合がある）
- **ストック写真警告バッジ**: `makeImageItem`共通関数を使う画像タブ（ヒーロー・店舗紹介・カテゴリ・おすすめ・体験プログラム・ギャラリー）と、今月の主役（個別実装）のプレビューに、画像URLがUnsplash/Pexels/Pixabayを含む場合は赤い警告バッジを自動表示。Instagram投稿タブは既定値が実ファイル(insta-tart.jpg)のため対象外

## 事業者情報

- **販売事業者**: 株式会社NORI&TATE（店舗名：こいまり）
- **運営責任者**: 吉田光輝
- **所在地**: 〒536-0007 大阪府大阪市城東区成育2丁目13-15 アイビーマンション1階
- **電話**: 06-7221-0705
- **営業時間**: 火〜土 10:00〜20:00 / 日 10:00〜19:00 / 月曜定休
- **Instagram**: https://www.instagram.com/_koimari_/
- **目印**: スーパーライフ関目店・コーナン関目店と同じ交差点内

---

## よく使う検索キーワード（ファイル内検索）

- `FORMSPREE_ENDPOINT` → メール通知エンドポイント設定箇所
- `GTM-MB2XHF6J` → Google Tag Manager ID（新規プロジェクトでは一括置換）
- `koimari2026` → 管理画面パスワード
- `DEFAULT_SPOTLIGHT` → スポットライトのデフォルトデータ
- `_koimari_` → Instagramハンドル
