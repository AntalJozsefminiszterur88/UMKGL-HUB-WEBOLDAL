const db = require('../config/database');

async function loadAppSettings(app) {
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

exports.getSettings = async (req, res) => {
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
};

exports.updateSettings = async (req, res) => {
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

        await loadAppSettings(req.app);
        res.status(200).json({ message: 'Beállítások sikeresen frissítve.', settings: req.app.settings });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Hiba a beállítások frissítésekor:', err);
        res.status(500).json({ message: 'Nem sikerült frissíteni a beállításokat.' });
    } finally {
        client.release();
    }
};
