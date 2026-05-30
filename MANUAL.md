# HP作成 汎用標準ガイド

> このファイルはプロジェクト横断で再利用できる汎用ガイドです。  
> プロジェクト固有の実装詳細は `CLAUDE.md` を参照してください。

---

## 目次

0. [Claudeへの指示：MDファイルの自動管理ルール](#0-claudeへの指示mdファイルの自動管理ルール)
1. [クロスデバイス設計の基本](#1-クロスデバイス設計の基本)
2. [よくある不具合とバスター](#2-よくある不具合とバスター)
3. [確認チェックリスト（3環境）](#3-確認チェックリスト3環境)
4. [CSS設計の基本ルール](#4-css設計の基本ルール)
5. [JSの注意点（IntersectionObserver）](#5-jsの注意点intersectionobserver)
6. [静的HTML構成での注意点](#6-静的html構成での注意点)
7. [GitHub Pagesへのデプロイ](#7-github-pagesへのデプロイ)

---

## 0. Claudeへの指示：MDファイルの自動管理ルール

> **これはClaude Code（AI）への作業指示です。HPを作成・更新する際は必ずこのルールに従ってください。**

### 2ファイル構成の役割分担

| ファイル | 役割 | 内容 |
|---------|------|------|
| `MANUAL.md` | **汎用テンプレート**（このファイル） | どのHPでも使える設計ルール・エラーバスター・チェックリスト |
| `CLAUDE.md` | **プロジェクト固有の実装詳細** | そのHPのセクション・CSS変数・JS・発生した問題と解決策 |

### 新規HPプロジェクト開始時にすること

1. `MANUAL.md`（このファイル）を新プロジェクトのフォルダにコピーする
2. `CLAUDE.md` を新規作成し、以下の項目をそのプロジェクト用に記述する：
   - プロジェクト概要・技術スタック
   - レイアウト構造（サイドバー構成・ヒーロー制御など）
   - ファイル構成（画像ファイル名・数）
   - セクション一覧（ID・表示名・内容・背景画像）
   - CSS変数の実際の値
   - レスポンシブブレークポイントと適用内容
   - 使用したJSの主要コード
   - 会社情報・連絡先

### 作業中に自発的に更新するタイミング

#### CLAUDE.md を更新するタイミング（毎回）
- 新しいセクションを追加したとき → セクション一覧に追記
- CSSを大きく変更したとき → CSS変数・ブレークポイントを更新
- JSを変更したとき → 実装コードを最新版に更新
- 不具合を発見して修正したとき → 「発生した問題と解決策」に追記
- ファイル（画像など）を追加したとき → ファイル構成に追記

#### MANUAL.md を更新するタイミング（必要なとき）
- 新しい種類の不具合を発見・解決したとき → 「よくある不具合とバスター」に追記
- 新しいクロスデバイス対応パターンを実装したとき → 該当セクションに追記
- チェックリストに抜けが見つかったとき → 追記
- **NORI&TATE固有の内容は書かない。汎用的に使える内容のみ記載する**

### CLAUDE.md の基本テンプレート構成

新規HPで `CLAUDE.md` を作成する際は以下の構成で記述すること：

```markdown
# CLAUDE.md — [プロジェクト名] 実装詳細

## プロジェクト概要
## 技術スタック
## レイアウト構造
## ファイル構成
## セクション構成（IDと背景画像の対応表）
## CSS変数（:root の実際の値）
## レスポンシブブレークポイント
## JS実装（ヒーローモード・セクション検知のコード）
## このサイトで発生した問題と解決策
## 会社・クライアント情報
## 修正時の注意
```

---

## 1. クロスデバイス設計の基本

### ブレークポイント設計

| 環境 | 幅の目安 | 高さの目安 | 主な考慮事項 |
|------|---------|-----------|------------|
| PC（デスクトップ） | 960px超 | — | フルレイアウト・サイドバーあり |
| タブレット・横向きスマホ | 661〜959px | — | サイドバー縮小または非表示 |
| 縦向きスマホ | 660px以下 | — | 縦一列・ナビは上部固定バー |
| 横向きスマホ（追加） | 661px超 | 500px以下 | 縦方向の余白を大幅に削減 |

```css
/* タブレット・右サイドバー非表示 */
@media (max-width: 960px) { ... }

/* 縦向きスマホ：上部固定ナビ */
@media (max-width: 660px) { ... }

/* 横向きスマホ：高さが非常に短い状態への個別対応 */
@media (orientation: landscape) and (max-height: 500px) { ... }
```

> **ポイント：** 横向きスマホは「幅は広いが高さが非常に短い」特殊な状態。`max-width`だけでは拾えないため、`orientation: landscape` と `max-height` の組み合わせで別途対応する。

### ナビゲーション設計

- ハンバーガーメニューはJSが複雑になるため、小規模サイトは避ける
- スマホ縦向き：水平スクロールなし＋全ナビ項目が一画面に収まる配置が必須
- スマホ横向き：縦方向が短いため、ナビの `padding`・`font-size` を縮小し `overflow-y: auto` を設定
- 固定ナビを使う場合は `scroll-padding-top` でアンカーリンクのオフセットを設定

```css
/* 固定ナビがある場合のアンカー補正 */
@media (max-width: 660px) {
  html { scroll-padding-top: 70px; } /* 固定ナビの高さ分 */
}
```

---

## 2. よくある不具合とバスター

### 不具合1：画面回転後にスクロール検知が停止する

**症状：** 縦→横に回転すると背景切替・ナビ同期などが動かなくなる  
**原因：** `IntersectionObserver` の `rootMargin` は初期化時の `window.innerHeight` で固定される。回転後に画面高さが変わっても再計算されない  
**対処：**

```javascript
let _obs = [];
function initObservers() {
  _obs.forEach(o => o.disconnect());
  _obs = [];
  const navH = window.matchMedia('(max-width: 660px)').matches ? 70 : 0;
  const mid  = Math.round((window.innerHeight - navH) / 2);
  const topM = navH + mid;
  const botM = Math.max(0, window.innerHeight - topM);
  const rootMargin = `-${topM}px 0px -${botM}px 0px`;
  document.querySelectorAll('section[id]').forEach(s => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) activate(e.target.id); });
    }, { threshold: 0, rootMargin });
    obs.observe(s);
    _obs.push(obs);
  });
}
initObservers();

// リサイズ・回転時に再初期化（250ms デバウンス）
let _timer;
window.addEventListener('resize', function() {
  clearTimeout(_timer);
  _timer = setTimeout(initObservers, 250);
});
```

---

### 不具合2：固定要素の白背景がページ全体を覆う

**症状：** モバイルで固定サイドバー/ナビの白背景が画面全体を覆う  
**原因：** デスクトップCSSで `bottom: 0`（縦一杯）が設定されたまま、モバイルCSSで未リセット  
**対処：**

```css
@media (max-width: 660px) {
  #sidebar {
    bottom: auto;  /* ← これを必ず明示する */
    height: auto;
  }
}
```

---

### 不具合3：iOSで固定背景がスクロール時にズームする

**症状：** iPhoneで下スクロールするとアドレスバーが隠れ、`position: fixed` の背景がズームアニメーションする  
**原因：** `100vh` はアドレスバーの出入りで変動する  
**対処：**

```css
#bg-layer {
  height: 100vh;   /* フォールバック（古いブラウザ用） */
  height: 100lvh;  /* Large Viewport Height：アドレスバーの変動を無視 */
}
```

> `100lvh` は iOS Safari 16以降・Android Chrome 108以降に対応。

---

### 不具合4：横向きスマホでナビ下部が見切れる

**症状：** 横向きにするとサイドバーの下部ナビ（下の方の項目）が画面外に隠れる  
**原因：** デスクトップ用の大きな padding/margin が、高さ375〜430px程度の横向き画面に収まらない  
**対処：**

```css
@media (orientation: landscape) and (max-height: 500px) {
  #sidebar {
    padding-top: 1rem;
    padding-bottom: 1rem;
    overflow-y: auto;  /* 収まらない場合はスクロール可能に */
  }
  .sidebar-logo { margin-bottom: 1rem; }
  .sidebar-nav li a { padding: 0.28rem 0; font-size: 0.88rem; }
}
```

---

### 不具合5：固定幅列でテキストが折り返す

**症状：** 固定幅の左列（表題エリア）でテキストが途中で折り返す  
**原因：** フォントサイズ × 文字数が列幅を超過。ブラウザのフォントサイズ設定により超過幅が変わる  
**対処：**

```css
/* <br>による改行は維持しつつ、行内の折り返しのみ防ぐ */
.sec-head .s-title { white-space: nowrap; }
```

---

### 不具合6：横向きスマホでセクション表題が見えない

**症状：** `position: sticky` の表題列が横向き時に画面内に表示されない  
**原因：** 短い画面高さで sticky の `top` 値が画面外にはみ出す / セクション padding が大きすぎる  
**対処：**

```css
@media (orientation: landscape) and (max-height: 500px) {
  .sec-head { position: static; top: auto; }
  .sec-split { padding: 2.5rem 1.5rem; gap: 1.5rem; }
}
```

---

## 3. 確認チェックリスト（3環境）

コードを変更したら必ず以下3環境で確認してください。

### PC（960px超）
- [ ] フルレイアウト（サイドバー込み）が崩れていない
- [ ] サイドバーのナビが全項目表示される
- [ ] スクロールでセクション検知・背景切替が動作する
- [ ] sticky 要素が正しく固定される
- [ ] フォントサイズが読みやすい

### スマホ縦向き（660px以下）
- [ ] 上部固定ナビが白背景で表示され、コンテンツに被らない
- [ ] アンカーリンクがナビの下に正しく表示される（`scroll-padding-top`）
- [ ] ナビ項目が横並びで全て表示される
- [ ] 背景画像がスクロール時にズームしない（`100lvh` 使用）
- [ ] フォントサイズ・行間が読みやすい

### スマホ横向き（661〜959px・高さ≦500px）
- [ ] 固定ナビ/サイドバーのロゴ・テキストが背景外にはみ出していない
- [ ] ナビ項目が全て画面内に収まる（または `overflow-y: auto` でスクロール可）
- [ ] 画面回転後もスクロール検知（背景切替・ナビ同期）が動作する
- [ ] セクション表題が画面内に表示される
- [ ] 固定背景がズームしない

---

## 4. CSS設計の基本ルール

### 変数（`:root`）で値を一元管理

```css
:root {
  --col-l: 240px;          /* 左サイドバー幅 */
  --col-r: 220px;          /* 右サイドバー幅 */
  --serif: 'Noto Serif JP', serif;
  --sans:  'Noto Sans JP', sans-serif;
  --en:    'Montserrat', sans-serif;
  --white: #ffffff;
  --black: #111111;
  --mid:   #888888;
  --border:#e8e8e8;
}
```

### font-size は `clamp()` で可変対応

```css
h1 { font-size: clamp(最小rem, vw指定, 最大rem); }
/* 例：clamp(2rem, 5vw, 4rem) */
```

ブラウザのフォントサイズ設定に依存するため、`rem` + `vw` を組み合わせると様々な環境で安定する。

### z-index は用途別に整理する

| 用途 | z-index の目安 |
|------|--------------|
| 固定背景レイヤー | 1 |
| メインコンテンツ | 10 |
| 右サイドバー | 20 |
| 左サイドバー/ナビ | 30 |

### レスポンシブの記述順序

1. デスクトップ（デフォルト）で書く
2. `max-width` で段階的に縮小
3. 横向きスマホは `orientation: landscape` で個別対応（最後に記述）

---

## 5. JSの注意点（IntersectionObserver）

### 基本パターン

```javascript
// NG：ページ読み込み時に1回だけ生成（画面回転で壊れる）
new IntersectionObserver(callback, { rootMargin }).observe(el);

// OK：関数化して resize 時に再初期化
let _obs = [];
function initObs() {
  _obs.forEach(o => o.disconnect());
  _obs = [];
  const obs = new IntersectionObserver(callback, { rootMargin: calcMargin() });
  obs.observe(el);
  _obs.push(obs);
}
initObs();
let _t;
window.addEventListener('resize', () => { clearTimeout(_t); _t = setTimeout(initObs, 250); });
```

### 画面中央トリガーによるセクション検知

上下スクロールどちらでも確実に検知する方法：

```javascript
function calcRootMargin() {
  const navH = window.matchMedia('(max-width: 660px)').matches ? 70 : 0;
  const mid  = Math.round((window.innerHeight - navH) / 2);
  const topM = navH + mid;
  const botM = Math.max(0, window.innerHeight - topM);
  return `-${topM}px 0px -${botM}px 0px`;
}
// threshold: 0 で「セクションの端が中央ラインを通過した瞬間」に発火
```

---

## 6. 静的HTML構成での注意点

- お問い合わせフォームはサーバーサイド処理が不可のため、外部サービスを使用する  
  - **Formspree**（推奨）：無料50件/月。`<form action="https://formspree.io/f/[ID]">` のみで動作  
- 外部画像（Unsplash等）はインターネット接続が必要。低速環境では読み込まれない場合がある  
- Google Fonts は初回読み込みで遅延が発生することがある。重要テキストにはシステムフォントをフォールバックとして設定する  
- `index.html` 1ファイル構成にすることで、デプロイ・管理コストをほぼゼロにできる

---

## 7. GitHub Pagesへのデプロイ

### 初回設定

1. GitHub でリポジトリを作成（Public）
2. `index.html` と画像ファイルをリポジトリにアップロード
3. Settings → Pages → Source: `main` ブランチ → Save
4. 数分後に `https://USERNAME.github.io/REPO_NAME/` で公開

### 独自ドメインを使う場合

1. ドメインを取得（お名前.com・Xserver等）
2. DNS設定でGitHub PagesのIPアドレスに向ける
3. Settings → Pages → Custom domain に入力
4. HTTPSを有効化

### 更新の流れ

```bash
git add index.html
git commit -m "更新内容の説明"
git push origin main
# → 数分後に自動反映
```

---

*汎用テンプレート。プロジェクト固有の実装詳細は CLAUDE.md へ。*
