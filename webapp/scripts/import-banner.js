const POLL_INTERVAL_MS = 5 * 60 * 1000;

const formatTimeLabel = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return iso;
  }
};

const extractTimestamp = (result = {}) =>
  result.lastProcessDate ||
  result.last_process_date ||
  result.lastFeedCheckDate ||
  result.last_feed_check_date ||
  result.lastCheckDate ||
  result.last_check_date ||
  null;

const formatDisplayTime = (ms) => {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  if (minutes > 1) return `${minutes} мин`;
  if (minutes === 1) return "1 мин";
  if (ms > 0) return "менее минуты";
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
  const subtitleEl = document.getElementById("importBannerSubtitle");
  const timeEl = document.getElementById("importBannerTime");
  const banner = document.getElementById("importBanner");
  if (!banner || !subtitleEl || !timeEl) return;

  let lastInfo = null;
  let pollTimeout = null;
  let countdownInterval = null;
  let nextPollTime = Date.now() + POLL_INTERVAL_MS;
  let lastKnownTimestamp = null;

  const updateBannerState = (hasProblems = false, timestampOverride = null) => {
    if (!lastInfo?.result) return;
    const result = lastInfo.result;
    const warning = Boolean(hasProblems);
    banner.dataset.state = warning ? "warn" : "ok";
    const timestamp =
      timestampOverride ||
      extractTimestamp(result) ||
      lastKnownTimestamp ||
      new Date().toISOString();
    lastKnownTimestamp = timestamp;
    subtitleEl.textContent = formatTimeLabel(timestamp);
    const remaining = Math.max(0, nextPollTime - Date.now());
    timeEl.textContent = formatDisplayTime(remaining);
  };

  const setBannerError = (message) => {
    banner.dataset.state = "error";
    const nowIso = new Date().toISOString();
    lastKnownTimestamp = nowIso;
    subtitleEl.textContent = message
      ? `${message} · ${formatTimeLabel(nowIso)}`
      : formatTimeLabel(nowIso);
    const remaining = Math.max(0, nextPollTime - Date.now());
    timeEl.textContent = formatDisplayTime(remaining || POLL_INTERVAL_MS);
  };

  const hasOfferProblems = (offers = []) =>
    offers.some((offer) => {
      const errors = Array.isArray(offer.errors) ? offer.errors : [];
      const warnings = Array.isArray(offer.warnings) ? offer.warnings : [];
      const status = String(offer.status || "").toLowerCase();
      return (
        errors.length > 0 ||
        warnings.length > 0 ||
        ["error", "refus", "block", "warn", "не прош"].some((token) => status.includes(token))
      );
    });

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
      const offers = report.result?.offers || [];
      const problematic = filterProblemOffers(offers);
      const offerStatusIssues = hasOfferProblems(offers);
      const imageIssues = hasImageProblems(images);
      const timestamp =
        extractTimestamp(info.result || {}) || info.result?.lastProcessDate || new Date().toISOString();
      lastKnownTimestamp = timestamp;
      updateBannerState(problematic.length > 0 || offerStatusIssues || imageIssues, timestamp);
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
      timeEl.textContent = formatDisplayTime(remaining);
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
