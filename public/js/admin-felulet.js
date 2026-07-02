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
        const clipAnalyticsRefreshBtn = document.getElementById("clipAnalyticsRefreshBtn");
        const clipAnalyticsPeriod = document.getElementById("clipAnalyticsPeriod");
        const clipAnalyticsYear = document.getElementById("clipAnalyticsYear");
        const clipAnalyticsMonth = document.getElementById("clipAnalyticsMonth");
        const clipAnalyticsMonthWrap = document.getElementById("clipAnalyticsMonthWrap");
        const clipAnalyticsStatus = document.getElementById("clipAnalyticsStatus");
        const clipAnalyticsChart = document.getElementById("clipAnalyticsChart");
        const analyticsTotalViews = document.getElementById("analyticsTotalViews");
        const analyticsTotalUsers = document.getElementById("analyticsTotalUsers");
        const analyticsTotalClips = document.getElementById("analyticsTotalClips");
        const analyticsTopUsers = document.getElementById("analyticsTopUsers");
        const analyticsTopVideos = document.getElementById("analyticsTopVideos");
        const analyticsUserVideos = document.getElementById("analyticsUserVideos");
        const analyticsRecentViews = document.getElementById("analyticsRecentViews");
        const tabs = document.querySelectorAll(".manager__tab[data-target]");
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

        let archiveCurrentFolder = null;
        let archiveFolders = [];
        let archiveVideos = [];
        let clipAnalyticsLoaded = false;
        const analyticsNumberFormatter = new Intl.NumberFormat("hu-HU");

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

        const usersController = window.AdminUsers.createController();

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

        function formatAnalyticsNumber(value) {
          const number = Number(value);
          return analyticsNumberFormatter.format(Number.isFinite(number) ? number : 0);
        }

        function formatAnalyticsDate(value) {
          if (!value) return "-";
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return "-";
          return date.toLocaleString("hu-HU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        function renderAnalyticsTable(container, columns, rows) {
          if (!container) return;
          container.innerHTML = "";

          if (!Array.isArray(rows) || rows.length === 0) {
            const empty = document.createElement("p");
            empty.className = "analytics-empty";
            empty.textContent = "Nincs adat a kiválasztott időszakban.";
            container.appendChild(empty);
            return;
          }

          const table = document.createElement("table");
          table.className = "analytics-table";
          const thead = document.createElement("thead");
          const headRow = document.createElement("tr");
          columns.forEach((column) => {
            const th = document.createElement("th");
            th.textContent = column.label;
            headRow.appendChild(th);
          });
          thead.appendChild(headRow);

          const tbody = document.createElement("tbody");
          rows.forEach((row) => {
            const tr = document.createElement("tr");
            columns.forEach((column) => {
              const td = document.createElement("td");
              td.textContent = column.format ? column.format(row) : row[column.key] ?? "";
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });

          table.append(thead, tbody);
          container.appendChild(table);
        }

        function renderAnalyticsChart(timeline, period) {
          if (!clipAnalyticsChart) return;
          const ctx = clipAnalyticsChart.getContext("2d");
          if (!ctx) return;

          const width = clipAnalyticsChart.width;
          const height = clipAnalyticsChart.height;
          ctx.clearRect(0, 0, width, height);

          const items = Array.isArray(timeline) ? timeline : [];
          const values = items.map((item) => Number(item.views) || 0);
          const maxValue = Math.max(1, ...values);
          const padding = { top: 28, right: 22, bottom: 48, left: 54 };
          const chartWidth = width - padding.left - padding.right;
          const chartHeight = height - padding.top - padding.bottom;

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.strokeStyle = "#e5e7eb";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding.left, padding.top);
          ctx.lineTo(padding.left, padding.top + chartHeight);
          ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
          ctx.stroke();

          ctx.fillStyle = "#6b7280";
          ctx.font = "12px Inter, sans-serif";
          for (let i = 0; i <= 4; i += 1) {
            const value = Math.round((maxValue / 4) * i);
            const y = padding.top + chartHeight - (chartHeight / 4) * i;
            ctx.fillText(formatAnalyticsNumber(value), 8, y + 4);
            ctx.strokeStyle = "#f1f5f9";
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
          }

          const barGap = 4;
          const barWidth = Math.max(8, (chartWidth - barGap * Math.max(0, items.length - 1)) / Math.max(1, items.length));
          items.forEach((item, index) => {
            const value = Number(item.views) || 0;
            const x = padding.left + index * (barWidth + barGap);
            const barHeight = value > 0 ? Math.max(2, (value / maxValue) * chartHeight) : 0;
            const y = padding.top + chartHeight - barHeight;
            ctx.fillStyle = "#2563eb";
            ctx.fillRect(x, y, barWidth, barHeight);

            const date = new Date(item.period_start);
            const label = period === "yearly"
              ? date.toLocaleDateString("hu-HU", { month: "short" })
              : String(date.getDate());
            const shouldLabel = period === "yearly" || index === 0 || index === items.length - 1 || date.getDate() % 5 === 0;
            if (shouldLabel) {
              ctx.fillStyle = "#6b7280";
              ctx.save();
              ctx.translate(x + barWidth / 2, padding.top + chartHeight + 18);
              ctx.rotate(-Math.PI / 5);
              ctx.fillText(label, 0, 0);
              ctx.restore();
            }
          });

          ctx.fillStyle = "#111827";
          ctx.font = "600 14px Inter, sans-serif";
          ctx.fillText(period === "yearly" ? "Havi megtekintések" : "Napi megtekintések", padding.left, 18);
        }

        function renderClipAnalytics(data) {
          const totals = data?.totals || {};
          if (analyticsTotalViews) analyticsTotalViews.textContent = formatAnalyticsNumber(totals.total_views);
          if (analyticsTotalUsers) analyticsTotalUsers.textContent = formatAnalyticsNumber(totals.total_users);
          if (analyticsTotalClips) analyticsTotalClips.textContent = formatAnalyticsNumber(totals.total_clips);

          renderAnalyticsChart(data?.timeline, data?.period);
          renderAnalyticsTable(analyticsTopUsers, [
            { label: "Felhasználó", key: "username" },
            { label: "Megtekintés", format: (row) => formatAnalyticsNumber(row.views) },
            { label: "Klipek", format: (row) => formatAnalyticsNumber(row.unique_clips) },
          ], data?.topUsers);
          renderAnalyticsTable(analyticsTopVideos, [
            { label: "Klip", key: "title" },
            { label: "Megtekintés", format: (row) => formatAnalyticsNumber(row.views) },
            { label: "Nézők", format: (row) => formatAnalyticsNumber(row.unique_users) },
          ], data?.topVideos);
          renderAnalyticsTable(analyticsUserVideos, [
            { label: "Felhasználó", key: "username" },
            { label: "Klip", key: "title" },
            { label: "Megtekintés", format: (row) => formatAnalyticsNumber(row.views) },
            { label: "Utolsó nézés", format: (row) => formatAnalyticsDate(row.last_viewed_at) },
          ], data?.userVideos);
          renderAnalyticsTable(analyticsRecentViews, [
            { label: "Időpont", format: (row) => formatAnalyticsDate(row.viewed_at) },
            { label: "Felhasználó", key: "username" },
            { label: "Klip", key: "title" },
          ], data?.recentViews);
        }

        async function loadClipAnalytics() {
          if (!clipAnalyticsStatus) return;
          clipAnalyticsStatus.textContent = "Statisztika betöltése folyamatban...";
          const period = clipAnalyticsPeriod?.value === "yearly" ? "yearly" : "monthly";
          const year = Number.parseInt(clipAnalyticsYear?.value, 10) || new Date().getFullYear();
          const month = Number.parseInt(clipAnalyticsMonth?.value, 10) || new Date().getMonth() + 1;
          if (clipAnalyticsMonthWrap) {
            clipAnalyticsMonthWrap.style.display = period === "yearly" ? "none" : "flex";
          }

          const params = new URLSearchParams({ period, year: String(year), month: String(month) });
          if (clipAnalyticsRefreshBtn) {
            clipAnalyticsRefreshBtn.disabled = true;
          }

          try {
            const response = await fetch(`/api/admin/clip-analytics?${params.toString()}`, {
              headers: buildAuthHeaders(),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.message || "Nem sikerült lekérdezni a klip statisztikát.");
            }
            renderClipAnalytics(data);
            clipAnalyticsLoaded = true;
            clipAnalyticsStatus.textContent = "Statisztika frissítve.";
          } catch (error) {
            console.error("Klip statisztika hiba:", error);
            clipAnalyticsStatus.textContent = error.message || "Nem sikerült lekérdezni a klip statisztikát.";
          } finally {
            if (clipAnalyticsRefreshBtn) {
              clipAnalyticsRefreshBtn.disabled = false;
            }
          }
        }

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

          if (targetId === "usersSection") {
            usersController.ensureLoaded();
          }

          if (targetId === "clipAnalyticsSection" && !clipAnalyticsLoaded) {
            loadClipAnalytics();
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

        const now = new Date();
        if (clipAnalyticsYear) {
          clipAnalyticsYear.value = String(now.getFullYear());
          clipAnalyticsYear.addEventListener("change", () => {
            clipAnalyticsLoaded = false;
            if (document.getElementById("clipAnalyticsSection")?.classList.contains("manager__section--active")) {
              loadClipAnalytics();
            }
          });
        }

        if (clipAnalyticsMonth) {
          clipAnalyticsMonth.value = String(now.getMonth() + 1);
          clipAnalyticsMonth.addEventListener("change", () => {
            clipAnalyticsLoaded = false;
            if (document.getElementById("clipAnalyticsSection")?.classList.contains("manager__section--active")) {
              loadClipAnalytics();
            }
          });
        }

        if (clipAnalyticsPeriod) {
          clipAnalyticsPeriod.addEventListener("change", () => {
            clipAnalyticsLoaded = false;
            if (clipAnalyticsMonthWrap) {
              clipAnalyticsMonthWrap.style.display = clipAnalyticsPeriod.value === "yearly" ? "none" : "flex";
            }
            if (document.getElementById("clipAnalyticsSection")?.classList.contains("manager__section--active")) {
              loadClipAnalytics();
            }
          });
        }

        if (clipAnalyticsRefreshBtn) {
          clipAnalyticsRefreshBtn.addEventListener("click", () => {
            loadClipAnalytics();
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

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const targetId = tab.dataset.target;
            switchSection(targetId);
          });
        });

        const savedTab = localStorage.getItem("adminActiveTab");
        const validTabs = ["clipsSection", "clipAnalyticsSection", "usersSection", "processingSection", "movieSection", "radnaiSection", "archiveMetadataSection"];
        if (savedTab && validTabs.includes(savedTab)) {
          switchSection(savedTab);
        } else {
          switchSection("clipsSection");
        }
      });
    
