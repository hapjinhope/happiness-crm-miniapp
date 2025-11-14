const params = new URLSearchParams(window.location.search);
const view = params.get("view") || "publish";
const titles = {
  publish: "Размещение",
  messages: "Сообщения",
};
const messages = {
  publish: "🛠️ Размещение объявлений появится в одном из следующих релизов.",
  messages: "💬 Чаты появятся чуть позже.",
};

const pageMap = { publish: "cabinet", messages: "messages" };
document.body.dataset.page = pageMap[view] || "cabinet";
const titleEl = document.getElementById("stubTitle");
const textEl = document.getElementById("stubMessage");
if (titleEl) {
  titleEl.textContent = titles[view] || "Раздел";
}
if (textEl) {
  textEl.textContent = messages[view] || "Раздел скоро будет доступен.";
}
