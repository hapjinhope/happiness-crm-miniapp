const listEl = document.getElementById("moderationList");
const modalEl = document.getElementById("moderationModal");
const modalCloseButtons = document.querySelectorAll('[data-close-modal="moderationModal"]');
const modMainPhoto = document.getElementById("modMainPhoto");
const modMainPhotoImg = document.getElementById("modMainPhotoImg");
const modPhotoBadge = document.getElementById("modPhotoBadge");
const modThumbs = document.getElementById("modThumbs");
const modGalleryPrev = document.getElementById("modGalleryPrev");
const modGalleryNext = document.getElementById("modGalleryNext");
const modAddress = document.getElementById("modAddress");
const modComplex = document.getElementById("modComplex");
const modOwnerButton = document.getElementById("modOwnerButton");
const modTypeControl = document.getElementById("modTypeControl");
const modRoomsControl = document.getElementById("modRoomsControl");
const modLivingInput = document.getElementById("modLivingInput");
const modKitchenInput = document.getElementById("modKitchenInput");
const modTechToggles = document.getElementById("modTechToggles");
const modBathToggles = document.getElementById("modBathToggles");
const modParkingControl = document.getElementById("modParkingControl");
const modStatus = document.getElementById("moderationStatus");
const modApproveBtn = document.getElementById("modApproveBtn");
const modSaveBtn = document.getElementById("modSaveBtn");
const modalCounters = document.querySelectorAll(".counter-field");
const modTabs = document.querySelectorAll(".mod-tab");
const modPanes = document.querySelectorAll("[data-tab-panel]");
const DEFAULT_TAB = "queue";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const shortAddress = (address) => {
  if (!address) return "Адрес не указан";
  const parts = String(address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return address;
  const filtered = [];
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (/\b(АО|округ|district|р-н)\b/i.test(part)) continue;
    filtered.unshift(part);
    if (/\d/.test(part) && filtered.length >= 2) break;
  }
  const target = filtered.length ? filtered.slice(-2) : parts.slice(-2);
  return target.join(", ");
};

const formatComplexName = (value) => {
  if (!value) return "";
  const cleaned = String(value).replace(/^ЖК\s+/i, "").trim();
  if (!cleaned) return "";
  return `ЖК ${cleaned}`;
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

const collectPhotos = (data) => {
  const urls = new Set();
  PHOTO_FIELDS.forEach((field) => {
    const value = data[field];
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string" && entry.startsWith("http")) urls.add(entry);
        if (entry?.url && entry.url.startsWith("http")) urls.add(entry.url);
      });
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          const nested = Array.isArray(parsed) ? parsed : Object.values(parsed);
          nested.forEach((entry) => {
            if (typeof entry === "string" && entry.startsWith("http")) urls.add(entry);
            if (entry?.url && entry.url.startsWith("http")) urls.add(entry.url);
          });
        } catch (error) {
          trimmed
            .split(/\s+/)
            .filter((chunk) => chunk.startsWith("http"))
            .forEach((chunk) => urls.add(chunk.replace(/",?$/, "")));
        }
      } else if (trimmed.startsWith("http")) {
        urls.add(trimmed);
      }
    } else if (typeof value === "object") {
      Object.values(value).forEach((entry) => {
        if (typeof entry === "string" && entry.startsWith("http")) urls.add(entry);
        if (entry?.url && entry.url.startsWith("http")) urls.add(entry.url);
      });
    }
  });
  return Array.from(urls);
};

const parseBathroomCounts = (value) => {
  const counts = { combined: 0, separate: 0 };
  if (!value) return counts;
  const text = String(value).toLowerCase();
  const combined = text.match(/совмещ[^\d]*(\d+)/);
  const separate = text.match(/раздель[^\d]*(\d+)/);
  if (combined) counts.combined = Number(combined[1]);
  if (separate) counts.separate = Number(separate[1]);
  if (!combined && !separate) {
    const digits = text.match(/(\d+)/g);
    if (digits && digits.length) {
      counts.combined = Number(digits[0]);
      if (digits[1]) counts.separate = Number(digits[1]);
    }
  }
  return counts;
};

const extractNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const enrichBathroomCounts = (data, counts) => {
  const result = { ...counts };
  if (!result.combined && !result.separate) {
    const combined = extractNumber(
      data.bathrooms ??
        data.bathroom ??
        data.bathroom_count ??
        data.bathrooms_count ??
        data.bathroomcombined
    );
    if (combined) result.combined = combined;
  }
  const separate = extractNumber(
    data.bathrooms_separate ?? data.bathroom_separate ?? data.separate_bathrooms
  );
  if (separate) result.separate = separate;
  return result;
};

const formatBathroomState = ({ combined, separate }) =>
  `Совмещенный: ${combined} · Раздельный: ${separate}`;

const modState = {
  objectId: null,
  data: null,
  photos: [],
  photoIndex: 0,
  type: null,
  rooms: null,
  parking: null,
  toggles: {},
  counters: {
    "bath-combined": 0,
    "bath-separate": 0,
    balconies: 0,
    loggias: 0,
  },
};

const setStatus = (message = "", variant = "") => {
  if (!modStatus) return;
  modStatus.textContent = message;
  modStatus.className = `modal-status ${variant}`.trim();
};

const openModal = () => {
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
  document.body.classList.add("modal-lock");
  document.addEventListener("keydown", handleKeyNav);
};

const closeModal = () => {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  document.removeEventListener("keydown", handleKeyNav);
  document.body.classList.remove("modal-lock");
  window.scrollTo({ top: 0, behavior: "auto" });
};

modalCloseButtons.forEach((btn) => {
  btn.addEventListener("click", closeModal);
});

modalEl?.addEventListener("click", (event) => {
  if (event.target === modalEl) closeModal();
});

const updateHeroPhoto = () => {
  if (!modMainPhoto) return;
  const url = modState.photos[modState.photoIndex];
  if (!url) {
    modMainPhoto.classList.add("empty");
    modMainPhoto.classList.remove("portrait");
    if (modMainPhotoImg) modMainPhotoImg.src = "";
    modMainPhoto.style.setProperty("--photo-url", "none");
    if (modPhotoBadge) modPhotoBadge.textContent = "";
    return;
  }
  modMainPhoto.classList.remove("empty");
  modMainPhoto.classList.remove("portrait");
  const safeUrl = encodeURI(url).replace(/'/g, "%27");
  if (modMainPhotoImg) modMainPhotoImg.src = url;
  modMainPhoto.style.setProperty("--photo-url", `url('${safeUrl}')`);
  if (modPhotoBadge) {
    modPhotoBadge.textContent =
      modState.photos.length > 1 ? `Фото ${modState.photoIndex + 1}/${modState.photos.length}` : "Главное фото";
  }
  modThumbs
    ?.querySelectorAll(".hero-thumb")
    .forEach((thumb) => thumb.classList.toggle("active", Number(thumb.dataset.index) === modState.photoIndex));
};

modMainPhotoImg?.addEventListener("load", () => {
  if (!modMainPhotoImg.naturalWidth || !modMainPhotoImg.naturalHeight) return;
  const portrait = modMainPhotoImg.naturalHeight > modMainPhotoImg.naturalWidth * 1.1;
  modMainPhoto.classList.toggle("portrait", portrait);
});

const navigatePhoto = (delta) => {
  if (!modState.photos.length || !modMainPhoto) return;
  modState.photoIndex = (modState.photoIndex + delta + modState.photos.length) % modState.photos.length;
  updateHeroPhoto();
};

modGalleryPrev?.addEventListener("click", () => navigatePhoto(-1));
modGalleryNext?.addEventListener("click", () => navigatePhoto(1));

let swipeStart = null;
modMainPhoto?.addEventListener("pointerdown", (event) => {
  swipeStart = event.clientX;
});
modMainPhoto?.addEventListener("pointerup", (event) => {
  if (swipeStart === null) return;
  const delta = event.clientX - swipeStart;
  if (Math.abs(delta) > 30) navigatePhoto(delta > 0 ? -1 : 1);
  swipeStart = null;
});

const handleKeyNav = (event) => {
  if (modalEl?.classList.contains("hidden")) return;
  if (event.key === "ArrowLeft") {
    navigatePhoto(-1);
  } else if (event.key === "ArrowRight") {
    navigatePhoto(1);
  } else if (event.key === "Escape") {
    closeModal();
  }
};

const switchTab = (target) => {
  const tab = target || DEFAULT_TAB;
  modTabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tabTarget === tab);
  });
  modPanes.forEach((pane) => {
    pane.classList.toggle("active", pane.dataset.tabPanel === tab);
  });
};

modTabs.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tabTarget));
});

switchTab(DEFAULT_TAB);

const setSegmentValue = (control, value) => {
  if (!control) return;
  control.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.value === String(value));
  });
};

const resetToggleContainer = (container) => {
  container?.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
};

const toggleFeature = (container, field, active) => {
  if (!container) return;
  const btn = container.querySelector(`[data-field="${field}"]`);
  if (!btn) return;
  btn.classList.toggle("active", Boolean(active));
  modState.toggles[field] = Boolean(active);
};

const setCounterValue = (key, value) => {
  modState.counters[key] = Math.max(0, Number(value) || 0);
  const target = document.querySelector(`.counter-field[data-counter="${key}"] [data-value]`);
  if (target) target.textContent = String(modState.counters[key]);
};

modalCounters.forEach((counter) => {
  counter.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const key = counter.dataset.counter;
    if (!key) return;
    const delta = actionBtn.dataset.action === "inc" ? 1 : -1;
    setCounterValue(key, modState.counters[key] + delta);
  });
});

const renderThumbs = () => {
  if (!modThumbs) return;
  if (!modState.photos.length) {
    modThumbs.innerHTML = '<div class="thumbs-empty">Фото отсутствуют</div>';
    return;
  }
  modThumbs.innerHTML = modState.photos
    .map(
      (url, index) => `<button type="button" class="hero-thumb ${index === modState.photoIndex ? "active" : ""}"
        data-index="${index}" style="background-image:url('${encodeURI(url).replace(/'/g, "%27")}')"></button>`
    )
    .join("");
};

modThumbs?.addEventListener("click", (event) => {
  const btn = event.target.closest(".hero-thumb");
  if (!btn) return;
  modState.photoIndex = Number(btn.dataset.index) || 0;
  updateHeroPhoto();
});

const populateModal = (data) => {
  modState.data = data;
  modState.objectId = data.external_id || data.id || data.object_id;
  modState.toggles = {};
  modState.counters = {
    "bath-combined": 0,
    "bath-separate": 0,
    balconies: 0,
    loggias: 0,
  };
  modState.photos = collectPhotos(data);
  modState.photoIndex = Math.max(Number(data.main_photo_index || 1) - 1, 0);

  updateHeroPhoto();
  if (modGalleryPrev) modGalleryPrev.disabled = modState.photos.length <= 1;
  if (modGalleryNext) modGalleryNext.disabled = modState.photos.length <= 1;
  renderThumbs();

  modAddress.textContent = shortAddress(data.full_address || data.address || data.location);
  const complexLabel = formatComplexName(data.complex_name || data.complex || "");
  modComplex.textContent = complexLabel;

  if (data.owners_id) {
    modOwnerButton.disabled = false;
    modOwnerButton.dataset.ownerId = data.owners_id;
    modOwnerButton.textContent = `ID ${data.owners_id}`;
  } else {
    modOwnerButton.disabled = true;
    modOwnerButton.dataset.ownerId = "";
    modOwnerButton.textContent = "Собственник";
  }

  modState.type =
    data.type ||
    data.listing_type ||
    data.property_type ||
    data.realty_type ||
    data.raw?.type ||
    "Квартира";
  modState.rooms = String(data.rooms || "1");
  modState.parking = data.parking || data.parking_type || "";
  setSegmentValue(modTypeControl, modState.type);
  setSegmentValue(modRoomsControl, modState.rooms);
  setSegmentValue(modParkingControl, modState.parking);

  resetToggleContainer(modTechToggles);
  resetToggleContainer(modBathToggles);
  modLivingInput.value = data.living_area || "";
  modKitchenInput.value = data.kitchen_area || "";

  const TECH_FIELDS = ["fridge", "washer", "dishwasher", "conditioner", "tv"];
  TECH_FIELDS.forEach((field) => toggleFeature(modTechToggles, field, Boolean(data[field])));
  const BATH_FIELDS = ["bathtub", "shower"];
  BATH_FIELDS.forEach((field) => toggleFeature(modBathToggles, field, Boolean(data[field])));

  const bathCounts = enrichBathroomCounts(
    data,
    parseBathroomCounts(data.bathroom_type || data.bathrooms_description)
  );
  setCounterValue("bath-combined", bathCounts.combined);
  setCounterValue("bath-separate", bathCounts.separate);
  setCounterValue("balconies", data.balconies);
  setCounterValue("loggias", data.loggias);

  setStatus("");
};

const fetchAndOpen = async (objectId) => {
  try {
    setStatus("");
    const response = await fetch(`/api/objects/${encodeURIComponent(objectId)}`);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    populateModal(data);
    openModal();
  } catch (error) {
    setStatus(`Ошибка загрузки: ${error.message}`, "error");
  }
};

const gatherPayload = () => {
  const payload = {
    moderator: true,
    type: modTypeControl?.querySelector(".active")?.dataset.value || modState.type,
    rooms: Number(modRoomsControl?.querySelector(".active")?.dataset.value || modState.rooms) || null,
    living_area: modLivingInput.value ? Number(modLivingInput.value) : null,
    kitchen_area: modKitchenInput.value ? Number(modKitchenInput.value) : null,
    parking: modParkingControl?.querySelector(".active")?.dataset.value || "",
  };

  Object.entries(modState.toggles).forEach(([field, value]) => {
    payload[field] = Boolean(value);
  });

  const bathroomField = Object.prototype.hasOwnProperty.call(modState.data || {}, "bathroom_type")
    ? "bathroom_type"
    : Object.prototype.hasOwnProperty.call(modState.data || {}, "bathrooms")
      ? "bathrooms"
      : null;
  if (bathroomField) {
    payload[bathroomField] = formatBathroomState({
      combined: modState.counters["bath-combined"],
      separate: modState.counters["bath-separate"],
    });
  }
  payload.balconies = modState.counters.balconies;
  payload.loggias = modState.counters.loggias;

  return payload;
};

const patchObject = async (payload) => {
  if (!modState.objectId) throw new Error("unknown object");
  const response = await fetch(`/api/objects/${encodeURIComponent(modState.objectId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
};

modApproveBtn?.addEventListener("click", async () => {
  setStatus("Сохраняем...", "");
  modApproveBtn.disabled = true;
  try {
    await patchObject({ moderator: true });
    setStatus("Готово. Объявление снято с очереди", "success");
    window.invalidateObjectCache?.(modState.objectId);
    closeModal();
    fetchModerationItems();
  } catch (error) {
    setStatus(`Ошибка: ${error.message}`, "error");
  } finally {
    modApproveBtn.disabled = false;
  }
});

modSaveBtn?.addEventListener("click", async () => {
  setStatus("Сохраняем изменения...", "");
  modSaveBtn.disabled = true;
  try {
    const payload = gatherPayload();
    await patchObject(payload);
    setStatus("Изменения сохранены", "success");
    window.invalidateObjectCache?.(modState.objectId);
    closeModal();
    fetchModerationItems();
  } catch (error) {
    setStatus(`Ошибка: ${error.message}`, "error");
  } finally {
    modSaveBtn.disabled = false;
  }
});

modTypeControl?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-value]");
  if (!btn) return;
  setSegmentValue(modTypeControl, btn.dataset.value);
  modState.type = btn.dataset.value;
});

modRoomsControl?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-value]");
  if (!btn) return;
  setSegmentValue(modRoomsControl, btn.dataset.value);
  modState.rooms = btn.dataset.value;
});

modParkingControl?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-value]");
  if (!btn) return;
  setSegmentValue(modParkingControl, btn.dataset.value);
  modState.parking = btn.dataset.value;
});

modTechToggles?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-field]");
  if (!btn) return;
  btn.classList.toggle("active");
  modState.toggles[btn.dataset.field] = btn.classList.contains("active");
});

modBathToggles?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-field]");
  if (!btn) return;
  btn.classList.toggle("active");
  modState.toggles[btn.dataset.field] = btn.classList.contains("active");
});

modOwnerButton?.addEventListener("click", async () => {
  const ownerId = modOwnerButton.dataset.ownerId;
  if (!ownerId) return;
  modOwnerButton.disabled = true;
  try {
    const response = await fetch(`/api/owners/${encodeURIComponent(ownerId)}`);
    if (!response.ok) throw new Error("Нет данных");
    const owner = await response.json();
    if (owner.url) {
      window.open(owner.url, "_blank", "noopener");
    } else {
      setStatus(`Собственник #${ownerId}: ${owner.name || "без ссылки"}`, "warning");
    }
  } catch (error) {
    setStatus(`Ошибка владельца: ${error.message}`, "error");
  } finally {
    modOwnerButton.disabled = false;
  }
});

const setLoadingState = (message = "Загружаем данные...") => {
  if (!listEl) return;
  listEl.innerHTML = `<div class="empty-state">${message}</div>`;
};

const renderModerationItems = (items = []) => {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = '<div class="empty-state">Очередь пустая. Все объявления проверены.</div>';
    return;
  }
  const markup = items
    .map((item) => {
      const id = item.id ?? item.raw?.id ?? "—";
      const address = item.address ?? item.raw?.address ?? item.raw?.full_address;
      return `
        <article class="moderation-card" data-object-id="${escapeHtml(id)}">
          <div class="moderation-info">
            <span class="moderation-id">#${escapeHtml(id)}</span>
            <p class="moderation-address">${escapeHtml(shortAddress(address))}</p>
            <p class="moderation-meta">Статус: ожидает модерацию</p>
          </div>
          <button type="button" class="moderation-action" data-action="analyze" data-object-id="${escapeHtml(id)}">
            Анализ
          </button>
        </article>
      `;
    })
    .join("");
  listEl.innerHTML = markup;
};

const fetchModerationItems = async () => {
  if (!listEl) return;
  setLoadingState();
  try {
    const response = await fetch("/api/moderation");
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }
    const data = await response.json();
    renderModerationItems(data.items || []);
  } catch (error) {
    setLoadingState(`Не удалось загрузить очередь: ${error.message}`);
  }
};

listEl?.addEventListener("click", (event) => {
  const analyzeBtn = event.target.closest('[data-action="analyze"]');
  if (!analyzeBtn) return;
  const objectId = analyzeBtn.dataset.objectId;
  if (!objectId) return;
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Открываем...";
  const cleanup = () => {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Анализ";
  };
  fetchAndOpen(objectId)
    .catch(() => {})
    .finally(cleanup);
});

fetchModerationItems();
