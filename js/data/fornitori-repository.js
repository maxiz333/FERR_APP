/* ============================================
   FORNITORI-REPOSITORY.JS
   Configurazione fornitori esauriti su Firebase.
   Nodo: config/fornitori/{fornitoreId}
   ============================================ */

   import {
    db, ref, set, get, remove, onValue
  } from "../core/firebase-init.js";
  
  /**
   * Carica tutti i fornitori configurati.
   */
  export async function loadFornitoriFromFirebase() {
    const snap = await get(ref(db, "config/fornitori"));
    if (!snap.exists()) return [];
    const val = snap.val();
    return Object.entries(val).map(([id, data]) => ({
      id,
      nome: data.nome || id,
      colore: data.colore || "#888888"
    }));
  }
  
  /**
   * Salva (crea o aggiorna) un fornitore.
   */
  export async function saveFornitore(fornitore) {
    await set(ref(db, "config/fornitori/" + fornitore.id), {
      nome: fornitore.nome,
      colore: fornitore.colore
    });
  }
  
  /**
   * Rimuove un fornitore.
   */
  export async function removeFornitore(id) {
    await remove(ref(db, "config/fornitori/" + id));
  }
  
  /**
   * Se il nodo è vuoto, popola con i fornitori di default.
   * Ritorna true se ha fatto il seed.
   */
  export async function seedFornitoriIfEmpty(defaultFornitori) {
    const snap = await get(ref(db, "config/fornitori"));
    if (snap.exists()) return false;
  
    const updates = {};
    for (const f of defaultFornitori) {
      updates[f.id] = { nome: f.nome, colore: f.colore };
    }
    await set(ref(db, "config/fornitori"), updates);
    return true;
  }