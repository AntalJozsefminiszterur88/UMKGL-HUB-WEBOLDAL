
      const SESSION_KEYS = { token: "token" };
      const PAGE_SIZE = 12;

      let currentPage = 1;
      let isLoading = false;
      let hasMore = true;
      let observer;

      function getStoredToken() {
        return localStorage.getItem(SESSION_KEYS.token);
      }

      function showStatus(message, type = "info") {
        const status = document.getElementById("status");
        const text = document.getElementById("status-text");
        status.className = `status visible ${type}`;
        text.textContent = message;
      }

      function hideStatus() {
        const status = document.getElementById("status");
        status.className = "status";
        document.getElementById("status-text").textContent = "";
      }

      function toggleLoader(visible) {
        const loader = document.getElementById("loader");
        loader.style.display = visible ? "block" : "none";
      }

      async function fetchVideos(page = 1) {
        const token = getStoredToken();
        if (!token) {
          showStatus("Jelentkezz be a videók megosztásához.", "warning");
          return { data: [], pagination: null };
        }

        const response = await fetch(`/api/videos?page=${page}&limit=${PAGE_SIZE}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          showStatus("Nincs jogosultság a videók listázásához.", "error");
          return { data: [], pagination: null };
        }

        if (!response.ok) {
          showStatus("Nem sikerült betölteni a videókat.", "error");
          return { data: [], pagination: null };
        }

        const data = await response.json();
        return { data: data?.data || [], pagination: data?.pagination };
      }

      function createLazyVideoPlayer(video) {
        const wrapper = document.createElement("div");
        wrapper.className = "card__video-wrapper";

        const posterUrl = video.thumbnail_filename ? `/uploads/${video.thumbnail_filename}` : "";
        const placeholderButton = document.createElement("button");
        placeholderButton.type = "button";
        placeholderButton.className = "card__video-placeholder";
        placeholderButton.setAttribute("aria-label", "Videó lejátszása");

        if (posterUrl) {
          const poster = document.createElement("img");
          poster.src = posterUrl;
          poster.alt = video.original_name || video.filename || "Videó indexkép";
          placeholderButton.appendChild(poster);
        }

        const playOverlay = document.createElement("span");
        playOverlay.className = "play-button";
        playOverlay.setAttribute("aria-hidden", "true");
        placeholderButton.appendChild(playOverlay);

        const loadVideo = () => {
          const videoPlayer = document.createElement("video");
          videoPlayer.className = "card__video";
          videoPlayer.controls = true;
          videoPlayer.preload = "metadata";
          videoPlayer.playsInline = true;
          if (posterUrl) {
            videoPlayer.poster = posterUrl;
          }
          videoPlayer.src = `/uploads/${video.filename}`;

          videoPlayer.addEventListener(
            "loadeddata",
            () => {
              videoPlayer.play().catch(() => {});
            },
            { once: true }
          );

          wrapper.replaceChildren(videoPlayer);
          videoPlayer.focus();
        };

        placeholderButton.addEventListener("click", loadVideo);
        wrapper.appendChild(placeholderButton);

        return wrapper;
      }

      function createVideoCard(video) {
        const card = document.createElement("article");
        card.className = "card";

        const header = document.createElement("div");
        header.className = "card__header";
        const title = document.createElement("h2");
        title.className = "card__title";
        title.textContent = video.original_name || video.filename || "Ismeretlen videó";

        const subtitle = document.createElement("small");
        subtitle.textContent = video.filename;
        title.appendChild(subtitle);
        header.appendChild(title);

        const meta = document.createElement("div");
        meta.className = "card__meta";
        const uploader = document.createElement("span");
        uploader.className = "chip";
        uploader.textContent = video.username ? `Feltöltő: ${video.username}` : "Feltöltő: ismeretlen";
        const date = document.createElement("span");
        const uploadedAt = video.content_created_at || video.uploaded_at;
        date.textContent = uploadedAt ? new Date(uploadedAt).toLocaleString("hu-HU") : "Dátum ismeretlen";
        meta.append(uploader, date);

        const actions = document.createElement("div");
        actions.className = "card__actions";

        const shareBtn = document.createElement("button");
        shareBtn.className = "btn-primary";
        shareBtn.textContent = "Share to Discord";
        shareBtn.addEventListener("click", () => shareVideo(video.id, shareBtn));

        actions.append(shareBtn);

        card.append(header, meta, createLazyVideoPlayer(video), actions);
        return card;
      }

      function renderVideos(videos, { reset = false } = {}) {
        const grid = document.getElementById("video-grid");
        const loader = document.getElementById("loader");
        const emptyState = document.getElementById("empty-state");
        if (reset) {
          grid.innerHTML = "";
        }

        if (!videos.length && !grid.children.length) {
          emptyState.style.display = "block";
          loader.style.display = "none";
          return;
        }

        emptyState.style.display = "none";
        videos.forEach((video) => {
          grid.appendChild(createVideoCard(video));
        });
      }

      async function shareVideo(videoId, buttonEl) {
        const token = getStoredToken();
        if (!token) {
          showStatus("Jelentkezz be a megosztáshoz.", "warning");
          return;
        }

        const originalLabel = buttonEl.textContent;
        buttonEl.disabled = true;
        buttonEl.textContent = "Küldés...";

        try {
          const response = await fetch("/api/discord/share-video", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ videoId }),
          });

          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(result?.message || "Nem sikerült elküldeni a videót a botnak.");
          }

          showStatus(result?.message || "Videó sikeresen megosztva Discordon!", "success");
        } catch (err) {
          console.error(err);
          showStatus(err.message || "Ismeretlen hiba történt a megosztás során.", "error");
        } finally {
          buttonEl.disabled = false;
          buttonEl.textContent = originalLabel;
        }
      }

      function setupInfiniteScroll() {
        const sentinel = document.getElementById("scroll-sentinel");
        if (!sentinel) return;

        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              loadNextPage();
            }
          },
          { rootMargin: "300px 0px" }
        );

        observer.observe(sentinel);
      }

      function stopInfiniteScroll() {
        if (observer) {
          observer.disconnect();
        }
      }

      async function loadNextPage() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        toggleLoader(true);

        try {
          const { data, pagination } = await fetchVideos(currentPage);

          const isFirstPage = currentPage === 1;
          renderVideos(data, { reset: isFirstPage });

          if (!pagination || data.length === 0) {
            hasMore = false;
            stopInfiniteScroll();
            return;
          }

          const { currentPage: returnedPage = currentPage, totalPages = returnedPage } = pagination;
          hasMore = returnedPage < totalPages;
          if (hasMore) {
            currentPage = returnedPage + 1;
          } else {
            stopInfiniteScroll();
          }
        } catch (error) {
          console.error(error);
          showStatus("Nem sikerült betölteni a videókat.", "error");
          stopInfiniteScroll();
        } finally {
          isLoading = false;
          toggleLoader(false);
        }
      }

      async function init() {
        const token = getStoredToken();
        if (!token) {
          showStatus("Jelentkezz be a videók megosztásához.", "warning");
          return;
        }
        hideStatus();
        setupInfiniteScroll();
        await loadNextPage();
      }

      init();
    