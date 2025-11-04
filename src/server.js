// 1. A szükséges csomagok betöltése
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const db = require('./database');

const JWT_SECRET = 'a_very_secret_and_secure_key_for_jwt';
const COOKIE_NAME = 'authToken';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 nap millisekundumban

const COOKIE_BASE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
};

function setAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, { ...COOKIE_BASE_OPTIONS, maxAge: COOKIE_MAX_AGE });
}

function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, COOKIE_BASE_OPTIONS);
}

function generateAuthToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function getTokenFromRequest(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    if (req.cookies && req.cookies[COOKIE_NAME]) {
        return req.cookies[COOKIE_NAME];
    }

    return null;
}

// 2. Az Express alkalmazás létrehozása
const app = express();
const PORT = process.env.PORT || 3000; // A port, amin a szerver figyelni fog
app.settings = app.settings || {};

// 3. Middleware-ek (köztes szoftverek) beállítása
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Fájlfeltöltés beállítása a videókhoz
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
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
        app.settings = settings;
        return settings;
    } catch (err) {
        console.error('Hiba a beállítások betöltésekor:', err);
        throw err;
    }
}

// Hitelesítési middleware a védett végpontokhoz
function authenticateToken(req, res, next) {
    const token = getTokenFromRequest(req);

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
        req.token = token;
        next();
    });
}

function isAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
}

function optionalAuthenticate(req, res, next) {
    const token = getTokenFromRequest(req);
    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err && user) {
            req.user = {
                id: user.id,
                username: user.username,
                isAdmin: !!user.isAdmin
            };
            req.token = token;
        }
        next();
    });
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

// 4. Statikus fájlok kiszolgálása
app.use(express.static(path.join(__dirname, '..', 'public')));

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
        const { rows } = await db.query('SELECT id, username, password, is_admin FROM users WHERE username = $1', [username]);
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

        setAuthCookie(res, token);

        res.status(200).json({
            message: 'Sikeres bejelentkezés.',
            token,
            username: user.username,
            isAdmin
        });
    } catch (err) {
        console.error('Hiba a bejelentkezés során:', err);
        res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
    }
});

app.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT username, is_admin, profile_picture_filename FROM users WHERE id = $1', [req.user.id]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        const isAdmin = user.is_admin === 1;
        const payload = {
            id: req.user.id,
            username: user.username,
            isAdmin,
            profile_picture_filename: user.profile_picture_filename
        };

        const refreshedToken = generateAuthToken(payload);
        setAuthCookie(res, refreshedToken);

        res.status(200).json({
            ...payload,
            token: refreshedToken
        });
    } catch (err) {
        console.error('Hiba a felhasználói adatok lekérdezésekor:', err);
        res.status(500).json({ message: 'Váratlan hiba történt.' });
    }
});

app.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.status(200).json({ message: 'Sikeres kijelentkezés.' });
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const query = 'SELECT id, username, can_upload, max_file_size_mb, max_videos, upload_count FROM users';
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
                'UPDATE users SET can_upload = $1, max_file_size_mb = $2, max_videos = $3 WHERE id = $4',
                [update.canUpload, Math.round(update.maxFileSizeMb), Math.round(update.maxVideos), update.userId]
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

app.get('/api/polls', optionalAuthenticate, async (req, res) => {
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

        optionRows.forEach(o => pollsMap.get(o.poll_id)?.options.push(optionsMap.get(o.id)));
        voteRows.forEach(v => {
            optionsMap.get(v.option_id)?.voters.push({ id: v.user_id, username: v.username });
            if (req.user && v.user_id === req.user.id) {
                pollsMap.get(v.poll_id).userVoteOptionId = v.option_id;
            }
        });

        const result = Array.from(pollsMap.values()).map(p => {
            p.totalVotes = p.options.reduce((sum, o) => sum + o.vote_count, 0);
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

app.get('/api/videos', async (req, res) => {
    try {
        const query = `
            SELECT videos.filename, users.username
            FROM videos
            LEFT JOIN users ON videos.uploader_id = users.id
            ORDER BY videos.uploaded_at DESC
        `;
        const { rows } = await db.query(query);
        res.status(200).json(rows || []);
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
    const perUserUpload = multer({ storage, limits }).single('video');
    perUserUpload(req, res, (err) => {
        if (err) return next(err);
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nincs fájl feltöltve.' });
    }

    const uploaderId = req.user.id;
    const { filename, originalname } = req.file;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const insertVideoQuery = `INSERT INTO videos (filename, original_name, uploader_id) VALUES ($1, $2, $3)`;
        await client.query(insertVideoQuery, [filename, originalname, uploaderId]);
        await client.query('UPDATE users SET upload_count = upload_count + 1 WHERE id = $1', [uploaderId]);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Videó sikeresen feltöltve.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba a videó feltöltésekor:', err);
        res.status(500).json({ message: 'Nem sikerült menteni a videó adatait.' });
    } finally {
        client.release();
    }
});

// Avatar feltöltés beállítása
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', 'avatars'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
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
    const avatarDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');

    fs.readdir(avatarDir, (err, files) => {
        if (err) {
            console.error('Hiba az avatár könyvtár olvasásakor:', err);
            return res.status(500).json({ message: 'Nem sikerült ellenőrizni a feltöltési limitet.' });
        }

        if (files.length >= 20) {
            return res.status(403).json({ message: 'Elértük a maximális profilkép feltöltési limitet (20).' });
        }

        uploadAvatar(req, res, async (uploadErr) => {
            if (uploadErr) {
                if (uploadErr instanceof multer.MulterError) {
                    return res.status(400).json({
                        message: uploadErr.code === 'LIMIT_FILE_SIZE'
                            ? 'A képfájl mérete nem haladhatja meg az 5MB-ot.'
                            : 'Feltöltési hiba.'
                    });
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

                if (oldFilename) {
                    const oldPath = path.join(avatarDir, oldFilename);
                    fs.unlink(oldPath, (unlinkErr) => {
                        if (unlinkErr) console.error('Hiba a régi avatár törlésekor:', unlinkErr);
                    });
                }

                await db.query('UPDATE users SET profile_picture_filename = $1 WHERE id = $2', [filename, userId]);
                res.status(200).json({ message: 'Profilkép sikeresen frissítve.', filename });
            } catch (dbErr) {
                console.error('Hiba a profilkép frissítésekor:', dbErr);
                res.status(500).json({ message: 'Nem sikerült frissíteni a profilképet.' });
            }
        });
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
        await db.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername.trim(), userId]);
        res.status(200).json({ message: 'Felhasználónév sikeresen frissítve.', newUsername: newUsername.trim() });
    } catch (err) {
        if (err.code === '23505') { // unique_violation
            return res.status(409).json({ message: 'Ez a felhasználónév már foglalt.' });
        }
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
        app.listen(PORT, () => {
            console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
        });
    } catch (err) {
        console.error('Nem sikerült elindítani a szervert:', err);
        process.exit(1);
    }
}

startServer();
