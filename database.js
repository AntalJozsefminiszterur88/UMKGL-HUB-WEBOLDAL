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
        can_upload INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error("Hiba a 'users' tábla létrehozásakor:", err.message);
        } else {
            console.log("'users' tábla sikeresen létrehozva vagy már létezik.");
        }
    });

    // Később ide jön a videók táblája is
    // ...
});

// Lezárjuk a kapcsolatot, miután a parancsok lefutottak
// db.close(); // Ezt most kikommenteljük, hogy a fő szerver tudja használni

// Exportáljuk az adatbázis kapcsolatot, hogy a server.js is elérje
module.exports = db;