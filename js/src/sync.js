import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { getPipelineDateRange, PIPELINE_TASKS } from './pipelines.js';

const ROOT_ENV_PATH = path.resolve(process.cwd(), '..', '.env');
await import('dotenv').then(({ config }) => config({ path: ROOT_ENV_PATH }));

const args = parseArgs(process.argv.slice(2));
const pipeline = args.pipeline ?? process.env.SYNC_PIPELINE ?? 'daily';
const tasks = parseTasks(args.tasks ?? process.env.SYNC_TASKS, PIPELINE_TASKS[pipeline]);
const dryRun = parseBoolean(args.dryRun ?? args['dry-run'] ?? process.env.SYNC_DRY_RUN);
const supabaseEnabled = parseBoolean(args.supabase ?? process.env.SUPABASE_UPSERT_ENABLED ?? 'true');

if (!PIPELINE_TASKS[pipeline]) {
  console.error(`Unknown pipeline: ${pipeline}. Use daily, mtd, or monthly.`);
  process.exit(1);
}

const dateRange = getPipelineDateRange(pipeline);

console.log(`Sync pipeline: ${pipeline}`);
console.log(`Date range: ${dateRange.after} to ${dateRange.before}`);
console.log(`Tasks: ${tasks.join(', ')}`);

try {
  if (dryRun) {
    console.log('Dry run enabled. No API requests were made.');
    process.exit(0);
  }

  for (const task of tasks) {
    await runNpmScript(task, ['--', `--after=${dateRange.after}`, `--before=${dateRange.before}`]);
  }

  if (supabaseEnabled) {
    await runNpmScript('supabase:upsert', [
      '--',
      `--pipeline=${pipeline}`,
      `--after=${dateRange.after}`,
      `--before=${dateRange.before}`,
    ]);
  }

  console.log(`Sync pipeline finished: ${pipeline}`);
} catch (error) {
  console.error(`Sync pipeline failed: ${error.message}`);
  process.exit(1);
}

function runNpmScript(script, argsForScript) {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCommand, ['run', script, ...argsForScript], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run ${script} exited with code ${code}`));
    });
  });
}

function parseTasks(value, fallback) {
  const allowed = new Set(['orders', 'movement', 'summary', 'diagnose']);
  const rawTasks = value ? value.split(',') : fallback;
  return rawTasks.map((task) => task.trim()).filter((task) => allowed.has(task));
}

function parseArgs(argv) {
  const result = {};
  for (const item of argv) {
    const [key, value] = item.replace(/^--/, '').split('=');
    result[key] = value;
  }
  return result;
}

function parseBoolean(value) {
  return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
}
