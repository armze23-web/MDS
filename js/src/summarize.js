import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_ENV_PATH = path.resolve(process.cwd(), '..', '.env');
await import('dotenv').then(({ config }) => config({ path: ROOT_ENV_PATH }));

const args = parseArgs(process.argv.slice(2));
const dateAfter = args.after;
const dateBefore = args.before;
const source = process.env.ZORT_SOURCE ?? 'zort';

if (!dateAfter || !dateBefore) {
  console.error('Usage: npm run summary -- --after=2026-05-01 --before=2026-05-31');
  process.exit(1);
}

const ordersPath = `output/orders_flat_${dateAfter}_to_${dateBefore}.csv`;
const movementPath = `output/movement_orders_flat_${dateAfter}_to_${dateBefore}.csv`;
const summaryPath = `output/daily_summary_${dateAfter}_to_${dateBefore}.json`;
const summaryCsvPath = `output/daily_summary_${dateAfter}_to_${dateBefore}.csv`;

try {
  const orders = await readCsvIfExists(ordersPath);
  const movements = await readCsvIfExists(movementPath);
  const summary = buildSummary({ orders, movements });

  await fs.mkdir('output', { recursive: true });
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  await fs.writeFile(summaryCsvPath, toCsv(flattenSummary(summary)), 'utf8');

  console.log(`Summary source: ${source}`);
  console.log(`Orders summarized: ${orders.length}`);
  console.log(`Movement rows summarized: ${movements.length}`);
  console.log(`JSON: ${summaryPath}`);
  console.log(`CSV : ${summaryCsvPath}`);
} catch (error) {
  console.error('Summary failed:', error.message);
  process.exit(1);
}

function buildSummary({ orders, movements }) {
  return {
    source,
    date_after: dateAfter,
    date_before: dateBefore,
    order_count: orders.length,
    total_order_amount: sumNumbers(orders, 'total_amount'),
    movement_row_count: movements.length,
    total_movement_quantity: sumNumbers(movements, 'quantity'),
    total_movement_amount: sumNumbers(movements, 'line_total'),
    by_sales_channel: groupSum(orders, 'sales_channel', 'total_amount'),
    by_customer_province: groupSum(orders, 'customer_province', 'total_amount'),
    by_product_sku: groupSum(movements, 'product_sku', 'line_total', 'quantity'),
  };
}

function flattenSummary(summary) {
  const rows = [
    {
      source: summary.source,
      section: 'total',
      key: 'all',
      count: summary.order_count,
      quantity: summary.total_movement_quantity,
      amount: summary.total_order_amount,
    },
  ];

  for (const [section, values] of Object.entries({
    by_sales_channel: summary.by_sales_channel,
    by_customer_province: summary.by_customer_province,
    by_product_sku: summary.by_product_sku,
  })) {
    for (const item of values) {
      rows.push({
        source: summary.source,
        section,
        key: item.key,
        count: item.count,
        quantity: item.quantity ?? '',
        amount: item.amount,
      });
    }
  }

  return rows;
}

async function readCsvIfExists(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return parseCsv(text);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).filter((line) => line.length > 1 || line[0]).map((line) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = line[index] ?? '';
    });
    return record;
  });
}

function groupSum(rows, keyField, amountField, quantityField) {
  const groups = new Map();

  for (const row of rows) {
    const key = row[keyField] || 'unknown';
    const current = groups.get(key) ?? { key, count: 0, amount: 0, quantity: 0 };
    current.count += 1;
    current.amount += toNumber(row[amountField]);
    if (quantityField) current.quantity += toNumber(row[quantityField]);
    groups.set(key, current);
  }

  return [...groups.values()].sort((a, b) => b.amount - a.amount);
}

function sumNumbers(rows, field) {
  return rows.reduce((total, row) => total + toNumber(row[field]), 0);
}

function toNumber(value) {
  const number = Number(String(value ?? '').replaceAll(',', ''));
  return Number.isFinite(number) ? number : 0;
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
