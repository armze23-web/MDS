import argparse
import csv
import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing {name} in .env")
    return value


BASE_URL = os.getenv("ZORT_BASE_URL", "https://open-api.zortout.com/v4")
DEFAULT_LIMIT = int(os.getenv("ZORT_DEFAULT_LIMIT", "500"))
HEADERS = {
    "storename": require_env("ZORT_STORE_NAME"),
    "apikey": require_env("ZORT_API_KEY"),
    "apisecret": require_env("ZORT_API_SECRET"),
    "accept": "application/json",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch ZORT movement orders by date")
    parser.add_argument("--after", required=True, help="Start date yyyy-MM-dd")
    parser.add_argument("--before", required=True, help="End date yyyy-MM-dd")
    args = parser.parse_args()

    try:
        movement_orders = get_all_movement_orders(args.after, args.before)
        rows = flatten_movement_orders(movement_orders)

        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)

        json_path = output_dir / f"movement_orders_{args.after}_to_{args.before}.json"
        csv_path = output_dir / f"movement_orders_flat_{args.after}_to_{args.before}.csv"

        json_path.write_text(json.dumps(movement_orders, ensure_ascii=False, indent=2), encoding="utf-8")
        write_csv(csv_path, rows)

        print(f"✅ Movement orders fetched: {len(movement_orders)}")
        print(f"✅ Product rows exported: {len(rows)}")
        print(f"📄 JSON: {json_path}")
        print(f"📊 CSV : {csv_path}")
    except requests.RequestException as exc:
        raise SystemExit(f"❌ Request failed: {exc}") from exc
    except Exception as exc:
        raise SystemExit(f"❌ Failed: {exc}") from exc


def get_all_movement_orders(date_after: str, date_before: str) -> list[dict]:
    all_items = []
    page = 1
    total_count = None

    while total_count is None or len(all_items) < total_count:
        data = get_movement_orders_page(date_after, date_before, DEFAULT_LIMIT, page)
        items = extract_list(data)
        count = data.get("count") or data.get("data", {}).get("count") or len(items)
        total_count = int(count) if count else len(all_items) + len(items)

        all_items.extend(items)
        print(f"Page {page}: {len(items)} rows, total {len(all_items)}/{total_count}")

        if not items or len(items) < DEFAULT_LIMIT:
            break
        page += 1

    return all_items


def get_movement_orders_page(date_after: str, date_before: str, limit: int, page: int) -> dict:
    response = requests.get(
        f"{BASE_URL}/Order/GetMovementOrders",
        headers=HEADERS,
        params={"dateafter": date_after, "datebefore": date_before, "limit": limit, "page": page},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def extract_list(data):
    if isinstance(data, list):
        return data
    if isinstance(data.get("list"), list):
        return data["list"]
    if isinstance(data.get("data"), list):
        return data["data"]
    if isinstance(data.get("data"), dict) and isinstance(data["data"].get("list"), list):
        return data["data"]["list"]
    return []


def flatten_movement_orders(movement_orders: list[dict]) -> list[dict]:
    rows = []
    for order in movement_orders:
        for item in order.get("list", []):
            rows.append(
                {
                    "order_id": pick(order, ["orderid", "orderId", "id"]),
                    "action_date": pick(order, ["actionDateString", "actiondateString", "actiondate"]),
                    "product_id": pick(item, ["productid", "productId"]),
                    "product_sku": pick(item, ["sku", "productsku", "productSku"]),
                    "product_name": pick(item, ["name", "productname", "productName"]),
                    "quantity": pick(item, ["number", "quantity", "qty"]),
                    "unit_price": pick(item, ["pricepernumber", "pricePerNumber", "unitprice"]),
                    "discount": pick(item, ["discount"]),
                    "line_total": pick(item, ["totalprice", "totalPrice", "linetotal"]),
                }
            )
    return rows


def pick(source: dict, keys: list[str]):
    for key in keys:
        value = source.get(key)
        if value is not None:
            return value
    return ""


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return

    with path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
