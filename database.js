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
        is_admin INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error("Hiba a 'users' tábla létrehozásakor:", err.message);
        } else {
            console.log("'users' tábla sikeresen létrehozva vagy már létezik.");
        }
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
});

// Lezárjuk a kapcsolatot, miután a parancsok lefutottak
// db.close(); // Ezt most kikommenteljük, hogy a fő szerver tudja használni

// Exportáljuk az adatbázis kapcsolatot, hogy a server.js is elérje
module.exports = db;
