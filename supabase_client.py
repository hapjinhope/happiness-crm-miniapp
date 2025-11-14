import requests
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from requests.exceptions import HTTPError


def build_headers(api_key: str) -> Dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@dataclass
class SupabaseClient:
    base_url: str
    api_key: str
    table: str = "objects"
    object_id_column: str = "id"
    session: requests.Session = field(default_factory=requests.Session)

    def _rest_url(self) -> str:
        return self.base_url.rstrip("/") + f"/rest/v1/{self.table}"

    def get_object(self, object_id: str, object_id_column: Optional[str] = None) -> Optional[Dict[str, Any]]:
        column = object_id_column or self.object_id_column
        params = {column: f"eq.{object_id}", "select": "*"}
        response = self.session.get(self._rest_url(), headers=build_headers(self.api_key), params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None

    def get_record(self, table: str, column: str, value: Any) -> Optional[Dict[str, Any]]:
        url = self.base_url.rstrip("/") + f"/rest/v1/{table}"
        params = {column: f"eq.{value}", "select": "*", "limit": 1}
        response = self.session.get(url, headers=build_headers(self.api_key), params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None

    def update_object(self, object_id: str, payload: Dict[str, Any], object_id_column: Optional[str] = None) -> Dict[str, Any]:
        column = object_id_column or self.object_id_column
        headers = build_headers(self.api_key)
        headers["Prefer"] = "return=representation"
        response = self.session.patch(
            self._rest_url(),
            headers=headers,
            params={column: f"eq.{object_id}"},
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else payload

    def update_record(self, table: str, column: str, value: Any, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        url = self.base_url.rstrip("/") + f"/rest/v1/{table}"
        headers = build_headers(self.api_key)
        headers["Prefer"] = "return=representation"
        response = self.session.patch(
            url,
            headers=headers,
            params={column: f"eq.{value}"},
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None

    def delete_object(self, object_id: str, object_id_column: Optional[str] = None) -> bool:
        column = object_id_column or self.object_id_column
        headers = build_headers(self.api_key)
        headers["Prefer"] = "return=representation"
        response = self.session.delete(
            self._rest_url(),
            headers=headers,
            params={column: f"eq.{object_id}"},
            timeout=15,
        )
        if response.status_code not in (200, 204):
            response.raise_for_status()
        if response.status_code == 204 or not response.content:
            return True
        return bool(response.json())

    def list_objects(
        self,
        search: Optional[str] = None,
        limit: int = 50,
        select: str = "*",
        filters: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        base_params: Dict[str, Any] = {
            "select": select,
            "limit": limit,
            "order": "updated_at.desc.nullslast",
        }

        def fetch(extra_params: Dict[str, Any]) -> List[Dict[str, Any]]:
            params = base_params.copy()
            params.update(extra_params)
            if filters:
                params.update(filters)
            response = self.session.get(
                self._rest_url(),
                headers=build_headers(self.api_key),
                params=params,
                timeout=15,
            )
            response.raise_for_status()
            return response.json()

        if not search:
            return fetch({})

        term = search.strip()
        term_digits = _digits(term)
        like_term = term.replace(",", "").replace(" ", "%")
        aggregated: Dict[str, Dict[str, Any]] = {}

        def add_items(items: List[Dict[str, Any]]):
            for item in items:
                key = str(item.get(self.object_id_column) or item.get("id") or len(aggregated))
                aggregated[key] = item

        # exact ID match
        try:
            if term:
                add_items(fetch({self.object_id_column: f"eq.{term}"}))
        except HTTPError as exc:
            if exc.response.status_code not in (400, 404):
                raise

        # fuzzy address/full address search
        for column in ("address", "full_address", "complex_name"):
            try:
                add_items(fetch({column: f"ilike.*{like_term}*"}))
            except HTTPError as exc:
                if exc.response.status_code not in (400, 404):
                    raise

        if not aggregated and term_digits:
            fallback_items = fetch({})
            for item in fallback_items:
                if _item_price_matches(item, term_digits):
                    key = str(item.get(self.object_id_column) or item.get("id") or len(aggregated))
                    aggregated[key] = item

        if aggregated:
            return list(aggregated.values())[:limit]

        # fallback to default listing if nothing matched
        return fetch({})

    def count_records(self, table: str, filters: Optional[Dict[str, str]] = None) -> int:
        url = self.base_url.rstrip("/") + f"/rest/v1/{table}"
        headers = build_headers(self.api_key)
        headers["Prefer"] = "count=exact"
        params = {"select": "id", "limit": 1}
        if filters:
            params.update(filters)
        response = self.session.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        content_range = response.headers.get("Content-Range")
        if content_range and "/" in content_range:
            try:
                return int(content_range.split("/")[-1])
            except ValueError:
                pass
        return len(response.json())
def _digits(value: Any) -> str:
    return "".join(ch for ch in str(value) if ch.isdigit())


def _item_price_matches(item: Dict[str, Any], digits: str) -> bool:
    if not digits:
        return False
    for field in ("price", "price_total", "price_rub", "price_month"):
        value = item.get(field)
        if value is None:
            continue
        value_digits = _digits(value)
        if value_digits and digits in value_digits:
            return True
    return False
