/* ── Enterprise RAG — Frontend App ─────────────────────────────
   Handles: login, role-based UI, chat (streaming), upload, docs
─────────────────────────────────────────────────────────────── */

const API = "";   // same origin — empty means relative URLs

// ── State ──────────────────────────────────────────────────────
let token = localStorage.getItem("rag_token") || null;
let userInfo = null;   // { username, role }

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (token) {
    try {
      userInfo = parseJwt(token);
      showApp();
    } catch {
      logout();
    }
  } else {
    showLogin();
  }

  bindLogin();
  bindLogout();
  bindNav();
  bindChat();
  bindUpload();
});

// ── JWT helpers ────────────────────────────────────────────────
function parseJwt(t) {
  const payload = JSON.parse(atob(t.split(".")[1]));
  // Check expiry
  if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error("expired");
  return { username: payload.sub, role: payload.role };
}

function authHeaders() {
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Screen toggles ─────────────────────────────────────────────
function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app-screen").classList.add("hidden");
}

function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");

  // Populate user info in sidebar
  document.getElementById("user-name-display").textContent = userInfo.username;
  document.getElementById("user-role-display").textContent = userInfo.role;
  document.getElementById("user-avatar").textContent = userInfo.username[0].toUpperCase();

  // Show admin tabs only for admin
  if (userInfo.role === "admin") {
    document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
  }

  switchTab("chat");
}

function logout() {
  localStorage.removeItem("rag_token");
  token = null;
  userInfo = null;
  showLogin();
}

// ── Login ──────────────────────────────────────────────────────
function bindLogin() {
  const btn = document.getElementById("login-btn");
  const errBox = document.getElementById("login-error");

  async function doLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showAlert(errBox, "Please enter username and password.", "error");
      return;
    }

    btn.disabled = true;
    document.getElementById("login-btn-text").textContent = "Signing in…";
    document.getElementById("login-spinner").classList.remove("hidden");
    errBox.classList.add("hidden");

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid credentials");
      }

      const data = await res.json();
      token = data.token;
      localStorage.setItem("rag_token", token);
      userInfo = parseJwt(token);
      showApp();

    } catch (err) {
      showAlert(errBox, err.message, "error");
    } finally {
      btn.disabled = false;
      document.getElementById("login-btn-text").textContent = "Sign In";
      document.getElementById("login-spinner").classList.add("hidden");
    }
  }

  btn.addEventListener("click", doLogin);
  document.getElementById("password").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });
}

// ── Logout ─────────────────────────────────────────────────────
function bindLogout() {
  document.getElementById("logout-btn").addEventListener("click", logout);
}

// ── Tab navigation ─────────────────────────────────────────────
function switchTab(name) {
  // Update nav highlight
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.tab === name);
  });

  // Show correct panel
  document.querySelectorAll(".tab-panel").forEach(el => {
    el.classList.toggle("hidden", el.id !== `tab-${name}`);
    if (el.id === `tab-${name}`) el.classList.add("active");
    else el.classList.remove("active");
  });

  // Lazy-load documents when switching to that tab
  if (name === "documents") loadDocuments();
}

function bindNav() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

// ── Chat ───────────────────────────────────────────────────────
function bindChat() {
  const sendBtn = document.getElementById("chat-send-btn");
  const input   = document.getElementById("chat-input");
  const clearBtn = document.getElementById("clear-chat-btn");

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-grow textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  clearBtn.addEventListener("click", () => {
    const container = document.getElementById("chat-messages");
    container.innerHTML = `
      <div class="welcome-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>Ask a question about your enterprise documents.</p>
      </div>`;
  });
}

function appendMsg(role, text = "") {
  const container = document.getElementById("chat-messages");

  // Remove welcome state on first message
  const welcome = container.querySelector(".welcome-state");
  if (welcome) welcome.remove();

  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;

  const avatarLetter = role === "user"
    ? (userInfo?.username[0].toUpperCase() || "U")
    : "AI";

  wrap.innerHTML = `
    <div class="msg-avatar">${avatarLetter}</div>
    <div class="msg-bubble${role === "bot" ? " streaming" : ""}"></div>
  `;

  const bubble = wrap.querySelector(".msg-bubble");
  bubble.textContent = text;

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return bubble;
}

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const question = input.value.trim();
  if (!question) return;

  input.value = "";
  input.style.height = "auto";

  appendMsg("user", question);
  const botBubble = appendMsg("bot", "");
  const container = document.getElementById("chat-messages");

  try {
    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    if (!res.body) { botBubble.textContent = "Streaming not supported."; return; }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let answerPart = "";
    let sourcesPart = "";
    let sourcesStarted = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      full += decoder.decode(value, { stream: true });

      // Split answer from sources section
      const splitIdx = full.indexOf("\n\nSources:\n");
      if (splitIdx !== -1) {
        sourcesStarted = true;
        answerPart  = full.slice(0, splitIdx);
        sourcesPart = full.slice(splitIdx + "\n\nSources:\n".length);
      } else {
        answerPart = full;
      }

      botBubble.textContent = answerPart;
      container.scrollTop = container.scrollHeight;
    }

    // Render sources as tags
    botBubble.classList.remove("streaming");
    if (sourcesPart.trim()) {
      const sourcesEl = document.createElement("div");
      sourcesEl.className = "sources-block";
      sourcesEl.innerHTML = "<strong>Sources</strong><br/>";
      sourcesPart.trim().split("\n").forEach(line => {
        const name = line.replace(/^•\s*/, "").trim();
        if (name) {
          const tag = document.createElement("span");
          tag.className = "source-tag";
          tag.textContent = name;
          sourcesEl.appendChild(tag);
        }
      });
      botBubble.appendChild(sourcesEl);
    }

  } catch (err) {
    botBubble.classList.remove("streaming");
    botBubble.textContent = `Error: ${err.message}`;
  }
}

// ── Upload ─────────────────────────────────────────────────────
let selectedFiles = [];

function bindUpload() {
  const dropZone  = document.getElementById("upload-drop-zone");
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("upload-btn");

  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    addFiles(Array.from(e.dataTransfer.files));
  });

  dropZone.addEventListener("click", e => {
    if (e.target.tagName !== "LABEL") fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  uploadBtn.addEventListener("click", uploadAll);
}

function addFiles(files) {
  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
  ];
  files.forEach(f => {
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|docx|pptx|txt)$/i)) return;
    if (selectedFiles.find(x => x.name === f.name)) return;
    selectedFiles.push(f);
  });
  renderQueue();
}

function renderQueue() {
  const queue     = document.getElementById("upload-queue");
  const uploadBtn = document.getElementById("upload-btn");
  queue.innerHTML = "";

  selectedFiles.forEach((f, i) => {
    const row = document.createElement("div");
    row.className = "upload-file-row";
    row.dataset.index = i;
    row.innerHTML = `
      <span class="upload-file-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </span>
      <div class="upload-file-info">
        <div class="upload-file-name">${f.name}</div>
        <div class="upload-file-size">${formatBytes(f.size)}</div>
      </div>
      <span class="upload-file-status status-pending" id="status-${i}">Pending</span>
      <button class="btn-icon" onclick="removeFile(${i})" title="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    queue.appendChild(row);
  });

  uploadBtn.classList.toggle("hidden", selectedFiles.length === 0);
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderQueue();
}

// Status labels shown per phase
const PHASE_LABELS = {
  queued:   "⏳ Queued…",
  parsing:  "📄 Parsing document…",
  chunking: "✂️  Splitting chunks…",
  indexing: "🔢 Embedding & indexing…",
  done:     null,   // filled dynamically
  error:    null,   // filled dynamically
};

async function uploadAll() {
  const uploadBtn = document.getElementById("upload-btn");
  const alertBox  = document.getElementById("upload-alert");
  uploadBtn.disabled = true;
  alertBox.classList.add("hidden");

  let successCount = 0;
  let errorCount   = 0;

  for (let i = 0; i < selectedFiles.length; i++) {
    const f = selectedFiles[i];
    setFileStatus(i, "uploading", "📤 Uploading file…");

    try {
      // Step 1: Upload file — returns job_id immediately
      const form = new FormData();
      form.append("file", f);

      const res = await fetch(`${API}/ingest`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      const { job_id } = await res.json();

      // Step 2: Poll /ingest/status/{job_id} until done or error
      const startTime = Date.now();
      await pollJobStatus(job_id, i, startTime);

      const finalJob = await fetchJobStatus(job_id);
      if (finalJob.status === "done") {
        setFileStatus(i, "done", `✅ Done — ${finalJob.chunks_indexed} chunks`);
        successCount++;
      } else {
        throw new Error(finalJob.message || "Processing failed");
      }

    } catch (err) {
      setFileStatus(i, "error", `❌ ${err.message}`);
      errorCount++;
    }
  }

  uploadBtn.disabled = false;

  if (successCount > 0 || errorCount > 0) {
    const msg = successCount > 0
      ? `${successCount} file(s) indexed.${errorCount ? ` ${errorCount} failed.` : ""}`
      : `${errorCount} file(s) failed.`;
    showAlert(alertBox, msg, successCount > 0 ? "success" : "error");

    // Remove successfully uploaded files from queue
    selectedFiles = selectedFiles.filter((_, idx) => {
      const el = document.getElementById(`status-${idx}`);
      return el && el.classList.contains("status-error");
    });
    renderQueue();
  }
}

async function fetchJobStatus(job_id) {
  const res = await fetch(`${API}/ingest/status/${job_id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Status check failed: HTTP ${res.status}`);
  return res.json();
}

async function pollJobStatus(job_id, fileIndex, startTime) {
  const POLL_INTERVAL = 3000;   // ms between polls

  while (true) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins    = Math.floor(elapsed / 60);
    const secs    = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    let job;
    try {
      job = await fetchJobStatus(job_id);
    } catch {
      // Network blip — keep polling
      setFileStatus(fileIndex, "uploading", `⏳ Waiting for server… (${timeStr})`);
      continue;
    }

    if (job.status === "done" || job.status === "error") return;

    // Show live message from server (includes chunk progress %)
    const label = job.message || PHASE_LABELS[job.status] || `⏳ Processing…`;
    setFileStatus(fileIndex, "uploading", `${label} (${timeStr})`);
  }
}

function setFileStatus(i, cls, text) {
  const el = document.getElementById(`status-${i}`);
  if (!el) return;
  el.className = `upload-file-status status-${cls === "uploading" ? "uploading" : cls}`;
  el.textContent = text;
}

// ── Documents ──────────────────────────────────────────────────
async function loadDocuments() {
  const list     = document.getElementById("doc-list");
  const alertBox = document.getElementById("doc-alert");
  alertBox.classList.add("hidden");
  list.innerHTML = `<div class="empty-state"><p>Loading…</p></div>`;

  try {
    const res = await fetch(`${API}/documents`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderDocList(data.documents || []);

  } catch (err) {
    showAlert(alertBox, `Failed to load documents: ${err.message}`, "error");
    list.innerHTML = "";
  }
}

function renderDocList(docs) {
  const list = document.getElementById("doc-list");
  if (docs.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>No documents indexed yet.</p></div>`;
    return;
  }

  list.innerHTML = "";
  docs.forEach(name => {
    const row = document.createElement("div");
    row.className = "doc-row";
    row.innerHTML = `
      <span class="doc-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </span>
      <span class="doc-name">${name}</span>
      <button class="btn btn-danger btn-sm" onclick="deleteDoc('${name}')">Delete</button>
    `;
    list.appendChild(row);
  });
}

async function deleteDoc(filename) {
  if (!confirm(`Delete "${filename}" from the index? This cannot be undone.`)) return;

  const alertBox = document.getElementById("doc-alert");

  try {
    const res = await fetch(`${API}/documents/${encodeURIComponent(filename)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showAlert(alertBox, `"${filename}" deleted successfully.`, "success");
    loadDocuments();

  } catch (err) {
    showAlert(alertBox, `Delete failed: ${err.message}`, "error");
  }
}

// ── Helpers ────────────────────────────────────────────────────
function showAlert(el, msg, type) {
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove("hidden");
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

document.getElementById("refresh-docs-btn")?.addEventListener("click", loadDocuments);