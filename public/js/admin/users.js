(function () {
  "use strict";

  function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("users-window__status--error", isError);
  }

  function createToggle(name, checked, text) {
    const label = document.createElement("label");
    label.className = "permission-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = checked;

    label.append(input, ` ${text}`);
    return { label, input };
  }

  function appendToggleCell(row, toggle) {
    const cell = document.createElement("td");
    cell.appendChild(toggle.label);
    row.appendChild(cell);
  }

  function appendLimitCell(row, name, value) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.required = true;
    input.name = name;
    input.value = Number.parseInt(value, 10) || "";
    cell.appendChild(input);
    row.appendChild(cell);
  }

  function createUserRow(user) {
    const row = document.createElement("tr");
    row.dataset.userId = user.id;

    const usernameCell = document.createElement("td");
    usernameCell.textContent = user.username;
    row.appendChild(usernameCell);

    const upload = createToggle("canUpload", Number(user.can_upload) === 1, "Feltölthet");
    const transfer = createToggle("canTransfer", Number(user.can_transfer) === 1, "P2P");
    const clips = createToggle("canViewClips", Number(user.can_view_clips) === 1, "Klipek");
    const canEditArchive = Number(user.can_edit_archive) === 1;
    const archiveView = createToggle(
      "canViewArchive",
      Number(user.can_view_archive) === 1 || canEditArchive,
      "Archívum"
    );
    const archiveEdit = createToggle("canEditArchive", canEditArchive, "Szerkesztés");
    const discord = createToggle("canUseDiscord", Number(user.can_use_discord) === 1, "Discord 2");

    [upload, transfer, clips, archiveView, archiveEdit, discord].forEach((toggle) => {
      appendToggleCell(row, toggle);
    });

    archiveView.input.addEventListener("change", () => {
      if (!archiveView.input.checked) archiveEdit.input.checked = false;
    });
    archiveEdit.input.addEventListener("change", () => {
      if (archiveEdit.input.checked) archiveView.input.checked = true;
    });

    appendLimitCell(row, "maxFileSizeMb", user.max_file_size_mb);
    appendLimitCell(row, "maxVideos", user.max_videos);

    const countCell = document.createElement("td");
    countCell.textContent = Number.parseInt(user.upload_count, 10) || 0;
    row.appendChild(countCell);
    return row;
  }

  function renderUsers(users, container, saveButton) {
    container.innerHTML = "";
    if (!users.length) {
      container.textContent = "Nincs megjeleníthető felhasználó.";
      saveButton.disabled = true;
      return;
    }

    const table = document.createElement("table");
    table.className = "user-table";
    table.innerHTML = `
      <thead>
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
      </thead>
    `;

    const body = document.createElement("tbody");
    users.forEach((user) => body.appendChild(createUserRow(user)));
    table.appendChild(body);
    container.appendChild(table);
    saveButton.disabled = false;
  }

  async function requestUsers() {
    const response = await fetch("/api/users", { headers: authHeaders() });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "Nem sikerült betölteni a felhasználókat.");
    }
    return Array.isArray(data) ? data : [];
  }

  function collectUpdates(container) {
    const rows = Array.from(container.querySelectorAll("tbody tr"));
    const invalidEntries = [];
    const updates = rows.map((row) => {
      const value = (name) => row.querySelector(`[name="${name}"]`);
      const userId = Number.parseInt(row.dataset.userId, 10);
      const maxFileSizeMb = Number.parseInt(value("maxFileSizeMb")?.value, 10);
      const maxVideos = Number.parseInt(value("maxVideos")?.value, 10);

      if (!Number.isFinite(userId) || maxFileSizeMb <= 0 || maxVideos <= 0) {
        invalidEntries.push(row.querySelector("td")?.textContent.trim() || `ID ${userId}`);
        return null;
      }

      const canEditArchive = value("canEditArchive").checked;
      return {
        userId,
        canUpload: value("canUpload").checked,
        canTransfer: value("canTransfer").checked,
        canViewClips: value("canViewClips").checked,
        canViewArchive: value("canViewArchive").checked || canEditArchive,
        canEditArchive,
        canUseDiscord: value("canUseDiscord").checked,
        maxFileSizeMb,
        maxVideos,
      };
    }).filter(Boolean);

    return { updates, invalidEntries };
  }

  async function saveUpdates(updates) {
    const response = await fetch("/api/users/permissions/batch-update", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(updates),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "Nem sikerült menteni a jogosultságokat.");
    }
    return data;
  }

  function createController() {
    const container = document.getElementById("userListContainer");
    const status = document.getElementById("usersStatus");
    const refreshButton = document.getElementById("refreshUsersBtn");
    const saveButton = document.getElementById("savePermissionsBtn");
    let loaded = false;

    async function load() {
      setStatus(status, "Felhasználók betöltése folyamatban...");
      saveButton.disabled = true;
      try {
        const users = await requestUsers();
        renderUsers(users, container, saveButton);
        loaded = true;
        setStatus(status, `${users.length} felhasználó betöltve.`);
      } catch (error) {
        console.error("Felhasználók betöltési hiba:", error);
        setStatus(status, error.message || "Nem sikerült betölteni a felhasználókat.", true);
      }
    }

    async function save() {
      const { updates, invalidEntries } = collectUpdates(container);
      if (invalidEntries.length) {
        setStatus(status, `Adj meg pozitív limiteket a következő felhasználóknál: ${invalidEntries.join(", ")}.`, true);
        return;
      }
      if (!updates.length) {
        setStatus(status, "Nincs mentésre váró felhasználói adat.", true);
        return;
      }

      const originalText = saveButton.textContent;
      saveButton.disabled = true;
      saveButton.textContent = "Mentés folyamatban...";
      setStatus(status, "Jogosultságok mentése folyamatban...");
      try {
        const result = await saveUpdates(updates);
        setStatus(status, result?.message || "Jogosultságok sikeresen frissítve.");
        await load();
      } catch (error) {
        console.error("Jogosultságok mentési hiba:", error);
        setStatus(status, error.message || "Nem sikerült menteni a jogosultságokat.", true);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalText;
      }
    }

    refreshButton.addEventListener("click", load);
    saveButton.addEventListener("click", save);
    return {
      ensureLoaded() {
        if (!loaded) load();
      },
    };
  }

  window.AdminUsers = { createController };
})();
