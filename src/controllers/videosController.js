const db = require('../config/database');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage }).single('video');

exports.getVideos = async (req, res) => {
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
};

exports.uploadVideo = (req, res, next) => {
    const limits = {};
    if (req.uploadSettings && Number.isFinite(req.uploadSettings.maxFileSizeBytes)) {
        limits.fileSize = req.uploadSettings.maxFileSizeBytes;
    }
    const perUserUpload = multer({ storage, limits }).single('video');
    perUserUpload(req, res, (err) => {
        if (err) return next(err);

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
};
