import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_ENV_PATH = path.resolve(process.cwd(), '..', '.env');
await import('dotenv').then(({ config }) => config({ path: ROOT_ENV_PATH }));

const config = getConfig();
const args = parseArgs(process.argv.slice(2));
const dateAfter = args.after ?? '2026-05-01';
const dateBefore = args.before ?? '2026-05-31';

const checks = [
  {
    name: 'orders without date filter',
    endpoint: '/Order/GetOrders',
    params: {},
  },
  {
    name: 'orders by order date',
    endpoint: '/Order/GetOrders',
    params: { orderdateafter: dateAfter, orderdatebefore: dateBefore },
  },
  {
    name: 'orders by created date',
    endpoint: '/Order/GetOrders',
    params: { createdafter: dateAfter, createdbefore: dateBefore },
  },
  {
    name: 'orders by updated date',
    endpoint: '/Order/GetOrders',
    params: { updatedafter: dateAfter, updatedbefore: dateBefore },
  },
  {
    name: 'movement orders',
    endpoint: '/Order/GetMovementOrders',
    params: { dateafter: dateAfter, datebefore: dateBefore, limit: 10, page: 1 },
  },
];

const results = [];

for (const check of checks) {
  const result = await request(check);
  results.push(result);
  const status = result.ok ? 'OK' : 'FAIL';
  console.log(`${status} ${check.name}: HTTP ${result.status}, resCode ${result.resCode}, count ${result.count}`);
  if (result.resDesc) console.log(`   ${result.resDesc}`);
}

await fs.mkdir('output', { recursive: true });
await fs.writeFile(
  `output/diagnose_${dateAfter}_to_${dateBefore}.json`,
  JSON.stringify(results, null, 2),
  'utf8',
);

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

async function request(check) {
  const url = new URL(`${config.baseUrl}${check.endpoint}`);
  for (const [key, value] of Object.entries(check.params)) {
    url.searchParams.set(key, String(value));
  }

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
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Keep the raw preview below for non-JSON API failures.
  }

  const list = extractList(data);
  return {
    name: check.name,
    url: sanitizeUrl(url),
    ok: response.ok && String(data?.res?.resCode ?? data?.resCode ?? '') !== '400',
    status: response.status,
    resCode: data?.res?.resCode ?? data?.resCode ?? '',
    resDesc: data?.res?.resDesc || data?.resDesc || '',
    count: Number(data?.count ?? data?.data?.count ?? list.length ?? 0),
    sampleKeys: list[0] ? Object.keys(list[0]).slice(0, 30) : [],
    rawPreview: data ? undefined : text.slice(0, 500),
  };
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.list)) return data.data.list;
  return [];
}

function sanitizeUrl(url) {
  return `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
}

function parseArgs(argv) {
  const result = {};
  for (const item of argv) {
    const [key, value] = item.replace(/^--/, '').split('=');
    result[key] = value;
  }
  return result;
}
