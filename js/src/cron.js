import 'dotenv/config';
import cron from 'node-cron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { getPipelineDateRange } from './pipelines.js';

const ROOT_ENV_PATH = path.resolve(process.cwd(), '..', '.env');
await import('dotenv').then(({ config }) => config({ path: ROOT_ENV_PATH }));

const timezone = process.env.CRON_TIMEZONE ?? 'Asia/Bangkok';
const runOnStart = parseBoolean(process.env.CRON_RUN_ON_START);

const pipelines = [
  {
    name: 'daily-summary',
    pipeline: 'daily',
    schedule: process.env.CRON_DAILY_SUMMARY_SCHEDULE ?? '1 0 * * *',
    tasks: parseTasks(process.env.CRON_DAILY_SUMMARY_TASKS ?? process.env.CRON_TASKS ?? 'orders,movement,summary'),
    enabled: parseBoolean(process.env.CRON_DAILY_SUMMARY_ENABLED ?? 'true'),
  },
  {
    name: 'mtd',
    pipeline: 'mtd',
    schedule: process.env.CRON_MTD_SCHEDULE ?? '10 0 * * *',
    tasks: parseTasks(process.env.CRON_MTD_TASKS ?? process.env.CRON_TASKS ?? 'orders,movement,summary'),
    enabled: parseBoolean(process.env.CRON_MTD_ENABLED ?? 'true'),
  },
  {
    name: 'monthly-closing',
    pipeline: 'monthly',
    schedule: process.env.CRON_MONTHLY_CLOSING_SCHEDULE ?? '30 0 1 * *',
    tasks: parseTasks(process.env.CRON_MONTHLY_CLOSING_TASKS ?? process.env.CRON_TASKS ?? 'orders,movement,summary'),
    enabled: parseBoolean(process.env.CRON_MONTHLY_CLOSING_ENABLED ?? 'true'),
  },
];

for (const pipeline of pipelines) {
  validatePipeline(pipeline);
}

for (const pipeline of pipelines.filter((item) => item.enabled)) {
  console.log(`Cron ready: ${pipeline.name} "${pipeline.schedule}" (${timezone}) -> ${pipeline.tasks.join(', ')}`);

  if (runOnStart) {
    await runPipeline(pipeline);
  }

  cron.schedule(pipeline.schedule, () => runPipeline(pipeline), { timezone });
}

if (pipelines.every((pipeline) => !pipeline.enabled)) {
  console.error('No cron pipelines are enabled.');
  process.exit(1);
}

async function runPipeline(pipeline) {
  const { after, before } = getPipelineDateRange(pipeline.pipeline);
  console.log(`${pipeline.name} run started: ${new Date().toISOString()} after=${after} before=${before}`);

  for (const task of pipeline.tasks) {
    await runNpmScript(task, ['--', `--after=${after}`, `--before=${before}`]);
  }

  console.log(`${pipeline.name} run finished: ${new Date().toISOString()}`);
}

function runNpmScript(script, args) {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCommand, ['run', script, ...args], {
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

function parseTasks(value) {
  const allowed = new Set(['orders', 'movement', 'summary', 'diagnose']);
  return value
    .split(',')
    .map((task) => task.trim())
    .filter((task) => allowed.has(task));
}

function parseBoolean(value) {
  return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
}

function validatePipeline(pipeline) {
  if (!pipeline.enabled) return;

  if (!cron.validate(pipeline.schedule)) {
    console.error(`Invalid schedule for ${pipeline.name}: ${pipeline.schedule}`);
    process.exit(1);
  }

  if (pipeline.tasks.length === 0) {
    console.error(`${pipeline.name} tasks must include at least one task: orders, movement, summary, diagnose`);
    process.exit(1);
  }
}
