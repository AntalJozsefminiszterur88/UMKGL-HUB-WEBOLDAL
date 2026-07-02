function registerDiscord2HttpRoutes({
  app,
  io,
  db,
  fs,
  path,
  multer,
  authenticateToken,
  isAdmin,
  discord2UploadsDirectory,
  messageUploadMaxBytes,
  serverLogoSettingKey,
  getAttachmentKind,
  getAttachmentDirectory,
  normalizeLogoFilename,
  fetchAuthorizedUserById,
  insertMessage,
  updateServerSettings,
}) {
  const serverLogoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, discord2UploadsDirectory),
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname || ".png");
      cb(null, `server-logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  });

  const uploadServerLogo = multer({
    storage: serverLogoStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const validMimeType = allowedTypes.test(file.mimetype);
      const validExtension = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (validMimeType && validExtension) {
        return cb(null, true);
      }
      return cb(new Error("Csak képfájlok tölthetők fel (jpeg, jpg, png, gif, webp)."));
    },
  }).single("logo");

  const attachmentStorage = multer.diskStorage({
    destination: (_req, file, cb) => {
      const kind = getAttachmentKind(file);
      if (!kind) {
        return cb(new Error("Csak kép vagy lejátszható videó tölthető fel."));
      }
      return cb(null, getAttachmentDirectory(kind));
    },
    filename: (_req, file, cb) => {
      const kind = getAttachmentKind(file);
      if (!kind) {
        return cb(new Error("Érvénytelen Discord 2 médiafájl."));
      }
      const extension = path.extname(String(file.originalname || "")).toLowerCase();
      return cb(null, `${kind}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  });

  const uploadAttachment = multer({
    storage: attachmentStorage,
    limits: { fileSize: messageUploadMaxBytes },
    fileFilter: (_req, file, cb) => {
      if (getAttachmentKind(file)) {
        return cb(null, true);
      }
      return cb(new Error("Csak kép vagy lejátszható videó tölthető fel."));
    },
  }).single("file");

  app.post("/api/discord2/messages/upload", authenticateToken, (req, res) => {
    uploadAttachment(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (uploadErr instanceof multer.MulterError) {
          const message = uploadErr.code === "LIMIT_FILE_SIZE"
            ? "A fájl mérete nem haladhatja meg a 12MB-ot."
            : "Feltöltési hiba.";
          return res.status(400).json({ message });
        }
        return res.status(400).json({ message: uploadErr.message });
      }

      const cleanupUploadedFile = async () => {
        if (!req.file?.path) return;
        try {
          await fs.promises.unlink(req.file.path);
        } catch (error) {
          if (error?.code !== "ENOENT") {
            console.error("Hiba a Discord 2 média rollback közben:", error);
          }
        }
      };

      try {
        const user = await fetchAuthorizedUserById(req.user?.id);
        if (!user) {
          await cleanupUploadedFile();
          return res.status(403).json({ message: "Nincs jogosultság a Discord 2 használatához." });
        }

        const channelId = Number(req.body?.channelId);
        const content = String(req.body?.content || "").trim().slice(0, 4000);
        if (!Number.isFinite(channelId) || channelId <= 0) {
          await cleanupUploadedFile();
          return res.status(400).json({ message: "Érvénytelen csatorna." });
        }
        if (!req.file) {
          return res.status(400).json({ message: "Nincs feltöltött fájl." });
        }

        const channelResult = await db.query(
          "SELECT id FROM discord_channels WHERE id = $1 AND type = 'text'",
          [channelId]
        );
        if (!channelResult.rows[0]) {
          await cleanupUploadedFile();
          return res.status(400).json({ message: "Csak szöveges csatornába küldhetsz médiaüzenetet." });
        }

        const kind = getAttachmentKind(req.file);
        if (!kind) {
          await cleanupUploadedFile();
          return res.status(400).json({ message: "Csak kép vagy lejátszható videó tölthető fel." });
        }

        const message = await insertMessage({
          channelId,
          userId: user.userId,
          authorName: user.username,
          content,
          attachment: {
            kind,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
          },
        });

        if (!message) {
          await cleanupUploadedFile();
          return res.status(400).json({ message: "Üres üzenetet nem lehet küldeni." });
        }

        io.emit("discord2_message_created", message);
        return res.status(201).json({
          message: "Discord 2 médiaüzenet elmentve.",
          createdMessage: message,
        });
      } catch (error) {
        await cleanupUploadedFile();
        console.error("Hiba a Discord 2 média feltöltésekor:", error);
        return res.status(500).json({ message: "Nem sikerült feltölteni a fájlt." });
      }
    });
  });

  app.post("/api/discord2/server-logo", authenticateToken, isAdmin, (req, res) => {
    uploadServerLogo(req, res, async (uploadErr) => {
      if (uploadErr) {
        if (uploadErr instanceof multer.MulterError) {
          const message = uploadErr.code === "LIMIT_FILE_SIZE"
            ? "A képfájl mérete nem haladhatja meg az 5MB-ot."
            : "Feltöltési hiba.";
          return res.status(400).json({ message });
        }
        return res.status(400).json({ message: uploadErr.message });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Nincs fájl feltöltve." });
      }

      const oldFilename = normalizeLogoFilename(app.settings?.[serverLogoSettingKey]);
      const newFilename = normalizeLogoFilename(req.file.filename);
      try {
        const payload = await updateServerSettings({ logoFilename: newFilename });
        if (oldFilename && oldFilename !== newFilename) {
          fs.unlink(path.join(discord2UploadsDirectory, oldFilename), (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== "ENOENT") {
              console.error("Hiba a régi Discord 2 szerverlogó törlésekor:", unlinkErr);
            }
          });
        }
        return res.status(200).json({
          message: "Szerverlogó sikeresen frissítve.",
          ...payload,
        });
      } catch (err) {
        console.error("Hiba a Discord 2 szerverlogó mentésekor:", err);
        return res.status(500).json({ message: "Nem sikerült menteni a szerverlogót." });
      }
    });
  });
}

module.exports = { registerDiscord2HttpRoutes };
