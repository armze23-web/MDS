import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_ENV_PATH = path.resolve(process.cwd(), '..', '.env');
await import('dotenv').then(({ config }) => config({ path: ROOT_ENV_PATH }));

const config = getConfig();
const args = parseArgs(process.argv.slice(2));
const dateAfter = args.after;
const dateBefore = args.before;
const limit = Number(process.env.ZORT_DEFAULT_LIMIT ?? 500);
const source = process.env.ZORT_SOURCE ?? 'zort';

if (!dateAfter || !dateBefore) {
  console.error('Usage: npm run movement -- --after=2026-05-01 --before=2026-05-31');
  process.exit(1);
}

try {
  const movementOrders = await getAllMovementOrders({ dateAfter, dateBefore, limit });
  const rows = flattenMovementOrders(movementOrders);

  await fs.mkdir('output', { recursive: true });
  const jsonPath = `output/movement_orders_${dateAfter}_to_${dateBefore}.json`;
  const csvPath = `output/movement_orders_flat_${dateAfter}_to_${dateBefore}.csv`;

  await fs.writeFile(jsonPath, JSON.stringify(movementOrders, null, 2), 'utf8');
  await fs.writeFile(csvPath, toCsv(rows), 'utf8');

  console.log(`✅ Movement orders fetched: ${movementOrders.length}`);
  console.log(`✅ Product rows exported: ${rows.length}`);
  console.log(`📄 JSON: ${jsonPath}`);
  console.log(`📊 CSV : ${csvPath}`);
} catch (error) {
  console.error('❌ Fetch failed:', error.message);
  process.exit(1);
}

function getConfig() {
  const required = ['ZORT_STORE_NAME', 'ZORT_API_KEY', 'ZORT_API_SECRET'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
  }

  return {
    baseUrl: process.env.ZORT_BASE_URL ?? 'https://open-api.zortout.com/v4',
    storeName: process.env.ZORT_STORE_NAME,
    apiKey: process.env.ZORT_API_KEY,
    apiSecret: process.env.ZORT_API_SECRET,
  };
}

async function getAllMovementOrders({ dateAfter, dateBefore, limit }) {
  const all = [];
  let page = 1;
  let totalCount = Infinity;

  while (all.length < totalCount) {
    const data = await getMovementOrdersPage({ dateAfter, dateBefore, limit, page });
    const list = extractList(data);
    const count = Number(data.count ?? data.data?.count ?? list.length);

    all.push(...list);
    totalCount = count || all.length;

    console.log(`Page ${page}: ${list.length} rows, total ${all.length}/${totalCount}`);

    if (list.length === 0 || list.length < limit) break;
    page += 1;
  }

  return all;
}

async function getMovementOrdersPage({ dateAfter, dateBefore, limit, page }) {
  const url = new URL(`${config.baseUrl}/Order/GetMovementOrders`);
  url.searchParams.set('dateafter', dateAfter);
  url.searchParams.set('datebefore', dateBefore);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', String(page));

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      storename: config.storeName,
      apikey: config.apiKey,
      apisecret: config.apiSecret,
      accept: 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 300)}`);
  }
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.list)) return data.data.list;
  return [];
}

function flattenMovementOrders(movementOrders) {
  const rows = [];

  for (const order of movementOrders) {
    const productList = Array.isArray(order.list) ? order.list : [];

    for (const item of productList) {
      rows.push({
        source,
        order_id: pick(order, ['orderid', 'orderId', 'id']),
        action_date: pick(order, ['actionDateString', 'actiondateString', 'actiondate']),
        product_id: pick(item, ['productid', 'productId']),
        product_sku: pick(item, ['sku', 'productsku', 'productSku']),
        product_name: pick(item, ['name', 'productname', 'productName']),
        quantity: pick(item, ['number', 'quantity', 'qty']),
        unit_price: pick(item, ['pricepernumber', 'pricePerNumber', 'unitprice']),
        discount: pick(item, ['discount']),
        line_total: pick(item, ['totalprice', 'totalPrice', 'linetotal']),
      });
    }
  }

  return rows;
}

function pick(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) return source[key];
  }
  return '';
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }

  return lines.join('\n');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function parseArgs(argv) {
  const result = {};
  for (const item of argv) {
    const [key, value] = item.replace(/^--/, '').split('=');
    result[key] = value;
  }
  return result;
}
