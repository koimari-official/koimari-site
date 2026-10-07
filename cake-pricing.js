/* デコレーションケーキの見積もり計算（2026-09-24、オーナー提供の「ケーキオーダー仕様」に基づく）。
   すべて税込。2026-09-29オーナー指示により、特殊仕様が無い注文（1段・別途ご案内の項目なし）は
   「確定金額」として表示する（member.htmlのyenFixed）。積算しきれない場合のみ「〇〇円〜」（fromYen）。
   予約フォーム(member.html)からもテスト(Node)からも使えるよう、DOMに依存しない純粋な関数にしている。
   単段の基本料金・生クリームたっぷり乗せ・ろうそく・メッセージプレートの金額は、従来どおり
   admin.html（Firebase koimariContent/cake*）で管理している値を base として渡す。 */
(function (root) {
  var SPEC = {
    // ベースの種類ごとに作れる号数（2026-10-03オーナー確認：グランマニエ＝ムースは4号のみ）。ここに無いベースは4〜7号
    baseSizes: { "ムース": ["3号"] }, // 2026-10-07オーナー指示：グランマニエBOX（ムース）は3号相当
    // フルオーダー扱いのベース（料金表に載せず、お見積もり・納期は別途ご回答。2026-10-03：モンブラン）
    customBases: ["モンブラン"],
    sizes: {
      "3号": { cm: "約9cm", serves: "2〜3人前" },
      "4号": { cm: "約12cm", serves: "3〜4人前" },
      "5号": { cm: "約15cm", serves: "5〜6人前" },
      "6号": { cm: "約18cm", serves: "7〜8人前" },
      "7号": { cm: "約21cm", serves: "9〜10人前" }
    },
    christmas: { deadlineMonth: 12, deadlineDay: 20 },
    fruitTopping: { "4号": 1000, "5号": 1300, "6号": 1600, "7号": 2500 }, // いちご・ミックスフルーツの増量（2026-10-07オーナー確認：7号は2,500円）
    chocoCream: 500,
    colorCream: { 1: 500, 2: 1000, 3: 1500 },
    // ミッシェルBOX・ガトーショコラBOXの「フルーツトッピング」はいちごトッピングの意味（オーナー確認 2026-09-24）。
    strawberryAdd: { price: 1000, creamTypes: ["ミッシェルBOX", "ガトーショコラBOX"] },
    // 特殊仕様の種類：通常と納期が異なる（材料の仕入れに2週間程度かかる場合がある。オーナー指示 2026-09-26）。
    specialTypes: { "ブルーベリーケーキ": { leadSoft: 14 } },
    tartTypes: ["フルーツタルトBOX", "ストロベリータルトBOX"], // カットケーキを載せられる種類
    onsiteAssemblyFee: 20000, // 3段の出張組み立て料（交通費は別途）
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
      "6号+4号": { price: 11600, lead: { min: 7, soft: 10 } },
      "7号+5号": { price: 16800, lead: { min: 14, soft: 14 } },
      "6号+4号+セルクル": { price: 17000, lead: { min: 7, soft: 10, assumed: true } },
      "7号+5号+3号": { price: 22000, lead: { min: 14, soft: 14, assumed: true } }
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
      lines.push({ label: "いちごトッピング（目安）", amount: SPEC.strawberryAdd.price });
    }
    // 飾り付けの「いちご」「ミックスフルーツ」はどちらも基本料金に含む（2026-10-07オーナー確認：同じ価格）。
    // フルーツトッピング＝いちご・ミックスフルーツの「増量」（オプション）。input.fruitExtra のときだけ号数に応じて加算する。
    if (input.fruitExtra) {
      var fp = !multi ? SPEC.fruitTopping[tierKey(tiers[0])] : undefined;
      if (fp) lines.push({ label: (input.decoration === "バラエティフルーツ" ? "ミックスフルーツ" : "いちご") + "の増量", amount: fp });
      else notes.push("フルーツ増量の料金は別途ご案内します");
    }
    if (input.creamTopping && !isXmas) lines.push({ label: "生クリームたっぷり乗せ", amount: base.creamToppingPrice || 0 });

    if (!isXmas && input.candleNeeded) {
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
      lines.push({ label: "出張組み立て料", amount: SPEC.onsiteAssemblyFee });
      notes.push("出張の交通費（燃料費・高速代往復・駐車料金・その他）は別途かかります");
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
    if (input.topCut && SPEC.tartTypes.indexOf(cream) >= 0) {
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
  function checkLead(tiers, pickup, today) {
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

  // クリスマスケーキの予約締切（12/20まで。満員になり次第終了）。お受取が12月の場合、その年の12/20を過ぎていたら受付終了。
  function christmasClosed(pickup, today) {
    if (!pickup) return false;
    var p = new Date(pickup);
    if (p.getMonth() + 1 !== 12) return false;
    var deadline = new Date(p.getFullYear(), SPEC.christmas.deadlineMonth - 1, SPEC.christmas.deadlineDay, 23, 59, 59);
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

  var api = { applyOverrides: applyOverrides, SPEC: SPEC, tierKey: tierKey, comboKey: comboKey, resolveCombo: resolveCombo, estimate: estimate, checkLead: checkLead, checkSpecialLead: checkSpecialLead, christmasClosed: christmasClosed, yen: yen, fromYen: fromYen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CakePricing = api;
})(typeof window !== "undefined" ? window : globalThis);
