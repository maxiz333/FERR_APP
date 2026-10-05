/* ============================================
   KEYPAD.JS
   Tastierino numerico modale riutilizzabile.
   Ritorna una Promise<number> con il valore confermato.
   ============================================ */

   let _activeKeypad = null;

   /**
    * Apre il tastierino numerico.
    *
    * @param {Object} opts
    * @param {string} opts.title - Titolo (es. "Quantità")
    * @param {number} opts.value - Valore iniziale
    * @param {string} opts.unit - Unità (es. "pz", "kg")
    * @param {boolean} opts.allowDecimal - Se permette decimali (default true)
    * @param {boolean} opts.allowNegative - Se permette negativi (default false)
    * @param {number} opts.max - Valore massimo (opzionale)
    * @param {number} opts.min - Valore minimo (opzionale, default 0)
    * @returns {Promise<number|null>} valore confermato, o null se annullato
    */
   export function openKeypad(opts) {
     // Se c'è già un tastierino aperto, chiudilo
     if (_activeKeypad) {
       _activeKeypad.close();
       _activeKeypad = null;
     }
   
     return new Promise((resolve) => {
       const config = {
         title: opts.title || "Valore",
         value: opts.value != null ? String(opts.value) : "0",
         unit: opts.unit || "",
         allowDecimal: opts.allowDecimal !== false,
         allowNegative: opts.allowNegative === true,
         min: opts.min != null ? opts.min : 0,
         max: opts.max != null ? opts.max : null
       };
   
       let currentValue = config.value.replace(".", ",");
   
       // Crea overlay
       const overlay = document.createElement("div");
       overlay.className = "keypad-overlay";
       overlay.innerHTML = `
         <div class="keypad-modal">
           <div class="keypad-header">
             <span class="keypad-title">${escapeHtml(config.title)}</span>
             <button class="keypad-close" data-action="cancel">✕</button>
           </div>
   
           <div class="keypad-display">
             <span class="keypad-display-value" data-display>${currentValue}</span>
             <span class="keypad-display-unit">${escapeHtml(config.unit)}</span>
           </div>
   
           <div class="keypad-grid">
             <button class="keypad-key" data-key="1">1</button>
             <button class="keypad-key" data-key="2">2</button>
             <button class="keypad-key" data-key="3">3</button>
             <button class="keypad-key keypad-key-accent" data-key="backspace">⌫</button>
   
             <button class="keypad-key" data-key="4">4</button>
             <button class="keypad-key" data-key="5">5</button>
             <button class="keypad-key" data-key="6">6</button>
             <button class="keypad-key keypad-key-accent" data-key="clear">C</button>
   
             <button class="keypad-key" data-key="7">7</button>
             <button class="keypad-key" data-key="8">8</button>
             <button class="keypad-key" data-key="9">9</button>
             <button class="keypad-key keypad-key-danger" data-key="cancel">✕</button>
   
             <button class="keypad-key" data-key="00">00</button>
             <button class="keypad-key" data-key="0">0</button>
             <button class="keypad-key" data-key=",">,</button>
             <button class="keypad-key keypad-key-success" data-key="confirm">✓</button>
           </div>
         </div>
       `;
   
       document.body.appendChild(overlay);
   
       const displayEl = overlay.querySelector("[data-display]");
   
       function updateDisplay() {
         displayEl.textContent = currentValue || "0";
       }
   
       function close() {
         overlay.classList.add("closing");
         setTimeout(() => {
           if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
           document.removeEventListener("keydown", onKeyDown);
         }, 150);
       }
   
       function confirm() {
         const parsed = parseFloat(currentValue.replace(",", ".")) || 0;
   
         // Validazioni
         if (!config.allowNegative && parsed < 0) {
           shake();
           return;
         }
         if (config.min != null && parsed < config.min) {
           shake();
           return;
         }
         if (config.max != null && parsed > config.max) {
           shake();
           return;
         }
   
         _activeKeypad = null;
         close();
         resolve(parsed);
       }
   
       function cancel() {
         _activeKeypad = null;
         close();
         resolve(null);
       }
   
       function shake() {
         const modal = overlay.querySelector(".keypad-modal");
         modal.classList.add("shake");
         setTimeout(() => modal.classList.remove("shake"), 300);
       }
   
       function handleKey(key) {
         if (key === "backspace") {
           currentValue = currentValue.slice(0, -1);
           if (currentValue === "" || currentValue === "-") currentValue = "0";
         }
         else if (key === "clear") {
           currentValue = "0";
         }
         else if (key === "cancel") {
           cancel();
           return;
         }
         else if (key === "confirm") {
           confirm();
           return;
         }
         else if (key === ",") {
           if (!config.allowDecimal) return;
           if (currentValue.includes(",")) return;
           currentValue += ",";
         }
         else if (key === "00") {
           if (currentValue === "0") return;
           currentValue += "00";
         }
         else if (/^\d$/.test(key)) {
           if (currentValue === "0") {
             currentValue = key;
           } else {
             // Limite lunghezza per evitare valori assurdi
             if (currentValue.replace(/[,\.\-]/g, "").length >= 8) return;
             currentValue += key;
           }
         }
         updateDisplay();
       }
   
       // Click handler
       overlay.querySelectorAll("[data-key]").forEach(btn => {
         btn.addEventListener("click", () => handleKey(btn.dataset.key));
       });
   
       // Tastiera fisica
       function onKeyDown(e) {
         const k = e.key;
         if (k >= "0" && k <= "9") handleKey(k);
         else if (k === "," || k === ".") handleKey(",");
         else if (k === "Backspace") handleKey("backspace");
         else if (k === "Escape") cancel();
         else if (k === "Enter") confirm();
         else if (k === "Delete") handleKey("clear");
       }
       document.addEventListener("keydown", onKeyDown);
   
       // Click fuori
       overlay.addEventListener("click", (e) => {
         if (e.target === overlay) cancel();
       });
   
       // Salva riferimento
       _activeKeypad = { close };
   
       // Focus automatico per tastiera fisica
       setTimeout(() => overlay.querySelector(".keypad-modal").focus(), 50);
     });
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;");
   }