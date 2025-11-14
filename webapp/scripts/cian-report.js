const summaryEl = document.getElementById("reportSummary");
const summaryMetaEl = document.getElementById("reportSummaryMeta");
const offersEl = document.getElementById("reportOffers");
const imagesEl = document.getElementById("reportImages");
const refreshBtn = document.getElementById("reportRefresh");
const areaModal = document.getElementById("areaModal");
const areaForm = document.getElementById("areaForm");
const areaInput = document.getElementById("areaInput");
const areaLabel = document.getElementById("areaModalLabel");
const areaStatus = document.getElementById("areaStatus");
const areaConfirm = document.getElementById("areaConfirm");
const areaCancel = document.getElementById("areaCancel");

let cachedOffers = [];
let cachedImages = [];
let areaObjectId = null;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
};

const formatPrice = (value) => {
  if (!value) return "—";
  return new Intl.NumberFormat("ru-RU").format(Number(value)) + " ₽";
};

const renderEmpty = (el, message) => {
  el.innerHTML = `<div class="report-empty">${message}</div>`;
};

const buildListingsUrl = (externalId, options = {}) => {
  const params = new URLSearchParams();
  if (externalId) {
    params.set("search", externalId);
    if (options.openEditor) {
      params.set("edit", externalId);
    }
  }
  const query = params.toString();
  return `/listings.html${query ? `?${query}` : ""}`;
};

const openListingsPage = (externalId, options = {}) => {
  const url = buildListingsUrl(externalId, options);
  window.location.href = url;
};

const deleteByExternalId = async (externalId, mode = "delete") => {
  if (!externalId) return;
  const response = await fetch(
    `/api/objects/${encodeURIComponent(externalId)}?mode=${encodeURIComponent(mode)}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

const patchObject = async (externalId, payload) => {
  const response = await fetch(`/api/objects/${encodeURIComponent(externalId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

const filterOffers = (offers = []) =>
  offers.filter(
    (offer) => (offer.errors && offer.errors.length) || (offer.warnings && offer.warnings.length)
  );

const closeAreaModal = () => {
  areaModal?.classList.add("hidden");
  areaStatus.textContent = "";
  areaConfirm.checked = false;
  areaForm?.reset();
  areaObjectId = null;
};

const openAreaModal = async (externalId) => {
  if (!areaModal || !areaInput || !areaLabel) return;
  areaObjectId = externalId;
  areaLabel.textContent = "Загружаем данные...";
  areaStatus.textContent = "";
  areaInput.value = "";
  areaConfirm.checked = false;
  areaModal.classList.remove("hidden");
  try {
    const response = await fetch(`/api/objects/${encodeURIComponent(externalId)}`);
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const currentArea = data.living_area || data.area_living || data.square_living || data.total_area || data.area || data.square_total || data.square || "";
    areaLabel.textContent = `Текущая площадь: ${currentArea || "не указана"}`;
    areaInput.value = currentArea || "";
  } catch (error) {
    areaStatus.textContent = `Ошибка: ${error.message}`;
  }
};

const formatIssueList = (items = []) => {
  if (!items.length) return "";
  return `<ul>${items
    .map((issue) => {
      const text = String(issue || "");
      const normalized = text.toLowerCase();
      const isArea = normalized.includes("жилая площадь уменьшена");
      return `<li${isArea ? ' class="report-success"' : ""}>${escapeHtml(text)}${
        isArea ? '<span class="report-flag">М</span>' : ""
      }</li>`;
    })
    .join("")}</ul>`;
};

const renderOffers = (offers = []) => {
  cachedOffers = offers;
  const problematic = filterOffers(offers);
  if (!problematic.length) {
    renderEmpty(offersEl, "Ошибок не обнаружено");
    return;
  }
  offersEl.innerHTML = problematic
    .map((offer) => {
      const externalId = String(offer.externalId || offer.offerId || "");
      const errors = offer.errors || [];
      const warnings = offer.warnings || [];
      const message =
        errors.length || warnings.length
          ? escapeHtml((errors.length ? errors : warnings).join("; "))
          : "Описание ошибки отсутствует";
      return `
        <article class="report-offer-card" data-offer-id="${escapeHtml(externalId)}">
          <div class="report-offer-row">
            <div class="report-offer-id-block">
              <span>#${escapeHtml(externalId || "—")}</span>
            </div>
            <div class="report-offer-info">
              <p>${message}</p>
            </div>
          </div>
          <div class="report-offer-actions">
            <button data-offer-action="open" data-offer-url="${offer.url || ""}" ${
              offer.url ? "" : "disabled"
            }>Открыть объявление</button>
            <button class="primary" data-offer-action="edit" data-offer-id="${escapeHtml(externalId)}">Редактировать</button>
          </div>
        </article>
      `;
    })
    .join("");
};


const renderImages = (items = []) => {
  cachedImages = items;
  const problematic = items.filter(
    (item) => item.errorType && item.errorType !== "emptyResult" && item.errorType !== "notFound"
  );
  if (!problematic.length) {
    renderEmpty(imagesEl, "Ошибок не обнаружено");
    return;
  }
  imagesEl.innerHTML = problematic
    .map(
      (item) => `
        <article class="report-item" data-image-offer="${escapeHtml(item.offerId || "")}">
          <div class="report-item-head">
            <strong>Объявление #${escapeHtml(item.offerId || "—")}</strong>
            <span>${escapeHtml(item.errorType || "")}</span>
          </div>
          <p>${escapeHtml(item.errorText || "Описание отсутствует")}</p>
          <div class="report-actions">
            <button data-image-action="open" data-image-url="${item.url || ""}" ${
              item.url ? "" : "disabled"
            }>Открыть изображение</button>
            <button class="danger" data-image-action="delete-photo" data-image-offer="${escapeHtml(item.offerId || "")}">Удалить фото</button>
          </div>
        </article>
      `
    )
    .join("");
};

const updateSummary = (info, hasProblems = false) => {
  if (!info) {
    summaryEl.innerHTML = "<strong>Не удалось получить статус</strong>";
    summaryMetaEl.textContent = "";
    return;
  }
  const result = info.result || {};
  const showWarning = hasProblems || Boolean(result.hasOffersProblems || result.hasImagesProblems);
  summaryEl.dataset.state = hasProblems ? "warn" : "ok";
  summaryEl.innerHTML = showWarning
    ? `<strong>Обнаружены проблемы</strong>`
    : "<strong>Все объявления прошли проверку</strong>";
  summaryMetaEl.textContent = `Последняя проверка: ${formatDate(result.lastProcessDate || result.lastFeedCheckDate)}`;
};

const fetchAll = async () => {
  summaryEl.dataset.loading = "true";
  try {
    const [infoRes, offersRes, imagesRes] = await Promise.all([
      fetch("/api/cian/order-info"),
      fetch("/api/cian/order-report"),
      fetch("/api/cian/images-report?page=1&pageSize=200"),
    ]);
    if (!infoRes.ok) throw new Error(await infoRes.text());
    if (!offersRes.ok) throw new Error(await offersRes.text());
    if (!imagesRes.ok) throw new Error(await imagesRes.text());
    const info = await infoRes.json();
    const offersData = await offersRes.json();
    const imagesData = await imagesRes.json();
    const offers = offersData.result?.offers || [];
    const images = imagesData.result?.items || [];
    const problematicOffers = filterOffers(offers);
    const problematicImages = images.filter(
      (item) => item.errorType && item.errorType !== "emptyResult" && item.errorType !== "notFound"
    );
    if (info.result) {
      info.result.hasOffersProblems = problematicOffers.length > 0;
      info.result.hasImagesProblems = problematicImages.length > 0;
    }
    updateSummary(info, problematicOffers.length > 0 || problematicImages.length > 0);
    renderOffers(offers);
    renderImages(images);
  } catch (error) {
    summaryEl.dataset.state = "error";
    summaryEl.innerHTML = `<strong>Ошибка загрузки</strong>`;
    summaryMetaEl.textContent = error.message;
    renderEmpty(offersEl, "Попробуйте обновить позже");
    renderEmpty(imagesEl, "Попробуйте обновить позже");
  } finally {
    delete summaryEl.dataset.loading;
  }
};

refreshBtn?.addEventListener("click", fetchAll);
areaCancel?.addEventListener("click", closeAreaModal);
areaModal?.addEventListener("click", (event) => {
  if (event.target === areaModal) closeAreaModal();
});


areaForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!areaObjectId) return;
  if (!areaConfirm.checked) {
    areaStatus.textContent = "Поставьте галочку для подтверждения";
    return;
  }
  const value = areaInput.value.trim();
  if (!value) {
    areaStatus.textContent = "Введите значение";
    return;
  }
  try {
    areaStatus.textContent = "Сохраняем...";
    await patchObject(areaObjectId, { living_area: Number(value) });
    areaStatus.textContent = "Сохранено";
    setTimeout(() => {
      areaStatus.textContent = "";
      closeAreaModal();
    }, 800);
  } catch (error) {
    areaStatus.textContent = `Ошибка: ${error.message}`;
  }
});

offersEl?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-offer-action]");
  if (!button) return;
  const externalId = button.dataset.offerId;
  try {
    switch (button.dataset.offerAction) {
      case "edit":
        openListingsPage(externalId, { openEditor: true });
        break;
      case "open":
        if (button.dataset.offerUrl) {
          window.open(button.dataset.offerUrl, "_blank");
        } else {
          openListingsPage(externalId);
        }
        break;
      default:
        break;
    }
  } catch (error) {
    alert(`Ошибка: ${error.message}`);
  }
});

imagesEl?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-image-action]");
  if (!button) return;
  const offerId = button.dataset.imageOffer;
  const url = button.dataset.imageUrl;
  const card = button.closest(".report-item");
  try {
    switch (button.dataset.imageAction) {
      case "open":
        if (url) window.open(url, "_blank");
        break;
      case "delete-photo":
        openListingsPage(offerId, { openEditor: true });
        card?.classList.add("resolved");
        break;
      case "delete":
        await deleteByExternalId(offerId);
        card?.remove();
        break;
      default:
        break;
    }
  } catch (error) {
    alert(`Ошибка: ${error.message}`);
  }
});

fetchAll();
