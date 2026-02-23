/* Discord 2 logic extracted from index.js to isolate future development changes. */



    // Suppress noisy ONNX graph-optimizer warnings in the browser console.
    // These messages are non-fatal and drown real runtime errors during voice debugging.
    (function setupOrtConsoleNoiseFilter() {
      try {
        if (window.ort?.env) {
          window.ort.env.logLevel = "fatal";
        }
      } catch (_error) {}

      if (!console || typeof console.warn !== "function") {
        return;
      }
      if (window.__discord2OrtWarnFilterInstalled) {
        return;
      }

      const originalWarn = console.warn.bind(console);
      console.warn = (...args) => {
        const first = args[0];
        const text = typeof first === "string" ? first : String(first || "");
        const looksLikeOrtCleanupWarn = text.includes("[W:onnxruntime:")
          && text.includes("CleanUnusedInitializersAndNodeArgs");
        if (looksLikeOrtCleanupWarn) {
          return;
        }
        originalWarn(...args);
      };
      window.__discord2OrtWarnFilterInstalled = true;
    }());

    const discord2NavBtn = document.getElementById("discord2NavBtn");
    const discord2Section = document.getElementById("discord2");
    const discord2ChannelTree = document.getElementById("discord2ChannelTree");
    const discord2ChannelTitle = document.getElementById("discord2ChannelTitle");
    const discord2ChannelDescription = document.getElementById("discord2ChannelDescription");
    const discord2MessageList = document.getElementById("discord2MessageList");
    const discord2MessageInput = document.getElementById("discord2MessageInput");
    const discord2UploadInput = document.getElementById("discord2UploadInput");
    const discord2UploadBtn = document.getElementById("discord2UploadBtn");
    const discord2SendBtn = document.getElementById("discord2SendBtn");
    const discord2UploadLabel = document.getElementById("discord2UploadLabel");
    const discord2Composer = discord2MessageInput ? discord2MessageInput.closest(".discord2-composer") : null;
    const discord2MemberList = document.getElementById("discord2MemberList");
    const discord2ServerTitle = document.getElementById("discord2ServerTitle");
    const discord2ServerIconBtn = document.getElementById("discord2ServerIconBtn");
    const discord2ServerIconImage = document.getElementById("discord2ServerIconImage");
    const discord2ServerIconFallback = document.getElementById("discord2ServerIconFallback");
    const discord2ServerSettingsBtn = document.getElementById("discord2ServerSettingsBtn");
    const discord2ManageModal = document.getElementById("discord2ManageModal");
    const discord2ManageForm = document.getElementById("discord2ManageForm");
    const discord2ManageTitle = document.getElementById("discord2ManageTitle");
    const discord2ManageName = document.getElementById("discord2ManageName");
    const discord2ManageTypeWrap = document.getElementById("discord2ManageTypeWrap");
    const discord2ManageType = document.getElementById("discord2ManageType");
    const discord2ManageCategoryWrap = document.getElementById("discord2ManageCategoryWrap");
    const discord2ManageCategory = document.getElementById("discord2ManageCategory");
    const discord2ManageDeleteBtn = document.getElementById("discord2ManageDeleteBtn");
    const discord2ManageCancel = document.getElementById("discord2ManageCancel");
    const discord2ServerSettingsModal = document.getElementById("discord2ServerSettingsModal");
    const discord2ServerSettingsForm = document.getElementById("discord2ServerSettingsForm");
    const discord2ServerNameInput = document.getElementById("discord2ServerNameInput");
    const discord2ServerLogoPreview = document.getElementById("discord2ServerLogoPreview");
    const discord2ServerLogoInput = document.getElementById("discord2ServerLogoInput");
    const discord2ServerLogoChooseBtn = document.getElementById("discord2ServerLogoChooseBtn");
    const discord2ServerSettingsStatus = document.getElementById("discord2ServerSettingsStatus");
    const discord2ServerSettingsCancel = document.getElementById("discord2ServerSettingsCancel");
    const discord2CreateCategoryFromSettings = document.getElementById("discord2CreateCategoryFromSettings");
    const discord2CreateTextChannelFromSettings = document.getElementById("discord2CreateTextChannelFromSettings");
    const discord2CreateVoiceChannelFromSettings = document.getElementById("discord2CreateVoiceChannelFromSettings");
    const discord2ServerLogoCropperModal = document.getElementById("discord2ServerLogoCropperModal");
    const discord2ServerLogoCropperImage = document.getElementById("discord2ServerLogoCropperImage");
    const discord2ServerLogoZoomRange = document.getElementById("discord2ServerLogoZoomRange");
    const discord2ServerLogoCropperCancel = document.getElementById("discord2ServerLogoCropperCancel");
    const discord2ServerLogoCropperSave = document.getElementById("discord2ServerLogoCropperSave");
    const discord2ContextMenu = document.getElementById("discord2ContextMenu");
    const discord2UserbarAvatar = document.getElementById("discord2UserbarAvatar");
    const discord2UserbarName = document.getElementById("discord2UserbarName");
    const discord2UserbarState = document.getElementById("discord2UserbarState");
    const discord2MuteBtn = document.getElementById("discord2MuteBtn");
    const discord2DeafenBtn = document.getElementById("discord2DeafenBtn");
    const discord2LeaveVoiceBtn = document.getElementById("discord2LeaveVoiceBtn");
    const discord2VoiceSessionBar = document.getElementById("discord2VoiceSessionBar");
    const discord2VoiceSessionChannel = document.getElementById("discord2VoiceSessionChannel");
    const discord2VoiceLatencyBtn = document.getElementById("discord2VoiceLatencyBtn");
    const discord2VoiceKrispBtn = document.getElementById("discord2VoiceKrispBtn");
    const discord2KrispPopover = document.getElementById("discord2KrispPopover");
    const discord2KrispToggle = document.getElementById("discord2KrispToggle");
    const discord2KrispMicTestBtn = document.getElementById("discord2KrispMicTestBtn");
    const discord2KrispMicTestCanvas = document.getElementById("discord2KrispMicTestCanvas");
    const discord2PersonalSettingsBtn = document.getElementById("discord2PersonalSettingsBtn");
    const discord2PersonalSettingsModal = document.getElementById("discord2PersonalSettingsModal");
    const discord2PersonalSettingsTitle = document.getElementById("discord2PersonalSettingsTitle");
    const discord2PersonalSettingsForm = document.getElementById("discord2PersonalSettingsForm");
    const discord2PersonalSettingsClose = document.getElementById("discord2PersonalSettingsClose");
    const discord2PersonalInputDevice = document.getElementById("discord2PersonalInputDevice");
    const discord2PersonalOutputDevice = document.getElementById("discord2PersonalOutputDevice");
    const discord2PersonalOutputDeviceHint = document.getElementById("discord2PersonalOutputDeviceHint");
    const discord2PersonalMicVolume = document.getElementById("discord2PersonalMicVolume");
    const discord2PersonalMicVolumeValue = document.getElementById("discord2PersonalMicVolumeValue");
    const discord2PersonalOutputVolume = document.getElementById("discord2PersonalOutputVolume");
    const discord2PersonalOutputVolumeValue = document.getElementById("discord2PersonalOutputVolumeValue");
    const discord2MicTestButton = document.getElementById("discord2MicTestButton");
    const discord2MicTestCanvas = document.getElementById("discord2MicTestCanvas");
    const discord2InputModeVoiceActivity = document.getElementById("discord2InputModeVoiceActivity");
    const discord2InputModePushToTalk = document.getElementById("discord2InputModePushToTalk");
    const discord2VoiceActivityControls = document.getElementById("discord2VoiceActivityControls");
    const discord2PushToTalkHint = document.getElementById("discord2PushToTalkHint");
    const discord2PersonalInputSensitivityAuto = document.getElementById("discord2PersonalInputSensitivityAuto");
    const discord2PersonalInputSensitivity = document.getElementById("discord2PersonalInputSensitivity");
    const discord2PersonalInputSensitivityValue = document.getElementById("discord2PersonalInputSensitivityValue");
    const discord2PersonalInputLevelValue = document.getElementById("discord2PersonalInputLevelValue");
    const discord2PersonalInputMeter = document.getElementById("discord2PersonalInputMeter");
    const discord2PersonalInputMeterFill = document.getElementById("discord2PersonalInputMeterFill");
    const discord2PersonalInputThresholdHandle = document.getElementById("discord2PersonalInputThresholdHandle");
    const discord2PersonalNoiseSuppression = document.getElementById("discord2PersonalNoiseSuppression");
    const discord2PersonalEchoCancellation = document.getElementById("discord2PersonalEchoCancellation");

    const DISCORD2_PERSONAL_SETTINGS_KEY = "discord2PersonalSettings";
    const DISCORD2_PERSONAL_SETTINGS_LEGACY_KEY = "discord2PersonalSettings";
    const DEFAULT_DISCORD2_PERSONAL_SETTINGS = {
      inputDeviceId: "default",
      outputDeviceId: "default",
      micVolume: 100,
      outputVolume: 100,
      inputMode: "voice",
      inputSensitivityAuto: true,
      inputSensitivity: 50,
      noiseSuppression: "standard",
      echoCancellation: true,
    };

    let discord2Initialized = false;
    let discord2ManageState = null;
    let discord2ContextState = null;
    let discord2ServerLogoCropper = null;
    let discord2ServerLogoBlob = null;
    let discord2ServerLogoObjectUrl = null;
    let discord2Socket = null;
    let discord2SocketConnected = false;
    let discord2PersonalSettings = { ...DEFAULT_DISCORD2_PERSONAL_SETTINGS };
    let discord2AudioManager = null;
    let discord2VoicePeer = null;
    let discord2VoicePeerId = null;
    let discord2VoicePeerReady = null;
    const discord2VoiceCallsByUser = new Map();
    const discord2VoiceAudioByUser = new Map();
    const discord2PendingAudioPlayback = new Set();
    let discord2AudioUnlockListenerAttached = false;
    let discord2VoiceDesiredChannelId = null;
    let discord2VoiceCurrentChannelId = null;
    let discord2PushToTalkPressed = false;
    let discord2MicTestAnimationFrame = null;
    let discord2VoiceDevicesListenerAttached = false;
    let discord2LastSpeakingSentState = null;
    let discord2ConnectionLatencyMs = null;
    let discord2LatencyPollTimer = null;
    let discord2LatencyProbeInFlight = false;
    let discord2LatencyProbeNonce = 0;
    let discord2VoiceSettingsRejoinTimer = null;
    let discord2VoiceSettingsRejoinInFlight = false;
    const discord2State = {
      serverName: "UMKGL Szerver",
      serverLogoUrl: "program_icons/default-avatar.png",
      serverLogoFilename: null,
      categories: [],
      channels: [],
      messagesByChannel: {},
      selectedChannelId: null,
      onlineMembers: [],
      voiceMembersByChannel: {},
      collapsedCategoryIds: {},
      selfUserId: null,
      selfVoiceChannelId: null,
      speakingByUser: {},
      inputMeterLevel: 0,
      inputMeterThreshold: 0.5,
      inputMeterRms: 0,
      isMuted: false,
      isDeafened: false,
    };

    const DISCORD2_PTT_KEY = "Space";
    const DISCORD2_VAD_HOLD_MS = 420;
    const DISCORD2_LATENCY_POLL_MS = 5000;
    const DISCORD2_LATENCY_TIMEOUT_MS = 3000;
    const DISCORD2_VOICE_SETTINGS_REJOIN_DEBOUNCE_MS = 320;

    function hasDiscord2Access() {
      if (!isUserLoggedIn()) {
        return false;
      }
      return localStorage.getItem(SESSION_KEYS.canUseDiscord) === "true" || isActualAdmin();
    }

    function updateDiscord2NavVisibility() {
      const hasAccess = hasDiscord2Access();

      if (discord2NavBtn) {
        discord2NavBtn.style.display = hasAccess ? "inline-block" : "none";
      }

      if (discord2Section) {
        discord2Section.classList.toggle("discord2--admin", isAdminUser());
      }

      if (hasAccess) {
        ensureDiscord2Initialized();
        ensureDiscord2SocketConnection();
      } else {
        hideDiscord2ContextMenu();
        closeDiscord2ManageModal();
        disconnectDiscord2Socket();
        destroyDiscord2VoiceInfrastructure();
      }

      if (!hasAccess) {
        const activeSection = document.querySelector("main section.active");
        if (activeSection && activeSection.id === "discord2") {
          showSection("home");
        }
      }
    }

      function normalizeDiscord2Id(value) {
        const id = Number(value);
        return Number.isFinite(id) && id > 0 ? id : null;
      }

      function createDiscord2TempId(prefix) {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      }

      function getDiscord2SelfMember() {
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        if (!selfUserId || !Array.isArray(discord2State.onlineMembers)) {
          return null;
        }

        return discord2State.onlineMembers.find((member) => normalizeDiscord2Id(member.userId) === selfUserId) || null;
      }

      function getDiscord2CurrentUser() {
        const selfMember = getDiscord2SelfMember();
        if (selfMember) {
          return {
            userId: selfMember.userId,
            username: selfMember.username,
            avatarUrl: selfMember.avatarUrl,
          };
        }

        const username = localStorage.getItem(SESSION_KEYS.username) || "Felhaszn\u00E1l\u00F3";
        const profilePictureFilename = localStorage.getItem(SESSION_KEYS.profilePictureFilename);
        return {
          userId: normalizeDiscord2Id(discord2State.selfUserId),
          username,
          avatarUrl: profilePictureFilename
            ? `/uploads/avatars/${profilePictureFilename}`
            : "program_icons/default-avatar.png",
        };
      }

      function buildDiscord2ServerFallbackLetter(name) {
        const normalizedName = String(name || "").trim();
        if (!normalizedName) {
          return "U";
        }

        return normalizedName.charAt(0).toUpperCase();
      }

      function applyDiscord2ServerSettings(rawServer = {}) {
        const serverName = String(rawServer?.name || discord2State.serverName || "UMKGL Szerver").trim() || "UMKGL Szerver";
        const logoFilename = typeof rawServer?.logoFilename === "string" && rawServer.logoFilename.trim()
          ? rawServer.logoFilename.trim()
          : null;
        const logoUrlFromPayload = typeof rawServer?.logoUrl === "string" && rawServer.logoUrl.trim()
          ? rawServer.logoUrl.trim()
          : "";

        discord2State.serverName = serverName;
        discord2State.serverLogoFilename = logoFilename;
        discord2State.serverLogoUrl = logoUrlFromPayload
          || (logoFilename ? `/uploads/discord2/${logoFilename}` : "program_icons/default-avatar.png");

        if (discord2ServerNameInput && document.activeElement !== discord2ServerNameInput) {
          discord2ServerNameInput.value = serverName;
        }
        if (discord2ServerLogoPreview) {
          discord2ServerLogoPreview.src = discord2State.serverLogoUrl;
        }
      }

      function renderDiscord2ServerIdentity() {
        const serverName = String(discord2State.serverName || "UMKGL Szerver");
        const fallbackLetter = buildDiscord2ServerFallbackLetter(serverName);
        const hasCustomLogo = Boolean(
          (discord2State.serverLogoFilename && String(discord2State.serverLogoFilename).trim())
          || (
            discord2State.serverLogoUrl
            && discord2State.serverLogoUrl !== "program_icons/default-avatar.png"
          ),
        );

        if (discord2ServerTitle) {
          discord2ServerTitle.textContent = serverName;
        }
        if (discord2ServerIconBtn) {
          discord2ServerIconBtn.title = serverName;
        }
        if (discord2ServerIconImage) {
          discord2ServerIconImage.src = discord2State.serverLogoUrl || "program_icons/default-avatar.png";
          discord2ServerIconImage.style.display = hasCustomLogo ? "block" : "none";
        }
        if (discord2ServerIconFallback) {
          discord2ServerIconFallback.textContent = fallbackLetter;
          discord2ServerIconFallback.style.display = hasCustomLogo ? "none" : "inline-flex";
        }
      }

      function getDiscord2ChannelById(channelId) {
        const normalizedChannelId = normalizeDiscord2Id(channelId);
        if (!normalizedChannelId) {
          return null;
        }

        return discord2State.channels.find((channel) => normalizeDiscord2Id(channel.id) === normalizedChannelId) || null;
      }

      function ensureDiscord2SelectedChannel() {
        if (!Array.isArray(discord2State.channels) || discord2State.channels.length === 0) {
          discord2State.selectedChannelId = null;
          return;
        }

        const selectedChannelId = normalizeDiscord2Id(discord2State.selectedChannelId);
        const firstTextChannel = discord2State.channels.find((channel) => channel.type === "text");
        const selectedChannel = discord2State.channels.find((channel) => normalizeDiscord2Id(channel.id) === selectedChannelId) || null;
        if (selectedChannelId && selectedChannel) {
          if (selectedChannel.type === "text" || !firstTextChannel) {
            discord2State.selectedChannelId = selectedChannelId;
            return;
          }
        }

        const fallbackChannel = firstTextChannel || discord2State.channels[0] || null;
        discord2State.selectedChannelId = fallbackChannel ? normalizeDiscord2Id(fallbackChannel.id) : null;
      }

      function getDiscord2SelectedChannel() {
        ensureDiscord2SelectedChannel();
        return getDiscord2ChannelById(discord2State.selectedChannelId);
      }

      function getDiscord2ChannelsForCategory(categoryId) {
        const normalizedCategoryId = normalizeDiscord2Id(categoryId);
        if (!normalizedCategoryId) {
          return [];
        }

        return discord2State.channels
          .filter((channel) => normalizeDiscord2Id(channel.parentId) === normalizedCategoryId)
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
      }

      function escapeDiscord2Html(value) {
        return String(value || "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function formatDiscord2MessageTime(isoValue) {
        const date = new Date(isoValue);
        if (Number.isNaN(date.getTime())) {
          return "";
        }
        return date.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
      }

      function getDiscord2ChannelDescription(channel) {
        if (!channel) {
          return "";
        }

        if (channel.type === "voice") {
          return "Hangcsatorna. A jelenl\u00E9t val\u00F3s id\u0151ben szinkroniz\u00E1lva van.";
        }

        return "Ismeretlen időpont";
      }

      class Discord2AudioManager {
        constructor({ onLevelChange, onSpeakingChange, onStreamReady } = {}) {
          this.onLevelChange = typeof onLevelChange === "function" ? onLevelChange : () => {};
          this.onSpeakingChange = typeof onSpeakingChange === "function" ? onSpeakingChange : () => {};
          this.onStreamReady = typeof onStreamReady === "function" ? onStreamReady : () => {};

          this.settings = { ...DEFAULT_DISCORD2_PERSONAL_SETTINGS };
          this.muted = false;
          this.deafened = false;
          this.pushToTalkPressed = false;

          this.rawStream = null;
          this.transmitStream = null;
          this.transmitTrack = null;

          this.audioContext = null;
          this.sourceNode = null;
          this.inputGainNode = null;
          this.highpassNode = null;
          this.lowpassNode = null;
          this.rnnoiseWorkletNode = null;
          this.rnnoiseModuleLoaded = false;
          this.rnnoiseAvailable = false;
          this.rnnoiseLastError = null;
          this.transientCompressorNode = null;
          this.levelAnalyserNode = null;
          this.noiseDuckNode = null;
          this.transmitGateNode = null;
          this.destinationNode = null;

          this.levelSampleBuffer = null;
          this.frequencySampleBuffer = null;
          this.levelMonitorTimer = null;
          this.levelMonitorIntervalMs = 20;

          this.currentLevel = 0;
          this.currentRms = 0;
          this.manualThreshold = 0.5;
          this.autoThreshold = 0.18;
          this.speaking = false;
          this.speakingReleaseAt = 0;

          this.myVad = null;
          this.vadSpeaking = false;
          this.vadFrameTimestamp = 0;
          this.vadLastSpeechProbability = 0;
          this.vadSpeechProbabilityEma = 0;
          this.lastVadSpeechAt = 0;

          this.levelSpeaking = false;
          this.levelSpeakingReleaseAt = 0;
          this.noiseFloor = 0.04;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;

          this.micTestAudio = null;
          this.micTestActive = false;
          this.outputDeviceId = "default";

          this.availableInputDevices = [];
          this.availableOutputDevices = [];
          this.activeInputDeviceId = null;
          this.activeRequestedDeviceId = null;
          this.activeNoiseSuppressionMode = null;
          this.activeEchoCancellation = null;
        }

        updateSettings(nextSettings) {
          this.settings = normalizeDiscord2PersonalSettings({
            ...this.settings,
            ...(nextSettings || {}),
          });
          this.manualThreshold = this.mapSensitivityToThreshold(this.settings.inputSensitivity);
          this.autoThreshold = this.settings.inputSensitivityAuto
            ? clamp(Math.max(this.noiseFloor + 0.08, this.noiseFloor * 1.7), 0.03, 0.82)
            : clamp(this.manualThreshold, 0.01, 0.92);
          this.outputDeviceId = this.settings.outputDeviceId || "default";

          this.setMicVolume(this.settings.micVolume);
          this.setOutputVolume(this.settings.outputVolume);

          this.applyProcessingProfile();
          this.updateTransmissionState({ force: true });
        }

        async enumerateDevices() {
          if (!navigator.mediaDevices?.enumerateDevices) {
            this.availableInputDevices = [];
            this.availableOutputDevices = [];
            return { inputDevices: [], outputDevices: [] };
          }

          const devices = await navigator.mediaDevices.enumerateDevices();
          const inputDevices = [];
          const outputDevices = [];

          devices.forEach((device) => {
            if (!device || !device.deviceId) {
              return;
            }
            if (device.kind === "audioinput") {
              inputDevices.push({
                deviceId: device.deviceId,
                label: device.label || `Microphone ${inputDevices.length + 1}`,
              });
              return;
            }
            if (device.kind === "audiooutput") {
              outputDevices.push({
                deviceId: device.deviceId,
                label: device.label || `Output ${outputDevices.length + 1}`,
              });
            }
          });

          this.availableInputDevices = inputDevices;
          this.availableOutputDevices = outputDevices;
          return { inputDevices, outputDevices };
        }

        buildAudioConstraints(requestedDeviceId) {
          const useEchoCancellation = this.settings.echoCancellation !== false;
          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const useNoiseSuppression = normalizedNoiseMode === "standard";
          const constraints = {
            echoCancellation: useEchoCancellation,
            noiseSuppression: useNoiseSuppression,
            autoGainControl: true,
            latency: 0,
            channelCount: 1,
            sampleRate: 48000,
          };

          if (requestedDeviceId && requestedDeviceId !== "default") {
            constraints.deviceId = { exact: requestedDeviceId };
          }

          return constraints;
        }

        async setupVadEngine() {
          this.destroyVadEngine();

          const vadApi = window.vad || window.import_vad;
          const AudioNodeVAD = vadApi?.AudioNodeVAD;
          const MicVAD = vadApi?.MicVAD;
          if (
            (!AudioNodeVAD || typeof AudioNodeVAD.new !== "function")
            && (!MicVAD || typeof MicVAD.new !== "function")
          ) {
            console.warn("Érvénytelen chunk érkezett, kihagyva.");
            this.vadSpeaking = true;
            this.updateTransmissionState({ force: true });
            return;
          }

          try {
            if (window.ort?.env?.wasm) {
              window.ort.env.wasm.wasmPaths = "/js/libs/vad/";
            }
            if (window.ort?.env) {
              window.ort.env.logLevel = "fatal";
            }

            const preferredDeviceId = String(this.settings.inputDeviceId || "default");
            const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
            const initVadThreshold = this.getVadProbabilityThreshold(normalizedNoiseMode);
            const vadOptions = {
              positiveSpeechThreshold: clamp(initVadThreshold - 0.04, 0.36, 0.72),
              negativeSpeechThreshold: clamp(initVadThreshold - 0.18, 0.22, 0.58),
              minSpeechFrames: 2,
              preSpeechPadFrames: 6,
              onFrameProcessed: (probs) => {
                const now = performance.now();
                this.vadFrameTimestamp = now;
                const speechProb = clamp(Number(probs?.isSpeech) || 0, 0, 1);
                this.vadLastSpeechProbability = speechProb;
                this.vadSpeechProbabilityEma = clamp(
                  (this.vadSpeechProbabilityEma * 0.75) + (speechProb * 0.25),
                  0,
                  1,
                );
                if (speechProb >= 0.56) {
                  this.lastVadSpeechAt = now;
                }
              },
              onSpeechStart: () => {
                this.lastVadSpeechAt = performance.now();
                this.vadSpeaking = true;
                this.updateTransmissionState({ force: true });
              },
              onSpeechEnd: () => {
                this.vadSpeaking = false;
                this.updateTransmissionState({ force: true });
              },
              modelURL: "/js/libs/vad/silero_vad.onnx",
              workletURL: "/js/libs/vad/vad.worklet.bundle.min.js",
            };

            if (
              AudioNodeVAD
              && typeof AudioNodeVAD.new === "function"
              && this.audioContext
              && this.sourceNode
            ) {
              this.myVad = await AudioNodeVAD.new(this.audioContext, vadOptions);
              if (this.myVad && typeof this.myVad.receive === "function") {
                const vadInputNode = this.levelAnalyserNode
                  || this.transientCompressorNode
                  || this.sourceNode;
                this.myVad.receive(vadInputNode);
              }
            } else if (MicVAD && typeof MicVAD.new === "function") {
              this.myVad = await MicVAD.new({
                stream: this.rawStream,
                additionalAudioConstraints: preferredDeviceId && preferredDeviceId !== "default"
                  ? { deviceId: { exact: preferredDeviceId } }
                  : {},
                ...vadOptions,
              });
            } else {
              throw new Error("Nem sikerült képeket visszakapni.");
            }

            this.vadSpeaking = false;
            this.vadFrameTimestamp = performance.now();
            this.vadLastSpeechProbability = 0;
            this.vadSpeechProbabilityEma = 0;
            if (typeof this.myVad.start === "function") {
              this.myVad.start();
            }
          } catch (error) {
            console.warn("Discord 2 Silero VAD init error:", error);
            this.myVad = null;
            this.vadSpeaking = false;
            this.vadFrameTimestamp = 0;
            this.vadLastSpeechProbability = 0;
            this.vadSpeechProbabilityEma = 0;
            this.lastVadSpeechAt = 0;
          }

          this.updateTransmissionState({ force: true });
        }

        destroyVadEngine() {
          const activeVad = this.myVad;
          this.myVad = null;
          this.vadSpeaking = false;
          this.vadFrameTimestamp = 0;
          this.vadLastSpeechProbability = 0;
          this.vadSpeechProbabilityEma = 0;
          this.lastVadSpeechAt = 0;
          if (!activeVad) {
            return;
          }

          try {
            if (typeof activeVad.pause === "function") {
              activeVad.pause();
            }
          } catch (_error) {}

          try {
            this.safeDisconnectNode(activeVad.entryNode);
          } catch (_error) {}

          try {
            if (typeof activeVad.destroy === "function") {
              activeVad.destroy();
            }
          } catch (_error) {}
        }

        async startLocalStream(deviceId = null) {
          const requestedDeviceId = String(deviceId || this.settings.inputDeviceId || "default");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: this.buildAudioConstraints(requestedDeviceId),
            video: false,
          });

          this.destroyVadEngine();
          this.stopTracks(this.rawStream);
          this.rawStream = stream;

          await this.setupAudioGraph(stream);
          await this.setupVadEngine();

          this.currentLevel = 0;

          const activeTrack = stream.getAudioTracks()[0] || null;
          const trackSettings = activeTrack?.getSettings?.() || {};
          const activeDeviceId = String(trackSettings.deviceId || requestedDeviceId || "default");
          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);

          this.settings.inputDeviceId = activeDeviceId || "default";
          this.activeInputDeviceId = activeDeviceId || "default";
          this.activeRequestedDeviceId = requestedDeviceId;
          this.activeNoiseSuppressionMode = normalizedNoiseMode;
          this.activeEchoCancellation = this.settings.echoCancellation !== false;

          this.setMicVolume(this.settings.micVolume);
          this.setOutputVolume(this.settings.outputVolume);
          this.applyProcessingProfile();
          this.updateTransmissionState({ force: true });
          this.onStreamReady(this.transmitStream);

          return this.transmitStream;
        }

        async restartLocalStream() {
          return this.startLocalStream(this.settings.inputDeviceId);
        }

        async applyRealtimeInputConstraints() {
          const rawTrack = this.rawStream?.getAudioTracks?.()[0] || null;
          if (!rawTrack || typeof rawTrack.applyConstraints !== "function") {
            return false;
          }

          const useEchoCancellation = this.settings.echoCancellation !== false;
          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const useNoiseSuppression = normalizedNoiseMode === "standard";

          try {
            await rawTrack.applyConstraints({
              echoCancellation: useEchoCancellation,
              noiseSuppression: useNoiseSuppression,
              autoGainControl: true,
              latency: 0,
              channelCount: 1,
              sampleRate: 48000,
            });
            this.activeNoiseSuppressionMode = normalizedNoiseMode;
            this.activeEchoCancellation = useEchoCancellation;
            return true;
          } catch (error) {
            console.warn("Discord 2 realtime audio constraint error:", error);
            return false;
          }
        }

        shouldRestartLocalStream() {
          if (!this.rawStream || !this.transmitStream || !this.transmitTrack) {
            return true;
          }
          if (this.transmitTrack.readyState !== "live") {
            return true;
          }

          const requestedDeviceId = String(this.settings.inputDeviceId || "default");
          if (this.activeRequestedDeviceId !== requestedDeviceId) {
            return true;
          }
          if (
            requestedDeviceId !== "default"
            && this.activeInputDeviceId
            && this.activeInputDeviceId !== requestedDeviceId
          ) {
            return true;
          }

          return false;
        }

        stopLocalStream() {
          this.stopMicTest();
          this.destroyVadEngine();
          this.stopTracks(this.rawStream);
          this.rawStream = null;
          this.activeInputDeviceId = null;
          this.activeRequestedDeviceId = null;
          this.activeNoiseSuppressionMode = null;
          this.activeEchoCancellation = null;
          this.currentLevel = 0;
          this.currentRms = 0;
          this.speakingReleaseAt = 0;
          this.levelSpeaking = false;
          this.levelSpeakingReleaseAt = 0;
          this.noiseFloor = 0.04;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;
          this.teardownAudioGraph();
          this.setSpeakingState(false);
          this.emitLevelUpdate();
        }

        stopTracks(stream) {
          if (!stream) {
            return;
          }
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (_error) {}
          });
        }

        async setupAudioGraph(stream) {
          this.teardownAudioGraph();

          const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextCtor) {
            throw new Error("Browser does not support AudioContext API.");
          }

          if (!this.audioContext || this.audioContext.state === "closed") {
            this.audioContext = new AudioContextCtor({
              latencyHint: "interactive",
              sampleRate: 48000,
            });
          }

          this.sourceNode = this.audioContext.createMediaStreamSource(stream);
          this.inputGainNode = this.audioContext.createGain();
          this.highpassNode = this.audioContext.createBiquadFilter();
          this.lowpassNode = this.audioContext.createBiquadFilter();
          this.transientCompressorNode = this.audioContext.createDynamicsCompressor();
          this.levelAnalyserNode = this.audioContext.createAnalyser();
          this.noiseDuckNode = this.audioContext.createGain();
          this.transmitGateNode = this.audioContext.createGain();
          this.destinationNode = this.audioContext.createMediaStreamDestination();

          this.highpassNode.type = "highpass";
          this.highpassNode.frequency.value = 110;
          this.highpassNode.Q.value = 0.707;
          this.lowpassNode.type = "lowpass";
          this.lowpassNode.frequency.value = 6500;
          this.lowpassNode.Q.value = 0.75;

          this.transientCompressorNode.threshold.value = -38;
          this.transientCompressorNode.knee.value = 6;
          this.transientCompressorNode.ratio.value = 10;
          this.transientCompressorNode.attack.value = 0.003;
          this.transientCompressorNode.release.value = 0.1;

          this.levelAnalyserNode.fftSize = 2048;
          this.levelAnalyserNode.smoothingTimeConstant = 0.18;
          this.levelSampleBuffer = new Float32Array(this.levelAnalyserNode.fftSize);
          this.frequencySampleBuffer = new Uint8Array(this.levelAnalyserNode.frequencyBinCount);

          this.noiseFloor = 0.04;
          this.levelSpeaking = false;
          this.levelSpeakingReleaseAt = 0;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;
          this.noiseDuckNode.gain.value = 1;
          this.transmitGateNode.gain.value = 0;

          if (normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression) === "krisp") {
            await this.ensureRnnoiseWorkletNode();
          }

          this.applyProcessingProfile();
          this.startLevelMonitoring();

          this.transmitStream = this.destinationNode.stream;
          this.transmitTrack = this.transmitStream.getAudioTracks()[0] || null;

          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume().catch(() => {});
          }
        }

        safeDisconnectNode(node) {
          if (!node || typeof node.disconnect !== "function") {
            return;
          }
          try {
            node.disconnect();
          } catch (_error) {}
        }

        async ensureRnnoiseWorkletNode() {
          if (!this.audioContext) {
            return null;
          }
          if (typeof AudioWorkletNode === "undefined") {
            return null;
          }
          if (!this.audioContext.audioWorklet || typeof this.audioContext.audioWorklet.addModule !== "function") {
            return null;
          }
          if (this.rnnoiseWorkletNode) {
            return this.rnnoiseWorkletNode;
          }

          try {
            if (!this.rnnoiseModuleLoaded) {
              const buildVersion = String(CLIENT_BUILD_VERSION || "").trim();
              const moduleUrl = buildVersion
                ? `/js/libs/rnnoise-processor.js?v=${encodeURIComponent(buildVersion)}`
                : "/js/libs/rnnoise-processor.js";
              await this.audioContext.audioWorklet.addModule(moduleUrl);
              this.rnnoiseModuleLoaded = true;
            }

            const node = new AudioWorkletNode(this.audioContext, "rnnoise-worklet", {
              numberOfInputs: 1,
              numberOfOutputs: 1,
              outputChannelCount: [1],
              processorOptions: {
                wasmUrl: "/js/libs/rnnoise.wasm",
              },
            });

            this.rnnoiseAvailable = false;
            this.rnnoiseLastError = null;
            node.port.onmessage = (event) => {
              const messageType = event?.data?.type;
              if (messageType === "ready") {
                this.rnnoiseAvailable = true;
                return;
              }
              if (messageType === "error") {
                this.rnnoiseAvailable = false;
                this.rnnoiseLastError = String(event?.data?.message || "RNNoise processor error");
                console.warn("Discord 2 RNNoise worklet error:", this.rnnoiseLastError);
              }
            };
            node.onprocessorerror = () => {
              this.rnnoiseAvailable = false;
              this.rnnoiseLastError = "RNNoise processor crashed.";
              console.warn("Discord 2 RNNoise processor crashed; falling back to non-RNNoise pipeline.");
              this.safeDisconnectNode(this.rnnoiseWorkletNode);
              this.rnnoiseWorkletNode = null;
              this.applyProcessingProfile();
            };
            this.rnnoiseWorkletNode = node;
            return node;
          } catch (error) {
            this.rnnoiseAvailable = false;
            this.rnnoiseLastError = String(error?.message || error || "RNNoise unavailable");
            console.warn("Discord 2 RNNoise worklet init error:", error);
            return null;
          }
        }

        startLevelMonitoring() {
          this.stopLevelMonitoring();
          if (!this.levelAnalyserNode || !this.levelSampleBuffer || !this.frequencySampleBuffer) {
            return;
          }

          const sampleLevel = () => {
            if (!this.levelAnalyserNode || !this.levelSampleBuffer || !this.frequencySampleBuffer) {
              return;
            }
            this.levelAnalyserNode.getFloatTimeDomainData(this.levelSampleBuffer);
            this.levelAnalyserNode.getByteFrequencyData(this.frequencySampleBuffer);
            this.handleLevelSamples(this.levelSampleBuffer, this.frequencySampleBuffer);
          };

          sampleLevel();
          this.levelMonitorTimer = setInterval(sampleLevel, this.levelMonitorIntervalMs);
        }

        stopLevelMonitoring() {
          if (!this.levelMonitorTimer) {
            return;
          }
          clearInterval(this.levelMonitorTimer);
          this.levelMonitorTimer = null;
        }

        teardownAudioGraph() {
          this.stopLevelMonitoring();

          if (this.rnnoiseWorkletNode?.port) {
            try {
              this.rnnoiseWorkletNode.port.postMessage({ type: "dispose" });
            } catch (_error) {}
          }

          [
            this.sourceNode,
            this.inputGainNode,
            this.highpassNode,
            this.lowpassNode,
            this.rnnoiseWorkletNode,
            this.transientCompressorNode,
            this.levelAnalyserNode,
            this.noiseDuckNode,
            this.transmitGateNode,
            this.destinationNode,
          ].forEach((node) => {
            this.safeDisconnectNode(node);
          });

          this.sourceNode = null;
          this.inputGainNode = null;
          this.highpassNode = null;
          this.lowpassNode = null;
          this.rnnoiseWorkletNode = null;
          this.rnnoiseAvailable = false;
          this.transientCompressorNode = null;
          this.levelAnalyserNode = null;
          this.noiseDuckNode = null;
          this.transmitGateNode = null;
          this.destinationNode = null;
          this.levelSampleBuffer = null;
          this.frequencySampleBuffer = null;
          this.keyboardNoiseScore = 0;
          this.keyboardNoiseLikely = false;
          this.keyboardNoiseDetectedAt = 0;
          this.transmitStream = null;
          this.transmitTrack = null;
        }

        applyProcessingProfile() {
          if (
            !this.audioContext
            || !this.sourceNode
            || !this.inputGainNode
            || !this.highpassNode
            || !this.lowpassNode
            || !this.transientCompressorNode
            || !this.levelAnalyserNode
            || !this.noiseDuckNode
            || !this.transmitGateNode
            || !this.destinationNode
          ) {
            return;
          }

          this.safeDisconnectNode(this.sourceNode);
          this.safeDisconnectNode(this.inputGainNode);
          this.safeDisconnectNode(this.highpassNode);
          this.safeDisconnectNode(this.lowpassNode);
          this.safeDisconnectNode(this.rnnoiseWorkletNode);
          this.safeDisconnectNode(this.transientCompressorNode);
          this.safeDisconnectNode(this.levelAnalyserNode);
          this.safeDisconnectNode(this.noiseDuckNode);
          this.safeDisconnectNode(this.transmitGateNode);

          const noiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          if (noiseMode === "krisp" && !this.rnnoiseWorkletNode) {
            void this.ensureRnnoiseWorkletNode().then((node) => {
              if (node) {
                this.applyProcessingProfile();
              }
            });
          }
          if (noiseMode === "krisp") {
            this.transientCompressorNode.threshold.value = -42;
            this.transientCompressorNode.knee.value = 5;
            this.transientCompressorNode.ratio.value = 14;
            this.transientCompressorNode.attack.value = 0.002;
            this.transientCompressorNode.release.value = 0.085;
            this.highpassNode.frequency.value = 120;
            this.lowpassNode.frequency.value = 3600;
          } else if (noiseMode === "standard") {
            this.transientCompressorNode.threshold.value = -36;
            this.transientCompressorNode.knee.value = 6;
            this.transientCompressorNode.ratio.value = 8;
            this.transientCompressorNode.attack.value = 0.004;
            this.transientCompressorNode.release.value = 0.12;
            this.highpassNode.frequency.value = 110;
            this.lowpassNode.frequency.value = 5600;
          } else {
            this.transientCompressorNode.threshold.value = -28;
            this.transientCompressorNode.knee.value = 9;
            this.transientCompressorNode.ratio.value = 3;
            this.transientCompressorNode.attack.value = 0.006;
            this.transientCompressorNode.release.value = 0.16;
            this.highpassNode.frequency.value = 95;
            this.lowpassNode.frequency.value = 7800;
          }

          this.sourceNode.connect(this.inputGainNode);
          this.inputGainNode.connect(this.highpassNode);

          let processingNode = this.highpassNode;
          if (noiseMode === "krisp" && this.rnnoiseWorkletNode) {
            processingNode.connect(this.rnnoiseWorkletNode);
            processingNode = this.rnnoiseWorkletNode;
          }

          processingNode.connect(this.transientCompressorNode);
          this.transientCompressorNode.connect(this.lowpassNode);
          this.lowpassNode.connect(this.levelAnalyserNode);
          this.levelAnalyserNode.connect(this.noiseDuckNode);
          this.noiseDuckNode.connect(this.transmitGateNode);
          this.transmitGateNode.connect(this.destinationNode);

          this.setMicVolume(this.settings.micVolume);
          this.updateTransmissionState({ force: true });
        }

        handleAudioProcess(event) {
          const channelData = event?.inputBuffer?.getChannelData?.(0);
          this.handleLevelSamples(channelData, null);
        }

        setNoiseDuckLevel(targetGain = 1) {
          if (!this.noiseDuckNode || !this.audioContext) {
            return;
          }
          const normalizedGain = clamp(Number(targetGain) || 0, 0.02, 1);
          this.noiseDuckNode.gain.setTargetAtTime(
            normalizedGain,
            this.audioContext.currentTime,
            0.022,
          );
        }

        computeSpectralRatios(frequencyData) {
          if (
            !frequencyData
            || !frequencyData.length
            || !this.audioContext
            || !this.levelAnalyserNode
          ) {
            return { hfRatio: 0, midRatio: 0 };
          }

          const sampleRate = Number(this.audioContext.sampleRate) || 48000;
          const fftSize = Number(this.levelAnalyserNode.fftSize) || 1024;
          const binHz = sampleRate / fftSize;
          if (!Number.isFinite(binHz) || binHz <= 0) {
            return { hfRatio: 0, midRatio: 0 };
          }

          const hfStartIndex = Math.max(1, Math.floor(1800 / binHz));
          const midStartIndex = Math.max(1, Math.floor(180 / binHz));

          let totalEnergy = 0;
          let hfEnergy = 0;
          let midEnergy = 0;
          for (let index = 1; index < frequencyData.length; index += 1) {
            const amplitude = (frequencyData[index] || 0) / 255;
            const energy = amplitude * amplitude;
            totalEnergy += energy;
            if (index >= hfStartIndex) {
              hfEnergy += energy;
            } else if (index >= midStartIndex) {
              midEnergy += energy;
            }
          }

          if (totalEnergy <= 0) {
            return { hfRatio: 0, midRatio: 0 };
          }

          return {
            hfRatio: clamp(hfEnergy / totalEnergy, 0, 1),
            midRatio: clamp(midEnergy / totalEnergy, 0, 1),
          };
        }

        handleLevelSamples(channelData, frequencyData = null) {
          if (!channelData || !channelData.length) {
            return;
          }

          let sumSquares = 0;
          let peak = 0;
          let zeroCrossings = 0;
          let previous = channelData[0] || 0;
          for (let index = 0; index < channelData.length; index += 1) {
            const sample = channelData[index];
            sumSquares += sample * sample;
            const abs = Math.abs(sample);
            if (abs > peak) {
              peak = abs;
            }
            if ((sample >= 0 && previous < 0) || (sample < 0 && previous >= 0)) {
              zeroCrossings += 1;
            }
            previous = sample;
          }

          const rms = Math.sqrt(sumSquares / channelData.length);
          this.currentRms = clamp(rms, 0, 1);
          const rmsDb = 20 * Math.log10(this.currentRms + 1e-6);
          const normalizedLevel = clamp((rmsDb + 100) / 100, 0, 1);
          this.currentLevel = clamp((this.currentLevel * 0.3) + (normalizedLevel * 0.7), 0, 1);
          const zeroCrossRate = zeroCrossings / channelData.length;
          const crestFactor = peak / (rms + 1e-5);

          const now = performance.now();
          if (!this.levelSpeaking && !this.vadSpeaking) {
            this.noiseFloor = clamp((this.noiseFloor * 0.985) + (this.currentLevel * 0.015), 0.005, 0.6);
          }
          if (this.settings.inputSensitivityAuto) {
            const baseline = clamp(this.noiseFloor, 0.005, 0.6);
            this.autoThreshold = clamp(Math.max(baseline + 0.06, baseline * 1.45), 0.03, 0.86);
          }

          const threshold = this.getEffectiveThreshold();
          const attackThreshold = clamp(
            threshold + (this.settings.inputSensitivityAuto ? 0.02 : 0.012),
            0.02,
            0.96,
          );
          const releaseThreshold = clamp(attackThreshold - 0.035, 0.01, 0.92);
          if (this.currentLevel >= attackThreshold) {
            this.levelSpeaking = true;
            this.levelSpeakingReleaseAt = now + 240;
          } else if (this.levelSpeaking) {
            if (this.currentLevel >= releaseThreshold) {
              this.levelSpeakingReleaseAt = now + 200;
            } else if (now >= this.levelSpeakingReleaseAt) {
              this.levelSpeaking = false;
            }
          }

          const { hfRatio, midRatio } = this.computeSpectralRatios(frequencyData);
          const noiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const speechConfidence = Math.max(
            clamp(this.vadLastSpeechProbability, 0, 1),
            clamp(this.vadSpeechProbabilityEma, 0, 1),
          );
          const hasSpeechEnergy = this.vadSpeaking
            || this.vadLastSpeechProbability >= 0.58
            || this.vadSpeechProbabilityEma >= 0.54
            || midRatio >= 0.28
            || (this.levelSpeaking && this.currentLevel >= (threshold + 0.02));
          const transientComponent = clamp((crestFactor - (hasSpeechEnergy ? 3.8 : 3.2)) / 4.8, 0, 1);
          const highFreqComponent = clamp((hfRatio - (hasSpeechEnergy ? 0.36 : 0.3)) / 0.5, 0, 1);
          const zcrComponent = clamp((zeroCrossRate - 0.08) / 0.24, 0, 1);
          const transientScore = clamp(
            (transientComponent * 0.49) + (highFreqComponent * 0.39) + (zcrComponent * 0.12),
            0,
            1,
          );
          const keyboardBurstThreshold = speechConfidence >= 0.7
            ? 0.68
            : (hasSpeechEnergy ? 0.56 : 0.42);
          const likelyKeyboardBurst = transientScore >= keyboardBurstThreshold
            && this.currentLevel >= Math.max(threshold - 0.08, 0.06);

          if (likelyKeyboardBurst) {
            this.keyboardNoiseDetectedAt = now;
            this.keyboardNoiseScore = clamp(
              this.keyboardNoiseScore + (
                speechConfidence >= 0.7
                  ? 0.05
                  : (hasSpeechEnergy ? 0.1 : 0.2)
              ),
              0,
              1,
            );
          } else {
            this.keyboardNoiseScore = clamp(
              this.keyboardNoiseScore - (hasSpeechEnergy ? 0.03 : 0.09),
              0,
              1,
            );
          }

          const keyboardHoldMs = hasSpeechEnergy ? 170 : 260;
          const keyboardIsRecent = this.keyboardNoiseDetectedAt > 0
            && (now - this.keyboardNoiseDetectedAt) <= keyboardHoldMs;
          this.keyboardNoiseLikely = this.keyboardNoiseScore >= (hasSpeechEnergy ? 0.42 : 0.3)
            || keyboardIsRecent;
          if (
            hasSpeechEnergy
            && speechConfidence < 0.4
            && this.currentLevel >= Math.max(threshold + 0.16, 0.22)
          ) {
            this.keyboardNoiseLikely = false;
          }

          if (noiseMode === "krisp") {
            let duckGain = 1;
            if (this.keyboardNoiseLikely) {
              if (hasSpeechEnergy && speechConfidence >= 0.82) {
                duckGain = clamp(0.48 - (this.keyboardNoiseScore * 0.16), 0.24, 0.62);
              } else if (hasSpeechEnergy) {
                duckGain = clamp(0.14 - (this.keyboardNoiseScore * 0.09), 0.04, 0.22);
              } else {
                duckGain = 0.015;
              }
            } else if (this.keyboardNoiseScore > 0.08) {
              duckGain = clamp(1 - (this.keyboardNoiseScore * 0.35), 0.78, 1);
            }
            this.setNoiseDuckLevel(duckGain);
          } else if (noiseMode === "standard") {
            this.setNoiseDuckLevel(this.keyboardNoiseLikely && !hasSpeechEnergy ? 0.65 : 1);
          } else {
            this.setNoiseDuckLevel(1);
          }

          this.emitLevelUpdate();
          this.updateTransmissionState();
        }

        mapSensitivityToThreshold(sensitivity) {
          const normalized = clamp(Number(sensitivity) || 0, 0, 100) / 100;
          const curved = Math.pow(normalized, 1.05);
          return clamp(curved, 0.005, 0.96);
        }

        getVadProbabilityThreshold(noiseMode = "standard") {
          const normalizedMode = normalizeDiscord2NoiseSuppressionMode(noiseMode);
          const sensitivityNorm = clamp(Number(this.settings.inputSensitivity) || 0, 0, 100) / 100;
          let threshold = this.settings.inputSensitivityAuto
            ? clamp(0.38 + (this.noiseFloor * 0.22), 0.28, 0.6)
            : (0.26 + (sensitivityNorm * 0.42));
          if (normalizedMode === "krisp") {
            threshold += 0.015;
          }
          return clamp(threshold, 0.22, 0.76);
        }

        getEffectiveThreshold() {
          if (this.settings.inputSensitivityAuto) {
            return clamp(this.autoThreshold, 0.02, 0.9);
          }
          return clamp(this.manualThreshold, 0.005, 0.96);
        }

        emitLevelUpdate() {
          this.onLevelChange(
            this.currentLevel,
            this.getEffectiveThreshold(),
            this.currentRms,
            { keyboardNoiseLikely: this.keyboardNoiseLikely === true },
          );
        }

        setMicVolume(value) {
          const volumePercent = clamp(Number(value) || 0, 0, 200);
          if (this.inputGainNode && this.audioContext) {
            const gainValue = volumePercent / 100;
            this.inputGainNode.gain.setTargetAtTime(gainValue, this.audioContext.currentTime, 0.015);
          }
        }

        setOutputVolume(value) {
          const volumePercent = clamp(Number(value) || 0, 0, 200);
          if (this.micTestAudio) {
            this.micTestAudio.volume = clamp(volumePercent / 100, 0, 1);
          }
        }

        setTransmitGateState(open) {
          if (!this.transmitGateNode || !this.audioContext) {
            return;
          }
          const gateTarget = open === true ? 1 : 0.0001;
          const timeConstant = open === true ? 0.008 : 0.055;
          this.transmitGateNode.gain.setTargetAtTime(gateTarget, this.audioContext.currentTime, timeConstant);
        }

        setMuteState({ muted, deafened } = {}) {
          this.muted = muted === true;
          this.deafened = deafened === true;
          this.updateTransmissionState({ force: true });
        }

        setPushToTalkPressed(pressed) {
          this.pushToTalkPressed = pressed === true;
          this.updateTransmissionState({ force: true });
        }

        getShouldTransmit() {
          if (!this.transmitTrack) {
            return false;
          }
          if (this.muted || this.deafened) {
            return false;
          }
          if (this.settings.inputMode === "ptt") {
            return this.pushToTalkPressed;
          }

          const normalizedNoiseMode = normalizeDiscord2NoiseSuppressionMode(this.settings.noiseSuppression);
          const now = performance.now();
          const hasVadInstance = Boolean(this.myVad);
          const hasFreshVadFrames = this.vadFrameTimestamp > 0 && (now - this.vadFrameTimestamp) <= 2400;
          const recentVadSpeech = this.lastVadSpeechAt > 0 && (now - this.lastVadSpeechAt) <= 360;
          const vadProbabilityThreshold = this.getVadProbabilityThreshold(normalizedNoiseMode);
          const speechConfidence = Math.max(
            clamp(this.vadLastSpeechProbability, 0, 1),
            clamp(this.vadSpeechProbabilityEma, 0, 1),
          );
          const vadProbabilitySpeaking = hasFreshVadFrames && this.vadLastSpeechProbability >= vadProbabilityThreshold;
          const vadEmaSpeaking = hasFreshVadFrames
            && this.vadSpeechProbabilityEma >= Math.max(vadProbabilityThreshold - 0.06, 0.28);
          const strongVadSpeech = hasFreshVadFrames
            && (
              this.vadLastSpeechProbability >= Math.min(0.92, vadProbabilityThreshold + 0.2)
              || this.vadSpeechProbabilityEma >= Math.min(0.84, vadProbabilityThreshold + 0.12)
            );
          const levelThreshold = this.getEffectiveThreshold();
          const rmsAssistSpeaking = this.levelSpeaking
            && this.currentLevel >= Math.max(levelThreshold - 0.02, 0.04);

          let speakingCandidate = false;
          if (hasFreshVadFrames) {
            speakingCandidate = (
              this.vadSpeaking === true
              || recentVadSpeech
              || vadProbabilitySpeaking
              || vadEmaSpeaking
              || rmsAssistSpeaking
              || this.currentLevel >= Math.max(levelThreshold + 0.015, 0.07)
            );
          } else if (hasVadInstance) {
            speakingCandidate = rmsAssistSpeaking
              && this.currentLevel >= Math.max(levelThreshold - 0.02, 0.045);
          } else {
            speakingCandidate = this.levelSpeaking === true
              || this.currentLevel >= Math.max(levelThreshold, 0.07);
          }

          if (!speakingCandidate && this.speaking && now < this.speakingReleaseAt) {
            speakingCandidate = true;
          }
          if (speakingCandidate) {
            this.speakingReleaseAt = now + 220;
          }

          if (normalizedNoiseMode === "krisp" && this.keyboardNoiseLikely && !strongVadSpeech) {
            const isClearlyAboveThreshold = this.currentLevel >= Math.max(levelThreshold + 0.02, 0.08);
            const hasVadSupport = (
              this.vadSpeaking
              || this.vadLastSpeechProbability >= (vadProbabilityThreshold - 0.03)
              || this.vadSpeechProbabilityEma >= (vadProbabilityThreshold - 0.06)
            );
            if (!isClearlyAboveThreshold && !hasVadSupport && speechConfidence < 0.62) {
              return false;
            }
          }

          return speakingCandidate;
        }

        updateTransmissionState({ force = false } = {}) {
          const shouldTransmit = this.getShouldTransmit();
          const allowTrack = !(this.muted || this.deafened);

          if (this.transmitTrack) {
            this.transmitTrack.enabled = allowTrack;
          }

          this.setTransmitGateState(allowTrack && shouldTransmit);

          const speakingNow = allowTrack && shouldTransmit;
          if (force || speakingNow !== this.speaking) {
            this.setSpeakingState(speakingNow);
          }
        }

        setSpeakingState(nextSpeaking) {
          const speaking = nextSpeaking === true;
          if (this.speaking === speaking) {
            return;
          }
          this.speaking = speaking;
          this.onSpeakingChange(speaking);
        }

        async setOutputDevice(deviceId) {
          this.outputDeviceId = String(deviceId || "default");
          if (this.micTestAudio) {
            await this.applySinkId(this.micTestAudio);
          }
        }

        async applySinkId(audioElement) {
          if (!audioElement || typeof audioElement.setSinkId !== "function") {
            return false;
          }
          try {
            const targetSinkId = this.outputDeviceId && this.outputDeviceId !== "default"
              ? this.outputDeviceId
              : "";
            await audioElement.setSinkId(targetSinkId);
            return true;
          } catch (error) {
            console.warn("Discord 2 output sink error:", error);
            return false;
          }
        }

        async startMicTest() {
          if (!this.rawStream) {
            await this.startLocalStream(this.settings.inputDeviceId);
          }

          if (!this.micTestAudio) {
            this.micTestAudio = document.createElement("audio");
            this.micTestAudio.autoplay = true;
            this.micTestAudio.playsInline = true;
            this.micTestAudio.style.display = "none";
            document.body.appendChild(this.micTestAudio);
          }

          this.micTestAudio.srcObject = this.rawStream;
          this.micTestAudio.volume = clamp((this.settings.outputVolume || 100) / 100, 0, 1);
          await this.applySinkId(this.micTestAudio);
          await this.micTestAudio.play();
          this.micTestActive = true;
        }

        stopMicTest() {
          if (!this.micTestAudio) {
            this.micTestActive = false;
            return;
          }

          try {
            this.micTestAudio.pause();
          } catch (_error) {}

          this.micTestAudio.srcObject = null;
          this.micTestActive = false;
        }

        isMicTestActive() {
          return this.micTestActive === true;
        }

        getCurrentLevel() {
          return this.currentLevel;
        }

        getCurrentThreshold() {
          return this.getEffectiveThreshold();
        }

        getTransmitStream() {
          return this.transmitStream;
        }

        dispose() {
          this.stopLocalStream();

          if (this.micTestAudio) {
            try {
              this.micTestAudio.remove();
            } catch (_error) {}
            this.micTestAudio = null;
          }

          if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close().catch(() => {});
          }

          this.audioContext = null;
          this.myVad = null;
        }
      }
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
            ? "Krisp zajszűrés: bekapcsolva"
            : "Krisp zajszűrés: kikapcsolva";
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
          // File transfer will be enabled in a later iteration.
          discord2UploadBtn.disabled = true;
        }

        if (discord2SendBtn) {
          discord2SendBtn.disabled = false;
        }
      }

      function sendDiscord2Message() {
        if (!discord2MessageInput) {
          return;
        }

        const selectedChannel = getDiscord2SelectedChannel();
        if (!selectedChannel || selectedChannel.type !== "text") {
          return;
        }

        const content = String(discord2MessageInput.value || "").trim();
        if (!content) {
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
        if (discord2UploadLabel) {
          discord2UploadLabel.textContent = "";
        }
      }

      function clearDiscord2RuntimeState() {
        teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: true });
        discord2State.serverName = "UMKGL Szerver";
        discord2State.serverLogoUrl = "program_icons/default-avatar.png";
        discord2State.serverLogoFilename = null;
        discord2State.categories = [];
        discord2State.channels = [];
        discord2State.messagesByChannel = {};
        discord2State.selectedChannelId = null;
        discord2State.onlineMembers = [];
        discord2State.voiceMembersByChannel = {};
        discord2State.collapsedCategoryIds = {};
        discord2State.selfUserId = null;
        discord2State.selfVoiceChannelId = null;
        discord2State.speakingByUser = {};
        discord2State.inputMeterLevel = 0;
        discord2State.inputMeterThreshold = 0.5;
        discord2State.inputMeterRms = 0;
        discord2State.isMuted = false;
        discord2State.isDeafened = false;
        discord2LastSpeakingSentState = null;

        if (discord2UploadInput) {
          discord2UploadInput.value = "";
        }
        if (discord2UploadLabel) {
          discord2UploadLabel.textContent = "";
        }
        renderDiscord2InputMeter();
        renderDiscord2ServerIdentity();
      }

      function populateDiscord2CategoryOptions(selectedCategoryId = null) {
        if (!discord2ManageCategory) {
          return;
        }
        const normalizedSelectedCategoryId = normalizeDiscord2Id(selectedCategoryId);
        discord2ManageCategory.innerHTML = "";
        discord2State.categories
          .slice()
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          .forEach((category, index) => {
            const categoryId = normalizeDiscord2Id(category.id);
            if (!categoryId) {
              return;
            }
            const option = document.createElement("option");
            option.value = String(categoryId);
            option.textContent = category.name;
            if (
              (normalizedSelectedCategoryId && categoryId === normalizedSelectedCategoryId)
              || (!normalizedSelectedCategoryId && index === 0)
            ) {
              option.selected = true;
            }
            discord2ManageCategory.appendChild(option);
          });
      }

      function closeDiscord2ManageModal() {
        discord2ManageState = null;
        if (!discord2ManageModal) {
          return;
        }
        discord2ManageModal.classList.remove("is-open");
        discord2ManageModal.setAttribute("aria-hidden", "true");
      }

      function openDiscord2ManageModal(config) {
        if (!discord2ManageModal || !discord2ManageForm || !discord2ManageName || !discord2ManageTitle) {
          return;
        }

        discord2ManageState = config;
        discord2ManageTitle.textContent = config?.title || "Discord 2";
        discord2ManageName.value = config?.name || "";

        const showType = config?.mode === "create-channel";
        const showCategory = config?.mode === "create-channel";

        if (discord2ManageTypeWrap) {
          discord2ManageTypeWrap.style.display = showType ? "block" : "none";
        }
        if (discord2ManageCategoryWrap) {
          discord2ManageCategoryWrap.style.display = showCategory ? "block" : "none";
        }
        if (discord2ManageType) {
          discord2ManageType.value = config?.channelType === "voice" ? "voice" : "text";
        }
        if (showCategory) {
          populateDiscord2CategoryOptions(config?.categoryId || null);
        }
        if (discord2ManageDeleteBtn) {
          const canDelete = config?.mode === "rename-category" || config?.mode === "rename-channel";
          discord2ManageDeleteBtn.style.display = canDelete ? "inline-flex" : "none";
        }

        discord2ManageModal.classList.add("is-open");
        discord2ManageModal.setAttribute("aria-hidden", "false");
        discord2ManageName.focus();
        discord2ManageName.select();
      }

      function hideDiscord2ContextMenu() {
        discord2ContextState = null;
        if (!discord2ContextMenu) {
          return;
        }
        discord2ContextMenu.classList.remove("is-open");
        discord2ContextMenu.setAttribute("aria-hidden", "true");
      }

      function openDiscord2ContextMenu(clientX, clientY, payload) {
        if (!discord2ContextMenu) {
          return;
        }
        discord2ContextState = payload;
        discord2ContextMenu.style.left = `${clientX}px`;
        discord2ContextMenu.style.top = `${clientY}px`;
        discord2ContextMenu.classList.add("is-open");
        discord2ContextMenu.setAttribute("aria-hidden", "false");
      }

      function setDiscord2ServerSettingsStatus(text = "", isError = false) {
        if (!discord2ServerSettingsStatus) {
          return;
        }
        discord2ServerSettingsStatus.textContent = text;
        discord2ServerSettingsStatus.classList.toggle("is-error", Boolean(isError));
      }

      function closeDiscord2ServerLogoCropper(resetInput = false) {
        if (discord2ServerLogoCropperModal) {
          discord2ServerLogoCropperModal.classList.remove("open");
          discord2ServerLogoCropperModal.setAttribute("aria-hidden", "true");
        }
        if (discord2ServerLogoCropper) {
          discord2ServerLogoCropper.destroy();
          discord2ServerLogoCropper = null;
        }
        if (discord2ServerLogoCropperImage) {
          discord2ServerLogoCropperImage.src = "";
        }
        if (discord2ServerLogoZoomRange) {
          discord2ServerLogoZoomRange.value = "1";
        }
        if (resetInput && discord2ServerLogoInput) {
          discord2ServerLogoInput.value = "";
        }
      }

      function openDiscord2ServerSettingsModal() {
        if (!discord2ServerSettingsModal) {
          return;
        }
        if (discord2ServerNameInput) {
          discord2ServerNameInput.value = discord2State.serverName || "UMKGL Szerver";
        }
        if (discord2ServerLogoPreview) {
          discord2ServerLogoPreview.src = discord2State.serverLogoUrl || "program_icons/default-avatar.png";
        }
        setDiscord2ServerSettingsStatus("");
        discord2ServerSettingsModal.classList.add("is-open");
        discord2ServerSettingsModal.setAttribute("aria-hidden", "false");
      }

      function closeDiscord2ServerSettingsModal() {
        if (!discord2ServerSettingsModal) {
          return;
        }
        discord2ServerSettingsModal.classList.remove("is-open");
        discord2ServerSettingsModal.setAttribute("aria-hidden", "true");
        setDiscord2ServerSettingsStatus("");
      }

      async function uploadDiscord2ServerLogoIfNeeded() {
        if (!discord2ServerLogoBlob) {
          return null;
        }
        const token = getStoredToken();
        if (!token) {
          throw new Error("Nem sikerült betölteni a szavazásokat.");
        }

        const formData = new FormData();
        formData.append("logo", discord2ServerLogoBlob, "discord2-server-logo.png");

        const response = await fetch("/api/discord2/server-logo", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Nem siker\u00FClt felt\u00F6lteni a szerver log\u00F3t.");
        }

        discord2ServerLogoBlob = null;
        if (discord2ServerLogoInput) {
          discord2ServerLogoInput.value = "";
        }
        return payload;
      }

      function getDiscord2ChannelRowActions(entityType, entityId, categoryId = "") {
        if (!isAdminUser()) {
          return "";
        }

        return `
          <span class="discord2-row-actions discord2-admin-only">
            <button class="discord2-icon-btn" type="button" data-discord2-action="settings" data-discord2-entity-type="${entityType}" data-discord2-entity-id="${entityId}" data-discord2-category-id="${categoryId}" title="SzerkesztAs"><i class="fa-solid fa-gear"></i></button>
          </span>
        `;
      }

      function isDiscord2MemberSpeaking(userId) {
        const normalizedUserId = normalizeDiscord2Id(userId);
        if (!normalizedUserId) {
          return false;
        }
        return discord2State.speakingByUser[String(normalizedUserId)] === true;
      }

      function renderDiscord2ChannelTree() {
        if (!discord2ChannelTree) {
          return;
        }

        const selectedChannelId = normalizeDiscord2Id(discord2State.selectedChannelId);
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);

        const categoryMarkup = discord2State.categories
          .slice()
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          .map((category) => {
            const categoryId = normalizeDiscord2Id(category.id);
            if (!categoryId) {
              return "";
            }

            const channels = getDiscord2ChannelsForCategory(categoryId);
            const isCollapsed = Boolean(discord2State.collapsedCategoryIds[categoryId]);
            const arrow = isCollapsed ? ">" : "v";
            const channelRows = channels
              .map((channel) => {
                const channelId = normalizeDiscord2Id(channel.id);
                if (!channelId) {
                  return "";
                }

                const icon = channel.type === "voice" ? "🔊" : "#";
                const isActive = (
                  selectedChannelId === channelId
                  || (channel.type === "voice" && normalizeDiscord2Id(discord2State.selfVoiceChannelId) === channelId)
                ) ? "is-active" : "";
                const voiceMembers = channel.type === "voice"
                  ? (Array.isArray(discord2State.voiceMembersByChannel[String(channelId)])
                    ? discord2State.voiceMembersByChannel[String(channelId)]
                    : [])
                  : [];

                const voicePresence = voiceMembers.length
                  ? `
                      <div class="discord2-voice-presence">
                        ${voiceMembers.map((member) => {
                          const memberUserId = normalizeDiscord2Id(member.userId);
                          const isSelf = selfUserId && memberUserId === selfUserId;
                          const selfState = [];
                          if (isSelf && discord2State.isMuted) {
                            selfState.push("mikrofon n\u00E9m\u00EDtva");
                          }
                          if (isSelf && discord2State.isDeafened) {
                            selfState.push("sALketAtve");
                          }
                          const suffix = selfState.length ? ` (${selfState.join(", ")})` : "";
                          const speakingClass = isDiscord2MemberSpeaking(memberUserId) ? " is-speaking" : "";

                          return `
                            <div class="discord2-voice-user${isSelf ? " is-self" : ""}">
                              <img class="discord2-speaking-avatar${speakingClass}" src="${escapeDiscord2Html(member.avatarUrl)}" alt="">
                              <span>${escapeDiscord2Html(member.username)}${escapeDiscord2Html(suffix)}</span>
                            </div>
                          `;
                        }).join("")}
                      </div>
                    `
                  : "";
                return `
                  <div class="discord2-channel-item" data-discord2-entity-type="channel" data-discord2-entity-id="${channelId}" data-discord2-category-id="${categoryId}">
                    <button class="discord2-channel-row ${isActive}" type="button" data-discord2-channel="${channelId}">
                      <span class="discord2-channel-icon">${icon}</span>
                      <span class="discord2-channel-name">${escapeDiscord2Html(channel.name)}</span>
                      ${getDiscord2ChannelRowActions("channel", channelId, categoryId)}
                    </button>
                    ${voicePresence}
                  </div>
                `;
              })
              .join("");

            return `
              <div class="discord2-category" data-discord2-category="${categoryId}">
                <div class="discord2-category-row" data-discord2-entity-type="category" data-discord2-entity-id="${categoryId}">
                  <button class="discord2-category-toggle" type="button" data-discord2-toggle="${categoryId}">${arrow}</button>
                  <span class="discord2-category-name">${escapeDiscord2Html(category.name)}</span>
                  ${getDiscord2ChannelRowActions("category", categoryId)}
                </div>
                <div class="discord2-channel-list" style="display: ${isCollapsed ? "none" : "flex"};">
                  ${channelRows || `<div class="discord2-empty">Nincs csatorna.</div>`}
                </div>
              </div>
            `;
          })
          .join("");

        discord2ChannelTree.innerHTML = categoryMarkup || `<div class="discord2-empty">Nincs el\u00E9rhet\u0151 kateg\u00F3ria.</div>`;
      }

      function renderDiscord2Messages() {
        if (!discord2MessageList || !discord2MessageInput || !discord2SendBtn || !discord2UploadBtn || !discord2UploadLabel) {
          return;
        }

        const selectedChannel = getDiscord2SelectedChannel();
        if (!selectedChannel) {
          if (discord2ChannelTitle) {
            discord2ChannelTitle.textContent = "# nincs csatorna";
          }
          if (discord2ChannelDescription) {
            discord2ChannelDescription.textContent = "Nincs kijel\u00F6lt csatorna.";
          }
          discord2MessageList.innerHTML = `<div class="discord2-empty">Nincs kijel\u00F6lt csatorna.</div>`;
          setDiscord2ComposerReadonly("A csatorna nem el\u00E9rhet\u0151.");
          discord2UploadLabel.textContent = "";
          return;
        }

        const channelId = normalizeDiscord2Id(selectedChannel.id);
        const isTextChannel = selectedChannel.type === "text";
        const iconPrefix = isTextChannel ? "#" : "🔊";

        if (discord2ChannelTitle) {
          discord2ChannelTitle.textContent = `${iconPrefix} ${selectedChannel.name}`;
        }
        if (discord2ChannelDescription) {
          discord2ChannelDescription.textContent = getDiscord2ChannelDescription(selectedChannel);
        }

        if (!isTextChannel) {
          discord2MessageList.innerHTML = `
            <div class="discord2-empty">
              <p>A k\u00F6z\u00E9ps\u0151 chat n\u00E9zet csak sz\u00F6veges csatorn\u00E1n akt\u00EDv.</p>
            </div>
          `;
          setDiscord2ComposerReadonly("V\u00E1lassz egy sz\u00F6veges csatorn\u00E1t.");
          if (discord2UploadLabel) {
            discord2UploadLabel.textContent = "";
          }
          return;
        }

        const messages = Array.isArray(discord2State.messagesByChannel[String(channelId)])
          ? discord2State.messagesByChannel[String(channelId)]
          : [];

        if (!messages.length) {
          discord2MessageList.innerHTML = `<div class="discord2-empty">M\u00E9g nincs \u00FCzenet ebben a csatorn\u00E1ban.</div>`;
        } else {
          discord2MessageList.innerHTML = messages
            .map((message) => `
              <article class="discord2-message">
                <img class="discord2-message-avatar" src="${escapeDiscord2Html(message.avatarUrl)}" alt="">
                <div class="discord2-message-main">
                  <div class="discord2-message-head">
                    <span class="discord2-message-author">${escapeDiscord2Html(message.author)}</span>
                    <time class="discord2-message-time">${escapeDiscord2Html(formatDiscord2MessageTime(message.createdAt))}</time>
                  </div>
                  <p class="discord2-message-body">${escapeDiscord2Html(message.content)}</p>
                </div>
              </article>
            `)
            .join("");
        }

        setDiscord2ComposerWritable("\u00CDrj \u00FCzenetet...");
        discord2UploadLabel.textContent = "F\u00E1jlcsatol\u00E1s k\u00E9s\u0151bb \u00E9rkezik.";
        scrollDiscord2MessagesToBottom();
      }

      function renderDiscord2MemberList() {
        if (!discord2MemberList) {
          return;
        }

        const onlineMembers = Array.isArray(discord2State.onlineMembers)
          ? discord2State.onlineMembers.slice().sort((a, b) => String(a.username).localeCompare(String(b.username), "hu"))
          : [];

        if (!onlineMembers.length) {
          discord2MemberList.innerHTML = `
            <div class="discord2-member-group">
              <h5 class="discord2-member-group-title">Online - 0</h5>
              <div class="discord2-empty">Nincs online, jogosult felhaszn\u00E1l\u00F3.</div>
            </div>
          `;
          return;
        }

        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        discord2MemberList.innerHTML = `
          <div class="discord2-member-group">
            <h5 class="discord2-member-group-title">Online - ${onlineMembers.length}</h5>
            ${onlineMembers.map((member) => {
              const memberVoiceChannelId = normalizeDiscord2Id(member.voiceChannelId);
              const memberVoiceChannel = memberVoiceChannelId ? getDiscord2ChannelById(memberVoiceChannelId) : null;
              const isSelf = selfUserId && normalizeDiscord2Id(member.userId) === selfUserId;

              let statusText = memberVoiceChannel
                ? `Hang: ${memberVoiceChannel.name}`
                : "Online";

              if (isSelf && discord2State.isDeafened) {
                statusText += " | S\u00FCket\u00EDtve";
              } else if (isSelf && discord2State.isMuted) {
                statusText += " | NAmAtva";
              }
              const isSpeaking = isDiscord2MemberSpeaking(member.userId);

              return `
                <div class="discord2-member">
                  <img class="discord2-speaking-avatar${isSpeaking ? " is-speaking" : ""}" src="${escapeDiscord2Html(member.avatarUrl)}" alt="">
                  <div class="discord2-member-meta">
                    <span class="discord2-member-name">${escapeDiscord2Html(member.username)}</span>
                    <span class="discord2-member-status">${escapeDiscord2Html(statusText)}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }

      function renderDiscord2Userbar() {
        const currentUser = getDiscord2CurrentUser();
        const voiceChannel = getDiscord2ChannelById(discord2State.selfVoiceChannelId);
        const inVoiceChannel = Boolean(voiceChannel);

        if (discord2UserbarAvatar) {
          discord2UserbarAvatar.src = currentUser.avatarUrl;
        }

        if (discord2UserbarName) {
          discord2UserbarName.textContent = currentUser.username || "Felhaszn\u00E1l\u00F3";
        }

        if (discord2UserbarState) {
          if (!discord2SocketConnected) {
            discord2UserbarState.textContent = "Kapcsol\u00F3d\u00E1s...";
          } else {
            let stateText = voiceChannel ? `Hang: ${voiceChannel.name}` : "Online";
            if (discord2State.isDeafened) {
              stateText += " | S\u00FCket\u00EDtve";
            } else if (discord2State.isMuted) {
              stateText += " | NAmAtva";
            }
            discord2UserbarState.textContent = stateText;
          }
        }

        if (discord2VoiceSessionBar) {
          discord2VoiceSessionBar.classList.toggle("is-visible", inVoiceChannel);
          discord2VoiceSessionBar.style.display = inVoiceChannel ? "flex" : "none";
        }

        if (discord2VoiceSessionChannel) {
          discord2VoiceSessionChannel.textContent = inVoiceChannel
            ? `J\u00E1tszunk #${voiceChannel.name}`
            : "Nincs hangh\u00EDv\u00E1s";
        }

        syncDiscord2NoiseSuppressionControls();
        if (!inVoiceChannel) {
          closeDiscord2KrispPopover();
        }

        syncDiscord2LatencyPolling();
        if (discord2VoiceLatencyBtn) {
          discord2VoiceLatencyBtn.setAttribute("aria-disabled", inVoiceChannel ? "false" : "true");
          updateDiscord2LatencyIndicator();
        }

        if (discord2MuteBtn) {
          discord2MuteBtn.classList.toggle("is-active", Boolean(discord2State.isMuted));
          discord2MuteBtn.setAttribute("aria-pressed", discord2State.isMuted ? "true" : "false");
        }

        if (discord2DeafenBtn) {
          discord2DeafenBtn.classList.toggle("is-active", Boolean(discord2State.isDeafened));
          discord2DeafenBtn.setAttribute("aria-pressed", discord2State.isDeafened ? "true" : "false");
        }

        if (discord2LeaveVoiceBtn) {
          discord2LeaveVoiceBtn.disabled = !inVoiceChannel;
        }
      }

      function renderDiscord2() {
        if (!discord2Section || !hasDiscord2Access()) {
          return;
        }
        ensureDiscord2SelectedChannel();
        renderDiscord2ServerIdentity();
        discord2Section.classList.toggle("discord2--admin", isAdminUser());
        renderDiscord2ChannelTree();
        renderDiscord2Messages();
        renderDiscord2MemberList();
        renderDiscord2Userbar();
      }

      function selectDiscord2Channel(channelId) {
        const normalizedChannelId = normalizeDiscord2Id(channelId);
        if (!normalizedChannelId) {
          return;
        }

        const selectedChannel = getDiscord2ChannelById(normalizedChannelId);
        if (!selectedChannel) {
          return;
        }

        if (selectedChannel.type === "voice") {
          void joinDiscord2VoiceChannel(normalizedChannelId);
          renderDiscord2();
          return;
        }

        discord2State.selectedChannelId = normalizedChannelId;
        renderDiscord2();
        scrollDiscord2MessagesToBottom();
      }

      function handleDiscord2Action(action, entityType, entityId, categoryId = null) {
        if (!isAdminUser()) {
          return;
        }

        const normalizedEntityId = normalizeDiscord2Id(entityId);
        if (action === "settings" || action === "rename" || action === "edit") {
          if (entityType === "category") {
            const category = discord2State.categories.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
            if (!category) {
              return;
            }
            openDiscord2ManageModal({
              mode: "rename-category",
              title: "Kateg\u00F3ria szerkeszt\u00E9se",
              name: category.name,
              targetId: category.id,
            });
            return;
          }

          if (entityType === "channel") {
            const channel = discord2State.channels.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
            if (!channel) {
              return;
            }
            openDiscord2ManageModal({
              mode: "rename-channel",
              title: "Csatorna szerkeszt\u00E9se",
              name: channel.name,
              targetId: channel.id,
            });
          }
          return;
        }

        if (action !== "delete") {
          return;
        }

        ensureDiscord2SocketConnection();
        if (!discord2Socket) {
          return;
        }

        if (entityType === "category") {
          const category = discord2State.categories.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
          if (!category) {
            return;
          }
          if (confirm(`T\u00F6r\u00F6lj\u00FCk a(z) "${category.name}" kateg\u00F3ri\u00E1t \u00E9s az \u00F6sszes csatorn\u00E1j\u00E1t?`)) {
            discord2Socket.emit("discord2_delete_category", { categoryId: normalizedEntityId });
          }
          return;
        }

        if (entityType === "channel") {
          const channel = discord2State.channels.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
          if (!channel) {
            return;
          }
          if (confirm(`T\u00F6r\u00F6lj\u00FCk a(z) "${channel.name}" csatorn\u00E1t?`)) {
            discord2Socket.emit("discord2_delete_channel", { channelId: normalizedEntityId });
          }
        }
      }

      function normalizeDiscord2Category(rawCategory, index) {
        const categoryId = normalizeDiscord2Id(rawCategory?.id);
        if (!categoryId) {
          return null;
        }

        const name = String(rawCategory?.name || "").trim() || `Kateg\u00F3ria ${index + 1}`;
        return {
          id: categoryId,
          name,
          position: Number.isFinite(Number(rawCategory?.position)) ? Number(rawCategory.position) : index,
        };
      }

      function normalizeDiscord2Channel(rawChannel, index, validCategoryIds) {
        const channelId = normalizeDiscord2Id(rawChannel?.id);
        if (!channelId) {
          return null;
        }

        const parentId = normalizeDiscord2Id(rawChannel?.parentId ?? rawChannel?.parent_id);
        if (parentId && validCategoryIds && !validCategoryIds.has(parentId)) {
          return null;
        }

        const name = String(rawChannel?.name || "").trim() || `csatorna-${index + 1}`;
        return {
          id: channelId,
          name,
          type: rawChannel?.type === "voice" ? "voice" : "text",
          parentId: parentId || null,
          position: Number.isFinite(Number(rawChannel?.position)) ? Number(rawChannel.position) : index,
        };
      }

      function normalizeDiscord2Member(rawMember, forcedVoiceChannelId = null) {
        const userId = normalizeDiscord2Id(rawMember?.userId ?? rawMember?.id);
        if (!userId) {
          return null;
        }

        const username = String(rawMember?.username || rawMember?.name || "").trim() || `user-${userId}`;
        const profilePictureFilename = rawMember?.profile_picture_filename;
        const rawAvatarUrl = typeof rawMember?.avatarUrl === "string" ? rawMember.avatarUrl : "";
        const avatarUrl = rawAvatarUrl
          || (profilePictureFilename ? `/uploads/avatars/${profilePictureFilename}` : "program_icons/default-avatar.png");

        const normalizedForcedVoiceChannelId = normalizeDiscord2Id(forcedVoiceChannelId);
        const normalizedVoiceChannelId = normalizedForcedVoiceChannelId
          || normalizeDiscord2Id(rawMember?.voiceChannelId);
        const normalizedPeerId = typeof rawMember?.peerId === "string"
          ? String(rawMember.peerId).trim()
          : "";

        return {
          userId,
          username,
          avatarUrl,
          isAdmin: rawMember?.isAdmin === true || rawMember?.isAdmin === 1,
          voiceChannelId: normalizedVoiceChannelId || null,
          peerId: normalizedPeerId || null,
          speaking: rawMember?.speaking === true,
        };
      }

      function normalizeDiscord2Message(rawMessage, forcedChannelId = null) {
        const channelId = normalizeDiscord2Id(rawMessage?.channelId ?? rawMessage?.channel_id ?? forcedChannelId);
        if (!channelId) {
          return null;
        }

        const authorUserId = normalizeDiscord2Id(rawMessage?.userId ?? rawMessage?.user_id);
        if (!authorUserId) {
          return null;
        }

        const messageIdRaw = rawMessage?.id;
        const messageId = messageIdRaw ? String(messageIdRaw) : createDiscord2TempId("msg");
        const author = String(rawMessage?.author ?? rawMessage?.author_name ?? "Ismeretlen").trim() || "Ismeretlen";
        const content = String(rawMessage?.content || "").trim();
        if (!content) {
          return null;
        }

        const avatarUrl = typeof rawMessage?.avatarUrl === "string" && rawMessage.avatarUrl
          ? rawMessage.avatarUrl
          : "program_icons/default-avatar.png";

        const createdAt = typeof rawMessage?.createdAt === "string"
          ? rawMessage.createdAt
          : (typeof rawMessage?.created_at === "string" ? rawMessage.created_at : new Date().toISOString());

        return {
          id: messageId,
          channelId,
          author,
          content,
          avatarUrl,
          createdAt,
        };
      }

      function applyDiscord2Structure(payload) {
        const normalizedCategories = Array.isArray(payload?.categories)
          ? payload.categories
              .map((category, index) => normalizeDiscord2Category(category, index))
              .filter(Boolean)
              .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          : [];

        const validCategoryIds = new Set(normalizedCategories.map((category) => category.id));
        const normalizedChannels = Array.isArray(payload?.channels)
          ? payload.channels
              .map((channel, index) => normalizeDiscord2Channel(channel, index, validCategoryIds))
              .filter(Boolean)
              .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          : [];

        const nextCollapsed = {};
        normalizedCategories.forEach((category) => {
          if (discord2State.collapsedCategoryIds[category.id]) {
            nextCollapsed[category.id] = true;
          }
        });

        discord2State.categories = normalizedCategories;
        discord2State.channels = normalizedChannels;
        discord2State.collapsedCategoryIds = nextCollapsed;

        const validChannelKeys = new Set(normalizedChannels.map((channel) => String(channel.id)));
        Object.keys(discord2State.messagesByChannel).forEach((channelKey) => {
          if (!validChannelKeys.has(String(channelKey))) {
            delete discord2State.messagesByChannel[channelKey];
          }
        });

        ensureDiscord2SelectedChannel();
      }

      function applyDiscord2Presence(payload) {
        const previousSelfVoiceChannelId = normalizeDiscord2Id(discord2State.selfVoiceChannelId);
        const normalizedOnlineMembers = Array.isArray(payload?.onlineMembers)
          ? payload.onlineMembers
              .map((member) => normalizeDiscord2Member(member))
              .filter(Boolean)
          : [];

        const normalizedVoiceMembersByChannel = {};
        if (payload?.voiceMembersByChannel && typeof payload.voiceMembersByChannel === "object") {
          Object.entries(payload.voiceMembersByChannel).forEach(([rawChannelId, rawMembers]) => {
            const channelId = normalizeDiscord2Id(rawChannelId);
            if (!channelId) {
              return;
            }

            const members = Array.isArray(rawMembers)
              ? rawMembers
                  .map((member) => normalizeDiscord2Member(member, channelId))
                  .filter(Boolean)
              : [];

            normalizedVoiceMembersByChannel[String(channelId)] = members;
          });
        }

        const nextSpeakingByUser = {};
        normalizedOnlineMembers.forEach((member) => {
          const memberUserId = normalizeDiscord2Id(member.userId);
          if (memberUserId && member.speaking === true) {
            nextSpeakingByUser[String(memberUserId)] = true;
          }
        });
        Object.values(normalizedVoiceMembersByChannel).forEach((members) => {
          members.forEach((member) => {
            const memberUserId = normalizeDiscord2Id(member.userId);
            if (memberUserId && member.speaking === true) {
              nextSpeakingByUser[String(memberUserId)] = true;
            }
          });
        });

        discord2State.onlineMembers = normalizedOnlineMembers;
        discord2State.voiceMembersByChannel = normalizedVoiceMembersByChannel;
        discord2State.speakingByUser = nextSpeakingByUser;

        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        const selfMember = selfUserId
          ? normalizedOnlineMembers.find((member) => normalizeDiscord2Id(member.userId) === selfUserId)
          : null;

        const nextSelfVoiceChannelId = selfMember ? normalizeDiscord2Id(selfMember.voiceChannelId) : null;
        discord2State.selfVoiceChannelId = nextSelfVoiceChannelId;
        discord2VoiceCurrentChannelId = nextSelfVoiceChannelId || null;

        if (!nextSelfVoiceChannelId && previousSelfVoiceChannelId) {
          teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: true });
        }

        if (nextSelfVoiceChannelId) {
          discord2VoiceDesiredChannelId = nextSelfVoiceChannelId;
        }
        refreshDiscord2VoiceConnections();
      }

      function applyDiscord2State(payload) {
        applyDiscord2ServerSettings(payload?.server || {});
        applyDiscord2Structure(payload);

        const normalizedMessagesByChannel = {};
        if (payload?.messagesByChannel && typeof payload.messagesByChannel === "object") {
          Object.entries(payload.messagesByChannel).forEach(([rawChannelId, rawMessages]) => {
            const channelId = normalizeDiscord2Id(rawChannelId);
            if (!channelId) {
              return;
            }

            const messages = Array.isArray(rawMessages)
              ? rawMessages
                  .map((message) => normalizeDiscord2Message(message, channelId))
                  .filter(Boolean)
              : [];

            normalizedMessagesByChannel[String(channelId)] = messages;
          });
        }

        discord2State.messagesByChannel = normalizedMessagesByChannel;

        const selfUserId = normalizeDiscord2Id(payload?.selfUserId);
        if (selfUserId) {
          discord2State.selfUserId = selfUserId;
        }

        const payloadSelectedChannelId = normalizeDiscord2Id(payload?.selectedChannelId);
        if (payloadSelectedChannelId) {
          discord2State.selectedChannelId = payloadSelectedChannelId;
        }

        applyDiscord2Presence(payload);
        ensureDiscord2SelectedChannel();
        renderDiscord2();
      }

      function upsertDiscord2Message(rawMessage) {
        const normalizedMessage = normalizeDiscord2Message(rawMessage);
        if (!normalizedMessage) {
          return;
        }

        const channelKey = String(normalizedMessage.channelId);
        if (!Array.isArray(discord2State.messagesByChannel[channelKey])) {
          discord2State.messagesByChannel[channelKey] = [];
        }

        const existing = discord2State.messagesByChannel[channelKey].some((message) => String(message.id) === String(normalizedMessage.id));
        if (existing) {
          return;
        }

        discord2State.messagesByChannel[channelKey].push(normalizedMessage);
        if (discord2State.messagesByChannel[channelKey].length > 500) {
          discord2State.messagesByChannel[channelKey].shift();
        }

        if (normalizeDiscord2Id(discord2State.selectedChannelId) === normalizeDiscord2Id(normalizedMessage.channelId)) {
          renderDiscord2Messages();
        }
      }

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
          });

          voicePeer.on("call", (call) => {
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
        renderDiscord2();
      }

      function handleDiscord2VoiceMemberLeft(payload) {
        const remoteUserId = normalizeDiscord2Id(payload?.userId);
        if (!remoteUserId) {
          return;
        }
        closeDiscord2VoiceCall(remoteUserId);
        setDiscord2MemberSpeaking(remoteUserId, false);
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

        if (discord2SendBtn) {
          discord2SendBtn.addEventListener("click", () => {
            sendDiscord2Message();
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

