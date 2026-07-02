const jwt = require("jsonwebtoken");

function createAuthMiddleware({ db, jwtSecret }) {
  function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Hiányzó hitelesítési token." });
    }

    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Érvénytelen vagy lejárt token." });
      }

      req.user = {
        id: user.id,
        username: user.username,
        isAdmin: Boolean(user.isAdmin),
      };
      return next();
    });
  }

  async function requireAdmin(req, res, next) {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    try {
      const { rows } = await db.query("SELECT is_admin FROM users WHERE id = $1", [userId]);
      const user = rows[0];

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      if (Number(user.is_admin) !== 1) {
        return res.status(403).json({ message: "Admin access required." });
      }

      req.user.isAdmin = true;
      return next();
    } catch (err) {
      console.error("Error checking admin permission:", err);
      return res.status(500).json({ message: "Failed to verify admin permission." });
    }
  }

  return { authenticateToken, requireAdmin };
}

module.exports = { createAuthMiddleware };
