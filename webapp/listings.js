const STATUS_LABELS = {
  active: "Активное",
  draft: "Черновик",
  inactive: "Неактивное",
  archived: "В архиве",
  rejected: "Отклонено",
};

const DEAL_TYPE_FALLBACK = "rent";
const POLL_INTERVAL_MS = 15 * 60 * 1000;
const POLL_OFFSET_SECONDS = 15;

const EDITOR_GROUPS = [
  {
    key: "location",
    title: "Расположение",
    fields: [
      {
        key: "address",
        label: "Адрес",
        type: "text",
        fullWidth: true,
        prefillKeys: ["full_address", "location"],
        stripCity: true,
      },
      {
        key: "type",
        label: "Тип недвижимости",
        type: "text",
        prefillKeys: ["property_type", "types", "realty_type", "estate_type", "house_type"],
      },
    ],
  },
  {
    key: "params",
    title: "Параметры квартиры",
    fields: [
      { key: "rooms", label: "Комнат", type: "number" },
      { key: "total_area", label: "Общая площадь", type: "number", prefillKeys: ["area", "square_total"] },
      { key: "living_area", label: "Жилая", type: "number", prefillKeys: ["square_living"] },
      { key: "kitchen_area", label: "Кухня", type: "number", prefillKeys: ["square_kitchen"] },
      { key: "layout", label: "Планировка", type: "text" },
      { key: "ceiling_height", label: "Высота потолков", type: "number" },
      { key: "floor", label: "Этаж", type: "number", prefillKeys: ["level"] },
      { key: "floors", label: "Этажность", type: "number", prefillKeys: ["total_floors", "floors_total"] },
    ],
  },
  { key: "photos", title: "Фото", fields: [], placeholder: "Секция в разработке" },
  {
    key: "features",
    title: "Особенности квартиры",
    fields: [
      { key: "balconies", label: "Балконы", type: "text", prefillKeys: ["loggias", "balcony", "balconies_count"] },
      { key: "view_from_windows", label: "Вид из окна", type: "text", prefillKeys: ["view", "window_view"] },
      { key: "bathroom_type", label: "Санузел", type: "text", prefillKeys: ["bathroom", "bathrooms", "bathroom_count", "bathroom_combined"] },
      { key: "repair", label: "Ремонт", type: "text", prefillKeys: ["renovation", "repair_type"] },
      { key: "lifts", label: "Лифты", type: "text", prefillKeys: ["elevator", "elevators"] },
      { key: "parking", label: "Парковка", type: "text", prefillKeys: ["parking_type"] },
    ],
  },
  { key: "comfort", title: "В квартире есть", fields: [], includeToggles: true },
  {
    key: "description",
    title: "Описание квартиры",
    fields: [
      { key: "title", label: "Заголовок", type: "text", fullWidth: true },
      { key: "description", label: "Описание", type: "textarea", fullWidth: true },
    ],
  },
  {
    key: "price",
    title: "Цена и условия аренды",
    fields: [
      { key: "price_total", label: "Цена", type: "number", prefillKeys: ["price", "price_rub"] },
      { key: "utilites", label: "Оплата КУ", type: "text", prefillKeys: ["utilities", "communal_payments"] },
      { key: "prepayment", label: "Предоплата", type: "text", prefillKeys: ["advance_payment"] },
      { key: "deposit", label: "Залог", type: "number" },
      { key: "termtype", label: "Срок аренды", type: "text", prefillKeys: ["term", "rent_term"] },
      { key: "commission", label: "Комиссия", type: "text", prefillKeys: ["agent_fee"] },
    ],
    includePriceToggles: true,
  },
];

const TOGGLE_FIELDS = [
  { key: "fridge", label: "Холодильник" },
  { key: "washer", label: "Стиральная машина" },
  { key: "dishwasher", label: "Посудомойка" },
  { key: "conditioner", label: "Кондиционер" },
  { key: "tv", label: "Телевизор" },
  { key: "internet", label: "Интернет" },
  { key: "furniture", label: "Мебель" },
  { key: "kitchenfurniture", label: "Мебель на кухне" },
  { key: "parking", label: "Парковка" },
];

const PRICE_TOGGLE_FIELDS = [
  { key: "pets", label: "Можно с животными" },
  { key: "children", label: "Можно с детьми" },
];

const PHOTO_FIELDS = [
  "main_photo_url",
  "main_photo",
  "mainPhotoUrl",
  "mainPhoto",
  "photo_main",
  "photo_main_url",
  "cover",
  "cover_url",
  "coverUrl",
  "photo",
  "photo_url",
  "photoUrl",
  "photo_link",
  "photos_links",
  "photosLinks",
  "photos_url",
  "photosUrls",
  "image",
  "image_url",
  "imageUrl",
  "image_urls",
  "img",
  "img_url",
  "imgUrl",
  "pictures",
  "media",
  "gallery",
  "slides",
  "attachments",
  "photos",
  "photos_json",
  "images",
];

const PHOTO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'%3E%3Crect width='120' height='90' rx='12' fill='%23242432'/%3E%3Cpath d='M30 62l18-18a4 4 0 015 0l11 11 7-7a4 4 0 015 0l14 14v6H30v-6z' fill='%233c465f'/%3E%3Ccircle cx='45' cy='33' r='8' fill='%233c465f'/%3E%3C/svg%3E";

const stripCityPrefix = (value) => {
  if (!value) return value;
  return value.replace(/^(г\.?\s*)?Москва,?\s*/i, "").replace(/^Moscow,?\s*/i, "").trim();
};

const normalizeBooleanText = (value) => {
  if (typeof value === "boolean") return value ? "Да" : "";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "нет", "no"].includes(normalized)) return "";
    if (["true", "1", "да", "yes"].includes(normalized)) return "Да";
  }
  return value;
};

const formatEditorValue = (value, options = {}) => {
  if (value === null || value === undefined) return "";
  const applyStrip = (val) => (options.stripCity && typeof val === "string" ? stripCityPrefix(val) : val);
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeBooleanText(applyStrip(entry)))
      .filter((entry) => entry !== null && entry !== undefined && entry !== "")
      .join(", ");
  }
  let formatted = normalizeBooleanText(value);
  formatted = applyStrip(formatted);
  if (typeof formatted === "object") {
    return Object.values(formatted)
      .map((entry) => normalizeBooleanText(applyStrip(entry)))
      .filter((entry) => entry !== null && entry !== undefined && entry !== "")
      .join(", ");
  }
  return formatted ?? "";
};

const PHOTO_COLLECTION_FIELDS = [
  "photos_json",
  "photos",
  "images",
  "gallery",
  "media",
  "photo_urls",
  "img_urls",
  "photos_links",
  "attachments",
];

const MAIN_PHOTO_FIELDS = [
  "main_photo_url",
  "mainPhotoUrl",
  "main_photo",
  "photo_main",
  "cover",
  "cover_url",
];

const pickFirstUrl = (value, depth = 0) => {
  if (!value || depth > 3) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http")) return trimmed;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return pickFirstUrl(parsed, depth + 1);
      } catch (error) {
        const chunk = trimmed.split(/\s+/).find((part) => part.startsWith("http"));
        return chunk || null;
      }
    }
    const chunk = trimmed.split(/\s+/).find((part) => part.startsWith("http"));
    return chunk || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = pickFirstUrl(item, depth + 1);
      if (url) return url;
    }
    return null;
  }

  if (typeof value === "object") {
    if (typeof value.url === "string" && value.url.startsWith("http")) {
      return value.url;
    }
    for (const item of Object.values(value)) {
      const url = pickFirstUrl(item, depth + 1);
      if (url) return url;
    }
  }
  return null;
};

const resolvePhoto = (source = {}) => {
  for (const field of PHOTO_FIELDS) {
    const candidate = source[field];
    const url = pickFirstUrl(candidate);
    if (url) return url;
  }
  return null;
};

const flattenPhotoEntries = (entries = []) => {
  const urls = [];
  entries.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === "string" && entry.startsWith("http")) {
      urls.push(entry);
    } else if (entry.url && entry.url.startsWith("http")) {
      urls.push(entry.url);
    } else if (typeof entry === "object") {
      Object.values(entry).forEach((nested) => {
        if (typeof nested === "string" && nested.startsWith("http")) {
          urls.push(nested);
        } else if (nested?.url?.startsWith?.("http")) {
          urls.push(nested.url);
        }
      });
    }
  });
  return urls;
};

const normalizePhotoValue = (value) => {
  if (!value) return { urls: [], format: "array" };
  if (Array.isArray(value)) {
    return { urls: flattenPhotoEntries(value), format: "array" };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { urls: [], format: "string" };
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizePhotoValue(parsed);
      } catch (error) {
        // fallthrough
      }
    }
    const urls = trimmed
      .split(/[\s,]+/)
      .filter((chunk) => chunk.startsWith("http"))
      .map((chunk) => chunk.replace(/["']/g, ""));
    return { urls, format: "string" };
  }
  if (typeof value === "object") {
    return { urls: flattenPhotoEntries(Object.values(value)), format: "object" };
  }
  return { urls: [], format: "array" };
};

const extractEditorPhotos = (data = {}) => {
  for (const field of PHOTO_COLLECTION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
    const parsed = normalizePhotoValue(data[field]);
    return { key: field, urls: parsed.urls, format: parsed.format };
  }
  return { key: "photos_json", urls: [], format: "array" };
};

const serializeEditorPhotos = (photosMeta, photos) => {
  if (!photosMeta.key) return null;
  if (photosMeta.format === "string") {
    return photos.join("\n");
  }
  if (photosMeta.format === "object") {
    const result = {};
    photos.forEach((url, index) => {
      result[index] = url;
    });
    return result;
  }
  return photos;
};

const resolveMainPhotoBinding = (data = {}) => {
  for (const field of MAIN_PHOTO_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      return { key: field, value: data[field] };
    }
  }
  return { key: null, value: "" };
};

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
};

const resolveFieldBinding = (field, data = {}) => {
  const searchKeys = [field.key, ...(field.prefillKeys || [])];
  for (const candidate of searchKeys) {
    if (Object.prototype.hasOwnProperty.call(data, candidate) && hasMeaningfulValue(data[candidate])) {
      return { key: candidate, value: data[candidate] };
    }
  }
  for (const candidate of searchKeys) {
    if (Object.prototype.hasOwnProperty.call(data, candidate)) {
      return { key: candidate, value: data[candidate] };
    }
  }
  return { key: field.key, value: "" };
};

const normalizedValue = (value) => {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  const normalized = normalizedValue(value);
  if (!normalized) return false;
  return ["1", "yes", "true", "on", "да", "есть"].includes(normalized);
};

const resolveStatus = (obj = {}) => {
  const candidates = [
    obj.status,
    obj.state,
    obj.moderation_status,
    obj.moderation,
    obj.approval_status,
    obj.cian_status,
  ];
  for (const candidate of candidates) {
    const value = normalizedValue(candidate);
    if (!value) continue;
    if (value.includes("draft") || value.includes("чернов")) return "draft";
    if (value.includes("reject") || value.includes("откл")) return "rejected";
    if (value.includes("archive") || value.includes("архив")) return "archived";
    if (value.includes("inactive") || value.includes("pause") || value.includes("неакт"))
      return "inactive";
    if (value.includes("active") || value.includes("актив")) return "active";
  }
  if (obj.is_active === false) return "inactive";
  return "active";
};

const mapCianStatus = (cianStatus = "") => {
  const value = normalizedValue(cianStatus);
  if (!value) return null;
  if (
    value.includes("publish") ||
    value.includes("размещ") ||
    value.includes("опублик")
  ) {
    return "active";
  }
  if (
    value.includes("moderate") ||
    value.includes("модерац") ||
    value.includes("ожидает") ||
    value.includes("установлено из импорта")
  ) {
    return "draft";
  }
  if (
    value.includes("refus") ||
    value.includes("откл") ||
    value.includes("blocked") ||
    value.includes("remove") ||
    value.includes("удален") ||
    value.includes("снят")
  ) {
    return "rejected";
  }
  if (value.includes("deactiv") || value.includes("деактив") || value.includes("pause")) {
    return "inactive";
  }
  return null;
};

const resolveDealType = (obj = {}) => {
  const candidates = [
    obj.deal_type,
    obj.type,
    obj.offer_type,
    obj.category,
    obj.listing_type,
  ];
  for (const candidate of candidates) {
    const value = normalizedValue(candidate);
    if (!value) continue;
    if (value.includes("sale") || value.includes("sell") || value.includes("прод"))
      return "sale";
    if (value.includes("rent") || value.includes("аренда") || value.includes("снять"))
      return "rent";
  }
  return DEAL_TYPE_FALLBACK;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatPrice = (value) => {
  if (!value) return "—";
  return new Intl.NumberFormat("ru-RU").format(Number(value)) + " ₽";
};

const shortAddress = (address) => {
  if (!address) return "—";
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return address;
  return parts.slice(-2).join(", ");
};

const formatDisplayTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
};

const computeNextPollDate = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const quarters = Math.floor(minutes / 15);
  const nextQuarter = (quarters + 1) * 15;
  const target = new Date(now);
  if (nextQuarter >= 60) {
    target.setHours(target.getHours() + 1);
  }
  target.setMinutes(nextQuarter % 60);
  target.setSeconds(POLL_OFFSET_SECONDS);
  target.setMilliseconds(0);
  return target;
};

  const container = document.getElementById("listingsContainer");
if (!container) {
  console.warn("Listings container not found");
} else {
  const searchInput = document.getElementById("listingsSearchInput");
  const filterTabs = document.querySelectorAll(".listing-tab");
  const sheet = document.getElementById("listingSheet");
  const sheetClose = document.getElementById("sheetClose");
  const editorModal = document.getElementById("editorModal");
  const editorForm = document.getElementById("editorForm");
  const editorTitle = document.getElementById("editorTitle");
  const editorStatus = document.getElementById("editorStatus");
  const editorClose = document.getElementById("editorClose");
  const editorCancel = document.getElementById("editorCancel");
  const photoFileInput = document.getElementById("photoFileInput");

  let listingsCache = [];
  let searchQuery = "";
  let toggleState = {};
  let currentEditorSource = null;
  let currentObjectId = null;
  let editorFieldBindings = {};
  let editorPhotos = [];
  let editorPhotosMeta = { key: null, format: "array" };
  let editorMainPhotoKey = null;
  let editorMainPhotoUrl = "";
  const photoMenu = document.getElementById("photoMenu");
  let photoMenuState = { index: null, anchor: null };
  let dragPhotoIndex = null;
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get("search") || urlParams.get("q") || "";
  let pendingAutoEdit = urlParams.get("edit");

  const getPhoto = (obj = {}) => resolvePhoto(obj) || resolvePhoto(obj.raw || {}) || PHOTO_PLACEHOLDER;

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const matchesSearch = (item) => {
    if (!searchQuery) return true;
    const obj = item.raw || {};
    const haystack = `${item.id} ${obj.full_address || ""} ${obj.address || ""} ${
      obj.title || ""
    } ${obj.complex_name || obj.complex || ""}`
      .toLowerCase();
    if (haystack.includes(searchQuery)) return true;
    const digitsQuery = searchQuery.replace(/\D/g, "");
    if (!digitsQuery) return false;
    const priceFields = [obj.price, obj.price_total, obj.price_rub];
    if (
      priceFields.some((value) => {
        if (value === undefined || value === null) return false;
        const digits = String(value).replace(/\D/g, "");
        return digits.includes(digitsQuery);
      })
    ) {
      return true;
    }
    const idDigits = String(item.id ?? obj.external_id ?? "").replace(/\D/g, "");
    return idDigits && idDigits.includes(digitsQuery);
  };

  const setEditorStatus = (message = "", type = "") => {
    if (!editorStatus) return;
    editorStatus.textContent = message;
    editorStatus.className = `editor-status${type ? ` ${type}` : ""}`;
  };

  const hidePhotoMenu = () => {
    if (!photoMenu) return;
    photoMenu.classList.add("hidden");
    photoMenuState = { index: null, anchor: null };
  };

  const openPhotoMenu = (index, anchor) => {
    if (!photoMenu || !anchor) return;
    photoMenuState = { index, anchor };
    const rect = anchor.getBoundingClientRect();
    photoMenu.style.top = `${rect.bottom + 6}px`;
    photoMenu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 180))}px`;
    photoMenu.classList.remove("hidden");
  };

  const closeEditor = () => {
    editorModal?.classList.add("hidden");
    editorForm?.reset?.();
    if (editorForm) editorForm.innerHTML = "";
    toggleState = {};
    currentObjectId = null;
    currentEditorSource = null;
    editorFieldBindings = {};
    editorPhotos = [];
    editorPhotosMeta = { key: null, format: "array" };
    editorMainPhotoKey = null;
    editorMainPhotoUrl = "";
    hidePhotoMenu();
    setEditorStatus();
  };

  editorClose?.addEventListener("click", closeEditor);
  editorCancel?.addEventListener("click", closeEditor);
  editorModal?.addEventListener("click", (event) => {
    if (event.target === editorModal) closeEditor();
  });

  const closeSheet = () => {
    sheet?.classList.add("hidden");
    if (sheet?.dataset) delete sheet.dataset.objectId;
  };

  const openSheet = (objectId) => {
    if (!sheet) return;
    sheet.dataset.objectId = objectId;
    sheet.classList.remove("hidden");
  };

  sheetClose?.addEventListener("click", closeSheet);
  sheet?.addEventListener("click", (event) => {
    if (event.target === sheet) closeSheet();
  });

  sheet
    ?.querySelector(".sheet-actions")
    ?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      event.stopPropagation();
      const objectId = sheet.dataset.objectId;
      if (!objectId) return;
      if (button.dataset.action === "edit") {
        closeSheet();
        openEditor(objectId);
      } else if (button.dataset.action === "delete") {
        closeSheet();
        deleteListing(objectId);
      }
    });

  const buildFieldMarkup = (field, data) => {
    const binding = resolveFieldBinding(field, data);
    editorFieldBindings[field.key] = binding.key;
    const fallbackValue =
      binding.key === "deal_type" ? resolveDealType(data) : binding.key === "status" ? resolveStatus(data) : "";
    const rawValue = binding.value ?? fallbackValue ?? "";
    const formattedValue = formatEditorValue(rawValue, { stripCity: field.stripCity });
    const safeValue = escapeHtml(formattedValue ?? "");
    const baseLabel = `<label class="editor-field ${field.fullWidth ? "full" : ""}">
        <span>${field.label}</span>`;

    if (field.type === "textarea") {
      return `${baseLabel}
        <textarea name="${field.key}" data-binding="${binding.key}" class="editor-input" rows="4">${safeValue}</textarea>
      </label>`;
    }

    return `${baseLabel}
      <input type="${field.type}" name="${field.key}" data-binding="${binding.key}" class="editor-input" value="${safeValue}" />
    </label>`;
  };

const renderPhotoCards = () => {
    if (!editorPhotos.length) {
      return `<p class="editor-placeholder">Добавьте фото объекта</p>`;
    }
    return `
      <div class="editor-photo-grid">
        ${editorPhotos
          .map((url, index) => {
            const safeUrl = encodeURI(String(url));
            return `
              <div class="editor-photo-card" data-photo-index="${index}" draggable="true">
                <img src="${safeUrl}" alt="" loading="lazy" />
                ${
                  url === editorMainPhotoUrl
                    ? '<span class="editor-photo-badge">главное фото</span>'
                    : ""
                }
                <button type="button" class="photo-menu-btn" data-photo-index="${index}">⋯</button>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  };

  const renderPhotoSection = (data) => {
    const photosInfo = extractEditorPhotos(data);
    editorPhotosMeta = photosInfo;
    editorPhotos = [...photosInfo.urls];
    const mainBinding = resolveMainPhotoBinding(data);
    editorMainPhotoKey = mainBinding.key;
    editorMainPhotoUrl = mainBinding.value || editorPhotos[0] || "";
    return `
      <div class="editor-photo-section" data-editor-photos>
        <div class="editor-photo-wrapper">${renderPhotoCards()}</div>
        <div class="add-photo-row">
          <button type="button" class="add-photo-btn" data-action="add-photo-device">Добавить фото</button>
          <button type="button" class="add-photo-btn secondary" data-action="add-photo-link">По ссылке</button>
        </div>
      </div>
    `;
  };

  const refreshPhotoSection = () => {
    const wrapper = editorForm?.querySelector(".editor-photo-wrapper");
    if (!wrapper) return;
    wrapper.innerHTML = renderPhotoCards();
  };

  const pushPhoto = (url) => {
    if (!url) return;
    editorPhotos.push(url);
    editorMainPhotoUrl = editorMainPhotoUrl || editorPhotos[0];
    refreshPhotoSection();
  };

  const reorderPhotos = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= editorPhotos.length || toIndex >= editorPhotos.length) return;
    const [moved] = editorPhotos.splice(fromIndex, 1);
    editorPhotos.splice(toIndex, 0, moved);
    if (editorMainPhotoUrl && !editorPhotos.includes(editorMainPhotoUrl)) {
      editorMainPhotoUrl = editorPhotos[0] || "";
    }
    refreshPhotoSection();
  };

  const renderEditorForm = (data) => {
    if (!editorForm) return;
    toggleState = {};
    editorFieldBindings = {};
    currentEditorSource = data;

    const renderToggleBlock = (fields, modifier = "") => {
      const buttons = fields
        .map((field) => {
          const active = parseBoolean(data[field.key]);
          toggleState[field.key] = active;
          return `<button type="button" class="toggle-btn${modifier ? ` ${modifier}` : ""}${
            active ? " active" : ""
          }" data-toggle="${field.key}">
            ${field.label}
          </button>`;
        })
        .join("");
      return `<div class="editor-toggle-section">
        <div class="toggle-grid">
          ${buttons}
        </div>
      </div>`;
    };

    const buildGroupContent = (group) => {
      if (group.key === "photos") {
        return renderPhotoSection(data);
      }
      const fieldsHtml = group.fields.length
        ? group.fields.map((field) => buildFieldMarkup(field, data)).join("")
        : "";
      let togglesHtml = "";
      if (group.includeToggles) {
        togglesHtml = renderToggleBlock(TOGGLE_FIELDS);
      }
      if (group.includePriceToggles) {
        togglesHtml += renderToggleBlock(PRICE_TOGGLE_FIELDS, "price-toggle");
      }
      if (fieldsHtml || togglesHtml) {
        return fieldsHtml + togglesHtml;
      }
      return `<p class="editor-placeholder">${group.placeholder || "Настроим позже"}</p>`;
    };

    editorForm.innerHTML = EDITOR_GROUPS.map(
      (group, index) => `
        <details class="editor-accordion"${index === 0 ? " open" : ""}>
          <summary>${group.title}</summary>
          <div class="editor-accordion-body">
            ${buildGroupContent(group)}
          </div>
        </details>
      `
    ).join("");
  };

  editorForm?.addEventListener("click", (event) => {
    const toggleBtn = event.target.closest(".toggle-btn");
    if (toggleBtn && editorForm.contains(toggleBtn)) {
      event.preventDefault();
      toggleBtn.classList.toggle("active");
      toggleState[toggleBtn.dataset.toggle] = toggleBtn.classList.contains("active");
      return;
    }
    const addPhotoDeviceBtn = event.target.closest('[data-action="add-photo-device"]');
    if (addPhotoDeviceBtn) {
      event.preventDefault();
      photoFileInput?.click();
      return;
    }
    const addPhotoLinkBtn = event.target.closest('[data-action="add-photo-link"]');
    if (addPhotoLinkBtn) {
      event.preventDefault();
      const url = prompt("Введите ссылку на фото");
      if (url && url.startsWith("http")) {
        pushPhoto(url.trim());
      }
      return;
    }
    const menuBtn = event.target.closest(".photo-menu-btn");
    if (menuBtn) {
      event.preventDefault();
      const index = Number(menuBtn.dataset.photoIndex);
      openPhotoMenu(index, menuBtn);
    }
  });

  editorForm?.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".editor-photo-card");
    if (!card) return;
    dragPhotoIndex = Number(card.dataset.photoIndex);
    card.classList.add("dragging");
    event.dataTransfer?.setData("text/plain", String(dragPhotoIndex));
    event.dataTransfer?.setDragImage(card, card.offsetWidth / 2, card.offsetHeight / 2);
  });

  editorForm?.addEventListener("dragend", (event) => {
    const card = event.target.closest(".editor-photo-card");
    card?.classList.remove("dragging");
    dragPhotoIndex = null;
  });

  editorForm?.addEventListener("dragover", (event) => {
    if (dragPhotoIndex === null) return;
    const card = event.target.closest(".editor-photo-card");
    if (!card) return;
    event.preventDefault();
  });

  editorForm?.addEventListener("drop", (event) => {
    if (dragPhotoIndex === null) return;
    const card = event.target.closest(".editor-photo-card");
    if (!card) return;
    event.preventDefault();
    const toIndex = Number(card.dataset.photoIndex);
    reorderPhotos(dragPhotoIndex, toIndex);
    dragPhotoIndex = null;
  });

  photoFileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      pushPhoto(dataUrl);
    } catch (error) {
      alert(`Не удалось добавить фото: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  });

  const buildPayload = (formData) => {
    const payload = {};
    EDITOR_GROUPS.forEach((group) => {
      group.fields.forEach((field) => {
        const raw = formData.get(field.key);
        if (raw === null) return;
        const targetKey = editorFieldBindings[field.key] || field.key;
        payload[targetKey] = raw === "" ? null : raw;
      });
    });
    TOGGLE_FIELDS.forEach((field) => {
      payload[field.key] = Boolean(toggleState[field.key]);
    });
    PRICE_TOGGLE_FIELDS.forEach((field) => {
      payload[field.key] = Boolean(toggleState[field.key]);
    });
    const filteredPayload = {};
    const source = currentEditorSource || {};
    Object.keys(payload).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        filteredPayload[key] = payload[key];
      }
    });
    if (editorPhotosMeta.key) {
      const original = normalizePhotoValue(source[editorPhotosMeta.key]);
      if (JSON.stringify(original.urls) !== JSON.stringify(editorPhotos)) {
        filteredPayload[editorPhotosMeta.key] = serializeEditorPhotos(editorPhotosMeta, editorPhotos);
      }
    }
    if (editorMainPhotoKey) {
      if ((source?.[editorMainPhotoKey] || "") !== editorMainPhotoUrl) {
        filteredPayload[editorMainPhotoKey] = editorMainPhotoUrl;
      }
    }
    return filteredPayload;
  };

  editorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentObjectId) return;
    setEditorStatus("Сохраняем...");
    try {
      const formData = new FormData(editorForm);
      const payload = buildPayload(formData);
      if (!Object.keys(payload).length) {
        setEditorStatus("Нет изменений для сохранения", "warn");
        return;
      }
      const response = await fetch(`/api/objects/${encodeURIComponent(currentObjectId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const updated = await response.json();
      const index = listingsCache.findIndex((item) => String(item.id) === String(currentObjectId));
      if (index !== -1) {
        listingsCache[index] = {
          ...listingsCache[index],
          raw: updated,
          meta: {
            status: resolveStatus(updated),
            dealType: resolveDealType(updated),
          },
        };
      }
      setEditorStatus("Сохранено", "success");
      render();
    } catch (error) {
      setEditorStatus(`Ошибка: ${error.message}`, "error");
    }
  });

  const openEditor = (objectId) => {
    const item = listingsCache.find((entry) => String(entry.id) === String(objectId));
    if (!item || !editorModal) return;
    currentObjectId = objectId;
    const data = { ...item.raw };
    renderEditorForm(data);
    if (editorTitle) {
      editorTitle.textContent = "Редактирование";
    }
    editorModal.classList.remove("hidden");
    setEditorStatus();
  };

  const deleteListing = async (objectId) => {
    if (!objectId) return;
    if (!confirm("Удалить объявление?")) return;
    try {
      const response = await fetch(`/api/objects/${encodeURIComponent(objectId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      listingsCache = listingsCache.filter((item) => String(item.id) !== String(objectId));
      render();
      alert("Объявление удалено");
    } catch (error) {
      alert(`Не удалось удалить: ${error.message}`);
    }
  };

  const renderCard = (item) => {
    const obj = item.raw || {};
    const status = item.meta?.status || "active";
    const statusLabel = STATUS_LABELS[status];
    const title = obj.title || obj.address || obj.full_address || `Объект #${item.id}`;
    const address = shortAddress(obj.full_address || obj.address || obj.location || "");
    const rooms = obj.rooms ? `${obj.rooms} комн.` : "";
    const area = obj.total_area ? `${obj.total_area} м²` : "";
    const floor =
      obj.floor !== undefined
        ? obj.floors
          ? `${obj.floor}/${obj.floors} этаж`
          : `${obj.floor} этаж`
        : "";
    const summaryLine = [rooms, area, floor].filter(Boolean).join(" · ");
    const photo = getPhoto(obj);
    const safePhoto = photo ? encodeURI(photo).replace(/'/g, "%27") : "";
    const thumbClass = `listing-thumb${photo ? "" : " fallback"}`;
    const thumbStyle = photo ? `style="background-image:url('${safePhoto}')"` : "";
    const idLabel = item.id ? `<span class="listing-id">ID ${escapeHtml(item.id)}</span>` : "";

    return `
      <article class="listing-card status-${status}" data-id="${item.id}">
        <button class="listing-menu-btn listing-menu-btn--right" data-id="${item.id}" aria-label="Меню">⋯</button>
        <div class="${thumbClass}" ${thumbStyle}>${photo ? "" : "<span>Фото</span>"}</div>
        <div class="listing-summary">
          <div class="listing-summary-head">
            <div class="listing-summary-price">
              <h3>${formatPrice(obj.price || obj.price_total || obj.price_rub)}</h3>
              ${idLabel}
            </div>
            ${statusLabel ? `<span class="listing-status-badge">${statusLabel}</span>` : ""}
          </div>
          <p class="listing-address">${escapeHtml(address || "Адрес уточняется")}</p>
          ${summaryLine ? `<div class="listing-meta-line">${summaryLine}</div>` : ""}
        </div>
      </article>
    `;
  };

  let currentFilter = "published";

  const render = () => {
    const filtered = listingsCache.filter((item) => {
      const status = item.meta?.status || "active";
      if (currentFilter === "published") return status === "active";
      if (currentFilter === "rejected") return status === "rejected";
      return status !== "active" && status !== "rejected";
    }).filter(matchesSearch);

    if (!filtered.length) {
      container.innerHTML = searchQuery
        ? '<div class="empty-state">Ничего не найдено</div>'
        : '<div class="empty-state">Здесь пока пусто</div>';
      return;
    }

    container.innerHTML = filtered.map((item) => renderCard(item)).join("");

    container.querySelectorAll(".listing-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest(".listing-menu-btn")) return;
        window.openDetail?.(card.dataset.id);
      });
    });

    container.querySelectorAll(".listing-menu-btn").forEach((btn) =>
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        openSheet(btn.dataset.id);
      })
    );
  };

let cianStatusMap = {};

const syncCianStatuses = async () => {
  try {
    const response = await fetch("/api/cian/order-report");
    if (!response.ok) return;
    const data = await response.json();
    const offers = data.result?.offers || [];
    const map = {};
    offers.forEach((offer) => {
      const id = String(offer.externalId || offer.offerId || "");
      if (!id) return;
      const mapped = mapCianStatus(offer.status);
      if (mapped) {
        map[id] = mapped;
      }
    });
    cianStatusMap = map;
    if (!Object.keys(map).length) return;
    listingsCache = listingsCache.map((item) => {
      const override = map[String(item.id)];
      if (!override) return item;
      return {
        ...item,
        meta: {
          ...item.meta,
          status: override,
        },
      };
    });
    render();
  } catch (error) {
    console.warn("Не удалось синхронизировать статусы ЦИАН", error);
  }
};

const fetchListings = async () => {
  try {
    const response = await fetch("/api/objects?limit=200");
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    listingsCache = (data.items || []).map((item) => {
      const obj = item.raw || {};
      const cianStatus =
        mapCianStatus(
          obj.cian_status ||
            obj.cianStatus ||
            obj.status_cian ||
            obj.statusCian ||
            obj.cian_state
        ) || resolveStatus(obj);
      return {
        ...item,
        meta: {
          status: cianStatus,
          dealType: resolveDealType(obj),
        },
      };
    });
    render();
    if (pendingAutoEdit) {
      const exists = listingsCache.find((item) => String(item.id) === String(pendingAutoEdit));
      if (exists) {
        setTimeout(() => openEditor(pendingAutoEdit), 250);
        pendingAutoEdit = null;
      }
    }
    syncCianStatuses();
  } catch (error) {
    container.innerHTML = `<div class="empty-state error">Ошибка загрузки: ${error.message}</div>`;
  }
};

  searchInput?.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    render();
  });

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((btn) => btn.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      render();
    });
  });

  const init = () => {
    if (initialSearch && searchInput) {
      searchInput.value = initialSearch;
      searchQuery = initialSearch.trim().toLowerCase();
    }
    fetchListings();
  };

  init();
}
  photoMenu?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-photo-action]");
    if (!actionBtn) return;
    const action = actionBtn.dataset.photoAction;
    if (action === "close") {
      hidePhotoMenu();
      return;
    }
    const index = photoMenuState.index ?? -1;
    if (index < 0 || index >= editorPhotos.length) {
      hidePhotoMenu();
      return;
    }
    if (action === "main") {
      const [selected] = editorPhotos.splice(index, 1);
      if (selected) {
        editorPhotos.unshift(selected);
        editorMainPhotoUrl = editorPhotos[0];
      }
      hidePhotoMenu();
      refreshPhotoSection();
      return;
    }
    if (action === "delete") {
      editorPhotos.splice(index, 1);
      if (editorMainPhotoUrl && !editorPhotos.includes(editorMainPhotoUrl)) {
        editorMainPhotoUrl = editorPhotos[0] || "";
      }
      hidePhotoMenu();
      refreshPhotoSection();
    }
  });

  document.addEventListener("click", (event) => {
    if (!photoMenu || photoMenu.classList.contains("hidden")) return;
    if (photoMenu.contains(event.target)) return;
    if (photoMenuState.anchor?.contains(event.target)) return;
    hidePhotoMenu();
  });
