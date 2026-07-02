      async function ensureDiscord2LocalStream() {
        const manager = ensureDiscord2AudioManager();
        manager.updateSettings(discord2PersonalSettings);
        const stream = manager.shouldRestartLocalStream()
          ? await manager.startLocalStream(discord2PersonalSettings.inputDeviceId)
          : manager.getTransmitStream();
        manager.setMuteState({
          muted: discord2State.isMuted,
          deafened: discord2State.isDeafened,
        });
        return stream;
      }

      function getDiscord2VoicePeerConfig() {
        return {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
          iceCandidatePoolSize: 10,
        };
      }

      function getDiscord2SelfVoiceChannelId() {
        return normalizeDiscord2Id(discord2State.selfVoiceChannelId || discord2VoiceDesiredChannelId);
      }

      function emitDiscord2VoiceJoinPresence(channelId = null) {
        const normalizedChannelId = normalizeDiscord2Id(channelId || getDiscord2SelfVoiceChannelId());
        if (!normalizedChannelId || !discord2Socket || !discord2SocketConnected || !discord2VoicePeerId) {
          return;
        }
        discord2Socket.emit("discord2_voice_join", {
          channelId: normalizedChannelId,
          peerId: discord2VoicePeerId,
        });
      }

      function scheduleDiscord2VoiceReconnectAfterSettingsChange({
        reason = "settings-change",
        delayMs = DISCORD2_VOICE_SETTINGS_REJOIN_DEBOUNCE_MS,
      } = {}) {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId) {
          return;
        }
        if (discord2VoiceSettingsRejoinInFlight) {
          return;
        }
        if (discord2VoiceSettingsRejoinTimer) {
          clearTimeout(discord2VoiceSettingsRejoinTimer);
          discord2VoiceSettingsRejoinTimer = null;
        }
        const normalizedDelay = Math.max(100, Number(delayMs) || DISCORD2_VOICE_SETTINGS_REJOIN_DEBOUNCE_MS);
        discord2VoiceSettingsRejoinTimer = setTimeout(() => {
          discord2VoiceSettingsRejoinTimer = null;
          void reconnectDiscord2VoiceAfterSettingsChange({ reason });
        }, normalizedDelay);
      }

      async function reconnectDiscord2VoiceAfterSettingsChange({ reason = "settings-change" } = {}) {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId) {
          return;
        }
        if (discord2VoiceSettingsRejoinInFlight) {
          return;
        }
        discord2VoiceSettingsRejoinInFlight = true;
        try {
          ensureDiscord2SocketConnection();
          if (!discord2Socket || !discord2SocketConnected) {
            return;
          }
          await ensureDiscord2LocalStream();
          await ensureDiscord2VoicePeer();

          closeAllDiscord2VoiceCalls();
          emitDiscord2VoiceJoinPresence(activeChannelId);

          await new Promise((resolve) => {
            setTimeout(resolve, 120);
          });
          refreshDiscord2VoiceConnections();
          await applyDiscord2IncomingAudioPreferences();
          void probeDiscord2ConnectionLatency();
        } catch (error) {
          console.warn(`Discord 2 voice reconnect hiba (${reason}):`, error);
        } finally {
          discord2VoiceSettingsRejoinInFlight = false;
        }
      }

      function emitDiscord2ScreenShareState(sharing) {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId || !discord2SocketConnected || !discord2Socket) {
          return;
        }

        discord2Socket.emit("discord2_screen_share_state", {
          sharing: sharing === true,
        });
      }

      function closeDiscord2OutgoingScreenShareCall(remoteUserId) {
        const key = String(remoteUserId);
        const callEntry = discord2ScreenShareOutgoingCallsByUser.get(key);
        if (callEntry?.call) {
          try {
            callEntry.call.close();
          } catch (_error) {}
        }
        discord2ScreenShareOutgoingCallsByUser.delete(key);
      }

      function closeAllDiscord2OutgoingScreenShareCalls() {
        Array.from(discord2ScreenShareOutgoingCallsByUser.keys()).forEach((remoteUserId) => {
          closeDiscord2OutgoingScreenShareCall(remoteUserId);
        });
      }

      function closeDiscord2RemoteScreenStream(remoteUserId) {
        const key = String(remoteUserId);
        const stream = discord2RemoteScreenStreamsByUser.get(key);
        if (!stream) {
          return;
        }
        stopDiscord2StreamTracks(stream);
        discord2RemoteScreenStreamsByUser.delete(key);
      }

      function closeDiscord2IncomingScreenShare(remoteUserId) {
        const key = String(remoteUserId);
        const callEntry = discord2ScreenShareIncomingCallsByUser.get(key);
        if (callEntry?.call) {
          try {
            callEntry.call.close();
          } catch (_error) {}
        }
        discord2ScreenShareIncomingCallsByUser.delete(key);
        closeDiscord2RemoteScreenStream(key);
      }

      function closeAllDiscord2IncomingScreenShares() {
        Array.from(discord2ScreenShareIncomingCallsByUser.keys()).forEach((remoteUserId) => {
          closeDiscord2IncomingScreenShare(remoteUserId);
        });
      }

      async function optimizeDiscord2ScreenShareSender(call) {
        const peerConnection = getDiscord2CallPeerConnection(call);
        if (!peerConnection) {
          return false;
        }

        const senders = Array.isArray(peerConnection.getSenders?.()) ? peerConnection.getSenders() : [];
        const videoSender = senders.find((sender) => sender?.track?.kind === "video");
        if (!videoSender || typeof videoSender.getParameters !== "function" || typeof videoSender.setParameters !== "function") {
          return false;
        }

        const track = videoSender.track || null;
        if (track) {
          try {
            track.contentHint = "detail";
          } catch (_error) {}
        }

        try {
          const parameters = videoSender.getParameters() || {};
          const existingEncodings = Array.isArray(parameters.encodings) && parameters.encodings.length
            ? parameters.encodings
            : [{}];

          parameters.encodings = existingEncodings.map((encoding) => ({
            ...encoding,
            maxBitrate: Math.max(Number(encoding?.maxBitrate) || 0, DISCORD2_SCREEN_SHARE_MAX_BITRATE),
            maxFramerate: Math.max(Number(encoding?.maxFramerate) || 0, DISCORD2_SCREEN_SHARE_FPS),
            scaleResolutionDownBy: 1,
          }));
          parameters.degradationPreference = "maintain-resolution";

          await videoSender.setParameters(parameters);
          return true;
        } catch (_error) {
          return false;
        }
      }

      function scheduleDiscord2ScreenShareSenderOptimization(call) {
        [0, 220, 1000, 2400].forEach((delayMs) => {
          window.setTimeout(() => {
            void optimizeDiscord2ScreenShareSender(call);
          }, delayMs);
        });
      }

      function bindDiscord2RemoteScreenShareStream(remoteUserId, stream) {
        if (!stream) {
          return;
        }

        const key = String(remoteUserId);
        const previousStream = discord2RemoteScreenStreamsByUser.get(key);
        if (previousStream && previousStream !== stream) {
          stopDiscord2StreamTracks(previousStream);
        }

        const videoTrack = stream.getVideoTracks?.()[0] || null;
        if (videoTrack) {
          videoTrack.addEventListener("ended", () => {
            if (discord2RemoteScreenStreamsByUser.get(key) !== stream) {
              return;
            }
            closeDiscord2IncomingScreenShare(key);
            renderDiscord2ScreenShareStage();
          }, { once: true });
        }

        discord2RemoteScreenStreamsByUser.set(key, stream);
        renderDiscord2ScreenShareStage();
      }

      function registerDiscord2OutgoingScreenShareCall(remoteUserId, remotePeerId, call) {
        const normalizedRemoteUserId = normalizeDiscord2Id(remoteUserId);
        if (!normalizedRemoteUserId || !call) {
          try {
            call?.close();
          } catch (_error) {}
          return;
        }

        const key = String(normalizedRemoteUserId);
        const normalizedRemotePeerId = String(remotePeerId || call.peer || "");
        const previousCall = discord2ScreenShareOutgoingCallsByUser.get(key);
        if (previousCall?.call && previousCall.call !== call) {
          if (previousCall.remotePeerId === normalizedRemotePeerId) {
            try {
              call.close();
            } catch (_error) {}
            return;
          }
          try {
            previousCall.call.close();
          } catch (_error) {}
        }

        discord2ScreenShareOutgoingCallsByUser.set(key, {
          remoteUserId: normalizedRemoteUserId,
          remotePeerId: normalizedRemotePeerId,
          call,
        });

        scheduleDiscord2ScreenShareSenderOptimization(call);

        const cleanup = () => {
          const activeCall = discord2ScreenShareOutgoingCallsByUser.get(key);
          if (activeCall?.call === call) {
            discord2ScreenShareOutgoingCallsByUser.delete(key);
          }
        };

        call.on("close", cleanup);
        call.on("error", cleanup);
      }

      function registerDiscord2IncomingScreenShareCall(remoteUserId, remotePeerId, call) {
        const normalizedRemoteUserId = normalizeDiscord2Id(remoteUserId);
        if (!normalizedRemoteUserId || !call) {
          try {
            call?.close();
          } catch (_error) {}
          return;
        }

        const key = String(normalizedRemoteUserId);
        const normalizedRemotePeerId = String(remotePeerId || call.peer || "");
        const previousCall = discord2ScreenShareIncomingCallsByUser.get(key);
        if (previousCall?.call && previousCall.call !== call) {
          if (previousCall.remotePeerId === normalizedRemotePeerId) {
            try {
              call.close();
            } catch (_error) {}
            return;
          }
          try {
            previousCall.call.close();
          } catch (_error) {}
        }

        discord2ScreenShareIncomingCallsByUser.set(key, {
          remoteUserId: normalizedRemoteUserId,
          remotePeerId: normalizedRemotePeerId,
          call,
        });

        call.on("stream", (remoteStream) => {
          bindDiscord2RemoteScreenShareStream(normalizedRemoteUserId, remoteStream);
        });

        const cleanup = () => {
          const activeCall = discord2ScreenShareIncomingCallsByUser.get(key);
          if (activeCall?.call === call) {
            discord2ScreenShareIncomingCallsByUser.delete(key);
            closeDiscord2RemoteScreenStream(key);
            renderDiscord2ScreenShareStage();
          }
        };

        call.on("close", cleanup);
        call.on("error", cleanup);
      }

      function startDiscord2ScreenShareCall(remoteUserId, remotePeerId) {
        const normalizedRemoteUserId = normalizeDiscord2Id(remoteUserId);
        if (!discord2VoicePeer || !discord2VoicePeerId || !normalizedRemoteUserId || !remotePeerId || !discord2ScreenShareStream) {
          return;
        }

        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        if (!selfUserId || selfUserId === normalizedRemoteUserId) {
          return;
        }

        const existingCall = discord2ScreenShareOutgoingCallsByUser.get(String(normalizedRemoteUserId));
        if (existingCall && existingCall.remotePeerId === String(remotePeerId)) {
          return;
        }

        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId) {
          return;
        }

        let call = null;
        try {
          call = discord2VoicePeer.call(remotePeerId, discord2ScreenShareStream, {
            metadata: {
              userId: selfUserId,
              channelId: activeChannelId,
              mediaType: DISCORD2_SCREEN_SHARE_MEDIA_TYPE,
            },
          });
        } catch (error) {
          console.warn("Discord 2 screen share hivas inditasi hiba:", error);
          return;
        }

        if (!call) {
          return;
        }

        registerDiscord2OutgoingScreenShareCall(normalizedRemoteUserId, remotePeerId, call);
      }

      function handleIncomingDiscord2ScreenShareCall(call) {
        const remoteUserId = normalizeDiscord2Id(call?.metadata?.userId);
        const remoteChannelId = normalizeDiscord2Id(call?.metadata?.channelId);
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!remoteUserId || !activeChannelId || (remoteChannelId && remoteChannelId !== activeChannelId)) {
          try {
            call?.close();
          } catch (_error) {}
          return;
        }

        try {
          call.answer();
          registerDiscord2IncomingScreenShareCall(remoteUserId, call.peer, call);
        } catch (error) {
          console.warn("Discord 2 incoming screen share hiba:", error);
          try {
            call.close();
          } catch (_innerError) {}
        }
      }

      function refreshDiscord2ScreenShareConnections() {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        if (!activeChannelId || !selfUserId || !discord2ScreenShareStream || !discord2VoicePeer || !discord2VoicePeerId) {
          closeAllDiscord2OutgoingScreenShareCalls();
          return;
        }

        const desiredMembers = new Map();
        getDiscord2ActiveVoiceMembers().forEach((member) => {
          const memberUserId = normalizeDiscord2Id(member.userId);
          if (!memberUserId || memberUserId === selfUserId) {
            return;
          }
          const peerId = String(member.peerId || "").trim();
          if (!peerId) {
            return;
          }

          desiredMembers.set(String(memberUserId), {
            userId: memberUserId,
            peerId,
          });
        });

        Array.from(discord2ScreenShareOutgoingCallsByUser.entries()).forEach(([userKey, callEntry]) => {
          const expectedMember = desiredMembers.get(userKey);
          if (!expectedMember || expectedMember.peerId !== callEntry.remotePeerId) {
            closeDiscord2OutgoingScreenShareCall(userKey);
          }
        });

        desiredMembers.forEach((member) => {
          startDiscord2ScreenShareCall(member.userId, member.peerId);
        });
      }

      function syncDiscord2RemoteScreenSharesFromPresence() {
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        const expectedSharers = new Set();

        getDiscord2ActiveVoiceMembers().forEach((member) => {
          const memberUserId = normalizeDiscord2Id(member.userId);
          if (!memberUserId || memberUserId === selfUserId || member.screenSharing !== true) {
            return;
          }
          expectedSharers.add(String(memberUserId));
        });

        Array.from(discord2ScreenShareIncomingCallsByUser.keys()).forEach((userKey) => {
          if (!expectedSharers.has(String(userKey))) {
            closeDiscord2IncomingScreenShare(userKey);
          }
        });

        Array.from(discord2RemoteScreenStreamsByUser.keys()).forEach((userKey) => {
          if (!expectedSharers.has(String(userKey))) {
            closeDiscord2RemoteScreenStream(userKey);
          }
        });
      }

      function buildDiscord2ScreenShareDescriptors() {
        const descriptors = [];
        const currentUser = getDiscord2CurrentUser();
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        const seenKeys = new Set();

        if (discord2ScreenShareStream) {
          const localKey = selfUserId ? String(selfUserId) : "self";
          descriptors.push({
            key: localKey,
            username: currentUser.username || "Te",
            stream: discord2ScreenShareStream,
            isSelf: true,
          });
          seenKeys.add(localKey);
        }

        getDiscord2ActiveVoiceMembers().forEach((member) => {
          const memberUserId = normalizeDiscord2Id(member.userId);
          if (!memberUserId || member.screenSharing !== true) {
            return;
          }
          if (selfUserId && memberUserId === selfUserId && discord2ScreenShareStream) {
            return;
          }

          const key = String(memberUserId);
          if (seenKeys.has(key)) {
            return;
          }

          descriptors.push({
            key,
            username: member.username,
            stream: discord2RemoteScreenStreamsByUser.get(key) || null,
            isSelf: false,
          });
          seenKeys.add(key);
        });

        Array.from(discord2RemoteScreenStreamsByUser.entries()).forEach(([userKey, stream]) => {
          if (seenKeys.has(String(userKey))) {
            return;
          }

          const fallbackMember = Array.isArray(discord2State.onlineMembers)
            ? discord2State.onlineMembers.find((member) => normalizeDiscord2Id(member.userId) === normalizeDiscord2Id(userKey))
            : null;

          descriptors.push({
            key: String(userKey),
            username: fallbackMember?.username || `User ${userKey}`,
            stream,
            isSelf: false,
          });
        });

        return descriptors;
      }

      function createDiscord2ScreenShareCard(cardKey) {
        const card = document.createElement("article");
        card.className = "discord2-screen-share-card";
        card.dataset.discord2ScreenShareKey = String(cardKey);
        card.innerHTML = `
          <div class="discord2-screen-share-card__frame">
            <div class="discord2-screen-share-card__placeholder" aria-hidden="true">
              <i class="fa-solid fa-display"></i>
            </div>
            <video class="discord2-screen-share-card__video" playsinline autoplay muted></video>
            <div class="discord2-screen-share-card__overlay">
              <span class="discord2-screen-share-card__badge">LIVE</span>
              <span class="discord2-screen-share-card__name"></span>
            </div>
          </div>
          <div class="discord2-screen-share-card__status"></div>
        `;
        return card;
      }

      function syncDiscord2ScreenShareCard(card, descriptor) {
        const hasStream = Boolean(descriptor.stream);
        const videoElement = card.querySelector(".discord2-screen-share-card__video");
        const placeholderElement = card.querySelector(".discord2-screen-share-card__placeholder");
        const badgeElement = card.querySelector(".discord2-screen-share-card__badge");
        const nameElement = card.querySelector(".discord2-screen-share-card__name");
        const statusElement = card.querySelector(".discord2-screen-share-card__status");

        card.classList.toggle("is-local", descriptor.isSelf === true);
        card.classList.toggle("is-pending", !hasStream);

        if (badgeElement) {
          badgeElement.textContent = descriptor.isSelf ? "PREVIEW" : "LIVE";
        }

        if (nameElement) {
          nameElement.textContent = descriptor.isSelf
            ? `${descriptor.username} (te)`
            : descriptor.username;
        }

        if (statusElement) {
          statusElement.textContent = descriptor.isSelf
            ? (hasStream ? "Sajat elo kep" : "Kepernyomegosztas indul...")
            : (hasStream ? "Elo kepernyomegosztas" : "Stream csatlakoztatas...");
        }

        if (placeholderElement) {
          placeholderElement.hidden = hasStream;
        }

        if (videoElement) {
          videoElement.hidden = !hasStream;
          videoElement.muted = descriptor.isSelf === true;
          if (videoElement.srcObject !== (descriptor.stream || null)) {
            videoElement.srcObject = descriptor.stream || null;
          }
          if (descriptor.stream) {
            videoElement.play().catch(() => {});
          } else {
            try {
              videoElement.pause();
            } catch (_error) {}
          }
        }
      }

      function renderDiscord2ScreenShareStage() {
        if (!discord2ScreenStage || !discord2ScreenStageGrid) {
          return;
        }

        const activeChannelId = getDiscord2SelfVoiceChannelId();
        const activeChannel = getDiscord2ChannelById(activeChannelId);
        const descriptors = activeChannelId ? buildDiscord2ScreenShareDescriptors() : [];
        const hasShares = descriptors.length > 0;

        discord2ScreenStage.classList.toggle("is-visible", hasShares);
        discord2ScreenStage.style.display = hasShares ? "block" : "none";

        if (!hasShares) {
          Array.from(discord2ScreenStageGrid.querySelectorAll("video")).forEach((videoElement) => {
            try {
              videoElement.pause();
            } catch (_error) {}
            videoElement.srcObject = null;
          });
          discord2ScreenStageGrid.innerHTML = "";
          if (discord2ScreenStageMeta) {
            discord2ScreenStageMeta.textContent = "No active streams";
          }
          return;
        }

        if (discord2ScreenStageMeta) {
          const shareLabel = descriptors.length === 1 ? "1 aktiv stream" : `${descriptors.length} aktiv stream`;
          const channelLabel = activeChannel ? `#${activeChannel.name}` : "voice";
          discord2ScreenStageMeta.textContent = `${shareLabel} a ${channelLabel} csatornaban`;
        }

        const existingCards = new Map();
        Array.from(discord2ScreenStageGrid.children).forEach((child) => {
          if (child instanceof HTMLElement && child.dataset.discord2ScreenShareKey) {
            existingCards.set(child.dataset.discord2ScreenShareKey, child);
          }
        });

        const desiredKeys = new Set(descriptors.map((descriptor) => String(descriptor.key)));
        existingCards.forEach((card, key) => {
          if (desiredKeys.has(String(key))) {
            return;
          }
          const videoElement = card.querySelector("video");
          if (videoElement) {
            try {
              videoElement.pause();
            } catch (_error) {}
            videoElement.srcObject = null;
          }
          card.remove();
        });

        descriptors.forEach((descriptor) => {
          const key = String(descriptor.key);
          const card = existingCards.get(key) || createDiscord2ScreenShareCard(key);
          syncDiscord2ScreenShareCard(card, descriptor);
          discord2ScreenStageGrid.appendChild(card);
        });
      }

      function stopDiscord2ScreenShare({ notifyServer = true } = {}) {
        const activeStream = discord2ScreenShareStream;
        if (!activeStream) {
          closeAllDiscord2OutgoingScreenShareCalls();
          renderDiscord2ScreenShareStage();
          renderDiscord2Userbar();
          return;
        }

        discord2ScreenShareStream = null;
        closeAllDiscord2OutgoingScreenShareCalls();
        if (notifyServer) {
          emitDiscord2ScreenShareState(false);
        }

        stopDiscord2StreamTracks(activeStream);
        renderDiscord2ScreenShareStage();
        renderDiscord2Userbar();
      }

      async function startDiscord2ScreenShare() {
        if (discord2ScreenSharePending || discord2ScreenShareStream) {
          return;
        }

        if (!canDiscord2UseScreenShare()) {
          if (discord2UploadLabel) {
            discord2UploadLabel.textContent = "A bongeszo nem tamogatja a kepernyomegosztast.";
          }
          return;
        }

        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId) {
          if (discord2UploadLabel) {
            discord2UploadLabel.textContent = "Elobb csatlakozz egy hangcsatornahoz.";
          }
          return;
        }

        discord2ScreenSharePending = true;
        renderDiscord2Userbar();

        try {
          await ensureDiscord2VoicePeer();

          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              frameRate: { ideal: DISCORD2_SCREEN_SHARE_FPS, max: DISCORD2_SCREEN_SHARE_FPS },
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
              cursor: "always",
            },
            audio: false,
          });

          const videoTrack = stream?.getVideoTracks?.()[0] || null;
          if (!videoTrack) {
            stopDiscord2StreamTracks(stream);
            throw new Error("Nem erkezett video track a kepernyomegosztashoz.");
          }

          if (!getDiscord2SelfVoiceChannelId()) {
            stopDiscord2StreamTracks(stream);
            return;
          }

          try {
            videoTrack.contentHint = "detail";
          } catch (_error) {}

          videoTrack.addEventListener("ended", () => {
            if (discord2ScreenShareStream !== stream) {
              return;
            }
            stopDiscord2ScreenShare();
          }, { once: true });

          discord2ScreenShareStream = stream;
          emitDiscord2ScreenShareState(true);
          refreshDiscord2ScreenShareConnections();
          renderDiscord2ScreenShareStage();
        } catch (error) {
          if (error?.name !== "AbortError" && error?.name !== "NotAllowedError") {
            console.warn("Discord 2 screen share inditasi hiba:", error);
            if (discord2UploadLabel) {
              discord2UploadLabel.textContent = "Nem sikerult elinditani a kepernyomegosztast.";
            }
          }
        } finally {
          discord2ScreenSharePending = false;
          renderDiscord2Userbar();
        }
      }

      function toggleDiscord2ScreenShare() {
        if (discord2ScreenShareStream) {
          stopDiscord2ScreenShare();
          return;
        }
        void startDiscord2ScreenShare();
      }

      function closeDiscord2VoiceAudio(remoteUserId) {
        const key = String(remoteUserId);
        const audioElement = discord2VoiceAudioByUser.get(key);
        if (!audioElement) {
          return;
        }
        try {
          audioElement.pause();
        } catch (_error) {}
        audioElement.srcObject = null;
        try {
          audioElement.remove();
        } catch (_error) {}
        discord2PendingAudioPlayback.delete(audioElement);
        discord2VoiceAudioByUser.delete(key);
      }

      function closeDiscord2VoiceCall(remoteUserId) {
        const key = String(remoteUserId);
        const callEntry = discord2VoiceCallsByUser.get(key);
        if (callEntry?.call) {
          try {
            callEntry.call.close();
          } catch (_error) {}
        }
        discord2VoiceCallsByUser.delete(key);
        closeDiscord2VoiceAudio(key);
      }

      function closeAllDiscord2VoiceCalls() {
        Array.from(discord2VoiceCallsByUser.keys()).forEach((remoteUserId) => {
          closeDiscord2VoiceCall(remoteUserId);
        });
      }

      function ensureDiscord2VoiceAudioElement(remoteUserId) {
        const key = String(remoteUserId);
        const existing = discord2VoiceAudioByUser.get(key);
        if (existing) {
          return existing;
        }

        const audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        audioElement.dataset.discord2VoiceUser = key;
        audioElement.style.display = "none";
        document.body.appendChild(audioElement);
        discord2VoiceAudioByUser.set(key, audioElement);
        return audioElement;
      }

      function ensureDiscord2AudioPlaybackUnlockListener() {
        if (discord2AudioUnlockListenerAttached) {
          return;
        }

        const retryPendingPlayback = () => {
          for (const audioElement of Array.from(discord2PendingAudioPlayback)) {
            if (!audioElement || !audioElement.srcObject || audioElement.muted) {
              continue;
            }
            audioElement.play()
              .then(() => {
                discord2PendingAudioPlayback.delete(audioElement);
              })
              .catch(() => {});
          }
        };

        document.addEventListener("pointerdown", retryPendingPlayback, true);
        document.addEventListener("keydown", retryPendingPlayback, true);
        discord2AudioUnlockListenerAttached = true;
      }

      async function applyDiscord2IncomingAudioPreferences() {
        const outputVolume = clamp(Number(discord2PersonalSettings.outputVolume) || 100, 0, 200);
        const manager = ensureDiscord2AudioManager();
        manager.updateSettings(discord2PersonalSettings);
        manager.setOutputVolume(outputVolume);
        await manager.setOutputDevice(discord2PersonalSettings.outputDeviceId || "default");

        const shouldMuteIncoming = discord2State.isDeafened === true;
        const effectiveVolume = clamp(outputVolume / 100, 0, 1);

        for (const audioElement of discord2VoiceAudioByUser.values()) {
          audioElement.muted = shouldMuteIncoming;
          audioElement.volume = effectiveVolume;
          await manager.applySinkId(audioElement);
          if (!audioElement.muted && audioElement.srcObject) {
            audioElement.play()
              .then(() => {
                discord2PendingAudioPlayback.delete(audioElement);
              })
              .catch(() => {
                discord2PendingAudioPlayback.add(audioElement);
                ensureDiscord2AudioPlaybackUnlockListener();
              });
          }
        }
      }

      async function bindDiscord2RemoteStream(remoteUserId, stream) {
        if (!stream) {
          return;
        }
        const audioElement = ensureDiscord2VoiceAudioElement(remoteUserId);
        audioElement.srcObject = stream;
        await applyDiscord2IncomingAudioPreferences();
        try {
          await audioElement.play();
          discord2PendingAudioPlayback.delete(audioElement);
        } catch (_error) {
          discord2PendingAudioPlayback.add(audioElement);
          ensureDiscord2AudioPlaybackUnlockListener();
        }
      }

      function registerDiscord2VoiceCall(remoteUserId, remotePeerId, call) {
        const normalizedRemoteUserId = normalizeDiscord2Id(remoteUserId);
        if (!normalizedRemoteUserId || !call) {
          try {
            call?.close();
          } catch (_error) {}
          return;
        }

        const key = String(normalizedRemoteUserId);
        const normalizedRemotePeerId = String(remotePeerId || call.peer || "");
        const previousCall = discord2VoiceCallsByUser.get(key);
        if (previousCall?.call && previousCall.call !== call) {
          if (previousCall.remotePeerId === normalizedRemotePeerId) {
            // Keep the active connection, ignore duplicate call legs.
            try {
              call.close();
            } catch (_error) {}
            return;
          }
          try {
            previousCall.call.close();
          } catch (_error) {}
        }

        discord2VoiceCallsByUser.set(key, {
          remoteUserId: normalizedRemoteUserId,
          remotePeerId: normalizedRemotePeerId,
          call,
        });

        call.on("stream", (remoteStream) => {
          bindDiscord2RemoteStream(normalizedRemoteUserId, remoteStream).catch((error) => {
            console.warn("Discord 2 remote stream hiba:", error);
          });
        });

        call.on("close", () => {
          const activeCall = discord2VoiceCallsByUser.get(key);
          if (activeCall?.call === call) {
            discord2VoiceCallsByUser.delete(key);
            closeDiscord2VoiceAudio(key);
          }
        });

        call.on("error", () => {
          const activeCall = discord2VoiceCallsByUser.get(key);
          if (activeCall?.call === call) {
            discord2VoiceCallsByUser.delete(key);
            closeDiscord2VoiceAudio(key);
          }
        });
      }

      function startDiscord2VoiceCall(remoteUserId, remotePeerId, { force = false } = {}) {
        const normalizedRemoteUserId = normalizeDiscord2Id(remoteUserId);
        if (!discord2VoicePeer || !discord2VoicePeerId || !normalizedRemoteUserId || !remotePeerId) {
          return;
        }

        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        if (!selfUserId || selfUserId === normalizedRemoteUserId) {
          return;
        }
        const selfNumericUserId = Number(selfUserId);
        const remoteNumericUserId = Number(normalizedRemoteUserId);
        if (!force) {
          if (
            Number.isFinite(selfNumericUserId)
            && Number.isFinite(remoteNumericUserId)
            && selfNumericUserId > remoteNumericUserId
          ) {
            return;
          }
        }

        const existingCall = discord2VoiceCallsByUser.get(String(normalizedRemoteUserId));
        if (existingCall && existingCall.remotePeerId === String(remotePeerId)) {
          return;
        }

        const localStream = discord2AudioManager?.getTransmitStream?.();
        if (!localStream) {
          return;
        }

        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId) {
          return;
        }

        let call = null;
        try {
          call = discord2VoicePeer.call(remotePeerId, localStream, {
            metadata: {
              userId: selfUserId,
              channelId: activeChannelId,
            },
          });
        } catch (error) {
          console.warn("Discord 2 call ind\u00EDt\u00E1si hiba:", error);
          return;
        }

        if (!call) {
          return;
        }
        registerDiscord2VoiceCall(normalizedRemoteUserId, remotePeerId, call);
      }

      async function handleIncomingDiscord2VoiceCall(call) {
        const remoteUserId = normalizeDiscord2Id(call?.metadata?.userId);
        const remoteChannelId = normalizeDiscord2Id(call?.metadata?.channelId);
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!remoteUserId || !activeChannelId || (remoteChannelId && remoteChannelId !== activeChannelId)) {
          try {
            call?.close();
          } catch (_error) {}
          return;
        }
        const normalizedCallPeerId = String(call?.peer || "").trim();
        const existingCall = discord2VoiceCallsByUser.get(String(remoteUserId));
        if (
          existingCall
          && existingCall.remotePeerId
          && existingCall.remotePeerId === normalizedCallPeerId
          && existingCall.call !== call
        ) {
          try {
            call.close();
          } catch (_error) {}
          return;
        }

        try {
          await ensureDiscord2LocalStream();
          const localStream = discord2AudioManager?.getTransmitStream?.();
          if (!localStream) {
            throw new Error("Nem sikerült lekérni a tag-eket.");
          }
          call.answer(localStream);
          registerDiscord2VoiceCall(remoteUserId, call.peer, call);
        } catch (error) {
          console.warn("Discord 2 bej\u00F6v\u0151 h\u00EDv\u00E1s hiba:", error);
          try {
            call.close();
          } catch (_innerError) {}
        }
      }

      function ensureDiscord2VoicePeer() {
        if (discord2VoicePeer && discord2VoicePeerId) {
          return Promise.resolve(discord2VoicePeerId);
        }
        if (discord2VoicePeerReady) {
          return discord2VoicePeerReady;
        }

        discord2VoicePeerReady = new Promise((resolve, reject) => {
          const voicePeer = new Peer({
            config: getDiscord2VoicePeerConfig(),
            debug: 1,
          });

          discord2VoicePeer = voicePeer;
          let settled = false;

          voicePeer.on("open", (id) => {
            discord2VoicePeerId = id;
            if (!settled) {
              settled = true;
              resolve(id);
            }

            const activeChannelId = getDiscord2SelfVoiceChannelId();
            if (activeChannelId) {
              emitDiscord2VoiceJoinPresence(activeChannelId);
            }
            if (discord2ScreenShareStream) {
              emitDiscord2ScreenShareState(true);
              refreshDiscord2ScreenShareConnections();
            }
          });

          voicePeer.on("call", (call) => {
            if (call?.metadata?.mediaType === DISCORD2_SCREEN_SHARE_MEDIA_TYPE) {
              handleIncomingDiscord2ScreenShareCall(call);
              return;
            }
            handleIncomingDiscord2VoiceCall(call);
          });

          voicePeer.on("disconnected", () => {
            discord2VoicePeerId = null;
            if (typeof voicePeer.reconnect === "function") {
              voicePeer.reconnect();
            }
          });

          voicePeer.on("close", () => {
            discord2VoicePeerId = null;
            if (discord2VoicePeer === voicePeer) {
              discord2VoicePeer = null;
            }
          });

          voicePeer.on("error", (error) => {
            console.warn("Discord 2 voice peer hiba:", error);
            if (!settled) {
              settled = true;
              reject(error);
            }
          });
        }).finally(() => {
          discord2VoicePeerReady = null;
        });

        return discord2VoicePeerReady;
      }

      function refreshDiscord2VoiceConnections() {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        if (!activeChannelId || !selfUserId) {
          closeAllDiscord2VoiceCalls();
          return;
        }

        const activeMembers = Array.isArray(discord2State.voiceMembersByChannel[String(activeChannelId)])
          ? discord2State.voiceMembersByChannel[String(activeChannelId)]
          : [];
        const desiredMembers = new Map();
        activeMembers.forEach((member) => {
          const memberUserId = normalizeDiscord2Id(member.userId);
          if (!memberUserId || memberUserId === selfUserId) {
            return;
          }
          const peerId = String(member.peerId || "").trim();
          if (!peerId) {
            return;
          }
          desiredMembers.set(String(memberUserId), { userId: memberUserId, peerId });
        });

        Array.from(discord2VoiceCallsByUser.entries()).forEach(([userKey, callEntry]) => {
          const expectedMember = desiredMembers.get(userKey);
          if (!expectedMember || expectedMember.peerId !== callEntry.remotePeerId) {
            closeDiscord2VoiceCall(userKey);
          }
        });

        desiredMembers.forEach((member) => {
          startDiscord2VoiceCall(member.userId, member.peerId);
        });
        refreshDiscord2ScreenShareConnections();
      }

      function setDiscord2MemberSpeaking(userId, speaking) {
        const normalizedUserId = normalizeDiscord2Id(userId);
        if (!normalizedUserId) {
          return;
        }
        if (speaking) {
          discord2State.speakingByUser[String(normalizedUserId)] = true;
        } else {
          delete discord2State.speakingByUser[String(normalizedUserId)];
        }
      }

      function emitDiscord2SpeakingState(speaking, { force = false } = {}) {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId || !discord2SocketConnected || !discord2Socket) {
          discord2LastSpeakingSentState = speaking === true;
          return;
        }
        const speakingState = speaking === true;
        if (!force && discord2LastSpeakingSentState === speakingState) {
          return;
        }
        discord2LastSpeakingSentState = speakingState;
        discord2Socket.emit("discord2_voice_speaking", { speaking: speakingState });
      }

      function handleDiscord2LocalSpeakingChanged(speaking, { emit = true } = {}) {
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        if (selfUserId) {
          setDiscord2MemberSpeaking(selfUserId, speaking === true);
        }
        if (emit) {
          emitDiscord2SpeakingState(speaking === true);
        } else {
          discord2LastSpeakingSentState = speaking === true;
        }
        renderDiscord2();
      }

      function handleDiscord2RemoteSpeaking(payload) {
        const channelId = normalizeDiscord2Id(payload?.channelId);
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (channelId && activeChannelId && channelId !== activeChannelId) {
          return;
        }
        const remoteUserId = normalizeDiscord2Id(payload?.userId);
        if (!remoteUserId) {
          return;
        }
        setDiscord2MemberSpeaking(remoteUserId, payload?.speaking === true);
        renderDiscord2();
      }

      function shouldIgnoreDiscord2PttKeyEvent(target) {
        if (!(target instanceof Element)) {
          return false;
        }
        if (target.isContentEditable) {
          return true;
        }
        const tagName = String(target.tagName || "").toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "button") {
          return true;
        }
        if (target.closest("[contenteditable='true']")) {
          return true;
        }
        return false;
      }

      function handleDiscord2VoiceRoomPeers(payload) {
        const channelId = normalizeDiscord2Id(payload?.channelId);
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!channelId || !activeChannelId || channelId !== activeChannelId) {
          return;
        }

        const peers = Array.isArray(payload?.peers) ? payload.peers : [];
        peers.forEach((peerInfo) => {
          const remoteUserId = normalizeDiscord2Id(peerInfo?.userId);
          const remotePeerId = String(peerInfo?.peerId || "").trim();
          if (!remoteUserId || !remotePeerId) {
            return;
          }
          setDiscord2MemberSpeaking(remoteUserId, peerInfo?.speaking === true);
          startDiscord2VoiceCall(remoteUserId, remotePeerId);
        });
        refreshDiscord2ScreenShareConnections();
        renderDiscord2();
      }

      function handleDiscord2VoiceMemberJoined(payload) {
        const channelId = normalizeDiscord2Id(payload?.channelId);
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!channelId || !activeChannelId || channelId !== activeChannelId) {
          return;
        }
        const remoteUserId = normalizeDiscord2Id(payload?.userId);
        const remotePeerId = String(payload?.peerId || "").trim();
        if (!remoteUserId || !remotePeerId) {
          return;
        }
        setDiscord2MemberSpeaking(remoteUserId, payload?.speaking === true);
        startDiscord2VoiceCall(remoteUserId, remotePeerId);
        refreshDiscord2ScreenShareConnections();
        renderDiscord2();
      }

      function handleDiscord2VoiceMemberLeft(payload) {
        const remoteUserId = normalizeDiscord2Id(payload?.userId);
        if (!remoteUserId) {
          return;
        }
        closeDiscord2VoiceCall(remoteUserId);
        closeDiscord2OutgoingScreenShareCall(remoteUserId);
        closeDiscord2IncomingScreenShare(remoteUserId);
        setDiscord2MemberSpeaking(remoteUserId, false);
        refreshDiscord2ScreenShareConnections();
        renderDiscord2();
      }

      function teardownDiscord2VoiceRuntime({ notifyServer = true, clearDesired = true } = {}) {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (discord2VoiceSettingsRejoinTimer) {
          clearTimeout(discord2VoiceSettingsRejoinTimer);
          discord2VoiceSettingsRejoinTimer = null;
        }
        discord2VoiceSettingsRejoinInFlight = false;
        closeAllDiscord2VoiceCalls();
        stopDiscord2ScreenShare({ notifyServer });
        closeAllDiscord2IncomingScreenShares();
        stopDiscord2LatencyPolling({ clearValue: true });
        closeDiscord2KrispPopover();

        if (notifyServer && activeChannelId && discord2SocketConnected && discord2Socket) {
          discord2Socket.emit("discord2_voice_leave");
        }

        if (clearDesired) {
          discord2VoiceDesiredChannelId = null;
        }
        discord2VoiceCurrentChannelId = null;
        discord2LastSpeakingSentState = null;
        handleDiscord2LocalSpeakingChanged(false, { emit: notifyServer });
      }

      function destroyDiscord2VoiceInfrastructure() {
        teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: true });
        stopDiscord2MicTestVisualizer();
        if (discord2AudioManager) {
          discord2AudioManager.dispose();
          discord2AudioManager = null;
        }
        if (discord2VoicePeer) {
          try {
            discord2VoicePeer.destroy();
          } catch (_error) {}
          discord2VoicePeer = null;
        }
        discord2VoicePeerId = null;
        discord2VoicePeerReady = null;
        discord2PushToTalkPressed = false;
      }

      async function joinDiscord2VoiceChannel(channelId) {
        const normalizedChannelId = normalizeDiscord2Id(channelId);
        if (!normalizedChannelId) {
          return;
        }

        discord2VoiceDesiredChannelId = normalizedChannelId;
        ensureDiscord2SocketConnection();

        try {
          await ensureDiscord2LocalStream();
          await ensureDiscord2VoicePeer();

          emitDiscord2VoiceJoinPresence(normalizedChannelId);
          await applyDiscord2IncomingAudioPreferences();
        } catch (error) {
          console.error("Discord 2 voice csatlakoz\u00E1si hiba:", error);
          if (discord2UploadLabel) {
            discord2UploadLabel.textContent = "Nem siker\u00FClt mikrofont csatlakoztatni a hangcsatorn\u00E1hoz.";
          }
          teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: true });
        }
      }

