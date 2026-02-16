// 1. A szükséges csomagok betöltése
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const crypto = require('crypto');
const { Server } = require('socket.io');
const db = require('./database');
const cinemaScraper = require('../cinema-scraper');

const JWT_SECRET = 'a_very_secret_and_secure_key_for_jwt';
const DEFAULT_TAG_COLOR = '#5865F2';

function generateAuthToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 2. Az Express alkalmazás létrehozása
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000; // A port, amin a szerver figyelni fog
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const BOT_API_URL = process.env.BOT_API_URL;
const DEFAULT_UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const RADNAI_URL = 'https://radnaimark.hu/';
const BOT_RADNAI_ALERT_URL = process.env.BOT_RADNAI_ALERT_URL;
const RADNAI_CHECK_INTERVAL_MS = 60000;
const RADNAI_FETCH_TIMEOUT_MS = 15000;
const RADNAI_FETCH_MAX_ATTEMPTS = 3;
const RADNAI_FETCH_RETRY_DELAY_MS = 2500;
const RADNAI_ALERT_REQUEST_TIMEOUT_MS = 12000;
const RADNAI_ALERT_MAX_ATTEMPTS = 2;
const RADNAI_ALERT_RETRY_DELAY_MS = 1500;
const RADNAI_OUTAGE_ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const RADNAI_LOG_RETENTION_DAYS = 1;
const RADNAI_LOG_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RADNAI_MONITOR_DEFAULT_ENABLED = process.env.RADNAI_MONITOR_ENABLED !== 'false';
const RADNAI_MONITOR_DATA_DIR = process.env.RADNAI_MONITOR_DATA_DIR
    || path.join(DEFAULT_UPLOADS_DIR, 'log', 'radnai-monitor');
const RADNAI_MONITOR_STATE_FILE = path.join(RADNAI_MONITOR_DATA_DIR, 'state.json');
const RADNAI_MONITOR_LOG_DIR = path.join(RADNAI_MONITOR_DATA_DIR, 'logs');
const server = http.createServer(app);
server.setTimeout(0); // Added to prevent timeouts during large uploads
const io = new Server(server);
app.settings = app.settings || {};

// 3. Middleware-ek (köztes szoftverek) beállítása
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fájlfeltöltés beállítása a videókhoz
const uploadsRootDirectory = DEFAULT_UPLOADS_DIR;
const clipsDirectory = path.join(uploadsRootDirectory, 'klippek');
const clipsOriginalDirectory = path.join(clipsDirectory, 'eredeti');
const clips720pDirectory = path.join(clipsDirectory, '720p');
const clips1080pDirectory = path.join(clipsDirectory, '1080p');
const clips1440pDirectory = path.join(clipsDirectory, '1440p');
const thumbnailsDirectory = path.join(uploadsRootDirectory, 'thumbnails');
const ensureDirectoryExists = (dirPath) => {
    try {
        fs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
};

ensureDirectoryExists(uploadsRootDirectory);
ensureDirectoryExists(clipsDirectory);
ensureDirectoryExists(clipsOriginalDirectory);
ensureDirectoryExists(clips720pDirectory);
ensureDirectoryExists(clips1080pDirectory);
ensureDirectoryExists(clips1440pDirectory);
ensureDirectoryExists(thumbnailsDirectory);

let isProcessing = false;
let isArchiveProcessing = false;
let cachedMovies = [];
let lastRadnaiHash = null;
let lastRadnaiCheck = null;
let lastRadnaiStatus = 'ok';
let lastRadnaiFailureReason = null;
let radnaiConsecutiveFailures = 0;
let radnaiOutageActive = false;
let lastRadnaiOutageAlertAt = null;
let radnaiMonitoringEnabled = RADNAI_MONITOR_DEFAULT_ENABLED;
let isRadnaiCheckInProgress = false;
let radnaiMonitorInterval = null;
let radnaiCleanupInterval = null;
let isRadnaiMonitorStarting = false;

async function getUploadFileSize(filename) {
    if (!filename) {
        return null;
    }

    try {
        const stats = await fs.promises.stat(path.join(uploadsRootDirectory, filename));
        return stats.size;
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Hiba a fájlméret olvasásakor (${filename}):`, err);
        }

        return null;
    }
}

async function getVideoFileSize(filename) {
    return getUploadFileSize(filename);
}

const programImagesDirectory = path.join(uploadsRootDirectory, 'programs', 'images');
const programFilesDirectory = path.join(uploadsRootDirectory, 'programs', 'files');
const academyDirectory = path.join(uploadsRootDirectory, 'akademia');
const archiveDirectory = path.join(uploadsRootDirectory, 'archivum');
const archiveVideosDirectory = path.join(archiveDirectory, 'videok');
const archiveVideosOriginalDirectory = path.join(archiveVideosDirectory, 'eredeti');
const archiveVideos720pDirectory = path.join(archiveVideosDirectory, '720p');
const archiveVideoChunkTempDirectory = path.join(archiveVideosDirectory, '_chunk_uploads');
const archiveCategoryMap = {
    kepek: {
        key: 'kepek',
        label: 'Képek',
        dir: path.join(archiveDirectory, 'kepek'),
        allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
    videok: {
        key: 'videok',
        label: 'Videók',
        dir: path.join(archiveDirectory, 'videok'),
        allowedExtensions: ['.mp4', '.mkv', '.mov', '.webm', '.ogg'],
    },
    hang: {
        key: 'hang',
        label: 'Hang',
        dir: path.join(archiveDirectory, 'hang'),
        allowedExtensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
    },
    dokumentumok: {
        key: 'dokumentumok',
        label: 'Dokumentumok',
        dir: path.join(archiveDirectory, 'dokumentumok'),
        allowedExtensions: ['.pdf'],
    },
};
const archiveVideoAllowedExtensions = new Set(
    (archiveCategoryMap.videok?.allowedExtensions || [])
        .map((ext) => String(ext).toLowerCase())
);
ensureDirectoryExists(programImagesDirectory);
ensureDirectoryExists(programFilesDirectory);
ensureDirectoryExists(academyDirectory);
ensureDirectoryExists(archiveDirectory);
ensureDirectoryExists(archiveVideosDirectory);
ensureDirectoryExists(archiveVideosOriginalDirectory);
ensureDirectoryExists(archiveVideos720pDirectory);
ensureDirectoryExists(archiveVideoChunkTempDirectory);
Object.values(archiveCategoryMap).forEach((category) => {
    ensureDirectoryExists(category.dir);
});

function normalizeHexColor(value) {
    if (!value || typeof value !== 'string') {
        return DEFAULT_TAG_COLOR;
    }
    const trimmed = value.trim();
    return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed.toUpperCase() : DEFAULT_TAG_COLOR;
}

async function ensureTagColorColumn() {
    try {
        await db.query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS color TEXT');
    } catch (err) {
        console.error('Nem sikerült biztosítani a color oszlopot a tags táblában:', err);
    }
}

async function ensureArchiveTagColorColumn() {
    try {
        await db.query('ALTER TABLE archive_tags ADD COLUMN IF NOT EXISTS color TEXT');
    } catch (err) {
        console.error('Nem sikerĂĽlt biztosĂ­tani a color oszlopot az archive_tags tĂˇblĂˇban:', err);
    }
}

function parseAcademyTagIds(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite);
            }
        } catch (err) {
            // Fall back to comma-separated list
        }
        return trimmed
            .split(',')
            .map((id) => Number.parseInt(id.trim(), 10))
            .filter(Number.isFinite);
    }
    return [];
}

function parseAcademyInlineImages(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }
    return [];
}

function sanitizeAcademyInlineImages(value) {
    const images = parseAcademyInlineImages(value)
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const rawUrl = typeof item.url === 'string' ? item.url.trim() : '';
            if (!rawUrl) {
                return null;
            }
            const safeUrl = rawUrl.startsWith('/uploads/akademia/')
                ? rawUrl
                : rawUrl;
            const title = typeof item.title === 'string' ? item.title.trim() : '';
            return { url: safeUrl, title };
        })
        .filter(Boolean);
    return images;
}

async function resolveAcademyTagIds(client, tagIds) {
    const unique = Array.from(new Set((tagIds || []).filter(Number.isFinite)));
    if (!unique.length) {
        return [];
    }
    const { rows } = await client.query('SELECT id FROM academy_tags WHERE id = ANY($1)', [unique]);
    return rows.map((row) => row.id);
}

function getVideoCreationDate(filePath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata = {}) => {
            if (err) {
                return resolve(new Date());
            }

            const creationTime = metadata.format?.tags?.creation_time
                || (metadata.streams || []).map((stream) => stream.tags?.creation_time).find(Boolean);

            const parsedDate = creationTime ? new Date(creationTime) : new Date();

            if (Number.isNaN(parsedDate.getTime())) {
                return resolve(new Date());
            }

            return resolve(parsedDate);
        });
    });
}

function getVideoHeight(filePath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata = {}) => {
            if (err) {
                return resolve(null);
            }

            const videoStream = (metadata.streams || []).find((stream) => Number.isFinite(stream.height));
            const height = Number.parseInt(videoStream?.height, 10);

            if (!Number.isFinite(height)) {
                return resolve(null);
            }

            return resolve(height);
        });
    });
}

function getVideoDuration(filePath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata = {}) => {
            if (err) {
                return resolve(null);
            }

            const formatDuration = Number.parseFloat(metadata.format?.duration);
            if (Number.isFinite(formatDuration) && formatDuration > 0) {
                return resolve(formatDuration);
            }

            const streamDuration = (metadata.streams || [])
                .map((stream) => Number.parseFloat(stream?.duration))
                .find((duration) => Number.isFinite(duration) && duration > 0);

            if (Number.isFinite(streamDuration) && streamDuration > 0) {
                return resolve(streamDuration);
            }

            return resolve(null);
        });
    });
}

function determineOriginalQualityLabel(videoHeight) {
    if (!Number.isFinite(videoHeight)) {
        return null;
    }

    if (videoHeight <= 480) {
        return '480p';
    }

    if (videoHeight <= 720) {
        return '720p';
    }

    if (videoHeight <= 1080) {
        return '1080p';
    }

    if (videoHeight <= 1440) {
        return '1440p';
    }

    return '2160p';
}

function determineTargetResolutions(videoHeight) {
    if (!Number.isFinite(videoHeight)) {
        return [];
    }

    if (videoHeight >= 2160) {
        return [1440, 1080, 720];
    }

    if (videoHeight >= 1440) {
        return [1080, 720];
    }

    if (videoHeight >= 1080) {
        return [720];
    }

    return [];
}

function buildFfmpegErrorMessage(err, stderrLines = []) {
    const normalizedLines = Array.isArray(stderrLines)
        ? stderrLines
            .map((line) => (typeof line === 'string' ? line.trim() : ''))
            .filter(Boolean)
        : [];
    const lastLines = normalizedLines.slice(-8);
    const detail = lastLines.join(' | ');
    const baseMessage = err?.message || 'Ismeretlen ffmpeg hiba.';
    const merged = detail ? `${baseMessage} | stderr: ${detail}` : baseMessage;
    return merged.slice(0, 900);
}

function normalizeProcessingErrorMessage(err, fallbackMessage) {
    const rawMessage = typeof err === 'string'
        ? err
        : err?.message;
    const normalized = (rawMessage || fallbackMessage || 'Ismeretlen feldolgozasi hiba.').toString().trim();
    if (!normalized) {
        return 'Ismeretlen feldolgozasi hiba.';
    }
    return normalized.slice(0, 900);
}

async function transcodeVideoToHeight(inputPath, outputDir, originalFilename, targetHeight) {
    const currentHeight = await getVideoHeight(inputPath);
    if (!currentHeight || currentHeight <= targetHeight) {
        return { skipped: true, reason: `Source height is ${targetHeight}p or lower` };
    }

    const targetOutputDir = outputDir || path.dirname(inputPath);
    const sourceExtension = path.extname(inputPath || '').toLowerCase();
    const extension = sourceExtension || '.mp4';
    const baseName = path.parse(inputPath).name;
    const outputFilename = `${baseName}_${targetHeight}p${extension}`;
    const outputPath = path.join(targetOutputDir, outputFilename);

    await fs.promises.mkdir(targetOutputDir, { recursive: true });

    return new Promise((resolve, reject) => {
        const ffmpegStderr = [];

        ffmpeg(inputPath)
            .outputOptions(['-map_metadata 0', '-movflags +faststart'])
            .videoFilters(`scale=-2:${targetHeight}:flags=lanczos`)
            .videoCodec('libx264')
            .audioCodec('aac')
            .output(outputPath)
            .on('end', () => resolve({ skipped: false, outputPath }))
            .on('stderr', (line) => {
                if (typeof line !== 'string') {
                    return;
                }
                ffmpegStderr.push(line);
                if (ffmpegStderr.length > 40) {
                    ffmpegStderr.shift();
                }
            })
            .on('error', (err) => reject(new Error(buildFfmpegErrorMessage(err, ffmpegStderr))))
            .run();
    });
}

function computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha1');
        const maxBytesToHash = 5 * 1024 * 1024; // 5MB
        const bufferSize = 64 * 1024;
        const buffer = Buffer.alloc(bufferSize);

        let fd;
        try {
            fd = fs.openSync(filePath, 'r');
            let totalRead = 0;

            while (totalRead < maxBytesToHash) {
                const bytesToRead = Math.min(bufferSize, maxBytesToHash - totalRead);
                const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, totalRead);

                if (bytesRead <= 0) {
                    break;
                }

                hash.update(buffer.subarray(0, bytesRead));
                totalRead += bytesRead;
            }
        } catch (err) {
            return reject(err);
        } finally {
            if (fd !== undefined) {
                try {
                    fs.closeSync(fd);
                } catch (closeErr) {
                    return reject(closeErr);
                }
            }
        }

        return resolve(hash.digest('hex'));
    });
}

function extractEmbeddedHash(filePath) {
    const HASH_PREFIX = 'UMKGL_HASH:';
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata = {}) => {
            if (err) {
                return resolve(null);
            }

            const comment = metadata.format?.tags?.comment;
            if (typeof comment === 'string') {
                const normalized = comment.trim();
                if (normalized.startsWith(HASH_PREFIX)) {
                    const embeddedHash = normalized.slice(HASH_PREFIX.length).trim();
                    return resolve(embeddedHash || null);
                }
            }

            return resolve(null);
        });
    });
}

function buildThumbnailFilename(baseName, videoId, variantTag = '') {
    const safeBaseName = (baseName || 'thumbnail')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .trim() || 'thumbnail';
    const suffix = Number.isFinite(videoId) ? `-${videoId}` : '';
    const normalizedVariant = String(variantTag || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .trim();
    const variantSuffix = normalizedVariant ? `-${normalizedVariant}` : '';
    return `${safeBaseName}${suffix}${variantSuffix}.jpg`;
}

function normalizeThumbnailSeekSeconds(seekSeconds, durationSeconds) {
    const safeSeek = Number.isFinite(seekSeconds) && seekSeconds >= 0 ? seekSeconds : 0;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return safeSeek;
    }

    const maxSeek = Math.max(durationSeconds - 0.2, 0);
    return Math.max(Math.min(safeSeek, maxSeek), 0);
}

function isFrameLikelyBlackFrame(frameStats) {
    if (!frameStats || typeof frameStats !== 'object') {
        return false;
    }

    const averageLuma = Number(frameStats.averageLuma);
    const darkRatio = Number(frameStats.darkRatio);

    if (!Number.isFinite(averageLuma) || !Number.isFinite(darkRatio)) {
        return false;
    }

    if (darkRatio >= 0.985) {
        return true;
    }

    if (darkRatio >= 0.95 && averageLuma <= 20) {
        return true;
    }

    return averageLuma <= 10;
}

function buildThumbnailSeekCandidates(durationSeconds, options = {}) {
    const randomize = options?.randomize === true;
    const preferredSeekSeconds = options?.preferredSeekSeconds;

    const candidates = [];
    const addCandidate = (value) => {
        const normalized = normalizeThumbnailSeekSeconds(value, durationSeconds);
        if (!Number.isFinite(normalized)) {
            return;
        }
        const key = normalized.toFixed(3);
        if (!candidates.some((entry) => entry.key === key)) {
            candidates.push({ key, value: normalized });
        }
    };

    if (Number.isFinite(preferredSeekSeconds)) {
        addCandidate(preferredSeekSeconds);
    }

    if (!randomize) {
        addCandidate(1);
    }

    if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
        if (randomize) {
            for (let i = 0; i < 8; i += 1) {
                const randomRatio = 0.08 + (Math.random() * 0.84);
                addCandidate(durationSeconds * randomRatio);
            }
        }

        addCandidate(durationSeconds * 0.2);
        addCandidate(durationSeconds * 0.35);
        addCandidate(durationSeconds * 0.5);
        addCandidate(durationSeconds * 0.7);
        addCandidate(durationSeconds * 0.85);
    } else {
        addCandidate(1);
    }

    if (randomize) {
        addCandidate(1);
    }

    return candidates.map((entry) => entry.value);
}

function sampleVideoFrameLuma(videoPath, seekSeconds) {
    const safeSeek = Number.isFinite(seekSeconds) && seekSeconds >= 0 ? seekSeconds : 0;

    return new Promise((resolve, reject) => {
        const chunks = [];
        const ffmpegStderr = [];
        let settled = false;

        const settle = (handler, value) => {
            if (settled) {
                return;
            }
            settled = true;
            handler(value);
        };

        const stream = ffmpeg(videoPath)
            .seekInput(safeSeek)
            .frames(1)
            .noAudio()
            .outputOptions([
                '-vf scale=64:36:flags=fast_bilinear,format=gray',
                '-pix_fmt gray',
                '-f rawvideo',
            ])
            .on('stderr', (line) => {
                if (typeof line !== 'string') {
                    return;
                }
                ffmpegStderr.push(line);
                if (ffmpegStderr.length > 40) {
                    ffmpegStderr.shift();
                }
            })
            .on('error', (err) => settle(reject, new Error(buildFfmpegErrorMessage(err, ffmpegStderr))))
            .pipe();

        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', (err) => settle(reject, err));
        stream.on('end', () => {
            const frameData = Buffer.concat(chunks);
            if (!frameData.length) {
                return settle(resolve, null);
            }

            let darkPixels = 0;
            let lumaSum = 0;
            const totalPixels = frameData.length;

            for (const value of frameData) {
                lumaSum += value;
                if (value <= 18) {
                    darkPixels += 1;
                }
            }

            const averageLuma = totalPixels > 0 ? lumaSum / totalPixels : 0;
            const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0;

            return settle(resolve, { averageLuma, darkRatio });
        });
    });
}

function renderThumbnailFrame(videoPath, outputPath, seekSeconds) {
    const safeSeek = Number.isFinite(seekSeconds) && seekSeconds >= 0 ? seekSeconds : 0;

    return new Promise((resolve, reject) => {
        const ffmpegStderr = [];

        ffmpeg(videoPath)
            .seekInput(safeSeek)
            .frames(1)
            .outputOptions('-q:v 2')
            .on('stderr', (line) => {
                if (typeof line !== 'string') {
                    return;
                }
                ffmpegStderr.push(line);
                if (ffmpegStderr.length > 40) {
                    ffmpegStderr.shift();
                }
            })
            .on('end', resolve)
            .on('error', (err) => reject(new Error(buildFfmpegErrorMessage(err, ffmpegStderr))))
            .save(outputPath);
    });
}

async function generateThumbnailForVideo(videoPath, baseName, videoId, options = {}) {
    const outputFilename = buildThumbnailFilename(baseName, videoId, options?.variantTag);
    await fs.promises.mkdir(thumbnailsDirectory, { recursive: true });
    const outputPath = path.join(thumbnailsDirectory, outputFilename);

    const durationSeconds = await getVideoDuration(videoPath);
    const preferredSeekSeconds = options?.preferredSeekSeconds;
    const useStrictPreferredSeek = options?.strictPreferredSeek === true && Number.isFinite(preferredSeekSeconds);
    if (useStrictPreferredSeek) {
        const exactSeek = normalizeThumbnailSeekSeconds(preferredSeekSeconds, durationSeconds);
        await renderThumbnailFrame(videoPath, outputPath, exactSeek);
        return path.posix.join('thumbnails', outputFilename);
    }

    const seekCandidates = buildThumbnailSeekCandidates(durationSeconds, options);

    let selectedSeek = seekCandidates[0] || normalizeThumbnailSeekSeconds(1, durationSeconds);

    for (const candidateSeek of seekCandidates) {
        try {
            const frameStats = await sampleVideoFrameLuma(videoPath, candidateSeek);
            if (!isFrameLikelyBlackFrame(frameStats)) {
                selectedSeek = candidateSeek;
                break;
            }
        } catch (analysisErr) {
            console.warn('Nem sikerult elemezni a thumbnail frame-et (' + videoPath + '):', analysisErr);
        }
    }

    await renderThumbnailFrame(videoPath, outputPath, selectedSeek);

    return path.posix.join('thumbnails', outputFilename);
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, clipsOriginalDirectory);
    },
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

async function safeUnlink(filePath) {
    try {
        await fs.promises.unlink(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

async function deleteVideoRecord(video) {
    if (!video || !video.id) {
        return;
    }

    const targets = [];

    if (video.filename) {
        targets.push(path.join(uploadsRootDirectory, video.filename));

        const folderName = path.posix.basename(path.posix.dirname(video.filename));
        const extension = path.extname(video.filename) || '.mp4';
        const baseNameFor720 = path.parse(video.original_name || '').name || path.parse(video.filename).name;

        if (folderName && folderName !== '.' && baseNameFor720) {
            const path720 = path.join(clips720pDirectory, folderName, `${baseNameFor720}_720p${extension}`);
            targets.push(path720);
        }
    }

    if (video.thumbnail_filename) {
        targets.push(path.join(uploadsRootDirectory, video.thumbnail_filename));
    }

    for (const target of targets) {
        await safeUnlink(target);
    }

    await db.query('DELETE FROM videos WHERE id = $1', [video.id]);
}

function resolveArchiveFolderNameFromFilename(filename) {
    const normalizedPath = String(filename || '').replace(/\\/g, '/');
    const segments = normalizedPath.split('/').filter(Boolean);
    const originalIndex = segments.indexOf('eredeti');
    if (originalIndex >= 0 && originalIndex + 1 < segments.length) {
        return segments[originalIndex + 1];
    }

    if (segments.length >= 2) {
        return segments[segments.length - 2];
    }

    return null;
}

function resolveArchiveVideoFolder(video) {
    const direct = normalizeArchiveFolderName(video?.folder_name || '');
    if (direct) {
        return direct;
    }
    const fromPath = normalizeArchiveFolderName(resolveArchiveFolderNameFromFilename(video?.filename || ''));
    if (fromPath) {
        return fromPath;
    }
    return 'egyeb';
}

function buildArchiveVideoResolutionOutputPaths(video, targetHeight) {
    const parsedFilename = path.parse(video?.filename || '');
    const extension = parsedFilename.ext || path.extname(video?.original_name || '') || '.mp4';
    const technicalBaseName = parsedFilename.name || 'video';
    const folderName = resolveArchiveVideoFolder(video);
    const targetLabel = `${targetHeight}p`;
    const baseDir = targetHeight === 720 ? archiveVideos720pDirectory : archiveVideosOriginalDirectory;
    const outputDir = path.join(baseDir, folderName);
    const outputFilename = `${technicalBaseName}_${targetLabel}${extension}`;
    const outputPath = path.join(outputDir, outputFilename);

    return { outputDir, outputPath, outputFilename, targetLabel };
}

async function deleteArchiveVideoRecord(video) {
    if (!video || !video.id) {
        return;
    }

    const targets = [];
    if (video.filename) {
        targets.push(path.join(uploadsRootDirectory, video.filename));
        const { outputPath } = buildArchiveVideoResolutionOutputPaths(video, 720);
        targets.push(outputPath);
    }

    if (video.thumbnail_filename) {
        targets.push(path.join(uploadsRootDirectory, video.thumbnail_filename));
    }

    for (const target of targets) {
        await safeUnlink(target);
    }

    await db.query('DELETE FROM archive_videos WHERE id = $1', [video.id]);
}

const programStorage = multer.diskStorage({
    destination: (_req, file, cb) => {
        if (file.fieldname === 'image') {
            return cb(null, programImagesDirectory);
        }
        if (file.fieldname === 'file') {
            return cb(null, programFilesDirectory);
        }
        cb(new Error('Ismeretlen fájl mező.'));
    },
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const uploadProgramFiles = multer({ storage: programStorage });

const academyStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, academyDirectory),
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const academyFileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.fieldname === 'cover') {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
        return allowed.includes(ext)
            ? cb(null, true)
            : cb(new Error('Csak PNG, JPG vagy WEBP borítókép engedélyezett.'));
    }
    if (file.fieldname === 'pdf') {
        return ext === '.pdf'
            ? cb(null, true)
            : cb(new Error('Csak PDF fájl tölthető fel.'));
    }
    return cb(new Error('Ismeretlen fájl mező.'));
};

const uploadAcademyFiles = multer({ storage: academyStorage, fileFilter: academyFileFilter });

const academyImageFileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    return allowed.includes(ext)
        ? cb(null, true)
        : cb(new Error('Csak PNG, JPG, WEBP vagy GIF képfájl tölthető fel.'));
};

const uploadAcademyImage = multer({ storage: academyStorage, fileFilter: academyImageFileFilter });

const archiveStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const categoryInfo = resolveArchiveCategory(req.params.category);
        const folderPath = resolveArchiveFolderPath(categoryInfo, req.params.folder);
        if (!categoryInfo || !folderPath) {
            return cb(new Error('Érvénytelen archívum kategória vagy mappa.'));
        }
        ensureDirectoryExists(folderPath);
        req.archiveTargetDir = folderPath;
        cb(null, folderPath);
    },
    filename: (req, file, cb) => {
        const targetDir = req.archiveTargetDir;
        const safeName = buildArchiveFilename(targetDir, file.originalname);
        cb(null, safeName);
    }
});

const archiveFileFilter = (req, file, cb) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    if (!categoryInfo) {
        return cb(new Error('Ismeretlen archívum kategória.'));
    }
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (categoryInfo.allowedExtensions.includes(ext)) {
        return cb(null, true);
    }
    return cb(new Error('Nem engedélyezett fájltípus.'));
};

const uploadArchiveFiles = multer({ storage: archiveStorage, fileFilter: archiveFileFilter });

const archiveVideoStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const categoryInfo = resolveArchiveCategory('videok');
        const folderPath = resolveArchiveFolderPath(categoryInfo, req.params.folder);
        if (!categoryInfo || !folderPath) {
            return cb(new Error('Érvénytelen videó mappa.'));
        }
        ensureDirectoryExists(folderPath);
        req.archiveVideoTargetDir = folderPath;
        return cb(null, folderPath);
    },
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const archiveVideoFileFilter = (_req, file, cb) => {
    if (getArchiveVideoExtension(file.originalname)) {
        return cb(null, true);
    }
    return cb(new Error('Nem engedelyezett videoformatum.'));
};

const uploadArchiveVideos = multer({ storage: archiveVideoStorage, fileFilter: archiveVideoFileFilter });

const archiveVideoChunkStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        ensureDirectoryExists(archiveVideoChunkTempDirectory);
        cb(null, archiveVideoChunkTempDirectory);
    },
    filename: (req, _file, cb) => {
        const uploadId = normalizeArchiveChunkUploadId(req.body?.uploadId) || `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const chunkIndex = Number.parseInt(req.body?.chunkIndex, 10);
        cb(null, `${uploadId}-${Number.isInteger(chunkIndex) ? chunkIndex : 'x'}-${Math.round(Math.random() * 1e9)}.part`);
    }
});

const uploadArchiveVideoChunks = multer({
    storage: archiveVideoChunkStorage,
    limits: {
        files: 1,
        fileSize: 25 * 1024 * 1024,
    },
});


function getNumberSetting(value, defaultValue) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return defaultValue;
}

async function loadAppSettings() {
    try {
        const { rows } = await db.query('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach((row) => {
            settings[row.key] = row.value;
        });
        Object.assign(app.settings, settings);
        return settings;
    } catch (err) {
        console.error('Hiba a beállítások betöltésekor:', err);
        throw err;
    }
}

// Hitelesítési middleware a védett végpontokhoz
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Hiányzó hitelesítési token.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Érvénytelen vagy lejárt token.' });
        }

        req.user = {
            id: user.id,
            username: user.username,
            isAdmin: !!user.isAdmin
        };
        next();
    });
}

async function isAdmin(req, res, next) {
    const userId = req.user && req.user.id;
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
        const { rows } = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (Number(user.is_admin) !== 1) {
            return res.status(403).json({ message: 'Admin access required.' });
        }

        req.user.isAdmin = true;
        return next();
    } catch (err) {
        console.error('Error checking admin permission:', err);
        return res.status(500).json({ message: 'Failed to verify admin permission.' });
    }
}

async function ensureClipViewPermission(req, res, next) {
    const userId = req.user && req.user.id;

    if (!userId) {
        return res.status(401).json({ message: 'Bejelentkezés szükséges.' });
    }

    if (req.user.isAdmin) {
        return next();
    }

    try {
        const { rows } = await db.query('SELECT can_view_clips FROM users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        if (Number(user.can_view_clips) !== 1) {
            return res.status(403).json({ message: 'Nincs jogosultság a klipek megtekintésére.' });
        }

        return next();
    } catch (err) {
        console.error('Hiba a klipekhez való jogosultság ellenőrzésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült ellenőrizni a jogosultságot.' });
    }
}

function formatForPico(movieData) {
    const source = Array.isArray(movieData) ? movieData : [];

    return source
        .slice(0, 20)
        .map((movie) => ({
            c: (movie?.cinema || '').toString(),
            t: (movie?.title || '').toString().slice(0, 25),
            ti: (movie?.times || '').toString(),
        }));
}

function resolveArchiveCategory(category) {
    if (!category) {
        return null;
    }
    const key = String(category).toLowerCase();
    return archiveCategoryMap[key] || null;
}

function getArchiveVideoExtension(filename) {
    const ext = path.extname(String(filename || '')).toLowerCase();
    return archiveVideoAllowedExtensions.has(ext) ? ext : null;
}

function normalizeArchiveFolderName(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (trimmed.length > 80) {
        return null;
    }
    if (/[<>:"/\\|?*\x00-\x1F]/.test(trimmed)) {
        return null;
    }
    if (trimmed.includes('..')) {
        return null;
    }
    if (/[.\s]$/.test(trimmed)) {
        return null;
    }
    return trimmed;
}

function getArchiveCategoryFolderRoot(categoryInfo) {
    if (!categoryInfo) {
        return null;
    }
    if (categoryInfo.key === 'videok') {
        return archiveVideosOriginalDirectory;
    }
    return categoryInfo.dir;
}

function resolveArchiveFolderPath(categoryInfo, folderName) {
    const safeName = normalizeArchiveFolderName(folderName);
    const folderRoot = getArchiveCategoryFolderRoot(categoryInfo);
    if (!safeName || !folderRoot) {
        return null;
    }
    const folderPath = path.normalize(path.join(folderRoot, safeName));
    if (!folderPath.startsWith(folderRoot)) {
        return null;
    }
    return folderPath;
}

function resolveArchive720pFolderPath(folderName) {
    const safeName = normalizeArchiveFolderName(folderName);
    if (!safeName) {
        return null;
    }
    const folderPath = path.normalize(path.join(archiveVideos720pDirectory, safeName));
    if (!folderPath.startsWith(archiveVideos720pDirectory)) {
        return null;
    }
    return folderPath;
}

function buildArchiveFileUrl(categoryKey, folderName, filename) {
    const parts = categoryKey === 'videok'
        ? ['uploads', 'archivum', categoryKey, 'eredeti', folderName, filename]
        : ['uploads', 'archivum', categoryKey, folderName, filename];
    const encoded = parts.map((part) => encodeURIComponent(part));
    return `/${encoded.join('/')}`;
}

function buildArchiveFilename(targetDir, originalName) {
    const normalized = normalizeFilename(originalName || '');
    const parsed = path.parse(normalized);
    const rawBase = parsed.name || 'file';
    const safeBase = rawBase.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'file';
    const safeExt = (parsed.ext || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').toLowerCase();
    let candidate = `${safeBase}${safeExt}`;
    let counter = 1;
    while (fs.existsSync(path.join(targetDir, candidate))) {
        candidate = `${safeBase} (${counter})${safeExt}`;
        counter += 1;
    }
    return candidate;
}


function normalizeArchiveChunkUploadId(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (!/^[a-zA-Z0-9_-]{8,120}$/.test(trimmed)) {
        return null;
    }
    return trimmed;
}

function parseArchiveTagIds(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return Array.from(new Set(value
            .map((id) => Number.parseInt(id, 10))
            .filter((id) => Number.isInteger(id))));
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return Array.from(new Set(parsed
                    .map((id) => Number.parseInt(id, 10))
                    .filter((id) => Number.isInteger(id))));
            }
        } catch (err) {
            // Fallback to CSV list.
        }
        return Array.from(new Set(trimmed
            .split(',')
            .map((id) => Number.parseInt(id.trim(), 10))
            .filter((id) => Number.isInteger(id))));
    }
    return [];
}

async function resolveValidArchiveTagIds(tagIds) {
    const uniqueTagIds = Array.from(new Set((tagIds || [])
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => Number.isInteger(id))));
    if (!uniqueTagIds.length) {
        return [];
    }
    const { rows } = await db.query('SELECT id FROM archive_tags WHERE id = ANY($1)', [uniqueTagIds]);
    return Array.from(new Set((rows || [])
        .map((row) => Number.parseInt(row.id, 10))
        .filter((id) => Number.isInteger(id))));
}

async function readArchiveChunkState(statePath) {
    try {
        const raw = await fs.promises.readFile(statePath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return null;
        }
        throw err;
    }
}

async function writeArchiveChunkState(statePath, state) {
    await fs.promises.writeFile(statePath, JSON.stringify(state), 'utf8');
}

async function appendChunkToStagingFile(stagingPath, chunkPath) {
    const buffer = await fs.promises.readFile(chunkPath);
    await fs.promises.appendFile(stagingPath, buffer);
}

async function cleanupArchiveChunkUpload(uploadId) {
    const safeUploadId = normalizeArchiveChunkUploadId(uploadId);
    if (!safeUploadId) {
        return;
    }
    const stagingPath = path.join(archiveVideoChunkTempDirectory, `${safeUploadId}.upload`);
    const statePath = path.join(archiveVideoChunkTempDirectory, `${safeUploadId}.json`);
    await safeUnlink(stagingPath);
    await safeUnlink(statePath);
}

async function ensureArchiveChunkCleanup(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
        const entries = await fs.promises.readdir(archiveVideoChunkTempDirectory, { withFileTypes: true });
        const now = Date.now();
        for (const entry of entries) {
            if (!entry.isFile()) {
                continue;
            }
            if (!entry.name.endsWith('.json')) {
                continue;
            }
            const uploadId = entry.name.slice(0, -5);
            const statePath = path.join(archiveVideoChunkTempDirectory, entry.name);
            const state = await readArchiveChunkState(statePath);
            const createdAt = Number(state?.createdAt) || 0;
            if (!createdAt || now - createdAt > maxAgeMs) {
                await cleanupArchiveChunkUpload(uploadId);
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Hiba a regi archiv chunk feltoltesek torlesekor:', err);
        }
    }
}
async function createArchiveVideoRecord({ folderName, storedFilename, originalName, uploaderId, filePath, tagIds }) {
    const contentCreatedAt = await getVideoCreationDate(filePath);
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const insertResult = await client.query(
            `INSERT INTO archive_videos (folder_name, filename, original_name, uploader_id, content_created_at, processing_status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [folderName, storedFilename, originalName, uploaderId, contentCreatedAt, 'pending']
        );
        const videoId = Number.parseInt(insertResult.rows[0]?.id, 10);

        if (videoId && Array.isArray(tagIds) && tagIds.length) {
            for (const tagId of tagIds) {
                await client.query(
                    'INSERT INTO archive_video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [videoId, tagId]
                );
            }
        }

        await client.query('COMMIT');
        return videoId;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function ensureArchiveViewPermission(req, res, next) {
    const userId = req.user && req.user.id;

    if (!userId) {
        return res.status(401).json({ message: 'Bejelentkezés szükséges.' });
    }

    if (req.user.isAdmin) {
        return next();
    }

    try {
        const { rows } = await db.query('SELECT can_view_archive, can_edit_archive FROM users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        const canEditArchive = Number(user.can_edit_archive) === 1;
        const canViewArchive = Number(user.can_view_archive) === 1 || canEditArchive;

        if (!canViewArchive) {
            return res.status(403).json({ message: 'Nincs jogosultság az archívum megtekintéséhez.' });
        }

        return next();
    } catch (err) {
        console.error('Hiba az archívum jogosultság ellenőrzésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült ellenőrizni a jogosultságot.' });
    }
}

async function ensureArchiveEditPermission(req, res, next) {
    const userId = req.user && req.user.id;

    if (!userId) {
        return res.status(401).json({ message: 'Bejelentkezés szükséges.' });
    }

    if (req.user.isAdmin) {
        return next();
    }

    try {
        const { rows } = await db.query('SELECT can_edit_archive FROM users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        if (Number(user.can_edit_archive) !== 1) {
            return res.status(403).json({ message: 'Nincs jogosultság az archívum szerkesztéséhez.' });
        }

        return next();
    } catch (err) {
        console.error('Hiba az archívum szerkesztési jogosultság ellenőrzésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült ellenőrizni a jogosultságot.' });
    }
}

async function loadUserUploadSettings(req, res, next) {
    const userId = req.user && req.user.id;

    if (!userId) {
        return res.status(403).json({ message: 'Hiányzó felhasználói információ.' });
    }

    try {
        const { rows } = await db.query('SELECT can_upload, upload_count, max_file_size_mb, max_videos FROM users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        if (Number(user.can_upload) !== 1) {
            return res.status(403).json({ message: 'Nincs feltöltési jogosultságod.' });
        }

        const defaultMaxFileSizeMb = getNumberSetting(app.settings && app.settings.max_file_size_mb, 50);
        const maxFileSizeMb = getNumberSetting(user.max_file_size_mb, defaultMaxFileSizeMb);
        const maxVideos = getNumberSetting(user.max_videos, 0);
        const uploadCount = Number(user.upload_count) || 0;

        if (maxVideos > 0 && uploadCount >= maxVideos) {
            return res.status(403).json({ message: 'Elérted a maximális feltöltési limitet.' });
        }

        req.uploadSettings = {
            maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
            maxVideos,
            uploadCount
        };

        return next();
    } catch (err) {
        console.error('Hiba a felhasználói beállítások lekérdezésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült lekérdezni a feltöltési beállításokat.' });
    }
}

// Videófájlok kiszolgálása szakaszos (Range) kérések támogatásával a stabil lejátszásért
const VIDEO_MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska'
};

function isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return Object.prototype.hasOwnProperty.call(VIDEO_MIME_TYPES, ext);
}

function getVideoMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return VIDEO_MIME_TYPES[ext] || 'application/octet-stream';
}

app.get('/uploads/*', (req, res) => {
    const requestedFile = req.params[0] || '';
    const safeFilePath = path.normalize(path.join(uploadsRootDirectory, requestedFile));

    if (!safeFilePath.startsWith(uploadsRootDirectory)) {
        return res.status(400).json({ message: 'Érvénytelen fájlnév.' });
    }

    const serveFromPath = (filePath) => {
        fs.stat(filePath, (statErr, stats) => {
            if (statErr || !stats.isFile()) {
                return res.status(404).json({ message: 'A kért videó nem található.' });
            }

            if (!isVideoFile(filePath)) {
                return res.sendFile(filePath);
            }

            const fileSize = stats.size;
            const range = req.headers.range;
            const mimeType = getVideoMimeType(filePath);

            if (!range) {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': mimeType,
                    'Accept-Ranges': 'bytes'
                });
                return fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 }).pipe(res);
            }

            const rangeMatch = range.replace(/bytes=/, '').split('-');
            const start = Number.parseInt(rangeMatch[0], 10);
            const end = rangeMatch[1] ? Math.min(Number.parseInt(rangeMatch[1], 10), fileSize - 1) : fileSize - 1;

            if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize) {
                res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
                return;
            }

            const chunkSize = end - start + 1;
            const stream = fs.createReadStream(filePath, { start, end, highWaterMark: 1024 * 1024 });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType
            });

            stream.pipe(res);
        });
    };

    fs.stat(safeFilePath, (err, stats) => {
        if (!err && stats.isFile()) {
            serveFromPath(safeFilePath);
            return;
        }

        // Régi struktúrában tárolt fájlok támogatása
        const legacyPath = path.normalize(path.join(clipsDirectory, requestedFile));
        if (legacyPath.startsWith(uploadsRootDirectory)) {
            return serveFromPath(legacyPath);
        }

        return res.status(404).json({ message: 'A kért videó nem található.' });
    });
});

// 4. Statikus fájlok kiszolgálása
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve uploads from D: drive
app.use('/uploads', express.static(uploadsRootDirectory));

const activeReceivers = new Map();
const receiverSockets = new Map();
const RECEIVER_STALE_MS = Number(process.env.RECEIVER_STALE_MS) || 30000;
const RECEIVER_CLEANUP_INTERVAL_MS = Number(process.env.RECEIVER_CLEANUP_INTERVAL_MS) || 10000;

function getReceiversList() {
    return Array.from(activeReceivers.values()).map(({ userId, username, peerId, profilePictureFilename }) => ({
        userId,
        username,
        peerId,
        profile_picture_filename: profilePictureFilename,
    }));
}

function broadcastReceiversList() {
    io.emit('update_receivers_list', getReceiversList());
}

function removeReceiverBySocket(socketId) {
    let changed = false;
    const userId = receiverSockets.get(socketId);
    if (userId) {
        receiverSockets.delete(socketId);
        const receiver = activeReceivers.get(userId);
        if (receiver && receiver.socketId === socketId) {
            activeReceivers.delete(userId);
            changed = true;
        }
    }

    if (!changed) {
        for (const [activeUserId, receiver] of activeReceivers.entries()) {
            if (receiver.socketId === socketId) {
                activeReceivers.delete(activeUserId);
                changed = true;
                break;
            }
        }
    }

    if (changed) {
        broadcastReceiversList();
    }
}

function touchReceiverBySocket(socketId, peerId) {
    const userId = receiverSockets.get(socketId);
    if (!userId) {
        return false;
    }

    const receiver = activeReceivers.get(userId);
    if (!receiver || receiver.socketId !== socketId) {
        return false;
    }

    const updated = {
        ...receiver,
        lastSeen: Date.now(),
    };

    let changed = false;
    if (peerId && receiver.peerId !== peerId) {
        updated.peerId = peerId;
        changed = true;
    }

    activeReceivers.set(userId, updated);
    return changed;
}

function cleanupStaleReceivers() {
    const now = Date.now();
    let changed = false;

    for (const [userId, receiver] of activeReceivers.entries()) {
        if (!receiver.lastSeen || now - receiver.lastSeen > RECEIVER_STALE_MS) {
            activeReceivers.delete(userId);
            if (receiver.socketId) {
                receiverSockets.delete(receiver.socketId);
            }
            changed = true;
        }
    }

    if (changed) {
        broadcastReceiversList();
    }
}

const receiverCleanupTimer = setInterval(cleanupStaleReceivers, RECEIVER_CLEANUP_INTERVAL_MS);
receiverCleanupTimer.unref?.();

io.on('connection', (socket) => {
    socket.emit('update_receivers_list', getReceiversList());

    socket.on('register_receiver', async ({ token, peerId }) => {
        if (!token || !peerId) {
            return;
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id;
            const { rows } = await db.query('SELECT username, can_transfer, profile_picture_filename FROM users WHERE id = $1', [userId]);
            const user = rows[0];

            if (!user || Number(user.can_transfer) !== 1) {
                socket.emit('receiver_error', { message: 'Nincs jogosultság a fájlküldésre.' });
                removeReceiverBySocket(socket.id);
                return;
            }

            const existing = activeReceivers.get(userId);
            if (existing && existing.socketId && existing.socketId !== socket.id) {
                receiverSockets.delete(existing.socketId);
            }

            activeReceivers.set(userId, {
                userId,
                username: user.username,
                peerId,
                profilePictureFilename: user.profile_picture_filename,
                socketId: socket.id,
                lastSeen: Date.now(),
            });
            receiverSockets.set(socket.id, userId);
            broadcastReceiversList();
        } catch (err) {
            console.error('Hiba a fogadó regisztrációja során:', err);
            socket.emit('receiver_error', { message: 'Nem sikerült regisztrálni fogadóként.' });
            removeReceiverBySocket(socket.id);
        }
    });

    socket.on('unregister_receiver', () => {
        removeReceiverBySocket(socket.id);
    });

    socket.on('receiver_heartbeat', ({ peerId } = {}) => {
        const changed = touchReceiverBySocket(socket.id, peerId);
        if (changed) {
            broadcastReceiversList();
        }
    });

    socket.on('disconnect', () => {
        removeReceiverBySocket(socket.id);
    });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO users (username, password) VALUES ($1, $2)';
        await db.query(insertQuery, [username, hashedPassword]);
        res.status(201).json({ message: 'Sikeres regisztráció.' });
    } catch (err) {
        if (err.code === '23505') { // unique_violation for PostgreSQL
            return res.status(409).json({ message: 'A felhasználónév már létezik.' });
        }
        console.error('Hiba a felhasználó mentésekor:', err);
        res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    try {
        const { rows } = await db.query('SELECT id, username, password, is_admin, can_transfer, can_view_clips, can_view_archive, can_edit_archive, profile_picture_filename, preferred_quality FROM users WHERE username = $1', [username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
        }

        const isAdmin = user.is_admin === 1;
        const payload = { id: user.id, username: user.username, isAdmin };
        const token = generateAuthToken(payload);

        const canViewClips = isAdmin || Number(user.can_view_clips) === 1;
        const canEditArchive = isAdmin || Number(user.can_edit_archive) === 1;
        const canViewArchive = isAdmin || Number(user.can_view_archive) === 1 || canEditArchive;

        res.status(200).json({
            message: 'Sikeres bejelentkezés.',
            token,
            username: user.username,
            isAdmin,
            canTransfer: Number(user.can_transfer) === 1,
            canViewClips,
            canViewArchive,
            canEditArchive,
            profile_picture_filename: user.profile_picture_filename,
            preferred_quality: user.preferred_quality || '1080p'
        });
    } catch (err) {
        console.error('Hiba a bejelentkezés során:', err);
        res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
    }
});

app.post('/logout', (req, res) => {
    res.status(200).json({ message: 'Sikeres kijelentkezés.' });
});

app.post('/api/pico/refresh-movies', async (_req, res) => {
    try {
        const result = await cinemaScraper.getAllMovies();
        cachedMovies = Array.isArray(result?.data) ? result.data : [];
        return res.status(200).json({ message: 'Cache updated.' });
    } catch (err) {
        console.error('Hiba a mozi cache frissitese kozben:', err);
        return res.status(500).json({ message: 'Nem sikerult frissiteni a movie cache-t.' });
    }
});

app.get('/api/pico/movies', (_req, res) => {
    return res.status(200).json(formatForPico(cachedMovies));
});

app.get('/api/admin/fetch-movies', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const result = await cinemaScraper.getAllMovies();
        cachedMovies = Array.isArray(result?.data) ? result.data : [];

        return res.status(200).json({
            movieData: cachedMovies,
            logs: Array.isArray(result?.logs) ? result.logs : [],
        });
    } catch (err) {
        console.error('Hiba a mozi adatok admin lekerdezese soran:', err);
        return res.status(500).json({
            movieData: [],
            logs: ['Hiba tortent a Cinema City adatok lekerdezese kozben.'],
        });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, is_admin, can_transfer, can_view_clips, can_view_archive, can_edit_archive, profile_picture_filename, preferred_quality FROM users WHERE id = $1', [req.user.id]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        const isAdminUser = user.is_admin === 1;
        const canEditArchive = isAdminUser || Number(user.can_edit_archive) === 1;
        const canViewArchive = isAdminUser || Number(user.can_view_archive) === 1 || canEditArchive;
        res.status(200).json({
            id: user.id,
            username: user.username,
            isAdmin: isAdminUser,
            canTransfer: Number(user.can_transfer) === 1,
            canViewClips: isAdminUser || Number(user.can_view_clips) === 1,
            canViewArchive,
            canEditArchive,
            profile_picture_filename: user.profile_picture_filename,
            preferred_quality: user.preferred_quality || '1080p'
        });
    } catch (err) {
        console.error('Hiba a profiladatok lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a profiladatokat.' });
    }
});

app.post('/api/profile/update-quality', authenticateToken, async (req, res) => {
    const { quality } = req.body || {};
    const allowedQualities = ['original', '1440p', '1080p', '720p'];

    if (!allowedQualities.includes(quality)) {
        return res.status(400).json({ message: 'Érvénytelen minőség érték.' });
    }

    try {
        await db.query('UPDATE users SET preferred_quality = $1 WHERE id = $2', [quality, req.user.id]);
        res.status(200).json({ message: 'A minőségi beállítás frissítve.', preferred_quality: quality });
    } catch (err) {
        console.error('Hiba a minőségi beállítás frissítésekor:', err);
        res.status(500).json({ message: 'Nem sikerült frissíteni a minőségi beállítást.' });
    }
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const query = 'SELECT id, username, can_upload, can_transfer, can_view_clips, can_view_archive, can_edit_archive, max_file_size_mb, max_videos, upload_count FROM users';
        const { rows } = await db.query(query);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Hiba a felhasználók lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a felhasználókat.' });
    }
});

app.post('/api/users/permissions/batch-update', authenticateToken, isAdmin, async (req, res) => {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'A kérés törzsében egy tömbnek kell szerepelnie.' });
    }
    if (req.body.length === 0) {
        return res.status(200).json({ message: 'Nincs frissítendő jogosultság.' });
    }

    const updates = req.body.map(item => {
        const canEditArchive = item.canEditArchive ? 1 : 0;
        const canViewArchive = (item.canViewArchive ? 1 : 0) || canEditArchive;

        return ({
            userId: Number.parseInt(item.userId, 10),
            canUpload: item.canUpload ? 1 : 0,
            canTransfer: item.canTransfer ? 1 : 0,
            canViewClips: item.canViewClips ? 1 : 0,
            canViewArchive,
            canEditArchive,
            maxFileSizeMb: Number(item.maxFileSizeMb),
            maxVideos: Number(item.maxVideos)
        });
    });

    // Simple validation (can be improved)
    if (updates.some(u => isNaN(u.userId) || isNaN(u.maxFileSizeMb) || isNaN(u.maxVideos))) {
        return res.status(400).json({ message: 'Érvénytelen adatok a kérésben.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        for (const update of updates) {
            const result = await client.query(
                'UPDATE users SET can_upload = $1, can_transfer = $2, can_view_clips = $3, can_view_archive = $4, can_edit_archive = $5, max_file_size_mb = $6, max_videos = $7 WHERE id = $8',
                [
                    update.canUpload,
                    update.canTransfer,
                    update.canViewClips,
                    update.canViewArchive,
                    update.canEditArchive,
                    Math.round(update.maxFileSizeMb),
                    Math.round(update.maxVideos),
                    update.userId
                ]
            );
            if (result.rowCount === 0) {
                throw new Error(`A ${update.userId} azonosítójú felhasználó nem található.`);
            }
        }
        await client.query('COMMIT');
        res.status(200).json({ message: 'Jogosultságok sikeresen frissítve.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba a jogosultságok frissítésekor:', err);
        const userNotFound = err.message.includes('felhasználó nem található');
        res.status(userNotFound ? 404 : 500).json({ message: userNotFound ? err.message : 'Nem sikerült frissíteni a jogosultságokat.' });
    } finally {
        client.release();
    }
});

app.get('/api/settings', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.status(200).json(settings);
    } catch (err) {
        console.error('Hiba a beállítások lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a beállításokat.' });
    }
});

app.post('/api/settings', authenticateToken, isAdmin, async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: 'Érvénytelen beállítás adatok.' });
    }
    const entries = Object.entries(req.body);
    if (entries.length === 0) {
        return res.status(400).json({ message: 'Nincs frissítendő beállítás.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        for (const [key, value] of entries) {
            await client.query('UPDATE settings SET value = $1 WHERE key = $2', [String(value), key]);
        }
        await client.query('COMMIT');

        await loadAppSettings();
        res.status(200).json({ message: 'Beállítások sikeresen frissítve.', settings: app.settings });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba a beállítások frissítésekor:', err);
        res.status(500).json({ message: 'Nem sikerült frissíteni a beállításokat.' });
    } finally {
        client.release();
    }
});

app.post('/api/polls', authenticateToken, async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const optionsInput = Array.isArray(req.body?.options) ? req.body.options : [];

    if (!question) {
        return res.status(400).json({ message: 'A kérdés megadása kötelező.' });
    }

    const uniqueOptions = [...new Set(optionsInput.map(o => String(o).trim()).filter(o => o))];

    if (uniqueOptions.length < 2) {
        return res.status(400).json({ message: 'Legalább két különböző válaszlehetőség szükséges.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const pollResult = await client.query('INSERT INTO polls (question, creator_id, is_active) VALUES ($1, $2, 1) RETURNING id', [question, req.user.id]);
        const pollId = pollResult.rows[0].id;

        for (let i = 0; i < uniqueOptions.length; i++) {
            await client.query('INSERT INTO poll_options (poll_id, option_text, position) VALUES ($1, $2, $3)', [pollId, uniqueOptions[i], i]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Szavazás sikeresen létrehozva.', pollId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba a szavazás létrehozásakor:', err);
        res.status(500).json({ message: 'Nem sikerült létrehozni a szavazást.' });
    } finally {
        client.release();
    }
});

app.get('/api/polls', async (req, res) => {
    try {
        const pollsQuery = `
            SELECT p.id, p.question, p.is_active, p.created_at, p.closed_at, p.creator_id, u.username AS creator_username
            FROM polls p
            LEFT JOIN users u ON p.creator_id = u.id
            ORDER BY p.created_at DESC
        `;
        const { rows: pollRows } = await db.query(pollsQuery);

        if (!pollRows.length) {
            return res.status(200).json([]);
        }

        const pollIds = pollRows.map(p => p.id);

        const optionsQuery = `
            SELECT o.id, o.poll_id, o.option_text, o.position, COUNT(v.id)::int AS vote_count
            FROM poll_options o
            LEFT JOIN poll_votes v ON v.option_id = o.id
            WHERE o.poll_id = ANY($1::int[])
            GROUP BY o.id
            ORDER BY o.poll_id, o.position
        `;
        const { rows: optionRows } = await db.query(optionsQuery, [pollIds]);

        const votesQuery = `
            SELECT v.poll_id, v.option_id, v.user_id, u.username
            FROM poll_votes v
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.poll_id = ANY($1::int[])
            ORDER BY v.voted_at ASC
        `;
        const { rows: voteRows } = await db.query(votesQuery, [pollIds]);

        const pollsMap = new Map(pollRows.map(p => [p.id, { ...p, options: [], totalVotes: 0, userVoteOptionId: null, canClose: false }]));
        const optionsMap = new Map(optionRows.map(o => [o.id, { ...o, voters: [] }]));

        optionRows.forEach(o => {
            const poll = pollsMap.get(o.poll_id);
            if (poll) {
                poll.options.push(optionsMap.get(o.id));
            }
        });

        voteRows.forEach(v => {
            const option = optionsMap.get(v.option_id);
            if(option) {
                option.voters.push({ id: v.user_id, username: v.username });
            }
            if (req.user && v.user_id === req.user.id) {
                const poll = pollsMap.get(v.poll_id);
                if (poll) {
                    poll.userVoteOptionId = v.option_id;
                }
            }
        });

        const result = Array.from(pollsMap.values()).map(p => {
            p.totalVotes = p.options.reduce((sum, o) => sum + (o.vote_count || 0), 0);
            p.canClose = p.is_active && req.user && (req.user.isAdmin || req.user.id === p.creator_id);
            return p;
        });

        res.status(200).json(result);
    } catch (err) {
        console.error('Hiba a szavazások lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a szavazásokat.' });
    }
});

app.post('/api/polls/:pollId/vote', authenticateToken, async (req, res) => {
    const pollId = Number.parseInt(req.params.pollId, 10);
    const optionId = Number.parseInt(req.body.optionId, 10);

    if (!pollId || !optionId) {
        return res.status(400).json({ message: 'Érvénytelen kérés.' });
    }

    try {
        const { rows: polls } = await db.query('SELECT is_active FROM polls WHERE id = $1', [pollId]);
        if (!polls.length) return res.status(404).json({ message: 'A szavazás nem található.' });
        if (!polls[0].is_active) return res.status(400).json({ message: 'A szavazás már lezárult.' });

        const { rows: options } = await db.query('SELECT id FROM poll_options WHERE id = $1 AND poll_id = $2', [optionId, pollId]);
        if (!options.length) return res.status(400).json({ message: 'A megadott válaszlehetőség nem található.' });

        await db.query('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)', [pollId, optionId, req.user.id]);
        res.status(201).json({ message: 'Szavazat rögzítve.' });
    } catch (err) {
        if (err.code === '23505') { // unique_violation
            return res.status(409).json({ message: 'Már szavaztál ebben a szavazásban.' });
        }
        console.error('Hiba a szavazat rögzítésekor:', err);
        res.status(500).json({ message: 'Nem sikerült rögzíteni a szavazatot.' });
    }
});

app.post('/api/polls/:pollId/close', authenticateToken, async (req, res) => {
    const pollId = Number.parseInt(req.params.pollId, 10);
    if (!pollId) return res.status(400).json({ message: 'Érvénytelen szavazás azonosító.' });

    try {
        const { rows: polls } = await db.query('SELECT creator_id, is_active FROM polls WHERE id = $1', [pollId]);
        if (!polls.length) return res.status(404).json({ message: 'A szavazás nem található.' });
        const poll = polls[0];
        if (!poll.is_active) return res.status(400).json({ message: 'A szavazás már le van zárva.' });
        if (poll.creator_id !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Nincs jogosultságod lezárni ezt a szavazást.' });
        }

        await db.query('UPDATE polls SET is_active = 0, closed_at = NOW() WHERE id = $1', [pollId]);
        res.status(200).json({ message: 'Szavazás sikeresen lezárva.' });
    } catch (err) {
        console.error('Hiba a szavazás lezárásakor:', err);
        res.status(500).json({ message: 'Nem sikerült lezárni a szavazást.' });
    }
});

app.delete('/api/polls/:pollId', authenticateToken, isAdmin, async (req, res) => {
    const pollId = Number.parseInt(req.params.pollId, 10);
    if (!pollId) {
        return res.status(400).json({ message: 'Érvénytelen szavazás azonosító.' });
    }

    try {
        const result = await db.query('DELETE FROM polls WHERE id = $1', [pollId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'A szavazás nem található.' });
        }

        res.status(200).json({ message: 'Szavazás sikeresen törölve.' });
    } catch (err) {
        console.error('Hiba a szavazás törlésekor:', err);
        res.status(500).json({ message: 'Nem sikerült törölni a szavazást.' });
    }
});

app.get('/api/tags', async (_req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, COALESCE(color, $1) AS color, created_at FROM tags ORDER BY name ASC',
            [DEFAULT_TAG_COLOR]
        );
        res.status(200).json(rows || []);
    } catch (err) {
        console.error('Hiba a címkék lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a címkéket.' });
    }
});

app.post('/api/tags', authenticateToken, isAdmin, async (req, res) => {
    const { name, color } = req.body;
    const trimmedName = (name || '').trim();
    const normalizedColor = normalizeHexColor(color);

    if (!trimmedName) {
        return res.status(400).json({ message: 'A címke neve nem lehet üres.' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id, name, color, created_at',
            [trimmedName, normalizedColor]
        );

        if (!rows[0]) {
            return res.status(409).json({ message: 'A címke már létezik.' });
        }

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Hiba a címke létrehozása során:', err);
        res.status(500).json({ message: 'Nem sikerült létrehozni a címkét.' });
    }
});

app.delete('/api/tags/:tagId', authenticateToken, isAdmin, async (req, res) => {
    const tagId = Number.parseInt(req.params.tagId, 10);

    if (!tagId) {
        return res.status(400).json({ message: 'Érvénytelen címke azonosító.' });
    }

    try {
        const result = await db.query('DELETE FROM tags WHERE id = $1', [tagId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'A címke nem található.' });
        }
        res.status(200).json({ message: 'Címke törölve.' });
    } catch (err) {
        console.error('Hiba a címke törlése során:', err);
        res.status(500).json({ message: 'Nem sikerült törölni a címkét.' });
    }
});

app.get('/api/academy/tags', async (_req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, COALESCE(color, $1) AS color, created_at FROM academy_tags ORDER BY name ASC',
            [DEFAULT_TAG_COLOR]
        );
        res.status(200).json(rows || []);
    } catch (err) {
        console.error('Hiba az akadémia címkék lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni az akadémia címkéket.' });
    }
});

app.post('/api/academy/tags', authenticateToken, isAdmin, async (req, res) => {
    const { name, color } = req.body;
    const trimmedName = (name || '').trim();
    const normalizedColor = normalizeHexColor(color);

    if (!trimmedName) {
        return res.status(400).json({ message: 'A tag neve nem lehet üres.' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO academy_tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id, name, color, created_at',
            [trimmedName, normalizedColor]
        );

        if (rows[0]) {
            return res.status(201).json(rows[0]);
        }

        const { rows: existing } = await db.query(
            'SELECT id, name, COALESCE(color, $1) AS color, created_at FROM academy_tags WHERE name = $2',
            [DEFAULT_TAG_COLOR, trimmedName]
        );
        return res.status(200).json(existing[0]);
    } catch (err) {
        console.error('Hiba az akadémia tag létrehozása során:', err);
        res.status(500).json({ message: 'Nem sikerült létrehozni az akadémia taget.' });
    }
});

app.post('/api/academy/images', authenticateToken, isAdmin, (req, res) => {
    const uploadHandler = uploadAcademyImage.array('images', 12);

    uploadHandler(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Nem sikerült a képek feltöltése.' });
        }

        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ message: 'Nem sikerült a képek feltöltése.' });
        }

        const items = files.map((file) => {
            const original = normalizeFilename(file.originalname || '');
            const title = original.replace(/\.[^/.]+$/, '').trim();
            return {
                filename: file.filename,
                original_name: original,
                title,
                url: `/uploads/akademia/${file.filename}`
            };
        });

        return res.status(201).json({ items });
    });
});

app.get('/api/academy/articles', async (_req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT a.*, COALESCE(a.inline_images, '[]'::jsonb) AS inline_images, COALESCE(
                json_agg(
                    json_build_object(
                        'id', t.id,
                        'name', t.name,
                        'color', COALESCE(t.color, $1)
                    )
                ) FILTER (WHERE t.id IS NOT NULL),
                '[]'::json
            ) AS tags
            FROM academy_articles a
            LEFT JOIN academy_article_tags at ON at.article_id = a.id
            LEFT JOIN academy_tags t ON t.id = at.tag_id
            GROUP BY a.id
            ORDER BY a.created_at DESC`,
            [DEFAULT_TAG_COLOR]
        );

        res.status(200).json(rows || []);
    } catch (err) {
        console.error('Hiba az akadémia cikkek lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni az akadémia cikkeket.' });
    }
});

app.post('/api/academy/articles', authenticateToken, isAdmin, (req, res) => {
    const uploadHandler = uploadAcademyFiles.fields([
        { name: 'cover', maxCount: 1 },
        { name: 'pdf', maxCount: 1 }
    ]);

    uploadHandler(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Hiba történt a fájl feltöltésekor.' });
        }

        const coverFile = req.files?.cover?.[0] || null;
        const pdfFile = req.files?.pdf?.[0] || null;
        const pdfOriginalName = pdfFile ? normalizeFilename(pdfFile.originalname) : null;
        const title = (req.body.title || '').trim();
        const subtitle = (req.body.subtitle || '').trim();
        const summary = (req.body.summary || '').trim();
        const content = (req.body.content || '').trim();
        const keywords = (req.body.keywords || '').trim();
        const inlineImages = sanitizeAcademyInlineImages(req.body.inline_images);

        if (!title) {
            if (coverFile) {
                await safeUnlink(path.join(academyDirectory, coverFile.filename));
            }
            if (pdfFile) {
                await safeUnlink(path.join(academyDirectory, pdfFile.filename));
            }
            return res.status(400).json({ message: 'A cím megadása kötelező.' });
        }

        const rawTagIds = parseAcademyTagIds(req.body.tags);
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                `INSERT INTO academy_articles
                (title, subtitle, summary, content, keywords, inline_images, cover_filename, pdf_filename, pdf_original_filename)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
                RETURNING *`,
                [
                    title,
                    subtitle || null,
                    summary || null,
                    content || null,
                    keywords || null,
                    JSON.stringify(inlineImages),
                    coverFile ? coverFile.filename : null,
                    pdfFile ? pdfFile.filename : null,
                    pdfOriginalName
                ]
            );

            const article = rows[0];
            const resolvedTagIds = await resolveAcademyTagIds(client, rawTagIds);

            for (const tagId of resolvedTagIds) {
                await client.query(
                    'INSERT INTO academy_article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [article.id, tagId]
                );
            }

            await client.query('COMMIT');
            res.status(201).json({ id: article.id });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            if (coverFile) {
                await safeUnlink(path.join(academyDirectory, coverFile.filename));
            }
            if (pdfFile) {
                await safeUnlink(path.join(academyDirectory, pdfFile.filename));
            }
            console.error('Hiba az akadémia cikk mentésekor:', dbErr);
            res.status(500).json({ message: 'Nem sikerült menteni a cikket.' });
        } finally {
            client.release();
        }
    });
});
app.put('/api/academy/articles/:id', authenticateToken, isAdmin, (req, res) => {
    const uploadHandler = uploadAcademyFiles.fields([
        { name: 'cover', maxCount: 1 },
        { name: 'pdf', maxCount: 1 }
    ]);

    uploadHandler(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Hiba történt a fájl feltöltésekor.' });
        }

        const articleId = Number.parseInt(req.params.id, 10);
        if (!Number.isFinite(articleId)) {
            return res.status(400).json({ message: 'Érvénytelen cikk azonosító.' });
        }

        const coverFile = req.files?.cover?.[0] || null;
        const pdfFile = req.files?.pdf?.[0] || null;
        const title = (req.body.title || '').trim();
        const subtitle = (req.body.subtitle || '').trim();
        const summary = (req.body.summary || '').trim();
        const content = (req.body.content || '').trim();
        const keywords = (req.body.keywords || '').trim();
        const inlineImages = sanitizeAcademyInlineImages(req.body.inline_images);

        if (!title) {
            if (coverFile) {
                await safeUnlink(path.join(academyDirectory, coverFile.filename));
            }
            if (pdfFile) {
                await safeUnlink(path.join(academyDirectory, pdfFile.filename));
            }
            return res.status(400).json({ message: 'A cím megadása kötelező.' });
        }

        const client = await db.pool.connect();
        let existing;
        try {
            const { rows } = await client.query(
                'SELECT cover_filename, pdf_filename, pdf_original_filename FROM academy_articles WHERE id = $1',
                [articleId]
            );
            existing = rows[0];
            if (!existing) {
                if (coverFile) {
                    await safeUnlink(path.join(academyDirectory, coverFile.filename));
                }
                if (pdfFile) {
                    await safeUnlink(path.join(academyDirectory, pdfFile.filename));
                }
                return res.status(404).json({ message: 'A cikk nem található.' });
            }

            const newCoverFilename = coverFile ? coverFile.filename : existing.cover_filename;
            const newPdfFilename = pdfFile ? pdfFile.filename : existing.pdf_filename;
            const newPdfOriginal = pdfFile ? normalizeFilename(pdfFile.originalname) : existing.pdf_original_filename;

            const rawTagIds = parseAcademyTagIds(req.body.tags);
            await client.query('BEGIN');
            await client.query(
                `UPDATE academy_articles
                 SET title = $1,
                     subtitle = $2,
                     summary = $3,
                     content = $4,
                     keywords = $5,
                     inline_images = $6::jsonb,
                     cover_filename = $7,
                     pdf_filename = $8,
                     pdf_original_filename = $9,
                     updated_at = NOW()
                 WHERE id = $10`,
                [
                    title,
                    subtitle || null,
                    summary || null,
                    content || null,
                    keywords || null,
                    JSON.stringify(inlineImages),
                    newCoverFilename,
                    newPdfFilename,
                    newPdfOriginal,
                    articleId
                ]
            );

            await client.query('DELETE FROM academy_article_tags WHERE article_id = $1', [articleId]);
            const resolvedTagIds = await resolveAcademyTagIds(client, rawTagIds);
            for (const tagId of resolvedTagIds) {
                await client.query(
                    'INSERT INTO academy_article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [articleId, tagId]
                );
            }

            await client.query('COMMIT');

            if (coverFile && existing.cover_filename) {
                await safeUnlink(path.join(academyDirectory, existing.cover_filename));
            }
            if (pdfFile && existing.pdf_filename) {
                await safeUnlink(path.join(academyDirectory, existing.pdf_filename));
            }

            res.status(200).json({ message: 'Cikk frissítve.' });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            if (coverFile) {
                await safeUnlink(path.join(academyDirectory, coverFile.filename));
            }
            if (pdfFile) {
                await safeUnlink(path.join(academyDirectory, pdfFile.filename));
            }
            console.error('Hiba az akadémia cikk frissítésekor:', dbErr);
            res.status(500).json({ message: 'Nem sikerült frissíteni a cikket.' });
        } finally {
            client.release();
        }
    });
});
app.delete('/api/academy/articles/:id', authenticateToken, isAdmin, async (req, res) => {
    const articleId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(articleId)) {
        return res.status(400).json({ message: 'Érvénytelen cikk azonosító.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT cover_filename, pdf_filename FROM academy_articles WHERE id = $1',
            [articleId]
        );
        const article = rows[0];
        if (!article) {
            return res.status(404).json({ message: 'A cikk nem található.' });
        }

        await db.query('DELETE FROM academy_articles WHERE id = $1', [articleId]);

        if (article.cover_filename) {
            await safeUnlink(path.join(academyDirectory, article.cover_filename));
        }
        if (article.pdf_filename) {
            await safeUnlink(path.join(academyDirectory, article.pdf_filename));
        }

        res.status(200).json({ message: 'Cikk törölve.' });
    } catch (err) {
        console.error('Hiba az akadémia cikk törlésekor:', err);
        res.status(500).json({ message: 'Nem sikerült törölni a cikket.' });
    }
});

app.get('/api/academy/articles/:id/download', async (req, res) => {
    const articleId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(articleId)) {
        return res.status(400).json({ message: 'Érvénytelen cikk azonosító.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT pdf_filename, pdf_original_filename FROM academy_articles WHERE id = $1',
            [articleId]
        );
        const article = rows[0];
        if (!article || !article.pdf_filename) {
            return res.status(404).json({ message: 'A PDF nem található.' });
        }

        const resolvedPath = path.normalize(path.join(academyDirectory, article.pdf_filename));
        if (!resolvedPath.startsWith(academyDirectory)) {
            return res.status(400).json({ message: 'Érvénytelen fájl útvonal.' });
        }

        await fs.promises.access(resolvedPath);
        const downloadName = article.pdf_original_filename || 'kutatas.pdf';
        return res.download(resolvedPath, downloadName);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ message: 'A PDF nem található.' });
        }
        console.error('Hiba az akadémia PDF letöltésekor:', err);
        res.status(500).json({ message: 'Nem sikerült letölteni a PDF-et.' });
    }
});

app.get('/api/archive/:category/folders', authenticateToken, ensureArchiveViewPermission, async (req, res) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    if (!categoryInfo) {
        return res.status(404).json({ message: 'Ismeretlen archívum kategória.' });
    }

    try {
        const folderRoot = getArchiveCategoryFolderRoot(categoryInfo) || categoryInfo.dir;
        const entries = await fs.promises.readdir(folderRoot, { withFileTypes: true });
        const folders = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b, 'hu'));
        return res.status(200).json({ folders });
    } catch (err) {
        console.error('Hiba az archívum mappák lekérdezésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült betölteni a mappákat.' });
    }
});

app.post('/api/archive/:category/folders', authenticateToken, ensureArchiveEditPermission, async (req, res) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    const folderName = normalizeArchiveFolderName(req.body?.name);
    if (!categoryInfo) {
        return res.status(404).json({ message: 'Ismeretlen archívum kategória.' });
    }
    if (!folderName) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    const folderPath = resolveArchiveFolderPath(categoryInfo, folderName);
    if (!folderPath) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    try {
        await fs.promises.mkdir(folderPath, { recursive: false });
        if (categoryInfo.key === 'videok') {
            const folder720Path = resolveArchive720pFolderPath(folderName);
            if (folder720Path) {
                await fs.promises.mkdir(folder720Path, { recursive: true });
            }
        }
        return res.status(201).json({ message: 'Mappa létrehozva.', name: folderName });
    } catch (err) {
        if (err.code === 'EEXIST') {
            return res.status(409).json({ message: 'A mappa már létezik.' });
        }
        console.error('Hiba az archívum mappa létrehozásakor:', err);
        return res.status(500).json({ message: 'Nem sikerült létrehozni a mappát.' });
    }
});

app.patch('/api/archive/:category/folders/rename', authenticateToken, isAdmin, ensureArchiveEditPermission, async (req, res) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    const oldName = normalizeArchiveFolderName(req.body?.oldName);
    const newName = normalizeArchiveFolderName(req.body?.newName);

    if (!categoryInfo) {
        return res.status(404).json({ message: 'Ismeretlen archívum kategória.' });
    }
    if (!oldName || !newName) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }
    if (oldName === newName) {
        return res.status(400).json({ message: 'Az új mappanév megegyezik a jelenlegivel.' });
    }

    const sourcePath = resolveArchiveFolderPath(categoryInfo, oldName);
    const targetPath = resolveArchiveFolderPath(categoryInfo, newName);
    if (!sourcePath || !targetPath) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    try {
        const sourceStat = await fs.promises.stat(sourcePath);
        if (!sourceStat.isDirectory()) {
            return res.status(404).json({ message: 'A mappa nem található.' });
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ message: 'A mappa nem található.' });
        }
        console.error('Hiba az archívum mappa ellenőrzésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült átnevezni a mappát.' });
    }

    try {
        await fs.promises.access(targetPath, fs.constants.F_OK);
        return res.status(409).json({ message: 'A cél mappa már létezik.' });
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Hiba az archívum célmappa ellenőrzésekor:', err);
            return res.status(500).json({ message: 'Nem sikerült átnevezni a mappát.' });
        }
    }

    if (categoryInfo.key === 'videok') {
        const target720Path = resolveArchive720pFolderPath(newName);
        if (target720Path) {
            try {
                await fs.promises.access(target720Path, fs.constants.F_OK);
                return res.status(409).json({ message: 'A c�l mappa m�r l�tezik.' });
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Hiba az arch�v 720p c�lmappa ellen�rz�sekor:', err);
                    return res.status(500).json({ message: 'Nem siker�lt �tnevezni a mapp�t.' });
                }
            }
        }
    }

    try {
        await fs.promises.rename(sourcePath, targetPath);
        if (categoryInfo.key === 'videok') {
            const source720Path = resolveArchive720pFolderPath(oldName);
            const target720Path = resolveArchive720pFolderPath(newName);

            if (source720Path && target720Path) {
                try {
                    await fs.promises.rename(source720Path, target720Path);
                } catch (rename720Err) {
                    if (rename720Err.code === 'ENOENT') {
                        await fs.promises.mkdir(target720Path, { recursive: true });
                    } else {
                        throw rename720Err;
                    }
                }
            }

            const { rows: movedRows } = await db.query(
                'SELECT id, filename FROM archive_videos WHERE folder_name = $1',
                [oldName]
            );

            const oldPrefix = `archivum/videok/eredeti/${oldName}/`;
            const newPrefix = `archivum/videok/eredeti/${newName}/`;
            for (const video of movedRows) {
                const filename = typeof video.filename === 'string' ? video.filename : '';
                const updatedFilename = filename.startsWith(oldPrefix)
                    ? `${newPrefix}${filename.slice(oldPrefix.length)}`
                    : filename;
                await db.query(
                    'UPDATE archive_videos SET folder_name = $1, filename = $2 WHERE id = $3',
                    [newName, updatedFilename, video.id]
                );
            }
        }
        return res.status(200).json({ message: 'Mappa átnevezve.', oldName, newName });
    } catch (err) {
        console.error('Hiba az archívum mappa átnevezésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült átnevezni a mappát.' });
    }
});

app.delete('/api/archive/:category/folders', authenticateToken, isAdmin, ensureArchiveEditPermission, async (req, res) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    const folderName = normalizeArchiveFolderName(req.body?.name);
    if (!categoryInfo) {
        return res.status(404).json({ message: 'Ismeretlen archívum kategória.' });
    }
    if (!folderName) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    const folderPath = resolveArchiveFolderPath(categoryInfo, folderName);
    if (!folderPath) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    try {
        await fs.promises.rm(folderPath, { recursive: true, force: true });
        if (categoryInfo.key === 'videok') {
            const folder720Path = resolveArchive720pFolderPath(folderName);
            if (folder720Path) {
                await fs.promises.rm(folder720Path, { recursive: true, force: true });
            }

            const { rows } = await db.query(
                'SELECT id, thumbnail_filename FROM archive_videos WHERE folder_name = $1',
                [folderName]
            );
            for (const video of rows) {
                if (video.thumbnail_filename) {
                    await safeUnlink(path.join(uploadsRootDirectory, video.thumbnail_filename));
                }
            }
            await db.query('DELETE FROM archive_videos WHERE folder_name = $1', [folderName]);
        }
        return res.status(200).json({ message: 'Mappa törölve.' });
    } catch (err) {
        console.error('Hiba az archívum mappa törlésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült törölni a mappát.' });
    }
});

app.get('/api/archive/:category/folders/:folder/files', authenticateToken, ensureArchiveViewPermission, async (req, res) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    if (!categoryInfo) {
        return res.status(404).json({ message: 'Ismeretlen archívum kategória.' });
    }

    const folderPath = resolveArchiveFolderPath(categoryInfo, req.params.folder);
    if (!folderPath) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    try {
        const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            if (!entry.isFile()) {
                continue;
            }
            const filePath = path.join(folderPath, entry.name);
            const stats = await fs.promises.stat(filePath);
            files.push({
                name: entry.name,
                url: buildArchiveFileUrl(categoryInfo.key, req.params.folder, entry.name),
                size: stats.size,
                updated_at: stats.mtime,
            });
        }
        files.sort((a, b) => a.name.localeCompare(b.name, 'hu'));
        return res.status(200).json({ files });
    } catch (err) {
        console.error('Hiba az archívum fájlok lekérdezésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült betölteni a fájlokat.' });
    }
});

app.post('/api/archive/:category/folders/:folder/files', authenticateToken, ensureArchiveEditPermission, (req, res, next) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    if (!categoryInfo) {
        return res.status(404).json({ message: 'Ismeretlen archívum kategória.' });
    }
    if (categoryInfo.key === 'videok') {
        return res.status(400).json({ message: 'Videók feltöltéséhez használd az archív videó feltöltő felületet.' });
    }
    const uploader = uploadArchiveFiles.array('files', 20);
    uploader(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || 'Feltöltési hiba.' });
        }
        return next();
    });
}, (req, res) => {
    const categoryInfo = resolveArchiveCategory(req.params.category);
    if (!categoryInfo) {
        return res.status(404).json({ message: 'Ismeretlen archívum kategória.' });
    }

    const folderName = normalizeArchiveFolderName(req.params.folder);
    if (!folderName) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const items = files.map((file) => ({
        name: file.filename,
        url: buildArchiveFileUrl(categoryInfo.key, folderName, file.filename),
        size: file.size,
    }));

    return res.status(201).json({ message: 'Fájlok feltöltve.', items });
});

app.get('/api/archive/videos/tags', authenticateToken, ensureArchiveViewPermission, async (_req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, COALESCE(color, $1) AS color, created_at FROM archive_tags ORDER BY name ASC',
            [DEFAULT_TAG_COLOR]
        );
        return res.status(200).json(rows || []);
    } catch (err) {
        console.error('Hiba az archív videó címkék lekérdezésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült lekérdezni az archív videó címkéket.' });
    }
});

app.post('/api/archive/videos/tags', authenticateToken, isAdmin, async (req, res) => {
    const { name, color } = req.body || {};
    const trimmedName = (name || '').trim();
    const normalizedColor = normalizeHexColor(color);

    if (!trimmedName) {
        return res.status(400).json({ message: 'A címke neve nem lehet üres.' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO archive_tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id, name, color, created_at',
            [trimmedName, normalizedColor]
        );
        if (!rows[0]) {
            return res.status(409).json({ message: 'A címke már létezik.' });
        }
        return res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Hiba az archív videó címke létrehozásakor:', err);
        return res.status(500).json({ message: 'Nem sikerült létrehozni a címkét.' });
    }
});

app.delete('/api/archive/videos/tags/:tagId', authenticateToken, isAdmin, async (req, res) => {
    const tagId = Number.parseInt(req.params.tagId, 10);
    if (!tagId) {
        return res.status(400).json({ message: 'Érvénytelen címke azonosító.' });
    }

    try {
        const result = await db.query('DELETE FROM archive_tags WHERE id = $1', [tagId]);
        if (!result.rowCount) {
            return res.status(404).json({ message: 'A címke nem található.' });
        }
        return res.status(200).json({ message: 'Címke törölve.' });
    } catch (err) {
        console.error('Hiba az archív videó címke törlésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült törölni a címkét.' });
    }
});

app.get('/api/archive/videos/folders/:folder', authenticateToken, ensureArchiveViewPermission, async (req, res) => {
    const folderName = normalizeArchiveFolderName(req.params.folder);
    if (!folderName) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const allowedLimits = [12, 24, 40, 80];
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = allowedLimits.includes(requestedLimit) ? requestedLimit : 24;
        const search = (req.query.search || '').trim();
        const tagFilters = Array.isArray(req.query.tag)
            ? req.query.tag
            : typeof req.query.tag === 'string' && req.query.tag.length
                ? req.query.tag.split(',')
                : [];
        const tagIds = Array.from(new Set(tagFilters
            .map((value) => Number.parseInt(value, 10))
            .filter((value) => Number.isInteger(value))));
        const sortOrder = req.query.sort === 'oldest' ? 'ASC' : 'DESC';

        const filters = ['archive_videos.folder_name = $1'];
        const params = [folderName];

        if (search) {
            const idx = params.push(`%${search}%`);
            filters.push(`(archive_videos.original_name ILIKE $${idx} OR archive_videos.filename ILIKE $${idx})`);
        }

        if (tagIds.length) {
            const tagArrayIdx = params.push(tagIds);
            const tagCountIdx = params.push(tagIds.length);
            filters.push(`archive_videos.id IN (
                SELECT video_id
                FROM archive_video_tags
                WHERE tag_id = ANY($${tagArrayIdx}::int[])
                GROUP BY video_id
                HAVING COUNT(DISTINCT tag_id) = $${tagCountIdx}
            )`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM archive_videos ${whereClause}`;
        const { rows: countRows } = await db.query(countQuery, params);
        const totalItems = Number(countRows[0]?.count || 0);
        const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
        const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
        const offset = (currentPage - 1) * limit;

        const dataParams = params.slice();
        dataParams.push(limit, offset);

        const dataQuery = `
            WITH filtered_videos AS (
                SELECT archive_videos.*, users.username
                FROM archive_videos
                LEFT JOIN users ON archive_videos.uploader_id = users.id
                ${whereClause}
                ORDER BY archive_videos.content_created_at ${sortOrder}
                LIMIT $${dataParams.length - 1}
                OFFSET $${dataParams.length}
            )
            SELECT fv.id, fv.folder_name, fv.filename, fv.original_name, fv.uploader_id, fv.uploaded_at, fv.username, fv.content_created_at,
                   fv.thumbnail_filename, fv.has_720p, fv.original_quality, fv.processing_status, fv.processing_error,
                   COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', COALESCE(t.color, '${DEFAULT_TAG_COLOR}'))) FILTER (WHERE t.id IS NOT NULL), '[]'::json) AS tags
            FROM filtered_videos fv
            LEFT JOIN archive_video_tags avt ON avt.video_id = fv.id
            LEFT JOIN archive_tags t ON avt.tag_id = t.id
            GROUP BY fv.id, fv.folder_name, fv.filename, fv.original_name, fv.uploader_id, fv.uploaded_at, fv.username, fv.content_created_at, fv.thumbnail_filename, fv.has_720p, fv.original_quality, fv.processing_status, fv.processing_error
            ORDER BY fv.content_created_at ${sortOrder};
        `;

        const { rows } = await db.query(dataQuery, dataParams);
        return res.status(200).json({
            data: rows || [],
            pagination: {
                totalItems,
                totalPages,
                currentPage,
            },
        });
    } catch (err) {
        console.error('Hiba az archív videók lekérdezésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült lekérdezni az archív videókat.' });
    }
});

app.post('/api/archive/videos/folders/:folder/upload-chunk', authenticateToken, ensureArchiveEditPermission, (req, res, next) => {
    const uploader = uploadArchiveVideoChunks.single('chunk');
    uploader(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'A chunk merete tul nagy. Probald kisebb darabokban.' });
            }
            return res.status(400).json({ message: err.message || 'Chunk feltoltesi hiba.' });
        }
        return next();
    });
}, async (req, res) => {
    await ensureArchiveChunkCleanup();

    const folderName = normalizeArchiveFolderName(req.params.folder);
    if (!folderName) {
        if (req.file?.path) {
            await safeUnlink(req.file.path);
        }
        return res.status(400).json({ message: 'Ervenytelen mappanev.' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Nincs chunk feltoltve.' });
    }

    const safeUploadId = normalizeArchiveChunkUploadId(req.body?.uploadId);
    if (!safeUploadId) {
        await safeUnlink(req.file.path);
        return res.status(400).json({ message: 'Ervenytelen feltoltes azonosito.' });
    }

    const chunkIndex = Number.parseInt(req.body?.chunkIndex, 10);
    const totalChunks = Number.parseInt(req.body?.totalChunks, 10);
    const reportedTotalSize = Number.parseInt(req.body?.totalSize, 10);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || !Number.isInteger(totalChunks) || totalChunks <= 0 || totalChunks > 20000) {
        await safeUnlink(req.file.path);
        return res.status(400).json({ message: 'Ervenytelen chunk metadata.' });
    }
    if (chunkIndex >= totalChunks) {
        await safeUnlink(req.file.path);
        return res.status(400).json({ message: 'Hibas chunk index.' });
    }

    const categoryInfo = resolveArchiveCategory('videok');
    const folderPath = resolveArchiveFolderPath(categoryInfo, folderName);
    if (!categoryInfo || !folderPath) {
        await safeUnlink(req.file.path);
        return res.status(400).json({ message: 'Ervenytelen video mappa.' });
    }

    const normalizedOriginalName = normalizeFilename(req.body?.originalName || req.file.originalname || 'video.mp4');
    const originalVideoExtension = getArchiveVideoExtension(normalizedOriginalName);
    if (!originalVideoExtension) {
        await safeUnlink(req.file.path);
        return res.status(400).json({ message: 'Nem engedelyezett videofajl-kiterjesztes.' });
    }
    const customName = typeof req.body?.name === 'string' ? normalizeFilename(req.body.name) : '';
    const normalizedCustomName = stripKnownVideoExtension(customName);
    const normalizedDisplayName = stripKnownVideoExtension(normalizedOriginalName);
    const sanitizedOriginalName = (normalizedCustomName || normalizedDisplayName || normalizedOriginalName || 'video').slice(0, 255);

    const requestedTagIds = parseArchiveTagIds(req.body?.tags);

    const statePath = path.join(archiveVideoChunkTempDirectory, `${safeUploadId}.json`);
    const stagingPath = path.join(archiveVideoChunkTempDirectory, `${safeUploadId}.upload`);

    try {
        const validTagIds = await resolveValidArchiveTagIds(requestedTagIds);

        let state = await readArchiveChunkState(statePath);
        if (!state) {
            state = {
                uploadId: safeUploadId,
                uploaderId: req.user.id,
                folderName,
                totalChunks,
                lastChunkIndex: -1,
                originalName: normalizedOriginalName,
                displayName: sanitizedOriginalName,
                tagIds: validTagIds,
                totalSize: Number.isFinite(reportedTotalSize) && reportedTotalSize > 0 ? reportedTotalSize : 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        }

        if (Number.parseInt(state.uploaderId, 10) !== Number.parseInt(req.user.id, 10)) {
            await safeUnlink(req.file.path);
            return res.status(403).json({ message: 'Ez a feltoltes masik felhasznalohoz tartozik.' });
        }
        if (state.folderName !== folderName || Number.parseInt(state.totalChunks, 10) !== totalChunks) {
            await safeUnlink(req.file.path);
            return res.status(409).json({ message: 'A feltoltes adatai nem egyeznek a korabbi chunkokkal.' });
        }
        if (state.originalName !== normalizedOriginalName) {
            await safeUnlink(req.file.path);
            return res.status(409).json({ message: 'A feltoltes eredeti fajlneve nem valtozhat meg chunkonkent.' });
        }
        if (!getArchiveVideoExtension(state.originalName)) {
            await safeUnlink(req.file.path);
            await cleanupArchiveChunkUpload(safeUploadId);
            return res.status(400).json({ message: 'Nem engedelyezett videofajl-kiterjesztes.' });
        }

        const expectedChunkIndex = Number.parseInt(state.lastChunkIndex, 10) + 1;
        if (chunkIndex !== expectedChunkIndex) {
            await safeUnlink(req.file.path);
            return res.status(409).json({
                message: 'Hibas chunk sorrend. Probald ujra a feltoltest.',
                expectedChunkIndex,
            });
        }

        await appendChunkToStagingFile(stagingPath, req.file.path);
        await safeUnlink(req.file.path);

        state.lastChunkIndex = chunkIndex;
        state.updatedAt = Date.now();
        state.displayName = sanitizedOriginalName;
        state.tagIds = validTagIds;
        if (Number.isFinite(reportedTotalSize) && reportedTotalSize > 0) {
            state.totalSize = reportedTotalSize;
        }
        await writeArchiveChunkState(statePath, state);

        if (chunkIndex < totalChunks - 1) {
            return res.status(200).json({
                message: 'Chunk feltoltve.',
                completed: false,
                chunkIndex,
                totalChunks,
            });
        }

        ensureDirectoryExists(folderPath);
        const finalFilename = buildArchiveFilename(folderPath, state.originalName || normalizedOriginalName);
        const finalPath = path.join(folderPath, finalFilename);

        await fs.promises.rename(stagingPath, finalPath);

        const detectedHeight = await getVideoHeight(finalPath);
        if (!Number.isFinite(detectedHeight)) {
            await safeUnlink(finalPath);
            await safeUnlink(statePath);
            return res.status(400).json({ message: 'A feltoltott fajl nem ervenyes video.' });
        }

        const storedFilename = path.posix.join('archivum', 'videok', 'eredeti', folderName, finalFilename);
        let videoId = null;
        try {
            videoId = await createArchiveVideoRecord({
                folderName,
                storedFilename,
                originalName: sanitizedOriginalName,
                uploaderId: req.user.id,
                filePath: finalPath,
                tagIds: validTagIds,
            });
        } catch (dbErr) {
            await safeUnlink(finalPath);
            throw dbErr;
        }

        await safeUnlink(statePath);

        res.status(201).json({
            message: 'Archiv video sikeresen feltoltve.',
            videoIds: Number.isInteger(videoId) ? [videoId] : [],
            completed: true,
        });

        setImmediate(() => {
            processArchiveVideoQueue();
        });
    } catch (err) {
        console.error('Hiba az archiv chunk feltoltes soran:', err);
        if (req.file?.path) {
            await safeUnlink(req.file.path);
        }
        return res.status(500).json({ message: 'Nem sikerult feldolgozni a chunk feltoltest.' });
    }
});

app.post('/api/archive/videos/folders/:folder/upload', authenticateToken, ensureArchiveEditPermission, (req, res, next) => {
    const uploader = uploadArchiveVideos.array('videos', 100);
    uploader(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ message: 'A video fajl tul nagy a jelenlegi feltoltesi limithez.' });
                }
                return res.status(400).json({ message: err.message || 'Feltoltesi hiba.' });
            }
            return res.status(400).json({ message: err.message || 'Feltoltesi hiba.' });
        }
        return next();
    });
}, async (req, res) => {
    const folderName = normalizeArchiveFolderName(req.params.folder);
    if (!folderName) {
        return res.status(400).json({ message: 'Érvénytelen mappanév.' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
        return res.status(400).json({ message: 'Nincs fájl feltöltve.' });
    }

    const parseTagIds = (value) => {
        if (!value) {
            return [];
        }
        if (Array.isArray(value)) {
            return value.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id));
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return [];
            }
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id));
                }
            } catch (err) {
                // Fallback to CSV list.
            }
            return trimmed
                .split(',')
                .map((id) => Number.parseInt(id.trim(), 10))
                .filter((id) => Number.isInteger(id));
        }
        return [];
    };

    let metadataList = [];
    try {
        const rawMetadata = req.body?.metadata;
        if (typeof rawMetadata === 'string' && rawMetadata.trim()) {
            const parsed = JSON.parse(rawMetadata);
            if (Array.isArray(parsed)) {
                metadataList = parsed;
            }
        }
    } catch (err) {
        return res.status(400).json({ message: 'Érvénytelen metadata formátum.' });
    }

    const fallbackTagIds = parseTagIds(req.body?.tags);
    const requestedTagIds = new Set(fallbackTagIds);
    metadataList.forEach((meta) => {
        parseTagIds(meta?.tags).forEach((tagId) => requestedTagIds.add(tagId));
    });

    let validTagIds = new Set();
    if (requestedTagIds.size) {
        try {
            const { rows } = await db.query('SELECT id FROM archive_tags WHERE id = ANY($1)', [Array.from(requestedTagIds)]);
            validTagIds = new Set((rows || []).map((row) => Number(row.id)));
        } catch (err) {
            console.error('Hiba az archív videó címkék ellenőrzésekor:', err);
            return res.status(500).json({ message: 'Nem sikerült ellenőrizni a címkéket.' });
        }
    }

    const normalizeSelectedTags = (tagIds) => Array.from(new Set(tagIds.filter((id) => validTagIds.has(id))));
    const uploaderId = req.user.id;
    const createdVideos = [];
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        for (const [index, file] of files.entries()) {
            const metadata = metadataList[index] || {};
            const normalizedOriginalName = normalizeFilename(file.originalname);
            const customName = typeof metadata.name === 'string' ? normalizeFilename(metadata.name) : '';
            const normalizedCustomName = stripKnownVideoExtension(customName);
            const normalizedDisplayName = stripKnownVideoExtension(normalizedOriginalName);
            const sanitizedOriginalName = (normalizedCustomName || normalizedDisplayName || normalizedOriginalName || file.filename).slice(0, 255);
            const filePath = path.join(archiveVideosOriginalDirectory, folderName, file.filename);
            const contentCreatedAt = await getVideoCreationDate(filePath);
            const tagsFromMeta = normalizeSelectedTags(parseTagIds(metadata.tags));
            const tags = tagsFromMeta.length ? tagsFromMeta : normalizeSelectedTags(fallbackTagIds);
            const storedFilename = path.posix.join('archivum', 'videok', 'eredeti', folderName, file.filename);

            const insertResult = await client.query(
                `INSERT INTO archive_videos (folder_name, filename, original_name, uploader_id, content_created_at, processing_status)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [folderName, storedFilename, sanitizedOriginalName, uploaderId, contentCreatedAt, 'pending']
            );
            const videoId = insertResult.rows[0]?.id;

            if (videoId && tags.length) {
                for (const tagId of tags) {
                    await client.query(
                        'INSERT INTO archive_video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [videoId, tagId]
                    );
                }
            }


            if (videoId) {
                createdVideos.push({
                    id: videoId,
                    filename: storedFilename,
                    thumbnail_filename: null,
                });
            }
        }

        await client.query('COMMIT');
        res.status(201).json({
            message: 'Archív videók sikeresen feltöltve.',
            videoIds: createdVideos.map((video) => video.id),
        });

        setImmediate(() => {
            processArchiveVideoQueue();
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba az archív videó feltöltésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült menteni az archív videó adatait.' });
    } finally {
        client.release();
    }
});

app.post('/api/archive/videos/cancel', authenticateToken, ensureArchiveEditPermission, async (req, res) => {
    const rawIds = Array.isArray(req.body?.videoIds) ? req.body.videoIds : [];
    const videoIds = Array.from(new Set(rawIds.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite)));

    if (!videoIds.length) {
        return res.status(400).json({ message: 'Nincs törlendő videó.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT id, folder_name, filename, original_name, thumbnail_filename, uploader_id FROM archive_videos WHERE id = ANY($1)',
            [videoIds]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'A megadott videók nem találhatók.' });
        }

        const deletable = rows.filter((video) => video.uploader_id === req.user.id || req.user.isAdmin);
        if (!deletable.length) {
            return res.status(403).json({ message: 'Nincs jogosultság a videók törléséhez.' });
        }

        const deletedVideoIds = [];
        for (const video of deletable) {
            await deleteArchiveVideoRecord(video);
            deletedVideoIds.push(video.id);
        }

        return res.status(200).json({
            message: 'Feltöltés megszakítva, archív videók törölve.',
            deletedVideoIds,
        });
    } catch (err) {
        console.error('Hiba az archív videó feltöltés megszakítása során:', err);
        return res.status(500).json({ message: 'Nem sikerült törölni a videókat.' });
    }
});

app.delete('/api/archive/videos/:id', authenticateToken, isAdmin, async (req, res) => {
    const videoId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(videoId)) {
        return res.status(400).json({ message: 'Érvénytelen videó azonosító.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT id, folder_name, filename, original_name, thumbnail_filename FROM archive_videos WHERE id = $1',
            [videoId]
        );
        const video = rows[0];

        if (!video) {
            return res.status(404).json({ message: 'A videó nem található.' });
        }

        await deleteArchiveVideoRecord(video);
        return res.status(200).json({ message: 'Archív videó sikeresen törölve.' });
    } catch (err) {
        console.error('Hiba az archív videó törlésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült törölni a videót.' });
    }
});

app.patch('/api/archive/videos/:id/title', authenticateToken, isAdmin, async (req, res) => {
    const videoId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(videoId)) {
        return res.status(400).json({ message: 'Érvénytelen videó azonosító.' });
    }

    const rawTitle = (req.body?.title || req.body?.original_name || '').toString();
    const normalizedTitle = normalizeFilename(rawTitle).trim();

    if (!normalizedTitle) {
        return res.status(400).json({ message: 'Az új cím megadása kötelező.' });
    }

    const truncatedTitle = normalizedTitle.slice(0, 255);

    try {
        const { rows } = await db.query(
            'UPDATE archive_videos SET original_name = $1 WHERE id = $2 RETURNING id, original_name',
            [truncatedTitle, videoId]
        );
        if (!rows.length) {
            return res.status(404).json({ message: 'A videó nem található.' });
        }
        return res.status(200).json({
            message: 'Archív videó cím frissítve.',
            id: rows[0].id,
            original_name: rows[0].original_name,
        });
    } catch (err) {
        console.error('Hiba az archív videó cím frissítésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült frissíteni az archív videó címét.' });
    }
});

app.post('/api/archive/videos/:id/thumbnail/regenerate', authenticateToken, isAdmin, async (req, res) => {
    const videoId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(videoId)) {
        return res.status(400).json({ message: 'Ervenytelen video azonosito.' });
    }

    const rawSeekSeconds = req.body?.seekSeconds;
    const hasRequestedSeek =
        rawSeekSeconds !== undefined &&
        rawSeekSeconds !== null &&
        String(rawSeekSeconds).trim() !== '';
    let requestedSeekSeconds = null;
    if (hasRequestedSeek) {
        const parsedSeek = Number.parseFloat(rawSeekSeconds);
        if (!Number.isFinite(parsedSeek) || parsedSeek < 0) {
            return res.status(400).json({ message: 'Ervenytelen seekSeconds ertek.' });
        }
        requestedSeekSeconds = parsedSeek;
    }

    try {
        const { rows } = await db.query(
            'SELECT id, filename, thumbnail_filename FROM archive_videos WHERE id = $1',
            [videoId]
        );
        const video = rows[0];

        if (!video) {
            return res.status(404).json({ message: 'A video nem talalhato.' });
        }

        const videoPath = path.join(uploadsRootDirectory, video.filename || '');
        if (!videoPath.startsWith(uploadsRootDirectory)) {
            return res.status(400).json({ message: 'Ervenytelen video utvonal.' });
        }

        const hasVideoFile = await fileExists(videoPath);
        if (!hasVideoFile) {
            return res.status(404).json({ message: 'A forras videofajl nem talalhato.' });
        }

        const baseName = path.parse(video.filename || '').name || ('archive-' + video.id);
        const variantTag = 'regen' + Date.now() + '-' + Math.round(Math.random() * 1e6);
        const thumbnailOptions = {
            variantTag,
        };
        if (hasRequestedSeek) {
            thumbnailOptions.preferredSeekSeconds = requestedSeekSeconds;
            thumbnailOptions.strictPreferredSeek = true;
        } else {
            thumbnailOptions.randomize = true;
        }

        const newThumbnailFilename = await generateThumbnailForVideo(videoPath, baseName, video.id, thumbnailOptions);

        await db.query('UPDATE archive_videos SET thumbnail_filename = $1 WHERE id = $2', [newThumbnailFilename, video.id]);

        if (video.thumbnail_filename && video.thumbnail_filename !== newThumbnailFilename) {
            await safeUnlink(path.join(uploadsRootDirectory, video.thumbnail_filename));
        }

        return res.status(200).json({
            message: hasRequestedSeek
                ? 'Indexkep sikeresen frissitve a kivalasztott kepkockarol.'
                : 'Indexkep sikeresen ujrageneralva.',
            thumbnail_filename: newThumbnailFilename,
        });
    } catch (err) {
        console.error('Hiba az archiv indexkep ujrageneralasakor:', err);
        return res.status(500).json({ message: 'Nem sikerult ujrageneralni az indexkepet.' });
    }
});

app.get('/api/videos', authenticateToken, ensureClipViewPermission, async (req, res) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const allowedLimits = [12, 24, 40, 80];
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = allowedLimits.includes(requestedLimit) ? requestedLimit : 24;
        const search = (req.query.search || '').trim();
        const tagFilters = Array.isArray(req.query.tag)
            ? req.query.tag
            : typeof req.query.tag === 'string' && req.query.tag.length
                ? req.query.tag.split(',')
                : [];
        const tagIds = Array.from(new Set(tagFilters
            .map((value) => Number.parseInt(value, 10))
            .filter((value) => Number.isInteger(value))));
        const sortOrder = req.query.sort === 'oldest' ? 'ASC' : 'DESC';

        const filters = [];
        const params = [];

        if (search) {
            const idx = params.push(`%${search}%`);
            filters.push(`(videos.original_name ILIKE $${idx} OR videos.filename ILIKE $${idx})`);
        }

        if (tagIds.length) {
            const tagArrayIdx = params.push(tagIds);
            const tagCountIdx = params.push(tagIds.length);
            filters.push(`videos.id IN (
                SELECT video_id
                FROM video_tags
                WHERE tag_id = ANY($${tagArrayIdx}::int[])
                GROUP BY video_id
                HAVING COUNT(DISTINCT tag_id) = $${tagCountIdx}
            )`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM videos ${whereClause}`;
        const { rows: countRows } = await db.query(countQuery, params);
        const totalItems = Number(countRows[0]?.count || 0);
        const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
        const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
        const offset = (currentPage - 1) * limit;

        const dataParams = params.slice();
        dataParams.push(limit, offset);

        const dataQuery = `
            WITH filtered_videos AS (
                SELECT videos.*, users.username
                FROM videos
                LEFT JOIN users ON videos.uploader_id = users.id
                ${whereClause}
                ORDER BY videos.content_created_at ${sortOrder}
                LIMIT $${dataParams.length - 1}
                OFFSET $${dataParams.length}
            )
            SELECT fv.id, fv.filename, fv.original_name, fv.uploader_id, fv.uploaded_at, fv.username, fv.content_created_at,
                   fv.thumbnail_filename, fv.has_720p, fv.has_1080p, fv.has_1440p, fv.original_quality,
                   COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', COALESCE(t.color, '${DEFAULT_TAG_COLOR}'))) FILTER (WHERE t.id IS NOT NULL), '[]'::json) AS tags
            FROM filtered_videos fv
            LEFT JOIN video_tags vt ON vt.video_id = fv.id
            LEFT JOIN tags t ON vt.tag_id = t.id
            GROUP BY fv.id, fv.filename, fv.original_name, fv.uploader_id, fv.uploaded_at, fv.username, fv.content_created_at, fv.thumbnail_filename, fv.has_720p, fv.has_1080p, fv.has_1440p, fv.original_quality
            ORDER BY fv.content_created_at ${sortOrder};
        `;

        const { rows } = await db.query(dataQuery, dataParams);

        res.status(200).json({
            data: rows || [],
            pagination: {
                totalItems,
                totalPages,
                currentPage,
            },
        });
    } catch (err) {
        console.error('Hiba a videók lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a videókat.' });
    }
});

app.post('/api/discord/share-video', authenticateToken, async (req, res) => {
    const videoId = Number.parseInt(req.body?.videoId, 10);

    if (!Number.isFinite(videoId)) {
        return res.status(400).json({ message: 'Érvénytelen videóazonosító.' });
    }

    if (!BOT_API_URL) {
        return res.status(500).json({ message: 'A Discord bot API URL nincs konfigurálva.' });
    }

    try {
        const { rows } = await db.query(
            `SELECT v.id, v.filename, v.original_name, u.username
             FROM videos v
             LEFT JOIN users u ON v.uploader_id = u.id
             WHERE v.id = $1`,
            [videoId]
        );

        const video = rows[0];

        if (!video) {
            return res.status(404).json({ message: 'A videó nem található.' });
        }

        if (!video.filename) {
            return res.status(500).json({ message: 'A videó fájlneve hiányzik, nem lehet megosztani.' });
        }

        const publicUrl = `${BASE_URL}/uploads/${video.filename}`;
        const payload = {
            url: publicUrl,
            title: video.original_name || video.filename,
            uploader: video.username || 'Ismeretlen feltöltő',
        };

        const botResponse = await fetch(BOT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!botResponse.ok) {
            const errorText = await botResponse.text().catch(() => '');
            return res.status(botResponse.status).json({
                message: 'Nem sikerült elküldeni a videót a Discord botnak.',
                details: errorText || undefined,
            });
        }

        return res.status(200).json({ message: 'Videó sikeresen megosztva a Discordon.' });
    } catch (err) {
        console.error('Hiba a videó Discordra küldésekor:', err);
        return res.status(502).json({ message: 'Nem sikerült kommunikálni a Discord bottal. Lehet, hogy offline.' });
    }
});

app.get('/api/admin/clips', authenticateToken, isAdmin, async (req, res) => {
    const type = (req.query.type || 'original').toString().toLowerCase();

    const buildResponse = (items) => res.status(200).json({
        items: items || [],
        total: Array.isArray(items) ? items.length : 0,
    });

    try {
        if (type === '720p') {
            const { rows } = await db.query(`
                SELECT videos.id, videos.original_name, videos.filename, videos.uploaded_at, videos.content_created_at, users.username
                FROM videos
                LEFT JOIN users ON videos.uploader_id = users.id
                WHERE videos.has_720p = 1
                ORDER BY videos.uploaded_at DESC
            `);

            const clips = await Promise.all((rows || []).map(async (video) => {
                const parsed = path.parse(video.filename || '');
                const folderName = resolveFolderNameFromFilename(video.filename);
                const extension = parsed.ext || '.mp4';
                const baseName = parsed.name || 'video';
                const filename720p = path.posix.join('klippek', '720p', folderName, `${baseName}_720p${extension}`);

                return {
                    id: video.id,
                    original_name: video.original_name,
                    filename: filename720p,
                    uploaded_at: video.uploaded_at,
                    content_created_at: video.content_created_at,
                    uploader: video.username || 'Ismeretlen',
                    sizeBytes: await getUploadFileSize(filename720p),
                    category: '720p',
                };
            }));

            return buildResponse(clips);
        }

        if (type === 'other') {
            const clips = [];

            const { rows: thumbnailRows } = await db.query(`
                SELECT id, thumbnail_filename, uploaded_at, content_created_at
                FROM videos
                WHERE thumbnail_filename IS NOT NULL
            `);

            (thumbnailRows || []).forEach((thumb) => {
                if (!thumb.thumbnail_filename) {
                    return;
                }
                clips.push({
                    id: thumb.id,
                    original_name: 'Videó előnézet',
                    filename: thumb.thumbnail_filename,
                    uploaded_at: thumb.uploaded_at,
                    content_created_at: thumb.content_created_at,
                    uploader: 'Rendszer',
                    category: 'other',
                });
            });

            const { rows: programRows } = await db.query('SELECT id, name, image_filename, file_filename, created_at FROM programs');
            (programRows || []).forEach((program) => {
                if (program.image_filename) {
                    clips.push({
                        id: program.id,
                        original_name: `${program.name || 'Program'} - Borítókép`,
                        filename: program.image_filename,
                        uploaded_at: program.created_at,
                        content_created_at: program.created_at,
                        uploader: 'Program',
                        category: 'other',
                    });
                }

                if (program.file_filename) {
                    clips.push({
                        id: program.id,
                        original_name: `${program.name || 'Program'} - Fájl`,
                        filename: program.file_filename,
                        uploaded_at: program.created_at,
                        content_created_at: program.created_at,
                        uploader: 'Program',
                        category: 'other',
                    });
                }
            });

            const clipsWithSize = await Promise.all(clips.map(async (clip) => ({
                ...clip,
                sizeBytes: await getUploadFileSize(clip.filename),
            })));

            return buildResponse(clipsWithSize);
        }

        const { rows } = await db.query(`
            SELECT videos.id, videos.original_name, videos.filename, videos.uploaded_at, videos.content_created_at, users.username
            FROM videos
            LEFT JOIN users ON videos.uploader_id = users.id
            ORDER BY videos.uploaded_at DESC
        `);

        const clips = await Promise.all((rows || []).map(async (video) => ({
            id: video.id,
            original_name: video.original_name,
            filename: video.filename,
            uploaded_at: video.uploaded_at,
            content_created_at: video.content_created_at,
            uploader: video.username || 'Ismeretlen',
            sizeBytes: await getUploadFileSize(video.filename),
            category: 'original',
        })));

        return buildResponse(clips);
    } catch (err) {
        console.error('Hiba az admin klip lista lekérdezésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült lekérdezni a klipeket.' });
    }
});

app.get('/api/admin/processing-status', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const { rows: processingRows } = await db.query(
            "SELECT id, filename, original_name, uploaded_at, processing_status FROM videos WHERE processing_status = 'processing' ORDER BY uploaded_at ASC LIMIT 1"
        );

        const { rows: pendingRows } = await db.query(
            "SELECT id, filename, original_name, uploaded_at, processing_status FROM videos WHERE processing_status = 'pending' ORDER BY uploaded_at ASC"
        );

        res.status(200).json({
            isProcessing,
            currentTask: processingRows[0] || null,
            pending: pendingRows,
        });
    } catch (err) {
        console.error('Hiba a feldolgozási állapot lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a feldolgozási állapotot.' });
    }
});

app.post('/api/admin/radnai-test', authenticateToken, isAdmin, async (req, res) => {
    const targetUrl = resolveRadnaiAlertUrl();
    if (!targetUrl) {
        return res.status(500).json({
            message: 'A Radnai riasztasi vegpont nincs konfigur�lva.',
            details: 'Allitsd be a BOT_API_URL vagy BOT_RADNAI_ALERT_URL kornyezeti valtozot.',
        });
    }

    const requestedType = typeof req.body?.type === 'string'
        ? req.body.type.trim().toLowerCase()
        : 'change';

    if (!['change', 'outage'].includes(requestedType)) {
        return res.status(400).json({
            message: 'Ervenytelen tipus. Hasznald: change vagy outage.',
            receivedType: requestedType || null,
        });
    }

    const payload = requestedType === 'outage'
        ? {
            type: 'outage',
            error: typeof req.body?.error === 'string' && req.body.error.trim()
                ? req.body.error.trim()
                : 'Manual outage test from admin endpoint.',
        }
        : { type: 'change' };

    try {
        const botResponse = await sendRadnaiAlertRequest(payload);
        if (!botResponse.ok) {
            return res.status(botResponse.status).json({
                message: 'Nem sikerult elkuldeni a teszt riasztast a Discord botnak.',
                details: botResponse.bodyText || undefined,
                target: botResponse.url,
                status: botResponse.status,
                attempt: botResponse.attempt || undefined,
                type: requestedType,
            });
        }

        return res.status(200).json({
            message: 'Teszt riasztas sikeresen elkuldve a Discord botnak.',
            details: botResponse.bodyText || undefined,
            target: botResponse.url,
            status: botResponse.status,
            attempt: botResponse.attempt || undefined,
            type: requestedType,
        });
    } catch (err) {
        console.error('Hiba a Radnai teszt riasztas kuldese soran:', err);
        return res.status(502).json({
            message: 'Nem sikerult kommunikalni a Discord bottal a Radnai teszt soran.',
            details: err?.message || 'Ismeretlen hiba',
            target: targetUrl,
            type: requestedType,
        });
    }
});

app.get('/api/admin/radnai-status', authenticateToken, isAdmin, async (_req, res) => {
    return res.status(200).json({
        monitorEnabled: radnaiMonitoringEnabled,
        lastCheck: lastRadnaiCheck ? lastRadnaiCheck.toISOString() : null,
        status: lastRadnaiStatus,
        hash: lastRadnaiHash,
        failureReason: lastRadnaiFailureReason,
        consecutiveFailures: radnaiConsecutiveFailures,
        outageActive: radnaiOutageActive,
        lastOutageAlertAt: lastRadnaiOutageAlertAt ? lastRadnaiOutageAlertAt.toISOString() : null,
    });
});

app.post('/api/admin/radnai-monitor', authenticateToken, isAdmin, async (req, res) => {
    const requestedEnabled = req.body?.enabled;
    if (typeof requestedEnabled !== 'boolean') {
        return res.status(400).json({
            message: 'Az enabled mező kötelező és boolean típusú kell legyen.',
        });
    }

    try {
        await setRadnaiMonitoringEnabled(requestedEnabled, 'admin-api');
        if (requestedEnabled) {
            checkRadnaiWebsiteForChanges({ force: true }).catch((err) => {
                console.error('Hiba a Radnai monitor bekapcsolas utani azonnali check kozben:', err);
            });
        }

        return res.status(200).json({
            message: requestedEnabled ? 'A Radnai figyeles bekapcsolva.' : 'A Radnai figyeles kikapcsolva.',
            monitorEnabled: radnaiMonitoringEnabled,
            status: lastRadnaiStatus,
            lastCheck: lastRadnaiCheck ? lastRadnaiCheck.toISOString() : null,
        });
    } catch (err) {
        console.error('Hiba a Radnai figyeles allapot valtasakor:', err);
        return res.status(500).json({
            message: 'Nem sikerult valtani a Radnai figyeles allapotat.',
            details: err?.message || 'Ismeretlen hiba',
        });
    }
});

app.get('/api/videos/get-uploaded-titles', authenticateToken, ensureClipViewPermission, async (_req, res) => {
    try {
        const { rows } = await db.query('SELECT original_name FROM videos');
        const titles = (rows || []).map((row) => {
            const originalName = typeof row.original_name === 'string' ? row.original_name : '';
            return path.parse(originalName).name;
        });

        res.status(200).json(titles);
    } catch (err) {
        console.error('Hiba a videók neveinek lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a videók neveit.' });
    }
});

const PUBLIC_VIDEO_HASHES_ENDPOINT = '/api/videos/get-uploaded-hashes';

app.options(PUBLIC_VIDEO_HASHES_ENDPOINT, (_req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.sendStatus(204);
});

app.get(PUBLIC_VIDEO_HASHES_ENDPOINT, async (_req, res) => {
    try {
        res.set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        const { rows } = await db.query('SELECT file_hash FROM videos WHERE file_hash IS NOT NULL');
        const hashes = (rows || []).map((row) => row.file_hash).filter(Boolean);
        res.status(200).json(hashes);
    } catch (err) {
        console.error('Hiba a videók hash értékeinek lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a videók hash értékeit.' });
    }
});

app.get('/api/admin/generate-missing-thumbnails', async (_req, res) => {
    try {
        const { rows } = await db.query('SELECT id, filename FROM videos WHERE thumbnail_filename IS NULL');
        const results = [];

        for (const video of rows) {
            const videoPath = path.join(uploadsRootDirectory, video.filename);
            try {
                const thumbnailFilename = await generateThumbnailForVideo(
                    videoPath,
                    path.parse(video.filename).name,
                    video.id
                );
                await db.query('UPDATE videos SET thumbnail_filename = $1 WHERE id = $2', [thumbnailFilename, video.id]);
                results.push({ videoId: video.id, thumbnail: thumbnailFilename, status: 'generated' });
            } catch (err) {
                console.error(`Hiba az előnézeti kép generálásakor (video ID: ${video.id}):`, err);
                results.push({ videoId: video.id, status: 'error', message: err.message });
            }
        }

        res.status(200).json({ processed: results.length, results });
    } catch (err) {
        console.error('Hiba a hiányzó előnézeti képek generálásakor:', err);
        res.status(500).json({ message: 'Nem sikerült előállítani a hiányzó előnézeti képeket.' });
    }
});

app.post('/api/admin/transcode-missing', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const { rows: videos } = await db.query('SELECT id, filename, original_name FROM videos');
        const queuedVideos = [];

        for (const video of videos) {
            const { outputPath } = build720pOutputPaths(video);

            let needsProcessing = false;
            try {
                const stats = await fs.promises.stat(outputPath);
                needsProcessing = !stats.isFile() || stats.size <= 0;
            } catch (err) {
                if (err.code === 'ENOENT') {
                    needsProcessing = true;
                } else {
                    throw err;
                }
            }

            if (needsProcessing) {
                await db.query(
                    "UPDATE videos SET has_720p = 0, has_1080p = 0, has_1440p = 0, processing_status = 'pending' WHERE id = $1",
                    [video.id]
                );
                queuedVideos.push(video.id);
            }
        }

        await processVideoQueue();

        res.status(200).json({ message: 'A hiányzó vagy hibás 720p fájlok újra ütemezve.', queued: queuedVideos });
    } catch (err) {
        console.error('Hiba a hiányzó 720p videók újraütemezése során:', err);
        res.status(500).json({ message: 'Nem sikerült elvégezni a 720p feldolgozás ütemezését.' });
    }
});

app.post('/api/admin/repair-videos', authenticateToken, isAdmin, async (_req, res) => {
    res.status(200).json({ message: 'A javítás elindult a háttérben.' });

    (async () => {
        const MIN_VALID_SIZE_BYTES = 1000;
        const updatedVideoIds = [];

        const isFileValid = async (filePath) => {
            try {
                const stats = await fs.promises.stat(filePath);
                if (stats.isFile() && stats.size > MIN_VALID_SIZE_BYTES) {
                    return true;
                }

                if (stats.isFile() && stats.size <= MIN_VALID_SIZE_BYTES) {
                    await safeUnlink(filePath);
                }
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error(`Nem sikerült ellenőrizni a fájlt (${filePath}):`, err);
                }
            }

            return false;
        };

        try {
            const { rows: videos } = await db.query(
                'SELECT id, filename, original_name, has_720p, has_1080p, has_1440p, processing_status, original_quality FROM videos'
            );

            for (const video of videos) {
                try {
                    const originalPath = path.join(uploadsRootDirectory, video.filename);
                    let originalStats;

                    try {
                        originalStats = await fs.promises.stat(originalPath);
                    } catch (err) {
                        if (err.code === 'ENOENT') {
                            console.log(`Hiányzó eredeti fájl (video_id=${video.id}): ${originalPath}`);
                        } else {
                            console.error(`Hiba az eredeti fájl ellenőrzésekor (video_id=${video.id}):`, err);
                        }

                        continue;
                    }

                    if (!originalStats.isFile() || originalStats.size <= MIN_VALID_SIZE_BYTES) {
                        console.log(`Érvénytelen eredeti fájl (video_id=${video.id}): ${originalPath}`);
                        continue;
                    }

                    const videoHeight = await getVideoHeight(originalPath);
                    const originalQuality = determineOriginalQualityLabel(videoHeight);

                    if (originalQuality !== video.original_quality) {
                        await db.query('UPDATE videos SET original_quality = $1 WHERE id = $2', [originalQuality, video.id]);
                    }

                    const requiredResolutions = [];
                    if (Number.isFinite(videoHeight)) {
                        if (videoHeight >= 2160) {
                            requiredResolutions.push(1440, 1080, 720);
                        } else if (videoHeight >= 1440) {
                            requiredResolutions.push(1080, 720);
                        } else if (videoHeight >= 1080) {
                            requiredResolutions.push(720);
                        }
                    }

                    if (requiredResolutions.length === 0) {
                        continue;
                    }

                    const updatedFlags = {
                        720: video.has_720p,
                        1080: video.has_1080p,
                        1440: video.has_1440p,
                    };

                    let shouldQueue = false;

                    for (const resolution of requiredResolutions) {
                        const { outputPath } = buildResolutionOutputPaths(video, resolution);
                        const isValid = await isFileValid(outputPath);

                        updatedFlags[resolution] = isValid ? 1 : 0;

                        if (!isValid) {
                            shouldQueue = true;
                        }
                    }

                    if (shouldQueue) {
                        await db.query(
                            'UPDATE videos SET has_720p = $1, has_1080p = $2, has_1440p = $3, processing_status = $4, original_quality = $5 WHERE id = $6',
                            [updatedFlags[720], updatedFlags[1080], updatedFlags[1440], 'pending', originalQuality, video.id]
                        );

                        updatedVideoIds.push(video.id);
                    }
                } catch (err) {
                    console.error(`Hiba a(z) ${video.id} videó javítása során:`, err);
                }
            }

            if (updatedVideoIds.length > 0) {
                await processVideoQueue();
            }
        } catch (err) {
            console.error('Hiba a videók háttérben történő javítása során:', err);
        }
    })();
});

async function deleteZeroByteMp4Files(rootDir) {
    const deletedFiles = [];

    const walk = async (dir) => {
        let entries;
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch (err) {
            if (err.code === 'ENOENT') {
                return;
            }
            throw err;
        }

        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(entryPath);
            } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp4') {
                try {
                    const stats = await fs.promises.stat(entryPath);
                    if (stats.size === 0) {
                        await fs.promises.rm(entryPath, { force: true });
                        deletedFiles.push(path.relative(uploadsRootDirectory, entryPath));
                    }
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        throw err;
                    }
                }
            }
        }
    };

    await walk(rootDir);
    return deletedFiles;
}

app.post('/api/admin/cleanup-bad-files', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const deletedFiles = await deleteZeroByteMp4Files(uploadsRootDirectory);
        res.status(200).json({ message: '0 byte-os fájlok törölve.', deleted: deletedFiles.length, files: deletedFiles });
    } catch (err) {
        console.error('Hiba a hibás fájlok takarítása során:', err);
        res.status(500).json({ message: 'Nem sikerült eltávolítani a hibás fájlokat.' });
    }
});

async function collectMp4FilesRecursively(rootDir) {
    const files = [];

    const walk = async (dir) => {
        let entries;
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch (err) {
            if (err.code === 'ENOENT') {
                return;
            }
            throw err;
        }

        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(entryPath);
            } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp4') {
                files.push(entryPath);
            }
        }
    };

    await walk(rootDir);
    return files;
}

async function optimizeVideoForFaststart(filePath) {
    const parsed = path.parse(filePath);
    const tempOutputPath = path.join(parsed.dir, `${parsed.name}_temp_faststart${parsed.ext || '.mp4'}`);

    return new Promise((resolve) => {
        ffmpeg(filePath)
            .outputOptions(['-c copy', '-movflags +faststart'])
            .output(tempOutputPath)
            .on('end', async () => {
                try {
                    await fs.promises.rename(tempOutputPath, filePath);
                    resolve(true);
                } catch (renameErr) {
                    console.error(`Hiba az optimalizált fájl átnevezésekor (${filePath}):`, renameErr);
                    try {
                        await fs.promises.rm(tempOutputPath, { force: true });
                    } catch (cleanupErr) {
                        if (cleanupErr.code !== 'ENOENT') {
                            console.error('Hiba az ideiglenes fájl törlésekor:', cleanupErr);
                        }
                    }
                    resolve(false);
                }
            })
            .on('error', async (err) => {
                console.error(`Hiba a videó optimalizálása során (${filePath}):`, err);
                try {
                    await fs.promises.rm(tempOutputPath, { force: true });
                } catch (cleanupErr) {
                    if (cleanupErr.code !== 'ENOENT') {
                        console.error('Hiba az ideiglenes fájl törlésekor:', cleanupErr);
                    }
                }
                resolve(false);
            })
            .run();
    });
}

app.post('/api/admin/optimize-all-videos', authenticateToken, isAdmin, (_req, res) => {
    res.json({
        message: 'Az optimalizálás elindult a háttérben. Figyeld a szerver konzolt a részletekért.',
    });

    (async () => {
        try {
            const targetDirectories = [clipsOriginalDirectory, clips720pDirectory, clips1080pDirectory, clips1440pDirectory];
            const allMp4Files = [];

            for (const directory of targetDirectories) {
                const mp4Files = await collectMp4FilesRecursively(directory);
                allMp4Files.push(...mp4Files);
            }

            console.log(`Összesen ${allMp4Files.length} fájlt találtam.`);

            let optimizedCount = 0;

            for (const filePath of allMp4Files) {
                try {
                    const optimized = await optimizeVideoForFaststart(filePath);

                    if (optimized) {
                        optimizedCount += 1;
                        console.log(`[OK] ${path.basename(filePath)}`);
                    }
                } catch (err) {
                    console.error(`Hiba a(z) ${filePath} videó optimalizálása során:`, err);
                }
            }

            console.log('Optimalizálás befejezve.');
            console.log(`Sikeresen optimalizált fájlok száma: ${optimizedCount}`);
        } catch (err) {
            console.error('Hiba a videók optimalizálása során:', err);
        }
    })();
});

async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
}

async function removeEmptyDirectories(rootDir, protectedDirs = []) {
    const protectedSet = new Set([rootDir, ...protectedDirs]);

    const walk = async (dir) => {
        let entries;
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch (err) {
            if (err.code === 'ENOENT') {
                return;
            }
            throw err;
        }

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = path.join(dir, entry.name);
                await walk(fullPath);
                try {
                    const childEntries = await fs.promises.readdir(fullPath);
                    if (childEntries.length === 0 && !protectedSet.has(fullPath)) {
                        await fs.promises.rmdir(fullPath);
                    }
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        throw err;
                    }
                }
            }
        }
    };

    await walk(rootDir);
}

app.post('/api/admin/fix-720p-filenames', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const { rows } = await db.query('SELECT id, filename, original_name FROM videos WHERE has_720p = 1');
        const renamedFiles = [];

        for (const video of rows) {
            const parsedFilename = path.parse(video.filename || '');
            const technicalBaseName = parsedFilename.name;
            const originalBaseName = path.parse(video.original_name || '').name;
            const extension = path.extname(video.original_name || video.filename) || '.mp4';
            const folderName = resolveFolderNameFromFilename(video.filename);
            const targetDir = path.join(clips720pDirectory, folderName);

            if (!technicalBaseName || !originalBaseName || technicalBaseName === originalBaseName) {
                continue;
            }

            const correctPath = path.join(targetDir, `${technicalBaseName}_720p${extension}`);
            const incorrectPath = path.join(targetDir, `${originalBaseName}_720p${extension}`);

            if ((await fileExists(incorrectPath)) && !(await fileExists(correctPath))) {
                await fs.promises.mkdir(targetDir, { recursive: true });
                await fs.promises.rename(incorrectPath, correctPath);

                renamedFiles.push({
                    videoId: video.id,
                    from: path.relative(uploadsRootDirectory, incorrectPath),
                    to: path.relative(uploadsRootDirectory, correctPath),
                });
            }
        }

        res.status(200).json({ renamedCount: renamedFiles.length, renamedFiles });
    } catch (err) {
        console.error('Hiba a 720p fájlnevek javításakor:', err);
        res.status(500).json({ message: 'Nem sikerült kijavítani a 720p fájlneveket.' });
    }
});

app.post('/api/admin/rescue-720p-files', authenticateToken, isAdmin, async (_req, res) => {
    const normalizeForComparison = (value) => {
        if (!value) {
            return null;
        }

        return value
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '')
            .toLowerCase();
    };

    try {
        const { rows } = await db.query('SELECT id, filename, original_name FROM videos WHERE has_720p = 1');
        const directoryEntries = await fs.promises.readdir(clipsDirectory, { withFileTypes: true });
        const legacyDirectories = directoryEntries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .filter((name) => name !== 'eredeti' && name !== '720p');

        const results = [];

        for (const video of rows) {
            const parsed = path.parse(video.filename || '');
            const baseName = parsed.name;
            const extension = parsed.ext || '.mp4';
            const originalParsed = path.parse(video.original_name || '');
            const originalBaseName = originalParsed.name;

            if (!baseName) {
                results.push({ videoId: video.id, status: 'skipped', reason: 'invalid_filename' });
                continue;
            }

            const folderName = resolveFolderNameFromFilename(video.filename);
            const targetDir = path.join(clips720pDirectory, folderName);
            const targetPath = path.join(targetDir, `${baseName}_720p${extension}`);

            if (await fileExists(targetPath)) {
                results.push({ videoId: video.id, status: 'exists' });
                continue;
            }

            const searchCandidates = [`${baseName}_720p`];
            if (originalBaseName) {
                searchCandidates.push(`${originalBaseName}_720p`);
            }

            const normalizedCandidates = searchCandidates
                .map((candidate) => normalizeForComparison(candidate))
                .filter(Boolean);

            let relocatedFrom = null;

            for (const legacyFolder of legacyDirectories) {
                const legacyPath = path.join(clipsDirectory, legacyFolder);
                const legacyEntries = await fs.promises.readdir(legacyPath, { withFileTypes: true });

                for (const entry of legacyEntries) {
                    if (!entry.isFile()) {
                        continue;
                    }

                    const parsedEntry = path.parse(entry.name);
                    const comparableName = normalizeForComparison(parsedEntry.name);
                    const comparableExtension = (parsedEntry.ext || '').toLowerCase();
                    const extensionMatches = !extension
                        || comparableExtension === extension.toLowerCase()
                        || comparableExtension === '.mp4';

                    if (extensionMatches && comparableName && normalizedCandidates.includes(comparableName)) {
                        relocatedFrom = path.join(legacyPath, entry.name);
                        break;
                    }
                }

                if (relocatedFrom) {
                    break;
                }
            }

            if (relocatedFrom) {
                await fs.promises.mkdir(targetDir, { recursive: true });
                await fs.promises.rename(relocatedFrom, targetPath);
                results.push({
                    videoId: video.id,
                    status: 'moved',
                    from: path.relative(uploadsRootDirectory, relocatedFrom),
                    to: path.relative(uploadsRootDirectory, targetPath),
                });
            } else {
                results.push({ videoId: video.id, status: 'missing' });
            }
        }

        await removeEmptyDirectories(clipsDirectory, [clipsOriginalDirectory, clips720pDirectory]);

        res.status(200).json({ processed: rows.length, results });
    } catch (err) {
        console.error('Hiba az árva 720p fájlok áthelyezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült áthelyezni az árva 720p fájlokat.' });
    }
});

app.post('/api/admin/remove-phantom-720p', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const { rows: videos } = await db.query('SELECT id, filename, original_name FROM videos WHERE has_720p = 1');
        const corrected = [];

        for (const video of videos) {
            const { outputPath } = build720pOutputPaths(video);
            let isPhantom = false;

            try {
                const stats = await fs.promises.stat(outputPath);
                isPhantom = !stats.isFile() || stats.size === 0;
            } catch (err) {
                if (err.code === 'ENOENT') {
                    isPhantom = true;
                } else {
                    throw err;
                }
            }

            if (isPhantom) {
                try {
                    await fs.promises.unlink(outputPath);
                } catch (unlinkErr) {
                    if (unlinkErr.code !== 'ENOENT') {
                        throw unlinkErr;
                    }
                }

                await db.query('UPDATE videos SET has_720p = 0 WHERE id = $1', [video.id]);

                console.log(
                    `Fantom 720p jelölés javítva | videoId=${video.id} | path=${path.relative(uploadsRootDirectory, outputPath)}`
                );

                corrected.push({
                    videoId: video.id,
                    filename: video.filename,
                    removedPath: path.relative(uploadsRootDirectory, outputPath),
                });
            }
        }

        res.status(200).json({ inspected: videos.length, correctedCount: corrected.length, corrected });
    } catch (err) {
        console.error('Hiba a fantom 720p jelölések eltávolításakor:', err);
        res.status(500).json({ message: 'Nem sikerült eltávolítani a fantom 720p jelöléseket.' });
    }
});

app.post('/api/admin/reorganize-files', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT v.id, v.filename, v.original_name,
                   COALESCE(json_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
            FROM videos v
            LEFT JOIN video_tags vt ON vt.video_id = v.id
            LEFT JOIN tags t ON t.id = vt.tag_id
            GROUP BY v.id, v.filename, v.original_name
        `);

        const results = [];

        for (const video of rows) {
            const tagNames = (() => {
                if (Array.isArray(video.tags)) {
                    return video.tags;
                }
                if (typeof video.tags === 'string') {
                    try {
                        const parsed = JSON.parse(video.tags);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch (err) {
                        return [];
                    }
                }
                return [];
            })();
            const folderName = resolveFolderNameFromTagNames(tagNames);
            const sourcePath = path.join(uploadsRootDirectory, video.filename);
            const filename = path.basename(sourcePath);
            const targetOriginalDir = path.join(clipsOriginalDirectory, folderName);
            const targetOriginalPath = path.join(targetOriginalDir, filename);
            const target720Dir = path.join(clips720pDirectory, folderName);

            try {
                if (!(await fileExists(sourcePath))) {
                    results.push({ videoId: video.id, status: 'missing_source' });
                    continue;
                }

                await fs.promises.mkdir(targetOriginalDir, { recursive: true });
                await fs.promises.mkdir(target720Dir, { recursive: true });

                if (sourcePath !== targetOriginalPath) {
                    await fs.promises.rename(sourcePath, targetOriginalPath);
                }

                const parsed = path.parse(filename);
                const extension = parsed.ext || '.mp4';
                const source720Path = path.join(path.dirname(sourcePath), `${parsed.name}_720p${extension}`);

                if (await fileExists(source720Path)) {
                    const target720Path = path.join(target720Dir, `${parsed.name}_720p${extension}`);
                    if (source720Path !== target720Path) {
                        await fs.promises.rename(source720Path, target720Path);
                    }
                }

                const newRelativePath = path.posix.join('klippek', 'eredeti', folderName, filename);
                await db.query('UPDATE videos SET filename = $1 WHERE id = $2', [newRelativePath, video.id]);

                results.push({ videoId: video.id, status: 'moved', folder: folderName });
            } catch (err) {
                console.error(`Hiba a(z) ${video.id} videó átszervezésekor:`, err);
                results.push({ videoId: video.id, status: 'failed', error: err.message });
            }
        }

        await removeEmptyDirectories(clipsDirectory, [clipsOriginalDirectory, clips720pDirectory]);

        res.status(200).json({ processed: results.length, results });
    } catch (err) {
        console.error('Hiba a fájlok átszervezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült átszervezni a fájlokat.' });
    }
});

function normalizeFilename(originalName) {
    if (!originalName) {
        return '';
    }

    const trimmedName = originalName.trim();

    // A böngészőkből érkező fájlnevek gyakran Latin-1 kódolással érkeznek,
    // ezért a magyar ékezetes karakterek hibásan jelenhetnek meg (pl. "Ã¡" az "á" helyett).
    // Ha ilyen mintát érzékelünk, újrakódoljuk UTF-8-ra.
    const looksLikeMojibake = /[Ã�Â]/.test(trimmedName);
    if (looksLikeMojibake) {
        const decoded = Buffer.from(trimmedName, 'latin1').toString('utf8').trim();
        if (decoded && !decoded.includes('�')) {
            return decoded;
        }
    }

    return trimmedName;
}

function stripKnownVideoExtension(value) {
    const normalized = normalizeFilename(value || '').trim();
    if (!normalized) {
        return '';
    }
    const ext = getArchiveVideoExtension(normalized);
    if (!ext) {
        return normalized;
    }
    const withoutExt = normalized.slice(0, -ext.length).trim();
    return withoutExt || normalized;
}

function sanitizeFolderName(name) {
    if (!name || typeof name !== 'string') {
        return 'egyeb';
    }

    const normalized = name
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .toLowerCase()
        .trim();

    return normalized || 'egyeb';
}

const BLACKLISTED_FOLDER_NAMES = new Set([
    'balazs',
    'balázs',
    'david',
    'dávid'
].map((name) => sanitizeFolderName(name)));

function resolveFolderNameFromTagNames(tagNames = []) {
    for (const tagName of tagNames) {
        const sanitized = sanitizeFolderName(tagName);
        if (sanitized && !BLACKLISTED_FOLDER_NAMES.has(sanitized)) {
            return sanitized;
        }
    }

    return 'egyeb';
}

function resolveFolderNameFromFilename(filename) {
    const directory = path.posix.dirname(filename || '');
    const segments = directory.split('/').filter(Boolean);
    const possibleFolder = segments.pop();
    return possibleFolder ? sanitizeFolderName(possibleFolder) : 'egyeb';
}

function buildResolutionOutputPaths(video, targetHeight) {
    const extension = path.extname(video.original_name || video.filename) || '.mp4';
    const baseName = path.parse(video.original_name || video.filename).name || path.parse(video.filename).name;
    const folderName = resolveFolderNameFromFilename(video.filename);
    const targetLabel = `${targetHeight}p`;
    const baseDir = targetHeight === 720
        ? clips720pDirectory
        : targetHeight === 1080
            ? clips1080pDirectory
            : clips1440pDirectory;
    const outputDir = path.join(baseDir, folderName);
    const outputFilename = `${baseName}_${targetLabel}${extension}`;
    const outputPath = path.join(outputDir, outputFilename);

    return { outputDir, outputPath, outputFilename, targetLabel };
}

function build720pOutputPaths(video) {
    return buildResolutionOutputPaths(video, 720);
}

async function processVideoQueue() {
    if (isProcessing) {
        return;
    }

    isProcessing = true;
    let currentVideo = null;

    try {
        const { rows } = await db.query(
            "SELECT id, filename, original_name, thumbnail_filename FROM videos WHERE processing_status = 'pending' ORDER BY id ASC LIMIT 1"
        );

        currentVideo = rows[0];

        if (!currentVideo) {
            return;
        }

        await db.query("UPDATE videos SET processing_status = 'processing' WHERE id = $1", [currentVideo.id]);

        try {
            const videoPath = path.join(uploadsRootDirectory, currentVideo.filename);
            let thumbnailFilename = currentVideo.thumbnail_filename;
            const thumbnailPath = thumbnailFilename ? path.join(uploadsRootDirectory, thumbnailFilename) : null;

            if (!thumbnailPath || !(await fileExists(thumbnailPath))) {
                thumbnailFilename = await generateThumbnailForVideo(
                    videoPath,
                    path.parse(currentVideo.filename).name,
                    currentVideo.id
                );
                await db.query('UPDATE videos SET thumbnail_filename = $1 WHERE id = $2', [thumbnailFilename, currentVideo.id]);
            }

            try {
                await optimizeVideoForFaststart(videoPath);
            } catch (optErr) {
                console.error(`Hiba a(z) ${currentVideo.id} videó faststart optimalizálása során:`, optErr);
            }

            const videoHeight = await getVideoHeight(videoPath);
            const originalQuality = determineOriginalQualityLabel(videoHeight);
            const availability = { 720: 0, 1080: 0, 1440: 0 };
            const targets = determineTargetResolutions(videoHeight);

            const resolutions = [720, 1080, 1440];
            const outputConfigs = Object.fromEntries(resolutions.map((height) => [height, buildResolutionOutputPaths(currentVideo, height)]));

            for (const height of resolutions) {
                const { outputPath } = outputConfigs[height];
                try {
                    const stats = await fs.promises.stat(outputPath);
                    if (stats.isFile() && stats.size > 0) {
                        availability[height] = 1;
                        continue;
                    }
                } catch (statErr) {
                    if (statErr.code !== 'ENOENT') {
                        console.error(`Nem sikerült ellenőrizni a ${height}p verziót (${currentVideo.id}):`, statErr);
                    }
                }

                if (!targets.includes(height)) {
                    continue;
                }

                const { outputDir } = outputConfigs[height];
                await fs.promises.mkdir(outputDir, { recursive: true });

                try {
                    const result = await transcodeVideoToHeight(
                        videoPath,
                        outputDir,
                        currentVideo.original_name || currentVideo.filename,
                        height
                    );

                    if (!result.skipped) {
                        availability[height] = 1;
                    }
                } catch (transcodeErr) {
                    console.error(`Hiba a ${height}p verzió készítésekor (${currentVideo.id}):`, transcodeErr);
                }
            }

            await db.query(
                'UPDATE videos SET has_720p = $1, has_1080p = $2, has_1440p = $3, original_quality = $4 WHERE id = $5',
                [availability[720], availability[1080], availability[1440], originalQuality, currentVideo.id]
            );

            await db.query("UPDATE videos SET processing_status = 'done' WHERE id = $1", [currentVideo.id]);
        } catch (processErr) {
            console.error(`Hiba a(z) ${currentVideo?.id} videó feldolgozása során:`, processErr);
            await db.query("UPDATE videos SET processing_status = 'error' WHERE id = $1", [currentVideo.id]);
        }
    } catch (err) {
        console.error('Hiba a feldolgozási sor kezelése során:', err);
    } finally {
        isProcessing = false;
    }

    if (currentVideo) {
        await processVideoQueue();
    }
}

async function processArchiveVideoQueue() {
    if (isArchiveProcessing) {
        return;
    }

    isArchiveProcessing = true;
    let currentVideo = null;

    try {
        const { rows } = await db.query(
            "SELECT id, folder_name, filename, original_name, thumbnail_filename FROM archive_videos WHERE processing_status = 'pending' ORDER BY id ASC LIMIT 1"
        );

        currentVideo = rows[0];
        if (!currentVideo) {
            return;
        }

        await db.query(
            "UPDATE archive_videos SET processing_status = 'processing', processing_error = NULL WHERE id = $1",
            [currentVideo.id]
        );

        try {
            const videoPath = path.join(uploadsRootDirectory, currentVideo.filename);
            let thumbnailFilename = currentVideo.thumbnail_filename;
            const thumbnailPath = thumbnailFilename ? path.join(uploadsRootDirectory, thumbnailFilename) : null;
            let processingError = null;

            if (!thumbnailPath || !(await fileExists(thumbnailPath))) {
                try {
                    thumbnailFilename = await generateThumbnailForVideo(
                        videoPath,
                        path.parse(currentVideo.filename).name,
                        currentVideo.id
                    );
                    await db.query('UPDATE archive_videos SET thumbnail_filename = $1 WHERE id = $2', [thumbnailFilename, currentVideo.id]);
                } catch (thumbErr) {
                    console.error(`Hiba az archiv video indexkep generalasakor (${currentVideo.id}):`, thumbErr);
                }
            }

            try {
                await optimizeVideoForFaststart(videoPath);
            } catch (optErr) {
                console.error(`Hiba a(z) ${currentVideo.id} archív videó faststart optimalizálása során:`, optErr);
            }

            const videoHeight = await getVideoHeight(videoPath);
            const originalQuality = determineOriginalQualityLabel(videoHeight);
            const targets = determineTargetResolutions(videoHeight);
            let has720p = 0;
            const { outputPath, outputDir } = buildArchiveVideoResolutionOutputPaths(currentVideo, 720);

            try {
                const stats = await fs.promises.stat(outputPath);
                if (stats.isFile() && stats.size > 0) {
                    has720p = 1;
                }
            } catch (statErr) {
                if (statErr.code !== 'ENOENT') {
                    console.error(`Nem sikerült ellenőrizni a 720p archív videót (${currentVideo.id}):`, statErr);
                }
            }

            if (!has720p && targets.includes(720)) {
                await fs.promises.mkdir(outputDir, { recursive: true });
                try {
                    const result = await transcodeVideoToHeight(
                        videoPath,
                        outputDir,
                        currentVideo.original_name || currentVideo.filename,
                        720
                    );
                    if (!result.skipped) {
                        has720p = 1;
                    }
                } catch (transcodeErr) {
                    console.error(`Hiba a 720p archív verzió készítésekor (${currentVideo.id}):`, transcodeErr);
                    processingError = normalizeProcessingErrorMessage(
                        transcodeErr,
                        'Nem sikerult letrehozni a 720p verziot.'
                    );
                }
            }

            const nextStatus = processingError ? 'error' : 'done';
            await db.query(
                'UPDATE archive_videos SET has_720p = $1, original_quality = $2, processing_status = $3, processing_error = $4 WHERE id = $5',
                [has720p, originalQuality, nextStatus, processingError, currentVideo.id]
            );
        } catch (processErr) {
            console.error(`Hiba a(z) ${currentVideo?.id} archív videó feldolgozása során:`, processErr);
            const processingError = normalizeProcessingErrorMessage(
                processErr,
                'Nem sikerult feldolgozni az archiv videot.'
            );
            await db.query(
                "UPDATE archive_videos SET processing_status = 'error', processing_error = $2 WHERE id = $1",
                [currentVideo.id, processingError]
            );
        }
    } catch (err) {
        console.error('Hiba az archív videó feldolgozási sor kezelése során:', err);
    } finally {
        isArchiveProcessing = false;
    }

    if (currentVideo) {
        await processArchiveVideoQueue();
    }
}

app.post('/upload', authenticateToken, ensureClipViewPermission, loadUserUploadSettings, (req, res, next) => {
    const limits = { files: 100 };
    if (req.uploadSettings && Number.isFinite(req.uploadSettings.maxFileSizeBytes)) {
        limits.fileSize = req.uploadSettings.maxFileSizeBytes;
    }
    const perUserUpload = multer({ storage, limits }).array('videos');
    perUserUpload(req, res, (err) => {
        if (err) return next(err);
        next();
    });
}, async (req, res) => {
    if (!req.files || !req.files.length) {
        return res.status(400).json({ message: 'Nincs fájl feltöltve.' });
    }

    const uploaderId = req.user.id;

    const normalizeTagIds = (value) => {
        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {
            return Array.from(new Set(value.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite)));
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return Array.from(new Set(parsed.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite)));
                }
            } catch (err) {
                return [];
            }
        }

        return [];
    };

    const fallbackTagIds = normalizeTagIds(req.body.tags);

    const metadataList = (() => {
        try {
            const parsed = JSON.parse(req.body.metadata || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    })();

    let filesWithNames;
    try {
        filesWithNames = await Promise.all(req.files.map(async (file, index) => {
            const { originalname } = file;
            const normalizedOriginalName = normalizeFilename(originalname);
            const metadata = metadataList[index] || {};
            const customName = typeof metadata.name === 'string' ? normalizeFilename(metadata.name) : '';
            const normalizedCustomName = stripKnownVideoExtension(customName);
            const normalizedDisplayName = stripKnownVideoExtension(normalizedOriginalName);
            const sanitizedOriginalName = normalizedCustomName || normalizedDisplayName || normalizedOriginalName;
            const tagsForFile = normalizeTagIds(metadata.tags);
            const filePath = path.join(clipsOriginalDirectory, file.filename);
            const embeddedHash = await extractEmbeddedHash(filePath);

            if (!embeddedHash) {
                await safeUnlink(filePath);
                const error = new Error(`Upload rejected: File ${originalname} is missing the required 'UMKGL_HASH' metadata tag.`);
                error.statusCode = 400;
                throw error;
            }

            return {
                file,
                sanitizedOriginalName,
                tags: tagsForFile.length ? tagsForFile : fallbackTagIds,
                fileHash: embeddedHash
            };
        }));
    } catch (err) {
        console.error('Hiba a feltöltött fájlok feldolgozásakor:', err);
        const statusCode = err && err.statusCode === 400 ? 400 : 500;
        const message = err && err.message ? err.message : 'Nem sikerült feldolgozni a feltöltött fájlokat.';
        return res.status(statusCode).json({ message });
    }

    const filesToProcess = filesWithNames;

    const projectedUploadCount = req.uploadSettings
        ? req.uploadSettings.uploadCount + filesToProcess.length
        : null;

    if (req.uploadSettings && req.uploadSettings.maxVideos > 0 && projectedUploadCount > req.uploadSettings.maxVideos) {
        return res.status(403).json({ message: 'Elérted a maximális feltöltési limitet.' });
    }

    const tagIdSet = new Set();
    filesToProcess.forEach(({ tags }) => {
        tags.forEach((id) => tagIdSet.add(id));
    });

    const tagNamesById = new Map();
    if (tagIdSet.size) {
        try {
            const { rows } = await db.query('SELECT id, name FROM tags WHERE id = ANY($1)', [Array.from(tagIdSet)]);
            rows.forEach(({ id, name }) => {
                tagNamesById.set(id, name);
            });
        } catch (err) {
            console.error('Hiba a címkék beolvasása során:', err);
        }
    }

    const resolveFolderName = (tags) => {
        const tagNames = (tags || []).map((id) => tagNamesById.get(id)).filter(Boolean);
        return resolveFolderNameFromTagNames(tagNames);
    };

    const createdVideos = [];
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        for (const { file, sanitizedOriginalName, tags, fileHash } of filesToProcess) {
            const { filename } = file;
            const currentFilePath = path.join(clipsOriginalDirectory, filename);
            const folderName = resolveFolderName(tags);
            const targetDirectory = path.join(clipsOriginalDirectory, folderName);
            await fs.promises.mkdir(targetDirectory, { recursive: true });
            const targetFilePath = path.join(targetDirectory, filename);
            await fs.promises.rename(currentFilePath, targetFilePath);

            const storedFilename = path.posix.join('klippek', 'eredeti', folderName, filename);
            const contentCreatedAt = await getVideoCreationDate(targetFilePath);
            const insertVideoQuery = `INSERT INTO videos (filename, original_name, uploader_id, content_created_at, file_hash, processing_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
            let insertResult;
            try {
                insertResult = await client.query(insertVideoQuery, [storedFilename, sanitizedOriginalName, uploaderId, contentCreatedAt, fileHash, 'pending']);
            } catch (err) {
                if (err.code === '23505') {
                    await safeUnlink(targetFilePath);
                    await client.query('ROLLBACK');
                    return res.status(409).json({ message: 'Ezt a videót már feltöltötték.' });
                }
                throw err;
            }
            const { rows } = insertResult;
            const videoId = rows[0]?.id;

            if (videoId && tags.length) {
                for (const tagId of tags) {
                    await client.query(
                        'INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [videoId, tagId]
                    );
                }
            }

            const thumbnailFilename = await generateThumbnailForVideo(
                targetFilePath,
                path.parse(filename).name,
                videoId
            );
            await client.query('UPDATE videos SET thumbnail_filename = $1 WHERE id = $2', [thumbnailFilename, videoId]);

            if (videoId) {
                createdVideos.push({
                    id: videoId,
                    filename: storedFilename,
                    original_name: sanitizedOriginalName,
                    thumbnail_filename: thumbnailFilename,
                });
            }
        }

        await client.query('UPDATE users SET upload_count = upload_count + $1 WHERE id = $2', [filesToProcess.length, uploaderId]);
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Videók sikeresen feltöltve.',
            videoIds: createdVideos.map((video) => video.id),
        });
        setImmediate(() => {
            processVideoQueue();
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba a videó feltöltésekor:', err);
        res.status(500).json({ message: 'Nem sikerült menteni a videó adatait.' });
    } finally {
        client.release();
    }
});

app.post('/api/videos/cancel', authenticateToken, async (req, res) => {
    const rawIds = Array.isArray(req.body?.videoIds) ? req.body.videoIds : [];
    const videoIds = Array.from(new Set(rawIds.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite)));

    if (!videoIds.length) {
        return res.status(400).json({ message: 'Nincs törlendő videó.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT id, filename, original_name, thumbnail_filename, uploader_id FROM videos WHERE id = ANY($1)',
            [videoIds]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'A megadott videók nem találhatók.' });
        }

        const deletable = rows.filter((video) => video.uploader_id === req.user.id || req.user.isAdmin);
        if (!deletable.length) {
            return res.status(403).json({ message: 'Nincs jogosultság a videók törléséhez.' });
        }

        const deletedVideoIds = [];
        for (const video of deletable) {
            await deleteVideoRecord(video);
            deletedVideoIds.push(video.id);
        }

        return res.status(200).json({
            message: 'Feltöltés megszakítva, videók törölve.',
            deletedVideoIds,
        });
    } catch (err) {
        console.error('Hiba a feltöltés megszakítása során:', err);
        return res.status(500).json({ message: 'Nem sikerült törölni a videókat.' });
    }
});

app.delete('/api/videos/:id', authenticateToken, isAdmin, async (req, res) => {
    const videoId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(videoId)) {
        return res.status(400).json({ message: 'Érvénytelen videó azonosító.' });
    }

    try {
        const { rows } = await db.query(
            'SELECT id, filename, original_name, thumbnail_filename FROM videos WHERE id = $1',
            [videoId]
        );
        const video = rows[0];

        if (!video) {
            return res.status(404).json({ message: 'A videó nem található.' });
        }

        await deleteVideoRecord(video);
        res.status(200).json({ message: 'Videó sikeresen törölve.' });
    } catch (err) {
        console.error('Hiba a videó törlésekor:', err);
        res.status(500).json({ message: 'Nem sikerült törölni a videót.' });
    }
});

app.patch('/api/videos/:id/title', authenticateToken, isAdmin, async (req, res) => {
    const videoId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(videoId)) {
        return res.status(400).json({ message: 'Érvénytelen videó azonosító.' });
    }

    const rawTitle = (req.body?.title || req.body?.original_name || '').toString();
    const normalizedTitle = normalizeFilename(rawTitle).trim();

    if (!normalizedTitle) {
        return res.status(400).json({ message: 'Az új cím megadása kötelező.' });
    }

    const truncatedTitle = normalizedTitle.slice(0, 255);

    try {
        const { rows } = await db.query(
            'UPDATE videos SET original_name = $1 WHERE id = $2 RETURNING id, original_name',
            [truncatedTitle, videoId]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'A videó nem található.' });
        }

        return res.status(200).json({
            message: 'A klip címe frissült.',
            id: rows[0].id,
            original_name: rows[0].original_name,
        });
    } catch (err) {
        console.error('Hiba a klip címének frissítésekor:', err);
        return res.status(500).json({ message: 'Nem sikerült frissíteni a klip címét.' });
    }
});

app.get('/api/programs', async (_req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description, image_filename, file_filename, original_filename, download_count, created_at FROM programs ORDER BY created_at DESC');
        res.status(200).json(rows || []);
    } catch (err) {
        console.error('Hiba a programok lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a programokat.' });
    }
});

app.post('/api/programs', authenticateToken, isAdmin, (req, res, next) => {
    const uploadHandler = uploadProgramFiles.fields([
        { name: 'image', maxCount: 1 },
        { name: 'file', maxCount: 1 }
    ]);

    uploadHandler(req, res, (err) => {
        if (err) return next(err);
        next();
    });
}, async (req, res) => {
    const { name, description } = req.body || {};
    const imageFile = req.files && req.files.image ? req.files.image[0] : null;
    const programFile = req.files && req.files.file ? req.files.file[0] : null;

    if (!name || !description || !imageFile || !programFile) {
        if (imageFile) {
            await safeUnlink(path.join(programImagesDirectory, imageFile.filename));
        }
        if (programFile) {
            await safeUnlink(path.join(programFilesDirectory, programFile.filename));
        }
        return res.status(400).json({ message: 'A név, leírás, kép és fájl megadása kötelező.' });
    }

    try {
        await db.query(
            'INSERT INTO programs (name, description, image_filename, file_filename, original_filename) VALUES ($1, $2, $3, $4, $5)',
            [name, description, imageFile.filename, programFile.filename, normalizeFilename(programFile.originalname)]
        );

        res.status(201).json({ message: 'Program sikeresen feltöltve.' });
    } catch (err) {
        console.error('Hiba a program mentésekor:', err);
        await safeUnlink(path.join(programImagesDirectory, imageFile.filename));
        await safeUnlink(path.join(programFilesDirectory, programFile.filename));
        res.status(500).json({ message: 'Nem sikerült menteni a programot.' });
    }
});

app.put('/api/programs/:id', authenticateToken, isAdmin, (req, res, next) => {
    const uploadHandler = uploadProgramFiles.fields([
        { name: 'image', maxCount: 1 },
        { name: 'file', maxCount: 1 }
    ]);

    uploadHandler(req, res, (err) => {
        if (err) return next(err);
        next();
    });
}, async (req, res) => {
    const imageFile = req.files && req.files.image ? req.files.image[0] : null;
    const programFile = req.files && req.files.file ? req.files.file[0] : null;

    const cleanupUploads = async () => {
        if (imageFile) {
            await safeUnlink(path.join(programImagesDirectory, imageFile.filename));
        }
        if (programFile) {
            await safeUnlink(path.join(programFilesDirectory, programFile.filename));
        }
    };

    const programId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(programId)) {
        await cleanupUploads();
        return res.status(400).json({ message: 'Érvénytelen program azonosító.' });
    }

    const { name, description } = req.body || {};

    if (!name || !description) {
        await cleanupUploads();
        return res.status(400).json({ message: 'A név és a leírás megadása kötelező.' });
    }

    try {
        const { rows } = await db.query('SELECT image_filename, file_filename, original_filename FROM programs WHERE id = $1', [programId]);
        const existingProgram = rows[0];

        if (!existingProgram) {
            await cleanupUploads();
            return res.status(404).json({ message: 'A program nem található.' });
        }

        const newImageFilename = imageFile ? imageFile.filename : existingProgram.image_filename;
        const newFileFilename = programFile ? programFile.filename : existingProgram.file_filename;
        const newOriginalFilename = programFile ? normalizeFilename(programFile.originalname) : existingProgram.original_filename;

        await db.query(
            'UPDATE programs SET name = $1, description = $2, image_filename = $3, file_filename = $4, original_filename = $5 WHERE id = $6',
            [name, description, newImageFilename, newFileFilename, newOriginalFilename, programId]
        );

        if (imageFile && existingProgram.image_filename) {
            await safeUnlink(path.join(programImagesDirectory, existingProgram.image_filename));
        }

        if (programFile && existingProgram.file_filename) {
            await safeUnlink(path.join(programFilesDirectory, existingProgram.file_filename));
        }

        res.status(200).json({ message: 'Program sikeresen frissítve.' });
    } catch (err) {
        console.error('Hiba a program frissítésekor:', err);
        await cleanupUploads();
        res.status(500).json({ message: 'Nem sikerült frissíteni a programot.' });
    }
});

app.delete('/api/programs/:id', authenticateToken, isAdmin, async (req, res) => {
    const programId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(programId)) {
        return res.status(400).json({ message: 'Érvénytelen program azonosító.' });
    }

    try {
        const { rows } = await db.query('SELECT image_filename, file_filename FROM programs WHERE id = $1', [programId]);
        const program = rows[0];

        if (!program) {
            return res.status(404).json({ message: 'A program nem található.' });
        }

        if (program.image_filename) {
            await safeUnlink(path.join(programImagesDirectory, program.image_filename));
        }

        if (program.file_filename) {
            await safeUnlink(path.join(programFilesDirectory, program.file_filename));
        }

        await db.query('DELETE FROM programs WHERE id = $1', [programId]);
        res.status(200).json({ message: 'Program sikeresen törölve.' });
    } catch (err) {
        console.error('Hiba a program törlésekor:', err);
        res.status(500).json({ message: 'Nem sikerült törölni a programot.' });
    }
});

app.get('/api/programs/:id/download', async (req, res) => {
    const programId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(programId)) {
        return res.status(400).json({ message: 'Érvénytelen program azonosító.' });
    }

    try {
        const { rows } = await db.query('SELECT file_filename, original_filename FROM programs WHERE id = $1', [programId]);
        const program = rows[0];

        if (!program) {
            return res.status(404).json({ message: 'A program nem található.' });
        }

        const normalizedPath = path.normalize(path.join(programFilesDirectory, program.file_filename));
        if (!normalizedPath.startsWith(programFilesDirectory)) {
            return res.status(400).json({ message: 'Érvénytelen fájl elérési út.' });
        }

        try {
            await fs.promises.stat(normalizedPath);
        } catch (statErr) {
            return res.status(404).json({ message: 'A program fájlja nem található.' });
        }

        const ipAddress = req.ip;

        const { rows: hourRows } = await db.query(
            "SELECT COUNT(*) FROM downloads_log WHERE program_id = $1 AND ip_address = $2 AND downloaded_at >= NOW() - INTERVAL '1 hour'",
            [programId, ipAddress]
        );
        const hourDownloads = Number(hourRows[0]?.count || 0);

        if (hourDownloads >= 3) {
            return res.status(429).json({ message: 'Túllépted a letöltési keretet (Max 3/óra, 10/nap).' });
        }

        const { rows: dayRows } = await db.query(
            "SELECT COUNT(*) FROM downloads_log WHERE program_id = $1 AND ip_address = $2 AND downloaded_at >= NOW() - INTERVAL '24 hours'",
            [programId, ipAddress]
        );
        const dayDownloads = Number(dayRows[0]?.count || 0);

        if (dayDownloads >= 10) {
            return res.status(429).json({ message: 'Túllépted a letöltési keretet (Max 3/óra, 10/nap).' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('INSERT INTO downloads_log (program_id, ip_address) VALUES ($1, $2)', [programId, ipAddress]);
            await client.query('UPDATE programs SET download_count = download_count + 1 WHERE id = $1', [programId]);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Hiba a letöltés naplózása közben:', err);
            // A letöltés attól még történjen meg, ha a naplózás meghiúsul.
        } finally {
            client.release();
        }

        res.download(normalizedPath, program.original_filename, (err) => {
            if (err && !res.headersSent) {
                console.error('Hiba a fájl letöltésekor:', err);
                res.status(500).json({ message: 'Nem sikerült elküldeni a fájlt.' });
            }
        });
    } catch (err) {
        console.error('Hiba a letöltési kérés feldolgozásakor:', err);
        res.status(500).json({ message: 'Nem sikerült feldolgozni a letöltési kérést.' });
    }
});

// Avatar feltöltés beállítása
const avatarDirectory = path.join(uploadsRootDirectory, 'avatars');
ensureDirectoryExists(avatarDirectory);

const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, avatarDirectory);
    },
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Csak képfájlok tölthetők fel (jpeg, jpg, png, gif).'));
    }
}).single('avatar');

app.post('/api/profile/upload-avatar', authenticateToken, (req, res) => {
    uploadAvatar(req, res, async (uploadErr) => {
        if (uploadErr) {
            if (uploadErr instanceof multer.MulterError) {
                const message = uploadErr.code === 'LIMIT_FILE_SIZE'
                    ? 'A képfájl mérete nem haladhatja meg az 5MB-ot.'
                    : 'Feltöltési hiba.';
                return res.status(400).json({ message });
            }
            return res.status(400).json({ message: uploadErr.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Nincs fájl feltöltve.' });
        }

        const { filename } = req.file;
        const userId = req.user.id;

        try {
            const { rows } = await db.query('SELECT profile_picture_filename FROM users WHERE id = $1', [userId]);
            const oldFilename = rows[0]?.profile_picture_filename;

            await db.query('UPDATE users SET profile_picture_filename = $1 WHERE id = $2', [filename, userId]);

            if (oldFilename) {
                const oldPath = path.join(avatarDirectory, oldFilename);
                fs.unlink(oldPath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                        console.error('Hiba a régi avatár törlésekor:', unlinkErr);
                    }
                });
            }

            res.status(200).json({ message: 'Profilkép sikeresen frissítve.', filename });
        } catch (dbErr) {
            console.error('Hiba a profilkép frissítésekor:', dbErr);
            res.status(500).json({ message: 'Nem sikerült frissíteni a profilképet.' });
        }
    });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'A feltöltött fájl meghaladja a megengedett méretet.'
            : err.message;
        return res.status(400).json({ message });
    }
    console.error('Váratlan hiba a kérés feldolgozása közben:', err);
    res.status(500).json({ message: 'Váratlan hiba történt.' });
});

app.post('/api/profile/update-name', authenticateToken, async (req, res) => {
    const { newUsername } = req.body;
    const userId = req.user.id;

    if (!newUsername || newUsername.trim().length === 0) {
        return res.status(400).json({ message: 'Az új felhasználónév nem lehet üres.' });
    }

    try {
        const trimmedUsername = newUsername.trim();

        const { rows } = await db.query('SELECT id FROM users WHERE username = $1', [trimmedUsername]);
        const existingUser = rows[0];

        if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({ message: 'Ez a felhasználónév már foglalt.' });
        }

        await db.query('UPDATE users SET username = $1 WHERE id = $2', [trimmedUsername, userId]);
        res.status(200).json({ message: 'Felhasználónév sikeresen frissítve.', newUsername: trimmedUsername });
    } catch (err) {
        console.error('Hiba a felhasználónév frissítésekor:', err);
        res.status(500).json({ message: 'Nem sikerült frissíteni a felhasználónevet.' });
    }
});

app.post('/api/profile/update-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Jelenlegi és új jelszó megadása kötelező.' });
    }

    try {
        const { rows } = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'A jelenlegi jelszó helytelen.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);

        res.status(200).json({ message: 'Jelszó sikeresen frissítve.' });
    } catch (err) {
        console.error('Hiba a jelszó frissítésekor:', err);
        res.status(500).json({ message: 'Nem sikerült frissíteni a jelszót.' });
    }
});

// 6. A szerver elindítása
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function toIsoStringOrNull(value) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        return null;
    }
    return value.toISOString();
}

function parseDateOrNull(value) {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateKey(date = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toISOString().slice(0, 10);
}

function getRadnaiLogFilePath(date = new Date()) {
    const dateKey = getDateKey(date) || 'unknown';
    return path.join(RADNAI_MONITOR_LOG_DIR, `radnai-monitor-${dateKey}.log`);
}

function getRadnaiHashCheckLogFilePath(date = new Date()) {
    const dateKey = getDateKey(date) || 'unknown';
    return path.join(RADNAI_MONITOR_LOG_DIR, `radnai-hash-check-${dateKey}.log`);
}

function getRadnaiLogDatePart(filename) {
    const match = String(filename || '').match(/^(?:radnai-monitor|radnai-hash-check)-(\d{4}-\d{2}-\d{2})\.log$/);
    return match ? match[1] : null;
}

async function ensureRadnaiMonitorStorage() {
    await fs.promises.mkdir(RADNAI_MONITOR_DATA_DIR, { recursive: true });
    await fs.promises.mkdir(RADNAI_MONITOR_LOG_DIR, { recursive: true });
}

async function appendRadnaiMonitorEvent(level, event, details = {}) {
    try {
        await ensureRadnaiMonitorStorage();
        const entry = {
            timestamp: new Date().toISOString(),
            level: String(level || 'info'),
            event: String(event || 'unknown'),
            details: details && typeof details === 'object' ? details : { value: details },
        };
        await fs.promises.appendFile(getRadnaiLogFilePath(), `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (err) {
        console.error('Hiba a Radnai monitor log irasakor:', err);
    }
}

async function appendRadnaiHashCheckResult(details = {}) {
    try {
        await ensureRadnaiMonitorStorage();
        const entry = {
            timestamp: new Date().toISOString(),
            event: 'hash-check-result',
            details: details && typeof details === 'object' ? details : { value: details },
        };
        await fs.promises.appendFile(getRadnaiHashCheckLogFilePath(), `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (err) {
        console.error('Hiba a Radnai hash-check log irasakor:', err);
    }
}

async function cleanupOldRadnaiMonitorLogs() {
    try {
        await ensureRadnaiMonitorStorage();
        const files = await fs.promises.readdir(RADNAI_MONITOR_LOG_DIR);
        const now = new Date();
        const todayKey = getDateKey(now);
        const allKeysToKeep = new Set([todayKey].filter(Boolean));

        for (const filename of files) {
            const datePart = getRadnaiLogDatePart(filename);
            if (!datePart) {
                continue;
            }
            const filePath = path.join(RADNAI_MONITOR_LOG_DIR, filename);
            const fileDate = parseDateOrNull(`${datePart}T00:00:00.000Z`);
            if (!fileDate) {
                await fs.promises.unlink(filePath).catch(() => {});
                continue;
            }

            const ageDays = Math.floor((now.getTime() - fileDate.getTime()) / (24 * 60 * 60 * 1000));
            if (ageDays >= RADNAI_LOG_RETENTION_DAYS && !allKeysToKeep.has(datePart)) {
                await fs.promises.unlink(filePath).catch(() => {});
            }
        }
    } catch (err) {
        console.error('Hiba a Radnai monitor naplo takaritasakor:', err);
    }
}

async function loadRadnaiMonitorState() {
    try {
        await ensureRadnaiMonitorStorage();
        const raw = await fs.promises.readFile(RADNAI_MONITOR_STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw || '{}');

        lastRadnaiHash = typeof parsed.lastRadnaiHash === 'string' ? parsed.lastRadnaiHash : null;
        lastRadnaiCheck = parseDateOrNull(parsed.lastRadnaiCheck);
        lastRadnaiStatus = typeof parsed.lastRadnaiStatus === 'string' ? parsed.lastRadnaiStatus : 'ok';
        lastRadnaiFailureReason = typeof parsed.lastRadnaiFailureReason === 'string' ? parsed.lastRadnaiFailureReason : null;
        radnaiConsecutiveFailures = Number.isFinite(Number(parsed.radnaiConsecutiveFailures))
            ? Number(parsed.radnaiConsecutiveFailures)
            : 0;
        radnaiOutageActive = parsed.radnaiOutageActive === true;
        lastRadnaiOutageAlertAt = parseDateOrNull(parsed.lastRadnaiOutageAlertAt);
        if (typeof parsed.radnaiMonitoringEnabled === 'boolean') {
            radnaiMonitoringEnabled = parsed.radnaiMonitoringEnabled;
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Hiba a Radnai monitor allapot betoltesekor:', err);
        }
    }
}

async function persistRadnaiMonitorState() {
    try {
        await ensureRadnaiMonitorStorage();
        const statePayload = {
            lastRadnaiHash,
            lastRadnaiCheck: toIsoStringOrNull(lastRadnaiCheck),
            lastRadnaiStatus,
            lastRadnaiFailureReason,
            radnaiConsecutiveFailures,
            radnaiOutageActive,
            lastRadnaiOutageAlertAt: toIsoStringOrNull(lastRadnaiOutageAlertAt),
            radnaiMonitoringEnabled,
            updatedAt: new Date().toISOString(),
        };
        const tempFile = `${RADNAI_MONITOR_STATE_FILE}.tmp`;
        await fs.promises.writeFile(tempFile, JSON.stringify(statePayload, null, 2), 'utf8');
        await fs.promises.rename(tempFile, RADNAI_MONITOR_STATE_FILE);
    } catch (err) {
        console.error('Hiba a Radnai monitor allapot mentesekor:', err);
    }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }
}

function shouldRetryStatus(status) {
    return status === 429 || status >= 500;
}

async function setRadnaiMonitoringEnabled(enabled, source = 'unknown') {
    const normalizedEnabled = enabled === true;
    if (radnaiMonitoringEnabled === normalizedEnabled) {
        return;
    }

    radnaiMonitoringEnabled = normalizedEnabled;

    if (!normalizedEnabled) {
        lastRadnaiStatus = 'disabled';
        lastRadnaiFailureReason = null;
        radnaiConsecutiveFailures = 0;
        radnaiOutageActive = false;
    } else {
        lastRadnaiStatus = 'checking';
        lastRadnaiFailureReason = null;
        radnaiConsecutiveFailures = 0;
        radnaiOutageActive = false;
    }

    await appendRadnaiMonitorEvent('info', normalizedEnabled ? 'monitor-enabled' : 'monitor-disabled', {
        source,
        changedAt: new Date().toISOString(),
    });
    await persistRadnaiMonitorState();
}

function resolveRadnaiAlertUrl() {
    if (BOT_RADNAI_ALERT_URL) {
        return BOT_RADNAI_ALERT_URL;
    }

    if (!BOT_API_URL) {
        return null;
    }

    try {
        const parsed = new URL(BOT_API_URL);
        const normalizedPath = parsed.pathname.replace(/\/+$/, '');

        if (normalizedPath.endsWith('/share-video')) {
            parsed.pathname = `${normalizedPath.slice(0, -('/share-video'.length))}/alert-radnai`;
        } else if (!normalizedPath || normalizedPath === '/') {
            parsed.pathname = '/alert-radnai';
        } else {
            parsed.pathname = `${normalizedPath}/alert-radnai`;
        }

        parsed.search = '';
        parsed.hash = '';
        return parsed.toString();
    } catch (_err) {
        const normalizedBase = BOT_API_URL.replace(/\/+$/, '');
        if (normalizedBase.endsWith('/share-video')) {
            return `${normalizedBase.slice(0, -('/share-video'.length))}/alert-radnai`;
        }
        return `${normalizedBase}/alert-radnai`;
    }
}

async function sendRadnaiAlertRequest(payload = {}) {
    const targetUrl = resolveRadnaiAlertUrl();
    if (!targetUrl) {
        throw new Error('A Radnai riasztasi URL nincs konfiguralva.');
    }

    let lastError = null;
    let lastResponse = null;

    for (let attempt = 1; attempt <= RADNAI_ALERT_MAX_ATTEMPTS; attempt += 1) {
        try {
            const botResponse = await fetchWithTimeout(
                targetUrl,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload || {}),
                },
                RADNAI_ALERT_REQUEST_TIMEOUT_MS
            );

            const bodyText = await botResponse.text().catch(() => '');
            const responseInfo = {
                ok: botResponse.ok,
                status: botResponse.status,
                statusText: botResponse.statusText,
                bodyText,
                url: targetUrl,
                attempt,
            };
            lastResponse = responseInfo;

            if (responseInfo.ok || !shouldRetryStatus(responseInfo.status) || attempt >= RADNAI_ALERT_MAX_ATTEMPTS) {
                return responseInfo;
            }
        } catch (err) {
            lastError = err;
            if (attempt >= RADNAI_ALERT_MAX_ATTEMPTS) {
                throw err;
            }
        }

        await delay(RADNAI_ALERT_RETRY_DELAY_MS);
    }

    if (lastResponse) {
        return lastResponse;
    }

    throw lastError || new Error('Ismeretlen hiba a Radnai riasztas kuldese soran.');
}

function buildRadnaiHash(htmlContent) {
    return crypto.createHash('sha256').update(htmlContent).digest('hex');
}

function normalizeRadnaiHtmlForHash(htmlContent) {
    const rawHtml = typeof htmlContent === 'string'
        ? htmlContent
        : JSON.stringify(htmlContent ?? '');

    return rawHtml.replace(
        /window\.__CF\$cv\$params=\{[^}]*\};/g,
        'window.__CF$cv$params={};'
    );
}

async function checkRadnaiWebsiteForChanges(options = {}) {
    const forceCheck = options?.force === true;

    if (!radnaiMonitoringEnabled && !forceCheck) {
        return;
    }

    if (isRadnaiCheckInProgress) {
        return;
    }

    isRadnaiCheckInProgress = true;
    const checkStartDate = new Date();

    try {
        let htmlContent = '';
        let lastFetchError = null;

        for (let attempt = 1; attempt <= RADNAI_FETCH_MAX_ATTEMPTS; attempt += 1) {
            try {
                const response = await axios.get(RADNAI_URL, {
                    timeout: RADNAI_FETCH_TIMEOUT_MS,
                    responseType: 'text',
                    validateStatus: () => true,
                    headers: {
                        'Cache-Control': 'no-cache',
                        Pragma: 'no-cache',
                    },
                });

                if (response.status < 200 || response.status >= 300) {
                    throw new Error(`A radnaimark.hu ${response.status} HTTP kodot adott vissza.`);
                }

                htmlContent = typeof response.data === 'string'
                    ? response.data
                    : JSON.stringify(response.data ?? '');
                lastFetchError = null;
                break;
            } catch (err) {
                lastFetchError = err;
                if (attempt < RADNAI_FETCH_MAX_ATTEMPTS) {
                    await delay(RADNAI_FETCH_RETRY_DELAY_MS);
                }
            }
        }

        if (lastFetchError) {
            throw lastFetchError;
        }

        const normalizedHtmlContent = normalizeRadnaiHtmlForHash(htmlContent);
        const newHash = buildRadnaiHash(normalizedHtmlContent);
        const previousHash = lastRadnaiHash;
        const wasOutageActive = radnaiOutageActive;
        const hashChanged = Boolean(previousHash && previousHash !== newHash);

        await appendRadnaiHashCheckResult({
            checkedAt: checkStartDate.toISOString(),
            previousHash,
            hash: newHash,
            changed: hashChanged,
            firstCheck: !previousHash,
            htmlLength: htmlContent.length,
            normalizedHtmlLength: normalizedHtmlContent.length,
        });

        lastRadnaiHash = newHash;
        lastRadnaiCheck = checkStartDate;
        lastRadnaiStatus = 'ok';
        lastRadnaiFailureReason = null;
        radnaiConsecutiveFailures = 0;
        radnaiOutageActive = false;

        if (wasOutageActive) {
            await appendRadnaiMonitorEvent('info', 'site-recovered', {
                checkedAt: checkStartDate.toISOString(),
            });
        }

        if (hashChanged) {
            try {
                const alertResponse = await sendRadnaiAlertRequest({
                    type: 'change',
                });

                if (!alertResponse.ok) {
                    console.error(
                        `A Radnai valtozasriasztas elkuldese sikertelen volt. Status: ${alertResponse.status}, target: ${alertResponse.url}, details: ${alertResponse.bodyText || '-'}`
                    );
                    await appendRadnaiMonitorEvent('error', 'content-change-alert-failed', {
                        checkedAt: checkStartDate.toISOString(),
                        status: alertResponse.status,
                        target: alertResponse.url,
                        details: alertResponse.bodyText || '',
                        attempt: alertResponse.attempt || null,
                    });
                } else {
                    await appendRadnaiMonitorEvent('info', 'content-change-alert-sent', {
                        checkedAt: checkStartDate.toISOString(),
                        status: alertResponse.status,
                        target: alertResponse.url,
                        attempt: alertResponse.attempt || null,
                    });
                }
            } catch (alertErr) {
                console.error('Hiba a Radnai valtozasriasztas kuldese kozben:', alertErr);
                await appendRadnaiMonitorEvent('error', 'content-change-alert-request-error', {
                    checkedAt: checkStartDate.toISOString(),
                    error: alertErr?.message || 'Ismeretlen hiba',
                });
            }
        }

        await persistRadnaiMonitorState();
    } catch (err) {
        const failureDate = new Date();
        const failureMessage = err?.message || 'Ismeretlen hiba';
        const wasOutageActive = radnaiOutageActive;

        // Outage eseten szandekosan valtozatlanul hagyjuk a lastRadnaiHash erteket.
        lastRadnaiCheck = failureDate;
        lastRadnaiStatus = 'error';
        lastRadnaiFailureReason = failureMessage;
        radnaiConsecutiveFailures += 1;
        radnaiOutageActive = true;

        await appendRadnaiHashCheckResult({
            checkedAt: failureDate.toISOString(),
            status: 'fetch-error',
            error: failureMessage,
            consecutiveFailures: radnaiConsecutiveFailures,
        });

        console.error('Hiba a radnaimark.hu figyelese soran:', err);

        const elapsedSinceLastOutageAlert = lastRadnaiOutageAlertAt
            ? failureDate.getTime() - lastRadnaiOutageAlertAt.getTime()
            : Number.POSITIVE_INFINITY;
        const shouldSendOutageAlert = !wasOutageActive
            || elapsedSinceLastOutageAlert >= RADNAI_OUTAGE_ALERT_COOLDOWN_MS;

        if (shouldSendOutageAlert) {
            lastRadnaiOutageAlertAt = failureDate;
            try {
                const alertResponse = await sendRadnaiAlertRequest({
                    type: 'outage',
                    error: failureMessage,
                });

                if (!alertResponse.ok) {
                    console.error(
                        `A Radnai leallasriasztas elkuldese sikertelen volt. Status: ${alertResponse.status}, target: ${alertResponse.url}, details: ${alertResponse.bodyText || '-'}`
                    );
                    await appendRadnaiMonitorEvent('error', 'outage-alert-failed', {
                        checkedAt: failureDate.toISOString(),
                        status: alertResponse.status,
                        target: alertResponse.url,
                        details: alertResponse.bodyText || '',
                        attempt: alertResponse.attempt || null,
                    });
                } else {
                    await appendRadnaiMonitorEvent('error', 'outage-alert-sent', {
                        checkedAt: failureDate.toISOString(),
                        status: alertResponse.status,
                        target: alertResponse.url,
                        attempt: alertResponse.attempt || null,
                    });
                }
            } catch (alertErr) {
                console.error('Hiba a Radnai leallasriasztas kuldese kozben:', alertErr);
                await appendRadnaiMonitorEvent('error', 'outage-alert-request-error', {
                    checkedAt: failureDate.toISOString(),
                    error: alertErr?.message || 'Ismeretlen hiba',
                });
            }
        }

        if (radnaiConsecutiveFailures === 1 || radnaiConsecutiveFailures % 10 === 0) {
            await appendRadnaiMonitorEvent('error', 'site-check-failed', {
                checkedAt: failureDate.toISOString(),
                error: failureMessage,
                consecutiveFailures: radnaiConsecutiveFailures,
                outageAlertAttempted: shouldSendOutageAlert,
            });
        }

        await persistRadnaiMonitorState();
    } finally {
        isRadnaiCheckInProgress = false;
    }
}

function startRadnaiMonitor() {
    if (radnaiMonitorInterval || isRadnaiMonitorStarting) {
        return;
    }

    isRadnaiMonitorStarting = true;

    const runCheck = () => {
        checkRadnaiWebsiteForChanges().catch((err) => {
            console.error('Hiba az idozitett Radnai ellenorzes futtatasakor:', err);
        });
    };

    Promise.resolve()
        .then(async () => {
            await ensureRadnaiMonitorStorage();
            await loadRadnaiMonitorState();
            if (!radnaiMonitoringEnabled && lastRadnaiStatus !== 'disabled') {
                lastRadnaiStatus = 'disabled';
                lastRadnaiFailureReason = null;
                radnaiConsecutiveFailures = 0;
                radnaiOutageActive = false;
                await persistRadnaiMonitorState();
            }
            await cleanupOldRadnaiMonitorLogs();
            await appendRadnaiMonitorEvent('info', 'monitor-started', {
                status: lastRadnaiStatus,
                hash: lastRadnaiHash,
                lastCheck: toIsoStringOrNull(lastRadnaiCheck),
                outageActive: radnaiOutageActive,
                monitorEnabled: radnaiMonitoringEnabled,
            });
        })
        .catch((err) => {
            console.error('Hiba a Radnai monitor inicializalasakor:', err);
        })
        .finally(() => {
            runCheck();

            radnaiMonitorInterval = setInterval(() => {
                runCheck();
            }, RADNAI_CHECK_INTERVAL_MS);

            if (!radnaiCleanupInterval) {
                radnaiCleanupInterval = setInterval(() => {
                    cleanupOldRadnaiMonitorLogs().catch((err) => {
                        console.error('Hiba a Radnai monitor napi takaritasa kozben:', err);
                    });
                }, RADNAI_LOG_CLEANUP_INTERVAL_MS);
            }

            isRadnaiMonitorStarting = false;
        });
}

async function startServer() {
    try {
        await db.initializeDatabase();
        await ensureTagColorColumn();
        await ensureArchiveTagColorColumn();
        await loadAppSettings();
        server.listen(PORT, () => {
            console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
            setImmediate(() => {
                processVideoQueue();
                processArchiveVideoQueue();
                startRadnaiMonitor();
            });
        });
    } catch (err) {
        console.error('Nem sikerült elindítani a szervert:', err);
        process.exit(1);
    }
}

startServer();

