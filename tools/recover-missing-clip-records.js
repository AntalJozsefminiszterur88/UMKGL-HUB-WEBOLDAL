#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DB_CONTAINER = process.env.UMKGL_DB_CONTAINER || 'umkgl-hub-weboldal-db-1';
const WEB_CONTAINER = process.env.UMKGL_WEB_CONTAINER || 'umkgl-hub-weboldal-web-1';
const HOST_UPLOADS_DIR = process.env.UMKGL_UPLOADS_DIR || '/mnt/d/weboldal fájlok';
const CONTAINER_UPLOADS_DIR = process.env.UMKGL_CONTAINER_UPLOADS_DIR || '/usr/src/app/public/uploads';
const TARGET_UPLOADER_ID = Number.parseInt(process.env.UMKGL_RECOVERY_UPLOADER_ID || '1', 10);
const HASH_PREFIX = 'UMKGL_HASH:';
const THUMBNAIL_PATTERN = /^([0-9]+-[0-9]+)-([0-9]+)(-custom.*)?\.jpg$/i;
const APPLY = process.argv.includes('--apply');

const uploadsRoot = path.resolve(HOST_UPLOADS_DIR);
const clipsOriginalDir = path.join(uploadsRoot, 'klippek', 'eredeti');
const clips720pDir = path.join(uploadsRoot, 'klippek', '720p');
const clips1080pDir = path.join(uploadsRoot, 'klippek', '1080p');
const clips1440pDir = path.join(uploadsRoot, 'klippek', '1440p');
const thumbnailsDir = path.join(uploadsRoot, 'thumbnails');

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  });
}

function dockerExec(container, args, options = {}) {
  return runCommand('docker', ['exec', container, ...args], options);
}

function queryDb(sql) {
  const output = dockerExec(DB_CONTAINER, [
    'psql',
    '-U',
    'myuser',
    '-d',
    'mydb',
    '-At',
    '-F',
    '\t',
    '-c',
    sql,
  ]);
  return output.trim();
}

function applySql(sql) {
  return runCommand(
    'docker',
    ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'myuser', '-d', 'mydb', '-v', 'ON_ERROR_STOP=1'],
    { input: sql }
  );
}

function walkFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function sanitizeFolderName(value = '') {
  const normalized = String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase()
    .trim();
  return normalized || 'egyeb';
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function sqlString(value) {
  return `'${escapeSql(value)}'`;
}

function sqlTimestamp(value) {
  return `${sqlString(value.toISOString())}::timestamptz`;
}

function parseTabSeparated(output) {
  if (!output) {
    return [];
  }
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t'));
}

function buildOriginalFileMap() {
  const map = new Map();
  for (const fullPath of walkFiles(clipsOriginalDir)) {
    const relPath = path.relative(uploadsRoot, fullPath).split(path.sep).join('/');
    const stem = path.parse(fullPath).name;
    map.set(stem, relPath);
  }
  return map;
}

function buildThumbnailMap() {
  const map = new Map();
  const entries = fs.readdirSync(thumbnailsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const match = entry.name.match(THUMBNAIL_PATTERN);
    if (!match) {
      continue;
    }
    const stem = match[1];
    const videoId = Number.parseInt(match[2], 10);
    const variant = match[3] || '';
    const fullPath = path.join(thumbnailsDir, entry.name);
    const mtimeMs = fs.statSync(fullPath).mtimeMs;
    const current = map.get(videoId) || [];
    current.push({
      videoId,
      stem,
      variant,
      filename: entry.name,
      fullPath,
      mtimeMs,
    });
    map.set(videoId, current);
  }
  return map;
}

function pickThumbnailCandidate(candidates) {
  return [...candidates].sort((left, right) => {
    if (left.variant && !right.variant) {
      return 1;
    }
    if (!left.variant && right.variant) {
      return -1;
    }
    return left.mtimeMs - right.mtimeMs;
  }).pop();
}

function readExistingVideos() {
  const rows = parseTabSeparated(queryDb("select id, filename from videos order by id"));
  const ids = new Set();
  const filenames = new Set();
  let maxId = 0;

  for (const [idValue, filename] of rows) {
    const id = Number.parseInt(idValue, 10);
    if (Number.isFinite(id)) {
      ids.add(id);
      if (id > maxId) {
        maxId = id;
      }
    }
    if (filename) {
      filenames.add(filename);
    }
  }

  return { ids, filenames, maxId };
}

function readTags() {
  const rows = parseTabSeparated(queryDb('select id, name from tags order by id'));
  const sanitizedTagMap = new Map();

  for (const [idValue, name] of rows) {
    const id = Number.parseInt(idValue, 10);
    if (!Number.isFinite(id) || !name) {
      continue;
    }
    const sanitized = sanitizeFolderName(name);
    if (!sanitizedTagMap.has(sanitized)) {
      sanitizedTagMap.set(sanitized, { id, name });
    }
  }

  return sanitizedTagMap;
}

function computeFirstFiveMegabytesSha1(filePath) {
  const hash = crypto.createHash('sha1');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(64 * 1024);
  const maxBytes = 5 * 1024 * 1024;
  let totalRead = 0;

  try {
    while (totalRead < maxBytes) {
      const bytesToRead = Math.min(buffer.length, maxBytes - totalRead);
      const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, totalRead);
      if (bytesRead <= 0) {
        break;
      }
      hash.update(buffer.subarray(0, bytesRead));
      totalRead += bytesRead;
    }
  } finally {
    fs.closeSync(fd);
  }

  return hash.digest('hex');
}

function probeVideo(relativeVideoPath) {
  const containerPath = path.posix.join(CONTAINER_UPLOADS_DIR, relativeVideoPath);
  const raw = dockerExec(WEB_CONTAINER, [
    'ffprobe',
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    containerPath,
  ]);

  const metadata = JSON.parse(raw || '{}');
  const formatTags = metadata.format?.tags || {};
  const creationTime =
    formatTags.creation_time ||
    (metadata.streams || []).map((stream) => stream?.tags?.creation_time).find(Boolean) ||
    null;

  const comment = typeof formatTags.comment === 'string' ? formatTags.comment.trim() : '';
  const embeddedHash = comment.startsWith(HASH_PREFIX) ? comment.slice(HASH_PREFIX.length).trim() : null;
  const videoStream = (metadata.streams || []).find((stream) => Number.isFinite(stream?.height));
  const height = Number.parseInt(videoStream?.height, 10);

  return {
    embeddedHash: embeddedHash || null,
    creationTime: creationTime ? new Date(creationTime) : null,
    height: Number.isFinite(height) ? height : null,
  };
}

function inferOriginalQuality(height) {
  if (!Number.isFinite(height) || height <= 0) {
    return '1080p';
  }
  if (height >= 1440) {
    return '1440p';
  }
  if (height > 720) {
    return '1080p';
  }
  return '720p';
}

function buildRecoveryCandidates() {
  const existingVideos = readExistingVideos();
  const tags = readTags();
  const originalFileMap = buildOriginalFileMap();
  const thumbnailMap = buildThumbnailMap();
  const recovered = [];
  const warnings = [];

  for (const [videoId, candidates] of [...thumbnailMap.entries()].sort((a, b) => a[0] - b[0])) {
    if (existingVideos.ids.has(videoId)) {
      continue;
    }

    const thumbnail = pickThumbnailCandidate(candidates);
    if (!thumbnail) {
      warnings.push(`No thumbnail candidate for missing video id ${videoId}`);
      continue;
    }

    const relativeVideoPath = originalFileMap.get(thumbnail.stem);
    if (!relativeVideoPath) {
      warnings.push(`No original video file found for missing video id ${videoId} (${thumbnail.stem})`);
      continue;
    }

    if (existingVideos.filenames.has(relativeVideoPath)) {
      warnings.push(`Filename already exists in DB, skipping id ${videoId}: ${relativeVideoPath}`);
      continue;
    }

    const hostVideoPath = path.join(uploadsRoot, relativeVideoPath);
    const hostStats = fs.statSync(hostVideoPath);
    const folderName = sanitizeFolderName(path.basename(path.dirname(hostVideoPath)));
    const tagInfo = tags.get(folderName) || null;
    const metadata = probeVideo(relativeVideoPath);
    const uploadedAt = hostStats.mtime;
    const contentCreatedAt = metadata.creationTime && !Number.isNaN(metadata.creationTime.getTime())
      ? metadata.creationTime
      : uploadedAt;

    const has720p = fs.existsSync(path.join(clips720pDir, folderName, `${thumbnail.stem}_720p.mp4`)) ? 1 : 0;
    const has1080p = fs.existsSync(path.join(clips1080pDir, folderName, `${thumbnail.stem}_1080p.mp4`)) ? 1 : 0;
    const has1440p = fs.existsSync(path.join(clips1440pDir, folderName, `${thumbnail.stem}_1440p.mp4`)) ? 1 : 0;
    const fileHash = metadata.embeddedHash || computeFirstFiveMegabytesSha1(hostVideoPath);

    recovered.push({
      id: videoId,
      stem: thumbnail.stem,
      filename: relativeVideoPath,
      originalName: `[Recovered] ${thumbnail.stem}`,
      uploaderId: TARGET_UPLOADER_ID,
      uploadedAt,
      contentCreatedAt,
      has720p,
      has1080p,
      has1440p,
      originalQuality: inferOriginalQuality(metadata.height),
      processingStatus: 'done',
      thumbnailFilename: `thumbnails/${thumbnail.filename}`,
      fileHash,
      tagId: tagInfo?.id || null,
      tagName: tagInfo?.name || null,
      folderName,
      height: metadata.height,
    });
  }

  return { recovered, warnings, maxExistingId: existingVideos.maxId };
}

function buildSql(records) {
  const statements = ['BEGIN;'];

  for (const record of records) {
    statements.push(
      `INSERT INTO videos (id, filename, original_name, uploader_id, uploaded_at, content_created_at, has_720p, has_1080p, has_1440p, original_quality, processing_status, thumbnail_filename, file_hash) VALUES (` +
      `${record.id}, ` +
      `${sqlString(record.filename)}, ` +
      `${sqlString(record.originalName)}, ` +
      `${record.uploaderId}, ` +
      `${sqlTimestamp(record.uploadedAt)}, ` +
      `${sqlTimestamp(record.contentCreatedAt)}, ` +
      `${record.has720p}, ` +
      `${record.has1080p}, ` +
      `${record.has1440p}, ` +
      `${sqlString(record.originalQuality)}, ` +
      `${sqlString(record.processingStatus)}, ` +
      `${sqlString(record.thumbnailFilename)}, ` +
      `${sqlString(record.fileHash)}` +
      `) ON CONFLICT (id) DO NOTHING;`
    );

    if (record.tagId) {
      statements.push(
        `INSERT INTO video_tags (video_id, tag_id) VALUES (${record.id}, ${record.tagId}) ON CONFLICT DO NOTHING;`
      );
    }
  }

  statements.push("SELECT setval('videos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM videos), true);");
  statements.push('COMMIT;');
  return `${statements.join('\n')}\n`;
}

function main() {
  const { recovered, warnings, maxExistingId } = buildRecoveryCandidates();
  const sql = buildSql(recovered);
  const reportPath = '/tmp/umkgl-missing-clips-recovery-report.json';
  const sqlPath = '/tmp/umkgl-missing-clips-recovery.sql';

  fs.writeFileSync(reportPath, JSON.stringify({ recovered, warnings, maxExistingId }, null, 2));
  fs.writeFileSync(sqlPath, sql);

  console.log(`Existing max video id: ${maxExistingId}`);
  console.log(`Recovered candidate rows: ${recovered.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Report: ${reportPath}`);
  console.log(`SQL: ${sqlPath}`);

  if (warnings.length) {
    console.log('Warnings sample:');
    for (const warning of warnings.slice(0, 20)) {
      console.log(`- ${warning}`);
    }
  }

  console.log('Recovered sample:');
  for (const record of recovered.slice(0, 10)) {
    console.log(
      [
        record.id,
        record.folderName,
        record.filename,
        record.thumbnailFilename,
        record.tagName || 'no-tag',
        record.originalQuality,
      ].join('\t')
    );
  }

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to insert the missing rows.');
    return;
  }

  applySql(sql);
  console.log(`Applied ${recovered.length} recovered rows.`);
}

try {
  main();
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}
