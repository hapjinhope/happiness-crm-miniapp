import { initImportBanner } from "./import-banner.js";

const stats = {
  listings: document.getElementById("statListings"),
  avgPrice: document.getElementById("statAvgPrice"),
  avgArea: document.getElementById("statAvgArea"),
  myListingsCount: document.getElementById("myListingsCount"),
};

const setText = (element, value) => {
  if (element) {
    element.textContent = value;
  }
};

const formatPrice = (value) => {
  if (!value) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(value)) + " ₽";
};

const formatArea = (value) => {
  if (!value) return "—";
  return `${Number(value).toFixed(1)} м²`;
};

const renderStats = (items) => {
  const total = items.length;
  setText(stats.listings, total || "0");
  setText(stats.myListingsCount, total ? `${total} объявлений` : "Нет объявлений");
  const avgPrice =
    total === 0
      ? null
      : items.reduce((acc, item) => acc + Number(item.raw?.price || item.raw?.price_total || 0), 0) / total;
  setText(stats.avgPrice, avgPrice ? formatPrice(avgPrice) : "—");
  const avgArea =
    total === 0
      ? null
      : items.reduce((acc, item) => acc + Number(item.raw?.total_area || item.raw?.area || 0), 0) / total;
  setText(stats.avgArea, avgArea ? formatArea(avgArea) : "—");
};

const init = async () => {
  try {
    const response = await fetch("/api/objects?limit=200");
    const data = await response.json();
    renderStats(data.items || []);
  } catch (error) {
    console.error("Не удалось загрузить статистику", error);
  }
};

init();
initImportBanner();
