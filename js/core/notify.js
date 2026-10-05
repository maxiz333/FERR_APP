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
   
   let _toastStack = null;
   
   function ensureToastStack() {
     if (_toastStack && document.body.contains(_toastStack)) return _toastStack;
     _toastStack = document.createElement("div");
     _toastStack.className = "ferapp-toast-stack";
     document.body.appendChild(_toastStack);
     return _toastStack;
   }
   
   /**
    * Mostra un toast colorato in alto a destra.
    * @param {object} opts
    *   title     — titolo principale (es. "Ordine #12 - A")
    *   subtitle  — sottotitolo (es. "Cliente 1 · € 23,10")
    *   color     — "nuovo" | "bozza" | "in_arrivo" | "fatto"
    *   onClick   — funzione chiamata al click sul toast
    *   duration  — (opzionale) ms auto-dismiss. Se assente, resta finché non chiudi/click
    */
   export function showOfficeToast(opts) {
     const stack = ensureToastStack();
   
     const el = document.createElement("div");
     el.className = `ferapp-toast ferapp-toast-${opts.color || "info"}`;
     el.innerHTML = `
       <div class="ferapp-toast-body">
         <div class="ferapp-toast-title">${escapeHtml(opts.title || "")}</div>
         <div class="ferapp-toast-sub">${escapeHtml(opts.subtitle || "")}</div>
       </div>
       <button class="ferapp-toast-close" type="button" aria-label="Chiudi">✕</button>
     `;
     stack.appendChild(el);
   
     let closed = false;
     const close = () => {
       if (closed) return;
       closed = true;
       el.classList.add("ferapp-toast-out");
       setTimeout(() => el.remove(), 200);
     };
   
     // Click sul body → callback + chiudi
     el.querySelector(".ferapp-toast-body").addEventListener("click", (e) => {
       e.stopPropagation();
       try { opts.onClick && opts.onClick(); } catch (err) { console.error(err); }
       close();
     });
   
     // X → solo chiudi
     el.querySelector(".ferapp-toast-close").addEventListener("click", (e) => {
       e.stopPropagation();
       close();
     });
   
     // Click fuori (sul document) → chiudi
     const outsideHandler = (ev) => {
       if (!el.contains(ev.target)) {
         document.removeEventListener("mousedown", outsideHandler, true);
         close();
       }
     };
     setTimeout(() => {
       document.addEventListener("mousedown", outsideHandler, true);
     }, 0);
   
     // Auto-dismiss se richiesto
     if (opts.duration && opts.duration > 0) {
       setTimeout(close, opts.duration);
     }
   
     // Suono + notifica nativa
     playBeep();
     showNativeNotification(opts.title || "FerApp", opts.subtitle || "Nuovo ordine");
   }
   
   /* ============================================
      UTILS
      ============================================ */
   
   function escapeHtml(s) {
     return String(s ?? "").replace(/[&<>"']/g, (c) => ({
       "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
     }[c]));
   }