#!/usr/bin/env python3
"""
Utility to simulate публикация ссылок и проверить, есть ли объект в Supabase.

Пример:
    python3 scripts/test_publish.py https://www.cian.ru/rent/flat/323550893/

Опции:
    --reset-owner OWNER_ID   Сбросить для указанного владельца поле parsed=false.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from typing import Optional

import requests


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OBJECT_ID_COLUMN = os.getenv("SUPABASE_OBJECT_ID_COLUMN", "id")
OWNERS_TABLE = "owners"
OBJECTS_TABLE = "objects"


def require_env(name: str, value: Optional[str]) -> str:
    if not value:
        raise SystemExit(f"{name} is not set. Please export it or add to .env.")
    return value


SUPABASE_URL = require_env("SUPABASE_URL", SUPABASE_URL).rstrip("/")
SUPABASE_KEY = require_env("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_KEY)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


ALLOWED_DOMAINS = ("cian.ru", "avito.ru")


def extract_listing_id(url: str) -> str:
    match = re.search(r"(\d{5,})", url)
    if not match:
        raise ValueError("Не удалось найти ID в ссылке")
    return match.group(1)


def fetch_object(listing_id: str) -> Optional[dict]:
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{OBJECTS_TABLE}",
        params={OBJECT_ID_COLUMN: f"eq.{listing_id}", "select": "*"},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return data[0] if data else None


def reset_owner(parsed_owner_id: str) -> None:
    print(f"Устанавливаю parsed=false для владельца {parsed_owner_id} ...")
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{OWNERS_TABLE}",
        params={"id": f"eq.{parsed_owner_id}"},
        headers={**HEADERS, "Prefer": "return=representation"},
        json={"parsed": False},
        timeout=15,
    )
    resp.raise_for_status()
    print("Готово. Ответ:", resp.json())


def main() -> None:
    parser = argparse.ArgumentParser(description="Проверка ссылки для публикации.")
    parser.add_argument("url", help="Ссылка на CIAN/Avito")
    parser.add_argument(
        "--reset-owner",
        metavar="OWNER_ID",
        help="Опционально: сбросить parsed=false для указанного владельца",
    )
    args = parser.parse_args()

    parsed = re.search(r"https?://([^/]+)/", args.url)
    if not parsed or not parsed.group(1).endswith(ALLOWED_DOMAINS):
        domain = parsed.group(1) if parsed else args.url
        print(f"⚠️  Домен {domain} не поддерживается (допустимы {', '.join(ALLOWED_DOMAINS)})")
        sys.exit(1)

    try:
        listing_id = extract_listing_id(args.url)
    except ValueError as err:
        print("⚠️ ", err)
        sys.exit(1)

    obj = fetch_object(listing_id)
    if not obj:
        print(f"✅ Объект с ID {listing_id} не найден в Supabase — можно публиковать.")
    else:
        owner_id = obj.get("owners_id") or obj.get("owner_id") or "не указан"
        parsed_state = obj.get("parsed")
        print(
            f"❌ Объект с ID {listing_id} уже существует. "
            f"Owner ID: {owner_id}. parsed={parsed_state}"
        )

    if args.reset_owner:
        reset_owner(args.reset_owner)


if __name__ == "__main__":
    main()
