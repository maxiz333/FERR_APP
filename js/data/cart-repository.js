/* ============================================
   CART-REPOSITORY.JS
   Persistenza del carrello attivo su Firebase.
   Usa scritture atomiche per evitare conflitti
   tra Banco e Ufficio.
   ============================================ */

   import { db, ref, set, update, get, onValue, off, remove }
   from "../core/firebase-init.js";
 
 const CARTS_PATH = "activeCarts";
 const LOCAL_CART_KEY = "ferapp_current_cart_id";
 
 /**
  * Ritorna l'ID del carrello corrente per questa postazione.
  */
 export function getCurrentCartId() {
   return localStorage.getItem(LOCAL_CART_KEY) || null;
 }
 
 /**
  * Salva l'ID del carrello corrente in localStorage.
  */
 export function setCurrentCartId(cartId) {
   if (cartId) {
     localStorage.setItem(LOCAL_CART_KEY, cartId);
   } else {
     localStorage.removeItem(LOCAL_CART_KEY);
   }
 }
 
 /**
  * Genera un nuovo cartId univoco.
  */
 export function newCartId(user) {
   return `C${user.id}_${Date.now()}`;
 }
 
 /**
  * Crea un nuovo carrello su Firebase e ritorna il cartId.
  */
 export async function createCart(user, clientId, clientName) {
   const cartId = newCartId(user);
   const now = Date.now();
 
   const meta = {
     clientId: clientId || null,
     clientName: clientName || "Cliente 1",
     status: "modifica",
     note: "",
     createdBy: user.id,
     createdByName: user.name,
     createdAt: now,
     updatedAt: now,
     lineCount: 0,
     totals: { subtotal: 0, discount: 0, grandTotal: 0 }
   };
 
   await set(ref(db, `${CARTS_PATH}/${cartId}/meta`), meta);
   setCurrentCartId(cartId);
   return cartId;
 }
 
 /**
  * Carica il carrello corrente (una volta).
  */
 export async function loadCart(cartId) {
   const snap = await get(ref(db, `${CARTS_PATH}/${cartId}`));
   if (!snap.exists()) return null;
   const val = snap.val();
   return {
     meta: { id: cartId, ...(val.meta || {}) },
     lines: val.lines || {}
   };
 }
 
 /**
  * Ascolta in tempo reale un carrello.
  * Ritorna una funzione per rimuovere il listener.
  */
 export function listenCart(cartId, callback) {
   const cartRef = ref(db, `${CARTS_PATH}/${cartId}`);
   const handler = (snap) => {
     if (!snap.exists()) {
       callback(null);
       return;
     }
     const val = snap.val();
     callback({
       meta: { id: cartId, ...(val.meta || {}) },
       lines: val.lines || {}
     });
   };
   onValue(cartRef, handler);
   return () => off(cartRef, "value", handler);
 }
 
 /* ============================================
    RIGHE
    ============================================ */
 
 /**
  * Aggiunge una riga al carrello.
  * Scrittura atomica SOLO sul nuovo lineId.
  */
 export async function addLine(cartId, lineId, line) {
   await set(ref(db, `${CARTS_PATH}/${cartId}/lines/${lineId}`), line);
 }
 
 /**
  * Aggiorna campi specifici di una riga.
  * Non riscrive mai l'intera riga (per evitare conflitti).
  */
 export async function updateLine(cartId, lineId, fields) {
   await update(ref(db, `${CARTS_PATH}/${cartId}/lines/${lineId}`), {
     ...fields,
     updatedAt: Date.now()
   });
 }
 
 /**
  * Elimina una riga.
  */
 export async function deleteLine(cartId, lineId) {
   await remove(ref(db, `${CARTS_PATH}/${cartId}/lines/${lineId}`));
 }
 
 /* ============================================
    META
    ============================================ */
 
 /**
  * Aggiorna i totali del carrello.
  * Usa update su path specifico (non riscrive tutto meta).
  */
 export async function updateTotals(cartId, totals) {
   await update(ref(db, `${CARTS_PATH}/${cartId}/meta/totals`), totals);
   await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
     lineCount: totals.lineCount,
     updatedAt: Date.now()
   });
 }
 
 /**
  * Aggiorna la nota dell'ordine.
  */
 export async function updateNote(cartId, note) {
   await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
     note: note,
     updatedAt: Date.now()
   });
 }
 
 /**
  * Aggiorna il cliente del carrello.
  */
 export async function updateClient(cartId, clientId, clientName) {
   await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
     clientId: clientId || null,
     clientName: clientName || "Cliente 1",
     updatedAt: Date.now()
   });
 }

 /* ============================================
   STATO ORDINE (Blocco 2B.5)
   ============================================ */

/**
 * Cambia lo stato del carrello.
 * Valori: modifica | bozza | nuovo | in_arrivo | fatto | pronto | sbloccato
 */
export async function updateStatus(cartId, status) {
  await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
    status: status,
    updatedAt: Date.now()
  });
}

/**
/**
 * Blocca l'ordine (non più modificabile).
 */
export async function lockCart(cartId) {
  await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
    isLocked: true,
    updatedAt: Date.now()
  });
}

/**
 * Sblocca/blocca l'ordine (true/false).
 */
export async function updateLineLock(cartId, isLocked) {
  await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
    isLocked: isLocked,
    updatedAt: Date.now()
  });
}


/**
 * Segna l'ordine come "modificato" (per la ✏️ permanente).
 */
export async function markCartAsModified(cartId) {
  // 1) Leggi lo stato attuale dal meta
  const snap = await get(ref(db, `${CARTS_PATH}/${cartId}/meta`));
  if (!snap.exists()) return;
  const meta = snap.val() || {};

  // 2) Solo se l'ordine è stato SBLoccato (cioè era "fatto" e qualcuno l'ha riaperto)
  if (meta.status !== "sbloccato") return;

  // 3) Non riscrivere se già marcato
  if (meta.wasModified === true) return;

  // 4) Ok, scrivi il flag
  await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
    wasModified: true,
    updatedAt: Date.now()
  });
}

/**
 * Sposta il carrello nel cestino.
 * 1) Copia il carrello in trash/carts/{cartId}
 * 2) Elimina da activeCarts
 */
export async function trashCart(cartId) {
  const snap = await get(ref(db, `${CARTS_PATH}/${cartId}`));
  if (!snap.exists()) return;

  const cartData = snap.val();
  const now = Date.now();

  // Copia nel cestino
  await set(ref(db, `trash/carts/${cartId}`), {
    ...cartData,
    trashedAt: now
  });

  // Elimina dall'attivo
  await remove(ref(db, `${CARTS_PATH}/${cartId}`));
}

/* ============================================
   CODICE ORDINE (Blocco 3.7)
   Formato: Ordine #N - L  (es. #27 - A)
   Alfabeto alternato A-Z-B-Y-C-X...
   Reset automatico a mezzanotte (lato client).
   ============================================ */

   const ORDER_ALPHABET = [
    "A","Z","B","Y","C","X","D","W","E","V",
    "F","U","G","T","H","S","I","R","J","Q",
    "K","P","L","O","M","N"
  ];
  
  /**
   * Genera un codice univoco per un ordine.
   * - Incrementa counters/orderNumber
   * - Calcola la lettera (modulo 26)
   * - Salva sul meta del carrello
   * - Reset automatico se cambio giorno
   *
   * Ritorna: { number, letter }  (es. { number: 27, letter: "A" })
   */
  export async function generateOrderCode(cartId) {
    const today = getTodayKey();
  
    // 1) Controlla se è un nuovo giorno → reset
    const metaRef = ref(db, "counters");
    const snap = await get(metaRef);
    const meta = snap.exists() ? snap.val() : {};
    const lastDate = meta.lastResetDate || null;
  
    let currentNumber = Number(meta.orderNumber) || 0;
  
    if (lastDate !== today) {
      // Nuovo giorno → reset
      currentNumber = 0;
      await update(ref(db, "counters"), {
        orderNumber: 0,
        lastResetDate: today
      });
      console.log("🌅 Reset contatore ordini (nuovo giorno)");
    }
  
    // 2) Incrementa
    const newNumber = currentNumber + 1;
  
    // 3) Calcola lettera (1..26 → indice 0..25)
    const letterIndex = (newNumber - 1) % 26;
    const letter = ORDER_ALPHABET[letterIndex];
  
    // 4) Salva contatore globale + meta carrello
    await update(ref(db, "counters"), {
      orderNumber: newNumber,
      lastResetDate: today
    });
  
    await update(ref(db, `${CARTS_PATH}/${cartId}/meta`), {
      orderNumber: newNumber,
      orderCode: letter,
      updatedAt: Date.now()
    });
  
    return { number: newNumber, letter };
  }
  
  /**
   * Ritorna la data di oggi in formato "YYYY-MM-DD".
   * Usata per confrontare il "giorno" e resettare a mezzanotte.
   */
  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const g = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${g}`;
  }
/* ============================================
   LISTEN ALL CARTS (per Ufficio e Cassa)
   Blocco 3.2
   ============================================ */

/**
 * Ascolta TUTTI i carrelli attivi in tempo reale.
 * Ritorna una funzione per staccare il listener.
 *
 * Callback riceve: array di carrelli
 *   [{ id, meta: {...}, lines: {...} }, ...]
 */
export function listenAllCarts(callback) {
  const allRef = ref(db, CARTS_PATH);

  const handler = (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }

    const val = snap.val() || {};
    const carts = Object.entries(val).map(([id, cart]) => ({
      id,
      meta: cart.meta || {},
      lines: cart.lines || {}
    }));

    callback(carts);
  };

  onValue(allRef, handler);
  return () => off(allRef, "value", handler);
}

/* ============================================
   SYNC PREZZI ORDINE → ARTICOLI (Blocco 2B.7)
   Quando un ordine va in "fatto", i prezzi delle righe
   diventano i prezzi ufficiali dell'articolo (solo se diversi).
   ============================================ */
   export async function syncOrderPricesToArticles(orderId) {
    const snap = await get(ref(db, `${CARTS_PATH}/${orderId}/lines`));
    if (!snap.exists()) return { updated: 0, skipped: 0 };
  
    const lines = snap.val() || {};
    const now = Date.now();
    const updates = {};
    let updatedCount = 0;
    let skippedCount = 0;
  
    // 1) Prima raccogli i codici e i prezzi candidati
    const candidates = [];
    for (const [_, l] of Object.entries(lines)) {
      const code = l.articleId || l.code;
      if (!code) continue;
  
      // 🆕 Per articoli a misura (KG/MT/MQ) il prezzo ufficiale è il basePrice (€/kg)
      // Per articoli PZ è l'unitPrice
      const unit = (l.unit || "PZ").toUpperCase();
      const isMeasured = ["KG", "MT", "MQ"].includes(unit);
      const price = isMeasured
        ? Number(l.basePrice) || 0
        : Number(l.unitPrice ?? l.basePrice) || 0;
  
      if (price <= 0) continue;
  
      candidates.push({ code, price });
    }
  
    if (candidates.length === 0) return { updated: 0, skipped: 0 };
  
    // 2) Leggi in parallelo i prezzi attuali degli articoli
    const currentPrices = await Promise.all(
      candidates.map(async (c) => {
        const key = String(c.code).trim().replace(/[.#$\[\]\/]/g, "_");
        try {
          const s = await get(ref(db, `articles/${key}/basePrice`));
          return { ...c, key, current: s.exists() ? Number(s.val()) || 0 : 0 };
        } catch {
          return { ...c, key, current: 0 };
        }
      })
    );
  
    // 3) Confronta e prepara le scritture solo se diverse
    for (const c of currentPrices) {
      if (c.price === c.current) {
        skippedCount++;
        continue; // prezzo identico → skip
      }
  
      updates[`articles/${c.key}/basePrice`] = c.price;
      updates[`articles/${c.key}/priceLastChangedAt`] = now;
      updates[`articles/${c.key}/priceVerified`] = true;
      updates[`articles/${c.key}/updatedAt`] = now;
      updatedCount++;
    }
  
    if (updatedCount === 0) return { updated: 0, skipped: skippedCount, articles: [] };

    await update(ref(db), updates);
    return {
      updated: updatedCount,
      skipped: skippedCount,
      articles: currentPrices
        .filter(c => c.price !== c.current)
        .map(c => ({ key: c.key, price: c.price }))
    };
  }