/* ============================================
   ESAURITI-REPOSITORY.JS
   Nodo dedicato esauriti/{autoId}.
   Usato SOLO per esauriti aggiunti dal CATALOGO
   (non collegati a nessun carrello).
   ============================================ */

   import {
    db, ref, push, set, get, remove, onValue
  } from "../core/firebase-init.js";
  
  /**
   * Aggiunge un esaurito "puro" (da catalogo).
   * Ritorna l'id creato.
   */
  export async function addEsaurito({ fornitore, articolo, qty, note, user }) {
    const listRef = ref(db, "esauriti");
    const newRef = push(listRef);
  
    const payload = {
      fornitoreId: fornitore.id,
      fornitoreNome: fornitore.nome,
      fornitoreColore: fornitore.colore,
      articleId: articolo.key || "",
      code: articolo.code || "",
      supplierCode: articolo.supplierCode || "",
      description: articolo.description || "",
      unit: (articolo.unit || "PZ").toUpperCase(),
      price: Number(articolo.basePrice) || 0,
      qty: Number(qty) || 0,
      note: note || "",
      addedAt: Date.now(),
      addedBy: { id: user.id, name: user.name }
    };
  
    await set(newRef, payload);
    return newRef.key;
  }
  
  /**
   * Ascolta tutti gli esauriti "puri".
   * Ritorna un unsubscribe.
   */
  export function listenEsauriti(callback) {
    const listRef = ref(db, "esauriti");
    return onValue(listRef, (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const val = snap.val();
      const items = Object.entries(val).map(([id, data]) => ({ id, ...data }));
      callback(items);
    });
  }
  
  /**
   * Rimuove un singolo esaurito.
   */
  export async function removeEsaurito(id) {
    if (!id) return;
    await remove(ref(db, "esauriti/" + id));
  }
  
  /**
   * Rimuove tutti gli esauriti di un fornitore.
   * Ritorna il numero di elementi rimossi.
   */
  export async function removeEsauritiByFornitore(fornitoreId) {
    const snap = await get(ref(db, "esauriti"));
    if (!snap.exists()) return 0;
  
    const val = snap.val();
    const ids = [];
    for (const [id, data] of Object.entries(val)) {
      if (data.fornitoreId === fornitoreId) ids.push(id);
    }
  
    for (const id of ids) {
      await remove(ref(db, "esauriti/" + id));
    }
    return ids.length;
  }

  /**
 * Aggiorna un esaurito esistente (solo nodo esauriti/).
 */
export async function updateEsaurito(id, fields) {
    if (!id) return;
    const { update } = await import("../core/firebase-init.js");
    await update(ref(db, "esauriti/" + id), fields);
  }