const express = require("express");

function createUsersRouter({ db, authenticateToken, requireAdmin }) {
  const router = express.Router();
  router.use(authenticateToken, requireAdmin);

  router.get("/", async (_req, res) => {
    try {
      const query = `
        SELECT id, username, can_upload, can_transfer, can_view_clips,
               can_view_archive, can_edit_archive, can_use_discord,
               max_file_size_mb, max_videos, upload_count
        FROM users
      `;
      const { rows } = await db.query(query);
      return res.status(200).json(rows);
    } catch (err) {
      console.error("Hiba a felhasználók lekérdezésekor:", err);
      return res.status(500).json({ message: "Nem sikerült lekérdezni a felhasználókat." });
    }
  });

  router.post("/permissions/batch-update", async (req, res) => {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ message: "A kérés törzsében egy tömbnek kell szerepelnie." });
    }
    if (req.body.length === 0) {
      return res.status(200).json({ message: "Nincs frissítendő jogosultság." });
    }

    const updates = req.body.map((item) => {
      const canEditArchive = item.canEditArchive ? 1 : 0;
      return {
        userId: Number.parseInt(item.userId, 10),
        canUpload: item.canUpload ? 1 : 0,
        canTransfer: item.canTransfer ? 1 : 0,
        canViewClips: item.canViewClips ? 1 : 0,
        canViewArchive: item.canViewArchive || canEditArchive ? 1 : 0,
        canEditArchive,
        canUseDiscord: item.canUseDiscord ? 1 : 0,
        maxFileSizeMb: Number(item.maxFileSizeMb),
        maxVideos: Number(item.maxVideos),
      };
    });

    const invalid = updates.some((update) =>
      [update.userId, update.maxFileSizeMb, update.maxVideos].some(Number.isNaN)
    );
    if (invalid) {
      return res.status(400).json({ message: "Érvénytelen adatok a kérésben." });
    }

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      for (const update of updates) {
        const result = await client.query(
          `UPDATE users
           SET can_upload = $1, can_transfer = $2, can_view_clips = $3,
               can_view_archive = $4, can_edit_archive = $5, can_use_discord = $6,
               max_file_size_mb = $7, max_videos = $8
           WHERE id = $9`,
          [
            update.canUpload,
            update.canTransfer,
            update.canViewClips,
            update.canViewArchive,
            update.canEditArchive,
            update.canUseDiscord,
            Math.round(update.maxFileSizeMb),
            Math.round(update.maxVideos),
            update.userId,
          ]
        );
        if (result.rowCount === 0) {
          throw new Error(`A ${update.userId} azonosítójú felhasználó nem található.`);
        }
      }

      await client.query("COMMIT");
      return res.status(200).json({ message: "Jogosultságok sikeresen frissítve." });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Hiba a jogosultságok frissítésekor:", err);
      const userNotFound = err.message.includes("felhasználó nem található");
      return res.status(userNotFound ? 404 : 500).json({
        message: userNotFound ? err.message : "Nem sikerült frissíteni a jogosultságokat.",
      });
    } finally {
      client.release();
    }
  });

  return router;
}

module.exports = { createUsersRouter };
