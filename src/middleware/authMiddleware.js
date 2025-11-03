const jwt = require('jsonwebtoken');
const JWT_SECRET = 'a_very_secret_and_secure_key_for_jwt';
const COOKIE_NAME = 'authToken';

function getTokenFromRequest(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    if (req.cookies && req.cookies[COOKIE_NAME]) {
        return req.cookies[COOKIE_NAME];
    }

    return null;
}

exports.authenticateToken = (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({ message: 'Hiányzó hitelesítési token.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Érvénytelen vagy lejárt token.' });
        }

        req.user = {
            id: user.id,
            username: user.username,
            isAdmin: !!user.isAdmin
        };
        req.token = token;
        next();
    });
};

exports.isAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

exports.optionalAuthenticate = (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err && user) {
            req.user = {
                id: user.id,
                username: user.username,
                isAdmin: !!user.isAdmin
            };
            req.token = token;
        }
        next();
    });
};
