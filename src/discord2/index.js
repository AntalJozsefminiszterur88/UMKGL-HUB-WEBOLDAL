function createDiscord2Module({
  app,
  io,
  db,
  jwt,
  jwtSecret,
  fs,
  path,
  multer,
  discord2UploadsDirectory,
  authenticateToken,
  isAdmin,
}) {
const discord2OnlineUsers = new Map();
const discord2SocketUsers = new Map();
const DISCORD2_MAX_MESSAGES = 300;
const DISCORD2_SERVER_NAME_KEY = 'discord2_server_name';
const DISCORD2_SERVER_LOGO_KEY = 'discord2_server_logo';
const DISCORD2_DEFAULT_SERVER_NAME = 'UMKGL Szerver';
const DISCORD2_VOICE_ROOM_PREFIX = 'discord2_voice_room:';
const DISCORD2_VOICE_PEER_MAX_LENGTH = 160;
const DISCORD2_MESSAGE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const DISCORD2_MESSAGE_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const DISCORD2_MESSAGE_IMAGE_MIME_PREFIX = 'image/';
const DISCORD2_MESSAGE_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogv', '.ogg', '.mov']);
const DISCORD2_MESSAGE_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
const discord2MessageImagesDirectory = path.join(discord2UploadsDirectory, 'images');
const discord2MessageVideosDirectory = path.join(discord2UploadsDirectory, 'videos');

fs.mkdirSync(discord2MessageImagesDirectory, { recursive: true });
fs.mkdirSync(discord2MessageVideosDirectory, { recursive: true });

function normalizeDiscord2PeerId(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return null;
    }
    return normalized.slice(0, DISCORD2_VOICE_PEER_MAX_LENGTH);
}

function getDiscord2VoiceRoomName(channelId) {
    const numericChannelId = Number(channelId);
    if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
        return null;
    }
    return `${DISCORD2_VOICE_ROOM_PREFIX}${numericChannelId}`;
}

function leaveDiscord2VoiceRooms(socket) {
    if (!socket || !(socket.rooms instanceof Set)) {
        return;
    }
    for (const roomName of socket.rooms) {
        if (typeof roomName === 'string' && roomName.startsWith(DISCORD2_VOICE_ROOM_PREFIX)) {
            socket.leave(roomName);
        }
    }
}

function getDiscord2VoicePeersForChannel(channelId, excludedUserId = null) {
    const numericChannelId = Number(channelId);
    if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
        return [];
    }

    const excludedId = Number.isFinite(Number(excludedUserId)) ? Number(excludedUserId) : null;
    const peers = [];

    for (const entry of discord2OnlineUsers.values()) {
        if (Number(entry.voiceChannelId) !== numericChannelId) {
            continue;
        }
        if (excludedId && Number(entry.userId) === excludedId) {
            continue;
        }
        if (!entry.peerId) {
            continue;
        }
        peers.push({
            userId: Number(entry.userId),
            peerId: entry.peerId,
            speaking: entry.speaking === true,
            screenSharing: entry.screenSharing === true,
        });
    }

    peers.sort((a, b) => Number(a.userId) - Number(b.userId));
    return peers;
}

function emitDiscord2VoiceRoomPeers(socket, channelId, excludedUserId = null) {
    if (!socket) {
        return;
    }
    const numericChannelId = Number(channelId);
    if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
        return;
    }
    socket.emit('discord2_voice_room_peers', {
        channelId: numericChannelId,
        peers: getDiscord2VoicePeersForChannel(numericChannelId, excludedUserId),
    });
}

function hasDiscord2Permission(userRow) {
    if (!userRow) {
        return false;
    }
    return Number(userRow.is_admin) === 1 || Number(userRow.can_use_discord) === 1;
}

function buildAvatarUrl(profilePictureFilename) {
    return profilePictureFilename
        ? `/uploads/avatars/${profilePictureFilename}`
        : 'program_icons/default-avatar.png';
}

function normalizeDiscord2Name(value, maxLength = 64) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeDiscord2ServerName(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 60);
}

function normalizeDiscord2LogoFilename(value) {
    const normalized = path.posix.basename(String(value || '').trim());
    return normalized || '';
}

function normalizeDiscord2OriginalFilename(value, maxLength = 255) {
    const normalized = path.posix.basename(String(value || '').trim());
    return normalized.slice(0, maxLength);
}

function getDiscord2MessageAttachmentKindFromFile(file) {
    const extension = path.extname(String(file?.originalname || '')).toLowerCase();
    const mimeType = String(file?.mimetype || '').toLowerCase();

    if (mimeType.startsWith(DISCORD2_MESSAGE_IMAGE_MIME_PREFIX) && DISCORD2_MESSAGE_IMAGE_EXTENSIONS.has(extension)) {
        return 'image';
    }
    if (DISCORD2_MESSAGE_VIDEO_MIME_TYPES.has(mimeType) && DISCORD2_MESSAGE_VIDEO_EXTENSIONS.has(extension)) {
        return 'video';
    }

    return null;
}

function getDiscord2MessageAttachmentDirectory(kind) {
    return kind === 'video' ? discord2MessageVideosDirectory : discord2MessageImagesDirectory;
}

function getDiscord2MessageAttachmentUrl(kind, filename) {
    const normalizedFilename = normalizeDiscord2LogoFilename(filename);
    if (!normalizedFilename) {
        return null;
    }

    const folder = kind === 'video' ? 'videos' : 'images';
    return `/uploads/discord2/${folder}/${normalizedFilename}`;
}

function getDiscord2MessageAttachmentPath(kind, filename) {
    const normalizedFilename = normalizeDiscord2LogoFilename(filename);
    if (!normalizedFilename) {
        return null;
    }

    return path.join(getDiscord2MessageAttachmentDirectory(kind), normalizedFilename);
}

function getDiscord2ServerSettingsPayload() {
    const rawName = app.settings?.[DISCORD2_SERVER_NAME_KEY];
    const normalizedName = normalizeDiscord2ServerName(rawName) || DISCORD2_DEFAULT_SERVER_NAME;
    const logoFilename = normalizeDiscord2LogoFilename(app.settings?.[DISCORD2_SERVER_LOGO_KEY]);
    return {
        name: normalizedName,
        logoFilename: logoFilename || null,
        logoUrl: logoFilename ? `/uploads/discord2/${logoFilename}` : 'program_icons/default-avatar.png',
    };
}

async function updateAppSetting(key, value) {
    await db.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(value)]
    );
    app.settings[key] = String(value);
}

async function updateDiscord2ServerSettings({ name, logoFilename } = {}) {
    if (name !== undefined) {
        const normalizedName = normalizeDiscord2ServerName(name) || DISCORD2_DEFAULT_SERVER_NAME;
        await updateAppSetting(DISCORD2_SERVER_NAME_KEY, normalizedName);
    }
    if (logoFilename !== undefined) {
        const normalizedLogoFilename = normalizeDiscord2LogoFilename(logoFilename);
        await updateAppSetting(DISCORD2_SERVER_LOGO_KEY, normalizedLogoFilename);
    }

    const payload = getDiscord2ServerSettingsPayload();
    io.emit('discord2_server_settings', payload);
    return payload;
}

function mapDiscord2MessageRow(row) {
    const attachmentKind = row.attachment_kind === 'video' ? 'video' : (row.attachment_kind === 'image' ? 'image' : null);
    return {
        id: Number(row.id),
        channelId: Number(row.channel_id),
        userId: row.user_id ? Number(row.user_id) : null,
        author: row.author_name,
        content: row.content,
        createdAt: row.created_at,
        avatarUrl: buildAvatarUrl(row.profile_picture_filename),
        attachment: attachmentKind && row.attachment_filename ? {
            kind: attachmentKind,
            filename: normalizeDiscord2LogoFilename(row.attachment_filename),
            originalName: normalizeDiscord2OriginalFilename(row.attachment_original_name),
            mimeType: String(row.attachment_mime_type || '').trim() || null,
            sizeBytes: Number.isFinite(Number(row.attachment_size_bytes)) ? Number(row.attachment_size_bytes) : null,
            url: getDiscord2MessageAttachmentUrl(attachmentKind, row.attachment_filename),
        } : null,
    };
}

async function fetchDiscord2Structure() {
    const [categoryResult, channelResult] = await Promise.all([
        db.query('SELECT id, name, position FROM discord_categories ORDER BY position ASC, id ASC'),
        db.query('SELECT id, name, type, parent_id, position FROM discord_channels ORDER BY parent_id ASC NULLS LAST, position ASC, id ASC'),
    ]);

    return {
        categories: categoryResult.rows.map((row) => ({
            id: Number(row.id),
            name: row.name,
            position: Number(row.position || 0),
        })),
        channels: channelResult.rows.map((row) => ({
            id: Number(row.id),
            name: row.name,
            type: row.type === 'voice' ? 'voice' : 'text',
            parentId: row.parent_id ? Number(row.parent_id) : null,
            position: Number(row.position || 0),
        })),
    };
}

async function fetchDiscord2Messages(limit = DISCORD2_MAX_MESSAGES) {
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(1000, Number(limit))) : DISCORD2_MAX_MESSAGES;
    const { rows } = await db.query(
        `WITH recent AS (
            SELECT
                m.id,
                m.channel_id,
                m.user_id,
                m.author_name,
                m.content,
                m.created_at,
                m.attachment_kind,
                m.attachment_filename,
                m.attachment_original_name,
                m.attachment_mime_type,
                m.attachment_size_bytes,
                u.profile_picture_filename
            FROM discord2_messages m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE m.user_id IS NOT NULL
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT $1
        )
        SELECT *
        FROM recent
        ORDER BY created_at ASC, id ASC`,
        [safeLimit]
    );

    return rows.map(mapDiscord2MessageRow);
}

function getDiscord2OnlineMembersPayload() {
    return Array.from(discord2OnlineUsers.values())
        .map((entry) => ({
            userId: Number(entry.userId),
            username: entry.username,
            isAdmin: entry.isAdmin === true,
            profile_picture_filename: entry.profilePictureFilename || null,
            avatarUrl: buildAvatarUrl(entry.profilePictureFilename),
            voiceChannelId: entry.voiceChannelId ? Number(entry.voiceChannelId) : null,
            peerId: entry.peerId || null,
            speaking: entry.speaking === true,
            screenSharing: entry.screenSharing === true,
        }))
        .sort((a, b) => a.username.localeCompare(b.username, 'hu'));
}

function getDiscord2VoiceMembersByChannelPayload() {
    const grouped = {};
    for (const entry of discord2OnlineUsers.values()) {
        if (!entry.voiceChannelId) {
            continue;
        }
        const channelKey = String(entry.voiceChannelId);
        if (!grouped[channelKey]) {
            grouped[channelKey] = [];
        }
        grouped[channelKey].push({
            userId: Number(entry.userId),
            username: entry.username,
            profile_picture_filename: entry.profilePictureFilename || null,
            avatarUrl: buildAvatarUrl(entry.profilePictureFilename),
            isAdmin: entry.isAdmin === true,
            peerId: entry.peerId || null,
            speaking: entry.speaking === true,
            screenSharing: entry.screenSharing === true,
        });
    }

    Object.keys(grouped).forEach((key) => {
        grouped[key].sort((a, b) => a.username.localeCompare(b.username, 'hu'));
    });

    return grouped;
}

function broadcastDiscord2Presence() {
    io.emit('discord2_presence', {
        onlineMembers: getDiscord2OnlineMembersPayload(),
        voiceMembersByChannel: getDiscord2VoiceMembersByChannelPayload(),
    });
}

async function broadcastDiscord2Structure() {
    const structure = await fetchDiscord2Structure();
    io.emit('discord2_structure', structure);
}

async function fetchDiscord2AuthorizedUserById(userId) {
    const numericUserId = Number(userId);
    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        return null;
    }

    try {
        const { rows } = await db.query(
            'SELECT id, username, is_admin, can_use_discord, profile_picture_filename FROM users WHERE id = $1',
            [numericUserId]
        );
        const user = rows[0];
        if (!user || !hasDiscord2Permission(user)) {
            return null;
        }

        return {
            userId: Number(user.id),
            username: user.username,
            isAdmin: Number(user.is_admin) === 1,
            profilePictureFilename: user.profile_picture_filename || null,
        };
    } catch (_err) {
        return null;
    }
}

async function fetchDiscord2AuthorizedUser(token) {
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        return fetchDiscord2AuthorizedUserById(decoded?.id);
    } catch (_err) {
        return null;
    }
}

function attachDiscord2Socket(socketId, userInfo) {
    if (!socketId || !userInfo || !Number.isFinite(Number(userInfo.userId))) {
        return;
    }

    const userId = Number(userInfo.userId);
    const existing = discord2OnlineUsers.get(userId);

    if (existing) {
        existing.sockets.add(socketId);
        existing.username = userInfo.username;
        existing.isAdmin = userInfo.isAdmin === true;
        existing.profilePictureFilename = userInfo.profilePictureFilename || null;
        if (!existing.peerId) {
            existing.peerId = null;
        }
        if (existing.speaking !== true) {
            existing.speaking = false;
        }
        if (existing.screenSharing !== true) {
            existing.screenSharing = false;
        }
    } else {
        discord2OnlineUsers.set(userId, {
            userId,
            username: userInfo.username,
            isAdmin: userInfo.isAdmin === true,
            profilePictureFilename: userInfo.profilePictureFilename || null,
            voiceChannelId: null,
            peerId: null,
            speaking: false,
            screenSharing: false,
            sockets: new Set([socketId]),
        });
    }

    discord2SocketUsers.set(socketId, userId);
}

function detachDiscord2Socket(socketId) {
    const userId = discord2SocketUsers.get(socketId);
    if (!userId) {
        return { changed: false, removedUser: null };
    }

    discord2SocketUsers.delete(socketId);
    const entry = discord2OnlineUsers.get(userId);
    if (!entry) {
        return { changed: false, removedUser: null };
    }

    entry.sockets.delete(socketId);
    if (entry.sockets.size > 0) {
        return { changed: false, removedUser: null };
    }

    const removedUser = {
        username: entry.username,
        voiceChannelId: entry.voiceChannelId ? Number(entry.voiceChannelId) : null,
        peerId: entry.peerId || null,
    };
    discord2OnlineUsers.delete(userId);
    return { changed: true, removedUser };
}

async function getDiscord2DefaultTextChannelId() {
    const { rows } = await db.query(
        "SELECT id FROM discord_channels WHERE type = 'text' ORDER BY position ASC, id ASC LIMIT 1"
    );
    const id = rows?.[0]?.id;
    return id ? Number(id) : null;
}

async function insertDiscord2Message({
    channelId,
    userId = null,
    authorName,
    content,
    attachment = null,
}) {
    const numericChannelId = Number(channelId);
    if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
        return null;
    }

    const normalizedAuthor = normalizeDiscord2Name(authorName, 64);
    const normalizedContent = String(content || '').trim().slice(0, 4000);
    const attachmentKind = attachment?.kind === 'video' ? 'video' : (attachment?.kind === 'image' ? 'image' : null);
    const attachmentFilename = attachmentKind ? normalizeDiscord2LogoFilename(attachment?.filename) : '';
    const attachmentOriginalName = attachmentKind ? normalizeDiscord2OriginalFilename(attachment?.originalName || attachment?.filename) : '';
    const attachmentMimeType = attachmentKind ? String(attachment?.mimeType || '').trim().slice(0, 120) : '';
    const attachmentSizeBytes = attachmentKind && Number.isFinite(Number(attachment?.sizeBytes))
        ? Number(attachment.sizeBytes)
        : null;

    if (!normalizedAuthor || (!normalizedContent && !attachmentKind)) {
        return null;
    }

    const { rows } = await db.query(
        `INSERT INTO discord2_messages (
            channel_id,
            user_id,
            author_name,
            content,
            attachment_kind,
            attachment_filename,
            attachment_original_name,
            attachment_mime_type,
            attachment_size_bytes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING
            id,
            channel_id,
            user_id,
            author_name,
            content,
            created_at,
            attachment_kind,
            attachment_filename,
            attachment_original_name,
            attachment_mime_type,
            attachment_size_bytes`,
        [
            numericChannelId,
            userId ? Number(userId) : null,
            normalizedAuthor,
            normalizedContent,
            attachmentKind,
            attachmentFilename || null,
            attachmentOriginalName || null,
            attachmentMimeType || null,
            attachmentSizeBytes,
        ]
    );
    const inserted = rows[0];
    if (!inserted) {
        return null;
    }

    let profilePictureFilename = null;
    if (inserted.user_id) {
        const userResult = await db.query('SELECT profile_picture_filename FROM users WHERE id = $1', [inserted.user_id]);
        profilePictureFilename = userResult.rows?.[0]?.profile_picture_filename || null;
    }

    return mapDiscord2MessageRow({
        ...inserted,
        profile_picture_filename: profilePictureFilename,
    });
}

async function deleteDiscord2MessageAttachment(row) {
    const attachmentKind = row?.attachment_kind === 'video' ? 'video' : (row?.attachment_kind === 'image' ? 'image' : null);
    const attachmentFilename = normalizeDiscord2LogoFilename(row?.attachment_filename);
    if (!attachmentKind || !attachmentFilename) {
        return;
    }

    const attachmentPath = getDiscord2MessageAttachmentPath(attachmentKind, attachmentFilename);
    if (!attachmentPath) {
        return;
    }

    try {
        await fs.promises.unlink(attachmentPath);
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            console.error('Hiba a Discord 2 media torlesekor:', error);
        }
    }
}

async function emitDiscord2SystemMessage(content, channelId = null) {
    const targetChannelId = channelId || await getDiscord2DefaultTextChannelId();
    if (!targetChannelId) {
        return;
    }

    const message = await insertDiscord2Message({
        channelId: targetChannelId,
        userId: null,
        authorName: 'Rendszer',
        content,
    });
    if (message) {
        io.emit('discord2_message_created', message);
    }
}

function clearVoiceUsersFromChannel(channelId) {
    const numericChannelId = Number(channelId);
    if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
        return false;
    }

    let changed = false;
    for (const entry of discord2OnlineUsers.values()) {
        if (Number(entry.voiceChannelId) === numericChannelId) {
            entry.voiceChannelId = null;
            entry.speaking = false;
            entry.screenSharing = false;
            changed = true;
        }
    }

    return changed;
}

async function emitDiscord2InitialState(socket, userId) {
    const [structure, messages] = await Promise.all([
        fetchDiscord2Structure(),
        fetchDiscord2Messages(),
    ]);

    const messagesByChannel = {};
    for (const message of messages) {
        const key = String(message.channelId);
        if (!messagesByChannel[key]) {
            messagesByChannel[key] = [];
        }
        messagesByChannel[key].push(message);
    }

    socket.emit('discord2_state', {
        server: getDiscord2ServerSettingsPayload(),
        categories: structure.categories,
        channels: structure.channels,
        messagesByChannel,
        onlineMembers: getDiscord2OnlineMembersPayload(),
        voiceMembersByChannel: getDiscord2VoiceMembersByChannelPayload(),
        selfUserId: Number(userId),
    });
}


  function registerSocketHandlers(socket) {
    socket.on('discord2_join', async ({ token } = {}) => {
        const user = await fetchDiscord2AuthorizedUser(token);
        if (!user) {
            socket.emit('discord2_error', { message: 'Nincs jogosultsĂˇg a Discord 2 hasznĂˇlatĂˇhoz.' });
            return;
        }

        const previousUserId = discord2SocketUsers.get(socket.id);
        if (previousUserId && Number(previousUserId) !== Number(user.userId)) {
            detachDiscord2Socket(socket.id);
        }

        attachDiscord2Socket(socket.id, user);

        try {
            await emitDiscord2InitialState(socket, user.userId);
            broadcastDiscord2Presence();
        } catch (err) {
            console.error('Hiba a Discord 2 Ăˇllapot kĂĽldĂ©sekor:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_send_message', async ({ channelId, content } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        if (!userId) {
            socket.emit('discord2_error', { message: 'A Discord 2 kapcsolat nincs hiteles\u00EDtve.' });
            return;
        }

        const entry = discord2OnlineUsers.get(userId);
        if (!entry) {
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
            return;
        }

        const numericChannelId = Number(channelId);
        const normalizedContent = String(content || '').trim();
        if (!Number.isFinite(numericChannelId) || numericChannelId <= 0 || !normalizedContent) {
            return;
        }

        try {
            const channelResult = await db.query(
                "SELECT id FROM discord_channels WHERE id = $1 AND type = 'text'",
                [numericChannelId]
            );
            if (!channelResult.rows[0]) {
                socket.emit('discord2_error', { message: 'Csak szĂ¶veges csatornĂˇba kĂĽldhetsz ĂĽzenetet.' });
                return;
            }

            const message = await insertDiscord2Message({
                channelId: numericChannelId,
                userId,
                authorName: entry.username,
                content: normalizedContent,
            });

            if (!message) {
                return;
            }
            io.emit('discord2_message_created', message);
        } catch (err) {
            console.error('Hiba a cĂ­mkĂ©k beolvasĂˇsa sorĂˇn:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_delete_message', async ({ messageId } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin torolhet Discord 2 uzenetet.' });
            return;
        }

        const numericMessageId = Number(messageId);
        if (!Number.isFinite(numericMessageId) || numericMessageId <= 0) {
            socket.emit('discord2_error', { message: 'Ervenytelen uzenet azonosito.' });
            return;
        }

        try {
            const { rows } = await db.query(
                `DELETE FROM discord2_messages
                 WHERE id = $1
                 RETURNING id, channel_id, attachment_kind, attachment_filename`,
                [numericMessageId]
            );
            const deletedMessage = rows[0];
            if (!deletedMessage) {
                socket.emit('discord2_error', { message: 'Az uzenet mar nem talalhato.' });
                return;
            }

            await deleteDiscord2MessageAttachment(deletedMessage);
            io.emit('discord2_message_deleted', {
                messageId: Number(deletedMessage.id),
                channelId: Number(deletedMessage.channel_id),
            });
        } catch (err) {
            console.error('Hiba a Discord 2 uzenet torlesekor:', err);
            socket.emit('discord2_error', { message: 'Nem sikerult torolni az uzenetet.' });
        }
    });

    socket.on('discord2_voice_join', async ({ channelId, peerId } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        if (!userId) {
            socket.emit('discord2_error', { message: 'A Discord 2 kapcsolat nincs hiteles\u00EDtve.' });
            return;
        }

        const numericChannelId = Number(channelId);
        if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
            return;
        }

        try {
            const { rows } = await db.query(
                "SELECT id, type FROM discord_channels WHERE id = $1 AND type = 'voice'",
                [numericChannelId]
            );
            if (!rows[0]) {
                socket.emit('discord2_error', { message: 'A kiv\u00E1lasztott hangcsatorna nem tal\u00E1lhat\u00F3.' });
                return;
            }

            const entry = discord2OnlineUsers.get(userId);
            if (!entry) {
                socket.emit('receiver_error', { message: 'Nincs jogosultsĂˇg a fĂˇjlkĂĽldĂ©sre.' });
                return;
            }

            const normalizedPeerId = normalizeDiscord2PeerId(peerId);
            const previousChannelId = entry.voiceChannelId ? Number(entry.voiceChannelId) : null;
            const previousPeerId = entry.peerId || null;
            const switchedChannel = previousChannelId !== numericChannelId;
            const switchedPeer = normalizedPeerId && normalizedPeerId !== previousPeerId;

            leaveDiscord2VoiceRooms(socket);
            const nextRoomName = getDiscord2VoiceRoomName(numericChannelId);
            if (nextRoomName) {
                socket.join(nextRoomName);
            }

            if (normalizedPeerId) {
                entry.peerId = normalizedPeerId;
            }

            if (!switchedChannel && !switchedPeer) {
                emitDiscord2VoiceRoomPeers(socket, numericChannelId, userId);
                return;
            }

            entry.voiceChannelId = numericChannelId;
            entry.speaking = false;

            if (switchedChannel && previousChannelId) {
                const previousRoomName = getDiscord2VoiceRoomName(previousChannelId);
                if (previousRoomName) {
                    socket.to(previousRoomName).emit('discord2_voice_member_left', {
                        channelId: previousChannelId,
                        userId: Number(entry.userId),
                        peerId: previousPeerId || null,
                    });
                }
            } else if (switchedPeer && numericChannelId) {
                const currentRoomName = getDiscord2VoiceRoomName(numericChannelId);
                if (currentRoomName && previousPeerId) {
                    socket.to(currentRoomName).emit('discord2_voice_member_left', {
                        channelId: numericChannelId,
                        userId: Number(entry.userId),
                        peerId: previousPeerId,
                    });
                }
            }

            if (entry.peerId) {
                const currentRoomName = getDiscord2VoiceRoomName(numericChannelId);
                if (currentRoomName) {
                    socket.to(currentRoomName).emit('discord2_voice_member_joined', {
                        channelId: numericChannelId,
                        userId: Number(entry.userId),
                        peerId: entry.peerId,
                        speaking: false,
                    });
                }
            }

            emitDiscord2VoiceRoomPeers(socket, numericChannelId, userId);
            broadcastDiscord2Presence();
        } catch (err) {
            console.error('Hiba az archĂ­vum cĂ©lmappa ellenĹ‘rzĂ©sekor:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_voice_leave', () => {
        const userId = discord2SocketUsers.get(socket.id);
        if (!userId) {
            return;
        }

        const entry = discord2OnlineUsers.get(userId);
        if (!entry || !entry.voiceChannelId) {
            return;
        }

        const previousChannelId = Number(entry.voiceChannelId);
        const previousPeerId = entry.peerId || null;
        entry.voiceChannelId = null;
        entry.speaking = false;
        entry.screenSharing = false;
        leaveDiscord2VoiceRooms(socket);

        const previousRoomName = getDiscord2VoiceRoomName(previousChannelId);
        if (previousRoomName) {
            socket.to(previousRoomName).emit('discord2_voice_member_left', {
                channelId: previousChannelId,
                userId: Number(entry.userId),
                peerId: previousPeerId,
            });
        }

        broadcastDiscord2Presence();
    });

    socket.on('discord2_screen_share_state', ({ sharing } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        if (!userId) {
            return;
        }

        const entry = discord2OnlineUsers.get(userId);
        if (!entry || !entry.voiceChannelId) {
            if (entry) {
                entry.screenSharing = false;
            }
            return;
        }

        const nextSharing = sharing === true;
        if (entry.screenSharing === nextSharing) {
            return;
        }

        entry.screenSharing = nextSharing;
        broadcastDiscord2Presence();
    });

    socket.on('discord2_voice_speaking', ({ speaking } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        if (!userId) {
            return;
        }

        const entry = discord2OnlineUsers.get(userId);
        if (!entry || !entry.voiceChannelId) {
            return;
        }

        const nextSpeaking = speaking === true;
        if (entry.speaking === nextSpeaking) {
            return;
        }

        entry.speaking = nextSpeaking;
        const roomName = getDiscord2VoiceRoomName(entry.voiceChannelId);
        if (roomName) {
            socket.to(roomName).emit('discord2_voice_speaking', {
                channelId: Number(entry.voiceChannelId),
                userId: Number(entry.userId),
                speaking: nextSpeaking,
            });
        }
        socket.emit('discord2_voice_speaking', {
            channelId: Number(entry.voiceChannelId),
            userId: Number(entry.userId),
            speaking: nextSpeaking,
        });
    });

    socket.on('discord2_ping', (ack) => {
        if (typeof ack === 'function') {
            ack({ serverTime: Date.now() });
        }
    });

    socket.on('discord2_update_server_settings', async ({ name } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin mĂłdosĂ­thatja a szerver beĂˇllĂ­tĂˇsait.' });
            return;
        }

        const normalizedName = normalizeDiscord2ServerName(name);
        if (!normalizedName) {
            socket.emit('discord2_error', { message: 'A szerver neve kĂ¶telezĹ‘.' });
            return;
        }

        try {
            await updateDiscord2ServerSettings({ name: normalizedName });
        } catch (err) {
            console.error('Hiba a Discord 2 szerverbeĂˇllĂ­tĂˇs mentĂ©sekor:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_create_category', async ({ name } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin hozhat lĂ©tre kategĂłriĂˇt.' });
            return;
        }

        const categoryName = normalizeDiscord2Name(name, 60);
        if (!categoryName) {
            socket.emit('discord2_error', { message: 'A kategĂłria neve kĂ¶telezĹ‘.' });
            return;
        }

        try {
            const positionResult = await db.query(
                'SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM discord_categories'
            );
            const nextPosition = Number(positionResult.rows?.[0]?.next_position || 0);
            await db.query(
                'INSERT INTO discord_categories (name, position) VALUES ($1, $2)',
                [categoryName, nextPosition]
            );
            await broadcastDiscord2Structure();
        } catch (err) {
            console.error('Hiba a cĂ­mkĂ©k beolvasĂˇsa sorĂˇn:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_rename_category', async ({ categoryId, name } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin nevezhet Ăˇt kategĂłriĂˇt.' });
            return;
        }

        const numericCategoryId = Number(categoryId);
        const categoryName = normalizeDiscord2Name(name, 60);
        if (!Number.isFinite(numericCategoryId) || numericCategoryId <= 0 || !categoryName) {
            socket.emit('discord2_error', { message: 'Ă‰rvĂ©nytelen kategĂłria adatok.' });
            return;
        }

        try {
            await db.query(
                'UPDATE discord_categories SET name = $1 WHERE id = $2',
                [categoryName, numericCategoryId]
            );
            await broadcastDiscord2Structure();
        } catch (err) {
            console.error('Hiba a cĂ­mkĂ©k beolvasĂˇsa sorĂˇn:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_delete_category', async ({ categoryId } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin tĂ¶rĂ¶lhet kategĂłriĂˇt.' });
            return;
        }

        const numericCategoryId = Number(categoryId);
        if (!Number.isFinite(numericCategoryId) || numericCategoryId <= 0) {
            socket.emit('discord2_error', { message: 'Ă‰rvĂ©nytelen kategĂłria azonosĂ­tĂł.' });
            return;
        }

        try {
            const channelsResult = await db.query(
                'SELECT id, type FROM discord_channels WHERE parent_id = $1',
                [numericCategoryId]
            );
            const channels = Array.isArray(channelsResult.rows) ? channelsResult.rows : [];

            await db.query('DELETE FROM discord_channels WHERE parent_id = $1', [numericCategoryId]);
            await db.query('DELETE FROM discord_categories WHERE id = $1', [numericCategoryId]);

            let presenceChanged = false;
            channels.forEach((channel) => {
                if (channel.type === 'voice') {
                    presenceChanged = clearVoiceUsersFromChannel(channel.id) || presenceChanged;
                }
            });

            if (presenceChanged) {
                broadcastDiscord2Presence();
            }
            await broadcastDiscord2Structure();
        } catch (err) {
            console.error('Hiba a cĂ­mkĂ©k beolvasĂˇsa sorĂˇn:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_create_channel', async ({ name, type, categoryId } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin hozhat lĂ©tre csatornĂˇt.' });
            return;
        }

        const channelName = normalizeDiscord2Name(name, 60);
        const channelType = type === 'voice' ? 'voice' : 'text';
        const numericCategoryId = Number(categoryId);
        if (!channelName || !Number.isFinite(numericCategoryId) || numericCategoryId <= 0) {
            socket.emit('discord2_error', { message: 'Ă‰rvĂ©nytelen csatorna adatok.' });
            return;
        }

        try {
            const categoryResult = await db.query('SELECT id FROM discord_categories WHERE id = $1', [numericCategoryId]);
            if (!categoryResult.rows?.[0]?.id) {
                socket.emit('discord2_error', { message: 'A kategĂłria nem talĂˇlhatĂł.' });
                return;
            }

            const positionResult = await db.query(
                'SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM discord_channels WHERE parent_id = $1',
                [numericCategoryId]
            );
            const nextPosition = Number(positionResult.rows?.[0]?.next_position || 0);

            await db.query(
                'INSERT INTO discord_channels (name, type, parent_id, position) VALUES ($1, $2, $3, $4)',
                [channelName, channelType, numericCategoryId, nextPosition]
            );
            await broadcastDiscord2Structure();
        } catch (err) {
            console.error('Hiba a cĂ­mkĂ©k beolvasĂˇsa sorĂˇn:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_rename_channel', async ({ channelId, name } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin nevezhet Ăˇt csatornĂˇt.' });
            return;
        }

        const numericChannelId = Number(channelId);
        const channelName = normalizeDiscord2Name(name, 60);
        if (!Number.isFinite(numericChannelId) || numericChannelId <= 0 || !channelName) {
            socket.emit('discord2_error', { message: 'Ă‰rvĂ©nytelen csatorna adatok.' });
            return;
        }

        try {
            await db.query(
                'UPDATE discord_channels SET name = $1 WHERE id = $2',
                [channelName, numericChannelId]
            );
            await broadcastDiscord2Structure();
        } catch (err) {
            console.error('Hiba a cĂ­mkĂ©k beolvasĂˇsa sorĂˇn:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });

    socket.on('discord2_delete_channel', async ({ channelId } = {}) => {
        const userId = discord2SocketUsers.get(socket.id);
        const user = userId ? discord2OnlineUsers.get(userId) : null;
        if (!user || user.isAdmin !== true) {
            socket.emit('discord2_error', { message: 'Csak admin tĂ¶rĂ¶lhet csatornĂˇt.' });
            return;
        }

        const numericChannelId = Number(channelId);
        if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
            socket.emit('discord2_error', { message: 'Ă‰rvĂ©nytelen csatorna azonosĂ­tĂł.' });
            return;
        }

        try {
            const channelResult = await db.query(
                'SELECT id, type FROM discord_channels WHERE id = $1',
                [numericChannelId]
            );
            const channel = channelResult.rows?.[0];
            if (!channel) {
                socket.emit('discord2_error', { message: 'A csatorna nem talĂˇlhatĂł.' });
                return;
            }

            await db.query('DELETE FROM discord_channels WHERE id = $1', [numericChannelId]);

            if (channel.type === 'voice') {
                const changed = clearVoiceUsersFromChannel(numericChannelId);
                if (changed) {
                    broadcastDiscord2Presence();
                }
            }

            await broadcastDiscord2Structure();
        } catch (err) {
            console.error('Hiba a cĂ­mkĂ©k beolvasĂˇsa sorĂˇn:', err);
            socket.emit('receiver_error', { message: 'Nem sikerĂĽlt regisztrĂˇlni fogadĂłkĂ©nt.' });
        }
    });


    socket.on('disconnect', () => {
        const disconnectingUserId = discord2SocketUsers.get(socket.id);
        const disconnectingEntry = disconnectingUserId ? discord2OnlineUsers.get(disconnectingUserId) : null;
        const previousVoiceChannelId = disconnectingEntry?.voiceChannelId ? Number(disconnectingEntry.voiceChannelId) : null;
        const previousPeerId = disconnectingEntry?.peerId || null;

        leaveDiscord2VoiceRooms(socket);
        const detachResult = detachDiscord2Socket(socket.id);
        if (previousVoiceChannelId && detachResult.changed) {
            const roomName = getDiscord2VoiceRoomName(previousVoiceChannelId);
            if (roomName) {
                socket.to(roomName).emit('discord2_voice_member_left', {
                    channelId: previousVoiceChannelId,
                    userId: Number(disconnectingUserId),
                    peerId: previousPeerId,
                });
            }
        }
        if (detachResult.changed) {
            broadcastDiscord2Presence();
        }
    });
  }

const discord2ServerLogoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, discord2UploadsDirectory);
    },
    filename: (_req, file, cb) => {
        const uniqueName = `server-logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname || '.png')}`;
        cb(null, uniqueName);
    },
});

const uploadDiscord2ServerLogo = multer({
    storage: discord2ServerLogoStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Csak kĂ©pfĂˇjlok tĂ¶lthetĹ‘k fel (jpeg, jpg, png, gif, webp).'));
    },
}).single('logo');

const discord2MessageAttachmentStorage = multer.diskStorage({
    destination: (_req, file, cb) => {
        const attachmentKind = getDiscord2MessageAttachmentKindFromFile(file);
        if (!attachmentKind) {
            cb(new Error('Csak kep vagy lejatszhato video toltheto fel.'));
            return;
        }

        cb(null, getDiscord2MessageAttachmentDirectory(attachmentKind));
    },
    filename: (_req, file, cb) => {
        const attachmentKind = getDiscord2MessageAttachmentKindFromFile(file);
        if (!attachmentKind) {
            cb(new Error('Ervenytelen Discord 2 media fajl.'));
            return;
        }

        const extension = path.extname(String(file.originalname || '')).toLowerCase();
        const uniqueName = `${attachmentKind}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
        cb(null, uniqueName);
    },
});

const uploadDiscord2MessageAttachment = multer({
    storage: discord2MessageAttachmentStorage,
    limits: { fileSize: DISCORD2_MESSAGE_UPLOAD_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (getDiscord2MessageAttachmentKindFromFile(file)) {
            return cb(null, true);
        }
        cb(new Error('Csak kep vagy lejatszhato video toltheto fel.'));
    },
}).single('file');

app.post('/api/discord2/messages/upload', authenticateToken, (req, res) => {
    uploadDiscord2MessageAttachment(req, res, async (uploadErr) => {
        if (uploadErr) {
            if (uploadErr instanceof multer.MulterError) {
                const message = uploadErr.code === 'LIMIT_FILE_SIZE'
                    ? 'A fajl merete nem haladhatja meg a 12MB-ot.'
                    : 'Feltoltesi hiba.';
                return res.status(400).json({ message });
            }
            return res.status(400).json({ message: uploadErr.message });
        }

        const cleanupUploadedFile = async () => {
            if (!req.file?.path) {
                return;
            }
            try {
                await fs.promises.unlink(req.file.path);
            } catch (error) {
                if (error?.code !== 'ENOENT') {
                    console.error('Hiba a Discord 2 media rollback kozben:', error);
                }
            }
        };

        try {
            const user = await fetchDiscord2AuthorizedUserById(req.user?.id);
            if (!user) {
                await cleanupUploadedFile();
                return res.status(403).json({ message: 'Nincs jogosultsag a Discord 2 hasznalatahoz.' });
            }

            const numericChannelId = Number(req.body?.channelId);
            const normalizedContent = String(req.body?.content || '').trim().slice(0, 4000);
            if (!Number.isFinite(numericChannelId) || numericChannelId <= 0) {
                await cleanupUploadedFile();
                return res.status(400).json({ message: 'Ervenytelen csatorna.' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'Nincs feltoltott fajl.' });
            }

            const channelResult = await db.query(
                "SELECT id FROM discord_channels WHERE id = $1 AND type = 'text'",
                [numericChannelId]
            );
            if (!channelResult.rows[0]) {
                await cleanupUploadedFile();
                return res.status(400).json({ message: 'Csak szoveges csatornaba kuldhetsz media uzenetet.' });
            }

            const attachmentKind = getDiscord2MessageAttachmentKindFromFile(req.file);
            if (!attachmentKind) {
                await cleanupUploadedFile();
                return res.status(400).json({ message: 'Csak kep vagy lejatszhato video toltheto fel.' });
            }

            const message = await insertDiscord2Message({
                channelId: numericChannelId,
                userId: user.userId,
                authorName: user.username,
                content: normalizedContent,
                attachment: {
                    kind: attachmentKind,
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    sizeBytes: req.file.size,
                },
            });

            if (!message) {
                await cleanupUploadedFile();
                return res.status(400).json({ message: 'Ures uzenetet nem lehet kuldeni.' });
            }

            io.emit('discord2_message_created', message);
            return res.status(201).json({ message: 'Discord 2 media uzenet elmentve.', createdMessage: message });
        } catch (error) {
            await cleanupUploadedFile();
            console.error('Hiba a Discord 2 media feltoltesekor:', error);
            return res.status(500).json({ message: 'Nem sikerult feltolteni a fajlt.' });
        }
    });
});

app.post('/api/discord2/server-logo', authenticateToken, isAdmin, (req, res) => {
    uploadDiscord2ServerLogo(req, res, async (uploadErr) => {
        if (uploadErr) {
            if (uploadErr instanceof multer.MulterError) {
                const message = uploadErr.code === 'LIMIT_FILE_SIZE'
                    ? 'A kĂ©pfĂˇjl mĂ©rete nem haladhatja meg az 5MB-ot.'
                    : 'FeltĂ¶ltĂ©si hiba.';
                return res.status(400).json({ message });
            }
            return res.status(400).json({ message: uploadErr.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Nincs fĂˇjl feltĂ¶ltve.' });
        }

        const oldFilename = normalizeDiscord2LogoFilename(app.settings?.[DISCORD2_SERVER_LOGO_KEY]);
        const newFilename = normalizeDiscord2LogoFilename(req.file.filename);

        try {
            const payload = await updateDiscord2ServerSettings({ logoFilename: newFilename });

            if (oldFilename && oldFilename !== newFilename) {
                const oldPath = path.join(discord2UploadsDirectory, oldFilename);
                fs.unlink(oldPath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                        console.error('Hiba a rĂ©gi Discord 2 szerverlogĂł tĂ¶rlĂ©sekor:', unlinkErr);
                    }
                });
            }

            res.status(200).json({
                message: 'SzerverlogĂł sikeresen frissĂ­tve.',
                ...payload,
            });
        } catch (err) {
            console.error('Hiba a Discord 2 szerverlogĂł mentĂ©sekor:', err);
            res.status(500).json({ message: 'Nem sikerĂĽlt menteni a szerverlogĂłt.' });
        }
    });
});


  return {
    registerSocketHandlers,
  };
}

module.exports = {
  createDiscord2Module,
};
