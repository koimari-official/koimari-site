/* 管理画面の予約通知（Web Push）を受け取るサービスワーカー（2026-10-07）。
   同じ予約の通知は tag が同じなので、「対応済み」の通知が来ると、未対応の通知がその内容に置き換わる。 */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", function (event) {
  var d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: "こいまり", body: event.data ? event.data.text() : "" }; }
  var opts = {
    body: d.body || "",
    tag: d.tag || undefined,
    renotify: d.kind === "new",
    silent: !!d.silent,
    requireInteraction: d.kind === "new",
    icon: "koimari-temari-mark.png",
    badge: "koimari-temari-mark.png",
    data: { url: d.url || "admin.html#reservations" }
  };
  event.waitUntil(self.registration.showNotification(d.title || "こいまり", opts));
});
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "admin.html#reservations";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf("admin.html") >= 0 && "focus" in list[i]) { list[i].navigate && list[i].navigate(url); return list[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
// 管理画面から「対応済みの予約の通知を消して」と頼まれたら、その通知を閉じる（画面を開いたとき用）
self.addEventListener("message", function (event) {
  var tags = (event.data && event.data.closeTags) || [];
  if (!tags.length) return;
  event.waitUntil(self.registration.getNotifications().then(function (ns) { ns.forEach(function (n) { if (tags.indexOf(n.tag) >= 0) n.close(); }); }));
});
