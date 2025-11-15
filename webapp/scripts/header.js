const goHome = () => {
  window.location.href = "/home.html";
};

const handleBack = () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    goHome();
  }
};

const handleClose = () => {
  if (window.Telegram?.WebApp?.close) {
    window.Telegram.WebApp.close();
  } else {
    goHome();
  }
};

const loadTelegramScript = () =>
  new Promise((resolve) => {
    if (window.Telegram?.WebApp) {
      resolve(window.Telegram.WebApp);
      return;
    }
    const existing = document.querySelector('script[src="https://telegram.org/js/telegram-web-app.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Telegram?.WebApp));
      existing.addEventListener("error", () => resolve(null));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.addEventListener("load", () => resolve(window.Telegram?.WebApp));
    script.addEventListener("error", () => resolve(null));
    document.head.appendChild(script);
  });

const initTelegramBackButton = async () => {
  const tg = await loadTelegramScript();
  if (!tg) return;
  tg.ready();
  tg.expand();
  if (typeof tg.disableVerticalSwipes === "function") {
    tg.disableVerticalSwipes();
  }
  const isHome = document.body.dataset.page === "home";
  if (isHome) {
    tg.BackButton.hide();
  } else {
    tg.BackButton.show();
  }
  tg.onEvent("backButtonClicked", () => {
    if (isHome) {
      if (tg.close) tg.close();
      else goHome();
    } else {
      handleBack();
    }
  });
};

const navButton = document.querySelector('[data-nav="primary"]');
if (navButton) {
  const isHome = document.body.dataset.page === "home";
  if (isHome) {
    navButton.textContent = "Закрыть";
    navButton.addEventListener("click", handleClose);
  } else {
    navButton.textContent = "Назад";
    navButton.addEventListener("click", handleBack);
  }
}

initTelegramBackButton();
