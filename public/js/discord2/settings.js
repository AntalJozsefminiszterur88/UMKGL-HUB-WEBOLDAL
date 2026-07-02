      function normalizeDiscord2NoiseSuppressionMode(rawValue) {
        const normalized = String(rawValue || "").trim().toLowerCase();
        if (normalized === "none") {
          return "none";
        }
        if (normalized === "krisp") {
          return "krisp";
        }
        return "standard";
      }

      function normalizeDiscord2PersonalSettings(rawSettings = {}) {
        const rawMicVolume = Number.parseInt(rawSettings?.micVolume, 10);
        const rawOutputVolume = Number.parseInt(
          rawSettings?.outputVolume ?? rawSettings?.masterVolume,
          10,
        );
        const rawSensitivity = Number.parseInt(rawSettings?.inputSensitivity, 10);
        const normalizedInputMode = rawSettings?.inputMode === "ptt"
          || rawSettings?.pushToTalk === true
          ? "ptt"
          : "voice";
        const normalizedNoiseSuppression = normalizeDiscord2NoiseSuppressionMode(rawSettings?.noiseSuppression);

        return {
          inputDeviceId: String(rawSettings?.inputDeviceId || "default") || "default",
          outputDeviceId: String(rawSettings?.outputDeviceId || "default") || "default",
          micVolume: Number.isFinite(rawMicVolume) ? Math.min(200, Math.max(0, rawMicVolume)) : 100,
          outputVolume: Number.isFinite(rawOutputVolume) ? Math.min(200, Math.max(0, rawOutputVolume)) : 100,
          inputMode: normalizedInputMode,
          inputSensitivityAuto: rawSettings?.inputSensitivityAuto !== false,
          inputSensitivity: Number.isFinite(rawSensitivity) ? Math.min(100, Math.max(0, rawSensitivity)) : 50,
          noiseSuppression: normalizedNoiseSuppression,
          echoCancellation: rawSettings?.echoCancellation !== false,
        };
      }

      function getDiscord2PersonalSettingsStorageKey() {
        const userId = getCurrentUserId();
        if (Number.isFinite(userId) && userId > 0) {
          return `${DISCORD2_PERSONAL_SETTINGS_KEY}:uid:${userId}`;
        }

        const username = String(localStorage.getItem(SESSION_KEYS.username) || "").trim().toLowerCase();
        if (username) {
          return `${DISCORD2_PERSONAL_SETTINGS_KEY}:user:${username}`;
        }

        return `${DISCORD2_PERSONAL_SETTINGS_KEY}:default`;
      }

      function persistDiscord2PersonalSettings() {
        try {
          localStorage.setItem(getDiscord2PersonalSettingsStorageKey(), JSON.stringify(discord2PersonalSettings));
        } catch (error) {
          console.warn("Discord 2 személyes beállítás mentési hiba:", error);
        }
      }

      function loadDiscord2PersonalSettings() {
        try {
          const storageKey = getDiscord2PersonalSettingsStorageKey();
          let raw = localStorage.getItem(storageKey);

          if (!raw) {
            raw = localStorage.getItem(DISCORD2_PERSONAL_SETTINGS_LEGACY_KEY);
            if (raw && storageKey !== DISCORD2_PERSONAL_SETTINGS_LEGACY_KEY) {
              localStorage.setItem(storageKey, raw);
            }
          }

          if (!raw) {
            discord2PersonalSettings = { ...DEFAULT_DISCORD2_PERSONAL_SETTINGS };
            return;
          }

          const parsed = JSON.parse(raw);
          discord2PersonalSettings = normalizeDiscord2PersonalSettings(parsed);
        } catch (error) {
          console.warn("Discord 2 személyes beállítás betöltési hiba:", error);
          discord2PersonalSettings = { ...DEFAULT_DISCORD2_PERSONAL_SETTINGS };
        }
      }

      function getDiscord2CallPeerConnection(call) {
        if (!call) {
          return null;
        }
        const peerConnection = call.peerConnection
          || call._pc
          || call._negotiator?._pc
          || call._peerConnection
          || call.connection?._pc
          || call.connection?.peerConnection
          || null;
        if (!peerConnection || typeof peerConnection.getSenders !== "function") {
          return null;
        }
        return peerConnection;
      }

      async function replaceDiscord2CallAudioTrack(call, nextTrack) {
        const peerConnection = getDiscord2CallPeerConnection(call);
        if (!peerConnection || !nextTrack) {
          return false;
        }
        const senders = Array.isArray(peerConnection.getSenders?.()) ? peerConnection.getSenders() : [];
        const audioSender = senders.find((sender) => sender?.track?.kind === "audio")
          || senders.find((sender) => sender && !sender.track);
        if (!audioSender || typeof audioSender.replaceTrack !== "function") {
          return false;
        }
        try {
          await audioSender.replaceTrack(nextTrack);
          return true;
        } catch (error) {
          console.warn("Discord 2 replaceTrack hiba:", error);
          return false;
        }
      }

      async function refreshDiscord2ActiveCallTracks(nextStream) {
        const nextTrack = nextStream?.getAudioTracks?.()[0] || null;
        if (!nextTrack || !discord2VoiceCallsByUser.size) {
          return;
        }

        const callEntries = Array.from(discord2VoiceCallsByUser.entries());
        const replacementResults = await Promise.all(callEntries.map(([, callEntry]) => {
          return replaceDiscord2CallAudioTrack(callEntry?.call, nextTrack);
        }));

        const failedMembers = [];
        replacementResults.forEach((success, index) => {
          if (success) {
            return;
          }
          const [remoteUserId, callEntry] = callEntries[index];
          failedMembers.push({
            remoteUserId,
            remotePeerId: String(callEntry?.remotePeerId || "").trim(),
          });
          closeDiscord2VoiceCall(remoteUserId);
        });

        if (failedMembers.length) {
          failedMembers.forEach(({ remoteUserId, remotePeerId }) => {
            if (remotePeerId) {
              startDiscord2VoiceCall(remoteUserId, remotePeerId, { force: true });
            }
          });
          window.setTimeout(() => {
            if (!getDiscord2SelfVoiceChannelId()) {
              return;
            }
            failedMembers.forEach(({ remoteUserId, remotePeerId }) => {
              if (remotePeerId) {
                startDiscord2VoiceCall(remoteUserId, remotePeerId, { force: true });
              }
            });
          }, 700);
          refreshDiscord2VoiceConnections();
        }
      }

      function ensureDiscord2AudioManager() {
        if (!discord2AudioManager) {
          discord2AudioManager = new Discord2AudioManager({
            onLevelChange(level, threshold, rms) {
              discord2State.inputMeterLevel = level;
              discord2State.inputMeterThreshold = threshold;
              discord2State.inputMeterRms = clamp(Number(rms) || 0, 0, 1);
              renderDiscord2InputMeter();
            },
            onSpeakingChange(speaking) {
              handleDiscord2LocalSpeakingChanged(speaking);
            },
            onStreamReady(stream) {
              // Update existing voice calls in-place to avoid dropping audio after settings changes.
              void refreshDiscord2ActiveCallTracks(stream)
                .finally(() => {
                  emitDiscord2VoiceJoinPresence();
                  refreshDiscord2VoiceConnections();
                });
            },
          });
        }

        discord2AudioManager.updateSettings(discord2PersonalSettings);
        return discord2AudioManager;
      }

      function supportsDiscord2SinkId() {
        return typeof HTMLMediaElement !== "undefined"
          && HTMLMediaElement.prototype
          && typeof HTMLMediaElement.prototype.setSinkId === "function";
      }

      function syncDiscord2NoiseSuppressionControls() {
        const normalizedMode = normalizeDiscord2NoiseSuppressionMode(discord2PersonalSettings.noiseSuppression);
        discord2PersonalSettings.noiseSuppression = normalizedMode;

        if (discord2PersonalNoiseSuppression) {
          discord2PersonalNoiseSuppression.value = normalizedMode;
        }

        const krispEnabled = normalizedMode === "krisp";
        if (discord2KrispToggle) {
          discord2KrispToggle.checked = krispEnabled;
        }

        if (discord2VoiceKrispBtn) {
          discord2VoiceKrispBtn.classList.toggle("is-active", krispEnabled);
          discord2VoiceKrispBtn.setAttribute("aria-pressed", krispEnabled ? "true" : "false");
          discord2VoiceKrispBtn.title = krispEnabled
            ? "DeepFilter zajszűrés: bekapcsolva"
            : "DeepFilter zajszűrés: kikapcsolva";
        }
      }

      async function applyDiscord2NoiseSuppressionMode(nextMode, { restartStream = true } = {}) {
        const normalizedMode = normalizeDiscord2NoiseSuppressionMode(nextMode);
        discord2PersonalSettings.noiseSuppression = normalizedMode;
        persistDiscord2PersonalSettings();

        const manager = ensureDiscord2AudioManager();
        manager.updateSettings(discord2PersonalSettings);
        if (restartStream && manager.rawStream) {
          await manager.applyRealtimeInputConstraints().catch(() => false);
        }

        syncDiscord2NoiseSuppressionControls();
        emitDiscord2VoiceJoinPresence();
        renderDiscord2Userbar();
      }

      function collectDiscord2LatencyRttSamplesFromStats(stats) {
        const rttSamplesSeconds = [];
        let selectedCandidatePairId = null;
        stats.forEach((report) => {
          if (report?.type === "transport" && report.selectedCandidatePairId) {
            selectedCandidatePairId = String(report.selectedCandidatePairId);
          }
        });

        stats.forEach((report) => {
          if (report?.type !== "candidate-pair") {
            return;
          }
          const rttSeconds = Number(report.currentRoundTripTime);
          if (!Number.isFinite(rttSeconds) || rttSeconds <= 0) {
            return;
          }
          const isSelected = (
            (selectedCandidatePairId && String(report.id) === selectedCandidatePairId)
            || report.nominated === true
            || report.selected === true
          );
          if (isSelected) {
            rttSamplesSeconds.push(rttSeconds);
          }
        });

        if (rttSamplesSeconds.length) {
          return rttSamplesSeconds;
        }

        stats.forEach((report) => {
          if (report?.type !== "remote-inbound-rtp") {
            return;
          }
          const mediaKind = String(report.kind || report.mediaType || "").toLowerCase();
          if (mediaKind !== "audio") {
            return;
          }
          const rttSeconds = Number(report.roundTripTime);
          if (!Number.isFinite(rttSeconds) || rttSeconds <= 0) {
            return;
          }
          rttSamplesSeconds.push(rttSeconds);
        });

        return rttSamplesSeconds;
      }

      async function probeDiscord2VoicePathLatency() {
        if (!discord2VoiceCallsByUser.size) {
          return null;
        }
        const callEntries = Array.from(discord2VoiceCallsByUser.values());
        if (!callEntries.length) {
          return null;
        }

        const measuredValues = await Promise.all(callEntries.map(async (callEntry) => {
          const peerConnection = getDiscord2CallPeerConnection(callEntry?.call);
          if (!peerConnection || typeof peerConnection.getStats !== "function") {
            return null;
          }
          try {
            const stats = await peerConnection.getStats();
            const rttSamples = collectDiscord2LatencyRttSamplesFromStats(stats);
            if (!rttSamples.length) {
              return null;
            }
            const bestRttSeconds = Math.min(...rttSamples);
            if (!Number.isFinite(bestRttSeconds) || bestRttSeconds <= 0) {
              return null;
            }
            // UI should show perceived one-way voice path delay.
            return Math.round((bestRttSeconds * 1000) / 2);
          } catch (_error) {
            return null;
          }
        }));

        const valid = measuredValues
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value >= 0);
        if (!valid.length) {
          return null;
        }
        return Math.min(...valid);
      }

      function updateDiscord2LatencyIndicator() {
        if (!discord2VoiceLatencyBtn) {
          return;
        }

        discord2VoiceLatencyBtn.classList.remove("is-good", "is-medium", "is-bad", "is-unknown");
        const latency = Number(discord2ConnectionLatencyMs);
        if (!Number.isFinite(latency)) {
          discord2VoiceLatencyBtn.classList.add("is-unknown");
          discord2VoiceLatencyBtn.title = "Latency: measuring...";
          discord2VoiceLatencyBtn.dataset.latencyTip = "Measuring...";
          discord2VoiceLatencyBtn.setAttribute("aria-label", "Latency: measuring...");
          return;
        }

        let qualityClass = "is-bad";
        if (latency < 60) {
          qualityClass = "is-good";
        } else if (latency < 140) {
          qualityClass = "is-medium";
        }

        const tooltipText = `${latency} ms`;
        discord2VoiceLatencyBtn.classList.add(qualityClass);
        discord2VoiceLatencyBtn.title = `Latency: ${tooltipText}`;
        discord2VoiceLatencyBtn.dataset.latencyTip = tooltipText;
        discord2VoiceLatencyBtn.setAttribute("aria-label", `Latency: ${tooltipText}`);
      }

      async function probeDiscord2ConnectionLatency() {
        if (discord2LatencyProbeInFlight) {
          return;
        }
        if (!discord2Socket || !discord2SocketConnected) {
          discord2ConnectionLatencyMs = null;
          updateDiscord2LatencyIndicator();
          return;
        }

        discord2LatencyProbeInFlight = true;
        const probeNonce = ++discord2LatencyProbeNonce;
        const voicePathLatency = await probeDiscord2VoicePathLatency();
        if (probeNonce !== discord2LatencyProbeNonce) {
          discord2LatencyProbeInFlight = false;
          return;
        }
        if (Number.isFinite(voicePathLatency)) {
          discord2ConnectionLatencyMs = Math.max(0, Math.round(voicePathLatency));
          updateDiscord2LatencyIndicator();
          discord2LatencyProbeInFlight = false;
          return;
        }

        const startedAt = performance.now();
        await new Promise((resolve) => {
          let settled = false;
          const finish = (value) => {
            if (settled) {
              return;
            }
            settled = true;
            clearTimeout(timeoutId);
            if (probeNonce !== discord2LatencyProbeNonce) {
              discord2LatencyProbeInFlight = false;
              resolve();
              return;
            }
            discord2ConnectionLatencyMs = Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
            updateDiscord2LatencyIndicator();
            discord2LatencyProbeInFlight = false;
            resolve();
          };

          const timeoutId = setTimeout(() => {
            finish(null);
          }, DISCORD2_LATENCY_TIMEOUT_MS);

          try {
            discord2Socket.emit("discord2_ping", () => {
              finish((performance.now() - startedAt) / 2);
            });
          } catch (_error) {
            finish(null);
          }
        });
      }

      function stopDiscord2LatencyPolling({ clearValue = true } = {}) {
        if (discord2LatencyPollTimer) {
          clearInterval(discord2LatencyPollTimer);
          discord2LatencyPollTimer = null;
        }
        discord2LatencyProbeNonce += 1;
        discord2LatencyProbeInFlight = false;
        if (clearValue) {
          discord2ConnectionLatencyMs = null;
        }
        updateDiscord2LatencyIndicator();
      }

      function syncDiscord2LatencyPolling() {
        const inVoiceChannel = Boolean(normalizeDiscord2Id(discord2State.selfVoiceChannelId));
        const shouldPoll = inVoiceChannel && discord2SocketConnected && Boolean(discord2Socket);

        if (!shouldPoll) {
          stopDiscord2LatencyPolling({ clearValue: true });
          return;
        }

        if (discord2LatencyPollTimer) {
          return;
        }

        void probeDiscord2ConnectionLatency();
        discord2LatencyPollTimer = setInterval(() => {
          void probeDiscord2ConnectionLatency();
        }, DISCORD2_LATENCY_POLL_MS);
      }

      function openDiscord2KrispPopover() {
        if (!discord2KrispPopover || !discord2VoiceKrispBtn) {
          return;
        }
        syncDiscord2NoiseSuppressionControls();
        discord2KrispPopover.classList.add("is-open");
        discord2KrispPopover.setAttribute("aria-hidden", "false");
        discord2VoiceKrispBtn.setAttribute("aria-expanded", "true");
      }

      function closeDiscord2KrispPopover() {
        if (!discord2KrispPopover || !discord2VoiceKrispBtn) {
          return;
        }
        discord2KrispPopover.classList.remove("is-open");
        discord2KrispPopover.setAttribute("aria-hidden", "true");
        discord2VoiceKrispBtn.setAttribute("aria-expanded", "false");
      }

      function toggleDiscord2KrispPopover() {
        const isOpen = discord2KrispPopover?.classList.contains("is-open");
        if (isOpen) {
          closeDiscord2KrispPopover();
        } else {
          openDiscord2KrispPopover();
        }
      }

      function formatDiscord2SensitivityDb(value) {
        const normalized = clamp(Number(value) || 0, 0, 100);
        const dbValue = Math.round(-100 + normalized);
        return `${dbValue}dB`;
      }

      function formatDiscord2InputLevelDb(rms) {
        const safeRms = Math.max(1e-5, clamp(Number(rms) || 0, 0, 1));
        const dbValue = Math.round(clamp(20 * Math.log10(safeRms), -100, 0));
        return `${dbValue}dB`;
      }

      function renderDiscord2InputMeter() {
        const level = clamp(Number(discord2State.inputMeterLevel) || 0, 0, 1);
        const threshold = clamp(Number(discord2State.inputMeterThreshold) || 0.5, 0, 1);
        const rms = clamp(Number(discord2State.inputMeterRms) || 0, 0, 1);
        const levelPercent = Math.round(level * 100);
        const thresholdPercent = Math.round(threshold * 100);
        const levelDbText = formatDiscord2InputLevelDb(rms);

        if (discord2PersonalInputMeterFill) {
          discord2PersonalInputMeterFill.style.width = `${levelPercent}%`;
          discord2PersonalInputMeterFill.style.background = level >= threshold
            ? "#3ba55d"
            : "#f0b232";
        }
        if (discord2PersonalInputMeter) {
          discord2PersonalInputMeter.classList.toggle("is-speaking", level >= threshold);
        }
        if (discord2PersonalInputThresholdHandle) {
          discord2PersonalInputThresholdHandle.style.left = `${thresholdPercent}%`;
        }
        if (discord2PersonalInputSensitivityValue) {
          discord2PersonalInputSensitivityValue.style.left = `${thresholdPercent}%`;
          discord2PersonalInputSensitivityValue.classList.toggle(
            "is-hidden",
            Boolean(discord2PersonalSettings?.inputSensitivityAuto),
          );
        }
        if (discord2PersonalInputLevelValue) {
          discord2PersonalInputLevelValue.textContent = `Input level: ${levelDbText}`;
        }
      }

      function drawDiscord2MicTestBarsOnCanvas(canvas, level = 0) {
        if (!canvas) {
          return;
        }
        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = "#1f2125";
        context.fillRect(0, 0, width, height);

        const bars = 36;
        const gap = 3;
        const barWidth = Math.max(2, Math.floor((width - ((bars - 1) * gap)) / bars));
        const threshold = clamp(Number(discord2State.inputMeterThreshold) || 0.5, 0, 1);
        const baseColor = level >= threshold ? "#3ba55d" : "#f0b232";
        context.fillStyle = baseColor;

        for (let index = 0; index < bars; index += 1) {
          const x = index * (barWidth + gap);
          const wave = (Math.sin((Date.now() / 180) + (index * 0.65)) + 1) / 2;
          const randomJitter = (Math.sin((Date.now() / 110) + index) + 1) / 18;
          const activity = clamp((level * 1.45) - ((index / bars) * 0.32) + randomJitter + (wave * 0.1), 0.04, 1);
          const barHeight = Math.max(2, Math.round(activity * (height - 8)));
          const y = height - barHeight - 4;
          context.fillRect(x, y, barWidth, barHeight);
        }
      }

      function drawDiscord2MicTestBars(level = 0) {
        drawDiscord2MicTestBarsOnCanvas(discord2MicTestCanvas, level);
        drawDiscord2MicTestBarsOnCanvas(discord2KrispMicTestCanvas, level);
      }

      function stopDiscord2MicTestVisualizer() {
        if (discord2MicTestAnimationFrame) {
          cancelAnimationFrame(discord2MicTestAnimationFrame);
          discord2MicTestAnimationFrame = null;
        }
        drawDiscord2MicTestBars(0);
      }

      function startDiscord2MicTestVisualizer() {
        stopDiscord2MicTestVisualizer();
        const animate = () => {
          if (!discord2AudioManager || !discord2AudioManager.isMicTestActive()) {
            stopDiscord2MicTestVisualizer();
            return;
          }
          drawDiscord2MicTestBars(discord2AudioManager.getCurrentLevel());
          discord2MicTestAnimationFrame = requestAnimationFrame(animate);
        };
        discord2MicTestAnimationFrame = requestAnimationFrame(animate);
      }

      function setDiscord2MicTestButtonLabel() {
        const active = discord2AudioManager?.isMicTestActive() === true;
        if (discord2MicTestButton) {
          discord2MicTestButton.textContent = active ? "Stop Testing" : "Let's Check";
        }
        if (discord2KrispMicTestBtn) {
          discord2KrispMicTestBtn.textContent = active ? "Stop" : "Test";
        }
      }

      async function toggleDiscord2MicTest() {
        const manager = ensureDiscord2AudioManager();
        manager.updateSettings(discord2PersonalSettings);
        if (manager.isMicTestActive()) {
          manager.stopMicTest();
          stopDiscord2MicTestVisualizer();
          setDiscord2MicTestButtonLabel();
          return;
        }

        await ensureDiscord2LocalStream();
        await manager.startMicTest();
        startDiscord2MicTestVisualizer();
        setDiscord2MicTestButtonLabel();
      }

      async function refreshDiscord2AudioDevices() {
        const manager = ensureDiscord2AudioManager();
        const { inputDevices, outputDevices } = await manager.enumerateDevices();

        if (discord2PersonalInputDevice) {
          const selectedInput = String(discord2PersonalSettings.inputDeviceId || "default");
          const hasSelectedInput = inputDevices.some((device) => device.deviceId === selectedInput);
          const fallbackInput = hasSelectedInput
            ? selectedInput
            : (inputDevices[0]?.deviceId || "default");

          discord2PersonalInputDevice.innerHTML = inputDevices
            .map((device) => `<option value="${escapeDiscord2Html(device.deviceId)}">${escapeDiscord2Html(device.label)}</option>`)
            .join("");
          if (!inputDevices.length) {
            discord2PersonalInputDevice.innerHTML = `<option value="default">No microphone available</option>`;
          }
          discord2PersonalInputDevice.value = fallbackInput;
          if (fallbackInput !== discord2PersonalSettings.inputDeviceId) {
            discord2PersonalSettings.inputDeviceId = fallbackInput;
            persistDiscord2PersonalSettings();
          }
        }

        if (discord2PersonalOutputDevice) {
          const sinkSupported = supportsDiscord2SinkId();
          discord2PersonalOutputDevice.disabled = !sinkSupported;

          const selectedOutput = String(discord2PersonalSettings.outputDeviceId || "default");
          const hasSelectedOutput = outputDevices.some((device) => device.deviceId === selectedOutput);
          const fallbackOutput = hasSelectedOutput
            ? selectedOutput
            : (outputDevices[0]?.deviceId || "default");

          discord2PersonalOutputDevice.innerHTML = outputDevices
            .map((device) => `<option value="${escapeDiscord2Html(device.deviceId)}">${escapeDiscord2Html(device.label)}</option>`)
            .join("");
          if (!outputDevices.length) {
            discord2PersonalOutputDevice.innerHTML = `<option value="default">Default output</option>`;
          }
          discord2PersonalOutputDevice.value = fallbackOutput;

          if (fallbackOutput !== discord2PersonalSettings.outputDeviceId) {
            discord2PersonalSettings.outputDeviceId = fallbackOutput;
            persistDiscord2PersonalSettings();
          }

          if (discord2PersonalOutputDeviceHint) {
            discord2PersonalOutputDeviceHint.textContent = sinkSupported
              ? "Select the playback target for incoming voice and mic test."
              : "Output device selection is not supported in this browser.";
          }
        }
      }

      function renderDiscord2PersonalSettingsModal() {
        const settings = normalizeDiscord2PersonalSettings(discord2PersonalSettings);
        discord2PersonalSettings = settings;
        if (discord2PersonalSettingsTitle) {
          discord2PersonalSettingsTitle.textContent = "Voice";
        }

        if (discord2PersonalMicVolume) {
          discord2PersonalMicVolume.value = String(settings.micVolume);
        }
        if (discord2PersonalMicVolumeValue) {
          discord2PersonalMicVolumeValue.textContent = `${settings.micVolume}%`;
        }

        if (discord2PersonalOutputVolume) {
          discord2PersonalOutputVolume.value = String(settings.outputVolume);
        }
        if (discord2PersonalOutputVolumeValue) {
          discord2PersonalOutputVolumeValue.textContent = `${settings.outputVolume}%`;
        }

        if (discord2PersonalInputSensitivityAuto) {
          discord2PersonalInputSensitivityAuto.checked = Boolean(settings.inputSensitivityAuto);
        }

        if (discord2PersonalInputSensitivity) {
          discord2PersonalInputSensitivity.value = String(settings.inputSensitivity);
          discord2PersonalInputSensitivity.disabled = Boolean(settings.inputSensitivityAuto);
          discord2PersonalInputSensitivity.setAttribute("aria-valuetext", formatDiscord2SensitivityDb(settings.inputSensitivity));
        }
        if (discord2PersonalInputSensitivityValue) {
          discord2PersonalInputSensitivityValue.textContent = formatDiscord2SensitivityDb(settings.inputSensitivity);
        }

        if (discord2InputModeVoiceActivity) {
          discord2InputModeVoiceActivity.checked = settings.inputMode !== "ptt";
        }
        if (discord2InputModePushToTalk) {
          discord2InputModePushToTalk.checked = settings.inputMode === "ptt";
        }

        if (discord2VoiceActivityControls) {
          discord2VoiceActivityControls.style.display = settings.inputMode === "ptt" ? "none" : "flex";
        }
        if (discord2PushToTalkHint) {
          discord2PushToTalkHint.style.display = settings.inputMode === "ptt" ? "block" : "none";
        }

        syncDiscord2NoiseSuppressionControls();
        if (discord2PersonalEchoCancellation) {
          discord2PersonalEchoCancellation.checked = settings.echoCancellation !== false;
        }

        renderDiscord2InputMeter();
        setDiscord2MicTestButtonLabel();
        void refreshDiscord2AudioDevices();
      }

      function openDiscord2PersonalSettingsModal() {
        if (!discord2PersonalSettingsModal) {
          return;
        }
        closeDiscord2KrispPopover();
        renderDiscord2PersonalSettingsModal();
        discord2PersonalSettingsModal.classList.add("is-open");
        discord2PersonalSettingsModal.setAttribute("aria-hidden", "false");
        if (!discord2VoiceDevicesListenerAttached && navigator.mediaDevices?.addEventListener) {
          navigator.mediaDevices.addEventListener("devicechange", () => {
            if (!discord2Section || !hasDiscord2Access()) {
              return;
            }
            void refreshDiscord2AudioDevices();
          });
          discord2VoiceDevicesListenerAttached = true;
        }
        void ensureDiscord2LocalStream()
          .then(() => refreshDiscord2AudioDevices())
          .catch(() => {});
      }

      function closeDiscord2PersonalSettingsModal() {
        if (!discord2PersonalSettingsModal) {
          return;
        }
        if (discord2AudioManager?.isMicTestActive()) {
          discord2AudioManager.stopMicTest();
          stopDiscord2MicTestVisualizer();
          setDiscord2MicTestButtonLabel();
        }
        discord2PersonalSettingsModal.classList.remove("is-open");
        discord2PersonalSettingsModal.setAttribute("aria-hidden", "true");
      }

      function scrollDiscord2MessagesToBottom() {
        if (!discord2MessageList) {
          return;
        }
        requestAnimationFrame(() => {
          discord2MessageList.scrollTop = discord2MessageList.scrollHeight;
        });
      }

      function setDiscord2ComposerReadonly(placeholderText) {
        if (discord2Composer) {
          discord2Composer.classList.add("discord2-composer--readonly");
        }

        if (discord2MessageInput) {
          discord2MessageInput.disabled = true;
          discord2MessageInput.value = "";
          discord2MessageInput.placeholder = placeholderText || "Ez a csatorna csak olvashat\u00F3.";
        }

        if (discord2UploadBtn) {
          discord2UploadBtn.disabled = true;
        }

        if (discord2SendBtn) {
          discord2SendBtn.disabled = true;
        }

        updateDiscord2UploadLabel();
      }

      function setDiscord2ComposerWritable(placeholderText = "\u00CDrj \u00FCzenetet...") {
        if (discord2Composer) {
          discord2Composer.classList.remove("discord2-composer--readonly");
        }

        if (discord2MessageInput) {
          discord2MessageInput.disabled = false;
          discord2MessageInput.placeholder = placeholderText;
        }

        if (discord2UploadBtn) {
          discord2UploadBtn.disabled = discord2SendingMessage;
        }

        if (discord2SendBtn) {
          discord2SendBtn.disabled = discord2SendingMessage;
        }

        updateDiscord2UploadLabel();
      }

      async function sendDiscord2Message() {
        if (!discord2MessageInput) {
          return;
        }

        const selectedChannel = getDiscord2SelectedChannel();
        if (!selectedChannel || selectedChannel.type !== "text") {
          return;
        }

        const content = String(discord2MessageInput.value || "").trim();
        const pendingFile = discord2PendingUploadFile;
        if (!content && !pendingFile) {
          return;
        }

        if (pendingFile) {
          if (!isDiscord2ValidUploadFile(pendingFile)) {
            clearDiscord2PendingUpload({ keepStatus: true });
            if (discord2UploadLabel) {
              discord2UploadLabel.textContent = "Csak 12MB alatti kep vagy video kuldheto.";
            }
            return;
          }

          const token = getStoredToken();
          if (!token) {
            if (discord2UploadLabel) {
              discord2UploadLabel.textContent = "A feltolteshez ujra be kell jelentkezni.";
            }
            return;
          }

          discord2SendingMessage = true;
          setDiscord2ComposerWritable();

          try {
            const formData = new FormData();
            formData.append("channelId", String(normalizeDiscord2Id(selectedChannel.id)));
            formData.append("content", content);
            formData.append("file", pendingFile, pendingFile.name);

            const response = await fetch("/api/discord2/messages/upload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(payload?.message || "Nem sikerult feltolteni a fajlt.");
            }

            if (payload?.createdMessage) {
              upsertDiscord2Message(payload.createdMessage);
            }
            discord2MessageInput.value = "";
            clearDiscord2PendingUpload();
            discord2MessageInput.focus();
          } catch (error) {
            if (discord2UploadLabel) {
              discord2UploadLabel.textContent = error?.message || "Nem sikerult feltolteni a fajlt.";
            }
          } finally {
            discord2SendingMessage = false;
            setDiscord2ComposerWritable();
          }
          return;
        }

        ensureDiscord2SocketConnection();
        if (!discord2Socket) {
          return;
        }

        discord2Socket.emit("discord2_send_message", {
          channelId: normalizeDiscord2Id(selectedChannel.id),
          content,
        });

        discord2MessageInput.value = "";
        discord2MessageInput.focus();
        updateDiscord2UploadLabel();
      }

