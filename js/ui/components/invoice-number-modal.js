/* ============================================================
   INVOICE-NUMBER-MODAL.JS — Blocco 7
   Popup tasto F: modifica prossimo numero bolla
   ============================================================ */

   import { peekNextInvoiceNumber, setNextInvoiceNumber } from "../../data/invoice-repository.js";

   export async function openInvoiceNumberModal() {
     let current = 2000;
     try {
       current = await peekNextInvoiceNumber();
     } catch (e) {
       console.error(e);
     }
   
     return new Promise((resolve) => {
       const overlay = document.createElement("div");
       overlay.className = "inv-num-overlay";
       overlay.innerHTML = `
         <div class="inv-num-modal">
           <div class="inv-num-header">
             <span>📄 NUMERO BOLLE</span>
             <button class="inv-num-close" id="invNumClose" type="button">✕</button>
           </div>
           <div class="inv-num-body">
             <label class="inv-num-label">Prossima bolla sarà:</label>
             <input type="number" class="inv-num-input" id="invNumInput"
                    value="${current}" min="1" step="1">
             <div class="inv-num-hint">Modifica se hai già stampato bolle a mano</div>
           </div>
           <div class="inv-num-footer">
             <button class="inv-num-btn inv-num-cancel" id="invNumCancel" type="button">Annulla</button>
             <button class="inv-num-btn inv-num-save" id="invNumSave" type="button">💾 Salva</button>
           </div>
         </div>
       `;
       document.body.appendChild(overlay);
   
       const input = overlay.querySelector("#invNumInput");
   
       function cleanup() {
         if (overlay.parentNode) overlay.parentNode.remove();
         document.removeEventListener("keydown", onKeydown);
       }
       function close(result) {
         cleanup();
         resolve(result);
       }
       function onKeydown(e) { if (e.key === "Escape") close(null); }
       document.addEventListener("keydown", onKeydown);
   
       overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
       overlay.querySelector("#invNumClose").addEventListener("click", () => close(null));
       overlay.querySelector("#invNumCancel").addEventListener("click", () => close(null));
   
       overlay.querySelector("#invNumSave").addEventListener("click", async () => {
         const n = parseInt(input.value, 10);
         if (!Number.isFinite(n) || n < 0) {
           input.style.borderColor = "#ef4444";
           input.focus();
           return;
         }
         try {
           await setNextInvoiceNumber(n);
           close({ saved: true, number: n });
         } catch (e) {
           alert("Errore: " + e.message);
         }
       });
   
       setTimeout(() => { input.focus(); input.select(); }, 50);
     });
   }