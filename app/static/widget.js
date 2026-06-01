/**
 * Enterprise RAG Chatbot Widget
 * Embed on any page:
 *   <script>window.RAG_CONFIG = { serverUrl: "http://your-server:8010" };</script>
 *   <script src="http://your-server:8010/static/widget.js"></script>
 */
(function () {
  "use strict";

  if (document.getElementById("rag-widget-root")) return;

  const CFG    = window.RAG_CONFIG || {};
  const SERVER = (CFG.serverUrl || "http://localhost:8010").replace(/\/$/, "");
  const TITLE  = CFG.title  || "AI Assistant";
  const THEME  = CFG.theme  || "#4F46E5";

  // ── Styles ─────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #rag-widget-root * { box-sizing:border-box; margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }

    #rag-bubble {
      position:fixed; bottom:24px; right:24px; z-index:999998;
      width:56px; height:56px; border-radius:50%;
      background:${THEME}; color:#fff; border:none; cursor:pointer;
      box-shadow:0 4px 20px rgba(0,0,0,.3);
      display:flex; align-items:center; justify-content:center;
      transition:transform .2s, box-shadow .2s;
    }
    #rag-bubble:hover { transform:scale(1.08); box-shadow:0 6px 28px rgba(0,0,0,.4); }
    #rag-bubble svg { width:26px; height:26px; }
    #rag-notif {
      position:absolute; top:-3px; right:-3px;
      width:14px; height:14px; border-radius:50%;
      background:#EF4444; border:2px solid #fff; display:none;
    }
    #rag-notif.show { display:block; }

    #rag-panel {
      position:fixed; bottom:92px; right:24px; z-index:999999;
      width:380px; max-height:calc(100vh - 110px);
      background:#0F1117; border:1px solid #2E3248; border-radius:16px;
      display:flex; flex-direction:column;
      box-shadow:0 12px 48px rgba(0,0,0,.5); overflow:hidden;
      transform:scale(.95) translateY(12px); opacity:0; pointer-events:none;
      transition:transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s;
    }
    #rag-panel.open { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }
    @media(max-width:440px){ #rag-panel{ width:calc(100vw - 16px); right:8px; bottom:82px; } }

    #rag-header {
      display:flex; align-items:center; gap:10px;
      padding:14px 16px; background:${THEME}; flex-shrink:0;
    }
    #rag-header-av {
      width:32px; height:32px; border-radius:50%;
      background:rgba(255,255,255,.2);
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    #rag-header-av svg { width:18px; height:18px; }
    #rag-header-info { flex:1; }
    #rag-header-title { color:#fff; font-size:15px; font-weight:600; }
    #rag-header-sub { color:rgba(255,255,255,.75); font-size:11px; }
    #rag-close {
      background:rgba(255,255,255,.15); border:none; color:#fff;
      width:28px; height:28px; border-radius:50%; cursor:pointer;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    #rag-close:hover { background:rgba(255,255,255,.28); }
    #rag-close svg { width:14px; height:14px; }

    .rag-view { display:flex; flex-direction:column; flex:1; overflow:hidden; }
    .rag-view.hidden { display:none!important; }

    /* Lead form */
    #rag-lead-view {
      padding:24px 20px; gap:14px; background:#0F1117;
    }
    #rag-lead-view .rag-lead-intro {
      font-size:13px; color:#8892A4; text-align:center; line-height:1.6;
      padding-bottom:4px;
    }
    .rag-field label {
      display:block; font-size:11px; font-weight:600; color:#8892A4;
      text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px;
    }
    .rag-field input {
      width:100%; background:#1A1D27; border:1px solid #2E3248;
      border-radius:8px; color:#E2E8F0; padding:9px 12px;
      font-size:13px; outline:none; transition:border-color .15s;
    }
    .rag-field input:focus { border-color:${THEME}; }
    .rag-field input::placeholder { color:#4B5563; }
    .rag-lead-err {
      background:#EF444420; color:#EF4444; border:1px solid #EF4444;
      border-radius:8px; padding:8px 12px; font-size:12px; display:none;
    }
    .rag-lead-err.show { display:block; }
    .rag-btn-primary {
      width:100%; padding:10px; background:${THEME}; color:#fff;
      border:none; border-radius:8px; font-size:13px; font-weight:600;
      cursor:pointer; transition:opacity .15s; margin-top:2px;
    }
    .rag-btn-primary:hover { opacity:.9; }
    .rag-btn-primary:disabled { opacity:.5; cursor:not-allowed; }

    /* Chat */
    #rag-messages {
      flex:1; overflow-y:auto; padding:14px;
      display:flex; flex-direction:column; gap:10px;
      min-height:300px;
    }
    #rag-messages::-webkit-scrollbar { width:3px; }
    #rag-messages::-webkit-scrollbar-thumb { background:#2E3248; border-radius:3px; }
    .rag-welcome {
      display:flex; flex-direction:column; align-items:center;
      justify-content:center; height:100%; gap:10px;
      color:#8892A4; text-align:center; font-size:13px; padding:20px;
    }
    .rag-welcome svg { opacity:.4; }
    .rag-msg { display:flex; gap:8px; }
    .rag-msg.user { flex-direction:row-reverse; }
    .rag-av {
      width:26px; height:26px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:10px; font-weight:700; margin-top:2px;
    }
    .rag-msg.user .rag-av { background:${THEME}; color:#fff; }
    .rag-msg.bot  .rag-av { background:#22263A; color:#A5B4FC; border:1px solid #2E3248; font-size:9px; }
    .rag-bubble {
      max-width:80%; padding:9px 12px; border-radius:10px;
      font-size:13px; line-height:1.55; white-space:pre-wrap; word-break:break-word;
    }
    .rag-msg.user .rag-bubble { background:${THEME}; color:#fff; border-bottom-right-radius:3px; }
    .rag-msg.bot  .rag-bubble { background:#1A1D27; color:#E2E8F0; border:1px solid #2E3248; border-bottom-left-radius:3px; }
    .rag-msg.bot  .rag-bubble.streaming { border-color:${THEME}55; }
    .rag-sources { margin-top:7px; padding-top:7px; border-top:1px solid #2E3248; font-size:11px; color:#8892A4; }
    .rag-src-tag { display:inline-block; background:#22263A; border:1px solid #2E3248; border-radius:4px; padding:2px 6px; margin:2px 2px 0 0; font-size:10px; }

    #rag-input-bar {
      display:flex; gap:8px; align-items:flex-end;
      padding:10px 12px; border-top:1px solid #2E3248;
      background:#0F1117; flex-shrink:0;
    }
    #rag-input {
      flex:1; background:#1A1D27; border:1px solid #2E3248; border-radius:8px;
      color:#E2E8F0; padding:8px 11px; font-size:13px; resize:none;
      outline:none; max-height:80px; font-family:inherit; line-height:1.4;
      transition:border-color .15s;
    }
    #rag-input:focus { border-color:${THEME}; }
    #rag-input::placeholder { color:#4B5563; }
    #rag-send {
      width:34px; height:34px; border-radius:8px;
      background:${THEME}; color:#fff; border:none; cursor:pointer;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    #rag-send:hover { opacity:.9; }
    #rag-send:disabled { opacity:.4; cursor:not-allowed; }
    #rag-send svg { width:15px; height:15px; }

    #rag-footer {
      padding:7px 14px; border-top:1px solid #1C1F2E;
      text-align:center; font-size:10px; flex-shrink:0;
      color: ${THEME}; opacity: 0.85;
      display:flex; align-items:center; justify-content:center; gap:4px;
    }
  `;
  document.head.appendChild(style);

  // ── DOM ─────────────────────────────────────────────────────────
  const root = document.createElement("div");
  root.id = "rag-widget-root";
  root.innerHTML = `
    <button id="rag-bubble" title="${TITLE}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span id="rag-notif"></span>
    </button>

    <div id="rag-panel">
      <div id="rag-header">
        <div id="rag-header-av">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div id="rag-header-info">
          <div id="rag-header-title">${TITLE}</div>
          <div id="rag-header-sub">Ask me anything</div>
        </div>
        <button id="rag-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Lead capture form -->
      <div id="rag-lead-view" class="rag-view hidden">
        <p class="rag-lead-intro">Please share your details before we begin.</p>
        <div class="rag-field">
          <label>Full Name *</label>
          <input id="rag-lead-name" type="text" placeholder="John Smith" />
        </div>
        <div class="rag-field">
          <label>Phone Number</label>
          <input id="rag-lead-phone" type="tel" placeholder="+91 98765 43210" />
        </div>
        <div class="rag-field">
          <label>Email Address *</label>
          <input id="rag-lead-email" type="email" placeholder="john@example.com" />
        </div>
        <div class="rag-lead-err" id="rag-lead-err"></div>
        <button class="rag-btn-primary" id="rag-lead-btn">Start Chat →</button>
      </div>

      <!-- Chat -->
      <div id="rag-chat-view" class="rag-view hidden">
        <div id="rag-messages">
          <div class="rag-welcome">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Hi! Ask me anything about our products and services.</span>
          </div>
        </div>
        <div id="rag-input-bar">
          <textarea id="rag-input" rows="1" placeholder="Type your question…"></textarea>
          <button id="rag-send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="rag-footer">
        <img src="${SERVER}/static/jayathisoft-logo-transparent.png" 
          style="height:14px;vertical-align:middle;margin-right:5px;opacity:0.85;" />
        Powered by Jayathisoft
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ── Refs ────────────────────────────────────────────────────────
  const bubble   = document.getElementById("rag-bubble");
  const panel    = document.getElementById("rag-panel");
  const notif    = document.getElementById("rag-notif");
  const leadView = document.getElementById("rag-lead-view");
  const chatView = document.getElementById("rag-chat-view");
  const messages = document.getElementById("rag-messages");
  const input    = document.getElementById("rag-input");
  const sendBtn  = document.getElementById("rag-send");

  // ── State ───────────────────────────────────────────────────────
  let isOpen = false;
  let collectDetails = false;
  let leadSubmitted  = sessionStorage.getItem("rag_lead_done") === "1";

  // ── Init: fetch widget config ────────────────────────────────────
  fetch(SERVER + "/widget-config")
    .then(r => r.json())
    .then(cfg => { collectDetails = !!cfg.collect_user_details; })
    .catch(() => {});

  // ── Toggle panel ─────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    notif.classList.remove("show");

    if (collectDetails && !leadSubmitted) {
      showView(leadView);
    } else {
      showView(chatView);
      setTimeout(() => input.focus(), 200);
    }
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
  }

  function showView(view) {
    leadView.classList.add("hidden");
    chatView.classList.add("hidden");
    view.classList.remove("hidden");
  }

  bubble.addEventListener("click", () => isOpen ? closePanel() : openPanel());
  document.getElementById("rag-close").addEventListener("click", closePanel);

  // ── Lead form ─────────────────────────────────────────────────
  document.getElementById("rag-lead-btn").addEventListener("click", submitLead);
  document.getElementById("rag-lead-email").addEventListener("keydown", e => {
    if (e.key === "Enter") submitLead();
  });

  async function submitLead() {
    const name  = document.getElementById("rag-lead-name").value.trim();
    const phone = document.getElementById("rag-lead-phone").value.trim();
    const email = document.getElementById("rag-lead-email").value.trim();
    const err   = document.getElementById("rag-lead-err");
    const btn   = document.getElementById("rag-lead-btn");

    if (!name || !email) {
      err.textContent = "Name and email are required.";
      err.classList.add("show");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.textContent = "Please enter a valid email address.";
      err.classList.add("show");
      return;
    }

    err.classList.remove("show");
    btn.disabled = true;
    btn.textContent = "Please wait…";

    try {
      const res = await fetch(SERVER + "/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      if (!res.ok) throw new Error("Failed to save details");

      sessionStorage.setItem("rag_lead_done", "1");
      leadSubmitted = true;
      showView(chatView);
      setTimeout(() => input.focus(), 200);

    } catch (e) {
      err.textContent = "Something went wrong. Please try again.";
      err.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Start Chat →";
    }
  }

  // ── Chat ──────────────────────────────────────────────────────
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

    const wrap = document.createElement("div");
    wrap.className = "rag-msg " + role;
    const av = role === "user" ? "You" : "AI";
    wrap.innerHTML = `
      <div class="rag-av">${av}</div>
      <div class="rag-bubble${role === "bot" ? " streaming" : ""}">${text || ""}</div>
    `;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap.querySelector(".rag-bubble");
  }

  async function sendMsg() {
    const q = input.value.trim();
    if (!q || sendBtn.disabled) return;
    input.value = "";
    input.style.height = "auto";
    sendBtn.disabled = true;

    _appendMsg("user", q);
    const botBubble = _appendMsg("bot", "");

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
        const si = full.indexOf("\n\nSources:\n");
        botBubble.textContent = si !== -1 ? full.slice(0, si) : full;
        messages.scrollTop = messages.scrollHeight;
      }

      botBubble.classList.remove("streaming");

      // Render sources
      const si = full.indexOf("\n\nSources:\n");
      if (si !== -1) {
        const src = document.createElement("div");
        src.className = "rag-sources";
        src.innerHTML = "<strong>Sources</strong><br/>";
        full.slice(si + 10).trim().split("\n").forEach(line => {
          const name = line.replace(/^•\s*/, "").trim();
          if (name) {
            const tag = document.createElement("span");
            tag.className = "rag-src-tag";
            tag.textContent = name;
            src.appendChild(tag);
          }
        });
        botBubble.appendChild(src);
      }

      if (!isOpen) notif.classList.add("show");

    } catch (e) {
      botBubble.classList.remove("streaming");
      botBubble.textContent = "Sorry, something went wrong. Please try again.";
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

})();