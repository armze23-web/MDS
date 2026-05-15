import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_ENV_PATH = path.resolve(process.cwd(), '..', '.env');
await import('dotenv').then(({ config }) => config({ path: ROOT_ENV_PATH }));

const config = getConfig();
const args = parseArgs(process.argv.slice(2));
const dateAfter = args.after;
const dateBefore = args.before;
const source = process.env.ZORT_SOURCE ?? 'zort';

if (!dateAfter || !dateBefore) {
  console.error('Usage: npm run orders -- --after=2026-05-01 --before=2026-05-31');
  process.exit(1);
}

try {
  const data = await getOrders({ dateAfter, dateBefore });
  const list = extractList(data);
  const rows = list.map(flattenOrder);

  await fs.mkdir('output', { recursive: true });
  const jsonPath = `output/orders_${dateAfter}_to_${dateBefore}.json`;
  const csvPath = `output/orders_flat_${dateAfter}_to_${dateBefore}.csv`;

  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.writeFile(csvPath, toCsv(rows), 'utf8');

  console.log(`✅ Orders fetched: ${list.length}`);
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

async function getOrders({ dateAfter, dateBefore }) {
  const url = new URL(`${config.baseUrl}/Order/GetOrders`);
  url.searchParams.set('orderdateafter', dateAfter);
  url.searchParams.set('orderdatebefore', dateBefore);

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

function flattenOrder(order) {
  return {
    source,
    order_id: pick(order, ['id', 'orderid', 'orderId']),
    order_number: pick(order, ['number', 'ordernumber', 'orderNumber']),
    order_date: pick(order, ['orderdate', 'orderDate', 'orderdateString', 'date']),
    sales_channel: pick(order, ['saleschannel', 'salesChannel', 'channel', 'platform', 'marketplacename']),
    customer_province: pick(order, ['customerprovince', 'customerProvince', 'province', 'shipprovince']),
    created_by: pick(order, ['createusername', 'createdBy', 'createUserName', 'userName']),
    total_amount: pick(order, ['amount', 'totalamount', 'totalAmount', 'grandtotal']),
  };
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
