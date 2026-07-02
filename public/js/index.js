
    const CLIENT_BUILD_VERSION = "20260624-refactor-1";
    console.info(`[UMKGL] client build ${CLIENT_BUILD_VERSION}`);



    const ADMIN_SESSION_KEY = "isAdmin";
    const ADMIN_PREVIEW_KEY = "adminPreviewRole";
    const ADMIN_ONLY_SECTIONS = new Set(["programok"]);
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
    const adminSurfaceLink = document.getElementById("adminSurfaceLink");
    const programNavBtn = document.getElementById("programNavBtn");
    const fileTransferNavBtn = document.getElementById("fileTransferNavBtn");

    const pollCreator = document.getElementById("pollCreator");
    const pollCreatorNotice = document.getElementById("pollCreatorNotice");
    const createPollForm = document.getElementById("createPollForm");
    const questionInput = document.getElementById("questionInput");
    const optionsContainer = document.getElementById("optionsContainer");
    const addOptionBtn = document.getElementById("addOptionBtn");
    const pollListContainer = document.getElementById("pollList");
    const pollSection = document.getElementById("szavazas");
    const archiveSection = document.getElementById("archivum");
    const archivePermissionOverlay = document.getElementById("archivePermissionOverlay");
    const archiveCategoryGrid = document.getElementById("archiveCategoryGrid");
    const archiveBrowser = document.getElementById("archiveBrowser");
    const archiveBackBtn = document.getElementById("archiveBackBtn");
    const archiveCategoryTitle = document.getElementById("archiveCategoryTitle");
    const archiveCategoryHint = document.getElementById("archiveCategoryHint");
    const archiveFolderRow = document.getElementById("archiveFolderRow");
    const archiveFolderEmpty = document.getElementById("archiveFolderEmpty");
    const archiveFileGrid = document.getElementById("archiveFileGrid");
    const archiveFileEmpty = document.getElementById("archiveFileEmpty");
    const archiveFolderNameInput = document.getElementById("archiveFolderNameInput");
    const archiveCreateFolderBtn = document.getElementById("archiveCreateFolderBtn");
    const archiveDeleteFolderBtn = document.getElementById("archiveDeleteFolderBtn");
    const archiveUploadInput = document.getElementById("archiveUploadInput");
    const archiveFolderUploadInput = document.getElementById("archiveFolderUploadInput");
    const archiveUploadBtn = document.getElementById("archiveUploadBtn");
    const archiveRenameFolderBtn = document.getElementById("archiveRenameFolderBtn");
    const archiveLockFolderBtn = document.getElementById("archiveLockFolderBtn");
    const archiveUploadStatus = document.getElementById("archiveUploadStatus");
    const archivePasswordModal = document.getElementById("archivePasswordModal");
    const archivePasswordCloseBtn = document.getElementById("archivePasswordClose");
    const archivePasswordTitle = document.getElementById("archivePasswordTitle");
    const archivePasswordInput = document.getElementById("archivePasswordInput");
    const archivePasswordStatus = document.getElementById("archivePasswordStatus");
    const archivePasswordCancelBtn = document.getElementById("archivePasswordCancel");
    const archivePasswordSubmitBtn = document.getElementById("archivePasswordSubmit");
    const archiveImageModal = document.getElementById("archiveImageModal");
    const archiveImagePreview = document.getElementById("archiveImagePreview");
    const archiveImageTitle = document.getElementById("archiveImageTitle");
    const archiveImageClose = document.getElementById("archiveImageClose");
    const archiveImageZoom = document.getElementById("archiveImageZoom");
    const archiveImageStage = document.querySelector("#archiveImageModal .archive-image-stage");
    const archiveImagePrev = document.getElementById("archiveImagePrev");
    const archiveImageNext = document.getElementById("archiveImageNext");
    const archiveDocModal = document.getElementById("archiveDocModal");
    const archiveDocFrame = document.getElementById("archiveDocFrame");
    const archiveDocTitle = document.getElementById("archiveDocTitle");
    const archiveDocClose = document.getElementById("archiveDocClose");
    const archiveVideoPanel = document.getElementById("archiveVideoPanel");
    const archiveVideoPanelHint = document.getElementById("archiveVideoPanelHint");
    const archiveVideoGridContainer = document.getElementById("archiveVideoGridContainer");
    const archiveVideoPagination = document.getElementById("archiveVideoPagination");
    const archiveVideoToast = document.getElementById("archiveVideoToast");
    const archiveShowUploadModalBtn = document.getElementById("archiveShowUploadModalBtn");
    const archiveVideoSearchInput = document.getElementById("archiveVideoSearchInput");
    const archiveTagSelectContainer = document.getElementById("archiveTagSelectContainer");
    const archiveTagSelectBox = archiveTagSelectContainer?.querySelector(".tag-select-box");
    const archiveTagSelectDropdown = archiveTagSelectContainer?.querySelector(".tag-dropdown");
    const archiveSortOrderSelect = document.getElementById("archiveSortOrderSelect");
    const archiveVideoQualitySelect = document.getElementById("archiveVideoQualitySelect");
    const archivePageSizeSelect = document.getElementById("archivePageSizeSelect");
    const archiveFilterResetBtn = document.getElementById("archiveFilterResetBtn");
    const archiveVideoUploadModal = document.getElementById("archiveVideoUploadModal");
    const archiveThumbnailPickerModal = document.getElementById("archiveThumbnailPickerModal");
    const archiveThumbnailPickerVideo = document.getElementById("archiveThumbnailPickerVideo");
    const archiveThumbnailPickerCloseBtn = document.getElementById("archiveThumbnailPickerClose");
    const archiveThumbnailPickerCancelBtn = document.getElementById("archiveThumbnailPickerCancel");
    const archiveThumbnailPickerSaveBtn = document.getElementById("archiveThumbnailPickerSave");
    const archiveThumbnailPickerStepBackBtn = document.getElementById("archiveThumbnailStepBack");
    const archiveThumbnailPickerStepForwardBtn = document.getElementById("archiveThumbnailStepForward");
    const archiveThumbnailPickerSlider = document.getElementById("archiveThumbnailSlider");
    const archiveThumbnailPickerCurrentEl = document.getElementById("archiveThumbnailCurrent");
    const archiveThumbnailPickerDurationEl = document.getElementById("archiveThumbnailDuration");
    const archiveThumbnailPickerHintEl = document.getElementById("archiveThumbnailPickerHint");
    const archiveThumbnailPickerTitleEl = document.getElementById("archiveThumbnailPickerTitle");
    const archiveThumbnailCaptureFrameBtn = document.getElementById("archiveThumbnailCaptureFrameBtn");
    const archiveThumbnailCropStage = document.getElementById("archiveThumbnailCropStage");
    const archiveThumbnailCropCanvas = document.getElementById("archiveThumbnailCropCanvas");
    const archiveThumbnailCropWindow = document.getElementById("archiveThumbnailCropWindow");
    const archiveThumbnailZoomRange = document.getElementById("archiveThumbnailZoomRange");
    const archiveThumbnailZoomInBtn = document.getElementById("archiveThumbnailZoomInBtn");
    const archiveThumbnailZoomOutBtn = document.getElementById("archiveThumbnailZoomOutBtn");
    const archiveThumbnailPanUpBtn = document.getElementById("archiveThumbnailPanUpBtn");
    const archiveThumbnailPanLeftBtn = document.getElementById("archiveThumbnailPanLeftBtn");
    const archiveThumbnailPanRightBtn = document.getElementById("archiveThumbnailPanRightBtn");
    const archiveThumbnailPanDownBtn = document.getElementById("archiveThumbnailPanDownBtn");
    const archiveThumbnailCropResetBtn = document.getElementById("archiveThumbnailCropResetBtn");
    const archiveCloseUploadModalBtn = document.getElementById("archiveCloseUploadModal");
    const archiveDropZone = document.getElementById("archiveDropZone");
    const archiveUploadQueueContainer = document.getElementById("archiveUploadQueueContainer");
    const archiveAddMoreVideosBtn = document.getElementById("archiveAddMoreVideosBtn");
    const archiveVideoFileInput = document.getElementById("archiveVideoFileInput");
    const archiveAddFilesBtn = document.getElementById("archiveAddFilesBtn");
    const archiveCancelUploadBtn = document.getElementById("archiveCancelUploadBtn");
    const archiveUploadSubmitBtn = document.getElementById("archiveUploadSubmitBtn");
    const archiveUploadStatusText = document.getElementById("archiveUploadStatusText");
    const archiveUploadProgress = document.getElementById("archiveUploadProgress");
    const archiveUploadProgressFill = document.getElementById("archiveUploadProgressFill");
    const archiveUploadProgressCount = document.getElementById("archiveUploadProgressCount");
    const archiveUploadProgressEta = document.getElementById("archiveUploadProgressEta");
    const archiveUploadProgressDetails = document.getElementById("archiveUploadProgressDetails");
    const archiveSelectedFileName = document.getElementById("archiveSelectedFileName");
    const archiveUploadSummary = document.getElementById("archiveUploadSummary");
    const archiveUploadToast = document.getElementById("archiveUploadToast");
    const archiveGlobalTagSelect = document.getElementById("archiveGlobalTagSelect");
    const archiveCreateTagWrapper = document.getElementById("archiveCreateTagWrapper");
    const archiveNewTagNameInput = document.getElementById("archiveNewTagName");
    const archiveNewTagColorInput = document.getElementById("archiveNewTagColor");
    const archiveTagColorButton = document.getElementById("archiveTagColorButton");
    const archiveCreateTagButton = document.getElementById("archiveCreateTagButton");
    const archiveDeleteTagButton = document.getElementById("archiveDeleteTagButton");
    const archiveCreateTagStatus = document.getElementById("archiveCreateTagStatus");
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

    // The thumbnail picker is reused from both Archive and Clips. Keep it at <body> level
    // so section-level visibility (e.g. hidden #archivum) cannot suppress the modal.
    if (archiveThumbnailPickerModal && archiveThumbnailPickerModal.parentElement !== document.body) {
      document.body.appendChild(archiveThumbnailPickerModal);
    }
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
    const academySection = document.getElementById("akademia");
    const academyLibraryView = document.getElementById("academyLibraryView");
    const academyGrid = document.getElementById("academyGrid");
    const academyFilters = document.getElementById("academyFilters");
    const academyEmptyState = document.getElementById("academyEmptyState");
    const academyCreateBtn = document.getElementById("academyCreateBtn");
    const academyReaderView = document.getElementById("academyReaderView");
    const academyBackBtn = document.getElementById("academyBackBtn");
    const academyMetaDate = document.getElementById("academyMetaDate");
    const academyMetaKeywords = document.getElementById("academyMetaKeywords");
    const academyMetaTags = document.getElementById("academyMetaTags");
    const academyPdfInfo = document.getElementById("academyPdfInfo");
    const academyPdfLabel = document.getElementById("academyPdfLabel");
    const academyDownloadBtn = document.getElementById("academyDownloadBtn");
    const academyHeaderTags = document.getElementById("academyHeaderTags");
    const academyArticleTitle = document.getElementById("academyArticleTitle");
    const academyArticleSubtitle = document.getElementById("academyArticleSubtitle");
    const academyArticleBody = document.getElementById("academyArticleBody");
    const academyEditorModal = document.getElementById("academyEditorModal");
    const academyEditorForm = document.getElementById("academyEditorForm");
    const academyEditorTitle = document.getElementById("academyEditorTitle");
    const academyTitleInput = document.getElementById("academyTitleInput");
    const academySubtitleInput = document.getElementById("academySubtitleInput");
    const academySummaryInput = document.getElementById("academySummaryInput");
    const academyKeywordsInput = document.getElementById("academyKeywordsInput");
    const academyContentInput = document.getElementById("academyContentInput");
    const academyCoverInput = document.getElementById("academyCoverInput");
    const academyCoverPreview = document.getElementById("academyCoverPreview");
    const academyCoverCropperModal = document.getElementById("academyCoverCropperModal");
    const academyCoverCropperImage = document.getElementById("academyCoverCropperImage");
    const academyCoverCropperCancel = document.getElementById("academyCoverCropperCancel");
    const academyCoverCropperSave = document.getElementById("academyCoverCropperSave");
    const academyCoverZoomRange = document.getElementById("academyCoverZoomRange");
    const academyPdfInput = document.getElementById("academyPdfInput");
    const academyPdfName = document.getElementById("academyPdfName");
    const academyInlineImageInput = document.getElementById("academyInlineImageInput");
    const academyInlineImageUploadBtn = document.getElementById("academyInlineImageUploadBtn");
    const academyInlineImageStatus = document.getElementById("academyInlineImageStatus");
    const academyInlineImageList = document.getElementById("academyInlineImageList");
    const academyTagSelect = document.getElementById("academyTagSelect");
    const academyEditorCancelBtn = document.getElementById("academyEditorCancelBtn");
    const academyEditorCloseBtn = document.getElementById("academyEditorCloseBtn");
    const academyEditorSaveBtn = document.getElementById("academyEditorSaveBtn");
    const academyTagNameInput = document.getElementById("academyTagNameInput");
    const academyTagColorInput = document.getElementById("academyTagColorInput");
    const academyTagCreateBtn = document.getElementById("academyTagCreateBtn");
    const academyTagCreateStatus = document.getElementById("academyTagCreateStatus");

    const SESSION_KEYS = {
      token: "token",
      username: "username",
      isAdmin: ADMIN_SESSION_KEY,
      canTransfer: "canTransfer",
      canViewClips: "canViewClips",
      canViewArchive: "canViewArchive",
      canEditArchive: "canEditArchive",
      canUseDiscord: "canUseDiscord",
      profilePictureFilename: "profilePictureFilename",
    };
    const ARCHIVE_NAV_STATE_KEY = "archiveNavState";
    const ARCHIVE_CATEGORIES = {
      kepek: {
        id: "kepek",
        label: "Képek",
        accept: "image/png,image/jpeg,image/jpg,image/webp,image/gif",
        allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
        type: "image",
      },
      hang: {
        id: "hang",
        label: "Hang",
        accept: "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-m4a,audio/flac",
        allowedExtensions: [".mp3", ".wav", ".ogg", ".m4a", ".flac"],
        type: "audio",
      },
      dokumentumok: {
        id: "dokumentumok",
        label: "Dokumentumok",
        accept: "",
        allowedExtensions: [],
        type: "document",
      },
      videok: {
        id: "videok",
        label: "Videók",
        accept: "video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska",
        allowedExtensions: [".mp4", ".mkv", ".mov", ".webm", ".ogg"],
        type: "video",
      },
    };
    const POLL_MIN_OPTIONS = 2;
    let pollsShouldRefresh = true;
    let programImageCropper = null;
    let programImageObjectUrl = null;
    let editingProgram = null;
    let academyArticles = [];
    let academyTags = [];
    let academyActiveTag = "all";
    let academyLoadedOnce = false;
    let academyTagsLoaded = false;
    let academyCoverObjectUrl = null;
    let academyCoverCropperInstance = null;
    let academyCoverBlob = null;
    let academyCoverOriginalFileName = "";
    let academyInlineImages = [];
    let editingAcademyArticle = null;
    let activeAcademyArticle = null;
    let currentArchiveCategory = null;
    let selectedArchiveFolder = null;
    let openedArchiveFolder = null;
    let currentArchiveSubPath = "";
    let archiveLockedFolders = new Set();
    const archiveUnlockTokens = new Map();
    let archivePasswordModalMode = null;
    let archivePasswordTargetFolder = null;
    let archivePasswordResolve = null;
    let archivePendingRestoreFolder = null;
    let archiveImageScale = 1;
    let archiveImagePanX = 0;
    let archiveImagePanY = 0;
    let archiveImageDragging = false;
    let archiveImageDragStartX = 0;
    let archiveImageDragStartY = 0;
    let currentArchiveImageFiles = [];
    let activeArchiveImageIndex = -1;
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

    function openLoginModal() {
      if (!loginModal) {
        return;
      }
      if (loginForm) {
        loginForm.reset();
      }
      loginModal.style.display = "flex";
      const loginUserInput = document.getElementById("loginUser");
      if (loginUserInput) {
        requestAnimationFrame(() => loginUserInput.focus());
      }
    }

    function closeLoginModal() {
      if (!loginModal) {
        return;
      }
      loginModal.style.display = "none";
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
      removeBtn.textContent = "\u00d7";
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
                metaText += ` \u2022 ${createdAt.toLocaleString("hu-HU")}`;
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
        totalVotesInfo.textContent = `Asszes szavazat: ${totalVotes}`;
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
        console.error("Admin panel betöltési hiba:", error);
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
        button.textContent = "Lezárás...";
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
              : "Nem sikerült rögzíteni a szavazatot.";
          throw new Error(message);
        }

        await loadPolls();
      } catch (error) {
        console.error("Szavazások betöltési hiba:", error);
        alert(error.message || "Nem sikerült rögzíteni a szavazatot.");
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
          alert(error.message || "Nem sikerült feldolgozni a képet.");
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
          console.error("Program letöltési hiba:", error);
          alert(error.message || "Nem sikerült törölni a cikket.");
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
          alert(error.message || "Nem sikerült frissíteni a klip címét.");
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

        if (programNavBtn) {
          programNavBtn.style.display = isAdmin ? "inline-block" : "none";
        }

        updateProgramAdminControls();
        updateAcademyAdminControls();

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
      const activeSection = document.querySelector("main section.active");
      if (activeSection?.id === "archivum" && !currentArchiveCategory) {
        restoreArchiveNavState();
      }
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
      localStorage.removeItem(SESSION_KEYS.canViewArchive);
      localStorage.removeItem(SESSION_KEYS.canEditArchive);
      localStorage.removeItem(SESSION_KEYS.canUseDiscord);
      localStorage.removeItem(SESSION_KEYS.profilePictureFilename);
      localStorage.removeItem(ARCHIVE_NAV_STATE_KEY);

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
      updateAcademyAdminControls();
      updateFileTransferNavVisibility();
      updateDiscord2NavVisibility();
      updateClipAccessUI();
      updateArchiveAccessUI();
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


    if (closeLogin) {
      closeLogin.addEventListener("click", () => {
        closeLoginModal();
      });
    }

    if (loginModal) {
      loginModal.addEventListener("click", (event) => {
        if (event.target === loginModal) {
          closeLoginModal();
        }
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
      if (event.key !== "Escape") {
        return;
      }
      if (feedbackModal.style.display === "flex") {
        hideFeedbackModal();
        return;
      }
      if (loginModal && loginModal.style.display === "flex") {
        closeLoginModal();
      }
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        fetch("/api/admin/page-session", { method: "DELETE" }).catch(() => {});
        updateUIForLoggedOut();
        showFeedbackModal({
          title: "Kijelentkezés",
          message: "Sikeresen kijelentkeztél.",
        });
      });
    }

    let isLoginSubmitting = false;

    function setLoginFormBusy(isBusy) {
      if (!loginForm) {
        return;
      }

      const submitButton = loginForm.querySelector('button[type="submit"]');
      if (submitButton) {
        if (!submitButton.dataset.defaultText) {
          submitButton.dataset.defaultText = submitButton.textContent || "Bel\u00e9p\u00e9s";
        }
        submitButton.disabled = isBusy;
        submitButton.textContent = isBusy
          ? "Bel\u00e9p\u00e9s..."
          : (submitButton.dataset.defaultText || "Bel\u00e9p\u00e9s");
      }

      const loginUserInput = document.getElementById("loginUser");
      const loginPassInput = document.getElementById("loginPass");
      if (loginUserInput) {
        loginUserInput.disabled = isBusy;
      }
      if (loginPassInput) {
        loginPassInput.disabled = isBusy;
      }
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isLoginSubmitting) {
        return;
      }

      isLoginSubmitting = true;
      setLoginFormBusy(true);

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
          const canEditArchive = data.canEditArchive === true || data.canEditArchive === 1;
          const canViewArchive = (data.canViewArchive === true || data.canViewArchive === 1) || canEditArchive;
          const canUseDiscord = (data.canUseDiscord === true || data.canUseDiscord === 1) || data.isAdmin === true || data.isAdmin === 1;
          localStorage.setItem(SESSION_KEYS.token, data.token);
          localStorage.setItem(SESSION_KEYS.username, data.username);
          localStorage.setItem(SESSION_KEYS.isAdmin, data.isAdmin);
          localStorage.setItem(SESSION_KEYS.canTransfer, canTransfer ? "true" : "false");
          localStorage.setItem(SESSION_KEYS.canViewClips, canViewClips ? "true" : "false");
          localStorage.setItem(SESSION_KEYS.canViewArchive, canViewArchive ? "true" : "false");
          localStorage.setItem(SESSION_KEYS.canEditArchive, canEditArchive ? "true" : "false");
          localStorage.setItem(SESSION_KEYS.canUseDiscord, canUseDiscord ? "true" : "false");
          if (data.profile_picture_filename) {
            localStorage.setItem(SESSION_KEYS.profilePictureFilename, data.profile_picture_filename);
          } else {
            localStorage.removeItem(SESSION_KEYS.profilePictureFilename);
          }

          applyQualityPreference(data.preferred_quality || DEFAULT_VIDEO_QUALITY);

          updateUIForLoggedIn(data.username, data.profile_picture_filename);
          closeLoginModal();
          showFeedbackModal({
            title: "Sikeres bejelentkez\u00e9s",
            message: "Sikeres bejelentkez\u00e9s.",
          });
        } else {
          const loginErrorMessage = res.status === 401
            ? "Hib\u00e1s felhaszn\u00e1l\u00f3n\u00e9v vagy jelsz\u00f3."
            : "Nem siker\u00fclt bejelentkezni. Pr\u00f3b\u00e1ld \u00fajra k\u00e9s\u0151bb.";
          showFeedbackModal({
            title: "Sikertelen bejelentkez\u00e9s",
            message: loginErrorMessage,
          });
        }
      } catch (error) {
        console.error("Bejelentkezési hiba:", error);
        showFeedbackModal({
          title: "Sikertelen bejelentkez\u00e9s",
          message: "Hiba t\u00f6rt\u00e9nt a bejelentkez\u00e9s sor\u00e1n. Pr\u00f3b\u00e1ld meg k\u00e9s\u0151bb.",
        });
      } finally {
        isLoginSubmitting = false;
        setLoginFormBusy(false);
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
            const canEditArchive = data.canEditArchive === true || data.canEditArchive === 1;
            const canViewArchive = (data.canViewArchive === true || data.canViewArchive === 1) || canEditArchive;
            const canUseDiscord = (data.canUseDiscord === true || data.canUseDiscord === 1) || data.isAdmin === true || data.isAdmin === 1;
            localStorage.setItem(SESSION_KEYS.canViewArchive, canViewArchive ? "true" : "false");
            localStorage.setItem(SESSION_KEYS.canEditArchive, canEditArchive ? "true" : "false");
            localStorage.setItem(SESSION_KEYS.canUseDiscord, canUseDiscord ? "true" : "false");
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
      const modalLikeBtn = document.getElementById("modalLikeBtn");
      const modalLikeCount = document.getElementById("modalLikeCount");
      const modalViewCount = document.getElementById("modalViewCount");
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
      const CLIP_SORT_OPTIONS = new Set(["newest", "oldest", "views", "likes"]);
      const videoFilters = {
        page: 1,
        limit: [12, 24, 40, 80].includes(savedPageSize) ? savedPageSize : 24,
        search: "",
        tag: [],
        sort: CLIP_SORT_OPTIONS.has(savedSortOrder) ? savedSortOrder : "newest",
      };
      let currentVideoQuality = savedQuality === "original"
        ? "original"
        : ALLOWED_VIDEO_QUALITIES.includes(savedQuality)
          ? savedQuality
          : DEFAULT_VIDEO_QUALITY;
      let videoSearchTimeout = null;
      let currentVideoList = [];
      let currentVideoIndex = 0;
      let activeClipTagReplaceMenu = null;
      let activeVideoModalContext = "clips";
      let modalVideoPlaybackToken = 0;
      let modalVideoErrorHandlerAttached = false;
      const CLIP_VIEW_PROGRESS_THRESHOLD = 0.5;
      let pendingClipViewState = null;
      const MEDIA_SESSION_ARTWORK_PATH = "/uploads/boritok/lockscreen.png";
      const MEDIA_SESSION_ARTWORK_Y_OFFSET_PX = 30;
      const MEDIA_SESSION_ARTWORK_SIZES = [96, 128, 192, 256, 384, 512];
      let mediaSessionHandlersAttached = false;
      let mediaSessionPlayerHandlersAttached = false;
      let mediaSessionArtworkEntriesCache = null;
      let mediaSessionArtworkBuildPromise = null;
      let mediaSessionMetadataToken = 0;
      const ARCHIVE_VIDEO_PAGE_SIZE_KEY = "archiveVideoPageSize";
      const ARCHIVE_VIDEO_SORT_ORDER_KEY = "archiveVideoSortOrder";
      const savedArchivePageSize = Number.parseInt(localStorage.getItem(ARCHIVE_VIDEO_PAGE_SIZE_KEY), 10);
      const savedArchiveSortOrder = localStorage.getItem(ARCHIVE_VIDEO_SORT_ORDER_KEY);
      const archiveVideoFilters = {
        page: 1,
        limit: [12, 24, 40, 80].includes(savedArchivePageSize) ? savedArchivePageSize : 24,
        search: "",
        tag: [],
        sort: savedArchiveSortOrder === "oldest" ? "oldest" : "newest",
      };
      let archiveVideoSearchTimeout = null;
      let archiveVideoList = [];
      let archiveVideoIndex = 0;
      let archiveAvailableTags = [];
      let archiveTagSelectHandlersAttached = false;
      let archiveVideoTagHandlersAttached = false;
      let archiveUploadQueue = [];
      const archiveFileSignatures = new Set();
      let archiveIsUploadCancelled = false;
      let archiveIsUploading = false;
      let archiveCurrentUploadXhr = null;
      let archiveUploadedVideoIds = [];
      let archiveVideoToastTimeout = null;
      const archiveNotifiedProcessingErrorIds = new Set();
      const ARCHIVE_THUMBNAIL_STEP_SECONDS = 5;
      const ARCHIVE_THUMBNAIL_ZOOM_MIN = 1;
      const ARCHIVE_THUMBNAIL_ZOOM_MAX = 3;
      const ARCHIVE_THUMBNAIL_ZOOM_STEP = 0.12;
      const ARCHIVE_THUMBNAIL_PAN_STEP_PX = 24;
      const ARCHIVE_THUMBNAIL_TARGET_WIDTH = 1280;
      const ARCHIVE_THUMBNAIL_TARGET_HEIGHT = 720;
      let archiveThumbnailPickerState = null;
      const ARCHIVE_UPLOAD_CHUNK_THRESHOLD_BYTES = 90 * 1024 * 1024;
      const ARCHIVE_UPLOAD_CHUNK_SIZE_BYTES = 20 * 1024 * 1024;

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

      if (archivePageSizeSelect) {
        archivePageSizeSelect.value = String(archiveVideoFilters.limit);
      }

      if (archiveSortOrderSelect) {
        archiveSortOrderSelect.value = archiveVideoFilters.sort;
      }

      applyQualityPreference(currentVideoQuality);
      if (archiveVideoQualitySelect) {
        archiveVideoQualitySelect.value = currentVideoQuality;
      }
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
          if (adminSurfaceLink) {
            adminSurfaceLink.style.display = "none";
          }
          adminPreviewToggleBtn.setAttribute("aria-pressed", "false");
          adminPreviewToggleBtn.classList.remove("is-active");
          return;
        }

        const previewEnabled = isAdminPreviewEnabled();
        if (adminPreviewBar) {
          adminPreviewBar.style.display = "flex";
        }
        adminPreviewToggleBtn.style.display = "inline-flex";
        if (adminSurfaceLink) {
          adminSurfaceLink.style.display = "inline-flex";
        }
        adminPreviewToggleBtn.setAttribute("aria-pressed", previewEnabled ? "true" : "false");
        adminPreviewToggleBtn.classList.toggle("is-active", previewEnabled);
        adminPreviewToggleBtn.textContent = previewEnabled ? "Nézet: felhasználó" : "Nézet: Admin";
      }

      async function openProtectedAdminSurface(event) {
        if (event) {
          event.preventDefault();
        }
        if (!isActualAdmin()) {
          showFeedbackModal({
            title: "Admin felület",
            message: "Az admin felület megnyitásához admin jogosultság szükséges.",
          });
          return;
        }

        const token = getStoredToken();
        if (!token) {
          showFeedbackModal({
            title: "Admin felület",
            message: "Jelentkezz be újra az admin felület megnyitásához.",
          });
          return;
        }

        try {
          const response = await fetch("/api/admin/page-session", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.message || "Nem sikerült megnyitni az admin felületet.");
          }
          window.location.href = data?.url || "/admin-felulet.html";
        } catch (error) {
          showFeedbackModal({
            title: "Admin felület",
            message: error.message || "Nem sikerült megnyitni az admin felületet.",
          });
        }
      }

      function isAdminUser() {
        return isActualAdmin() && !isAdminPreviewEnabled();
      }

      function applyAdminPreviewState() {
        updateAdminNavVisibility();
        updateFileTransferNavVisibility();
        updateDiscord2NavVisibility();
        updateClipAccessUI();
        updateArchiveAccessUI();
        updatePollCreatorState();
        updateAcademyAdminControls();

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

        if (activeId === "archivum") {
          updateArchiveAccessUI();
        }

        if (activeId === "akademia") {
          loadAcademyData(true);
        }
      }

      if (adminPreviewToggleBtn) {
        adminPreviewToggleBtn.addEventListener("click", () => {
          const nextState = !isAdminPreviewEnabled();
          setAdminPreviewEnabled(nextState);
          applyAdminPreviewState();
        });
      }

      if (adminSurfaceLink) {
        adminSurfaceLink.addEventListener("click", openProtectedAdminSurface);
      }

      function hasFileTransferPermission() {
        return isUserLoggedIn() && localStorage.getItem(SESSION_KEYS.canTransfer) === "true";
      }

      function hasClipAccess() {
        return isUserLoggedIn() && localStorage.getItem(SESSION_KEYS.canViewClips) === "true";
      }

      function hasArchiveViewAccess() {
        return isUserLoggedIn() && localStorage.getItem(SESSION_KEYS.canViewArchive) === "true";
      }

      function hasArchiveEditAccess() {
        return isUserLoggedIn() && localStorage.getItem(SESSION_KEYS.canEditArchive) === "true";
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
          removeBtn.textContent = "\u00d7";

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

      function getClipVideoFromActionButton(button) {
        if (!button) return null;
        const videoId = Number.parseInt(button.dataset.videoId || "", 10);
        if (!Number.isFinite(videoId) || !Array.isArray(currentVideoList)) {
          return null;
        }
        return currentVideoList.find((video) => Number(video?.id) === videoId) || null;
      }

      function handleClipThumbnailButtonClick(event) {
        const refreshBtn = event.target.closest(".video-card__thumb-refresh");
        if (refreshBtn && videoGridContainer?.contains(refreshBtn)) {
          event.preventDefault();
          event.stopPropagation();
          if (refreshBtn.disabled || !isAdminUser()) {
            return;
          }
          const clipVideo = getClipVideoFromActionButton(refreshBtn);
          if (!clipVideo) {
            showClipToast("A klip adatai nem elerhetok, frissitsd az oldalt.");
            return;
          }
          const card = refreshBtn.closest(".video-card");
          const previewVideo = card?.querySelector("video") || null;
          openClipThumbnailPicker(clipVideo, previewVideo, refreshBtn);
          return;
        }
      }

      function getClosestElement(target, selector) {
        if (target instanceof Element) {
          return target.closest(selector);
        }
        if (target?.parentElement instanceof Element) {
          return target.parentElement.closest(selector);
        }
        return null;
      }

      function handleClipTagClick(event) {
        const chip = getClosestElement(event.target, ".tag-chip");
        if (!chip || !videoGridContainer?.contains(chip)) return;
        event.stopPropagation();
        const tagId = getTagIdFromChip(chip);
        if (!tagId) return;
        selectClipTag(tagId);
      }

      function handleClipTagKeydown(event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        const chip = getClosestElement(event.target, ".tag-chip");
        if (!chip || !videoGridContainer?.contains(chip)) return;
        event.preventDefault();
        const tagId = getTagIdFromChip(chip);
        if (!tagId) return;
        selectClipTag(tagId);
      }

      function handleClipTagContextmenu(event) {
        const chip = getClosestElement(event.target, ".tag-chip");
        if (!chip || !videoGridContainer?.contains(chip)) return;

        if (!isAdminUser()) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const card = chip.closest(".video-card");
        const videoId = Number.parseInt(card?.dataset?.videoId || "", 10);
        const video = currentVideoList.find((item) => Number(item.id) === videoId);

        if (chip.dataset.addSecondTag === "true") {
          if (!video) {
            showClipToast("A klip nem elérhető.");
            return;
          }

          openClipTagReplaceMenu(event, video, null, "add");
          return;
        }

        const tagId = Number.parseInt(getTagIdFromChip(chip), 10);
        if (!Number.isFinite(videoId) || !Number.isFinite(tagId)) {
          showClipToast("A klip vagy a címke nem elérhető.");
          return;
        }

        const tag =
          video?.tags?.find((item) => Number(item.id) === tagId) ||
          availableTags.find((item) => Number(item.id) === tagId) ||
          { id: tagId, name: chip.textContent?.trim() || "címke" };

        openClipTagReplaceMenu(event, video, tag);
      }

      function handleClipTagRightMouseDown(event) {
        if (event.button !== 2) return;
        handleClipTagContextmenu(event);
      }

      function attachClipTagHandlers() {
        if (!videoGridContainer || clipTagHandlersAttached) return;
        videoGridContainer.addEventListener("click", handleClipThumbnailButtonClick, true);
        videoGridContainer.addEventListener("mousedown", handleClipTagRightMouseDown, true);
        videoGridContainer.addEventListener("contextmenu", handleClipTagContextmenu, true);
        videoGridContainer.addEventListener("click", handleClipTagClick);
        videoGridContainer.addEventListener("keydown", handleClipTagKeydown);
        clipTagHandlersAttached = true;
      }

      function compareTagsByUsage(first, second) {
        const firstUsage = Number(first?.usage_count) || 0;
        const secondUsage = Number(second?.usage_count) || 0;
        if (firstUsage !== secondUsage) {
          return secondUsage - firstUsage;
        }
        return String(first?.name || "").localeCompare(String(second?.name || ""), "hu");
      }

      function getUploadMenuTagsOrderedByUsage() {
        return [...availableTags].sort(compareTagsByUsage);
      }

      function renderGlobalTagSelect() {
        if (!globalTagSelect) return;
        const currentSelection = getSelectValues(globalTagSelect);
        globalTagSelect.innerHTML = "";
        getUploadMenuTagsOrderedByUsage().forEach((tag) => {
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

        getUploadMenuTagsOrderedByUsage().forEach((tag) => {
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
          )} \u2022 H\u00E1tra: ${formatBytes(remainingBytes)}`;
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
            thumbnail.textContent = "IMG";
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

      function getVideoCacheBuster(video) {
        const base = "20260615_v2";
        const status = video?.processing_status ? `&status=${video.processing_status}` : "";
        let uploaded = "";
        if (video?.uploaded_at) {
          const t = new Date(video.uploaded_at).getTime();
          if (Number.isFinite(t)) {
            uploaded = `&up=${t}`;
          }
        }
        return `cb=${base}${status}${uploaded}`;
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
        if (archiveVideoQualitySelect) {
          archiveVideoQualitySelect.value = normalizedQuality;
        }

        return normalizedQuality;
      }

      function buildVideoPath(originalFilename, targetResolution, video) {
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

        return `/uploads/klippek/${targetResolution}/${folderName}/${nameWithoutExt}_${targetResolution}${extension}?${getVideoCacheBuster(video)}`;
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
        const originalSource = video?.filename ? `/uploads/${video.filename}?${getVideoCacheBuster(video)}` : "";
        const availability = getQualityAvailability(video);
        const fallbackChain =
          normalizedQuality === "1440p"
            ? ["1440p", "1080p", "720p"]
            : normalizedQuality === "1080p"
              ? ["1080p", "720p"]
              : normalizedQuality === "720p"
                ? ["720p"]
                : [];

        if (normalizedQuality === "original") {
          return {
            src: originalSource,
            originalSource,
            resolvedQuality: "original",
            requestedQuality: normalizedQuality,
            availability,
          };
        }

        for (const fallbackQuality of fallbackChain) {
          if (!availability[fallbackQuality]) {
            continue;
          }

          return {
            src: buildVideoPath(video?.filename, fallbackQuality, video),
            originalSource,
            resolvedQuality: fallbackQuality,
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

      function scrollClipVideoListToTop() {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && videoPagination?.contains(activeElement)) {
          activeElement.blur();
        }

        const scrollTargets = [];
        const appendTarget = (node) => {
          if (!node || scrollTargets.includes(node)) {
            return;
          }
          scrollTargets.push(node);
        };

        appendTarget(document.scrollingElement);
        appendTarget(document.documentElement);
        appendTarget(document.body);
        appendTarget(document.querySelector("main"));
        appendTarget(document.querySelector("main section.active"));
        appendTarget(document.getElementById("klipek"));
        appendTarget(clipSection);
        appendTarget(clipSection?.querySelector?.(".clips-content"));
        appendTarget(videoGridContainer);

        let ancestor = videoPagination || videoGridContainer || clipSection;
        while (ancestor && ancestor instanceof HTMLElement) {
          const styles = window.getComputedStyle(ancestor);
          const overflowY = (styles.overflowY || "").toLowerCase();
          const isScrollable = (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
            && ancestor.scrollHeight > ancestor.clientHeight;
          if (isScrollable) {
            appendTarget(ancestor);
          }
          ancestor = ancestor.parentElement;
        }

        const applyScrollToTop = () => {
          scrollTargets.forEach((target) => {
            if (!target) return;
            if (typeof target.scrollTo === "function") {
              try {
                target.scrollTo({ top: 0, left: 0, behavior: "auto" });
              } catch (_error) {}
            }
            if (typeof target.scrollTop === "number") {
              target.scrollTop = 0;
            }
          });
          window.scrollTo(0, 0);
        };

        applyScrollToTop();
        requestAnimationFrame(applyScrollToTop);
        setTimeout(applyScrollToTop, 90);
      }

      async function loadVideos(options = {}) {
        if (!videoGridContainer) {
          return;
        }

        if (!hasClipAccess()) {
          updateClipAccessUI();
          return;
        }

        videoGridContainer.innerHTML = "";
        if (videoPagination) videoPagination.innerHTML = "";
        const shouldScrollToTop = options?.scrollToTop === true;

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
            throw new Error("Be kell jelentkezned a klipek megtekintéséhez.");
          }

          if (!response.ok) {
            throw new Error("Nem sikerült lekérni a tag-eket.");
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
          if (shouldScrollToTop) {
            scrollClipVideoListToTop();
          }
        } catch (error) {
          console.error("Klip lista betöltési hiba:", error);
          currentVideoList = [];
          videoGridContainer.innerHTML = "<p>Nem sikerült betölteni a videókat.</p>";
        }
      }

      function cleanVideoTitle(rawTitle) {
        if (!rawTitle) return "";

        const trimmed = rawTitle.trim();
        const looksLikeMojibake = /[\u00C3\u00C2]/.test(trimmed);
        if (looksLikeMojibake) {
          const decoded = new TextDecoder("utf-8").decode(
            Uint8Array.from(trimmed.split("").map((char) => char.charCodeAt(0)))
          );
          if (decoded && !decoded.includes("\uFFFD")) {
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

      const clipMetricNumberFormatter = new Intl.NumberFormat("hu-HU");

      function formatClipMetric(value) {
        const number = Number(value);
        return clipMetricNumberFormatter.format(Number.isFinite(number) ? Math.max(0, number) : 0);
      }

      function updateClipStatsDisplay(video) {
        if (!video || !videoGridContainer) {
          return;
        }

        const card = Array.from(videoGridContainer.querySelectorAll(".video-card"))
          .find((candidate) => candidate.dataset.videoId === String(video.id));
        if (!card) {
          return;
        }

        const viewCountEl = card.querySelector("[data-clip-view-count]");
        if (viewCountEl) {
          viewCountEl.textContent = formatClipMetric(video.view_count);
        }

        const likeButton = card.querySelector(".video-card__like-btn");
        const likeCountEl = card.querySelector("[data-clip-like-count]");
        if (likeButton) {
          const liked = video.liked_by_me === true;
          likeButton.classList.toggle("is-liked", liked);
          likeButton.setAttribute("aria-pressed", liked ? "true" : "false");
          likeButton.title = liked ? "Like visszavonása" : "Klip kedvelése";
          likeButton.setAttribute("aria-label", likeButton.title);
        }
        if (likeCountEl) {
          likeCountEl.textContent = formatClipMetric(video.like_count);
        }

        updateModalClipStats(video);
      }

      function updateModalClipStats(video) {
        if (!video || activeVideoModalContext !== "clips") {
          return;
        }

        const activeVideo = currentVideoList[currentVideoIndex];
        if (!activeVideo || Number(activeVideo.id) !== Number(video.id)) {
          return;
        }

        const liked = video.liked_by_me === true;
        if (modalLikeBtn) {
          modalLikeBtn.classList.toggle("is-liked", liked);
          modalLikeBtn.setAttribute("aria-pressed", liked ? "true" : "false");
          modalLikeBtn.title = liked ? "Like visszavonása" : "Klip kedvelése";
          modalLikeBtn.setAttribute("aria-label", modalLikeBtn.title);
          modalLikeBtn.disabled = false;
        }
        if (modalLikeCount) {
          modalLikeCount.textContent = formatClipMetric(video.like_count);
        }
        if (modalViewCount) {
          modalViewCount.textContent = formatClipMetric(video.view_count);
        }
      }

      async function recordClipView(video) {
        if (!video || !Number.isFinite(Number(video.id))) {
          return;
        }

        try {
          const response = await fetch(`/api/videos/${video.id}/view`, {
            method: "POST",
            headers: buildAuthHeaders(),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.message || "Nem sikerült rögzíteni a megtekintést.");
          }

          video.view_count = Number(data?.view_count) || 0;
          currentVideoList = currentVideoList.map((item) =>
            Number(item.id) === Number(video.id) ? { ...item, view_count: video.view_count } : item
          );
          updateClipStatsDisplay(video);
        } catch (error) {
          console.error("Klip megtekintés rögzítési hiba:", error);
        }
      }

      function resetClipViewProgressTracking() {
        pendingClipViewState = null;
      }

      function startClipViewProgressTracking(video) {
        pendingClipViewState = video && Number.isFinite(Number(video.id))
          ? { video, watchedSeconds: 0, lastTime: null }
          : null;
      }

      function handleClipViewProgress() {
        if (activeVideoModalContext !== "clips" || !pendingClipViewState || !modalVideoPlayer) {
          return;
        }

        const duration = Number(modalVideoPlayer.duration);
        const currentTime = Number(modalVideoPlayer.currentTime);
        if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) {
          return;
        }

        if (modalVideoPlayer.seeking) {
          pendingClipViewState.lastTime = currentTime;
          return;
        }

        if (Number.isFinite(pendingClipViewState.lastTime)) {
          const delta = currentTime - pendingClipViewState.lastTime;
          if (delta > 0 && delta <= 5) {
            pendingClipViewState.watchedSeconds += delta;
          }
        }

        pendingClipViewState.lastTime = currentTime;

        if (pendingClipViewState.watchedSeconds < duration * CLIP_VIEW_PROGRESS_THRESHOLD) {
          return;
        }

        const viewedVideo = pendingClipViewState.video;
        resetClipViewProgressTracking();
        recordClipView(viewedVideo);
      }

      async function toggleClipLike(video, button) {
        if (!video || !Number.isFinite(Number(video.id))) {
          return;
        }

        if (button) {
          button.disabled = true;
        }

        try {
          const response = await fetch(`/api/videos/${video.id}/like`, {
            method: "POST",
            headers: buildAuthHeaders(),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.message || "Nem sikerült frissíteni a like-ot.");
          }

          video.liked_by_me = data?.liked === true;
          video.like_count = Number(data?.like_count) || 0;
          currentVideoList = currentVideoList.map((item) =>
            Number(item.id) === Number(video.id)
              ? { ...item, liked_by_me: video.liked_by_me, like_count: video.like_count }
              : item
          );
          updateClipStatsDisplay(video);
        } catch (error) {
          console.error("Klip like hiba:", error);
          showClipToast(error.message || "Nem sikerült frissíteni a like-ot.");
        } finally {
          if (button) {
            button.disabled = false;
          }
        }
      }

      function closeClipTagReplaceMenu() {
        if (!activeClipTagReplaceMenu) {
          return;
        }

        activeClipTagReplaceMenu.cleanup();
        activeClipTagReplaceMenu.element.remove();
        activeClipTagReplaceMenu = null;
      }

      function applyUpdatedClipTags(video, tags) {
        video.tags = Array.isArray(tags)
          ? tags.map((tag) => ({ ...tag, color: normalizeColor(tag.color) }))
          : video.tags;
        currentVideoList = currentVideoList.map((item) =>
          Number(item.id) === Number(video.id) ? { ...item, tags: video.tags } : item
        );
        renderVideoGrid(currentVideoList);
      }

      async function addClipTag(video, newTagId) {
        if (!video || !Number.isFinite(Number(video.id))) {
          showClipToast("A klip vagy a címke nem elérhető.");
          return;
        }

        const normalizedNewTagId = Number.parseInt(newTagId, 10);
        if (!Number.isFinite(normalizedNewTagId)) {
          return;
        }

        try {
          const response = await fetch(`/api/videos/${video.id}/tags`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...buildAuthHeaders(),
            },
            body: JSON.stringify({ tagId: normalizedNewTagId }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.message || "Nem sikerült hozzáadni a címkét.");
          }

          applyUpdatedClipTags(video, data?.tags);
          showClipToast(data?.message || "A klip címkéje hozzáadva.");
          await fetchTags();
        } catch (error) {
          console.error("Klip címke hozzáadási hiba:", error);
          showClipToast(error.message || "Nem sikerült hozzáadni a címkét.");
        }
      }

      async function replaceClipTag(video, oldTag, newTagId) {
        if (!video || !Number.isFinite(Number(video.id)) || !Number.isFinite(Number(oldTag?.id))) {
          showClipToast("A klip vagy a címke nem elérhető.");
          return;
        }

        const normalizedNewTagId = Number.parseInt(newTagId, 10);
        if (!Number.isFinite(normalizedNewTagId) || normalizedNewTagId === Number(oldTag.id)) {
          return;
        }

        try {
          const response = await fetch(`/api/videos/${video.id}/tags/${oldTag.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...buildAuthHeaders(),
            },
            body: JSON.stringify({ newTagId: normalizedNewTagId }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.message || "Nem sikerült frissíteni a címkét.");
          }

          applyUpdatedClipTags(video, data?.tags);
          showClipToast(data?.message || "A klip címkéje frissült.");
          await fetchTags();
        } catch (error) {
          console.error("Klip címke módosítási hiba:", error);
          showClipToast(error.message || "Nem sikerült frissíteni a címkét.");
        }
      }

      function openClipTagReplaceMenu(event, video, tag, mode = "replace") {
        event.preventDefault();
        event.stopPropagation();

        const isAddMode = mode === "add";
        if (!video || !Number.isFinite(Number(video.id))) {
          showClipToast("A klip nem elérhető.");
          return;
        }

        if (!isAddMode && (!tag || !Number.isFinite(Number(tag.id)))) {
          return;
        }

        if (!isAdminUser()) {
          showClipToast("A címke cseréjéhez admin jogosultság kell.");
          return;
        }

        closeClipTagReplaceMenu();

        const menu = document.createElement("div");
        menu.className = "clip-tag-replace-menu";
        menu.addEventListener("pointerdown", (pointerEvent) => {
          pointerEvent.stopPropagation();
        });
        menu.addEventListener("click", (clickEvent) => {
          clickEvent.stopPropagation();
        });
        menu.addEventListener("contextmenu", (contextMenuEvent) => {
          contextMenuEvent.preventDefault();
          contextMenuEvent.stopPropagation();
        });
        Object.assign(menu.style, {
          position: "fixed",
          zIndex: "99999",
          display: "grid",
          gap: "6px",
          minWidth: "240px",
          maxWidth: "320px",
          maxHeight: "360px",
          overflowY: "auto",
          padding: "10px",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "10px",
          background: "rgba(18, 24, 38, 0.98)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.34)",
        });

        const label = document.createElement("label");
        label.className = "clip-tag-replace-menu__label";
        label.textContent = isAddMode ? "Második címke hozzáadása:" : `"${tag.name}" csere erre:`;
        Object.assign(label.style, {
          color: "rgba(255,255,255,0.78)",
          fontSize: "12px",
          fontWeight: "700",
        });

        const replacementTags = [...availableTags]
          .filter((candidate) => {
            if (!isAddMode) {
              return Number(candidate.id) !== Number(tag.id);
            }
            return !(video.tags || []).some((existingTag) => Number(existingTag.id) === Number(candidate.id));
          })
          .sort(compareTagsByUsage);

        menu.appendChild(label);

        replacementTags.forEach((candidate) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = candidate.name;
          button.style.setProperty("--tag-color", normalizeColor(candidate.color));
          Object.assign(button.style, {
            width: "100%",
            border: "1px solid rgba(255,255,255,0.12)",
            borderLeft: `5px solid ${normalizeColor(candidate.color)}`,
            borderRadius: "8px",
            background: "rgba(255,255,255,0.07)",
            color: "#fff",
            cursor: "pointer",
            font: "inherit",
            fontSize: "14px",
            padding: "8px 10px",
            textAlign: "left",
          });
          const chooseTag = async (chooseEvent) => {
            chooseEvent.preventDefault();
            chooseEvent.stopPropagation();
            closeClipTagReplaceMenu();
            if (isAddMode) {
              await addClipTag(video, candidate.id);
            } else {
              await replaceClipTag(video, tag, candidate.id);
            }
          };
          button.addEventListener("pointerdown", chooseTag);
          button.addEventListener("click", chooseTag);
          menu.appendChild(button);
        });

        document.body.appendChild(menu);

        const left = Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 12);
        const top = Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 12);
        menu.style.left = `${Math.max(12, left)}px`;
        menu.style.top = `${Math.max(12, top)}px`;

        const handlePointerDown = (pointerEvent) => {
          if (!menu.contains(pointerEvent.target)) {
            closeClipTagReplaceMenu();
          }
        };
        const handleDocumentContextMenu = (contextMenuEvent) => {
          if (menu.contains(contextMenuEvent.target) || activeClipTagReplaceMenu?.element === menu) {
            contextMenuEvent.preventDefault();
            contextMenuEvent.stopPropagation();
          }
        };
        const handleKeyDown = (keyEvent) => {
          if (keyEvent.key === "Escape") {
            closeClipTagReplaceMenu();
          }
        };
        const cleanup = () => {
          document.removeEventListener("pointerdown", handlePointerDown);
          document.removeEventListener("contextmenu", handleDocumentContextMenu, true);
          document.removeEventListener("keydown", handleKeyDown);
          window.removeEventListener("resize", closeClipTagReplaceMenu);
          window.removeEventListener("scroll", closeClipTagReplaceMenu, true);
        };

        setTimeout(() => document.addEventListener("pointerdown", handlePointerDown), 0);
        document.addEventListener("contextmenu", handleDocumentContextMenu, true);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", closeClipTagReplaceMenu);
        window.addEventListener("scroll", closeClipTagReplaceMenu, true);
        activeClipTagReplaceMenu = { element: menu, cleanup };
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
              updateMediaSessionMetadata();
            }
          }

          showClipToast(data?.message || "A klip címe frissült.");
        } catch (error) {
          console.error("Klip cím módosítási hiba:", error);
          alert(error.message || "Nem sikerült feldolgozni a képet.");
        }
      }

      function renderVideoGrid(videos) {
        videoGridContainer.innerHTML = "";
        videos.forEach((video, index) => {
          const card = document.createElement("div");
          card.className = "video-card";
          card.dataset.videoId = String(video.id);

          const header = document.createElement("div");
          header.className = "video-card__header";

          const title = document.createElement("p");
          title.className = "video-card__title";
          const rawTitle = video.original_name || video.filename;
          title.textContent = cleanVideoTitle(rawTitle) || "Névtelen videó";
          header.appendChild(title);

          if (isAdminUser()) {
            const refreshThumbnailBtn = document.createElement("button");
            refreshThumbnailBtn.type = "button";
            refreshThumbnailBtn.className = "video-card__thumb-refresh";
            refreshThumbnailBtn.dataset.videoId = String(video.id);
            refreshThumbnailBtn.textContent = "Uj indexkep";
            refreshThumbnailBtn.title = "Indexkep ujrageneralasa";
            refreshThumbnailBtn.setAttribute("aria-label", "Indexkep ujrageneralasa");
            refreshThumbnailBtn.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              const previewVideo = card.querySelector("video");
              openClipThumbnailPicker(video, previewVideo, refreshThumbnailBtn);
            });
            header.appendChild(refreshThumbnailBtn);

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
          const { src: previewSrc, originalSource } = getPreferredVideoSource(video, currentVideoQuality);
          videoElement.poster = video.thumbnail_filename
            ? `/uploads/${video.thumbnail_filename}?${getVideoCacheBuster(video)}`
            : "";
          videoElement.dataset.src = originalSource || `/uploads/${video.filename}`;
          videoElement.src = previewSrc || originalSource || `/uploads/${video.filename}`;
          videoElement.controls = false;
          videoElement.removeAttribute("controls");
          videoElement.preload = "metadata";
          videoElement.playsInline = true;
          videoElement.setAttribute("playsinline", "");
          videoElement.setAttribute("webkit-playsinline", "");
          videoElement.muted = true;

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

          const footer = document.createElement("div");
          footer.className = "video-card__footer";

          const meta = document.createElement("div");
          meta.className = "video-card__meta";
          const uploader = document.createElement("span");
          uploader.textContent = `Feltöltötte: ${video.username || "Ismeretlen"}`;
          meta.appendChild(uploader);

          const details = document.createElement("div");
          details.className = "video-card__details";
          const uploadedAt = document.createElement("span");
          uploadedAt.className = "video-card__date";
          const displayedDate = video.content_created_at || video.uploaded_at;
          uploadedAt.textContent = formatDate(displayedDate);

          const stats = document.createElement("div");
          stats.className = "video-card__stats";

          const views = document.createElement("span");
          views.className = "video-card__stat video-card__stat--views";
          views.title = "Megtekintések";
          views.innerHTML = `
            <svg class="video-card__stat-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M12 5c5.5 0 9.6 5 10 6.6.1.3.1.5 0 .8C21.6 14 17.5 19 12 19S2.4 14 2 12.4a1.3 1.3 0 0 1 0-.8C2.4 10 6.5 5 12 5Zm0 2c-4 0-7.2 3.2-8 5 .8 1.8 4 5 8 5s7.2-3.2 8-5c-.8-1.8-4-5-8-5Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"/>
            </svg>
            <span data-clip-view-count>${formatClipMetric(video.view_count)}</span>
          `;

          const likeButton = document.createElement("button");
          likeButton.type = "button";
          likeButton.className = "video-card__stat video-card__like-btn";
          likeButton.classList.toggle("is-liked", video.liked_by_me === true);
          likeButton.dataset.videoId = String(video.id);
          likeButton.title = video.liked_by_me === true ? "Like visszavonása" : "Klip kedvelése";
          likeButton.setAttribute("aria-label", likeButton.title);
          likeButton.setAttribute("aria-pressed", video.liked_by_me === true ? "true" : "false");
          likeButton.innerHTML = `
            <svg class="video-card__stat-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M12 21.2 10.7 20C5.9 15.7 3 13.1 3 9.8 3 7.1 5.1 5 7.8 5c1.5 0 3 .7 4 1.9A5.3 5.3 0 0 1 15.8 5C18.5 5 21 7.1 21 9.8c0 3.3-2.9 5.9-7.7 10.2L12 21.2Z"/>
            </svg>
            <span data-clip-like-count>${formatClipMetric(video.like_count)}</span>
          `;
          likeButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleClipLike(video, likeButton);
          });

          stats.append(views, likeButton);

          const qualityInfo = document.createElement("div");
          qualityInfo.className = "video-card__qualities";
          qualityInfo.textContent = `Elérhető minőségek: ${listAvailableQualities(video).join(", ")}`;
          details.append(uploadedAt, qualityInfo);
          footer.append(meta, details);

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
              chip.addEventListener("contextmenu", (event) => {
                openClipTagReplaceMenu(event, video, tag);
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

          if (isAdminUser() && Array.isArray(video.tags) && video.tags.length === 1) {
            const addChip = document.createElement("button");
            addChip.type = "button";
            addChip.className = "tag-chip tag-chip--add";
            addChip.dataset.addSecondTag = "true";
            addChip.textContent = "+";
            addChip.title = "Második címke hozzáadása";
            addChip.setAttribute("aria-label", "Második címke hozzáadása");
            addChip.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              openClipTagReplaceMenu(event, video, null, "add");
            });
            addChip.addEventListener("contextmenu", (event) => {
              openClipTagReplaceMenu(event, video, null, "add");
            });
            tagList.appendChild(addChip);
          }

          
          card.appendChild(videoElement);
          meta.appendChild(stats);
          card.appendChild(footer);
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

        activeVideoModalContext = "clips";
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

        setModalVideoSource(resolvedSource, originalSrc);
        startClipViewProgressTracking(activeVideo);
        updateModalClipStats(activeVideo);

        videoPlayerModal.classList.add("open");
        videoPlayerModal.setAttribute("aria-hidden", "false");
        closeVideoModalBtn?.focus({ preventScroll: true });
      }

      function closeVideoModal() {
        if (!videoPlayerModal || !modalVideoPlayer) {
          return;
        }

        clearModalVideoSource();
        resetClipViewProgressTracking();
        videoPlayerModal.classList.remove("open");
        videoPlayerModal.setAttribute("aria-hidden", "true");
        activeVideoModalContext = "clips";
        clearMediaSessionMetadata();
      }

      function showNextVideo() {
        if (activeVideoModalContext === "archive") {
          showNextArchiveVideo();
        } else {
          if (!currentVideoList.length) {
            return;
          }
          const nextIndex = (currentVideoIndex + 1) % currentVideoList.length;
          openVideoModal(nextIndex);
        }
      }

      function showPrevVideo() {
        if (activeVideoModalContext === "archive") {
          showPrevArchiveVideo();
        } else {
          if (!currentVideoList.length) {
            return;
          }
          const prevIndex = (currentVideoIndex - 1 + currentVideoList.length) % currentVideoList.length;
          openVideoModal(prevIndex);
        }
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
            scrollClipVideoListToTop();
            loadVideos({ scrollToTop: true });
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

      if (modalVideoPlayer) {
        modalVideoPlayer.addEventListener("timeupdate", handleClipViewProgress);
      }

      if (modalLikeBtn) {
        modalLikeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (activeVideoModalContext !== "clips" || !currentVideoList.length) {
            return;
          }
          const activeVideo = currentVideoList[currentVideoIndex];
          if (activeVideo) {
            toggleClipLike(activeVideo, modalLikeBtn);
          }
        });
      }

      if (copyVideoLinkBtn) {
        copyVideoLinkBtn.addEventListener("click", () => {
          const videoLink = modalVideoPlayer.src;
          if (!videoLink) return;
          navigator.clipboard.writeText(videoLink).then(() => {
            const toast = activeVideoModalContext === "archive" ? showArchiveVideoToast : showClipToast;
            toast("Link másolva a vágólapra!");
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
          videoFilters.sort = CLIP_SORT_OPTIONS.has(sortOrderSelect.value) ? sortOrderSelect.value : "newest";
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
          if (archiveVideoQualitySelect) {
            archiveVideoQualitySelect.value = currentVideoQuality;
          }

          if (!isUserLoggedIn()) {
            return;
          }

          try {
            await saveQualityPreferenceToServer(selectedQuality);
          } catch (error) {
            console.error("Minőségi beállítás mentése sikertelen:", error);
            showClipToast(error.message || "Nem sikerült menteni a minőségi beállítást.");
            applyQualityPreference(previousQuality);
            if (archiveVideoQualitySelect) {
              archiveVideoQualitySelect.value = currentVideoQuality;
            }
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
            throw new Error((result && result.message) || "Nem sikerült létrehozni a címkét.");
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
                  lastModified: item.file.lastModified,
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
                  uploadStatus.textContent = `Felt\u00f6lt\u00e9s: ${index + 1} / ${totalFiles} - "${
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

              xhr.upload.addEventListener("load", () => {
                const finishedBytes = Math.min(
                  uploadedBytesSoFar + (item.file?.size || 0),
                  totalUploadBytes,
                );

                if (uploadStatus) {
                  uploadStatus.textContent = `Feltöltve a szerverre: ${index + 1} / ${totalFiles} - "${
                    item.displayName || item.file.name
                  }", feldolgozás folyamatban...`;
                }

                updateUploadProgressUI({
                  uploadedBytes: finishedBytes,
                  totalBytes: totalUploadBytes,
                  completedFiles: index,
                  totalFiles,
                  etaSeconds: Infinity,
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
          const requiresDiscord2 = link.dataset.requiresDiscord2 === "true";
          const isActive = link.dataset.section === target;

          if (
            (requiresAdmin && !isAdminUser()) ||
            (requiresTransfer && !hasFileTransferPermission()) ||
            (requiresDiscord2 && !hasDiscord2Access())
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

        if (target === "archivum") {
          resetArchiveBrowser({ preserveNavState: !shouldPushState });
          updateArchiveAccessUI();
          if (!shouldPushState) {
            restoreArchiveNavState();
          }
        }

        if (target === "programok") {
          loadPrograms();
        }

        if (target === "discord2") {
          ensureDiscord2Initialized();
          renderDiscord2();
          scrollDiscord2MessagesToBottom();
        }

        if (target === "akademia") {
          closeAcademyReader();
          loadAcademyData();
        }

        if (shouldPushState) {
          history.pushState(null, "", `#${target}`);
        }
      }

      document.querySelectorAll("nav a").forEach((link) => {
        link.addEventListener("click", (e) => {
          const requiresAdmin = link.dataset.requiresAdmin === "true";
          const requiresTransfer = link.dataset.requiresTransfer === "true";
          const requiresDiscord2 = link.dataset.requiresDiscord2 === "true";

          if (requiresAdmin && !isAdminUser()) {
            e.preventDefault();
            return;
          }

          if (requiresTransfer && !hasFileTransferPermission()) {
            e.preventDefault();
            return;
          }

          if (requiresDiscord2 && !hasDiscord2Access()) {
            e.preventDefault();
            return;
          }

          e.preventDefault();
          showSection(link.dataset.section);
        });
      });

      // On page load, open the correct section from the URL hash.
      window.addEventListener("load", () => {
        const hash = location.hash.replace("#", "") || "home";
        showSection(hash, false);
      });

    
        function openArticle(articleId) {
            const article = academyArticles.find((item) => String(item.id) === String(articleId));
            if (article) {
                openAcademyReader(article);
            }
        }

        function closeArticle() {
            closeAcademyReader();
        }

        function filterCards() {
            // Legacy no-op (dynamic filters handled by renderAcademyFilters)
        }
  
