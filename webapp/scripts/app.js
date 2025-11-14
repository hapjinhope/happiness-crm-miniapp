const APP_VERSION = "0.1.0-beta.3";
const APP_LABEL = `HAPPINESS CRM · Beta ${APP_VERSION}`;

const listEl = document.getElementById("objectsList");
const searchInput = document.getElementById("searchInput");
const priceInput = document.getElementById("priceInput");
const modalEl = document.getElementById("detailModal");
const modalBody = document.getElementById("detailBody");
const modalClose = document.getElementById("modalClose");
const lightboxEl = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxNavButtons = document.querySelectorAll(".lightbox-nav");
const filterButton = document.getElementById("filterButton");
const filterPanel = document.getElementById("filterPanel");
const historyListEl = document.getElementById("searchHistoryList");
const historyClearBtn = document.getElementById("clearHistoryButton");
const sortPills = document.querySelectorAll(".sort-pill");

let currentQuery = "";
let debounceTimer;
let priceFilterDigits = "";
const objectCache = new Map();
const ownerCache = new Map();
let lightboxState = { photos: [], index: 0 };
let modalSliderControl = null;
let lastSuccessfulItems = [];
let lastSuccessfulTimestamp = null;
let sortMode = "default";

window.invalidateObjectCache = (objectId) => {
  if (!objectId) return;
  objectCache.delete(String(objectId));
};

const HISTORY_STORAGE_KEY = "crm-search-history";
const HISTORY_LIMIT = 8;
let searchHistory = loadSearchHistory();

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("ru-RU").format(num) + " ₽";
};

const shortAddress = (address) => {
  if (!address) return "—";
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return address;
  const filtered = [];
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (/\b(АО|округ|district|р-н|район)\b/i.test(part)) {
      continue;
    }
    filtered.unshift(part);
    if (/[\d]/.test(part) && filtered.length >= 2) {
      break;
    }
  }
  const target = filtered.length ? filtered.slice(-2) : parts.slice(-2);
  return target.join(", ");
};

const escapeInline = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const extractNumericId = (item) => {
  const raw =
    item.id ??
    item.raw?.external_id ??
    item.raw?.id ??
    item.raw?.object_id ??
    item.raw?.cian_id ??
    "";
  const digits = String(raw).replace(/\D/g, "");
  return digits ? Number(digits) : Number.POSITIVE_INFINITY;
};

const extractNumericPrice = (item) => {
  const candidates = [
    item.price,
    item.raw?.price,
    item.raw?.price_total,
    item.raw?.price_rub,
    item.raw?.price_usd,
  ];
  for (const candidate of candidates) {
    const number = Number(String(candidate ?? "").replace(/\s/g, ""));
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return Number.POSITIVE_INFINITY;
};

const applySort = (items) => {
  if (!Array.isArray(items) || items.length < 2) return items;
  if (sortMode === "id") {
    return [...items].sort((a, b) => extractNumericId(a) - extractNumericId(b));
  }
  if (sortMode === "price") {
    return [...items].sort((a, b) => extractNumericPrice(a) - extractNumericPrice(b));
  }
  return items;
};

const renderItems = (items, options = {}) => {
  if (!listEl) return;
  objectCache.clear();
  listEl.innerHTML = "";

  let list = Array.isArray(items) ? [...items] : [];
  const numericQuery = currentQuery.replace(/\D/g, "");
  const queryIsNumeric = Boolean(currentQuery) && currentQuery.trim().replace(/[\d\s]/g, "") === "";
  if (queryIsNumeric && numericQuery) {
    list = list.filter((item) => {
      const priceCandidates = [
        item.price,
        item.raw?.price,
        item.raw?.price_total,
        item.raw?.price_rub,
      ];
      const priceMatch = priceCandidates.some((value) => {
        if (value === undefined || value === null) return false;
        const digits = String(value).replace(/\D/g, "");
        return digits.includes(numericQuery);
      });
      const idDigits = String(item.id ?? item.raw?.external_id ?? item.raw?.id ?? "")
        .replace(/\D/g, "");
      const idMatch = idDigits && idDigits.includes(numericQuery);
      return priceMatch || idMatch;
    });
  }

  list = applySort(list);

  if (priceFilterDigits) {
    list = list.filter((item) => {
      const priceValue = extractNumericPrice(item);
      if (!Number.isFinite(priceValue)) return false;
      return String(Math.round(priceValue)).includes(priceFilterDigits);
    });
  }

  if (options.message) {
    const note = document.createElement("div");
    const classes = ["empty-state"];
    if (options.variant) classes.push(options.variant);
    note.className = classes.join(" ");
    note.textContent = options.message;
    listEl.appendChild(note);
  }

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Ничего не найдено. Попробуйте изменить запрос.";
    listEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  list.forEach((item) => {
    const card = document.createElement("article");
    card.className = "object-card";

    const id = item.id ?? item.raw?.external_id ?? item.raw?.id ?? "—";
    if (id && item.raw) {
      objectCache.set(String(id), item.raw);
    }
    card.dataset.objectId = id;
    const addressRaw = item.address ?? item.raw?.full_address ?? item.raw?.location ?? "—";
    const address = shortAddress(addressRaw);
    const price = formatPrice(item.price ?? item.raw?.price_total ?? item.raw?.price_rub);
    const ownerId = item.raw?.owners_id || item.raw?.owner_id || null;
    const ownerUrl = item.raw?.owner_url || null;
    const ownerAction = ownerUrl
      ? `<a class="object-action" href="${escapeInline(ownerUrl)}" target="_blank" rel="noopener">Собственник</a>`
      : ownerId
          ? `<button type="button" class="object-action ghost" data-card-action="owner" data-owner-id="${ownerId}">Собственник</button>`
          : `<button type="button" class="object-action ghost" disabled>Собственник</button>`;

    const callAction = `<button type="button" class="object-action locked" data-card-action="call" disabled>Позвонить</button>`;

    card.innerHTML = `
      <div class="object-card-header">
        <div class="object-id-badge">#${escapeInline(id)}</div>
        <div class="object-address" title="${escapeInline(addressRaw)}">${escapeInline(address)}</div>
        <div class="object-price">${escapeInline(price)}</div>
      </div>
      <div class="object-actions-row">
        ${ownerAction}
        ${callAction}
      </div>
    `;

    card.addEventListener("click", (event) => {
      if (event.target.closest(".object-action")) return;
      openDetail(String(id));
    });
    fragment.appendChild(card);
  });

  listEl.appendChild(fragment);
};

const hydrateOwnerLink = async (ownerId) => {
  if (!ownerId) return;
  const container = modalBody.querySelector(`[data-owner-id="${ownerId}"]`);
  if (!container) return;
  container.classList.add("loading");
  try {
    let info = ownerCache.get(ownerId);
    if (!info) {
      const response = await fetch(`/api/owners/${encodeURIComponent(ownerId)}`);
      if (!response.ok) throw new Error(await response.text());
      info = await response.json();
      ownerCache.set(ownerId, info);
    }
    const link = info.url
      ? `<a href="${info.url}" target="_blank" rel="noopener">${escapeInline(info.name || "ссылка")}</a>`
      : `<span>${escapeInline(info.name || "недоступно")}</span>`;
    container.innerHTML = `<span>Собственник:</span>${link}`;
  } catch (error) {
    container.innerHTML = `<span>Собственник:</span><span>недоступен</span>`;
    console.warn("Owner info error", error);
  } finally {
    container.classList.remove("loading");
  }
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

const collectPhotoUrls = (data) => {
  const urls = new Set();
  PHOTO_FIELDS.forEach((field) => {
    const value = data[field];
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "string" && item.startsWith("http")) {
          urls.add(item);
        }
        if (item?.url) {
          urls.add(item.url);
        }
      });
    } else if (typeof value === "string") {
      const trimmed = value.trim();
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
          if (trimmed.includes("http")) {
            trimmed
              .split(/\s+/)
              .filter((chunk) => chunk.startsWith("http"))
              .forEach((chunk) => urls.add(chunk.replace(/",?$/, "")));
          }
        }
      } else if (trimmed.startsWith("http")) {
        urls.add(trimmed);
      }
    } else if (typeof value === "object") {
      Object.values(value).forEach((item) => {
        if (typeof item === "string" && item.startsWith("http")) {
          urls.add(item);
        }
        if (item?.url) {
          urls.add(item.url);
        }
      });
    }
  });
  return Array.from(urls);
};

const HUMAN_LABELS = {
  external_id: "ID",
  id: "ID",
  title: "Название",
  price: "Цена",
  price_total: "Цена",
  price_rub: "Цена",
  deposit: "Залог",
  commission: "Комиссия",
  address: "Адрес",
  full_address: "Адрес",
  city: "Город",
  district: "Район",
  complex_name: "ЖК",
  house_type: "Тип дома",
  building_type: "Тип дома",
  total_area: "Общая площадь",
  living_area: "Жилая площадь",
  kitchen_area: "Площадь кухни",
  rooms: "Комнат",
  floor: "Этаж",
  floors: "Этажность",
  total_floors: "Этажность",
  ceiling_height: "Высота потолка",
  parking: "Паркинг",
  metro: "Метро",
  distance_to_metro: "До метро",
  description: "Описание",
  created_at: "Создано",
  updated_at: "Последнее обновление",
  layout: "Планировка",
  repair: "Ремонт",
  windowtype: "Окна",
  status: "Статус",
  promotion_type: "Продвижение",
  type: "Тип объявления",
  furniture: "Мебель",
  kitchenfurniture: "Мебель на кухне",
  internet: "Интернет",
  conditioner: "Кондиционер",
  fridge: "Холодильник",
  washer: "Стиральная машина",
  tv: "Телевизор",
  shower: "Душ",
  dishwasher: "Посудомоечная машина",
  bathtub: "Ванна",
  balconies: "Балконы",
  termtype: "Срок аренды",
  utilites: "Коммунальные платежи",
  prepayment: "Предоплата",
  children: "Дети",
  pets: "Питомцы",
  agent_id: "ID агента",
};

const VALUE_FORMATTERS = {
  status: (value) => ({ draft: "Черновик" }[value] || value),
  promotion_type: (value) => (value === "noPromotion" ? "Нет" : value),
  complex_name: (value) =>
    typeof value === "string" ? value.replace(/^ЖК\s+/i, "").trim() : value,
};

const formatLabel = (key) => HUMAN_LABELS[key] || key;

const formatAny = (value, key) => {
  if (value === null || value === undefined || value === "") return "—";
  if (VALUE_FORMATTERS[key]) {
    value = VALUE_FORMATTERS[key](value);
  }
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number") return value;
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map((v) => formatAny(v, key)).join(", ");
    }
    return JSON.stringify(value, null, 2);
  }
  return value;
};

const groupFields = (data) => {
  const groups = [
    {
      title: "📍 Локация",
      keys: ["address", "full_address", "city", "district", "metro", "distance_to_metro", "complex_name"],
    },
    {
      title: "🏠 Параметры",
      keys: [
        "type",
        "layout",
        "rooms",
        "total_area",
        "living_area",
        "kitchen_area",
        "floor",
        "floors",
        "total_floors",
        "ceiling_height",
        "windowtype",
      ],
    },
    {
      title: "💰 Условия",
      keys: [
        "price",
        "price_total",
        "price_rub",
        "deposit",
        "commission",
        "promotion_type",
        "status",
        "termtype",
        "utilites",
        "prepayment",
      ],
    },
    {
      title: "🏡 Комфорт",
      keys: [
        "repair",
        "parking",
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
      ],
    },
  ];

  return groups
    .map((group) => {
      const rows = group.keys
        .filter((key) => data[key] !== undefined)
        .map(
          (key) => `
            <div class="detail-row">
              <span>${formatLabel(key)}</span>
              <span>${formatAny(data[key], key)}</span>
            </div>
          `
        )
        .join("");
      if (!rows) return "";
      return `
        <div class="detail-section">
          <h3>${group.title}</h3>
          <div class="detail-grid">${rows}</div>
        </div>
      `;
    })
    .join("");
};

const buildDetailHtml = (data) => {
  const title = data.title || data.name || data.full_address || "Без названия";
  const objectId = data.external_id || data.id || "";
  const price = data.price || data.price_total || data.price_rub || data.month_price || null;
  const descriptionMain = data.description || data.short_description || data.comment || "";
  const photos = collectPhotoUrls(data);
  const mainIndex = data.main_photo_index ? Math.max(Number(data.main_photo_index) - 1, 0) : 0;
  const mainPhoto = photos[mainIndex] || photos[0];

  const formatArea = (value) => (value ? `${value} м²` : "");
  const yesNo = (value) => {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value === "boolean") return value ? "Да" : "Нет";
    const normalized = String(value).trim().toLowerCase();
    if (["1", "да", "yes", "true"].includes(normalized)) return "Да";
    if (["0", "нет", "no", "false"].includes(normalized)) return "Нет";
    return value;
  };

  const renderRows = (rows) =>
    rows
      .filter((row) => row.value)
      .map(
        (row) => `
          <div class="detail-row">
            <span>${row.label}</span>
            <span>${row.value}</span>
          </div>
        `
      )
      .join("");

  const renderSection = (titleText, rows) => {
    const body = renderRows(rows);
    if (!body) return "";
    return `
      <section class="detail-section">
        <h3>${titleText}</h3>
        <div class="detail-grid">
          ${body}
        </div>
      </section>
    `;
  };

  const isTrue = (value) => yesNo(value) === "Да";

  const buildChipRow = (items) =>
    items.length
      ? `<div class="chip-row">${items.map((label) => `<span class="detail-chip">${label}</span>`).join("")}</div>`
      : "";

  const amenityChips = [
    isTrue(data.internet) && "Интернет",
    isTrue(data.conditioner) && "Кондиционер",
    isTrue(data.fridge) && "Холодильник",
    isTrue(data.dishwasher) && "Посудомойка",
    isTrue(data.tv) && "Телевизор",
    isTrue(data.washer) && "Стиральная машина",
  ].filter(Boolean);

  const bathChips = [];
  if (isTrue(data.bathtub)) bathChips.push("Ванна");
  if (isTrue(data.shower)) bathChips.push("Душ");
  if (data.bathroom_type && !bathChips.includes(data.bathroom_type)) {
    bathChips.push(data.bathroom_type);
  }

  const furnitureChips = [
    isTrue(data.furniture) && "Мебель",
    isTrue(data.kitchenfurniture) && "Мебель на кухне",
  ].filter(Boolean);

  const comfortSectionBody = [buildChipRow(amenityChips), buildChipRow(bathChips), buildChipRow(furnitureChips)]
    .filter(Boolean)
    .join("");

  const comfortSection = comfortSectionBody
    ? `<section class="detail-section">
        <h3>В квартире есть</h3>
        ${comfortSectionBody}
      </section>`
    : "";

  const locationRows = [
    { label: "Адрес", value: data.full_address || data.address || data.location },
    { label: "ЖК", value: data.complex_name },
    { label: "Округ/район", value: data.district || data.area },
    { label: "Тип недвижимости", value: data.property_type || data.realty_type || data.types },
  ];

  const paramsRows = [
    { label: "Тип объявления", value: data.type || data.listing_type },
    { label: "Комнат", value: data.rooms },
    { label: "Общая площадь", value: formatArea(data.total_area) },
    { label: "Жилая", value: formatArea(data.living_area) },
    { label: "Кухня", value: formatArea(data.kitchen_area) },
    { label: "Планировка", value: data.layout },
    { label: "Высота потолков", value: data.ceiling_height ? `${data.ceiling_height} м` : "" },
    { label: "Этаж/Этажность", value: data.floor !== undefined ? `${data.floor}${
      data.floors ? "/" + data.floors : ""
    }` : "" },
    { label: "Окна", value: data.windowtype || data.windows },
  ];

  const featuresRows = [
    { label: "Балконы", value: data.balconies || data.loggias },
    { label: "Вид из окна", value: data.view_from_windows || data.view },
    { label: "Санузел", value: data.bathroom_type || data.bathrooms },
    { label: "Ремонт", value: data.repair || data.renovation },
    { label: "Лифты", value: data.lifts || data.elevator },
    { label: "Парковка", value: data.parking || data.parking_type },
  ];

  const priceRows = [
    { label: "Цена", value: price ? formatPrice(price) : "" },
    { label: "Коммунальные платежи", value: data.utilites || data.utilities },
    { label: "Предоплата", value: data.prepayment },
    { label: "Залог", value: data.deposit ? formatPrice(data.deposit) : "" },
    { label: "Срок аренды", value: data.termtype || data.term },
    { label: "Комиссия", value: data.commission },
    { label: "Можно с животными", value: yesNo(data.pets) },
    { label: "Можно с детьми", value: yesNo(data.children) },
    { label: "Продвижение", value: data.promotion_type },
  ];

  const descriptionSections = [
    { title: "Квартира", value: data.description_apartment || descriptionMain },
    { title: "Дом и ЖК", value: data.description_house || data.house_description },
    { title: "Район и инфраструктура", value: data.description_area || data.infrastructure },
  ].filter((section) => section.value);

  const descriptionHtml = descriptionSections
    .map((section) => {
      const text = String(section.value || "").trim();
      if (!text) return "";
      return `
        <section class="detail-text-block">
          <h4>${section.title}</h4>
          <p>${text.replace(/\n/g, "<br>")}</p>
        </section>
      `;
    })
    .join("");

  const ownerSection = data.owners_id
    ? `<div class="owner-link loading" data-owner-id="${data.owners_id}">
        <span>Собственник:</span>
        <span>загрузка...</span>
      </div>`
    : "";

  const mainPhotoSafe = encodeURI(mainPhoto).replace(/'/g, "%27");
  const photoSection = mainPhoto
    ? `
    <div class="hero-gallery">
      <div class="hero-slider" data-photos="${encodeURIComponent(JSON.stringify(photos))}" data-current="${mainIndex}">
        <button class="hero-nav prev" aria-label="Предыдущее фото">‹</button>
        <div class="hero-photo" data-current="${mainIndex}" style="background-image:url('${mainPhotoSafe}')">
          <span class="hero-badge">Главное фото</span>
        </div>
        <button class="hero-nav next" aria-label="Следующее фото">›</button>
      </div>
      ${
        photos.length > 1
          ? `<div class="hero-thumbs">${photos
              .map(
                (url, idx) => `
                    <button class="hero-thumb ${idx === mainIndex ? "active" : ""}" data-index="${idx}" style="background-image:url('${encodeURI(
                      url
                    ).replace(/'/g, "%27")}')"></button>`
              )
              .join("")}</div>`
          : ""
      }
    </div>${ownerSection}`
    : ownerSection;

  return `
    <div class="detail-header">
      <div>
        <div class="detail-title">${title}</div>
        <div class="object-id">ID: ${objectId || "—"}</div>
      </div>
      <div class="detail-price">${price ? formatPrice(price) : ""}</div>
    </div>
    ${photoSection}
    ${descriptionHtml}
    ${renderSection("Расположение", locationRows)}
    ${renderSection("Параметры квартиры", paramsRows)}
    ${renderSection("Особенности квартиры", featuresRows)}
    ${comfortSection}
    ${renderSection("Цена и условия аренды", priceRows)}
  `;
};

const showModal = (html) => {
  modalBody.innerHTML = html;
  modalEl.classList.remove("hidden");
  initModalInteractions();
  initEditControls();
};

const closeModal = () => {
  modalEl.classList.add("hidden");
  modalSliderControl = null;
};

modalClose.addEventListener("click", closeModal);
modalEl.addEventListener("click", (event) => {
  if (event.target === modalEl) {
    closeModal();
  }
});

const initModalInteractions = () => {
  modalSliderControl = null;
  const slider = modalBody.querySelector(".hero-slider");
  if (!slider) return;
  let photos = [];
  try {
    photos = JSON.parse(decodeURIComponent(slider.dataset.photos || "[]"));
  } catch (error) {
    photos = [];
  }
  if (!photos.length) return;

  let current = Number(slider.dataset.current || 0);
  const photoEl = slider.querySelector(".hero-photo");
  const badgeEl = slider.querySelector(".hero-badge");
  const navButtons = slider.querySelectorAll(".hero-nav");
  const thumbs = modalBody.querySelectorAll(".hero-thumb");

  const updateUI = () => {
    if (!photoEl) return;
    current = (current + photos.length) % photos.length;
    if (photoEl) photoEl.style.backgroundImage = `url('${encodeURI(photos[current]).replace(/'/g, "%27")}')`;
    if (badgeEl) {
      badgeEl.textContent =
        current === 0 ? "Главное фото" : `Фото ${current + 1}/${photos.length}`;
    }
    navButtons.forEach((btn) => {
      btn.classList.toggle("hidden", photos.length === 1);
    });
    thumbs.forEach((thumb) => {
      thumb.classList.toggle(
        "active",
        Number(thumb.dataset.index) === current
      );
    });
  };

  const goPrev = () => {
    current -= 1;
    updateUI();
  };
  const goNext = () => {
    current += 1;
    updateUI();
  };

  navButtons.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      btn.classList.contains("next") ? goNext() : goPrev();
    });
  });

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", (event) => {
      event.stopPropagation();
      current = Number(thumb.dataset.index);
      updateUI();
    });
    thumb.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      openLightbox(photos, Number(thumb.dataset.index));
    });
  });

  photoEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    openLightbox(photos, current);
  });

  let dragStartX = 0;
  let dragging = false;
  const pointerDown = (event) => {
    dragging = true;
    dragStartX = event.clientX;
    photoEl?.setPointerCapture(event.pointerId);
  };
  const pointerUp = (event) => {
    if (!dragging) return;
    const diff = event.clientX - dragStartX;
    if (Math.abs(diff) > 40) {
      diff < 0 ? goNext() : goPrev();
    }
    dragging = false;
    photoEl?.releasePointerCapture(event.pointerId);
  };
  photoEl?.addEventListener("pointerdown", pointerDown);
  photoEl?.addEventListener("pointerup", pointerUp);
  photoEl?.addEventListener("pointerleave", () => {
    dragging = false;
  });
  photoEl?.addEventListener("pointercancel", () => {
    dragging = false;
  });

  modalSliderControl = { next: goNext, prev: goPrev };
  updateUI();
};

const initEditControls = () => {
  const panel = modalBody.querySelector(".edit-panel");
  if (!panel) return;
  const objectId = panel.dataset.objectId;
  const textarea = panel.querySelector(".edit-textarea");
  const statusEl = panel.querySelector(".edit-status");
  const cancelBtn = panel.querySelector(".edit-cancel");
  const submitBtn = panel.querySelector(".edit-submit");

  const setStatus = (message, type = "") => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.type = type;
  };

  cancelBtn?.addEventListener("click", () => {
    panel.classList.add("hidden");
    setStatus("");
  });

  submitBtn?.addEventListener("click", async () => {
    if (!objectId || !textarea) return;
    let payload;
    try {
      payload = JSON.parse(textarea.value);
      if (typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Нужен JSON объект");
      }
    } catch (error) {
      setStatus(`Ошибка JSON: ${error.message}`, "error");
      return;
    }
    submitBtn.disabled = true;
    setStatus("Сохраняем...");
    try {
      const response = await fetch(`/api/objects/${encodeURIComponent(objectId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await formatError(response));
      }
      const updated = await response.json();
      objectCache.set(String(objectId), updated);
      showModal(buildDetailHtml(updated));
      setStatus("Сохранено", "success");
    } catch (error) {
      setStatus(`Ошибка сохранения: ${error.message}`, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
  const shouldAutoOpen = modalEl.dataset.showEditor === "true";
  panel.classList.toggle("hidden", !shouldAutoOpen);
  if (shouldAutoOpen) {
    setStatus("");
  }
  modalEl.dataset.showEditor = "false";
};

const openLightbox = (photos, index = 0) => {
  if (!photos.length || !lightboxEl || !lightboxImg) return;
  lightboxState = { photos, index };
  updateLightboxImage();
  lightboxEl.classList.remove("hidden");
  lightboxNavButtons.forEach((btn) => {
    btn.classList.toggle("hidden", photos.length <= 1);
  });
};

const closeLightbox = () => {
  lightboxEl?.classList.add("hidden");
};

const updateLightboxImage = () => {
  if (!lightboxImg) return;
  const { photos, index } = lightboxState;
  const normalized = ((index % photos.length) + photos.length) % photos.length;
  lightboxState.index = normalized;
  lightboxImg.src = photos[normalized];
};

lightboxClose?.addEventListener("click", closeLightbox);
lightboxEl?.addEventListener("click", (event) => {
  if (event.target === lightboxEl) closeLightbox();
});

lightboxNavButtons.forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const delta = btn.classList.contains("next") ? 1 : -1;
    lightboxState.index += delta;
    updateLightboxImage();
  });
});

const lightboxSwipe = { startX: 0, dragging: false };

lightboxImg?.addEventListener("pointerdown", (event) => {
  lightboxSwipe.dragging = true;
  lightboxSwipe.startX = event.clientX;
  lightboxImg.setPointerCapture(event.pointerId);
});

lightboxImg?.addEventListener("pointerup", (event) => {
  if (!lightboxSwipe.dragging) return;
  const diff = event.clientX - lightboxSwipe.startX;
  if (Math.abs(diff) > 40) {
    lightboxState.index += diff < 0 ? 1 : -1;
    updateLightboxImage();
  }
  lightboxSwipe.dragging = false;
  lightboxImg.releasePointerCapture(event.pointerId);
});

lightboxImg?.addEventListener("pointerleave", () => {
  lightboxSwipe.dragging = false;
});

lightboxImg?.addEventListener("pointercancel", () => {
  lightboxSwipe.dragging = false;
});

const handleKeyNavigation = (event) => {
  if (!lightboxEl?.classList.contains("hidden")) {
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowRight") {
      lightboxState.index += 1;
      updateLightboxImage();
    } else if (event.key === "ArrowLeft") {
      lightboxState.index -= 1;
      updateLightboxImage();
    }
    return;
  }

  if (!modalEl?.classList.contains("hidden") && modalSliderControl) {
    if (event.key === "ArrowRight") {
      modalSliderControl.next?.();
    } else if (event.key === "ArrowLeft") {
      modalSliderControl.prev?.();
    } else if (event.key === "Escape") {
      closeModal();
    }
  }
};

document.addEventListener("keydown", handleKeyNavigation);

const formatError = async (response) => {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return parsed.detail || parsed.message || text || response.statusText;
  } catch (error) {
    return text || response.statusText;
  }
};

async function fetchObjects(query = "") {
  if (!listEl) return;
  listEl.innerHTML = '<div class="empty-state">Загружаем данные...</div>';
  try {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    const response = await fetch(`/api/objects?${params}`);
    if (!response.ok) {
      throw new Error(await formatError(response));
    }
    const data = await response.json();
    const items = data.items ?? [];
    lastSuccessfulItems = items;
    lastSuccessfulTimestamp = new Date();
    if (currentQuery) {
      recordSearchHistory(currentQuery);
    }
    renderItems(lastSuccessfulItems);
  } catch (error) {
    if (lastSuccessfulItems.length) {
      const label = lastSuccessfulTimestamp
        ? lastSuccessfulTimestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        : "раньше";
      renderItems(lastSuccessfulItems, {
        message: `Не удалось обновить данные: ${error.message}. Показаны результаты от ${label}.`,
        variant: "warning",
      });
      return;
    }
    listEl.innerHTML = `<div class="empty-state error">Ошибка загрузки: ${error.message}</div>`;
  }
}

const openDetail = async (objectId, options = {}) => {
  if (!objectId || objectId === "—") return;
  const cached = objectCache.get(String(objectId));
  if (cached) {
    showModal(buildDetailHtml(cached));
    if (cached.owners_id) hydrateOwnerLink(cached.owners_id);
    modalEl.dataset.showEditor = options.showEditor ? "true" : "false";
    return;
  }
  showModal('<div class="empty-state">Загружаем объект...</div>');
  try {
    const response = await fetch(`/api/objects/${encodeURIComponent(objectId)}`);
    if (!response.ok) {
      throw new Error(await formatError(response));
    }
    const data = await response.json();
    objectCache.set(String(objectId), data);
    showModal(buildDetailHtml(data));
    if (data.owners_id) hydrateOwnerLink(data.owners_id);
    modalEl.dataset.showEditor = options.showEditor ? "true" : "false";
  } catch (error) {
    showModal(`<div class="empty-state error">Не удалось загрузить объект: ${error.message}</div>`);
  }
};

const runSearchNow = () => {
  if (!searchInput) return;
  currentQuery = searchInput.value.trim();
  fetchObjects(currentQuery);
};

const debouncedSearch = (event) => {
  const value = event.target.value.trim();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentQuery = value;
    fetchObjects(currentQuery);
  }, 350);
};

function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry) => typeof entry === "string" && entry.trim());
    }
    return [];
  } catch (error) {
    return [];
  }
}

const persistSearchHistory = () => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(searchHistory));
  } catch (error) {
    console.warn("Не удалось сохранить историю поиска", error);
  }
};

const recordSearchHistory = (query) => {
  const normalized = String(query || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized) return;
  searchHistory = [normalized, ...searchHistory.filter((entry) => entry !== normalized)].slice(
    0,
    HISTORY_LIMIT
  );
  persistSearchHistory();
  renderSearchHistory();
};

const clearSearchHistory = () => {
  searchHistory = [];
  persistSearchHistory();
  renderSearchHistory();
};

const renderSearchHistory = () => {
  if (!historyListEl) return;
  if (!searchHistory.length) {
    historyListEl.innerHTML = '<span class="history-empty">История пока пуста</span>';
    historyClearBtn?.classList.add("hidden");
    return;
  }
  historyClearBtn?.classList.remove("hidden");
  historyListEl.innerHTML = searchHistory
    .map((entry) => {
      const encoded = encodeURIComponent(entry);
      return `<button type="button" class="history-chip" data-history-value="${encoded}">${escapeInline(
        entry
      )}</button>`;
    })
    .join("");
};

renderSearchHistory();

const updateSortPills = () => {
  sortPills.forEach((pill) => {
    const target = pill.dataset.sort || "default";
    pill.classList.toggle("active", target === sortMode);
  });
};

sortPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    const mode = pill.dataset.sort || "default";
    if (mode === sortMode) return;
    sortMode = mode;
    updateSortPills();
    renderItems(lastSuccessfulItems);
  });
});

updateSortPills();

const toggleFilterPanel = (forceHide = false) => {
  if (!filterPanel) return;
  if (forceHide) {
    filterPanel.classList.add("hidden");
    return;
  }
  filterPanel.classList.toggle("hidden");
};

filterButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleFilterPanel();
});

filterPanel?.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", (event) => {
  if (!filterPanel || filterPanel.classList.contains("hidden")) return;
  if (filterPanel.contains(event.target)) return;
  if (filterButton && filterButton.contains(event.target)) return;
  toggleFilterPanel(true);
});

historyListEl?.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-history-value]");
  if (!chip || !searchInput) return;
  const value = decodeURIComponent(chip.dataset.historyValue || "");
  if (!value) return;
  searchInput.value = value;
  currentQuery = value;
  toggleFilterPanel(true);
  fetchObjects(currentQuery);
});

historyClearBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  clearSearchHistory();
});

searchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runSearchNow();
  }
});

if (searchInput && listEl) {
  searchInput.addEventListener("input", debouncedSearch);
  fetchObjects();
}

priceInput?.addEventListener("input", (event) => {
  priceFilterDigits = event.target.value.replace(/\D/g, "");
  renderItems(lastSuccessfulItems);
});

window.openDetail = openDetail;
listEl?.addEventListener("click", async (event) => {
  const link = event.target.closest(".object-action[href]");
  if (link) {
    event.stopPropagation();
    return;
  }
  const actionBtn = event.target.closest("[data-card-action]");
  if (!actionBtn) return;
  event.stopPropagation();
  const action = actionBtn.dataset.cardAction;
  if (action === "listing" || action === "call") {
    return;
  }
  if (action === "owner") {
    const ownerId = actionBtn.dataset.ownerId;
    if (!ownerId) return;
    actionBtn.disabled = true;
    try {
      let info = ownerCache.get(ownerId);
      if (!info) {
        const response = await fetch(`/api/owners/${ownerId}`);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || response.statusText);
        }
        info = await response.json();
        ownerCache.set(ownerId, info);
      }
      if (info.url) {
        window.open(info.url, "_blank", "noopener");
      } else {
        actionBtn.textContent = "Нет ссылки";
        setTimeout(() => (actionBtn.textContent = "Собственник"), 2000);
      }
    } catch (error) {
      actionBtn.textContent = "Ошибка";
      setTimeout(() => (actionBtn.textContent = "Собственник"), 2000);
    } finally {
      actionBtn.disabled = false;
    }
  }
});
