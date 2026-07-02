      function getAccessibleNavLinks() {
        return Array.from(document.querySelectorAll("nav a")).filter((link) => {
          const requiresAdmin = link.dataset.requiresAdmin === "true";
          const requiresTransfer = link.dataset.requiresTransfer === "true";
          const requiresDiscord2 = link.dataset.requiresDiscord2 === "true";

          if (requiresAdmin && !isAdminUser()) {
            return false;
          }

          if (requiresTransfer && !hasFileTransferPermission()) {
            return false;
          }

          if (requiresDiscord2 && !hasDiscord2Access()) {
            return false;
          }

          return true;
        });
      }

      function updateProgramAdminControls() {
        if (addProgramBtn) {
          addProgramBtn.style.display = isAdminUser() ? "inline-flex" : "none";
        }

        if (!programsContainer) {
          return;
        }

        programsContainer.querySelectorAll(".program-card").forEach((card) => {
          card.classList.toggle("program-card--admin", isAdminUser());
        });
      }

      function setProgramUploadMode(mode, program = null) {
        const isEditMode = mode === "edit";
        editingProgram = isEditMode ? program : null;

        if (programUploadTitle) {
          programUploadTitle.textContent = isEditMode ? "Program szerkesztése" : "Új Program Feltöltése";
        }

        if (submitProgramUploadBtn) {
          submitProgramUploadBtn.textContent = isEditMode ? "Frissítés" : "Mentés";
        }

        if (programFileInput) {
          if (isEditMode) {
            programFileInput.removeAttribute("required");
          } else {
            programFileInput.setAttribute("required", "required");
          }
          programFileInput.value = "";
        }

        if (!isEditMode && programFileName) {
          programFileName.textContent = "Nincs kiválasztva fájl.";
        }
      }

      function resetProgramUploadModal() {
        if (programUploadForm) {
          programUploadForm.reset();
        }

        if (programFileName) {
          programFileName.textContent = "Nincs kiválasztva fájl.";
        }

        if (programImageCropper) {
          programImageCropper.destroy();
          programImageCropper = null;
        }

        if (programImageObjectUrl) {
          URL.revokeObjectURL(programImageObjectUrl);
          programImageObjectUrl = null;
        }

        if (programImagePreview) {
          programImagePreview.removeAttribute("src");
        }
      }

      function closeProgramUploadModal() {
        if (programUploadModal) {
          programUploadModal.style.display = "none";
        }

        setProgramUploadMode("create");
        resetProgramUploadModal();
      }

      function renderProgramCard(program) {
        const card = document.createElement("article");
        card.className = "program-card";
        if (isAdminUser()) {
          card.classList.add("program-card--admin");
        }

        const thumb = document.createElement("img");
        thumb.className = "program-card__thumbnail";
        thumb.src = program?.image_filename
          ? `/uploads/programs/images/${program.image_filename}`
          : "program_icons/default-avatar.png";
        thumb.alt = `${program?.name || "Program"} borítókép`;
        card.appendChild(thumb);

        const body = document.createElement("div");
        body.className = "program-card__body";

        const title = document.createElement("h3");
        title.className = "program-card__title";
        title.textContent = program?.name || "Program";

        const description = document.createElement("p");
        description.className = "program-card__description";
        description.textContent = program?.description || "Nincs leírás megadva.";

        const meta = document.createElement("div");
        meta.className = "program-card__meta";
        const createdAt = program?.created_at ? new Date(program.created_at) : null;
        const downloadInfo = document.createElement("span");
        downloadInfo.textContent = `Letöltések: ${Number(program?.download_count) || 0}`;
        meta.appendChild(downloadInfo);
        if (createdAt) {
          const dateInfo = document.createElement("span");
          dateInfo.textContent = createdAt.toLocaleDateString("hu-HU");
          meta.appendChild(dateInfo);
        }

        const actions = document.createElement("div");
        actions.className = "program-card__actions";

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "primary-button program-card__download";
        downloadBtn.textContent = "Letöltés";
        downloadBtn.addEventListener("click", () => handleProgramDownload(program));

        actions.appendChild(downloadBtn);

        body.appendChild(title);
        body.appendChild(description);
        body.appendChild(meta);
        body.appendChild(actions);

        card.appendChild(body);

        if (isAdminUser()) {
          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "program-card__edit";
          editBtn.setAttribute("aria-label", "Program szerkesztése");
          editBtn.textContent = "s";
          editBtn.addEventListener("click", () => openProgramEditModal(program));
          card.appendChild(editBtn);

          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "program-card__delete";
          deleteBtn.setAttribute("aria-label", "Program törlése");
          deleteBtn.textContent = "\u00d7";
          deleteBtn.addEventListener("click", () => handleProgramDelete(program.id, card, deleteBtn));
          card.appendChild(deleteBtn);
        }

        return card;
      }

      async function loadPrograms() {
        if (!programsContainer) {
          return;
        }

        programsContainer.innerHTML = "<p class='programs-empty'>Betöltés...</p>";

        try {
          const response = await fetch("/api/programs");
          if (!response.ok) {
            throw new Error("Nem sikerült lekérni a programokat.");
          }

          const programs = await response.json();
          programsContainer.innerHTML = "";

          if (!Array.isArray(programs) || programs.length === 0) {
            programsContainer.innerHTML = "<p class='programs-empty'>Még nincs feltöltött program.</p>";
            updateProgramAdminControls();
            return;
          }

          programs.forEach((program) => {
            const card = renderProgramCard(program);
            programsContainer.appendChild(card);
          });

          updateProgramAdminControls();
        } catch (error) {
          console.error("Programok betöltési hiba:", error);
          programsContainer.innerHTML =
            "<p class='programs-empty'>Nem sikerült betölteni a programokat. Próbáld meg később.</p>";
        }
      }

      async function handleProgramDownload(program) {
        if (!program?.id) {
          return;
        }

        const downloadUrl = `/api/programs/${program.id}/download`;
        try {
          const response = await fetch(downloadUrl);

          if (response.status === 429) {
            const payload = await response.json().catch(() => ({}));
            alert(payload.message || "Túllépted a letöltési keretet (Max 3/óra, 10/nap).");
            return;
          }

          if (!response.ok) {
            throw new Error("Nem sikerült lekérni a programokat.");
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = program?.original_filename || `${program?.name || "program"}.exe`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
        } catch (error) {
          console.error("Program letöltési hiba:", error);
          alert(error.message || "Nem sikerült feltölteni a programot.");
        }
      }

      async function handleProgramDelete(programId, card, button) {
        if (!isAdminUser()) {
          alert("Csak admin törölhet programot.");
          return;
        }

        if (!confirm("Biztosan törlöd ezt a programot?")) {
          return;
        }

        const originalText = button?.textContent;
        if (button) {
          button.disabled = true;
          button.textContent = "...";
        }

        try {
          const response = await fetch(`/api/programs/${programId}`, {
            method: "DELETE",
            headers: buildAuthHeaders(),
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            const message = payload?.message || "Nem sikerült törölni a programot.";
            throw new Error(message);
          }

          if (card) {
            card.remove();
          }

          if (!programsContainer?.children.length) {
            programsContainer.innerHTML = "<p class='programs-empty'>Még nincs feltöltött program.</p>";
          }
        } catch (error) {
          console.error("Program törlési hiba:", error);
          alert(error.message || "Nem sikerült feldolgozni a képet.");
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent = originalText || "\u00d7";
          }
        }
      }

      function escapeHtml(value) {
        if (value === null || value === undefined) {
          return "";
        }
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function normalizeAcademyTags(tags) {
        if (Array.isArray(tags)) {
          return tags;
        }
        if (!tags) {
          return [];
        }
        if (typeof tags === "string") {
          try {
            const parsed = JSON.parse(tags);
            return Array.isArray(parsed) ? parsed : [];
          } catch (error) {
            return [];
          }
        }
        return [];
      }

      function normalizeAcademyInlineImages(value) {
        if (Array.isArray(value)) {
          return value;
        }
        if (!value) {
          return [];
        }
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch (error) {
            return [];
          }
        }
        return [];
      }

      function formatAcademyContent(rawContent) {
        const safe = typeof rawContent === "string" ? rawContent.trim() : "";
        if (!safe) {
          return "";
        }
        if (/<[a-z][\s\S]*>/i.test(safe)) {
          return safe;
        }
        return safe
          .split(/\n{2,}/)
          .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
          .join("");
      }

      function insertTextAtCursor(textarea, text) {
        if (!textarea) {
          return;
        }
        const value = textarea.value || "";
        const start = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : value.length;
        const end = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : value.length;
        textarea.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
        const cursor = start + text.length;
        textarea.setSelectionRange(cursor, cursor);
        textarea.focus();
      }

      function formatInlineImageTitle(name) {
        if (!name) return "Kép";
        const base = name.replace(/\.[^/.]+$/, "");
        return base.replace(/[_-]+/g, " ").trim() || "Kép";
      }

      function renderAcademyInlineImages() {
        if (!academyInlineImageList) {
          return;
        }
        academyInlineImageList.innerHTML = "";
        if (!academyInlineImages.length) {
          return;
        }
        academyInlineImages.forEach((image, index) => {
          const item = document.createElement("div");
          item.className = "academy-inline-image-item";

          const title = document.createElement("div");
          title.className = "academy-inline-image-title";
          title.textContent = image.title;

          const code = document.createElement("div");
          code.className = "academy-inline-image-code";
          code.textContent = `<img src="${image.url}" alt="${image.title}">`;

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "academy-inline-image-remove";
          removeBtn.textContent = "Eltávolítás";
          removeBtn.addEventListener("click", () => {
            academyInlineImages = academyInlineImages.filter((_, idx) => idx !== index);
            renderAcademyInlineImages();
          });

          item.appendChild(title);
          item.appendChild(code);
          item.appendChild(removeBtn);
          academyInlineImageList.appendChild(item);
        });
      }

      function closeAcademyCoverCropper(resetSelection = false) {
        if (academyCoverCropperModal) {
          academyCoverCropperModal.classList.remove("open");
          academyCoverCropperModal.setAttribute("aria-hidden", "true");
          academyCoverCropperModal.style.display = "none";
        }
        if (academyCoverCropperInstance) {
          academyCoverCropperInstance.destroy();
          academyCoverCropperInstance = null;
        }
        if (academyCoverZoomRange) {
          academyCoverZoomRange.value = "1";
        }
        if (academyCoverCropperImage) {
          academyCoverCropperImage.src = "";
        }
        if (resetSelection && academyCoverInput) {
          academyCoverInput.value = "";
        }
      }

      function openAcademyCoverCropper(file) {
        if (!academyCoverCropperModal || !academyCoverCropperImage) {
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          academyCoverCropperImage.src = reader.result;
          if (academyCoverCropperInstance) {
            academyCoverCropperInstance.destroy();
          }
          academyCoverCropperInstance = new Cropper(academyCoverCropperImage, {
            aspectRatio: 8 / 3,
            viewMode: 1,
            dragMode: "move",
            background: false,
            autoCropArea: 1,
            responsive: true,
            ready() {
              if (academyCoverZoomRange) {
                academyCoverZoomRange.value = "1";
              }
              academyCoverCropperInstance.zoomTo(1);
            },
          });

          academyCoverCropperModal.classList.add("open");
          academyCoverCropperModal.setAttribute("aria-hidden", "false");
          academyCoverCropperModal.style.display = "flex";
        };
        reader.readAsDataURL(file);
      }

      function renderAcademyFilters() {
        if (!academyFilters) {
          return;
        }
        if (academyActiveTag !== "all" && !academyTags.some((tag) => String(tag.id) === String(academyActiveTag))) {
          academyActiveTag = "all";
        }

        academyFilters.innerHTML = "";

        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = "filter-btn";
        if (academyActiveTag === "all") {
          allBtn.classList.add("active");
        }
        allBtn.textContent = "Asszes";
        allBtn.addEventListener("click", () => {
          academyActiveTag = "all";
          renderAcademyFilters();
          renderAcademyGrid();
        });
        academyFilters.appendChild(allBtn);

        academyTags.forEach((tag) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "filter-btn";
          if (academyActiveTag === String(tag.id)) {
            btn.classList.add("active");
          }
          btn.textContent = tag.name;
          btn.addEventListener("click", () => {
            academyActiveTag = String(tag.id);
            renderAcademyFilters();
            renderAcademyGrid();
          });
          academyFilters.appendChild(btn);
        });
      }

      function renderAcademyTagSelect(selectedIds = []) {
        if (!academyTagSelect) {
          return;
        }
        const selected = new Set((selectedIds || []).map((id) => String(id)));
        academyTagSelect.innerHTML = "";
        academyTags.forEach((tag) => {
          const option = document.createElement("option");
          option.value = String(tag.id);
          option.textContent = tag.name;
          option.selected = selected.has(String(tag.id));
          academyTagSelect.appendChild(option);
        });
      }

      function createAcademyTagChip(tag, options = {}) {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.textContent = tag?.name || "Tag";
        chip.style.setProperty("--tag-color", normalizeColor(tag?.color));
        if (options.clickable === false) {
          chip.style.cursor = "default";
        }
        chip.dataset.tagId = String(tag?.id || "");
        return chip;
      }

      function renderAcademyGrid() {
        if (!academyGrid) {
          return;
        }
        const filtered = academyActiveTag === "all"
          ? academyArticles
          : academyArticles.filter((article) =>
              normalizeAcademyTags(article.tags).some((tag) => String(tag.id) === String(academyActiveTag))
            );

        academyGrid.innerHTML = "";

        if (!filtered.length) {
          if (academyEmptyState) {
            academyEmptyState.style.display = "block";
          }
          return;
        }
        if (academyEmptyState) {
          academyEmptyState.style.display = "none";
        }

        filtered.forEach((article) => {
          const tags = normalizeAcademyTags(article.tags);
          const card = document.createElement("article");
          card.className = "research-card";
          if (isAdminUser()) {
            card.classList.add("research-card--admin");
          }

          const header = document.createElement("div");
          header.className = "card-header";
          if (article?.cover_filename) {
            header.classList.add("has-cover");
            header.style.backgroundImage = `url(/uploads/akademia/${article.cover_filename})`;
          }

          const badge = document.createElement("span");
          badge.className = "category-badge";
          const primaryTag = tags[0];
          badge.textContent = primaryTag?.name || "Akadémia";
          if (primaryTag?.color) {
            badge.style.borderColor = normalizeColor(primaryTag.color);
            badge.style.color = normalizeColor(primaryTag.color);
          }
          header.appendChild(badge);

          const icon = document.createElement("i");
          icon.className = "fas fa-book-open card-icon";
          header.appendChild(icon);
          card.appendChild(header);

          const body = document.createElement("div");
          body.className = "card-body";

          const meta = document.createElement("div");
          meta.className = "card-meta";
          meta.textContent = formatDate(article?.created_at);

          const title = document.createElement("h3");
          title.className = "card-title";
          title.textContent = article?.title || "Cím nélkül";

          const abstract = document.createElement("p");
          abstract.className = "card-abstract";
          abstract.textContent = article?.summary || "Nincs rövid leírás.";

          const footer = document.createElement("div");
          footer.className = "card-footer";

          const tagsWrap = document.createElement("div");
          tagsWrap.className = "academy-card-tags";
          if (tags.length) {
            tags.forEach((tag) => {
              const chip = createAcademyTagChip(tag, { clickable: false });
              tagsWrap.appendChild(chip);
            });
          }

          const readMore = document.createElement("span");
          readMore.className = "read-more";
          readMore.innerHTML = 'Olvass tovább <i class="fas fa-arrow-right"></i>';

          footer.appendChild(tagsWrap);
          footer.appendChild(readMore);

          body.appendChild(meta);
          body.appendChild(title);
          body.appendChild(abstract);
          body.appendChild(footer);
          card.appendChild(body);

          card.addEventListener("click", () => {
            if (isAdminUser()) {
              openAcademyEditor(article);
            } else {
              openAcademyReader(article);
            }
          });

          if (isAdminUser()) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "research-card__delete";
            deleteBtn.textContent = "X";
            deleteBtn.setAttribute("aria-label", "Cikk törlése");
            deleteBtn.addEventListener("click", (event) => {
              event.stopPropagation();
              handleAcademyDelete(article.id, card, deleteBtn);
            });
            card.appendChild(deleteBtn);
          }

          academyGrid.appendChild(card);
        });
      }

      function renderAcademyTagValue(target, tags, emptyText = "Nincs megadva") {
        if (!target) {
          return;
        }
        target.innerHTML = "";
        if (!tags.length) {
          if (emptyText) {
            target.textContent = emptyText;
          }
          return;
        }
        tags.forEach((tag) => {
          const chip = createAcademyTagChip(tag, { clickable: false });
          target.appendChild(chip);
        });
      }

      function openAcademyReader(article) {
        if (!academyLibraryView || !academyReaderView) {
          return;
        }
        activeAcademyArticle = article;
        academyLibraryView.style.display = "none";
        academyReaderView.classList.add("active");

        if (academyArticleTitle) {
          academyArticleTitle.textContent = article?.title || "";
        }
        if (academyArticleSubtitle) {
          academyArticleSubtitle.textContent = article?.subtitle || "";
          academyArticleSubtitle.style.display = article?.subtitle ? "block" : "none";
        }
        if (academyArticleBody) {
          academyArticleBody.innerHTML = formatAcademyContent(article?.content || "");
        }

        if (academyMetaDate) {
          academyMetaDate.textContent = formatDate(article?.created_at);
        }
        if (academyMetaKeywords) {
          academyMetaKeywords.textContent = article?.keywords ? article.keywords : "Nincs megadva";
        }

        const tags = normalizeAcademyTags(article?.tags);
        renderAcademyTagValue(academyMetaTags, tags);
        renderAcademyTagValue(academyHeaderTags, tags, "");

        if (academyPdfInfo && academyDownloadBtn) {
          if (article?.pdf_filename) {
            academyPdfInfo.style.display = "block";
            if (academyPdfLabel) {
              academyPdfLabel.textContent = article?.pdf_original_filename || article?.pdf_filename || "PDF";
            }
            const pdfMetaLabel = academyPdfInfo.querySelector(".meta-label");
            if (pdfMetaLabel) {
              pdfMetaLabel.textContent = "Teljes kutatás:";
            }
            academyDownloadBtn.style.display = "flex";
          } else {
            academyPdfInfo.style.display = "none";
            academyDownloadBtn.style.display = "none";
          }
        }

        window.scrollTo(0, 0);
      }

      function closeAcademyReader() {
        if (!academyLibraryView || !academyReaderView) {
          return;
        }
        activeAcademyArticle = null;
        academyReaderView.classList.remove("active");
        academyLibraryView.style.display = "block";
        window.scrollTo(0, 0);
      }

      function resetAcademyEditor() {
        if (academyEditorForm) {
          academyEditorForm.reset();
        }
        if (academyPdfName) {
          academyPdfName.textContent = "Nincs kiv\u00E1lasztva PDF.";
        }
        if (academyCoverPreview) {
          academyCoverPreview.removeAttribute("src");
        }
        if (academyCoverInput) {
          academyCoverInput.value = "";
        }
        if (academyPdfInput) {
          academyPdfInput.value = "";
        }
        if (academyInlineImageInput) {
          academyInlineImageInput.value = "";
        }
        if (academyInlineImageStatus) {
          academyInlineImageStatus.textContent = "";
        }

        // Reset the preview state without triggering a file reload.
        academyInlineImages = [];
        renderAcademyInlineImages();

        if (academyTagCreateStatus) {
          academyTagCreateStatus.textContent = "";
        }
        if (academyCoverObjectUrl) {
          URL.revokeObjectURL(academyCoverObjectUrl);
          academyCoverObjectUrl = null;
        }
        academyCoverBlob = null;
        academyCoverOriginalFileName = "";
        closeAcademyCoverCropper(true);
      }

      async function loadAcademyTags(force = false) {
        if (academyTagsLoaded && !force) {
          renderAcademyFilters();
          renderAcademyTagSelect();
          return;
        }
        const previousSelection = academyTagSelect
          ? Array.from(academyTagSelect.selectedOptions || []).map((option) => option.value)
          : [];
        try {
          const response = await fetch("/api/academy/tags");
          if (!response.ok) {
            throw new Error("Nem sikerült betölteni a videókat.");
          }
          const payload = await response.json();
          academyTags = Array.isArray(payload) ? payload.map((tag) => ({ ...tag, color: normalizeColor(tag.color) })) : [];
          academyTagsLoaded = true;
          renderAcademyFilters();
          renderAcademyTagSelect(previousSelection);
        } catch (error) {
          console.error("Akadémia tag hiba:", error);
          academyTags = [];
          renderAcademyFilters();
          renderAcademyTagSelect(previousSelection);
        }
      }

      async function loadAcademyArticles() {
        if (!academyGrid) {
          return;
        }
        try {
          const response = await fetch("/api/academy/articles");
          if (!response.ok) {
            throw new Error("Nem sikerült lekérni a programokat.");
          }
          const payload = await response.json();
          academyArticles = Array.isArray(payload) ? payload : [];
          renderAcademyGrid();
        } catch (error) {
          console.error("Akadémia cikk hiba:", error);
          academyArticles = [];
          renderAcademyGrid();
        }
      }

      async function loadAcademyData(force = false) {
        if (!academySection) {
          return;
        }
        if (academyLoadedOnce && !force) {
          updateAcademyAdminControls();
          return;
        }
        academyLoadedOnce = true;
        await loadAcademyTags(force);
        await loadAcademyArticles();
        updateAcademyAdminControls();
      }

      function updateAcademyAdminControls() {
        const isAdmin = isAdminUser();
        if (academyCreateBtn) {
          academyCreateBtn.style.display = isAdmin ? "inline-flex" : "none";
        }
        const tagCreateRow = document.getElementById("academyTagCreateRow");
        if (tagCreateRow) {
          tagCreateRow.style.display = isAdmin ? "flex" : "none";
        }
        if (academyGrid && academyArticles.length) {
          renderAcademyGrid();
          return;
        }
        if (academyGrid) {
          academyGrid.querySelectorAll(".research-card").forEach((card) => {
            card.classList.toggle("research-card--admin", isAdmin);
          });
        }
      }

      function openAcademyEditor(article = null) {
        if (!academyEditorModal || !academyEditorForm) {
          return;
        }
        if (!isAdminUser()) {
          alert("Csak admin szerkesztheti a cikkeket.");
          return;
        }

        editingAcademyArticle = article;
        if (academyEditorTitle) {
          academyEditorTitle.textContent = article ? "Cikk szerkeszt\u00E9se" : "\u00DAj cikk";
        }
        if (academyEditorSaveBtn) {
          academyEditorSaveBtn.textContent = article ? "Frissítés" : "Mentés";
        }

        if (academyTitleInput) {
          academyTitleInput.value = article?.title || "";
        }
        if (academySubtitleInput) {
          academySubtitleInput.value = article?.subtitle || "";
        }
        if (academySummaryInput) {
          academySummaryInput.value = article?.summary || "";
        }
        if (academyKeywordsInput) {
          academyKeywordsInput.value = article?.keywords || "";
        }
        if (academyContentInput) {
          academyContentInput.value = article?.content || "";
        }

        // KApek kezelAse
        if (academyCoverObjectUrl) {
          URL.revokeObjectURL(academyCoverObjectUrl);
          academyCoverObjectUrl = null;
        }
        academyCoverBlob = null;
        academyCoverOriginalFileName = "";

        if (academyCoverPreview) {
          if (article?.cover_filename) {
            academyCoverPreview.src = `/uploads/akademia/${article.cover_filename}`;
          } else {
            academyCoverPreview.removeAttribute("src");
          }
        }
        if (academyPdfName) {
          academyPdfName.textContent = article?.pdf_original_filename || "Nincs kiv\u00E1lasztva PDF.";
        }

        // Reset input fields.
        if (academyCoverInput) academyCoverInput.value = "";
        if (academyPdfInput) academyPdfInput.value = "";
        if (academyInlineImageInput) academyInlineImageInput.value = "";
        if (academyInlineImageStatus) academyInlineImageStatus.textContent = "";

        // JAVATTAS: Itt tAltjALk be a mentett kApeket a szerkesztLbe
        if (article && article.inline_images) {
          academyInlineImages = normalizeAcademyInlineImages(article.inline_images).map((item) => {
            const url = item?.url || "";
            // Use the provided title when available, otherwise derive it from filename.
            const title = item?.title || formatInlineImageTitle(url.split("/").pop());
            return { url, title };
          }).filter((item) => item.url);
        } else {
          academyInlineImages = [];
        }
        renderAcademyInlineImages();

        loadAcademyTags(true).then(() => {
          const selectedIds = normalizeAcademyTags(article?.tags).map((tag) => tag.id);
          renderAcademyTagSelect(selectedIds);
        });

        if (academyEditorModal) {
          academyEditorModal.style.display = "flex";
          academyEditorModal.classList.add("modal-overlay--visible");
        }
      }

      function closeAcademyEditor() {
        if (academyEditorModal) {
          academyEditorModal.classList.remove("modal-overlay--visible");
          academyEditorModal.style.display = "none";
        }
        editingAcademyArticle = null;
        resetAcademyEditor();
      }

      async function handleAcademyDelete(articleId, card, button) {
        if (!isAdminUser()) {
          alert("Csak admin törölhet cikket.");
          return;
        }
        if (!confirm("Biztosan törlöd ezt a cikket?")) {
          return;
        }

        const originalText = button?.textContent;
        if (button) {
          button.disabled = true;
          button.textContent = "...";
        }

        try {
          const response = await fetch(`/api/academy/articles/${articleId}`, {
            method: "DELETE",
            headers: buildAuthHeaders(),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.message || "Nem sikerült törölni a cikket.");
          }
          if (card) {
            card.remove();
          }
          academyArticles = academyArticles.filter((item) => item.id !== articleId);
          renderAcademyGrid();
        } catch (error) {
          console.error("Cikk törlési hiba:", error);
          alert(error.message || "Nem sikerült törölni a cikket.");
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent = originalText || "X";
          }
        }
      }

      async function handleAcademyDownload(article) {
        if (!article?.id) {
          return;
        }
        try {
          const response = await fetch(`/api/academy/articles/${article.id}/download`);
          if (!response.ok) {
            throw new Error("Nem sikerült lekérni a tag-eket.");
          }
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = article?.pdf_original_filename || "kutatas.pdf";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
        } catch (error) {
          console.error("PDF letöltési hiba:", error);
          alert(error.message || "Nem sikerült feltölteni a programot.");
        }
      }

      async function handleAcademySave(event) {
        event.preventDefault();
        if (!isAdminUser()) {
          alert("Csak admin menthet cikket.");
          return;
        }

        const title = academyTitleInput?.value?.trim();
        if (!title) {
          alert("A cím megadása kötelező.");
          return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("subtitle", academySubtitleInput?.value?.trim() || "");
        formData.append("summary", academySummaryInput?.value?.trim() || "");
        formData.append("keywords", academyKeywordsInput?.value?.trim() || "");
        formData.append("content", academyContentInput?.value || "");
        formData.append("inline_images", JSON.stringify(academyInlineImages));

        const selectedTags = academyTagSelect
          ? Array.from(academyTagSelect.selectedOptions || []).map((option) => Number(option.value)).filter(Number.isFinite)
          : [];
        formData.append("tags", JSON.stringify(selectedTags));

        if (academyCoverBlob) {
          formData.append("cover", academyCoverBlob, academyCoverOriginalFileName || "academy-cover.jpg");
        } else if (academyCoverInput?.files?.length) {
          formData.append("cover", academyCoverInput.files[0]);
        }
        if (academyPdfInput?.files?.length) {
          formData.append("pdf", academyPdfInput.files[0]);
        }

        const isEditMode = Boolean(editingAcademyArticle?.id);
        const endpoint = isEditMode ? `/api/academy/articles/${editingAcademyArticle.id}` : "/api/academy/articles";
        const method = isEditMode ? "PUT" : "POST";

        const originalText = academyEditorSaveBtn?.textContent;
        if (academyEditorSaveBtn) {
          academyEditorSaveBtn.disabled = true;
          academyEditorSaveBtn.textContent = isEditMode ? "Frissítés..." : "Mentés...";
        }

        try {
          const response = await fetch(endpoint, {
            method,
            headers: buildAuthHeaders(),
            body: formData,
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.message || "Nem sikerült törölni a cikket.");
          }
          closeAcademyEditor();
          await loadAcademyData(true);
        } catch (error) {
          console.error("Cikk mentési hiba:", error);
          alert(error.message || "Nem sikerült törölni a cikket.");
        } finally {
          if (academyEditorSaveBtn) {
            academyEditorSaveBtn.disabled = false;
            academyEditorSaveBtn.textContent = originalText || "Mentés";
          }
        }
      }

      async function handleAcademyTagCreate() {
        if (!isAdminUser()) {
          return;
        }
        const name = academyTagNameInput?.value?.trim();
        if (!name) {
          if (academyTagCreateStatus) {
            academyTagCreateStatus.textContent = "Add meg a tag nev\u00E9t.";
          }
          return;
        }
        const color = normalizeColor(academyTagColorInput?.value);
        if (academyTagCreateBtn) {
          academyTagCreateBtn.disabled = true;
        }
        if (academyTagCreateStatus) {
          academyTagCreateStatus.textContent = "MentAs...";
        }

        try {
          const response = await fetch("/api/academy/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...buildAuthHeaders() },
            body: JSON.stringify({ name, color }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.message || "Nem sikerült menteni a cikket.");
          }
          const createdId = payload?.id;
          if (academyTagNameInput) {
            academyTagNameInput.value = "";
          }
          if (academyTagCreateStatus) {
            academyTagCreateStatus.textContent = "Tag l\u00E9trehozva.";
          }
          await loadAcademyTags(true);
          if (createdId && academyTagSelect) {
            Array.from(academyTagSelect.options || []).forEach((option) => {
              if (String(option.value) === String(createdId)) {
                option.selected = true;
              }
            });
          }
        } catch (error) {
          console.error("Kép feldolgozási hiba:", error);
          if (academyTagCreateStatus) {
            academyTagCreateStatus.textContent = error.message || "Nem siker\u00FClt l\u00E9trehozni a taget.";
          }
        } finally {
          if (academyTagCreateBtn) {
            academyTagCreateBtn.disabled = false;
          }
        }
      }

      if (academyCreateBtn) {
        academyCreateBtn.addEventListener("click", () => openAcademyEditor());
      }

      if (academyBackBtn) {
        academyBackBtn.addEventListener("click", closeAcademyReader);
      }

      if (academyDownloadBtn) {
        academyDownloadBtn.addEventListener("click", () => {
          if (activeAcademyArticle) {
            handleAcademyDownload(activeAcademyArticle);
          }
        });
      }

      if (academyEditorForm) {
        academyEditorForm.addEventListener("submit", handleAcademySave);
      }

      if (academyEditorCancelBtn) {
        academyEditorCancelBtn.addEventListener("click", closeAcademyEditor);
      }

      if (academyEditorCloseBtn) {
        academyEditorCloseBtn.addEventListener("click", closeAcademyEditor);
      }

      if (academyEditorModal) {
        academyEditorModal.addEventListener("click", (event) => {
          if (event.target === academyEditorModal) {
            event.preventDefault();
            event.stopPropagation();
          }
        });
      }

      if (academyCoverInput) {
        academyCoverInput.addEventListener("change", () => {
          const file = academyCoverInput.files?.[0];
          if (!file) {
            return;
          }
          academyCoverBlob = null;
          const baseName = file.name.replace(/\.[^/.]+$/, "") || "academy-cover";
          academyCoverOriginalFileName = `${baseName}.jpg`;
          openAcademyCoverCropper(file);
        });
      }

      if (academyCoverZoomRange) {
        academyCoverZoomRange.addEventListener("input", (event) => {
          if (academyCoverCropperInstance) {
            const zoomValue = parseFloat(event.target.value);
            academyCoverCropperInstance.zoomTo(zoomValue);
          }
        });
      }

      if (academyCoverCropperCancel) {
        academyCoverCropperCancel.addEventListener("click", () => {
          academyCoverBlob = null;
          academyCoverOriginalFileName = "";
          closeAcademyCoverCropper(true);
        });
      }

      if (academyCoverCropperSave) {
        academyCoverCropperSave.addEventListener("click", () => {
          if (!academyCoverCropperInstance) {
            return;
          }
          const canvas = academyCoverCropperInstance.getCroppedCanvas({
            width: 1600,
            height: 600,
            imageSmoothingQuality: "high",
          });
          if (!canvas) {
            return;
          }
          canvas.toBlob((blob) => {
            if (!blob) {
              return;
            }
            academyCoverBlob = blob;
            if (academyCoverObjectUrl) {
              URL.revokeObjectURL(academyCoverObjectUrl);
            }
            academyCoverObjectUrl = URL.createObjectURL(blob);
            if (academyCoverPreview) {
              academyCoverPreview.src = academyCoverObjectUrl;
            }
            if (academyCoverInput) {
              academyCoverInput.value = "";
            }
            closeAcademyCoverCropper();
          }, "image/jpeg", 0.92);
        });
      }

      if (academyPdfInput) {
        academyPdfInput.addEventListener("change", () => {
          const file = academyPdfInput.files?.[0];
          if (academyPdfName) {
            academyPdfName.textContent = file?.name || editingAcademyArticle?.pdf_original_filename || "Nincs kiválasztva PDF.";
          }
        });
      }



      if (academyInlineImageUploadBtn) {
        academyInlineImageUploadBtn.addEventListener("click", async () => {
          if (!isAdminUser()) {
            alert("Csak admin tölthet fel képet.");
            return;
          }
          const files = Array.from(academyInlineImageInput?.files || []);
          if (!files.length) {
            if (academyInlineImageStatus) {
              academyInlineImageStatus.textContent = "Válassz ki legalább egy képet.";
            }
            return;
          }

          const formData = new FormData();
          files.forEach((file) => {
            formData.append("images", file);
          });

          if (academyInlineImageStatus) {
            academyInlineImageStatus.textContent = "Feltöltés...";
          }
          academyInlineImageUploadBtn.disabled = true;

          try {
            const response = await fetch("/api/academy/images", {
              method: "POST",
              headers: buildAuthHeaders(),
              body: formData,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(payload?.message || "Nem sikerült a képek feltöltése.");
            }
            const items = Array.isArray(payload?.items) ? payload.items : [];
            if (!items.length) {
              throw new Error("Nem sikerült képeket visszakapni.");
            }
            const mapped = items.map((item) => {
              const title = formatInlineImageTitle(item?.title || item?.original_name || item?.filename);
              const url = item?.url || (item?.filename ? `/uploads/akademia/${item.filename}` : "");
              return { title, url };
            }).filter((item) => item.url);

            academyInlineImages = academyInlineImages.concat(mapped);
            renderAcademyInlineImages();

            if (academyInlineImageInput) {
              academyInlineImageInput.value = "";
            }
            if (academyInlineImageStatus) {
              academyInlineImageStatus.textContent = "Képek feltöltve. Másold ki a kódot a listából.";
            }
          } catch (error) {
            console.error("Akadémia kép feltöltési hiba:", error);
            if (academyInlineImageStatus) {
              academyInlineImageStatus.textContent = error.message || "Nem sikerült a képek feltöltése.";
            }
          } finally {
            academyInlineImageUploadBtn.disabled = false;
          }
        });
      }
      if (academyTagCreateBtn) {
        academyTagCreateBtn.addEventListener("click", handleAcademyTagCreate);
      }

