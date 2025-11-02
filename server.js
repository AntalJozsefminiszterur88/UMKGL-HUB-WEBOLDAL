// 1. A szükséges csomagok betöltése
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./database');

const JWT_SECRET = 'a_very_secret_and_secure_key_for_jwt';

// 2. Az Express alkalmazás létrehozása
const app = express();
const PORT = process.env.PORT || 3000; // A port, amin a szerver figyelni fog
app.settings = app.settings || {};

// 3. Middleware-ek (köztes szoftverek) beállítása
// Ez a sor mondja meg az Expressnek, hogy a JSON formátumú kéréseket tudja értelmezni
app.use(express.json());
// Ez pedig a HTML formokból érkező adatokat segít feldolgozni
app.use(express.urlencoded({ extended: true }));

// Fájlfeltöltés beállítása a videókhoz
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

let upload = multer({ storage });

function getNumberSetting(value, defaultValue) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return defaultValue;
}

function applySettingsToUpload() {
    const maxFileSizeMb = getNumberSetting(app.settings.max_file_size_mb, 50);
    upload = multer({
        storage,
        limits: {
            fileSize: maxFileSizeMb * 1024 * 1024
        }
    });
}

function loadAppSettings() {
    return new Promise((resolve, reject) => {
        db.all('SELECT key, value FROM settings', [], (err, rows) => {
            if (err) {
                console.error('Hiba a beállítások betöltésekor:', err);
                return reject(err);
            }

            const settings = {};
            rows.forEach((row) => {
                settings[row.key] = row.value;
            });

            app.settings = settings;
            applySettingsToUpload();
            resolve(settings);
        });
    });
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

        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }

    next();
}

function checkUploadLimits(req, res, next) {
    const userId = req.user && req.user.id;

    if (!userId) {
        return res.status(403).json({ message: 'Hiányzó felhasználói információ.' });
    }

    const maxVideosSetting = getNumberSetting(app.settings.max_videos_per_user, 0);
    if (maxVideosSetting <= 0) {
        return next();
    }

    db.get('SELECT upload_count FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Hiba a feltöltési számláló lekérdezésekor:', err);
            return res.status(500).json({ message: 'Nem sikerült ellenőrizni a feltöltési limitet.' });
        }

        const uploadCount = row ? Number(row.upload_count) || 0 : 0;

        if (uploadCount >= maxVideosSetting) {
            return res.status(403).json({ message: 'Elérted a maximális feltöltési limitet.' });
        }

        return next();
    });
}

// 4. Statikus fájlok kiszolgálása
// Megmondjuk a szervernek, hogy a főkönyvtárban lévő fájlokat (pl. index.html, register.html)
// és mappákat (pl. HOI4-Porgonc) tegye közvetlenül elérhetővé.
app.use(express.static(path.join(__dirname)));

// 5. Alapértelmezett útvonal (most még csak a statikus fájlt szolgálja ki)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// A jövőbeli API végpontjaink helye (regisztráció, bejelentkezés, stb.)
// ... ide jönnek majd a többi funkciók ...

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
            console.error('Hiba a jelszó titkosítása során:', hashErr);
            return res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
        }

        const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';

        db.run(insertQuery, [username, hashedPassword], function (dbErr) {
            if (dbErr) {
                if (dbErr.code === 'SQLITE_CONSTRAINT') {
                    return res.status(409).json({ message: 'A felhasználónév már létezik.' });
                }

                console.error('Hiba a felhasználó mentésekor:', dbErr);
                return res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
            }

            return res.status(201).json({ message: 'Sikeres regisztráció.' });
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    db.get('SELECT id, username, password, is_admin FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Hiba a felhasználó lekérdezésekor:', err);
            return res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
        }

        if (!user) {
            return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
        }

        bcrypt.compare(password, user.password, (compareErr, isMatch) => {
            if (compareErr) {
                console.error('Hiba a jelszó ellenőrzésekor:', compareErr);
                return res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
            }

            const isAdmin = user.is_admin === 1;
            const token = jwt.sign({ id: user.id, username: user.username, isAdmin }, JWT_SECRET, { expiresIn: '1h' });

            return res.status(200).json({
                message: 'Sikeres bejelentkezés.',
                token,
                username: user.username,
                isAdmin
            });
        });
    });
});

app.get('/api/users', authenticateToken, isAdmin, (req, res) => {
    const query = 'SELECT id, username, can_upload FROM users';

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Hiba a felhasználók lekérdezésekor:', err);
            return res.status(500).json({ message: 'Nem sikerült lekérdezni a felhasználókat.' });
        }

        return res.status(200).json(rows);
    });
});

app.post('/api/users/permissions/batch-update', authenticateToken, isAdmin, (req, res) => {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'A kérés törzsében egy tömbnek kell szerepelnie.' });
    }

    if (req.body.length === 0) {
        return res.status(200).json({ message: 'Nincs frissítendő jogosultság.' });
    }

    const missingFields = req.body.find((item) => typeof item.userId === 'undefined' || typeof item.canUpload === 'undefined');
    if (missingFields) {
        return res.status(400).json({ message: 'Minden elemhez userId és canUpload mezők szükségesek.' });
    }

    const updates = req.body.map((item) => ({
        userId: Number.parseInt(item.userId, 10),
        canUpload: item.canUpload ? 1 : 0
    }));

    const invalidId = updates.find((item) => Number.isNaN(item.userId));
    if (invalidId) {
        return res.status(400).json({ message: 'Érvénytelen felhasználó azonosító szerepel a kérésben.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr) => {
            if (beginErr) {
                console.error('Hiba a tranzakció indításakor:', beginErr);
                return res.status(500).json({ message: 'Nem sikerült elindítani a jogosultság frissítését.' });
            }

            const rollbackWithError = (statusCode, message) => {
                db.run('ROLLBACK', (rollbackErr) => {
                    if (rollbackErr) {
                        console.error('Hiba a tranzakció visszagörgetésekor:', rollbackErr);
                    }
                    return res.status(statusCode).json({ message });
                });
            };

            const processUpdate = (index) => {
                if (index >= updates.length) {
                    return db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                            console.error('Hiba a tranzakció lezárásakor:', commitErr);
                            return db.run('ROLLBACK', (rollbackErr) => {
                                if (rollbackErr) {
                                    console.error('Hiba a tranzakció visszagörgetésekor:', rollbackErr);
                                }
                                return res.status(500).json({ message: 'Nem sikerült menteni a jogosultság frissítéseket.' });
                            });
                        }

                        return res.status(200).json({ message: 'Jogosultságok sikeresen frissítve.' });
                    });
                }

                const update = updates[index];
                db.run('UPDATE users SET can_upload = ? WHERE id = ?', [update.canUpload, update.userId], function (err) {
                    if (err) {
                        console.error('Hiba a jogosultság frissítésekor:', err);
                        return rollbackWithError(500, 'Nem sikerült frissíteni a jogosultságokat.');
                    }

                    if (this.changes === 0) {
                        return rollbackWithError(404, 'A megadott felhasználó nem található.');
                    }

                    processUpdate(index + 1);
                });
            };

            processUpdate(0);
        });
    });
});

app.get('/api/settings', authenticateToken, isAdmin, (req, res) => {
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) {
            console.error('Hiba a beállítások lekérdezésekor:', err);
            return res.status(500).json({ message: 'Nem sikerült lekérdezni a beállításokat.' });
        }

        const settings = {};
        rows.forEach((row) => {
            settings[row.key] = row.value;
        });

        return res.status(200).json(settings);
    });
});

app.post('/api/settings', authenticateToken, isAdmin, (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: 'Érvénytelen beállítás adatok.' });
    }

    const entries = Object.entries(req.body);

    if (entries.length === 0) {
        return res.status(400).json({ message: 'Nincs frissítendő beállítás.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr) => {
            if (beginErr) {
                console.error('Hiba a beállítások frissítésének indításakor:', beginErr);
                return res.status(500).json({ message: 'Nem sikerült elkezdeni a beállítások frissítését.' });
            }

            const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');

            entries.forEach(([key, value]) => {
                stmt.run(String(value), key);
            });

            stmt.finalize((stmtErr) => {
                if (stmtErr) {
                    console.error('Hiba a beállítások frissítésekor:', stmtErr);
                    return db.run('ROLLBACK', () => res.status(500).json({ message: 'Nem sikerült frissíteni a beállításokat.' }));
                }

                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        console.error('Hiba a beállítások mentésekor:', commitErr);
                        return db.run('ROLLBACK', () => res.status(500).json({ message: 'Nem sikerült menteni a beállításokat.' }));
                    }

                    loadAppSettings()
                        .then(() => {
                            return res.status(200).json({ message: 'Beállítások sikeresen frissítve.', settings: app.settings });
                        })
                        .catch((loadErr) => {
                            console.error('Nem sikerült újratölteni a beállításokat:', loadErr);
                            return res.status(200).json({ message: 'Beállítások frissítve, de a friss beállítások betöltése sikertelen volt.' });
                        });
                });
            });
        });
    });
});

app.get('/api/videos', (req, res) => {
    const query = `
        SELECT videos.filename, users.username
        FROM videos
        LEFT JOIN users ON videos.uploader_id = users.id
        ORDER BY videos.uploaded_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Hiba a videók lekérdezésekor:', err);
            return res.status(500).json({ message: 'Nem sikerült lekérdezni a videókat.' });
        }

        return res.status(200).json(rows || []);
    });
});

app.post('/upload', authenticateToken, checkUploadLimits, (req, res, next) => {
    return upload.single('video')(req, res, (err) => {
        if (err) {
            return next(err);
        }
        return next();
    });
}, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nincs fájl feltöltve.' });
    }

    const uploaderId = req.user.id;
    const { filename, originalname } = req.file;

    const insertVideoQuery = `INSERT INTO videos (filename, original_name, uploader_id) VALUES (?, ?, ?)`;

    db.run(insertVideoQuery, [filename, originalname, uploaderId], function (err) {
        if (err) {
            console.error('Hiba a videó mentésekor:', err);
            return res.status(500).json({ message: 'Nem sikerült menteni a videó adatait.' });
        }

        db.run('UPDATE users SET upload_count = upload_count + 1 WHERE id = ?', [uploaderId], (updateErr) => {
            if (updateErr) {
                console.error('Hiba a feltöltési számláló frissítésekor:', updateErr);
                return res.status(500).json({ message: 'A videó feltöltve, de nem sikerült frissíteni a feltöltési számlálót.' });
            }

            return res.status(201).json({ message: 'Videó sikeresen feltöltve.' });
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
    return res.status(500).json({ message: 'Váratlan hiba történt.' });
});

// 6. A szerver elindítása
loadAppSettings()
    .catch((err) => {
        console.error('Nem sikerült betölteni a beállításokat induláskor:', err);
        app.settings = app.settings || {};
        applySettingsToUpload();
    })
    .finally(() => {
        app.listen(PORT, () => {
            console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
        });
    });
