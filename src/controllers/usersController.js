const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res) => {
    try {
        const query = 'SELECT id, username, can_upload, max_file_size_mb, max_videos, upload_count FROM users';
        const { rows } = await db.query(query);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Hiba a felhasználók lekérdezésekor:', err);
        res.status(500).json({ message: 'Nem sikerült lekérdezni a felhasználókat.' });
    }
};

exports.batchUpdatePermissions = async (req, res) => {
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
};

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars'));
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

exports.uploadAvatar = (req, res) => {
    const avatarDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars');

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
};

exports.updateName = async (req, res) => {
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
};

exports.updatePassword = async (req, res) => {
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
};
