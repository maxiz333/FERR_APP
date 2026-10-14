/* ============================================
ESAURITI-ARCHIVIO-REPOSITORY.JS
Archiviazione esauriti su Firebase.
Nodo: esauritiArchivio/{archiveId}
============================================ */

import {
    db, ref, push, set, get
  } from "../core/firebase-init.js";

/**
* Archivia una lista di articoli per un fornitore.
* Ritorna l'archiveId creato.
*/
export async function archiviaEsauriti({ fornitore, articoli, note, user }) {
const listRef = ref(db, "esauritiArchivio");
const newRef = push(listRef);

const payload = {
 fornitoreId: fornitore.id,
 fornitoreNome: fornitore.nome,
 fornitoreColore: fornitore.colore,
 dataArchiviazione: Date.now(),
 note: note || "",
 archiviatoDa: { id: user.id, name: user.name },
 articoliCount: articoli.length,
 articoli: articoli.map(a => ({
    code: a.code || "",
    supplierCode: a.supplierCode || "",
    description: a.description || "",
    note: a.note || "",                    // 🆕 nota articolo
    qty: Number(a.qty) || 0,
    unit: a.unit || "PZ",
    price: Number(a.price) || 0
  }))
}
await set(newRef, payload);
return newRef.key;
}

/**
 * Legge gli ultimi N archivi (ordinati per data DESC).
 * Nota: legge tutto e ordina in JS per non richiedere
 * un indice Firebase su dataArchiviazione.
 */
export async function leggiUltimiArchivi(limit = 5) {
    const snap = await get(ref(db, "esauritiArchivio"));
    if (!snap.exists()) return [];
    const val = snap.val();
    return Object.entries(val)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (b.dataArchiviazione || 0) - (a.dataArchiviazione || 0))
      .slice(0, limit);
  }

/**
* Legge tutti gli archivi (per ricerca futura).
*/
export async function leggiTuttiArchivi() {
const snap = await get(ref(db, "esauritiArchivio"));
if (!snap.exists()) return [];
const val = snap.val();
return Object.entries(val)
 .map(([id, data]) => ({ id, ...data }))
 .sort((a, b) => (b.dataArchiviazione || 0) - (a.dataArchiviazione || 0));
}