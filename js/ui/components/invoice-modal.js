/* ============================================================
   INVOICE-MODAL.JS — Blocco 7
   Popup di conferma fatturazione + client picker integrato
   ============================================================ */

   import { peekNextInvoiceNumber } from "../../data/invoice-repository.js";
   import { openClientPicker } from "./client-picker.js";
   
   /**
    * Apre il popup di conferma BOL.
    * @param {Object} opts
    * @param {string} [opts.clientName]
    * @param {string} [opts.clientId]
    * @param {Function} [opts.onClientChange]  — callback (clientKey, name)
    * @returns {Promise<{confirmed, invoiceNumber, clientName, clientKey}|null>}
    */
   export async function openInvoiceModal(opts = {}) {
     let currentClientName = opts.clientName || "Cliente 1";
     let currentClientKey = opts.clientId || null;
     const onClientChange = opts.onClientChange;
   
     // Anteprima numero (NON assegnato)
     let previewNumber = 2000;
     try {
       previewNumber = await peekNextInvoiceNumber();
     } catch (e) {
       console.error("Errore anteprima numero:", e);
     }
   
     return new Promise((resolve) => {
       const overlay = document.createElement("div");
       overlay.className = "inv-overlay";
       overlay.innerHTML = renderPopup(currentClientName, previewNumber);
       document.body.appendChild(overlay);
   
       const clientBtn = overlay.querySelector("#invClientBtn");
       const confirmBtn = overlay.querySelector("#invConfirm");
       const cancelBtn = overlay.querySelector("#invCancel");
       const closeBtn = overlay.querySelector("#invClose");
   
       function cleanup() {
         if (overlay.parentNode) overlay.parentNode.remove();
         document.removeEventListener("keydown", onKeydown);
       }
       function close(result) {
         cleanup();
         resolve(result);
       }
       function onKeydown(e) {
         if (e.key === "Escape") close(null);
       }
       document.addEventListener("keydown", onKeydown);
   
       overlay.addEventListener("click", (e) => {
         if (e.target === overlay) close(null);
       });
       closeBtn.addEventListener("click", () => close(null));
       cancelBtn.addEventListener("click", () => close(null));
   
    // Cambia cliente → apre client picker e ricarica il popup
    clientBtn.addEventListener("click", async () => {
      // NON chiudere il popup: apri il picker sopra
      const result = await openClientPicker({
        currentClientName: currentClientName
      });
      if (result) {
        currentClientName = result.name;
        currentClientKey = result.clientKey;
        // Aggiorna il nome nel popup aperto
        const nameEl = overlay.querySelector(".inv-client-name");
        if (nameEl) nameEl.textContent = currentClientName;
        if (typeof onClientChange === "function") {
          try { await onClientChange(currentClientKey, currentClientName); }
          catch (e) { console.error(e); }
        }
      }
    });
   
       confirmBtn.addEventListener("click", () => {
         close({
           confirmed: true,
           invoiceNumber: previewNumber,
           clientName: currentClientName,
           clientKey: currentClientKey
         });
       });
     });
   }
   
   function renderPopup(clientName, invoiceNumber) {
     return `
       <div class="inv-modal">
         <div class="inv-header">
           <span>📄 CREA FATTURA</span>
           <button class="inv-close" id="invClose" type="button">✕</button>
         </div>
   
         <div class="inv-body">
           <div class="inv-row">
             <span class="inv-label">Cliente</span>
             <div class="inv-client-line">
               <strong class="inv-client-name">${esc(clientName)}</strong>
               <button class="inv-client-btn" id="invClientBtn" type="button">👤 Cerca cliente</button>
             </div>
           </div>
   
           <div class="inv-row">
             <span class="inv-label">Numero bolla</span>
             <strong class="inv-number">${invoiceNumber}</strong>
           </div>
   
           <div class="inv-hint">
             Il numero verrà assegnato solo dopo la conferma. Se annulli, resta libero.
           </div>
         </div>
   
         <div class="inv-footer">
           <button class="inv-btn inv-btn-cancel" id="invCancel" type="button">Annulla</button>
           <button class="inv-btn inv-btn-confirm" id="invConfirm" type="button">✅ Conferma</button>
         </div>
       </div>
     `;
   }
   
   function esc(s) {
     return String(s ?? "").replace(/[&<>"']/g, (c) => ({
       "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
     }[c]));
   }