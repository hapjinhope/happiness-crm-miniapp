import os
from collections import OrderedDict
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
import html

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import requests
from requests import HTTPError, ConnectionError as RequestsConnectionError

from supabase_client import SupabaseClient

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OBJECT_ID_COLUMN = os.getenv("SUPABASE_OBJECT_ID_COLUMN", "id")
CIAN_API_BASE_URL = os.getenv("CIAN_API_BASE_URL", "https://public-api.cian.ru").rstrip("/")
NOTIFY_BOT_TOKEN = os.getenv("NOTIFY_BOT_TOKEN")
NOTIFY_CHAT_ID = os.getenv("NOTIFY_CHAT_ID")
NOTIFY_THREAD_ID = os.getenv("NOTIFY_THREAD_ID")
CIAN_API_TOKEN = os.getenv("CIAN_API_TOKEN")
SHOWING_BOT_TOKEN = os.getenv("SHOWING_BOT_TOKEN")
SHOWING_CHAT_ID = os.getenv("SHOWING_CHAT_ID")
SHOWING_THREAD_ID = os.getenv("SHOWING_THREAD_ID")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the mini app server.")

supabase_client = SupabaseClient(
    base_url=SUPABASE_URL,
    api_key=SUPABASE_SERVICE_ROLE_KEY,
    object_id_column=OBJECT_ID_COLUMN,
)
app = FastAPI(title="HAPPINESS CRM Mini App")

WEBAPP_DIR = Path(__file__).resolve().parent / "webapp"
if not WEBAPP_DIR.exists():
    raise RuntimeError("webapp directory not found. Make sure /webapp exists with index.html.")

app.mount("/static", StaticFiles(directory=WEBAPP_DIR), name="static")


def _call_cian(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if not CIAN_API_BASE_URL or not CIAN_API_TOKEN:
        raise RuntimeError("CIAN API credentials are not configured")
    if not path.startswith("/"):
        path = f"/{path}"
    url = f"{CIAN_API_BASE_URL}{path}"
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {CIAN_API_TOKEN}",
            "Accept": "application/json",
        },
        params=params,
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def _map_cian_status(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = str(value).strip().lower()
    if any(word in normalized for word in ("publish", "размещ", "опублик")):
        return "active"
    if any(word in normalized for word in ("moder", "модерац", "ожидает", "установлено из импорта")):
        return "draft"
    if any(word in normalized for word in ("refus", "откл", "blocked", "remove", "удален", "снят")):
        return "rejected"
    if any(word in normalized for word in ("deactiv", "деактив", "pause")):
        return "inactive"
    return None


def _build_cian_listing_url(object_id: Any) -> Optional[str]:
    if object_id is None:
        return None
    digits = "".join(ch for ch in str(object_id) if ch.isdigit())
    if not digits:
        return None
    return f"https://www.cian.ru/rent/flat/{digits}/"


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        normalized = value.strip().upper()
        return normalized in {"", "EMPTY", "NULL", "NONE"}
    return False


def _extract_cian_digits(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        digits = re.sub(r"\D", "", str(int(value)))
        return digits or None
    if isinstance(value, str):
        match = re.search(r"(\d{5,})", value)
        if match:
            return match.group(1)
    return None


def _ensure_cian_identifiers(item: Dict[str, Any]) -> None:
    object_id = item.get(OBJECT_ID_COLUMN) or item.get("id")
    if object_id is None:
        return

    cian_id_existing = item.get("cian_id")
    cian_url_existing = item.get("cian_url")

    digits = None if _is_missing(cian_id_existing) else _extract_cian_digits(cian_id_existing)
    if not digits:
        for candidate in (
            item.get("external_id"),
            object_id,
            cian_url_existing,
        ):
            digits = _extract_cian_digits(candidate)
            if digits:
                break

    url = None if _is_missing(cian_url_existing) else cian_url_existing
    if not url and digits:
        url = _build_cian_listing_url(digits)

    payload: Dict[str, Any] = {}
    if digits and (_is_missing(cian_id_existing) or cian_id_existing != digits):
        payload["cian_id"] = digits
        item["cian_id"] = digits
    if url and _is_missing(cian_url_existing):
        payload["cian_url"] = url
        item["cian_url"] = url

    if payload:
        try:
            supabase_client.update_object(str(object_id), payload)
        except HTTPError as exc:
            logging.warning("Не удалось обновить cian данные объекта %s: %s", object_id, exc)


CLIENT_GROUP_LABELS = {
    "family": "Семья",
    "couple": "Пара",
    "single": "Один человек",
    "company": "Компания",
    "staff": "Сотрудники",
}


def _escape_label(value: Optional[Any], placeholder: str = "—") -> str:
    if value is None:
        return html.escape(placeholder)
    text = str(value).strip()
    return html.escape(text or placeholder)


def _short_address_label(address: Optional[str]) -> str:
    if not address:
        return "Адрес не указан"
    parts = [part.strip() for part in str(address).split(",") if part.strip()]
    filtered: List[str] = []
    for part in reversed(parts):
        if filtered and any(char.isdigit() for char in filtered[0]) and not any(char.isdigit() for char in part):
            filtered.insert(0, part)
            break
        filtered.insert(0, part)
        if any(char.isdigit() for char in part) and len(filtered) >= 2:
            break
    cleaned = [segment for segment in filtered if not re.search(r"\b(АО|р-н|округ|district)\b", segment, re.IGNORECASE)]
    target = cleaned or filtered or parts
    return ", ".join(target[-2:]) or address


def sync_cian_statuses() -> int:
    data = _call_cian("/v1/get-order")
    offers = data.get("result", {}).get("offers") or []
    updated = 0
    for offer in offers:
        external_id = offer.get("externalId")
        if not external_id:
            continue
        status = _map_cian_status(offer.get("status"))
        if not status:
            continue
        payload: Dict[str, Any] = {"status": status}
        cian_offer_id = offer.get("offerId") or offer.get("id") or offer.get("cianId")
        digits = _extract_cian_digits(cian_offer_id)
        if digits:
            payload["cian_id"] = digits
            payload["cian_url"] = _build_cian_listing_url(digits)
        try:
            supabase_client.update_object(str(external_id), payload)
            updated += 1
        except HTTPError:
            continue
    return updated


def _cian_demo_order() -> Dict[str, Any]:
    return {
        "operationId": "demo-op",
        "result": {
            "activeFeedUrls": ["https://demo-feed.example.com/feed.xml"],
            "hasImagesProblems": False,
            "hasOffersProblems": False,
            "lastFeedCheckDate": "2024-01-01T12:00:00Z",
            "lastProcessDate": "2024-01-01T11:55:00Z",
            "orderId": 0,
        },
        "demo": True,
    }


def _cian_demo_report() -> Dict[str, Any]:
    return {
        "operationId": "demo-report",
        "result": {
            "offers": [
                {
                    "externalId": "A101",
                    "offerId": 101,
                    "status": "Refused",
                    "errors": ["Укажите корректный адрес"],
                    "warnings": [],
                    "url": "https://www.cian.ru/demo/A101",
                }
            ]
        },
        "demo": True,
    }


def send_notify_message(text: str) -> None:
    if not NOTIFY_BOT_TOKEN or not NOTIFY_CHAT_ID:
        return
    payload: Dict[str, Any] = {
        "chat_id": NOTIFY_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
    }
    if NOTIFY_THREAD_ID:
        payload["message_thread_id"] = int(NOTIFY_THREAD_ID)
    try:
        requests.post(
            f"https://api.telegram.org/bot{NOTIFY_BOT_TOKEN}/sendMessage",
            json=payload,
            timeout=10,
        ).raise_for_status()
    except requests.RequestException as exc:
        logging.warning("Failed to send notify message: %s", exc)


def notify_cian_problems(report: Dict[str, Any]) -> None:
    if not report or report.get("demo"):
        return
    offers = report.get("result", {}).get("offers") or []
    problematic = [
        offer
        for offer in offers
        if (offer.get("errors") and len(offer["errors"])) or (offer.get("warnings") and len(offer["warnings"]))
    ]
    if not problematic:
        return
    lines = ["⚠️ <b>Проблемы при импорте CIAN</b>"]
    for offer in problematic[:5]:
        external_id = offer.get("externalId") or offer.get("offerId") or "—"
        errors = offer.get("errors") or offer.get("warnings") or ["Без описания"]
        lines.append(f"#{external_id}: {'; '.join(errors)}")
        if offer.get("url"):
            lines.append(offer["url"])
    rest = len(problematic) - 5
    if rest > 0:
        lines.append(f"…и еще {rest} объявл.")
    send_notify_message("\n".join(lines))


def send_showing_message(text: str) -> None:
    if not SHOWING_BOT_TOKEN or not SHOWING_CHAT_ID:
        logging.warning("SHOWING_BOT_TOKEN or SHOWING_CHAT_ID is missing; skipping notification")
        return
    payload: Dict[str, Any] = {
        "chat_id": SHOWING_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
    }
    if SHOWING_THREAD_ID:
        payload["message_thread_id"] = int(SHOWING_THREAD_ID)
    try:
        requests.post(
            f"https://api.telegram.org/bot{SHOWING_BOT_TOKEN}/sendMessage",
            json=payload,
            timeout=10,
        ).raise_for_status()
    except requests.RequestException as exc:
        logging.warning("Failed to send showing notification: %s", exc)


@app.get("/api/objects")
def list_objects(
    q: Optional[str] = Query(default=None, description="Поиск по ID или адресу"),
    limit: int = 100,
    moderator: Optional[bool] = Query(default=None),
):
    try:
        aggregated: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
        data: List[Dict[str, Any]] = []

        moderator_filter = None
        if moderator is not None:
            moderator_filter = {"moderator": f"eq.{str(moderator).lower()}"}

        if q:
            term = q.strip()
            term_digits = _digits(term)
            try:
                obj = supabase_client.get_object(term)
                if obj:
                    aggregated[str(obj.get(OBJECT_ID_COLUMN) or obj.get("id"))] = obj
            except HTTPError as exc:
                if exc.response.status_code not in (400, 404):
                    raise

            all_items = supabase_client.list_objects(limit=min(limit, 200), filters=moderator_filter)
            term_lower = term.lower()
            for item in all_items:
                identifier = str(item.get(OBJECT_ID_COLUMN) or item.get("id") or len(aggregated))
                address = (item.get("address") or item.get("full_address") or "").lower()
                complex_name = (item.get("complex_name") or item.get("complex") or "").lower()
                if (
                    term_lower in address
                    or term_lower in complex_name
                    or term == str(item.get(OBJECT_ID_COLUMN))
                    or _item_price_matches(item, term_digits)
                ):
                    aggregated[identifier] = item

            if aggregated:
                data = list(aggregated.values())[:limit]
            else:
                data = all_items[:limit]
        else:
            data = supabase_client.list_objects(limit=min(limit, 200), filters=moderator_filter)

        for item in data:
            _ensure_cian_identifiers(item)

        simplified = [
            {
                "id": item.get(OBJECT_ID_COLUMN) or item.get("id"),
                "address": item.get("address") or item.get("full_address"),
                "price": item.get("price") or item.get("price_total") or item.get("price_rub"),
                "cian_url": item.get("cian_url"),
                "raw": item,
            }
            for item in data
        ]
        return {"items": simplified}
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    except RequestsConnectionError as exc:
        raise HTTPException(status_code=502, detail="Не удалось подключиться к Supabase") from exc

@app.get("/api/moderation")
def moderation_objects(limit: int = 50):
    try:
        items = supabase_client.list_objects(limit=min(limit, 200), filters={"moderator": "eq.false"})
        for item in items:
            _ensure_cian_identifiers(item)
        simplified = [
            {
                "id": item.get(OBJECT_ID_COLUMN) or item.get("id"),
                "address": item.get("address") or item.get("full_address"),
                "raw": item,
            }
            for item in items
        ]
        return {"items": simplified}
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc


@app.get("/api/moderation/count")
def moderation_count():
    try:
        count = supabase_client.count_records("objects", {"moderator": "eq.false"})
        return {"count": count}
    except HTTPError as exc:
        logging.warning("Не удалось получить очередь модерации: %s", exc)
        return {"count": 0, "detail": exc.response.text if exc.response else "Supabase error"}

@app.get("/api/objects/{object_id}")
def get_object(object_id: str):
    try:
        obj = supabase_client.get_object(object_id)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
    _ensure_cian_identifiers(obj)
    return obj


@app.patch("/api/objects/{object_id}")
def update_object(object_id: str, payload: Dict[str, Any]):
    if not payload or not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload должен быть объектом JSON")
    try:
        updated = supabase_client.update_object(object_id, payload)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Объект не найден")
    return updated


@app.delete("/api/objects/{object_id}")
def delete_object_route(object_id: str, mode: str = Query(default="delete")):
    mode = mode.lower()
    if mode not in {"delete", "relist", "owner"}:
        raise HTTPException(status_code=400, detail="mode должен быть delete, relist или owner")
    try:
        obj = supabase_client.get_object(object_id)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")

    owner_id = _resolve_owner_id(obj)

    try:
        deleted = supabase_client.delete_object(object_id)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Объект не найден")

    if owner_id:
        if mode == "delete":
            parsed_value = True
        elif mode == "relist":
            parsed_value = False
        else:
            parsed_value = "owner"
        try:
            supabase_client.update_record("owners", "id", owner_id, {"parsed": parsed_value})
        except HTTPError as exc:
            logging.warning("Не удалось обновить владельца %s: %s", owner_id, exc)

    return {"status": "ok", "mode": mode}


@app.get("/api/owners/{owner_id}")
def get_owner(owner_id: str):
    try:
        owner = supabase_client.get_record("owners", "id", owner_id)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not owner:
        raise HTTPException(status_code=404, detail="Владелец не найден")
    return owner


@app.get("/")
def index():
    return FileResponse(WEBAPP_DIR / "pages" / "home.html")


@app.get("/home.html")
def home_page():
    return FileResponse(WEBAPP_DIR / "pages" / "home.html")


@app.get("/cabinet.html")
def cabinet():
    return FileResponse(WEBAPP_DIR / "pages" / "cabinet.html")


@app.get("/stub.html")
def stub():
    return FileResponse(WEBAPP_DIR / "pages" / "stub.html")


@app.get("/search.html")
def search_page():
    return FileResponse(WEBAPP_DIR / "pages" / "search.html")


@app.get("/moderation.html")
@app.get("/moderation")
def moderation_page():
    return FileResponse(WEBAPP_DIR / "pages" / "moderation.html")


@app.get("/listings.html")
def listings_page():
    return FileResponse(WEBAPP_DIR / "pages" / "listings.html")


@app.get("/cian-report.html")
def cian_report_page():
    return FileResponse(WEBAPP_DIR / "pages" / "cian-report.html")


@app.get("/api/cian/order-info")
def cian_order_info():
    try:
        data = _call_cian("/v1/get-last-order-info")
        data["demo"] = False
    except RuntimeError:
        data = _cian_demo_order()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"CIAN API error: {exc}") from exc
    return data


@app.get("/api/cian/order-report")
def cian_order_report():
    try:
        data = _call_cian("/v1/get-order")
        data["demo"] = False
    except RuntimeError:
        data = _cian_demo_report()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"CIAN API error: {exc}") from exc
    else:
        notify_cian_problems(data)
    return data


@app.get("/api/cian/images-report")
def cian_images_report(page: int = Query(default=1, ge=1), page_size: int = Query(default=100, ge=1, le=500)):
    params = {"page": page, "pageSize": page_size}
    try:
        data = _call_cian("/v1/get-images-report", params=params)
        data["demo"] = False
    except RuntimeError:
        data = {
            "operationId": "demo-images",
            "result": {
                "items": [],
            },
            "demo": True,
        }
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"CIAN API error: {exc}") from exc
    return data


@app.post("/api/cian/status-sync")
def cian_status_sync_route():
    try:
        updated = sync_cian_statuses()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"CIAN API error: {exc}") from exc
    return {"updated": updated}


@app.post("/api/showings")
def create_showing(payload: Dict[str, Any]):
    object_id = payload.get("object_id")
    if not object_id:
        raise HTTPException(status_code=400, detail="object_id обязателен")
    owner_input = payload.get("owner") or {}
    client_input = payload.get("client") or {}
    schedule = payload.get("schedule") or {}
    if not schedule.get("date") or not schedule.get("time"):
        raise HTTPException(status_code=400, detail="Укажите дату и время показа")
    try:
        obj = supabase_client.get_object(str(object_id))
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
    _ensure_cian_identifiers(obj)

    owners_id = obj.get("owners_id") or obj.get("owner_id")
    owner_record: Optional[Dict[str, Any]] = None
    if owners_id:
        try:
            owner_record = supabase_client.get_record("owners", "id", owners_id)
        except HTTPError:
            owner_record = None

    address = obj.get("address") or obj.get("full_address") or obj.get("location") or "Адрес не указан"
    short_address = _short_address_label(address)
    schedule_label = f"{schedule.get('date')} · {schedule.get('time')}"

    owner_name = (
        owner_input.get("name")
        or (owner_record.get("name") if owner_record else None)
        or "—"
    )
    owner_phone_input = owner_input.get("phone")
    owner_phone_label = (
        owner_phone_input
        or (owner_record.get("phone") if owner_record else None)
        or "—"
    )

    lines = [
        "🎬 Новый показ",
        f"🏷️ ID: #{_escape_label(object_id)}",
        f"📍 {_escape_label(short_address)}",
        f"🗓 {_escape_label(schedule_label)}",
        "",
        "🧑‍💼 Собственник",
        f"{_escape_label(owner_name)} · {_escape_label(owner_phone_label)}",
    ]
    if owner_input.get("notes"):
        lines.append(f"📝 {_escape_label(owner_input['notes'])}")

    client_name = client_input.get("name") or "—"
    client_phone = client_input.get("phone") or "—"
    client_group_label = CLIENT_GROUP_LABELS.get(
        client_input.get("group"),
        client_input.get("group") or "—",
    )
    children_value = str(client_input.get("children") or "0").strip() or "0"
    pets_value = (client_input.get("pets") or "").strip().lower()
    pets_label = "Да" if pets_value in {"да", "yes", "true"} else "Нет"

    lines.extend(
        [
            "",
            "🧑‍🤝‍🧑 Клиент",
            f"{_escape_label(client_name)} · {_escape_label(client_phone)}",
            f"👥 {_escape_label(client_group_label)}",
            f"👶 Дети: {_escape_label(children_value)}",
            f"🐾 Питомцы: {_escape_label(pets_label)}",
        ]
    )
    if client_input.get("notes"):
        lines.append(f"📌 {_escape_label(client_input['notes'])}")

    cian_url = obj.get("cian_url") or _build_cian_listing_url(object_id)
    owner_url = owner_record.get("url") if owner_record else None
    if cian_url or owner_url:
        lines.append("")
    if cian_url:
        lines.append(f"🔗 <a href=\"{html.escape(cian_url)}\">Объявление</a>")
    if owner_url:
        lines.append(f"👤 <a href=\"{html.escape(owner_url)}\">Собственник</a>")

    send_showing_message("\n".join(lines))
    return {"status": "ok"}
def _digits(value: str) -> str:
    return "".join(ch for ch in str(value) if ch.isdigit())


def _item_price_matches(item: Dict[str, Any], digits: str) -> bool:
    if not digits:
        return False
    price_fields = ("price", "price_total", "price_rub", "price_month", "price_per_month")
    for field in price_fields:
        value = item.get(field)
        if value is None:
            continue
        value_digits = _digits(value)
        if not value_digits:
            continue
        if digits in value_digits:
            return True
    return False


def _resolve_owner_id(obj: Dict[str, Any]) -> Optional[str]:
    for key in ("owners_id", "owner_id", "ownersId", "ownerId"):
        value = obj.get(key)
        if value:
            return str(value)
    return None
