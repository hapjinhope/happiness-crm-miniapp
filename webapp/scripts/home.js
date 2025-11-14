import { initImportBanner } from "./import-banner.js";

initImportBanner();

const publishCard = document.querySelector('[data-action="open-publish"]');
const publishModal = document.getElementById("publishModal");
const publishLinkButton = document.getElementById("publishLinkButton");
const publishLinkField = document.getElementById("publishLinkField");
const publishLinkInput = document.getElementById("publishLinkInput");
const publishLinkSubmit = document.getElementById("publishLinkSubmit");
const publishLinkStatus = document.getElementById("publishLinkStatus");

const showingCard = document.querySelector('[data-action="open-showing"]');
const showingModal = document.getElementById("showingModal");
const showingObjectSuggestions = document.getElementById("showingObjectSuggestions");
const showingObjectSearch = document.getElementById("showingObjectSearch");
const wizardBodies = document.querySelectorAll(".wizard-body");
const wizardStatuses = document.querySelectorAll(".wizard-status");
const ownerForm = document.getElementById("ownerForm");
const clientForm = document.getElementById("clientForm");
const scheduleForm = document.getElementById("scheduleForm");
const showingSubmit = document.getElementById("showingSubmit");
const showingStatus = document.getElementById("showingStatus");
const ownerCallToggle = document.getElementById("ownerCallToggle");
const ownerPhoneInput = ownerForm?.querySelector('[data-owner-phone]');
const clientGroupSegment = document.getElementById("clientGroupSegment");
const clientGroupValue = document.getElementById("clientGroupValue");
const childrenCounter = document.querySelector('[data-counter="children"]');
const clientChildrenValue = document.getElementById("clientChildrenValue");
const clientPetsSegment = document.getElementById("clientPetsSegment");
const clientPetsValue = document.getElementById("clientPetsValue");
const moderationBadge = document.getElementById("moderationBadge");

const showingState = {
  object: null,
  owner: null,
  client: null,
  schedule: null,
};

const objectsCache = new Map();
let suggestionAbortController = null;
let suggestionDebounceTimer = null;
const ALLOWED_LISTING_DOMAINS = ["cian.ru", "avito.ru"];

const openModal = (modal) => modal?.classList.remove("hidden");
const closeModal = (modal) => modal?.classList.add("hidden");

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.closeModal;
    if (targetId) closeModal(document.getElementById(targetId));
    else closeModal(btn.closest(".modal"));
  });
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
});

const resetPublishModal = () => {
  publishLinkField?.classList.add("hidden");
  publishLinkButton?.classList.remove("hidden");
  if (publishLinkInput) publishLinkInput.value = "";
  if (publishLinkStatus) {
    publishLinkStatus.textContent = "";
    publishLinkStatus.className = "modal-status";
  }
  if (publishLinkSubmit) {
    publishLinkSubmit.disabled = true;
    publishLinkSubmit.classList.add("hidden");
  }
};

publishCard?.addEventListener("click", (event) => {
  event.preventDefault();
  resetPublishModal();
  openModal(publishModal);
});

publishLinkButton?.addEventListener("click", () => {
  publishLinkButton.classList.add("hidden");
  publishLinkField.classList.remove("hidden");
  publishLinkInput.focus();
});

const isAllowedListingUrl = (value = "") => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    return false;
  }
  return ALLOWED_LISTING_DOMAINS.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
};

const extractListingIdFromUrl = (value = "") => {
  try {
    const parsed = new URL(value);
    const match = parsed.pathname.match(/(\d{5,})/);
    if (match) return match[1];
  } catch (error) {
    // ignore
  }
  const fallback = String(value).match(/(\d{5,})/);
  return fallback ? fallback[1] : null;
};

const fetchOwnerIdForListing = async (listingId) => {
  if (!listingId) return null;
  try {
    const response = await fetch(`/api/objects/${encodeURIComponent(listingId)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return data?.owners_id || data?.owner_id || null;
  } catch (error) {
    return null;
  }
};

const handlePublishSubmit = async () => {
  const url = publishLinkInput.value.trim();
  if (!url) return;
  if (!isAllowedListingUrl(url)) {
    publishLinkStatus.textContent = "Используйте ссылку с cian.ru или avito.ru";
    publishLinkStatus.className = "modal-status error";
    return;
  }
  publishLinkSubmit.disabled = true;
  publishLinkStatus.textContent = "Отправляем ссылку...";
  publishLinkStatus.className = "modal-status";
  let ownerLabel = "не найден";
  const listingId = extractListingIdFromUrl(url);
  if (listingId) {
    const ownerId = await fetchOwnerIdForListing(listingId);
    if (ownerId) ownerLabel = ownerId;
  }
  if (ownerLabel !== "не найден") {
    publishLinkStatus.textContent = `Этот объект уже существует. ID собственника: ${ownerLabel}`;
    publishLinkStatus.className = "modal-status error";
  } else {
    publishLinkStatus.textContent = `Ваша ссылка отправлена. Ждите публикации. ID собственника: ${ownerLabel}`;
    publishLinkStatus.className = "modal-status success";
  }
  publishLinkSubmit.disabled = false;
};

publishLinkSubmit?.addEventListener("click", handlePublishSubmit);

publishLinkInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handlePublishSubmit();
  }
});

publishLinkInput?.addEventListener("input", () => {
  const hasValue = Boolean(publishLinkInput.value.trim());
  publishLinkSubmit.disabled = !hasValue;
  publishLinkSubmit.classList.toggle("hidden", !hasValue);
});

const refreshModerationBadge = async () => {
  if (!moderationBadge) return;
  try {
    const response = await fetch("/api/moderation/count");
    if (!response.ok) throw new Error("count");
    const data = await response.json();
    const count = Number(data.count) || 0;
    moderationBadge.textContent = count > 99 ? "99+" : String(count);
    moderationBadge.classList.toggle("hidden", count === 0);
  } catch (error) {
    moderationBadge.classList.add("hidden");
  }
};

refreshModerationBadge();

const updateWizardStatus = (step, text, completed = false) => {
  wizardStatuses.forEach((label) => {
    if (label.dataset.summaryLabel === step) {
      label.textContent = text;
      const parent = label.closest(".wizard-step");
      if (completed) parent?.classList.add("completed");
      else parent?.classList.remove("completed");
    }
  });
};

const toggleWizardBody = (step) => {
  wizardBodies.forEach((body) => {
    if (body.parentElement?.dataset.step === step) body.classList.toggle("active");
    else body.classList.remove("active");
  });
};

document.querySelectorAll("[data-toggle-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.toggleStep;
    if (step === "owner" && !showingState.object) return;
    if (step === "client" && !showingState.owner) return;
    if (step === "schedule" && !showingState.client) return;
    toggleWizardBody(step);
  });
});

const resolveListingId = (item = {}) =>
  item.id ?? item.raw?.external_id ?? item.raw?.id ?? "";
const resolveListingAddress = (item = {}) =>
  item.address ||
  item.raw?.address ||
  item.raw?.full_address ||
  item.raw?.location ||
  "Адрес не указан";

const formatObjectLabel = (item = {}) => {
  const id = resolveListingId(item) || "—";
  return `ID ${id} — ${resolveListingAddress(item)}`;
};

const hideSuggestions = () => showingObjectSuggestions?.classList.add("hidden");

const renderObjectSuggestions = (items = []) => {
  if (!showingObjectSuggestions) return;
  if (!items.length) {
    showingObjectSuggestions.innerHTML = '<div class="empty-state">Не найдено</div>';
  } else {
    showingObjectSuggestions.innerHTML = items
      .map(
        (item) => `
        <button type="button" class="object-suggestion-item" data-suggest-id="${resolveListingId(item)}">
          <strong>ID ${resolveListingId(item)}</strong>
          <span>${resolveListingAddress(item)}</span>
        </button>`
      )
      .join("");
  }
  showingObjectSuggestions.classList.remove("hidden");
};

const fetchObjectSuggestions = async (query = "") => {
  if (!showingObjectSuggestions) return;
  const trimmed = query.trim();
  showingObjectSuggestions.classList.remove("hidden");
  showingObjectSuggestions.innerHTML = '<div class="empty-state">Загрузка объектов...</div>';

  if (suggestionAbortController) {
    suggestionAbortController.abort();
  }
  suggestionAbortController = new AbortController();
  try {
    const params = new URLSearchParams({ limit: "10" });
    if (trimmed) params.set("q", trimmed);
    const response = await fetch(`/api/objects?${params.toString()}`, {
      signal: suggestionAbortController.signal,
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const items = data.items || [];
    items.forEach((item) => {
      const id = String(resolveListingId(item));
      if (id) objectsCache.set(id, item);
    });
    renderObjectSuggestions(items);
  } catch (error) {
    if (error.name === "AbortError") return;
    showingObjectSuggestions.innerHTML = '<div class="empty-state error">Не удалось загрузить объекты</div>';
  }
};

const resetWizard = () => {
  showingState.object = null;
  showingState.owner = null;
  showingState.client = null;
  showingState.schedule = null;
  ownerForm?.reset();
  clientForm?.reset();
  scheduleForm?.reset();
  if (scheduleForm?.time) {
    scheduleForm.time.value = "00:00";
  }
  ownerCallToggle?.classList.remove("active");
  syncOwnerPhoneState();
  selectClientGroup("family");
  setChildrenValue(0);
  selectPets("no");
  if (showingObjectSearch) showingObjectSearch.value = "";
  hideSuggestions();
  updateWizardStatus("object", "не выбран", false);
  updateWizardStatus("owner", "ожидает", false);
  updateWizardStatus("client", "ожидает", false);
  updateWizardStatus("schedule", "ожидает", false);
  wizardBodies.forEach((body, index) => body.classList.toggle("active", index === 0));
  showingSubmit.disabled = true;
  showingStatus.textContent = "";
  showingStatus.className = "modal-status";
};

const handleObjectSelect = (objectId) => {
  const target = objectsCache.get(String(objectId));
  if (!target) return;
  showingState.object = target;
  updateWizardStatus("object", `ID ${target.id}`, true);
  if (showingObjectSearch) showingObjectSearch.value = formatObjectLabel(target);
  hideSuggestions();
  toggleWizardBody("owner");
};

showingObjectSuggestions?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-suggest-id]");
  if (card) handleObjectSelect(card.dataset.suggestId);
});

showingObjectSearch?.addEventListener("focus", (event) => {
  fetchObjectSuggestions(event.target.value);
});

showingObjectSearch?.addEventListener("input", (event) => {
  if (suggestionDebounceTimer) clearTimeout(suggestionDebounceTimer);
  suggestionDebounceTimer = setTimeout(() => fetchObjectSuggestions(event.target.value), 120);
});

document.addEventListener("click", (event) => {
  if (
    showingObjectSuggestions &&
    !showingObjectSuggestions.contains(event.target) &&
    event.target !== showingObjectSearch
  ) {
    hideSuggestions();
  }
});

const extractPhoneTailDigits = (value = "") => {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("7") || digits.startsWith("8")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

const formatPhoneValue = (value = "") => {
  const tail = extractPhoneTailDigits(value);
  let result = "+7";
  if (!tail) return `${result} `;
  const part1 = tail.slice(0, 3);
  const part2 = tail.slice(3, 6);
  const part3 = tail.slice(6, 8);
  const part4 = tail.slice(8, 10);
  if (part1) result += ` ${part1}`;
  if (part2) result += ` ${part2}`;
  if (part3) result += `-${part3}`;
  if (part4) result += `-${part4}`;
  return result.trim();
};

const hasPhonePayload = (value = "") => extractPhoneTailDigits(value).length === 10;

const setFieldError = (input, hasError) => {
  if (!input) return;
  input.classList.toggle("input-error", Boolean(hasError));
};

const attachPhoneMask = (input) => {
  if (!input) return;
  const apply = () => {
    const formatted = formatPhoneValue(input.value);
    input.value = formatted || "+7 ";
  };
  input.addEventListener("focus", () => {
    if (!input.value.trim()) input.value = "+7 ";
  });
  input.addEventListener("input", apply);
  input.addEventListener("blur", apply);
  apply();
};

document.querySelectorAll('input[type="tel"]').forEach(attachPhoneMask);

const syncOwnerPhoneState = () => {
  if (!ownerPhoneInput) return;
  const skip = Boolean(ownerCallToggle?.classList.contains("active"));
  ownerCallToggle?.setAttribute("aria-pressed", skip ? "true" : "false");
  ownerPhoneInput.disabled = skip;
  const wrapper = ownerPhoneInput.closest(".phone-input-wrapper");
  if (wrapper) wrapper.dataset.skip = String(skip);
  if (skip) {
    ownerPhoneInput.value = "";
    setFieldError(ownerPhoneInput, false);
  } else if (!ownerPhoneInput.value.trim()) {
    ownerPhoneInput.value = "+7 ";
  }
};

ownerCallToggle?.addEventListener("click", () => {
  ownerCallToggle.classList.toggle("active");
  syncOwnerPhoneState();
});

ownerCallToggle?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    ownerCallToggle.classList.toggle("active");
    syncOwnerPhoneState();
  }
});

const selectClientGroup = (value) => {
  if (!clientGroupSegment || !clientGroupValue) return;
  clientGroupValue.value = value;
  clientGroupSegment.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.groupValue === value);
  });
};

const setChildrenValue = (value) => {
  if (!clientChildrenValue) return;
  const numeric = Math.max(0, Math.min(9, Number(value) || 0));
  clientChildrenValue.value = String(numeric);
  const label = childrenCounter?.querySelector("[data-counter-value]");
  if (label) label.textContent = String(numeric);
};

const updateChildrenCount = (delta) => {
  const current = Number(clientChildrenValue?.value || "0");
  setChildrenValue(current + delta);
};

const selectPets = (value) => {
  if (!clientPetsSegment || !clientPetsValue) return;
  const normalized = value === "yes" ? "да" : value === "no" ? "нет" : value;
  clientPetsValue.value = normalized;
  clientPetsSegment.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.petsValue === value);
  });
};

clientGroupSegment?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-group-value]");
  if (!btn) return;
  selectClientGroup(btn.dataset.groupValue);
});

childrenCounter?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-counter-action]");
  if (!btn) return;
  updateChildrenCount(btn.dataset.counterAction === "inc" ? 1 : -1);
});

clientPetsSegment?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-pets-value]");
  if (!btn) return;
  selectPets(btn.dataset.petsValue);
});

syncOwnerPhoneState();
selectClientGroup("family");
setChildrenValue(0);
selectPets("no");
ownerPhoneInput?.addEventListener("input", () => setFieldError(ownerPhoneInput, false));

const handleStepSubmit = (form, key, options = {}) => {
  const formData = new FormData(form);
  const payload = {};
  formData.forEach((value, name) => {
    if (name === "phone") {
      payload[name] = hasPhonePayload(value) ? formatPhoneValue(value) : "";
    } else {
      payload[name] = typeof value === "string" ? value.trim() : value;
    }
  });
  if (options.phoneInput) {
    const skip = Boolean(options.phoneSkipButton?.classList.contains("active"));
    if (skip) {
      payload.phone = options.phoneSkipLabel || "Связь через объявление";
      setFieldError(options.phoneInput, false);
    } else if (!hasPhonePayload(options.phoneInput.value)) {
      setFieldError(options.phoneInput, true);
      showingStatus.textContent = options.phoneError || "Введите телефон полностью";
      showingStatus.className = "modal-status error";
      return false;
    } else {
      payload.phone = formatPhoneValue(options.phoneInput.value);
      setFieldError(options.phoneInput, false);
    }
  }
  const optionalFields = new Set(options.optionalFields || []);
  let missingField = null;
  Object.entries(payload).forEach(([name, value]) => {
    if (missingField || optionalFields.has(name)) return;
    if (typeof value === "number") return;
    if (value === undefined || value === null || String(value).trim() === "") {
      missingField = name;
    }
  });
  if (missingField) {
    showingStatus.textContent = options.emptyError || "Заполните все поля шага";
    showingStatus.className = "modal-status error";
    return false;
  }
  showingState[key] = payload;
  updateWizardStatus(key, "готово", true);
  showingStatus.textContent = "";
  showingStatus.className = "modal-status";
  showingSubmit.disabled = !isWizardComplete();
  return true;
};

ownerForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!showingState.object) {
    showingStatus.textContent = "Сначала выберите объект";
    showingStatus.className = "modal-status error";
    return;
  }
  if (
    handleStepSubmit(ownerForm, "owner", {
      phoneInput: ownerPhoneInput,
      phoneSkipButton: ownerCallToggle,
      phoneSkipLabel: "Связь через объявление",
      optionalFields: ["notes"],
      phoneError: "Укажите телефон собственника полностью",
    })
  ) {
    toggleWizardBody("client");
  }
});

clientForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!showingState.owner) {
    showingStatus.textContent = "Сохраните данные собственника";
    showingStatus.className = "modal-status error";
    return;
  }
  if (
    handleStepSubmit(clientForm, "client", {
      phoneInput: clientForm.querySelector('input[name="phone"]'),
      optionalFields: ["notes"],
      phoneError: "Введите корректный телефон клиента",
    })
  ) {
    toggleWizardBody("schedule");
  }
});

scheduleForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!showingState.client) {
    showingStatus.textContent = "Заполните данные клиента";
    showingStatus.className = "modal-status error";
    return;
  }
  const date = scheduleForm.date.value;
  const time = scheduleForm.time.value;
  if (!date || !time) {
    showingStatus.textContent = "Укажите дату и время";
    showingStatus.className = "modal-status error";
    return;
  }
  showingState.schedule = { date, time };
  updateWizardStatus("schedule", `${date} · ${time}`, true);
  showingStatus.textContent = "";
  showingStatus.className = "modal-status";
  showingSubmit.disabled = !isWizardComplete();
});

const scheduleTimeInput = scheduleForm?.querySelector('input[name="time"]');
const adjustScheduleTime = (deltaMinutes) => {
  if (!scheduleTimeInput) return;
  const value = scheduleTimeInput.value || "00:00";
  const [hh = "00", mm = "00"] = value.split(":");
  let minutes = parseInt(hh, 10) * 60 + parseInt(mm, 10);
  if (Number.isNaN(minutes)) minutes = 0;
  minutes = (minutes + deltaMinutes + 1440) % 1440;
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");
  scheduleTimeInput.value = `${hours}:${mins}`;
};

scheduleTimeInput?.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY < 0 ? 1 : -1;
  adjustScheduleTime(delta);
});

const isWizardComplete = () =>
  Boolean(showingState.object && showingState.owner && showingState.client && showingState.schedule);

const sendShowing = async () => {
  if (!isWizardComplete()) return;
  showingSubmit.disabled = true;
  showingStatus.textContent = "Отправляем показ…";
  showingStatus.className = "modal-status";
  try {
    const response = await fetch("/api/showings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object_id: showingState.object.id,
        owner: showingState.owner,
        client: showingState.client,
        schedule: showingState.schedule,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    showingStatus.textContent = "Показ отправлен в Telegram";
    showingStatus.className = "modal-status success";
    setTimeout(() => {
      closeModal(showingModal);
      resetWizard();
    }, 1200);
  } catch (error) {
    showingStatus.textContent = `Ошибка: ${error.message}`;
    showingStatus.className = "modal-status error";
    showingSubmit.disabled = false;
  }
};

showingSubmit?.addEventListener("click", sendShowing);

showingCard?.addEventListener("click", (event) => {
  event.preventDefault();
  resetWizard();
  openModal(showingModal);
  fetchObjectSuggestions(showingObjectSearch?.value || "");
});

publishModal?.addEventListener("click", () => {
  publishLinkStatus.textContent = "";
});
