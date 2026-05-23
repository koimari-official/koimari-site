# こいまりサイト テンプレート活用手順書

このサイトを別事業のホームページのベースとして流用するための手順書です。

---

## 目次

1. [サイト概要・技術構成](#1-サイト概要技術構成)
2. [ファイル構成](#2-ファイル構成)
3. [新規事業向けカスタマイズ手順](#3-新規事業向けカスタマイズ手順)
4. [管理画面の使い方](#4-管理画面の使い方)
5. [GitHub Pagesへのデプロイ](#5-github-pagesへのデプロイ)
6. [日常的な更新作業](#6-日常的な更新作業)

---

## 1. サイト概要・技術構成

| 項目 | 内容 |
|------|------|
| 構成 | 静的HTML（サーバー不要） |
| 公開方法 | GitHub Pages（無料） |
| データ保存 | ブラウザの localStorage（DBサーバー不要） |
| デザイン | Tailwind CSS + オリジナルCSS変数 |
| フォント | Google Fonts（明朝体・ゴシック・英字） |
| アクセス解析 | Google Tag Manager |
| 多言語 | 日本語／英語切り替え（i18n.js） |

**メリット：** サーバー代不要、維持コストほぼゼロ  
**注意点：** データはブラウザに保存されるため、端末をまたいでの共有はできない（CSVエクスポートで対応）

---

## 2. ファイル構成

```
/
├── index.html          ← トップページ（メイン）
├── admin.html          ← 管理ページ（コンテンツ更新・予約管理）
├── reservation.html    ← 予約フォーム
├── gallery.html        ← ギャラリーページ
├── blog.html           ← ブログページ
├── faq.html            ← よくある質問
├── experience.html     ← 体験プログラム
├── corporate.html      ← 法人向けページ
├── tokushoho.html      ← 特定商取引法に基づく表記
├── privacy.html        ← プライバシーポリシー
├── terms.html          ← 利用規約
├── i18n.js             ← 日英切り替え機能
├── error-tracker.js    ← エラー記録
├── CLAUDE.md           ← AI作業ルール（Claude Code用）
└── MANUAL.md           ← この手順書
```

---

## 3. 新規事業向けカスタマイズ手順

### ステップ1：リポジトリを複製する

1. GitHubでこのリポジトリをフォーク（または全ファイルをダウンロード）
2. 新しいリポジトリ名を事業名に変更（例：`hanahana-site`）
3. リポジトリをローカルにクローン

```bash
git clone https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
cd YOUR_REPO
```

---

### ステップ2：「koimari」を事業名に一括置換

以下のキーワードをテキストエディタの「全ファイル一括置換」で変更します。

| 置換前 | 置換後（例） | 対象 |
|--------|------------|------|
| `koimari` | `hanahana` | ローカルストレージのキー名（全HTMLファイル） |
| `こいまり` | `はなはな` | 表示テキスト |
| `KOIMARI` | `HANAHANA` | ヘッダーロゴ |
| `koimari2026` | `hanahana2026` | 管理ページのパスワード |

**VS Codeでの一括置換：**  
`Ctrl + Shift + H` → 検索欄に置換前の文字 → 置換欄に置換後の文字 → 「すべて置換」

---

### ステップ3：カラーテーマを変更する

`index.html` の先頭近くにある `:root{}` ブロックを編集します。

```css
:root {
  --color-bg: #f7f3ee;        /* ページ背景色 */
  --color-bg-soft: #ede3d4;   /* ナビ・カードの背景 */
  --color-text: #2e2118;      /* 本文テキスト色 */
  --color-text-soft: #4a3a2a; /* サブテキスト色 */
  --color-accent: #c9a96e;    /* アクセントカラー（ボタン・見出し） */
  --color-accent-dark: #a88a52; /* アクセントの濃い版（ホバー） */
  --color-line: #d8baa4;      /* ボーダー・区切り線 */
}
```

ここを変えるだけでサイト全体の色が変わります。

**カラーピッカーの参考サービス：**
- coolors.co でパレット生成
- imagecolorpicker.com でロゴ画像から色を取得

---

### ステップ4：事業者情報を変更する

以下のファイルと箇所を変更します。

#### `index.html`（メタ情報・構造化データ）

```html
<!-- タイトルと説明（SEO） -->
<title>○○○｜事業の説明｜所在地</title>
<meta name="description" content="説明文">

<!-- OGP（SNSシェア時の表示） -->
<meta property="og:title" content="○○○">
<meta property="og:url" content="https://YOUR_DOMAIN/">
<meta property="og:image" content="https://YOUR_DOMAIN/ogp.jpg">

<!-- 構造化データ（Googleに事業情報を伝える） -->
<script type="application/ld+json">
{
  "name": "事業名",
  "telephone": "電話番号",
  "address": { ... },
  ...
}
</script>
```

#### `tokushoho.html`（特定商取引法）

販売事業者名、代表者名、住所、電話番号、営業時間をすべて変更します。  
法的ページなので正確に記載してください。

#### `index.html`（フッター・店舗情報セクション）

フッターと「店舗情報」セクション（`#shop`）の住所・電話・営業時間を変更します。

---

### ステップ5：管理ページのパスワードを変更する

`admin.html` の約620行目：

```javascript
const ADMIN_PASSWORD = "koimari2026"; // ← ここを変更
```

変更後のパスワードは必ずメモしておいてください。

---

### ステップ6：Google Tag Managerを設定する

1. [tagmanager.google.com](https://tagmanager.google.com) で新しいアカウント・コンテナを作成
2. 発行されたIDをコピー（例：`GTM-XXXXXXX`）
3. 全HTMLファイルの `GTM-MB2XHF6J` を新しいIDで一括置換

```html
<!-- この2箇所が各ファイルにある -->
'GTM-MB2XHF6J'  → 'GTM-XXXXXXX'
?id=GTM-MB2XHF6J → ?id=GTM-XXXXXXX
```

---

### ステップ7：ヒーロー画像・OGP画像を用意する

| 画像 | 推奨サイズ | 用途 |
|------|-----------|------|
| ヒーロー画像1〜3枚 | 1920×1080px | トップのスライドショー |
| OGP画像 | 1200×630px | SNSシェア時のサムネイル |
| ファビコン | SVG or 32×32px | ブラウザタブのアイコン |

---

### ステップ8：ナビゲーションを事業に合わせて調整する

不要なページへのリンクは `index.html` のナビ部分から削除します。

```html
<nav id="globalNav" ...>
  <ul ...>
    <li><a href="#about" class="nav-link">○○について</a></li>
    <!-- 不要な項目は削除 -->
  </ul>
</nav>
```

---

## 4. 管理画面の使い方

URLの末尾に `/admin.html` を付けてアクセスします。  
（例：`https://YOUR_DOMAIN/admin.html`）

### ログイン

- パスワードを入力してログイン
- セッションはブラウザを閉じるまで維持

### 主な機能

| タブ | できること |
|------|-----------|
| 画像管理 | 商品写真のアップロード・削除・並び替え |
| 今月の主役 | トップページに表示するフィーチャー商品の設定（公開/非公開/ストック管理） |
| ニュース | お知らせの追加・編集・削除 |
| 予約管理 | 予約一覧の確認・CSVエクスポート |
| カレンダー | 定休日・臨時休業日・イベントの登録 |
| クーポン | 割引クーポンコードの発行 |
| 売上記録 | 手動での売上入力・月次グラフ |
| AI翻訳 | Claude APIキーを設定して日英自動翻訳 |

### 今月の主役（スポットライト）の運用

1. 「＋新規追加」でケーキ情報を入力
2. 「公開」にチェックして保存
3. 翌月は「非公開」にしてストック保存（削除しない）
4. 来年同じ時期に再び「公開」に変更して再利用可能

---

## 5. GitHub Pagesへのデプロイ

### 初回設定

1. GitHubでリポジトリを作成（Public）
2. Settings → Pages → Source: `main` ブランチ → Save
3. 数分後に `https://USERNAME.github.io/REPO_NAME/` で公開

### 独自ドメインを使う場合

1. ドメインを取得（お名前.com、Xserverドメイン等）
2. DNS設定でGitHub PagesのIPに向ける
3. Settings → Pages → Custom domain に入力
4. HTTPSを有効化

### 更新の流れ

```bash
# ファイルを編集後
git add .
git commit -m "更新内容の説明"
git push origin main
# → 数分後に自動反映
```

---

## 6. 日常的な更新作業

### ニュース・お知らせを追加する

`admin.html` → 「ニュース」タブ → 「追加」  
→ タイトル・日付・本文を入力して保存

### カレンダーを更新する（定休日・イベント）

`admin.html` → 「カレンダー」タブ  
→ 日付をクリックして「定休日」または「イベント」を登録

### 予約を確認する

`admin.html` → 「予約管理」タブ  
→ 一覧表示 / CSVダウンロードで管理

### Instagram連携

`admin.html` → 「Instagram」タブ  
→ InstagramのURLを入力してサイトに表示

---

## 補足：カスタマイズしてはいけない箇所

| 箇所 | 理由 |
|------|------|
| `localStorage` のキー名 | `koimari_` → 新事業名に変更すること（残るとデータが混在）|
| `ADMIN_PASSWORD` | デフォルトのまま本番運用しないこと |
| 特定商取引法のページ | 法的義務があるため必ず正確に記載 |
| canonical URL / OGP URL | 実際のドメインに変更しないとSEOに悪影響 |

---

*最終更新：2026年5月*
