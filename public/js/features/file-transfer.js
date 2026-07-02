    const transfers = new Map();
    const RECEIVER_TOGGLE_KEY = "receiverToggleState";
    let peer = null;
    let socket = null;
    let peerId = null;
    let selectedReceiver = null;
    // Fast mode prioritizes throughput over strict transfer validation.
    const P2P_FAST_TRANSFER_MODE = false;
    const P2P_CHUNK_SIZE = P2P_FAST_TRANSFER_MODE ? 256 * 1024 : 64 * 1024;
    const P2P_ACK_EVERY_BYTES = P2P_FAST_TRANSFER_MODE ? 32 * 1024 * 1024 : 5 * 1024 * 1024;
    const P2P_ACK_EVERY_CHUNKS = P2P_FAST_TRANSFER_MODE ? 200 : 50;
    const P2P_BUFFERED_THRESHOLD = P2P_FAST_TRANSFER_MODE ? 64 * 1024 * 1024 : 24 * 1024 * 1024;
    const P2P_RAW_BATCH_BYTES = P2P_FAST_TRANSFER_MODE ? 64 * 1024 * 1024 : 24 * 1024 * 1024;
    const P2P_BACKPRESSURE_POLL_MS = P2P_FAST_TRANSFER_MODE ? 1 : 4;
    const P2P_CHUNK_MODE_RAW = "raw-v1";
    const P2P_CHUNK_MODE_LEGACY = "legacy";
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
        return "?";
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
      fileInfo.textContent = `${formatFileSize(size)} \u2022 ${mimeType || "Ismeretlen"}`;

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
      etaEl.textContent = "ETA: ?";
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

    async function normalizeChunkToArrayBuffer(payload) {
      if (!payload) {
        return null;
      }

      if (payload instanceof ArrayBuffer) {
        return payload;
      }

      if (ArrayBuffer.isView(payload)) {
        const { buffer, byteOffset, byteLength } = payload;
        if (byteOffset === 0 && byteLength === buffer.byteLength) {
          return buffer;
        }
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }

      if (payload instanceof Blob) {
        return payload.arrayBuffer();
      }

      if (Array.isArray(payload)) {
        return Uint8Array.from(payload).buffer;
      }

      if (typeof payload === "object" && payload.type === "Buffer" && Array.isArray(payload.data)) {
        return Uint8Array.from(payload.data).buffer;
      }

      return null;
    }

    async function resolveIncomingChunkBuffer(data) {
      if (!data) {
        return null;
      }

      if (typeof data === "object" && data.type === "chunk") {
        return normalizeChunkToArrayBuffer(data.data);
      }

      return normalizeChunkToArrayBuffer(data);
    }

    function processIncomingChunk(transfer, conn, chunkBuffer, seq = null) {
      if (!transfer || !chunkBuffer || transfer.isCancelled || !transfer.isAccepted) {
        return false;
      }
      if (!transfer.startTime) {
        transfer.startTime = Date.now();
      }

      if (Number.isInteger(seq) && transfer.seenSeqs) {
        if (transfer.seenSeqs.has(seq)) {
          return true;
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

      return true;
    }

    function finalizeIncomingTransfer(transfer, conn) {
      if (!transfer || transfer.completed || transfer.isCancelled) {
        return;
      }

      const expectedSizeRaw = Number(transfer.size);
      let expectedSize =
        Number.isFinite(expectedSizeRaw) && expectedSizeRaw >= 0 ? expectedSizeRaw : null;

      if (expectedSize === 0 && transfer.received > 0) {
        // Guard against malformed metadata where declared size becomes 0.
        expectedSize = null;
      }

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
      if (expectedSize !== null && expectedSize > 0 && blob.size === 0) {
        console.error("Transfer failed: generated blob is empty.");
        finalizeTransfer(transfer, "Hiba: üres fájl érkezett, letöltés megszakítva.");
        if (conn?.open) {
          conn.send({
            type: "complete_ack",
            success: false,
            message: "Üres fájl",
          });
        }
        return;
      }

      if (expectedSize !== null && expectedSize > 0 && transfer.received > expectedSize) {
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

        finalizeTransfer(transfer, "Fájl sikeresen elküldve.");
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
        transports: ["polling", "websocket"],
        upgrade: false,
        rememberUpgrade: false,
        reconnection: true,
        timeout: 15000,
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
        updateReceiverStatus("Kapcsolat bontva a jelzL szerverrel.");
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
        if (data == null) {
          return;
        }

        const messageType =
          data &&
          typeof data === "object" &&
          !(data instanceof ArrayBuffer) &&
          !ArrayBuffer.isView(data) &&
          !(data instanceof Blob)
            ? data.type
            : "chunk";

        let transfer = getTransferByConn(conn);

        if (messageType === "meta") {
          if (transfer) {
            conn.send({ type: "meta_ack" });
            return;
          }

          const transferId = `incoming-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const declaredSizeRaw = Number(data.size);
          const declaredSize =
            Number.isFinite(declaredSizeRaw) && declaredSizeRaw >= 0 ? declaredSizeRaw : null;
          transfer = createTransferCard({
            id: transferId,
            direction: "incoming",
            name: data.name,
            size: declaredSize,
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
                await sendSignalWithRetry(
                  conn,
                  transfer,
                  { type: "accept", chunkMode: P2P_CHUNK_MODE_RAW },
                  "accept_ack",
                );
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
          updateTransferStatus(transfer, "Batch elküldve, ACK kérés...");

          return;
        }

        if (!transfer) {
          return;
        }

        if (messageType === "accept_ack") {
          resolveSignalAck(transfer, "accept_ack", data);
          return;
        }

        if (messageType === "ack_request") {
          sendReceiverAck(conn, transfer);
          return;
        }

        if (messageType === "chunk") {
          const chunkBuffer = await resolveIncomingChunkBuffer(data);
          if (!chunkBuffer) {
            console.warn("Érvénytelen chunk érkezett, kihagyva.");
            return;
          }
          processIncomingChunk(transfer, conn, chunkBuffer, data?.seq);
          return;
        }

        if (messageType === "complete") {
          if (transfer.completed) {
            if (conn?.open) {
              conn.send({ type: "complete_ack", success: true });
            }
            return;
          }

          if (
            Number.isFinite(transfer.size) &&
            transfer.received < transfer.size
          ) {
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

        if (messageType === "reject") {
          finalizeTransfer(transfer, "A címzett elutasította a küldést.");
          return;
        }

        if (messageType === "cancel") {
          transfer.isCancelled = true;
          finalizeTransfer(transfer, "A címzett megszakította az átvitelt.");
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
      const useRawChunkMode = transfer.remoteChunkMode === P2P_CHUNK_MODE_RAW;
      const batchBytesTarget = useRawChunkMode ? P2P_RAW_BATCH_BYTES : P2P_ACK_EVERY_BYTES;
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

        while (offset < file.size && batchBytesSent < batchBytesTarget) {
          while ((conn.dataChannel?.bufferedAmount ?? 0) > bufferedThreshold) {
            await delay(P2P_BACKPRESSURE_POLL_MS);
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
          if (useRawChunkMode) {
            conn.send(buffer);
          } else {
            conn.send({ type: "chunk", data: buffer, seq: chunksSent });
          }
          offset += buffer.byteLength;
          chunksSent += 1;
          batchBytesSent += buffer.byteLength;
          transfer.sentBytes = offset;
          transfer.sentChunks = chunksSent;

          if (chunksSent % 50 === 0 || offset >= file.size) {
            const percent = Math.min(100, Math.round((offset / file.size) * 100));
            updateTransferStatus(transfer, `Küldés: ${percent}%`);
            updateTransferProgress(transfer, offset, file.size);
          }
        }

        if (!useRawChunkMode) {
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
      }

      if (transfer.isCancelled) {
        return;
      }

      const requireFinalChunkAck = true;
      if (requireFinalChunkAck) {
        if (conn.open) {
          conn.send({ type: "ack_request", targetBytes: file.size, targetChunks: chunksSent });
        }

        try {
          await waitForChunkAckWithRetry(transfer, conn, file.size);
        } catch (err) {
          transfer.isCancelled = true;
          finalizeTransfer(transfer, "Nem érkezett végleges visszaigazolás.");
          conn.close();
          return;
        }
      }

      updateTransferStatus(transfer, "Átvitel lezárása...");

      try {
        const ack = await sendSignalWithRetry(conn, transfer, { type: "complete" }, "complete_ack");
        if (ack && ack.success === false) {
          finalizeTransfer(transfer, "A fogadó elutasította a küldést.");
          return;
        }
        updateTransferProgress(transfer, file.size, file.size);
        finalizeTransfer(transfer, "Fájl mentése elindítva.");
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
      transfer.remoteChunkMode = P2P_CHUNK_MODE_LEGACY;
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
          transfer.remoteChunkMode =
            data?.chunkMode === P2P_CHUNK_MODE_RAW
              ? P2P_CHUNK_MODE_RAW
              : P2P_CHUNK_MODE_LEGACY;
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

