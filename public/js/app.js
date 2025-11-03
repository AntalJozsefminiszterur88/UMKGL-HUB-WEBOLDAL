const videoGridContainer = document.getElementById("video-grid-container");
      const showUploadModalBtn = document.getElementById("showUploadModalBtn");
      const uploadModal = document.getElementById("uploadModal");
      const closeUploadModalBtn = document.getElementById("closeUploadModal");
      const dropZone = document.getElementById("drop-zone");
      const fileInput = document.getElementById("fileInput");
      const uploadBtn = document.getElementById("uploadBtn");
      const uploadStatus = document.getElementById("uploadStatus");
      const selectedFileName = document.getElementById("selectedFileName");
      const ADMIN_SESSION_KEY = "isAdmin";
      const ADMIN_ONLY_SECTIONS = new Set(["admin", "programok"]);
      let selectedVideoFile = null;

      function isAdminUser() {
        return localStorage.getItem(ADMIN_SESSION_KEY) === "true";
      }

      function getAccessibleNavLinks() {
        return Array.from(document.querySelectorAll("nav a")).filter((link) => {
          return !(link.dataset.requiresAdmin === "true" && !isAdminUser());
        });
      }

      async function loadVideos() {
        if (!videoGridContainer) {
          return;
        }

        videoGridContainer.innerHTML = "";

        try {
          const response = await fetch("/api/videos");

          if (!response.ok) {
            throw new Error("Nem sikerült betölteni a videókat.");
          }

          const videos = await response.json();

          if (!Array.isArray(videos) || videos.length === 0) {
            videoGridContainer.innerHTML = "<p>Még senki nem töltött fel videót.</p>";
            return;
          }

          videos.forEach((video) => {
            const card = document.createElement("div");
            card.className = "video-card";

            const videoElement = document.createElement("video");
            videoElement.src = `/uploads/${video.filename}`;
            videoElement.controls = true;
            videoElement.preload = "metadata";

            const uploader = document.createElement("p");
            uploader.textContent = `Feltöltötte: ${video.username || "Ismeretlen"}`;

            card.appendChild(videoElement);
            card.appendChild(uploader);

            videoGridContainer.appendChild(card);
          });
        } catch (error) {
          console.error("Videók betöltési hibája:", error);
          videoGridContainer.innerHTML = "<p>Nem sikerült betölteni a videókat.</p>";
        }
      }

      function resetUploadModal() {
        selectedVideoFile = null;
        if (uploadBtn) {
          uploadBtn.disabled = true;
        }
        if (uploadStatus) {
          uploadStatus.textContent = "";
        }
        if (selectedFileName) {
          selectedFileName.textContent = "Nincs kiválasztott fájl.";
        }
        if (fileInput) {
          fileInput.value = "";
        }
        if (dropZone) {
          dropZone.classList.remove("drag-over");
        }
      }

      function openUploadModal() {
        if (uploadModal) {
          uploadModal.style.display = "flex";
        }
        resetUploadModal();
      }

      function closeUploadModal() {
        if (uploadModal) {
          uploadModal.style.display = "none";
        }
        resetUploadModal();
      }

      function handleFileSelection(file) {
        if (!file) {
          return;
        }
        selectedVideoFile = file;
        if (selectedFileName) {
          selectedFileName.textContent = `Kiválasztott fájl: ${file.name}`;
        }
        if (uploadBtn) {
          uploadBtn.disabled = false;
        }
        if (uploadStatus) {
          uploadStatus.textContent = "";
        }
      }

      if (showUploadModalBtn && uploadModal) {
        showUploadModalBtn.addEventListener("click", () => {
          const token = localStorage.getItem("token");
          if (!token) {
            alert("A feltöltéshez be kell jelentkezned.");
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
            handleFileSelection(files[0]);
          }
        });
      }

      if (fileInput) {
        fileInput.addEventListener("change", (event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            handleFileSelection(files[0]);
          } else {
            resetUploadModal();
          }
        });
      }

      if (uploadBtn) {
        uploadBtn.addEventListener("click", async () => {
          const token = localStorage.getItem("token");
          if (!token) {
            alert("A feltöltéshez be kell jelentkezned.");
            return;
          }

          if (!selectedVideoFile) {
            alert("Válassz ki egy videófájlt a feltöltéshez.");
            return;
          }

          const formData = new FormData();
          formData.append("video", selectedVideoFile);

          uploadBtn.disabled = true;
          if (uploadStatus) {
            uploadStatus.textContent = "Feltöltés folyamatban...";
          }

          try {
            const response = await fetch("/upload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
              const message = (result && result.message) || "Nem sikerült feltölteni a videót.";
              throw new Error(message);
            }

            if (uploadStatus) {
              uploadStatus.textContent = (result && result.message) || "Videó sikeresen feltöltve.";
            }
            await loadVideos();
            setTimeout(() => {
              closeUploadModal();
            }, 800);
          } catch (error) {
            console.error("Videó feltöltési hiba:", error);
            if (uploadStatus) {
              uploadStatus.textContent = error.message || "Nem sikerült feltölteni a videót.";
            }
          } finally {
            if (uploadBtn) {
              uploadBtn.disabled = false;
            }
          }
        });
      }

      function showSection(target, shouldPushState = true) {
        const navLinks = getAccessibleNavLinks();
        const sections = document.querySelectorAll("main section");
        const availableTargets = new Set(navLinks.map((link) => link.dataset.section));

        if (!availableTargets.has(target)) {
          target = "home";
        }

        document.querySelectorAll("nav a").forEach((link) => {
          const requiresAdmin = link.dataset.requiresAdmin === "true";
          const isActive = link.dataset.section === target;

          if (requiresAdmin && !isAdminUser()) {
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
          loadVideos();
        }

        if (target === "szavazas") {
          refreshPollsIfVisible();
        }

        if (shouldPushState) {
          history.pushState(null, "", `#${target}`);
        }
      }

      document.querySelectorAll("nav a").forEach((link) => {
        link.addEventListener("click", (e) => {
          const requiresAdmin = link.dataset.requiresAdmin === "true";

          if (requiresAdmin && !isAdminUser()) {
            e.preventDefault();
            return;
          }

          e.preventDefault();
          showSection(link.dataset.section);
        });
      });

      // Oldal betöltésekor a hash alapján nyitjuk meg a megfelelő szekciót
      window.addEventListener("load", () => {
        const hash = location.hash.replace("#", "") || "home";
        showSection(hash, false);
      });
