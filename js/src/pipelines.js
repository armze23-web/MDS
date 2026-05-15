export const PIPELINE_TASKS = {
  daily: ['orders', 'movement', 'summary'],
  mtd: ['orders', 'movement', 'summary'],
  monthly: ['orders', 'movement', 'summary'],
};

export function getPipelineDateRange(pipeline, now = new Date(), timeZone = process.env.CRON_TIMEZONE ?? 'Asia/Bangkok') {
  if (pipeline === 'daily') return getPreviousDayRange(now, timeZone);
  if (pipeline === 'mtd') return getMonthToDateRange(now, timeZone);
  if (pipeline === 'monthly') return getPreviousMonthRange(now, timeZone);

  throw new Error(`Unknown pipeline: ${pipeline}`);
}

export function getPreviousDayRange(now = new Date(), timeZone = 'Asia/Bangkok') {
  const today = getDateInTimeZone(now, timeZone);
  const yesterday = addDays(today, -1);
  const date = formatDate(yesterday);
  return { after: date, before: date };
}

export function getMonthToDateRange(now = new Date(), timeZone = 'Asia/Bangkok') {
  const today = getDateInTimeZone(now, timeZone);
  const firstDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { after: formatDate(firstDay), before: formatDate(today) };
}

export function getPreviousMonthRange(now = new Date(), timeZone = 'Asia/Bangkok') {
  const today = getDateInTimeZone(now, timeZone);
  const firstDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const lastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  return { after: formatDate(firstDay), before: formatDate(lastDay) };
}

export function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
