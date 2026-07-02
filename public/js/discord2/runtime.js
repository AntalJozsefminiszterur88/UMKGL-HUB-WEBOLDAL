      function disconnectDiscord2Socket({ clearState = true } = {}) {
        teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: true });
        if (discord2Socket) {
          if (typeof discord2Socket.removeAllListeners === "function") {
            discord2Socket.removeAllListeners();
          }
          discord2Socket.disconnect();
          discord2Socket = null;
        }

        discord2SocketConnected = false;
        if (clearState) {
          clearDiscord2RuntimeState();
          renderDiscord2();
        }
      }

      function ensureDiscord2SocketConnection() {
        if (!hasDiscord2Access()) {
          disconnectDiscord2Socket();
          return;
        }

        const token = getStoredToken();
        if (!token) {
          return;
        }

        if (!discord2Socket) {
          discord2Socket = io({
            auth: { token },
            transports: ["polling", "websocket"],
            upgrade: false,
            rememberUpgrade: false,
            reconnection: true,
            timeout: 15000,
          });

          discord2Socket.on("connect", () => {
            discord2SocketConnected = true;
            discord2Socket.emit("discord2_join", { token: getStoredToken() });
            emitDiscord2VoiceJoinPresence(discord2VoiceDesiredChannelId);
            renderDiscord2Userbar();
          });

          discord2Socket.on("disconnect", () => {
            discord2SocketConnected = false;
            discord2State.onlineMembers = [];
            discord2State.voiceMembersByChannel = {};
            discord2State.speakingByUser = {};
            discord2State.screenSharingByUser = {};
            discord2State.selfVoiceChannelId = null;
            teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: false });
            renderDiscord2();
          });

          discord2Socket.on("discord2_state", (payload) => {
            applyDiscord2State(payload || {});
          });

          discord2Socket.on("discord2_presence", (payload) => {
            applyDiscord2Presence(payload || {});
            renderDiscord2();
          });

          discord2Socket.on("discord2_structure", (payload) => {
            applyDiscord2Structure(payload || {});
            renderDiscord2();
          });

          discord2Socket.on("discord2_server_settings", (payload) => {
            applyDiscord2ServerSettings(payload || {});
            renderDiscord2();
          });

          discord2Socket.on("discord2_message_created", (payload) => {
            upsertDiscord2Message(payload || {});
          });

          discord2Socket.on("discord2_message_deleted", (payload) => {
            removeDiscord2Message(payload || {});
          });

          discord2Socket.on("discord2_voice_room_peers", (payload) => {
            handleDiscord2VoiceRoomPeers(payload || {});
          });

          discord2Socket.on("discord2_voice_member_joined", (payload) => {
            handleDiscord2VoiceMemberJoined(payload || {});
          });

          discord2Socket.on("discord2_voice_member_left", (payload) => {
            handleDiscord2VoiceMemberLeft(payload || {});
          });

          discord2Socket.on("discord2_voice_speaking", (payload) => {
            handleDiscord2RemoteSpeaking(payload || {});
          });

          discord2Socket.on("discord2_error", (payload) => {
            const message = payload?.message ? String(payload.message) : "Ismeretlen Discord 2 hiba.";
            console.warn("Discord 2 hiba:", message);
            if (discord2UploadLabel) {
              discord2UploadLabel.textContent = message;
            }
          });
        }

        if (discord2Socket.disconnected) {
          discord2Socket.connect();
        } else if (discord2Socket.connected) {
          discord2Socket.emit("discord2_join", { token });
        }
      }

      function ensureDiscord2Initialized() {
        if (discord2Initialized || !discord2Section) {
          return;
        }

        discord2Initialized = true;
        loadDiscord2PersonalSettings();
        renderDiscord2PersonalSettingsModal();

        if (discord2ServerSettingsBtn) {
          discord2ServerSettingsBtn.addEventListener("click", () => {
            if (!isAdminUser()) {
              return;
            }
            openDiscord2ServerSettingsModal();
          });
        }

        if (discord2ServerIconBtn) {
          discord2ServerIconBtn.addEventListener("click", () => {
            if (!isAdminUser()) {
              return;
            }
            openDiscord2ServerSettingsModal();
          });
        }

        if (discord2ServerSettingsCancel) {
          discord2ServerSettingsCancel.addEventListener("click", () => {
            closeDiscord2ServerSettingsModal();
          });
        }

        if (discord2ServerSettingsModal) {
          discord2ServerSettingsModal.addEventListener("click", (event) => {
            if (event.target === discord2ServerSettingsModal) {
              closeDiscord2ServerSettingsModal();
            }
          });
        }

        if (discord2CreateCategoryFromSettings) {
          discord2CreateCategoryFromSettings.addEventListener("click", () => {
            closeDiscord2ServerSettingsModal();
            openDiscord2ManageModal({
              mode: "create-category",
              title: "\u00DAj kateg\u00F3ria",
            });
          });
        }

        if (discord2CreateTextChannelFromSettings) {
          discord2CreateTextChannelFromSettings.addEventListener("click", () => {
            if (!discord2State.categories.length) {
              alert("El\u0151bb hozz l\u00E9tre egy kateg\u00F3ri\u00E1t.");
              return;
            }
            closeDiscord2ServerSettingsModal();
            openDiscord2ManageModal({
              mode: "create-channel",
              title: "\u00DAj sz\u00F6vegcsatorna",
              channelType: "text",
              categoryId: discord2State.categories[0]?.id,
            });
          });
        }

        if (discord2CreateVoiceChannelFromSettings) {
          discord2CreateVoiceChannelFromSettings.addEventListener("click", () => {
            if (!discord2State.categories.length) {
              alert("El\u0151bb hozz l\u00E9tre egy kateg\u00F3ri\u00E1t.");
              return;
            }
            closeDiscord2ServerSettingsModal();
            openDiscord2ManageModal({
              mode: "create-channel",
              title: "\u00DAj hangcsatorna",
              channelType: "voice",
              categoryId: discord2State.categories[0]?.id,
            });
          });
        }

        if (discord2ServerLogoChooseBtn && discord2ServerLogoInput) {
          discord2ServerLogoChooseBtn.addEventListener("click", () => {
            discord2ServerLogoInput.click();
          });

          discord2ServerLogoInput.addEventListener("change", () => {
            const file = discord2ServerLogoInput.files?.[0];
            if (!file || !discord2ServerLogoCropperImage || !discord2ServerLogoCropperModal) {
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              discord2ServerLogoCropperImage.src = reader.result;
              if (discord2ServerLogoCropper) {
                discord2ServerLogoCropper.destroy();
              }
              discord2ServerLogoCropper = new Cropper(discord2ServerLogoCropperImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                ready() {
                  if (discord2ServerLogoZoomRange) {
                    discord2ServerLogoZoomRange.value = "1";
                  }
                  discord2ServerLogoCropper.zoomTo(1);
                },
              });
              discord2ServerLogoCropperModal.classList.add("open");
              discord2ServerLogoCropperModal.setAttribute("aria-hidden", "false");
            };
            reader.readAsDataURL(file);
          });
        }

        if (discord2ServerLogoZoomRange) {
          discord2ServerLogoZoomRange.addEventListener("input", (event) => {
            if (!discord2ServerLogoCropper) {
              return;
            }
            const zoomValue = Number.parseFloat(event.target.value);
            if (Number.isFinite(zoomValue)) {
              discord2ServerLogoCropper.zoomTo(zoomValue);
            }
          });
        }

        if (discord2ServerLogoCropperCancel) {
          discord2ServerLogoCropperCancel.addEventListener("click", () => {
            closeDiscord2ServerLogoCropper(true);
          });
        }

        if (discord2ServerLogoCropperSave) {
          discord2ServerLogoCropperSave.addEventListener("click", () => {
            if (!discord2ServerLogoCropper) {
              return;
            }
            const canvas = discord2ServerLogoCropper.getCroppedCanvas({
              width: 512,
              height: 512,
              imageSmoothingQuality: "high",
            });
            canvas.toBlob((blob) => {
              if (!blob) {
                return;
              }
              discord2ServerLogoBlob = blob;
              if (discord2ServerLogoObjectUrl) {
                URL.revokeObjectURL(discord2ServerLogoObjectUrl);
              }
              discord2ServerLogoObjectUrl = URL.createObjectURL(blob);
              if (discord2ServerLogoPreview) {
                discord2ServerLogoPreview.src = discord2ServerLogoObjectUrl;
              }
              closeDiscord2ServerLogoCropper();
            }, "image/png");
          });
        }

        if (discord2ServerSettingsForm) {
          discord2ServerSettingsForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!isAdminUser()) {
              return;
            }

            const serverName = String(discord2ServerNameInput?.value || "").trim();
            if (!serverName) {
              setDiscord2ServerSettingsStatus("A szerver neve k\u00F6telez\u0151.", true);
              return;
            }

            try {
              setDiscord2ServerSettingsStatus("MentAs folyamatban...");
              ensureDiscord2SocketConnection();
              if (discord2Socket) {
                discord2Socket.emit("discord2_update_server_settings", { name: serverName });
              }
              await uploadDiscord2ServerLogoIfNeeded();
              setDiscord2ServerSettingsStatus("Szerverbe\u00E1ll\u00EDt\u00E1sok mentve.");
              closeDiscord2ServerSettingsModal();
            } catch (error) {
              console.error("Discord 2 szerverbe\u00E1ll\u00EDt\u00E1s ment\u00E9si hiba:", error);
              setDiscord2ServerSettingsStatus(error?.message || "Nem siker\u00FClt menteni a be\u00E1ll\u00EDt\u00E1sokat.", true);
            }
          });
        }

        if (discord2ManageCancel) {
          discord2ManageCancel.addEventListener("click", () => {
            closeDiscord2ManageModal();
          });
        }

        if (discord2ManageModal) {
          discord2ManageModal.addEventListener("click", (event) => {
            if (event.target === discord2ManageModal) {
              closeDiscord2ManageModal();
            }
          });
        }

        if (discord2ManageForm) {
          discord2ManageForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!isAdminUser() || !discord2ManageState || !discord2ManageName) {
              return;
            }

            const normalizedName = discord2ManageName.value.trim();
            if (!normalizedName) {
              return;
            }

            ensureDiscord2SocketConnection();
            if (!discord2Socket) {
              return;
            }

            if (discord2ManageState.mode === "create-category") {
              discord2Socket.emit("discord2_create_category", { name: normalizedName });
            } else if (discord2ManageState.mode === "create-channel") {
              const parentId = normalizeDiscord2Id(discord2ManageCategory?.value);
              if (!parentId) {
                alert("Nincs el\u00E9rhet\u0151 kateg\u00F3ria.");
                return;
              }

              discord2Socket.emit("discord2_create_channel", {
                name: normalizedName,
                type: discord2ManageType?.value === "voice" ? "voice" : "text",
                categoryId: parentId,
              });
            } else if (discord2ManageState.mode === "rename-category") {
              const categoryId = normalizeDiscord2Id(discord2ManageState.targetId);
              if (categoryId) {
                discord2Socket.emit("discord2_rename_category", {
                  categoryId,
                  name: normalizedName,
                });
              }
            } else if (discord2ManageState.mode === "rename-channel") {
              const channelId = normalizeDiscord2Id(discord2ManageState.targetId);
              if (channelId) {
                discord2Socket.emit("discord2_rename_channel", {
                  channelId,
                  name: normalizedName,
                });
              }
            }

            closeDiscord2ManageModal();
          });
        }

        if (discord2ManageDeleteBtn) {
          discord2ManageDeleteBtn.addEventListener("click", () => {
            if (!discord2ManageState) {
              return;
            }

            const mode = discord2ManageState.mode;
            const targetId = discord2ManageState.targetId;
            if (!targetId) {
              return;
            }

            if (mode === "rename-category") {
              handleDiscord2Action("delete", "category", targetId);
            } else if (mode === "rename-channel") {
              handleDiscord2Action("delete", "channel", targetId);
            }
            closeDiscord2ManageModal();
          });
        }

        if (discord2ChannelTree) {
          discord2ChannelTree.addEventListener("click", (event) => {
            const actionBtn = event.target.closest("button[data-discord2-action]");
            if (actionBtn) {
              event.preventDefault();
              event.stopPropagation();

              handleDiscord2Action(
                actionBtn.dataset.discord2Action,
                actionBtn.dataset.discord2EntityType,
                actionBtn.dataset.discord2EntityId,
                actionBtn.dataset.discord2CategoryId || null,
              );
              return;
            }

            const toggleBtn = event.target.closest("button[data-discord2-toggle]");
            if (toggleBtn) {
              event.preventDefault();
              const categoryId = normalizeDiscord2Id(toggleBtn.dataset.discord2Toggle);
              if (categoryId) {
                discord2State.collapsedCategoryIds[categoryId] = !discord2State.collapsedCategoryIds[categoryId];
                renderDiscord2ChannelTree();
              }
              return;
            }

            const channelBtn = event.target.closest("button[data-discord2-channel]");
            if (channelBtn) {
              event.preventDefault();
              selectDiscord2Channel(channelBtn.dataset.discord2Channel);
            }
          });

          discord2ChannelTree.addEventListener("contextmenu", (event) => {
            if (!isAdminUser()) {
              return;
            }
            const entityNode = event.target.closest("[data-discord2-entity-type]");
            if (!entityNode) {
              return;
            }
            event.preventDefault();
            const entityType = entityNode.dataset.discord2EntityType;
            const entityId = entityNode.dataset.discord2EntityId;
            const categoryId = entityNode.dataset.discord2CategoryId || null;
            openDiscord2ContextMenu(event.clientX, event.clientY, { entityType, entityId, categoryId });
          });
        }

        if (discord2MessageList) {
          discord2MessageList.addEventListener("click", (event) => {
            const mediaTrigger = event.target.closest("[data-discord2-open-media]");
            if (!mediaTrigger) {
              return;
            }

            event.preventDefault();
            openDiscord2MediaViewer({
              kind: mediaTrigger.dataset.discord2OpenMedia,
              url: mediaTrigger.dataset.discord2MediaUrl,
              name: mediaTrigger.dataset.discord2MediaName,
              mimeType: mediaTrigger.dataset.discord2MediaType,
            });
          });

          discord2MessageList.addEventListener("contextmenu", (event) => {
            if (!isAdminUser()) {
              return;
            }

            const messageNode = event.target.closest("[data-discord2-message-id]");
            if (!messageNode) {
              return;
            }

            const messageId = normalizeDiscord2Id(messageNode.dataset.discord2MessageId);
            if (!messageId) {
              return;
            }

            event.preventDefault();
            openDiscord2ContextMenu(event.clientX, event.clientY, {
              entityType: "message",
              entityId: messageId,
            });
          });
        }

        if (discord2SendBtn) {
          discord2SendBtn.addEventListener("click", () => {
            sendDiscord2Message();
          });
        }

        if (discord2UploadBtn) {
          discord2UploadBtn.addEventListener("click", () => {
            if (discord2UploadBtn.disabled) {
              return;
            }
            discord2UploadInput?.click();
          });
        }

        if (discord2UploadInput) {
          discord2UploadInput.addEventListener("change", (event) => {
            const input = event.currentTarget;
            const file = input?.files?.[0] || null;
            if (!file) {
              clearDiscord2PendingUpload();
              return;
            }

            setDiscord2PendingUploadFile(file);
          });
        }

        if (discord2Chat) {
          discord2Chat.addEventListener("dragenter", (event) => {
            if (!isDiscord2FileDragEvent(event)) {
              return;
            }
            if (!getDiscord2SelectedChannel() || getDiscord2SelectedChannel()?.type !== "text") {
              return;
            }
            event.preventDefault();
            discord2DragDepth += 1;
            showDiscord2DropOverlay();
          });

          discord2Chat.addEventListener("dragover", (event) => {
            if (!isDiscord2FileDragEvent(event)) {
              return;
            }
            if (!getDiscord2SelectedChannel() || getDiscord2SelectedChannel()?.type !== "text") {
              return;
            }
            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = "copy";
            }
            showDiscord2DropOverlay();
          });

          discord2Chat.addEventListener("dragleave", (event) => {
            if (!isDiscord2FileDragEvent(event)) {
              return;
            }
            if (!discord2Chat.contains(event.relatedTarget)) {
              discord2DragDepth = 0;
            } else {
              discord2DragDepth = Math.max(0, discord2DragDepth - 1);
            }
            if (discord2DragDepth === 0) {
              hideDiscord2DropOverlay();
            }
          });

          discord2Chat.addEventListener("drop", (event) => {
            if (!isDiscord2FileDragEvent(event)) {
              return;
            }
            event.preventDefault();
            hideDiscord2DropOverlay(true);
            const file = event.dataTransfer?.files?.[0] || null;
            if (!file) {
              return;
            }
            setDiscord2PendingUploadFile(file);
          });
        }

        if (discord2MessageInput) {
          discord2MessageInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || event.shiftKey) {
              return;
            }
            event.preventDefault();
            sendDiscord2Message();
          });
        }

        if (discord2PersonalSettingsBtn) {
          discord2PersonalSettingsBtn.addEventListener("click", () => {
            openDiscord2PersonalSettingsModal();
          });
        }

        if (discord2PersonalSettingsClose) {
          discord2PersonalSettingsClose.addEventListener("click", () => {
            closeDiscord2PersonalSettingsModal();
          });
        }

        if (discord2PersonalSettingsModal) {
          discord2PersonalSettingsModal.addEventListener("click", (event) => {
            if (event.target === discord2PersonalSettingsModal) {
              closeDiscord2PersonalSettingsModal();
            }
          });
        }

        if (discord2PersonalMicVolume) {
          discord2PersonalMicVolume.addEventListener("input", (event) => {
            const nextValue = Number.parseInt(event.target.value, 10);
            discord2PersonalSettings.micVolume = Number.isFinite(nextValue)
              ? Math.min(200, Math.max(0, nextValue))
              : 100;
            if (discord2PersonalMicVolumeValue) {
              discord2PersonalMicVolumeValue.textContent = `${discord2PersonalSettings.micVolume}%`;
            }
            const manager = ensureDiscord2AudioManager();
            manager.updateSettings(discord2PersonalSettings);
            persistDiscord2PersonalSettings();
          });
        }

        if (discord2PersonalOutputVolume) {
          discord2PersonalOutputVolume.addEventListener("input", (event) => {
            const nextValue = Number.parseInt(event.target.value, 10);
            discord2PersonalSettings.outputVolume = Number.isFinite(nextValue)
              ? Math.min(200, Math.max(0, nextValue))
              : 100;
            if (discord2PersonalOutputVolumeValue) {
              discord2PersonalOutputVolumeValue.textContent = `${discord2PersonalSettings.outputVolume}%`;
            }
            const manager = ensureDiscord2AudioManager();
            manager.updateSettings(discord2PersonalSettings);
            persistDiscord2PersonalSettings();
            void applyDiscord2IncomingAudioPreferences();
          });
        }

        if (discord2PersonalInputDevice) {
          discord2PersonalInputDevice.addEventListener("change", async () => {
            discord2PersonalSettings.inputDeviceId = String(discord2PersonalInputDevice.value || "default");
            persistDiscord2PersonalSettings();
            try {
              await ensureDiscord2LocalStream();
            } catch (error) {
              console.warn("Discord 2 input eszköz váltási hiba:", error);
            }
          });
        }

        if (discord2PersonalOutputDevice) {
          discord2PersonalOutputDevice.addEventListener("change", () => {
            discord2PersonalSettings.outputDeviceId = String(discord2PersonalOutputDevice.value || "default");
            persistDiscord2PersonalSettings();
            const manager = ensureDiscord2AudioManager();
            manager.updateSettings(discord2PersonalSettings);
            void applyDiscord2IncomingAudioPreferences();
          });
        }

        if (discord2MicTestButton) {
          discord2MicTestButton.addEventListener("click", async () => {
            try {
              await toggleDiscord2MicTest();
            } catch (error) {
              console.warn("Discord 2 mic test hiba:", error);
            }
          });
        }

        if (discord2KrispMicTestBtn) {
          discord2KrispMicTestBtn.addEventListener("click", async () => {
            try {
              await toggleDiscord2MicTest();
            } catch (error) {
              console.warn("Discord 2 krisp mic test hiba:", error);
            }
          });
        }

        if (discord2VoiceKrispBtn) {
          discord2VoiceKrispBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleDiscord2KrispPopover();
          });
        }

        if (discord2KrispPopover) {
          discord2KrispPopover.addEventListener("click", (event) => {
            event.stopPropagation();
          });
        }

        if (discord2KrispToggle) {
          discord2KrispToggle.addEventListener("change", async () => {
            try {
              const nextMode = discord2KrispToggle.checked ? "krisp" : "standard";
              await applyDiscord2NoiseSuppressionMode(nextMode, { restartStream: true });
            } catch (error) {
              console.warn("Discord 2 krisp kapcsoló hiba:", error);
              syncDiscord2NoiseSuppressionControls();
            }
          });
        }

        if (discord2VoiceLatencyBtn) {
          const refreshLatency = () => {
            void probeDiscord2ConnectionLatency();
          };
          discord2VoiceLatencyBtn.addEventListener("mouseenter", refreshLatency);
          discord2VoiceLatencyBtn.addEventListener("focus", refreshLatency);
          discord2VoiceLatencyBtn.addEventListener("click", refreshLatency);
        }

        if (discord2InputModeVoiceActivity) {
          discord2InputModeVoiceActivity.addEventListener("change", () => {
            if (!discord2InputModeVoiceActivity.checked) {
              return;
            }
            discord2PersonalSettings.inputMode = "voice";
            persistDiscord2PersonalSettings();
            ensureDiscord2AudioManager().updateSettings(discord2PersonalSettings);
            renderDiscord2PersonalSettingsModal();
          });
        }

        if (discord2InputModePushToTalk) {
          discord2InputModePushToTalk.addEventListener("change", () => {
            if (!discord2InputModePushToTalk.checked) {
              return;
            }
            discord2PersonalSettings.inputMode = "ptt";
            persistDiscord2PersonalSettings();
            const manager = ensureDiscord2AudioManager();
            manager.updateSettings(discord2PersonalSettings);
            manager.setPushToTalkPressed(discord2PushToTalkPressed);
            renderDiscord2PersonalSettingsModal();
          });
        }

        if (discord2PersonalInputSensitivityAuto) {
          discord2PersonalInputSensitivityAuto.addEventListener("change", () => {
            discord2PersonalSettings.inputSensitivityAuto = Boolean(discord2PersonalInputSensitivityAuto.checked);
            ensureDiscord2AudioManager().updateSettings(discord2PersonalSettings);
            renderDiscord2PersonalSettingsModal();
            persistDiscord2PersonalSettings();
          });
        }

        if (discord2PersonalInputSensitivity) {
          discord2PersonalInputSensitivity.addEventListener("input", (event) => {
            const nextValue = Number.parseInt(event.target.value, 10);
            discord2PersonalSettings.inputSensitivity = Number.isFinite(nextValue)
              ? Math.min(100, Math.max(0, nextValue))
              : 50;
            discord2PersonalInputSensitivity.setAttribute(
              "aria-valuetext",
              formatDiscord2SensitivityDb(discord2PersonalSettings.inputSensitivity),
            );
            if (discord2PersonalInputSensitivityValue) {
              discord2PersonalInputSensitivityValue.textContent = formatDiscord2SensitivityDb(
                discord2PersonalSettings.inputSensitivity,
              );
            }
            ensureDiscord2AudioManager().updateSettings(discord2PersonalSettings);
            renderDiscord2InputMeter();
            persistDiscord2PersonalSettings();
          });
        }

        if (discord2PersonalNoiseSuppression) {
          discord2PersonalNoiseSuppression.addEventListener("change", async () => {
            const selectedNoiseSuppression = normalizeDiscord2NoiseSuppressionMode(discord2PersonalNoiseSuppression.value);
            try {
              await applyDiscord2NoiseSuppressionMode(selectedNoiseSuppression, { restartStream: true });
            } catch (error) {
              console.warn("Discord 2 noise suppression váltási hiba:", error);
              syncDiscord2NoiseSuppressionControls();
            }
          });
        }

        if (discord2PersonalEchoCancellation) {
          discord2PersonalEchoCancellation.addEventListener("change", async () => {
            discord2PersonalSettings.echoCancellation = Boolean(discord2PersonalEchoCancellation.checked);
            persistDiscord2PersonalSettings();
            const manager = ensureDiscord2AudioManager();
            manager.updateSettings(discord2PersonalSettings);
            if (manager.rawStream) {
              try {
                await manager.applyRealtimeInputConstraints().catch(() => false);
                emitDiscord2VoiceJoinPresence();
              } catch (error) {
                console.warn("Discord 2 echo cancellation váltási hiba:", error);
              }
            }
          });
        }

        if (discord2PersonalSettingsForm) {
          discord2PersonalSettingsForm.addEventListener("submit", (event) => {
            event.preventDefault();
          });
        }

        if (discord2MuteBtn) {
          discord2MuteBtn.addEventListener("click", () => {
            discord2State.isMuted = !discord2State.isMuted;
            if (!discord2State.isMuted && discord2State.isDeafened) {
              discord2State.isDeafened = false;
            }
            const manager = ensureDiscord2AudioManager();
            manager.setMuteState({
              muted: discord2State.isMuted,
              deafened: discord2State.isDeafened,
            });
            if (discord2State.isMuted) {
              handleDiscord2LocalSpeakingChanged(false);
            }
            void applyDiscord2IncomingAudioPreferences();
            renderDiscord2();
          });
        }

        if (discord2DeafenBtn) {
          discord2DeafenBtn.addEventListener("click", () => {
            discord2State.isDeafened = !discord2State.isDeafened;
            if (discord2State.isDeafened) {
              discord2State.isMuted = true;
            }
            const manager = ensureDiscord2AudioManager();
            manager.setMuteState({
              muted: discord2State.isMuted,
              deafened: discord2State.isDeafened,
            });
            if (discord2State.isDeafened) {
              handleDiscord2LocalSpeakingChanged(false);
            }
            void applyDiscord2IncomingAudioPreferences();
            renderDiscord2();
          });
        }

        if (discord2ScreenShareBtn) {
          discord2ScreenShareBtn.addEventListener("click", () => {
            toggleDiscord2ScreenShare();
          });
        }

        if (discord2LeaveVoiceBtn) {
          discord2LeaveVoiceBtn.addEventListener("click", () => {
            if (!normalizeDiscord2Id(discord2State.selfVoiceChannelId)) {
              return;
            }
            teardownDiscord2VoiceRuntime({ notifyServer: true, clearDesired: true });
            discord2State.selfVoiceChannelId = null;
            renderDiscord2();
          });
        }

        if (discord2ContextMenu) {
          discord2ContextMenu.addEventListener("click", (event) => {
            const actionBtn = event.target.closest("button[data-action]");
            if (!actionBtn || !discord2ContextState) {
              return;
            }
            handleDiscord2Action(
              actionBtn.dataset.action,
              discord2ContextState.entityType,
              discord2ContextState.entityId,
              discord2ContextState.categoryId,
            );
            hideDiscord2ContextMenu();
          });
        }

        if (discord2MediaViewerClose) {
          discord2MediaViewerClose.addEventListener("click", () => {
            closeDiscord2MediaViewer();
          });
        }

        if (discord2MediaViewerModal) {
          discord2MediaViewerModal.addEventListener("click", (event) => {
            if (event.target === discord2MediaViewerModal) {
              closeDiscord2MediaViewer();
            }
          });
        }

        document.addEventListener("click", (event) => {
          const clickedInsideKrispPopover = Boolean(
            (discord2KrispPopover && discord2KrispPopover.contains(event.target))
            || (discord2VoiceKrispBtn && discord2VoiceKrispBtn.contains(event.target)),
          );
          if (!clickedInsideKrispPopover) {
            closeDiscord2KrispPopover();
          }

          if (discord2ContextMenu?.contains(event.target)) {
            return;
          }
          hideDiscord2ContextMenu();
        });

        window.addEventListener("resize", () => {
          hideDiscord2ContextMenu();
          closeDiscord2KrispPopover();
        });
        window.addEventListener("scroll", () => {
          hideDiscord2ContextMenu();
          closeDiscord2KrispPopover();
        }, true);
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            hideDiscord2ContextMenu();
            closeDiscord2ManageModal();
            closeDiscord2ServerSettingsModal();
            closeDiscord2PersonalSettingsModal();
            closeDiscord2MediaViewer();
            closeDiscord2ServerLogoCropper();
            closeDiscord2KrispPopover();
          }
        });
        document.addEventListener("keydown", (event) => {
          if (event.code !== DISCORD2_PTT_KEY) {
            return;
          }
          if (discord2PersonalSettings.inputMode !== "ptt") {
            return;
          }
          if (shouldIgnoreDiscord2PttKeyEvent(event.target)) {
            return;
          }
          if (event.repeat) {
            return;
          }
          discord2PushToTalkPressed = true;
          if (discord2AudioManager) {
            discord2AudioManager.setPushToTalkPressed(true);
          }
          event.preventDefault();
        });
        document.addEventListener("keyup", (event) => {
          if (event.code !== DISCORD2_PTT_KEY) {
            return;
          }
          if (discord2PersonalSettings.inputMode !== "ptt") {
            return;
          }
          discord2PushToTalkPressed = false;
          if (discord2AudioManager) {
            discord2AudioManager.setPushToTalkPressed(false);
          }
          event.preventDefault();
        });
        window.addEventListener("blur", () => {
          if (discord2PushToTalkPressed) {
            discord2PushToTalkPressed = false;
            if (discord2AudioManager) {
              discord2AudioManager.setPushToTalkPressed(false);
            }
          }
        });

        setDiscord2ComposerReadonly("BetAltAs...");
        ensureDiscord2AudioManager().updateSettings(discord2PersonalSettings);
        renderDiscord2InputMeter();
        setDiscord2MicTestButtonLabel();
        ensureDiscord2SocketConnection();
        renderDiscord2();
      }
