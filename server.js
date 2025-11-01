// 1. A szükséges csomagok betöltése
const express = require('express');
const path = require('path');

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


// 6. A szerver elindítása
app.listen(PORT, () => {
    console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
});