const POLL_INTERVAL_MS = 5 * 60 * 1000;

const formatTimeLabel = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return iso;
  }
};

const formatDisplayTime = (ms) => {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  if (minutes > 1) return `через ${minutes} мин`;
  if (minutes === 1) return "через 1 мин";
  if (ms > 0) return "менее чем через минуту";
  return "сейчас";
};

const filterProblemOffers = (offers) =>
  (offers || []).filter(
    (offer) => (offer.errors && offer.errors.length) || (offer.warnings && offer.warnings.length)
  );

const hasImageProblems = (report) => {
  if (!report || !report.result) return false;
  const { items = [], errorType } = report.result;
  if (errorType && errorType !== "emptyResult") return true;
  return items.some((item) => item.errorType && item.errorType !== "emptyResult");
};

export const initImportBanner = (options = {}) => {
  const titleEl = document.getElementById("importBannerTitle");
  const subtitleEl = document.getElementById("importBannerSubtitle");
  const timeEl = document.getElementById("importBannerTime");
  const banner = document.getElementById("importBanner");
  if (!banner || !titleEl || !subtitleEl || !timeEl) return;

  let lastInfo = null;
  let pollTimeout = null;
  let countdownInterval = null;
  let nextPollTime = Date.now() + POLL_INTERVAL_MS;

  const updateBannerState = (hasProblems = false) => {
    if (!lastInfo?.result) return;
    const result = lastInfo.result;
    const warning = Boolean(hasProblems);
    banner.dataset.state = warning ? "warn" : "ok";
    titleEl.textContent = warning ? "Обнаружены проблемы" : "Все объявления прошли проверку";
    subtitleEl.textContent = `Последнее обновление: ${formatTimeLabel(
      result.lastProcessDate || result.lastFeedCheckDate
    )}`;
    const remaining = Math.max(0, nextPollTime - Date.now());
    timeEl.textContent = `Следующая проверка ${formatDisplayTime(remaining)}`;
  };

  const setBannerError = (message) => {
    banner.dataset.state = "error";
    titleEl.textContent = "Не удалось получить статус";
    subtitleEl.textContent = message || "CIAN API временно недоступно";
    const remaining = Math.max(0, nextPollTime - Date.now());
    timeEl.textContent = `Следующая проверка ${formatDisplayTime(remaining)}`;
  };

  const fetchBannerData = async () => {
    try {
      const [infoRes, reportRes, imagesRes] = await Promise.all([
        fetch("/api/cian/order-info"),
        fetch("/api/cian/order-report"),
        fetch("/api/cian/images-report"),
      ]);
      if (!infoRes.ok) throw new Error(await infoRes.text());
      if (!reportRes.ok) throw new Error(await reportRes.text());
      if (!imagesRes.ok) throw new Error(await imagesRes.text());
      const info = await infoRes.json();
      const report = await reportRes.json();
      const images = await imagesRes.json();
      lastInfo = info;
      const problematic = filterProblemOffers(report.result?.offers || []);
      const imageIssues = hasImageProblems(images);
      updateBannerState(problematic.length > 0 || imageIssues);
      fetch("/api/cian/status-sync", { method: "POST" }).catch(() => {});
    } catch (error) {
      setBannerError(error.message);
    }
  };

  const scheduleNext = () => {
    if (pollTimeout) clearTimeout(pollTimeout);
    if (countdownInterval) clearInterval(countdownInterval);
    nextPollTime = Date.now() + POLL_INTERVAL_MS;
    const updateCountdown = () => {
      const remaining = Math.max(0, nextPollTime - Date.now());
      timeEl.textContent = `Следующая проверка ${formatDisplayTime(remaining)}`;
    };
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
    const delay = POLL_INTERVAL_MS;
    pollTimeout = setTimeout(async () => {
      await fetchBannerData();
      scheduleNext();
    }, delay);
  };

  fetchBannerData();
  scheduleNext();
};
