/* ============================================
   CUT-CALCULATOR.JS
   Calcolatore taglio/peso per articoli KG/MT/MQ.
   Formula: kg = metri * (Tot.U / mt.rot)
            prezzo = kg * prezzoBase
   ============================================ */

   let _activeCalc = null;

   /**
    * Apre il calcolatore taglio/peso.
    *
    * @param {Object} opts
    * @param {string} opts.description - Descrizione articolo
    * @param {number} opts.basePrice - Prezzo base al kg/mt
    * @param {number} opts.totU - Tot.U (grammi per metro o simile)
    * @param {number} opts.mtRot - Metri per rotolo
    * @param {string} opts.unit - Unità (KG, MT, MQ)
    * @returns {Promise<{meters:number, kg:number, price:number}|null>}
    */
   export function openCutCalculator(opts) {
     if (_activeCalc) {
       _activeCalc.close();
       _activeCalc = null;
     }
   
     return new Promise((resolve) => {
       const config = {
         description: opts.description || "",
         basePrice: Number(opts.basePrice) || 0,
         totU: Number(opts.totU) || 0,
         mtRot: Number(opts.mtRot) || 0,
         unit: (opts.unit || "KG").toUpperCase()
       };
   
       // Calcola kg per unità di misura (kg/UM)
       // Esempio corda: totU=7.880, mtRot=350 → 0.0225 kg/mt
       const kgPerUm = config.mtRot > 0 ? (config.totU / config.mtRot) : 0;
   
       let meters = "0";
   
       const overlay = document.createElement("div");
       overlay.className = "keypad-overlay";
       overlay.innerHTML = `
         <div class="cutcalc-modal">
           <div class="keypad-header">
             <span class="keypad-title">Calcolatore Taglio / Peso</span>
             <button class="keypad-close" data-action="cancel">✕</button>
           </div>
   
           <div class="cutcalc-info">
             <div class="cutcalc-info-row">
               <span class="cutcalc-info-label">Articolo</span>
               <span class="cutcalc-info-value">${escapeHtml(config.description)}</span>
             </div>
             <div class="cutcalc-info-row">
               <span class="cutcalc-info-label">Prezzo Base</span>
               <span class="cutcalc-info-value accent">€ ${config.basePrice.toFixed(2).replace(".", ",")} / ${config.unit.toLowerCase()}</span>
             </div>
             <div class="cutcalc-info-row">
               <span class="cutcalc-info-label">Tot.U / mt.rot</span>
               <span class="cutcalc-info-value">${config.totU.toFixed(3).replace(".", ",")} / ${config.mtRot.toFixed(3).replace(".", ",")} = ${kgPerUm.toFixed(3).replace(".", ",")} ${config.unit.toLowerCase()}/mt</span>
             </div>
           </div>
   
           <div class="cutcalc-input-group">
             <label class="cutcalc-input-label">METRI DA TAGLIARE</label>
             <input type="text" inputmode="decimal" class="cutcalc-input"
                    data-input-meters value="0" autocomplete="off">
           </div>
   
           <div class="cutcalc-results">
             <div class="cutcalc-result-row">
               <span class="cutcalc-result-label">Prezzo Totale</span>
               <span class="cutcalc-result-value accent" data-result-price>€ 0,00</span>
             </div>
             <div class="cutcalc-result-row">
               <span class="cutcalc-result-label">Peso Totale</span>
               <span class="cutcalc-result-value" data-result-kg>0,000 ${config.unit.toLowerCase()}</span>
             </div>
           </div>
   
           <div class="cutcalc-note">
             Calcolo basato su <strong>Tot.U / mt.rot</strong> = ${kgPerUm.toFixed(3).replace(".", ",")} ${config.unit.toLowerCase()}/mt
           </div>
   
           <div class="cutcalc-actions">
             <button class="btn btn-outline" data-action="cancel">Chiudi</button>
             <button class="btn btn-primary" data-action="apply">Applica</button>
           </div>
         </div>
       `;
   
       document.body.appendChild(overlay);
   
       const input = overlay.querySelector("[data-input-meters]");
       const priceEl = overlay.querySelector("[data-result-price]");
       const kgEl = overlay.querySelector("[data-result-kg]");
   
       function updateResults() {
         const m = parseFloat(meters.replace(",", ".")) || 0;
         const kg = m * kgPerUm;
         const price = kg * config.basePrice;
   
         priceEl.textContent = "€ " + price.toFixed(2).replace(".", ",");
         kgEl.textContent = kg.toFixed(3).replace(".", ",") + " " + config.unit.toLowerCase();
       }
   
       function close() {
         overlay.classList.add("closing");
         setTimeout(() => {
           if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
           document.removeEventListener("keydown", onKeyDown);
         }, 150);
       }
   
       function cancel() {
         _activeCalc = null;
         close();
         resolve(null);
       }
   
       function apply() {
         const m = parseFloat(meters.replace(",", ".")) || 0;
         if (m <= 0) {
           input.classList.add("shake");
           setTimeout(() => input.classList.remove("shake"), 300);
           return;
         }
         const kg = m * kgPerUm;
         const price = kg * config.basePrice;
         _activeCalc = null;
         close();
         resolve({ meters: m, kg, price });
       }
   
       // Input handler: aggiorna i risultati ad ogni digitazione
       input.addEventListener("input", () => {
         let v = input.value.replace(/[^\d,\.]/g, "");
         v = v.replace(".", ",");
         // Solo una virgola
         const parts = v.split(",");
         if (parts.length > 2) v = parts[0] + "," + parts.slice(1).join("");
         input.value = v;
         meters = v || "0";
         updateResults();
       });
   
       // Seleziona tutto al focus
       input.addEventListener("focus", () => input.select());
   
       // Bottoni
       overlay.querySelectorAll("[data-action]").forEach(btn => {
         btn.addEventListener("click", () => {
           const action = btn.dataset.action;
           if (action === "cancel") cancel();
           else if (action === "apply") apply();
         });
       });
   
       // Tastiera fisica
       function onKeyDown(e) {
         if (e.key === "Escape") cancel();
         else if (e.key === "Enter") apply();
       }
       document.addEventListener("keydown", onKeyDown);
   
       // Click fuori
       overlay.addEventListener("click", (e) => {
         if (e.target === overlay) cancel();
       });
   
       _activeCalc = { close };
   
       // Focus input
       setTimeout(() => {
         input.focus();
         input.select();
       }, 50);
     });
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;");
   }