/* ============================================
   NOTIFY.JS — Blocco 4
   Toast colorati + suono + notifica nativa.
   ============================================ */

   let _audioCtx = null;
   let _nativePermission = null; // null | "granted" | "denied" | "default"
   
   /* ============================================
      BEEP (Web Audio API — nessun file audio)
      ============================================ */
   
   function ensureAudioCtx() {
     if (_audioCtx) return _audioCtx;
     try {
       const Ctx = window.AudioContext || window.webkitAudioContext;
       if (!Ctx) return null;
       _audioCtx = new Ctx();
     } catch {
       _audioCtx = null;
     }
     return _audioCtx;
   }
   
   /**
    * Doppio beep tipo "notifica" (due toni brevi).
    */
   export function playBeep() {
     const ctx = ensureAudioCtx();
     if (!ctx) return;
     // Sblocca il contesto se sospeso (richiede un gesto utente precedente)
     if (ctx.state === "suspended") ctx.resume().catch(() => {});
   
     const now = ctx.currentTime;
     const tones = [
       { freq: 880, start: 0.00, dur: 0.10 },
       { freq: 1320, start: 0.14, dur: 0.12 }
     ];
   
     for (const t of tones) {
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.type = "sine";
       osc.frequency.value = t.freq;
       gain.gain.setValueAtTime(0.0001, now + t.start);
       gain.gain.exponentialRampToValueAtTime(0.18, now + t.start + 0.01);
       gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
       osc.connect(gain).connect(ctx.destination);
       osc.start(now + t.start);
       osc.stop(now + t.start + t.dur + 0.02);
     }
   }
   
   /* ============================================
      NOTIFICA NATIVA PC
      ============================================ */
   
   /**
    * Chiede il permesso per le notifiche native (una volta sola).
    * Chiamala al primo gesto utente (click) così il browser la accetta.
    */
   export async function requestNotificationPermission() {
     if (!("Notification" in window)) return "denied";
     if (_nativePermission) return _nativePermission;
     if (Notification.permission === "granted") {
       _nativePermission = "granted";
       return "granted";
     }
     if (Notification.permission === "denied") {
       _nativePermission = "denied";
       return "denied";
     }
     try {
       const p = await Notification.requestPermission();
       _nativePermission = p;
       return p;
     } catch {
       _nativePermission = "denied";
       return "denied";
     }
   }
   
   /**
    * Mostra una notifica nativa del PC (solo se permesso concesso).
    */
   function showNativeNotification(title, body) {
     if (!("Notification" in window)) return;
     if (Notification.permission !== "granted") return;
     try {
       const n = new Notification(title, {
         body,
         icon: undefined,
         tag: "ferapp-order",
         renotify: true
       });
       // Auto-chiudi dopo 6s
       setTimeout(() => n.close(), 6000);
     } catch {
       /* ignora */
     }
   }
   
   /* ============================================
      TOAST IN UFFICIO
      ============================================ */
   
      let _currentNotifOverlay = null;

      /**
       * Mostra una notifica modale centrale (stile vecchia app).
       * @param {object} opts
       *   status     — "nuovo" | "bozza" | "in_arrivo" | "fatto" | "pronto"
       *   clientName — nome cliente (es. "Cliente 2")
       *   body       — riga di testo (es. "1 × BULLONE ARATRO QUA. 14X080 ACC")
       *   time       — timestamp (default: ora)
       *   onClick    — chiamata quando si preme "Vai agli Ordini"
       */
      export function showOfficeToast(opts) {
        // Chiudi eventuale notifica precedente
        if (_currentNotifOverlay) {
          _currentNotifOverlay.remove();
          _currentNotifOverlay = null;
        }
      
        const statusLabels = {
          bozza:      "NUOVA BOZZA",
          nuovo:      "NUOVO ORDINE",
          in_arrivo:  "IN ARRIVO",
          fatto:      "ORDINE FATTO",
          pronto:     "ORDINE PRONTO"
        };
        const statusIcons = {
          bozza:      "📄",
          nuovo:      "📄",
          in_arrivo:  "🔔",
          fatto:      "✅",
          pronto:     "📋"
        };
      
        const st = opts.status || "info";
        const label = statusLabels[st] || "NOTIFICA";
        const icon = statusIcons[st] || "🔔";
        const time = formatDateTime(opts.time || Date.now());
      
        const overlay = document.createElement("div");
        overlay.className = "ferapp-notif-overlay";
        overlay.innerHTML = `
          <div class="ferapp-notif-box ferapp-notif-${st}">
            <div class="ferapp-notif-header">
              <span class="ferapp-notif-icon">${icon}</span>
              <div class="ferapp-notif-title">
                <div class="ferapp-notif-title-main">${escapeHtml(label)}</div>
                <div class="ferapp-notif-title-sub">${escapeHtml(opts.clientName || "Cliente 1")}</div>
              </div>
              <div class="ferapp-notif-time">${time}</div>
            </div>
            <div class="ferapp-notif-divider"></div>
            <div class="ferapp-notif-body">
              <div class="ferapp-notif-line">${escapeHtml(opts.body || "")}</div>
            </div>
            <div class="ferapp-notif-actions">
              <button class="ferapp-notif-btn ferapp-notif-btn-primary" id="ferappNotifGo" type="button">
                📋 Vai agli Ordini
              </button>
              <button class="ferapp-notif-btn ferapp-notif-btn-secondary" id="ferappNotifOk" type="button">
                OK
              </button>
            </div>
          </div>
        `;
      
        document.body.appendChild(overlay);
        _currentNotifOverlay = overlay;
      
        const close = () => {
          if (_currentNotifOverlay === overlay) {
            overlay.remove();
            _currentNotifOverlay = null;
          }
        };
      
        overlay.querySelector("#ferappNotifGo").addEventListener("click", (e) => {
          e.stopPropagation();
          close();
          try { opts.onClick && opts.onClick(); } catch (err) { console.error(err); }
        });
      
        overlay.querySelector("#ferappNotifOk").addEventListener("click", (e) => {
          e.stopPropagation();
          close();
        });
      
        // Click fuori → ignora (chiude senza azione)
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) close();
        });
      
        // Esc → chiude
        document.addEventListener("keydown", function esc(e) {
          if (e.key === "Escape") {
            close();
            document.removeEventListener("keydown", esc);
          }
        });
      
        // Suono + notifica nativa PC
        playBeep();
        showNativeNotification(
          label,
          `${opts.clientName || "Cliente 1"}${opts.body ? " · " + opts.body : ""}`
        );
      }
      
      /**
       * Formatta una data in "GG/MM/AAAA — HH:MM" per l'header della notifica.
       */
      function formatDateTime(ts) {
        const d = new Date(ts);
        const gg = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${gg}/${mm}/${yy} — ${hh}:${mi}`;
      }
   
   /* ============================================
      UTILS
      ============================================ */
   
   function escapeHtml(s) {
     return String(s ?? "").replace(/[&<>"']/g, (c) => ({
       "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
     }[c]));
   }