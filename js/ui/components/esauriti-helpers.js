/* ============================================
   ESAURITI-HELPERS.JS
   Funzioni UI condivise per gli Esauriti:
   - tendina fornitori (sotto al tasto premuto)
   - popup conferma (Qty + Nota)
   Usate da banco-controller e esauriti-modal.
   NIENTE dipendenze da stato del banco → no cicli.
   ============================================ */

   import { ESAURITI_FORNITORI } from "./esauriti-fornitori.js";

   /* ---------- Tendina fornitori ---------- */
   
   let _tendinaFornitoriEl = null;
   
   export function openFornitoriTendina(anchorBtn, onFornitoreScelto) {
     if (_tendinaFornitoriEl) {
       closeFornitoriTendina();
       return;
     }
   
     const tendina = document.createElement("div");
     tendina.className = "fornitori-tendina";
     tendina.innerHTML = `
       <div class="fornitori-tendina-title">ORDINA DA FORNITORE</div>
       <div class="fornitori-tendina-list">
         ${ESAURITI_FORNITORI.map(f => `
           <button class="fornitori-tendina-item" type="button"
                   data-fornitore-id="${f.id}"
                   style="border-color:${f.colore};">
             <span class="fornitori-tendina-dot" style="background:${f.colore};"></span>
             <span class="fornitori-tendina-nome">${f.nome}</span>
           </button>
         `).join("")}
       </div>
     `;
     document.body.appendChild(tendina);
     _tendinaFornitoriEl = tendina;
   
     const rect = anchorBtn.getBoundingClientRect();
     tendina.style.position = "fixed";
     tendina.style.top = (rect.bottom + 4) + "px";
     tendina.style.left = Math.max(8, rect.left - 20) + "px";
   
     const tRect = tendina.getBoundingClientRect();
     if (tRect.right > window.innerWidth - 8) {
       tendina.style.left = (window.innerWidth - tRect.width - 8) + "px";
     }
     if (tRect.bottom > window.innerHeight - 8) {
       tendina.style.top = (rect.top - tRect.height - 4) + "px";
     }
   
     tendina.querySelectorAll(".fornitori-tendina-item").forEach(btn => {
       btn.addEventListener("click", (e) => {
         e.stopPropagation();
         const fId = btn.dataset.fornitoreId;
         const f = ESAURITI_FORNITORI.find(x => x.id === fId);
         closeFornitoriTendina();
         if (f && typeof onFornitoreScelto === "function") {
           onFornitoreScelto(f);
         }
       });
     });
   
     setTimeout(() => {
       document.addEventListener("click", _outsideTendinaClick);
       document.addEventListener("keydown", _escTendinaClose);
     }, 0);
   }
   
   function closeFornitoriTendina() {
     if (_tendinaFornitoriEl) {
       _tendinaFornitoriEl.remove();
       _tendinaFornitoriEl = null;
     }
     document.removeEventListener("click", _outsideTendinaClick);
     document.removeEventListener("keydown", _escTendinaClose);
   }
   
   function _outsideTendinaClick(e) {
     if (_tendinaFornitoriEl && !_tendinaFornitoriEl.contains(e.target)) {
       closeFornitoriTendina();
     }
   }
   
   function _escTendinaClose(e) {
     if (e.key === "Escape") closeFornitoriTendina();
   }
   
   /* ---------- Popup conferma esaurito ---------- */
   
   export function openEsauritoPopup(opts) {
     const {
       description = "",
       fornitore,
       initialQty = 0,
       initialNote = "",
       onConfirm
     } = opts || {};
     if (!fornitore || typeof onConfirm !== "function") return;
   
     const overlay = document.createElement("div");
     overlay.className = "fapp-modal-overlay";
     overlay.innerHTML = `
       <div class="fapp-modal-box esaurito-popup">
         <div class="esaurito-popup-header" style="border-color:${fornitore.colore};">
           <span class="esaurito-popup-dot" style="background:${fornitore.colore};"></span>
           <span class="esaurito-popup-title">Esaurito · ${escapeHtml(fornitore.nome)}</span>
         </div>
   
         <div class="esaurito-popup-body">
           <div class="esaurito-popup-desc">${escapeHtml(description)}</div>
   
           <label class="esaurito-popup-field">
             <span class="esaurito-popup-label">Quantità (opzionale)</span>
             <input type="number" class="esaurito-popup-input" id="esauritoQty"
                    value="${initialQty}" min="0" step="0.01" inputmode="decimal"
                    placeholder="0">
           </label>
   
           <label class="esaurito-popup-field">
             <span class="esaurito-popup-label">Nota (opzionale)</span>
             <textarea class="esaurito-popup-textarea" id="esauritoNote"
                       rows="3" placeholder="Es. da ordinare entro venerdì...">${escapeHtml(initialNote)}</textarea>
           </label>
         </div>
   
         <div class="esaurito-popup-actions">
           <button class="btn btn-outline" id="esauritoBtnCancel" type="button">Annulla</button>
           <button class="btn btn-primary" id="esauritoBtnOk" type="button">Conferma</button>
         </div>
       </div>
     `;
     document.body.appendChild(overlay);
   
     const close = () => overlay.remove();
   
     overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
     document.addEventListener("keydown", function esc(e) {
       if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
     });
   
     overlay.querySelector("#esauritoBtnCancel").addEventListener("click", close);
   
     overlay.querySelector("#esauritoBtnOk").addEventListener("click", async () => {
       const qty = parseFloat(overlay.querySelector("#esauritoQty").value) || 0;
       const note = overlay.querySelector("#esauritoNote").value.trim();
       try {
         await onConfirm(qty, note);
         close();
       } catch (err) {
         console.error("Errore salvataggio esaurito:", err);
       }
     });
   
     setTimeout(() => {
       const q = overlay.querySelector("#esauritoQty");
       if (q) q.focus();
     }, 50);
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");
   }
