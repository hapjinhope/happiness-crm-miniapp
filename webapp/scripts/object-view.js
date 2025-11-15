const params = new URLSearchParams(window.location.search);
const objectId = params.get("id");

const headerTitle = document.getElementById("objectHeaderTitle");
const headerSubtitle = document.getElementById("objectHeaderSubtitle");
const objectHeroTrack = document.getElementById("objectHeroTrack");
const objectHeroCounter = document.getElementById("objectHeroCounter");
const summaryContainer = document.getElementById("objectSummary");
const infoContainer = document.getElementById("objectInfo");
const actionsContainer = document.getElementById("objectActions");
const editLink = document.getElementById("objectEditLink");

const lightboxEl = document.getElementById("objectLightbox");
const lightboxImage = document.getElementById("objectLightboxImage");
const lightboxClose = document.getElementById("objectLightboxClose");
const lightboxPrev = document.getElementById("objectLightboxPrev");
const lightboxNext = document.getElementById("objectLightboxNext");

const PHOTO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'%3E%3Crect width='320' height='200' rx='28' fill='%231f2430'/%3E%3Cpath d='M80 140l38-38a8 8 0 0111 0l30 30 19-19a8 8 0 0111 0l36 36v12H80v-12z' fill='%233c465f'/%3E%3Ccircle cx='120' cy='76' r='20' fill='%233c465f'/%3E%3C/svg%3E";

const heroState = {
  photos: [],
  index: 0,
  dragging: false,
  startX: 0,
  scrollLeft: 0,
};

const lightboxState = {
  photos: [],
  index: 0,
};

const PHOTO_FIELDS = [
  "photos",
  "images",
  "gallery",
  "img_urls",
  "photo_urls",
  "imgs",
  "img",
  "photos_json",
  "main_photo_url",
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const collectPhotoUrls = (data) => {
  const urls = new Set();
  PHOTO_FIELDS.forEach((field) => {
    const value = data[field];
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "string" && item.startsWith("http")) {
          urls.add(item);
        } else if (item?.url) {
          urls.add(item.url);
        }
      });
      return;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          const nested = Array.isArray(parsed) ? parsed : Object.values(parsed);
          nested.forEach((item) => {
            if (typeof item === "string" && item.startsWith("http")) {
              urls.add(item);
            }
          });
        } catch (error) {
          trimmed
            .split(/\s+/)
            .filter((chunk) => chunk.startsWith("http"))
            .forEach((chunk) => urls.add(chunk.replace(/",?$/, "")));
        }
        return;
      }
      if (trimmed.startsWith("http")) {
        urls.add(trimmed);
      }
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach((item) => {
        if (typeof item === "string" && item.startsWith("http")) {
          urls.add(item);
        } else if (item?.url) {
          urls.add(item.url);
        }
      });
    }
  });
  return Array.from(urls);
};

const formatPrice = (value) => {
  if (!value && value !== 0) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("ru-RU").format(num) + " ₽";
};

const yesNo = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  const normalized = String(value).trim().toLowerCase();
  if (["1", "да", "yes", "true"].includes(normalized)) return "Да";
  if (["0", "нет", "no", "false"].includes(normalized)) return "Нет";
  return String(value);
};

const detailGroups = [
  {
    title: "Параметры",
    keys: [
      "rooms",
      "total_area",
      "living_area",
      "kitchen_area",
      "floor",
      "floors",
      "total_floors",
      "ceiling_height",
      "layout",
      "windowtype",
    ],
  },
  {
    title: "Условия",
    keys: ["price", "price_total", "price_rub", "deposit", "commission", "prepayment", "termtype", "utilites"],
  },
  {
    title: "Комфорт",
    keys: [
      "repair",
      "furniture",
      "kitchenfurniture",
      "internet",
      "conditioner",
      "fridge",
      "washer",
      "tv",
      "shower",
      "dishwasher",
      "bathtub",
      "balconies",
      "children",
      "pets",
      "parking",
    ],
  },
];

const formatLabel = (key) =>
  ({
    rooms: "Комнат",
    total_area: "Общая площадь",
    living_area: "Жилая",
    kitchen_area: "Кухня",
    floor: "Этаж",
    floors: "Этажность",
    total_floors: "Этажность дома",
    ceiling_height: "Потолки",
    layout: "Планировка",
    windowtype: "Окна",
    price: "Цена",
    price_total: "Цена",
    price_rub: "Цена",
    deposit: "Залог",
    commission: "Комиссия",
    prepayment: "Предоплата",
    termtype: "Срок аренды",
    utilites: "Коммунальные",
    repair: "Ремонт",
    furniture: "Мебель",
    kitchenfurniture: "Мебель кухни",
    internet: "Интернет",
    conditioner: "Кондиционер",
    fridge: "Холодильник",
    washer: "Стиральная машина",
    tv: "Телевизор",
    shower: "Душ",
    dishwasher: "Посудомойка",
    bathtub: "Ванна",
    balconies: "Балконы",
    children: "Дети",
    pets: "Питомцы",
    parking: "Парковка",
  }[key] || key);

const renderGroup = (group, data) => {
  const rows = group.keys
    .map((key) => {
      const raw = data[key];
      if (raw === undefined || raw === null || raw === "") return "";
      const value =
        typeof raw === "number" && key.includes("area")
          ? `${raw} м²`
          : ["children", "pets", "furniture", "kitchenfurniture", "internet", "conditioner", "fridge", "washer", "tv", "shower", "dishwasher", "bathtub", "parking"].includes(
                key
              )
            ? yesNo(raw)
            : raw;
      if (!String(value).trim()) return "";
      return `
        <div class="object-info-row">
          <span>${formatLabel(key)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");
  if (!rows) return "";
  return `
    <section class="object-info-section">
      <h3>${group.title}</h3>
      ${rows}
    </section>
  `;
};

const updateHeroCounter = () => {
  const total = heroState.photos.length;
  if (!total) {
    objectHeroCounter.textContent = "0 / 0";
    return;
  }
  const width = objectHeroTrack.clientWidth || 1;
  const index = Math.round(objectHeroTrack.scrollLeft / width);
  heroState.index = Math.min(Math.max(index, 0), total - 1);
  objectHeroCounter.textContent = `${heroState.index + 1} / ${total}`;
};

const renderHero = (photos) => {
  heroState.photos = photos.length ? photos : [PHOTO_PLACEHOLDER];
  objectHeroTrack.innerHTML = heroState.photos
    .map(
      (url, idx) => `
        <div class="object-hero-slide" style="background-image:url('${encodeURI(url)}')" data-index="${idx}">
          <img src="${encodeURI(url)}" alt="Фото ${idx + 1}" loading="lazy" />
        </div>
      `
    )
    .join("");
  heroState.index = 0;
  objectHeroTrack.scrollLeft = 0;
  updateHeroCounter();
};

const openLightbox = (index) => {
  if (!heroState.photos.length) return;
  lightboxState.photos = heroState.photos;
  lightboxState.index = index;
  lightboxEl?.classList.remove("hidden");
  updateLightbox();
};

const closeLightbox = () => {
  lightboxEl?.classList.add("hidden");
};

const updateLightbox = () => {
  if (!lightboxImage) return;
  const total = lightboxState.photos.length;
  const normalized = ((lightboxState.index % total) + total) % total;
  lightboxState.index = normalized;
  lightboxImage.src = lightboxState.photos[normalized];
};

const preventZoom = (event) => {
  if (!lightboxEl?.classList.contains("hidden")) return;
  event.preventDefault();
};

document.addEventListener(
  "gesturestart",
  (event) => preventZoom(event),
  { passive: false }
);
document.addEventListener(
  "gesturechange",
  (event) => preventZoom(event),
  { passive: false }
);
document.addEventListener(
  "gestureend",
  (event) => preventZoom(event),
  { passive: false }
);

let lastTouchTime = 0;
document.addEventListener(
  "touchend",
  (event) => {
    if (!lightboxEl?.classList.contains("hidden")) return;
    const now = Date.now();
    if (now - lastTouchTime <= 350) {
      event.preventDefault();
    }
    lastTouchTime = now;
  },
  { passive: false }
);

objectHeroTrack?.addEventListener("pointerdown", (event) => {
  heroState.dragging = true;
  heroState.startX = event.clientX;
  heroState.scrollLeft = objectHeroTrack.scrollLeft;
  objectHeroTrack.setPointerCapture(event.pointerId);
});

objectHeroTrack?.addEventListener("pointermove", (event) => {
  if (!heroState.dragging) return;
  const delta = event.clientX - heroState.startX;
  objectHeroTrack.scrollLeft = heroState.scrollLeft - delta;
});

["pointerup", "pointerleave", "pointercancel"].forEach((name) => {
  objectHeroTrack?.addEventListener(name, (event) => {
    if (heroState.dragging) {
      heroState.dragging = false;
      objectHeroTrack.releasePointerCapture(event.pointerId);
      updateHeroCounter();
    }
  });
});

objectHeroTrack?.addEventListener("scroll", () => {
  window.requestAnimationFrame(updateHeroCounter);
});

objectHeroTrack?.addEventListener("click", (event) => {
  const slide = event.target.closest(".object-hero-slide");
  if (!slide) return;
  const index = Number(slide.dataset.index) || 0;
  openLightbox(index);
});

lightboxClose?.addEventListener("click", closeLightbox);
lightboxEl?.addEventListener("click", (event) => {
  if (event.target === lightboxEl) closeLightbox();
});

const lightboxShift = (delta) => {
  lightboxState.index += delta;
  updateLightbox();
};

lightboxPrev?.addEventListener("click", () => lightboxShift(-1));
lightboxNext?.addEventListener("click", () => lightboxShift(1));

const summaryRows = (data) => {
  const rows = [
    data.rooms ? `${data.rooms} комн.` : null,
    data.total_area ? `${data.total_area} м²` : null,
    data.kitchen_area ? `Кухня ${data.kitchen_area} м²` : null,
    data.floor ? `${data.floor}${data.total_floors ? ` из ${data.total_floors}` : ""} этаж` : null,
  ].filter(Boolean);
  if (!rows.length) return "";
  return `<div class="object-summary-meta">${rows.join(" · ")}</div>`;
};

const renderSummary = (data) => {
  const title = data.title || data.full_address || data.address || "Объявление";
  const id = data.external_id || data.id || "—";
  const address = data.full_address || data.address || "Адрес уточняется";
  const description = data.description || data.short_description || "";
  const price = data.price || data.price_total || data.price_rub || data.month_price;

  if (headerTitle) headerTitle.textContent = title;
  if (headerSubtitle) headerSubtitle.textContent = `ID ${id}`;
  if (editLink) {
    editLink.hidden = false;
    editLink.href = `/cabinet.html?edit=${encodeURIComponent(id)}`;
  }

  summaryContainer.innerHTML = `
    <div class="object-summary-head">
      <div>
        <p class="object-summary-id">Объявление #${escapeHtml(id)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="object-summary-address">${escapeHtml(address)}</p>
        ${summaryRows(data)}
      </div>
      <div class="object-summary-price">${escapeHtml(formatPrice(price))}</div>
    </div>
    ${
      description
        ? `<p class="object-summary-description">${escapeHtml(description)}</p>`
        : ""
    }
  `;
};

const renderInfo = (data) => {
  const sections = detailGroups.map((group) => renderGroup(group, data)).filter(Boolean).join("");
  infoContainer.innerHTML = sections || "<div class=\"empty-state\">Нет дополнительных данных</div>";
};

const renderActions = (data) => {
  const id = data.external_id || data.id || "";
  const scheduleUrl = id ? `/showing.html?id=${encodeURIComponent(id)}` : "#";
  const editUrl = id ? `/cabinet.html?edit=${encodeURIComponent(id)}` : "#";
  actionsContainer.innerHTML = `
    <h3>Действия</h3>
    <div class="object-cta-grid">
      <a class="object-action primary" href="${scheduleUrl}">Создать показ</a>
      <a class="object-action ghost" href="${editUrl}">Редактировать</a>
    </div>
  `;
};

const showError = (message) => {
  [summaryContainer, infoContainer, actionsContainer].forEach((el) => {
    if (el) el.innerHTML = `<div class="empty-state error">${message}</div>`;
  });
};

const fetchObject = async () => {
  if (!objectId) {
    showError("ID объекта не указан");
    return;
  }
  try {
    const response = await fetch(`/api/objects/${encodeURIComponent(objectId)}`);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    const photos = collectPhotoUrls(data);
    renderHero(photos);
    renderSummary(data);
    renderInfo(data);
    renderActions(data);
  } catch (error) {
    console.error("Object detail error", error);
    showError(`Не удалось загрузить объект: ${error.message}`);
  }
};

fetchObject();
