/* ============================================
   CLIENT-REPOSITORY.JS
   CRUD clienti su Firebase.
   Unico punto di contatto con il nodo `clients`.
   ============================================ */

   import { db, ref, set, update, get, onValue, off, remove }
   from "../core/firebase-init.js";
 
 const CLIENTS_PATH = "clients";
 const META_PATH = "meta/clients";
 
 /**
  * Sanitizza una chiave cliente.
  * Usa il nome come chiave (uppercase, no caratteri speciali).
  */
 export function sanitizeClientKey(name) {
  return String(name)
    .trim()
    .toUpperCase()
    // 🆕 Rimuove TUTTO tranne lettere, numeri e spazi (via apostrofi, punti, virgole, ecc.)
    .replace(/[^A-Z0-9 ]/g, "") 
    // 🆕 Sostituisce gli spazi con underscore per una chiave pulita
    .replace(/\s+/g, "_")       
    .slice(0, 100);
}
 
 /**
  * Crea o aggiorna un cliente.
  * @param {string} name - Nome cliente
  * @param {Object} fields - Campi aggiuntivi (address, city, province)
  * @returns {Promise<string>} clientId
  */
 export async function upsertClient(name, fields = {}) {
   const key = sanitizeClientKey(name);
   if (!key) throw new Error("Nome cliente obbligatorio");
 
   const now = Date.now();
   const clientData = {
     name: name.trim(),
     address: fields.address || "",
     city: fields.city || "",
     province: fields.province || "",
     legacyId: fields.legacyId || "",
     discountPct: fields.discountPct || 0,
     updatedAt: now
   };
 
   // Se il cliente non esiste, aggiungi createdAt
   const existing = await get(ref(db, `${CLIENTS_PATH}/${key}`));
   if (!existing.exists()) {
     clientData.createdAt = now;
   }
 
   await update(ref(db, `${CLIENTS_PATH}/${key}`), clientData);
   return key;
 }
 
 /**
  * Carica tutti i clienti (versione leggera).
  */
 export async function loadAllClients() {
   const snapshot = await get(ref(db, CLIENTS_PATH));
   if (!snapshot.exists()) return {};
   return snapshot.val();
 }
 
 /**
  * Carica un singolo cliente per chiave.
  */
 export async function getClientByKey(key) {
   const snap = await get(ref(db, `${CLIENTS_PATH}/${key}`));
   return snap.exists() ? { key, ...snap.val() } : null;
 }
 
 /**
  * Ascolta tutti i clienti in tempo reale.
  */
 export function listenClients(callback) {
   const clientsRef = ref(db, CLIENTS_PATH);
   const handler = (snap) => {
     callback(snap.exists() ? snap.val() : {});
   };
   onValue(clientsRef, handler);
   return () => off(clientsRef, "value", handler);
 }
 
 /**
  * Elimina un cliente (per uso futuro).
  */
 export async function deleteClient(key) {
   await remove(ref(db, `${CLIENTS_PATH}/${key}`));
 }
 
 /**
  * Importa un array di clienti (bulk).
  * Usa update multi-path a blocchi.
  */
 export async function importClients(clients, onProgress) {
  const BATCH_SIZE = 500;
  const total = clients.length;
  let processed = 0;
  const now = Date.now();

  console.log("🗑 Svuotamento totale del database clienti...");
  // 1. Elimina TUTTI i clienti attualmente esistenti su Firebase
  // Questo cancella anche i vecchi clienti con il punto o i doppioni.
  await remove(ref(db, CLIENTS_PATH));
  console.log("✅ Database clienti svuotato. Inizio importazione...");

  // 2. Inserisci i nuovi clienti a blocchi da 500
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE);
    const updates = {};

    for (const c of batch) {
      const rawName = c.legacyId ? `${c.name}_${c.legacyId}` : c.name;
      const key = sanitizeClientKey(rawName);

      updates[`${CLIENTS_PATH}/${key}`] = {
        name: c.name,
        address: c.address || "",
        city: c.city || "",
        province: c.province || "",
        legacyId: c.legacyId || "",
        discountPct: c.discountPct || 0,
        createdAt: now,
        updatedAt: now
      };
    }

    await update(ref(db), updates);
    processed += batch.length;
    console.log(`✅ Importati ${processed} clienti su ${total}...`); // 🆕 Log di avanzamento
    if (onProgress) onProgress(processed, total);
  }

  await update(ref(db, META_PATH), {
    lastImportAt: now,
    lastImportCount: total
  });

  return { imported: total };
}