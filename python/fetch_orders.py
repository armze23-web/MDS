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
HEADERS = {
    "storename": require_env("ZORT_STORE_NAME"),
    "apikey": require_env("ZORT_API_KEY"),
    "apisecret": require_env("ZORT_API_SECRET"),
    "accept": "application/json",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch ZORT orders by order date")
    parser.add_argument("--after", required=True, help="Start date yyyy-MM-dd")
    parser.add_argument("--before", required=True, help="End date yyyy-MM-dd")
    args = parser.parse_args()

    try:
        data = get_orders(args.after, args.before)
        orders = extract_list(data)
        rows = [flatten_order(order) for order in orders]

        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)

        json_path = output_dir / f"orders_{args.after}_to_{args.before}.json"
        csv_path = output_dir / f"orders_flat_{args.after}_to_{args.before}.csv"

        json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        write_csv(csv_path, rows)

        print(f"✅ Orders fetched: {len(orders)}")
        print(f"📄 JSON: {json_path}")
        print(f"📊 CSV : {csv_path}")
    except requests.RequestException as exc:
        raise SystemExit(f"❌ Request failed: {exc}") from exc
    except Exception as exc:
        raise SystemExit(f"❌ Failed: {exc}") from exc


def get_orders(date_after: str, date_before: str) -> dict:
    response = requests.get(
        f"{BASE_URL}/Order/GetOrders",
        headers=HEADERS,
        params={"orderdateafter": date_after, "orderdatebefore": date_before},
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


def flatten_order(order: dict) -> dict:
    return {
        "order_id": pick(order, ["id", "orderid", "orderId"]),
        "order_number": pick(order, ["number", "ordernumber", "orderNumber"]),
        "order_date": pick(order, ["orderdate", "orderDate", "orderdateString", "date"]),
        "sales_channel": pick(order, ["saleschannel", "salesChannel", "channel", "platform", "marketplacename"]),
        "customer_province": pick(order, ["customerprovince", "customerProvince", "province", "shipprovince"]),
        "created_by": pick(order, ["createusername", "createdBy", "createUserName", "userName"]),
        "total_amount": pick(order, ["amount", "totalamount", "totalAmount", "grandtotal"]),
    }


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
