      function clearDiscord2RuntimeState() {
        teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: true });
        discord2State.serverName = "UMKGL Szerver";
        discord2State.serverLogoUrl = "program_icons/default-avatar.png";
        discord2State.serverLogoFilename = null;
        discord2State.categories = [];
        discord2State.channels = [];
        discord2State.messagesByChannel = {};
        discord2State.selectedChannelId = null;
        discord2State.onlineMembers = [];
        discord2State.voiceMembersByChannel = {};
        discord2State.collapsedCategoryIds = {};
        discord2State.selfUserId = null;
        discord2State.selfVoiceChannelId = null;
        discord2State.speakingByUser = {};
        discord2State.screenSharingByUser = {};
        discord2State.inputMeterLevel = 0;
        discord2State.inputMeterThreshold = 0.5;
        discord2State.inputMeterRms = 0;
        discord2State.isMuted = false;
        discord2State.isDeafened = false;
        discord2LastSpeakingSentState = null;
        discord2PendingUploadFile = null;
        discord2SendingMessage = false;
        hideDiscord2DropOverlay(true);
        closeDiscord2MediaViewer();

        if (discord2UploadInput) {
          discord2UploadInput.value = "";
        }
        if (discord2UploadLabel) {
          discord2UploadLabel.textContent = "";
        }
        renderDiscord2InputMeter();
        renderDiscord2ServerIdentity();
      }

      function populateDiscord2CategoryOptions(selectedCategoryId = null) {
        if (!discord2ManageCategory) {
          return;
        }
        const normalizedSelectedCategoryId = normalizeDiscord2Id(selectedCategoryId);
        discord2ManageCategory.innerHTML = "";
        discord2State.categories
          .slice()
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          .forEach((category, index) => {
            const categoryId = normalizeDiscord2Id(category.id);
            if (!categoryId) {
              return;
            }
            const option = document.createElement("option");
            option.value = String(categoryId);
            option.textContent = category.name;
            if (
              (normalizedSelectedCategoryId && categoryId === normalizedSelectedCategoryId)
              || (!normalizedSelectedCategoryId && index === 0)
            ) {
              option.selected = true;
            }
            discord2ManageCategory.appendChild(option);
          });
      }

      function closeDiscord2ManageModal() {
        discord2ManageState = null;
        if (!discord2ManageModal) {
          return;
        }
        discord2ManageModal.classList.remove("is-open");
        discord2ManageModal.setAttribute("aria-hidden", "true");
      }

      function openDiscord2ManageModal(config) {
        if (!discord2ManageModal || !discord2ManageForm || !discord2ManageName || !discord2ManageTitle) {
          return;
        }

        discord2ManageState = config;
        discord2ManageTitle.textContent = config?.title || "Discord 2";
        discord2ManageName.value = config?.name || "";

        const showType = config?.mode === "create-channel";
        const showCategory = config?.mode === "create-channel";

        if (discord2ManageTypeWrap) {
          discord2ManageTypeWrap.style.display = showType ? "block" : "none";
        }
        if (discord2ManageCategoryWrap) {
          discord2ManageCategoryWrap.style.display = showCategory ? "block" : "none";
        }
        if (discord2ManageType) {
          discord2ManageType.value = config?.channelType === "voice" ? "voice" : "text";
        }
        if (showCategory) {
          populateDiscord2CategoryOptions(config?.categoryId || null);
        }
        if (discord2ManageDeleteBtn) {
          const canDelete = config?.mode === "rename-category" || config?.mode === "rename-channel";
          discord2ManageDeleteBtn.style.display = canDelete ? "inline-flex" : "none";
        }

        discord2ManageModal.classList.add("is-open");
        discord2ManageModal.setAttribute("aria-hidden", "false");
        discord2ManageName.focus();
        discord2ManageName.select();
      }

      function hideDiscord2ContextMenu() {
        discord2ContextState = null;
        if (!discord2ContextMenu) {
          return;
        }
        discord2ContextMenu.classList.remove("is-open");
        discord2ContextMenu.setAttribute("aria-hidden", "true");
      }

      function syncDiscord2ContextMenuActions(payload) {
        if (!discord2ContextMenu) {
          return;
        }

        const renameButton = discord2ContextMenu.querySelector("button[data-action='rename']");
        const deleteButton = discord2ContextMenu.querySelector("button[data-action='delete']");
        const isMessageContext = payload?.entityType === "message";

        if (renameButton) {
          renameButton.style.display = isMessageContext ? "none" : "block";
        }
        if (deleteButton) {
          deleteButton.style.display = "block";
          deleteButton.textContent = "Törlés";
        }
      }

      function openDiscord2ContextMenu(clientX, clientY, payload) {
        if (!discord2ContextMenu) {
          return;
        }
        discord2ContextState = payload;
        syncDiscord2ContextMenuActions(payload);
        discord2ContextMenu.style.left = `${clientX}px`;
        discord2ContextMenu.style.top = `${clientY}px`;
        discord2ContextMenu.classList.add("is-open");
        discord2ContextMenu.setAttribute("aria-hidden", "false");
      }

      function setDiscord2ServerSettingsStatus(text = "", isError = false) {
        if (!discord2ServerSettingsStatus) {
          return;
        }
        discord2ServerSettingsStatus.textContent = text;
        discord2ServerSettingsStatus.classList.toggle("is-error", Boolean(isError));
      }

      function closeDiscord2ServerLogoCropper(resetInput = false) {
        if (discord2ServerLogoCropperModal) {
          discord2ServerLogoCropperModal.classList.remove("open");
          discord2ServerLogoCropperModal.setAttribute("aria-hidden", "true");
        }
        if (discord2ServerLogoCropper) {
          discord2ServerLogoCropper.destroy();
          discord2ServerLogoCropper = null;
        }
        if (discord2ServerLogoCropperImage) {
          discord2ServerLogoCropperImage.src = "";
        }
        if (discord2ServerLogoZoomRange) {
          discord2ServerLogoZoomRange.value = "1";
        }
        if (resetInput && discord2ServerLogoInput) {
          discord2ServerLogoInput.value = "";
        }
      }

      function openDiscord2ServerSettingsModal() {
        if (!discord2ServerSettingsModal) {
          return;
        }
        if (discord2ServerNameInput) {
          discord2ServerNameInput.value = discord2State.serverName || "UMKGL Szerver";
        }
        if (discord2ServerLogoPreview) {
          discord2ServerLogoPreview.src = discord2State.serverLogoUrl || "program_icons/default-avatar.png";
        }
        setDiscord2ServerSettingsStatus("");
        discord2ServerSettingsModal.classList.add("is-open");
        discord2ServerSettingsModal.setAttribute("aria-hidden", "false");
      }

      function closeDiscord2ServerSettingsModal() {
        if (!discord2ServerSettingsModal) {
          return;
        }
        discord2ServerSettingsModal.classList.remove("is-open");
        discord2ServerSettingsModal.setAttribute("aria-hidden", "true");
        setDiscord2ServerSettingsStatus("");
      }

      async function uploadDiscord2ServerLogoIfNeeded() {
        if (!discord2ServerLogoBlob) {
          return null;
        }
        const token = getStoredToken();
        if (!token) {
          throw new Error("Nem sikerült betölteni a szavazásokat.");
        }

        const formData = new FormData();
        formData.append("logo", discord2ServerLogoBlob, "discord2-server-logo.png");

        const response = await fetch("/api/discord2/server-logo", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Nem siker\u00FClt felt\u00F6lteni a szerver log\u00F3t.");
        }

        discord2ServerLogoBlob = null;
        if (discord2ServerLogoInput) {
          discord2ServerLogoInput.value = "";
        }
        return payload;
      }

      function getDiscord2ChannelRowActions(entityType, entityId, categoryId = "") {
        if (!isAdminUser()) {
          return "";
        }

        return `
          <span class="discord2-row-actions discord2-admin-only">
            <button class="discord2-icon-btn" type="button" data-discord2-action="settings" data-discord2-entity-type="${entityType}" data-discord2-entity-id="${entityId}" data-discord2-category-id="${categoryId}" title="SzerkesztAs"><i class="fa-solid fa-gear"></i></button>
          </span>
        `;
      }

      function isDiscord2MemberSpeaking(userId) {
        const normalizedUserId = normalizeDiscord2Id(userId);
        if (!normalizedUserId) {
          return false;
        }
        return discord2State.speakingByUser[String(normalizedUserId)] === true;
      }

      function renderDiscord2ChannelTree() {
        if (!discord2ChannelTree) {
          return;
        }

        const selectedChannelId = normalizeDiscord2Id(discord2State.selectedChannelId);
        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);

        const categoryMarkup = discord2State.categories
          .slice()
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          .map((category) => {
            const categoryId = normalizeDiscord2Id(category.id);
            if (!categoryId) {
              return "";
            }

            const channels = getDiscord2ChannelsForCategory(categoryId);
            const isCollapsed = Boolean(discord2State.collapsedCategoryIds[categoryId]);
            const arrow = isCollapsed ? ">" : "v";
            const channelRows = channels
              .map((channel) => {
                const channelId = normalizeDiscord2Id(channel.id);
                if (!channelId) {
                  return "";
                }

                const icon = channel.type === "voice" ? "🔊" : "#";
                const isActive = (
                  selectedChannelId === channelId
                  || (channel.type === "voice" && normalizeDiscord2Id(discord2State.selfVoiceChannelId) === channelId)
                ) ? "is-active" : "";
                const voiceMembers = channel.type === "voice"
                  ? (Array.isArray(discord2State.voiceMembersByChannel[String(channelId)])
                    ? discord2State.voiceMembersByChannel[String(channelId)]
                    : [])
                  : [];

                const voicePresence = voiceMembers.length
                  ? `
                      <div class="discord2-voice-presence">
                        ${voiceMembers.map((member) => {
                          const memberUserId = normalizeDiscord2Id(member.userId);
                          const isSelf = selfUserId && memberUserId === selfUserId;
                          const selfState = [];
                          if (isSelf && discord2State.isMuted) {
                            selfState.push("mikrofon n\u00E9m\u00EDtva");
                          }
                          if (isSelf && discord2State.isDeafened) {
                            selfState.push("sALketAtve");
                          }
                          const suffix = selfState.length ? ` (${selfState.join(", ")})` : "";
                          const speakingClass = isDiscord2MemberSpeaking(memberUserId) ? " is-speaking" : "";

                          return `
                            <div class="discord2-voice-user${isSelf ? " is-self" : ""}">
                              <img class="discord2-speaking-avatar${speakingClass}" src="${escapeDiscord2Html(member.avatarUrl)}" alt="">
                              <span>${escapeDiscord2Html(member.username)}${escapeDiscord2Html(suffix)}</span>
                            </div>
                          `;
                        }).join("")}
                      </div>
                    `
                  : "";
                return `
                  <div class="discord2-channel-item" data-discord2-entity-type="channel" data-discord2-entity-id="${channelId}" data-discord2-category-id="${categoryId}">
                    <button class="discord2-channel-row ${isActive}" type="button" data-discord2-channel="${channelId}">
                      <span class="discord2-channel-icon">${icon}</span>
                      <span class="discord2-channel-name">${escapeDiscord2Html(channel.name)}</span>
                      ${getDiscord2ChannelRowActions("channel", channelId, categoryId)}
                    </button>
                    ${voicePresence}
                  </div>
                `;
              })
              .join("");

            return `
              <div class="discord2-category" data-discord2-category="${categoryId}">
                <div class="discord2-category-row" data-discord2-entity-type="category" data-discord2-entity-id="${categoryId}">
                  <button class="discord2-category-toggle" type="button" data-discord2-toggle="${categoryId}">${arrow}</button>
                  <span class="discord2-category-name">${escapeDiscord2Html(category.name)}</span>
                  ${getDiscord2ChannelRowActions("category", categoryId)}
                </div>
                <div class="discord2-channel-list" style="display: ${isCollapsed ? "none" : "flex"};">
                  ${channelRows || `<div class="discord2-empty">Nincs csatorna.</div>`}
                </div>
              </div>
            `;
          })
          .join("");

        discord2ChannelTree.innerHTML = categoryMarkup || `<div class="discord2-empty">Nincs el\u00E9rhet\u0151 kateg\u00F3ria.</div>`;
      }

      function renderDiscord2MessageAttachment(message) {
        const attachment = message?.attachment;
        if (!attachment?.url || !attachment?.kind) {
          return "";
        }

        const safeUrl = escapeDiscord2Html(attachment.url);
        const safeOriginalName = escapeDiscord2Html(attachment.originalName || attachment.filename || "media");
        const safeMimeType = escapeDiscord2Html(attachment.mimeType || "");
        const safeKind = escapeDiscord2Html(attachment.kind);
        const mediaOpenAttrs = `
          data-discord2-open-media="${safeKind}"
          data-discord2-media-url="${safeUrl}"
          data-discord2-media-name="${safeOriginalName}"
          data-discord2-media-type="${safeMimeType}"
        `;
        const attachmentMeta = attachment.sizeBytes
          ? `<span class="discord2-message-attachment-meta">${escapeDiscord2Html(formatDiscord2FileSize(attachment.sizeBytes))}</span>`
          : "";

        if (attachment.kind === "image") {
          return `
            <div class="discord2-message-attachment">
              <button class="discord2-message-preview-btn" type="button" ${mediaOpenAttrs}>
                <img class="discord2-message-image" src="${safeUrl}" alt="${safeOriginalName}" loading="lazy">
                <span class="discord2-message-preview-hint">Nagyitas</span>
              </button>
              <div class="discord2-message-attachment-caption">
                <button class="discord2-message-attachment-name discord2-message-attachment-name--button" type="button" ${mediaOpenAttrs}>${safeOriginalName}</button>
                ${attachmentMeta}
              </div>
            </div>
          `;
        }

        return `
          <div class="discord2-message-attachment">
            <div class="discord2-message-video-shell">
              <video class="discord2-message-video" controls preload="metadata">
                <source src="${safeUrl}" ${safeMimeType ? `type="${safeMimeType}"` : ""}>
              </video>
              <button class="discord2-message-expand-btn" type="button" aria-label="Megnyitás nagyban" ${mediaOpenAttrs}>⤢</button>
            </div>
            <div class="discord2-message-attachment-caption">
              <button class="discord2-message-attachment-name discord2-message-attachment-name--button" type="button" ${mediaOpenAttrs}>${safeOriginalName}</button>
              ${attachmentMeta}
            </div>
          </div>
        `;
      }

      function renderDiscord2Messages() {
        if (!discord2MessageList || !discord2MessageInput || !discord2SendBtn || !discord2UploadBtn || !discord2UploadLabel) {
          return;
        }

        const selectedChannel = getDiscord2SelectedChannel();
        if (!selectedChannel) {
          hideDiscord2DropOverlay(true);
          if (discord2ChannelTitle) {
            discord2ChannelTitle.textContent = "# nincs csatorna";
          }
          if (discord2ChannelDescription) {
            discord2ChannelDescription.textContent = "Nincs kijel\u00F6lt csatorna.";
          }
          discord2MessageList.innerHTML = `<div class="discord2-empty">Nincs kijel\u00F6lt csatorna.</div>`;
          setDiscord2ComposerReadonly("A csatorna nem el\u00E9rhet\u0151.");
          discord2UploadLabel.textContent = "";
          return;
        }

        const channelId = normalizeDiscord2Id(selectedChannel.id);
        const isTextChannel = selectedChannel.type === "text";
        const iconPrefix = isTextChannel ? "#" : "🔊";

        if (discord2ChannelTitle) {
          discord2ChannelTitle.textContent = `${iconPrefix} ${selectedChannel.name}`;
        }
        if (discord2ChannelDescription) {
          discord2ChannelDescription.textContent = getDiscord2ChannelDescription(selectedChannel);
        }

        if (!isTextChannel) {
          hideDiscord2DropOverlay(true);
          discord2MessageList.innerHTML = `
            <div class="discord2-empty">
              <p>A k\u00F6z\u00E9ps\u0151 chat n\u00E9zet csak sz\u00F6veges csatorn\u00E1n akt\u00EDv.</p>
            </div>
          `;
          setDiscord2ComposerReadonly("V\u00E1lassz egy sz\u00F6veges csatorn\u00E1t.");
          if (discord2UploadLabel) {
            discord2UploadLabel.textContent = "";
          }
          return;
        }

        const messages = Array.isArray(discord2State.messagesByChannel[String(channelId)])
          ? discord2State.messagesByChannel[String(channelId)]
          : [];

        if (!messages.length) {
          discord2MessageList.innerHTML = `<div class="discord2-empty">M\u00E9g nincs \u00FCzenet ebben a csatorn\u00E1ban.</div>`;
        } else {
          const sortedMessages = messages
            .map((message, index) => ({
              message,
              index,
              timestamp: getDiscord2MessageTimestampValue(message),
            }))
            .sort((left, right) => {
              if (left.timestamp !== right.timestamp) {
                return left.timestamp - right.timestamp;
              }
              return left.index - right.index;
            })
            .map((entry) => entry.message);

          const messageMarkup = [];
          let previousMessage = null;

          sortedMessages.forEach((message) => {
            if (shouldDiscord2InsertMessageDivider(message, previousMessage)) {
              messageMarkup.push(`
                <div class="discord2-message-divider" role="separator" aria-label="${escapeDiscord2Html(formatDiscord2MessageDividerLabel(message.createdAt))}">
                  <span>${escapeDiscord2Html(formatDiscord2MessageDividerLabel(message.createdAt))}</span>
                </div>
              `);
            }

            const isGroupStart = shouldDiscord2StartNewMessageGroup(message, previousMessage);
            const shortTimeLabel = formatDiscord2MessageTime(message.createdAt);
            const headerTimeLabel = formatDiscord2MessageHeaderTimestamp(message.createdAt);
            const tooltipTimeLabel = formatDiscord2MessageTooltip(message.createdAt);

            messageMarkup.push(`
              <article class="discord2-message ${isGroupStart ? "is-group-start" : "is-grouped"}" data-discord2-message-id="${escapeDiscord2Html(message.id)}">
                <div class="discord2-message-gutter">
                  ${isGroupStart
                    ? `<img class="discord2-message-avatar" src="${escapeDiscord2Html(message.avatarUrl)}" alt="">`
                    : `<time class="discord2-message-inline-time" datetime="${escapeDiscord2Html(message.createdAt)}" title="${escapeDiscord2Html(tooltipTimeLabel)}">${escapeDiscord2Html(shortTimeLabel)}</time>`}
                </div>
                <div class="discord2-message-main">
                  ${isGroupStart
                    ? `
                      <div class="discord2-message-head">
                        <span class="discord2-message-author">${escapeDiscord2Html(message.author)}</span>
                        <time class="discord2-message-time" datetime="${escapeDiscord2Html(message.createdAt)}" title="${escapeDiscord2Html(tooltipTimeLabel)}">${escapeDiscord2Html(headerTimeLabel)}</time>
                      </div>
                    `
                    : ""}
                  ${message.content ? `<p class="discord2-message-body">${escapeDiscord2Html(message.content)}</p>` : ""}
                  ${renderDiscord2MessageAttachment(message)}
                </div>
              </article>
            `);

            previousMessage = message;
          });

          discord2MessageList.innerHTML = messageMarkup.join("");
        }

        setDiscord2ComposerWritable("\u00CDrj \u00FCzenetet...");
        updateDiscord2UploadLabel();
        scrollDiscord2MessagesToBottom();
      }

      function renderDiscord2MemberList() {
        if (!discord2MemberList) {
          return;
        }

        const onlineMembers = Array.isArray(discord2State.onlineMembers)
          ? discord2State.onlineMembers.slice().sort((a, b) => String(a.username).localeCompare(String(b.username), "hu"))
          : [];

        if (!onlineMembers.length) {
          discord2MemberList.innerHTML = `
            <div class="discord2-member-group">
              <h5 class="discord2-member-group-title">Online - 0</h5>
              <div class="discord2-empty">Nincs online, jogosult felhaszn\u00E1l\u00F3.</div>
            </div>
          `;
          return;
        }

        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        discord2MemberList.innerHTML = `
          <div class="discord2-member-group">
            <h5 class="discord2-member-group-title">Online - ${onlineMembers.length}</h5>
            ${onlineMembers.map((member) => {
              const memberVoiceChannelId = normalizeDiscord2Id(member.voiceChannelId);
              const memberVoiceChannel = memberVoiceChannelId ? getDiscord2ChannelById(memberVoiceChannelId) : null;
              const isSelf = selfUserId && normalizeDiscord2Id(member.userId) === selfUserId;
              const isScreenSharing = member.screenSharing || (isSelf && Boolean(discord2ScreenShareStream));

              let statusText = memberVoiceChannel
                ? `Hang: ${memberVoiceChannel.name}`
                : "Online";
              if (isScreenSharing) {
                statusText += " | Screen share";
              }

              if (isSelf && discord2State.isDeafened) {
                statusText += " | S\u00FCket\u00EDtve";
              } else if (isSelf && discord2State.isMuted) {
                statusText += " | NAmAtva";
              }
              const isSpeaking = isDiscord2MemberSpeaking(member.userId);
              const screenShareBadge = isScreenSharing
                ? `<span class="discord2-member-badge">Live</span>`
                : "";

              return `
                <div class="discord2-member">
                  <img class="discord2-speaking-avatar${isSpeaking ? " is-speaking" : ""}" src="${escapeDiscord2Html(member.avatarUrl)}" alt="">
                  <div class="discord2-member-meta">
                    <span class="discord2-member-name">${escapeDiscord2Html(member.username)}${screenShareBadge}</span>
                    <span class="discord2-member-status">${escapeDiscord2Html(statusText)}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }

      function renderDiscord2Userbar() {
        const currentUser = getDiscord2CurrentUser();
        const voiceChannel = getDiscord2ChannelById(discord2State.selfVoiceChannelId);
        const inVoiceChannel = Boolean(voiceChannel);

        if (discord2UserbarAvatar) {
          discord2UserbarAvatar.src = currentUser.avatarUrl;
        }

        if (discord2UserbarName) {
          discord2UserbarName.textContent = currentUser.username || "Felhaszn\u00E1l\u00F3";
        }

        if (discord2UserbarState) {
          if (!discord2SocketConnected) {
            discord2UserbarState.textContent = "Kapcsol\u00F3d\u00E1s...";
          } else {
            let stateText = voiceChannel ? `Hang: ${voiceChannel.name}` : "Online";
            if (discord2ScreenShareStream) {
              stateText += " | Screen share";
            }
            if (discord2State.isDeafened) {
              stateText += " | S\u00FCket\u00EDtve";
            } else if (discord2State.isMuted) {
              stateText += " | NAmAtva";
            }
            discord2UserbarState.textContent = stateText;
          }
        }

        if (discord2VoiceSessionBar) {
          discord2VoiceSessionBar.classList.toggle("is-visible", inVoiceChannel);
          discord2VoiceSessionBar.style.display = inVoiceChannel ? "flex" : "none";
        }

        if (discord2VoiceSessionChannel) {
          discord2VoiceSessionChannel.textContent = inVoiceChannel
            ? `J\u00E1tszunk #${voiceChannel.name}`
            : "Nincs hangh\u00EDv\u00E1s";
        }

        syncDiscord2NoiseSuppressionControls();
        if (!inVoiceChannel) {
          closeDiscord2KrispPopover();
        }

        syncDiscord2LatencyPolling();
        if (discord2VoiceLatencyBtn) {
          discord2VoiceLatencyBtn.setAttribute("aria-disabled", inVoiceChannel ? "false" : "true");
          updateDiscord2LatencyIndicator();
        }

        if (discord2ScreenShareBtn) {
          const isSharingScreen = isDiscord2SelfScreenSharing();
          const screenShareSupported = canDiscord2UseScreenShare();
          const disabled = !inVoiceChannel || !screenShareSupported || discord2ScreenSharePending;
          discord2ScreenShareBtn.disabled = disabled;
          discord2ScreenShareBtn.classList.toggle("is-active", isSharingScreen);
          discord2ScreenShareBtn.setAttribute("aria-pressed", isSharingScreen ? "true" : "false");

          if (!screenShareSupported) {
            discord2ScreenShareBtn.title = "Screen share nem tamogatott ebben a bongeszoben";
          } else if (!inVoiceChannel) {
            discord2ScreenShareBtn.title = "Csatlakozz egy hangcsatornahoz a screen share-hez";
          } else if (discord2ScreenSharePending) {
            discord2ScreenShareBtn.title = "Screen share inditasa...";
          } else {
            discord2ScreenShareBtn.title = isSharingScreen
              ? "Screen share leallitasa"
              : "Screen share inditasa";
          }
          discord2ScreenShareBtn.setAttribute("aria-label", discord2ScreenShareBtn.title);
        }

        if (discord2MuteBtn) {
          discord2MuteBtn.classList.toggle("is-active", Boolean(discord2State.isMuted));
          discord2MuteBtn.setAttribute("aria-pressed", discord2State.isMuted ? "true" : "false");
        }

        if (discord2DeafenBtn) {
          discord2DeafenBtn.classList.toggle("is-active", Boolean(discord2State.isDeafened));
          discord2DeafenBtn.setAttribute("aria-pressed", discord2State.isDeafened ? "true" : "false");
        }

        if (discord2LeaveVoiceBtn) {
          discord2LeaveVoiceBtn.disabled = !inVoiceChannel;
        }
      }

      function renderDiscord2() {
        if (!discord2Section || !hasDiscord2Access()) {
          return;
        }
        ensureDiscord2SelectedChannel();
        renderDiscord2ServerIdentity();
        discord2Section.classList.toggle("discord2--admin", isAdminUser());
        renderDiscord2ChannelTree();
        renderDiscord2Messages();
        renderDiscord2ScreenShareStage();
        renderDiscord2MemberList();
        renderDiscord2Userbar();
      }

      function selectDiscord2Channel(channelId) {
        const normalizedChannelId = normalizeDiscord2Id(channelId);
        if (!normalizedChannelId) {
          return;
        }

        const selectedChannel = getDiscord2ChannelById(normalizedChannelId);
        if (!selectedChannel) {
          return;
        }

        if (selectedChannel.type === "voice") {
          void joinDiscord2VoiceChannel(normalizedChannelId);
          renderDiscord2();
          return;
        }

        discord2State.selectedChannelId = normalizedChannelId;
        renderDiscord2();
        scrollDiscord2MessagesToBottom();
      }

      function handleDiscord2Action(action, entityType, entityId, categoryId = null) {
        if (!isAdminUser()) {
          return;
        }

        const normalizedEntityId = normalizeDiscord2Id(entityId);
        if (action === "settings" || action === "rename" || action === "edit") {
          if (entityType === "category") {
            const category = discord2State.categories.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
            if (!category) {
              return;
            }
            openDiscord2ManageModal({
              mode: "rename-category",
              title: "Kateg\u00F3ria szerkeszt\u00E9se",
              name: category.name,
              targetId: category.id,
            });
            return;
          }

          if (entityType === "channel") {
            const channel = discord2State.channels.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
            if (!channel) {
              return;
            }
            openDiscord2ManageModal({
              mode: "rename-channel",
              title: "Csatorna szerkeszt\u00E9se",
              name: channel.name,
              targetId: channel.id,
            });
          }
          return;
        }

        if (action !== "delete") {
          return;
        }

        ensureDiscord2SocketConnection();
        if (!discord2Socket) {
          return;
        }

        if (entityType === "category") {
          const category = discord2State.categories.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
          if (!category) {
            return;
          }
          if (confirm(`T\u00F6r\u00F6lj\u00FCk a(z) "${category.name}" kateg\u00F3ri\u00E1t \u00E9s az \u00F6sszes csatorn\u00E1j\u00E1t?`)) {
            discord2Socket.emit("discord2_delete_category", { categoryId: normalizedEntityId });
          }
          return;
        }

        if (entityType === "channel") {
          const channel = discord2State.channels.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
          if (!channel) {
            return;
          }
          if (confirm(`T\u00F6r\u00F6lj\u00FCk a(z) "${channel.name}" csatorn\u00E1t?`)) {
            discord2Socket.emit("discord2_delete_channel", { channelId: normalizedEntityId });
          }
          return;
        }

        if (entityType === "message") {
          const selectedChannelId = normalizeDiscord2Id(discord2State.selectedChannelId);
          if (!selectedChannelId) {
            return;
          }

          const channelMessages = Array.isArray(discord2State.messagesByChannel[String(selectedChannelId)])
            ? discord2State.messagesByChannel[String(selectedChannelId)]
            : [];
          const message = channelMessages.find((item) => normalizeDiscord2Id(item.id) === normalizedEntityId);
          if (!message) {
            return;
          }

          if (confirm("T\u00F6r\u00F6lj\u00FCk ezt az \u00FCzenetet?")) {
            discord2Socket.emit("discord2_delete_message", { messageId: normalizedEntityId });
          }
        }
      }

      function normalizeDiscord2Category(rawCategory, index) {
        const categoryId = normalizeDiscord2Id(rawCategory?.id);
        if (!categoryId) {
          return null;
        }

        const name = String(rawCategory?.name || "").trim() || `Kateg\u00F3ria ${index + 1}`;
        return {
          id: categoryId,
          name,
          position: Number.isFinite(Number(rawCategory?.position)) ? Number(rawCategory.position) : index,
        };
      }

      function normalizeDiscord2Channel(rawChannel, index, validCategoryIds) {
        const channelId = normalizeDiscord2Id(rawChannel?.id);
        if (!channelId) {
          return null;
        }

        const parentId = normalizeDiscord2Id(rawChannel?.parentId ?? rawChannel?.parent_id);
        if (parentId && validCategoryIds && !validCategoryIds.has(parentId)) {
          return null;
        }

        const name = String(rawChannel?.name || "").trim() || `csatorna-${index + 1}`;
        return {
          id: channelId,
          name,
          type: rawChannel?.type === "voice" ? "voice" : "text",
          parentId: parentId || null,
          position: Number.isFinite(Number(rawChannel?.position)) ? Number(rawChannel.position) : index,
        };
      }

      function normalizeDiscord2Member(rawMember, forcedVoiceChannelId = null) {
        const userId = normalizeDiscord2Id(rawMember?.userId ?? rawMember?.id);
        if (!userId) {
          return null;
        }

        const username = String(rawMember?.username || rawMember?.name || "").trim() || `user-${userId}`;
        const profilePictureFilename = rawMember?.profile_picture_filename;
        const rawAvatarUrl = typeof rawMember?.avatarUrl === "string" ? rawMember.avatarUrl : "";
        const avatarUrl = rawAvatarUrl
          || (profilePictureFilename ? `/uploads/avatars/${profilePictureFilename}` : "program_icons/default-avatar.png");

        const normalizedForcedVoiceChannelId = normalizeDiscord2Id(forcedVoiceChannelId);
        const normalizedVoiceChannelId = normalizedForcedVoiceChannelId
          || normalizeDiscord2Id(rawMember?.voiceChannelId);
        const normalizedPeerId = typeof rawMember?.peerId === "string"
          ? String(rawMember.peerId).trim()
          : "";

        return {
          userId,
          username,
          avatarUrl,
          isAdmin: rawMember?.isAdmin === true || rawMember?.isAdmin === 1,
          voiceChannelId: normalizedVoiceChannelId || null,
          peerId: normalizedPeerId || null,
          speaking: rawMember?.speaking === true,
          screenSharing: rawMember?.screenSharing === true,
        };
      }

      function normalizeDiscord2Message(rawMessage, forcedChannelId = null) {
        const channelId = normalizeDiscord2Id(rawMessage?.channelId ?? rawMessage?.channel_id ?? forcedChannelId);
        if (!channelId) {
          return null;
        }

        const authorUserId = normalizeDiscord2Id(rawMessage?.userId ?? rawMessage?.user_id);
        const messageIdRaw = rawMessage?.id;
        const messageId = messageIdRaw ? String(messageIdRaw) : createDiscord2TempId("msg");
        const author = String(rawMessage?.author ?? rawMessage?.author_name ?? "Ismeretlen").trim() || "Ismeretlen";
        const content = String(rawMessage?.content || "").trim();
        const rawAttachment = rawMessage?.attachment && typeof rawMessage.attachment === "object"
          ? rawMessage.attachment
          : rawMessage;
        const attachmentKind = rawAttachment?.kind === "video" || rawAttachment?.attachment_kind === "video"
          ? "video"
          : ((rawAttachment?.kind === "image" || rawAttachment?.attachment_kind === "image") ? "image" : null);
        const attachmentFilename = String(rawAttachment?.filename ?? rawAttachment?.attachment_filename ?? "").trim();
        const attachmentUrlRaw = String(rawAttachment?.url ?? "").trim();
        const attachment = attachmentKind && attachmentFilename
          ? {
              kind: attachmentKind,
              filename: attachmentFilename,
              originalName: String(rawAttachment?.originalName ?? rawAttachment?.attachment_original_name ?? attachmentFilename).trim(),
              mimeType: String(rawAttachment?.mimeType ?? rawAttachment?.attachment_mime_type ?? "").trim() || null,
              sizeBytes: Number.isFinite(Number(rawAttachment?.sizeBytes ?? rawAttachment?.attachment_size_bytes))
                ? Number(rawAttachment?.sizeBytes ?? rawAttachment?.attachment_size_bytes)
                : null,
              url: attachmentUrlRaw || `/uploads/discord2/${attachmentKind === "video" ? "videos" : "images"}/${encodeURIComponent(attachmentFilename)}`,
            }
          : null;
        if (!content && !attachment) {
          return null;
        }

        const avatarUrl = typeof rawMessage?.avatarUrl === "string" && rawMessage.avatarUrl
          ? rawMessage.avatarUrl
          : "program_icons/default-avatar.png";

        const createdAt = typeof rawMessage?.createdAt === "string"
          ? rawMessage.createdAt
          : (typeof rawMessage?.created_at === "string" ? rawMessage.created_at : new Date().toISOString());

        return {
          id: messageId,
          channelId,
          userId: authorUserId || null,
          author,
          content,
          avatarUrl,
          createdAt,
          attachment,
        };
      }

      function applyDiscord2Structure(payload) {
        const normalizedCategories = Array.isArray(payload?.categories)
          ? payload.categories
              .map((category, index) => normalizeDiscord2Category(category, index))
              .filter(Boolean)
              .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          : [];

        const validCategoryIds = new Set(normalizedCategories.map((category) => category.id));
        const normalizedChannels = Array.isArray(payload?.channels)
          ? payload.channels
              .map((channel, index) => normalizeDiscord2Channel(channel, index, validCategoryIds))
              .filter(Boolean)
              .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
          : [];

        const nextCollapsed = {};
        normalizedCategories.forEach((category) => {
          if (discord2State.collapsedCategoryIds[category.id]) {
            nextCollapsed[category.id] = true;
          }
        });

        discord2State.categories = normalizedCategories;
        discord2State.channels = normalizedChannels;
        discord2State.collapsedCategoryIds = nextCollapsed;

        const validChannelKeys = new Set(normalizedChannels.map((channel) => String(channel.id)));
        Object.keys(discord2State.messagesByChannel).forEach((channelKey) => {
          if (!validChannelKeys.has(String(channelKey))) {
            delete discord2State.messagesByChannel[channelKey];
          }
        });

        ensureDiscord2SelectedChannel();
      }

      function applyDiscord2Presence(payload) {
        const previousSelfVoiceChannelId = normalizeDiscord2Id(discord2State.selfVoiceChannelId);
        const normalizedOnlineMembers = Array.isArray(payload?.onlineMembers)
          ? payload.onlineMembers
              .map((member) => normalizeDiscord2Member(member))
              .filter(Boolean)
          : [];

        const normalizedVoiceMembersByChannel = {};
        if (payload?.voiceMembersByChannel && typeof payload.voiceMembersByChannel === "object") {
          Object.entries(payload.voiceMembersByChannel).forEach(([rawChannelId, rawMembers]) => {
            const channelId = normalizeDiscord2Id(rawChannelId);
            if (!channelId) {
              return;
            }

            const members = Array.isArray(rawMembers)
              ? rawMembers
                  .map((member) => normalizeDiscord2Member(member, channelId))
                  .filter(Boolean)
              : [];

            normalizedVoiceMembersByChannel[String(channelId)] = members;
          });
        }

        const nextSpeakingByUser = {};
        const nextScreenSharingByUser = {};
        normalizedOnlineMembers.forEach((member) => {
          const memberUserId = normalizeDiscord2Id(member.userId);
          if (memberUserId && member.speaking === true) {
            nextSpeakingByUser[String(memberUserId)] = true;
          }
          if (memberUserId && member.screenSharing === true) {
            nextScreenSharingByUser[String(memberUserId)] = true;
          }
        });
        Object.values(normalizedVoiceMembersByChannel).forEach((members) => {
          members.forEach((member) => {
            const memberUserId = normalizeDiscord2Id(member.userId);
            if (memberUserId && member.speaking === true) {
              nextSpeakingByUser[String(memberUserId)] = true;
            }
          });
        });

        discord2State.onlineMembers = normalizedOnlineMembers;
        discord2State.voiceMembersByChannel = normalizedVoiceMembersByChannel;
        discord2State.speakingByUser = nextSpeakingByUser;
        discord2State.screenSharingByUser = nextScreenSharingByUser;

        const selfUserId = normalizeDiscord2Id(discord2State.selfUserId);
        const selfMember = selfUserId
          ? normalizedOnlineMembers.find((member) => normalizeDiscord2Id(member.userId) === selfUserId)
          : null;

        const nextSelfVoiceChannelId = selfMember ? normalizeDiscord2Id(selfMember.voiceChannelId) : null;
        discord2State.selfVoiceChannelId = nextSelfVoiceChannelId;
        discord2VoiceCurrentChannelId = nextSelfVoiceChannelId || null;

        if (!nextSelfVoiceChannelId && previousSelfVoiceChannelId) {
          teardownDiscord2VoiceRuntime({ notifyServer: false, clearDesired: true });
        }

        if (nextSelfVoiceChannelId) {
          discord2VoiceDesiredChannelId = nextSelfVoiceChannelId;
        }
        syncDiscord2RemoteScreenSharesFromPresence();
        refreshDiscord2VoiceConnections();
      }

      function applyDiscord2State(payload) {
        applyDiscord2ServerSettings(payload?.server || {});
        applyDiscord2Structure(payload);

        const normalizedMessagesByChannel = {};
        if (payload?.messagesByChannel && typeof payload.messagesByChannel === "object") {
          Object.entries(payload.messagesByChannel).forEach(([rawChannelId, rawMessages]) => {
            const channelId = normalizeDiscord2Id(rawChannelId);
            if (!channelId) {
              return;
            }

            const messages = Array.isArray(rawMessages)
              ? rawMessages
                  .map((message) => normalizeDiscord2Message(message, channelId))
                  .filter(Boolean)
              : [];

            normalizedMessagesByChannel[String(channelId)] = messages;
          });
        }

        discord2State.messagesByChannel = normalizedMessagesByChannel;

        const selfUserId = normalizeDiscord2Id(payload?.selfUserId);
        if (selfUserId) {
          discord2State.selfUserId = selfUserId;
        }

        const payloadSelectedChannelId = normalizeDiscord2Id(payload?.selectedChannelId);
        if (payloadSelectedChannelId) {
          discord2State.selectedChannelId = payloadSelectedChannelId;
        }

        applyDiscord2Presence(payload);
        ensureDiscord2SelectedChannel();
        renderDiscord2();
      }

      function upsertDiscord2Message(rawMessage) {
        const normalizedMessage = normalizeDiscord2Message(rawMessage);
        if (!normalizedMessage) {
          return;
        }

        const channelKey = String(normalizedMessage.channelId);
        if (!Array.isArray(discord2State.messagesByChannel[channelKey])) {
          discord2State.messagesByChannel[channelKey] = [];
        }

        const existing = discord2State.messagesByChannel[channelKey].some((message) => String(message.id) === String(normalizedMessage.id));
        if (existing) {
          return;
        }

        discord2State.messagesByChannel[channelKey].push(normalizedMessage);
        if (discord2State.messagesByChannel[channelKey].length > 500) {
          discord2State.messagesByChannel[channelKey].shift();
        }

        if (normalizeDiscord2Id(discord2State.selectedChannelId) === normalizeDiscord2Id(normalizedMessage.channelId)) {
          renderDiscord2Messages();
        }
      }

      function removeDiscord2Message(payload) {
        const messageId = normalizeDiscord2Id(payload?.messageId);
        if (!messageId) {
          return;
        }

        const normalizedChannelId = normalizeDiscord2Id(payload?.channelId);
        const targetChannelIds = normalizedChannelId
          ? [normalizedChannelId]
          : Object.keys(discord2State.messagesByChannel);

        let removedFromSelectedChannel = false;
        targetChannelIds.forEach((channelIdValue) => {
          const channelId = normalizeDiscord2Id(channelIdValue);
          if (!channelId) {
            return;
          }

          const channelKey = String(channelId);
          const messages = Array.isArray(discord2State.messagesByChannel[channelKey])
            ? discord2State.messagesByChannel[channelKey]
            : null;
          if (!messages?.length) {
            return;
          }

          const nextMessages = messages.filter((message) => normalizeDiscord2Id(message.id) !== messageId);
          if (nextMessages.length === messages.length) {
            return;
          }

          discord2State.messagesByChannel[channelKey] = nextMessages;
          if (normalizeDiscord2Id(discord2State.selectedChannelId) === channelId) {
            removedFromSelectedChannel = true;
          }
        });

        if (removedFromSelectedChannel) {
          renderDiscord2Messages();
        }
      }

