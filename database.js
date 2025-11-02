const sqlite3 = require('sqlite3').verbose();

// Létrehoz egy 'umgkl_hub.db' nevű fájlt, ha még nem létezik, és megnyitja azt.
const db = new sqlite3.Database('./umgkl_hub.db', (err) => {
    if (err) {
        console.error("Hiba az adatbázis megnyitása közben:", err.message);
    }
    console.log('Sikeresen csatlakozva a SQLite adatbázishoz.');
});

// Ez a rész létrehozza a táblákat, ha még nem léteznek.
db.serialize(() => {
    // FELHASZNÁLÓK TÁBLA
    // - id: Egyedi azonosító minden felhasználónak
    // - username: A felhasználónév, aminek egyedinek kell lennie
    // - password: A titkosított jelszó helye
    // - can_upload: A jogosultság (0 = nem tölthet fel, 1 = feltölthet)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        can_upload INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        upload_count INTEGER DEFAULT 0,
        max_file_size_mb INTEGER DEFAULT 50,
        max_videos INTEGER DEFAULT 10
    )`, (err) => {
        if (err) {
            console.error("Hiba a 'users' tábla létrehozásakor:", err.message);
        } else {
            console.log("'users' tábla sikeresen létrehozva vagy már létezik.");
        }
    });

    db.all(`PRAGMA table_info(users)`, (err, columns) => {
        if (err) {
            console.error("Nem sikerült lekérdezni a 'users' tábla sémáját:", err.message);
            return;
        }

        const columnNames = new Set(Array.isArray(columns) ? columns.map((col) => col.name) : []);

        const ensureDefaultValue = (column, value) => {
            db.run(`UPDATE users SET ${column} = ${value} WHERE ${column} IS NULL`, (updateErr) => {
                if (updateErr) {
                    console.error(`Nem sikerült alapértelmezett értéket beállítani a(z) '${column}' oszlophoz:`, updateErr.message);
                }
            });
        };

        const ensureColumn = (name, definition, successMessage, defaultValue) => {
            if (!columnNames.has(name)) {
                db.run(`ALTER TABLE users ADD COLUMN ${name} ${definition}`, (alterErr) => {
                    if (alterErr) {
                        console.error(`Nem sikerült hozzáadni a(z) '${name}' oszlopot:`, alterErr.message);
                    } else {
                        console.log(successMessage);
                        ensureDefaultValue(name, defaultValue);
                    }
                });
            } else {
                ensureDefaultValue(name, defaultValue);
            }
        };

        ensureColumn('is_admin', 'INTEGER DEFAULT 0', "'is_admin' oszlop sikeresen hozzáadva a 'users' táblához.", 0);
        ensureColumn('upload_count', 'INTEGER DEFAULT 0', "'upload_count' oszlop sikeresen hozzáadva a 'users' táblához.", 0);
        ensureColumn('max_file_size_mb', 'INTEGER DEFAULT 50', "'max_file_size_mb' oszlop sikeresen hozzáadva a 'users' táblához.", 50);
        ensureColumn('max_videos', 'INTEGER DEFAULT 10', "'max_videos' oszlop sikeresen hozzáadva a 'users' táblához.", 10);
    });

    // VIDEÓK TÁBLA
    // - id: Egyedi azonosító minden videónak
    // - filename: A szerveren tárolt egyedi fájlnév
    // - original_name: A felhasználó által feltöltött eredeti fájlnév
    // - uploader_id: A feltöltést végző felhasználó azonosítója
    // - uploaded_at: A feltöltés időpontja (alapértelmezett: aktuális időbélyeg)
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploader_id INTEGER NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploader_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error("Hiba a 'videos' tábla létrehozásakor:", err.message);
        } else {
            console.log("'videos' tábla sikeresen létrehozva vagy már létezik.");
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error("Hiba a 'settings' tábla létrehozásakor:", err.message);
        } else {
            console.log("'settings' tábla sikeresen létrehozva vagy már létezik.");
        }
    });

    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, ['max_file_size_mb', '50'], (err) => {
        if (err) {
            console.error("Hiba az alapértelmezett 'max_file_size_mb' beállítás mentésekor:", err.message);
        }
    });

    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, ['max_videos_per_user', '10'], (err) => {
        if (err) {
            console.error("Hiba az alapértelmezett 'max_videos_per_user' beállítás mentésekor:", err.message);
        }
    });
});

// Lezárjuk a kapcsolatot, miután a parancsok lefutottak
// db.close(); // Ezt most kikommenteljük, hogy a fő szerver tudja használni

// Exportáljuk az adatbázis kapcsolatot, hogy a server.js is elérje
module.exports = db;
