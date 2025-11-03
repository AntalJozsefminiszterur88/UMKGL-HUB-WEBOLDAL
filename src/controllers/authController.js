const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = 'a_very_secret_and_secure_key_for_jwt';
const COOKIE_NAME = 'authToken';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 nap millisekundumban

const COOKIE_BASE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
};

function setAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, { ...COOKIE_BASE_OPTIONS, maxAge: COOKIE_MAX_AGE });
}

function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, COOKIE_BASE_OPTIONS);
}

function generateAuthToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

exports.register = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO users (username, password) VALUES ($1, $2)';
        await db.query(insertQuery, [username, hashedPassword]);
        res.status(201).json({ message: 'Sikeres regisztráció.' });
    } catch (err) {
        if (err.code === '23505') { // unique_violation for PostgreSQL
            return res.status(409).json({ message: 'A felhasználónév már létezik.' });
        }
        console.error('Hiba a felhasználó mentésekor:', err);
        res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    try {
        const { rows } = await db.query('SELECT id, username, password, is_admin FROM users WHERE username = $1', [username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
        }

        const isAdmin = user.is_admin === 1;
        const payload = { id: user.id, username: user.username, isAdmin };
        const token = generateAuthToken(payload);

        setAuthCookie(res, token);

        res.status(200).json({
            message: 'Sikeres bejelentkezés.',
            token,
            username: user.username,
            isAdmin
        });
    } catch (err) {
        console.error('Hiba a bejelentkezés során:', err);
        res.status(500).json({ message: 'Váratlan hiba történt. Próbáld meg később.' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT username, is_admin, profile_picture_filename FROM users WHERE id = $1', [req.user.id]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'A felhasználó nem található.' });
        }

        const isAdmin = user.is_admin === 1;
        const payload = {
            id: req.user.id,
            username: user.username,
            isAdmin,
            profile_picture_filename: user.profile_picture_filename
        };

        const refreshedToken = generateAuthToken(payload);
        setAuthCookie(res, refreshedToken);

        res.status(200).json({
            ...payload,
            token: refreshedToken
        });
    } catch (err) {
        console.error('Hiba a felhasználói adatok lekérdezésekor:', err);
        res.status(500).json({ message: 'Váratlan hiba történt.' });
    }
};

exports.logout = (req, res) => {
    clearAuthCookie(res);
    res.status(200).json({ message: 'Sikeres kijelentkezés.' });
};
