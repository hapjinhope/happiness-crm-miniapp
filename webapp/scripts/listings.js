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
        widget: "segmented",
        options: [
          { label: "Квартира", value: "Квартира", match: ["kvart", "flat"] },
          { label: "Апартаменты", value: "Апартаменты", match: ["apart"] },
        ],
      },
    ],
  },
  {
    key: "params",
    title: "Параметры квартиры",
    fields: [
      {
        key: "rooms",
        label: "Комнат",
        type: "number",
        widget: "segmented",
        options: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "4", value: "4" },
          { label: "5", value: "5" },
          { label: "6+", value: "6" },
        ],
      },
      { key: "total_area", label: "Общая площадь", type: "number", prefillKeys: ["area", "square_total"] },
      { key: "living_area", label: "Жилая", type: "number", prefillKeys: ["square_living"] },
      { key: "kitchen_area", label: "Кухня", type: "number", prefillKeys: ["square_kitchen"] },
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
      {
        key: "balconies",
        label: "Балконы",
        type: "number",
        prefillKeys: ["balcony", "balconies_count"],
        widget: "counter",
      },
      {
        key: "loggias",
        label: "Лоджии",
        type: "number",
        prefillKeys: ["loggias", "loggia_count"],
        widget: "counter",
      },
      {
        key: "bathroom_type",
        label: "Санузлы",
        type: "text",
        prefillKeys: ["bathroom", "bathrooms", "bathroom_count", "bathroom_combined"],
        widget: "bathroom-counter",
      },
      {
        key: "lifts",
        label: "Лифты",
        type: "text",
        prefillKeys: ["elevator", "elevators", "lifts"],
        widget: "dual-counter",
      },
      {
        key: "parking",
        label: "Парковка",
        type: "text",
        prefillKeys: ["parking_type"],
        widget: "segmented",
        options: [
          { label: "Подземная", value: "подземная", match: ["underground", "подзем"] },
          { label: "Наземная", value: "наземная", match: ["ground", "назем"] },
        ],
      },
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
      { key: "prepayment", label: "Предоплата", type: "text", prefillKeys: ["advance_payment"] },
      { key: "deposit", label: "Залог", type: "number" },
      { key: "commission", label: "Комиссия", type: "text", prefillKeys: ["agent_fee"] },
    ],
    includePriceToggles: true,
  },
];

const TOGGLE_SECTIONS = [
  {
    title: "Мебель",
    fields: [
      { key: "furniture", label: "Мебель" },
      { key: "kitchenfurniture", label: "Мебель на кухне" },
    ],
  },
  {
    title: "Техника",
    fields: [
      { key: "fridge", label: "Холодильник" },
      { key: "washer", label: "Стиральная машина" },
      { key: "dishwasher", label: "Посудомойка" },
      { key: "conditioner", label: "Кондиционер" },
      { key: "tv", label: "Телевизор" },
    ],
  },
  {
    title: "Ванная комната",
    fields: [
      { key: "bathtub", label: "Ванна" },
      { key: "shower", label: "Душ" },
    ],
  },
];

const ALL_TOGGLE_FIELDS = TOGGLE_SECTIONS.flatMap((section) => section.fields);

const PRICE_TOGGLE_FIELDS = [
  { key: "pets", label: "Можно с животными" },
  { key: "children", label: "Можно с детьми" },
];

const ADDRESS_LOCK_KEYS = ["created_at", "createdAt", "created", "createdat"];
const ADDRESS_LOCK_DELAY_MS = 48 * 60 * 60 * 1000;

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
  const cleaned = value.replace(/^(г\.?\s*)?Москва,?\s*/i, "").replace(/^Moscow,?\s*/i, "").trim();
  const reduced = shortAddress(cleaned);
  return reduced === "—" ? cleaned : reduced;
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

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const parseNumericValue = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseLiftCounts = (value) => {
  const counts = { passenger: 1, cargo: 1 };
  if (value === null || value === undefined) {
    return counts;
  }
  const text = normalizeText(value);
  const passengerMatch = text.match(/пассаж[^\d]*(\d+)/);
  const cargoMatch = text.match(/груз[^\d]*(\d+)/);
  if (passengerMatch) counts.passenger = Number(passengerMatch[1]);
  if (cargoMatch) counts.cargo = Number(cargoMatch[1]);
  if (!passengerMatch && !cargoMatch) {
    const digits = text.match(/(\d+)/g);
    if (digits && digits.length) {
      counts.passenger = Number(digits[0]);
      if (digits[1]) counts.cargo = Number(digits[1]);
    }
  }
  counts.passenger = Number.isFinite(counts.passenger) && counts.passenger >= 0 ? counts.passenger : 1;
  counts.cargo = Number.isFinite(counts.cargo) && counts.cargo >= 0 ? counts.cargo : 1;
  return counts;
};

const formatLiftState = ({ passenger, cargo }) => `Пассажирский: ${passenger} · Грузовой: ${cargo}`;

const parseBathroomCounts = (value) => {
  const counts = { combined: 0, separate: 0 };
  if (value === null || value === undefined) return counts;
  const text = normalizeText(value);
  const combinedMatch = text.match(/совмещ[^\d]*(\d+)/);
  const separateMatch = text.match(/раздель[^\d]*(\d+)/);
  if (combinedMatch) counts.combined = Number(combinedMatch[1]);
  if (separateMatch) counts.separate = Number(separateMatch[1]);
  if (!combinedMatch && !separateMatch) {
    const digits = text.match(/(\d+)/g);
    if (digits && digits.length) {
      counts.combined = Number(digits[0]);
      if (digits[1]) counts.separate = Number(digits[1]);
    }
  }
  counts.combined = Number.isFinite(counts.combined) ? counts.combined : 0;
  counts.separate = Number.isFinite(counts.separate) ? counts.separate : 0;
  return counts;
};

const formatBathroomState = ({ combined, separate }) =>
  `Совмещенный: ${combined} · Раздельный: ${separate}`;

const extractCreatedAt = (data = {}) => {
  for (const key of ADDRESS_LOCK_KEYS) {
    if (data[key]) return data[key];
  }
  return null;
};

const shouldLockField = (fieldKey, data = {}) => {
  if (fieldKey !== "address") return false;
  const timestamp = extractCreatedAt(data);
  if (!timestamp) return false;
  const createdDate = new Date(timestamp);
  if (Number.isNaN(createdDate.getTime())) return false;
  return Date.now() - createdDate.getTime() >= ADDRESS_LOCK_DELAY_MS;
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

const MAIN_PHOTO_INDEX_FIELDS = [
  "main_photo_index",
  "mainPhotoIndex",
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
  let fallback = null;
  for (const field of PHOTO_COLLECTION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
    const parsed = normalizePhotoValue(data[field]);
    const current = { key: field, urls: parsed.urls, format: parsed.format };
    if (!fallback) fallback = current;
    if (parsed.urls.length) {
      return current;
    }
  }
  return fallback || { key: "photos_json", urls: [], format: "array" };
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

const resolveMainPhotoIndexBinding = (data = {}) => {
  for (const field of MAIN_PHOTO_INDEX_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      return { key: field, value: data[field] };
    }
  }
  return { key: null, value: null };
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatPrice = (value) => {
  if (!value) return "—";
  return new Intl.NumberFormat("ru-RU").format(Number(value)) + " ₽";
};

const hasCianIdentifier = (value) => {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toUpperCase();
  return Boolean(normalized && normalized !== "EMPTY" && normalized !== "NULL");
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
  const editorModal = document.getElementById("editorModal");
  const editorForm = document.getElementById("editorForm");
  const editorTitle = document.getElementById("editorTitle");
  const editorStatus = document.getElementById("editorStatus");
  const editorClose = document.getElementById("editorClose");
  const editorCancel = document.getElementById("editorCancel");
  const photoFileInput = document.getElementById("photoFileInput");
  const deleteModal = document.getElementById("deleteModal");
  const deleteModalTitle = document.getElementById("deleteModalTitle");
  const deleteModalStatus = document.getElementById("deleteModalStatus");
  const deleteModalClose = document.getElementById("deleteModalClose");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
  const deleteRelistBtn = document.getElementById("deleteRelistBtn");
  const deleteConfirmPanel = document.getElementById("deleteConfirmPanel");
  const deleteOptionsPanel = document.getElementById("deleteOptions");
  const deleteConfirmText = document.getElementById("deleteConfirmText");
  const deleteConfirmYes = document.getElementById("deleteConfirmYes");
  const deleteConfirmNo = document.getElementById("deleteConfirmNo");
  const cardMenu = document.getElementById("cardMenu");

  let listingsCache = [];
  let searchQuery = "";
  let toggleState = {};
  let bathroomState = {};
  let segmentedState = {};
  let counterState = {};
  let liftState = {};
  let currentEditorSource = null;
  let currentObjectId = null;
  let editorFieldBindings = {};
  let editorPhotos = [];
  let editorPhotosMeta = { key: null, format: "array" };
  let editorMainPhotoKey = null;
  let editorMainPhotoUrl = "";
  let editorMainPhotoIndexKey = null;
  let editorMainPhotoIndexValue = null;
  const photoMenu = document.getElementById("photoMenu");
  let photoMenuState = { index: null, anchor: null };
  let cardMenuState = { objectId: null };
  let dragPhotoIndex = null;
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get("search") || urlParams.get("q") || "";
  let pendingAutoEdit = urlParams.get("edit");
  let pendingDeleteId = null;
  let pendingActionMode = null;

  const getPhoto = (obj = {}) => resolvePhoto(obj) || resolvePhoto(obj.raw || {}) || PHOTO_PLACEHOLDER;

  const resolveObjectId = (item) => {
    if (item === null || item === undefined) return "";
    if (typeof item === "string" || typeof item === "number") return String(item);
    const raw = item.raw || item;
    const value =
      item.id ??
      raw.external_id ??
      raw.externalId ??
      raw.object_id ??
      raw.objectId ??
      raw.id ??
      "";
    if (value === undefined || value === null) return "";
    return String(value).trim();
  };

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
    const identifier = resolveObjectId(item);
    const haystack = `${identifier} ${obj.full_address || ""} ${obj.address || ""} ${
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
    const idDigits = resolveObjectId(item).replace(/\D/g, "");
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
    bathroomState = {};
    segmentedState = {};
    counterState = {};
    liftState = {};
    currentObjectId = null;
    currentEditorSource = null;
    editorFieldBindings = {};
    editorPhotos = [];
    editorPhotosMeta = { key: null, format: "array" };
    editorMainPhotoKey = null;
    editorMainPhotoUrl = "";
    editorMainPhotoIndexKey = null;
    editorMainPhotoIndexValue = null;
    hidePhotoMenu();
    closeCardMenu();
    setEditorStatus();
  };

  editorClose?.addEventListener("click", closeEditor);
  editorCancel?.addEventListener("click", closeEditor);
  editorModal?.addEventListener("click", (event) => {
    if (event.target === editorModal) closeEditor();
  });

  const closeCardMenu = () => {
    if (!cardMenu) return;
    cardMenu.classList.add("hidden");
    cardMenuState = { objectId: null };
  };

  const openCardMenu = (objectId, anchor) => {
    if (!cardMenu || !anchor) return;
    closeCardMenu();
    cardMenuState = { objectId };
    const rect = anchor.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 180, Math.max(12, rect.right - 160));
    cardMenu.style.top = `${rect.bottom + 8}px`;
    cardMenu.style.left = `${left}px`;
    cardMenu.classList.remove("hidden");
  };

  cardMenu?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-card-action]");
    if (!actionBtn || !cardMenuState.objectId) return;
    event.preventDefault();
    const objectId = cardMenuState.objectId;
    if (actionBtn.dataset.cardAction === "edit") {
      closeCardMenu();
      openEditor(objectId);
    } else if (actionBtn.dataset.cardAction === "delete") {
      closeCardMenu();
      openDeleteModal(objectId);
    }
  });

  document.addEventListener("click", (event) => {
    if (!cardMenu || cardMenu.classList.contains("hidden")) return;
    if (!cardMenu.contains(event.target)) {
      closeCardMenu();
    }
  });
  window.addEventListener("scroll", closeCardMenu, true);
  window.addEventListener("resize", closeCardMenu);

  const buildFieldMarkup = (field, data, options = {}) => {
    const isLocked = Boolean(field.locked || shouldLockField(field.key, data));
    const binding = resolveFieldBinding(field, data);
    editorFieldBindings[field.key] = binding.key;
    const fallbackValue =
      binding.key === "deal_type" ? resolveDealType(data) : binding.key === "status" ? resolveStatus(data) : "";
    const rawValue = binding.value ?? fallbackValue ?? "";
    const formattedValue = formatEditorValue(rawValue, { stripCity: field.stripCity });
    const safeValue = escapeHtml(formattedValue ?? "");
    const labelClasses = [
      "editor-field",
      field.fullWidth ? "full" : "",
      isLocked ? "locked" : "",
      field.widget === "counter" ? "has-counter" : "",
      field.widget === "bathroom-counter" ? "bathroom-field" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const lockIcon = isLocked ? '<span class="field-lock-icon" aria-hidden="true">🔒</span>' : "";
    const labelStart = `<label class="${labelClasses}" data-field="${field.key}">${
      options.hideLabel ? `<span class="sr-only">${field.label}</span>` : `<span>${field.label}</span>`
    }`;
    const labelEnd = `${lockIcon}</label>`;
    const hiddenInput = (value) =>
      `<input type="hidden" name="${field.key}" data-binding="${binding.key}" value="${escapeHtml(value ?? "")}" />`;

    if (field.widget === "segmented" && Array.isArray(field.options) && field.options.length) {
      const matchOption = (value) => {
        const normalized = normalizeText(value);
        if (!normalized) return null;
        return field.options.find((option) => {
          if (normalizeText(option.value) === normalized || normalizeText(option.label) === normalized) {
            return true;
          }
          if (Array.isArray(option.match)) {
            return option.match.some((token) => normalized.includes(token));
          }
          return false;
        });
      };
      const initialOption =
        matchOption(rawValue) || matchOption(formattedValue) || field.options[0] || { value: "" };
      const currentValue = initialOption.value ?? "";
      segmentedState[field.key] = currentValue;
      if (isLocked) {
        const displayLabel = initialOption.label || formattedValue || currentValue || "—";
        return `${labelStart}
          <div class="locked-value">${escapeHtml(displayLabel)}</div>
          ${hiddenInput(currentValue)}
        ${labelEnd}`;
      }
      const buttons = field.options
        .map((option) => {
          const active = option.value === currentValue;
          return `<button type="button" class="segment-btn${active ? " active" : ""}" data-segment="${
            field.key
          }" data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`;
        })
        .join("");
      return `${labelStart}
        <div class="segment-control" data-segment="${field.key}">
          ${buttons}
        </div>
        ${hiddenInput(currentValue)}
        ${labelEnd}`;
    }

    if (field.widget === "counter") {
      const numericValue = parseNumericValue(rawValue, 0);
      counterState[field.key] = numericValue;
      if (isLocked) {
        return `${labelStart}
          <div class="locked-value">${numericValue}</div>
          ${hiddenInput(numericValue)}
        ${labelEnd}`;
      }
      return `${labelStart}
        <div class="counter-field" data-counter="${field.key}">
          <button type="button" class="counter-btn" data-counter-action="decrease" aria-label="Уменьшить количество">−</button>
          <span class="counter-value" data-counter-value>${numericValue}</span>
          <button type="button" class="counter-btn" data-counter-action="increase" aria-label="Увеличить количество">+</button>
        </div>
        ${hiddenInput(numericValue)}
        ${labelEnd}`;
    }

    if (field.widget === "dual-counter") {
      const lifts = parseLiftCounts(rawValue);
      liftState[field.key] = lifts;
      const renderLiftBlock = (type, label) => `
        <div class="lift-counter" data-lift-type="${type}">
          <span>${label}</span>
          <div class="counter-field">
            <button type="button" class="counter-btn" data-counter-action="decrease" aria-label="Минус">−</button>
            <span class="counter-value" data-counter-value>${lifts[type]}</span>
            <button type="button" class="counter-btn" data-counter-action="increase" aria-label="Плюс">+</button>
          </div>
        </div>`;
      if (isLocked) {
        return `${labelStart}
          <div class="locked-value">
            <span>Пассажирский: ${lifts.passenger}</span>
            <span>Грузовой: ${lifts.cargo}</span>
          </div>
          ${hiddenInput(formatLiftState(lifts))}
        ${labelEnd}`;
      }
      return `${labelStart}
        <div class="dual-counter" data-lifts-key="${field.key}">
          ${renderLiftBlock("passenger", "Пассажирский")}
          ${renderLiftBlock("cargo", "Грузовой")}
        </div>
        ${hiddenInput(formatLiftState(lifts))}
        ${labelEnd}`;
    }
    if (field.widget === "bathroom-counter") {
      const counts = parseBathroomCounts(rawValue);
      bathroomState[field.key] = counts;
      const renderBathroomBlock = (type, title) => `
        <div class="bathroom-counter" data-bathroom-type="${type}">
          <div class="bathroom-counter-title">${title}</div>
          <div class="counter-field">
            <button type="button" class="counter-btn" data-counter-action="decrease" aria-label="Минус">−</button>
            <span class="counter-value" data-counter-value>${counts[type]}</span>
            <button type="button" class="counter-btn" data-counter-action="increase" aria-label="Плюс">+</button>
          </div>
        </div>`;
      return `${labelStart}
        <div class="bathroom-grid" data-bathroom-key="${field.key}">
          ${renderBathroomBlock("combined", "Совмещенный")}
          ${renderBathroomBlock("separate", "Раздельный")}
        </div>
        ${hiddenInput(formatBathroomState(counts))}
        ${labelEnd}`;
    }

    if (field.type === "textarea") {
      const lockAttrs = isLocked ? ' readonly aria-disabled="true"' : "";
      return `${labelStart}
        <textarea name="${field.key}" data-binding="${binding.key}" class="editor-input" rows="4"${lockAttrs}>${safeValue}</textarea>
        ${isLocked ? hiddenInput(rawValue) : ""}
        ${labelEnd}`;
    }

    const lockAttrs = isLocked ? ' readonly aria-disabled="true"' : "";
    return `${labelStart}
      <input type="${field.type}" name="${field.key}" data-binding="${binding.key}" class="editor-input" value="${safeValue}"${lockAttrs} />
      ${isLocked ? hiddenInput(rawValue) : ""}
      ${labelEnd}`;
  };

const renderPhotoCards = () => {
    if (!editorPhotos.length) {
      return `<p class="editor-placeholder">Добавьте фото объекта</p>`;
    }
    return `
      <div class="editor-photo-grid">
        ${editorPhotos
          .map((url, index) => {
            const safeUrl = escapeHtml(String(url));
            return `
              <div class="editor-photo-card" data-photo-index="${index}" draggable="true">
                <img src="${safeUrl}" alt="" loading="lazy" />
                ${
                  url === editorMainPhotoUrl
                    ? '<span class="editor-photo-badge">ГЛАВНОЕ ФОТО</span>'
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
    const mainIndexBinding = resolveMainPhotoIndexBinding(data);
    editorMainPhotoIndexKey = mainIndexBinding.key;
    editorMainPhotoIndexValue = mainIndexBinding.value || (editorPhotos.length ? 1 : null);
    return `
      <div class="editor-photo-section" data-editor-photos>
        <div class="editor-photo-wrapper">${renderPhotoCards()}</div>
        <div class="add-photo-row">
          <button type="button" class="add-photo-btn full" data-action="add-photo-device">Добавить фото</button>
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
      editorMainPhotoIndexValue = editorMainPhotoUrl ? 1 : null;
    } else {
      const newIndex = editorPhotos.indexOf(editorMainPhotoUrl);
      if (newIndex !== -1) {
        editorMainPhotoIndexValue = newIndex + 1;
      }
    }
    refreshPhotoSection();
  };

  const renderEditorForm = (data) => {
    if (!editorForm) return;
    toggleState = {};
    bathroomState = {};
    segmentedState = {};
    counterState = {};
    liftState = {};
    editorFieldBindings = {};
    currentEditorSource = data;

    const buildToggleButtons = (fields, modifier = "") =>
      fields
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

    const renderToggleSection = (section, modifier = "") => {
      const buttons = buildToggleButtons(section.fields, modifier);
      return `<div class="editor-toggle-section">
        <div class="toggle-section-title">${section.title}</div>
        <div class="toggle-grid">
          ${buttons}
        </div>
      </div>`;
    };

    const buildGroupContent = (group) => {
      if (group.key === "photos") {
        return renderPhotoSection(data);
      }
      const fieldLookup = group.fields.reduce((acc, field) => {
        acc[field.key] = field;
        return acc;
      }, {});
    const renderFieldByKey = (key, options = {}) =>
      fieldLookup[key] ? buildFieldMarkup(fieldLookup[key], data, options) : "";
    if (group.key === "features") {
        const clusters = [
          {
            title: "Балконы",
            rows: [
              { key: "balconies", label: "Балконы" },
              { key: "loggias", label: "Лоджии" },
            ],
          },
          {
            title: "Санузлы",
            rows: [{ key: "bathroom_type", label: "Санузлы" }],
          },
          {
            title: "Лифты",
            rows: [{ key: "lifts", label: "Лифты" }],
          },
        ]
          .map((cluster) => {
            const rows = cluster.rows
              .map((row) => {
                const fieldMarkup = renderFieldByKey(row.key, { hideLabel: true });
                if (!fieldMarkup) return "";
                return `<div class="cluster-row">
                  <span class="cluster-label">${row.label}</span>
                  ${fieldMarkup}
                </div>`;
              })
              .join("");
            if (!rows.trim()) return "";
            return `<div class="feature-cluster">
              <div class="feature-cluster-title">${cluster.title}</div>
              <div class="feature-cluster-body">${rows}</div>
            </div>`;
          })
          .join("");
        const remaining = group.fields
          .filter((field) => !["balconies", "loggias", "bathroom_type", "lifts"].includes(field.key))
          .map((field) => buildFieldMarkup(field, data))
          .join("");
        return clusters + remaining;
      }
      const fieldsHtml = group.fields.length
        ? group.fields.map((field) => buildFieldMarkup(field, data)).join("")
        : "";
      let togglesHtml = "";
      if (group.includeToggles) {
        togglesHtml = TOGGLE_SECTIONS.map((section) => renderToggleSection(section)).join("");
      }
      if (group.includePriceToggles) {
        togglesHtml += `<div class="editor-toggle-section">
          <div class="toggle-grid">
            ${buildToggleButtons(PRICE_TOGGLE_FIELDS, "price-toggle")}
          </div>
        </div>`;
      }
      if (fieldsHtml || togglesHtml) {
        return fieldsHtml + togglesHtml;
      }
      return `<p class="editor-placeholder">${group.placeholder || "Настроим позже"}</p>`;
    };

    editorForm.innerHTML = EDITOR_GROUPS.map(
      (group) => `
        <section class="editor-section" data-section="${group.key}">
          <button type="button" class="editor-section-title">${group.title.toUpperCase()}</button>
          <div class="editor-section-body">
            ${buildGroupContent(group)}
          </div>
        </section>
      `
    ).join("");

    const sections = editorForm.querySelectorAll(".editor-section");
    sections.forEach((section) => {
      const titleBtn = section.querySelector(".editor-section-title");
      titleBtn?.addEventListener("click", () => {
        const alreadyActive = section.classList.contains("active");
        sections.forEach((block) => block.classList.remove("active"));
        if (!alreadyActive) {
          section.classList.add("active");
        }
      });
    });
  };

  editorForm?.addEventListener("click", (event) => {
    const toggleBtn = event.target.closest(".toggle-btn");
    if (toggleBtn && editorForm.contains(toggleBtn)) {
      if (toggleBtn.closest(".editor-field")?.classList.contains("locked")) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      toggleBtn.classList.toggle("active");
      toggleState[toggleBtn.dataset.toggle] = toggleBtn.classList.contains("active");
      return;
    }
    const segmentBtn = event.target.closest(".segment-btn");
    if (segmentBtn && editorForm.contains(segmentBtn)) {
      if (segmentBtn.closest(".editor-field")?.classList.contains("locked")) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const key = segmentBtn.dataset.segment;
      if (!key) return;
      const control = segmentBtn.closest(".segment-control");
      control
        ?.querySelectorAll(".segment-btn")
        .forEach((btn) => btn.classList.toggle("active", btn === segmentBtn));
      const value = segmentBtn.dataset.value ?? "";
      const hiddenInput = editorForm.querySelector(`input[name="${key}"]`);
      if (hiddenInput) hiddenInput.value = value;
      segmentedState[key] = value;
      return;
    }
    const counterBtn = event.target.closest(".counter-btn");
    if (counterBtn && editorForm.contains(counterBtn)) {
      if (counterBtn.closest(".editor-field")?.classList.contains("locked")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const action = counterBtn.dataset.counterAction;
      if (!action) return;
      const liftsWrapper = counterBtn.closest("[data-lifts-key]");
      if (liftsWrapper) {
        const fieldKey = liftsWrapper.dataset.liftsKey;
        const type = counterBtn.closest("[data-lift-type]")?.dataset.liftType;
        if (!fieldKey || !type) return;
        const state = liftState[fieldKey] ? { ...liftState[fieldKey] } : { passenger: 1, cargo: 1 };
        const currentValue = Number(state[type]) || 0;
        const nextValue = action === "increase" ? currentValue + 1 : Math.max(0, currentValue - 1);
        state[type] = nextValue;
        liftState[fieldKey] = state;
        const liftValueEl = counterBtn.closest(".counter-field")?.querySelector("[data-counter-value]");
        if (liftValueEl) liftValueEl.textContent = nextValue;
        const hiddenInput = editorForm.querySelector(`input[name="${fieldKey}"]`);
        if (hiddenInput) hiddenInput.value = formatLiftState(state);
        return;
      }
      const bathroomWrapper = counterBtn.closest("[data-bathroom-key]");
      if (bathroomWrapper) {
        const fieldKey = bathroomWrapper.dataset.bathroomKey;
        const type = counterBtn.closest("[data-bathroom-type]")?.dataset.bathroomType;
        if (!fieldKey || !type) return;
        const state = { ...(bathroomState[fieldKey] || { combined: 0, separate: 0 }) };
        const currentValue = Number(state[type]) || 0;
        const nextValue = action === "increase" ? currentValue + 1 : Math.max(0, currentValue - 1);
        state[type] = nextValue;
        bathroomState[fieldKey] = state;
        const valueEl = counterBtn.closest(".counter-field")?.querySelector("[data-counter-value]");
        if (valueEl) valueEl.textContent = nextValue;
        const hiddenInput = editorForm.querySelector(`input[name="${fieldKey}"]`);
        if (hiddenInput) hiddenInput.value = formatBathroomState(state);
        return;
      }
      const wrapper = counterBtn.closest("[data-counter]");
      if (wrapper) {
        const key = wrapper.dataset.counter;
        if (!key) return;
        const valueEl = wrapper.querySelector("[data-counter-value]");
        let value = Number(valueEl?.textContent ?? "0");
        if (!Number.isFinite(value)) value = 0;
        value = action === "increase" ? value + 1 : Math.max(0, value - 1);
        if (valueEl) valueEl.textContent = value;
        const hiddenInput = editorForm.querySelector(`input[name="${key}"]`);
        if (hiddenInput) hiddenInput.value = value;
        counterState[key] = value;
        return;
      }
    }
    const addPhotoDeviceBtn = event.target.closest('[data-action="add-photo-device"]');
    if (addPhotoDeviceBtn) {
      event.preventDefault();
      photoFileInput?.click();
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
    ALL_TOGGLE_FIELDS.forEach((field) => {
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
    if (editorMainPhotoIndexKey) {
      const prev = source?.[editorMainPhotoIndexKey];
      if (
        editorMainPhotoIndexValue !== null &&
        (prev === undefined || Number(prev) !== Number(editorMainPhotoIndexValue))
      ) {
        filteredPayload[editorMainPhotoIndexKey] = editorMainPhotoIndexValue;
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
      const index = listingsCache.findIndex(
        (item) => resolveObjectId(item) === String(currentObjectId)
      );
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
    const item = listingsCache.find((entry) => resolveObjectId(entry) === String(objectId));
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

  const deleteListing = async (objectId, mode = "delete") => {
    if (!objectId) return;
    const response = await fetch(
      `/api/objects/${encodeURIComponent(objectId)}?mode=${encodeURIComponent(mode)}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    listingsCache = listingsCache.filter((item) => resolveObjectId(item) !== String(objectId));
    render();
  };

  const setDeleteStatus = (message = "") => {
    if (deleteModalStatus) {
      deleteModalStatus.textContent = message;
    }
  };

  const toggleDeleteButtons = (disabled) => {
    [deleteConfirmBtn, deleteRelistBtn, deleteConfirmYes, deleteConfirmNo].forEach((btn) => {
      if (btn) btn.disabled = disabled;
    });
  };

  const resetDeleteConfirm = () => {
    pendingActionMode = null;
    deleteConfirmPanel?.classList.add("hidden");
    deleteOptionsPanel?.classList.remove("hidden");
  };

  const closeDeleteModal = () => {
    deleteModal?.classList.add("hidden");
    pendingDeleteId = null;
    setDeleteStatus();
    toggleDeleteButtons(false);
    resetDeleteConfirm();
  };

  const openDeleteModal = (objectId) => {
    pendingDeleteId = objectId;
    if (deleteModalTitle) deleteModalTitle.textContent = `Объявление #${objectId}`;
    setDeleteStatus();
    deleteModal?.classList.remove("hidden");
  };

  const performDeleteAction = async (mode) => {
    if (!pendingDeleteId) return;
    setDeleteStatus("Выполняем действие...");
    toggleDeleteButtons(true);
    try {
      await deleteListing(pendingDeleteId, mode);
      let message = "Действие выполнено";
      if (mode === "relist") message = "Возвращено в работу";
      if (mode === "delete") message = "Удалено";
      setDeleteStatus(message);
      setTimeout(() => {
        closeDeleteModal();
        closeSheet();
        closeEditor();
      }, 600);
    } catch (error) {
      setDeleteStatus(`Ошибка: ${error.message}`);
      toggleDeleteButtons(false);
    }
  };

  const openDeleteConfirm = (mode) => {
    pendingActionMode = mode;
    deleteOptionsPanel?.classList.add("hidden");
    deleteConfirmPanel?.classList.remove("hidden");
    if (deleteConfirmText) {
      deleteConfirmText.textContent =
        mode === "delete"
          ? "Вы уверены, что хотите удалить объявление навсегда?"
          : "Вы уверены, что хотите перевыставить объявление?";
    }
  };

  if (deleteConfirmBtn) {
    deleteConfirmBtn.dataset.action = "delete";
    deleteConfirmBtn.addEventListener("click", () => openDeleteConfirm("delete"));
  }
  if (deleteRelistBtn) {
    deleteRelistBtn.dataset.action = "relist";
    deleteRelistBtn.addEventListener("click", () => openDeleteConfirm("relist"));
  }
  deleteModalClose?.addEventListener("click", closeDeleteModal);
  deleteModal?.addEventListener("click", (event) => {
    if (event.target === deleteModal) closeDeleteModal();
  });
  deleteConfirmNo?.addEventListener("click", () => resetDeleteConfirm());
  deleteConfirmYes?.addEventListener("click", () => {
    if (!pendingActionMode) return;
    const mode = pendingActionMode;
    resetDeleteConfirm();
    performDeleteAction(mode);
  });

  const renderCard = (item) => {
    const obj = item.raw || {};
    const objectId = resolveObjectId(item);
    const status = item.meta?.status || "active";
    const title = obj.title || obj.address || obj.full_address || `Объект #${objectId}`;
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
    const hasPhoto = Boolean(photo && photo !== PHOTO_PLACEHOLDER);
    const safePhoto = hasPhoto ? encodeURI(photo).replace(/'/g, "%27") : "";
    const thumbContent = hasPhoto ? "" : "<span>Фото</span>";
    const thumbStyle = hasPhoto ? `style=\"background-image:url('${safePhoto}')\"` : "";
    const idLabel = objectId ? `<span class="listing-id">ID ${escapeHtml(objectId)}</span>` : "";

    return `
      <article class="listing-card status-${status}" data-id="${escapeHtml(objectId)}">
        <div class="listing-card-media ${hasPhoto ? "" : "fallback"}" ${thumbStyle}>${thumbContent}</div>
        <div class="listing-card-info">
          <div class="listing-card-price">
            <h3>${formatPrice(obj.price || obj.price_total || obj.price_rub)}</h3>
            ${idLabel}
          </div>
          <p class="listing-address">${escapeHtml(address || "Адрес уточняется")}</p>
          ${summaryLine ? `<div class="listing-meta-line">${summaryLine}</div>` : ""}
        </div>
        <button class="listing-menu-btn listing-menu-btn--right" data-id="${escapeHtml(objectId)}" aria-label="Меню">⋯</button>
      </article>
    `;
  };

  let currentFilter = "published";

  const render = () => {
    const filtered = listingsCache.filter((item) => {
      const status = item.meta?.status || "active";
      if (currentFilter === "published") return status === "active";
      if (currentFilter === "staging") return status === "staging";
      if (currentFilter === "rejected") return status === "rejected";
      return status !== "active" && status !== "staging" && status !== "rejected";
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
      const menuBtn = card.querySelector(".listing-menu-btn");
      if (menuBtn) {
        menuBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          openCardMenu(card.dataset.id, menuBtn);
        });
      }
    });
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
      const key = resolveObjectId(item);
      const override = key ? map[String(key)] : null;
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
      const hasCianId = hasCianIdentifier(obj.cian_id || obj.cianId);
      let derivedStatus = cianStatus;
      if (!hasCianId && !["rejected", "inactive"].includes(derivedStatus)) {
        derivedStatus = "staging";
      } else if (hasCianId && derivedStatus === "staging") {
        derivedStatus = "active";
      }
      return {
        ...item,
        meta: {
          status: derivedStatus,
          dealType: resolveDealType(obj),
          hasCianId,
        },
      };
    });
    render();
    if (pendingAutoEdit) {
      const exists = listingsCache.find(
        (item) => resolveObjectId(item) === String(pendingAutoEdit)
      );
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
      const selected = editorPhotos[index];
      if (selected) {
        editorMainPhotoUrl = selected;
        editorMainPhotoIndexValue = index + 1;
      }
      hidePhotoMenu();
      refreshPhotoSection();
      return;
    }
    if (action === "delete") {
      const [removed] = editorPhotos.splice(index, 1);
      if (removed && removed === editorMainPhotoUrl) {
        editorMainPhotoUrl = editorPhotos[0] || "";
        editorMainPhotoIndexValue = editorMainPhotoUrl ? 1 : null;
      } else if (editorMainPhotoIndexValue && index + 1 <= editorMainPhotoIndexValue) {
        editorMainPhotoIndexValue = Math.max(1, editorMainPhotoIndexValue - 1);
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
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hidePhotoMenu();
  });
  ["scroll", "resize"].forEach((evt) => {
    window.addEventListener(
      evt,
      () => {
        hidePhotoMenu();
      },
      true
    );
  });
