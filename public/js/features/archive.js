      function readArchiveNavState() {
        try {
          const raw = localStorage.getItem(ARCHIVE_NAV_STATE_KEY);
          if (!raw) {
            return null;
          }

          const parsed = JSON.parse(raw);
          const category = typeof parsed?.category === "string" ? parsed.category : "";
          const folder = typeof parsed?.folder === "string" ? parsed.folder.trim() : "";

          if (!ARCHIVE_CATEGORIES[category]) {
            return null;
          }

          return {
            category,
            folder: folder || null,
          };
        } catch (_error) {
          return null;
        }
      }

      function persistArchiveNavState() {
        try {
          if (!currentArchiveCategory || !ARCHIVE_CATEGORIES[currentArchiveCategory]) {
            localStorage.removeItem(ARCHIVE_NAV_STATE_KEY);
            return;
          }

          localStorage.setItem(
            ARCHIVE_NAV_STATE_KEY,
            JSON.stringify({
              category: currentArchiveCategory,
              folder: openedArchiveFolder || null,
            }),
          );
        } catch (_error) {
          // Local storage can fail in privacy-restricted environments.
        }
      }

      function restoreArchiveNavState() {
        if (!hasArchiveViewAccess()) {
          return;
        }

        const state = readArchiveNavState();
        if (!state) {
          return;
        }

        openArchiveCategory(state.category, { restoreFolder: state.folder || null });
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

      function updateArchiveAccessUI() {
        const allowed = hasArchiveViewAccess();

        if (archiveSection) {
          archiveSection.classList.toggle("permission-blocked", !allowed);
        }

        if (archivePermissionOverlay) {
          archivePermissionOverlay.style.display = allowed ? "none" : "flex";
          archivePermissionOverlay.setAttribute("aria-hidden", allowed ? "true" : "false");
        }

        const canEdit = hasArchiveEditAccess();
        const editControls = document.querySelectorAll("[data-archive-edit]");
        editControls.forEach((el) => {
          el.style.display = canEdit ? "" : "none";
        });

        if (!allowed) {
          resetArchiveBrowser();
          return;
        }

        updateArchiveFolderActions();
        updateArchiveFolderView();
      }

      function updateArchiveBackButton() {
        if (!archiveBackBtn) {
          return;
        }

        const backLabel = currentArchiveSubPath
          ? "Vissza"
          : openedArchiveFolder ? "Vissza a mappákhoz" : "Vissza a kategóriákhoz";
        archiveBackBtn.innerHTML = `<i class="fas fa-arrow-left"></i> ${backLabel}`;
      }

      function updateArchiveFolderView() {
        const isFolderOpen = Boolean(openedArchiveFolder);
        const isVideoMode = isArchiveVideoCategory();

        if (archiveBrowser) {
          archiveBrowser.classList.toggle("archive-browser--folder-open", isFolderOpen);
        }

        if (archiveCategoryHint) {
          if (isFolderOpen && isVideoMode) {
            archiveCategoryHint.textContent = `${openedArchiveFolder} - videó mappa`;
          } else if (isFolderOpen && currentArchiveSubPath) {
            archiveCategoryHint.textContent = `${openedArchiveFolder} / ${currentArchiveSubPath}`;
          } else if (isFolderOpen) {
            archiveCategoryHint.textContent = `${openedArchiveFolder} mappa`;
          } else {
            archiveCategoryHint.textContent = "Dupla kattintással nyithatsz mappát.";
          }
        }

        if (archiveFolderEmpty && isFolderOpen) {
          archiveFolderEmpty.style.display = "none";
        }

        updateArchiveVideoPanelVisibility();
        updateArchiveBackButton();
      }

      function closeArchiveFolderView() {
        openedArchiveFolder = null;
        currentArchiveSubPath = "";
        currentArchiveImageFiles = [];
        activeArchiveImageIndex = -1;
        archiveVideoList = [];
        archiveVideoIndex = 0;
        archiveVideoFilters.page = 1;
        closeArchiveImage();
        closeArchiveThumbnailPicker({ restoreFocus: false });
        closeArchiveVideoUploadModal();
        if (activeVideoModalContext === "archive") {
          closeVideoModal();
        }

        if (archiveFileGrid) {
          archiveFileGrid.innerHTML = "";
        }
        if (archiveFileEmpty) {
          archiveFileEmpty.style.display = "none";
        }
        if (archiveVideoGridContainer) {
          archiveVideoGridContainer.innerHTML = "";
        }
        if (archiveVideoPagination) {
          archiveVideoPagination.innerHTML = "";
        }

        updateArchiveFolderActions();
        updateArchiveFolderView();
        persistArchiveNavState();
      }

      function resetArchiveBrowser(options = {}) {
        const preserveNavState = Boolean(options?.preserveNavState);
        currentArchiveCategory = null;
        selectedArchiveFolder = null;
        openedArchiveFolder = null;
        currentArchiveSubPath = "";
        archivePendingRestoreFolder = null;
        currentArchiveImageFiles = [];
        activeArchiveImageIndex = -1;
        archiveVideoList = [];
        archiveVideoIndex = 0;
        archiveVideoFilters.page = 1;
        archiveVideoFilters.search = "";
        archiveVideoFilters.tag = [];
        if (archiveVideoSearchInput) {
          archiveVideoSearchInput.value = "";
        }
        closeArchiveImage();
        closeArchiveThumbnailPicker({ restoreFocus: false });
        closeArchiveVideoUploadModal();
        if (activeVideoModalContext === "archive") {
          closeVideoModal();
        }
        if (archiveBrowser) {
          archiveBrowser.style.display = "none";
        }
        if (archiveCategoryGrid) {
          archiveCategoryGrid.style.display = "grid";
        }
        if (archiveFolderRow) {
          archiveFolderRow.innerHTML = "";
        }
        if (archiveFileGrid) {
          archiveFileGrid.innerHTML = "";
        }
        if (archiveVideoGridContainer) {
          archiveVideoGridContainer.innerHTML = "";
        }
        if (archiveVideoPagination) {
          archiveVideoPagination.innerHTML = "";
        }
        if (archiveFolderEmpty) {
          archiveFolderEmpty.style.display = "none";
        }
        if (archiveFileEmpty) {
          archiveFileEmpty.style.display = "none";
        }
        if (archiveUploadStatus) {
          archiveUploadStatus.textContent = "";
        }
        if (archiveFolderNameInput) {
          archiveFolderNameInput.value = "";
        }
        updateArchiveFolderView();
        updateArchiveFolderActions();
        if (!preserveNavState) {
          persistArchiveNavState();
        }
      }

      function openArchiveCategory(categoryId, options = {}) {
        const category = ARCHIVE_CATEGORIES[categoryId];
        if (!category) {
          return;
        }

        if (!hasArchiveViewAccess()) {
          updateArchiveAccessUI();
          return;
        }

        currentArchiveCategory = categoryId;
        selectedArchiveFolder = null;
        openedArchiveFolder = null;
        currentArchiveSubPath = "";
        const restoreFolderName = typeof options?.restoreFolder === "string"
          ? options.restoreFolder.trim()
          : "";
        archivePendingRestoreFolder = restoreFolderName || null;

        if (archiveCategoryTitle) {
          archiveCategoryTitle.textContent = category.label;
        }
        if (archiveCategoryHint) {
          archiveCategoryHint.textContent = "Dupla kattintással nyithatsz mappát.";
        }

        if (archiveCategoryGrid) {
          archiveCategoryGrid.style.display = "none";
        }
        if (archiveBrowser) {
          archiveBrowser.style.display = "block";
        }

        if (archiveUploadInput) {
          archiveUploadInput.accept = category.accept || "";
          archiveUploadInput.value = "";
        }
        if (typeof archiveFolderUploadInput !== "undefined" && archiveFolderUploadInput) {
          archiveFolderUploadInput.accept = category.accept || "";
          archiveFolderUploadInput.value = "";
        }
        if (archiveUploadBtn) {
          archiveUploadBtn.disabled = true;
        }
        if (archiveDeleteFolderBtn) {
          archiveDeleteFolderBtn.disabled = true;
        }

        if (isArchiveVideoCategory()) {
          bindArchiveTagSelectorHandlers();
          attachArchiveVideoTagHandlers();
          fetchArchiveVideoTags();
        }

        updateArchiveFolderView();
        persistArchiveNavState();
        loadArchiveFolders();
      }

      async function loadArchiveFolders() {
        if (!currentArchiveCategory || !hasArchiveViewAccess()) {
          return;
        }

        if (archiveFolderRow) {
          archiveFolderRow.innerHTML = "";
        }
        if (archiveFolderEmpty) {
          archiveFolderEmpty.style.display = "none";
        }

        try {
          const response = await fetch(`/api/archive/${currentArchiveCategory}/folders`, {
            headers: buildAuthHeaders(),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.message || "Nem sikerült betölteni a mappákat.");
          }
          const folders = Array.isArray(data?.folders) ? data.folders : [];
          archiveLockedFolders = new Set(Array.isArray(data?.lockedFolders) ? data.lockedFolders : []);
          renderArchiveFolders(folders);
        } catch (error) {
          console.error("Archívum mappa hiba:", error);
          if (archiveFolderEmpty) {
            archiveFolderEmpty.textContent = error.message || "Nem sikerült betölteni a mappákat.";
            archiveFolderEmpty.style.display = "block";
          }
        }
      }

      function renderArchiveFolders(folders) {
        if (!archiveFolderRow) {
          return;
        }

        archiveFolderRow.innerHTML = "";

        if (!Array.isArray(folders) || folders.length === 0) {
          selectedArchiveFolder = null;
          openedArchiveFolder = null;
          archivePendingRestoreFolder = null;
          archiveVideoList = [];
          archiveVideoIndex = 0;
          updateArchiveFolderView();
          updateArchiveFolderActions();
          persistArchiveNavState();

          if (archiveFolderEmpty) {
            archiveFolderEmpty.textContent = "Nincs mappa ebben a kategóriában.";
            archiveFolderEmpty.style.display = "block";
          }
          if (archiveFileGrid) {
            archiveFileGrid.innerHTML = "";
          }
          if (archiveFileEmpty) {
            archiveFileEmpty.style.display = "none";
          }
          if (archiveVideoGridContainer) {
            archiveVideoGridContainer.innerHTML = "";
          }
          if (archiveVideoPagination) {
            archiveVideoPagination.innerHTML = "";
          }
          return;
        }

        if (archiveFolderEmpty) {
          archiveFolderEmpty.style.display = "none";
        }

        if (archivePendingRestoreFolder) {
          if (folders.includes(archivePendingRestoreFolder) && !archiveLockedFolders.has(archivePendingRestoreFolder)) {
            selectedArchiveFolder = archivePendingRestoreFolder;
            openedArchiveFolder = archivePendingRestoreFolder;
            currentArchiveSubPath = "";
            archiveVideoFilters.page = 1;
          }
          archivePendingRestoreFolder = null;
        }

        folders.forEach((folderName) => {
          const folderBtn = document.createElement("button");
          folderBtn.type = "button";
          folderBtn.className = "archive-folder-item";
          if (folderName === selectedArchiveFolder) {
            folderBtn.classList.add("active");
          }
          folderBtn.dataset.folderName = folderName;
          folderBtn.title = folderName;
          folderBtn.setAttribute("aria-label", folderName);

          const folderIcon = document.createElement("i");
          folderIcon.className = "fas fa-folder";
          const folderLabel = document.createElement("span");
          folderLabel.textContent = folderName;
          folderBtn.append(folderIcon, folderLabel);
          if (archiveLockedFolders.has(folderName)) {
            folderBtn.classList.add("archive-folder-item--locked");
            const lockIcon = document.createElement("i");
            lockIcon.className = "fas fa-lock archive-folder-lock-icon";
            lockIcon.setAttribute("aria-hidden", "true");
            folderBtn.appendChild(lockIcon);
          }

          folderBtn.addEventListener("click", async () => {
            if (archiveLockedFolders.has(folderName)) {
              await openArchiveFolder(folderName);
              return;
            }
            selectArchiveFolder(folderName);
          });
          folderBtn.addEventListener("dblclick", async () => {
            await openArchiveFolder(folderName);
          });
          archiveFolderRow.appendChild(folderBtn);
        });

        if (selectedArchiveFolder && !folders.includes(selectedArchiveFolder)) {
          selectedArchiveFolder = null;
        }
        if (openedArchiveFolder && !folders.includes(openedArchiveFolder)) {
          openedArchiveFolder = null;
          currentArchiveSubPath = "";
        }

        updateArchiveFolderView();

        if (openedArchiveFolder) {
          if (isArchiveVideoCategory()) {
            loadArchiveVideos();
          } else {
            loadArchiveFiles(openedArchiveFolder);
          }
        } else {
          if (archiveFileGrid) {
            archiveFileGrid.innerHTML = "";
          }
          if (archiveFileEmpty) {
            archiveFileEmpty.style.display = "none";
          }
          if (archiveVideoGridContainer) {
            archiveVideoGridContainer.innerHTML = "";
          }
          if (archiveVideoPagination) {
            archiveVideoPagination.innerHTML = "";
          }
        }

        updateArchiveFolderActions();
        persistArchiveNavState();
      }

      function selectArchiveFolder(folderName) {
        selectedArchiveFolder = folderName;

        if (archiveFolderRow) {
          Array.from(archiveFolderRow.children).forEach((child) => {
            child.classList.toggle("active", child.dataset.folderName === folderName);
          });
        }

        if (openedArchiveFolder !== folderName) {
          if (archiveFileGrid) {
            archiveFileGrid.innerHTML = "";
          }
          if (archiveFileEmpty) {
            archiveFileEmpty.style.display = "none";
          }
          if (archiveVideoGridContainer) {
            archiveVideoGridContainer.innerHTML = "";
          }
          if (archiveVideoPagination) {
            archiveVideoPagination.innerHTML = "";
          }
        }

        updateArchiveFolderActions();
      }

      function archiveUnlockKey(category, folderName) {
        return `${category}:${folderName}`;
      }

      function setArchivePasswordModalVisible(visible) {
        if (!archivePasswordModal) {
          return;
        }
        archivePasswordModal.classList.toggle("is-visible", visible);
        archivePasswordModal.setAttribute("aria-hidden", visible ? "false" : "true");
        archivePasswordModal.style.display = visible ? "flex" : "none";
        if (visible) {
          archivePasswordInput?.focus();
        }
      }

      function closeArchivePasswordModal(result = null) {
        setArchivePasswordModalVisible(false);
        if (archivePasswordInput) {
          archivePasswordInput.value = "";
        }
        if (archivePasswordStatus) {
          archivePasswordStatus.textContent = "";
          archivePasswordStatus.className = "archive-password-status";
        }
        const resolve = archivePasswordResolve;
        archivePasswordModalMode = null;
        archivePasswordTargetFolder = null;
        archivePasswordResolve = null;
        if (resolve) {
          resolve(result);
        }
      }

      function openArchivePasswordModal(mode, folderName) {
        archivePasswordModalMode = mode;
        archivePasswordTargetFolder = folderName;
        if (archivePasswordTitle) {
          archivePasswordTitle.textContent = "Add meg a jelszót pupák";
        }
        if (archivePasswordSubmitBtn) {
          archivePasswordSubmitBtn.textContent = mode === "set" ? "Lezárás" : "Belépés";
        }
        if (archivePasswordInput) {
          archivePasswordInput.value = "";
        }
        if (archivePasswordStatus) {
          archivePasswordStatus.textContent = "";
          archivePasswordStatus.className = "archive-password-status";
        }
        setArchivePasswordModalVisible(true);
        return new Promise((resolve) => {
          archivePasswordResolve = resolve;
        });
      }

      async function submitArchivePasswordModal() {
        if (!archivePasswordModalMode || !archivePasswordTargetFolder || !currentArchiveCategory) {
          return;
        }
        const password = archivePasswordInput?.value || "";
        const endpoint = archivePasswordModalMode === "set" ? "lock" : "unlock";
        if (archivePasswordStatus) {
          archivePasswordStatus.textContent = "Ellenőrzés...";
          archivePasswordStatus.className = "archive-password-status";
        }

        try {
          const response = await fetch(
            `/api/archive/${currentArchiveCategory}/folders/${encodeURIComponent(archivePasswordTargetFolder)}/${endpoint}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify({ password }),
            },
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.message || "Nem jól válaszolték Mcfly");
          }

          if (archivePasswordModalMode === "set") {
            archiveLockedFolders.add(archivePasswordTargetFolder);
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = "Mappa lezárva.";
            }
            await loadArchiveFolders();
            closeArchivePasswordModal({ ok: true });
            return;
          }

          const token = typeof data?.token === "string" ? data.token : "";
          if (token) {
            archiveUnlockTokens.set(archiveUnlockKey(currentArchiveCategory, archivePasswordTargetFolder), token);
          }
          if (archivePasswordStatus) {
            archivePasswordStatus.textContent = "Sikeres belépés";
            archivePasswordStatus.className = "archive-password-status is-success";
          }
          window.setTimeout(() => closeArchivePasswordModal({ ok: true, token }), 450);
        } catch (error) {
          if (archivePasswordStatus) {
            archivePasswordStatus.textContent = error.message || "Nem jól válaszolték Mcfly";
            archivePasswordStatus.className = "archive-password-status is-error";
          }
        }
      }

      async function ensureArchiveFolderPassword(folderName) {
        if (!archiveLockedFolders.has(folderName)) {
          return true;
        }
        if (archiveUnlockTokens.has(archiveUnlockKey(currentArchiveCategory, folderName))) {
          return true;
        }
        const result = await openArchivePasswordModal("unlock", folderName);
        return Boolean(result?.ok);
      }

      async function openArchiveFolder(folderName) {
        const canOpen = await ensureArchiveFolderPassword(folderName);
        if (!canOpen) {
          return;
        }
        selectedArchiveFolder = folderName;
        openedArchiveFolder = folderName;
        currentArchiveSubPath = "";
        archiveVideoFilters.page = 1;

        if (archiveFolderRow) {
          Array.from(archiveFolderRow.children).forEach((child) => {
            child.classList.toggle("active", child.dataset.folderName === folderName);
          });
        }

        updateArchiveFolderView();
        updateArchiveFolderActions();
        persistArchiveNavState();
        if (isArchiveVideoCategory()) {
          loadArchiveVideos();
        } else {
          loadArchiveFiles(folderName);
        }
      }

      function updateArchiveFolderActions() {
        const canEdit = hasArchiveEditAccess();
        const hasOpenFolder = Boolean(openedArchiveFolder);
        const canAdminRename = canEdit && isActualAdmin() && hasOpenFolder;
        const canAdminDelete = canEdit && isActualAdmin() && hasOpenFolder;
        const isVideoCategory = isArchiveVideoCategory();
        if (archiveUploadBtn) {
          archiveUploadBtn.style.display = isVideoCategory ? "none" : "inline-flex";
          archiveUploadBtn.disabled = !canEdit || isVideoCategory;
        }
        if (archiveDeleteFolderBtn) {
          archiveDeleteFolderBtn.style.display = canAdminDelete ? "inline-flex" : "none";
          archiveDeleteFolderBtn.disabled = !canAdminDelete;
        }
        if (archiveRenameFolderBtn) {
          archiveRenameFolderBtn.style.display = canAdminRename ? "inline-flex" : "none";
          archiveRenameFolderBtn.disabled = !canAdminRename;
        }
        if (archiveLockFolderBtn) {
          archiveLockFolderBtn.style.display = canAdminRename ? "inline-flex" : "none";
          archiveLockFolderBtn.disabled = !canAdminRename;
          archiveLockFolderBtn.textContent = archiveLockedFolders.has(openedArchiveFolder) ? "Jelszó módosítása" : "Mappa lezárása";
        }
        if (archiveShowUploadModalBtn) {
          archiveShowUploadModalBtn.style.display = isVideoCategory && hasOpenFolder && canEdit ? "inline-flex" : "none";
          archiveShowUploadModalBtn.disabled = !canEdit || !hasOpenFolder || !isVideoCategory;
        }
        if (archiveVideoSearchInput) {
          archiveVideoSearchInput.disabled = !hasOpenFolder || !isVideoCategory;
        }
        if (archiveSortOrderSelect) {
          archiveSortOrderSelect.disabled = !hasOpenFolder || !isVideoCategory;
        }
        if (archiveVideoQualitySelect) {
          archiveVideoQualitySelect.disabled = !hasOpenFolder || !isVideoCategory;
        }
        if (archivePageSizeSelect) {
          archivePageSizeSelect.disabled = !hasOpenFolder || !isVideoCategory;
        }
        if (archiveFilterResetBtn) {
          archiveFilterResetBtn.disabled = !hasOpenFolder || !isVideoCategory;
        }
      }

      async function loadArchiveFiles(folderName) {
        if (!currentArchiveCategory || !folderName || !hasArchiveViewAccess()) {
          return;
        }

        if (isArchiveVideoCategory()) {
          await loadArchiveVideos();
          return;
        }

        if (archiveFileGrid) {
          archiveFileGrid.innerHTML = "";
        }
        if (archiveFileEmpty) {
          archiveFileEmpty.style.display = "none";
        }

        try {
          const headers = buildAuthHeaders();
          const unlockToken = archiveUnlockTokens.get(archiveUnlockKey(currentArchiveCategory, folderName));
          if (unlockToken) {
            headers["X-Archive-Unlock"] = unlockToken;
          }
          const response = await fetch(`/api/archive/${currentArchiveCategory}/folders/${encodeURIComponent(folderName)}/files`, {
            headers,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.message || "Nem sikerült betölteni a mappákat.");
          }
          const files = Array.isArray(data?.files) ? data.files : [];
          renderArchiveFiles(files);
        } catch (error) {
          console.error("Archívum mappa hiba:", error);
          if (archiveFileEmpty) {
            archiveFileEmpty.textContent = error.message || "Nem sikerült betölteni a fájlokat.";
            archiveFileEmpty.style.display = "block";
          }
        }
      }

      function renderArchiveFiles(files) {
        if (!archiveFileGrid) {
          return;
        }

        archiveFileGrid.innerHTML = "";
        archiveFileGrid.classList.toggle("archive-file-grid--images", currentArchiveCategory === "kepek");
        archiveFileGrid.classList.toggle("archive-file-grid--documents", currentArchiveCategory === "dokumentumok");
        archiveFileGrid.classList.remove("archive-file-grid--folder-list");

        const normalizePath = (value) => String(value || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const activePath = normalizePath(currentArchiveSubPath);
        const childFolders = new Set();
        const visibleFiles = [];

        (Array.isArray(files) ? files : []).forEach((file) => {
          const filePath = normalizePath(file.path || file.name);
          const prefix = activePath ? `${activePath}/` : "";
          if (activePath && !filePath.startsWith(prefix)) {
            return;
          }

          const remainingPath = activePath ? filePath.slice(prefix.length) : filePath;
          const separatorIndex = remainingPath.indexOf("/");
          if (separatorIndex >= 0) {
            childFolders.add(remainingPath.slice(0, separatorIndex));
            return;
          }

          visibleFiles.push({
            ...file,
            displayName: remainingPath || file.name,
          });
        });

        if (!childFolders.size && visibleFiles.length === 0) {
          currentArchiveImageFiles = [];
          activeArchiveImageIndex = -1;
          updateArchiveImageNavigation();
          if (archiveFileEmpty) {
            archiveFileEmpty.textContent = "Nincs megjeleníthető fájl ebben a mappában.";
            archiveFileEmpty.style.display = "block";
          }
          return;
        }

        if (archiveFileEmpty) {
          archiveFileEmpty.style.display = "none";
        }

        archiveFileGrid.classList.toggle("archive-file-grid--folder-list", childFolders.size > 0);

        const category = ARCHIVE_CATEGORIES[currentArchiveCategory] || {};
        const type = category.type;

        if (type === "image") {
          const prevActiveUrl = activeArchiveImageIndex >= 0
            ? currentArchiveImageFiles[activeArchiveImageIndex]?.url
            : null;
          currentArchiveImageFiles = visibleFiles.map((item) => ({
            url: item.url,
            name: item.path || item.name || "Kep",
          }));
          if (prevActiveUrl) {
            activeArchiveImageIndex = currentArchiveImageFiles.findIndex((item) => item.url === prevActiveUrl);
          } else {
            activeArchiveImageIndex = -1;
          }
        } else {
          currentArchiveImageFiles = [];
          activeArchiveImageIndex = -1;
        }
        updateArchiveImageNavigation();

        [...childFolders].sort((a, b) => a.localeCompare(b, "hu")).forEach((folderName) => {
          const folderBtn = document.createElement("button");
          folderBtn.type = "button";
          folderBtn.className = "archive-folder-item archive-folder-item--inline";
          folderBtn.title = folderName;
          folderBtn.setAttribute("aria-label", folderName);

          const folderIcon = document.createElement("i");
          folderIcon.className = "fas fa-folder";
          const folderLabel = document.createElement("span");
          folderLabel.textContent = folderName;
          folderBtn.append(folderIcon, folderLabel);

          folderBtn.addEventListener("click", () => {
            currentArchiveSubPath = activePath ? `${activePath}/${folderName}` : folderName;
            renderArchiveFiles(files);
            updateArchiveFolderView();
          });
          archiveFileGrid.appendChild(folderBtn);
        });

        visibleFiles.forEach((file, fileIndex) => {
          const card = document.createElement("div");
          card.className = "archive-file-card";

          if (type === "image") {
            card.classList.add("archive-file-card--image");
            const img = document.createElement("img");
            img.className = "archive-file-thumb";
            img.src = file.url;
            img.alt = file.path || file.name || "Archív kép";
            img.addEventListener("click", () => openArchiveImageByIndex(fileIndex));
            card.appendChild(img);
          } else if (type === "audio") {
            const audio = document.createElement("audio");
            audio.className = "archive-file-audio";
            audio.controls = true;
            audio.src = file.url;
            card.appendChild(audio);
          } else if (type === "document") {
            const docRow = document.createElement("div");
            docRow.className = "archive-doc-card";

            const icon = document.createElement("div");
            icon.className = "archive-doc-icon";
            icon.innerHTML = '<i class="fas fa-file-lines"></i>';

            const info = document.createElement("div");
            const title = document.createElement("div");
            title.className = "archive-file-title";
            title.textContent = file.displayName || file.name || "Dokumentum";
            info.appendChild(title);

            const actions = document.createElement("div");
            actions.className = "archive-doc-actions";
            const openBtn = document.createElement("button");
            openBtn.type = "button";
            openBtn.className = "secondary-btn";
            openBtn.textContent = "Megnyitás";
            openBtn.addEventListener("click", () => openArchiveDocument(file.url, file.path || file.name));
            const downloadBtn = document.createElement("a");
            downloadBtn.className = "secondary-btn";
            downloadBtn.href = file.url;
            downloadBtn.textContent = "Letöltés";
            downloadBtn.setAttribute("download", file.name || "");
            actions.appendChild(openBtn);
            actions.appendChild(downloadBtn);

            docRow.appendChild(icon);
            docRow.appendChild(info);
            docRow.appendChild(actions);
            card.appendChild(docRow);
          }

          if (type !== "document") {
            const title = document.createElement("div");
            title.className = "archive-file-title";
            title.textContent = file.displayName || file.path || file.name || "Fájl";
            card.appendChild(title);
          }

          archiveFileGrid.appendChild(card);
        });
      }
      function clampArchiveImageScale(value) {
        return Math.min(3, Math.max(1, value));
      }

      function isArchiveImageModalOpen() {
        return Boolean(archiveImageModal?.classList.contains("is-visible"));
      }

      function updateArchiveImageNavigation() {
        const total = currentArchiveImageFiles.length;
        const hasMultiple = total > 1;

        if (archiveImagePrev) {
          archiveImagePrev.style.display = hasMultiple ? "inline-flex" : "none";
          archiveImagePrev.disabled = activeArchiveImageIndex <= 0;
        }
        if (archiveImageNext) {
          archiveImageNext.style.display = hasMultiple ? "inline-flex" : "none";
          archiveImageNext.disabled = activeArchiveImageIndex < 0 || activeArchiveImageIndex >= total - 1;
        }
      }

      function syncArchiveImageZoomControl() {
        if (!archiveImageZoom) {
          return;
        }
        archiveImageZoom.value = String(archiveImageScale);
      }

      function applyArchiveImageTransform() {
        if (!archiveImagePreview) {
          return;
        }

        archiveImagePreview.style.transition = archiveImageDragging ? "none" : "transform 0.2s ease";
        archiveImagePreview.style.transform = `translate(${archiveImagePanX}px, ${archiveImagePanY}px) scale(${archiveImageScale})`;

        const isZoomed = archiveImageScale > 1;
        const cursor = !isZoomed ? "default" : archiveImageDragging ? "grabbing" : "grab";
        archiveImagePreview.style.cursor = cursor;
        if (archiveImageStage) {
          archiveImageStage.style.cursor = cursor;
        }
      }

      function resetArchiveImageTransform() {
        archiveImageScale = 1;
        archiveImagePanX = 0;
        archiveImagePanY = 0;
        archiveImageDragging = false;
        syncArchiveImageZoomControl();
        applyArchiveImageTransform();
      }

      function setArchiveImageScale(nextScale, anchorClientX = null, anchorClientY = null) {
        const clampedScale = clampArchiveImageScale(nextScale);
        if (
          Number.isFinite(anchorClientX) &&
          Number.isFinite(anchorClientY) &&
          archiveImagePreview &&
          archiveImageScale > 0 &&
          clampedScale !== archiveImageScale
        ) {
          const previewRect = archiveImagePreview.getBoundingClientRect();
          const centerX = previewRect.left + previewRect.width / 2;
          const centerY = previewRect.top + previewRect.height / 2;
          const ratio = clampedScale / archiveImageScale;
          archiveImagePanX += (1 - ratio) * (anchorClientX - centerX);
          archiveImagePanY += (1 - ratio) * (anchorClientY - centerY);
        }

        archiveImageScale = clampedScale;
        if (archiveImageScale <= 1) {
          archiveImagePanX = 0;
          archiveImagePanY = 0;
        }
        syncArchiveImageZoomControl();
        applyArchiveImageTransform();
      }

      function openArchiveImageByIndex(index) {
        if (!Array.isArray(currentArchiveImageFiles) || !currentArchiveImageFiles.length) {
          return;
        }
        if (index < 0 || index >= currentArchiveImageFiles.length) {
          return;
        }

        activeArchiveImageIndex = index;
        const target = currentArchiveImageFiles[index];
        openArchiveImage(target.url, target.name);
      }

      function showNextArchiveImage() {
        if (activeArchiveImageIndex >= currentArchiveImageFiles.length - 1) {
          return;
        }
        openArchiveImageByIndex(activeArchiveImageIndex + 1);
      }

      function showPrevArchiveImage() {
        if (activeArchiveImageIndex <= 0) {
          return;
        }
        openArchiveImageByIndex(activeArchiveImageIndex - 1);
      }

      function openArchiveImage(url, name) {
        if (!archiveImageModal || !archiveImagePreview) {
          return;
        }
        archiveImagePreview.src = url;
        if (archiveImageTitle) {
          archiveImageTitle.textContent = name || "Kepnezet";
        }
        resetArchiveImageTransform();
        archiveImageModal.classList.add("is-visible");
        archiveImageModal.setAttribute("aria-hidden", "false");
        updateArchiveImageNavigation();
      }

      function closeArchiveImage() {
        if (!archiveImageModal || !archiveImagePreview) {
          return;
        }
        archiveImageModal.classList.remove("is-visible");
        archiveImageModal.setAttribute("aria-hidden", "true");
        archiveImagePreview.src = "";
        resetArchiveImageTransform();
        updateArchiveImageNavigation();
      }

      function openArchiveDocument(url, name) {
        if (!archiveDocModal || !archiveDocFrame) {
          return;
        }
        if (archiveDocTitle) {
          archiveDocTitle.textContent = name || "Dokumentum";
        }
        archiveDocFrame.src = url;
        archiveDocModal.classList.add("is-visible");
        archiveDocModal.setAttribute("aria-hidden", "false");
      }

      function closeArchiveDocument() {
        if (!archiveDocModal || !archiveDocFrame) {
          return;
        }
        archiveDocModal.classList.remove("is-visible");
        archiveDocModal.setAttribute("aria-hidden", "true");
        archiveDocFrame.src = "";
      }

      function isArchiveVideoCategory() {
        return currentArchiveCategory === "videok";
      }

      function isArchiveVideoFolderOpen() {
        return isArchiveVideoCategory() && Boolean(openedArchiveFolder);
      }

      function getArchiveVideoQualityAvailability(video) {
        return {
          "720p":
            Number(video?.has_720p) === 1 ||
            video?.has_720p === true ||
            video?.has_720p === "1",
        };
      }

      function listAvailableArchiveQualities(video) {
        const availability = getArchiveVideoQualityAvailability(video);
        const available = ["720p"].filter((quality) => availability[quality]);
        if (!available.length) {
          return ["Eredeti"];
        }
        return [...available, "Eredeti"];
      }

      function getArchiveVideoProcessingState(video) {
        const status = String(video?.processing_status || "").toLowerCase();
        const rawError =
          typeof video?.processing_error === "string" ? video.processing_error.trim() : "";
        const shortenedError =
          rawError.length > 180 ? `${rawError.slice(0, 177)}...` : rawError;

        if (status === "processing" || status === "pending") {
          return { kind: "processing", label: "Feldolgozas", error: "" };
        }

        if (status === "error" || shortenedError) {
          return {
            kind: "error",
            label: "Feldolgozasi hiba",
            error: shortenedError || "A video feldolgozasa sikertelen.",
          };
        }

        return { kind: "done", label: "Kesz", error: "" };
      }

      function buildArchiveVideoPath(originalFilename, targetResolution, video) {
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

        return `/uploads/archivum/videok/${targetResolution}/${folderName}/${nameWithoutExt}_${targetResolution}${extension}?${getVideoCacheBuster(video)}`;
      }

      function getPreferredArchiveVideoSource(video, qualityPreference) {
        const requestedQuality = qualityPreference || "original";
        const normalizedQuality = normalizeQualityPreference(requestedQuality);
        const originalSource = video?.filename ? `/uploads/${video.filename}?${getVideoCacheBuster(video)}` : "";
        const availability = getArchiveVideoQualityAvailability(video);

        if (normalizedQuality === "original") {
          return {
            src: originalSource,
            originalSource,
            resolvedQuality: "original",
            requestedQuality: normalizedQuality,
            availability,
          };
        }

        if (normalizedQuality === "720p" && availability["720p"]) {
          return {
            src: buildArchiveVideoPath(video?.filename, "720p", video),
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

      function showArchiveVideoToast(message) {
        if (!archiveVideoToast) return;
        archiveVideoToast.textContent = message;
        archiveVideoToast.classList.add("upload-toast--visible");
        if (archiveVideoToastTimeout) {
          clearTimeout(archiveVideoToastTimeout);
        }
        archiveVideoToastTimeout = setTimeout(
          () => archiveVideoToast.classList.remove("upload-toast--visible"),
          2200
        );
      }

      function formatArchiveThumbnailTimecode(seconds, includeFraction = false) {
        const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
        const wholeSeconds = Math.floor(safeSeconds);
        const hours = Math.floor(wholeSeconds / 3600);
        const minutes = Math.floor((wholeSeconds % 3600) / 60);
        const secs = wholeSeconds % 60;
        const base = hours > 0
          ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
          : `${minutes}:${String(secs).padStart(2, "0")}`;

        if (!includeFraction) {
          return base;
        }

        const hundredths = Math.floor((safeSeconds - wholeSeconds) * 100);
        return `${base}.${String(Math.max(hundredths, 0)).padStart(2, "0")}`;
      }

      function isArchiveThumbnailPickerOpen() {
        return Boolean(archiveThumbnailPickerModal?.classList.contains("modal-overlay--visible"));
      }

      function getArchiveThumbnailPickerDurationSeconds() {
        const rawDuration = archiveThumbnailPickerVideo?.duration;
        return Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;
      }

      function getArchiveThumbnailPickerCurrentSeconds() {
        const rawCurrent = archiveThumbnailPickerVideo?.currentTime;
        const safeCurrent = Number.isFinite(rawCurrent) && rawCurrent >= 0 ? rawCurrent : 0;
        const duration = getArchiveThumbnailPickerDurationSeconds();
        if (duration <= 0) {
          return safeCurrent;
        }
        const maxSeek = Math.max(duration - 0.04, 0);
        return Math.max(Math.min(safeCurrent, maxSeek), 0);
      }

      function setArchiveThumbnailPickerControlsEnabled(enabled) {
        const canUse = Boolean(enabled);
        if (archiveThumbnailPickerSlider) {
          archiveThumbnailPickerSlider.disabled = !canUse;
        }
        if (archiveThumbnailPickerStepBackBtn) {
          archiveThumbnailPickerStepBackBtn.disabled = !canUse;
        }
        if (archiveThumbnailPickerStepForwardBtn) {
          archiveThumbnailPickerStepForwardBtn.disabled = !canUse;
        }
        setArchiveThumbnailCropControlsEnabled(canUse);
      }

      function setArchiveThumbnailCropControlsEnabled(enabled) {
        const canCaptureFrame = Boolean(isArchiveThumbnailPickerOpen()) && archiveThumbnailPickerState?.isSaving !== true;
        const canAdjustCrop = canCaptureFrame && Boolean(archiveThumbnailPickerState?.cropFrameReady);

        if (archiveThumbnailCaptureFrameBtn) {
          archiveThumbnailCaptureFrameBtn.disabled = !canCaptureFrame;
        }
        if (archiveThumbnailZoomRange) {
          archiveThumbnailZoomRange.disabled = !canAdjustCrop;
        }
        if (archiveThumbnailZoomInBtn) {
          archiveThumbnailZoomInBtn.disabled = !canAdjustCrop;
        }
        if (archiveThumbnailZoomOutBtn) {
          archiveThumbnailZoomOutBtn.disabled = !canAdjustCrop;
        }
        if (archiveThumbnailPanUpBtn) {
          archiveThumbnailPanUpBtn.disabled = !canAdjustCrop;
        }
        if (archiveThumbnailPanLeftBtn) {
          archiveThumbnailPanLeftBtn.disabled = !canAdjustCrop;
        }
        if (archiveThumbnailPanRightBtn) {
          archiveThumbnailPanRightBtn.disabled = !canAdjustCrop;
        }
        if (archiveThumbnailPanDownBtn) {
          archiveThumbnailPanDownBtn.disabled = !canAdjustCrop;
        }
        if (archiveThumbnailCropResetBtn) {
          archiveThumbnailCropResetBtn.disabled = !canAdjustCrop;
        }
      }

      function updateArchiveThumbnailZoomUI() {
        if (!archiveThumbnailZoomRange) {
          return;
        }
        const stateZoom = Number.parseFloat(archiveThumbnailPickerState?.cropZoom);
        const safeZoom = Number.isFinite(stateZoom)
          ? clamp(stateZoom, ARCHIVE_THUMBNAIL_ZOOM_MIN, ARCHIVE_THUMBNAIL_ZOOM_MAX)
          : ARCHIVE_THUMBNAIL_ZOOM_MIN;
        archiveThumbnailZoomRange.value = String(safeZoom);
      }

      function destroyArchiveThumbnailCropper() {
        if (archiveThumbnailCropCanvas) {
          const ctx = archiveThumbnailCropCanvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, archiveThumbnailCropCanvas.width, archiveThumbnailCropCanvas.height);
          }
          archiveThumbnailCropCanvas.width = 0;
          archiveThumbnailCropCanvas.height = 0;
          archiveThumbnailCropCanvas.style.display = "none";
          archiveThumbnailCropCanvas.style.width = "auto";
          archiveThumbnailCropCanvas.style.height = "auto";
          archiveThumbnailCropCanvas.style.left = "0px";
          archiveThumbnailCropCanvas.style.top = "0px";
        }
        if (archiveThumbnailCropWindow) {
          archiveThumbnailCropWindow.style.display = "none";
        }
        if (archiveThumbnailCropStage) {
          archiveThumbnailCropStage.classList.remove("is-draggable");
          archiveThumbnailCropStage.classList.remove("is-dragging");
        }
        if (archiveThumbnailPickerState) {
          archiveThumbnailPickerState.cropZoom = ARCHIVE_THUMBNAIL_ZOOM_MIN;
          archiveThumbnailPickerState.cropPanX = 0;
          archiveThumbnailPickerState.cropPanY = 0;
          archiveThumbnailPickerState.cropFrameWidth = 0;
          archiveThumbnailPickerState.cropFrameHeight = 0;
          archiveThumbnailPickerState.cropFrameReady = false;
          archiveThumbnailPickerState.cropDragging = false;
          archiveThumbnailPickerState.lastCapturedFrameSecond = null;
        }
        updateArchiveThumbnailZoomUI();
      }

      function getArchiveThumbnailCropLayout() {
        const state = archiveThumbnailPickerState;
        if (!state || !archiveThumbnailCropStage) {
          return null;
        }

        const frameWidth = Number.parseFloat(state.cropFrameWidth);
        const frameHeight = Number.parseFloat(state.cropFrameHeight);
        if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth <= 1 || frameHeight <= 1) {
          return null;
        }

        const stageRect = archiveThumbnailCropStage.getBoundingClientRect();
        const stageWidth = Math.max(1, stageRect.width);
        const stageHeight = Math.max(1, stageRect.height);
        const padding = Math.min(34, Math.max(12, stageWidth * 0.035));
        const cropAspect = ARCHIVE_THUMBNAIL_TARGET_WIDTH / ARCHIVE_THUMBNAIL_TARGET_HEIGHT;

        let zoneWidth = Math.max(stageWidth - (padding * 2), 32);
        let zoneHeight = zoneWidth / cropAspect;
        const maxZoneHeight = Math.max(stageHeight - (padding * 2), 18);
        if (zoneHeight > maxZoneHeight) {
          zoneHeight = maxZoneHeight;
          zoneWidth = zoneHeight * cropAspect;
        }

        const zoneX = (stageWidth - zoneWidth) / 2;
        const zoneY = (stageHeight - zoneHeight) / 2;
        const baseScale = Math.max(zoneWidth / frameWidth, zoneHeight / frameHeight);
        const zoom = clamp(
          Number.parseFloat(state.cropZoom) || ARCHIVE_THUMBNAIL_ZOOM_MIN,
          ARCHIVE_THUMBNAIL_ZOOM_MIN,
          ARCHIVE_THUMBNAIL_ZOOM_MAX
        );
        const scale = baseScale * zoom;
        const drawWidth = frameWidth * scale;
        const drawHeight = frameHeight * scale;

        const stageCenterX = stageWidth / 2;
        const stageCenterY = stageHeight / 2;
        const minPanX = zoneX + zoneWidth - stageCenterX - (drawWidth / 2);
        const maxPanX = zoneX - stageCenterX + (drawWidth / 2);
        const minPanY = zoneY + zoneHeight - stageCenterY - (drawHeight / 2);
        const maxPanY = zoneY - stageCenterY + (drawHeight / 2);

        const panX = clamp(Number.parseFloat(state.cropPanX) || 0, minPanX, maxPanX);
        const panY = clamp(Number.parseFloat(state.cropPanY) || 0, minPanY, maxPanY);
        state.cropPanX = panX;
        state.cropPanY = panY;

        const imageLeft = stageCenterX + panX - (drawWidth / 2);
        const imageTop = stageCenterY + panY - (drawHeight / 2);

        return {
          frameWidth,
          frameHeight,
          stageWidth,
          stageHeight,
          zoneX,
          zoneY,
          zoneWidth,
          zoneHeight,
          scale,
          drawWidth,
          drawHeight,
          imageLeft,
          imageTop,
        };
      }

      function renderArchiveThumbnailCropEditor() {
        const state = archiveThumbnailPickerState;
        const layout = getArchiveThumbnailCropLayout();
        const hasFrame = Boolean(state?.cropFrameReady) && Boolean(layout);

        if (archiveThumbnailCropCanvas) {
          if (hasFrame) {
            archiveThumbnailCropCanvas.style.display = "block";
            archiveThumbnailCropCanvas.style.width = `${layout.drawWidth}px`;
            archiveThumbnailCropCanvas.style.height = `${layout.drawHeight}px`;
            archiveThumbnailCropCanvas.style.left = `${layout.imageLeft}px`;
            archiveThumbnailCropCanvas.style.top = `${layout.imageTop}px`;
          } else {
            archiveThumbnailCropCanvas.style.display = "none";
          }
        }

        if (archiveThumbnailCropWindow) {
          if (hasFrame) {
            archiveThumbnailCropWindow.style.display = "block";
            archiveThumbnailCropWindow.style.left = `${layout.zoneX}px`;
            archiveThumbnailCropWindow.style.top = `${layout.zoneY}px`;
            archiveThumbnailCropWindow.style.width = `${layout.zoneWidth}px`;
            archiveThumbnailCropWindow.style.height = `${layout.zoneHeight}px`;
            archiveThumbnailCropWindow.style.transform = "none";
          } else {
            archiveThumbnailCropWindow.style.display = "none";
          }
        }

        if (archiveThumbnailCropStage) {
          archiveThumbnailCropStage.classList.toggle("is-draggable", hasFrame);
          archiveThumbnailCropStage.classList.toggle("is-dragging", Boolean(state?.cropDragging && hasFrame));
        }

        updateArchiveThumbnailZoomUI();
      }

      function syncArchiveThumbnailCropEditorEnabledState() {
        const canUse = getArchiveThumbnailPickerDurationSeconds() > 0 && archiveThumbnailPickerState?.isSaving !== true;
        setArchiveThumbnailCropControlsEnabled(canUse);
      }

      function captureArchiveThumbnailFrame(force = false) {
        const state = archiveThumbnailPickerState;
        if (!state || !archiveThumbnailPickerVideo || !archiveThumbnailCropCanvas) {
          return;
        }

        const videoWidth = Number.parseInt(archiveThumbnailPickerVideo.videoWidth, 10);
        const videoHeight = Number.parseInt(archiveThumbnailPickerVideo.videoHeight, 10);
        if (!Number.isFinite(videoWidth) || !Number.isFinite(videoHeight) || videoWidth <= 0 || videoHeight <= 0) {
          return;
        }

        const currentSecond = getArchiveThumbnailPickerCurrentSeconds();
        if (
          !force &&
          Number.isFinite(state.lastCapturedFrameSecond) &&
          Math.abs(state.lastCapturedFrameSecond - currentSecond) < 0.02
        ) {
          return;
        }

        if (archiveThumbnailCropCanvas.width !== videoWidth || archiveThumbnailCropCanvas.height !== videoHeight) {
          archiveThumbnailCropCanvas.width = videoWidth;
          archiveThumbnailCropCanvas.height = videoHeight;
        }

        const context = archiveThumbnailCropCanvas.getContext("2d");
        if (!context) {
          return;
        }

        try {
          context.drawImage(archiveThumbnailPickerVideo, 0, 0, videoWidth, videoHeight);
        } catch (_error) {
          return;
        }

        state.lastCapturedFrameSecond = currentSecond;
        state.cropFrameWidth = videoWidth;
        state.cropFrameHeight = videoHeight;
        if (!state.cropFrameReady) {
          state.cropPanX = 0;
          state.cropPanY = 0;
          state.cropZoom = ARCHIVE_THUMBNAIL_ZOOM_MIN;
        }
        state.cropFrameReady = true;

        renderArchiveThumbnailCropEditor();
        syncArchiveThumbnailCropEditorEnabledState();
      }

      function applyArchiveThumbnailCropZoom(zoomValue) {
        if (!archiveThumbnailPickerState || !archiveThumbnailPickerState.cropFrameReady) {
          return;
        }
        const boundedZoom = clamp(
          Number.parseFloat(zoomValue) || ARCHIVE_THUMBNAIL_ZOOM_MIN,
          ARCHIVE_THUMBNAIL_ZOOM_MIN,
          ARCHIVE_THUMBNAIL_ZOOM_MAX
        );
        const currentZoom = Number.parseFloat(archiveThumbnailPickerState.cropZoom) || ARCHIVE_THUMBNAIL_ZOOM_MIN;
        if (Math.abs(boundedZoom - currentZoom) < 0.0001) {
          updateArchiveThumbnailZoomUI();
          return;
        }
        archiveThumbnailPickerState.cropZoom = boundedZoom;
        renderArchiveThumbnailCropEditor();
      }

      function nudgeArchiveThumbnailCropZoom(step) {
        if (!archiveThumbnailPickerState || !archiveThumbnailPickerState.cropFrameReady) {
          return;
        }
        const currentZoom = Number.parseFloat(archiveThumbnailPickerState.cropZoom) || ARCHIVE_THUMBNAIL_ZOOM_MIN;
        applyArchiveThumbnailCropZoom(currentZoom + step);
      }

      function nudgeArchiveThumbnailCropPosition(deltaX, deltaY) {
        if (!archiveThumbnailPickerState || !archiveThumbnailPickerState.cropFrameReady) {
          return;
        }
        const safeX = Number.isFinite(deltaX) ? deltaX : 0;
        const safeY = Number.isFinite(deltaY) ? deltaY : 0;
        if (!safeX && !safeY) {
          return;
        }
        archiveThumbnailPickerState.cropPanX = (Number.parseFloat(archiveThumbnailPickerState.cropPanX) || 0) + safeX;
        archiveThumbnailPickerState.cropPanY = (Number.parseFloat(archiveThumbnailPickerState.cropPanY) || 0) + safeY;
        renderArchiveThumbnailCropEditor();
      }

      function resetArchiveThumbnailCropAdjustments() {
        if (!archiveThumbnailPickerState || !archiveThumbnailPickerState.cropFrameReady) {
          return;
        }
        archiveThumbnailPickerState.cropZoom = ARCHIVE_THUMBNAIL_ZOOM_MIN;
        archiveThumbnailPickerState.cropPanX = 0;
        archiveThumbnailPickerState.cropPanY = 0;
        renderArchiveThumbnailCropEditor();
      }

      function getArchiveThumbnailCropPayload() {
        if (!archiveThumbnailPickerState?.cropFrameReady) {
          return null;
        }
        const layout = getArchiveThumbnailCropLayout();
        if (!layout) {
          return null;
        }

        const x = (layout.zoneX - layout.imageLeft) / layout.scale;
        const y = (layout.zoneY - layout.imageTop) / layout.scale;
        const width = layout.zoneWidth / layout.scale;
        const height = layout.zoneHeight / layout.scale;

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
          return null;
        }
        const frameWidth = Number.parseFloat(archiveThumbnailPickerState.cropFrameWidth);
        const frameHeight = Number.parseFloat(archiveThumbnailPickerState.cropFrameHeight);
        if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth <= 1 || frameHeight <= 1) {
          return null;
        }

        const clampedX = clamp(x, 0, frameWidth - 1);
        const clampedY = clamp(y, 0, frameHeight - 1);
        const clampedWidth = clamp(width, 1, frameWidth - clampedX);
        const clampedHeight = clamp(height, 1, frameHeight - clampedY);
        if (clampedWidth <= 1 || clampedHeight <= 1) {
          return null;
        }

        // Sent to backend for diagnostics/fallback path; primary save now uploads the exact rendered view.
        return {
          x: Number(clampedX.toFixed(3)),
          y: Number(clampedY.toFixed(3)),
          width: Number(clampedWidth.toFixed(3)),
          height: Number(clampedHeight.toFixed(3)),
          sourceWidth: Number(frameWidth.toFixed(3)),
          sourceHeight: Number(frameHeight.toFixed(3)),
          targetWidth: ARCHIVE_THUMBNAIL_TARGET_WIDTH,
          targetHeight: ARCHIVE_THUMBNAIL_TARGET_HEIGHT,
        };
      }

      function buildArchiveThumbnailBlobFromCurrentView() {
        if (!archiveThumbnailCropCanvas || !archiveThumbnailPickerState?.cropFrameReady) {
          return Promise.resolve(null);
        }

        const layout = getArchiveThumbnailCropLayout();
        if (!layout) {
          return Promise.resolve(null);
        }

        const sourceWidth = Number.parseFloat(archiveThumbnailCropCanvas.width);
        const sourceHeight = Number.parseFloat(archiveThumbnailCropCanvas.height);
        if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 1 || sourceHeight <= 1) {
          return Promise.resolve(null);
        }

        const targetWidth = ARCHIVE_THUMBNAIL_TARGET_WIDTH;
        const targetHeight = ARCHIVE_THUMBNAIL_TARGET_HEIGHT;
        const stageWidth = Math.max(1, Math.round(layout.stageWidth));
        const stageHeight = Math.max(1, Math.round(layout.stageHeight));
        const zoneX = clamp(layout.zoneX, 0, stageWidth - 1);
        const zoneY = clamp(layout.zoneY, 0, stageHeight - 1);
        const zoneWidth = clamp(layout.zoneWidth, 1, stageWidth - zoneX);
        const zoneHeight = clamp(layout.zoneHeight, 1, stageHeight - zoneY);

        const stageCanvas = document.createElement("canvas");
        stageCanvas.width = stageWidth;
        stageCanvas.height = stageHeight;
        const stageCtx = stageCanvas.getContext("2d");
        if (!stageCtx) {
          return Promise.resolve(null);
        }

        stageCtx.imageSmoothingEnabled = true;
        stageCtx.imageSmoothingQuality = "high";
        stageCtx.drawImage(
          archiveThumbnailCropCanvas,
          layout.imageLeft,
          layout.imageTop,
          layout.drawWidth,
          layout.drawHeight
        );

        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = targetWidth;
        outputCanvas.height = targetHeight;
        const outputCtx = outputCanvas.getContext("2d");
        if (!outputCtx) {
          return Promise.resolve(null);
        }

        outputCtx.imageSmoothingEnabled = true;
        outputCtx.imageSmoothingQuality = "high";
        outputCtx.drawImage(
          stageCanvas,
          zoneX,
          zoneY,
          zoneWidth,
          zoneHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        return new Promise((resolve) => {
          outputCanvas.toBlob((blob) => {
            resolve(blob || null);
          }, "image/jpeg", 0.92);
        });
      }

      function setArchiveThumbnailPickerBusyState(isBusy) {
        const busy = Boolean(isBusy);
        if (archiveThumbnailPickerSaveBtn) {
          archiveThumbnailPickerSaveBtn.disabled = busy || getArchiveThumbnailPickerDurationSeconds() <= 0;
          archiveThumbnailPickerSaveBtn.textContent = busy ? "Mentes..." : "Indexkep mentese";
        }
        if (archiveThumbnailPickerCancelBtn) {
          archiveThumbnailPickerCancelBtn.disabled = busy;
        }
        if (archiveThumbnailPickerCloseBtn) {
          archiveThumbnailPickerCloseBtn.disabled = busy;
        }
      }

      function syncArchiveThumbnailPickerTimeline(secondsOverride = null) {
        const duration = getArchiveThumbnailPickerDurationSeconds();
        const safeCurrent = Number.isFinite(secondsOverride)
          ? Math.max(Math.min(secondsOverride, Math.max(duration - 0.04, 0)), 0)
          : getArchiveThumbnailPickerCurrentSeconds();

        if (archiveThumbnailPickerSlider) {
          archiveThumbnailPickerSlider.value = String(duration > 0 ? Math.min(safeCurrent, duration) : 0);
        }
        if (archiveThumbnailPickerCurrentEl) {
          archiveThumbnailPickerCurrentEl.textContent = formatArchiveThumbnailTimecode(safeCurrent, true);
        }
        if (archiveThumbnailPickerDurationEl) {
          archiveThumbnailPickerDurationEl.textContent = formatArchiveThumbnailTimecode(duration);
        }
      }

      function closeArchiveThumbnailPicker(options = {}) {
        const restoreFocus = options?.restoreFocus !== false;
        const activeState = archiveThumbnailPickerState;
        if (activeState?.isSaving) {
          return;
        }

        if (archiveThumbnailPickerModal) {
          archiveThumbnailPickerModal.classList.remove("modal-overlay--visible");
          archiveThumbnailPickerModal.style.display = "none";
          archiveThumbnailPickerModal.style.removeProperty("position");
          archiveThumbnailPickerModal.style.removeProperty("inset");
          archiveThumbnailPickerModal.style.removeProperty("z-index");
          archiveThumbnailPickerModal.style.removeProperty("visibility");
          archiveThumbnailPickerModal.style.removeProperty("opacity");
          archiveThumbnailPickerModal.style.removeProperty("pointer-events");
          archiveThumbnailPickerModal.setAttribute("aria-hidden", "true");
        }

        if (archiveThumbnailPickerVideo) {
          archiveThumbnailPickerVideo.pause();
          archiveThumbnailPickerVideo.removeAttribute("src");
          archiveThumbnailPickerVideo.load();
        }

        destroyArchiveThumbnailCropper();
        archiveThumbnailPickerState = null;
        setArchiveThumbnailPickerControlsEnabled(false);
        setArchiveThumbnailPickerBusyState(false);
        if (archiveThumbnailPickerSlider) {
          archiveThumbnailPickerSlider.max = "0";
          archiveThumbnailPickerSlider.value = "0";
        }
        if (archiveThumbnailZoomRange) {
          archiveThumbnailZoomRange.value = String(ARCHIVE_THUMBNAIL_ZOOM_MIN);
        }
        if (archiveThumbnailPickerCurrentEl) {
          archiveThumbnailPickerCurrentEl.textContent = "0:00.00";
        }
        if (archiveThumbnailPickerDurationEl) {
          archiveThumbnailPickerDurationEl.textContent = "0:00";
        }
        if (archiveThumbnailPickerHintEl) {
          archiveThumbnailPickerHintEl.textContent =
            "Lejatszas kozben allitsd meg ott, amelyik kepkockat indexkepnek szeretned.";
        }
        if (archiveThumbnailPickerTitleEl) {
          archiveThumbnailPickerTitleEl.textContent = "";
        }

        if (restoreFocus && activeState?.triggerButton && typeof activeState.triggerButton.focus === "function") {
          activeState.triggerButton.focus({ preventScroll: true });
        }
      }

      function showArchiveThumbnailPickerModal() {
        if (!archiveThumbnailPickerModal) {
          return false;
        }

        archiveThumbnailPickerModal.style.setProperty("display", "flex", "important");
        archiveThumbnailPickerModal.style.setProperty("position", "fixed", "important");
        archiveThumbnailPickerModal.style.setProperty("inset", "0", "important");
        archiveThumbnailPickerModal.style.setProperty("z-index", "2500", "important");
        archiveThumbnailPickerModal.style.setProperty("visibility", "visible", "important");
        archiveThumbnailPickerModal.style.setProperty("opacity", "1", "important");
        archiveThumbnailPickerModal.style.setProperty("pointer-events", "auto", "important");
        archiveThumbnailPickerModal.classList.add("modal-overlay--visible");
        archiveThumbnailPickerModal.setAttribute("aria-hidden", "false");
        return true;
      }

      function openArchiveThumbnailPicker(video, previewElement, triggerButton) {
        if (!archiveThumbnailPickerModal || !archiveThumbnailPickerVideo || !archiveThumbnailPickerSlider) {
          showArchiveVideoToast("Az indexkep-kivalaszto nem erheto el.");
          return;
        }

        if (!video?.filename || !Number.isFinite(Number(video?.id))) {
          showArchiveVideoToast("Ervenytelen video.");
          return;
        }

        if (archiveThumbnailPickerState?.isSaving) {
          return;
        }

        if (isArchiveThumbnailPickerOpen()) {
          closeArchiveThumbnailPicker({ restoreFocus: false });
        }

        // Thumbnail selection must be source-accurate regardless of the global quality dropdown.
        // Always use the original source here to avoid coordinate drift with transcoded variants (e.g. 720p).
        const { originalSource } = getPreferredArchiveVideoSource(video, currentVideoQuality);
        const playbackSource = originalSource || `/uploads/${video.filename}`;
        const fallbackSource = playbackSource;
        const titleText = cleanVideoTitle(video.original_name || video.filename) || "Nevtelen video";

        archiveThumbnailPickerState = {
          video,
          previewElement: previewElement || null,
          triggerButton: triggerButton || null,
          originalSource: fallbackSource,
          apiBasePath: "/api/archive/videos",
          toastFn: showArchiveVideoToast,
          contextLabel: "archive",
          isUsingOriginalSource: true,
          isSaving: false,
          cropZoom: ARCHIVE_THUMBNAIL_ZOOM_MIN,
          cropPanX: 0,
          cropPanY: 0,
          cropFrameWidth: 0,
          cropFrameHeight: 0,
          cropFrameReady: false,
          cropDragging: false,
          cropDragStartX: 0,
          cropDragStartY: 0,
          cropStartPanX: 0,
          cropStartPanY: 0,
          lastCapturedFrameSecond: null,
        };

        if (archiveThumbnailPickerTitleEl) {
          archiveThumbnailPickerTitleEl.textContent = titleText;
        }
        if (archiveThumbnailPickerHintEl) {
          archiveThumbnailPickerHintEl.textContent = "Video betoltese...";
        }

        if (archiveThumbnailPickerSlider) {
          archiveThumbnailPickerSlider.min = "0";
          archiveThumbnailPickerSlider.max = "0";
          archiveThumbnailPickerSlider.value = "0";
        }
        if (archiveThumbnailPickerCurrentEl) {
          archiveThumbnailPickerCurrentEl.textContent = "0:00.00";
        }
        if (archiveThumbnailPickerDurationEl) {
          archiveThumbnailPickerDurationEl.textContent = "0:00";
        }
        if (archiveThumbnailZoomRange) {
          archiveThumbnailZoomRange.min = String(ARCHIVE_THUMBNAIL_ZOOM_MIN);
          archiveThumbnailZoomRange.max = String(ARCHIVE_THUMBNAIL_ZOOM_MAX);
          archiveThumbnailZoomRange.step = "0.05";
          archiveThumbnailZoomRange.value = String(ARCHIVE_THUMBNAIL_ZOOM_MIN);
        }

        destroyArchiveThumbnailCropper();
        setArchiveThumbnailPickerControlsEnabled(false);
        setArchiveThumbnailPickerBusyState(false);

        showArchiveThumbnailPickerModal();
        if (archiveThumbnailCaptureFrameBtn) {
          archiveThumbnailCaptureFrameBtn.disabled = false;
        }

        archiveThumbnailPickerVideo.pause();
        archiveThumbnailPickerVideo.currentTime = 0;
        archiveThumbnailPickerVideo.src = playbackSource;
        archiveThumbnailPickerVideo.load();
        archiveThumbnailPickerCloseBtn?.focus({ preventScroll: true });
      }

      function openClipThumbnailPicker(video, previewElement, triggerButton) {
        if (!archiveThumbnailPickerModal || !archiveThumbnailPickerVideo || !archiveThumbnailPickerSlider) {
          showClipToast("Az indexkep-kivalaszto nem erheto el.");
          return;
        }

        if (!video?.filename || !Number.isFinite(Number(video?.id))) {
          showClipToast("Ervenytelen video.");
          return;
        }

        if (archiveThumbnailPickerState?.isSaving) {
          return;
        }

        if (isArchiveThumbnailPickerOpen()) {
          closeArchiveThumbnailPicker({ restoreFocus: false });
        }

        // Keep clip picker source-accurate by always using the original file.
        const { originalSource } = getPreferredVideoSource(video, currentVideoQuality);
        const playbackSource = originalSource || `/uploads/${video.filename}`;
        const fallbackSource = playbackSource;
        const titleText = cleanVideoTitle(video.original_name || video.filename) || "Nevtelen video";

        archiveThumbnailPickerState = {
          video,
          previewElement: previewElement || null,
          triggerButton: triggerButton || null,
          originalSource: fallbackSource,
          apiBasePath: "/api/videos",
          toastFn: showClipToast,
          contextLabel: "clips",
          isUsingOriginalSource: true,
          isSaving: false,
          cropZoom: ARCHIVE_THUMBNAIL_ZOOM_MIN,
          cropPanX: 0,
          cropPanY: 0,
          cropFrameWidth: 0,
          cropFrameHeight: 0,
          cropFrameReady: false,
          cropDragging: false,
          cropDragStartX: 0,
          cropDragStartY: 0,
          cropStartPanX: 0,
          cropStartPanY: 0,
          lastCapturedFrameSecond: null,
        };

        if (archiveThumbnailPickerTitleEl) {
          archiveThumbnailPickerTitleEl.textContent = titleText;
        }
        if (archiveThumbnailPickerHintEl) {
          archiveThumbnailPickerHintEl.textContent = "Video betoltese...";
        }

        if (archiveThumbnailPickerSlider) {
          archiveThumbnailPickerSlider.min = "0";
          archiveThumbnailPickerSlider.max = "0";
          archiveThumbnailPickerSlider.value = "0";
        }
        if (archiveThumbnailPickerCurrentEl) {
          archiveThumbnailPickerCurrentEl.textContent = "0:00.00";
        }
        if (archiveThumbnailPickerDurationEl) {
          archiveThumbnailPickerDurationEl.textContent = "0:00";
        }
        if (archiveThumbnailZoomRange) {
          archiveThumbnailZoomRange.min = String(ARCHIVE_THUMBNAIL_ZOOM_MIN);
          archiveThumbnailZoomRange.max = String(ARCHIVE_THUMBNAIL_ZOOM_MAX);
          archiveThumbnailZoomRange.step = "0.05";
          archiveThumbnailZoomRange.value = String(ARCHIVE_THUMBNAIL_ZOOM_MIN);
        }

        destroyArchiveThumbnailCropper();
        setArchiveThumbnailPickerControlsEnabled(false);
        setArchiveThumbnailPickerBusyState(false);

        showArchiveThumbnailPickerModal();
        if (archiveThumbnailCaptureFrameBtn) {
          archiveThumbnailCaptureFrameBtn.disabled = false;
        }

        archiveThumbnailPickerVideo.pause();
        archiveThumbnailPickerVideo.currentTime = 0;
        archiveThumbnailPickerVideo.src = playbackSource;
        archiveThumbnailPickerVideo.load();
        archiveThumbnailPickerCloseBtn?.focus({ preventScroll: true });
      }

      function nudgeArchiveThumbnailPicker(secondsDelta) {
        if (!archiveThumbnailPickerState || !archiveThumbnailPickerVideo) {
          return;
        }
        const safeDelta = Number.isFinite(secondsDelta) ? secondsDelta : 0;
        if (!safeDelta) {
          return;
        }

        const duration = getArchiveThumbnailPickerDurationSeconds();
        const maxSeek = duration > 0 ? Math.max(duration - 0.04, 0) : 0;
        const nextTime = Math.max(Math.min(getArchiveThumbnailPickerCurrentSeconds() + safeDelta, maxSeek), 0);
        archiveThumbnailPickerVideo.currentTime = nextTime;
        syncArchiveThumbnailPickerTimeline(nextTime);
      }

      async function saveArchiveThumbnailFromPicker() {
        const stateAtStart = archiveThumbnailPickerState;
        if (!stateAtStart || !archiveThumbnailPickerVideo || stateAtStart.isSaving) {
          return;
        }

        const videoId = Number.parseInt(stateAtStart.video?.id, 10);
        if (!Number.isFinite(videoId)) {
          alert("Ervenytelen video azonosito.");
          return;
        }
        const apiBasePath =
          typeof stateAtStart.apiBasePath === "string" && stateAtStart.apiBasePath.trim()
            ? stateAtStart.apiBasePath.trim().replace(/\/+$/, "")
            : "/api/archive/videos";
        const toastFn = typeof stateAtStart.toastFn === "function" ? stateAtStart.toastFn : showArchiveVideoToast;

        captureArchiveThumbnailFrame(true);
        const seekSeconds = Number.isFinite(stateAtStart.lastCapturedFrameSecond)
          ? stateAtStart.lastCapturedFrameSecond
          : getArchiveThumbnailPickerCurrentSeconds();
        const crop = getArchiveThumbnailCropPayload();
        stateAtStart.isSaving = true;
        setArchiveThumbnailPickerBusyState(true);
        setArchiveThumbnailPickerControlsEnabled(false);
        if (archiveThumbnailPickerHintEl) {
          archiveThumbnailPickerHintEl.textContent = "Indexkep mentese folyamatban...";
        }

        try {
          let result = null;
          const hasActiveSelectionView = Boolean(stateAtStart.cropFrameReady);

          if (hasActiveSelectionView) {
            const thumbnailBlob = await buildArchiveThumbnailBlobFromCurrentView();
            if (!thumbnailBlob) {
              throw new Error("Nem sikerult kiolvasni a kijelolt indexkep-nezetet.");
            }

            const formData = new FormData();
            formData.append("thumbnail", thumbnailBlob, `archive-thumb-${videoId}.jpg`);
            formData.append("seekSeconds", String(seekSeconds));

            const customResponse = await fetch(`${apiBasePath}/${videoId}/thumbnail/custom`, {
              method: "POST",
              headers: {
                ...buildAuthHeaders(),
              },
              body: formData,
            });
            const customResult = await customResponse.json().catch(() => null);
            if (!customResponse.ok) {
              throw new Error((customResult && customResult.message) || "Nem sikerult indexkepet menteni.");
            }
            result = customResult;
          } else {
            const response = await fetch(`${apiBasePath}/${videoId}/thumbnail/regenerate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify(crop ? { seekSeconds, crop } : { seekSeconds }),
            });
            const fallbackResult = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error((fallbackResult && fallbackResult.message) || "Nem sikerult indexkepet menteni.");
            }
            result = fallbackResult;
          }

          const refreshedThumbnail = typeof result?.thumbnail_filename === "string"
            ? result.thumbnail_filename.trim()
            : "";
          if (refreshedThumbnail) {
            stateAtStart.video.thumbnail_filename = refreshedThumbnail;
            if (stateAtStart.previewElement) {
              stateAtStart.previewElement.poster = `/uploads/${refreshedThumbnail}?v=${Date.now()}`;
              stateAtStart.previewElement.load();
            }
          }

          toastFn(result?.message || "Indexkep frissitve.");
          closeArchiveThumbnailPicker();
        } catch (error) {
          console.error("Archiv indexkep mentesi hiba:", error);
          alert(error.message || "Nem sikerult elmenteni az indexkepet.");
        } finally {
          if (archiveThumbnailPickerState === stateAtStart) {
            stateAtStart.isSaving = false;
            setArchiveThumbnailPickerBusyState(false);
            setArchiveThumbnailPickerControlsEnabled(getArchiveThumbnailPickerDurationSeconds() > 0);
            if (archiveThumbnailPickerHintEl) {
              archiveThumbnailPickerHintEl.textContent =
                "Allitsd meg a videot a kivant kepkockanal, majd egerrel huzd a kepet es gorgetovel zoomolj.";
            }
          }
        }
      }

      function updateArchiveVideoPanelVisibility() {
        const visible = isArchiveVideoFolderOpen();
        if (archiveVideoPanel) {
          archiveVideoPanel.style.display = visible ? "block" : "none";
        }
        if (archiveFileGrid) {
          archiveFileGrid.style.display = visible ? "none" : "";
        }
        if (archiveFileEmpty && visible) {
          archiveFileEmpty.style.display = "none";
        }
        if (archiveVideoPanelHint) {
          archiveVideoPanelHint.textContent = visible
            ? `Mappa: ${openedArchiveFolder}`
            : "Nyiss meg egy mappát az archív videók megjelenítéséhez.";
        }
      }

      function renderArchiveSelectedTagChips() {
        if (!archiveTagSelectBox) return;
        archiveTagSelectBox.innerHTML = "";

        if (!archiveVideoFilters.tag.length) {
          const placeholder = document.createElement("span");
          placeholder.className = "custom-select-placeholder";
          placeholder.textContent = "Válassz címkéket...";
          archiveTagSelectBox.appendChild(placeholder);
          return;
        }

        archiveVideoFilters.tag.forEach((tagId) => {
          const tagData = archiveAvailableTags.find((tag) => String(tag.id) === String(tagId));
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
          archiveTagSelectBox.appendChild(chip);
        });
      }

      function renderArchiveTagDropdownOptions() {
        if (!archiveTagSelectDropdown) return;
        archiveTagSelectDropdown.innerHTML = "";

        const selectedValues = new Set(archiveVideoFilters.tag.map((value) => String(value)));

        if (!archiveAvailableTags.length) {
          const emptyState = document.createElement("div");
          emptyState.className = "custom-select-placeholder";
          emptyState.style.padding = "0.35rem 0.65rem";
          emptyState.textContent = "Nincs elérhető címke";
          archiveTagSelectDropdown.appendChild(emptyState);
          return;
        }

        archiveAvailableTags.forEach((tag) => {
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
          archiveTagSelectDropdown.appendChild(option);
        });
      }

      function renderArchiveTagSelector() {
        renderArchiveSelectedTagChips();
        renderArchiveTagDropdownOptions();
      }

      function selectArchiveVideoTag(tagId) {
        if (!tagId) return;
        const tagValue = String(tagId);
        const alreadySelected = archiveVideoFilters.tag.some((value) => String(value) === tagValue);
        if (alreadySelected) return;
        archiveVideoFilters.tag = [...archiveVideoFilters.tag, tagValue];
        archiveVideoFilters.page = 1;
        renderArchiveTagSelector();
        loadArchiveVideos();
      }

      function getArchiveTagIdFromChip(chip) {
        if (!chip) return null;
        const directId = chip.dataset.tagId;
        if (directId) return directId;
        const tagName = chip.dataset.tagName;
        if (!tagName) return null;
        const match = archiveAvailableTags.find((tag) => tag.name === tagName);
        return match ? String(match.id) : null;
      }

      function attachArchiveVideoTagHandlers() {
        if (!archiveVideoGridContainer || archiveVideoTagHandlersAttached) return;

        archiveVideoGridContainer.addEventListener("click", (event) => {
          const chip = getClosestElement(event.target, ".tag-chip");
          if (!chip || !archiveVideoGridContainer.contains(chip)) return;
          event.stopPropagation();
          const tagId = getArchiveTagIdFromChip(chip);
          if (!tagId) return;
          selectArchiveVideoTag(tagId);
        });

        archiveVideoGridContainer.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const chip = getClosestElement(event.target, ".tag-chip");
          if (!chip || !archiveVideoGridContainer.contains(chip)) return;
          event.preventDefault();
          const tagId = getArchiveTagIdFromChip(chip);
          if (!tagId) return;
          selectArchiveVideoTag(tagId);
        });

        archiveVideoTagHandlersAttached = true;
      }

      function bindArchiveTagSelectorHandlers() {
        if (!archiveTagSelectContainer || !archiveTagSelectDropdown || !archiveTagSelectBox || archiveTagSelectHandlersAttached) {
          return;
        }

        archiveTagSelectContainer.addEventListener("click", (event) => {
          event.stopPropagation();
          if (event.target.closest(".custom-select-chip__remove")) {
            return;
          }
          if (event.target.closest(".custom-select-option")) {
            return;
          }
          archiveTagSelectContainer.classList.toggle("active");
        });

        archiveTagSelectDropdown.addEventListener("click", (event) => {
          const option = event.target.closest(".custom-select-option");
          if (!option) return;
          event.stopPropagation();
          if (option.disabled) return;
          selectArchiveVideoTag(option.dataset.value);
        });

        archiveTagSelectBox.addEventListener("click", (event) => {
          const removeBtn = event.target.closest(".custom-select-chip__remove");
          if (!removeBtn) return;
          const chip = removeBtn.closest(".custom-select-chip");
          const tagId = chip?.dataset?.value;
          if (!tagId) return;
          event.stopPropagation();
          archiveVideoFilters.tag = archiveVideoFilters.tag.filter((id) => String(id) !== String(tagId));
          archiveVideoFilters.page = 1;
          renderArchiveTagSelector();
          loadArchiveVideos();
        });

        document.addEventListener("click", (event) => {
          if (!archiveTagSelectContainer.contains(event.target)) {
            archiveTagSelectContainer.classList.remove("active");
          }
        });

        archiveTagSelectHandlersAttached = true;
      }

      function renderArchiveGlobalTagSelect() {
        if (!archiveGlobalTagSelect) return;
        const currentSelection = getSelectValues(archiveGlobalTagSelect);
        archiveGlobalTagSelect.innerHTML = "";
        archiveAvailableTags.forEach((tag) => {
          const option = document.createElement("option");
          option.value = String(tag.id);
          option.textContent = tag.name;
          option.selected = currentSelection.includes(tag.id);
          styleTagOption(option, tag.color);
          archiveGlobalTagSelect.appendChild(option);
        });
      }

      async function fetchArchiveVideoTags() {
        if (!hasArchiveViewAccess()) {
          archiveAvailableTags = [];
          renderArchiveTagSelector();
          renderArchiveGlobalTagSelect();
          return;
        }
        try {
          const response = await fetch("/api/archive/videos/tags", {
            headers: buildAuthHeaders(),
          });
          if (!response.ok) throw new Error("Nem sikerült lekérni a címkéket.");
          const payload = await response.json();
          archiveAvailableTags = Array.isArray(payload)
            ? payload.map((tag) => ({ ...tag, color: normalizeColor(tag.color) }))
            : [];
          renderArchiveTagSelector();
          renderArchiveGlobalTagSelect();
          renderArchiveUploadQueue();
          if (archiveCreateTagWrapper) {
            archiveCreateTagWrapper.style.display = isAdminUser() ? "block" : "none";
          }
        } catch (error) {
          console.error(error);
        }
      }

      function buildArchiveVideoQueryParams() {
        const params = new URLSearchParams();
        Object.entries(archiveVideoFilters).forEach(([key, value]) => {
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

      function scrollArchiveVideoListToTop() {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && archiveVideoPagination?.contains(activeElement)) {
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
        appendTarget(document.getElementById("archivum"));
        appendTarget(archiveBrowser);
        appendTarget(archiveVideoPanel);
        appendTarget(archiveVideoGridContainer);

        let ancestor = archiveVideoPagination || archiveVideoGridContainer || archiveVideoPanel;
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

      function renderArchiveVideoPagination(pagination) {
        if (!archiveVideoPagination || !pagination || pagination.totalPages <= 1) {
          if (archiveVideoPagination) {
            archiveVideoPagination.innerHTML = "";
          }
          return;
        }

        archiveVideoPagination.innerHTML = "";
        const { currentPage, totalPages } = pagination;

        const createButton = (pageNumber, text = null) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = text || pageNumber;
          btn.classList.toggle("active", pageNumber === currentPage);
          btn.addEventListener("click", () => {
            if (pageNumber === currentPage) return;
            archiveVideoFilters.page = pageNumber;
            scrollArchiveVideoListToTop();
            loadArchiveVideos({ scrollToTop: true });
          });
          return btn;
        };

        const windowSize = 2;
        const start = Math.max(1, currentPage - windowSize);
        const end = Math.min(totalPages, currentPage + windowSize);

        if (start > 1) {
          archiveVideoPagination.appendChild(createButton(1));
          if (start > 2) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            archiveVideoPagination.appendChild(ellipsis);
          }
        }

        for (let page = start; page <= end; page += 1) {
          archiveVideoPagination.appendChild(createButton(page));
        }

        if (end < totalPages) {
          if (end < totalPages - 1) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            archiveVideoPagination.appendChild(ellipsis);
          }
          archiveVideoPagination.appendChild(createButton(totalPages));
        }
      }

      function renderArchiveVideoGrid(videos) {
        if (!archiveVideoGridContainer) {
          return;
        }
        archiveVideoGridContainer.innerHTML = "";

        videos.forEach((video, index) => {
          const card = document.createElement("div");
          card.className = "video-card";
          const processingState = getArchiveVideoProcessingState(video);
          if (processingState.kind === "error") {
            card.classList.add("video-card--error");
          }

          const header = document.createElement("div");
          header.className = "video-card__header";

          const title = document.createElement("p");
          title.className = "video-card__title";
          title.textContent = cleanVideoTitle(video.original_name || video.filename) || "Névtelen videó";
          header.appendChild(title);

          const statusBadge = document.createElement("span");
          statusBadge.className = "video-card__status video-card__status--" + processingState.kind;
          statusBadge.textContent = processingState.label;
          header.appendChild(statusBadge);

          if (isAdminUser()) {
            const refreshThumbnailBtn = document.createElement("button");
            refreshThumbnailBtn.type = "button";
            refreshThumbnailBtn.className = "video-card__thumb-refresh";
            refreshThumbnailBtn.textContent = "Uj indexkep";
            refreshThumbnailBtn.title = "Indexkep ujrageneralasa";
            refreshThumbnailBtn.setAttribute("aria-label", "Indexkep ujrageneralasa");
            refreshThumbnailBtn.addEventListener("click", (event) => {
              event.stopPropagation();
              openArchiveThumbnailPicker(video, videoElement, refreshThumbnailBtn);
            });
            header.appendChild(refreshThumbnailBtn);

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "video-card__edit";
            editBtn.title = "Videó címének szerkesztése";
            editBtn.setAttribute("aria-label", "Videó címének szerkesztése");
            editBtn.innerHTML = `
              <svg class="video-card__edit-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M3.6 16.8 3 21l4.2-.6L19.1 8.5 15.5 4.9 3.6 16.8Zm16.8-9.2c.2-.2.2-.5 0-.7l-2.3-2.3c-.2-.2-.5-.2-.7 0l-1.9 1.9 3 3 1.9-1.9Z"
                />
              </svg>
            `;
            editBtn.addEventListener("click", async (event) => {
              event.stopPropagation();
              const currentTitle = cleanVideoTitle(video.original_name || video.filename || "") || "Névtelen videó";
              const updatedTitle = window.prompt("Add meg az új videócímét:", currentTitle);
              if (updatedTitle === null) return;
              const normalizedTitle = updatedTitle.trim();
              if (!normalizedTitle || normalizedTitle === currentTitle) return;
              try {
                const response = await fetch(`/api/archive/videos/${video.id}/title`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    ...buildAuthHeaders(),
                  },
                  body: JSON.stringify({ title: normalizedTitle }),
                });
                const data = await response.json().catch(() => null);
                if (!response.ok) {
                  throw new Error(data?.message || "Nem sikerült frissíteni a videó címét.");
                }
                video.original_name = data?.original_name || normalizedTitle;
                title.textContent = cleanVideoTitle(video.original_name || video.filename) || "Névtelen videó";
                showArchiveVideoToast(data?.message || "A videó címe frissült.");
              } catch (error) {
                console.error("Archív videó cím módosítási hiba:", error);
                alert(error.message || "Nem sikerült frissíteni a videó címét.");
              }
            });
            header.appendChild(editBtn);
          }

          card.appendChild(header);

          const videoElement = document.createElement("video");
          const { src: previewSrc, originalSource: archiveOriginalSrc } = getPreferredArchiveVideoSource(
            video,
            currentVideoQuality
          );
          videoElement.poster = video.thumbnail_filename ? `/uploads/${video.thumbnail_filename}?${getVideoCacheBuster(video)}` : "";
          videoElement.dataset.src = archiveOriginalSrc || `/uploads/${video.filename}`;
          videoElement.src = previewSrc || archiveOriginalSrc || `/uploads/${video.filename}`;
          videoElement.controls = false;
          videoElement.preload = "metadata";
          videoElement.playsInline = true;
          videoElement.setAttribute("playsinline", "");
          videoElement.setAttribute("webkit-playsinline", "");
          videoElement.muted = true;
          let hasPlaybackError = false;

          const removePlaybackError = () => {
            const existing = card.querySelector(".video-card__error--playback");
            if (existing) {
              existing.remove();
            }
          };

          videoElement.addEventListener("click", () => openArchiveVideoModal(index));
          videoElement.addEventListener("error", () => {
            if (hasPlaybackError) {
              return;
            }

            hasPlaybackError = true;
            card.classList.add("video-card--error");
            removePlaybackError();

            const errorMessage = document.createElement("p");
            errorMessage.className = "video-card__error video-card__error--playback";
            errorMessage.textContent =
              "Nem sikerult betolteni a videot. Frissitsd az oldalt, vagy probald ujra kesobb.";
            card.appendChild(errorMessage);
          });
          videoElement.addEventListener("loadeddata", () => {
            hasPlaybackError = false;
            removePlaybackError();
            if (processingState.kind !== "error") {
              card.classList.remove("video-card--error");
            }
          });
          card.appendChild(videoElement);

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
          qualityInfo.textContent = `Elérhető minőségek: ${listAvailableArchiveQualities(video).join(", ")}`;

          const tagList = document.createElement("div");
          tagList.className = "tag-list";
          (video.tags || []).forEach((tag) => {
            const chip = document.createElement("span");
            chip.className = "tag-chip";
            chip.style.setProperty("--tag-color", normalizeColor(tag.color));
            chip.textContent = tag.name;
            chip.setAttribute("role", "button");
            chip.tabIndex = 0;
            chip.dataset.tagId = String(tag.id);
            tagList.appendChild(chip);
          });

          card.appendChild(meta);
          card.appendChild(qualityInfo);
          if (processingState.error) {
            const processingError = document.createElement("p");
            processingError.className = "video-card__error";
            processingError.textContent = `Hiba: ${processingState.error}`;
            card.appendChild(processingError);
          }
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
                const response = await fetch(`/api/archive/videos/${video.id}`, {
                  method: "DELETE",
                  headers: buildAuthHeaders(),
                });
                const result = await response.json().catch(() => null);
                if (!response.ok) {
                  throw new Error((result && result.message) || "Nem sikerült törölni a videót.");
                }
                await loadArchiveVideos();
              } catch (error) {
                alert(error.message);
              }
            });
            actions.appendChild(deleteBtn);
            card.appendChild(actions);
          }

          archiveVideoGridContainer.appendChild(card);
        });
      }

      async function loadArchiveVideos(options = {}) {
        const shouldScrollToTop = options?.scrollToTop === true;
        if (!archiveVideoGridContainer) return;
        if (!isArchiveVideoFolderOpen() || !hasArchiveViewAccess()) {
          archiveVideoGridContainer.innerHTML = "";
          if (archiveVideoPagination) {
            archiveVideoPagination.innerHTML = "";
          }
          archiveVideoList = [];
          return;
        }

        if (shouldScrollToTop) {
          scrollArchiveVideoListToTop();
        }

        archiveVideoGridContainer.innerHTML = "";
        if (archiveVideoPagination) archiveVideoPagination.innerHTML = "";

        const params = buildArchiveVideoQueryParams();

        try {
          const response = await fetch(
            `/api/archive/videos/folders/${encodeURIComponent(openedArchiveFolder)}?${params.toString()}`,
            {
              headers: buildAuthHeaders(),
            }
          );

          if (response.status === 401) {
            updateUIForLoggedOut();
            throw new Error("Be kell jelentkezned az archív videók megtekintéséhez.");
          }

          if (response.status === 403) {
            localStorage.setItem(SESSION_KEYS.canViewArchive, "false");
            updateArchiveAccessUI();
            throw new Error("Nincs jogosultságod az archív videók megtekintéséhez.");
          }

          if (!response.ok) {
            throw new Error("Nem sikerült betölteni az archív videókat.");
          }

          const { data, pagination } = await response.json();
          archiveVideoFilters.page = pagination?.currentPage || archiveVideoFilters.page;
          archiveVideoList = Array.isArray(data) ? data : [];
          const newlyFailedVideos = archiveVideoList.filter((video) => {
            const state = getArchiveVideoProcessingState(video);
            if (state.kind !== "error") {
              return false;
            }
            const videoId = Number.parseInt(video?.id, 10);
            if (!Number.isFinite(videoId) || archiveNotifiedProcessingErrorIds.has(videoId)) {
              return false;
            }
            archiveNotifiedProcessingErrorIds.add(videoId);
            return true;
          });

          if (newlyFailedVideos.length) {
            const countText =
              newlyFailedVideos.length === 1
                ? "1 video feldolgozasa hibaval leallt."
                : `${newlyFailedVideos.length} video feldolgozasa hibaval leallt.`;
            showArchiveVideoToast(`${countText} Reszlet a videokartyan lathato.`);
          }
          if (!archiveVideoList.length) {
            archiveVideoGridContainer.innerHTML = "<p>Még nincs videó ebben a mappában.</p>";
            return;
          }

          renderArchiveVideoGrid(archiveVideoList);
          renderArchiveVideoPagination(pagination);
          if (shouldScrollToTop) {
            scrollArchiveVideoListToTop();
          }
        } catch (error) {
          console.error("Archív videók betöltési hibája:", error);
          archiveVideoList = [];
          archiveVideoGridContainer.innerHTML = "<p>Nem sikerült betölteni az archív videókat.</p>";
        }
      }

      function toAbsoluteModalVideoUrl(value) {
        if (!value) return "";
        try {
          return new URL(String(value), window.location.origin).href;
        } catch (_error) {
          return String(value);
        }
      }

      function clearModalVideoSource() {
        if (!modalVideoPlayer) {
          return;
        }

        modalVideoPlaybackToken += 1;
        modalVideoPlayer.pause();
        try {
          modalVideoPlayer.srcObject = null;
        } catch (_error) {}
        modalVideoPlayer.removeAttribute("src");
        modalVideoPlayer.load();
        modalVideoPlayer.dataset.fallbackSrc = "";
        modalVideoPlayer.dataset.fallbackAttempted = "0";
        updateMediaSessionPlaybackState();
      }

      function playModalVideoSafely(expectedToken) {
        if (!modalVideoPlayer) {
          return;
        }

        const playPromise = modalVideoPlayer.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            if (expectedToken !== modalVideoPlaybackToken) {
              return;
            }
          });
        }
      }

      function handleModalVideoPlaybackError() {
        if (!modalVideoPlayer) {
          return;
        }

        const fallbackSrc = modalVideoPlayer.dataset.fallbackSrc || "";
        if (!fallbackSrc) {
          return;
        }

        if (modalVideoPlayer.dataset.fallbackAttempted === "1") {
          return;
        }
        modalVideoPlayer.dataset.fallbackAttempted = "1";

        const activeSrc = toAbsoluteModalVideoUrl(modalVideoPlayer.currentSrc || modalVideoPlayer.src || "");
        const normalizedFallbackSrc = toAbsoluteModalVideoUrl(fallbackSrc);
        if (!normalizedFallbackSrc || activeSrc === normalizedFallbackSrc) {
          return;
        }

        modalVideoPlayer.pause();
        modalVideoPlayer.src = fallbackSrc;
        modalVideoPlayer.load();
        const playToken = ++modalVideoPlaybackToken;
        playModalVideoSafely(playToken);
      }

      function ensureModalVideoErrorHandler() {
        if (!modalVideoPlayer || modalVideoErrorHandlerAttached) {
          return;
        }

        modalVideoPlayer.addEventListener("error", handleModalVideoPlaybackError);
        modalVideoErrorHandlerAttached = true;
      }

      function hasMediaSessionSupport() {
        return typeof navigator !== "undefined" && "mediaSession" in navigator && Boolean(navigator.mediaSession);
      }

      function getDefaultMediaSessionArtworkEntries() {
        try {
          const absoluteSrc = new URL(MEDIA_SESSION_ARTWORK_PATH, window.location.origin).href;
          return MEDIA_SESSION_ARTWORK_SIZES.map((size) => ({
            src: absoluteSrc,
            sizes: `${size}x${size}`,
            type: "image/png",
          }));
        } catch (_error) {
          return [];
        }
      }

      function loadMediaSessionArtworkImage() {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Nem sikerult betolteni a lockscreen kepet."));
          image.src = MEDIA_SESSION_ARTWORK_PATH;
        });
      }

      function buildShiftedArtworkDataUrl(image, size, offsetY) {
        const safeSize = Number(size);
        if (!Number.isFinite(safeSize) || safeSize <= 0) {
          return "";
        }

        const width = Number(image?.naturalWidth || image?.width || 0);
        const height = Number(image?.naturalHeight || image?.height || 0);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
          return "";
        }

        const canvas = document.createElement("canvas");
        canvas.width = safeSize;
        canvas.height = safeSize;
        const context = canvas.getContext("2d");
        if (!context) {
          return "";
        }

        const extraHeight = Math.max(0, Number(offsetY) || 0) * 2;
        const scale = Math.max(safeSize / width, (safeSize + extraHeight) / height);
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const drawX = (safeSize - drawWidth) / 2;
        const drawY = (safeSize - drawHeight) / 2 + (Number(offsetY) || 0);

        context.fillStyle = "#000";
        context.fillRect(0, 0, safeSize, safeSize);
        context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

        try {
          return canvas.toDataURL("image/png");
        } catch (_error) {
          return "";
        }
      }

      async function buildShiftedMediaSessionArtworkEntries() {
        if (Array.isArray(mediaSessionArtworkEntriesCache) && mediaSessionArtworkEntriesCache.length) {
          return mediaSessionArtworkEntriesCache;
        }
        if (mediaSessionArtworkBuildPromise) {
          return mediaSessionArtworkBuildPromise;
        }

        mediaSessionArtworkBuildPromise = (async () => {
          if (typeof document === "undefined") {
            return getDefaultMediaSessionArtworkEntries();
          }

          try {
            const image = await loadMediaSessionArtworkImage();
            const shiftedEntries = MEDIA_SESSION_ARTWORK_SIZES.map((size) => {
              const dataUrl = buildShiftedArtworkDataUrl(image, size, MEDIA_SESSION_ARTWORK_Y_OFFSET_PX);
              if (!dataUrl) {
                return null;
              }
              return {
                src: dataUrl,
                sizes: `${size}x${size}`,
                type: "image/png",
              };
            }).filter(Boolean);

            if (shiftedEntries.length) {
              mediaSessionArtworkEntriesCache = shiftedEntries;
              return shiftedEntries;
            }
          } catch (_error) {}

          const fallbackEntries = getDefaultMediaSessionArtworkEntries();
          mediaSessionArtworkEntriesCache = fallbackEntries;
          return fallbackEntries;
        })();

        try {
          return await mediaSessionArtworkBuildPromise;
        } finally {
          mediaSessionArtworkBuildPromise = null;
        }
      }

      function applyMediaSessionMetadata(artwork) {
        if (!hasMediaSessionSupport() || typeof window.MediaMetadata !== "function") {
          return;
        }

        const title = (modalVideoTitle?.textContent || "").trim() || "UMKGL HUB";
        const contextLabel = activeVideoModalContext === "archive" ? "Archiv video" : "Klip";
        try {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title,
            artist: "UMKGL HUB",
            album: contextLabel,
            artwork: Array.isArray(artwork) ? artwork : [],
          });
        } catch (_error) {}
      }

      function updateMediaSessionMetadata() {
        if (!hasMediaSessionSupport() || typeof window.MediaMetadata !== "function") {
          return;
        }

        const requestToken = ++mediaSessionMetadataToken;
        applyMediaSessionMetadata(getDefaultMediaSessionArtworkEntries());
        buildShiftedMediaSessionArtworkEntries().then((shiftedEntries) => {
          if (requestToken !== mediaSessionMetadataToken) {
            return;
          }
          applyMediaSessionMetadata(shiftedEntries);
        }).catch(() => {});
      }

      function updateMediaSessionPositionState() {
        if (!hasMediaSessionSupport() || typeof navigator.mediaSession.setPositionState !== "function" || !modalVideoPlayer) {
          return;
        }

        const duration = Number(modalVideoPlayer.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
          return;
        }

        const currentTime = Number(modalVideoPlayer.currentTime);
        const position = Number.isFinite(currentTime) ? Math.min(duration, Math.max(0, currentTime)) : 0;
        const playbackRate = Number(modalVideoPlayer.playbackRate) || 1;
        try {
          navigator.mediaSession.setPositionState({ duration, playbackRate, position });
        } catch (_error) {}
      }

      function updateMediaSessionPlaybackState() {
        if (!hasMediaSessionSupport()) {
          return;
        }

        const modalOpen = Boolean(videoPlayerModal?.classList.contains("open"));
        const isPlaying = modalOpen && modalVideoPlayer && !modalVideoPlayer.paused && !modalVideoPlayer.ended;
        try {
          navigator.mediaSession.playbackState = isPlaying ? "playing" : modalOpen ? "paused" : "none";
        } catch (_error) {}
      }

      function clearMediaSessionMetadata() {
        if (!hasMediaSessionSupport()) {
          return;
        }

        mediaSessionMetadataToken += 1;
        try {
          navigator.mediaSession.metadata = null;
        } catch (_error) {}
        try {
          navigator.mediaSession.playbackState = "none";
        } catch (_error) {}
      }

      function ensureMediaSessionHandlers() {
        if (!hasMediaSessionSupport() || mediaSessionHandlersAttached) {
          return;
        }

        const setAction = (action, handler) => {
          try {
            navigator.mediaSession.setActionHandler(action, handler);
          } catch (_error) {}
        };

        setAction("play", () => {
          if (!videoPlayerModal?.classList.contains("open")) {
            return;
          }
          const playPromise = modalVideoPlayer?.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
          updateMediaSessionPlaybackState();
        });
        setAction("pause", () => {
          modalVideoPlayer?.pause();
          updateMediaSessionPlaybackState();
        });
        setAction("previoustrack", () => {
          if (!videoPlayerModal?.classList.contains("open")) {
            return;
          }
          showPrevVideo();
        });
        setAction("nexttrack", () => {
          if (!videoPlayerModal?.classList.contains("open")) {
            return;
          }
          showNextVideo();
        });

        mediaSessionHandlersAttached = true;
      }

      function ensureMediaSessionPlayerHandlers() {
        if (!modalVideoPlayer || mediaSessionPlayerHandlersAttached) {
          return;
        }

        const syncState = () => {
          updateMediaSessionPlaybackState();
          updateMediaSessionPositionState();
        };

        modalVideoPlayer.addEventListener("play", syncState);
        modalVideoPlayer.addEventListener("playing", syncState);
        modalVideoPlayer.addEventListener("pause", syncState);
        modalVideoPlayer.addEventListener("ended", syncState);
        modalVideoPlayer.addEventListener("loadedmetadata", syncState);
        modalVideoPlayer.addEventListener("durationchange", syncState);
        modalVideoPlayer.addEventListener("timeupdate", syncState);
        modalVideoPlayer.addEventListener("ratechange", syncState);
        modalVideoPlayer.addEventListener("emptied", syncState);
        mediaSessionPlayerHandlersAttached = true;
      }

      function setModalVideoSource(primarySrc, fallbackSrc) {
        if (!modalVideoPlayer) {
          return;
        }

        ensureModalVideoErrorHandler();
        ensureMediaSessionHandlers();
        ensureMediaSessionPlayerHandlers();
        clearModalVideoSource();

        const resolvedPrimary = primarySrc || fallbackSrc || "";
        if (!resolvedPrimary) {
          clearMediaSessionMetadata();
          return;
        }

        modalVideoPlayer.dataset.fallbackSrc = fallbackSrc || "";
        modalVideoPlayer.dataset.fallbackAttempted = "0";
        modalVideoPlayer.src = resolvedPrimary;
        modalVideoPlayer.load();
        updateMediaSessionMetadata();
        updateMediaSessionPlaybackState();
        const playToken = ++modalVideoPlaybackToken;
        playModalVideoSafely(playToken);
      }

      function openArchiveVideoModal(index) {
        if (!videoPlayerModal || !modalVideoPlayer || !Array.isArray(archiveVideoList)) {
          return;
        }
        if (!archiveVideoList.length) {
          return;
        }

        activeVideoModalContext = "archive";
        archiveVideoIndex =
          ((index % archiveVideoList.length) + archiveVideoList.length) % archiveVideoList.length;
        const activeVideo = archiveVideoList[archiveVideoIndex];
        if (!activeVideo) {
          return;
        }

        modalVideoTitle.textContent =
          cleanVideoTitle(activeVideo.original_name || activeVideo.filename) || "Névtelen videó";
        const videoElements = archiveVideoGridContainer?.querySelectorAll(".video-card video") || [];
        const { src, originalSource } = getPreferredArchiveVideoSource(activeVideo, currentVideoQuality);
        const originalSrc = originalSource || `/uploads/${activeVideo.filename}`;
        const sourceFromGrid = videoElements[archiveVideoIndex]?.dataset?.src || "";
        const resolvedSource = src || sourceFromGrid || originalSrc;

        setModalVideoSource(resolvedSource, originalSrc);

        videoPlayerModal.classList.add("open");
        videoPlayerModal.setAttribute("aria-hidden", "false");
        closeVideoModalBtn?.focus({ preventScroll: true });
      }

      function showNextArchiveVideo() {
        if (!archiveVideoList.length) {
          return;
        }
        const nextIndex = (archiveVideoIndex + 1) % archiveVideoList.length;
        openArchiveVideoModal(nextIndex);
      }

      function showPrevArchiveVideo() {
        if (!archiveVideoList.length) {
          return;
        }
        const prevIndex = (archiveVideoIndex - 1 + archiveVideoList.length) % archiveVideoList.length;
        openArchiveVideoModal(prevIndex);
      }

      function createArchiveQueueTagSelect(selectedValues = [], onChange) {
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

        archiveAvailableTags.forEach((tag) => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "tag-pill";
          pill.dataset.tagId = String(tag.id);
          pill.style.setProperty("--tag-color", normalizeColor(tag.color));
          pill.innerHTML = `<span class="tag-pill__dot"></span><span class="tag-pill__label">${tag.name}</span>`;
          pill.addEventListener("click", () => {
            toggleTag(tag.id);
            pill.blur();
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

      function renderArchiveUploadQueue() {
        if (!archiveUploadQueueContainer) return;
        archiveUploadQueueContainer.innerHTML = "";
        const hasItems = archiveUploadQueue.length > 0;

        if (archiveAddMoreVideosBtn) {
          archiveAddMoreVideosBtn.style.display = hasItems ? "inline-flex" : "none";
        }

        if (!hasItems && archiveDropZone) {
          archiveUploadQueueContainer.appendChild(archiveDropZone);
        }

        archiveUploadQueue.forEach((item) => {
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
            thumbnail.textContent = "VID";
          }

          const details = document.createElement("div");
          details.className = "queue-details";

          const nameInput = document.createElement("input");
          nameInput.type = "text";
          nameInput.value = item.displayName || item.file.name;
          nameInput.placeholder = "Videó neve";
          nameInput.addEventListener("input", (event) => {
            item.displayName = event.target.value || item.file.name;
            updateArchiveUploadSummary();
          });
          details.appendChild(nameInput);

          const tagSelector = createArchiveQueueTagSelect(item.tags || [], (values) => {
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
          removeBtn.addEventListener("click", () => {
            archiveUploadQueue = archiveUploadQueue.filter((entry) => entry.signature !== item.signature);
            archiveFileSignatures.delete(item.signature);
            renderArchiveUploadQueue();
            updateArchiveUploadSummary();
            if (archiveUploadSubmitBtn) {
              archiveUploadSubmitBtn.disabled = archiveUploadQueue.length === 0;
            }
          });
          actions.appendChild(removeBtn);

          row.appendChild(thumbnail);
          row.appendChild(details);
          row.appendChild(actions);
          archiveUploadQueueContainer.appendChild(row);
        });
      }

      function updateArchiveUploadSummary() {
        if (!archiveUploadSummary || !archiveSelectedFileName) return;
        const count = archiveUploadQueue.length;
        if (!count) {
          archiveUploadSummary.textContent = "Nincs kiválasztott fájl.";
          archiveSelectedFileName.textContent = "Nincs kiválasztott fájl.";
          return;
        }
        archiveUploadSummary.textContent = `${count} fájl kiválasztva.`;
        archiveSelectedFileName.textContent = archiveUploadSummary.textContent;
      }

      function resetArchiveUploadProgress() {
        if (archiveUploadProgress) {
          archiveUploadProgress.style.display = "none";
        }
        if (archiveUploadProgressFill) {
          archiveUploadProgressFill.style.width = "0%";
        }
        if (archiveUploadProgressCount) {
          archiveUploadProgressCount.textContent = "0 / 0 videó";
        }
        if (archiveUploadProgressEta) {
          archiveUploadProgressEta.textContent = "Hátralévő idő: --";
        }
        if (archiveUploadProgressDetails) {
          archiveUploadProgressDetails.textContent = "";
        }
      }

      function updateArchiveUploadProgressUI({
        uploadedBytes,
        totalBytes,
        completedFiles,
        totalFiles,
        etaSeconds,
      }) {
        if (!archiveUploadProgress || !archiveUploadProgressFill || !archiveUploadProgressCount || !archiveUploadProgressEta) {
          return;
        }

        const safeTotalBytes = totalBytes || 0;
        const percent = safeTotalBytes > 0 ? Math.min(100, (uploadedBytes / safeTotalBytes) * 100) : 0;

        archiveUploadProgress.style.display = "flex";
        archiveUploadProgressFill.style.width = `${percent}%`;
        archiveUploadProgressCount.textContent = `${completedFiles} / ${totalFiles} videó`;
        archiveUploadProgressEta.textContent = `Hátralévő idő: ${formatDuration(etaSeconds)}`;

        if (archiveUploadProgressDetails) {
          const remainingBytes = Math.max(safeTotalBytes - uploadedBytes, 0);
          archiveUploadProgressDetails.textContent = `${formatBytes(uploadedBytes)} / ${formatBytes(
            safeTotalBytes
          )} \u2022 H\u00E1tra: ${formatBytes(remainingBytes)}`;
        }
      }

      function showArchiveUploadToast(message) {
        if (!archiveUploadToast) return;
        archiveUploadToast.textContent = message;
        archiveUploadToast.classList.add("upload-toast--visible");
        const modalContent = archiveVideoUploadModal?.querySelector(".upload-modal-content");
        if (modalContent) {
          modalContent.classList.remove("shake");
          modalContent.offsetWidth;
          modalContent.classList.add("shake");
        }
        setTimeout(() => archiveUploadToast.classList.remove("upload-toast--visible"), 1800);
      }

      function resetArchiveUploadModal() {
        archiveUploadQueue = [];
        archiveFileSignatures.clear();
        archiveUploadedVideoIds = [];
        archiveIsUploadCancelled = false;
        archiveIsUploading = false;
        archiveCurrentUploadXhr = null;
        renderArchiveUploadQueue();
        updateArchiveUploadSummary();
        if (archiveUploadSubmitBtn) {
          archiveUploadSubmitBtn.disabled = true;
        }
        if (archiveCancelUploadBtn) {
          archiveCancelUploadBtn.disabled = false;
        }
        if (archiveUploadStatusText) {
          archiveUploadStatusText.textContent = "";
        }
        resetArchiveUploadProgress();
        if (archiveUploadToast) {
          archiveUploadToast.classList.remove("upload-toast--visible");
          archiveUploadToast.textContent = "";
        }
        if (archiveVideoFileInput) {
          archiveVideoFileInput.value = "";
        }
        if (archiveDropZone) {
          archiveDropZone.classList.remove("drag-over");
        }
        if (archiveGlobalTagSelect) {
          archiveGlobalTagSelect.selectedIndex = -1;
        }
        if (archiveCreateTagStatus) {
          archiveCreateTagStatus.textContent = "";
        }
        if (archiveNewTagColorInput) {
          archiveNewTagColorInput.value = DEFAULT_TAG_COLOR;
        }
        if (archiveTagColorButton) {
          archiveTagColorButton.style.setProperty("--tag-color", DEFAULT_TAG_COLOR);
        }
      }

      async function rollbackArchiveUploadedVideos(videoIds) {
        const normalizedIds = Array.isArray(videoIds)
          ? Array.from(new Set(videoIds.map((id) => Number(id)).filter(Number.isFinite)))
          : [];
        if (!normalizedIds.length) {
          return { deletedVideoIds: [] };
        }

        const response = await fetch("/api/archive/videos/cancel", {
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

      function openArchiveVideoUploadModal() {
        if (archiveVideoUploadModal) {
          archiveVideoUploadModal.style.display = "flex";
          archiveVideoUploadModal.classList.add("modal-overlay--visible");
        }
        fetchArchiveVideoTags();
        resetArchiveUploadModal();
      }

      function closeArchiveVideoUploadModal() {
        if (archiveVideoUploadModal) {
          archiveVideoUploadModal.classList.remove("modal-overlay--visible");
          archiveVideoUploadModal.style.display = "none";
        }
        resetArchiveUploadModal();
      }

      async function handleArchiveFileSelection(files) {
        const normalized = Array.isArray(files)
          ? files.filter(Boolean)
          : Array.from(files || []).filter(Boolean);

        if (!normalized.length) {
          return;
        }

        const remainingSlots = MAX_UPLOAD_FILES - archiveUploadQueue.length;
        if (remainingSlots <= 0) {
          showArchiveUploadToast(`Egyszerre legfeljebb ${MAX_UPLOAD_FILES} fájl tölthető fel.`);
          return;
        }

        const limitedFiles = normalized.slice(0, remainingSlots);
        if (limitedFiles.length < normalized.length) {
          showArchiveUploadToast(
            `Csak az első ${remainingSlots} fájl került a sorba (maximum ${MAX_UPLOAD_FILES} egyszerre).`
          );
        }

        const globalTags = getSelectValues(archiveGlobalTagSelect);
        for (const file of limitedFiles) {
          const signature = getFileSignature(file);
          if (archiveFileSignatures.has(signature)) {
            showArchiveUploadToast("Ez a videó már a listán van!");
            continue;
          }

          archiveFileSignatures.add(signature);
          let thumbnail = null;
          try {
            thumbnail = await generateVideoThumbnail(file);
          } catch (error) {
            console.warn("Nem sikerült indexképet generálni:", error);
          }

          archiveUploadQueue.push({
            file,
            signature,
            displayName: file.name,
            tags: [...globalTags],
            thumbnail,
          });
        }

        renderArchiveUploadQueue();
        updateArchiveUploadSummary();
        if (archiveUploadSubmitBtn) {
          archiveUploadSubmitBtn.disabled = archiveUploadQueue.length === 0;
        }
        if (archiveUploadStatusText) {
          archiveUploadStatusText.textContent = "";
        }
      }

      const archiveCategoryButtons = document.querySelectorAll("[data-archive-category]");
      if (archiveCategoryButtons.length) {
        archiveCategoryButtons.forEach((button) => {
          button.addEventListener("click", () => {
            const categoryId = button.dataset.archiveCategory;
            openArchiveCategory(categoryId);
          });
        });
      }

      if (archiveBackBtn) {
        archiveBackBtn.addEventListener("click", () => {
          if (currentArchiveSubPath) {
            const parts = currentArchiveSubPath.split("/").filter(Boolean);
            parts.pop();
            currentArchiveSubPath = parts.join("/");
            if (openedArchiveFolder) {
              loadArchiveFiles(openedArchiveFolder);
            }
            updateArchiveFolderView();
            return;
          }
          if (openedArchiveFolder) {
            closeArchiveFolderView();
            return;
          }
          resetArchiveBrowser();
        });
      }

      if (archiveLockFolderBtn) {
        archiveLockFolderBtn.addEventListener("click", async () => {
          if (!isActualAdmin() || !openedArchiveFolder) {
            return;
          }
          await openArchivePasswordModal("set", openedArchiveFolder);
        });
      }

      if (archivePasswordSubmitBtn) {
        archivePasswordSubmitBtn.addEventListener("click", submitArchivePasswordModal);
      }
      if (archivePasswordInput) {
        archivePasswordInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submitArchivePasswordModal();
          }
        });
      }
      if (archivePasswordCloseBtn) {
        archivePasswordCloseBtn.addEventListener("click", () => closeArchivePasswordModal({ ok: false }));
      }
      if (archivePasswordCancelBtn) {
        archivePasswordCancelBtn.addEventListener("click", () => closeArchivePasswordModal({ ok: false }));
      }
      if (archivePasswordModal) {
        archivePasswordModal.addEventListener("click", (event) => {
          if (event.target === archivePasswordModal) {
            closeArchivePasswordModal({ ok: false });
          }
        });
      }

      if (archiveCreateFolderBtn) {
        archiveCreateFolderBtn.addEventListener("click", async () => {
          if (!hasArchiveEditAccess() || !currentArchiveCategory) {
            return;
          }
          const rawName = archiveFolderNameInput?.value || "";
          const name = rawName.trim();
          if (!name) {
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = "Adj meg egy mappanevet.";
            }
            return;
          }

          try {
            const response = await fetch(`/api/archive/${currentArchiveCategory}/folders`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify({ name }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data?.message || "Nem sikerült feltölteni a fájlokat.");
            }
            if (archiveFolderNameInput) {
              archiveFolderNameInput.value = "";
            }
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = "Mappa létrehozva.";
            }
            selectedArchiveFolder = name;
            openedArchiveFolder = name;
            await loadArchiveFolders();
          } catch (error) {
            console.error("Archívum mappa létrehozási hiba:", error);
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = error.message || "Nem sikerült feltölteni a fájlokat.";
            }
          }
        });
      }

      if (archiveDeleteFolderBtn) {
        archiveDeleteFolderBtn.addEventListener("click", async () => {
          if (!hasArchiveEditAccess() || !isActualAdmin() || !currentArchiveCategory || !openedArchiveFolder) {
            return;
          }

          const confirmed = window.confirm(`Biztosan törlöd a "${openedArchiveFolder}" mappát?`);
          if (!confirmed) {
            return;
          }

          try {
            const response = await fetch(`/api/archive/${currentArchiveCategory}/folders`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify({ name: openedArchiveFolder }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data?.message || "Nem sikerült átnevezni a mappát.");
            }
            if (selectedArchiveFolder === openedArchiveFolder) {
              selectedArchiveFolder = null;
            }
            openedArchiveFolder = null;
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = "Mappa törölve.";
            }
            await loadArchiveFolders();
          } catch (error) {
            console.error("Archívum mappa törlési hiba:", error);
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = error.message || "Nem sikerült átnevezni a mappát.";
            }
          }
        });
      }

      if (archiveRenameFolderBtn) {
        archiveRenameFolderBtn.addEventListener("click", async () => {
          if (!hasArchiveEditAccess() || !isActualAdmin() || !currentArchiveCategory || !openedArchiveFolder) {
            return;
          }

          const rawNextName = window.prompt("Új mappanév:", openedArchiveFolder);
          if (rawNextName === null) {
            return;
          }
          const nextName = rawNextName.trim();
          if (!nextName) {
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = "Adj meg egy mappanevet.";
            }
            return;
          }
          if (nextName === openedArchiveFolder) {
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = "A mappanév nem változott.";
            }
            return;
          }

          try {
            const response = await fetch(`/api/archive/${currentArchiveCategory}/folders/rename`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify({
                oldName: openedArchiveFolder,
                newName: nextName,
              }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data?.message || "Nem sikerült feltölteni a fájlokat.");
            }

            selectedArchiveFolder = nextName;
            openedArchiveFolder = nextName;
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = "Mappa létrehozva.";
            }
            await loadArchiveFolders();
          } catch (error) {
            console.error("Archívum mappa létrehozási hiba:", error);
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = error.message || "Nem sikerült feltölteni a fájlokat.";
            }
          }
        });
      }

      function buildArchiveUploadEntries(fileList) {
        return Array.from(fileList || [])
          .filter(Boolean)
          .map((file) => {
            const relativePath = typeof file.webkitRelativePath === "string" && file.webkitRelativePath
              ? file.webkitRelativePath
              : file.name;
            return { file, relativePath };
          });
      }

      function getArchiveEntryExtension(entry) {
        const name = String(entry?.file?.name || entry?.relativePath || "");
        const dotIndex = name.lastIndexOf(".");
        return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
      }

      function filterArchiveUploadEntries(entries) {
        if (currentArchiveCategory === "dokumentumok") {
          return {
            accepted: entries,
            skipped: [],
          };
        }

        const allowedExtensions = ARCHIVE_CATEGORIES[currentArchiveCategory]?.allowedExtensions || [];
        if (!allowedExtensions.length) {
          return {
            accepted: entries,
            skipped: [],
          };
        }

        const accepted = [];
        const skipped = [];
        entries.forEach((entry) => {
          if (allowedExtensions.includes(getArchiveEntryExtension(entry))) {
            accepted.push(entry);
          } else {
            skipped.push(entry);
          }
        });

        return { accepted, skipped };
      }

      function sumArchiveUploadBytes(entries) {
        return entries.reduce((sum, entry) => sum + (entry?.file?.size || 0), 0);
      }

      function splitArchiveUploadBatches(entries) {
        const maxFilesPerBatch = 25;
        const maxBytesPerBatch = 768 * 1024;
        const batches = [];
        let currentBatch = [];
        let currentBytes = 0;

        entries.forEach((entry) => {
          const entryBytes = entry?.file?.size || 0;
          const shouldStartNewBatch = currentBatch.length > 0
            && (currentBatch.length >= maxFilesPerBatch || currentBytes + entryBytes > maxBytesPerBatch);

          if (shouldStartNewBatch) {
            batches.push(currentBatch);
            currentBatch = [];
            currentBytes = 0;
          }

          currentBatch.push(entry);
          currentBytes += entryBytes;
        });

        if (currentBatch.length) {
          batches.push(currentBatch);
        }

        return batches;
      }

      function createArchiveUploadId() {
        const randomPart = Math.random().toString(36).slice(2);
        return `${Date.now()}_${randomPart}`;
      }

      function createArchivePickerInput({ directory = false } = {}) {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        if (!directory) {
          input.accept = ARCHIVE_CATEGORIES[currentArchiveCategory]?.accept || "";
        }
        input.style.position = "fixed";
        input.style.left = "-9999px";
        input.style.top = "0";
        input.style.opacity = "0";
        if (directory) {
          input.setAttribute("webkitdirectory", "");
          input.setAttribute("directory", "");
        }
        document.body.appendChild(input);
        return input;
      }

      function openArchiveUploadPicker({ directory = false } = {}) {
        const input = createArchivePickerInput({ directory });
        input.addEventListener("change", async () => {
          try {
            const entries = buildArchiveUploadEntries(input.files);
            await uploadArchiveFileEntries(entries);
          } finally {
            input.remove();
          }
        }, { once: true });
        input.addEventListener("cancel", () => input.remove(), { once: true });
        input.click();
      }

      function readArchiveFileEntry(entry, relativePath) {
        return new Promise((resolve, reject) => {
          entry.file(
            (file) => resolve({ file, relativePath: relativePath || file.name }),
            reject,
          );
        });
      }

      async function readArchiveDirectoryEntry(entry, prefix = "") {
        const reader = entry.createReader();
        const children = [];
        const readBatch = () => new Promise((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });

        let batch = await readBatch();
        while (batch.length) {
          children.push(...batch);
          batch = await readBatch();
        }

        const results = [];
        for (const child of children) {
          const childPath = `${prefix}${entry.name}/${child.name}`;
          if (child.isDirectory) {
            const nestedEntries = await readArchiveDirectoryEntry(child, `${prefix}${entry.name}/`);
            results.push(...nestedEntries);
          } else if (child.isFile) {
            results.push(await readArchiveFileEntry(child, childPath));
          }
        }
        return results;
      }

      async function buildArchiveDropEntries(dataTransfer) {
        const items = Array.from(dataTransfer?.items || []);
        const supportsEntryApi = items.some((item) => typeof item.webkitGetAsEntry === "function");
        if (!supportsEntryApi) {
          return buildArchiveUploadEntries(dataTransfer?.files);
        }

        const entries = [];
        for (const item of items) {
          const entry = item.webkitGetAsEntry?.();
          if (!entry) {
            continue;
          }
          if (entry.isDirectory) {
            entries.push(...await readArchiveDirectoryEntry(entry));
          } else if (entry.isFile) {
            entries.push(await readArchiveFileEntry(entry, entry.name));
          }
        }
        return entries;
      }

      async function ensureArchiveUploadFolder(folderName) {
        const response = await fetch(`/api/archive/${currentArchiveCategory}/folders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({ name: folderName }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok && response.status !== 409) {
          throw new Error(data?.message || "Nem sikerült létrehozni a mappát.");
        }
      }

      function groupArchiveRootFolderEntries(entries) {
        const groups = new Map();
        for (const entry of entries) {
          const relativePath = String(entry?.relativePath || entry?.file?.name || "")
            .replace(/\\/g, "/")
            .replace(/^\/+/, "");
          const separatorIndex = relativePath.indexOf("/");
          if (separatorIndex <= 0) {
            return null;
          }
          const folderName = relativePath.slice(0, separatorIndex).trim();
          const nestedPath = relativePath.slice(separatorIndex + 1).trim();
          if (!folderName || !nestedPath) {
            return null;
          }
          if (!groups.has(folderName)) {
            groups.set(folderName, []);
          }
          groups.get(folderName).push({
            file: entry.file,
            relativePath: nestedPath,
          });
        }
        return groups;
      }

      function uploadArchiveEntriesToFolder(folderName, entries, progressState = null) {
        const formData = new FormData();
        entries.forEach(({ file, relativePath }) => {
          formData.append("relativePaths", relativePath || file.name);
          formData.append("files", file, file.name);
        });

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/api/archive/${currentArchiveCategory}/folders/${encodeURIComponent(folderName)}/files`);
          const authHeaders = buildAuthHeaders();
          Object.entries(authHeaders).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });

          xhr.upload.addEventListener("progress", (event) => {
            if (!archiveUploadStatus || !progressState || !event.lengthComputable) {
              return;
            }

            const uploadedBytes = progressState.completedBytes + event.loaded;
            const percent = progressState.totalBytes > 0
              ? Math.min(99, Math.round((uploadedBytes / progressState.totalBytes) * 100))
              : 0;
            archiveUploadStatus.textContent =
              `Feltöltés: ${progressState.folderIndex} / ${progressState.totalFolders} mappa, `
              + `${progressState.batchIndex} / ${progressState.totalBatches} csomag, ${percent}%`;
          });

          xhr.addEventListener("load", () => {
            const data = (() => {
              try {
                return JSON.parse(xhr.responseText || "{}");
              } catch (_error) {
                return {};
              }
            })();

            if (xhr.status < 200 || xhr.status >= 300) {
              reject(new Error(data?.message || `Nem sikerült feltölteni a fájlokat. HTTP ${xhr.status}`));
              return;
            }

            resolve(data);
          });

          xhr.addEventListener("error", () => reject(new Error("Hálózati hiba a feltöltés közben. Próbáld újra kisebb csomagokra bontott feltöltéssel.")));
          xhr.addEventListener("abort", () => reject(new Error("A feltöltés megszakadt.")));
          xhr.send(formData);
        });
      }

      async function uploadArchiveEntryChunked(folderName, entry, progressState) {
        const file = entry.file;
        const chunkSize = 512 * 1024;
        const totalChunks = Math.max(1, Math.ceil((file?.size || 0) / chunkSize));
        const uploadId = createArchiveUploadId();
        let item = null;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          const formData = new FormData();
          formData.append("uploadId", uploadId);
          formData.append("relativePath", entry.relativePath || file.name);
          formData.append("filename", file.name);
          formData.append("chunkIndex", String(chunkIndex));
          formData.append("totalChunks", String(totalChunks));
          formData.append("totalSize", String(file.size || 0));
          formData.append("chunk", chunk, file.name);

          const data = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `/api/archive/${currentArchiveCategory}/folders/${encodeURIComponent(folderName)}/files/chunk`);
            Object.entries(buildAuthHeaders()).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });

            xhr.upload.addEventListener("progress", (event) => {
              if (!archiveUploadStatus || !event.lengthComputable) {
                return;
              }
              const uploadedBytes = progressState.completedBytes + start + event.loaded;
              const percent = progressState.totalBytes > 0
                ? Math.min(99, Math.round((uploadedBytes / progressState.totalBytes) * 100))
                : 0;
              archiveUploadStatus.textContent =
                `Feltöltés: ${progressState.folderIndex} / ${progressState.totalFolders} mappa, `
                + `nagy fájl ${chunkIndex + 1} / ${totalChunks} darab, ${percent}%`;
            });

            xhr.addEventListener("load", () => {
              const parsed = (() => {
                try {
                  return JSON.parse(xhr.responseText || "{}");
                } catch (_error) {
                  return {};
                }
              })();
              if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(parsed?.message || `Nem sikerült feltölteni a fájldarabot. HTTP ${xhr.status}`));
                return;
              }
              resolve(parsed);
            });
            xhr.addEventListener("error", () => reject(new Error("Hálózati hiba a fájldarab feltöltése közben.")));
            xhr.addEventListener("abort", () => reject(new Error("A fájldarab feltöltése megszakadt.")));
            xhr.send(formData);
          });

          if (data?.complete && data?.item) {
            item = data.item;
          }
        }

        progressState.completedBytes += file?.size || 0;
        return item;
      }

      async function uploadArchiveBatchesToFolder(folderName, entries, progressState) {
        const chunkThresholdBytes = 768 * 1024;
        const smallEntries = entries.filter((entry) => (entry?.file?.size || 0) <= chunkThresholdBytes);
        const largeEntries = entries.filter((entry) => (entry?.file?.size || 0) > chunkThresholdBytes);
        const batches = splitArchiveUploadBatches(smallEntries);
        let uploadedCount = 0;

        for (const [batchIndex, batch] of batches.entries()) {
          if (archiveUploadStatus) {
            const percent = progressState.totalBytes > 0
              ? Math.round((progressState.completedBytes / progressState.totalBytes) * 100)
              : 0;
            archiveUploadStatus.textContent =
              `Feltöltés: ${progressState.folderIndex} / ${progressState.totalFolders} mappa, `
              + `${batchIndex + 1} / ${batches.length} csomag, ${percent}%`;
          }

          const data = await uploadArchiveEntriesToFolder(folderName, batch, {
            completedBytes: progressState.completedBytes,
            totalBytes: progressState.totalBytes,
            folderIndex: progressState.folderIndex,
            totalFolders: progressState.totalFolders,
            batchIndex: batchIndex + 1,
            totalBatches: batches.length,
          });

          progressState.completedBytes += sumArchiveUploadBytes(batch);
          uploadedCount += Array.isArray(data?.items) ? data.items.length : batch.length;
        }

        for (const [largeIndex, entry] of largeEntries.entries()) {
          if (archiveUploadStatus) {
            const percent = progressState.totalBytes > 0
              ? Math.round((progressState.completedBytes / progressState.totalBytes) * 100)
              : 0;
            archiveUploadStatus.textContent =
              `Feltöltés: ${progressState.folderIndex} / ${progressState.totalFolders} mappa, `
              + `nagy fájl ${largeIndex + 1} / ${largeEntries.length}, ${percent}%`;
          }
          const item = await uploadArchiveEntryChunked(folderName, entry, progressState);
          uploadedCount += item ? 1 : 0;
        }

        return uploadedCount;
      }

      async function uploadArchiveFileEntries(entries) {
        if (!hasArchiveEditAccess() || !currentArchiveCategory) {
          return;
        }
        if (!Array.isArray(entries) || !entries.length) {
          return;
        }

        const { accepted, skipped } = filterArchiveUploadEntries(entries);
        if (!accepted.length) {
          if (archiveUploadStatus) {
            archiveUploadStatus.textContent = skipped.length
              ? "Nincs feltölthető fájl ebben a kategóriában."
              : "Nincs kiválasztott fájl.";
          }
          return;
        }

        try {
          let uploadedCount = 0;
          const totalBytes = sumArchiveUploadBytes(accepted);
          const progressState = {
            completedBytes: 0,
            totalBytes,
            folderIndex: 1,
            totalFolders: 1,
          };
          if (openedArchiveFolder) {
            if (archiveUploadStatus) {
              archiveUploadStatus.textContent = `Feltöltés előkészítése...`;
            }
            uploadedCount = await uploadArchiveBatchesToFolder(openedArchiveFolder, accepted, progressState);
            await loadArchiveFiles(openedArchiveFolder);
          } else {
            const groupedEntries = groupArchiveRootFolderEntries(accepted);
            if (!groupedEntries || !groupedEntries.size) {
              throw new Error("Mappán kívül teljes mappát húzz be vagy válassz ki.");
            }
            const totalFolders = groupedEntries.size;
            let folderIndex = 0;
            for (const [folderName, folderEntries] of groupedEntries.entries()) {
              folderIndex += 1;
              if (archiveUploadStatus) {
                archiveUploadStatus.textContent = `Feltöltés előkészítése: ${folderIndex} / ${totalFolders} mappa`;
              }
              await ensureArchiveUploadFolder(folderName);
              uploadedCount += await uploadArchiveBatchesToFolder(folderName, folderEntries, {
                completedBytes: progressState.completedBytes,
                totalBytes: progressState.totalBytes,
                folderIndex,
                totalFolders,
              });
              progressState.completedBytes += sumArchiveUploadBytes(folderEntries);
            }
            await loadArchiveFolders();
          }
          if (archiveUploadStatus) {
            const skippedText = skipped.length ? ` ${skipped.length} fájl kihagyva.` : "";
            archiveUploadStatus.textContent = `${uploadedCount} fájl feltöltve.${skippedText}`;
          }
        } catch (error) {
          console.error("Archívum feltöltési hiba:", error);
          if (archiveUploadStatus) {
            archiveUploadStatus.textContent = error.message || "Nem sikerült feltölteni a fájlokat.";
          }
        }
      }

      if (archiveUploadBtn && archiveUploadInput) {
        archiveUploadBtn.addEventListener("click", () => {
          if (!hasArchiveEditAccess()) {
            return;
          }
          if (!openedArchiveFolder) {
            openArchiveUploadPicker({ directory: true });
            return;
          }
          openArchiveUploadPicker({ directory: false });
        });

        archiveUploadInput.addEventListener("change", async () => {
          const entries = buildArchiveUploadEntries(archiveUploadInput.files);
          await uploadArchiveFileEntries(entries);
          archiveUploadInput.value = "";
        });
      }

      if (typeof archiveFolderUploadInput !== "undefined" && archiveFolderUploadInput) {
        archiveFolderUploadInput.addEventListener("change", async () => {
          const entries = buildArchiveUploadEntries(archiveFolderUploadInput.files);
          await uploadArchiveFileEntries(entries);
          archiveFolderUploadInput.value = "";
        });
      }

      function bindArchiveDropTarget(target) {
        if (!target) {
          return;
        }

        target.addEventListener("dragover", (event) => {
          if (!hasArchiveEditAccess() || !currentArchiveCategory || isArchiveVideoCategory()) {
            return;
          }
          event.preventDefault();
          archiveFileGrid?.classList.add("archive-file-grid--drag-over");
          archiveUploadBtn?.classList.add("archive-upload-btn--drag-over");
        });

        target.addEventListener("dragleave", () => {
          archiveFileGrid?.classList.remove("archive-file-grid--drag-over");
          archiveUploadBtn?.classList.remove("archive-upload-btn--drag-over");
        });

        target.addEventListener("drop", async (event) => {
          if (!hasArchiveEditAccess() || !currentArchiveCategory || isArchiveVideoCategory()) {
            return;
          }
          event.preventDefault();
          archiveFileGrid?.classList.remove("archive-file-grid--drag-over");
          archiveUploadBtn?.classList.remove("archive-upload-btn--drag-over");
          const entries = await buildArchiveDropEntries(event.dataTransfer);
          await uploadArchiveFileEntries(entries);
        });
      }

      bindArchiveDropTarget(archiveBrowser);
      bindArchiveDropTarget(archiveUploadBtn);
      bindArchiveDropTarget(archiveFileGrid);

      if (archiveVideoSearchInput) {
        archiveVideoSearchInput.addEventListener("input", () => {
          archiveVideoFilters.search = archiveVideoSearchInput.value.trim();
          archiveVideoFilters.page = 1;
          if (archiveVideoSearchTimeout) {
            clearTimeout(archiveVideoSearchTimeout);
          }
          archiveVideoSearchTimeout = setTimeout(() => {
            loadArchiveVideos();
          }, 450);
        });
      }

      if (archiveSortOrderSelect) {
        archiveSortOrderSelect.addEventListener("change", () => {
          archiveVideoFilters.sort = archiveSortOrderSelect.value === "oldest" ? "oldest" : "newest";
          localStorage.setItem(ARCHIVE_VIDEO_SORT_ORDER_KEY, archiveVideoFilters.sort);
          archiveVideoFilters.page = 1;
          loadArchiveVideos();
        });
      }

      if (archivePageSizeSelect) {
        archivePageSizeSelect.addEventListener("change", () => {
          const selected = Number.parseInt(archivePageSizeSelect.value, 10);
          const allowed = [12, 24, 40, 80];
          archiveVideoFilters.limit = allowed.includes(selected) ? selected : archiveVideoFilters.limit;
          localStorage.setItem(ARCHIVE_VIDEO_PAGE_SIZE_KEY, archiveVideoFilters.limit);
          archiveVideoFilters.page = 1;
          loadArchiveVideos();
        });
      }

      if (archiveFilterResetBtn) {
        archiveFilterResetBtn.addEventListener("click", () => {
          archiveVideoFilters.page = 1;
          archiveVideoFilters.search = "";
          archiveVideoFilters.tag = [];
          archiveVideoFilters.sort = "newest";
          if (archiveVideoSearchTimeout) {
            clearTimeout(archiveVideoSearchTimeout);
            archiveVideoSearchTimeout = null;
          }
          if (archiveVideoSearchInput) archiveVideoSearchInput.value = "";
          if (archiveSortOrderSelect) {
            archiveSortOrderSelect.value = archiveVideoFilters.sort;
            localStorage.setItem(ARCHIVE_VIDEO_SORT_ORDER_KEY, archiveVideoFilters.sort);
          }
          renderArchiveTagSelector();
          loadArchiveVideos();
        });
      }

      if (archiveVideoQualitySelect) {
        archiveVideoQualitySelect.addEventListener("change", async () => {
          const selectedQuality = normalizeQualityPreference(archiveVideoQualitySelect.value);
          const previousQuality = currentVideoQuality;
          applyQualityPreference(selectedQuality);
          archiveVideoQualitySelect.value = currentVideoQuality;

          if (!isUserLoggedIn()) {
            return;
          }

          try {
            await saveQualityPreferenceToServer(selectedQuality);
          } catch (error) {
            console.error("Minőség beállítás mentése sikertelen:", error);
            showArchiveVideoToast(error.message || "Nem sikerült menteni a minőségi beállítást.");
            applyQualityPreference(previousQuality);
            archiveVideoQualitySelect.value = currentVideoQuality;
          }
        });
      }

      if (archiveShowUploadModalBtn) {
        archiveShowUploadModalBtn.addEventListener("click", () => {
          if (!isUserLoggedIn()) {
            alert("A feltöltéshez be kell jelentkezned.");
            return;
          }
          if (!hasArchiveEditAccess()) {
            alert("A feltöltéshez archívum szerkesztési jogosultság szükséges.");
            return;
          }
          if (!isArchiveVideoFolderOpen()) {
            alert("Nyiss meg egy mappát a feltöltéshez.");
            return;
          }
          openArchiveVideoUploadModal();
        });
      }

      if (archiveCloseUploadModalBtn) {
        archiveCloseUploadModalBtn.addEventListener("click", closeArchiveVideoUploadModal);
      }

      if (archiveVideoUploadModal) {
        archiveVideoUploadModal.addEventListener("click", (event) => {
          if (event.target === archiveVideoUploadModal) {
            closeArchiveVideoUploadModal();
          }
        });
      }

      if (archiveThumbnailPickerCloseBtn) {
        archiveThumbnailPickerCloseBtn.addEventListener("click", () => {
          closeArchiveThumbnailPicker();
        });
      }

      if (archiveThumbnailPickerCancelBtn) {
        archiveThumbnailPickerCancelBtn.addEventListener("click", () => {
          closeArchiveThumbnailPicker();
        });
      }

      if (archiveThumbnailPickerModal) {
        archiveThumbnailPickerModal.addEventListener("click", (event) => {
          if (event.target === archiveThumbnailPickerModal) {
            closeArchiveThumbnailPicker();
          }
        });
      }

      if (archiveThumbnailPickerSaveBtn) {
        archiveThumbnailPickerSaveBtn.addEventListener("click", () => {
          saveArchiveThumbnailFromPicker();
        });
      }

      if (archiveThumbnailPickerStepBackBtn) {
        archiveThumbnailPickerStepBackBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailPicker(-ARCHIVE_THUMBNAIL_STEP_SECONDS);
        });
      }

      if (archiveThumbnailPickerStepForwardBtn) {
        archiveThumbnailPickerStepForwardBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailPicker(ARCHIVE_THUMBNAIL_STEP_SECONDS);
        });
      }

      if (archiveThumbnailCaptureFrameBtn) {
        archiveThumbnailCaptureFrameBtn.addEventListener("click", () => {
          captureArchiveThumbnailFrame(true);
        });
      }

      if (archiveThumbnailZoomRange) {
        archiveThumbnailZoomRange.addEventListener("input", () => {
          applyArchiveThumbnailCropZoom(archiveThumbnailZoomRange.value);
        });
      }

      if (archiveThumbnailZoomInBtn) {
        archiveThumbnailZoomInBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailCropZoom(ARCHIVE_THUMBNAIL_ZOOM_STEP);
        });
      }

      if (archiveThumbnailZoomOutBtn) {
        archiveThumbnailZoomOutBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailCropZoom(-ARCHIVE_THUMBNAIL_ZOOM_STEP);
        });
      }

      if (archiveThumbnailPanUpBtn) {
        archiveThumbnailPanUpBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailCropPosition(0, -ARCHIVE_THUMBNAIL_PAN_STEP_PX);
        });
      }

      if (archiveThumbnailPanLeftBtn) {
        archiveThumbnailPanLeftBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailCropPosition(-ARCHIVE_THUMBNAIL_PAN_STEP_PX, 0);
        });
      }

      if (archiveThumbnailPanRightBtn) {
        archiveThumbnailPanRightBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailCropPosition(ARCHIVE_THUMBNAIL_PAN_STEP_PX, 0);
        });
      }

      if (archiveThumbnailPanDownBtn) {
        archiveThumbnailPanDownBtn.addEventListener("click", () => {
          nudgeArchiveThumbnailCropPosition(0, ARCHIVE_THUMBNAIL_PAN_STEP_PX);
        });
      }

      if (archiveThumbnailCropResetBtn) {
        archiveThumbnailCropResetBtn.addEventListener("click", () => {
          resetArchiveThumbnailCropAdjustments();
        });
      }

      if (archiveThumbnailCropCanvas) {
        archiveThumbnailCropCanvas.addEventListener("dragstart", (event) => {
          event.preventDefault();
        });
      }

      if (archiveThumbnailCropStage) {
        archiveThumbnailCropStage.addEventListener("wheel", (event) => {
          if (!archiveThumbnailPickerState?.cropFrameReady || !isArchiveThumbnailPickerOpen()) {
            return;
          }
          event.preventDefault();
          const zoomStep = event.deltaY < 0 ? ARCHIVE_THUMBNAIL_ZOOM_STEP : -ARCHIVE_THUMBNAIL_ZOOM_STEP;
          nudgeArchiveThumbnailCropZoom(zoomStep);
        }, { passive: false });

        archiveThumbnailCropStage.addEventListener("mousedown", (event) => {
          if (event.button !== 0 || !archiveThumbnailPickerState?.cropFrameReady || !isArchiveThumbnailPickerOpen()) {
            return;
          }
          event.preventDefault();
          archiveThumbnailPickerState.cropDragging = true;
          archiveThumbnailPickerState.cropDragStartX = event.clientX;
          archiveThumbnailPickerState.cropDragStartY = event.clientY;
          archiveThumbnailPickerState.cropStartPanX = Number.parseFloat(archiveThumbnailPickerState.cropPanX) || 0;
          archiveThumbnailPickerState.cropStartPanY = Number.parseFloat(archiveThumbnailPickerState.cropPanY) || 0;
          renderArchiveThumbnailCropEditor();
        });
      }

      window.addEventListener("mousemove", (event) => {
        if (!archiveThumbnailPickerState?.cropDragging || !isArchiveThumbnailPickerOpen()) {
          return;
        }

        const deltaX = event.clientX - archiveThumbnailPickerState.cropDragStartX;
        const deltaY = event.clientY - archiveThumbnailPickerState.cropDragStartY;
        archiveThumbnailPickerState.cropPanX = (archiveThumbnailPickerState.cropStartPanX || 0) + deltaX;
        archiveThumbnailPickerState.cropPanY = (archiveThumbnailPickerState.cropStartPanY || 0) + deltaY;
        renderArchiveThumbnailCropEditor();
      });

      window.addEventListener("mouseup", () => {
        if (!archiveThumbnailPickerState?.cropDragging) {
          return;
        }
        archiveThumbnailPickerState.cropDragging = false;
        renderArchiveThumbnailCropEditor();
      });

      window.addEventListener("resize", () => {
        if (!archiveThumbnailPickerState?.cropFrameReady || !isArchiveThumbnailPickerOpen()) {
          return;
        }
        renderArchiveThumbnailCropEditor();
      });

      if (archiveThumbnailPickerSlider) {
        archiveThumbnailPickerSlider.addEventListener("input", () => {
          if (!archiveThumbnailPickerState || !archiveThumbnailPickerVideo) {
            return;
          }
          const nextTime = Number.parseFloat(archiveThumbnailPickerSlider.value);
          if (!Number.isFinite(nextTime)) {
            return;
          }
          archiveThumbnailPickerVideo.currentTime = nextTime;
          syncArchiveThumbnailPickerTimeline(nextTime);
        });
      }

      if (archiveThumbnailPickerVideo) {
        archiveThumbnailPickerVideo.addEventListener("loadedmetadata", () => {
          if (!archiveThumbnailPickerState) {
            return;
          }
          const duration = getArchiveThumbnailPickerDurationSeconds();
          if (archiveThumbnailPickerSlider) {
            archiveThumbnailPickerSlider.max = String(duration);
            archiveThumbnailPickerSlider.value = "0";
          }

          setArchiveThumbnailPickerControlsEnabled(duration > 0);
          setArchiveThumbnailPickerBusyState(false);
          syncArchiveThumbnailPickerTimeline(0);
          if (archiveThumbnailPickerHintEl) {
            archiveThumbnailPickerHintEl.textContent = duration > 0
              ? "Allitsd meg a videot a kivant kepkockanal, majd egerrel huzd a kepet es gorgetovel zoomolj."
              : "Nem sikerult beolvasni a video hosszat.";
          }
          captureArchiveThumbnailFrame(true);
        });

        archiveThumbnailPickerVideo.addEventListener("loadeddata", () => {
          if (!archiveThumbnailPickerState) {
            return;
          }
          captureArchiveThumbnailFrame(true);
        });

        archiveThumbnailPickerVideo.addEventListener("seeked", () => {
          if (!archiveThumbnailPickerState) {
            return;
          }
          captureArchiveThumbnailFrame(true);
        });

        archiveThumbnailPickerVideo.addEventListener("pause", () => {
          if (!archiveThumbnailPickerState) {
            return;
          }
          captureArchiveThumbnailFrame(true);
        });

        archiveThumbnailPickerVideo.addEventListener("timeupdate", () => {
          if (!archiveThumbnailPickerState) {
            return;
          }
          syncArchiveThumbnailPickerTimeline();
          if (archiveThumbnailPickerVideo.paused) {
            captureArchiveThumbnailFrame();
          }
        });

        archiveThumbnailPickerVideo.addEventListener("error", () => {
          if (!archiveThumbnailPickerState) {
            return;
          }

          if (!archiveThumbnailPickerState.isUsingOriginalSource && archiveThumbnailPickerState.originalSource) {
            archiveThumbnailPickerState.isUsingOriginalSource = true;
            archiveThumbnailPickerVideo.src = archiveThumbnailPickerState.originalSource;
            archiveThumbnailPickerVideo.load();
            return;
          }

          setArchiveThumbnailPickerControlsEnabled(false);
          setArchiveThumbnailPickerBusyState(false);
          destroyArchiveThumbnailCropper();
          if (archiveThumbnailPickerSaveBtn) {
            archiveThumbnailPickerSaveBtn.disabled = true;
          }
          if (archiveThumbnailPickerHintEl) {
            archiveThumbnailPickerHintEl.textContent = "Nem sikerult betolteni a videot.";
          }
        });
      }

      if (archiveDropZone && archiveVideoFileInput) {
        archiveDropZone.addEventListener("click", () => archiveVideoFileInput.click());
        archiveDropZone.addEventListener("dragover", (event) => {
          event.preventDefault();
          archiveDropZone.classList.add("drag-over");
        });
        ["dragleave", "dragend"].forEach((eventName) => {
          archiveDropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            archiveDropZone.classList.remove("drag-over");
          });
        });
        archiveDropZone.addEventListener("drop", (event) => {
          event.preventDefault();
          archiveDropZone.classList.remove("drag-over");
          const files = event.dataTransfer?.files;
          if (files && files.length > 0) {
            handleArchiveFileSelection(files);
          }
        });
      }

      if (archiveAddFilesBtn && archiveVideoFileInput) {
        archiveAddFilesBtn.addEventListener("click", () => archiveVideoFileInput.click());
      }

      if (archiveAddMoreVideosBtn && archiveVideoFileInput) {
        archiveAddMoreVideosBtn.addEventListener("click", () => archiveVideoFileInput.click());
      }

      if (archiveVideoFileInput) {
        archiveVideoFileInput.addEventListener("change", (event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            handleArchiveFileSelection(files);
          }
        });
      }

      if (archiveGlobalTagSelect) {
        archiveGlobalTagSelect.addEventListener("change", () => {
          const selected = getSelectValues(archiveGlobalTagSelect);
          archiveUploadQueue = archiveUploadQueue.map((item) => ({ ...item, tags: [...selected] }));
          renderArchiveUploadQueue();
        });
      }

      if (archiveNewTagColorInput && archiveTagColorButton) {
        const updateArchiveTagColorPreview = () => {
          const color = normalizeColor(archiveNewTagColorInput.value || DEFAULT_TAG_COLOR);
          archiveTagColorButton.style.setProperty("--tag-color", color);
        };
        archiveTagColorButton.addEventListener("click", () => archiveNewTagColorInput.click());
        archiveNewTagColorInput.addEventListener("input", updateArchiveTagColorPreview);
        updateArchiveTagColorPreview();
      }

      async function handleArchiveCreateTag() {
        if (!archiveNewTagNameInput || !archiveCreateTagStatus) return;
        const name = archiveNewTagNameInput.value.trim();
        if (!name) {
          archiveCreateTagStatus.textContent = "Add meg a címke nevét.";
          return;
        }
        const color = normalizeColor(archiveNewTagColorInput?.value || DEFAULT_TAG_COLOR);
        archiveCreateTagStatus.textContent = "Mentés...";
        try {
          const response = await fetch("/api/archive/videos/tags", {
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
          archiveNewTagNameInput.value = "";
          if (archiveNewTagColorInput) {
            archiveNewTagColorInput.value = DEFAULT_TAG_COLOR;
          }
          if (archiveTagColorButton) {
            archiveTagColorButton.style.setProperty("--tag-color", DEFAULT_TAG_COLOR);
          }
          archiveCreateTagStatus.textContent = "Címke létrehozva.";
          await fetchArchiveVideoTags();
        } catch (error) {
          archiveCreateTagStatus.textContent = error.message;
        }
      }

      async function handleArchiveDeleteTag() {
        if (!archiveCreateTagStatus) return;
        const selectedOption = archiveGlobalTagSelect?.selectedOptions?.[0];
        const tagId = Number.parseInt(selectedOption?.value, 10);
        if (!tagId) {
          archiveCreateTagStatus.textContent = "Válassz ki egy címkét a törléshez.";
          return;
        }

        archiveCreateTagStatus.textContent = "Címke törlése...";
        try {
          const response = await fetch(`/api/archive/videos/tags/${tagId}`, {
            method: "DELETE",
            headers: buildAuthHeaders(),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error((result && result.message) || "Nem sikerült létrehozni a címkét.");
          }
          archiveCreateTagStatus.textContent = "Címke törölve.";
          if (archiveGlobalTagSelect) {
            archiveGlobalTagSelect.value = "";
          }
          await fetchArchiveVideoTags();
        } catch (error) {
          archiveCreateTagStatus.textContent = error.message;
        }
      }

      if (archiveCreateTagButton) {
        archiveCreateTagButton.addEventListener("click", handleArchiveCreateTag);
      }

      if (archiveDeleteTagButton) {
        archiveDeleteTagButton.addEventListener("click", handleArchiveDeleteTag);
      }

      if (archiveCancelUploadBtn) {
        archiveCancelUploadBtn.addEventListener("click", () => {
          if (!archiveIsUploading) {
            closeArchiveVideoUploadModal();
            return;
          }

          archiveIsUploadCancelled = true;
          archiveCancelUploadBtn.disabled = true;
          if (archiveUploadStatusText) {
            archiveUploadStatusText.textContent = "Feltöltés megszakítása folyamatban...";
          }

          if (archiveCurrentUploadXhr) {
            archiveCurrentUploadXhr.abort();
          }
        });
      }

      if (archiveUploadSubmitBtn) {
        archiveUploadSubmitBtn.addEventListener("click", async () => {
          if (!isUserLoggedIn()) {
            alert("A feltöltéshez be kell jelentkezned.");
            return;
          }
          if (!isArchiveVideoFolderOpen()) {
            alert("Nyiss meg egy mappát a feltöltéshez.");
            return;
          }
          if (!archiveUploadQueue.length) {
            alert("Válassz ki legalább egy videófájlt a feltöltéshez.");
            return;
          }
          if (archiveIsUploading) {
            return;
          }

          archiveIsUploading = true;
          archiveIsUploadCancelled = false;
          archiveUploadedVideoIds = [];
          archiveUploadSubmitBtn.disabled = true;
          if (archiveCancelUploadBtn) {
            archiveCancelUploadBtn.disabled = false;
          }
          if (archiveUploadStatusText) {
            archiveUploadStatusText.textContent = "Feltöltés folyamatban...";
          }

          const totalUploadBytes = archiveUploadQueue.reduce((sum, item) => sum + (item.file?.size || 0), 0);
          const totalFiles = archiveUploadQueue.length;
          const uploadStartTime = performance.now();
          let uploadedBytesSoFar = 0;

          updateArchiveUploadProgressUI({
            uploadedBytes: 0,
            totalBytes: totalUploadBytes,
            completedFiles: 0,
            totalFiles,
            etaSeconds: Infinity,
          });

          const extractArchiveUploadErrorMessage = (xhr, result) => {
            let message = result && result.message;
            if (!message && xhr.status === 413) {
              message = "A fajl tul nagy a szerver jelenlegi feltoltesi limitjehez.";
            }
            if (!message) {
              let rawText = "";
              try {
                rawText = typeof xhr.responseText === "string" ? xhr.responseText.trim() : "";
              } catch (_error) {
                rawText = "";
              }
              if (rawText && rawText.length <= 280) {
                message = rawText;
              }
            }
            if (!message) {
              message = `Nem sikerult feltolteni a videot. (HTTP ${xhr.status || 0})`;
            }
            return message;
          };

          const updateArchiveRuntimeProgress = (uploadedBytes, index, item) => {
            const elapsedSeconds = Math.max((performance.now() - uploadStartTime) / 1000, 0.001);
            const speed = uploadedBytes / elapsedSeconds;
            const remainingBytes = Math.max(totalUploadBytes - uploadedBytes, 0);
            const etaSeconds = speed > 0 ? remainingBytes / speed : Infinity;

            let completedFiles = 0;
            let remainingForCount = uploadedBytes;
            for (const queuedItem of archiveUploadQueue) {
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

            if (archiveUploadStatusText) {
              archiveUploadStatusText.textContent = `Felt\u00f6lt\u00e9s: ${index + 1} / ${totalFiles} - "${
                item.displayName || item.file.name
              }"...`;
            }

            updateArchiveUploadProgressUI({
              uploadedBytes,
              totalBytes: totalUploadBytes,
              completedFiles,
              totalFiles,
              etaSeconds,
            });
          };

          const finalizeArchiveUploadedFile = (item, index, result) => {
            const finishedBytes = uploadedBytesSoFar + (item.file?.size || 0);
            const uploadedBytes = Math.min(finishedBytes, totalUploadBytes);
            const elapsedSeconds = Math.max((performance.now() - uploadStartTime) / 1000, 0.001);
            const speed = uploadedBytes / elapsedSeconds;
            const remainingBytes = Math.max(totalUploadBytes - uploadedBytes, 0);
            const etaSeconds = speed > 0 ? remainingBytes / speed : Infinity;

            const completedFiles = index + 1;
            updateArchiveUploadProgressUI({
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
              archiveUploadedVideoIds.push(...idsFromResponse);
            }
          };

          const uploadSingleFileDirect = (item, index) =>
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
              xhr.open("POST", `/api/archive/videos/folders/${encodeURIComponent(openedArchiveFolder)}/upload`);
              xhr.responseType = "json";
              archiveCurrentUploadXhr = xhr;

              const headers = buildAuthHeaders();
              if (headers && typeof headers === "object") {
                Object.entries(headers).forEach(([key, value]) => {
                  if (value) {
                    xhr.setRequestHeader(key, value);
                  }
                });
              }

              xhr.addEventListener("abort", () => reject(new Error(UPLOAD_ABORT_MESSAGE)));

              xhr.addEventListener("loadend", () => {
                if (archiveCurrentUploadXhr === xhr) {
                  archiveCurrentUploadXhr = null;
                }
              });

              xhr.upload.addEventListener("progress", (event) => {
                const currentFileUploaded = event.loaded || 0;
                const uploadedBytes = Math.min(uploadedBytesSoFar + currentFileUploaded, totalUploadBytes);
                updateArchiveRuntimeProgress(uploadedBytes, index, item);
              });

              xhr.addEventListener("load", () => {
                const result = xhr.response;
                if (xhr.status >= 200 && xhr.status < 300) {
                  finalizeArchiveUploadedFile(item, index, result);
                  resolve(result);
                } else {
                  reject(new Error(extractArchiveUploadErrorMessage(xhr, result)));
                }
              });

              xhr.addEventListener("error", () => {
                reject(new Error("Hálózati hiba történt a feltöltés során."));
              });

              xhr.send(formData);
            });

          const uploadSingleFileChunked = (item, index) =>
            new Promise((resolve, reject) => {
              const file = item.file;
              const fileSize = file?.size || 0;
              if (!file || fileSize <= 0) {
                reject(new Error("Ervenytelen videofajl."));
                return;
              }

              const totalChunks = Math.max(1, Math.ceil(fileSize / ARCHIVE_UPLOAD_CHUNK_SIZE_BYTES));
              const uploadId = `archive-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
              let chunkIndex = 0;

              const sendNextChunk = () => {
                if (archiveIsUploadCancelled) {
                  reject(new Error(UPLOAD_ABORT_MESSAGE));
                  return;
                }

                const chunkStart = chunkIndex * ARCHIVE_UPLOAD_CHUNK_SIZE_BYTES;
                const chunkEnd = Math.min(chunkStart + ARCHIVE_UPLOAD_CHUNK_SIZE_BYTES, fileSize);
                const chunkBlob = file.slice(chunkStart, chunkEnd);
                const formData = new FormData();

                formData.append("chunk", chunkBlob, `${file.name || "video.mp4"}.part${chunkIndex}`);
                formData.append("uploadId", uploadId);
                formData.append("chunkIndex", String(chunkIndex));
                formData.append("totalChunks", String(totalChunks));
                formData.append("totalSize", String(fileSize));
                formData.append("originalName", file.name || "video.mp4");
                formData.append("name", item.displayName || file.name || "video");
                formData.append("tags", JSON.stringify(item.tags || []));
                formData.append("lastModified", String(file.lastModified || ""));

                const xhr = new XMLHttpRequest();
                xhr.open(
                  "POST",
                  `/api/archive/videos/folders/${encodeURIComponent(openedArchiveFolder)}/upload-chunk`
                );
                xhr.responseType = "json";
                archiveCurrentUploadXhr = xhr;

                const headers = buildAuthHeaders();
                if (headers && typeof headers === "object") {
                  Object.entries(headers).forEach(([key, value]) => {
                    if (value) {
                      xhr.setRequestHeader(key, value);
                    }
                  });
                }

                xhr.addEventListener("abort", () => reject(new Error(UPLOAD_ABORT_MESSAGE)));

                xhr.addEventListener("loadend", () => {
                  if (archiveCurrentUploadXhr === xhr) {
                    archiveCurrentUploadXhr = null;
                  }
                });

                xhr.upload.addEventListener("progress", (event) => {
                  const uploadedInChunk = event.loaded || 0;
                  const uploadedBytes = Math.min(
                    uploadedBytesSoFar + chunkStart + uploadedInChunk,
                    totalUploadBytes
                  );
                  updateArchiveRuntimeProgress(uploadedBytes, index, item);
                });

                xhr.addEventListener("load", () => {
                  const result = xhr.response;
                  if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error(extractArchiveUploadErrorMessage(xhr, result)));
                    return;
                  }

                  const isLastChunk = chunkIndex >= totalChunks - 1 || result?.completed === true;
                  if (isLastChunk) {
                    finalizeArchiveUploadedFile(item, index, result);
                    resolve(result);
                    return;
                  }

                  chunkIndex += 1;
                  sendNextChunk();
                });

                xhr.addEventListener("error", () => {
                  reject(new Error("Hálózati hiba történt a chunk feltöltése során."));
                });

                xhr.send(formData);
              };

              sendNextChunk();
            });

          const uploadSingleFile = (item, index) => {
            const size = item?.file?.size || 0;
            if (size > ARCHIVE_UPLOAD_CHUNK_THRESHOLD_BYTES) {
              return uploadSingleFileChunked(item, index);
            }
            return uploadSingleFileDirect(item, index);
          };

          try {
            for (const [index, item] of archiveUploadQueue.entries()) {
              await uploadSingleFile(item, index);
            }

            if (archiveUploadStatusText) {
              archiveUploadStatusText.textContent = "Videók sikeresen feltöltve.";
            }
            await loadArchiveVideos();
            setTimeout(() => {
              closeArchiveVideoUploadModal();
            }, 800);
          } catch (error) {
            console.error("Archív videó feltöltési hiba:", error);
            if (archiveIsUploadCancelled || error?.message === UPLOAD_ABORT_MESSAGE) {
              if (archiveUploadStatusText) {
                archiveUploadStatusText.textContent = "Feltöltés megszakítva, videók törlése...";
              }
              try {
                if (archiveUploadedVideoIds.length) {
                  await rollbackArchiveUploadedVideos([...new Set(archiveUploadedVideoIds)]);
                  if (archiveUploadStatusText) {
                    archiveUploadStatusText.textContent = "Feltöltés megszakítva, már feltöltött videók törölve.";
                  }
                } else if (archiveUploadStatusText) {
                  archiveUploadStatusText.textContent = "Feltöltés megszakítva.";
                }
              } catch (rollbackError) {
                console.error("Archív visszavonási hiba:", rollbackError);
                if (archiveUploadStatusText) {
                  archiveUploadStatusText.textContent =
                    rollbackError.message || "Nem sikerült törölni a feltöltött videókat.";
                }
              } finally {
                archiveUploadQueue = [];
                archiveFileSignatures.clear();
                renderArchiveUploadQueue();
                updateArchiveUploadSummary();
                if (archiveVideoFileInput) {
                  archiveVideoFileInput.value = "";
                }
                resetArchiveUploadProgress();
              }
            } else if (archiveUploadStatusText) {
              archiveUploadStatusText.textContent = error.message || "Nem sikerült feltölteni a videót.";
            }
          } finally {
            if (archiveUploadSubmitBtn) {
              archiveUploadSubmitBtn.disabled = archiveUploadQueue.length === 0;
            }
            if (archiveCancelUploadBtn) {
              archiveCancelUploadBtn.disabled = false;
            }
            archiveIsUploading = false;
            archiveIsUploadCancelled = false;
            archiveCurrentUploadXhr = null;
            archiveUploadedVideoIds = [];
          }
        });
      }

      if (archiveImageClose) {
        archiveImageClose.addEventListener("click", closeArchiveImage);
      }
      if (archiveImageModal) {
        archiveImageModal.addEventListener("click", (event) => {
          if (event.target === archiveImageModal) {
            closeArchiveImage();
          }
        });
      }
      if (archiveImageZoom && archiveImagePreview) {
        archiveImageZoom.addEventListener("input", (event) => {
          const zoomValue = parseFloat(event.target.value);
          setArchiveImageScale(zoomValue);
        });
      }
      if (archiveImagePrev) {
        archiveImagePrev.addEventListener("click", showPrevArchiveImage);
      }
      if (archiveImageNext) {
        archiveImageNext.addEventListener("click", showNextArchiveImage);
      }
      if (archiveImageStage) {
        archiveImageStage.addEventListener("wheel", (event) => {
          if (!archiveImageModal || !archiveImageModal.classList.contains("is-visible")) {
            return;
          }
          event.preventDefault();
          const zoomStep = event.deltaY < 0 ? 0.12 : -0.12;
          setArchiveImageScale(archiveImageScale + zoomStep, event.clientX, event.clientY);
        }, { passive: false });

        archiveImageStage.addEventListener("mousedown", (event) => {
          if (event.button !== 0 || archiveImageScale <= 1 || !archiveImageModal?.classList.contains("is-visible")) {
            return;
          }
          event.preventDefault();
          archiveImageDragging = true;
          archiveImageDragStartX = event.clientX - archiveImagePanX;
          archiveImageDragStartY = event.clientY - archiveImagePanY;
          applyArchiveImageTransform();
        });
      }
      if (archiveImagePreview) {
        archiveImagePreview.addEventListener("dragstart", (event) => {
          event.preventDefault();
        });
      }
      window.addEventListener("mousemove", (event) => {
        if (!archiveImageDragging || !archiveImageModal?.classList.contains("is-visible")) {
          return;
        }
        archiveImagePanX = event.clientX - archiveImageDragStartX;
        archiveImagePanY = event.clientY - archiveImageDragStartY;
        applyArchiveImageTransform();
      });
      window.addEventListener("mouseup", () => {
        if (!archiveImageDragging) {
          return;
        }
        archiveImageDragging = false;
        applyArchiveImageTransform();
      });
      document.addEventListener("keydown", (event) => {
        if (!isArchiveImageModalOpen()) {
          return;
        }

        const eventTarget = event.target;
        const targetTag = typeof eventTarget?.tagName === "string" ? eventTarget.tagName.toLowerCase() : "";
        if (targetTag === "input" || targetTag === "textarea" || eventTarget?.isContentEditable) {
          return;
        }

        if (event.key === "Escape") {
          closeArchiveImage();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          showNextArchiveImage();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          showPrevArchiveImage();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (!isArchiveThumbnailPickerOpen()) {
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          closeArchiveThumbnailPicker();
        }
      });

      if (archiveDocClose) {
        archiveDocClose.addEventListener("click", closeArchiveDocument);
      }
      if (archiveDocModal) {
        archiveDocModal.addEventListener("click", (event) => {
          if (event.target === archiveDocModal) {
            closeArchiveDocument();
          }
        });
      }

      renderArchiveTagSelector();
