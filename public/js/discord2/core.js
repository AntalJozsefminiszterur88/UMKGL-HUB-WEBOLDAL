


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
    const discord2ScreenStage = document.getElementById("discord2ScreenStage");
    const discord2ScreenStageMeta = document.getElementById("discord2ScreenStageMeta");
    const discord2ScreenStageGrid = document.getElementById("discord2ScreenStageGrid");
    const discord2MessageList = document.getElementById("discord2MessageList");
    const discord2MessageInput = document.getElementById("discord2MessageInput");
    const discord2UploadInput = document.getElementById("discord2UploadInput");
    const discord2UploadBtn = document.getElementById("discord2UploadBtn");
    const discord2SendBtn = document.getElementById("discord2SendBtn");
    const discord2UploadLabel = document.getElementById("discord2UploadLabel");
    const discord2Composer = discord2MessageInput ? discord2MessageInput.closest(".discord2-composer") : null;
    const discord2Chat = discord2Section ? discord2Section.querySelector(".discord2-chat") : null;
    const discord2DropOverlay = document.getElementById("discord2DropOverlay");
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
    const discord2MediaViewerModal = document.getElementById("discord2MediaViewerModal");
    const discord2MediaViewerTitle = document.getElementById("discord2MediaViewerTitle");
    const discord2MediaViewerImage = document.getElementById("discord2MediaViewerImage");
    const discord2MediaViewerVideo = document.getElementById("discord2MediaViewerVideo");
    const discord2MediaViewerLink = document.getElementById("discord2MediaViewerLink");
    const discord2MediaViewerClose = document.getElementById("discord2MediaViewerClose");
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
    const discord2ScreenShareBtn = document.getElementById("discord2ScreenShareBtn");
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
    const discord2ScreenShareOutgoingCallsByUser = new Map();
    const discord2ScreenShareIncomingCallsByUser = new Map();
    const discord2RemoteScreenStreamsByUser = new Map();
    const discord2PendingAudioPlayback = new Set();
    let discord2AudioUnlockListenerAttached = false;
    let discord2VoiceDesiredChannelId = null;
    let discord2VoiceCurrentChannelId = null;
    let discord2PushToTalkPressed = false;
    let discord2ScreenShareStream = null;
    let discord2ScreenSharePending = false;
    let discord2PendingUploadFile = null;
    let discord2SendingMessage = false;
    let discord2DragDepth = 0;
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
      screenSharingByUser: {},
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
    const DISCORD2_SCREEN_SHARE_MEDIA_TYPE = "screen";
    const DISCORD2_SCREEN_SHARE_FPS = 60;
    const DISCORD2_SCREEN_SHARE_MAX_BITRATE = 8500000;
    const DISCORD2_MESSAGE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
    const DISCORD2_MESSAGE_GROUP_WINDOW_MS = 8 * 60 * 1000;
    const DISCORD2_MESSAGE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
    const DISCORD2_MESSAGE_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogv", ".ogg", ".mov"]);
    const DISCORD2_MESSAGE_IMAGE_MIME_PREFIX = "image/";
    const DISCORD2_MESSAGE_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);
    const discord2MessageTimeFormatter = new Intl.DateTimeFormat("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const discord2MessageDividerDateFormatter = new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    const discord2MessageTooltipFormatter = new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const discord2MessageHeaderDateFormatter = new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

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

      function stopDiscord2StreamTracks(stream) {
        if (!stream || typeof stream.getTracks !== "function") {
          return;
        }
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_error) {}
        });
      }

      function canDiscord2UseScreenShare() {
        return Boolean(
          navigator.mediaDevices
          && typeof navigator.mediaDevices.getDisplayMedia === "function",
        );
      }

      function isDiscord2SelfScreenSharing() {
        return Boolean(discord2ScreenShareStream);
      }

      function getDiscord2ActiveVoiceMembers() {
        const activeChannelId = getDiscord2SelfVoiceChannelId();
        if (!activeChannelId) {
          return [];
        }
        return Array.isArray(discord2State.voiceMembersByChannel[String(activeChannelId)])
          ? discord2State.voiceMembersByChannel[String(activeChannelId)]
          : [];
      }

      function formatDiscord2FileSize(bytes) {
        const numericBytes = Number(bytes);
        if (!Number.isFinite(numericBytes) || numericBytes <= 0) {
          return "0 B";
        }
        if (numericBytes < 1024) {
          return `${numericBytes} B`;
        }
        if (numericBytes < 1024 * 1024) {
          return `${(numericBytes / 1024).toFixed(1)} KB`;
        }
        return `${(numericBytes / (1024 * 1024)).toFixed(1)} MB`;
      }

      function getDiscord2MessageAttachmentKindFromFile(file) {
        const extension = String(file?.name || "").trim().toLowerCase();
        const extensionSuffix = extension.includes(".")
          ? extension.slice(extension.lastIndexOf("."))
          : "";
        const mimeType = String(file?.type || "").trim().toLowerCase();

        if (mimeType.startsWith(DISCORD2_MESSAGE_IMAGE_MIME_PREFIX) && DISCORD2_MESSAGE_IMAGE_EXTENSIONS.has(extensionSuffix)) {
          return "image";
        }
        if (DISCORD2_MESSAGE_VIDEO_MIME_TYPES.has(mimeType) && DISCORD2_MESSAGE_VIDEO_EXTENSIONS.has(extensionSuffix)) {
          return "video";
        }
        return null;
      }

      function isDiscord2ValidUploadFile(file) {
        if (!file) {
          return false;
        }
        if (!getDiscord2MessageAttachmentKindFromFile(file)) {
          return false;
        }
        return Number(file.size) > 0 && Number(file.size) <= DISCORD2_MESSAGE_UPLOAD_MAX_BYTES;
      }

      function clearDiscord2PendingUpload({ keepStatus = false } = {}) {
        discord2PendingUploadFile = null;
        if (discord2UploadInput) {
          discord2UploadInput.value = "";
        }
        if (!keepStatus && discord2UploadLabel) {
          discord2UploadLabel.textContent = "";
        }
      }

      function updateDiscord2UploadLabel() {
        if (!discord2UploadLabel) {
          return;
        }
        if (discord2SendingMessage) {
          discord2UploadLabel.textContent = "Feltoltes folyamatban...";
          return;
        }
        if (discord2PendingUploadFile) {
          discord2UploadLabel.textContent = `${discord2PendingUploadFile.name} (${formatDiscord2FileSize(discord2PendingUploadFile.size)})`;
          return;
        }
        discord2UploadLabel.textContent = "";
      }

      function setDiscord2PendingUploadFile(file, validationMessage = "Csak 12MB alatti kep vagy video kuldheto.") {
        const selectedChannel = getDiscord2SelectedChannel();
        if (!selectedChannel || selectedChannel.type !== "text") {
          clearDiscord2PendingUpload({ keepStatus: true });
          if (discord2UploadLabel) {
            discord2UploadLabel.textContent = "Csak szoveges csatornaba csatolhatsz fajlt.";
          }
          return false;
        }

        if (!isDiscord2ValidUploadFile(file)) {
          clearDiscord2PendingUpload({ keepStatus: true });
          if (discord2UploadLabel) {
            discord2UploadLabel.textContent = validationMessage;
          }
          return false;
        }

        discord2PendingUploadFile = file;
        updateDiscord2UploadLabel();
        return true;
      }

      function isDiscord2FileDragEvent(event) {
        const types = Array.isArray(event?.dataTransfer?.types)
          ? event.dataTransfer.types
          : Array.from(event?.dataTransfer?.types || []);
        return types.includes("Files");
      }

      function hideDiscord2DropOverlay(resetDepth = false) {
        if (resetDepth) {
          discord2DragDepth = 0;
        }
        if (!discord2DropOverlay) {
          return;
        }
        discord2DropOverlay.classList.remove("is-active");
        discord2DropOverlay.setAttribute("aria-hidden", "true");
      }

      function showDiscord2DropOverlay() {
        if (!discord2DropOverlay) {
          return;
        }
        discord2DropOverlay.classList.add("is-active");
        discord2DropOverlay.setAttribute("aria-hidden", "false");
      }

      function openDiscord2MediaViewer({ kind, url, name, mimeType = "" } = {}) {
        const normalizedKind = kind === "video" ? "video" : (kind === "image" ? "image" : null);
        const normalizedUrl = String(url || "").trim();
        if (!discord2MediaViewerModal || !normalizedKind || !normalizedUrl) {
          return;
        }

        const normalizedName = String(name || "Csatolmany").trim() || "Csatolmany";
        const normalizedMimeType = String(mimeType || "").trim();
        if (discord2MediaViewerTitle) {
          discord2MediaViewerTitle.textContent = normalizedName;
        }
        if (discord2MediaViewerLink) {
          discord2MediaViewerLink.href = normalizedUrl;
        }

        if (discord2MediaViewerImage) {
          discord2MediaViewerImage.style.display = normalizedKind === "image" ? "block" : "none";
          discord2MediaViewerImage.src = normalizedKind === "image" ? normalizedUrl : "";
          discord2MediaViewerImage.alt = normalizedName;
        }

        if (discord2MediaViewerVideo) {
          discord2MediaViewerVideo.pause();
          discord2MediaViewerVideo.style.display = normalizedKind === "video" ? "block" : "none";
          if (normalizedKind === "video") {
            discord2MediaViewerVideo.src = normalizedUrl;
            if (normalizedMimeType) {
              discord2MediaViewerVideo.setAttribute("type", normalizedMimeType);
            } else {
              discord2MediaViewerVideo.removeAttribute("type");
            }
            discord2MediaViewerVideo.load();
          } else {
            discord2MediaViewerVideo.removeAttribute("src");
            discord2MediaViewerVideo.load();
          }
        }

        discord2MediaViewerModal.classList.add("is-visible");
        discord2MediaViewerModal.setAttribute("aria-hidden", "false");
      }

      function closeDiscord2MediaViewer() {
        if (!discord2MediaViewerModal) {
          return;
        }
        discord2MediaViewerModal.classList.remove("is-visible");
        discord2MediaViewerModal.setAttribute("aria-hidden", "true");
        if (discord2MediaViewerImage) {
          discord2MediaViewerImage.src = "";
          discord2MediaViewerImage.style.display = "none";
        }
        if (discord2MediaViewerVideo) {
          discord2MediaViewerVideo.pause();
          discord2MediaViewerVideo.removeAttribute("src");
          discord2MediaViewerVideo.style.display = "none";
          discord2MediaViewerVideo.load();
        }
        if (discord2MediaViewerLink) {
          discord2MediaViewerLink.href = "#";
        }
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

      function parseDiscord2MessageDate(isoValue) {
        const date = new Date(isoValue);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      function isDiscord2SameCalendarDay(leftDate, rightDate) {
        return Boolean(
          leftDate
          && rightDate
          && leftDate.getFullYear() === rightDate.getFullYear()
          && leftDate.getMonth() === rightDate.getMonth()
          && leftDate.getDate() === rightDate.getDate()
        );
      }

      function getDiscord2YesterdayDate(baseDate = new Date()) {
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1);
      }

      function formatDiscord2MessageTime(isoValue) {
        const date = parseDiscord2MessageDate(isoValue);
        return date ? discord2MessageTimeFormatter.format(date) : "";
      }

      function formatDiscord2MessageTooltip(isoValue) {
        const date = parseDiscord2MessageDate(isoValue);
        return date ? discord2MessageTooltipFormatter.format(date) : "Ismeretlen időpont";
      }

      function formatDiscord2MessageHeaderTimestamp(isoValue) {
        const date = parseDiscord2MessageDate(isoValue);
        if (!date) {
          return "";
        }

        const timeLabel = discord2MessageTimeFormatter.format(date);
        const now = new Date();
        if (isDiscord2SameCalendarDay(date, now)) {
          return `Ma ${timeLabel}`;
        }
        if (isDiscord2SameCalendarDay(date, getDiscord2YesterdayDate(now))) {
          return `Tegnap ${timeLabel}`;
        }
        return `${discord2MessageHeaderDateFormatter.format(date)} ${timeLabel}`;
      }

      function formatDiscord2MessageDividerLabel(isoValue) {
        const date = parseDiscord2MessageDate(isoValue);
        if (!date) {
          return "Ismeretlen nap";
        }

        const now = new Date();
        if (isDiscord2SameCalendarDay(date, now)) {
          return "Ma";
        }
        if (isDiscord2SameCalendarDay(date, getDiscord2YesterdayDate(now))) {
          return "Tegnap";
        }
        return discord2MessageDividerDateFormatter.format(date);
      }

      function getDiscord2MessageTimestampValue(message) {
        const date = parseDiscord2MessageDate(message?.createdAt);
        return date ? date.getTime() : 0;
      }

      function getDiscord2MessageGroupIdentity(message) {
        const userId = normalizeDiscord2Id(message?.userId);
        if (userId) {
          return `user:${userId}`;
        }
        return `author:${String(message?.author || "").trim()}|avatar:${String(message?.avatarUrl || "").trim()}`;
      }

      function shouldDiscord2StartNewMessageGroup(message, previousMessage) {
        if (!message || !previousMessage) {
          return true;
        }

        const currentDate = parseDiscord2MessageDate(message.createdAt);
        const previousDate = parseDiscord2MessageDate(previousMessage.createdAt);
        if (!currentDate || !previousDate) {
          return true;
        }
        if (!isDiscord2SameCalendarDay(currentDate, previousDate)) {
          return true;
        }
        if (getDiscord2MessageGroupIdentity(message) !== getDiscord2MessageGroupIdentity(previousMessage)) {
          return true;
        }

        return (currentDate.getTime() - previousDate.getTime()) > DISCORD2_MESSAGE_GROUP_WINDOW_MS;
      }

      function shouldDiscord2InsertMessageDivider(message, previousMessage) {
        if (!message) {
          return false;
        }
        if (!previousMessage) {
          return true;
        }

        const currentDate = parseDiscord2MessageDate(message.createdAt);
        const previousDate = parseDiscord2MessageDate(previousMessage.createdAt);
        return !isDiscord2SameCalendarDay(currentDate, previousDate);
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

