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

const upload = multer({ storage });

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

app.post('/upload', authenticateToken, upload.single('video'), (req, res) => {
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

        return res.status(201).json({ message: 'Videó sikeresen feltöltve.' });
    });
});


// 6. A szerver elindítása
app.listen(PORT, () => {
    console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
});
