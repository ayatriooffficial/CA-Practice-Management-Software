// CA Practice Extension - Universal Draggable Floating Assistant Widget

export class FloatingWidget {
  constructor(options = {}) {
    this.portal = options.portal || { name: "Portal", badge: "PORTAL", color: "#31719B" };
    this.credentials = options.credentials || {};
    this.client = options.client || null;
    this.directors = options.directors || [];
    this.onFill = options.onFill || (() => {});
    this.onSelectDirector = options.onSelectDirector || (() => {});
    this.container = null;
    this.isExpanded = false;
  }

  mount() {
    // Avoid double mounting
    if (document.getElementById("ca-practice-floating-root")) return;

    this.container = document.createElement("div");
    this.container.id = "ca-practice-floating-root";
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      user-select: none;
      box-sizing: border-box;
    `;

    this.render();
    document.body.appendChild(this.container);
    this.makeDraggable();
  }

  update(credentials, client, directors) {
    this.credentials = credentials || this.credentials;
    this.client = client || this.client;
    this.directors = directors || this.directors;
    if (this.container) {
      this.render();
    }
  }

  render() {
    const directorName = this.credentials.directorName || "Director";
    const clientName = this.credentials.clientName || this.client?.name || "CA Practice Client";
    const userId = this.credentials.userId || this.credentials.mcaId || this.credentials.pan || "";
    const hasPassword = Boolean(this.credentials.password || this.credentials.mcaPassword);

    this.container.innerHTML = `
      <style>
        .ca-float-pill {
          background: #ffffff;
          color: #0f172a;
          border-radius: 9999px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ca-float-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px -5px rgba(0, 0, 0, 0.25);
        }
        .ca-badge {
          background: ${this.portal.color || "#0284c7"};
          color: #ffffff;
          font-weight: 700;
          font-size: 10.5px;
          padding: 3px 8px;
          border-radius: 9999px;
          letter-spacing: 0.5px;
        }
        .ca-float-btn {
          background: #0284c7;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 11px;
          padding: 5px 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s ease;
        }
        .ca-float-btn:hover {
          background: #0369a1;
        }
        .ca-float-card {
          background: #ffffff;
          color: #0f172a;
          border-radius: 12px;
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.3);
          border: 1px solid #cbd5e1;
          width: 310px;
          padding: 14px;
          margin-bottom: 8px;
        }
      </style>

      ${
        this.isExpanded
          ? `
        <div class="ca-float-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="ca-badge">${this.portal.shortName || "CA"}</span>
              <strong style="font-size: 12px; color: #1e293b;">${this.portal.name}</strong>
            </div>
            <button id="ca-close-card" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #64748b;">✕</button>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 11.5px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 3px;">${clientName}</div>
            <div style="color: #64748b;">Signatory: <strong style="color: #334155;">${directorName}</strong></div>
            <div style="color: #64748b;">User ID: <code style="font-family: monospace; color: #0284c7; font-weight: 600;">${userId || "(not set)"}</code></div>
          </div>

          ${
            this.directors.length > 1
              ? `
            <div style="margin-bottom: 10px;">
              <label style="font-size: 11px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Switch Director</label>
              <select id="ca-director-select" style="width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; padding: 0 6px;">
                ${this.directors
                  .map(
                    (d) => `<option value="${d.din || d.mcaId || d.name}" ${d.name === directorName ? "selected" : ""}>${d.name} (${d.din || d.mcaId || "No DIN"})</option>`
                  )
                  .join("")}
              </select>
            </div>
          `
              : ""
          }

          <div style="display: flex; gap: 6px;">
            <button id="ca-exec-fill" class="ca-float-btn" style="flex: 1; height: 32px; justify-content: center;">
              ⚡ Auto-Fill Form
            </button>
            <button id="ca-copy-pwd" style="height: 32px; padding: 0 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; cursor: pointer;">
              📋 Copy Pass
            </button>
          </div>
        </div>
      `
          : ""
      }

      <div class="ca-float-pill" id="ca-pill-trigger">
        <span class="ca-badge">${this.portal.shortName || "CA"}</span>
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 600; font-size: 12px; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${directorName}
          </span>
          <span style="font-size: 10px; color: #64748b;">${hasPassword ? "Password Ready" : "Manual Fill"}</span>
        </div>
        <button id="ca-pill-fill-btn" class="ca-float-btn">
          ⚡ Fill
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const pill = this.container.querySelector("#ca-pill-trigger");
    const fillBtn = this.container.querySelector("#ca-pill-fill-btn");
    const closeBtn = this.container.querySelector("#ca-close-card");
    const execFill = this.container.querySelector("#ca-exec-fill");
    const copyPwd = this.container.querySelector("#ca-copy-pwd");
    const dirSelect = this.container.querySelector("#ca-director-select");

    pill?.addEventListener("click", (e) => {
      if (e.target === fillBtn || fillBtn?.contains(e.target)) return;
      this.isExpanded = !this.isExpanded;
      this.render();
    });

    fillBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onFill(this.credentials);
    });

    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isExpanded = false;
      this.render();
    });

    execFill?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onFill(this.credentials);
    });

    copyPwd?.addEventListener("click", (e) => {
      e.stopPropagation();
      const pwd = this.credentials.password || this.credentials.mcaPassword || "";
      if (pwd) {
        navigator.clipboard.writeText(pwd).then(() => {
          copyPwd.innerText = "✓ Copied!";
          setTimeout(() => { copyPwd.innerText = "📋 Copy Pass"; }, 1500);
        });
      }
    });

    dirSelect?.addEventListener("change", (e) => {
      const selectedDin = e.target.value;
      const targetDir = this.directors.find((d) => (d.din || d.mcaId || d.name) === selectedDin);
      if (targetDir) {
        this.onSelectDirector(targetDir);
      }
    });
  }

  makeDraggable() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialRight = 24;
    let initialBottom = 24;

    const el = this.container;

    el.addEventListener("mousedown", (e) => {
      // Don't drag if clicking buttons, inputs, or selects
      if (["BUTTON", "INPUT", "SELECT", "OPTION"].includes(e.target.tagName)) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = el.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;

      const onMouseMove = (moveEvt) => {
        if (!isDragging) return;
        const deltaX = moveEvt.clientX - startX;
        const deltaY = moveEvt.clientY - startY;

        el.style.right = `${Math.max(10, initialRight - deltaX)}px`;
        el.style.bottom = `${Math.max(10, initialBottom - deltaY)}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }
}

