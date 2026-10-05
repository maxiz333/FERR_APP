/* ============================================
   TRASH-REPOSITORY.JS
   Cestino condiviso (banco + ufficio).
   - trashCart: sposta un carrello in trash/carts
   - listenTrashCarts: ascolta il cestino
   - restoreCart: rimette il carrello in activeCarts
   - deleteCartPermanently: cancella davvero
   - emptyTrashBySource: svuota per fonte
   - runScheduledCleanup: pulizia automatica (al boot)
   ============================================ */

   import { db, ref, set, get, update, onValue, off, remove }
   from "../core/firebase-init.js";
   
   const CARTS_PATH = "activeCarts";
   const TRASH_PATH = "trash/carts";
   const COUNTERS_PATH = "counters";
   
   /* ============================================
      CESTINAMENTO
      ============================================ */
   
   /**
    * Sposta un carrello attivo nel cestino.
    * @param {string} cartId
    * @param {string} source — "banco" | "ufficio"
    * @param {object|null} user — { id, name } di chi cestina
    * @returns {boolean} — true se cestinato
    */
   export async function trashCart(cartId, source = "banco", user = null) {
     const snap = await get(ref(db, `${CARTS_PATH}/${cartId}`));
     if (!snap.exists()) return false;
   
     const cartData = snap.val();
     const now = Date.now();
   
     await set(ref(db, `${TRASH_PATH}/${cartId}`), {
       ...cartData,
       trashedAt: now,
       trashedBy: user ? { id: user.id, name: user.name } : null,
       source: source
     });
   
     await remove(ref(db, `${CARTS_PATH}/${cartId}`));
     console.log(`🗑 Cestinato ${cartId} (source=${source})`);
     return true;
   }
   
   /* ============================================
      LISTEN
      ============================================ */
   
   /**
    * Ascolta tutti i carrelli nel cestino.
    * Callback riceve array di:
    *   { id, meta, lines, trashedAt, trashedBy, source }
    * (ordinato dal più recente)
    */
   export function listenTrashCarts(callback) {
     const trashRef = ref(db, TRASH_PATH);
     const handler = (snap) => {
       if (!snap.exists()) {
         callback([]);
         return;
       }
       const val = snap.val() || {};
       const carts = Object.entries(val).map(([id, cart]) => ({
         id,
         meta: cart.meta || {},
         lines: cart.lines || {},
         trashedAt: cart.trashedAt || 0,
         trashedBy: cart.trashedBy || null,
         source: cart.source || "banco"
       }));
       carts.sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0));
       callback(carts);
     };
     onValue(trashRef, handler);
     return () => off(trashRef, "value", handler);
   }
   
   /* ============================================
      RIPRISTINO
      ============================================ */
   
   /**
    * Ripristina un carrello dal cestino.
    * Lo rimette in activeCarts in stato "modifica" (editabile).
    */
   export async function restoreCart(cartId) {
     const snap = await get(ref(db, `${TRASH_PATH}/${cartId}`));
     if (!snap.exists()) return false;
   
     const cartData = snap.val();
   
     // Rimuovi i campi di cestinamento
     delete cartData.trashedAt;
     delete cartData.trashedBy;
     delete cartData.source;
   
     // Rimetti lo stato a modifica (così è editabile)
     if (cartData.meta) {
       cartData.meta.status = "modifica";
       cartData.meta.isLocked = false;
       cartData.meta.updatedAt = Date.now();
     }
   
     await set(ref(db, `${CARTS_PATH}/${cartId}`), cartData);
     await remove(ref(db, `${TRASH_PATH}/${cartId}`));
     console.log(`♻️ Ripristinato ${cartId}`);
     return true;
   }
   
   /* ============================================
      CANCELLAZIONE DEFINITIVA
      ============================================ */
   
   /**
    * Elimina definitivamente un carrello dal cestino.
    */
   export async function deleteCartPermanently(cartId) {
     await remove(ref(db, `${TRASH_PATH}/${cartId}`));
     console.log(`❌ Eliminato definitivamente ${cartId}`);
   }
   
   /* ============================================
      SVUOTAMENTO PER FONTE
      ============================================ */
   
   /**
    * Rimuove tutte le voci del cestino con source specificato.
    * @param {string} source — "banco" | "ufficio"
    * @returns {number} — quante voci rimosse
    */
   export async function emptyTrashBySource(source) {
     const snap = await get(ref(db, TRASH_PATH));
     if (!snap.exists()) return 0;
   
     const val = snap.val() || {};
     let count = 0;
     const updates = {};
   
     for (const [id, cart] of Object.entries(val)) {
       if ((cart.source || "banco") === source) {
         updates[id] = null;
         count++;
       }
     }
   
     if (count === 0) return 0;
     await update(ref(db, TRASH_PATH), updates);
     console.log(`🗑 Svuotate ${count} voci cestino (source=${source})`);
     return count;
   }
   
   /* ============================================
      CLEANUP AUTOMATICO (al boot)
      ============================================ */
   
   /**
    * Esegue la pulizia automatica del cestino.
    * - Cestino BANCO: svuotato una volta al giorno
    * - Cestino UFFICIO: svuotato la domenica
    *
    * Salviamo in counters/ l'ultima data di reset per evitare
    * di svuotare più volte nello stesso giorno.
    */
   export async function runScheduledCleanup() {
     try {
       const today = getTodayKey();
       const countersSnap = await get(ref(db, COUNTERS_PATH));
       const counters = countersSnap.exists() ? countersSnap.val() : {};
   
       // 1) Cestino BANCO: reset giornaliero
       if (counters.lastTrashBancoReset !== today) {
         await emptyTrashBySource("banco");
         await update(ref(db, COUNTERS_PATH), {
           lastTrashBancoReset: today
         });
         console.log(`🗑 Cestino banco svuotato (${today})`);
       }
   
       // 2) Cestino UFFICIO: reset domenica
       const isSunday = new Date().getDay() === 0;
       if (isSunday && counters.lastTrashUfficioReset !== today) {
         await emptyTrashBySource("ufficio");
         await update(ref(db, COUNTERS_PATH), {
           lastTrashUfficioReset: today
         });
         console.log(`🗑 Cestino ufficio svuotato (domenica ${today})`);
       }
     } catch (err) {
       console.error("Errore runScheduledCleanup:", err);
     }
   }
   
   /* ============================================
      UTILS
      ============================================ */
   
   function getTodayKey() {
     const d = new Date();
     const y = d.getFullYear();
     const m = String(d.getMonth() + 1).padStart(2, "0");
     const g = String(d.getDate()).padStart(2, "0");
     return `${y}-${m}-${g}`;
   }