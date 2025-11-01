// 1. A szükséges csomagok betöltése
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    db.get('SELECT id, username, password FROM users WHERE username = ?', [username], (err, user) => {
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

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

            return res.status(200).json({
                message: 'Sikeres bejelentkezés.',
                token,
                username: user.username
            });
        });
    });
});


// 6. A szerver elindítása
app.listen(PORT, () => {
    console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
});