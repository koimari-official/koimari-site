# 作業手順書（分岐チェックリスト）

> **これはClaude Code（AI）への作業指示です。** このサイトに変更を加える際は、
> 「完了しました」と報告する前に必ずこのファイルの該当する分岐を通し、チェック項目を
> 実際に確認すること。2026-09-03、予約機能がFirebaseのルール欠落で長期間実質的に
> 動いていなかった不具合が見過ごされていたことを受けて作成。

## 使い方

1. これから行う変更が下の「Q1」のどれに該当するか判断する（複数該当することが多い）
2. 該当する枝を**すべて**開き、チェック項目を実際に実行する（読むだけで済ませない）
3. 全部にチェックが付くまで「完了」と報告しない

---

## Q1. 何を変更しますか？（複数選択可）

```
Q1
├─ A. サイトの見た目・文言（HTML/CSS/JS）だけ
├─ B. Firebaseに保存されているデータの中身（FAQ・ギャラリー・クーポン等）
├─ C. Cloud Functions（functions/index.js）のロジック
├─ D. リッチメニューの画像・レイアウト
├─ E. Firebaseのセキュリティルール（database.rules.json）
└─ F. 予約・LINE連携・料金など「お客様の操作が最後まで通るか」に関わる変更
     （たいていA〜Eの複数にまたがる。F単体では終わらせず、該当する他の枝も辿ること）
```

---

### A. サイトの見た目・文言（HTML/CSS/JS）だけ

- [ ] 変更箇所が**他のページにも同じ文言・ロジックの重複がないか**`grep`で横断確認した
      （例: 電話番号・予約締切日数・営業時間は index.html / member.html / functions/index.js
      など複数ファイルに同じ値が重複しがち。1箇所直して満足しない）
- [ ] 変更後、ブラウザ（可能ならスマホ幅）で実際に表示を確認した
- [ ] `git add` → `git commit` → `git push origin main`（GitHub Pagesは自動反映、数分かかる）

---

### B. Firebaseに保存されているデータの中身（FAQ・ギャラリー・クーポン等）

**重要な原則**: このサイトのFAQ・ギャラリー等は「コード内のDEFAULT_XXXフォールバック値」と
「Firebase実データ」の**2箇所**に存在する。**コードのフォールバックだけ直して満足しない。**
フォールバックは「Firebase未接続時の保険」であり、通常は実データの方が表示される。

- [ ] コード内の`DEFAULT_FAQ`等のフォールバック値を更新した（該当ファイルすべて。
      `grep -rn "DEFAULT_FAQ\|DEFAULT_GALLERY\|DEFAULT_HOLIDAYS"`等で横断確認）
- [ ] **本番Firebaseの実データも同じ内容に更新した**
      （`firebase database:get "/koimariContent/<path>"` で現状を取得 →
      `firebase database:set "/koimariContent/<path>/<具体的なキー>" -d '"新しい値"' --force`
      で該当箇所だけをピンポイントに更新。配列全体を丸ごと上書きしない）
- [ ] 更新後、`curl "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app/koimariContent/<path>.json"`
      で実際に新しい内容が返ってくることを確認した
- [ ] admin.html管理画面から見ても同じ内容になっているか（余裕があれば）確認した

---

### C. Cloud Functions（functions/index.js）のロジック

- [ ] `node --check functions/index.js` で構文エラーが無いことを確認した
- [ ] `cd functions && node test-local.js` を実行し、**全項目がOKになる**ことを確認した
      （既存テストを壊していないか。新しいロジックには可能ならテストケースも追加する）
- [ ] デプロイ対象の関数名を正確に特定した（例: `lineWebhook`、`ensureRichMenu`、
      `sendPickupReminders`、`notifyStaffOnNewReservation`）
- [ ] **`firebase deploy --only functions:<関数名1>,functions:<関数名2>` のように、
      変更した関数だけを明示的に指定してデプロイした**
      （`--only functions` だけの無指定・全体デプロイは絶対に行わない。この
      Firebaseプロジェクトは他アプリの関数と共存しているため、無指定デプロイは
      ローカルに存在しない他アプリの関数を削除しようとする。過去に実際発生した事故）
- [ ] デプロイ後、`firebase functions:log --only <関数名> -n 20` 等でエラーが出ていないか確認した

---

### D. リッチメニューの画像・レイアウト

詳細手順は `functions/assets/richmenu-src/README.md` を参照。ここでは見落としやすい点のみ。

- [ ] 新しい画像を `functions/assets/richmenu-main.jpg` に保存した
- [ ] レイアウト（タップ領域の位置・個数）を変えた場合、`functions/index.js` の
      `RICHMENU_AREAS` の並び順・座標を画像と一致するよう更新した
- [ ] **`RICHMENU_VERSION` の値を必ず変更した**（画像だけ差し替えてこれを忘れると、
      `ensureRichMenu`が「既に正しいバージョンが設定済み」と誤認し、何も起きない。
      今回のセッションで2回、この手順を忘れかけた）
- [ ] `firebase deploy --only functions:ensureRichMenu` でデプロイした
- [ ] 反映は毎日4:00(JST)の自動実行を待つか、オーナーにCloud Schedulerでの
      手動実行を依頼する旨を伝えた（このAI自身は手動実行できないことを明示する）

---

### E. Firebaseのセキュリティルール（database.rules.json）

**最重要**: ここでのミスは「一部の機能が原因不明のまま動かなくなる」という、
最も発見しにくい種類の障害を生む（2026-09-03、`lineMembers`のルール欠落が
長期間気づかれなかった実例あり）。

- [ ] 変更前に必ず `firebase database:get "/.settings/rules" --project koimari-tasting --instance koimari-tasting-default-rtdb`
      で**現在のライブルールを取得**した（Git管理下の`database.rules.json`が
      実際にデプロイ済みの内容と一致しているとは限らない。必ずライブを正とする）
- [ ] 変更は**既存ルールの削除・上書きを一切せず、新しいパスの追加のみ**の
      差分にした（`database.rules.json`をこのライブ取得結果ベースで作り直す）
- [ ] `firebase deploy --only database` でデプロイした
- [ ] デプロイ後、新しく追加したパスに対して**未認証の`curl`で実際に読み書きできるか**
      テストした（例: `curl "https://koimari-tasting-default-rtdb.asia-southeast1.firebasedatabase.app/<path>.json"`）。
      ブラウザで動くはず、という推測だけで済ませない
- [ ] テストで作成したダミーデータは `firebase database:remove "<path>" --force` で
      必ず削除した（本番データに残さない）
- [ ] 新しくFirebaseパスを使うページ・関数を追加するたびに、このEの手順を
      忘れずに実施する（`koimariContent`のように「動いているはず」と思い込んで
      何年も未確認、という事態を避けるため、**新しいパスを1つ追加したら
      その場でcurlテストする**習慣にする）

---

### F. 予約・LINE連携・お客様が最後まで操作を完了できるか

このカテゴリは「コード上は正しく見えるが実際には動かない」不具合が最も起きやすい
（Firebase権限・LIFF認証・LINEアプリ内外の挙動差など、ローカルの構文チェックだけでは
検出できない要因が絡むため）。

- [ ] 該当するA〜Eの枝をすべて辿った
- [ ] 可能であれば、**実際にLINEアプリから**（ブラウザ単体のテストでは不十分）
      一連の操作を最初から最後まで試すよう、オーナーに具体的な確認依頼をした
      （「〇〇ボタンを押して、△△まで進めていただけますか」と具体的に）
- [ ] お客様が見るエラーメッセージ・完了メッセージの文言を実際に確認した
      （`member.html`の`errorDetail`表示のように、エラー時の原因究明手段が
      仕組みとして残っているか）
- [ ] 過去に同種の不具合が無かったか `CLAUDE.md` の該当セクションを確認した

---

## 過去に実際に起きた事故（教訓）

| 日付 | 事故 | 原因 | 再発防止 |
|---|---|---|---|
| 2026-09-03 | LINE予約フォームが「Permission denied」で開けない | `lineMembers`・`koimariContent`・`koimariOps`のFirebaseルールが存在せず、未認証アクセスが全拒否 | Eの手順化。新パス追加時は必ずcurlで動作確認 |
| （過去、koimari-tasting Firebase共有プロジェクトにて） | 無関係な関数(`api`等)が消えかけた | `firebase deploy --only functions`を無指定で実行 | Cの手順化。関数名を必ず明示指定 |
| 2026-09-01〜03 | リッチメニューの新デザインが反映されない | 画像だけ差し替えて`RICHMENU_VERSION`の更新を忘れた | Dの手順化。バージョン更新をチェック項目に明記 |
