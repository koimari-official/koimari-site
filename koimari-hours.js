// 日ごとの「営業／休み」と営業時間を決める共通の仕組み（2026-10-18）。
// トップ・営業日カレンダー・予約フォームがすべてこれを使う。ルールを変えるときはここだけを直す。
// 基本：火〜土 10:00〜20:00 ／ 日曜・祝日 10:00〜19:00 ／ 月曜定休（月曜が祝日なら営業し、次の平日が休み）
// 例外：管理画面「営業日設定」の臨時休業日（extraClosed）と特別営業時間（specialHours：お盆・クリスマス・正月など）
// LINEの自動返信（functions/index.js の computeTodayStatus）も同じ順番で判定している。
(function () {
  function dayInfo(h, key, dow, isHoliday, regularClosed) {
    h = h || {};
    if ((h.extraClosed || []).includes(key)) return { closed: true, special: true };
    const sp = h.specialHours && h.specialHours[key];
    if (sp && sp.open && sp.close) return { closed: false, open: sp.open, close: sp.close, special: true, note: sp.note || "" };
    if (regularClosed) return { closed: true, special: false };
    return { closed: false, open: "10:00", close: dow === 0 || isHoliday ? "19:00" : "20:00", special: false };
  }
  // "10:00"→"10"、"09:30"→"9:30"（カレンダーのマスに収まる短い表記）
  function shortTime(t) {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return String(t || "");
    const hh = String(Number(m[1]));
    return m[2] === "00" ? hh : hh + ":" + m[2];
  }
  function toMinutes(t) {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  // 祝日（index.html・calendar.html・member.html と同じ一覧）。管理画面などはこちらを使う
  const JP_HOLIDAYS = new Set([
    "2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20","2026-04-29",
    "2026-05-03","2026-05-04","2026-05-05","2026-05-06","2026-07-20","2026-08-11",
    "2026-09-21","2026-09-22","2026-09-23","2026-10-12","2026-11-03","2026-11-23",
    "2027-01-01","2027-01-11","2027-02-11","2027-02-23","2027-03-21","2027-03-22",
    "2027-04-29","2027-05-03","2027-05-04","2027-05-05","2027-07-19","2027-08-11",
    "2027-09-20","2027-09-23","2027-10-11","2027-11-03","2027-11-23"
  ]);
  // 振替の定休日（月曜が祝日で営業した場合、その後の最初の祝日でない日が休み）
  function substituteClosed(h, k) {
    if (JP_HOLIDAYS.has(k)) return false;
    const w = (h && h.weeklyClosed) || [1];
    const p = new Date(k + "T00:00:00");
    if (w.includes(p.getDay())) return false;
    for (let i = 0; i < 7; i++) {
      p.setDate(p.getDate() - 1);
      const pk = p.getFullYear() + "-" + String(p.getMonth() + 1).padStart(2, "0") + "-" + String(p.getDate()).padStart(2, "0");
      if (!JP_HOLIDAYS.has(pk)) return false;
      if (w.includes(p.getDay())) return true;
    }
    return false;
  }
  // その日の営業情報（営業日カレンダーと同じ判定：臨時休業・特別営業時間・定休日・振替休業・祝日）
  function dayInfoFor(h, key) {
    const dow = new Date(key + "T00:00:00").getDay();
    const regularClosed = (((h && h.weeklyClosed) || [1]).includes(dow) && !JP_HOLIDAYS.has(key)) || substituteClosed(h, key);
    return dayInfo(h, key, dow, JP_HOLIDAYS.has(key), regularClosed);
  }
  window.KoimariHours = { dayInfo, dayInfoFor, shortTime, toMinutes, JP_HOLIDAYS, substituteClosed };
})();
