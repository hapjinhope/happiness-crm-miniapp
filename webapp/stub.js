const params = new URLSearchParams(window.location.search);
const view = params.get("view") || "favorites";
const titles = {
  home: "Главная",
  favorites: "Избранное",
  messages: "Сообщения",
};
const messages = {
  home: "🏠 Главная страница пока в разработке.",
  favorites: "❤️ Сохраняйте объекты позже — раздел в работе.",
  messages: "💬 Чаты появятся в одном из следующих релизов.",
};

const pageMap = { home: "home", favorites: "favorites", messages: "messages" };
document.body.dataset.page = pageMap[view] || "cabinet";
const titleEl = document.getElementById("stubTitle");
const textEl = document.getElementById("stubMessage");
if (titleEl) {
  titleEl.textContent = titles[view] || "Раздел";
}
if (textEl) {
  textEl.textContent = messages[view] || "Раздел скоро будет доступен.";
}
