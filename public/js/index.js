
    const ADMIN_SESSION_KEY = "isAdmin";
    const ADMIN_PREVIEW_KEY = "adminPreviewRole";
    const ADMIN_ONLY_SECTIONS = new Set(["admin"]);
    const loginModal = document.getElementById("loginModal");
    const closeLogin = document.getElementById("closeLogin");
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const authLoggedOut = document.getElementById("authLoggedOut");
    const authLoggedIn = document.getElementById("authLoggedIn");
    const userGreeting = document.getElementById("userGreeting");
    const adminPreviewBar = document.getElementById("adminPreviewBar");
    const adminPreviewToggleBtn = document.getElementById("adminPreviewToggleBtn");
    const adminNavBtn = document.getElementById("adminNavBtn");
    const programNavBtn = document.getElementById("programNavBtn");
    const fileTransferNavBtn = document.getElementById("fileTransferNavBtn");
    const userListContainer = document.getElementById("userListContainer");
    const savePermissionsBtn = document.getElementById("savePermissionsBtn");
    const videoManagementBtn = document.getElementById("videoManagementBtn");
    const discordPanelBtn = document.getElementById("discordPanelBtn");
    const pollCreator = document.getElementById("pollCreator");
    const pollCreatorNotice = document.getElementById("pollCreatorNotice");
    const createPollForm = document.getElementById("createPollForm");
    const questionInput = document.getElementById("questionInput");
    const optionsContainer = document.getElementById("optionsContainer");
    const addOptionBtn = document.getElementById("addOptionBtn");
    const pollListContainer = document.getElementById("pollList");
    const pollSection = document.getElementById("szavazas");
    const receiverToggle = document.getElementById("receiverToggle");
    const receiverList = document.getElementById("receiverList");
    const selfAvatar = document.getElementById("selfAvatar");
    const selfLabel = document.getElementById("selfLabel");
    const radarViewport = document.getElementById("radarViewport");
    const radarWorld = document.getElementById("radarWorld");
    const receiverStatus = document.getElementById("receiverStatus");
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarUploadStatus = document.getElementById('avatarUploadStatus');
    const profileAvatarPreview = document.getElementById('profileAvatarPreview');
    const p2pFileInput = document.getElementById("p2pFileInput");
    const transferList = document.getElementById("transferList");
    const programsContainer = document.getElementById("programsContainer");
    const addProgramBtn = document.getElementById("addProgramBtn");
    const programUploadModal = document.getElementById("programUploadModal");
    const programUploadTitle = document.getElementById("programUploadTitle");
    const programUploadForm = document.getElementById("programUploadForm");
    const programNameInput = document.getElementById("programNameInput");
    const programDescriptionInput = document.getElementById("programDescriptionInput");
    const programImageInput = document.getElementById("programImageInput");
    const programFileInput = document.getElementById("programFileInput");
    const programImagePreview = document.getElementById("programImagePreview");
    const programFileName = document.getElementById("programFileName");
    const closeProgramUploadModalBtn = document.getElementById("closeProgramUploadModal");
    const cancelProgramUploadBtn = document.getElementById("cancelProgramUploadBtn");
    const submitProgramUploadBtn = document.getElementById("submitProgramUploadBtn");

    const SESSION_KEYS = {
      token: "token",
      username: "username",
      isAdmin: ADMIN_SESSION_KEY,
      canTransfer: "canTransfer",
      canViewClips: "canViewClips",
      profilePictureFilename: "profilePictureFilename",
    };
    const POLL_MIN_OPTIONS = 2;
    let pollsShouldRefresh = true;
    let programImageCropper = null;
    let programImageObjectUrl = null;
    let editingProgram = null;

    function isPollSectionActive() {
      return pollSection?.classList.contains("active");
    }

    function refreshPollsIfVisible() {
      if (!isPollSectionActive() || !pollsShouldRefresh) {
        return;
      }

      pollsShouldRefresh = false;
      loadPolls();
    }

    function markPollsForRefresh() {
      pollsShouldRefresh = true;
      refreshPollsIfVisible();
    }

    const transfers = new Map();
    const RECEIVER_TOGGLE_KEY = "receiverToggleState";
    let peer = null;
    let socket = null;
    let peerId = null;
    let selectedReceiver = null;
    const P2P_CHUNK_SIZE = 64 * 1024;
    const P2P_ACK_EVERY_BYTES = 5 * 1024 * 1024;
    const P2P_ACK_EVERY_CHUNKS = 50;
    const P2P_BUFFERED_THRESHOLD = 10 * 1024 * 1024;
    const P2P_SIGNAL_TIMEOUT_MS = 4000;
    const P2P_SIGNAL_RETRY_LIMIT = 3;
    const P2P_SIGNAL_RETRY_DELAY_MS = 1200;
    const P2P_ACK_TIMEOUT_MS = 8000;
    const P2P_ACK_REQUEST_RETRY_LIMIT = 3;
    const RECEIVER_HEARTBEAT_INTERVAL_MS = 8000;
    let receiverHeartbeatTimer = null;
    const radarPanState = {
      offsetX: 0,
      offsetY: 0,
      startX: 0,
      startY: 0,
      isDragging: false,
      scale: 1,
      minScale: 0.6,
      maxScale: 2.5,
      zoomStep: 0.12,
    };

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function updateSelfLabelText(name) {
      if (!selfLabel) {
        return;
      }

      const username = name || localStorage.getItem(SESSION_KEYS.username);
      selfLabel.textContent = username || "Te";
    }

    function applyRadarPan() {
      if (!radarWorld) {
        return;
      }

      radarWorld.style.transform = `translate(-50%, -50%) translate(${radarPanState.offsetX}px, ${radarPanState.offsetY}px) scale(${radarPanState.scale})`;
    }

    function setupRadarPanning() {
      if (!radarViewport || !radarWorld) {
        return;
      }

      const startPan = (event) => {
        radarPanState.isDragging = true;
        radarViewport.classList.add("is-grabbing");
        radarPanState.startX = event.clientX - radarPanState.offsetX;
        radarPanState.startY = event.clientY - radarPanState.offsetY;
        event.preventDefault();
      };

      const handlePanMove = (event) => {
        if (!radarPanState.isDragging) {
          return;
        }

        radarPanState.offsetX = event.clientX - radarPanState.startX;
        radarPanState.offsetY = event.clientY - radarPanState.startY;
        applyRadarPan();
      };

      const endPan = () => {
        if (!radarPanState.isDragging) {
          return;
        }

        radarPanState.isDragging = false;
        radarViewport.classList.remove("is-grabbing");
      };

      radarViewport.addEventListener("mousedown", startPan);
      window.addEventListener("mousemove", handlePanMove);
      window.addEventListener("mouseup", endPan);

      applyRadarPan();
    }

    function setupRadarZoom() {
      if (!radarViewport || !radarWorld) {
        return;
      }

      const handleWheel = (event) => {
        event.preventDefault();

        const direction = event.deltaY < 0 ? 1 : -1;
        const scaleChange = direction * radarPanState.zoomStep;
        const newScale = clamp(
          radarPanState.scale + scaleChange,
          radarPanState.minScale,
          radarPanState.maxScale,
        );

        if (newScale === radarPanState.scale) {
          return;
        }

        const rect = radarViewport.getBoundingClientRect();
        const offsetFromCenterX = event.clientX - rect.left - rect.width / 2;
        const offsetFromCenterY = event.clientY - rect.top - rect.height / 2;

        radarPanState.offsetX -= offsetFromCenterX * (newScale - radarPanState.scale);
        radarPanState.offsetY -= offsetFromCenterY * (newScale - radarPanState.scale);

        radarPanState.scale = newScale;
        applyRadarPan();
      };

      radarViewport.addEventListener("wheel", handleWheel, { passive: false });
    }

    function decodeTokenPayload(token) {
      try {
        const payload = token.split(".")[1];
        return JSON.parse(atob(payload));
      } catch (error) {
        return null;
      }
    }

    function getCurrentUserId() {
      const token = getStoredToken();
      const payload = token ? decodeTokenPayload(token) : null;
      return payload && payload.id ? Number(payload.id) : null;
    }

    function updateReceiverStatus(message) {
      if (receiverStatus) {
        receiverStatus.textContent = message;
      }
    }

    function formatFileSize(size) {
      if (!Number.isFinite(size)) {
        return "Ismeretlen";
      }
      if (size >= 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
      }
      if (size >= 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
      }
      return `${size} B`;
    }

    function formatDateTime(value) {
      if (!value) {
        return "Ismeretlen dátum";
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "Ismeretlen dátum";
      }

      return date.toLocaleString("hu-HU");
    }

    function formatSpeed(bytesPerSecond) {
      if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
        return "0 MB/s";
      }
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
    }

    function formatEta(remainingBytes, speedBps) {
      if (!Number.isFinite(remainingBytes) || !Number.isFinite(speedBps) || speedBps <= 0) {
        return "∞";
      }
      const seconds = remainingBytes / speedBps;
      if (seconds < 1) {
        return "<1 s";
      }
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      }
      return `${secs}s`;
    }

    function ensureTransferPlaceholder() {
      if (!transferList) {
        return;
      }
      const hasCards = transferList.querySelector(".transfer-card");
      if (!hasCards && !transferList.querySelector(".transfer-empty")) {
        const placeholder = document.createElement("div");
        placeholder.className = "transfer-empty";
        placeholder.textContent = "Nincsenek aktív átviteli feladatok.";
        transferList.appendChild(placeholder);
      }
      if (hasCards) {
        transferList.querySelectorAll(".transfer-empty").forEach((el) => el.remove());
      }
    }

    function createTransferCard({ id, direction, name, size, mimeType, status }) {
      if (!transferList) {
        return null;
      }

      const card = document.createElement("article");
      card.className = "transfer-card";
      card.dataset.transferId = id;

      const header = document.createElement("div");
      header.className = "transfer-card__header";

      const icon = document.createElement("div");
      icon.className = `transfer-card__icon transfer-card__icon--${direction}`;
      icon.textContent = direction === "incoming" ? "⬇" : "⬆";

      const meta = document.createElement("div");
      meta.className = "transfer-card__meta";

      const filename = document.createElement("div");
      filename.className = "transfer-card__filename";
      filename.textContent = name || "Ismeretlen";

      const fileInfo = document.createElement("div");
      fileInfo.className = "transfer-card__filesize";
      fileInfo.textContent = `${formatFileSize(size)} • ${mimeType || "Ismeretlen"}`;

      meta.appendChild(filename);
      meta.appendChild(fileInfo);
      header.appendChild(icon);
      header.appendChild(meta);

      const statusEl = document.createElement("p");
      statusEl.className = "transfer-card__status";
      statusEl.textContent = status;

      const progress = document.createElement("div");
      progress.className = "transfer-progress";
      const progressFill = document.createElement("div");
      progressFill.className = "transfer-progress__fill";
      progress.appendChild(progressFill);

      const stats = document.createElement("div");
      stats.className = "transfer-stats";
      const speedEl = document.createElement("span");
      speedEl.textContent = "0 MB/s";
      const etaEl = document.createElement("span");
      etaEl.textContent = "ETA: ∞";
      stats.appendChild(speedEl);
      stats.appendChild(etaEl);

      const actions = document.createElement("div");
      actions.className = "transfer-actions";

      card.appendChild(header);
      card.appendChild(statusEl);
      card.appendChild(progress);
      card.appendChild(stats);
      card.appendChild(actions);

      transferList.prepend(card);
      ensureTransferPlaceholder();

      const transfer = {
        id,
        direction,
        name,
        size,
        mimeType,
        statusEl,
        progressFill,
        speedEl,
        etaEl,
        actions,
        card,
        conn: null,
        file: null,
        received: 0,
        chunks: [],
        startTime: null,
        isCancelled: false,
        completed: false,
      };

      transfers.set(id, transfer);
      return transfer;
    }

    function updateTransferStatus(transfer, text) {
      if (transfer?.statusEl) {
        transfer.statusEl.textContent = text;
      }
    }

    function updateTransferProgress(transfer, transferredBytes, totalBytes) {
      if (!transfer) {
        return;
      }
      if (Number.isFinite(transferredBytes) && Number.isFinite(totalBytes) && totalBytes > 0) {
        const percent = Math.min(100, Math.round((transferredBytes / totalBytes) * 100));
        if (transfer.progressFill) {
          transfer.progressFill.style.width = `${percent}%`;
        }
      }

      if (transfer.startTime) {
        const elapsedSeconds = (Date.now() - transfer.startTime) / 1000;
        const speedBps = elapsedSeconds > 0 ? transferredBytes / elapsedSeconds : 0;
        if (transfer.speedEl) {
          transfer.speedEl.textContent = formatSpeed(speedBps);
        }
        if (transfer.etaEl && Number.isFinite(totalBytes)) {
          const remaining = Math.max(0, totalBytes - transferredBytes);
          transfer.etaEl.textContent = `ETA: ${formatEta(remaining, speedBps)}`;
        }
      }
    }

    function finalizeTransfer(transfer, statusText) {
      updateTransferStatus(transfer, statusText);
      if (transfer?.actions) {
        transfer.actions.querySelectorAll("button").forEach((btn) => (btn.disabled = true));
      }
      if (transfer) {
        transfer.completed = true;
        if (transfer.chunkAckWaiter?.timeoutId) {
          clearTimeout(transfer.chunkAckWaiter.timeoutId);
        }
        if (transfer.chunkAckWaiter?.reject) {
          transfer.chunkAckWaiter.reject(new Error("Transfer ended"));
        }
        transfer.chunkAckWaiter = null;
        if (transfer.signalWaiters) {
          transfer.signalWaiters.forEach((waiter) => {
            if (waiter?.timeoutId) {
              clearTimeout(waiter.timeoutId);
            }
            if (waiter?.reject) {
              waiter.reject(new Error("Transfer ended"));
            }
          });
          transfer.signalWaiters.clear();
        }
      }
      ensureTransferPlaceholder();
    }

    function setTransferActions(transfer, buttons = []) {
      if (!transfer?.actions) {
        return;
      }
      transfer.actions.innerHTML = "";
      buttons.forEach((btn) => transfer.actions.appendChild(btn));
    }

    function createTransferButton(label, className, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `transfer-btn ${className}`;
      btn.textContent = label;
      if (onClick) {
        btn.addEventListener("click", onClick);
      }
      return btn;
    }

    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function startReceiverHeartbeat() {
      if (receiverHeartbeatTimer || !socket) {
        return;
      }

      receiverHeartbeatTimer = setInterval(() => {
        if (!socket || !socket.connected || !receiverToggle?.checked || !peerId) {
          return;
        }
        socket.emit("receiver_heartbeat", { peerId });
      }, RECEIVER_HEARTBEAT_INTERVAL_MS);
    }

    function stopReceiverHeartbeat() {
      if (receiverHeartbeatTimer) {
        clearInterval(receiverHeartbeatTimer);
        receiverHeartbeatTimer = null;
      }
    }

    function waitForSignalAck(transfer, ackType, timeoutMs = P2P_SIGNAL_TIMEOUT_MS) {
      if (!transfer) {
        return Promise.reject(new Error("Nincs aktív átvitel."));
      }

      transfer.signalWaiters = transfer.signalWaiters || new Map();
      const existing = transfer.signalWaiters.get(ackType);
      if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId);
      }

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          transfer.signalWaiters.delete(ackType);
          reject(new Error("Signal timeout"));
        }, timeoutMs);

        transfer.signalWaiters.set(ackType, { resolve, reject, timeoutId });
      });
    }

    function resolveSignalAck(transfer, ackType, payload) {
      if (!transfer?.signalWaiters) {
        return;
      }

      const waiter = transfer.signalWaiters.get(ackType);
      if (!waiter) {
        return;
      }

      if (waiter.timeoutId) {
        clearTimeout(waiter.timeoutId);
      }
      transfer.signalWaiters.delete(ackType);
      waiter.resolve(payload);
    }

    async function sendSignalWithRetry(conn, transfer, payload, ackType, options = {}) {
      const timeoutMs = options.timeoutMs ?? P2P_SIGNAL_TIMEOUT_MS;
      const retries = options.retries ?? P2P_SIGNAL_RETRY_LIMIT;
      const retryDelayMs = options.retryDelayMs ?? P2P_SIGNAL_RETRY_DELAY_MS;

      let attempt = 0;
      while (attempt <= retries && !transfer?.isCancelled) {
        conn.send(payload);
        try {
          const ack = await waitForSignalAck(transfer, ackType, timeoutMs);
          return ack;
        } catch (err) {
          attempt += 1;
          if (attempt > retries) {
            throw err;
          }
          await delay(retryDelayMs);
        }
      }

      throw new Error("Signal retry exceeded");
    }

    function resolveChunkAck(transfer, payload) {
      if (!transfer || !payload) {
        return;
      }

      const receivedBytes = Number(payload.receivedBytes);
      if (!Number.isFinite(receivedBytes)) {
        return;
      }

      const receivedChunks = Number(payload.receivedChunks) || 0;
      const final =
        Boolean(payload.final) ||
        (Number.isFinite(transfer.size) && receivedBytes >= transfer.size);

      transfer.lastAck = {
        receivedBytes,
        receivedChunks,
        final,
        timestamp: Date.now(),
      };

      const waiter = transfer.chunkAckWaiter;
      if (waiter && receivedBytes >= waiter.targetBytes) {
        if (waiter.timeoutId) {
          clearTimeout(waiter.timeoutId);
        }
        transfer.chunkAckWaiter = null;
        waiter.resolve(transfer.lastAck);
      }
    }

    function waitForChunkAck(transfer, targetBytes, timeoutMs = P2P_ACK_TIMEOUT_MS) {
      if (!transfer) {
        return Promise.reject(new Error("Nincs aktív átvitel."));
      }

      if (transfer.lastAck?.receivedBytes >= targetBytes) {
        return Promise.resolve(transfer.lastAck);
      }

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          transfer.chunkAckWaiter = null;
          reject(new Error("ACK timeout"));
        }, timeoutMs);

        transfer.chunkAckWaiter = { resolve, reject, targetBytes, timeoutId };
      });
    }

    async function waitForChunkAckWithRetry(transfer, conn, targetBytes) {
      let attempts = 0;

      while (attempts <= P2P_ACK_REQUEST_RETRY_LIMIT && !transfer?.isCancelled) {
        try {
          return await waitForChunkAck(transfer, targetBytes, P2P_ACK_TIMEOUT_MS);
        } catch (err) {
          attempts += 1;
          if (attempts > P2P_ACK_REQUEST_RETRY_LIMIT) {
            throw err;
          }
          if (conn?.open) {
            conn.send({ type: "ack_request", targetBytes });
          }
        }
      }

      throw new Error("ACK wait aborted");
    }

    function sendReceiverAck(conn, transfer) {
      if (!conn?.open || !transfer) {
        return;
      }

      const receivedBytes = Number(transfer.received) || 0;
      const receivedChunks = Number(transfer.receivedChunks) || 0;
      const final =
        Number.isFinite(transfer.size) ? receivedBytes >= transfer.size : false;

      conn.send({
        type: "ack",
        receivedBytes,
        receivedChunks,
        final,
      });

      transfer.lastAckBytes = receivedBytes;
      transfer.lastAckChunks = receivedChunks;
    }

    function finalizeIncomingTransfer(transfer, conn) {
      if (!transfer || transfer.completed || transfer.isCancelled) {
        return;
      }

      const expectedSize = Number.isFinite(transfer.size) ? transfer.size : null;
      if (expectedSize !== null && transfer.received < expectedSize) {
        console.error(
          "Átvitel sikertelen: a beérkezett méret nem egyezik a metaadatban lévő mérettel.",
        );
        finalizeTransfer(transfer, "Hiba: a fájl mérete nem stimmel, letöltés megszakítva.");
        if (conn?.open) {
          conn.send({
            type: "complete_ack",
            success: false,
            message: "Méreteltérés.",
          });
        }
        return;
      }

      let blob = new Blob(transfer.chunks, {
        type: transfer.mimeType || "application/octet-stream",
      });

      if (expectedSize !== null && transfer.received > expectedSize) {
        console.warn(
          "A beérkezett méret nagyobb a vártnál, a fájl mérete korrigálva lesz.",
        );
        blob = blob.slice(0, expectedSize, transfer.mimeType || "application/octet-stream");
      }
      const url = URL.createObjectURL(blob);
      transfer.chunks = [];
      transfer.downloadUrl = url;
      console.log("Fájl fogadva, mentésre vár", transfer.name);
      updateTransferProgress(
        transfer,
        transfer.size || transfer.received,
        transfer.size || transfer.received,
      );

      updateTransferStatus(transfer, "Átvitel kész. Kattints a Mentésre.");
      if (transfer?.actions) {
        transfer.actions.innerHTML = "";
      }

      const saveBtn = createTransferButton("💾 Mentés", "transfer-btn--accept", () => {
        if (!transfer.downloadUrl) {
          return;
        }
        const a = document.createElement("a");
        a.href = transfer.downloadUrl;
        a.download = transfer.name || "fajl";
        document.body.appendChild(a);
        a.click();
        a.remove();

        const urlToRevoke = transfer.downloadUrl;
        transfer.downloadUrl = null;
        setTimeout(() => {
          URL.revokeObjectURL(urlToRevoke);
        }, 4000);

        finalizeTransfer(transfer, "Fájl mentése elindítva.");
      });

      if (transfer?.actions) {
        transfer.actions.appendChild(saveBtn);
      }

      if (conn?.open) {
        conn.send({ type: "complete_ack", success: true });
      }
    }

    function getTransferByConn(conn) {
      if (!conn?.__transferId) {
        return null;
      }
      return transfers.get(conn.__transferId) || null;
    }

    function clearTransfers() {
      transfers.clear();
      if (transferList) {
        transferList.innerHTML = "";
      }
      ensureTransferPlaceholder();
    }

    function clearReceiverList() {
      if (receiverList) {
        receiverList.innerHTML = "";
      }
    }

    function handleReceiversUpdate(list) {
      if (!receiverList) {
        return;
      }

      const currentUserId = getCurrentUserId();
      receiverList.innerHTML = "";

      if (!Array.isArray(list) || list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "radar-empty";
        empty.textContent = "Nincs aktív fogadó.";
        receiverList.appendChild(empty);
        return;
      }

      const peers = list.filter((item) => item.userId !== currentUserId);
      if (!peers.length) {
        const empty = document.createElement("div");
        empty.className = "radar-empty";
        empty.textContent = "Nincs elérhető másik fogadó.";
        receiverList.appendChild(empty);
        return;
      }

      const radius = 250;
      peers.forEach((item, index) => {
        const angle = (2 * Math.PI * index) / peers.length - Math.PI / 2;
        const offsetY = radius * Math.sin(angle);
        const offsetX = radius * Math.cos(angle);
        const avatarUrl = item.profile_picture_filename
          ? `/uploads/avatars/${item.profile_picture_filename}`
          : "program_icons/default-avatar.png";

        const bubble = document.createElement("button");
        bubble.type = "button";
        bubble.className = "peer-avatar";
        bubble.dataset.peerId = item.peerId;
        bubble.dataset.username = item.username;
        bubble.style.top = `calc(50% + ${offsetY}px)`;
        bubble.style.left = `calc(50% + ${offsetX}px)`;
        bubble.style.transform = "translate(-50%, -50%)";

        const img = document.createElement("img");
        img.src = avatarUrl;
        img.alt = `${item.username} avatar`;
        bubble.appendChild(img);

        const name = document.createElement("span");
        name.className = "peer-name";
        name.textContent = item.username;
        bubble.appendChild(name);

        receiverList.appendChild(bubble);
      });
    }

    function ensureSocketConnection() {
      if (!isUserLoggedIn()) {
        return;
      }

      if (socket) {
        if (!socket.connected && socket.disconnected) {
          socket.connect();
        }
        return;
      }

      socket = io({
        auth: { token: getStoredToken() },
        transports: ["websocket"],
        upgrade: false,
        reconnection: true,
      });

      socket.on("connect", () => {
        updateReceiverStatus("Kapcsolódva a jelző szerverhez.");
        registerReceiverIfEnabled();
        startReceiverHeartbeat();
      });

      socket.on("connect_error", (err) => {
        console.error("Socket csatlakozási hiba:", err);
        updateReceiverStatus("Nem sikerült kapcsolódni a szerverhez (Socket hiba).");
      });

      socket.on("update_receivers_list", (list) => {
        handleReceiversUpdate(list);
      });

      socket.on("receiver_error", (payload) => {
        const message = payload && payload.message ? payload.message : "Ismeretlen hiba.";
        updateReceiverStatus(message);
      });

      socket.on("disconnect", () => {
        clearReceiverList();
        updateReceiverStatus("Kapcsolat bontva a jelző szerverrel.");
        stopReceiverHeartbeat();
      });
    }

    function ensurePeerConnection() {
      if (peer || !isUserLoggedIn()) {
        return;
      }

      peer = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
          iceCandidatePoolSize: 10,
        },
        debug: 1,
      });
      peer.on("open", (id) => {
        peerId = id;
        registerReceiverIfEnabled();
      });

      peer.on("connection", handleIncomingConnection);

      peer.on("disconnected", () => {
        peerId = null;
        if (typeof peer.reconnect === "function") {
          peer.reconnect();
        }
      });
    }

    function initializeRealtimeFeatures() {
      ensureSocketConnection();
      ensurePeerConnection();
    }

    function setupFileTransferUI() {
      setupRadarPanning();
      setupRadarZoom();
      updateSelfLabelText();

      if (receiverToggle) {
        const savedToggle = localStorage.getItem(RECEIVER_TOGGLE_KEY) === "true";
        receiverToggle.checked = savedToggle;

        receiverToggle.addEventListener("change", () => {
          localStorage.setItem(RECEIVER_TOGGLE_KEY, receiverToggle.checked ? "true" : "false");

          if (!isUserLoggedIn()) {
            updateReceiverStatus("A fogadó mód használatához jelentkezz be.");
            receiverToggle.checked = false;
            return;
          }

          initializeRealtimeFeatures();
          if (receiverToggle.checked) {
            registerReceiverIfEnabled();
          } else if (socket) {
            socket.emit("unregister_receiver");
            updateReceiverStatus("Fogadó mód kikapcsolva.");
            stopReceiverHeartbeat();
          }
        });

        if (savedToggle && isUserLoggedIn()) {
          initializeRealtimeFeatures();
          registerReceiverIfEnabled();
        }
      }

      if (receiverList) {
        receiverList.addEventListener("click", (event) => {
          const btn = event.target.closest("button[data-peer-id]");
          if (!btn) {
            return;
          }

          if (!isUserLoggedIn()) {
            updateReceiverStatus("A fájlküldéshez jelentkezz be.");
            return;
          }

          initializeRealtimeFeatures();
          selectedReceiver = {
            peerId: btn.dataset.peerId,
            username: btn.dataset.username,
          };
          if (p2pFileInput) {
            p2pFileInput.click();
          }
        });
      }

      if (p2pFileInput) {
        p2pFileInput.addEventListener("change", (event) => {
          const file = event.target.files[0];
          if (!file || !selectedReceiver) {
            return;
          }
          initializeRealtimeFeatures();
          startFileSend(selectedReceiver, file);
          event.target.value = "";
        });
      }

      ensureTransferPlaceholder();
    }

    setupFileTransferUI();

    function teardownRealtimeFeatures() {
      if (socket) {
        socket.emit("unregister_receiver");
        socket.disconnect();
        socket = null;
      }
      stopReceiverHeartbeat();
      if (peer) {
        peer.destroy();
        peer = null;
      }
      peerId = null;
      selectedReceiver = null;
      clearTransfers();
      clearReceiverList();
      if (receiverToggle) {
        receiverToggle.checked = false;
      }
    }

    function registerReceiverIfEnabled() {
      if (!receiverToggle || !receiverToggle.checked || !socket || !peerId || !isUserLoggedIn()) {
        return;
      }

      socket.emit("register_receiver", { token: getStoredToken(), peerId });
      updateReceiverStatus("Fogadó mód aktiválva.");
      startReceiverHeartbeat();
    }

    function handleIncomingConnection(conn) {
      conn.on("data", async (data) => {
        if (!data || typeof data !== "object") {
          return;
        }

        console.log("P2P adat érkezett", data.type, data);

        let transfer = getTransferByConn(conn);

        if (data.type === "meta") {
          if (transfer) {
            conn.send({ type: "meta_ack" });
            return;
          }

          const transferId = `incoming-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          transfer = createTransferCard({
            id: transferId,
            direction: "incoming",
            name: data.name,
            size: data.size,
            mimeType: data.mimeType,
            status: "Várakozás elfogadásra...",
          });

          if (!transfer) {
            return;
          }

          transfer.conn = conn;
          transfer.received = 0;
          transfer.receivedChunks = 0;
          transfer.seenSeqs = new Set();
          transfer.lastAckBytes = 0;
          transfer.lastAckChunks = 0;
          transfer.pendingComplete = false;
          transfer.finalByteReceived = false;
          transfer.isAccepted = false;
          conn.__transferId = transferId;

          conn.send({ type: "meta_ack" });

          const cancelBtn = createTransferButton("Mégse", "transfer-btn--cancel", () => {
            transfer.isCancelled = true;
            conn.send({ type: "cancel" });
            finalizeTransfer(transfer, "Fogadás megszakítva.");
            conn.close();
          });

          const acceptBtn = createTransferButton(
            "Elfogad (Letöltés)",
            "transfer-btn--accept",
            async () => {
              if (transfer.isCancelled || transfer.completed) {
                return;
              }
              transfer.isAccepted = true;
              transfer.startTime = Date.now();
              transfer.received = 0;
              transfer.receivedChunks = 0;
              transfer.chunks = [];
              updateTransferStatus(transfer, "Fogadás...");
              setTransferActions(transfer, [cancelBtn]);
              try {
                await sendSignalWithRetry(conn, transfer, { type: "accept" }, "accept_ack");
              } catch (err) {
                updateTransferStatus(transfer, "Elfogadás elküldve, várakozás a feladóra...");
              }

              if (Number(transfer.size) === 0) {
                transfer.finalByteReceived = true;
                sendReceiverAck(conn, transfer);
                if (transfer.pendingComplete) {
                  if (!transfer.finalizeScheduled) {
                    transfer.finalizeScheduled = true;
                    setTimeout(() => {
                      transfer.finalizeScheduled = false;
                      finalizeIncomingTransfer(transfer, conn);
                    }, 0);
                  }
                }
              }
            },
          );

          const rejectBtn = createTransferButton("Elutasít", "transfer-btn--reject", () => {
            transfer.isCancelled = true;
            conn.send({ type: "reject" });
            finalizeTransfer(transfer, "A fájlátvitel elutasítva.");
            conn.close();
          });

          setTransferActions(transfer, [acceptBtn, rejectBtn]);
          updateTransferStatus(transfer, "Várakozás elfogadásra...");

          return;
        }

        if (!transfer) {
          return;
        }

        if (data.type === "accept_ack") {
          resolveSignalAck(transfer, "accept_ack", data);
          return;
        }

        if (data.type === "ack_request") {
          sendReceiverAck(conn, transfer);
          return;
        }

        if (data.type === "chunk") {
          if (transfer.isCancelled) {
            return;
          }
          if (!transfer.startTime) {
            transfer.startTime = Date.now();
          }

          const chunkBuffer =
            data.data instanceof ArrayBuffer
              ? data.data
              : data.data?.buffer instanceof ArrayBuffer
                ? data.data.buffer
                : null;

          if (!chunkBuffer) {
            console.warn("Érvénytelen chunk érkezett, kihagyva.");
            return;
          }

          const seq = data.seq;
          if (transfer.seenSeqs) {
            if (transfer.seenSeqs.has(seq)) {
              return;
            }
            transfer.seenSeqs.add(seq);
          }

          transfer.chunks.push(chunkBuffer);
          transfer.received += chunkBuffer.byteLength;
          transfer.receivedChunks = (transfer.receivedChunks || 0) + 1;

          if (transfer.size) {
            const percent = Math.min(100, Math.round((transfer.received / transfer.size) * 100));
            updateTransferStatus(transfer, `Fogadás: ${percent}%`);
          } else {
            updateTransferStatus(transfer, "Fogadás...");
          }

          updateTransferProgress(transfer, transfer.received, transfer.size || transfer.received);

          const shouldAck =
            transfer.received - (transfer.lastAckBytes || 0) >= P2P_ACK_EVERY_BYTES ||
            transfer.receivedChunks - (transfer.lastAckChunks || 0) >= P2P_ACK_EVERY_CHUNKS ||
            (Number.isFinite(transfer.size) && transfer.received >= transfer.size);

          if (shouldAck) {
            sendReceiverAck(conn, transfer);
          }

          if (Number.isFinite(transfer.size) && transfer.received >= transfer.size) {
            transfer.finalByteReceived = true;
          }

          if (
            Number.isFinite(transfer.size) &&
            transfer.received === transfer.size &&
            transfer.pendingComplete
          ) {
            if (!transfer.finalizeScheduled) {
              transfer.finalizeScheduled = true;
              setTimeout(() => {
                transfer.finalizeScheduled = false;
                finalizeIncomingTransfer(transfer, conn);
              }, 0);
            }
          }

          return;
        }

        if (data.type === "complete") {
          if (transfer.completed) {
            if (conn?.open) {
              conn.send({ type: "complete_ack", success: true });
            }
            return;
          }

          if (Number.isFinite(transfer.size) && transfer.received < transfer.size) {
            transfer.pendingComplete = true;
            updateTransferStatus(transfer, "Véglegesítésre vár...");
            return;
          }

          transfer.pendingComplete = true;
          if (!transfer.finalizeScheduled) {
            transfer.finalizeScheduled = true;
            setTimeout(() => {
              transfer.finalizeScheduled = false;
              finalizeIncomingTransfer(transfer, conn);
            }, 0);
          }
          return;
        }

        if (data.type === "reject") {
          finalizeTransfer(transfer, "A fogadó elutasította a küldést.");
          return;
        }

        if (data.type === "cancel") {
          transfer.isCancelled = true;
          finalizeTransfer(transfer, "A feladó megszakította az átvitelt.");
          conn.close();
        }
      });

      conn.on("close", () => {
        const transfer = getTransferByConn(conn);
        if (transfer && !transfer.completed && !transfer.isCancelled) {
          finalizeTransfer(transfer, "Megszakadt a kapcsolat.");
        }
      });

      conn.on("error", (err) => {
        console.error("P2P hiba:", err);
        const transfer = getTransferByConn(conn);
        if (transfer && !transfer.completed) {
          finalizeTransfer(transfer, "Hiba történt a P2P kapcsolatban.");
        }
      });
    }

    async function sendFileChunks(transfer) {
      if (!transfer?.conn || !transfer.file) {
        return;
      }

      const { conn, file } = transfer;
      const chunkSize = P2P_CHUNK_SIZE;
      const bufferedThreshold = P2P_BUFFERED_THRESHOLD;
      const batchBytesTarget = P2P_ACK_EVERY_BYTES;
      let chunksSent = 0;
      let offset = 0;
      transfer.startTime = transfer.startTime || Date.now();
      transfer.lastAck = transfer.lastAck || { receivedBytes: 0, receivedChunks: 0, final: false };

      while (offset < file.size) {
        if (transfer.isCancelled) {
          finalizeTransfer(transfer, "Küldés megszakítva.");
          return;
        }

        let batchBytesSent = 0;
        let batchChunksSent = 0;

        while (offset < file.size && batchBytesSent < batchBytesTarget) {
          while ((conn.dataChannel?.bufferedAmount ?? 0) > bufferedThreshold) {
            await delay(15);
            if (transfer.isCancelled) {
              finalizeTransfer(transfer, "Küldés megszakítva.");
              return;
            }
          }

          const slice = file.slice(offset, offset + chunkSize);
          const buffer = await slice.arrayBuffer();
          if (!conn.open) {
            throw new Error("A kapcsolat megszakadt a küldés közben.");
          }
          conn.send({ type: "chunk", data: buffer, seq: chunksSent });
          offset += buffer.byteLength;
          chunksSent += 1;
          batchBytesSent += buffer.byteLength;
          batchChunksSent += 1;
          transfer.sentBytes = offset;
          transfer.sentChunks = chunksSent;

          if (chunksSent % 50 === 0 || offset >= file.size) {
            const percent = Math.min(100, Math.round((offset / file.size) * 100));
            updateTransferStatus(transfer, `Küldés: ${percent}%`);
            updateTransferProgress(transfer, offset, file.size);
          }
        }

        updateTransferStatus(transfer, "Batch elküldve, ACK kérés...");
        if (conn.open) {
          conn.send({ type: "ack_request", targetBytes: offset, targetChunks: chunksSent });
        }

        updateTransferStatus(transfer, "Várakozás a fogadó visszaigazolására...");
        try {
          await waitForChunkAckWithRetry(transfer, conn, offset);
        } catch (err) {
          transfer.isCancelled = true;
          finalizeTransfer(transfer, "A fogadó nem válaszol, az átvitel megszakadt.");
          conn.close();
          return;
        }
      }

      if (transfer.isCancelled) {
        return;
      }

      try {
        await waitForChunkAckWithRetry(transfer, conn, file.size);
      } catch (err) {
        transfer.isCancelled = true;
        finalizeTransfer(transfer, "Nem érkezett végleges visszaigazolás.");
        conn.close();
        return;
      }

      updateTransferStatus(transfer, "Átvitel lezárása...");

      try {
        const ack = await sendSignalWithRetry(conn, transfer, { type: "complete" }, "complete_ack");
        if (ack && ack.success === false) {
          finalizeTransfer(transfer, "A fogadó hibát jelzett a lezárásnál.");
          return;
        }
        updateTransferProgress(transfer, file.size, file.size);
        finalizeTransfer(transfer, "Fájl sikeresen elküldve.");
      } catch (err) {
        finalizeTransfer(transfer, "Nem sikerült lezárni az átvitelt.");
      }
    }

    function startFileSend(receiver, file) {
      if (!peer) {
        updateReceiverStatus("A kapcsolat még nem állt fel. Próbáld újra.");
        return;
      }

      const conn = peer.connect(receiver.peerId, {
        reliable: true,
        serialization: "binary",
        metadata: { type: "file-transfer-request" },
      });
      const transferId = `outgoing-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const safeName = file?.name || "ismeretlen_fajl";
      const safeSize = typeof file?.size === "number" ? file.size : 0;
      const safeType =
        file?.type && file.type.trim() !== "" ? file.type : "application/octet-stream";

      const transfer = createTransferCard({
        id: transferId,
        direction: "outgoing",
        name: safeName,
        size: safeSize,
        mimeType: safeType,
        status: `Kapcsolódás ${receiver.username} felé...`,
      });

      if (!transfer) {
        return;
      }

      transfer.conn = conn;
      transfer.file = file;
      transfer.lastAck = { receivedBytes: 0, receivedChunks: 0, final: false };
      transfer.isSending = false;
      conn.__transferId = transferId;

      const cancelBtn = createTransferButton("Mégse", "transfer-btn--cancel", () => {
        transfer.isCancelled = true;
        conn.send({ type: "cancel" });
        finalizeTransfer(transfer, "Küldés megszakítva.");
        conn.close();
      });
      setTransferActions(transfer, [cancelBtn]);

      const connectionTimeout = setTimeout(() => {
        transfer.isCancelled = true;
        finalizeTransfer(
          transfer,
          "Nem sikerült kapcsolódni 45 másodpercen belül (NAT/Tűzfal hiba lehet).",
        );
        conn.close();
      }, 45000);

      conn.on("open", async () => {
        clearTimeout(connectionTimeout);
        updateTransferStatus(transfer, "Kapcsolat létrejött, metaadat küldése...");
        try {
          await sendSignalWithRetry(
            conn,
            transfer,
            { type: "meta", name: safeName, size: safeSize, mimeType: safeType },
            "meta_ack",
          );
          updateTransferStatus(transfer, "Várakozás a fogadó válaszára...");
        } catch (err) {
          transfer.isCancelled = true;
          finalizeTransfer(transfer, "Nem sikerült elküldeni a metaadatokat.");
          conn.close();
        }
      });

      conn.on("data", async (data) => {
        if (!data || typeof data !== "object") {
          return;
        }

        if (data.type === "meta_ack") {
          resolveSignalAck(transfer, "meta_ack", data);
          return;
        }

        if (data.type === "ack") {
          resolveChunkAck(transfer, data);
          return;
        }

        if (data.type === "complete_ack") {
          resolveSignalAck(transfer, "complete_ack", data);
          return;
        }

        if (data.type === "accept") {
          conn.send({ type: "accept_ack" });
          if (transfer.isSending) {
            return;
          }
          transfer.isSending = true;
          updateTransferStatus(transfer, "Fogadó elfogadta, küldés indul...");
          transfer.startTime = Date.now();
          try {
            await sendFileChunks(transfer);
          } catch (err) {
            transfer.isCancelled = true;
            finalizeTransfer(transfer, "Hiba történt a küldés közben.");
            conn.close();
          }
          return;
        }

        if (data.type === "reject") {
          transfer.isCancelled = true;
          finalizeTransfer(transfer, "A címzett elutasította a küldést.");
        }
        if (data.type === "cancel") {
          transfer.isCancelled = true;
          finalizeTransfer(transfer, "A címzett megszakította az átvitelt.");
        }
      });

      conn.on("close", () => {
        clearTimeout(connectionTimeout);
        if (!transfer.completed && !transfer.isCancelled) {
          finalizeTransfer(transfer, "Megszakadt a kapcsolat.");
        }
      });

      conn.on("error", (err) => {
        console.error("P2P hiba:", err);
        clearTimeout(connectionTimeout);
        if (!transfer.completed) {
          finalizeTransfer(transfer, "Hiba történt a P2P kapcsolatban.");
        }
      });
    }

    function getStoredToken() {
      return localStorage.getItem(SESSION_KEYS.token);
    }

    function isUserLoggedIn() {
      return !!getStoredToken();
    }

    function buildAuthHeaders() {
      const token = getStoredToken();
      if (!token) {
        return {};
      }
      return {
        Authorization: `Bearer ${token}`,
      };
    }

    if (savePermissionsBtn) {
      savePermissionsBtn.disabled = true;
    }

    function openLoginModal() {
      if (loginForm) {
        loginForm.reset();
      }
      loginModal.style.display = "flex";
    }

    function createOptionRow(value = "") {
      const row = document.createElement("div");
      row.className = "poll-option-row";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "poll-option-input";
      input.placeholder = "Válaszlehetőség";
      input.required = true;
      input.value = value;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "poll-option-remove";
      removeBtn.setAttribute("aria-label", "Válaszlehetőség törlése");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        if (!optionsContainer) {
          return;
        }
        row.remove();
        ensureMinimumOptionRows();
        updateOptionRemoveButtons();
      });

      row.appendChild(input);
      row.appendChild(removeBtn);

      return row;
    }

    function updateOptionRemoveButtons() {
      if (!optionsContainer) {
        return;
      }

      const rows = optionsContainer.querySelectorAll(".poll-option-row");
      rows.forEach((row) => {
        const removeBtn = row.querySelector(".poll-option-remove");
        if (removeBtn) {
          removeBtn.disabled = rows.length <= POLL_MIN_OPTIONS;
        }
      });
    }

    function addOptionRow(value = "") {
      if (!optionsContainer) {
        return null;
      }

      const row = createOptionRow(value);
      optionsContainer.appendChild(row);
      updateOptionRemoveButtons();
      return row;
    }

    function ensureMinimumOptionRows() {
      if (!optionsContainer) {
        return;
      }

      const currentRows = optionsContainer.querySelectorAll(".poll-option-row").length;
      const missing = POLL_MIN_OPTIONS - currentRows;

      if (missing > 0) {
        for (let i = 0; i < missing; i += 1) {
          addOptionRow();
        }
      }

      updateOptionRemoveButtons();
    }

    function resetPollForm() {
      if (createPollForm) {
        createPollForm.reset();
      }

      if (optionsContainer) {
        optionsContainer.innerHTML = "";
      }

      ensureMinimumOptionRows();
    }

    function updatePollCreatorState(forceLoggedInState) {
      if (!pollCreator || !createPollForm) {
        return;
      }

      const loggedIn =
        typeof forceLoggedInState === "boolean" ? forceLoggedInState : isUserLoggedIn();

      if (loggedIn) {
        createPollForm.style.display = "block";
        if (pollCreatorNotice) {
          pollCreatorNotice.textContent =
            "Adj meg egy kérdést és legalább két válaszlehetőséget.";
        }
        ensureMinimumOptionRows();
      } else {
        createPollForm.style.display = "none";
        if (pollCreatorNotice) {
          pollCreatorNotice.textContent =
            "Szavazást létrehozni csak bejelentkezett felhasználók tudnak.";
        }
      }
    }

    function renderPoll(poll) {
        const card = document.createElement("div");
        card.className = "poll-card";

        const header = document.createElement("div");
        header.className = "poll-card-header";

        const title = document.createElement("h3");
        title.textContent = poll?.question || "Szavazás";
        header.appendChild(title);

        const status = document.createElement("span");
        status.className = `poll-status ${poll?.is_active ? "poll-status--active" : "poll-status--closed"}`;
        status.textContent = poll?.is_active ? "Aktív" : "Lezárt";
        header.appendChild(status);

        card.appendChild(header);

        const creatorName = poll?.creator_username || "Ismeretlen";
        const meta = document.createElement("div");
        meta.className = "poll-meta";
        let metaText = `Létrehozta: ${creatorName}`;
        if (poll?.created_at) {
            const createdAt = new Date(poll.created_at);
            if (!Number.isNaN(createdAt.valueOf())) {
                metaText += ` • ${createdAt.toLocaleString("hu-HU")}`;
            }
        }
        meta.textContent = metaText;
        card.appendChild(meta);

        if (poll?.is_active && !isUserLoggedIn()) {
            const notice = document.createElement("div");
            notice.className = "poll-hint";
            notice.textContent = "Szavazni csak bejelentkezett felhasználók tudnak.";
            card.appendChild(notice);
        }

        const optionsWrapper = document.createElement("div");
        optionsWrapper.className = "poll-options-results";

        const totalVotes = Number(poll?.totalVotes) || 0;

        if (Array.isArray(poll?.options)) {
            poll.options.forEach((option) => {
                const optionResult = document.createElement("div");
                optionResult.className = "poll-option-result";
                if (poll?.userVoteOptionId === option.id) {
                    optionResult.classList.add("poll-option-result--selected");
                }

                const headerRow = document.createElement("div");
                headerRow.className = "poll-option-header";

                const label = document.createElement("div");
                label.className = "poll-option-label";
                label.textContent = option?.option_text || "Válaszlehetőség";
                headerRow.appendChild(label);

                const count = document.createElement("div");
                count.className = "poll-option-count";
                const votes = Number(option?.vote_count) || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                count.textContent = `${votes} szavazat (${percentage}%)`;
                headerRow.appendChild(count);

                if (poll?.is_active && !poll?.userVoteOptionId && isUserLoggedIn()) {
                    const voteBtn = document.createElement("button");
                    voteBtn.type = "button";
                    voteBtn.className = "poll-button poll-vote-btn";
                    voteBtn.textContent = "Szavazok";
                    voteBtn.addEventListener("click", () => handlePollVote(poll.id, option.id, voteBtn));
                    headerRow.appendChild(voteBtn);
                } else if (poll?.userVoteOptionId === option.id) {
                    const badge = document.createElement("span");
                    badge.className = "poll-badge";
                    badge.textContent = "Szavazatod";
                    headerRow.appendChild(badge);
                }

                optionResult.appendChild(headerRow);

                const bar = document.createElement("div");
                bar.className = "poll-result-bar";
                const fill = document.createElement("div");
                fill.className = "poll-result-bar-fill";
                const fillWidth = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                fill.style.width = `${fillWidth}%`;
                bar.appendChild(fill);
                optionResult.appendChild(bar);

                const votersElement = document.createElement("div");
                votersElement.className = "poll-voters";
                if (Array.isArray(option?.voters) && option.voters.length > 0) {
                    const names = option.voters
                        .map((voter) => voter?.username || `#${voter?.id ?? "?"}`)
                        .join(", ");
                    votersElement.textContent = `Szavaztak: ${names}`;
                } else {
                    votersElement.textContent = "Még nincs szavazat.";
                }
                optionResult.appendChild(votersElement);

                optionsWrapper.appendChild(optionResult);
            });
        }

        card.appendChild(optionsWrapper);

        const totalVotesInfo = document.createElement("div");
        totalVotesInfo.className = "poll-total-votes";
        totalVotesInfo.textContent = `Összes szavazat: ${totalVotes}`;
        card.appendChild(totalVotesInfo);

        const actions = document.createElement("div");
        actions.className = "poll-actions";
        let hasAction = false;

        if (poll?.canClose) {
            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.className = "poll-button poll-secondary-btn";
            closeBtn.textContent = "Szavazás lezárása";
            closeBtn.addEventListener("click", () => handleClosePoll(poll.id, closeBtn));
            actions.appendChild(closeBtn);
            hasAction = true;
        }

        if (isAdminUser()) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "poll-button poll-close-btn";
            deleteBtn.textContent = "Törlés (Admin)";
            deleteBtn.addEventListener("click", () => handleDeletePoll(poll.id, deleteBtn));
            actions.appendChild(deleteBtn);
            hasAction = true;
        }

        if (hasAction) {
            card.appendChild(actions);
        }

        return card;
    }

    async function loadPolls() {
      if (!pollListContainer) {
        return;
      }

      pollsShouldRefresh = false;

      pollListContainer.innerHTML = "";
      const loadingElement = document.createElement("div");
      loadingElement.className = "poll-empty";
      loadingElement.textContent = "Szavazások betöltése...";
      pollListContainer.appendChild(loadingElement);

      try {
        const response = await fetch("/api/polls", { headers: buildAuthHeaders() });

        if (!response.ok) {
          throw new Error("Nem sikerült betölteni a szavazásokat.");
        }

        const polls = await response.json();
        pollListContainer.innerHTML = "";

        if (!Array.isArray(polls) || polls.length === 0) {
          const emptyElement = document.createElement("div");
          emptyElement.className = "poll-empty";
          emptyElement.textContent = "Jelenleg nincs aktív szavazás.";
          pollListContainer.appendChild(emptyElement);
          return;
        }

        polls.forEach((poll) => {
          pollListContainer.appendChild(renderPoll(poll));
        });
      } catch (error) {
        console.error("Szavazások betöltési hiba:", error);
        pollListContainer.innerHTML = "";
        const errorElement = document.createElement("div");
        errorElement.className = "poll-empty";
        errorElement.textContent = "Nem sikerült betölteni a szavazásokat.";
        pollListContainer.appendChild(errorElement);
      }
    }

    async function handlePollVote(pollId, optionId, button) {
      if (!isUserLoggedIn()) {
        alert("Szavazáshoz be kell jelentkezned.");
        if (typeof openLoginModal === "function") {
          openLoginModal();
        }
        return;
      }

      const originalText = button ? button.textContent : "";
      if (button) {
        button.disabled = true;
        button.textContent = "Küldés...";
      }

      try {
        const response = await fetch(`/api/polls/${pollId}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({ optionId }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            payload && payload.message
              ? payload.message
              : "Nem sikerült rögzíteni a szavazatot.";
          throw new Error(message);
        }

        await loadPolls();
      } catch (error) {
        console.error("Szavazat mentési hiba:", error);
        alert(error.message || "Nem sikerült rögzíteni a szavazatot.");
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText || "Szavazok";
        }
      }
    }

    async function handleClosePoll(pollId, button) {
      if (!isUserLoggedIn()) {
        alert("A szavazás lezárásához be kell jelentkezned.");
        if (typeof openLoginModal === "function") {
          openLoginModal();
        }
        return;
      }

      if (!confirm("Biztosan lezárod a szavazást?")) {
        return;
      }

      const originalText = button ? button.textContent : "";
      if (button) {
        button.disabled = true;
        button.textContent = "Lezárás...";
      }

      try {
        const response = await fetch(`/api/polls/${pollId}/close`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            payload && payload.message
              ? payload.message
              : "Nem sikerült lezárni a szavazást.";
          throw new Error(message);
        }

        await loadPolls();
      } catch (error) {
        console.error("Szavazás lezárási hiba:", error);
        alert(error.message || "Nem sikerült lezárni a szavazást.");
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText || "Szavazás lezárása";
        }
      }
    }
    async function handleDeletePoll(pollId, button) {
        if (!isUserLoggedIn() || !isAdminUser()) {
            alert("Csak adminisztrátorok törölhetnek szavazásokat.");
            return;
        }

        if (!confirm("Biztosan törlöd ezt a szavazást? Ez a művelet nem vonható vissza.")) {
            return;
        }

        const originalText = button ? button.textContent : "";
        if (button) {
            button.disabled = true;
            button.textContent = "Törlés...";
        }

        try {
            const response = await fetch(`/api/polls/${pollId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    ...buildAuthHeaders(),
                },
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message =
                    payload && payload.message
                        ? payload.message
                        : "Nem sikerült törölni a szavazást.";
                throw new Error(message);
            }

            await loadPolls();
        } catch (error) {
            console.error("Szavazás törlési hiba:", error);
            alert(error.message || "Nem sikerült törölni a szavazást.");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText || "Törlés (Admin)";
            }
        }
    }

    if (addOptionBtn) {
      addOptionBtn.addEventListener("click", () => {
        if (!isUserLoggedIn()) {
          alert("Szavazást létrehozni csak bejelentkezve tudsz.");
          if (typeof openLoginModal === "function") {
            openLoginModal();
          }
          return;
        }

        addOptionRow();
      });
    }

    if (createPollForm) {
      createPollForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!isUserLoggedIn()) {
          alert("Szavazást létrehozni csak bejelentkezve tudsz.");
          if (typeof openLoginModal === "function") {
            openLoginModal();
          }
          return;
        }

        const question = questionInput ? questionInput.value.trim() : "";
        const optionInputs = optionsContainer
          ? Array.from(optionsContainer.querySelectorAll(".poll-option-input"))
          : [];
        const optionValues = optionInputs.map((input) => input.value.trim()).filter(Boolean);

        const uniqueOptions = [];
        const seenOptions = new Set();
        optionValues.forEach((option) => {
          const key = option.toLowerCase();
          if (!seenOptions.has(key)) {
            seenOptions.add(key);
            uniqueOptions.push(option);
          }
        });

        if (!question || uniqueOptions.length < POLL_MIN_OPTIONS) {
          alert("Adj meg egy kérdést és legalább két különböző válaszlehetőséget!");
          return;
        }

        const submitButton = createPollForm.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : "";

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Létrehozás...";
        }

        try {
          const response = await fetch("/api/polls", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...buildAuthHeaders(),
            },
            body: JSON.stringify({ question, options: uniqueOptions }),
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            const message =
              payload && payload.message
                ? payload.message
                : "Nem sikerült létrehozni a szavazást.";
            throw new Error(message);
          }

          resetPollForm();
          updatePollCreatorState(true);
          await loadPolls();
        } catch (error) {
          console.error("Szavazás létrehozási hiba:", error);
          alert(error.message || "Nem sikerült létrehozni a szavazást.");
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText || "Szavazás létrehozása";
          }
        }
      });
    }

    ensureMinimumOptionRows();
    updatePollCreatorState();
    markPollsForRefresh();

    if (programFileInput && programFileName) {
      programFileInput.addEventListener("change", () => {
        const file = programFileInput.files?.[0];
        programFileName.textContent = file ? file.name : "Nincs kiválasztva fájl.";
      });
    }

    if (programImageInput && programImagePreview) {
      programImageInput.addEventListener("change", () => {
        const file = programImageInput.files?.[0];

        if (programImageCropper) {
          programImageCropper.destroy();
          programImageCropper = null;
        }

        if (programImageObjectUrl) {
          URL.revokeObjectURL(programImageObjectUrl);
          programImageObjectUrl = null;
        }

        if (!file) {
          programImagePreview.removeAttribute("src");
          return;
        }

        programImageObjectUrl = URL.createObjectURL(file);
        programImagePreview.src = programImageObjectUrl;
        programImageCropper = new Cropper(programImagePreview, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: "move",
          background: false,
          autoCropArea: 1,
          responsive: true,
        });
      });
    }

      function openProgramUploadModal() {
        if (!isAdminUser()) {
          alert("Csak adminok tölthetnek fel új programokat.");
          return;
        }

        setProgramUploadMode("create");
        resetProgramUploadModal();
        if (programUploadModal) {
          programUploadModal.style.display = "flex";
        }
      }

      function openProgramEditModal(program) {
        if (!isAdminUser()) {
          alert("Csak admin szerkeszthet programot.");
          return;
        }

        if (!program || !program.id) {
          return;
        }

        resetProgramUploadModal();
        setProgramUploadMode("edit", program);

        if (programNameInput) {
          programNameInput.value = program.name || "";
        }

        if (programDescriptionInput) {
          programDescriptionInput.value = program.description || "";
        }

        if (programFileName) {
          programFileName.textContent = program.original_filename || "Nincs kiválasztva fájl.";
        }

        if (programImagePreview) {
          if (program.image_filename) {
            programImagePreview.src = `/uploads/programs/images/${program.image_filename}`;
          } else {
            programImagePreview.removeAttribute("src");
          }
        }

        if (programUploadModal) {
          programUploadModal.style.display = "flex";
        }
      }

    if (addProgramBtn) {
      addProgramBtn.addEventListener("click", openProgramUploadModal);
    }

    if (closeProgramUploadModalBtn) {
      closeProgramUploadModalBtn.addEventListener("click", () => {
        closeProgramUploadModal();
      });
    }

    if (cancelProgramUploadBtn) {
      cancelProgramUploadBtn.addEventListener("click", () => {
        closeProgramUploadModal();
      });
    }

    if (programUploadModal) {
      programUploadModal.addEventListener("click", (event) => {
        if (event.target === programUploadModal) {
          closeProgramUploadModal();
        }
      });
    }

    if (programUploadForm) {
      programUploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!isAdminUser()) {
          alert("Csak adminok menthetnek programokat.");
          return;
        }

        const isEditMode = Boolean(editingProgram && editingProgram.id);
        const name = programNameInput?.value.trim();
        const description = programDescriptionInput?.value.trim();
        const file = programFileInput?.files?.[0];

        if (!name || !description) {
          alert("A név és a leírás megadása kötelező.");
          return;
        }

        if (!file && !isEditMode) {
          alert("Válassz ki egy feltöltendő program fájlt.");
          return;
        }

        let imageBlob = null;
        try {
          if (programImageCropper) {
            imageBlob = await new Promise((resolve, reject) => {
              const canvas = programImageCropper.getCroppedCanvas({
                width: 1200,
                height: 1200,
              });
              if (!canvas) {
                reject(new Error("Nem sikerült a kép vágása."));
                return;
              }
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Nem sikerült a kép vágása."));
                }
              }, "image/png");
            });
          } else if (programImageInput?.files?.[0]) {
            imageBlob = programImageInput.files[0];
          }
        } catch (error) {
          console.error("Kép feldolgozási hiba:", error);
          alert(error.message || "Nem sikerült feldolgozni a képet.");
          return;
        }

        if (!imageBlob && !isEditMode) {
          alert("Adj meg egy borítóképet a programhoz.");
          return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        if (imageBlob) {
          formData.append("image", imageBlob, "program-image.png");
        }
        if (file) {
          formData.append("file", file);
        }

        const endpoint = isEditMode ? `/api/programs/${editingProgram.id}` : "/api/programs";
        const method = isEditMode ? "PUT" : "POST";

        const originalText = submitProgramUploadBtn?.textContent;
        if (submitProgramUploadBtn) {
          submitProgramUploadBtn.disabled = true;
          submitProgramUploadBtn.textContent = isEditMode ? "Frissítés..." : "Mentés...";
        }

        try {
          const response = await fetch(endpoint, {
            method,
            headers: buildAuthHeaders(),
            body: formData,
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            const message = payload?.message || (isEditMode ? "Nem sikerült frissíteni a programot." : "Nem sikerült menteni a programot.");
            throw new Error(message);
          }

          closeProgramUploadModal();
          await loadPrograms();
        } catch (error) {
          console.error("Program feltöltési hiba:", error);
          alert(error.message || "Nem sikerült feltölteni a programot.");
        } finally {
          if (submitProgramUploadBtn) {
            submitProgramUploadBtn.disabled = false;
            submitProgramUploadBtn.textContent = originalText || "Mentés";
          }
        }
      });
    }

      function updateAdminNavVisibility() {
        updateAdminPreviewToggle();
        const isAdmin = isAdminUser();

        if (adminNavBtn) {
          adminNavBtn.style.display = isAdmin ? "inline-block" : "none";
        }

        updateProgramAdminControls();

        if (createTagWrapper) {
          createTagWrapper.style.display = isAdmin ? "block" : "none";
        }

        if (!isAdmin) {
          const activeSection = document.querySelector("main section.active");
          if (
            activeSection &&
          typeof ADMIN_ONLY_SECTIONS !== "undefined" &&
          ADMIN_ONLY_SECTIONS.has(activeSection.id)
        ) {
          showSection("home");
        }
        if (userListContainer) {
          userListContainer.innerHTML = "";
        }
        if (savePermissionsBtn) {
          savePermissionsBtn.disabled = true;
        }
      }
    }

    function updateFileTransferNavVisibility() {
      const hasAccess = hasFileTransferPermission();

      if (fileTransferNavBtn) {
        fileTransferNavBtn.style.display = hasAccess ? "inline-block" : "none";
      }

      if (!hasAccess) {
        const activeSection = document.querySelector("main section.active");
        if (activeSection && activeSection.id === "fajlkuldes") {
          showSection("home");
        }
      }
    }

    function updateUIForLoggedIn(username, profilePictureFilename) {
      if (userGreeting) {
        userGreeting.textContent = username;
      }

      updateSelfLabelText(username);

      const avatarUrl = profilePictureFilename ? `/uploads/avatars/${profilePictureFilename}` : 'program_icons/default-avatar.png';
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) {
        userAvatar.src = avatarUrl;
      }
      if (selfAvatar) {
        selfAvatar.src = avatarUrl;
      }
      const profileAvatarPreview = document.getElementById('profileAvatarPreview');
      if (profileAvatarPreview && !profileAvatarPreview.dataset.override) {
        profileAvatarPreview.src = avatarUrl;
      }

      const newUsernameInput = document.getElementById('newUsername');
      if (newUsernameInput && document.activeElement !== newUsernameInput) {
        newUsernameInput.value = username || '';
      }

      if (authLoggedOut) {
        authLoggedOut.style.display = "none";
      }
      if (authLoggedIn) {
        authLoggedIn.style.display = "flex";
      }

      applyAdminPreviewState();
      markPollsForRefresh();
      loadPrograms();

      if (hasFileTransferPermission()) {
        initializeRealtimeFeatures();
        updateReceiverStatus("Kapcsolódj a fogadó módhoz a kapcsolóval.");
      } else {
        teardownRealtimeFeatures();
        updateReceiverStatus("Nincs jogosultságod a fájlküldéshez.");
      }
    }

    function updateUIForLoggedOut() {
      // Clear session data from localStorage
      localStorage.removeItem(SESSION_KEYS.token);
      localStorage.removeItem(SESSION_KEYS.username);
      localStorage.removeItem(SESSION_KEYS.isAdmin);
      localStorage.removeItem(ADMIN_PREVIEW_KEY);
      localStorage.removeItem(SESSION_KEYS.canTransfer);
      localStorage.removeItem(SESSION_KEYS.canViewClips);
      localStorage.removeItem(SESSION_KEYS.profilePictureFilename);

      if (authLoggedOut) {
        authLoggedOut.style.display = "flex";
      }
      if (authLoggedIn) {
        authLoggedIn.style.display = "none";
      }
      if (userGreeting) {
        userGreeting.textContent = "";
      }
      updateSelfLabelText();
      const profileAvatarPreview = document.getElementById('profileAvatarPreview');
      if (profileAvatarPreview) {
        delete profileAvatarPreview.dataset.override;
        profileAvatarPreview.src = 'program_icons/default-avatar.png';
      }
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) {
        userAvatar.src = 'program_icons/default-avatar.png';
      }
      if (selfAvatar) {
        selfAvatar.src = 'program_icons/default-avatar.png';
      }
      const newUsernameInput = document.getElementById('newUsername');
      if (newUsernameInput) {
        newUsernameInput.value = '';
      }
      updateAdminNavVisibility();
      updateProgramAdminControls();
      updateFileTransferNavVisibility();
      updateClipAccessUI();
      updatePollCreatorState(false);
      markPollsForRefresh();
      loadPrograms();
      teardownRealtimeFeatures();
      updateReceiverStatus("Csatlakozz bejelentkezés után a fogadó módhoz.");
    }

    if (loginBtn) {
      loginBtn.addEventListener("click", openLoginModal);
    }

    if (registerBtn) {
      registerBtn.addEventListener("click", () => {
        window.location.href = "register.html";
      });
    }

    function renderUserList(users) {
      if (!userListContainer) {
        return;
      }

      userListContainer.innerHTML = "";

      if (!Array.isArray(users) || users.length === 0) {
        userListContainer.textContent = "Nincs megjeleníthető felhasználó.";
        if (savePermissionsBtn) {
          savePermissionsBtn.disabled = true;
        }
        return;
      }

      const table = document.createElement("table");
      table.className = "user-table";

        const thead = document.createElement("thead");
        thead.innerHTML = `
          <tr>
            <th>Felhasználónév</th>
            <th>Feltöltési jogosultság</th>
            <th>P2P Jog</th>
          <th>Klip nézési jog</th>
            <th>Max fájlméret (MB)</th>
            <th>Videó limit</th>
            <th>Feltöltött videók</th>
          </tr>
        `;
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      users.forEach((user) => {
        const row = document.createElement("tr");
        row.dataset.userId = user.id;

        const usernameCell = document.createElement("td");
        usernameCell.textContent = user.username;
        row.appendChild(usernameCell);

        const permissionCell = document.createElement("td");
        const label = document.createElement("label");
        label.className = "permission-toggle";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "canUpload";
        checkbox.checked = Number(user.can_upload) === 1;
        label.appendChild(checkbox);
        label.append(" Feltölthet");
        permissionCell.appendChild(label);
        row.appendChild(permissionCell);

        const transferCell = document.createElement("td");
        const transferLabel = document.createElement("label");
        transferLabel.className = "permission-toggle";
        const transferCheckbox = document.createElement("input");
        transferCheckbox.type = "checkbox";
        transferCheckbox.name = "canTransfer";
        transferCheckbox.checked = Number(user.can_transfer) === 1;
        transferLabel.appendChild(transferCheckbox);
        transferLabel.append(" P2P");
        transferCell.appendChild(transferLabel);
        row.appendChild(transferCell);

        const viewClipsCell = document.createElement("td");
        const viewClipsLabel = document.createElement("label");
        viewClipsLabel.className = "permission-toggle";
        const viewClipsCheckbox = document.createElement("input");
        viewClipsCheckbox.type = "checkbox";
        viewClipsCheckbox.name = "canViewClips";
        viewClipsCheckbox.checked = Number(user.can_view_clips) === 1;
        viewClipsLabel.appendChild(viewClipsCheckbox);
        viewClipsLabel.append(" Klipek");
        viewClipsCell.appendChild(viewClipsLabel);
        row.appendChild(viewClipsCell);

        const maxFileSizeCell = document.createElement("td");
        const maxFileInput = document.createElement("input");
        maxFileInput.type = "number";
        maxFileInput.min = "1";
        maxFileInput.required = true;
        maxFileInput.name = "maxFileSizeMb";
        maxFileInput.value = Number.parseInt(user.max_file_size_mb, 10) || "";
        maxFileSizeCell.appendChild(maxFileInput);
        row.appendChild(maxFileSizeCell);

        const maxVideosCell = document.createElement("td");
        const maxVideosInput = document.createElement("input");
        maxVideosInput.type = "number";
        maxVideosInput.min = "1";
        maxVideosInput.required = true;
        maxVideosInput.name = "maxVideos";
        maxVideosInput.value = Number.parseInt(user.max_videos, 10) || "";
        maxVideosCell.appendChild(maxVideosInput);
        row.appendChild(maxVideosCell);

        const uploadsCell = document.createElement("td");
        uploadsCell.textContent = Number.parseInt(user.upload_count, 10) || 0;
        row.appendChild(uploadsCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      userListContainer.appendChild(table);

      if (savePermissionsBtn) {
        savePermissionsBtn.disabled = false;
      }
    }

    async function loadAdminPanel() {
      if (!isUserLoggedIn()) {
        alert("Nincs érvényes hitelesítés.");
        return;
      }

      try {
        const response = await fetch("/api/users", {
          method: "GET",
          headers: buildAuthHeaders(),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message = data && data.message ? data.message : "Nem sikerült betölteni a felhasználókat.";
          throw new Error(message);
        }

        renderUserList(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Admin panel betöltési hiba:", error);
        alert(error.message || "Nem sikerült betölteni az admin panel adatait.");
        if (savePermissionsBtn) {
          savePermissionsBtn.disabled = true;
        }
      }
    }

    async function fetchAdminClips(variant) {
      const params = new URLSearchParams();
      if (variant) {
        params.set("type", variant);
      }

      const url = params.toString() ? `/api/admin/clips?${params.toString()}` : "/api/admin/clips";
      const response = await fetch(url, { headers: buildAuthHeaders() });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data && data.message ? data.message : "Nem sikerült lekérdezni a klipeket.";
        throw new Error(message);
      }

      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const total = Number.isFinite(data?.total) ? data.total : items.length;

      return { items, total };
    }

    async function fetchProcessingStatus() {
      const response = await fetch("/api/admin/processing-status", { headers: buildAuthHeaders() });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data && data.message ? data.message : "Nem sikerült lekérdezni a feldolgozási állapotot.";
        throw new Error(message);
      }

      return {
        isProcessing: Boolean(data?.isProcessing),
        currentTask: data?.currentTask || null,
        pending: Array.isArray(data?.pending) ? data.pending : [],
      };
    }

    function createClipListWindowLayout(clipWindow) {
      const doc = clipWindow.document;

      doc.title = "Klipek listája";
      doc.body.innerHTML = `
        <style>
          body {
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f3f4f6;
            color: #111827;
            margin: 0;
            padding: 20px;
          }

          .clip-window {
            max-width: 1200px;
            margin: 0 auto;
            font-size: 14px;
          }

          .clip-window h1 {
            margin: 0 0 6px;
            font-size: 20px;
          }

          .clip-window__subtitle {
            margin: 0 0 16px;
            color: #4b5563;
          }

          .clip-window__controls {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }

          .clip-window__select {
            padding: 6px 10px;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            min-width: 220px;
            font-size: 14px;
          }

          .clip-window__count {
            color: #4b5563;
            font-size: 13px;
          }

          .clip-window__status {
            margin-bottom: 10px;
            color: #374151;
          }

          .clip-window__table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          }

          .clip-window__table thead {
            background: #e5e7eb;
          }

          .clip-window__table th,
          .clip-window__table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            vertical-align: top;
          }

          .clip-window__table th {
            font-weight: 600;
          }

          .clip-window__table tr:last-child td {
            border-bottom: none;
          }

          .clip-window__delete {
            background: #dc2626;
            color: #fff;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s ease;
          }

          .clip-window__delete:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .clip-window__delete:not(:disabled):hover {
            background: #b91c1c;
          }
        </style>
        <div class="clip-window">
          <h1>Feltöltött klipek</h1>
          <p class="clip-window__subtitle">Egyszerű, áttekinthető lista a klipjeidről.</p>
          <div class="clip-window__controls">
            <label for="clipWindowVariant">Megjelenített fájlok</label>
            <select id="clipWindowVariant" class="clip-window__select">
              <option value="original">Eredeti videók</option>
              <option value="720p">720p videók</option>
              <option value="other">Egyéb fájlok</option>
            </select>
            <span id="clipWindowCount" class="clip-window__count"></span>
          </div>
          <div id="clipWindowStatus" class="clip-window__status">Klipek betöltése folyamatban...</div>
          <div id="clipWindowTable"></div>
        </div>
      `;

      return {
        doc,
        statusEl: doc.getElementById("clipWindowStatus"),
        tableContainer: doc.getElementById("clipWindowTable"),
        variantSelect: doc.getElementById("clipWindowVariant"),
        countEl: doc.getElementById("clipWindowCount"),
      };
    }

    async function handleClipDeleteFromWindow(clipId, rowElement, button, clipName, statusEl) {
      if (!Number.isFinite(clipId)) {
        return;
      }

      const confirmed = window.confirm(`Biztosan törlöd a(z) "${clipName || "klip"}" elemet? A törlés végleges.`);
      if (!confirmed) {
        return;
      }

      if (button) {
        button.disabled = true;
      }

      try {
        const response = await fetch(`/api/videos/${clipId}`, {
          method: "DELETE",
          headers: buildAuthHeaders(),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message = data && data.message ? data.message : "Nem sikerült törölni a klipet.";
          throw new Error(message);
        }

        if (rowElement && rowElement.parentElement) {
          rowElement.parentElement.removeChild(rowElement);
        }

        const remainingRows = rowElement?.parentElement?.children?.length || 0;
        if (remainingRows === 0 && statusEl) {
          statusEl.textContent = "Nincs feltöltött klip.";
        }
      } catch (error) {
        console.error("Klip törlési hiba:", error);
        alert(error.message || "Nem sikerült törölni a klipet.");
      } finally {
        if (button) {
          button.disabled = false;
        }
      }
    }

    function renderClipTableInWindow(doc, tableContainer, statusEl, clips, countEl) {
      if (!tableContainer) {
        return;
      }

      tableContainer.innerHTML = "";

      if (!Array.isArray(clips) || clips.length === 0) {
        if (statusEl) {
          statusEl.textContent = "Nincs feltöltött klip.";
        }
        if (countEl) {
          countEl.textContent = "";
        }
        return;
      }

      if (statusEl) {
        statusEl.textContent = "";
      }

      if (countEl) {
        countEl.textContent = `Megjelenített elemek: ${clips.length}`;
      }

      const table = doc.createElement("table");
      table.className = "clip-window__table";

      const thead = doc.createElement("thead");
      const headerRow = doc.createElement("tr");
      ["Szép cím", "Adatbázis cím", "Fájlméret", "Feltöltési idő", "Egyéb", "Művelet"].forEach((text) => {
        const th = doc.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = doc.createElement("tbody");

      clips.forEach((clip) => {
        const row = doc.createElement("tr");

        const prettyTitle = doc.createElement("td");
        prettyTitle.textContent = clip.original_name || "Ismeretlen név";
        row.appendChild(prettyTitle);

        const dbTitle = doc.createElement("td");
        dbTitle.textContent = clip.filename || "-";
        row.appendChild(dbTitle);

        const sizeCell = doc.createElement("td");
        sizeCell.textContent = formatFileSize(Number(clip.sizeBytes));
        row.appendChild(sizeCell);

        const uploadedCell = doc.createElement("td");
        uploadedCell.textContent = formatDateTime(clip.uploaded_at);
        row.appendChild(uploadedCell);

        const extraCell = doc.createElement("td");
        const extraParts = [];
        if (clip.uploader) {
          extraParts.push(`Feltöltő: ${clip.uploader}`);
        }
        if (clip.category === "720p") {
          extraParts.push("Verzió: 720p");
        } else if (clip.category === "other") {
          extraParts.push("Típus: Egyéb fájl");
        } else {
          extraParts.push("Verzió: Eredeti");
        }
        extraCell.textContent = extraParts.length ? extraParts.join(" • ") : "-";
        row.appendChild(extraCell);

        const actionCell = doc.createElement("td");
        const deleteBtn = doc.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Törlés";
        deleteBtn.className = "clip-window__delete";
        deleteBtn.addEventListener("click", () => {
          handleClipDeleteFromWindow(clip.id, row, deleteBtn, clip.original_name, statusEl);
        });
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      tableContainer.appendChild(table);
    }

    async function openClipListWindow() {
      if (!isUserLoggedIn()) {
        alert("Nincs érvényes hitelesítés.");
        return;
      }

      const clipWindow = window.open("", "_blank");
      if (!clipWindow || clipWindow.closed) {
        alert("Nem sikerült megnyitni az új ablakot.");
        return;
      }

      const { doc, statusEl, tableContainer, variantSelect, countEl } = createClipListWindowLayout(clipWindow);

      const selectedVariant = "original";
      if (variantSelect) {
        variantSelect.value = selectedVariant;
      }

      const loadVariant = async (variant) => {
        if (statusEl) {
          statusEl.textContent = "Klipek betöltése folyamatban...";
        }
        if (countEl) {
          countEl.textContent = "";
        }
        if (tableContainer) {
          tableContainer.innerHTML = "";
        }

        try {
          const { items } = await fetchAdminClips(variant);
          renderClipTableInWindow(doc, tableContainer, statusEl, items, countEl);
        } catch (error) {
          console.error("Klip lista betöltési hiba:", error);
          if (statusEl) {
            statusEl.textContent = error.message || "Nem sikerült betölteni a klipeket.";
          }
        }
      };

      if (variantSelect) {
        variantSelect.addEventListener("change", (event) => {
          const value = event.target?.value || "original";
          loadVariant(value);
        });
      }

      await loadVariant(selectedVariant);
    }

    function formatHungarianDate(value) {
      const parsedDate = value ? new Date(value) : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        return "Ismeretlen időpont";
      }

      return parsedDate.toLocaleString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    function createProcessingStatusWindowLayout(processWindow) {
      const doc = processWindow.document;

      doc.title = "Feldolgozási állapot";
      doc.body.innerHTML = `
        <style>
          body {
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f3f4f6;
            color: #111827;
            margin: 0;
            padding: 20px;
          }

          .process-window {
            max-width: 960px;
            margin: 0 auto;
          }

          .process-window h1 {
            margin-bottom: 4px;
          }

          .process-window__subtitle {
            color: #4b5563;
            margin-top: 0;
          }

          .process-window__status {
            background: #e5e7eb;
            color: #1f2937;
            padding: 10px 12px;
            border-radius: 8px;
            margin: 16px 0;
            font-weight: 600;
          }

          .process-window__card {
            background: #fff;
            border-radius: 10px;
            padding: 14px 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
            margin-bottom: 16px;
          }

          .process-window__card h3 {
            margin: 0 0 6px 0;
            font-size: 16px;
          }

          .process-window__meta {
            color: #4b5563;
            margin: 2px 0;
            font-size: 13px;
          }

          .process-window__queue-header {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .process-window__badge {
            background: #2563eb;
            color: #fff;
            padding: 4px 10px;
            border-radius: 999px;
            font-weight: 600;
            font-size: 12px;
          }

          .process-window__list {
            list-style: none;
            padding: 0;
            margin: 12px 0 20px 0;
          }

          .process-window__list li + li {
            margin-top: 10px;
          }

          .process-window__empty {
            color: #6b7280;
            font-style: italic;
          }

          .process-window__refresh {
            background: #111827;
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 10px 14px;
            font-weight: 600;
            cursor: pointer;
          }

          .process-window__refresh:hover {
            background: #1f2937;
          }
        </style>
        <div class="process-window">
          <h1>Feldolgozási állapot</h1>
          <p class="process-window__subtitle">Aktuális feladat és várakozó fájlok áttekintése.</p>
          <div id="processStatusText" class="process-window__status">Állapot betöltése...</div>
          <div id="processCurrentTask"></div>
          <div class="process-window__queue-header">
            <h2>Várakozó fájlok</h2>
            <span id="processQueueCount" class="process-window__badge"></span>
          </div>
          <ul id="processQueueList" class="process-window__list"></ul>
          <button id="processRefreshBtn" type="button" class="process-window__refresh">Frissítés</button>
        </div>
      `;

      return {
        doc,
        statusEl: doc.getElementById("processStatusText"),
        currentTaskEl: doc.getElementById("processCurrentTask"),
        queueListEl: doc.getElementById("processQueueList"),
        queueCountEl: doc.getElementById("processQueueCount"),
        refreshBtn: doc.getElementById("processRefreshBtn"),
      };
    }

    function renderProcessingCard(doc, container, item, titlePrefix) {
      if (!container) {
        return;
      }

      container.innerHTML = "";

      if (!item) {
        const empty = doc.createElement("p");
        empty.className = "process-window__empty";
        empty.textContent = "Jelenleg nincs aktív feldolgozási feladat.";
        container.appendChild(empty);
        return;
      }

      const card = doc.createElement("div");
      card.className = "process-window__card";

      const title = doc.createElement("h3");
      title.textContent = `${titlePrefix || "Fájl"}: ${item.original_name || item.filename || "Ismeretlen"}`;
      card.appendChild(title);

      const fileMeta = doc.createElement("p");
      fileMeta.className = "process-window__meta";
      fileMeta.textContent = `Elérési út: ${item.filename || "-"}`;
      card.appendChild(fileMeta);

      const timeMeta = doc.createElement("p");
      timeMeta.className = "process-window__meta";
      timeMeta.textContent = `Feltöltve: ${formatHungarianDate(item.uploaded_at)}`;
      card.appendChild(timeMeta);

      const statusMeta = doc.createElement("p");
      statusMeta.className = "process-window__meta";
      statusMeta.textContent = `Státusz: ${item.processing_status || "ismeretlen"}`;
      card.appendChild(statusMeta);

      container.appendChild(card);
    }

    async function openProcessingStatusWindow() {
      if (!isUserLoggedIn()) {
        alert("Nincs érvényes hitelesítés.");
        return;
      }

      const processWindow = window.open("", "_blank");
      if (!processWindow || processWindow.closed) {
        alert("Nem sikerült megnyitni az új ablakot.");
        return;
      }

      const { doc, statusEl, currentTaskEl, queueListEl, queueCountEl, refreshBtn } = createProcessingStatusWindowLayout(processWindow);

      const renderQueue = (items) => {
        if (!queueListEl) {
          return;
        }

        queueListEl.innerHTML = "";

        if (!items || !items.length) {
          const empty = doc.createElement("li");
          empty.className = "process-window__empty";
          empty.textContent = "Nincs várakozó fájl a sorban.";
          queueListEl.appendChild(empty);
          return;
        }

        items.forEach((item, index) => {
          const li = doc.createElement("li");
          renderProcessingCard(doc, li, item, `#${index + 1}`);
          queueListEl.appendChild(li);
        });
      };

      const loadStatus = async () => {
        if (statusEl) {
          statusEl.textContent = "Állapot betöltése folyamatban...";
        }
        renderProcessingCard(doc, currentTaskEl, null);
        renderQueue([]);
        if (queueCountEl) {
          queueCountEl.textContent = "";
        }

        try {
          const data = await fetchProcessingStatus();

          if (statusEl) {
            statusEl.textContent = data.isProcessing
              ? "A szerver jelenleg feldolgoz egy fájlt."
              : "Jelenleg nincs aktív feldolgozási feladat.";
          }

          renderProcessingCard(doc, currentTaskEl, data.currentTask, "Aktív");
          renderQueue(data.pending);

          if (queueCountEl) {
            queueCountEl.textContent = `${data.pending.length} elem`; 
          }
        } catch (error) {
          console.error("Feldolgozási állapot betöltési hiba:", error);
          if (statusEl) {
            statusEl.textContent = error.message || "Nem sikerült lekérdezni az állapotot.";
          }
        }
      };

      if (refreshBtn) {
        refreshBtn.addEventListener("click", loadStatus);
      }

      await loadStatus();
    }

    if (savePermissionsBtn) {
      const originalButtonText = savePermissionsBtn.textContent;

      savePermissionsBtn.addEventListener("click", async () => {
        if (!isUserLoggedIn()) {
          alert("Nincs érvényes hitelesítés.");
          return;
        }

        if (!userListContainer) {
          alert("Nem található a felhasználói lista.");
          return;
        }

        const tableBody = userListContainer.querySelector("tbody");
        if (!tableBody) {
          alert("Nincs mentésre váró adat.");
          return;
        }

        const rows = Array.from(tableBody.querySelectorAll("tr"));
        const invalidEntries = [];
        const permissionsToUpdate = rows
          .map((row) => {
            const uploadCheckbox = row.querySelector('input[name="canUpload"]');
            const transferCheckbox = row.querySelector('input[name="canTransfer"]');
            const viewClipsCheckbox = row.querySelector('input[name="canViewClips"]');
            const maxFileSizeInput = row.querySelector('input[name="maxFileSizeMb"]');
            const maxVideosInput = row.querySelector('input[name="maxVideos"]');
            const userIdAttr = row.dataset.userId;

            if (!uploadCheckbox || !transferCheckbox || !viewClipsCheckbox || !maxFileSizeInput || !maxVideosInput || !userIdAttr) {
              return null;
            }

            const userId = Number.parseInt(userIdAttr, 10);
            if (Number.isNaN(userId)) {
              return null;
            }

            const maxFileSizeValue = Number.parseInt(maxFileSizeInput.value, 10);
            const maxVideosValue = Number.parseInt(maxVideosInput.value, 10);

            if (!Number.isFinite(maxFileSizeValue) || maxFileSizeValue <= 0 || !Number.isFinite(maxVideosValue) || maxVideosValue <= 0) {
              const usernameCell = row.querySelector("td");
              const identifier = usernameCell ? usernameCell.textContent.trim() : `ID ${userId}`;
              invalidEntries.push(identifier);
              return null;
            }

            return {
              userId,
              canUpload: uploadCheckbox.checked,
              canTransfer: transferCheckbox.checked,
              canViewClips: viewClipsCheckbox.checked,
              maxFileSizeMb: maxFileSizeValue,
              maxVideos: maxVideosValue,
            };
          })
          .filter(Boolean);

        if (invalidEntries.length > 0) {
          alert(`Adj meg érvényes, pozitív limiteket a következő felhasználóknál: ${invalidEntries.join(", ")}.`);
          return;
        }

        if (permissionsToUpdate.length === 0) {
          alert("Nincs mentésre váró adat.");
          return;
        }

        savePermissionsBtn.disabled = true;
        savePermissionsBtn.textContent = "Mentés folyamatban...";

        try {
          const response = await fetch("/api/users/permissions/batch-update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...buildAuthHeaders(),
            },
            body: JSON.stringify(permissionsToUpdate),
          });

          const result = await response.json().catch(() => null);

          if (!response.ok) {
            const message = result && result.message ? result.message : "Nem sikerült menteni a jogosultságokat.";
            throw new Error(message);
          }

          alert((result && result.message) || "Jogosultságok sikeresen frissítve.");
          await loadAdminPanel();
        } catch (error) {
          console.error("Jogosultság mentési hiba:", error);
          alert(error.message || "Nem sikerült menteni a jogosultságokat.");
        } finally {
          savePermissionsBtn.disabled = false;
          savePermissionsBtn.textContent = originalButtonText;
        }
      });
    }

    if (closeLogin) {
      closeLogin.addEventListener("click", () => {
        loginModal.style.display = "none";
      });
    }

    if (adminNavBtn) {
      adminNavBtn.addEventListener("click", loadAdminPanel);
    }

    const VIDEO_MANAGEMENT_PATH = "/video-kezeles-felulet.html";
    const DISCORD_PANEL_PATH = "/discord-panel.html";

    if (videoManagementBtn) {
      videoManagementBtn.addEventListener("click", () => {
        window.open(VIDEO_MANAGEMENT_PATH, "_blank");
      });
    }

    if (discordPanelBtn) {
      discordPanelBtn.addEventListener("click", () => {
        window.open(DISCORD_PANEL_PATH, "_blank");
      });
    }

    const feedbackModal = document.getElementById("feedbackModal");
    const feedbackModalTitle = document.getElementById("feedbackModalTitle");
    const feedbackModalMessage = document.getElementById("feedbackModalMessage");
    const feedbackModalClose = document.getElementById("feedbackModalClose");
    const feedbackModalOk = document.getElementById("feedbackModalOk");
    let feedbackModalOnClose = null;

    const hideFeedbackModal = () => {
      feedbackModal.style.display = "none";
      feedbackModalTitle.textContent = "";
      feedbackModalMessage.textContent = "";
      const onClose = feedbackModalOnClose;
      feedbackModalOnClose = null;
      if (typeof onClose === "function") {
        onClose();
      }
    };

    const showFeedbackModal = ({ title, message, onClose }) => {
      feedbackModalTitle.textContent = title;
      feedbackModalMessage.textContent = message;
      feedbackModalOnClose = typeof onClose === "function" ? onClose : null;
      feedbackModal.style.display = "flex";
      feedbackModalOk.focus();
    };

    feedbackModalClose.addEventListener("click", hideFeedbackModal);
    feedbackModalOk.addEventListener("click", hideFeedbackModal);
    feedbackModal.addEventListener("click", (event) => {
      if (event.target === feedbackModal) {
        hideFeedbackModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && feedbackModal.style.display === "flex") {
        hideFeedbackModal();
      }
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        updateUIForLoggedOut();
        showFeedbackModal({
          title: "Kijelentkezés",
          message: "Sikeresen kijelentkeztél.",
        });
      });
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("loginUser").value;
      const password = document.getElementById("loginPass").value;

      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
          const canTransfer = data.canTransfer === true || data.canTransfer === 1;
          const canViewClips = data.canViewClips === true || data.canViewClips === 1;
          localStorage.setItem(SESSION_KEYS.token, data.token);
          localStorage.setItem(SESSION_KEYS.username, data.username);
          localStorage.setItem(SESSION_KEYS.isAdmin, data.isAdmin);
          localStorage.setItem(SESSION_KEYS.canTransfer, canTransfer ? "true" : "false");
          localStorage.setItem(SESSION_KEYS.canViewClips, canViewClips ? "true" : "false");
          if (data.profile_picture_filename) {
            localStorage.setItem(SESSION_KEYS.profilePictureFilename, data.profile_picture_filename);
          } else {
            localStorage.removeItem(SESSION_KEYS.profilePictureFilename);
          }

          applyQualityPreference(data.preferred_quality || DEFAULT_VIDEO_QUALITY);

          updateUIForLoggedIn(data.username, data.profile_picture_filename);
          loginModal.style.display = "none";
          showFeedbackModal({
            title: "Sikeres bejelentkezés",
            message: data.message || "Sikeres bejelentkezés.",
          });
        } else {
          alert(data.message || "Hibás felhasználónév vagy jelszó.");
        }
      } catch (error) {
        console.error("Bejelentkezési hiba:", error);
        alert("Hiba történt a bejelentkezés során. Próbáld meg később.");
      }
    });

    window.addEventListener("load", () => {
        ensureSessionOnLoad();
        loadPrograms();
    });

    const userProfileLink = document.getElementById('userProfileLink');
    if (userProfileLink) {
        userProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('profile');
        });
    }

    async function ensureSessionOnLoad() {
        const token = getStoredToken();
        if (!token) {
            updateUIForLoggedOut();
            return;
        }

        try {
            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: buildAuthHeaders(),
            });

            if (response.status === 401 || response.status === 403) {
                // Token is invalid or expired
                updateUIForLoggedOut();
                return;
            }

            if (!response.ok) {
                // Other server errors, maybe retry later or show a generic error
                // For now, we'll just log out to be safe
                updateUIForLoggedOut();
                return;
            }

            const data = await response.json();

            // Update localStorage with the latest data from the server
            localStorage.setItem(SESSION_KEYS.token, token); // The token is still valid
            localStorage.setItem(SESSION_KEYS.username, data.username);
            localStorage.setItem(SESSION_KEYS.isAdmin, data.isAdmin);
            const canTransfer = data.canTransfer === true || data.canTransfer === 1;
            localStorage.setItem(SESSION_KEYS.canTransfer, canTransfer ? "true" : "false");
            const canViewClips = data.canViewClips === true || data.canViewClips === 1;
            localStorage.setItem(SESSION_KEYS.canViewClips, canViewClips ? "true" : "false");
            if (data.profile_picture_filename) {
                localStorage.setItem(SESSION_KEYS.profilePictureFilename, data.profile_picture_filename);
            } else {
                localStorage.removeItem(SESSION_KEYS.profilePictureFilename);
            }

            applyQualityPreference(data.preferred_quality || DEFAULT_VIDEO_QUALITY);

            updateUIForLoggedIn(data.username, data.profile_picture_filename);
        } catch (error) {
            console.error('Hiba a munkamenet ellenőrzésekor:', error);
            // If there's a network error or the server is down, log out
            updateUIForLoggedOut();
        }
    }

    const avatarCropperModal = document.getElementById('avatarCropperModal');
    const avatarCropperImage = document.getElementById('avatarCropperImage');
    const avatarCropperCancel = document.getElementById('avatarCropperCancel');
    const avatarCropperSave = document.getElementById('avatarCropperSave');
    const avatarZoomRange = document.getElementById('avatarZoomRange');
    let avatarPreviewObjectUrl = null;
    let avatarCropperInstance = null;
    let croppedAvatarBlob = null;
    let avatarOriginalFileName = '';

    const closeAvatarCropper = (resetSelection = false) => {
        if (avatarCropperModal) {
            avatarCropperModal.classList.remove('open');
            avatarCropperModal.setAttribute('aria-hidden', 'true');
        }

        if (avatarCropperInstance) {
            avatarCropperInstance.destroy();
            avatarCropperInstance = null;
        }

        if (resetSelection && avatarInput) {
            avatarInput.value = '';
        }

        if (avatarZoomRange) {
            avatarZoomRange.value = '1';
        }

        if (avatarCropperImage) {
            avatarCropperImage.src = '';
        }
    };

    if (avatarInput && profileAvatarPreview && avatarCropperImage && avatarCropperModal) {
        avatarInput.addEventListener('change', () => {
            const file = avatarInput.files[0];

            if (!file) {
                return;
            }

            avatarOriginalFileName = file.name;
            croppedAvatarBlob = null;

            if (avatarUploadStatus) {
                avatarUploadStatus.textContent = '';
            }

            const reader = new FileReader();
            reader.onload = () => {
                avatarCropperImage.src = reader.result;

                if (avatarCropperInstance) {
                    avatarCropperInstance.destroy();
                }

                avatarCropperInstance = new Cropper(avatarCropperImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 1,
                    ready() {
                        if (avatarZoomRange) {
                            avatarZoomRange.value = '1';
                        }
                        avatarCropperInstance.zoomTo(1);
                    },
                });

                avatarCropperModal.classList.add('open');
                avatarCropperModal.setAttribute('aria-hidden', 'false');
            };

            reader.readAsDataURL(file);
        });
    }

    if (avatarZoomRange) {
        avatarZoomRange.addEventListener('input', (event) => {
            if (avatarCropperInstance) {
                const zoomValue = parseFloat(event.target.value);
                avatarCropperInstance.zoomTo(zoomValue);
            }
        });
    }

    if (avatarCropperCancel) {
        avatarCropperCancel.addEventListener('click', () => {
            croppedAvatarBlob = null;
            closeAvatarCropper(true);
        });
    }

    if (avatarCropperSave) {
        avatarCropperSave.addEventListener('click', () => {
            if (!avatarCropperInstance) return;

            const canvas = avatarCropperInstance.getCroppedCanvas({ width: 512, height: 512, imageSmoothingQuality: 'high' });
            canvas.toBlob((blob) => {
                if (!blob) return;

                croppedAvatarBlob = blob;

                if (avatarPreviewObjectUrl) {
                    URL.revokeObjectURL(avatarPreviewObjectUrl);
                }

                avatarPreviewObjectUrl = URL.createObjectURL(blob);
                profileAvatarPreview.src = avatarPreviewObjectUrl;
                profileAvatarPreview.dataset.override = 'true';
                if (avatarUploadStatus) {
                    avatarUploadStatus.textContent = '';
                }

                closeAvatarCropper();
                if (avatarInput) {
                    avatarInput.value = '';
                }
            }, 'image/png');
        });
    }

    if (uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', async () => {
            if (!isUserLoggedIn()) {
                alert("A feltöltéshez be kell jelentkezned.");
                return;
            }

            const file = avatarInput.files[0];
            if (!file && !croppedAvatarBlob) {
                alert("Válassz ki egy képfájlt a feltöltéshez.");
                return;
            }

            const formData = new FormData();
            if (croppedAvatarBlob) {
                formData.append('avatar', croppedAvatarBlob, avatarOriginalFileName || 'avatar.png');
            } else if (file) {
                formData.append('avatar', file);
            }

            uploadAvatarBtn.disabled = true;
            avatarUploadStatus.textContent = "Feltöltés folyamatban...";

            try {
                const response = await fetch('/api/profile/upload-avatar', {
                    method: 'POST',
                    headers: buildAuthHeaders(),
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Nem sikerült feltölteni a profilképet.');
                }

                avatarUploadStatus.textContent = result.message;
                avatarInput.value = '';
                if (avatarPreviewObjectUrl) {
                    URL.revokeObjectURL(avatarPreviewObjectUrl);
                    avatarPreviewObjectUrl = null;
                }
                delete profileAvatarPreview.dataset.override;
                croppedAvatarBlob = null;
                avatarOriginalFileName = '';
                await ensureSessionOnLoad(); // Refresh session data to get new avatar filename
            } catch (error) {
                console.error('Profilkép feltöltési hiba:', error);
                avatarUploadStatus.textContent = error.message;
            } finally {
                uploadAvatarBtn.disabled = false;
            }
        });
    }

    const updateUsernameForm = document.getElementById('updateUsernameForm');
    if (updateUsernameForm) {
        updateUsernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = document.getElementById('newUsername').value;

            try {
                const res = await fetch('/api/profile/update-name', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
                    body: JSON.stringify({ newUsername }),
                });

                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    await ensureSessionOnLoad();
                } else {
                    alert(data.message);
                }
            } catch (error) {
                alert('Hiba történt a felhasználónév frissítése során.');
            }
        });
    }

    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;

            try {
                const res = await fetch('/api/profile/update-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
                    body: JSON.stringify({ currentPassword, newPassword }),
                });

                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    updatePasswordForm.reset();
                } else {
                    alert(data.message);
                }
            } catch (error) {
                alert('Hiba történt a jelszó frissítése során.');
            }
        });
    }
  
      const summaryToggleBtn = document.getElementById("summaryToggleBtn");
      const summaryCard = document.getElementById("summaryCard");
      const summaryCloseBtn = document.getElementById("summaryCloseBtn");
      const videoGridContainer = document.getElementById("video-grid-container");
      const videoPagination = document.getElementById("video-pagination");
      const clipSection = document.getElementById("klipek");
      const clipsPermissionOverlay = document.getElementById("clipsPermissionOverlay");
      const showUploadModalBtn = document.getElementById("showUploadModalBtn");
      const uploadModal = document.getElementById("uploadModal");
      const closeUploadModalBtn = document.getElementById("closeUploadModal");
      const dropZone = document.getElementById("drop-zone");
      const uploadQueueContainer = document.getElementById("uploadQueueContainer");
      const addMoreVideosBtn = document.getElementById("addMoreVideosBtn");
      const fileInput = document.getElementById("fileInput");
      const addFilesBtn = document.getElementById("addFilesBtn");
      const cancelUploadBtn = document.getElementById("cancelUploadBtn");
      const uploadBtn = document.getElementById("uploadBtn");
      const uploadStatus = document.getElementById("uploadStatus");
      const uploadProgress = document.getElementById("uploadProgress");
      const uploadProgressFill = document.getElementById("uploadProgressFill");
      const uploadProgressCount = document.getElementById("uploadProgressCount");
      const uploadProgressEta = document.getElementById("uploadProgressEta");
      const uploadProgressDetails = document.getElementById("uploadProgressDetails");
      const selectedFileName = document.getElementById("selectedFileName");
      const uploadSummary = document.getElementById("uploadSummary");
      const uploadToast = document.getElementById("uploadToast");
      const clipToast = document.getElementById("clipToast");
      const videoPlayerModal = document.getElementById("videoPlayerModal");
      const modalVideoPlayer = document.getElementById("modalVideoPlayer");
      const modalVideoTitle = document.getElementById("modalVideoTitle");
      const copyVideoLinkBtn = document.getElementById("copyVideoLinkBtn");
      const closeVideoModalBtn = document.getElementById("closeVideoModalBtn");
      const prevVideoBtn = document.getElementById("prevVideoBtn");
      const nextVideoBtn = document.getElementById("nextVideoBtn");
      const MAX_UPLOAD_FILES = 100;
      const globalTagSelect = document.getElementById("globalTagSelect");
      const videoSearchInput = document.getElementById("videoSearchInput");
      const tagSelectContainer = document.getElementById("tagSelectContainer");
      const tagSelectBox = tagSelectContainer?.querySelector(".tag-select-box");
      const tagSelectDropdown = tagSelectContainer?.querySelector(".tag-dropdown");
      const sortOrderSelect = document.getElementById("sortOrderSelect");
      const videoQualitySelect = document.getElementById("videoQualitySelect");
      const pageSizeSelect = document.getElementById("pageSizeSelect");
      const filterResetBtn = document.getElementById("filterResetBtn");
      const createTagWrapper = document.getElementById("createTagWrapper");
      const newTagNameInput = document.getElementById("newTagName");
      const newTagColorInput = document.getElementById("newTagColor");
      const tagColorButton = document.getElementById("tagColorButton");
      const createTagButton = document.getElementById("createTagButton");
      const deleteTagButton = document.getElementById("deleteTagButton");
      const createTagStatus = document.getElementById("createTagStatus");
      const DEFAULT_TAG_COLOR = "#5865f2";
      let uploadQueue = [];
      const fileSignatures = new Set();
      const UPLOAD_ABORT_MESSAGE = "UPLOAD_ABORTED";
      let isUploadCancelled = false;
      let isUploading = false;
      let currentUploadXhr = null;
      let uploadedVideoIds = [];
      let clipToastTimeout = null;
      let availableTags = [];
      let tagSelectHandlersAttached = false;
      let clipTagHandlersAttached = false;
      const VIDEO_QUALITY_KEY = "videoQualityPreference";
      const DEFAULT_VIDEO_QUALITY = "1080p";
      const ALLOWED_VIDEO_QUALITIES = ["1440p", "1080p", "720p"];
      const VIDEO_PAGE_SIZE_KEY = "videoPageSize";
      const VIDEO_SORT_ORDER_KEY = "videoSortOrder";
      const savedPageSize = Number.parseInt(localStorage.getItem(VIDEO_PAGE_SIZE_KEY), 10);
      const savedSortOrder = localStorage.getItem(VIDEO_SORT_ORDER_KEY);
      const savedQuality = localStorage.getItem(VIDEO_QUALITY_KEY);
      const videoFilters = {
        page: 1,
        limit: [12, 24, 40, 80].includes(savedPageSize) ? savedPageSize : 24,
        search: "",
        tag: [],
        sort: savedSortOrder === "oldest" ? "oldest" : "newest",
      };
      let currentVideoQuality = savedQuality === "original"
        ? "original"
        : ALLOWED_VIDEO_QUALITIES.includes(savedQuality)
          ? savedQuality
          : DEFAULT_VIDEO_QUALITY;
      let videoSearchTimeout = null;
      let currentVideoList = [];
      let currentVideoIndex = 0;

      if (summaryToggleBtn && summaryCard) {
        summaryToggleBtn.addEventListener("click", () => {
          summaryCard.classList.add("summary-card--visible");
          summaryCard.setAttribute("aria-hidden", "false");
          summaryToggleBtn.setAttribute("aria-expanded", "true");
          summaryToggleBtn.classList.add("is-hidden");

          if (summaryCloseBtn) {
            summaryCloseBtn.focus();
          }
        });
      }

      if (summaryCloseBtn && summaryCard && summaryToggleBtn) {
        summaryCloseBtn.addEventListener("click", () => {
          summaryCard.classList.remove("summary-card--visible");
          summaryCard.setAttribute("aria-hidden", "true");
          summaryToggleBtn.setAttribute("aria-expanded", "false");
          summaryToggleBtn.classList.remove("is-hidden");
          summaryToggleBtn.focus();
        });
      }

      if (pageSizeSelect) {
        pageSizeSelect.value = String(videoFilters.limit);
      }

      if (sortOrderSelect) {
        sortOrderSelect.value = videoFilters.sort;
      }

      applyQualityPreference(currentVideoQuality);
      renderTagSelector();

      function isActualAdmin() {
        const value = localStorage.getItem(ADMIN_SESSION_KEY);
        if (value === "true" || value === "1") {
          return true;
        }
        if (value === "false" || value === "0") {
          return false;
        }

        const token = getStoredToken();
        const payload = token ? decodeTokenPayload(token) : null;
        if (payload?.isAdmin === true || payload?.isAdmin === 1) {
          return true;
        }

        return false;
      }

      function isAdminPreviewEnabled() {
        const stored = localStorage.getItem(ADMIN_PREVIEW_KEY);
        if (stored === "guest") {
          localStorage.removeItem(ADMIN_PREVIEW_KEY);
          return false;
        }
        return stored === "true" || stored === "user";
      }

      function setAdminPreviewEnabled(enabled) {
        if (!isActualAdmin()) {
          return;
        }
        if (enabled) {
          localStorage.setItem(ADMIN_PREVIEW_KEY, "true");
        } else {
          localStorage.removeItem(ADMIN_PREVIEW_KEY);
        }
      }

      function updateAdminPreviewToggle() {
        if (!adminPreviewToggleBtn) {
          return;
        }

        const actualAdmin = isActualAdmin();
        if (!actualAdmin) {
          localStorage.removeItem(ADMIN_PREVIEW_KEY);
          if (adminPreviewBar) {
            adminPreviewBar.style.display = "none";
          }
          adminPreviewToggleBtn.style.display = "none";
          adminPreviewToggleBtn.setAttribute("aria-pressed", "false");
          adminPreviewToggleBtn.classList.remove("is-active");
          return;
        }

        const previewEnabled = isAdminPreviewEnabled();
        if (adminPreviewBar) {
          adminPreviewBar.style.display = "flex";
        }
        adminPreviewToggleBtn.style.display = "inline-flex";
        adminPreviewToggleBtn.setAttribute("aria-pressed", previewEnabled ? "true" : "false");
        adminPreviewToggleBtn.classList.toggle("is-active", previewEnabled);
        adminPreviewToggleBtn.textContent = previewEnabled ? "Nézet: felhasználó" : "Nézet: Admin";
      }

      function isAdminUser() {
        return isActualAdmin() && !isAdminPreviewEnabled();
      }

      function applyAdminPreviewState() {
        updateAdminNavVisibility();
        updateFileTransferNavVisibility();
        updateClipAccessUI();
        updatePollCreatorState();

        const activeSection = document.querySelector("main section.active");
        const activeId = activeSection ? activeSection.id : "";

        if (activeId === "klipek") {
          if (hasClipAccess()) {
            fetchTags();
            loadVideos();
          } else {
            updateClipAccessUI();
          }
        }

        if (activeId === "szavazas") {
          loadPolls();
        }
      }

      if (adminPreviewToggleBtn) {
        adminPreviewToggleBtn.addEventListener("click", () => {
          const nextState = !isAdminPreviewEnabled();
          setAdminPreviewEnabled(nextState);
          applyAdminPreviewState();
        });
      }

      function hasFileTransferPermission() {
        return isUserLoggedIn() && localStorage.getItem(SESSION_KEYS.canTransfer) === "true";
      }

      function hasClipAccess() {
        return isUserLoggedIn() && localStorage.getItem(SESSION_KEYS.canViewClips) === "true";
      }

      function updateClipAccessUI() {
        const allowed = hasClipAccess();

        if (clipSection) {
          clipSection.classList.toggle("permission-blocked", !allowed);
        }

        if (clipsPermissionOverlay) {
          clipsPermissionOverlay.style.display = allowed ? "none" : "flex";
          clipsPermissionOverlay.setAttribute("aria-hidden", allowed ? "true" : "false");
        }

        if (!allowed) {
          if (videoGridContainer) {
            videoGridContainer.innerHTML = "";
          }
          if (videoPagination) {
            videoPagination.innerHTML = "";
          }
        }

        if (showUploadModalBtn) {
          showUploadModalBtn.disabled = !allowed;
          showUploadModalBtn.title = allowed ? "" : "Jogosultság szükséges a klipek eléréséhez.";
        }
      }

      function getAccessibleNavLinks() {
        return Array.from(document.querySelectorAll("nav a")).filter((link) => {
          const requiresAdmin = link.dataset.requiresAdmin === "true";
          const requiresTransfer = link.dataset.requiresTransfer === "true";

          if (requiresAdmin && !isAdminUser()) {
            return false;
          }

          if (requiresTransfer && !hasFileTransferPermission()) {
            return false;
          }

          return true;
        });
      }

      function updateProgramAdminControls() {
        if (addProgramBtn) {
          addProgramBtn.style.display = isAdminUser() ? "inline-flex" : "none";
        }

        if (!programsContainer) {
          return;
        }

        programsContainer.querySelectorAll(".program-card").forEach((card) => {
          card.classList.toggle("program-card--admin", isAdminUser());
        });
      }

      function setProgramUploadMode(mode, program = null) {
        const isEditMode = mode === "edit";
        editingProgram = isEditMode ? program : null;

        if (programUploadTitle) {
          programUploadTitle.textContent = isEditMode ? "Program szerkesztése" : "Új Program Feltöltése";
        }

        if (submitProgramUploadBtn) {
          submitProgramUploadBtn.textContent = isEditMode ? "Frissítés" : "Mentés";
        }

        if (programFileInput) {
          if (isEditMode) {
            programFileInput.removeAttribute("required");
          } else {
            programFileInput.setAttribute("required", "required");
          }
          programFileInput.value = "";
        }

        if (!isEditMode && programFileName) {
          programFileName.textContent = "Nincs kiválasztva fájl.";
        }
      }

      function resetProgramUploadModal() {
        if (programUploadForm) {
          programUploadForm.reset();
        }

        if (programFileName) {
          programFileName.textContent = "Nincs kiválasztva fájl.";
        }

        if (programImageCropper) {
          programImageCropper.destroy();
          programImageCropper = null;
        }

        if (programImageObjectUrl) {
          URL.revokeObjectURL(programImageObjectUrl);
          programImageObjectUrl = null;
        }

        if (programImagePreview) {
          programImagePreview.removeAttribute("src");
        }
      }

      function closeProgramUploadModal() {
        if (programUploadModal) {
          programUploadModal.style.display = "none";
        }

        setProgramUploadMode("create");
        resetProgramUploadModal();
      }

      function renderProgramCard(program) {
        const card = document.createElement("article");
        card.className = "program-card";
        if (isAdminUser()) {
          card.classList.add("program-card--admin");
        }

        const thumb = document.createElement("img");
        thumb.className = "program-card__thumbnail";
        thumb.src = program?.image_filename
          ? `/uploads/programs/images/${program.image_filename}`
          : "program_icons/default-avatar.png";
        thumb.alt = `${program?.name || "Program"} borítókép`;
        card.appendChild(thumb);

        const body = document.createElement("div");
        body.className = "program-card__body";

        const title = document.createElement("h3");
        title.className = "program-card__title";
        title.textContent = program?.name || "Program";

        const description = document.createElement("p");
        description.className = "program-card__description";
        description.textContent = program?.description || "Nincs leírás megadva.";

        const meta = document.createElement("div");
        meta.className = "program-card__meta";
        const createdAt = program?.created_at ? new Date(program.created_at) : null;
        const downloadInfo = document.createElement("span");
        downloadInfo.textContent = `Letöltések: ${Number(program?.download_count) || 0}`;
        meta.appendChild(downloadInfo);
        if (createdAt) {
          const dateInfo = document.createElement("span");
          dateInfo.textContent = createdAt.toLocaleDateString("hu-HU");
          meta.appendChild(dateInfo);
        }

        const actions = document.createElement("div");
        actions.className = "program-card__actions";

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "primary-button program-card__download";
        downloadBtn.textContent = "Letöltés";
        downloadBtn.addEventListener("click", () => handleProgramDownload(program));

        actions.appendChild(downloadBtn);

        body.appendChild(title);
        body.appendChild(description);
        body.appendChild(meta);
        body.appendChild(actions);

        card.appendChild(body);

        if (isAdminUser()) {
          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "program-card__edit";
          editBtn.setAttribute("aria-label", "Program szerkesztése");
          editBtn.textContent = "✎";
          editBtn.addEventListener("click", () => openProgramEditModal(program));
          card.appendChild(editBtn);

          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "program-card__delete";
          deleteBtn.setAttribute("aria-label", "Program törlése");
          deleteBtn.textContent = "✕";
          deleteBtn.addEventListener("click", () => handleProgramDelete(program.id, card, deleteBtn));
          card.appendChild(deleteBtn);
        }

        return card;
      }

      async function loadPrograms() {
        if (!programsContainer) {
          return;
        }

        programsContainer.innerHTML = "<p class='programs-empty'>Betöltés...</p>";

        try {
          const response = await fetch("/api/programs");
          if (!response.ok) {
            throw new Error("Nem sikerült lekérni a programokat.");
          }

          const programs = await response.json();
          programsContainer.innerHTML = "";

          if (!Array.isArray(programs) || programs.length === 0) {
            programsContainer.innerHTML = "<p class='programs-empty'>Még nincs feltöltött program.</p>";
            updateProgramAdminControls();
            return;
          }

          programs.forEach((program) => {
            const card = renderProgramCard(program);
            programsContainer.appendChild(card);
          });

          updateProgramAdminControls();
        } catch (error) {
          console.error("Programok betöltési hiba:", error);
          programsContainer.innerHTML =
            "<p class='programs-empty'>Nem sikerült betölteni a programokat. Próbáld meg később.</p>";
        }
      }

      async function handleProgramDownload(program) {
        if (!program?.id) {
          return;
        }

        const downloadUrl = `/api/programs/${program.id}/download`;
        try {
          const response = await fetch(downloadUrl);

          if (response.status === 429) {
            const payload = await response.json().catch(() => ({}));
            alert(payload.message || "Túllépted a letöltési keretet (Max 3/óra, 10/nap).");
            return;
          }

          if (!response.ok) {
            throw new Error("Nem sikerült letölteni a programot.");
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = program?.original_filename || `${program?.name || "program"}.exe`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
        } catch (error) {
          console.error("Program letöltési hiba:", error);
          alert(error.message || "Nem sikerült letölteni a programot.");
        }
      }

      async function handleProgramDelete(programId, card, button) {
        if (!isAdminUser()) {
          alert("Csak admin törölhet programot.");
          return;
        }

        if (!confirm("Biztosan törlöd ezt a programot?")) {
          return;
        }

        const originalText = button?.textContent;
        if (button) {
          button.disabled = true;
          button.textContent = "...";
        }

        try {
          const response = await fetch(`/api/programs/${programId}`, {
            method: "DELETE",
            headers: buildAuthHeaders(),
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            const message = payload?.message || "Nem sikerült törölni a programot.";
            throw new Error(message);
          }

          if (card) {
            card.remove();
          }

          if (!programsContainer?.children.length) {
            programsContainer.innerHTML = "<p class='programs-empty'>Még nincs feltöltött program.</p>";
          }
        } catch (error) {
          console.error("Program törlési hiba:", error);
          alert(error.message || "Nem sikerült törölni a programot.");
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent = originalText || "✕";
          }
        }
      }

      function formatDate(dateString) {
        if (!dateString) return "Ismeretlen";
        const date = new Date(dateString);
        return date.toLocaleDateString("hu-HU", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      function getSelectValues(selectElement) {
        if (!selectElement) return [];
        return Array.from(selectElement.selectedOptions || [])
          .map((option) => Number(option.value))
          .filter((val) => Number.isFinite(val));
      }

      function normalizeColor(color) {
        if (!color || typeof color !== "string") return DEFAULT_TAG_COLOR;
        const trimmed = color.trim();
        return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed.toUpperCase() : DEFAULT_TAG_COLOR;
      }

      function styleTagOption(option, color) {
        const safeColor = normalizeColor(color);
        option.style.background = `linear-gradient(90deg, ${safeColor} 0 10px, rgba(255, 255, 255, 0.04) 10px 100%)`;
        option.style.borderLeft = `6px solid ${safeColor}`;
      }

      function renderSelectedTagChips() {
        if (!tagSelectBox) return;
        tagSelectBox.innerHTML = "";

        if (!videoFilters.tag.length) {
          const placeholder = document.createElement("span");
          placeholder.className = "custom-select-placeholder";
          placeholder.textContent = "Válassz címkéket...";
          tagSelectBox.appendChild(placeholder);
          return;
        }

        videoFilters.tag.forEach((tagId) => {
          const tagData = availableTags.find((tag) => String(tag.id) === String(tagId));
          const chip = document.createElement("span");
          chip.className = "custom-select-chip";
          chip.dataset.value = String(tagId);

          const colorBar = document.createElement("span");
          colorBar.className = "custom-select-chip__color";
          colorBar.style.background = normalizeColor(tagData?.color || DEFAULT_TAG_COLOR);

          const label = document.createElement("span");
          label.textContent = tagData?.name || `Címke #${tagId}`;

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "custom-select-chip__remove";
          removeBtn.setAttribute("aria-label", `${label.textContent} törlése`);
          removeBtn.textContent = "×";

          chip.append(colorBar, label, removeBtn);
          tagSelectBox.appendChild(chip);
        });
      }

      function renderTagDropdownOptions() {
        if (!tagSelectDropdown) return;
        tagSelectDropdown.innerHTML = "";

        const selectedValues = new Set(videoFilters.tag.map((value) => String(value)));

        if (!availableTags.length) {
          const emptyState = document.createElement("div");
          emptyState.className = "custom-select-placeholder";
          emptyState.style.padding = "0.35rem 0.65rem";
          emptyState.textContent = "Nincs elérhető címke";
          tagSelectDropdown.appendChild(emptyState);
          return;
        }

        availableTags.forEach((tag) => {
          const option = document.createElement("button");
          option.type = "button";
          option.className = "custom-select-option";
          option.dataset.value = String(tag.id);
          option.disabled = selectedValues.has(option.dataset.value);

          const colorBar = document.createElement("span");
          colorBar.className = "custom-select-option__color";
          colorBar.style.background = normalizeColor(tag.color);

          const label = document.createElement("span");
          label.textContent = tag.name;

          option.append(colorBar, label);

          tagSelectDropdown.appendChild(option);
        });
      }

      function renderTagSelector() {
        renderSelectedTagChips();
        renderTagDropdownOptions();
      }

      function selectClipTag(tagId) {
        if (!tagId) return;
        const tagValue = String(tagId);
        const alreadySelected = videoFilters.tag.some((value) => String(value) === tagValue);
        if (alreadySelected) return;
        videoFilters.tag = [...videoFilters.tag, tagValue];
        videoFilters.page = 1;
        renderTagSelector();
        loadVideos();
      }

      function getTagIdFromChip(chip) {
        if (!chip) return null;
        const directId = chip.dataset.tagId;
        if (directId) return directId;
        const tagName = chip.dataset.tagName;
        if (!tagName) return null;
        const match = availableTags.find((tag) => tag.name === tagName);
        return match ? String(match.id) : null;
      }

      function handleClipTagClick(event) {
        const chip = event.target.closest(".tag-chip");
        if (!chip || !videoGridContainer?.contains(chip)) return;
        event.stopPropagation();
        const tagId = getTagIdFromChip(chip);
        if (!tagId) return;
        selectClipTag(tagId);
      }

      function handleClipTagKeydown(event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        const chip = event.target.closest(".tag-chip");
        if (!chip || !videoGridContainer?.contains(chip)) return;
        event.preventDefault();
        const tagId = getTagIdFromChip(chip);
        if (!tagId) return;
        selectClipTag(tagId);
      }

      function attachClipTagHandlers() {
        if (!videoGridContainer || clipTagHandlersAttached) return;
        videoGridContainer.addEventListener("click", handleClipTagClick);
        videoGridContainer.addEventListener("keydown", handleClipTagKeydown);
        clipTagHandlersAttached = true;
      }

      function renderGlobalTagSelect() {
        if (!globalTagSelect) return;
        const currentSelection = getSelectValues(globalTagSelect);
        globalTagSelect.innerHTML = "";
        availableTags.forEach((tag) => {
          const option = document.createElement("option");
          option.value = String(tag.id);
          option.textContent = tag.name;
          option.selected = currentSelection.includes(tag.id);
          styleTagOption(option, tag.color);
          globalTagSelect.appendChild(option);
        });
      }

      function createQueueTagSelect(selectedValues = [], onChange) {
        const normalized = Array.isArray(selectedValues) ? [...selectedValues] : [];
        const container = document.createElement("div");
        container.className = "tag-pill-list";

        const syncSelection = () => {
          container.querySelectorAll(".tag-pill").forEach((pill) => {
            const tagId = Number(pill.dataset.tagId);
            pill.classList.toggle("tag-pill--selected", normalized.includes(tagId));
          });
        };

        const toggleTag = (tagId) => {
          const idx = normalized.indexOf(tagId);
          if (idx >= 0) {
            normalized.splice(idx, 1);
          } else {
            normalized.push(tagId);
          }
          syncSelection();
          if (typeof onChange === "function") {
            onChange([...normalized]);
          }
        };

        availableTags.forEach((tag) => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "tag-pill";
          pill.dataset.tagId = String(tag.id);
          pill.style.setProperty("--tag-color", normalizeColor(tag.color));
          pill.innerHTML = `<span class="tag-pill__dot"></span><span class="tag-pill__label">${tag.name}</span>`;
          pill.addEventListener("click", () => {
            toggleTag(tag.id);
            pill.blur();
            pill.dispatchEvent(new CustomEvent("tagchange", { bubbles: true }));
          });
          container.appendChild(pill);
        });

        container.getSelectedValues = () => [...normalized];
        container.setSelectedValues = (values) => {
          if (Array.isArray(values)) {
            normalized.splice(0, normalized.length, ...values);
            syncSelection();
          }
        };

        syncSelection();
        return container;
      }

      function populateTagSelect() {
        const validTagIds = Array.isArray(videoFilters.tag)
          ? videoFilters.tag.filter((id) => availableTags.some((tag) => String(tag.id) === String(id)))
          : [];
        if (Array.isArray(videoFilters.tag) && validTagIds.length !== videoFilters.tag.length) {
          videoFilters.tag = validTagIds;
        }

        renderTagSelector();
      }

      async function fetchTags() {
        if (!hasClipAccess()) {
          availableTags = [];
          populateTagSelect();
          renderGlobalTagSelect();
          return;
        }
        try {
          const response = await fetch("/api/tags");
          if (!response.ok) throw new Error("Nem sikerült lekérni a címkéket.");
          const payload = await response.json();
          availableTags = Array.isArray(payload)
            ? payload.map((tag) => ({ ...tag, color: normalizeColor(tag.color) }))
            : [];
          populateTagSelect();
          renderGlobalTagSelect();
          renderUploadQueue();
          if (createTagWrapper) {
            createTagWrapper.style.display = isAdminUser() ? "block" : "none";
          }
        } catch (error) {
          console.error(error);
        }
      }

      function updateUploadSummary() {
        if (!uploadSummary || !selectedFileName) return;
        const count = uploadQueue.length;
        if (!count) {
          uploadSummary.textContent = "Nincs kiválasztott fájl.";
          selectedFileName.textContent = "Nincs kiválasztott fájl.";
          return;
        }
        uploadSummary.textContent = `${count} fájl kiválasztva.`;
        selectedFileName.textContent = uploadSummary.textContent;
      }

      function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB"];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
          value /= 1024;
          unitIndex += 1;
        }
        const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
        return `${value.toFixed(precision)} ${units[unitIndex]}`;
      }

      function formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "--";
        const totalSeconds = Math.ceil(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;
        return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
      }

      function resetUploadProgress() {
        if (uploadProgress) {
          uploadProgress.style.display = "none";
        }
        if (uploadProgressFill) {
          uploadProgressFill.style.width = "0%";
        }
        if (uploadProgressCount) {
          uploadProgressCount.textContent = "0 / 0 klip";
        }
        if (uploadProgressEta) {
          uploadProgressEta.textContent = "Hátralévő idő: --";
        }
        if (uploadProgressDetails) {
          uploadProgressDetails.textContent = "";
        }
      }

      async function rollbackUploadedVideos(videoIds) {
        const normalizedIds = Array.isArray(videoIds)
          ? Array.from(new Set(videoIds.map((id) => Number(id)).filter(Number.isFinite)))
          : [];

        if (!normalizedIds.length) {
          return { deletedVideoIds: [] };
        }

        const response = await fetch("/api/videos/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...buildAuthHeaders() },
          body: JSON.stringify({ videoIds: normalizedIds }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.message || "Nem sikerült visszavonni a feltöltött videókat.");
        }

        return result;
      }

      function updateUploadProgressUI({
        uploadedBytes,
        totalBytes,
        completedFiles,
        totalFiles,
        etaSeconds,
      }) {
        if (!uploadProgress || !uploadProgressFill || !uploadProgressCount || !uploadProgressEta) {
          return;
        }

        const safeTotalBytes = totalBytes || 0;
        const percent = safeTotalBytes > 0 ? Math.min(100, (uploadedBytes / safeTotalBytes) * 100) : 0;

        uploadProgress.style.display = "flex";
        uploadProgressFill.style.width = `${percent}%`;
        uploadProgressCount.textContent = `${completedFiles} / ${totalFiles} klip`;
        uploadProgressEta.textContent = `Hátralévő idő: ${formatDuration(etaSeconds)}`;

        if (uploadProgressDetails) {
          const remainingBytes = Math.max(safeTotalBytes - uploadedBytes, 0);
          uploadProgressDetails.textContent = `${formatBytes(uploadedBytes)} / ${formatBytes(
            safeTotalBytes
          )} • Hátra: ${formatBytes(remainingBytes)}`;
        }
      }

      function removeFromQueue(signature) {
        uploadQueue = uploadQueue.filter((item) => item.signature !== signature);
        fileSignatures.delete(signature);
        renderUploadQueue();
        updateUploadSummary();
        if (uploadBtn) {
          uploadBtn.disabled = uploadQueue.length === 0;
        }
      }

      function showUploadToast(message) {
        if (!uploadToast) return;
        uploadToast.textContent = message;
        uploadToast.classList.add("upload-toast--visible");
        const modalContent = uploadModal?.querySelector(".upload-modal-content");
        if (modalContent) {
          modalContent.classList.remove("shake");
          modalContent.offsetWidth;
          modalContent.classList.add("shake");
        }
        setTimeout(() => uploadToast.classList.remove("upload-toast--visible"), 1800);
      }

      function renderUploadQueue() {
        if (!uploadQueueContainer) return;
        uploadQueueContainer.innerHTML = "";
        const hasItems = uploadQueue.length > 0;

        if (addMoreVideosBtn) {
          addMoreVideosBtn.style.display = hasItems ? "inline-flex" : "none";
        }

        if (!hasItems && dropZone) {
          uploadQueueContainer.appendChild(dropZone);
        }

        uploadQueue.forEach((item) => {
          const row = document.createElement("div");
          row.className = "upload-queue-item";

          const thumbnail = document.createElement("div");
          thumbnail.className = "queue-thumbnail";
          if (item.thumbnail) {
            const img = document.createElement("img");
            img.src = item.thumbnail;
            img.alt = item.displayName || item.file.name;
            thumbnail.appendChild(img);
          } else {
            thumbnail.textContent = "📹";
          }

          const details = document.createElement("div");
          details.className = "queue-details";

          const nameInput = document.createElement("input");
          nameInput.type = "text";
          nameInput.value = item.displayName || item.file.name;
          nameInput.placeholder = "Videó neve";
          nameInput.addEventListener("input", (event) => {
            item.displayName = event.target.value || item.file.name;
            updateUploadSummary();
          });
          details.appendChild(nameInput);

          const tagSelector = createQueueTagSelect(item.tags || [], (values) => {
            item.tags = values;
          });
          tagSelector.setAttribute("aria-label", "Címke kiválasztása");
          details.appendChild(tagSelector);

          const actions = document.createElement("div");
          actions.className = "queue-actions";

          const removeBtn = document.createElement("button");
          removeBtn.className = "queue-remove";
          removeBtn.type = "button";
          removeBtn.innerHTML = "&times;";
          removeBtn.addEventListener("click", () => removeFromQueue(item.signature));
          actions.appendChild(removeBtn);

          row.appendChild(thumbnail);
          row.appendChild(details);
          row.appendChild(actions);

          uploadQueueContainer.appendChild(row);
        });
      }

      function getFileSignature(file) {
        return `${file.name}-${file.size}-${file.lastModified}`;
      }

      function generateVideoThumbnail(file) {
        return new Promise((resolve, reject) => {
          const video = document.createElement("video");
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          const url = URL.createObjectURL(file);
          video.src = url;
          video.preload = "metadata";
          video.muted = true;
          video.playsInline = true;

          const cleanup = () => URL.revokeObjectURL(url);

          video.addEventListener("loadeddata", () => {
            try {
              const captureTime = Math.min(1, Math.max(0, video.duration || 1));
              video.currentTime = captureTime;
            } catch (error) {
              cleanup();
              reject(error);
            }
          });

          video.addEventListener("seeked", () => {
            try {
              canvas.width = 160;
              canvas.height = 90;
              context?.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL("image/png");
              cleanup();
              resolve(dataUrl);
            } catch (error) {
              cleanup();
              reject(error);
            }
          });

          video.addEventListener("error", (error) => {
            cleanup();
            reject(error);
          });
        });
      }

      function normalizeQualityPreference(quality) {
        if (quality === "original") return "original";
        if (!quality) return DEFAULT_VIDEO_QUALITY;
        return ALLOWED_VIDEO_QUALITIES.includes(quality) ? quality : DEFAULT_VIDEO_QUALITY;
      }

      function applyQualityPreference(quality, { persistLocally = true } = {}) {
        const normalizedQuality = normalizeQualityPreference(quality);
        currentVideoQuality = normalizedQuality;

        if (persistLocally) {
          localStorage.setItem(VIDEO_QUALITY_KEY, normalizedQuality);
        }

        if (videoQualitySelect) {
          videoQualitySelect.value = normalizedQuality;
        }

        return normalizedQuality;
      }

      function buildVideoPath(originalFilename, targetResolution) {
        if (!originalFilename || !targetResolution) return "";
        const normalizedPath = String(originalFilename).replace(/^\/+/, "");
        const segments = normalizedPath.split("/");
        const eredetiIndex = segments.indexOf("eredeti");

        if (eredetiIndex === -1 || eredetiIndex + 1 >= segments.length) {
          return "";
        }

        const folderName = segments[eredetiIndex + 1];
        const baseFilename = segments[segments.length - 1];
        const dotIndex = baseFilename.lastIndexOf(".");
        const nameWithoutExt = dotIndex !== -1 ? baseFilename.slice(0, dotIndex) : baseFilename;
        const extension = dotIndex !== -1 ? baseFilename.slice(dotIndex) : "";

        return `/uploads/klippek/${targetResolution}/${folderName}/${nameWithoutExt}_${targetResolution}${extension}`;
      }

      function getQualityAvailability(video) {
        return {
          "1440p": Number(video?.has_1440p) === 1 || video?.has_1440p === true || video?.has_1440p === "1",
          "1080p": Number(video?.has_1080p) === 1 || video?.has_1080p === true || video?.has_1080p === "1",
          "720p": Number(video?.has_720p) === 1 || video?.has_720p === true || video?.has_720p === "1",
        };
      }

      function getPreferredVideoSource(video, qualityPreference) {
        const requestedQuality = qualityPreference || "original";
        const normalizedQuality = normalizeQualityPreference(requestedQuality);
        const originalSource = video?.filename ? `/uploads/${video.filename}` : "";
        const availability = getQualityAvailability(video);
        const originalQuality = (video?.original_quality || "").toString();

        if (normalizedQuality === "original") {
          return {
            src: originalSource,
            originalSource,
            resolvedQuality: "original",
            requestedQuality: normalizedQuality,
            availability,
          };
        }

        if (normalizedQuality !== "original" && originalQuality === normalizedQuality) {
          return {
            src: originalSource,
            originalSource,
            resolvedQuality: "original",
            requestedQuality: normalizedQuality,
            availability,
          };
        }

        if (normalizedQuality === "1440p" && availability["1440p"]) {
          return {
            src: buildVideoPath(video?.filename, "1440p"),
            originalSource,
            resolvedQuality: "1440p",
            requestedQuality: normalizedQuality,
            availability,
          };
        }

        if (normalizedQuality === "1080p" && availability["1080p"]) {
          return {
            src: buildVideoPath(video?.filename, "1080p"),
            originalSource,
            resolvedQuality: "1080p",
            requestedQuality: normalizedQuality,
            availability,
          };
        }

        if (normalizedQuality === "720p" && availability["720p"]) {
          return {
            src: buildVideoPath(video?.filename, "720p"),
            originalSource,
            resolvedQuality: "720p",
            requestedQuality: normalizedQuality,
            availability,
          };
        }

        return {
          src: originalSource,
          originalSource,
          resolvedQuality: "original",
          requestedQuality: normalizedQuality,
          availability,
        };
      }

      function listAvailableQualities(video) {
        const availability = getQualityAvailability(video);
        const available = ["1440p", "1080p", "720p"].filter((quality) => availability[quality]);
        if (!available.length) {
          return ["Eredeti"];
        }
        return [...available, "Eredeti"];
      }

      function showClipToast(message) {
        if (!clipToast) return;
        clipToast.textContent = message;
        clipToast.classList.add("upload-toast--visible");
        if (clipToastTimeout) {
          clearTimeout(clipToastTimeout);
        }
        clipToastTimeout = setTimeout(() => clipToast.classList.remove("upload-toast--visible"), 2200);
      }

      async function saveQualityPreferenceToServer(quality) {
        const response = await fetch("/api/profile/update-quality", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({ quality: normalizeQualityPreference(quality) }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.message || "Nem sikerült menteni a minőségi beállítást.");
        }

        return result;
      }

      function buildVideoQueryParams() {
        const params = new URLSearchParams();
        Object.entries(videoFilters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            if (value.length) {
              value.forEach((entry) => params.append(key, entry));
            }
          } else if (value !== undefined && value !== null && value !== "") {
            params.append(key, value);
          }
        });
        return params;
      }

      async function loadVideos() {
        if (!videoGridContainer) {
          return;
        }

        if (!hasClipAccess()) {
          updateClipAccessUI();
          return;
        }

        videoGridContainer.innerHTML = "";
        if (videoPagination) videoPagination.innerHTML = "";

        const params = buildVideoQueryParams();

        try {
          const response = await fetch(`/api/videos?${params.toString()}`, {
            headers: buildAuthHeaders(),
          });

          if (response.status === 401) {
            updateUIForLoggedOut();
            throw new Error("Be kell jelentkezned a klipek megtekintéséhez.");
          }

          if (response.status === 403) {
            localStorage.setItem(SESSION_KEYS.canViewClips, "false");
            updateClipAccessUI();
            throw new Error("Nincs jogosultságod a klipek megtekintéséhez.");
          }

          if (!response.ok) {
            throw new Error("Nem sikerült betölteni a videókat.");
          }

          const { data, pagination } = await response.json();
          videoFilters.page = pagination?.currentPage || videoFilters.page;

          currentVideoList = Array.isArray(data) ? data : [];

          if (!Array.isArray(data) || data.length === 0) {
            videoGridContainer.innerHTML = "<p>Még senki nem töltött fel videót.</p>";
            return;
          }

          renderVideoGrid(data);
          renderPagination(pagination);
        } catch (error) {
          console.error("Videók betöltési hibája:", error);
          currentVideoList = [];
          videoGridContainer.innerHTML = "<p>Nem sikerült betölteni a videókat.</p>";
        }
      }

      function cleanVideoTitle(rawTitle) {
        if (!rawTitle) return "";

        const trimmed = rawTitle.trim();
        const looksLikeMojibake = /[Ã�Â]/.test(trimmed);
        if (looksLikeMojibake) {
          const decoded = new TextDecoder("utf-8").decode(
            Uint8Array.from(trimmed.split("").map((char) => char.charCodeAt(0)))
          );
          if (decoded && !decoded.includes("�")) {
            return decoded.replace(/\.[^.]+$/i, "").trim();
          }
        }

        return trimmed.replace(/\.[^.]+$/i, "").trim();
      }

      const CLIP_NAME_TAGS = ["Dávid", "Balázs"];
      const clipNameTagPriority = new Map(
        CLIP_NAME_TAGS.map((name, index) => [name.toLowerCase(), index])
      );

      function orderClipTags(tags) {
        if (!Array.isArray(tags)) return [];
        if (tags.length < 2) return tags;

        return [...tags].sort((first, second) => {
          const firstName = (first?.name || "").toLowerCase();
          const secondName = (second?.name || "").toLowerCase();
          const firstIsName = clipNameTagPriority.has(firstName) ? 0 : 1;
          const secondIsName = clipNameTagPriority.has(secondName) ? 0 : 1;

          if (firstIsName !== secondIsName) {
            return firstIsName - secondIsName;
          }

          if (firstIsName === 0 && secondIsName === 0) {
            return clipNameTagPriority.get(firstName) - clipNameTagPriority.get(secondName);
          }

          return 0;
        });
      }

      async function handleClipTitleEdit(video, titleElement) {
        if (!video || !Number.isFinite(video.id)) {
          return;
        }

        const currentTitle = cleanVideoTitle(video.original_name || video.filename || "") || "Névtelen videó";
        const updatedTitle = window.prompt("Add meg az új klipcímet:", currentTitle);

        if (updatedTitle === null) {
          return;
        }

        const normalizedTitle = updatedTitle.trim();
        if (!normalizedTitle || normalizedTitle === currentTitle) {
          return;
        }

        try {
          const response = await fetch(`/api/videos/${video.id}/title`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...buildAuthHeaders(),
            },
            body: JSON.stringify({ title: normalizedTitle }),
          });

          const data = await response.json().catch(() => null);
          if (!response.ok) {
            const message = data?.message || "Nem sikerült frissíteni a klip címét.";
            throw new Error(message);
          }

          const newTitle = data?.original_name || normalizedTitle;
          video.original_name = newTitle;
          if (titleElement) {
            titleElement.textContent = cleanVideoTitle(newTitle) || "Névtelen videó";
          }

          if (videoPlayerModal?.classList.contains("open")) {
            const activeVideo = currentVideoList[currentVideoIndex];
            if (activeVideo?.id === video.id && modalVideoTitle) {
              modalVideoTitle.textContent = cleanVideoTitle(newTitle) || "Névtelen videó";
            }
          }

          showClipToast(data?.message || "A klip címe frissült.");
        } catch (error) {
          console.error("Klip cím módosítási hiba:", error);
          alert(error.message || "Nem sikerült frissíteni a klip címét.");
        }
      }

      function renderVideoGrid(videos) {
        videoGridContainer.innerHTML = "";
        videos.forEach((video, index) => {
          const card = document.createElement("div");
          card.className = "video-card";

          const header = document.createElement("div");
          header.className = "video-card__header";

          const title = document.createElement("p");
          title.className = "video-card__title";
          const rawTitle = video.original_name || video.filename;
          title.textContent = cleanVideoTitle(rawTitle) || "Névtelen videó";
          header.appendChild(title);

          if (isAdminUser()) {
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "video-card__edit";
            editBtn.title = "Klip címének szerkesztése";
            editBtn.setAttribute("aria-label", "Klip címének szerkesztése");
            editBtn.innerHTML = `
              <svg class="video-card__edit-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M3.6 16.8 3 21l4.2-.6L19.1 8.5 15.5 4.9 3.6 16.8Zm16.8-9.2c.2-.2.2-.5 0-.7l-2.3-2.3c-.2-.2-.5-.2-.7 0l-1.9 1.9 3 3 1.9-1.9Z"
                />
              </svg>
            `;
            editBtn.addEventListener("click", (event) => {
              event.stopPropagation();
              handleClipTitleEdit(video, title);
            });
            header.appendChild(editBtn);
          }

          card.appendChild(header);

          const videoElement = document.createElement("video");
          videoElement.poster = video.thumbnail_filename
            ? `/uploads/${video.thumbnail_filename}`
            : "";
          videoElement.dataset.src = `/uploads/${video.filename}`;
          videoElement.controls = false;
          videoElement.removeAttribute("controls");
          videoElement.preload = "none";
          videoElement.playsInline = true;
          videoElement.setAttribute("playsinline", "");
          videoElement.setAttribute("webkit-playsinline", "");

          let hasPlaybackError = false;

          videoElement.addEventListener("click", () => {
            openVideoModal(index);
          });

          videoElement.addEventListener("error", () => {
            if (hasPlaybackError) {
              return;
            }

            hasPlaybackError = true;
            card.classList.add("video-card--error");

            const errorMessage = document.createElement("p");
            errorMessage.className = "video-card__error";
            errorMessage.textContent =
              "Nem sikerült betölteni a videót. Frissítsd az oldalt vagy próbáld meg később.";
            card.appendChild(errorMessage);
          });

          videoElement.addEventListener("loadeddata", () => {
            card.classList.remove("video-card--error");
            hasPlaybackError = false;
            const existingError = card.querySelector(".video-card__error");
            if (existingError) {
              existingError.remove();
            }
          });

          const meta = document.createElement("div");
          meta.className = "video-card__meta";
          const uploader = document.createElement("span");
          uploader.textContent = `Feltöltötte: ${video.username || "Ismeretlen"}`;
          const uploadedAt = document.createElement("span");
          const displayedDate = video.content_created_at || video.uploaded_at;
          uploadedAt.textContent = formatDate(displayedDate);
          meta.append(uploader, uploadedAt);

          const qualityInfo = document.createElement("div");
          qualityInfo.className = "video-card__qualities";
          qualityInfo.textContent = `Elérhető minőségek: ${listAvailableQualities(video).join(", ")}`;

          const tagList = document.createElement("div");
          tagList.className = "tag-list";
          orderClipTags(video.tags || []).forEach((tag) => {
            const chip = document.createElement("span");
            chip.className = "tag-chip";
            chip.style.setProperty("--tag-color", normalizeColor(tag.color));
            chip.textContent = tag.name;
            chip.setAttribute("role", "button");
            chip.tabIndex = 0;
            if (tag && tag.id !== undefined && tag.id !== null) {
              chip.dataset.tagId = String(tag.id);
              chip.addEventListener("click", (event) => {
                event.stopPropagation();
                selectClipTag(tag.id);
              });
            } else if (tag?.name) {
              chip.dataset.tagName = String(tag.name);
              chip.addEventListener("click", (event) => {
                event.stopPropagation();
                const resolvedTagId = getTagIdFromChip(chip);
                if (resolvedTagId) {
                  selectClipTag(resolvedTagId);
                }
              });
            }
            tagList.appendChild(chip);
          });

          
          card.appendChild(videoElement);
          card.appendChild(meta);
          card.appendChild(qualityInfo);
          if (tagList.childElementCount) {
            card.appendChild(tagList);
          }

          if (isAdminUser()) {
            const actions = document.createElement("div");
            actions.className = "video-card__actions";
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.textContent = "Törlés";
            deleteBtn.addEventListener("click", async () => {
              if (!confirm("Biztosan törlöd a videót?")) return;
              try {
                const response = await fetch(`/api/videos/${video.id}`, {
                  method: "DELETE",
                  headers: buildAuthHeaders(),
                });
                const result = await response.json().catch(() => null);
                if (!response.ok) {
                  throw new Error((result && result.message) || "Nem sikerült törölni a videót.");
                }
                await loadVideos();
              } catch (error) {
                alert(error.message);
              }
            });
            actions.appendChild(deleteBtn);
            card.appendChild(actions);
          }

          videoGridContainer.appendChild(card);
        });
      }

      function openVideoModal(index) {
        if (!videoPlayerModal || !modalVideoPlayer || !Array.isArray(currentVideoList)) {
          return;
        }

        if (!currentVideoList.length) {
          return;
        }

        currentVideoIndex = ((index % currentVideoList.length) + currentVideoList.length) % currentVideoList.length;
        const activeVideo = currentVideoList[currentVideoIndex];
        if (!activeVideo) {
          return;
        }

        const rawTitle = activeVideo.original_name || activeVideo.filename;
        modalVideoTitle.textContent = cleanVideoTitle(rawTitle) || "Névtelen videó";
        const videoElements = videoGridContainer.querySelectorAll(".video-card video");
        const { src, originalSource } = getPreferredVideoSource(activeVideo, currentVideoQuality);
        const originalSrc = originalSource || `/uploads/${activeVideo.filename}`;
        const sourceFromGrid = videoElements[currentVideoIndex]?.dataset?.src || "";
        const resolvedSource = src || sourceFromGrid || originalSrc;

        modalVideoPlayer.addEventListener(
          "error",
          () => {
            if (modalVideoPlayer.src !== originalSrc) {
              modalVideoPlayer.src = originalSrc;
              modalVideoPlayer.load();
              modalVideoPlayer.play().catch(() => {});
            }
          },
          { once: true }
        );

        modalVideoPlayer.src = resolvedSource;
        modalVideoPlayer.load();
        modalVideoPlayer.play().catch(() => {});

        videoPlayerModal.classList.add("open");
        videoPlayerModal.setAttribute("aria-hidden", "false");
        closeVideoModalBtn?.focus({ preventScroll: true });
      }

      function closeVideoModal() {
        if (!videoPlayerModal || !modalVideoPlayer) {
          return;
        }

        modalVideoPlayer.pause();
        modalVideoPlayer.removeAttribute("src");
        modalVideoPlayer.load();
        videoPlayerModal.classList.remove("open");
        videoPlayerModal.setAttribute("aria-hidden", "true");
      }

      function showNextVideo() {
        if (!currentVideoList.length) {
          return;
        }

        const nextIndex = (currentVideoIndex + 1) % currentVideoList.length;
        openVideoModal(nextIndex);
      }

      function showPrevVideo() {
        if (!currentVideoList.length) {
          return;
        }

        const prevIndex = (currentVideoIndex - 1 + currentVideoList.length) % currentVideoList.length;
        openVideoModal(prevIndex);
      }

      function renderPagination(pagination) {
        if (!videoPagination || !pagination || pagination.totalPages <= 1) {
          return;
        }

        videoPagination.innerHTML = "";
        const { currentPage, totalPages } = pagination;

        const createButton = (pageNumber, text = null) => {
          const btn = document.createElement("button");
          btn.textContent = text || pageNumber;
          btn.classList.toggle("active", pageNumber === currentPage);
          btn.addEventListener("click", () => {
            if (pageNumber === currentPage) return;
            videoFilters.page = pageNumber;
            loadVideos();
          });
          return btn;
        };

        const windowSize = 2;
        const start = Math.max(1, currentPage - windowSize);
        const end = Math.min(totalPages, currentPage + windowSize);

        if (start > 1) {
          videoPagination.appendChild(createButton(1));
          if (start > 2) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            videoPagination.appendChild(ellipsis);
          }
        }

        for (let page = start; page <= end; page += 1) {
          videoPagination.appendChild(createButton(page));
        }

        if (end < totalPages) {
          if (end < totalPages - 1) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            videoPagination.appendChild(ellipsis);
          }
          videoPagination.appendChild(createButton(totalPages));
        }
      }

      if (closeVideoModalBtn) {
        closeVideoModalBtn.addEventListener("click", closeVideoModal);
      }

      if (copyVideoLinkBtn) {
        copyVideoLinkBtn.addEventListener("click", () => {
          const videoLink = modalVideoPlayer.src;
          if (!videoLink) return;
          navigator.clipboard.writeText(videoLink).then(() => {
            showClipToast("Link másolva a vágólapra!");
          }).catch(err => {
            console.error("Nem sikerült másolni: ", err);
          });
        });
      }

      if (prevVideoBtn) {
        prevVideoBtn.addEventListener("click", showPrevVideo);
      }

      if (nextVideoBtn) {
        nextVideoBtn.addEventListener("click", showNextVideo);
      }

      if (videoPlayerModal) {
        videoPlayerModal.addEventListener("click", (event) => {
          if (event.target === videoPlayerModal) {
            closeVideoModal();
          }
        });
      }

      document.addEventListener("keydown", (event) => {
        if (!videoPlayerModal?.classList.contains("open")) {
          return;
        }

        if (event.key === "Escape") {
          closeVideoModal();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          showNextVideo();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          showPrevVideo();
        }
      });

      if (videoSearchInput) {
        videoSearchInput.addEventListener("input", () => {
          videoFilters.search = videoSearchInput.value.trim();
          videoFilters.page = 1;
          if (videoSearchTimeout) {
            clearTimeout(videoSearchTimeout);
          }
          videoSearchTimeout = setTimeout(() => {
            loadVideos();
          }, 2000);
        });
      }

      function renderCustomTagSelect() {
        if (!tagSelectContainer || !tagSelectDropdown || !tagSelectBox || tagSelectHandlersAttached) {
          return;
        }

        const handleTagSelection = (tagId) => {
          selectClipTag(tagId);
        };

        const handleChipRemoval = (event) => {
          const removeBtn = event.target.closest(".custom-select-chip__remove");
          if (!removeBtn) return;
          const chip = removeBtn.closest(".custom-select-chip");
          const tagId = chip?.dataset?.value;
          if (!tagId) return;
          event.stopPropagation();
          videoFilters.tag = videoFilters.tag.filter((id) => String(id) !== String(tagId));
          videoFilters.page = 1;
          renderTagSelector();
          loadVideos();
        };

        const handleOptionClick = (event) => {
          const option = event.target.closest(".custom-select-option");
          if (!option) return;
          event.stopPropagation();
          if (option.disabled) return;
          handleTagSelection(option.dataset.value);
        };

        const handleContainerClick = (event) => {
          event.stopPropagation();
          if (event.target.closest(".custom-select-chip__remove")) {
            return;
          }
          if (event.target.closest(".custom-select-option")) {
            return;
          }
          tagSelectContainer.classList.toggle("active");
        };

        const handleOutsideClick = (event) => {
          if (!tagSelectContainer.contains(event.target)) {
            tagSelectContainer.classList.remove("active");
          }
        };

        tagSelectContainer.addEventListener("click", handleContainerClick);
        tagSelectDropdown.addEventListener("click", handleOptionClick);
        tagSelectBox.addEventListener("click", handleChipRemoval);
        document.addEventListener("click", handleOutsideClick);

        tagSelectHandlersAttached = true;
      }

      renderCustomTagSelect();
      attachClipTagHandlers();

      if (sortOrderSelect) {
        sortOrderSelect.addEventListener("change", () => {
          videoFilters.sort = sortOrderSelect.value === "oldest" ? "oldest" : "newest";
          localStorage.setItem(VIDEO_SORT_ORDER_KEY, videoFilters.sort);
          videoFilters.page = 1;
          loadVideos();
        });
      }

      if (videoQualitySelect) {
        videoQualitySelect.addEventListener("change", async () => {
          const selectedQuality = normalizeQualityPreference(videoQualitySelect.value);
          const previousQuality = currentVideoQuality;

          applyQualityPreference(selectedQuality);

          if (!isUserLoggedIn()) {
            return;
          }

          try {
            await saveQualityPreferenceToServer(selectedQuality);
          } catch (error) {
            console.error("Minőségi beállítás mentése sikertelen:", error);
            showClipToast(error.message || "Nem sikerült menteni a minőségi beállítást.");
            applyQualityPreference(previousQuality);
          }
        });
      }

      if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", () => {
          const selected = Number.parseInt(pageSizeSelect.value, 10);
          const allowed = [12, 24, 40, 80];
          videoFilters.limit = allowed.includes(selected) ? selected : videoFilters.limit;
          localStorage.setItem(VIDEO_PAGE_SIZE_KEY, videoFilters.limit);
          videoFilters.page = 1;
          loadVideos();
        });
      }

      if (filterResetBtn) {
        filterResetBtn.addEventListener("click", () => {
          videoFilters.page = 1;
          videoFilters.search = "";
          videoFilters.tag = [];
          videoFilters.sort = "newest";
          if (videoSearchTimeout) {
            clearTimeout(videoSearchTimeout);
            videoSearchTimeout = null;
          }
          if (videoSearchInput) videoSearchInput.value = "";
          renderTagSelector();
          toggleTagDropdown(false);
          if (sortOrderSelect) {
            sortOrderSelect.value = videoFilters.sort;
            localStorage.setItem(VIDEO_SORT_ORDER_KEY, videoFilters.sort);
          }
          loadVideos();
        });
      }

      async function handleCreateTag() {
        if (!newTagNameInput || !createTagStatus) return;
        const name = newTagNameInput.value.trim();
        if (!name) {
          createTagStatus.textContent = "Add meg a címke nevét.";
          return;
        }
        const color = normalizeColor(newTagColorInput?.value || DEFAULT_TAG_COLOR);
        if (tagColorButton) {
          tagColorButton.style.setProperty("--tag-color", color);
        }
        createTagStatus.textContent = "Mentés...";
        try {
          const response = await fetch("/api/tags", {
            method: "POST",
            headers: {
              ...buildAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, color }),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error((result && result.message) || "Nem sikerült létrehozni a címkét.");
          }
          newTagNameInput.value = "";
          if (newTagColorInput) {
            newTagColorInput.value = DEFAULT_TAG_COLOR;
          }
          if (tagColorButton) {
            tagColorButton.style.setProperty("--tag-color", DEFAULT_TAG_COLOR);
          }
          createTagStatus.textContent = "Címke létrehozva.";
          await fetchTags();
        } catch (error) {
          createTagStatus.textContent = error.message;
        }
      }

      async function handleDeleteTag() {
        if (!createTagStatus) return;
        const selectedOption = globalTagSelect?.selectedOptions?.[0];
        const tagId = Number.parseInt(selectedOption?.value, 10);
        if (!tagId) {
          createTagStatus.textContent = "Válassz ki egy címkét a törléshez.";
          return;
        }

        createTagStatus.textContent = "Címke törlése...";
        try {
          const response = await fetch(`/api/tags/${tagId}`, {
            method: "DELETE",
            headers: buildAuthHeaders(),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error((result && result.message) || "Nem sikerült törölni a címkét.");
          }
          createTagStatus.textContent = "Címke törölve.";
          if (globalTagSelect) {
            globalTagSelect.value = "";
          }
          await fetchTags();
        } catch (error) {
          createTagStatus.textContent = error.message;
        }
      }

      if (newTagColorInput && tagColorButton) {
        const updateTagColorPreview = () => {
          const color = normalizeColor(newTagColorInput.value || DEFAULT_TAG_COLOR);
          tagColorButton.style.setProperty("--tag-color", color);
        };

        tagColorButton.addEventListener("click", () => newTagColorInput.click());
        newTagColorInput.addEventListener("input", updateTagColorPreview);
        updateTagColorPreview();
      }

      if (createTagButton) {
        createTagButton.addEventListener("click", handleCreateTag);
      }

      if (deleteTagButton) {
        deleteTagButton.addEventListener("click", handleDeleteTag);
      }

      function resetUploadModal() {
        uploadQueue = [];
        fileSignatures.clear();
        uploadedVideoIds = [];
        isUploadCancelled = false;
        isUploading = false;
        currentUploadXhr = null;
        renderUploadQueue();
        updateUploadSummary();
        if (uploadBtn) {
          uploadBtn.disabled = true;
        }
        if (cancelUploadBtn) {
          cancelUploadBtn.disabled = false;
        }
        if (uploadStatus) {
          uploadStatus.textContent = "";
        }
        resetUploadProgress();
        if (uploadToast) {
          uploadToast.classList.remove("upload-toast--visible");
          uploadToast.textContent = "";
        }
        if (fileInput) {
          fileInput.value = "";
        }
        if (dropZone) {
          dropZone.classList.remove("drag-over");
        }
        if (globalTagSelect) {
          globalTagSelect.selectedIndex = -1;
        }
        if (createTagStatus) {
          createTagStatus.textContent = "";
        }
        if (newTagColorInput) {
          newTagColorInput.value = DEFAULT_TAG_COLOR;
        }
        if (tagColorButton) {
          tagColorButton.style.setProperty("--tag-color", DEFAULT_TAG_COLOR);
        }
      }

      function openUploadModal() {
        if (uploadModal) {
          uploadModal.style.display = "flex";
          uploadModal.classList.add("modal-overlay--visible");
        }
        fetchTags();
        resetUploadModal();
      }

      function closeUploadModal() {
        if (uploadModal) {
          uploadModal.classList.remove("modal-overlay--visible");
          uploadModal.style.display = "none";
        }
        resetUploadModal();
      }

      async function handleFileSelection(files) {
        const normalized = Array.isArray(files)
          ? files.filter(Boolean)
          : Array.from(files || []).filter(Boolean);

        if (!normalized.length) {
          return;
        }

        const remainingSlots = MAX_UPLOAD_FILES - uploadQueue.length;
        if (remainingSlots <= 0) {
          showUploadToast(`Egyszerre legfeljebb ${MAX_UPLOAD_FILES} fájl tölthető fel.`);
          return;
        }

        const limitedFiles = normalized.slice(0, remainingSlots);
        if (limitedFiles.length < normalized.length) {
          showUploadToast(`Csak az első ${remainingSlots} fájl került a sorba (maximum ${MAX_UPLOAD_FILES} egyszerre).`);
        }

        const globalTags = getSelectValues(globalTagSelect);
        for (const file of limitedFiles) {
          const signature = getFileSignature(file);
          if (fileSignatures.has(signature)) {
            showUploadToast("Ez a videó már a listán van!");
            continue;
          }

          fileSignatures.add(signature);
          let thumbnail = null;
          try {
            thumbnail = await generateVideoThumbnail(file);
          } catch (error) {
            console.warn("Nem sikerült indexképet generálni:", error);
          }

          uploadQueue.push({
            file,
            signature,
            displayName: file.name,
            tags: [...globalTags],
            thumbnail,
          });
        }

        renderUploadQueue();
        updateUploadSummary();
        if (uploadBtn) {
          uploadBtn.disabled = uploadQueue.length === 0;
        }
        if (uploadStatus) {
          uploadStatus.textContent = "";
        }
      }

      if (showUploadModalBtn && uploadModal) {
        showUploadModalBtn.addEventListener("click", () => {
          if (!isUserLoggedIn()) {
            alert("A feltöltéshez be kell jelentkezned.");
            return;
          }
          if (!hasClipAccess()) {
            alert("A klipekhez való hozzáféréshez külön engedély szükséges.");
            updateClipAccessUI();
            return;
          }
          openUploadModal();
        });
      }

      if (closeUploadModalBtn) {
        closeUploadModalBtn.addEventListener("click", closeUploadModal);
      }

      if (uploadModal) {
        uploadModal.addEventListener("click", (event) => {
          if (event.target === uploadModal) {
            closeUploadModal();
          }
        });
      }

      if (dropZone && fileInput) {
        dropZone.addEventListener("click", () => fileInput.click());

        dropZone.addEventListener("dragover", (event) => {
          event.preventDefault();
          dropZone.classList.add("drag-over");
        });

        ["dragleave", "dragend"].forEach((eventName) => {
          dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("drag-over");
          });
        });

        dropZone.addEventListener("drop", (event) => {
          event.preventDefault();
          dropZone.classList.remove("drag-over");
          const files = event.dataTransfer?.files;
          if (files && files.length > 0) {
            handleFileSelection(files);
          }
        });
      }

      if (addFilesBtn && fileInput) {
        addFilesBtn.addEventListener("click", () => fileInput.click());
      }

      if (addMoreVideosBtn && fileInput) {
        addMoreVideosBtn.addEventListener("click", () => fileInput.click());
      }

      if (globalTagSelect) {
        globalTagSelect.addEventListener("change", () => {
          const selected = getSelectValues(globalTagSelect);
          uploadQueue = uploadQueue.map((item) => ({ ...item, tags: [...selected] }));
          renderUploadQueue();
        });
      }

      if (fileInput) {
        fileInput.addEventListener("change", (event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            handleFileSelection(files);
          } else {
            resetUploadModal();
          }
        });
      }

      if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener("click", () => {
          if (!isUploading) {
            closeUploadModal();
            return;
          }

          isUploadCancelled = true;
          cancelUploadBtn.disabled = true;
          if (uploadStatus) {
            uploadStatus.textContent = "Feltöltés megszakítása folyamatban...";
          }

          if (currentUploadXhr) {
            currentUploadXhr.abort();
          }
        });
      }

      if (uploadBtn) {
        uploadBtn.addEventListener("click", async () => {
          if (!isUserLoggedIn()) {
            alert("A feltöltéshez be kell jelentkezned.");
            return;
          }

          if (!uploadQueue.length) {
            alert("Válassz ki legalább egy videófájlt a feltöltéshez.");
            return;
          }

          if (isUploading) {
            return;
          }

          isUploading = true;
          isUploadCancelled = false;
          uploadedVideoIds = [];
          uploadBtn.disabled = true;
          if (cancelUploadBtn) {
            cancelUploadBtn.disabled = false;
          }
          if (uploadStatus) {
            uploadStatus.textContent = "Feltöltés folyamatban...";
          }

          const totalUploadBytes = uploadQueue.reduce((sum, item) => sum + (item.file?.size || 0), 0);
          const totalFiles = uploadQueue.length;
          const uploadStartTime = performance.now();
          let uploadedBytesSoFar = 0;

          updateUploadProgressUI({
            uploadedBytes: 0,
            totalBytes: totalUploadBytes,
            completedFiles: 0,
            totalFiles,
            etaSeconds: Infinity,
          });

          const uploadSingleFile = (item, index) =>
            new Promise((resolve, reject) => {
              const formData = new FormData();
              const metadata = [
                {
                  name: item.displayName || item.file.name,
                  tags: item.tags || [],
                  signature: item.signature,
                },
              ];

              formData.append("videos", item.file);
              formData.append("metadata", JSON.stringify(metadata));

              const xhr = new XMLHttpRequest();
              xhr.open("POST", "/upload");
              xhr.responseType = "json";
              currentUploadXhr = xhr;

              const headers = buildAuthHeaders();
              if (headers && typeof headers === "object") {
                Object.entries(headers).forEach(([key, value]) => {
                  if (value) {
                    xhr.setRequestHeader(key, value);
                  }
                });
              }

              xhr.addEventListener("abort", () => {
                reject(new Error(UPLOAD_ABORT_MESSAGE));
              });

              xhr.addEventListener("loadend", () => {
                if (currentUploadXhr === xhr) {
                  currentUploadXhr = null;
                }
              });

              xhr.upload.addEventListener("progress", (event) => {
                const currentFileUploaded = event.loaded || 0;
                const uploadedBytes = Math.min(uploadedBytesSoFar + currentFileUploaded, totalUploadBytes);
                const elapsedSeconds = Math.max((performance.now() - uploadStartTime) / 1000, 0.001);
                const speed = uploadedBytes / elapsedSeconds;
                const remainingBytes = Math.max(totalUploadBytes - uploadedBytes, 0);
                const etaSeconds = speed > 0 ? remainingBytes / speed : Infinity;

                let completedFiles = 0;
                let remainingForCount = uploadedBytes;
                for (const queuedItem of uploadQueue) {
                  const fileSize = queuedItem.file?.size || 0;
                  if (fileSize === 0) {
                    completedFiles += 1;
                    continue;
                  }
                  if (remainingForCount >= fileSize) {
                    completedFiles += 1;
                    remainingForCount -= fileSize;
                  } else {
                    break;
                  }
                }

                if (uploadStatus) {
                  uploadStatus.textContent = `Feltöltés: ${index + 1} / ${totalFiles} - "${
                    item.displayName || item.file.name
                  }"...`;
                }

                updateUploadProgressUI({
                  uploadedBytes,
                  totalBytes: totalUploadBytes,
                  completedFiles,
                  totalFiles,
                  etaSeconds,
                });
              });

              xhr.addEventListener("load", () => {
                const result = xhr.response;
                if (xhr.status >= 200 && xhr.status < 300) {
                  const finishedBytes = uploadedBytesSoFar + (item.file?.size || 0);
                  const uploadedBytes = Math.min(finishedBytes, totalUploadBytes);
                  const elapsedSeconds = Math.max((performance.now() - uploadStartTime) / 1000, 0.001);
                  const speed = uploadedBytes / elapsedSeconds;
                  const remainingBytes = Math.max(totalUploadBytes - uploadedBytes, 0);
                  const etaSeconds = speed > 0 ? remainingBytes / speed : Infinity;

                  const completedFiles = index + 1;

                  updateUploadProgressUI({
                    uploadedBytes,
                    totalBytes: totalUploadBytes,
                    completedFiles,
                    totalFiles,
                    etaSeconds,
                  });
                  uploadedBytesSoFar = uploadedBytes;
                  const idsFromResponse = Array.isArray(result?.videoIds)
                    ? result.videoIds.filter((id) => Number.isFinite(Number(id)))
                    : [];
                  if (idsFromResponse.length) {
                    uploadedVideoIds.push(...idsFromResponse);
                  }
                  resolve(result);
                } else {
                  const message = (result && result.message) || "Nem sikerült feltölteni a videót.";
                  reject(new Error(message));
                }
              });

              xhr.addEventListener("error", () => {
                reject(new Error("Hálózati hiba történt a feltöltés során."));
              });

              xhr.send(formData);
            });

          try {
            for (const [index, item] of uploadQueue.entries()) {
              await uploadSingleFile(item, index);
            }

            if (uploadStatus) {
              uploadStatus.textContent = "Videók sikeresen feltöltve.";
            }
            await loadVideos();
            setTimeout(() => {
              closeUploadModal();
            }, 800);
          } catch (error) {
            console.error("Videó feltöltési hiba:", error);
            if (isUploadCancelled || error?.message === UPLOAD_ABORT_MESSAGE) {
              if (uploadStatus) {
                uploadStatus.textContent = "Feltöltés megszakítva, videók törlése...";
              }
              try {
                if (uploadedVideoIds.length) {
                  await rollbackUploadedVideos([...new Set(uploadedVideoIds)]);
                  if (uploadStatus) {
                    uploadStatus.textContent = "Feltöltés megszakítva, már feltöltött videók törölve.";
                  }
                } else if (uploadStatus) {
                  uploadStatus.textContent = "Feltöltés megszakítva.";
                }
              } catch (rollbackError) {
                console.error("Visszavonási hiba:", rollbackError);
                if (uploadStatus) {
                  uploadStatus.textContent =
                    rollbackError.message || "Nem sikerült törölni a feltöltött videókat.";
                }
              } finally {
                uploadQueue = [];
                fileSignatures.clear();
                renderUploadQueue();
                updateUploadSummary();
                if (fileInput) {
                  fileInput.value = "";
                }
                resetUploadProgress();
              }
            } else if (uploadStatus) {
              uploadStatus.textContent = error.message || "Nem sikerült feltölteni a videót.";
            }
          } finally {
            if (uploadBtn) {
              uploadBtn.disabled = uploadQueue.length === 0;
            }
            if (cancelUploadBtn) {
              cancelUploadBtn.disabled = false;
            }
            isUploading = false;
            isUploadCancelled = false;
            currentUploadXhr = null;
            uploadedVideoIds = [];
          }
        });
      }

      function showSection(target, shouldPushState = true) {
        const navLinks = getAccessibleNavLinks();
        const sections = document.querySelectorAll("main section");
        const availableTargets = new Set(navLinks.map((link) => link.dataset.section));

        availableTargets.add("profile");

        if (!availableTargets.has(target)) {
          target = "home";
        }

        document.querySelectorAll("nav a").forEach((link) => {
          const requiresAdmin = link.dataset.requiresAdmin === "true";
          const requiresTransfer = link.dataset.requiresTransfer === "true";
          const isActive = link.dataset.section === target;

          if (
            (requiresAdmin && !isAdminUser()) ||
            (requiresTransfer && !hasFileTransferPermission())
          ) {
            link.classList.remove("active");
            return;
          }

          link.classList.toggle("active", isActive);
        });

        sections.forEach((sec) => {
          const requiresAdmin = ADMIN_ONLY_SECTIONS.has(sec.id);

          if (sec.id === target && (!requiresAdmin || isAdminUser())) {
            sec.classList.add("active");
          } else {
            sec.classList.remove("active");
          }
        });

        if (target === "klipek") {
          updateClipAccessUI();
          if (hasClipAccess()) {
            fetchTags();
            loadVideos();
          }
        }

        if (target === "szavazas") {
          refreshPollsIfVisible();
        }

        if (target === "programok") {
          loadPrograms();
        }

        if (shouldPushState) {
          history.pushState(null, "", `#${target}`);
        }
      }

      document.querySelectorAll("nav a").forEach((link) => {
        link.addEventListener("click", (e) => {
          const requiresAdmin = link.dataset.requiresAdmin === "true";
          const requiresTransfer = link.dataset.requiresTransfer === "true";

          if (requiresAdmin && !isAdminUser()) {
            e.preventDefault();
            return;
          }

          if (requiresTransfer && !hasFileTransferPermission()) {
            e.preventDefault();
            return;
          }

          e.preventDefault();
          showSection(link.dataset.section);
        });
      });

      // Oldal betöltésekor a hash alapján nyitjuk meg a megfelelő szekciót
      window.addEventListener("load", () => {
        const hash = location.hash.replace("#", "") || "home";
        showSection(hash, false);
      });

    
        function openArticle(articleId) {
            // 1. Grid elrejtése
            document.getElementById('library-view').style.display = 'none';
            // 2. Minden cikk elrejtése (biztonság kedvéért)
            document.querySelectorAll('.reader-view').forEach(el => el.classList.remove('active'));
            // 3. Kiválasztott cikk megjelenítése
            document.getElementById('article-' + articleId).classList.add('active');
            // 4. Görgetés a tetejére
            window.scrollTo(0, 0);
        }

        function closeArticle() {
            // 1. Cikkek elrejtése
            document.querySelectorAll('.reader-view').forEach(el => el.classList.remove('active'));
            // 2. Grid megjelenítése
            document.getElementById('library-view').style.display = 'block';
            // 3. Görgetés a tetejére
            window.scrollTo(0, 0);
        }

        function filterCards(category) {
            // Gombok frissítése
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            // Kártyák szűrése
            /* (Ez csak egy vizuális demo logika, élesben lehet dataset alapján) */
            alert("A szűrés funkció a demóban csak vizuális elem. A teljes kódban itt valósulna meg a DOM szűrés.");
        }
  
