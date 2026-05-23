(function () {
  var KEY = "koimari_page_errors";
  function log(type, msg, detail) {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || "[]");
      list.unshift({
        type: type,
        page: location.pathname.split("/").pop() || "index.html",
        msg: msg,
        detail: detail || "",
        time: new Date().toISOString()
      });
      if (list.length > 300) list = list.slice(0, 300);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {}
  }

  // JSエラー
  window.addEventListener("error", function (e) {
    log("JSエラー", e.message || "不明なエラー", (e.filename || "") + (e.lineno ? ":" + e.lineno : ""));
  });

  // Promise未処理エラー
  window.addEventListener("unhandledrejection", function (e) {
    log("Promiseエラー", String(e.reason || "未処理のPromise拒否"), "");
  });

  // 画像読み込みエラー（DOM構築後）
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("img[src]").forEach(function (img) {
      if (!img.complete || img.naturalWidth === 0) {
        img.addEventListener("error", function () {
          log("画像エラー", "画像を読み込めません", img.src ? img.src.slice(0, 120) : "(src不明)");
        });
      }
    });

    // リソース読み込みエラー（script/link）
    document.querySelectorAll("script[src], link[rel='stylesheet']").forEach(function (el) {
      el.addEventListener("error", function () {
        var src = el.src || el.href || "";
        log("リソースエラー", el.tagName + " の読み込み失敗", src.slice(0, 120));
      });
    });
  });
})();
