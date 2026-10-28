/* デコレーションケーキの見積もり計算（2026-09-24、オーナー提供の「ケーキオーダー仕様」に基づく）。
   すべて税込。2026-09-29オーナー指示により、特殊仕様が無い注文（1段・別途ご案内の項目なし）は
   「確定金額」として表示する（member.htmlのyenFixed）。積算しきれない場合のみ「〇〇円〜」（fromYen）。
   予約フォーム(member.html)からもテスト(Node)からも使えるよう、DOMに依存しない純粋な関数にしている。
   単段の基本料金・生クリームたっぷり乗せ・ろうそく・メッセージプレートの金額は、従来どおり
   admin.html（Firebase koimariContent/cake*）で管理している値を base として渡す。 */
(function (root) {
  var SPEC = {
    // ベースの種類ごとに作れる号数（2026-10-03オーナー確認：グランマニエ＝ムースは4号のみ）。ここに無いベースは4〜7号
    baseSizes: { "ムース": ["3号"], "ミッシェルBOX": ["5号"], "ガトーショコラBOX": ["5号"] }, // 2026-10-28オーナー指示：グランマニエBOX（ムース）は3号相当（10/25の「4号」から戻した）／2026-10-21：ミッシェル・ガトーショコラは5号のみ
    // 2段・3段で、その段に入れられる種類の条件（2026-10-21オーナー指示）
    //  ムース（グランマニエBOX）＝一番上の段だけ（4号＝2段の6号+4号の上）／ミッシェル・ガトーショコラ＝5号になる段だけ（3段の一番上は不可）
    tierOnlyTop: ["ムース"],
    // フルオーダー扱いのベース（料金表に載せず、お見積もり・納期は別途ご回答。2026-10-03：モンブラン）
    customBases: ["モンブラン", "ブルーベリーケーキ"], // 2026-10-26：ブルーベリーBOXもフルオーダー・要お見積もり
    sizes: {
      "3号": { cm: "約9cm", serves: "2〜3人前" },
      "4号": { cm: "約12cm", serves: "3〜4人前" },
      "5号": { cm: "約15cm", serves: "5〜6人前" },
      "6号": { cm: "約18cm", serves: "7〜8人前" },
      "7号": { cm: "約21cm", serves: "9〜10人前" }
    },
    christmas: { deadlineMonth: 12, deadlineDay: 20, webDeadlineDay: 18 }, // 締切：店頭は12/20、Web・お電話は12/18（2026-10-28オーナー指示・チラシどおり）
    fruitTopping: { "セルクル": 500, "3号": 600, "4号": 900, "5号": 1300, "6号": 1600, "7号": 1900 }, // 2026-10-22オーナー指示（ケーキ・タルト共通。多段は段ごと）
    chocoCream: 500,
    colorCream: { 1: 500, 2: 1000, 3: 1500 },
    // ミッシェルBOX・ガトーショコラBOXの「フルーツトッピング」はいちごトッピングの意味（オーナー確認 2026-09-24）。
    strawberryAdd: { price: 1000, creamTypes: ["ミッシェルBOX", "ガトーショコラBOX"] },
    // 特殊仕様の種類：通常と納期が異なる（材料の仕入れに2週間程度かかる場合がある。オーナー指示 2026-09-26）。
    specialTypes: { "ブルーベリーケーキ": { leadSoft: 14 } },
    tartTypes: ["フルーツタルトBOX", "ストロベリータルトBOX"], // カットケーキを載せられる種類
    onsiteAssemblyFee: 15000, // 3段の出張組み立て料の最低額。遠方の場合は交通費を加算（2026-10-26オーナー指示：15,000円〜）
    onsiteLeadDays: 15, // 出張を伴うご予約は、お受け取りの15日前まで（2026-10-26オーナー指示：パティシエ不在中の人手を確保するため）
    plainCreams: ["生クリーム", "生チョコクリーム"], // 単段の基本料金(sizePrices)がそのまま当てはまる種類
    // 2段・3段は「段ごとの合計」ではなく組み合わせごとの固定価格。lead＝箱・資材調達のため、
    // お受取日の何日前までに要予約か（min＝これを切ったらネット予約不可、soft＝これを切ったら調達状況次第）。
    // 3段のリードタイムは取り決めが無いため、土台となる2段の組み合わせと同じにしている（assumed）。
    // 一番上をカットケーキにした場合（オーナー決定 2026-09-30）：一番上をホールケーキ（セルクル・3〜5号）にした
    // 同じ組み合わせのセット価格から、一番下の段の号数に応じた金額を引き、選んだカットケーキの代金を足す。
    cutTopDeduction: { "4号": 500, "5号": 700, "6号": 1000, "7号": 1200 },
    // 一番上をカットケーキにしたときに、価格の基準にする「ホールケーキの一番上」
    cutTopBase: { "4号": "セルクル", "5号": "3号", "6号": "4号", "7号": "5号", "6号+4号": "セルクル", "7号+5号": "3号" },
    // おまかせデコレーション（パティシエがケーキに合わせて飾り付け。2026-10-06オーナー決定）
    omakaseDeco: { "松": 3000, "竹": 2000, "梅": 1000 },
    multiTier: {
      "4号+セルクル": { price: 5500 },
      "5号+3号": { price: 8200, lead: { min: 7, soft: 10 } },
      "6号+3号": { price: 9800, lead: { min: 7, soft: 10 } }, // 下6号の上は4号か3号を選べる（2026-10-28オーナー指示・¥9,800）。納期は6号+4号と同じ
      "6号+4号": { price: 11600, lead: { min: 7, soft: 10 } },
      "7号+5号": { price: 16800, lead: { min: 14, soft: 14 } },
      // 3段は1段ずつ箱に入れてお渡しする（専用の箱は不要）ため、箱の調達による納期は設けない。通常どおりお受取日の3営業日前まで（2026-10-22オーナー指示）
      "6号+4号+セルクル": { price: 17000 },
      "7号+5号+3号": { price: 22000 }
    }
  };

  function tierKey(v) {
    v = String(v || "");
    if (v.indexOf("カットケーキ") === 0) return "カットケーキ";
    return v.split("(")[0];
  }
  function comboKey(values) { return values.map(tierKey).join("+"); }
  // 段の組み合わせのセット価格・納期。一番上がカットケーキなら、ホールケーキの組み合わせを基準に差し引く。
  function resolveCombo(tiers) {
    var keys = (tiers || []).filter(Boolean).map(tierKey);
    if (keys.length < 2) return null;
    if (keys[keys.length - 1] !== "カットケーキ") return SPEC.multiTier[keys.join("+")] || null;
    var lower = keys.slice(0, -1).join("+");
    var baseTop = SPEC.cutTopBase[lower];
    var baseCombo = baseTop && SPEC.multiTier[lower + "+" + baseTop];
    var ded = SPEC.cutTopDeduction[keys[0]];
    if (!baseCombo || ded == null) return null;
    return { price: baseCombo.price - ded, lead: baseCombo.lead, cutTop: true, basePrice: baseCombo.price, deduction: ded };
  }
  // タルトの2段＝一番下がタルト・上がカットケーキ（2026-10-26オーナー指示：タルトの上にホールケーキは載せられない）。
  // 料金・納期は「タルトにカットケーキを載せる」と同じ（タルト代＋カットケーキ代＋入れ物代・納期は通常どおり。2026-09-26オーナー確認）
  function isTartCut(tiers, bottomCream) {
    var keys = (tiers || []).filter(Boolean).map(tierKey);
    return keys.length === 2 && keys[1] === "カットケーキ" && SPEC.tartTypes.indexOf(bottomCream || "") >= 0;
  }
  // ===== ろうそく（2026-10-26オーナー指示）=====
  // ナンバーろうそくは0〜9の番号ごとに本数（candleNumbers=[{num,qty}]）、普通のろうそくは袋数（candlePlainBags）。両方選べる。
  // 以前の形（candleType＋candleBags。ナンバーは文字数だけで番号の指定なし）の予約も読めるようにする。
  function candleParts(d) {
    if (!d || !d.candleNeeded) return { numbers: [], plainBags: 0, legacy: "" };
    if (d.candleNumbers || d.candlePlainBags != null) {
      return { numbers: (d.candleNumbers || []).filter(function (c) { return c && String(c.num) !== "" && Number(c.qty) > 0; }).map(function (c) { return { num: String(c.num), qty: Number(c.qty) }; }), plainBags: Number(d.candlePlainBags) || 0, legacy: "" };
    }
    var n = Number(d.candleBags) || 1;
    if (d.candleType === "ナンバーろうそく") return { numbers: [], plainBags: 0, legacy: "ナンバーろうそく " + n + "文字", legacyCount: n };
    return { numbers: [], plainBags: n, legacy: "" };
  }
  function candleText(d) {
    var c = candleParts(d), parts = [];
    if (c.legacy) return c.legacy;
    if (c.numbers.length) parts.push("ナンバーろうそく " + c.numbers.map(function (x) { return "「" + x.num + "」" + x.qty + "本"; }).join("・"));
    if (c.plainBags > 0) parts.push("普通のろうそく " + c.plainBags + "袋");
    return parts.length ? parts.join("／") : "なし";
  }
  function formatCandleNumbers(list) { return (list || []).map(function (c) { return c.num + "×" + c.qty; }).join(" "); }
  // 「2×1 5×1」「25」（＝「2」と「5」を1本ずつ）「2,5」などを [{num,qty}] に（スタッフの予約変更画面用）
  function parseCandleNumbers(str) {
    var map = {}, order = [];
    function add(d, q) { if (!(d in map)) { map[d] = 0; order.push(d); } map[d] += q; }
    String(str || "").replace(/[０-９]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); }).replace(/[xX＊*✕]/g, "×")
      .split(/[\s、,，・\/／]+/).forEach(function (tok) {
        if (!tok) return;
        var m = /^(\d)×(\d+)$/.exec(tok);
        if (m) add(m[1], Number(m[2]));
        else if (/^\d+$/.test(tok)) tok.split("").forEach(function (d) { add(d, 1); });
      });
    return order.map(function (d) { return { num: d, qty: map[d] }; });
  }
  function yen(n) { return "¥" + Number(n).toLocaleString(); }
  function fromYen(n) { return yen(n) + "〜"; }

  // input: { tiers:[サイズ値...], creamType, decoration, creamTopping, colorCreamCount, strawberryAdd, addOns, onsiteAssembly,
  //          candleNeeded, candleType, candleBags, messageCount, occasion }
  // base : { sizePrices, typePrices, cutContainerFee, creamToppingPrice, chocoCream, candlePlain, candleNumber, messagePlate }（admin管理の値。chocoCreamは未指定ならSPECの値）
  function estimate(input, base) {
    var lines = [], notes = [], consult = false;
    var tiers = (input.tiers || []).filter(Boolean);
    var isXmas = input.occasion === "クリスマス";
    var multi = tiers.length >= 2;

    if (!tiers.length) return { subtotal: 0, lines: [], notes: [], needsConsult: true, reason: "サイズ未選択" };

    var cream = input.creamType || "";
    // 段ごとのケーキの種類（input.tierSpecs＝下の段から順、[{cream}]）。未指定なら全段が creamType（従来どおり）。
    var specs = input.tierSpecs && input.tierSpecs.length === tiers.length ? input.tierSpecs : null;
    var creamOf = function (i) { return specs ? (specs[i].cream || cream) : cream; };
    var anyTier = function (f) { for (var i = 0; i < tiers.length; i++) if (f(creamOf(i))) return true; return false; };
    var tartCut = isTartCut(tiers, creamOf(0));
    if (tartCut) { multi = false; cream = creamOf(0); } // タルトの2段は、1段のタルトにカットケーキを載せるのと同じ計算
    if (!multi) {
      var k = tierKey(tiers[0]);
      // ケーキの種類ごとに単段の価格が異なる（typePrices: 種類→{号数→金額}）。種類別の価格が未登録で、かつ
      // 生クリーム系でもない場合は、誤った金額を出さないよう「お電話で個別にご案内」にする。
      var typeMap = base.typePrices && base.typePrices[cream];
      var p;
      if (typeMap && typeMap[k] != null) p = typeMap[k];
      else if (!cream || SPEC.plainCreams.indexOf(cream) >= 0) p = base.sizePrices && base.sizePrices[k];
      if (p) lines.push({ label: (cream && SPEC.plainCreams.indexOf(cream) < 0 ? cream + " " : "") + k + "ケーキ", amount: p }); else consult = true;
    } else {
      var combo = resolveCombo(tiers);
      if (combo) lines.push({ label: tiers.length + "段ケーキ（" + comboKey(tiers).replace(/\+/g, "＋") + "）", amount: combo.price });
      else consult = true;
      // セット価格は生クリームの価格。段ごとに別の種類を選んだ場合は、その段の単品価格との差額を加減算する（暫定ルール・パティシエ相談中）。
      if (combo && specs) {
        for (var ti = 0; ti < tiers.length; ti++) {
          var c = creamOf(ti), tk = tierKey(tiers[ti]);
          var plainP = base.sizePrices && base.sizePrices[tk];
          if (!plainP || !c || SPEC.plainCreams.indexOf(c) >= 0) continue; // セルクル・カット等、または生クリーム系は差額なし
          var tm = base.typePrices && base.typePrices[c];
          if (tm && tm[tk] != null) {
            var diff = tm[tk] - plainP;
            if (diff !== 0) lines.push({ label: (tiers.length - ti) + "段目 " + c + "（単品価格との差額）", amount: diff });
          } else consult = true;
        }
        notes.push("段ごとに種類を変える場合は、納期・料金をスタッフより改めてご案内します");
      }
    }

    if (anyTier(function (c) { return c === "生チョコクリーム"; })) lines.push({ label: "生チョコクリーム変更", amount: base.chocoCream != null ? base.chocoCream : SPEC.chocoCream });

    var colors = Number(input.colorCreamCount) || 0;
    if (colors > 0 && anyTier(function (c) { return c === "生クリーム"; })) {
      // 色数は全段の合計。4色以上は1色あたり+500を加算（暫定・パティシエ相談中）。
      var cc = Math.min(colors, 3);
      lines.push({ label: "カラークリーム（" + colors + "色）", amount: (SPEC.colorCream[cc] || 0) + (colors > 3 ? (colors - 3) * SPEC.colorCream[1] : 0) });
    }
    if (input.strawberryAdd && SPEC.strawberryAdd.creamTypes.indexOf(cream) >= 0) {
      lines.push({ label: "フルーツトッピング（" + (input.strawberryKind || "いちご") + "）", amount: SPEC.strawberryAdd.price }); // 2026-10-22：いちご・ミックスフルーツとも+1,000円（確定）
    }
    // 飾り付けの「いちご」「ミックスフルーツ」はどちらも基本料金に含む（2026-10-07オーナー確認：同じ価格）。
    // フルーツトッピング＝いちご・ミックスフルーツの「増量」（オプション）。input.fruitExtra のときだけ号数に応じて加算する。
    if (input.fruitExtra) {
      var fp = !multi ? SPEC.fruitTopping[tierKey(tiers[0])] : undefined;
      if (fp) lines.push({ label: (input.decoration === "バラエティフルーツ" ? "ミックスフルーツ" : "いちご") + "の増量", amount: fp });
      else notes.push("フルーツ増量の料金は別途ご案内します");
    }
    if (input.creamTopping && !isXmas && !multi) lines.push({ label: "生クリームたっぷり乗せ", amount: base.creamToppingPrice || 0 });
    // 2段・3段は段ごと（2026-10-22）：specs[i] の fruitExtra / creamTopping（specs は下の段から）
    if (multi && specs && !isXmas) {
      var fruitName = input.decoration === "バラエティフルーツ" ? "ミックスフルーツ" : "いちご";
      for (var ti = tiers.length - 1; ti >= 0; ti--) {
        var tname = (tiers.length - ti) + "段目", tk = tierKey(tiers[ti]);
        if (specs[ti] && specs[ti].fruitExtra) {
          var tfp = SPEC.fruitTopping[tk];
          if (tfp) lines.push({ label: tname + "（" + tk + "）" + fruitName + "の増量", amount: tfp });
          else notes.push(tname + "（" + tk + "）のフルーツ増量の料金は別途ご案内します");
        }
        if (specs[ti] && specs[ti].creamTopping) lines.push({ label: tname + "（" + tk + "）生クリームたっぷり乗せ", amount: base.creamToppingPrice || 0 });
      }
    }

    if (!isXmas && input.candleNeeded && (input.candleNumbers || input.candlePlainBags != null)) {
      // 新しい形：ナンバーろうそくは1本あたり、普通のろうそくは1袋目無料・2袋目から1袋あたり
      var cps = candleParts(input), pieces = cps.numbers.reduce(function (n, x) { return n + x.qty; }, 0);
      if (pieces && base.candleNumber) lines.push({ label: "ナンバーろうそく（" + pieces + "本）", amount: pieces * base.candleNumber });
      if (cps.plainBags > 1 && base.candlePlain) lines.push({ label: "普通のろうそく（2袋目から " + (cps.plainBags - 1) + "袋）", amount: (cps.plainBags - 1) * base.candlePlain });
    } else if (!isXmas && input.candleNeeded) {
      var bags = Number(input.candleBags) || 1;
      // ナンバーろうそくは1文字あたりの単価（2026-09-29、旧: 1袋あたり）。bagsは文字数として渡ってくる。
      var candle = input.candleType === "ナンバーろうそく" ? bags * (base.candleNumber || 0) : Math.max(0, bags - 1) * (base.candlePlain || 0);
      if (candle) lines.push({ label: "ろうそく（追加分）", amount: candle });
    }
    var msgCount = Number(input.messageCount) || 0;
    if (!isXmas && msgCount > 1 && base.messagePlate) lines.push({ label: "メッセージプレート（追加分）", amount: (msgCount - 1) * base.messagePlate });

    // 追加商品（砂糖菓子・オーナメント等）：input.addOns = [{name, price, qty}]
    (input.addOns || []).forEach(function (a) {
      var q = Number(a.qty) || 0, pr = Number(a.price) || 0;
      if (q <= 0) return;
      if (pr > 0) lines.push({ label: a.name + " × " + q, amount: pr * q });
      else notes.push(a.name + "の料金は別途ご案内します");
    });
    if (input.omakase && SPEC.omakaseDeco[input.omakase]) lines.push({ label: "おまかせデコレーション（" + input.omakase + "）", amount: SPEC.omakaseDeco[input.omakase] });
    if ((input.toppings || []).length) notes.push(input.toppings.join("・") + "の料金・納期は、ご予約後にスタッフより別途ご連絡します");
    if (input.onsiteAssembly && tiers.length === 3) {
      lines.push({ label: "出張組み立て料", amount: SPEC.onsiteAssemblyFee, range: true }); // 場所により変わる（「〜」で表示）
      notes.push("出張組み立て料は" + SPEC.onsiteAssemblyFee.toLocaleString() + "円〜です（遠方の場合は、交通費を加算させていただきます）。出張の日程はパティシエの予定を確認のうえ、スタッフよりご連絡します（要確認）");
    }

    // タルトにカットケーキを載せる（オーナー確認 2026-09-26）：入れ物代がかかる。納期は通常どおり（2段のような資材の長い調達は不要）。
    // カットケーキ自体の代金は選ぶケーキにより異なるため別途案内。入れ物代はadminで設定した値（未設定なら別途案内）。
    // 載せるカットケーキ（写真から1〜4個。input.cutCakes=[{name, price, qty}]、価格は原価計算アプリの販売価格）
    var cuts = (input.cutCakes || []).filter(function (c) { return (Number(c.qty) || 0) > 0; });
    var cutUnpriced = false;
    cuts.forEach(function (c) {
      var q = Number(c.qty) || 0, pr = Number(c.price) || 0;
      if (pr > 0) lines.push({ label: "カットケーキ（" + c.name + "）× " + q, amount: pr * q });
      else cutUnpriced = true;
    });
    if (cutUnpriced) notes.push("一部のカットケーキの料金は別途ご案内します");
    if ((input.topCut || tartCut) && SPEC.tartTypes.indexOf(cream) >= 0) {
      var fee = base.cutContainerFee || 0;
      if (fee > 0) lines.push({ label: "カットケーキ用の入れ物代", amount: fee });
      if (!cuts.length) notes.push("カットケーキ代" + (fee > 0 ? "" : "・入れ物代") + "は別途ご案内します（納期は通常どおりです）");
      else if (!(fee > 0)) notes.push("カットケーキ用の入れ物代は別途ご案内します");
    }
    var specialFound = "";
    for (var si = 0; si < tiers.length; si++) if (SPEC.specialTypes[creamOf(si)]) { specialFound = creamOf(si); break; }
    if (specialFound) notes.push(specialFound + "は特殊仕様のため、納期は通常と異なります（材料の仕入れに2週間程度かかる場合がございます）");

    var subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    return { subtotal: consult ? 0 : subtotal, lines: consult ? [] : lines, notes: notes, needsConsult: consult };
  }

  // 箱・資材の調達リードタイム。today/pickupは日付(時刻は無視)。
  function checkLead(tiers, pickup, today, bottomCream) {
    if (isTartCut(tiers, bottomCream)) return { level: "ok" }; // タルトの2段は納期は通常どおり
    var combo = resolveCombo(tiers);
    if (!combo || !combo.lead || !pickup) return { level: "ok" };
    var p = new Date(pickup); p.setHours(0, 0, 0, 0);
    var t = new Date(today || new Date()); t.setHours(0, 0, 0, 0);
    var days = Math.round((p - t) / 86400000);
    var lead = combo.lead;
    if (days < lead.min) return { level: "block", min: lead.min, soft: lead.soft, days: days, assumed: !!lead.assumed };
    if (days < lead.soft) return { level: "soft", min: lead.min, soft: lead.soft, days: days, assumed: !!lead.assumed };
    return { level: "ok", min: lead.min, soft: lead.soft, days: days };
  }

  // 特殊仕様の種類（ブルーベリーケーキ等）：お受取日までの日数が少ない場合の案内（ブロックはせず、ご予約後に確認）。
  function checkSpecialLead(creamType, pickup, today) {
    var s = SPEC.specialTypes[creamType];
    if (!s || !pickup) return { level: "ok" };
    var p = new Date(pickup); p.setHours(0, 0, 0, 0);
    var t = new Date(today || new Date()); t.setHours(0, 0, 0, 0);
    var days = Math.round((p - t) / 86400000);
    return days < s.leadSoft ? { level: "soft", soft: s.leadSoft, days: days } : { level: "ok", soft: s.leadSoft, days: days };
  }

  // クリスマスケーキの予約締切（満員になり次第終了）。お受取が12月の場合、その年の締切日を過ぎていたら受付終了。
  // 締切日は受付方法で変わる：店頭は12/20、Web・お電話は12/18（channel に "店頭" を渡したときだけ12/20）
  function christmasClosed(pickup, today, channel) {
    if (!pickup) return false;
    var p = new Date(pickup);
    if (p.getMonth() + 1 !== 12) return false;
    var day = channel === "店頭" ? SPEC.christmas.deadlineDay : (SPEC.christmas.webDeadlineDay || SPEC.christmas.deadlineDay);
    var deadline = new Date(p.getFullYear(), SPEC.christmas.deadlineMonth - 1, day, 23, 59, 59);
    return new Date(today || new Date()) > deadline;
  }

  // 管理画面(admin.html)で設定した料金・納期の上書き値（Firebase koimariContent/cakeSpecOverrides）をSPECに反映する。
  // 正の数値だけを採用し、未設定の項目は既定値のまま。
  function applyOverrides(o) {
    if (!o || typeof o !== "object") return;
    var num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? v : null; };
    var v;
    Object.keys(SPEC.fruitTopping).forEach(function (k) { v = num(o.fruitTopping && o.fruitTopping[k]); if (v) SPEC.fruitTopping[k] = v; });
    [1, 2, 3].forEach(function (n) { v = num(o.colorCream && o.colorCream[n]); if (v) SPEC.colorCream[n] = v; });
    v = num(o.strawberryPrice); if (v) SPEC.strawberryAdd.price = v;
    v = num(o.onsiteAssemblyFee); if (v) SPEC.onsiteAssemblyFee = v;
    ["松", "竹", "梅"].forEach(function (k) { v = num(o.omakaseDeco && o.omakaseDeco[k]); if (v) SPEC.omakaseDeco[k] = v; });
    Object.keys(SPEC.cutTopDeduction).forEach(function (k) { v = num(o.cutTopDeduction && o.cutTopDeduction[k]); if (v) SPEC.cutTopDeduction[k] = v; });
    Object.keys(o.multiTier || {}).forEach(function (k) {
      var t = SPEC.multiTier[k], s = o.multiTier[k];
      if (!t || !s) return;
      v = num(s.price); if (v) t.price = v;
      if (t.lead) { var mn = num(s.min), sf = num(s.soft); if (mn) t.lead.min = mn; if (sf) t.lead.soft = sf; if (t.lead.soft < t.lead.min) t.lead.soft = t.lead.min; }
    });
  }

  function lineYen(l) { return yen(l && l.amount) + (l && l.range ? "〜" : ""); }
  var api = { lineYen: lineYen, applyOverrides: applyOverrides, SPEC: SPEC, tierKey: tierKey, comboKey: comboKey, resolveCombo: resolveCombo, isTartCut: isTartCut, candleParts: candleParts, candleText: candleText, formatCandleNumbers: formatCandleNumbers, parseCandleNumbers: parseCandleNumbers, estimate: estimate, checkLead: checkLead, checkSpecialLead: checkSpecialLead, christmasClosed: christmasClosed, yen: yen, fromYen: fromYen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CakePricing = api;
})(typeof window !== "undefined" ? window : globalThis);
