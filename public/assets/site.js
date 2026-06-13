(() => {
  const defaultServers = [
    { name: "능력야생", desc: "능력으로 야생에서 살아남으세요!" },
    { name: "국가전쟁", desc: "전장에서 신상을 점령하세요!" },
    { name: "플럼SMP", desc: "전투 중심의 SMP 서버입니다." },
    { name: "동원서버", desc: "RPG 서버를 즐기세요!" }
  ];

  const defaultPatchNotes = [
    { date: "2026-03-09", type: "URGENT", title: "수표 돈 복사 버그 수정", desc: "수표 생성 시 발생하던 데이터 오류를 수정하고 관련 로그를 전수 조사 완료했습니다." },
    { date: "2026-03-08", type: "PATCH", title: "사소한 버그 및 서버 최적화", desc: "접속 시 간헐적으로 발생하던 튕김 현상과 맵 로딩 속도를 개선했습니다." },
    { date: "2026-03-05", type: "NEW", title: "셋홈(Sethome) 한도 확장", desc: "기존 3개에서 최대 5개까지 위치 저장이 가능하도록 업데이트되었습니다." }
  ];

  const defaultTeam = [
    { initials: "LB", name: "리뱅총괄", role: "Network Lead" },
    { initials: "GM", name: "운영팀", role: "Community Manager" },
    { initials: "DEV", name: "개발팀", role: "Core Developer" },
    { initials: "MOD", name: "중재팀", role: "Support & Moderation" }
  ];

  const state = {
    siteCopy: {},
    servers: [],
    patchNotes: [],
    teamMembers: []
  };

  let snapshot = null;
  let currentUser = null;
  let isAdmin = false;
  let isEditMode = false;
  let dirty = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value ?? "").replace(/[&<>"']/g, (char) => map[char]);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function canEdit() {
    return isAdmin && isEditMode;
  }

  function setStatus(el, message, type = "") {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("ok", "warn", "err");
    if (type) el.classList.add(type);
  }

  function setEditStatus(message, type = "") {
    setStatus($("#editStatus"), message, type);
  }

  function markDirty() {
    if (!canEdit()) return;
    dirty = true;
    setEditStatus("변경 사항 있음", "warn");
  }

  function getLocalDateString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function fetchJson(url, fallback) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("bad response");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("bad data");
      return data;
    } catch {
      return deepClone(fallback);
    }
  }

  async function fetchObject(url, fallback) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("bad response");
      const data = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("bad data");
      return data;
    } catch {
      return deepClone(fallback);
    }
  }

  async function postJson(url, data) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(body || "save failed");
    }
  }

  function needsServers() {
    return Boolean($("#serverList") || $("#serverPreview") || $("#serverCount"));
  }

  function needsPatchNotes() {
    return Boolean($("#updateList") || $("#patchPreview") || $("#patchCount"));
  }

  function needsTeam() {
    return Boolean($("#teamList") || $("#teamPreview") || $("#teamCount"));
  }

  async function loadData() {
    state.siteCopy = await fetchObject("/api/site", {});
    state.servers = needsServers() ? await fetchJson("/api/servers", defaultServers) : deepClone(defaultServers);
    state.patchNotes = needsPatchNotes() ? await fetchJson("/api/patch", defaultPatchNotes) : deepClone(defaultPatchNotes);
    state.teamMembers = needsTeam() ? await fetchJson("/api/team", defaultTeam) : deepClone(defaultTeam);
  }

  async function fetchMe() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) throw new Error("not signed in");
      currentUser = await response.json();
      setAdmin(currentUser && currentUser.role === "admin");
    } catch {
      currentUser = null;
      setAdmin(false);
    }
  }

  function setAdmin(next) {
    isAdmin = Boolean(next);
    if (!isAdmin) setEditMode(false);

    document.body.classList.toggle("admin-on", isAdmin);
    const authLink = $("#authLink");
    if (authLink) {
      authLink.classList.toggle("is-admin", isAdmin);
      authLink.title = currentUser ? (isAdmin ? "관리자 계정" : "내 계정") : "로그인/회원가입";
      authLink.setAttribute("aria-label", authLink.title);
    }
  }

  function setEditMode(next) {
    isEditMode = Boolean(next) && isAdmin;
    document.body.classList.toggle("editing", isEditMode);
    applyEditState();
    if (!isEditMode && !dirty) setEditStatus("");
  }

  function takeSnapshot() {
    snapshot = deepClone(state);
  }

  function restoreSnapshot() {
    if (!snapshot) return;
    Object.assign(state, deepClone(snapshot));
    dirty = false;
    renderAll();
    applySiteCopy();
    applyEditState();
  }

  function applySiteCopy() {
    $$("[data-copy-key]").forEach((el) => {
      const key = el.dataset.copyKey;
      if (Object.prototype.hasOwnProperty.call(state.siteCopy, key)) {
        el.textContent = state.siteCopy[key];
      }
    });
  }

  function applyEditState() {
    $$(".editable").forEach((el) => {
      el.contentEditable = canEdit() ? "true" : "false";
      el.spellcheck = false;
    });
  }

  function getBadgeClass(type) {
    const value = String(type || "").toUpperCase();
    if (value === "URGENT") return "urgent";
    if (value === "NEW") return "new";
    return "patch";
  }

  function itemActions(type, index) {
    return `
      <div class="item-actions admin-only edit-mode-only">
        <button class="item-action" type="button" data-action="move" data-type="${type}" data-idx="${index}" data-direction="-1" title="위로" aria-label="위로 이동"><i class="fa-solid fa-arrow-up"></i></button>
        <button class="item-action" type="button" data-action="move" data-type="${type}" data-idx="${index}" data-direction="1" title="아래로" aria-label="아래로 이동"><i class="fa-solid fa-arrow-down"></i></button>
        <button class="item-action" type="button" data-action="remove" data-type="${type}" data-idx="${index}" title="삭제" aria-label="삭제"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }

  function renderServerCard(server, index, editable) {
    const titleClass = editable ? "editable single-line" : "";
    const descClass = editable ? "editable" : "";
    const titleAttrs = editable ? `contenteditable="false" data-type="server" data-idx="${index}" data-field="name"` : "";
    const descAttrs = editable ? `contenteditable="false" data-type="server" data-idx="${index}" data-field="desc"` : "";
    return `
      <article class="item-card glass">
        <div class="item-top">
          <span class="badge">SERVER</span>
          ${editable ? itemActions("server", index) : ""}
        </div>
        <h3 class="${titleClass}" ${titleAttrs}>${escapeHtml(server.name)}</h3>
        <p class="${descClass}" ${descAttrs}>${escapeHtml(server.desc)}</p>
      </article>
    `;
  }

  function renderServers() {
    const list = $("#serverList");
    if (list) {
      list.innerHTML = state.servers.map((server, index) => renderServerCard(server, index, true)).join("");
    }
    const preview = $("#serverPreview");
    if (preview) {
      preview.innerHTML = state.servers.slice(0, 3).map((server, index) => renderServerCard(server, index, false)).join("");
    }
    const count = $("#serverCount");
    if (count) count.textContent = String(state.servers.length);
  }

  function renderPatchNote(note, index, editable) {
    const badgeClass = getBadgeClass(note.type);
    const dateAttrs = editable ? `contenteditable="false" data-type="patch" data-idx="${index}" data-field="date"` : "";
    const typeAttrs = editable ? `contenteditable="false" data-type="patch" data-idx="${index}" data-field="type"` : "";
    const titleAttrs = editable ? `contenteditable="false" data-type="patch" data-idx="${index}" data-field="title"` : "";
    const descAttrs = editable ? `contenteditable="false" data-type="patch" data-idx="${index}" data-field="desc"` : "";
    return `
      <article class="update-item glass">
        <div class="date ${editable ? "editable single-line" : ""}" ${dateAttrs}>${escapeHtml(note.date)}</div>
        <div>
          <div class="item-top">
            <div>
              <span class="badge ${badgeClass} ${editable ? "editable single-line" : ""}" ${typeAttrs}>${escapeHtml(note.type)}</span>
              <h3 class="${editable ? "editable single-line" : ""}" ${titleAttrs}>${escapeHtml(note.title)}</h3>
            </div>
            ${editable ? itemActions("patch", index) : ""}
          </div>
          <p class="${editable ? "editable" : ""}" ${descAttrs}>${escapeHtml(note.desc)}</p>
        </div>
      </article>
    `;
  }

  function renderPatchNotes() {
    const list = $("#updateList");
    if (list) {
      list.innerHTML = state.patchNotes.map((note, index) => renderPatchNote(note, index, true)).join("");
    }
    const preview = $("#patchPreview");
    if (preview) {
      preview.innerHTML = state.patchNotes.slice(0, 2).map((note, index) => renderPatchNote(note, index, false)).join("");
    }
    const count = $("#patchCount");
    if (count) count.textContent = String(state.patchNotes.length);
  }

  function renderTeamCard(member, index, editable) {
    const initialsAttrs = editable ? `contenteditable="false" data-type="team" data-idx="${index}" data-field="initials"` : "";
    const nameAttrs = editable ? `contenteditable="false" data-type="team" data-idx="${index}" data-field="name"` : "";
    const roleAttrs = editable ? `contenteditable="false" data-type="team" data-idx="${index}" data-field="role"` : "";
    return `
      <article class="item-card team-card glass">
        <div class="team-top">
          <div class="avatar ${editable ? "editable single-line" : ""}" ${initialsAttrs}>${escapeHtml(member.initials)}</div>
          ${editable ? itemActions("team", index) : ""}
        </div>
        <h3 class="${editable ? "editable single-line" : ""}" ${nameAttrs}>${escapeHtml(member.name)}</h3>
        <p class="${editable ? "editable single-line" : ""}" ${roleAttrs}>${escapeHtml(member.role)}</p>
      </article>
    `;
  }

  function renderTeam() {
    const list = $("#teamList");
    if (list) {
      list.innerHTML = state.teamMembers.map((member, index) => renderTeamCard(member, index, true)).join("");
    }
    const preview = $("#teamPreview");
    if (preview) {
      preview.innerHTML = state.teamMembers.slice(0, 3).map((member, index) => renderTeamCard(member, index, false)).join("");
    }
    const count = $("#teamCount");
    if (count) count.textContent = String(state.teamMembers.length);
  }

  function renderAll() {
    renderServers();
    renderPatchNotes();
    renderTeam();
  }

  function collectionFor(type) {
    if (type === "server") return { items: state.servers, fallback: defaultServers, render: renderServers };
    if (type === "patch") return { items: state.patchNotes, fallback: defaultPatchNotes, render: renderPatchNotes };
    if (type === "team") return { items: state.teamMembers, fallback: defaultTeam, render: renderTeam };
    return null;
  }

  function addItem(type) {
    const collection = collectionFor(type);
    if (!collection || !canEdit()) return;
    if (type === "server") collection.items.push({ name: "새 서버", desc: "설명 입력" });
    if (type === "patch") collection.items.unshift({ date: getLocalDateString(), type: "PATCH", title: "제목 입력", desc: "설명 입력" });
    if (type === "team") collection.items.push({ initials: "NEW", name: "새 운영진", role: "Role" });
    collection.render();
    applyEditState();
    markDirty();
  }

  function resetItems(type) {
    const collection = collectionFor(type);
    if (!collection || !canEdit()) return;
    if (!window.confirm("현재 목록을 기본값으로 되돌릴까요?")) return;
    const next = deepClone(collection.fallback);
    if (type === "server") state.servers = next;
    if (type === "patch") state.patchNotes = next;
    if (type === "team") state.teamMembers = next;
    renderAll();
    applyEditState();
    markDirty();
  }

  function removeItem(type, index) {
    const collection = collectionFor(type);
    if (!collection || !canEdit()) return;
    collection.items.splice(index, 1);
    collection.render();
    applyEditState();
    markDirty();
  }

  function moveItem(type, index, direction) {
    const collection = collectionFor(type);
    if (!collection || !canEdit()) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= collection.items.length) return;
    const temp = collection.items[index];
    collection.items[index] = collection.items[nextIndex];
    collection.items[nextIndex] = temp;
    collection.render();
    applyEditState();
    markDirty();
  }

  function updateStateFromEditable(el) {
    const value = el.textContent.trim();
    const copyKey = el.dataset.copyKey;
    if (copyKey) {
      state.siteCopy[copyKey] = value;
      markDirty();
      return;
    }

    const type = el.dataset.type;
    const index = Number(el.dataset.idx);
    const field = el.dataset.field;
    if (!type || !field || !Number.isInteger(index)) return;

    if (type === "server" && state.servers[index]) state.servers[index][field] = value;
    if (type === "patch" && state.patchNotes[index]) {
      state.patchNotes[index][field] = value;
      if (field === "type") {
        el.classList.remove("urgent", "new", "patch");
        el.classList.add(getBadgeClass(value));
      }
    }
    if (type === "team" && state.teamMembers[index]) state.teamMembers[index][field] = value;
    markDirty();
  }

  function startEditing() {
    if (!isAdmin || isEditMode) return;
    takeSnapshot();
    dirty = false;
    setEditMode(true);
    setEditStatus("편집 모드", "warn");
  }

  async function commitEdits() {
    if (!canEdit()) return;
    setEditStatus("저장 중...", "warn");

    try {
      const tasks = [postJson("/api/site", state.siteCopy)];
      if ($("#serverList")) tasks.push(postJson("/api/servers", state.servers));
      if ($("#updateList")) tasks.push(postJson("/api/patch", state.patchNotes));
      if ($("#teamList")) tasks.push(postJson("/api/team", state.teamMembers));
      await Promise.all(tasks);

      dirty = false;
      takeSnapshot();
      setEditMode(false);
      setEditStatus("저장됨", "ok");
    } catch {
      setEditStatus("저장 실패", "err");
    }
  }

  function cancelEdits() {
    if (!canEdit()) return;
    restoreSnapshot();
    setEditMode(false);
    setEditStatus("취소됨", "warn");
  }

  function bindEvents() {
    $$(".nav-links a").forEach((link) => {
      link.addEventListener("click", () => document.body.classList.remove("nav-open"));
    });

    document.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;

      const action = actionButton.dataset.action;
      if (action === "toggle-menu") {
        document.body.classList.toggle("nav-open");
        return;
      }
      if (action === "start-editing") {
        startEditing();
        return;
      }
      if (action === "save-edits") {
        commitEdits();
        return;
      }
      if (action === "cancel-edits") {
        cancelEdits();
        return;
      }
      if (action === "add-server") addItem("server");
      if (action === "reset-server") resetItems("server");
      if (action === "add-patch") addItem("patch");
      if (action === "reset-patch") resetItems("patch");
      if (action === "add-team") addItem("team");
      if (action === "reset-team") resetItems("team");
      if (action === "remove") removeItem(actionButton.dataset.type, Number(actionButton.dataset.idx));
      if (action === "move") moveItem(actionButton.dataset.type, Number(actionButton.dataset.idx), Number(actionButton.dataset.direction));
    });

    document.addEventListener("input", (event) => {
      const editable = event.target.closest(".editable");
      if (!editable || !canEdit()) return;
      updateStateFromEditable(editable);
    });

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        if (canEdit()) {
          event.preventDefault();
          commitEdits();
        }
      }
      if (event.key !== "Enter") return;
      if (!event.target.classList || !event.target.classList.contains("single-line")) return;
      event.preventDefault();
    });

    document.addEventListener("click", (event) => {
      if (!canEdit()) return;
      const editableLink = event.target.closest("a");
      if (editableLink && editableLink.querySelector(".editable")) {
        event.preventDefault();
      }
      const editable = event.target.closest(".editable");
      if (!editable || editable.contentEditable !== "true") return;
    }, true);

    window.addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  async function init() {
    bindEvents();
    await loadData();
    renderAll();
    applySiteCopy();
    takeSnapshot();
    applyEditState();
    await fetchMe();
  }

  init();
})();
