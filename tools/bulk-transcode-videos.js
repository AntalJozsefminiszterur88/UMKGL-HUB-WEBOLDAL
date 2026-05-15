#!/usr/bin/env node
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { Pool } = require('pg');

const STARTED_AT = Date.now();
const LOCK_PATH = '/tmp/umkgl-bulk-transcode.lock';

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/usr/src/app/public/uploads';
const TARGET_TABLE = 'videos';

const cpuCount = Math.max(1, Number.parseInt(process.env.BULK_CPU_COUNT || `${os.cpus().length}`, 10) || 1);
const maxWorkers = Math.max(1, Number.parseInt(process.env.BULK_WORKERS || `${Math.max(1, Math.floor(cpuCount / 2))}`, 10) || 1);
const ffmpegThreads = Math.max(1, Number.parseInt(process.env.FFMPEG_THREADS || `${Math.max(1, Math.floor(cpuCount / maxWorkers))}`, 10) || 1);
const crf = Number.parseInt(process.env.BULK_CRF || '23', 10);
const preset = String(process.env.BULK_PRESET || 'faster').trim() || 'faster';
const thermalLimitEnabled = String(process.env.BULK_THERMAL_LIMIT || '1').trim() !== '0';
const thermalStopC = Number.parseFloat(process.env.BULK_THERMAL_STOP_C || '88');
const thermalResumeC = Number.parseFloat(process.env.BULK_THERMAL_RESUME_C || '82');
const thermalPollMs = Math.max(500, Number.parseInt(process.env.BULK_THERMAL_POLL_MS || '2000', 10) || 2000);

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

let renderTimer = null;
let totalTasks = 0;
let completedTasks = 0;
let successTasks = 0;
let failedTasks = 0;
const activeTasks = new Map();
let lockFd = null;
let thermalSensorFiles = null;
let lastCpuTempC = null;
let thermalLimited = false;
let lastThermalLogAt = 0;

function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '--:--:--';
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEta(progress, elapsedSec) {
  if (!Number.isFinite(progress) || progress <= 0 || progress >= 1) {
    return '--:--:--';
  }
  const remaining = (elapsedSec / progress) * (1 - progress);
  return formatDuration(remaining);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 100 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function createBar(progress, width = 32) {
  const clamped = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clamped * width);
  const empty = Math.max(0, width - filled);
  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

function parseFfTimeMs(line) {
  const match = /out_time_ms=(\d+)/.exec(line);
  if (!match) return null;
  const raw = Number.parseInt(match[1], 10);
  if (!Number.isFinite(raw) || raw < 0) return null;
  return raw / 1000000;
}

function parseClockToSeconds(value) {
  const parts = String(value || '').trim().split(':');
  if (parts.length !== 3) return null;
  const h = Number.parseFloat(parts[0]);
  const m = Number.parseFloat(parts[1]);
  const s = Number.parseFloat(parts[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
  return (h * 3600) + (m * 60) + s;
}

function parseFfProgressSeconds(line) {
  const ms = parseFfTimeMs(line);
  if (ms !== null) {
    return ms;
  }

  const usMatch = /out_time_us=(\d+)/.exec(line);
  if (usMatch) {
    const raw = Number.parseInt(usMatch[1], 10);
    if (Number.isFinite(raw) && raw >= 0) {
      return raw / 1000000;
    }
  }

  const timeMatch = /out_time=([0-9:.]+)/.exec(line);
  if (timeMatch) {
    return parseClockToSeconds(timeMatch[1]);
  }

  return null;
}

function formatTemp(tempC) {
  if (!Number.isFinite(tempC)) {
    return '--.-C';
  }
  return `${tempC.toFixed(1)}C`;
}

async function discoverThermalSensorFiles() {
  if (thermalSensorFiles !== null) {
    return thermalSensorFiles;
  }

  const baseDir = '/sys/class/thermal';
  try {
    const entries = await fsp.readdir(baseDir, { withFileTypes: true });
    const zones = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('thermal_zone'))
      .map((entry) => entry.name);

    const prioritized = [];
    const fallback = [];

    for (const zoneName of zones) {
      const zonePath = path.posix.join(baseDir, zoneName);
      const typePath = path.posix.join(zonePath, 'type');
      const tempPath = path.posix.join(zonePath, 'temp');
      let type = '';
      try {
        type = (await fsp.readFile(typePath, 'utf8')).trim().toLowerCase();
      } catch {
        type = '';
      }

      if (/x86_pkg_temp|package|coretemp|cpu/.test(type)) {
        prioritized.push(tempPath);
      } else {
        fallback.push(tempPath);
      }
    }

    thermalSensorFiles = [...prioritized, ...fallback];
    return thermalSensorFiles;
  } catch {
    thermalSensorFiles = [];
    return thermalSensorFiles;
  }
}

async function readCpuTempC() {
  const sensors = await discoverThermalSensorFiles();
  if (!sensors.length) {
    return null;
  }

  let maxTemp = null;
  for (const sensorPath of sensors) {
    try {
      const rawText = (await fsp.readFile(sensorPath, 'utf8')).trim();
      if (!rawText) continue;
      const raw = Number.parseFloat(rawText);
      if (!Number.isFinite(raw)) continue;
      const tempC = raw > 1000 ? raw / 1000 : raw;
      if (!Number.isFinite(tempC) || tempC <= 0 || tempC > 150) continue;
      if (!Number.isFinite(maxTemp) || tempC > maxTemp) {
        maxTemp = tempC;
      }
    } catch {
      // ignore read errors
    }
  }

  return Number.isFinite(maxTemp) ? maxTemp : null;
}

function logThermal(message) {
  const now = Date.now();
  if (now - lastThermalLogAt < 2000) {
    return;
  }
  lastThermalLogAt = now;
  console.log(message);
}

async function waitForThermalWindow() {
  if (!thermalLimitEnabled || !Number.isFinite(thermalStopC) || !Number.isFinite(thermalResumeC)) {
    return;
  }

  while (true) {
    const tempC = await readCpuTempC();
    lastCpuTempC = tempC;

    if (!Number.isFinite(tempC)) {
      thermalLimited = false;
      return;
    }

    if (!thermalLimited && tempC >= thermalStopC) {
      thermalLimited = true;
      logThermal(`[THERMAL] CPU ${formatTemp(tempC)} >= ${thermalStopC}C, waiting to cool down...`);
    }

    if (thermalLimited) {
      if (tempC <= thermalResumeC) {
        thermalLimited = false;
        logThermal(`[THERMAL] CPU cooled to ${formatTemp(tempC)} <= ${thermalResumeC}C, resuming work.`);
        return;
      }
      await sleep(thermalPollMs);
      continue;
    }

    return;
  }
}

function acquireLockOrExit() {
  try {
    lockFd = fs.openSync(LOCK_PATH, 'wx');
    fs.writeSync(lockFd, `${process.pid}\n`);
  } catch (err) {
    if (err && err.code === 'EEXIST') {
      try {
        const pidText = fs.readFileSync(LOCK_PATH, 'utf8').trim();
        const lockPid = Number.parseInt(pidText, 10);
        let hasRunningOwner = false;
        if (Number.isFinite(lockPid) && lockPid > 0 && fs.existsSync(`/proc/${lockPid}`)) {
          try {
            const cmdlineRaw = fs.readFileSync(`/proc/${lockPid}/cmdline`, 'utf8');
            const cmdline = cmdlineRaw.replace(/\u0000/g, ' ');
            hasRunningOwner = cmdline.includes('bulk-transcode-videos.js');
          } catch {
            hasRunningOwner = false;
          }
        }
        if (!hasRunningOwner) {
          fs.unlinkSync(LOCK_PATH);
          lockFd = fs.openSync(LOCK_PATH, 'wx');
          fs.writeSync(lockFd, `${process.pid}\n`);
          return;
        }
      } catch {
        // Keep default failure path below.
      }
      console.error(`Another bulk converter is already running (lock: ${LOCK_PATH}).`);
      process.exit(1);
    }
    throw err;
  }
}

function releaseLock() {
  if (lockFd !== null) {
    try {
      fs.closeSync(lockFd);
    } catch {
      // ignore
    }
    lockFd = null;
  }
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    // ignore
  }
}

function parseCodecAndHeight(ffprobeJson) {
  const streams = Array.isArray(ffprobeJson?.streams) ? ffprobeJson.streams : [];
  const videoStream = streams.find((s) => s && s.codec_type === 'video') || streams.find((s) => Number.isFinite(Number.parseInt(s?.height, 10)));
  const height = Number.parseInt(videoStream?.height, 10);
  const codec = String(videoStream?.codec_name || '').trim().toLowerCase() || null;

  const formatDuration = Number.parseFloat(ffprobeJson?.format?.duration);
  const streamDuration = Number.parseFloat(videoStream?.duration);
  const duration = Number.isFinite(formatDuration) && formatDuration > 0
    ? formatDuration
    : Number.isFinite(streamDuration) && streamDuration > 0
      ? streamDuration
      : null;

  return {
    codec,
    height: Number.isFinite(height) && height > 0 ? height : null,
    duration,
  };
}

function determineOriginalQualityLabel(videoHeight) {
  if (!Number.isFinite(videoHeight)) return null;
  if (videoHeight <= 480) return '480p';
  if (videoHeight <= 720) return '720p';
  if (videoHeight <= 1080) return '1080p';
  if (videoHeight <= 1440) return '1440p';
  return '2160p';
}

function normalizePosix(input) {
  return String(input || '').replace(/\\\\/g, '/');
}

function inferFolderNameFromFilename(filename) {
  const normalized = normalizePosix(filename).replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  const idx = parts.indexOf('eredeti');
  if (idx !== -1 && idx + 1 < parts.length) {
    return parts[idx + 1];
  }
  return 'egyeb';
}

function outputPathFor(videoFilename, target) {
  const normalized = normalizePosix(videoFilename).replace(/^\/+/, '');
  const baseFilename = path.posix.basename(normalized);
  const ext = path.posix.extname(baseFilename) || '.mp4';
  const name = baseFilename.slice(0, baseFilename.length - ext.length) || baseFilename;
  const folderName = inferFolderNameFromFilename(normalized);
  const relative = `klippek/${target}p/${folderName}/${name}_${target}p${ext}`;
  return {
    relative,
    absolute: path.posix.join(UPLOADS_DIR, relative),
  };
}

async function fileExistsNonEmpty(filePath) {
  try {
    const stats = await fsp.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function runCommandCaptureJson(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim() || 'no stderr'}`));
      }
      try {
        return resolve(JSON.parse(stdout));
      } catch (err) {
        return reject(new Error(`Failed to parse JSON from ${cmd}: ${err.message}`));
      }
    });
  });
}

async function probeVideo(filePath) {
  const args = [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-print_format', 'json',
    filePath,
  ];
  const json = await runCommandCaptureJson('ffprobe', args);
  return parseCodecAndHeight(json);
}

function startRenderLoop() {
  if (!process.stdout.isTTY) return;

  renderTimer = setInterval(() => {
    const activeProgress = Array.from(activeTasks.values()).reduce((sum, task) => sum + Math.max(0, Math.min(1, task.progress || 0)), 0);
    const doneEquivalent = completedTasks + activeProgress;
    const progress = totalTasks > 0 ? doneEquivalent / totalTasks : 1;
    const elapsedSec = (Date.now() - STARTED_AT) / 1000;
    const eta = formatEta(progress, elapsedSec);

    const line = [
      `[${createBar(progress)}]`,
      `${(progress * 100).toFixed(1)}%`,
      `tasks ${Math.min(completedTasks, totalTasks)}/${totalTasks}`,
      `ok:${successTasks}`,
      `err:${failedTasks}`,
      `active:${activeTasks.size}`,
      `CPU ${formatTemp(lastCpuTempC)}`,
      thermalLimited ? 'cooldown' : 'run',
      `ETA ${eta}`,
    ].join(' | ');

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(line);
  }, 200);
}

function stopRenderLoop() {
  if (renderTimer) {
    clearInterval(renderTimer);
    renderTimer = null;
  }
  if (process.stdout.isTTY) {
    process.stdout.write('\n');
  }
}

async function transcodeTask(task) {
  const {
    id,
    videoId,
    inputPath,
    outputPath,
    duration,
    target,
  } = task;

  await fsp.mkdir(path.posix.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner',
      '-y',
      '-i', inputPath,
      '-map_metadata', '0',
      '-movflags', '+faststart',
      '-vf', `scale=-2:${target}:flags=lanczos`,
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', String(crf),
      '-threads', String(ffmpegThreads),
      '-c:a', 'aac',
      '-progress', 'pipe:1',
      '-nostats',
      outputPath,
    ];

    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stderrLines = [];

    activeTasks.set(id, { videoId, progress: 0 });

    child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
        const sec = parseFfProgressSeconds(line);
        if (sec === null) continue;
        const ratio = Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(1, sec / duration)) : 0;
        const state = activeTasks.get(id);
        if (state) {
          state.progress = ratio;
          activeTasks.set(id, state);
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
      stderrLines.push(...lines);
      if (stderrLines.length > 16) {
        stderrLines.splice(0, stderrLines.length - 16);
      }
    });

    child.on('error', (err) => {
      activeTasks.delete(id);
      failedTasks += 1;
      completedTasks += 1;
      reject(err);
    });

    child.on('close', (code) => {
      activeTasks.delete(id);
      completedTasks += 1;

      if (code === 0) {
        successTasks += 1;
        return resolve();
      }

      failedTasks += 1;
      const details = stderrLines.join(' | ').slice(0, 1200);
      return reject(new Error(`ffmpeg exited with code ${code}${details ? ` | ${details}` : ''}`));
    });
  });
}

async function runInPool(items, workerCount, workerFn) {
  let index = 0;

  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) return;
      // Gate new ffmpeg starts by temperature to avoid sustained thermal throttling.
      // Running transcodes are not interrupted; we only pause scheduling new ones.
      // eslint-disable-next-line no-await-in-loop
      await waitForThermalWindow();
      // eslint-disable-next-line no-await-in-loop
      await workerFn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, workerCount) }, () => worker());
  await Promise.all(workers);
}

async function main() {
  acquireLockOrExit();

  console.log('UMKGL bulk video converter started');
  console.log(`Uploads dir: ${UPLOADS_DIR}`);
  console.log(`CPU: ${cpuCount}, workers: ${maxWorkers}, ffmpeg threads/job: ${ffmpegThreads}, preset: ${preset}, crf: ${crf}`);
  if (thermalLimitEnabled) {
    console.log(`Thermal limit: enabled (stop ${thermalStopC}C, resume ${thermalResumeC}C, poll ${thermalPollMs}ms)`);
  } else {
    console.log('Thermal limit: disabled');
  }

  const { rows } = await pool.query(`
    SELECT id, filename, original_name, has_720p, has_1080p, processing_status
    FROM ${TARGET_TABLE}
    ORDER BY id ASC
  `);

  if (!rows.length) {
    console.log('No videos found in DB.');
    return;
  }

  const videoStates = new Map();
  const tasks = [];

  console.log(`Scanning ${rows.length} videos...`);

  for (const row of rows) {
    const videoId = Number(row.id);
    const filename = String(row.filename || '').trim();
    const inputPath = path.posix.join(UPLOADS_DIR, normalizePosix(filename).replace(/^\/+/, ''));

    const state = {
      id: videoId,
      filename,
      inputPath,
      sourceExists: false,
      codec: null,
      height: null,
      duration: null,
      originalQuality: null,
      error: null,
      expected720: outputPathFor(filename, 720),
      expected1080: outputPathFor(filename, 1080),
      has720Final: 0,
      has1080Final: 0,
    };

    videoStates.set(videoId, state);

    state.sourceExists = await fileExistsNonEmpty(inputPath);
    if (!state.sourceExists) {
      state.error = 'Source video is missing';
      continue;
    }

    try {
      const probe = await probeVideo(inputPath);
      state.codec = probe.codec;
      state.height = probe.height;
      state.duration = probe.duration;
      state.originalQuality = determineOriginalQualityLabel(probe.height);
    } catch (err) {
      state.error = `ffprobe failed: ${err.message}`;
      continue;
    }

    const has720File = await fileExistsNonEmpty(state.expected720.absolute);
    const has1080File = await fileExistsNonEmpty(state.expected1080.absolute);

    if (has720File) state.has720Final = 1;
    if (has1080File) state.has1080Final = 1;

    if (Number.isFinite(state.height) && state.height >= 720 && !has720File) {
      tasks.push({
        id: `${videoId}-720`,
        videoId,
        target: 720,
        inputPath,
        outputPath: state.expected720.absolute,
        duration: state.duration,
      });
    }

    if (Number.isFinite(state.height) && state.height >= 1080 && !has1080File) {
      tasks.push({
        id: `${videoId}-1080`,
        videoId,
        target: 1080,
        inputPath,
        outputPath: state.expected1080.absolute,
        duration: state.duration,
      });
    }
  }

  totalTasks = tasks.length;

  console.log(`Conversion tasks queued: ${totalTasks}`);
  if (!totalTasks) {
    console.log('Nothing to convert. Updating DB flags from existing files...');
  }

  const taskErrors = new Map();

  if (tasks.length > 0) {
    startRenderLoop();
    try {
      await runInPool(tasks, maxWorkers, async (task) => {
        try {
          await transcodeTask(task);
        } catch (err) {
          const existing = taskErrors.get(task.videoId) || [];
          existing.push(`${task.target}p: ${err.message}`);
          taskErrors.set(task.videoId, existing);
        }
      });
    } finally {
      stopRenderLoop();
    }
  }

  console.log('Finalizing DB updates...');

  let videosDone = 0;
  let videosError = 0;

  const client = await pool.connect();
  try {
    for (const state of videoStates.values()) {
      const has720 = await fileExistsNonEmpty(state.expected720.absolute) ? 1 : 0;
      const has1080 = await fileExistsNonEmpty(state.expected1080.absolute) ? 1 : 0;
      state.has720Final = has720;
      state.has1080Final = has1080;

      const errors = [];
      if (state.error) errors.push(state.error);
      if (taskErrors.has(state.id)) errors.push(...taskErrors.get(state.id));

      const nextStatus = errors.length ? 'error' : 'done';

      if (nextStatus === 'done') {
        videosDone += 1;
      } else {
        videosError += 1;
      }

      // Keep updates compatible with current schema and frontend quality switch.
      // has_1080p/has_720p is what the UI checks to offer quality variants.
      // original_quality helps keep sort/filter metadata accurate.
      // processing_status marks bulk completion state per row.
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `UPDATE ${TARGET_TABLE}
         SET has_720p = $1,
             has_1080p = $2,
             original_quality = $3,
             processing_status = $4
         WHERE id = $5`,
        [has720, has1080, state.originalQuality, nextStatus, state.id]
      );
    }
  } finally {
    client.release();
  }

  const elapsed = (Date.now() - STARTED_AT) / 1000;

  console.log('');
  console.log('Bulk conversion finished.');
  console.log(`Videos total: ${videoStates.size}`);
  console.log(`Tasks total: ${totalTasks}`);
  console.log(`Tasks success: ${successTasks}`);
  console.log(`Tasks failed: ${failedTasks}`);
  console.log(`Rows done: ${videosDone}`);
  console.log(`Rows error: ${videosError}`);
  console.log(`Elapsed: ${formatDuration(elapsed)}`);

  if (failedTasks > 0 || videosError > 0) {
    console.log('Some videos ended in error state. You can query them with:');
    console.log("SELECT id, filename, processing_status FROM videos WHERE processing_status='error' ORDER BY id;");
  }
}

main()
  .catch((err) => {
    stopRenderLoop();
    console.error('Fatal error:', err?.stack || err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch {
      // ignore close errors
    }
    releaseLock();
  });
