/* ============================================================
   INVOICE-REPOSITORY.JS — Blocco 7
   Numerazione bolle/fatture con transazione atomica
   ============================================================ */

   import { db, ref, get, update, runTransaction } from "../core/firebase-init.js";

   const COUNTERS_PATH = "counters";
   const DEFAULT_START = 2000;
   
   /**
    * Ritorna il prossimo numero SENZA assegnarlo.
    * Serve per l'anteprima nel popup.
    */
   export async function peekNextInvoiceNumber() {
     const snap = await get(ref(db, `${COUNTERS_PATH}/invoiceNumber`));
     if (!snap.exists()) return DEFAULT_START;
     return Number(snap.val()) || DEFAULT_START;
   }
   
   /**
    * Assegna atomicamente il prossimo numero.
    * Ritorna il numero ASSEGNATO.
    * Zero rischio di duplicati tra 2 postazioni.
    */
   export async function generateInvoiceNumber() {
     let assigned = null;
     const result = await runTransaction(
       ref(db, `${COUNTERS_PATH}/invoiceNumber`),
       (current) => {
         const currentNum = (current === null || current === undefined)
           ? DEFAULT_START
           : Number(current);
         assigned = currentNum;
         return currentNum + 1;
       }
     );
   
     if (!result.committed) {
       throw new Error("Numerazione in conflitto, riprova");
     }
     return assigned;
   }
   
   /**
    * Imposta manualmente il prossimo numero (tasto F).
    */
   export async function setNextInvoiceNumber(num) {
     const n = Number(num);
     if (!Number.isFinite(n) || n < 0) {
       throw new Error("Numero non valido");
     }
     await update(ref(db, COUNTERS_PATH), {
       invoiceNumber: n,
       updatedAt: Date.now()
     });
     return n;
   }
   
   /**
    * Salva il numero fattura sull'ordine.
    */
   export async function saveInvoiceToCart(cartId, invoiceNumber) {
     await update(ref(db, `activeCarts/${cartId}/meta`), {
       invoiceNumber: invoiceNumber,
       invoiceDate: Date.now(),
       updatedAt: Date.now()
     });
   }