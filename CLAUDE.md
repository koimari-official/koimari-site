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
- **データ保存**: Firebase Realtime Database（`koimari-tasting`プロジェクト）が正。localStorageは一部キャッシュ用途のみ残存（詳細は下記「localStorageキー一覧」参照）
- **フォーム送信**: Formspree（エンドポイント設定済み `https://formspree.io/f/mwvddbqk`）+ Firebase保存の並行実行。Firebase保存の成否のみで送信成功/失敗を判定（詳細は下記「予約フォーム仕様」参照）
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
| `product.html` | 商品カテゴリー/おすすめ商品の個別詳細ページ（`?type=category\|recommended&idx=N`） | 完成（2026-07-09新規） |
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
| `orientation:landscape` + `max-width:900px` | 横向きスマホ。ヘッダー圧縮（KOIMARI 22px、サブテキスト「ケーキ屋さんこいまり」は非表示にせず9pxで常時表示 ※2026-07-12修正、旧仕様は非表示だった）、本文16px |

---

## localStorage キー一覧

```
koimari_admin_session    管理画面ログインセッション
koimari_images           ヒーロー/店舗紹介/カテゴリ画像（2026-07-09〜：Firebase `siteImages` が正、こちらはローカルキャッシュ）
koimari_reservations     予約一覧
koimari_experiences      体験プログラム応募一覧
koimari_corporate        法人ご相談一覧
koimari_views            ページビュー記録（90日）
koimari_manual_sales     手動売上記録（2026-07-11〜：Firebase `koimariOps/manualSales` が正、こちらはローカルキャッシュ）
koimari_sales_goal       売上目標（同上、`koimariOps/salesGoal`）
koimari_coupons          クーポン（同上、`koimariOps/coupons`）
koimari_newsletter       メルマガ
koimari_page_errors      エラーログ
koimari_news             お知らせ（2026-07-09〜：Firebase `koimariContent/news` が正、こちらはローカルキャッシュ）
koimari_holidays         営業日設定（定休日・臨時休業）（同上、`koimariContent/holidays`）
koimari_faq              FAQ（同上、`koimariContent/faq`）
koimari_gallery          ギャラリー作品（同上、`koimariContent/gallery`）
koimari_voices           お客様の声（同上、`koimariContent/voices`）
koimari_spotlight        今月の主役（配列形式、visible フラグで公開管理）（同上、`koimariContent/spotlight`）
koimari_stats            「数字で見るこいまり」（同上、`koimariContent/stats`。※現在セクション自体は非表示中）
koimari_insta            Instagram投稿カード内容（同上、`koimariContent/insta`）
koimari_blog             ブログ記事（同上、`koimariContent/blog`）
```

上記9項目は2026-07-09まで管理者本人のブラウザのlocalStorageにしか保存されず、他の端末・他の従業員・実際のサイト訪問者には一切反映されない「ガラパゴス状態」だった（オーナー指摘により発覚）。同日、`siteImages`と同じ設計思想で`koimariContent`パスに集約し、複数拠点・複数従業員での運用と、実訪問者への反映の両方に対応した。

**2026-07-11追加発覚**：同種の点検を行ったところ、`koimari_manual_sales`・`koimari_sales_goal`・`koimari_coupons`の3項目も同じくlocalStorage単独保存のままだったことが判明。売上金額という機微データのため、一般公開されている`koimariContent`とは分けて非公開の`koimariOps`パスへ移行した（詳細は上記「Firebase Realtime Database」セクション参照）。

---

## Firebase Realtime Database（プロジェクト: koimari-tasting）

予約・体験応募・法人相談・サイト画像はこのFirebaseプロジェクトを共通基盤として使用（NORI&TATEサイトとも共用）。`databaseURL: https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app`

### データパス一覧

| パス | 内容 | 書き込み元 |
|------|------|-----------|
| `reservations/{id}` | 予約・お問合せ | reservation.html（新規作成）／admin.html（ステータス更新） |
| `experiences/{id}` | 体験プログラム応募 | experience.html（新規作成）／admin.html（ステータス更新） |
| `corporate/{id}` | 法人ご相談 | corporate.html（新規作成）／admin.html（ステータス更新） |
| `siteImages` | ヒーロー/店舗紹介/カテゴリ/おすすめ/体験プログラムの画像一式 | admin.html（保存ボタン） |
| `siteConfig/eventBanner` | 季節イベントバナー設定 | admin.html |
| `koimariContent/{news\|holidays\|faq\|gallery\|voices\|blog\|insta\|stats\|spotlight}` | お知らせ・営業日設定・FAQ・ギャラリー・お客様の声・ブログ・Instagram投稿・数字で見る・今月の主役（2026-07-09〜、旧`koimari_*`のlocalStorage単独保存から移行） | admin.html（各パネルの保存ボタン）。読み取りはindex.html/gallery.html/faq.html/blog.html |
| `koimariOps/{manualSales\|salesGoal\|coupons}` | 手動売上記録・売上目標・クーポン（2026-07-11〜、旧`koimari_*`のlocalStorage単独保存から移行）。売上金額等の機微データのため公開ページからは読まない前提で`koimariContent`とは別パスにし、`.read`も要ログインにしている | admin.html（各パネルの保存ボタン） |
| `trash/{reservations\|experiences\|corporate}/{batchKey}` | 「全削除」時の退避先（復元・完全削除が可能） | admin.html |
| `dashboardTasks` | 会社全体のTODOダッシュボード（別プロジェクト`dashboard/`用） | dashboard/index.html |
| `noritate/contacts/{id}` | NORI&TATEサイトのお問い合わせ（プロジェクト共用） | nori&tate site/index.html（新規作成）／admin.html（ステータス更新） |
| `trash/noritate_contacts/{batchKey}` | NORI&TATE側の「全削除」退避先 | nori&tate site/admin.html |

### `siteImages`・`koimariContent`の同時編集マージ（2026-07-11修正）

**問題**：admin.htmlの保存ボタンは、変更した1項目だけでなく`siteImages`（またはkoimariContentの各キー）の**リスト全体を`set()`で丸ごと上書き**していた。かつ読み込みはログイン時の一度きり（`get()`）で、画面を開いたままだと他の人の保存内容を拾えなかった。このため「従業員がおすすめ商品のストロベリーショートケーキの画像を保存したら、オーナーが別のタイミングで保存していたフルーツタルトの画像が古い状態に巻き戻った」という事故が発生（実際の従業員報告により発覚）。原因は、従業員のブラウザが保持していた`workingData`がオーナーの変更前の状態のまま古くなっており、保存時にその古いスナップショットごと上書きしてしまったこと。

**対策**：`mergeArraySection`/`mergeScalarSection`（admin.html内）による3者マージ方式に変更。
- 「前回同期した内容(base)」「Firebase側の最新(fresh)」「自分の未保存編集(working)」を項目単位で比較し、変更が無い側を残す
- 同じ項目を両者が変更していた場合のみ「競合」として**今保存しようとしている側（後から変更した側）を優先**し、画面にトースト警告を表示
- 保存ボタン押下時は保存直前にFirebase側の最新を再取得してからマージ・書き込み（`fbLoadSiteImages`/`fbLoadContentKey`）
- ログイン中も`onValue`でライブ購読し続け、開きっぱなしの画面でも他の人の保存内容を自動で取り込む（`fbSubscribeSiteImages`/`fbSubscribeContent`）

**教訓**：複数人が同時編集する共有データは、保存のたびに「自分が知っている全体」で上書きしない（部分更新・差分マージが必須）。またログイン時の一度きり読み込みではなく、画面を開いている間はライブ購読するのが標準。新しいFirebaseパスを複数人編集用に追加する際は、この3者マージの型を流用する。

**⚠️ 初回実装時の不具合とその修正（2026-07-11）**：初回実装では競合時に「Firebase側の既存値(fresh)を優先」としていたが、これが原因で**他の誰も同時編集していない通常の単独作業でも、保存した画像が古い内容に戻る**という重大な回帰バグが発生した。原因は、ブラウザのローカルキャッシュ（`base`扱いのデータ）が実際のFirebase内容よりわずかに古いだけでも「他の人が変更した」と誤検知し、そのタイミングで自分が編集した項目も「競合」とみなして`fresh`（＝編集前の古い値）を採用してしまっていたこと。対策として、競合時は常に`working`（今まさに保存しようとしている側）を優先するよう修正した。**教訓**：「同時編集の保護」を実装する際、競合時のタイブレークは「変更しようとしている当人の意図を優先する」側に倒すのが安全。「安全のため既存側を優先」という直感的な選択が、実際には最も基本的な単独編集フローを壊すことがある。

### `<br>`（改行）をテキストフィールドで統一的に扱うルール（2026-07-11確定）

管理画面で入力するテキストは、フィールドによって改行の扱いが2系統に分かれている。

1. **innerHTML直挿し系**（商品名・カテゴリ名・ヒーロータイトル・今月の主役タイトル・体験プログラム説明文など）：入力値をエスケープせずそのままHTMLとして挿入するため、`<br>`を打てばそのまま改行になる。
2. **`nl2p()`・`escape(x).replace(/\n/g,"<br>")`系**（商品/カテゴリ説明文・ブログ本文・FAQ回答・お客様の声・今月の主役説明文・Instagram投稿キャプション）：入力値をエスケープしてから**実際の改行文字(`\n`、Enterキー）だけ**を`<br>`に変換する設計だったため、スタッフが1系統と同じ感覚で`<br>`を直接入力すると、エスケープされて文字どおり「&lt;br&gt;」と画面に表示されてしまっていた（2026-07-09に商品名で発覚・修正 → 2026-07-11に商品説明文でも同じ症状が再発し発覚）。

**対策**：2系統目の全箇所（`product.html`/`blog.html`の`nl2p()`、`faq.html`のFAQ回答、`gallery.html`のお客様の声、`index.html`の今月の主役説明文・Instagramキャプション）で、エスケープする**前に**`s.replace(/<br\s*\/?>/gi, "\n")`を通し、`<br>`入力と実際の改行入力の両方を同じ結果に正規化してから既存のエスケープ処理を適用するよう統一した。他のHTMLタグ（`<script>`等）は引き続き無害化されるため安全性の後退はない。

**今後の新規フィールド追加時のルール**：改行を許可する新しいテキストフィールド（説明文・本文・キャプション等）を追加する際は、**必ず**この正規化（`<br>`をエスケープ前に`\n`へ変換）を組み込んだ表示関数を使うこと。新しく`nl2p()`相当の関数を書く場合や、`escape(x).replace(/\n/g,"<br>")`パターンを新設する場合は、このセクションを参照してコピーする。

**画像アップロード履歴（2026-07-11追加）**：ヒーロー画像・商品カテゴリー・おすすめ商品・体験プログラムの画像は、新しいものに差し替えても直近5件まで「過去の画像」として`item.imgHistory`配列に保持され、削除するまで管理画面上で選び直し（復元）・完全削除ができる（`pushImageHistory`/`historyAwareOnFile`/`appendImageHistoryUI`）。1件あたり数十〜数百KBのdata URLを保持するため、`siteImages`ノードの総容量が増える点に留意（上限5件のキャップはこのため）。

### セキュリティルール（2026-07-09時点、Firebase Console → Realtime Database → Rules）

```json
{
  "rules": {
    "dashboardTasks": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "sessions": {
      ".read": true,
      ".write": true
    },
    "lineup": {
      ".read": true,
      ".write": true
    },
    "trash": {
      ".read": true,
      ".write": true
    },
    "staffRequests": {
      ".read": "auth != null",
      "$id": {
        ".write": "auth != null || (!data.exists() && newData.child('status').val() === 'pending')"
      }
    },
    "reservations": {
      ".read": "auth != null",
      "$id": {
        ".write": "auth != null || !data.exists()"
      }
    },
    "experiences": {
      ".read": "auth != null",
      "$id": {
        ".write": "auth != null || !data.exists()"
      }
    },
    "corporate": {
      ".read": "auth != null",
      "$id": {
        ".write": "auth != null || !data.exists()"
      }
    },
    "noritate": {
      "contacts": {
        ".read": "auth != null",
        "$id": {
          ".write": "auth != null || !data.exists()"
        }
      }
    },
    "siteImages": {
      ".read": true,
      ".write": "auth != null"
    },
    "siteConfig": {
      ".read": true,
      ".write": "auth != null"
    },
    "koimariContent": {
      ".read": true,
      ".write": "auth != null"
    },
    "koimariOps": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

**⚠️ 未反映（要オーナー対応）**：上記の`koimariContent`ブロックは2026-07-09にコード側（admin.html / index.html / gallery.html / faq.html / blog.html）へ実装済みだが、**Firebase Console側のルールにはまだ反映されていない**。反映して「公開」するまでは、お知らせ・ギャラリー・Instagram投稿・数字で見る・営業日設定・FAQ・お客様の声・ブログ・今月の主役の保存がすべて`PERMISSION_DENIED`で失敗する（画面上は保存成功に見えることがある）。

**⚠️ 未反映（要オーナー対応・2026-07-11追加）**：上記の`koimariOps`ブロックも同様にコード側（admin.html：手動売上記録・売上目標・クーポン）へ実装済みだが、Firebase Console側のルールにはまだ反映されていない。反映するまでこの3項目の保存が`PERMISSION_DENIED`で失敗する。

**重要な教訓（2026-07-09）**：このルールは「明示的に許可したパス以外はデフォルトで拒否」という設計（許可制）。新しいFirebaseパスをコードに追加しただけではルール側は自動的に追従しないため、**新しいパスを使うコードを書いたら、必ずこのルールにも対応するブロックを追加し、Firebase Console側で「公開」まで行うこと**。今回、`corporate`と`siteImages`（`noritate`も含む）のルール追加を忘れたまま実装し、画面上は「送信/保存成功」に見えても実際には`PERMISSION_DENIED`で裏側では失敗し続けるという不具合が発生した（ブラウザのDevTools Consoleで気づいた）。新しいFirebaseパスを追加する際のチェックリストに加える。

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
- 種別が「デコレーションケーキ予約」または「焼き菓子予約」→ 引き取り希望日・時間が必須に切替
- 種別が「その他」→ 備考欄が必須に切替
- のし対応セクション（折りたたみ式）: 表書き・名入れ・メッセージカード・ラッピング
- URLパラメータ自動入力: `?type=`, `?season=`, `?cake=`, `?ref=`
- Formspree連携用コード（`FORMSPREE_ENDPOINT`定数を埋めるだけ）
- **アレルギー関連の項目は無し**（2026-07-12削除）：収集しても運用として管理しきれないとのオーナー判断により、アレルギー選択チェックボックス・専用同意チェックボックスを削除。体験プログラム(`experience.html`)側は引き続きアレルギー情報を収集しており、privacy.htmlの要配慮個人情報の条項も体験プログラムのみを対象とした記載のまま（変更不要）。今後もし予約フォームでアレルギー等の要配慮個人情報を再度収集する場合は、privacy.htmlの当該条項に予約フォームの記載を追加すること

### 送信フォーム（reservation.html / experience.html / corporate.html）の送信失敗が画面に出ない不具合（2026-07-12発覚・修正）

**問題**：3フォームとも、送信処理は「Formspreeへのメール通知」と「Firebase保存」の両方を`try/catch`で個別に囲い、どちらが失敗しても`console.warn`でログを出すだけで結果を無視し、**必ず**「送信完了(Thank you)」画面を表示していた。そのため通信エラーやFirebaseの一時的な障害でFirebase保存に失敗した場合、お客様の画面には送信成功に見えるにもかかわらず、実際には予約・応募・相談内容がFirebaseにもメールにも記録されず、店舗側は問い合わせがあったこと自体に気づけない「サイレントな送信ロスト」が起こり得た（オーナーからの「エラーが生じないようになっているか」という確認で発覚）。

**対策（初版）**：3ファイルとも、Firebase保存とFormspree通知を`Promise.allSettled`で並行実行し、**Firebase保存（`push(...Ref, data)`）の成否のみ**で成功/失敗を判定するよう変更。保存に失敗した場合は「送信完了」を表示せず、フォーム下部にエラーメッセージ（電話番号への連絡案内付き）を表示し、フォームは送信可能な状態のまま再試行できるようにした。エラー表示に`alert()`は使わない（環境によりサイレントに無視されるため。詳細は`MANUAL.md`／メモリ参照）。

**⚠️ 初版の見落としと再修正（同日）**：初版では「保存成功後にバックグラウンドでFormspreeの結果を`update(newRef, {emailSent})`として書き戻す」設計にしていたが、本番のFirebaseセキュリティルール（下記「セキュリティルール」参照）では**未ログインのお客様は新規レコードの「作成」のみ許可**されており（`auth != null || !data.exists()`）、作成済みレコードへの`update()`は`auth != null`が無いため`PERMISSION_DENIED`で必ず失敗する。つまりemailSentフラグは実際には一切書き込まれない状態だった（オーナーへの回答前に気づき再修正）。

**最終対策**：Formspree通知を**Firebase保存より先に**、最大8秒だけ待って実行し、その成否（`true`/`false`）を`data.emailSent`としてオブジェクトに含めた上で、**一度のpush()で予約データと一緒に保存**する方式に変更。これにより新規作成の権限だけで完結し、追加の権限は不要。Formspree・Firebase保存の両方に明示的なタイムアウト（8秒/12秒、`withTimeout()`ヘルパー）を設定し、通信不良時でも「送信中」のまま無限に保留されないようにした。`admin.html`の予約一覧・応募一覧・法人ご相談一覧には`emailSent===false`の場合に「⚠ メール未送信」バッジを表示し、店舗側が気づける。2026-07-12にオーナー了承のもと本番Firebase・Formspreeへ実際にテスト送信し、1秒以内に完了画面が表示されコンソールエラーが出ないことを確認済み。

**今後の教訓**：
1. ユーザー向けの「送信完了」表示は、実際にデータが永続化されたことを確認してから出す。複数の非同期処理（通知・保存等）を`try/catch`で個別に握りつぶして無条件に成功画面へ進む実装は、ネットワーク障害時に気づけないデータロストを生む。
2. **未ログインユーザーからの書き込みを「作成のみ許可（`!data.exists()`）」にしているFirebaseパスでは、作成後の`update()`は必ず権限エラーになる。** 「保存はできたが後から追記したい」という設計を思いついたら、まずそのパスの`.write`ルールが更新（update）も許可しているか確認すること。許可されていない場合は、追記したい情報を**最初のcreateに含める**（今回のように前処理の結果を先に確定させてから1回で保存する）か、別の権限モデルを検討する。

---

## このサイトで発生した問題と解決策

### 今月の主役の来年再利用
- **問題**: 単一オブジェクト保存だと削除しない限り古いデータが残らない
- **解決**: localStorage を配列形式に変更。`visible: true/false` フラグで公開管理。`visible !== false` パターンで後方互換性を確保

### カレンダーの1画面表示
- **問題**: セル・余白が大きくスクロールしないと全体が見えない
- **解決**: `.bcal` padding・セル高さ・グリッドgap・DOW padding を段階的に縮小

### スマホ横向きでヘッダーが画面を占有
- **解決**: `orientation:landscape` メディアクエリでロゴ縮小・上下余白を3pxに圧縮
- **⚠️ 2026-07-12修正**：当初サブテキスト「ケーキ屋さんこいまり」を`display:none`で非表示にしていたが、正式名称を常時表示する方針（後述）と矛盾するため、非表示ではなく9pxへの縮小表示に変更した

### モバイルでの予約FAB表示
- **問題**: モバイルでは横長バーのみで円形FABが非表示だった
- **解決**: `@media(max-width:900px)` で `.fab--pc{display:flex!important}` に上書きし、円形FABを全デバイスで表示

---

## 残作業（優先度順）

### 高優先
- [x] 【最重要・2026-07-09解決】ヒーロー画像・カテゴリ画像・おすすめ商品・体験プログラムの画像が、Firebaseではなく管理者自身のブラウザのlocalStorage（`koimari_images`キー）に保存されており、来店客には一切反映されていなかった問題 → オーナー指示のもと本格対応。admin.htmlの保存処理をFirebase（`siteImages`ノード）書き込みに変更し、ログイン時にFirebase側の最新データを取り込み直す処理を追加。index.html側はヒーロー・店舗紹介画像の描画を`renderHeroSlides()`/`renderGreetingImage()`として再実行可能な関数に切り出し、Firebaseのリアルタイム更新(`onValue`)を受けて再描画するよう変更（カテゴリ/おすすめ/体験プログラムは既存の`renderDynamic()`を再利用）。副次効果としてlocalStorage上限（約5MB）による「容量超過」エラーも大幅に緩和
  - **2026-07-09追記・重要**：実機テストで「保存に失敗しました」エラーが発生。原因はFirebase Realtime Databaseのセキュリティルールに`siteImages`用の許可が無かったため（`PERMISSION_DENIED`）。さらに調査した結果、**`corporate`（法人相談）・`noritate`（NORI&TATE問い合わせ）にもルールが存在しないことが判明**。つまり今日修正したはずの法人相談フォームのFirebase保存も、実際にはルール不足で送信の裏側では失敗し続けていた（画面上は成功表示のため気付けなかった）。オーナーがFirebase Consoleでルールに`corporate`・`noritate`・`siteImages`の3項目を追加・公開し、再テストで保存成功を確認済み（完全解決）。ルール詳細は下記「Firebase Realtime Database」セクション参照
- [x] 【重大バグ】法人相談フォーム(corporate.html)がFirebaseに保存されずlocalStorageのみだった → 2026-07-09修正。送信者本人のブラウザにしかデータが残らず、実際の見込み客からの問い合わせが管理画面に一切表示されない状態だった。reservation/experienceと同じFirebase(`corporate`ノード)への保存に統一し、admin.htmlの同期処理も追加済み
- [x] 管理画面の「全削除」ボタン(予約一覧・応募一覧・法人ご相談)がFirebase側を削除していなかった問題 → オーナー了承の上、2026-07-09に「ゴミ箱」方式で実装完了。「全削除」を押すと対象データを`trash/{reservations|experiences|corporate}`に退避してから本体を削除。各パネルの「ゴミ箱」ボタンから削除履歴（削除日時・件数）を確認でき、「復元」で元に戻す、「完全に削除」でゴミ箱からも消せる。あわせて応募一覧・法人ご相談に「未対応/対応完了」のステータス切替（予約一覧の4段階ステータスとは別に、オーナー希望の2段階でシンプルに）を追加。実データの削除操作を伴う変更だったため、実施前に一度オーナー確認を挟んだ
- [x] 【最重要・2026-07-09】お知らせ・ギャラリー・Instagram投稿・数字で見る・営業日設定・FAQ・お客様の声・ブログ・今月の主役の9項目が、画像と同じく管理者本人のブラウザのlocalStorageにしか保存されず、他の従業員・他の端末・実際の訪問者に一切反映されない「ガラパゴス状態」だった問題 → オーナーより「一つずつエラーチェックのように直すのはおかしい」との指摘を受け、全項目を横断する共通基盤として一括対応。admin.htmlの`saveByKey`/`saveSpotlightList`をFirebase（`koimariContent`ノード）書き込みに変更し、ログイン時にFirebase側の最新データを取り込み直す処理を追加。index.html（お知らせ・営業日カレンダー・今月の主役・数字で見る・お客様の声・Instagramカード）、gallery.html（ギャラリー・お客様の声）、faq.html、blog.htmlの読み取り側にもそれぞれFirebase(`onValue`)購読を追加。
  - **⚠️ 未完了（オーナー対応待ち）**：Firebase Consoleのセキュリティルールに`koimariContent`の許可ブロックがまだ無い。追加・公開するまでは上記9項目の保存が全て`PERMISSION_DENIED`で失敗する。ルールJSONは下記「Firebase Realtime Database」セクション参照
- [x] 【2026-07-09】商品カテゴリー・おすすめ商品の画像を押しても何も起きなかった問題 → 新規`product.html`を作成し、各カードのリンク先を`product.html?type=category|recommended&idx=N`に変更。個別ページでは複数写真（メイン画像＋管理画面から追加できる最大6枚のギャラリー）と説明文を表示。価格は仕様により非表示（元々ホームの`.rec-card__price`もCSSで`display:none`済みだった）。データはsiteImages（`categories`/`recommended`の各項目に`desc`・`gallery`を追加）を流用したため新しいFirebaseルールは不要。お知らせ欄はこれまで通り「見出し＋リンク先」のみのシンプル仕様のまま据え置き（オーナー了承済み）
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
- **画像アップロード時の自動リサイズ・圧縮**: `fileToDataUrl(file, maxWidth)`にCanvas APIによるリサイズ処理を追加。ヒーロー(1600px)・店舗紹介(900px)・カテゴリ(600px)・おすすめ商品(500px)・体験プログラム(800px)・お知らせ(800px)・ギャラリー(1000px)・ブログ(800px)の各パネルで、アップロード時に自動的に指定幅へ縮小・JPEG圧縮(品質85%)される。事前の手動リサイズが不要になり、受付ファイルサイズ上限も15MBに拡大。エラーメッセージも「解像度を小さくしてから」等、具体的な対処法を明記する文言に変更（他の従業員が使っても迷わないようにするための対応）
- **画像の切り抜き（クロップ）機能**: Cropper.js（CDN）を導入。ファイル選択後、各セクションの実際の表示比率（ヒーロー16:9・店舗紹介4:5・カテゴリ4:3・おすすめ商品1:1・体験プログラム5:3・お知らせ4:3・ギャラリー1:1・ブログ3:2）に固定した切り抜き範囲をドラッグで調整できるモーダルを表示。確定すると指定幅にリサイズ済みのJPEGを生成する。自動の中央クロップに任せず、ユーザーが被写体の位置を自分で選べるようにするための対応

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
