/**
 * Enterprise RAG Chatbot Widget
 * Drop into any webpage:  <script src="http://your-server:8010/static/widget.js"></script>
 *
 * Optional config (set BEFORE the script tag):
 *   window.RAG_CONFIG = { serverUrl: "http://your-server:8010", title: "Ask AI" };
 */
(function () {
  "use strict";

  const CFG = window.RAG_CONFIG || {};
  const SERVER = (CFG.serverUrl || "http://localhost:8010").replace(/\/$/, "");
  const TITLE  = CFG.title || "Ask AI";
  const THEME  = CFG.theme || "#4F46E5";

  // ── Prevent double-init ────────────────────────────────────────
  if (document.getElementById("rag-widget-root")) return;

  // ── Inject styles ──────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #rag-widget-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

    /* Bubble */
    #rag-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 999998;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${THEME}; color: #fff;
      border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,.25);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #rag-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,.32); }
    #rag-bubble svg { width: 26px; height: 26px; }
    #rag-bubble .rag-notif {
      position: absolute; top: -3px; right: -3px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #EF4444; border: 2px solid #fff;
      display: none;
    }
    #rag-bubble .rag-notif.show { display: block; }

    /* Panel */
    #rag-panel {
      position: fixed; bottom: 92px; right: 24px; z-index: 999999;
      width: 380px; height: 560px; max-height: calc(100vh - 110px);
      background: #0F1117; border: 1px solid #2E3248;
      border-radius: 16px;
      display: flex; flex-direction: column;
      box-shadow: 0 12px 48px rgba(0,0,0,.5);
      overflow: hidden;
      transform: scale(.95) translateY(12px);
      opacity: 0; pointer-events: none;
      transition: transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s;
    }
    #rag-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }
    @media (max-width: 440px) {
      #rag-panel { width: calc(100vw - 16px); right: 8px; bottom: 82px; }
    }

    /* Header */
    #rag-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px;
      background: ${THEME};
      flex-shrink: 0;
    }
    #rag-header-icon {
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #rag-header-icon svg { width: 18px; height: 18px; }
    #rag-header-title { flex: 1; color: #fff; font-size: 15px; font-weight: 600; }
    #rag-header-status { font-size: 11px; color: rgba(255,255,255,.75); }
    #rag-close-btn {
      background: rgba(255,255,255,.15); border: none; color: #fff;
      width: 28px; height: 28px; border-radius: 50%;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background .15s;
    }
    #rag-close-btn:hover { background: rgba(255,255,255,.28); }
    #rag-close-btn svg { width: 14px; height: 14px; }

    /* Views */
    .rag-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .rag-view.hidden { display: none !important; }

    /* Login */
    #rag-login-view { padding: 28px 24px; gap: 14px; }
    #rag-login-view p { color: #8892A4; font-size: 13px; text-align: center; }
    .rag-field label { display: block; font-size: 11px; font-weight: 600; color: #8892A4; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 5px; }
    .rag-field input {
      width: 100%; background: #1A1D27; border: 1px solid #2E3248;
      border-radius: 8px; color: #E2E8F0; padding: 9px 12px; font-size: 13px;
      outline: none; transition: border-color .15s;
    }
    .rag-field input:focus { border-color: ${THEME}; }
    .rag-field input::placeholder { color: #4B5563; }
    .rag-login-err { background: #EF444420; color: #EF4444; border: 1px solid #EF4444; border-radius: 8px; padding: 8px 12px; font-size: 12px; display: none; }
    .rag-login-err.show { display: block; }
    .rag-btn-primary {
      width: 100%; padding: 10px; background: ${THEME}; color: #fff;
      border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity .15s;
    }
    .rag-btn-primary:hover { opacity: .9; }
    .rag-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

    /* Tabs (admin) */
    #rag-tabs {
      display: flex; border-bottom: 1px solid #2E3248; flex-shrink: 0;
      background: #0F1117;
    }
    .rag-tab {
      flex: 1; padding: 10px 0; font-size: 12px; font-weight: 500;
      background: none; border: none; color: #8892A4;
      cursor: pointer; border-bottom: 2px solid transparent;
      transition: color .15s, border-color .15s;
    }
    .rag-tab.active { color: #A5B4FC; border-bottom-color: ${THEME}; }
    .rag-tab-panel { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .rag-tab-panel.hidden { display: none !important; }

    /* Chat */
    #rag-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex;
      flex-direction: column; gap: 10px;
    }
    #rag-messages::-webkit-scrollbar { width: 3px; }
    #rag-messages::-webkit-scrollbar-thumb { background: #2E3248; border-radius: 3px; }
    .rag-welcome {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; gap: 10px;
      color: #8892A4; text-align: center; font-size: 13px;
    }
    .rag-welcome svg { opacity: .4; }
    .rag-msg { display: flex; gap: 8px; }
    .rag-msg.user { flex-direction: row-reverse; }
    .rag-msg-av {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; margin-top: 2px;
    }
    .rag-msg.user .rag-msg-av { background: ${THEME}; color: #fff; }
    .rag-msg.bot  .rag-msg-av { background: #22263A; color: #A5B4FC; border: 1px solid #2E3248; }
    .rag-msg-bubble {
      max-width: 78%; padding: 9px 12px; border-radius: 10px;
      font-size: 13px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;
    }
    .rag-msg.user .rag-msg-bubble { background: ${THEME}; color: #fff; border-bottom-right-radius: 3px; }
    .rag-msg.bot  .rag-msg-bubble { background: #1A1D27; color: #E2E8F0; border: 1px solid #2E3248; border-bottom-left-radius: 3px; }
    .rag-msg.bot  .rag-msg-bubble.streaming { border-color: ${THEME}44; }
    .rag-sources { margin-top: 7px; padding-top: 7px; border-top: 1px solid #2E3248; font-size: 11px; color: #8892A4; }
    .rag-source-tag { display: inline-block; background: #22263A; border: 1px solid #2E3248; border-radius: 4px; padding: 2px 6px; margin: 2px 2px 0 0; font-size: 10px; }
    #rag-input-bar {
      display: flex; gap: 8px; align-items: flex-end;
      padding: 10px 12px; border-top: 1px solid #2E3248; flex-shrink: 0;
      background: #0F1117;
    }
    #rag-input {
      flex: 1; background: #1A1D27; border: 1px solid #2E3248;
      border-radius: 8px; color: #E2E8F0; padding: 8px 11px;
      font-size: 13px; resize: none; outline: none; max-height: 80px;
      font-family: inherit; line-height: 1.4; transition: border-color .15s;
    }
    #rag-input:focus { border-color: ${THEME}; }
    #rag-input::placeholder { color: #4B5563; }
    #rag-send-btn {
      width: 34px; height: 34px; border-radius: 8px;
      background: ${THEME}; color: #fff; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity .15s;
    }
    #rag-send-btn:hover { opacity: .9; }
    #rag-send-btn:disabled { opacity: .4; cursor: not-allowed; }
    #rag-send-btn svg { width: 15px; height: 15px; }

    /* Upload tab */
    .rag-upload-zone {
      border: 1.5px dashed #2E3248; border-radius: 10px;
      padding: 20px 12px; text-align: center; cursor: pointer;
      margin: 12px; color: #8892A4; font-size: 12px;
      transition: border-color .2s, background .2s;
    }
    .rag-upload-zone:hover, .rag-upload-zone.drag { border-color: ${THEME}; background: ${THEME}12; }
    .rag-upload-zone svg { opacity: .5; margin-bottom: 6px; }
    .rag-upload-link { color: #A5B4FC; cursor: pointer; text-decoration: underline; }
    #rag-file-input { display: none; }
    .rag-queue { padding: 0 12px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; max-height: 160px; }
    .rag-file-row { display: flex; align-items: center; gap: 8px; background: #1A1D27; border: 1px solid #2E3248; border-radius: 8px; padding: 8px 10px; font-size: 12px; }
    .rag-file-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #E2E8F0; }
    .rag-file-status { font-size: 11px; flex-shrink: 0; color: #8892A4; }
    .rag-file-status.ok  { color: #10B981; }
    .rag-file-status.err { color: #EF4444; }
    #rag-upload-btn { margin: 10px 12px 0; }
    .rag-alert { margin: 8px 12px 0; padding: 8px 10px; border-radius: 7px; font-size: 12px; display: none; }
    .rag-alert.ok  { background: #10B98120; color: #10B981; border: 1px solid #10B981; display: block; }
    .rag-alert.err { background: #EF444420; color: #EF4444; border: 1px solid #EF4444; display: block; }

    /* Docs tab */
    .rag-doc-list { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
    .rag-doc-row { display: flex; align-items: center; gap: 8px; background: #1A1D27; border: 1px solid #2E3248; border-radius: 8px; padding: 9px 12px; }
    .rag-doc-name { flex: 1; font-size: 12px; color: #E2E8F0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rag-del-btn { background: #EF444420; color: #EF4444; border: 1px solid #EF4444; border-radius: 5px; font-size: 11px; padding: 3px 8px; cursor: pointer; flex-shrink: 0; transition: background .15s; }
    .rag-del-btn:hover { background: #EF4444; color: #fff; }
    .rag-empty { text-align: center; padding: 28px; color: #8892A4; font-size: 13px; }
    .rag-footer-bar { padding: 8px 12px 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
    .rag-user-info { font-size: 11px; color: #8892A4; }
    .rag-logout-btn { background: none; border: none; color: #8892A4; font-size: 11px; cursor: pointer; text-decoration: underline; }
    .rag-logout-btn:hover { color: #E2E8F0; }
  `;
  document.head.appendChild(style);

  // ── State ──────────────────────────────────────────────────────
  let _token    = sessionStorage.getItem("rag_widget_token") || null;
  let _userInfo = null;

  function _parseJwt(t) {
    const p = JSON.parse(atob(t.split(".")[1]));
    if (p.exp && Date.now() / 1000 > p.exp) throw new Error("expired");
    return { username: p.sub, role: p.role };
  }

  function _authH() {
    return { "Authorization": "Bearer " + _token, "Content-Type": "application/json" };
  }

  if (_token) {
    try { _userInfo = _parseJwt(_token); } catch { _token = null; sessionStorage.removeItem("rag_widget_token"); }
  }

  // ── Build DOM ──────────────────────────────────────────────────
  const root = document.createElement("div");
  root.id = "rag-widget-root";
  root.innerHTML = `
    <!-- Bubble -->
    <button id="rag-bubble" title="${TITLE}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="rag-notif" id="rag-notif"></span>
    </button>

    <!-- Panel -->
    <div id="rag-panel">

      <!-- Header -->
      <div id="rag-header">
        <div id="rag-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <div id="rag-header-title">${TITLE}</div>
          <div id="rag-header-status">Ask anything</div>
        </div>
        <button id="rag-close-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- LOGIN VIEW -->
      <div id="rag-login-view" class="rag-view">
        <p>Sign in to chat</p>
        <div class="rag-field" style="margin-top:12px">
          <label>Username</label>
          <input id="rag-username" type="text" placeholder="Enter username" />
        </div>
        <div class="rag-field">
          <label>Password</label>
          <input id="rag-password" type="password" placeholder="Enter password" />
        </div>
        <div class="rag-login-err" id="rag-login-err"></div>
        <button class="rag-btn-primary" id="rag-login-btn">Sign In</button>
      </div>

      <!-- APP VIEW -->
      <div id="rag-app-view" class="rag-view hidden">

        <!-- Admin tabs -->
        <div id="rag-tabs" style="display:none">
          <button class="rag-tab active" data-tab="chat">Chat</button>
          <button class="rag-tab" data-tab="upload">Upload</button>
          <button class="rag-tab" data-tab="docs">Documents</button>
        </div>

        <!-- Chat panel -->
        <div class="rag-tab-panel" id="rag-tp-chat">
          <div id="rag-messages">
            <div class="rag-welcome">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Ask me anything about<br/>the available documents.</span>
            </div>
          </div>
          <div id="rag-input-bar">
            <textarea id="rag-input" rows="1" placeholder="Type your question…"></textarea>
            <button id="rag-send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Upload panel (admin) -->
        <div class="rag-tab-panel hidden" id="rag-tp-upload">
          <div class="rag-upload-zone" id="rag-drop">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div>Drop files or <label class="rag-upload-link" for="rag-file-input">browse</label></div>
            <div style="font-size:11px;margin-top:3px;color:#4B5563">PDF · DOCX · PPTX · TXT</div>
          </div>
          <input type="file" id="rag-file-input" accept=".pdf,.docx,.pptx,.txt" multiple />
          <div class="rag-queue" id="rag-queue"></div>
          <div id="rag-upload-alert" class="rag-alert"></div>
          <button class="rag-btn-primary" id="rag-upload-btn" style="display:none;margin:10px 12px 0">Upload &amp; Index</button>
        </div>

        <!-- Docs panel (admin) -->
        <div class="rag-tab-panel hidden" id="rag-tp-docs">
          <div class="rag-doc-list" id="rag-doc-list">
            <div class="rag-empty">Loading…</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="rag-footer-bar">
          <span class="rag-user-info" id="rag-user-label"></span>
          <button class="rag-logout-btn" id="rag-logout-btn">Sign out</button>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ── Element refs ───────────────────────────────────────────────
  const bubble    = document.getElementById("rag-bubble");
  const panel     = document.getElementById("rag-panel");
  const notif     = document.getElementById("rag-notif");
  const loginView = document.getElementById("rag-login-view");
  const appView   = document.getElementById("rag-app-view");
  const tabs      = document.getElementById("rag-tabs");
  const messages  = document.getElementById("rag-messages");
  const input     = document.getElementById("rag-input");
  const sendBtn   = document.getElementById("rag-send-btn");

  // ── Toggle panel ───────────────────────────────────────────────
  let isOpen = false;
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle("open", isOpen);
    notif.classList.remove("show");
    if (isOpen && !_token) showLogin();
    if (isOpen && _token)  showApp();
  }

  bubble.addEventListener("click", togglePanel);
  document.getElementById("rag-close-btn").addEventListener("click", togglePanel);

  // ── Views ──────────────────────────────────────────────────────
  function showLogin() {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    document.getElementById("rag-header-status").textContent = "Sign in to continue";
  }

  function showApp() {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    document.getElementById("rag-header-status").textContent = "Online";
    document.getElementById("rag-user-label").textContent =
      _userInfo.username + " · " + _userInfo.role;

    if (_userInfo.role === "admin") {
      tabs.style.display = "flex";
    }
  }

  // ── Login ──────────────────────────────────────────────────────
  document.getElementById("rag-login-btn").addEventListener("click", doLogin);
  document.getElementById("rag-password").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });

  async function doLogin() {
    const btn = document.getElementById("rag-login-btn");
    const err = document.getElementById("rag-login-err");
    const u   = document.getElementById("rag-username").value.trim();
    const p   = document.getElementById("rag-password").value;
    if (!u || !p) { showErr(err, "Enter username and password."); return; }

    btn.disabled = true;
    btn.textContent = "Signing in…";
    err.classList.remove("show");

    try {
      const res = await fetch(SERVER + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Invalid credentials");
      const data = await res.json();
      _token    = data.token;
      _userInfo = _parseJwt(_token);
      sessionStorage.setItem("rag_widget_token", _token);
      showApp();
    } catch (e) {
      showErr(err, e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  }

  function showErr(el, msg) { el.textContent = msg; el.classList.add("show"); }

  // ── Logout ─────────────────────────────────────────────────────
  document.getElementById("rag-logout-btn").addEventListener("click", () => {
    _token = null; _userInfo = null;
    sessionStorage.removeItem("rag_widget_token");
    tabs.style.display = "none";
    switchTab("chat");
    showLogin();
  });

  // ── Tabs ───────────────────────────────────────────────────────
  document.querySelectorAll(".rag-tab").forEach(t => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });

  function switchTab(name) {
    document.querySelectorAll(".rag-tab").forEach(t =>
      t.classList.toggle("active", t.dataset.tab === name));
    ["chat","upload","docs"].forEach(n => {
      const el = document.getElementById("rag-tp-" + n);
      el && el.classList.toggle("hidden", n !== name);
    });
    if (name === "docs") loadDocs();
  }

  // ── Chat ───────────────────────────────────────────────────────
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 80) + "px";
  });
  sendBtn.addEventListener("click", sendMsg);

  function _appendMsg(role, text) {
    const welcome = messages.querySelector(".rag-welcome");
    if (welcome) welcome.remove();
    const av = role === "user" ? (_userInfo?.username[0].toUpperCase() || "U") : "AI";
    const wrap = document.createElement("div");
    wrap.className = "rag-msg " + role;
    wrap.innerHTML = `
      <div class="rag-msg-av">${av}</div>
      <div class="rag-msg-bubble${role === "bot" ? " streaming" : ""}">${text || ""}</div>
    `;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap.querySelector(".rag-msg-bubble");
  }

  async function sendMsg() {
    const q = input.value.trim();
    if (!q || sendBtn.disabled) return;
    input.value = ""; input.style.height = "auto";
    sendBtn.disabled = true;

    _appendMsg("user", q);
    const bubble = _appendMsg("bot", "");

    try {
      const res = await fetch(SERVER + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error("Server error " + res.status);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const splitIdx = full.indexOf("\n\nSources:\n");
        bubble.textContent = splitIdx !== -1 ? full.slice(0, splitIdx) : full;
        messages.scrollTop = messages.scrollHeight;
      }

      bubble.classList.remove("streaming");

      // Render sources
      const splitIdx = full.indexOf("\n\nSources:\n");
      if (splitIdx !== -1) {
        const src = document.createElement("div");
        src.className = "rag-sources";
        src.innerHTML = "<strong>Sources</strong><br/>";
        full.slice(splitIdx + 10).trim().split("\n").forEach(line => {
          const name = line.replace(/^•\s*/, "").trim();
          if (name) {
            const tag = document.createElement("span");
            tag.className = "rag-source-tag";
            tag.textContent = name;
            src.appendChild(tag);
          }
        });
        bubble.appendChild(src);
      }

      // Notify if panel is closed
      if (!isOpen) notif.classList.add("show");

    } catch (e) {
      bubble.classList.remove("streaming");
      bubble.textContent = "Error: " + e.message;
    } finally {
      sendBtn.disabled = false;
    }
  }

  // ── Upload (admin) ─────────────────────────────────────────────
  let _files = [];
  const dropZone  = document.getElementById("rag-drop");
  const fileInput = document.getElementById("rag-file-input");
  const uploadBtn = document.getElementById("rag-upload-btn");

  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
  dropZone.addEventListener("drop", e => { e.preventDefault(); dropZone.classList.remove("drag"); addFiles(Array.from(e.dataTransfer.files)); });
  dropZone.addEventListener("click", e => { if (e.target.tagName !== "LABEL") fileInput.click(); });
  fileInput.addEventListener("change", () => { addFiles(Array.from(fileInput.files)); fileInput.value = ""; });
  uploadBtn.addEventListener("click", uploadAll);

  function addFiles(files) {
    files.forEach(f => {
      if (!f.name.match(/\.(pdf|docx|pptx|txt)$/i)) return;
      if (_files.find(x => x.name === f.name)) return;
      _files.push(f);
    });
    renderQueue();
  }

  function renderQueue() {
    const q = document.getElementById("rag-queue");
    q.innerHTML = "";
    _files.forEach((f, i) => {
      const row = document.createElement("div");
      row.className = "rag-file-row";
      row.innerHTML = `
        <span class="rag-file-name">${f.name}</span>
        <span class="rag-file-status" id="rfs-${i}">Pending</span>
      `;
      q.appendChild(row);
    });
    uploadBtn.style.display = _files.length ? "block" : "none";
  }

  const PHASES = { queued:"⏳ Queued", parsing:"📄 Parsing…", chunking:"✂️ Chunking…", indexing:"🔢 Indexing…" };

  async function uploadAll() {
    uploadBtn.disabled = true;
    const alert = document.getElementById("rag-upload-alert");
    alert.className = "rag-alert";
    let ok = 0, fail = 0;

    for (let i = 0; i < _files.length; i++) {
      const f = _files[i];
      setSt(i, "📤 Uploading…");
      try {
        const form = new FormData(); form.append("file", f);
        const res = await fetch(SERVER + "/ingest", {
          method: "POST",
          headers: { "Authorization": "Bearer " + _token },
          body: form,
        });
        if (!res.ok) throw new Error((await res.json()).detail || "HTTP " + res.status);
        const { job_id } = await res.json();
        await pollJob(job_id, i, Date.now());
        const job = await (await fetch(SERVER + "/ingest/status/" + job_id, { headers: _authH() })).json();
        if (job.status === "done") { setSt(i, "✅ " + job.chunks_indexed + " chunks", "ok"); ok++; }
        else throw new Error(job.message);
      } catch (e) { setSt(i, "❌ " + e.message, "err"); fail++; }
    }

    uploadBtn.disabled = false;
    alert.textContent = ok + " indexed" + (fail ? ", " + fail + " failed" : "");
    alert.className = "rag-alert " + (ok > 0 ? "ok" : "err");
    if (ok > 0) { _files = _files.filter((_, i) => document.getElementById("rfs-" + i)?.classList.contains("err")); renderQueue(); }
  }

  function setSt(i, text, cls) {
    const el = document.getElementById("rfs-" + i);
    if (!el) return;
    el.textContent = text;
    el.className = "rag-file-status" + (cls ? " " + cls : "");
  }

  async function pollJob(job_id, i, start) {
    while (true) {
      await new Promise(r => setTimeout(r, 3000));
      const elapsed = Date.now() - start;
      const mins    = Math.floor(elapsed / 60000);
      const secs    = Math.floor((elapsed % 60000) / 1000);
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      try {
        const res = await fetch(SERVER + "/ingest/status/" + job_id, { headers: _authH() });
        const job = await res.json();
        if (job.status === "done" || job.status === "error") return;
        setSt(i, (job.message || PHASES[job.status] || "⏳ Processing…") + " (" + timeStr + ")");
      } catch {
        setSt(i, "⏳ Waiting… (" + timeStr + ")");
      }
    }
  }

  // ── Docs (admin) ───────────────────────────────────────────────
  async function loadDocs() {
    const list = document.getElementById("rag-doc-list");
    list.innerHTML = '<div class="rag-empty">Loading…</div>';
    try {
      const res = await fetch(SERVER + "/documents", { headers: _authH() });
      const data = await res.json();
      const docs = data.documents || [];
      if (!docs.length) { list.innerHTML = '<div class="rag-empty">No documents indexed yet.</div>'; return; }
      list.innerHTML = "";
      docs.forEach(name => {
        const row = document.createElement("div");
        row.className = "rag-doc-row";
        row.innerHTML = `<span class="rag-doc-name">${name}</span>
          <button class="rag-del-btn" onclick="ragDeleteDoc('${name}')">Delete</button>`;
        list.appendChild(row);
      });
    } catch { list.innerHTML = '<div class="rag-empty">Failed to load documents.</div>'; }
  }

  window.ragDeleteDoc = async function(filename) {
    if (!confirm('Delete "' + filename + '"?')) return;
    await fetch(SERVER + "/documents/" + encodeURIComponent(filename), { method: "DELETE", headers: _authH() });
    loadDocs();
  };

  // ── Auto-open if already logged in ────────────────────────────
  if (_token && _userInfo) showApp();

})();