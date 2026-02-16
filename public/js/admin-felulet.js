
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
        const tabs = document.querySelectorAll(".manager__tab");
        const sections = document.querySelectorAll(".manager__section");
        const VARIANT_STORAGE_KEY = "clipWindowVariant";
        const VALID_VARIANTS = ["original", "720p", "other"];
        const adminUser = isAdminUser();
        let clipsLoaded = false;
        let currentClips = [];
        let currentSort = { key: "uploaded_at", direction: "desc" };
        let radnaiDebugHistory = [];
        let radnaiMonitorEnabled = true;
        let radnaiTogglePending = false;
        const sortableKeys = new Set(["id", "original_name", "sizeBytes", "uploaded_at", "content_created_at"]);

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

        if (!isUserLoggedIn()) {
          alert("Nincs érvényes hitelesítés. Jelentkezz be, hogy lásd a klipeket és a feldolgozást.");
          window.location.href = "/";
          return;
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
              processingStatusText.textContent = data.isProcessing
                ? "Egy fájl feldolgozása folyamatban."
                : "Jelenleg nincs aktív feldolgozás.";
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

        const getInitialVariant = () => {
          const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
          if (stored && VALID_VARIANTS.includes(stored)) {
            return stored;
          }
          return "original";
        };

        const switchSection = (targetId) => {
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

          if (targetId === "processingSection") {
            loadProcessingStatus();
          }

          if (targetId === "radnaiSection") {
            loadRadnaiStatus();
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

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const targetId = tab.dataset.target;
            switchSection(targetId);
          });
        });

        loadVariant(initialVariant);
      });
    
