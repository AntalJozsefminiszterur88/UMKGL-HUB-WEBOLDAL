const loginModal = document.getElementById("loginModal");
    const closeLogin = document.getElementById("closeLogin");
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const authLoggedOut = document.getElementById("authLoggedOut");
    const authLoggedIn = document.getElementById("authLoggedIn");
    const userGreeting = document.getElementById("userGreeting");
    const adminNavBtn = document.getElementById("adminNavBtn");
    const programNavBtn = document.getElementById("programNavBtn");
    const userListContainer = document.getElementById("userListContainer");
    const savePermissionsBtn = document.getElementById("savePermissionsBtn");
    const pollCreator = document.getElementById("pollCreator");
    const pollCreatorNotice = document.getElementById("pollCreatorNotice");
    const createPollForm = document.getElementById("createPollForm");
    const questionInput = document.getElementById("questionInput");
    const optionsContainer = document.getElementById("optionsContainer");
    const addOptionBtn = document.getElementById("addOptionBtn");
    const pollListContainer = document.getElementById("pollList");
    const pollSection = document.getElementById("szavazas");

    const SESSION_KEYS = {
      token: "token",
      username: "username",
      isAdmin: "isAdmin",
      profilePictureFilename: "profilePictureFilename",
    };
    const POLL_MIN_OPTIONS = 2;
    let pollsShouldRefresh = true;

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

    function storeSessionData({ token, username, isAdmin, profilePictureFilename }) {
      if (typeof token === "string" && token.trim()) {
        localStorage.setItem(SESSION_KEYS.token, token);
      }
      if (typeof username === "string" && username.trim()) {
        localStorage.setItem(SESSION_KEYS.username, username);
      }
      localStorage.setItem(SESSION_KEYS.isAdmin, isAdmin ? "true" : "false");
      if (typeof profilePictureFilename === "string" && profilePictureFilename.trim()) {
        localStorage.setItem(SESSION_KEYS.profilePictureFilename, profilePictureFilename);
      }
    }

    function clearStoredSession() {
      localStorage.removeItem(SESSION_KEYS.token);
      localStorage.removeItem(SESSION_KEYS.username);
      localStorage.removeItem(SESSION_KEYS.isAdmin);
      localStorage.removeItem(SESSION_KEYS.profilePictureFilename);
    }

    function getStoredToken() {
      return localStorage.getItem(SESSION_KEYS.token) || "";
    }

    function isUserLoggedIn() {
      return !!getStoredToken();
    }

    function buildAuthHeaders() {
      const token = getStoredToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }

    if (savePermissionsBtn) {
      savePermissionsBtn.disabled = true;
    }

    function openLoginModal() {
      if (loginForm) {
        loginForm.reset();
      }
      loginModal.style.display = "flex";
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
      removeBtn.textContent = "✕";
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
      status.className = `poll-status ${poll?.isActive ? "poll-status--active" : "poll-status--closed"}`;
      status.textContent = poll?.isActive ? "Aktív" : "Lezárt";
      header.appendChild(status);

      card.appendChild(header);

      const creatorName = poll?.creator?.username || "Ismeretlen";
      const meta = document.createElement("div");
      meta.className = "poll-meta";
      let metaText = `Létrehozta: ${creatorName}`;
      if (poll?.createdAt) {
        const createdAt = new Date(poll.createdAt);
        if (!Number.isNaN(createdAt.valueOf())) {
          metaText += ` • ${createdAt.toLocaleString("hu-HU")}`;
        }
      }
      meta.textContent = metaText;
      card.appendChild(meta);

      if (poll?.isActive && !isUserLoggedIn()) {
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
          label.textContent = option?.text || "Válaszlehetőség";
          headerRow.appendChild(label);

          const count = document.createElement("div");
          count.className = "poll-option-count";
          const votes = Number(option?.voteCount) || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          count.textContent = `${votes} szavazat (${percentage}%)`;
          headerRow.appendChild(count);

          if (poll?.isActive && !poll?.userVoteOptionId && isUserLoggedIn()) {
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
      totalVotesInfo.textContent = `Összes szavazat: ${totalVotes}`;
      card.appendChild(totalVotesInfo);

      if (poll?.canClose) {
        const actions = document.createElement("div");
        actions.className = "poll-actions";
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "poll-button poll-close-btn";
        closeBtn.textContent = "Szavazás lezárása";
        closeBtn.addEventListener("click", () => handleClosePoll(poll.id, closeBtn));
        actions.appendChild(closeBtn);
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
        console.error("Szavazások betöltési hiba:", error);
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
        button.textContent = "Küldés...";
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
              : "Nem sikerült lezárni a szavazást.";
          throw new Error(message);
        }

        await loadPolls();
      } catch (error) {
        console.error("Szavazás lezárási hiba:", error);
        alert(error.message || "Nem sikerült lezárni a szavazást.");
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText || "Szavazás lezárása";
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
          alert(error.message || "Nem sikerült létrehozni a szavazást.");
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

    function updateAdminNavVisibility() {
      const isAdmin = isAdminUser();

      if (adminNavBtn) {
        adminNavBtn.style.display = isAdmin ? "inline-block" : "none";
      }

      if (programNavBtn) {
        programNavBtn.style.display = isAdmin ? "inline-block" : "none";
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
        if (userListContainer) {
          userListContainer.innerHTML = "";
        }
        if (savePermissionsBtn) {
          savePermissionsBtn.disabled = true;
        }
      }
    }

    function updateUIForLoggedIn(username, profilePictureFilename) {
      if (userGreeting) {
        userGreeting.textContent = `Szia, ${username}!`;
      }
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) {
          userAvatar.src = profilePictureFilename ? `/uploads/avatars/${profilePictureFilename}` : 'program_icons/default-avatar.png';
      }
      const profileAvatarPreview = document.getElementById('profileAvatarPreview');
      if (profileAvatarPreview) {
          profileAvatarPreview.src = profilePictureFilename ? `/uploads/avatars/${profilePictureFilename}` : 'program_icons/default-avatar.png';
      }
      if (authLoggedOut) {
        authLoggedOut.style.display = "none";
      }
      if (authLoggedIn) {
        authLoggedIn.style.display = "flex";
      }

      updateAdminNavVisibility();
      updatePollCreatorState(true);
      markPollsForRefresh();
    }

    function updateUIForLoggedOut() {
      if (authLoggedOut) {
        authLoggedOut.style.display = "flex";
      }
      if (authLoggedIn) {
        authLoggedIn.style.display = "none";
      }
      if (userGreeting) {
        userGreeting.textContent = "";
      }
      updateAdminNavVisibility();
      updatePollCreatorState(false);
      markPollsForRefresh();
    }

    if (loginBtn) {
      loginBtn.addEventListener("click", openLoginModal);
    }

    function renderUserList(users) {
      if (!userListContainer) {
        return;
      }

      userListContainer.innerHTML = "";

      if (!Array.isArray(users) || users.length === 0) {
        userListContainer.textContent = "Nincs megjeleníthető felhasználó.";
        if (savePermissionsBtn) {
          savePermissionsBtn.disabled = true;
        }
        return;
      }

      const table = document.createElement("table");
      table.className = "user-table";

      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>Felhasználónév</th>
          <th>Feltöltési jogosultság</th>
          <th>Max fájlméret (MB)</th>
          <th>Videó limit</th>
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

        const permissionCell = document.createElement("td");
        const label = document.createElement("label");
        label.className = "permission-toggle";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Number(user.can_upload) === 1;
        label.appendChild(checkbox);
        label.append(" Feltölthet");
        permissionCell.appendChild(label);
        row.appendChild(permissionCell);

        const maxFileSizeCell = document.createElement("td");
        const maxFileInput = document.createElement("input");
        maxFileInput.type = "number";
        maxFileInput.min = "1";
        maxFileInput.required = true;
        maxFileInput.name = "maxFileSizeMb";
        maxFileInput.value = Number.parseInt(user.max_file_size_mb, 10) || "";
        maxFileSizeCell.appendChild(maxFileInput);
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

        const uploadsCell = document.createElement("td");
        uploadsCell.textContent = Number.parseInt(user.upload_count, 10) || 0;
        row.appendChild(uploadsCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      userListContainer.appendChild(table);

      if (savePermissionsBtn) {
        savePermissionsBtn.disabled = false;
      }
    }

    async function loadAdminPanel() {
      const storedToken = localStorage.getItem("token");
      const token = typeof storedToken === "string" ? storedToken.trim() : null;

      if (!token) {
        alert("Nincs érvényes hitelesítés.");
        return;
      }

      try {
        const response = await fetch("/api/users", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message = data && data.message ? data.message : "Nem sikerült betölteni a felhasználókat.";
          throw new Error(message);
        }

        renderUserList(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Admin panel betöltési hiba:", error);
        alert(error.message || "Nem sikerült betölteni az admin panel adatait.");
        if (savePermissionsBtn) {
          savePermissionsBtn.disabled = true;
        }
      }
    }

    if (savePermissionsBtn) {
      const originalButtonText = savePermissionsBtn.textContent;

      savePermissionsBtn.addEventListener("click", async () => {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("Nincs érvényes hitelesítés.");
          return;
        }

        if (!userListContainer) {
          alert("Nem található a felhasználói lista.");
          return;
        }

        const tableBody = userListContainer.querySelector("tbody");
        if (!tableBody) {
          alert("Nincs mentésre váró adat.");
          return;
        }

        const rows = Array.from(tableBody.querySelectorAll("tr"));
        const invalidEntries = [];
        const permissionsToUpdate = rows
          .map((row) => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            const maxFileSizeInput = row.querySelector('input[name="maxFileSizeMb"]');
            const maxVideosInput = row.querySelector('input[name="maxVideos"]');
            const userIdAttr = row.dataset.userId;

            if (!checkbox || !maxFileSizeInput || !maxVideosInput || !userIdAttr) {
              return null;
            }

            const userId = Number.parseInt(userIdAttr, 10);
            if (Number.isNaN(userId)) {
              return null;
            }

            const maxFileSizeValue = Number.parseInt(maxFileSizeInput.value, 10);
            const maxVideosValue = Number.parseInt(maxVideosInput.value, 10);

            if (!Number.isFinite(maxFileSizeValue) || maxFileSizeValue <= 0 || !Number.isFinite(maxVideosValue) || maxVideosValue <= 0) {
              const usernameCell = row.querySelector("td");
              const identifier = usernameCell ? usernameCell.textContent.trim() : `ID ${userId}`;
              invalidEntries.push(identifier);
              return null;
            }

            return {
              userId,
              canUpload: checkbox.checked,
              maxFileSizeMb: maxFileSizeValue,
              maxVideos: maxVideosValue,
            };
          })
          .filter(Boolean);

        if (invalidEntries.length > 0) {
          alert(`Adj meg érvényes, pozitív limiteket a következő felhasználóknál: ${invalidEntries.join(", ")}.`);
          return;
        }

        if (permissionsToUpdate.length === 0) {
          alert("Nincs mentésre váró adat.");
          return;
        }

        savePermissionsBtn.disabled = true;
        savePermissionsBtn.textContent = "Mentés folyamatban...";

        try {
          const response = await fetch("/api/users/permissions/batch-update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(permissionsToUpdate),
          });

          const result = await response.json().catch(() => null);

          if (!response.ok) {
            const message = result && result.message ? result.message : "Nem sikerült menteni a jogosultságokat.";
            throw new Error(message);
          }

          alert((result && result.message) || "Jogosultságok sikeresen frissítve.");
          await loadAdminPanel();
        } catch (error) {
          console.error("Jogosultság mentési hiba:", error);
          alert(error.message || "Nem sikerült menteni a jogosultságokat.");
        } finally {
          savePermissionsBtn.disabled = false;
          savePermissionsBtn.textContent = originalButtonText;
        }
      });
    }

    closeLogin.addEventListener("click", () => {
      loginModal.style.display = "none";
    });

    if (adminNavBtn) {
      adminNavBtn.addEventListener("click", loadAdminPanel);
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
      if (event.key === "Escape" && feedbackModal.style.display === "flex") {
        hideFeedbackModal();
      }
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        clearStoredSession();
        updateUIForLoggedOut();
        try {
          await fetch("/logout", { method: "POST" });
        } catch (error) {
          console.warn("Nem sikerült kijelentkeztetni a szerveren:", error);
        }
        showFeedbackModal({
          title: "Kijelentkezés",
          message: "Sikeresen kijelentkeztél.",
        });
      });
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
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
          storeSessionData({
            token: data.token,
            username: data.username,
            isAdmin: !!data.isAdmin,
            profilePictureFilename: data.profile_picture_filename
          });
          updateUIForLoggedIn(data.username, data.profile_picture_filename);
          loginModal.style.display = "none";
          showFeedbackModal({
            title: "Sikeres bejelentkezés",
            message: data.message || "Sikeres bejelentkezés.",
          });
        } else {
          alert(data.message || "Hibás felhasználónév vagy jelszó.");
        }
      } catch (error) {
        console.error("Bejelentkezési hiba:", error);
        alert("Hiba történt a bejelentkezés során. Próbáld meg később.");
      }
    });

    async function ensureSessionOnLoad() {
      const storedToken = localStorage.getItem(SESSION_KEYS.token);
      const headers = {};

      if (storedToken) {
        headers.Authorization = `Bearer ${storedToken}`;
      }

      try {
        const response = await fetch("/auth/me", {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error("Érvénytelen munkamenet");
        }

        const session = await response.json();

        if (!session || !session.token || !session.username) {
          throw new Error("Hiányos munkamenet adatok");
        }

        storeSessionData({
          token: session.token,
          username: session.username,
          isAdmin: !!session.isAdmin,
          profilePictureFilename: session.profile_picture_filename
        });

        updateUIForLoggedIn(session.username, session.profile_picture_filename);

        updateAdminNavVisibility();
      } catch (error) {
        console.warn("Nem sikerült visszaállítani a munkamenetet:", error);
        clearStoredSession();
        updateUIForLoggedOut();
      }
    }

    window.addEventListener("load", () => {
      ensureSessionOnLoad();
    });

    const userProfileLink = document.getElementById('userProfileLink');
    if (userProfileLink) {
        userProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('profile');
        });
    }

    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarUploadStatus = document.getElementById('avatarUploadStatus');

    if (uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', async () => {
            const token = getStoredToken();
            if (!token) {
                alert("A feltöltéshez be kell jelentkezned.");
                return;
            }

            const file = avatarInput.files[0];
            if (!file) {
                alert("Válassz ki egy képfájlt a feltöltéshez.");
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file);

            uploadAvatarBtn.disabled = true;
            avatarUploadStatus.textContent = "Feltöltés folyamatban...";

            try {
                const response = await fetch('/api/profile/upload-avatar', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Nem sikerült feltölteni a profilképet.');
                }

                avatarUploadStatus.textContent = result.message;
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
            const token = getStoredToken();

            try {
                const res = await fetch('/api/profile/update-name', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
            const token = getStoredToken();

            try {
                const res = await fetch('/api/profile/update-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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