import fs from 'node:fs/promises';

export async function readCsvIfExists(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return parseCsv(text);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export function parseCsv(text) {
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
