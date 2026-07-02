const express = require("express");
const bcrypt = require("bcryptjs");

function createAuthRouter({ db, generateAuthToken }) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Felhasználónév és jelszó megadása kötelező." });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hashedPassword]);
      return res.status(201).json({ message: "Sikeres regisztráció." });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ message: "A felhasználónév már létezik." });
      }
      console.error("Hiba a felhasználó mentésekor:", err);
      return res.status(500).json({ message: "Váratlan hiba történt. Próbáld meg később." });
    }
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Felhasználónév és jelszó megadása kötelező." });
    }

    try {
      const query = `
        SELECT id, username, password, is_admin, can_transfer, can_view_clips,
               can_view_archive, can_edit_archive, can_use_discord,
               profile_picture_filename, preferred_quality
        FROM users
        WHERE username = $1
      `;
      const { rows } = await db.query(query, [username]);
      const user = rows[0];
      const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;
      if (!user || !passwordMatches) {
        return res.status(401).json({ message: "Hibás felhasználónév vagy jelszó." });
      }

      const isAdmin = user.is_admin === 1;
      const canEditArchive = isAdmin || Number(user.can_edit_archive) === 1;
      const token = generateAuthToken({ id: user.id, username: user.username, isAdmin });

      return res.status(200).json({
        message: "Sikeres bejelentkezés.",
        token,
        username: user.username,
        isAdmin,
        canTransfer: Number(user.can_transfer) === 1,
        canViewClips: isAdmin || Number(user.can_view_clips) === 1,
        canViewArchive: isAdmin || Number(user.can_view_archive) === 1 || canEditArchive,
        canEditArchive,
        canUseDiscord: isAdmin || Number(user.can_use_discord) === 1,
        profile_picture_filename: user.profile_picture_filename,
        preferred_quality: user.preferred_quality || "1080p",
      });
    } catch (err) {
      console.error("Hiba a bejelentkezés során:", err);
      return res.status(500).json({ message: "Váratlan hiba történt. Próbáld meg később." });
    }
  });

  router.post("/logout", (_req, res) => {
    return res.status(200).json({ message: "Sikeres kijelentkezés." });
  });

  return router;
}

module.exports = { createAuthRouter };
