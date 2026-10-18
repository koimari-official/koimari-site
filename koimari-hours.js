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
  window.KoimariHours = { dayInfo, shortTime, toMinutes };
})();
