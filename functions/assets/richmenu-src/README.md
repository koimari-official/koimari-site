# リッチメニュー画像の編集方法

`functions/assets/richmenu-main.jpg`（LINEに配信している実際の画像、2500×1686px）の元データ一式です。
1マス833〜834×843pxの6分割（左上=季節限定メニュー、その他5マス）を、HTML+CSSをブラウザで
スクリーンショットして1枚のJPEGに書き出す方式で作っています。

## ファイル構成

- `richmenu-source.html` — 全体のレイアウト・配色・フォントを定義する元HTML。これをブラウザで開く（または
  Playwright等でスクリーンショット）と `richmenu-main.jpg` と同じ見た目が確認できる
- `tanukichi_cutout.png` — 季節限定メニュー枠の「たぬきち」イラスト（背景透過済み）
- `koimari-logo.png` — 店舗情報枠に使っているロゴ（`古伊万里`の手毬柄、サイトヘッダーと共通）
- `itachoco_block.png` / `whitechoco_block.png` — 茶色マス／ベージュマスの背景に使っている、
  板チョコ写真から1ブロックだけ切り出した画像（ベージュ版は輝度から色を再マッピングして作成）
- `openmoji/*.svg` — 各アイコンの元SVG。ご予約=`cake.svg`（自作、キャンドル+苺付き）、
  ギャラリー=`cheki.svg`（自作、断面が見えるカットケーキ）、クーポン=`ticket3.svg`（自作、
  オーナー提供の参考画像を元に作成）。`ticket.svg`/`ticket2.svg`は使用していない旧案
  （[OpenMoji](https://openmoji.org)由来、CC BY-SA 4.0）

## 季節限定メニューの絵を差し替える場合

1. `richmenu-source.html` 内の `<img class="hero__bg" src="tanukichi_cutout.png">` の `src` を
   新しい画像ファイル名に変更する（同じフォルダに新しい透過PNG/JPGを置く）
2. 背景が透明でない画像を使う場合は、`.hero` の `background` グラデーションと相性を見ながら
   `object-fit: contain` のままでよいか確認する
3. 下記「反映手順」で書き出し・デプロイする

## アイコンを差し替える場合

各アイコンは `.sil` 内にSVGをインラインで埋め込んでいます（`__ICON_CAKE__` 等のプレースホルダーを
Pythonスクリプトで実SVGに置換してから書き出す運用でした）。新しいアイコンに変える場合：

1. [OpenMoji](https://openmoji.org) や他のSVGアイコンから素材を探す（線画・シンプルな形が合う）
2. `openmoji/` フォルダに保存
3. `richmenu-source.html` の該当 `.sil` の中身を差し替える（色は `#000000` または `#000` を使っておくと、
   書き出しスクリプト側で `stroke` 色を一括置換できる）

## 反映手順（画像を1枚のJPEGとして書き出し、LINEに配信するまで）

1. `richmenu-source.html` を編集する
2. ブラウザ（Playwright推奨、2500×1686のビューポートでスクリーンショット）で1枚のJPEGとして書き出す
3. 書き出した画像を `functions/assets/richmenu-main.jpg` として保存する
4. `functions/index.js` の `RICHMENU_VERSION` の値を必ず変更する
   （例: `"2026-09-01-tanukichi"` → `"2026-10-01-halloween"` など、日付+内容がわかる文字列にする）
   **これを更新し忘れると、画像を差し替えても自動反映されません**（`ensureRichMenu` は
   バージョン文字列が変わった時だけ新しいリッチメニューを作り直す仕組みのため）
5. `RICHMENU_AREAS` のタップ先URLを変える場合は同じファイル内の該当箇所を編集する
6. デプロイ: `firebase deploy --only functions:ensureRichMenu`（他の関数を巻き込まないよう必ずこの
   スコープ指定で。詳細は`CLAUDE.md`または過去のやり取り参照）
7. `ensureRichMenu` は毎日4:00(JST)に自動実行されるため、最大1日で反映される。すぐ反映したい場合は
   Firebase ConsoleのCloud Scheduler画面から手動実行するか、Jobsに直接デプロイ後の即時実行を依頼する
