import html
import json
import logging
import os
import re
import threading
from dataclasses import dataclass
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from telegram import (BotCommand, InlineKeyboardButton, InlineKeyboardMarkup,
                      KeyboardButton, Message, ReplyKeyboardMarkup, Update,
                      WebAppInfo)
from telegram.constants import ParseMode
from telegram.ext import (Application, CallbackQueryHandler, CommandHandler,
                          ContextTypes, MessageHandler, filters)
from telegram.request import HTTPXRequest

from supabase_client import SupabaseClient

try:
    import uvicorn
except ImportError:  # pragma: no cover
    uvicorn = None  # type: ignore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

APP_VERSION = "0.1.0-beta.3"

REQUEST_ID_CALLBACK = "request_id"
REQUEST_COMMANDS = ("id", "o", "object")
MENU_BUTTON_LABEL = "🔍 Найти объект"
MENU_REPLY_KEYBOARD = ReplyKeyboardMarkup(
    [[KeyboardButton(MENU_BUTTON_LABEL)]],
    resize_keyboard=True,
    one_time_keyboard=False,
)
EMOJI_BULLET = "•"

IDENTITY_FIELDS = [
    ("ID", ("external_id", "id"), None),
    ("Тип", ("object_type", "category"), None),
    ("Статус", ("status", "state"), None),
]

APARTMENT_FIELDS = [
    ("Комнаты", ("rooms", "room_count", "rooms_count"), None),
    ("Общая площадь", ("area", "square", "square_total"), "area"),
    ("Жилая площадь", ("living_area", "square_living"), "area"),
    ("Кухня", ("kitchen_area", "square_kitchen"), "area"),
    ("Высота потолка", ("ceiling_height",), "height"),
    ("Этаж", ("floor", "floor_number"), None),
    ("Планировка", ("layout", "plan"), None),
    ("Состояние", ("condition", "repair"), None),
    ("Мебель", ("furniture",), None),
    ("Техника", ("appliances", "equipment"), None),
]

BUILDING_FIELDS = [
    ("ЖК", ("complex", "residential_complex", "project_name"), None),
    ("Корпус/Секция", ("corpus", "section", "building_section"), None),
    ("Тип дома", ("building_type", "house_type"), None),
    ("Год постройки", ("year_built", "built_year"), None),
    ("Срок сдачи", ("deadline", "handover_date", "ready_quarter"), None),
    ("Этажность", ("floors", "floors_total", "max_floor"), None),
    ("Лифты", ("lifts", "elevators", "elevator"), None),
    ("Паркинг", ("parking", "parking_type", "parking_info"), None),
    ("Отделка", ("finishing", "finish"), None),
    ("Территория", ("territory", "security"), None),
]

LOCATION_FIELDS = [
    ("Адрес", ("address", "location", "full_address"), None),
    ("Город", ("city", "town", "locality"), None),
    ("Район", ("district", "area", "okrug"), None),
    ("Метро", ("metro", "subway", "metro_station"), None),
    ("До метро", ("distance_to_metro", "metro_time"), None),
    ("Координаты", ("coords", "coordinates"), None),
]

CONDITION_FIELDS = [
    ("Цена", ("price", "price_total", "price_rub"), "price"),
    ("Цена за м²", ("price_per_m2", "price_m2"), "price"),
    ("Залог", ("deposit", "pledge"), "price"),
    ("Комиссия", ("commission", "fee"), "price"),
    ("Ипотека", ("mortgage", "installment"), None),
    ("Условия", ("conditions", "terms"), None),
    ("Доступно с", ("available_from", "available_date"), None),
    ("Минимальный срок", ("min_term", "min_rent_term"), None),
]

CONTACT_NAME_KEYS = ("contact_name", "agent_name", "manager_name")
CONTACT_PHONE_KEYS = ("contact_phone", "phone", "agent_phone", "manager_phone")
LINK_KEYS = ("url", "link", "listing_url")
EXCLUDED_EXTRA_KEYS = {
    "description",
    "short_description",
    "comment",
    "notes",
    "images",
    "photos",
    "gallery",
    "image_urls",
    "photo_urls",
    "img_urls",
}
EXCLUDED_KEY_CONTAINS = ("description", "photo", "image", "img")


def ensure_env() -> Dict[str, str]:
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    object_id_column = os.getenv("SUPABASE_OBJECT_ID_COLUMN", "id")
    telegram_proxy = os.getenv("TELEGRAM_PROXY_URL") or None
    telegram_timeout = os.getenv("TELEGRAM_CONNECT_TIMEOUT")
    webapp_url = os.getenv("TELEGRAM_WEBAPP_URL") or None
    webapp_autostart = os.getenv("WEBAPP_AUTOSTART", "false").lower() in {"1", "true", "yes"}
    webapp_host = os.getenv("WEBAPP_HOST", "0.0.0.0")
    webapp_port = int(os.getenv("WEBAPP_PORT", "8000"))
    missing = [
        name
        for name, value in [
            ("TELEGRAM_BOT_TOKEN", telegram_token),
            ("SUPABASE_URL", supabase_url),
            ("SUPABASE_SERVICE_ROLE_KEY", supabase_key),
        ]
        if not value
    ]
    if missing:
        raise RuntimeError(
            "Missing environment variables: " + ", ".join(missing)
        )
    timeout_value: Optional[float] = None
    if telegram_timeout:
        try:
            timeout_value = float(telegram_timeout)
        except ValueError as exc:
            raise RuntimeError("TELEGRAM_CONNECT_TIMEOUT must be a number") from exc
    return {
        "TELEGRAM_BOT_TOKEN": telegram_token,
        "SUPABASE_URL": supabase_url,
        "SUPABASE_SERVICE_ROLE_KEY": supabase_key,
        "SUPABASE_OBJECT_ID_COLUMN": object_id_column,
        "TELEGRAM_PROXY_URL": telegram_proxy,
        "TELEGRAM_CONNECT_TIMEOUT": timeout_value,
        "TELEGRAM_WEBAPP_URL": webapp_url,
        "WEBAPP_AUTOSTART": webapp_autostart,
        "WEBAPP_HOST": webapp_host,
        "WEBAPP_PORT": webapp_port,
    }


@dataclass
class BotConfig:
    telegram_token: str
    supabase_url: str
    supabase_key: str
    object_id_column: str
    telegram_proxy_url: Optional[str]
    telegram_connect_timeout: Optional[float]
    telegram_webapp_url: Optional[str]
    webapp_autostart: bool
    webapp_host: str
    webapp_port: int


def _stringify_value(value: Any) -> str:
    if isinstance(value, bool):
        return "Да" if value else "Нет"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        parts = []
        for k, v in value.items():
            if v in (None, "", []):
                continue
            parts.append(f"{k}: {_stringify_value(v)}")
        return "; ".join(parts) if parts else ""
    if isinstance(value, (list, tuple, set)):
        parts = [_stringify_value(v) for v in value if v not in (None, "", [])]
        return ", ".join(filter(None, parts))
    return str(value)


def _take_value(obj: Dict[str, Any], keys: tuple[str, ...], used_keys: set[str]) -> Optional[Any]:
    for key in keys:
        if key in obj:
            value = obj[key]
            if value not in (None, "", []):
                used_keys.add(key)
                return value
    return None


def _format_price(value: Any) -> str:
    number = _to_float(value)
    if number is None:
        return _stringify_value(value)
    return f"{int(round(number)):,}".replace(",", " ") + " ₽"


def _format_area(value: Any) -> str:
    number = _to_float(value)
    if number is None:
        return _stringify_value(value)
    return f"{number:.1f}".rstrip("0").rstrip(".") + " м²"


def _format_height(value: Any) -> str:
    number = _to_float(value)
    if number is None:
        return _stringify_value(value)
    return f"{number:.2f}".rstrip("0").rstrip(".") + " м"


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[^\d.,-]", "", value)
        if not cleaned:
            return None
        cleaned = cleaned.replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def build_object_summary(obj: Dict[str, Any]) -> str:
    lines: list[str] = []
    used_keys: set[str] = set()
    title = _take_value(
        obj,
        ("title", "name", "headline", "project_name"),
        used_keys,
    )
    if title:
        lines.append(f"🏡 <b>{html.escape(str(title))}</b>")

    identity_lines: list[str] = []
    for label, keys, _ in IDENTITY_FIELDS:
        value = _take_value(obj, keys, used_keys)
        if value in (None, "", []):
            continue
        identity_lines.append(f"{EMOJI_BULLET} <b>{label}:</b> {html.escape(_stringify_value(value))}")
    if identity_lines:
        if lines:
            lines.append("")
        lines.extend(identity_lines)

    def append_section(title_label: str, fields: list[tuple[str, tuple[str, ...], Optional[str]]]) -> None:
        section_lines: list[str] = []
        for label, keys, formatter in fields:
            value = _take_value(obj, keys, used_keys)
            if value in (None, "", []):
                continue
            if formatter == "price":
                formatted = _format_price(value)
            elif formatter == "area":
                formatted = _format_area(value)
            elif formatter == "height":
                formatted = _format_height(value)
            else:
                formatted = _stringify_value(value)
            section_lines.append(f"{EMOJI_BULLET} <b>{label}:</b> {html.escape(formatted)}")
        if section_lines:
            if lines:
                lines.append("")
            lines.append(f"<b>{title_label}</b>")
            lines.extend(section_lines)

    append_section("🏠 Квартира", APARTMENT_FIELDS)
    append_section("🏢 Дом / ЖК", BUILDING_FIELDS)
    append_section("📍 Локация", LOCATION_FIELDS)
    append_section("💰 Условия", CONDITION_FIELDS)

    contact_name = _take_value(obj, CONTACT_NAME_KEYS, used_keys)
    contact_phone = _take_value(obj, CONTACT_PHONE_KEYS, used_keys)
    if contact_name or contact_phone:
        if lines:
            lines.append("")
        contact_line = "<b>Контакт:</b> "
        parts = []
        if contact_name:
            parts.append(str(contact_name))
        if contact_phone:
            parts.append(str(contact_phone))
        contact_line += html.escape(" • ".join(parts))
        lines.append(contact_line)

    link = _take_value(obj, LINK_KEYS, used_keys)
    if link:
        if lines:
            lines.append("")
        lines.append(f"<b>Ссылка:</b> {html.escape(str(link))}")

    extra_lines: list[str] = []
    for key, value in obj.items():
        if key in used_keys:
            continue
        lowered = key.lower()
        if lowered in EXCLUDED_EXTRA_KEYS or any(part in lowered for part in EXCLUDED_KEY_CONTAINS):
            continue
        if value in (None, "", []):
            continue
        extra_lines.append(f"{EMOJI_BULLET} <b>{key}:</b> {html.escape(_stringify_value(value))}")
    if extra_lines:
        if lines:
            lines.append("")
        lines.append("<b>📋 Дополнительно</b>")
        lines.extend(extra_lines)

    if not lines:
        return "<i>Нет данных для отображения</i>"
    return "\n".join(lines)


def build_object_response(obj: Dict[str, Any]) -> str:
    return build_object_summary(obj)


config: Optional[BotConfig] = None
supabase_client: Optional[SupabaseClient] = None
user_states: Dict[int, Dict[str, Any]] = {}


def maybe_start_webapp_server() -> None:
    if not config or not config.webapp_autostart:
        return
    if uvicorn is None:
        logger.warning("WEBAPP_AUTOSTART=true, но uvicorn не установлен. Установите uvicorn, чтобы автозапускать мини-приложение.")
        return
    logger.info(
        "Starting mini app server on %s:%s (autostart enabled)",
        config.webapp_host,
        config.webapp_port,
    )
    uvicorn_config = uvicorn.Config(
        "miniapp_server:app",
        host=config.webapp_host,
        port=config.webapp_port,
        reload=False,
        log_level="info",
    )
    server = uvicorn.Server(uvicorn_config)
    thread = threading.Thread(target=server.run, name="miniapp-server", daemon=True)
    thread.start()


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return
    inline_keyboard = [[InlineKeyboardButton(MENU_BUTTON_LABEL, callback_data=REQUEST_ID_CALLBACK)]]
    await message.reply_text(
        "Привет! Нажми «🔍 Найти объект», введи /object или просто отправь ID объекта.",
        reply_markup=InlineKeyboardMarkup(inline_keyboard),
    )
    await message.reply_text(
        "Меню всегда под рукой на клавиатуре ниже 👇",
        reply_markup=MENU_REPLY_KEYBOARD,
    )


async def request_id_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return
    user_states[update.effective_user.id] = {"state": "awaiting_object_id"}
    await prompt_object_id_entry(message)


async def open_webapp(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return
    if not config or not config.telegram_webapp_url:
        await message.reply_text("URL мини-приложения не настроен.")
        return
    button = InlineKeyboardButton(
        text="Открыть HAPPINESS CRM",
        web_app=WebAppInfo(url=config.telegram_webapp_url),
    )
    await message.reply_text(
        "Открой мини-приложение, чтобы просмотреть объекты списком:",
        reply_markup=InlineKeyboardMarkup([[button]]),
    )


async def post_init(application: Application) -> None:
    await application.bot.set_my_commands(
        [
            BotCommand("start", "Приветствие и меню"),
            BotCommand("menu", "Быстро открыть меню"),
            BotCommand("object", "Найти объект по ID"),
            BotCommand("app", "Открыть мини-приложение"),
        ]
    )


async def ask_for_object_id(update: Update) -> None:
    await update.message.reply_text(
        "Не нашёл объект. Убедись, что ID существует и попробуй снова."
    )


async def prompt_object_id_entry(message: Message) -> None:
    if message:
        await message.reply_text("✏️ Отправь ID объекта (например, external_id из Supabase).")


async def handle_object_request(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    state = user_states.get(user_id)
    text = update.message.text.strip()

    if text == MENU_BUTTON_LABEL:
        await request_id_command(update, context)
        return

    if supabase_client is None:
        await update.message.reply_text("Supabase клиент не инициализирован.")
        return

    if state and state.get("state") == "awaiting_edit_payload":
        object_id = state["object_id"]
        await process_edit_payload(update, object_id, text)
        user_states.pop(user_id, None)
        return

    object_id = text
    try:
        obj = supabase_client.get_object(object_id, config.object_id_column)
    except Exception as exc:
        logger.exception("Error fetching object")
        await update.message.reply_text(f"Ошибка запроса: {exc}")
        return

    if not obj:
        await ask_for_object_id(update)
        return

    preview_text = build_object_response(obj)
    keyboard = [[
        InlineKeyboardButton("Редактировать", callback_data=f"edit:{object_id}"),
        InlineKeyboardButton("Удалить", callback_data=f"delete:{object_id}"),
    ]]
    await update.message.reply_text(
        text=preview_text,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.HTML,
    )


async def process_edit_payload(update: Update, object_id: str, payload_text: str) -> None:
    if supabase_client is None:
        await update.message.reply_text("Supabase клиент не инициализирован.")
        return
    try:
        payload = json.loads(payload_text)
        if not isinstance(payload, dict):
            raise ValueError("Payload must be a JSON object")
    except Exception as exc:
        await update.message.reply_text(f"Не смог прочитать JSON: {exc}. Попробуй ещё раз.")
        return

    try:
        updated = supabase_client.update_object(object_id, payload, config.object_id_column)
    except Exception as exc:
        logger.exception("Error updating object")
        await update.message.reply_text(f"Ошибка обновления: {exc}")
        return

    preview_text = build_object_response(updated)
    await update.message.reply_text(
        text="Обновлено:\n" + preview_text,
        parse_mode=ParseMode.HTML,
    )


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    data = query.data
    if not data:
        return

    if data == REQUEST_ID_CALLBACK:
        user_states[query.from_user.id] = {"state": "awaiting_object_id"}
        await prompt_object_id_entry(query.message)
        return

    if supabase_client is None:
        await query.edit_message_text("Supabase клиент не инициализирован.")
        return

    if data.startswith("edit:"):
        object_id = data.split(":", 1)[1]
        user_states[query.from_user.id] = {"state": "awaiting_edit_payload", "object_id": object_id}
        await query.edit_message_text(
            text=f"Отправь JSON с полями для обновления объекта {object_id}."
        )
        return

    if data.startswith("delete:"):
        object_id = data.split(":", 1)[1]
        keyboard = [
            [InlineKeyboardButton("Да, удалить", callback_data=f"delete_confirm:{object_id}")],
            [InlineKeyboardButton("Отмена", callback_data=f"delete_cancel:{object_id}")],
        ]
        await query.edit_message_reply_markup(reply_markup=InlineKeyboardMarkup(keyboard))
        return

    if data.startswith("delete_confirm:"):
        object_id = data.split(":", 1)[1]
        try:
            deleted = supabase_client.delete_object(object_id, config.object_id_column)
        except Exception as exc:
            logger.exception("Error deleting object")
            await query.edit_message_text(f"Ошибка удаления: {exc}")
            return

        if deleted:
            await query.edit_message_text(f"Объект {object_id} удалён.")
        else:
            await query.edit_message_text(f"Объект {object_id} не найден.")
        return

    if data.startswith("delete_cancel:"):
        object_id = data.split(":", 1)[1]
        obj = supabase_client.get_object(object_id, config.object_id_column)
        if obj:
            preview_text = build_object_response(obj)
            keyboard = [[
                InlineKeyboardButton("Редактировать", callback_data=f"edit:{object_id}"),
                InlineKeyboardButton("Удалить", callback_data=f"delete:{object_id}"),
            ]]
            await query.edit_message_text(
                text=preview_text,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode=ParseMode.HTML,
            )
        else:
            await query.edit_message_text("Объект больше не существует.")
        return


def main() -> None:
    env = ensure_env()
    global config, supabase_client
    config = BotConfig(
        telegram_token=env["TELEGRAM_BOT_TOKEN"],
        supabase_url=env["SUPABASE_URL"],
        supabase_key=env["SUPABASE_SERVICE_ROLE_KEY"],
        object_id_column=env["SUPABASE_OBJECT_ID_COLUMN"],
        telegram_proxy_url=env["TELEGRAM_PROXY_URL"],
        telegram_connect_timeout=env["TELEGRAM_CONNECT_TIMEOUT"],
        telegram_webapp_url=env["TELEGRAM_WEBAPP_URL"],
        webapp_autostart=env["WEBAPP_AUTOSTART"],
        webapp_host=env["WEBAPP_HOST"],
        webapp_port=env["WEBAPP_PORT"],
    )
    supabase_client = SupabaseClient(
        base_url=config.supabase_url,
        api_key=config.supabase_key,
        object_id_column=config.object_id_column,
    )
    maybe_start_webapp_server()

    request_kwargs: Dict[str, Any] = {}
    if config.telegram_proxy_url:
        request_kwargs["proxy"] = config.telegram_proxy_url
    if config.telegram_connect_timeout:
        request_kwargs["connect_timeout"] = config.telegram_connect_timeout

    application_builder = Application.builder().token(config.telegram_token)
    if request_kwargs:
        application_builder = application_builder.request(HTTPXRequest(**request_kwargs))
    application = application_builder.build()

    application.post_init = post_init

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("menu", start))
    application.add_handler(CommandHandler("app", open_webapp))
    application.add_handler(CommandHandler(list(REQUEST_COMMANDS), request_id_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_object_request))
    application.add_handler(CallbackQueryHandler(handle_callback))

    logger.info("Bot is starting...")
    application.run_polling()


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped")
