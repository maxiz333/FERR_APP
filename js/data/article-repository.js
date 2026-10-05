/* ============================================
   ARTICLE-REPOSITORY.JS
   CRUD articoli su Firebase.
   Unico punto di contatto con il nodo `articles`.
   ============================================ */

   import { db, ref, update, get, set, remove }
   from "../core/firebase-init.js";
 import { extractSearchTokens } from "../core/file-parser.js";
 
 const ARTICLES_PATH = "articles";
 const META_PATH = "meta/articles";
 
 /**
  * Sanitizza un codice per usarlo come chiave Firebase.
  * Firebase non ammette . # $ [ ] /
  */
 function sanitizeKey(code) {
   return String(code)
     .trim()
     .replace(/[.#$\[\]\/]/g, "_");
 }
 
 /**
  * Importa un array di articoli su Firebase.
  * Usa update multi-path a blocchi per efficienza.
  *
  * @param {Array} articles - Array di oggetti articolo
  * @param {Function} onProgress - Callback(current, total, label)
  */
 export async function importArticles(articles, onProgress) {
   const BATCH_SIZE = 500;
   const total = articles.length;
   let processed = 0;
 
   const now = Date.now();
 
   for (let i = 0; i < total; i += BATCH_SIZE) {
     const batch = articles.slice(i, i + BATCH_SIZE);
     const updates = {};
 
     for (const art of batch) {
       const key = sanitizeKey(art.code);
       if (!key) continue;
 
       const tokens = extractSearchTokens(art.description, art.code);
 
       updates[`${ARTICLES_PATH}/${key}`] = {
         code: art.code,
         codeNorm: art.codeNorm,
         type: art.type,
         group: art.group,
         hasSpecial: art.hasSpecial,
         description: art.description,
         descriptionLower: art.descriptionLower,
         unit: art.unit,
         stock: art.stock,
         inventoried: art.inventoried,
         basePrice: art.basePrice ?? 0,
         totU: art.totU ?? 0,
         mtRot: art.mtRot ?? 0,
         kgPerUm: art.kgPerUm ?? 0,
         supplier: art.supplier ?? null,
         supplierCode: art.supplierCode ?? null,
         category: art.category ?? null,
         marca: art.marca ?? null,
         position: art.position ?? null,
         specs: art.specs ?? null,
         priceHistory: art.priceHistory ?? {},
         searchTokens: tokens,
         updatedAt: now
       };
     }
 
     // Un solo update per l'intero blocco: atomico ed efficiente
     await update(ref(db), updates);
 
     processed += batch.length;
     if (onProgress) onProgress(processed, total);
   }
 
   // Salva metadata
   await update(ref(db, META_PATH), {
     lastImportAt: now,
     lastImportCount: total
   });
 
   return { imported: total };
 }
 
 /**
  * Carica TUTTI gli articoli (versione leggera per cache locale).
  * Ritorna un oggetto { key: { ...campi } }.
  */
 export async function loadAllArticles() {
   const snapshot = await get(ref(db, ARTICLES_PATH));
   if (!snapshot.exists()) return {};
   return snapshot.val();
 }
 
 /**
  * Carica un singolo articolo per codice.
  */
 export async function getArticleByCode(code) {
   const key = sanitizeKey(code);
   const snapshot = await get(ref(db, `${ARTICLES_PATH}/${key}`));
   return snapshot.exists() ? { key, ...snapshot.val() } : null;
 }
 
 /**
  * Aggiorna i campi di un articolo.
  */
 export async function updateArticle(code, fields) {
   const key = sanitizeKey(code);
   await update(ref(db, `${ARTICLES_PATH}/${key}`), {
     ...fields,
     updatedAt: Date.now()
   });
 }
 
 /**
  * Salva uno storico prezzi (max 5).
  * Sposta il prezzo corrente nello storico prima di sovrascriverlo.
  */
 export async function addPriceToHistory(code, oldPrice, source) {
   const key = sanitizeKey(code);
   const snap = await get(ref(db, `${ARTICLES_PATH}/${key}/priceHistory`));
   const history = snap.exists() ? snap.val() : {};
 
   // Sposta tutto di 1 (0 → 1, 1 → 2, ecc.)
   const newHistory = {};
   const entries = Object.entries(history)
     .sort((a, b) => (b[1].date || 0) - (a[1].date || 0));
 
   // Prendi i primi 4 più recenti e aggiungi il nuovo in testa
   newHistory[0] = { price: oldPrice, date: Date.now(), source: source || "manual" };
   entries.slice(0, 4).forEach(([_, v], idx) => {
     newHistory[idx + 1] = v;
   });
 
   await set(ref(db, `${ARTICLES_PATH}/${key}/priceHistory`), newHistory);
 }
 
 /**
  * Cancella tutti gli articoli (per reset completo).
  */
 export async function deleteAllArticles() {
   await remove(ref(db, ARTICLES_PATH));
   await remove(ref(db, META_PATH));
 }