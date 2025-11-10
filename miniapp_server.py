import os
from collections import OrderedDict
import logging
from pathlib import Path
from typing import Any, Dict, Optional

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


def sync_cian_statuses() -> int:
    data = _call_cian("/v1/get-order")
    offers = data.get("result", {}).get("offers") or []
    updated = 0
    for offer in offers:
        external_id = offer.get("externalId") or offer.get("offerId")
        if not external_id:
            continue
        status = _map_cian_status(offer.get("status"))
        if not status:
            continue
        try:
            supabase_client.update_object(str(external_id), {"status": status})
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


@app.get("/api/objects")
def list_objects(q: Optional[str] = Query(default=None, description="Поиск по ID или адресу"), limit: int = 100):
    try:
        aggregated: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()

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

            all_items = supabase_client.list_objects(limit=min(limit, 200))
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
            data = supabase_client.list_objects(limit=min(limit, 200))

        simplified = [
            {
                "id": item.get(OBJECT_ID_COLUMN) or item.get("id"),
                "address": item.get("address") or item.get("full_address"),
                "price": item.get("price") or item.get("price_total") or item.get("price_rub"),
                "raw": item,
            }
            for item in data
        ]
        return {"items": simplified}
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    except RequestsConnectionError as exc:
        raise HTTPException(status_code=502, detail="Не удалось подключиться к Supabase") from exc


@app.get("/api/objects/{object_id}")
def get_object(object_id: str):
    try:
        obj = supabase_client.get_object(object_id)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
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
def delete_object_route(object_id: str):
    try:
        deleted = supabase_client.delete_object(object_id)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ошибка Supabase: {exc.response.text}") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Объект не найден")
    return {"status": "ok"}


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
    return FileResponse(WEBAPP_DIR / "cabinet.html")


@app.get("/cabinet.html")
def cabinet():
    return FileResponse(WEBAPP_DIR / "cabinet.html")


@app.get("/stub.html")
def stub():
    return FileResponse(WEBAPP_DIR / "stub.html")


@app.get("/search.html")
def search_page():
    return FileResponse(WEBAPP_DIR / "search.html")


@app.get("/listings.html")
def listings_page():
    return FileResponse(WEBAPP_DIR / "listings.html")


@app.get("/cian-report.html")
def cian_report_page():
    return FileResponse(WEBAPP_DIR / "cian-report.html")


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
