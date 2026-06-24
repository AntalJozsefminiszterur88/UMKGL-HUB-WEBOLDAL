
      const SESSION_KEYS = {
        token: "token",
        username: "username",
        isAdmin: "isAdmin",
        canTransfer: "canTransfer",
        canViewClips: "canViewClips",
        profilePictureFilename: "profilePictureFilename",
      };

      function getStoredToken() {
        return localStorage.getItem(SESSION_KEYS.token);
      }

      function isUserLoggedIn() {
        return !!getStoredToken();
      }

      function isAdminUser() {
        return localStorage.getItem(SESSION_KEYS.isAdmin) === "true";
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

      function setUsersStatus(statusEl, message, isError = false) {
        if (!statusEl) {
          return;
        }
        statusEl.textContent = message;
        statusEl.classList.toggle("users-window__status--error", isError);
      }

      function createPermissionToggle(name, checked, labelText) {
        const label = document.createElement("label");
        label.className = "permission-toggle";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = name;
        checkbox.checked = checked;

        label.appendChild(checkbox);
        label.append(` ${labelText}`);

        return { label, checkbox };
      }

      function renderUserList(users, container, saveButton) {
        if (!container) {
          return;
        }

        container.innerHTML = "";

        if (!Array.isArray(users) || users.length === 0) {
          container.textContent = "Nincs megjeleníthető felhasználó.";
          if (saveButton) {
            saveButton.disabled = true;
          }
          return;
        }

        const table = document.createElement("table");
        table.className = "user-table";

        const thead = document.createElement("thead");
        thead.innerHTML = `
          <tr>
            <th>Felhasználónév</th>
            <th>Feltöltési jog</th>
            <th>P2P jog</th>
            <th>Klipnézési jog</th>
            <th>Archívum megtekintés</th>
            <th>Archívum szerkesztés</th>
            <th>Discord 2 jog</th>
            <th>Max fájlméret (MB)</th>
            <th>Videólimit</th>
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

          const uploadPermission = createPermissionToggle("canUpload", Number(user.can_upload) === 1, "Feltölthet");
          const uploadCell = document.createElement("td");
          uploadCell.appendChild(uploadPermission.label);
          row.appendChild(uploadCell);

          const transferPermission = createPermissionToggle("canTransfer", Number(user.can_transfer) === 1, "P2P");
          const transferCell = document.createElement("td");
          transferCell.appendChild(transferPermission.label);
          row.appendChild(transferCell);

          const clipPermission = createPermissionToggle("canViewClips", Number(user.can_view_clips) === 1, "Klipek");
          const clipCell = document.createElement("td");
          clipCell.appendChild(clipPermission.label);
          row.appendChild(clipCell);

          const canEditArchive = Number(user.can_edit_archive) === 1;
          const archiveViewPermission = createPermissionToggle(
            "canViewArchive",
            Number(user.can_view_archive) === 1 || canEditArchive,
            "Archívum"
          );
          const archiveViewCell = document.createElement("td");
          archiveViewCell.appendChild(archiveViewPermission.label);
          row.appendChild(archiveViewCell);

          const archiveEditPermission = createPermissionToggle("canEditArchive", canEditArchive, "Szerkesztés");
          const archiveEditCell = document.createElement("td");
          archiveEditCell.appendChild(archiveEditPermission.label);
          row.appendChild(archiveEditCell);

          const discordPermission = createPermissionToggle(
            "canUseDiscord",
            Number(user.can_use_discord) === 1,
            "Discord 2"
          );
          const discordCell = document.createElement("td");
          discordCell.appendChild(discordPermission.label);
          row.appendChild(discordCell);

          archiveViewPermission.checkbox.addEventListener("change", () => {
            if (!archiveViewPermission.checkbox.checked) {
              archiveEditPermission.checkbox.checked = false;
            }
          });

          archiveEditPermission.checkbox.addEventListener("change", () => {
            if (archiveEditPermission.checkbox.checked) {
              archiveViewPermission.checkbox.checked = true;
            }
          });

          const maxFileSizeCell = document.createElement("td");
          const maxFileSizeInput = document.createElement("input");
          maxFileSizeInput.type = "number";
          maxFileSizeInput.min = "1";
          maxFileSizeInput.required = true;
          maxFileSizeInput.name = "maxFileSizeMb";
          maxFileSizeInput.value = Number.parseInt(user.max_file_size_mb, 10) || "";
          maxFileSizeCell.appendChild(maxFileSizeInput);
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

          const uploadCountCell = document.createElement("td");
          uploadCountCell.textContent = Number.parseInt(user.upload_count, 10) || 0;
          row.appendChild(uploadCountCell);

          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        container.appendChild(table);

        if (saveButton) {
          saveButton.disabled = false;
        }
      }

      async function fetchUsers() {
        const response = await fetch("/api/users", {
          method: "GET",
          headers: buildAuthHeaders(),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Nem sikerült betölteni a felhasználókat.");
        }

        return Array.isArray(data) ? data : [];
      }

      function collectPermissionUpdates(container) {
        const tableBody = container?.querySelector("tbody");
        if (!tableBody) {
          return { updates: [], invalidEntries: [] };
        }

        const invalidEntries = [];
        const updates = Array.from(tableBody.querySelectorAll("tr"))
          .map((row) => {
            const uploadCheckbox = row.querySelector('input[name="canUpload"]');
            const transferCheckbox = row.querySelector('input[name="canTransfer"]');
            const viewClipsCheckbox = row.querySelector('input[name="canViewClips"]');
            const viewArchiveCheckbox = row.querySelector('input[name="canViewArchive"]');
            const editArchiveCheckbox = row.querySelector('input[name="canEditArchive"]');
            const discordCheckbox = row.querySelector('input[name="canUseDiscord"]');
            const maxFileSizeInput = row.querySelector('input[name="maxFileSizeMb"]');
            const maxVideosInput = row.querySelector('input[name="maxVideos"]');
            const userId = Number.parseInt(row.dataset.userId, 10);

            if (
              !uploadCheckbox ||
              !transferCheckbox ||
              !viewClipsCheckbox ||
              !viewArchiveCheckbox ||
              !editArchiveCheckbox ||
              !discordCheckbox ||
              !maxFileSizeInput ||
              !maxVideosInput ||
              !Number.isFinite(userId)
            ) {
              return null;
            }

            const maxFileSizeMb = Number.parseInt(maxFileSizeInput.value, 10);
            const maxVideos = Number.parseInt(maxVideosInput.value, 10);

            if (maxFileSizeMb <= 0 || maxVideos <= 0 || !Number.isFinite(maxFileSizeMb) || !Number.isFinite(maxVideos)) {
              invalidEntries.push(row.querySelector("td")?.textContent.trim() || `ID ${userId}`);
              return null;
            }

            const canEditArchive = editArchiveCheckbox.checked;

            return {
              userId,
              canUpload: uploadCheckbox.checked,
              canTransfer: transferCheckbox.checked,
              canViewClips: viewClipsCheckbox.checked,
              canViewArchive: viewArchiveCheckbox.checked || canEditArchive,
              canEditArchive,
              canUseDiscord: discordCheckbox.checked,
              maxFileSizeMb,
              maxVideos,
            };
          })
          .filter(Boolean);

        return { updates, invalidEntries };
      }

      async function updateUserPermissions(updates) {
        const response = await fetch("/api/users/permissions/batch-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify(updates),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Nem sikerült menteni a jogosultságokat.");
        }

        return data;
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

        return date.toLocaleString("hu-HU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      function parseDateToTimestamp(value) {
        const date = new Date(value);
        const timestamp = date.getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      }

      function getSortableValue(clip, key) {
        switch (key) {
          case "id":
            return Number(clip.id) || 0;
          case "original_name":
            return (clip.original_name || clip.filename || "").toString().toLowerCase();
          case "sizeBytes":
            return Number(clip.sizeBytes) || 0;
          case "uploaded_at":
          case "content_created_at":
            return parseDateToTimestamp(clip[key]);
          default:
            return 0;
        }
      }

      function sortClips(items, sortState) {
        if (!sortState?.key) {
          return [...items];
        }

        const direction = sortState.direction === "asc" ? 1 : -1;

        return [...items].sort((a, b) => {
          const aValue = getSortableValue(a, sortState.key);
          const bValue = getSortableValue(b, sortState.key);

          if (aValue < bValue) {
            return -1 * direction;
          }
          if (aValue > bValue) {
            return 1 * direction;
          }
          return 0;
        });
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

      async function handleClipDelete(clipId, rowElement, button, clipName, statusEl, onDelete) {
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

          if (typeof onDelete === "function") {
            onDelete(clipId);
          }

          if (statusEl) {
            statusEl.textContent = data?.message || "A klip törlése sikeres volt.";
          }
        } catch (error) {
          console.error("Klip törlési hiba:", error);
          if (statusEl) {
            statusEl.textContent = error.message || "Nem sikerült törölni a klipet.";
          }
        } finally {
          if (button) {
            button.disabled = false;
          }
        }
      }

      async function handleClipTitleEdit(clip, nameTextEl, statusEl) {
        const currentTitle = clip.original_name || "Ismeretlen";
        const updatedTitle = window.prompt("Add meg az új klipcímet:", currentTitle);

        if (updatedTitle === null) {
          return;
        }

        const normalizedTitle = updatedTitle.trim();
        if (!normalizedTitle || normalizedTitle === currentTitle) {
          return;
        }

        try {
          const response = await fetch(`/api/videos/${clip.id}/title`, {
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
          clip.original_name = newTitle;
          if (nameTextEl) {
            nameTextEl.textContent = newTitle;
          }
          if (statusEl) {
            statusEl.textContent = data?.message || "A klip címe frissült.";
          }
        } catch (error) {
          console.error("Klip cím módosítási hiba:", error);
          if (statusEl) {
            statusEl.textContent = error.message || "Nem sikerült frissíteni a klip címét.";
          }
        }
      }

      function renderClipTable(statusEl, tableContainer, items, countEl, isAdmin, sortState, onSortChange, onDelete) {
        if (!tableContainer) {
          return;
        }

        tableContainer.innerHTML = "";

        const sortedItems = Array.isArray(items) ? sortClips(items, sortState) : [];

        if (!sortedItems.length) {
          const empty = document.createElement("p");
          empty.className = "clip-window__status";
          empty.textContent = "Nincs megjeleníthető klip.";
          tableContainer.appendChild(empty);
          if (statusEl) {
            statusEl.textContent = "Nincs megjeleníthető klip.";
          }
          if (countEl) {
            countEl.textContent = "(0 találat)";
          }
          return;
        }

        if (statusEl) {
          statusEl.textContent = "";
        }

        const table = document.createElement("table");
        table.className = "clip-window__table";

        const sortableColumns = new Set(["id", "original_name", "sizeBytes", "uploaded_at", "content_created_at"]);

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        const columns = [
          { key: "id", label: "Azonosító" },
          { key: "original_name", label: "Fájlnév" },
          { key: "sizeBytes", label: "Méret" },
          { key: "uploaded_at", label: "Feltöltve" },
          { key: "content_created_at", label: "Létrehozva" },
          { key: "extra", label: "Egyéb" },
          { key: "actions", label: "Művelet" },
        ];

        columns.forEach((column) => {
          const th = document.createElement("th");
          th.textContent = column.label;

          if (sortableColumns.has(column.key) && typeof onSortChange === "function") {
            th.classList.add("clip-window__sortable");
            th.dataset.sortKey = column.key;

            const indicator = document.createElement("span");
            indicator.className = "clip-window__sort-indicator";
            const isActive = sortState?.key === column.key;
            indicator.textContent = isActive ? (sortState.direction === "asc" ? "▲" : "▼") : "↕";

            th.appendChild(indicator);
            th.addEventListener("click", () => onSortChange(column.key));
          }

          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        sortedItems.forEach((clip) => {
          const row = document.createElement("tr");

          const idCell = document.createElement("td");
          idCell.textContent = clip.id ?? "-";
          row.appendChild(idCell);

          const nameCell = document.createElement("td");
          nameCell.className = "clip-window__name";

          const nameText = document.createElement("span");
          nameText.className = "clip-window__name-text";
          nameText.textContent = clip.original_name || "Ismeretlen";
          nameCell.appendChild(nameText);

          if (isAdmin) {
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "clip-window__edit";
            editBtn.title = "Klip címének szerkesztése";
            editBtn.textContent = "✏️";
            editBtn.addEventListener("click", () => {
              handleClipTitleEdit(clip, nameText, statusEl);
            });
            nameCell.appendChild(editBtn);
          }

          row.appendChild(nameCell);

          const sizeCell = document.createElement("td");
          sizeCell.textContent = formatFileSize(Number(clip.sizeBytes));
          row.appendChild(sizeCell);

          const uploadedCell = document.createElement("td");
          uploadedCell.textContent = formatDateTime(clip.uploaded_at);
          row.appendChild(uploadedCell);

          const createdCell = document.createElement("td");
          createdCell.textContent = formatDateTime(clip.content_created_at);
          row.appendChild(createdCell);

          const extraCell = document.createElement("td");
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

          const actionCell = document.createElement("td");
          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.textContent = "Törlés";
          deleteBtn.className = "clip-window__delete";
          deleteBtn.addEventListener("click", () => {
            handleClipDelete(clip.id, row, deleteBtn, clip.original_name, statusEl, onDelete);
          });
          actionCell.appendChild(deleteBtn);
          row.appendChild(actionCell);

          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableContainer.appendChild(table);

        if (countEl) {
          countEl.textContent = `(${items.length} találat)`;
        }
      }

      function formatHungarianDate(value) {
        if (!value) {
          return "Ismeretlen";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return "Ismeretlen";
        }

        return date.toLocaleString("hu-HU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      async function fetchProcessingStatus() {
        const response = await fetch("/api/admin/processing-status", {
          headers: buildAuthHeaders(),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message = data?.message || "Nem sikerült lekérdezni a feldolgozási állapotot.";
          throw new Error(message);
        }

        return {
          isProcessing: Boolean(data?.isProcessing),
          currentTask: data?.currentTask || null,
          pending: Array.isArray(data?.pending) ? data.pending : [],
          queues: data?.queues || null,
        };
      }

      async function readApiResponse(response) {
        const contentType = response.headers.get("content-type") || "";
        const rawText = await response.text().catch(() => "");
        let parsedBody = null;

        if (rawText) {
          try {
            parsedBody = JSON.parse(rawText);
          } catch (_err) {
            parsedBody = null;
          }
        }

        return {
          contentType,
          rawText,
          parsedBody,
        };
      }

      async function fetchRadnaiStatus() {
        const response = await fetch("/api/admin/radnai-status", {
          headers: buildAuthHeaders(),
        });

        const responseInfo = await readApiResponse(response);
        const data = responseInfo.parsedBody || {};
        if (!response.ok) {
          const message = data?.message || `Nem sikerult lekerdezni a Radnai figyelo allapotat (HTTP ${response.status}).`;
          throw new Error(message);
        }

        return {
          httpStatus: response.status,
          rawResponse: responseInfo.rawText,
          monitorEnabled: data?.monitorEnabled !== false,
          status: data?.status || "unknown",
          lastCheck: data?.lastCheck || null,
          hash: data?.hash || null,
          failureReason: data?.failureReason || null,
          consecutiveFailures: Number.isFinite(Number(data?.consecutiveFailures)) ? Number(data.consecutiveFailures) : 0,
          outageActive: data?.outageActive === true,
          lastOutageAlertAt: data?.lastOutageAlertAt || null,
        };
      }

      function renderProcessingCard(container, item, titlePrefix) {
        if (!container) {
          return;
        }

        container.innerHTML = "";

        if (!item) {
          const empty = document.createElement("p");
          empty.className = "process-window__empty";
          empty.textContent = "Jelenleg nincs aktív feldolgozási feladat.";
          container.appendChild(empty);
          return;
        }

        const title = document.createElement("h3");
        title.textContent = `${titlePrefix || "Fájl"}: ${item.original_name || item.filename || "Ismeretlen"}`;
        container.appendChild(title);

        const sourceMeta = document.createElement("p");
        sourceMeta.className = "process-window__meta";
        sourceMeta.textContent = `Típus: ${item.source_type === "archive" ? "Archív videó" : "Klip"}`;
        container.appendChild(sourceMeta);

        if (item.folder_name) {
          const folderMeta = document.createElement("p");
          folderMeta.className = "process-window__meta";
          folderMeta.textContent = `Mappa: ${item.folder_name}`;
          container.appendChild(folderMeta);
        }

        const fileMeta = document.createElement("p");
        fileMeta.className = "process-window__meta";
        fileMeta.textContent = `Elérési út: ${item.filename || "-"}`;
        container.appendChild(fileMeta);

        const timeMeta = document.createElement("p");
        timeMeta.className = "process-window__meta";


        timeMeta.textContent = `Feltöltve: ${formatHungarianDate(item.uploaded_at)}`;
        container.appendChild(timeMeta);

        const statusMeta = document.createElement("p");
        statusMeta.className = "process-window__meta";
        statusMeta.textContent = `Státusz: ${item.processing_status || "ismeretlen"}`;
        container.appendChild(statusMeta);
      }

      function formatProcessingSummary(data) {
        const queues = data?.queues || {};
        const clipPending = Array.isArray(queues.clips?.pending) ? queues.clips.pending.length : 0;
        const archivePending = Array.isArray(queues.archive?.pending) ? queues.archive.pending.length : 0;

        if (data?.currentTask) {
          const sourceLabel = data.currentTask.source_type === "archive" ? "archív videó" : "klip";
          return `Aktív feldolgozás: ${sourceLabel}. Várakozik: ${clipPending} klip, ${archivePending} archív videó.`;
        }

        return `Jelenleg nincs aktív feldolgozás. Várakozik: ${clipPending} klip, ${archivePending} archív videó.`;
      }

      function renderQueue(doc, queueListEl, items) {
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
          li.className = "process-window__card";
          renderProcessingCard(li, item, `#${index + 1}`);
          queueListEl.appendChild(li);
        });
      }

      document.addEventListener("DOMContentLoaded", () => {
        console.log("Admin JS loaded: metadata verzió");
        const statusEl = document.getElementById("clipWindowStatus");
        const tableContainer = document.getElementById("clipWindowTable");
        const variantSelect = document.getElementById("clipWindowVariant");
        const countEl = document.getElementById("clipWindowCount");
        const refreshBtn = document.getElementById("refreshProcessing");
        const processingStatusText = document.getElementById("processingStatusText");
        const currentTaskEl = document.getElementById("currentProcessing");
        const queueListEl = document.getElementById("processingQueue");
        const queueCountEl = document.getElementById("processingQueueCount");
        const fetchMoviesBtn = document.getElementById("fetchMoviesBtn");
        const movieConsole = document.getElementById("movieConsole");
        const movieResults = document.getElementById("movieResults");
        const radnaiToggleBtn = document.getElementById("radnaiToggleBtn");
        const radnaiTestBtn = document.getElementById("radnaiTestBtn");
        const radnaiStatusText = document.getElementById("radnaiStatusText");
        const radnaiLastCheck = document.getElementById("radnaiLastCheck");
        const radnaiHashDisplay = document.getElementById("radnaiHashDisplay");
        const radnaiAlertMessage = document.getElementById("radnaiAlertMessage");
        const radnaiDebugLog = document.getElementById("radnaiDebugLog");
        const userListContainer = document.getElementById("userListContainer");
        const usersStatus = document.getElementById("usersStatus");
        const refreshUsersBtn = document.getElementById("refreshUsersBtn");
        const savePermissionsBtn = document.getElementById("savePermissionsBtn");
        const tabs = document.querySelectorAll(".manager__tab[data-target]");
        const sections = document.querySelectorAll(".manager__section");
        const VARIANT_STORAGE_KEY = "clipWindowVariant";
        const VALID_VARIANTS = ["original", "720p", "other"];
        const adminUser = isAdminUser();
        let clipsLoaded = false;
        let usersLoaded = false;
        let currentClips = [];
        let currentSort = { key: "uploaded_at", direction: "desc" };
        let radnaiDebugHistory = [];
        let radnaiMonitorEnabled = true;
        let radnaiTogglePending = false;
        const sortableKeys = new Set(["id", "original_name", "sizeBytes", "uploaded_at", "content_created_at"]);

        let archiveCurrentFolder = null;
        let archiveFolders = [];
        let archiveVideos = [];

        function handleSortChange(key) {
          if (!sortableKeys.has(key)) {
            return;
          }

          const isSameKey = currentSort.key === key;
          const nextDirection = isSameKey && currentSort.direction === "asc" ? "desc" : "asc";
          currentSort = {
            key,
            direction: isSameKey ? nextDirection : key === "original_name" ? "asc" : "desc",
          };

          renderCurrentClips();
        }

        function handleClipRemoval(clipId) {
          currentClips = currentClips.filter((clip) => clip.id !== clipId);
          renderCurrentClips();
        }

        const renderCurrentClips = () => {
          renderClipTable(statusEl, tableContainer, currentClips, countEl, adminUser, currentSort, handleSortChange, handleClipRemoval);
        };

        const renderMovieCards = (movies) => {
          if (!movieResults) {
            return;
          }

          movieResults.innerHTML = "";

          if (!Array.isArray(movies) || movies.length === 0) {
            movieResults.textContent = "Nincs megjelenitheto film.";
            return;
          }

          movies.forEach((movie) => {
            const card = document.createElement("div");
            card.className = "movie-card";

            const poster = document.createElement("img");
            poster.className = "movie-card__poster";
            poster.alt = movie?.title ? `${movie.title} plakat` : "Film plakat";
            poster.loading = "lazy";
            if (movie?.posterUrl) {
              poster.src = movie.posterUrl;
            }

            const details = document.createElement("div");
            details.className = "movie-card__details";

            const title = document.createElement("h4");
            title.className = "movie-card__title";
            title.textContent = movie?.title || "Ismeretlen cim";

            const category = document.createElement("p");
            category.className = "movie-card__category";
            category.textContent = movie?.category || "Kategoria: ismeretlen";

            const times = document.createElement("p");
            times.className = "movie-card__times";

            const timesLabel = document.createElement("strong");
            timesLabel.textContent = "Idopontok: ";
            times.appendChild(timesLabel);
            times.appendChild(document.createTextNode(movie?.times || "Nincs idopont"));

            details.appendChild(title);
            details.appendChild(category);
            details.appendChild(times);

            card.appendChild(poster);
            card.appendChild(details);
            movieResults.appendChild(card);
          });
        };

        const safeJsonStringify = (value) => {
          try {
            return JSON.stringify(value, null, 2);
          } catch (_err) {
            return String(value);
          }
        };

        const appendRadnaiDebug = (title, details) => {
          if (!radnaiDebugLog) {
            return;
          }

          const timestamp = new Date().toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const lines = [`[${timestamp}] ${title}`];
          if (details !== undefined && details !== null && details !== "") {
            if (typeof details === "string") {
              lines.push(details);
            } else {
              lines.push(safeJsonStringify(details));
            }
          }

          radnaiDebugHistory.push(lines.join("\n"));
          if (radnaiDebugHistory.length > 25) {
            radnaiDebugHistory = radnaiDebugHistory.slice(-25);
          }

          radnaiDebugLog.textContent = radnaiDebugHistory.join("\n\n");
        };

        const setRadnaiAlertMessage = (text, type) => {
          if (!radnaiAlertMessage) {
            return;
          }

          const normalizedType = type || "info";
          radnaiAlertMessage.className = `radnai-alert radnai-alert--${normalizedType}`;
          radnaiAlertMessage.textContent = text || "-";
        };

        const updateRadnaiToggleButton = () => {
          if (!radnaiToggleBtn) {
            return;
          }
          if (radnaiTogglePending) {
            radnaiToggleBtn.disabled = true;
            radnaiToggleBtn.textContent = "Valtas folyamatban...";
            return;
          }
          radnaiToggleBtn.disabled = false;
          radnaiToggleBtn.textContent = radnaiMonitorEnabled
            ? "Figyelés Kikapcsolása"
            : "Figyelés Bekapcsolása";
        };

        window.addEventListener("error", (event) => {
          appendRadnaiDebug("Globalis JS hiba", {
            message: event?.message || "Ismeretlen hiba",
            file: event?.filename || "",
            line: event?.lineno || "",
            column: event?.colno || "",
          });
          setRadnaiAlertMessage("JavaScript hiba tortent. Ellenorizd a hibakeresesi naplot.", "error");
        });

        window.addEventListener("unhandledrejection", (event) => {
          appendRadnaiDebug("Kezeletlen Promise hiba", event?.reason || "Ismeretlen Promise hiba");
          setRadnaiAlertMessage("Kezeletlen Promise hiba tortent. Ellenorizd a hibakeresesi naplot.", "error");
        });

        const renderRadnaiStatus = (data) => {
          radnaiMonitorEnabled = data?.monitorEnabled !== false;
          updateRadnaiToggleButton();

          if (radnaiStatusText) {
            if (!radnaiMonitorEnabled) {
              radnaiStatusText.textContent = "Statusz: KIKAPCSOLVA";
            } else {
              const status = (data?.status || "unknown").toString().toLowerCase();
              if (status === "ok") {
                radnaiStatusText.textContent = "Statusz: OK";
              } else if (status === "error") {
                const reason = data?.failureReason ? ` (${data.failureReason})` : "";
                const tries = Number(data?.consecutiveFailures) > 0 ? ` [hibak: ${data.consecutiveFailures}]` : "";
                radnaiStatusText.textContent = `Statusz: HIBA${tries}${reason}`;
              } else {
                radnaiStatusText.textContent = `Statusz: ${status}`;
              }
            }
          }

          if (radnaiLastCheck) {
            radnaiLastCheck.textContent = `Utolso ellenorzes: ${data?.lastCheck ? formatHungarianDate(data.lastCheck) : "-"}`;
          }

          if (radnaiHashDisplay) {
            radnaiHashDisplay.textContent = `Hash: ${data?.hash || "-"}`;
          }
        };

        if (!isUserLoggedIn() || !adminUser) {
          alert("Az admin felület megnyitásához admin jogosultság szükséges.");
          window.location.href = "/";
          return;
        }

        const loadUsers = async () => {
          setUsersStatus(usersStatus, "Felhasználók betöltése folyamatban...");
          if (savePermissionsBtn) {
            savePermissionsBtn.disabled = true;
          }

          try {
            const users = await fetchUsers();
            renderUserList(users, userListContainer, savePermissionsBtn);
            usersLoaded = true;
            setUsersStatus(usersStatus, `${users.length} felhasználó betöltve.`);
          } catch (error) {
            console.error("Felhasználók betöltési hiba:", error);
            setUsersStatus(usersStatus, error.message || "Nem sikerült betölteni a felhasználókat.", true);
          }
        };

        const savePermissions = async () => {
          const { updates, invalidEntries } = collectPermissionUpdates(userListContainer);

          if (invalidEntries.length > 0) {
            setUsersStatus(
              usersStatus,
              `Adj meg pozitív limiteket a következő felhasználóknál: ${invalidEntries.join(", ")}.`,
              true
            );
            return;
          }

          if (updates.length === 0) {
            setUsersStatus(usersStatus, "Nincs mentésre váró felhasználói adat.", true);
            return;
          }

          const originalText = savePermissionsBtn?.textContent || "Változtatások mentése";
          if (savePermissionsBtn) {
            savePermissionsBtn.disabled = true;
            savePermissionsBtn.textContent = "Mentés folyamatban...";
          }
          setUsersStatus(usersStatus, "Jogosultságok mentése folyamatban...");

          try {
            const result = await updateUserPermissions(updates);
            setUsersStatus(usersStatus, result?.message || "Jogosultságok sikeresen frissítve.");
            await loadUsers();
          } catch (error) {
            console.error("Jogosultságok mentési hiba:", error);
            setUsersStatus(usersStatus, error.message || "Nem sikerült menteni a jogosultságokat.", true);
          } finally {
            if (savePermissionsBtn) {
              savePermissionsBtn.disabled = false;
              savePermissionsBtn.textContent = originalText;
            }
          }
        };

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
            currentClips = items;
            renderCurrentClips();
            clipsLoaded = true;
          } catch (error) {
            console.error("Klip lista betöltési hiba:", error);
            if (statusEl) {
              statusEl.textContent = error.message || "Nem sikerült betölteni a klipeket.";
            }
          }
        };

        const loadProcessingStatus = async () => {
          if (processingStatusText) {
            processingStatusText.textContent = "Állapot betöltése folyamatban...";
          }
          renderProcessingCard(currentTaskEl, null);
          renderQueue(document, queueListEl, []);
          if (queueCountEl) {
            queueCountEl.textContent = "";
          }

          try {
            const data = await fetchProcessingStatus();
            if (processingStatusText) {
              processingStatusText.textContent = formatProcessingSummary(data);
            }

            if (queueCountEl) {
              queueCountEl.textContent = `Várakozó fájlok: ${data.pending.length}`;
            }

            renderProcessingCard(currentTaskEl, data.currentTask, "Aktív feldolgozás");
            renderQueue(document, queueListEl, data.pending);
          } catch (error) {
            console.error("Feldolgozási állapot lekérdezési hiba:", error);
            if (processingStatusText) {
              processingStatusText.textContent = error.message || "Nem sikerült lekérdezni a feldolgozási állapotot.";
            }
          }
        };

        const loadMovieData = async () => {
          if (!fetchMoviesBtn) {
            return;
          }

          const buttonLabel = fetchMoviesBtn.textContent;
          fetchMoviesBtn.disabled = true;
          fetchMoviesBtn.textContent = "Lekerdezes folyamatban...";

          if (movieConsole) {
            movieConsole.textContent = "Cinema City API lekerdezes indul...";
          }

          if (movieResults) {
            movieResults.textContent = "";
          }

          try {
            const response = await fetch("/api/admin/fetch-movies", {
              headers: buildAuthHeaders(),
            });

            const result = await response.json().catch(() => null);
            if (!response.ok) {
              const message = result?.message || "Nem sikerult lekerdezni a mozi adatokat.";
              throw new Error(message);
            }

            const logs = Array.isArray(result?.logs) ? result.logs : [];
            const movieData = Array.isArray(result?.movieData) ? result.movieData : [];

            if (movieConsole) {
              movieConsole.textContent = logs.length ? logs.join("\n") : "Nincs naplouzenet.";
            }

            if (movieResults) {
              renderMovieCards(movieData);
            }
          } catch (error) {
            console.error("Mozi adatgyujtesi hiba:", error);
            if (movieConsole) {
              movieConsole.textContent = error.message || "Nem sikerult lekerdezni a mozi adatokat.";
            }
          } finally {
            fetchMoviesBtn.disabled = false;
            fetchMoviesBtn.textContent = buttonLabel;
          }
        };

        const loadRadnaiStatus = async () => {
          if (radnaiStatusText) {
            radnaiStatusText.textContent = "Statusz betoltese folyamatban...";
          }
          setRadnaiAlertMessage("Radnai statusz lekerdezese...", "info");
          appendRadnaiDebug("Radnai statusz lekerdezes indul.");

          try {
            const statusData = await fetchRadnaiStatus();
            renderRadnaiStatus(statusData);
            setRadnaiAlertMessage(`Radnai statusz frissitve (HTTP ${statusData.httpStatus}).`, "success");
            appendRadnaiDebug("Radnai statusz valasz", {
              httpStatus: statusData.httpStatus,
              monitorEnabled: statusData.monitorEnabled,
              status: statusData.status,
              lastCheck: statusData.lastCheck,
              hash: statusData.hash,
              rawResponse: statusData.rawResponse || "",
            });
          } catch (error) {
            console.error("Radnai allapot lekerdezesi hiba:", error);
            if (radnaiStatusText) {
              radnaiStatusText.textContent = error.message || "Nem sikerult lekerdezni a Radnai allapotot.";
            }
            setRadnaiAlertMessage(error.message || "Nem sikerult lekerdezni a Radnai allapotot.", "error");
            appendRadnaiDebug("Radnai statusz lekerdezes HIBA", error?.stack || error?.message || String(error));
          }
        };

        const toggleRadnaiMonitoring = async () => {
          if (!radnaiToggleBtn) {
            return;
          }

          const nextEnabled = !radnaiMonitorEnabled;
          radnaiTogglePending = true;
          updateRadnaiToggleButton();
          setRadnaiAlertMessage(
            nextEnabled ? "Radnai figyeles bekapcsolasa folyamatban..." : "Radnai figyeles kikapcsolasa folyamatban...",
            "info"
          );
          appendRadnaiDebug("Radnai figyeles allapot valtas indul", { enabled: nextEnabled });

          try {
            const response = await fetch("/api/admin/radnai-monitor", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify({ enabled: nextEnabled }),
            });

            const responseInfo = await readApiResponse(response);
            const result = responseInfo.parsedBody || {};

            if (!response.ok) {
              const message = result?.message || `Nem sikerult valtani a Radnai figyelest (HTTP ${response.status}).`;
              appendRadnaiDebug("Radnai figyeles allapot valasz HIBA", {
                httpStatus: response.status,
                body: responseInfo.parsedBody || responseInfo.rawText,
              });
              throw new Error(message);
            }

            radnaiMonitorEnabled = result?.monitorEnabled !== false;
            setRadnaiAlertMessage(result?.message || "Radnai figyeles allapot frissitve.", "success");
            appendRadnaiDebug("Radnai figyeles allapot valasz OK", {
              httpStatus: response.status,
              body: responseInfo.parsedBody || responseInfo.rawText,
            });
            await loadRadnaiStatus();
          } catch (error) {
            console.error("Radnai figyeles allapot valtas hiba:", error);
            setRadnaiAlertMessage(error.message || "Nem sikerult valtani a Radnai figyelest.", "error");
            appendRadnaiDebug("Radnai figyeles allapot valtas kliens hiba", error?.stack || error?.message || String(error));
          } finally {
            radnaiTogglePending = false;
            updateRadnaiToggleButton();
          }
        };

        const triggerRadnaiTestAlert = async () => {
          if (!radnaiTestBtn) {
            return;
          }

          const originalLabel = radnaiTestBtn.textContent;
          radnaiTestBtn.disabled = true;
          radnaiTestBtn.textContent = "Kuldese folyamatban...";

          if (radnaiStatusText) {
            radnaiStatusText.textContent = "Teszt riado kuldese folyamatban...";
          }
          setRadnaiAlertMessage("Teszt riado kerese folyamatban...", "info");
          appendRadnaiDebug("Radnai teszt riado kuldes indul.");

          try {
            const response = await fetch("/api/admin/radnai-test", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify({}),
            });

            const responseInfo = await readApiResponse(response);
            const result = responseInfo.parsedBody || responseInfo.rawText;

            if (!response.ok) {
              const message = typeof result === "object" && result?.message
                ? result.message
                : `Nem sikerult elkuldeni a teszt riasztast (HTTP ${response.status}).`;
              appendRadnaiDebug("Radnai teszt riado valasz HIBA", {
                httpStatus: response.status,
                body: responseInfo.parsedBody || responseInfo.rawText,
              });
              throw new Error(message);
            }

            const serverMessage = typeof result === "object"
              ? result?.message
              : typeof result === "string"
                ? result
                : "";
            if (radnaiStatusText) {
              radnaiStatusText.textContent = serverMessage || "Teszt riado sikeresen elkuldve.";
            }
            setRadnaiAlertMessage(
              `Teszt riado elkuldve (HTTP ${response.status}). ${serverMessage || ""}`.trim(),
              "success"
            );
            appendRadnaiDebug("Radnai teszt riado valasz OK", {
              httpStatus: response.status,
              body: responseInfo.parsedBody || responseInfo.rawText || "(ures valasz)",
            });

            await loadRadnaiStatus();
          } catch (error) {
            console.error("Radnai teszt riado hiba:", error);
            if (radnaiStatusText) {
              radnaiStatusText.textContent = error.message || "Nem sikerult elkuldeni a teszt riasztast.";
            }
            setRadnaiAlertMessage(error.message || "Nem sikerult elkuldeni a teszt riasztast.", "error");
            appendRadnaiDebug("Radnai teszt riado kliens hiba", error?.stack || error?.message || String(error));
          } finally {
            radnaiTestBtn.disabled = false;
            radnaiTestBtn.textContent = originalLabel;
          }
        };

        function parseHungarianDate(str) {
          if (!str) return null;
          const parts = str.match(/\d+/g);
          if (!parts || parts.length < 5) return null;
          
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const hour = parseInt(parts[3], 10);
          const minute = parseInt(parts[4], 10);
          
          const d = new Date(year, month, day, hour, minute);
          return Number.isNaN(d.getTime()) ? null : d;
        }

        function renderArchiveMetaTable() {
          const tableBody = document.getElementById("archiveMetaBody");
          const currentPathEl = document.getElementById("archiveMetaCurrentPath");
          const backBtn = document.getElementById("archiveMetaBackBtn");
          
          if (!tableBody) return;
          tableBody.innerHTML = "";
          
          if (archiveCurrentFolder === null) {
            if (currentPathEl) currentPathEl.innerHTML = "📁 Gyökér (Mappák)";
            if (backBtn) backBtn.style.display = "none";
            
            if (archiveFolders.length === 0) {
              tableBody.innerHTML = `<tr><td colspan="4" class="clip-window__status">Nincs elérhető mappa az archívumban.</td></tr>`;
              return;
            }
            
            archiveFolders.forEach(folder => {
              const row = document.createElement("tr");
              row.className = "archive-folder-row";
              
              const nameCell = document.createElement("td");
              nameCell.innerHTML = `📁 <strong>${folder}</strong>`;
              row.appendChild(nameCell);
              
              const typeCell = document.createElement("td");
              typeCell.textContent = "Mappa";
              row.appendChild(typeCell);
              
              const dateCell = document.createElement("td");
              dateCell.textContent = "-";
              row.appendChild(dateCell);
              
              const actionCell = document.createElement("td");
              const openBtn = document.createElement("button");
              openBtn.type = "button";
              openBtn.className = "archive-meta-btn";
              openBtn.textContent = "Megnyitás";
              openBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openFolder(folder);
              });
              actionCell.appendChild(openBtn);
              row.appendChild(actionCell);
              
              row.addEventListener("dblclick", () => {
                openFolder(folder);
              });
              
              tableBody.appendChild(row);
            });
          } else {
            if (currentPathEl) currentPathEl.innerHTML = `📁 Gyökér / <span style="color: #5865F2;">${archiveCurrentFolder}</span>`;
            if (backBtn) backBtn.style.display = "inline-block";
            
            if (archiveVideos.length === 0) {
              tableBody.innerHTML = `<tr><td colspan="4" class="clip-window__status">Nincsenek videók ebben a mappában.</td></tr>`;
              return;
            }
            
            archiveVideos.forEach(video => {
              const row = document.createElement("tr");
              
              const nameCell = document.createElement("td");
              nameCell.textContent = video.original_name || video.filename || "Ismeretlen";
              row.appendChild(nameCell);
              
              const typeCell = document.createElement("td");
              typeCell.textContent = "Videó";
              row.appendChild(typeCell);
              
              const dateCell = document.createElement("td");
              const dateSpan = document.createElement("span");
              dateSpan.textContent = formatDateTime(video.content_created_at);
              dateCell.appendChild(dateSpan);
              row.appendChild(dateCell);
              
              const actionCell = document.createElement("td");
              const editBtn = document.createElement("button");
              editBtn.type = "button";
              editBtn.className = "archive-meta-btn";
              editBtn.textContent = "✏️ Szerkesztés";
              actionCell.appendChild(editBtn);
              row.appendChild(actionCell);
              
              editBtn.addEventListener("click", () => {
                dateSpan.style.display = "none";
                editBtn.style.display = "none";
                
                const dateInput = document.createElement("input");
                dateInput.type = "text";
                dateInput.className = "archive-meta-date-input";
                dateInput.style.width = "180px";
                dateInput.value = formatDateTime(video.content_created_at);
                dateCell.appendChild(dateInput);
                
                const saveBtn = document.createElement("button");
                saveBtn.type = "button";
                saveBtn.className = "archive-meta-btn archive-meta-btn--save";
                saveBtn.textContent = "Mentés";
                
                const cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.className = "archive-meta-btn archive-meta-btn--cancel";
                cancelBtn.textContent = "Mégse";
                
                actionCell.appendChild(saveBtn);
                actionCell.appendChild(cancelBtn);
                
                cancelBtn.addEventListener("click", () => {
                  dateInput.remove();
                  saveBtn.remove();
                  cancelBtn.remove();
                  dateSpan.style.display = "inline";
                  editBtn.style.display = "inline";
                });
                
                saveBtn.addEventListener("click", async () => {
                  const selectedDateStr = dateInput.value.trim();
                  const parsedDate = parseHungarianDate(selectedDateStr);
                  if (!parsedDate) {
                    alert("Kérlek adj meg egy érvényes dátumot ebben a formátumban: ÉÉÉÉ. HH. NN. ÓÓ:PP (pl. 2018. 12. 17. 03:02)");
                    return;
                  }
                  
                  dateInput.disabled = true;
                  saveBtn.disabled = true;
                  cancelBtn.disabled = true;
                  saveBtn.textContent = "Mentés...";
                  
                  try {
                    const response = await fetch(`/api/archive/videos/${video.id}/metadata-date`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        ...buildAuthHeaders()
                      },
                      body: JSON.stringify({ date: parsedDate.toISOString() })
                    });
                    
                    const result = await response.json().catch(() => null);
                    if (!response.ok) {
                      throw new Error(result?.message || "Nem sikerült frissíteni a dátumot.");
                    }
                    
                    alert(result.message || "Sikeres mentés!");
                    await loadArchiveVideos(archiveCurrentFolder);
                  } catch (error) {
                    alert(error.message || "Hiba történt a mentés során.");
                    dateInput.disabled = false;
                    saveBtn.disabled = false;
                    cancelBtn.disabled = false;
                    saveBtn.textContent = "Mentés";
                  }
                });
              });
              
              tableBody.appendChild(row);
            });
          }
        }

        async function loadArchiveFolders() {
          console.log("loadArchiveFolders meghívva");
          const tableBody = document.getElementById("archiveMetaBody");
          if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4" class="clip-window__status">Mappák betöltése folyamatban...</td></tr>`;
          }
          
          try {
            const response = await fetch("/api/archive/videok/folders", {
              headers: buildAuthHeaders(),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.message || "Nem sikerült lekérdezni a mappákat.");
            }
            archiveFolders = Array.isArray(data?.folders) ? data.folders : [];
            renderArchiveMetaTable();
          } catch (error) {
            console.error("Archívum mappák betöltési hiba:", error);
            if (tableBody) {
              tableBody.innerHTML = `<tr><td colspan="4" class="clip-window__status" style="color: #ffc9c9;">Hiba: ${error.message}</td></tr>`;
            }
          }
        }

        async function loadArchiveVideos(folder) {
          const tableBody = document.getElementById("archiveMetaBody");
          if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4" class="clip-window__status">Videók betöltése folyamatban...</td></tr>`;
          }
          
          try {
            const response = await fetch(`/api/archive/videos/folders/${encodeURIComponent(folder)}?limit=80&sort=newest`, {
              headers: buildAuthHeaders(),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(result?.message || "Nem sikerült lekérdezni a videókat.");
            }
            archiveVideos = Array.isArray(result?.data) ? result.data : [];
            renderArchiveMetaTable();
          } catch (error) {
            console.error("Archívum videók betöltési hiba:", error);
            if (tableBody) {
              tableBody.innerHTML = `<tr><td colspan="4" class="clip-window__status" style="color: #ffc9c9;">Hiba: ${error.message}</td></tr>`;
            }
          }
        }

        function openFolder(folder) {
          archiveCurrentFolder = folder;
          loadArchiveVideos(folder);
        }

        function goBackToFolders() {
          archiveCurrentFolder = null;
          loadArchiveFolders();
        }

        async function loadArchiveMetadata() {
          if (archiveCurrentFolder === null) {
            await loadArchiveFolders();
          } else {
            await loadArchiveVideos(archiveCurrentFolder);
          }
        }

        const getInitialVariant = () => {
          const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
          if (stored && VALID_VARIANTS.includes(stored)) {
            return stored;
          }
          return "original";
        };

        const switchSection = (targetId) => {
          localStorage.setItem("adminActiveTab", targetId);

          sections.forEach((section) => {
            section.classList.toggle("manager__section--active", section.id === targetId);
          });

          tabs.forEach((tab) => {
            const isActive = tab.dataset.target === targetId;
            tab.classList.toggle("manager__tab--active", isActive);
          });

          if (targetId === "clipsSection" && !clipsLoaded) {
            loadVariant(variantSelect?.value || "original");
          }

          if (targetId === "usersSection" && !usersLoaded) {
            loadUsers();
          }

          if (targetId === "processingSection") {
            loadProcessingStatus();
          }

          if (targetId === "radnaiSection") {
            loadRadnaiStatus();
          }

          if (targetId === "archiveMetadataSection") {
            loadArchiveMetadata();
          }
        };

        const initialVariant = getInitialVariant();

        if (variantSelect) {
          variantSelect.value = initialVariant;
          variantSelect.addEventListener("change", (event) => {
            const value = event.target?.value || "original";
            if (VALID_VARIANTS.includes(value)) {
              localStorage.setItem(VARIANT_STORAGE_KEY, value);
            } else {
              localStorage.removeItem(VARIANT_STORAGE_KEY);
            }
            loadVariant(value);
          });
        }

        if (refreshBtn) {
          refreshBtn.addEventListener("click", () => {
            loadProcessingStatus();
          });
        }

        if (fetchMoviesBtn) {
          fetchMoviesBtn.addEventListener("click", () => {
            loadMovieData();
          });
        }

        if (radnaiTestBtn) {
          radnaiTestBtn.addEventListener("click", () => {
            triggerRadnaiTestAlert();
          });
        }

        if (radnaiToggleBtn) {
          radnaiToggleBtn.addEventListener("click", () => {
            toggleRadnaiMonitoring();
          });
        }

        const archiveMetaBackBtn = document.getElementById("archiveMetaBackBtn");
        const archiveMetaRefreshBtn = document.getElementById("archiveMetaRefreshBtn");

        if (archiveMetaBackBtn) {
          archiveMetaBackBtn.addEventListener("click", () => {
            goBackToFolders();
          });
        }

        if (archiveMetaRefreshBtn) {
          archiveMetaRefreshBtn.addEventListener("click", () => {
            loadArchiveMetadata();
          });
        }

        if (refreshUsersBtn) {
          refreshUsersBtn.addEventListener("click", loadUsers);
        }

        if (savePermissionsBtn) {
          savePermissionsBtn.addEventListener("click", savePermissions);
        }

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const targetId = tab.dataset.target;
            switchSection(targetId);
          });
        });

        const savedTab = localStorage.getItem("adminActiveTab");
        const validTabs = ["clipsSection", "usersSection", "processingSection", "movieSection", "radnaiSection", "archiveMetadataSection"];
        if (savedTab && validTabs.includes(savedTab)) {
          switchSection(savedTab);
        } else {
          switchSection("clipsSection");
        }
      });
    
