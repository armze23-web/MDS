import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readCsvIfExists } from './csv.js';

const ROOT_ENV_PATH = path.resolve(process.cwd(), '..', '.env');
await import('dotenv').then(({ config }) => config({ path: ROOT_ENV_PATH }));

const args = parseArgs(process.argv.slice(2));
const pipeline = args.pipeline ?? process.env.SYNC_PIPELINE ?? 'manual';
const dateAfter = args.after;
const dateBefore = args.before;
const source = process.env.ZORT_SOURCE ?? 'zort';

if (!dateAfter || !dateBefore) {
  console.error('Usage: npm run supabase:upsert -- --pipeline=daily --after=2026-05-01 --before=2026-05-31');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Skipping Supabase upsert.');
  process.exit(0);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const startedAt = new Date().toISOString();
let syncRunId = null;

try {
  const syncRun = await insertSyncRun({ status: 'running', startedAt });
  syncRunId = syncRun?.id ?? null;

  const ordersCount = await upsertOrders();
  await upsertMovementOrders();
  const movementCount = await upsertMovementItems();
  await upsertSummary();

  if (syncRunId) {
    await updateSyncRun(syncRunId, {
      status: 'success',
      finished_at: new Date().toISOString(),
      orders_count: ordersCount,
      movement_count: movementCount,
      error_message: null,
    });
  }

  console.log(`Supabase upsert complete: orders=${ordersCount}, movement_items=${movementCount}`);
} catch (error) {
  if (syncRunId) {
    await updateSyncRun(syncRunId, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: error.message,
    });
  }

  console.error('Supabase upsert failed:', error.message);
  process.exit(1);
}

async function upsertOrders() {
  const flatOrders = await readCsvIfExists(`output/orders_flat_${dateAfter}_to_${dateBefore}.csv`);
  const rawData = await readJsonIfExists(`output/orders_${dateAfter}_to_${dateBefore}.json`);
  const rawOrders = extractList(rawData);
  const rawById = new Map(rawOrders.map((order) => [String(pick(order, ['id', 'orderid', 'orderId'])), order]));

  const rows = flatOrders
    .filter((order) => order.order_id)
    .map((order) => ({
      source: order.source || source,
      order_id: String(order.order_id),
      order_number: emptyToNull(order.order_number),
      order_date: emptyToNull(order.order_date),
      sales_channel: emptyToNull(order.sales_channel),
      customer_province: emptyToNull(order.customer_province),
      created_by: emptyToNull(order.created_by),
      total_amount: toNumberOrNull(order.total_amount),
      raw_json: rawById.get(String(order.order_id)) ?? null,
      synced_at: new Date().toISOString(),
    }));

  await upsertInChunks('zort_orders', rows, 'source,order_id');
  return rows.length;
}

async function upsertMovementItems() {
  const movements = await readCsvIfExists(`output/movement_orders_flat_${dateAfter}_to_${dateBefore}.csv`);
  const rows = movements
    .filter((item) => item.order_id)
    .map((item, index) => ({
      source: item.source || source,
      order_id: String(item.order_id),
      item_key: buildMovementItemKey(item, index),
      product_id: String(item.product_id || ''),
      action_date: emptyToNull(item.action_date),
      product_sku: emptyToNull(item.product_sku),
      product_name: emptyToNull(item.product_name),
      quantity: toNumberOrNull(item.quantity),
      unit_price: toNumberOrNull(item.unit_price),
      discount: toNumberOrNull(item.discount),
      line_total: toNumberOrNull(item.line_total),
      raw_json: item,
      synced_at: new Date().toISOString(),
    }));

  await upsertInChunks('zort_movement_items', rows, 'source,order_id,item_key');
  return rows.length;
}

async function upsertMovementOrders() {
  const movementOrders = await readJsonIfExists(`output/movement_orders_${dateAfter}_to_${dateBefore}.json`);
  const rows = extractList(movementOrders)
    .filter((order) => pick(order, ['orderid', 'orderId', 'id']))
    .map((order) => ({
      source,
      order_id: String(pick(order, ['orderid', 'orderId', 'id'])),
      action_date: emptyToNull(pick(order, ['actionDateString', 'actiondateString', 'actiondate'])),
      raw_json: order,
      synced_at: new Date().toISOString(),
    }));

  await upsertInChunks('zort_movement_orders', rows, 'source,order_id');
}

async function upsertSummary() {
  const summary = await readJsonIfExists(`output/daily_summary_${dateAfter}_to_${dateBefore}.json`);
  if (!summary) return;

  await upsertInChunks('zort_daily_summaries', [{
    source,
    date_after: dateAfter,
    date_before: dateBefore,
    order_count: Number(summary.order_count ?? 0),
    total_order_amount: Number(summary.total_order_amount ?? 0),
    movement_row_count: Number(summary.movement_row_count ?? 0),
    total_movement_quantity: Number(summary.total_movement_quantity ?? 0),
    total_movement_amount: Number(summary.total_movement_amount ?? 0),
    summary_json: summary,
    synced_at: new Date().toISOString(),
  }], 'source,date_after,date_before');
}

async function insertSyncRun({ status, startedAt }) {
  const { data, error } = await supabase
    .from('zort_sync_runs')
    .insert({
      pipeline_name: pipeline,
      source,
      date_after: dateAfter,
      date_before: dateBefore,
      status,
      started_at: startedAt,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

async function updateSyncRun(id, patch) {
  const { error } = await supabase
    .from('zort_sync_runs')
    .update(patch)
    .eq('id', id);

  if (error) throw error;
}

async function upsertInChunks(table, rows, onConflict) {
  const chunkSize = Number(process.env.SUPABASE_UPSERT_CHUNK_SIZE ?? 500);

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    if (chunk.length === 0) continue;

    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });

    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.list)) return data.data.list;
  return [];
}

function pick(sourceObject, keys) {
  for (const key of keys) {
    if (sourceObject?.[key] !== undefined && sourceObject?.[key] !== null) return sourceObject[key];
  }
  return '';
}

function emptyToNull(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(String(value).replaceAll(',', ''));
  return Number.isFinite(number) ? number : null;
}

function buildMovementItemKey(item, index) {
  const productPart = item.product_id || item.product_sku || item.product_name || 'item';
  return `${String(productPart)}-${String(index + 1).padStart(6, '0')}`;
}

function parseArgs(argv) {
  const result = {};
  for (const item of argv) {
    const [key, value] = item.replace(/^--/, '').split('=');
    result[key] = value;
  }
  return result;
}
