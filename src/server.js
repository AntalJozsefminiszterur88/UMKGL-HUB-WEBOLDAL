// 1. A szükséges csomagok betöltése
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Server } = require('socket.io');
const db = require('./database');

const JWT_SECRET = 'a_very_secret_and_secure_key_for_jwt';

function generateAuthToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 2. Az Express alkalmazás létrehozása
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000; // A port, amin a szerver figyelni fog
const server = http.createServer(app);
const io = new Server(server);
app.settings = app.settings || {};

// 3. Middleware-ek (köztes szoftverek) beállítása
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fájlfeltöltés beállítása a videókhoz
const uploadsDirectory = path.join(__dirname, '..', 'public', 'uploads');
const ensureDirectoryExists = (dirPath) => {
    try {
        fs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
};

ensureDirectoryExists(uploadsDirectory);

const programImagesDirectory = path.join(__dirname, '..', 'public', 'uploads', 'programs', 'images');
const programFilesDirectory = path.join(__dirname, '..', 'public', 'uploads', 'programs', 'files');

ensureDirectoryExists(programImagesDirectory);
ensureDirectoryExists(programFilesDirectory);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDirectory);
    },
    filename: (req, file, cb) => {
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
        app.settings = settings;
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

function isAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
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

function getVideoMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return VIDEO_MIME_TYPES[ext] || 'application/octet-stream';
}

app.get('/uploads/:filename', (req, res) => {
    const requestedFile = req.params.filename;
    const safeFilePath = path.normalize(path.join(uploadsDirectory, requestedFile));

    if (!safeFilePath.startsWith(uploadsDirectory)) {
        return res.status(400).json({ message: 'Érvénytelen fájlnév.' });
    }

    fs.stat(safeFilePath, (statErr, stats) => {
        if (statErr || !stats.isFile()) {
            return res.status(404).json({ message: 'A kért videó nem található.' });
        }

        const fileSize = stats.size;
        const range = req.headers.range;
        const mimeType = getVideoMimeType(safeFilePath);

        if (!range) {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes'
            });
            return fs.createReadStream(safeFilePath).pipe(res);
        }

        const rangeMatch = range.replace(/bytes=/, '').split('-');
        const start = Number.parseInt(rangeMatch[0], 10);
        const end = rangeMatch[1] ? Math.min(Number.parseInt(rangeMatch[1], 10), fileSize - 1) : fileSize - 1;

        if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize) {
            res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
            return;
        }

        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(safeFilePath, { start, end });

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': mimeType
        });

        stream.pipe(res);
    });
});

// 4. Statikus fájlok kiszolgálása
app.use(express.static(path.join(__dirname, '..', 'public')));

const activeReceivers = new Map();

function broadcastReceiversList() {
    const receivers = Array.from(activeReceivers.values()).map(({ userId, username, peerId, profilePictureFilename }) => ({
        userId,
        username,
        peerId,
        profile_picture_filename: profilePictureFilename,
    }));
    io.emit('update_receivers_list', receivers);
}

function removeReceiverBySocket(socketId) {
    let changed = false;
    for (const [userId, receiver] of activeReceivers.entries()) {
        if (receiver.socketId === socketId) {
            activeReceivers.delete(userId);
            changed = true;
        }
    }
    if (changed) {
        broadcastReceiversList();
    }
}

io.on('connection', (socket) => {
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
                return;
            }

            activeReceivers.set(userId, {
                userId,
                username: user.username,
                peerId,
                profilePictureFilename: user.profile_picture_filename,
                socketId: socket.id,
            });
            broadcastReceiversList();
        } catch (err) {
            console.error('Hiba a fogadó regisztrációja során:', err);
            socket.emit('receiver_error', { message: 'Nem sikerült regisztrálni fogadóként.' });
        }
    });

    socket.on('unregister_receiver', () => {
        removeReceiverBySocket(socket.id);
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
        const { rows } = await db.query('SELECT id, username, password, is_admin, can_transfer, profile_picture_filename FROM users WHERE username = $1', [username]);
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

        res.status(200).json({
            message: 'Sikeres bejelentkezés.',
            token,
            username: user.username,
            isAdmin,
            canTransfer: Number(user.can_transfer) === 1,
            profile_picture_filename: user.profile_picture_filename
        });
    } catch (err) {
        console.error('Hiba a bejelentkezés során:', err);
        res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
    }
});

app.post('/logout', (req, res) => {
    res.status(200).json({ message: 'Sikeres kijelentkezés.' });
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, is_admin, can_transfer, profile_picture_filename FROM users WHERE id = $1', [req.user.id]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        res.status(200).json({
            id: user.id,
            username: user.username,
            isAdmin: user.is_admin === 1,
            canTransfer: Number(user.can_transfer) === 1,
            profile_picture_filename: user.profile_picture_filename
        });
    } catch (err) {
        console.error('Hiba a profiladatok lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a profiladatokat.' });
    }
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const query = 'SELECT id, username, can_upload, can_transfer, max_file_size_mb, max_videos, upload_count FROM users';
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

    const updates = req.body.map(item => ({
        userId: Number.parseInt(item.userId, 10),
        canUpload: item.canUpload ? 1 : 0,
        canTransfer: item.canTransfer ? 1 : 0,
        maxFileSizeMb: Number(item.maxFileSizeMb),
        maxVideos: Number(item.maxVideos)
    }));

    // Simple validation (can be improved)
    if (updates.some(u => isNaN(u.userId) || isNaN(u.maxFileSizeMb) || isNaN(u.maxVideos))) {
        return res.status(400).json({ message: 'Érvénytelen adatok a kérésben.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        for (const update of updates) {
            const result = await client.query(
                'UPDATE users SET can_upload = $1, can_transfer = $2, max_file_size_mb = $3, max_videos = $4 WHERE id = $5',
                [update.canUpload, update.canTransfer, Math.round(update.maxFileSizeMb), Math.round(update.maxVideos), update.userId]
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
        const { rows } = await db.query('SELECT id, name, created_at FROM tags ORDER BY name ASC');
        res.status(200).json(rows || []);
    } catch (err) {
        console.error('Hiba a címkék lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a címkéket.' });
    }
});

app.post('/api/tags', authenticateToken, isAdmin, async (req, res) => {
    const { name } = req.body;
    const trimmedName = (name || '').trim();

    if (!trimmedName) {
        return res.status(400).json({ message: 'A címke neve nem lehet üres.' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id, name, created_at',
            [trimmedName]
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

app.get('/api/videos', async (req, res) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const allowedLimits = [12, 24, 40, 80];
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = allowedLimits.includes(requestedLimit) ? requestedLimit : 24;
        const search = (req.query.search || '').trim();
        const tagId = Number.parseInt(req.query.tag, 10);
        const sortOrder = req.query.sort === 'oldest' ? 'ASC' : 'DESC';

        const filters = [];
        const params = [];

        if (search) {
            const idx = params.push(`%${search}%`);
            filters.push(`(videos.original_name ILIKE $${idx} OR videos.filename ILIKE $${idx})`);
        }

        if (Number.isInteger(tagId)) {
            const idx = params.push(tagId);
            filters.push(`EXISTS (SELECT 1 FROM video_tags vt WHERE vt.video_id = videos.id AND vt.tag_id = $${idx})`);
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
                ORDER BY videos.uploaded_at ${sortOrder}
                LIMIT $${dataParams.length - 1}
                OFFSET $${dataParams.length}
            )
            SELECT fv.id, fv.filename, fv.original_name, fv.uploader_id, fv.uploaded_at, fv.username,
                   COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]'::json) AS tags
            FROM filtered_videos fv
            LEFT JOIN video_tags vt ON vt.video_id = fv.id
            LEFT JOIN tags t ON vt.tag_id = t.id
            GROUP BY fv.id, fv.filename, fv.original_name, fv.uploader_id, fv.uploaded_at, fv.username
            ORDER BY fv.uploaded_at ${sortOrder};
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

app.post('/upload', authenticateToken, loadUserUploadSettings, (req, res, next) => {
    const limits = {};
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
    const projectedUploadCount = req.uploadSettings
        ? req.uploadSettings.uploadCount + req.files.length
        : null;

    if (req.uploadSettings && req.uploadSettings.maxVideos > 0 && projectedUploadCount > req.uploadSettings.maxVideos) {
        return res.status(403).json({ message: 'Elérted a maximális feltöltési limitet.' });
    }

    const tagIds = (() => {
        try {
            const parsed = JSON.parse(req.body.tags || '[]');
            return Array.isArray(parsed)
                ? Array.from(new Set(parsed.map((id) => Number.parseInt(id, 10)).filter(Number.isFinite)))
                : [];
        } catch (err) {
            return [];
        }
    })();

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        for (const file of req.files) {
            const { filename, originalname } = file;
            const parsedName = path.parse(originalname).name.trim();
            const sanitizedOriginalName = parsedName || originalname;
            const insertVideoQuery = `INSERT INTO videos (filename, original_name, uploader_id) VALUES ($1, $2, $3) RETURNING id`;
            const { rows } = await client.query(insertVideoQuery, [filename, sanitizedOriginalName, uploaderId]);
            const videoId = rows[0]?.id;

            if (videoId && tagIds.length) {
                for (const tagId of tagIds) {
                    await client.query(
                        'INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [videoId, tagId]
                    );
                }
            }
        }

        await client.query('UPDATE users SET upload_count = upload_count + $1 WHERE id = $2', [req.files.length, uploaderId]);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Videók sikeresen feltöltve.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba a videó feltöltésekor:', err);
        res.status(500).json({ message: 'Nem sikerült menteni a videó adatait.' });
    } finally {
        client.release();
    }
});

app.delete('/api/videos/:id', authenticateToken, isAdmin, async (req, res) => {
    const videoId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(videoId)) {
        return res.status(400).json({ message: 'Érvénytelen videó azonosító.' });
    }

    try {
        const { rows } = await db.query('SELECT filename FROM videos WHERE id = $1', [videoId]);
        const video = rows[0];

        if (!video) {
            return res.status(404).json({ message: 'A videó nem található.' });
        }

        const filePath = path.join(uploadsDirectory, video.filename);
        try {
            await fs.promises.unlink(filePath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error('Hiba a videófájl törlésekor:', err);
                return res.status(500).json({ message: 'Nem sikerült törölni a videófájlt.' });
            }
        }

        await db.query('DELETE FROM videos WHERE id = $1', [videoId]);
        res.status(200).json({ message: 'Videó sikeresen törölve.' });
    } catch (err) {
        console.error('Hiba a videó törlésekor:', err);
        res.status(500).json({ message: 'Nem sikerült törölni a videót.' });
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
            [name, description, imageFile.filename, programFile.filename, programFile.originalname]
        );

        res.status(201).json({ message: 'Program sikeresen feltöltve.' });
    } catch (err) {
        console.error('Hiba a program mentésekor:', err);
        await safeUnlink(path.join(programImagesDirectory, imageFile.filename));
        await safeUnlink(path.join(programFilesDirectory, programFile.filename));
        res.status(500).json({ message: 'Nem sikerült menteni a programot.' });
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
const avatarDirectory = path.join(uploadsDirectory, 'avatars');
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
async function startServer() {
    try {
        await db.initializeDatabase();
        await loadAppSettings();
        server.listen(PORT, () => {
            console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
        });
    } catch (err) {
        console.error('Nem sikerült elindítani a szervert:', err);
        process.exit(1);
    }
}

startServer();
