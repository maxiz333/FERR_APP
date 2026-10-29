/* ============================================
   ARTICLE-REPOSITORY.JS
   CRUD articoli su Firebase.
   Unico punto di contatto con il nodo `articles`.
   🆕 Aggiunta Cache Locale (IndexedDB) per velocizzare il caricamento.
   ============================================ */

   import { db, ref, update, get, set, remove } from "../core/firebase-init.js";
   import { extractSearchTokens } from "../core/file-parser.js";
   
   const ARTICLES_PATH = "articles";
   const META_PATH = "meta/articles";
   
   // 🆕 Configurazione IndexedDB
   const DB_NAME = "FerAppDB";
   const DB_VERSION = 1;
   const STORE_NAME = "articlesStore";
   const CACHE_KEY = "all_articles_data";
   
   // 🆕 Variabile per tenere traccia del download in corso
   let _downloadPromise = null;
   
   // 🆕 Inizializza il database locale
   function openDB() {
     return new Promise((resolve, reject) => {
       const req = indexedDB.open(DB_NAME, DB_VERSION);
       req.onupgradeneeded = (e) => {
         const db = e.target.result;
         if (!db.objectStoreNames.contains(STORE_NAME)) {
           db.createObjectStore(STORE_NAME);
         }
       };
       req.onsuccess = () => resolve(req.result);
       req.onerror = () => reject(req.error);
     });
   }
   
   // 🆕 Salva gli articoli nel database locale
   async function saveToCache(data) {
     try {
       const db = await openDB();
       return new Promise((resolve, reject) => {
         const tx = db.transaction(STORE_NAME, "readwrite");
         const store = tx.objectStore(STORE_NAME);
         const req = store.put({ data, timestamp: Date.now() }, CACHE_KEY);
         req.onsuccess = () => resolve();
         req.onerror = () => reject(req.error);
       });
     } catch (e) {
       console.warn("Errore salvataggio cache locale:", e);
     }
   }
   
   // 🆕 Legge gli articoli dal database locale
   async function loadFromCache() {
     try {
       const db = await openDB();
       return new Promise((resolve, reject) => {
         const tx = db.transaction(STORE_NAME, "readonly");
         const store = tx.objectStore(STORE_NAME);
         const req = store.get(CACHE_KEY);
         req.onsuccess = () => resolve(req.result);
         req.onerror = () => reject(req.error);
       });
     } catch (e) {
       console.warn("Errore lettura cache locale:", e);
       return null;
     }
   }
   
   // 🆕 Cancella la cache locale
   export async function clearArticlesCache() {
     try {
       const db = await openDB();
       const tx = db.transaction(STORE_NAME, "readwrite");
       tx.objectStore(STORE_NAME).delete(CACHE_KEY);
       console.log("🧹 Cache locale articoli svuotata");
     } catch (e) {
       console.warn("Errore svuotamento cache:", e);
     }
   }
   
   /**
    * Sanitizza un codice per usarlo come chiave Firebase.
    */
   function sanitizeKey(code) {
     return String(code)
       .trim()
       .replace(/[.#$\[\]\/]/g, "_");
   }
   
   /**
    * Importa un array di articoli su Firebase.
    */
   export async function importArticles(articles, onProgress) {
    const BATCH_SIZE = 500;
    const total = articles.length;
    let processed = 0;
    const now = Date.now();
  
    // 1. Scarica l'elenco degli articoli attualmente esistenti su Firebase
    console.log("🔍 Controllo articoli esistenti...");
    const snapshot = await get(ref(db, ARTICLES_PATH));
    const existingData = snapshot.val() || {};
    const existingKeys = new Set(Object.keys(existingData));
    console.log(`✅ Trovati ${existingKeys.size} articoli esistenti.`);
  
    // 2. Processa a blocchi da 500
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const updates = {};
  
      for (const art of batch) {
        const key = sanitizeKey(art.code);
        if (!key) continue;
  
        const tokens = extractSearchTokens(art.description, art.code);
        const basePath = `${ARTICLES_PATH}/${key}`;
  
        if (existingKeys.has(key)) {
          // 🛡️ ARTICOLO ESISTENTE: Aggiorna SOLO descrizione, codice e ricerca
          // (Stock, unità di misura, prezzi, ecc. rimangono intatti)
          updates[`${basePath}/code`] = art.code;
          updates[`${basePath}/codeNorm`] = art.codeNorm;
          updates[`${basePath}/description`] = art.description;
          updates[`${basePath}/descriptionLower`] = art.descriptionLower;
          updates[`${basePath}/searchTokens`] = tokens;
          updates[`${basePath}/updatedAt`] = now;
        } else {
          // 🆕 NUOVO ARTICOLO: Inserisci tutto quello che c'è nel file
          updates[basePath] = {
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
            basePrice: art.basePrice ?? 0, // Nuovo articolo, parte da 0
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
      }
  
      // Salva il blocco su Firebase
      await update(ref(db), updates);
  
      processed += batch.length;
      if (onProgress) onProgress(processed, total);
    }
  
    // Aggiorna i metadati globali
    await update(ref(db, META_PATH), {
      lastImportAt: now,
      lastImportCount: total
    });
  
    await clearArticlesCache();
  
    return { imported: total };
  }
   
   /**
    * Carica TUTTI gli articoli.
    * 1. Mostra SUBITO i dati dalla cache locale.
    * 2. In sottofondo, scarica i dati freschi e salva la promessa.
    */
   export async function loadAllArticles(forceRefresh = false) {
     if (forceRefresh) {
       console.log("🔄 Aggiornamento forzato: scarico da Firebase...");
       _downloadPromise = downloadAndCacheArticles();
       return await _downloadPromise;
     }
   
     const cached = await loadFromCache();
     
     if (cached && cached.data) {
       console.log("⚡ Articoli caricati istantaneamente dalla cache locale!");
       
       // Avvia il download in background e salva la promessa globale
       _downloadPromise = downloadAndCacheArticles().catch(err => console.warn("Sync background fallita:", err));
       
       return cached.data;
     }
   
     console.log("☁️ Prima apertura: cache vuota, scarico da Firebase (attendere)...");
     _downloadPromise = downloadAndCacheArticles();
     return await _downloadPromise;
   }
   
   /**
    * 🆕 Funzione di supporto: scarica da Firebase e salva in cache.
    */
   async function downloadAndCacheArticles() {
     try {
       const t0 = performance.now();
       const snapshot = await get(ref(db, ARTICLES_PATH));
       if (!snapshot.exists()) return {};
       
       const data = snapshot.val();
       const t1 = performance.now();
       console.log(`☁️ Scaricati da Firebase in ${Math.round(t1 - t0)}ms`);
       
       await saveToCache(data);
       console.log("💾 Cache locale aggiornata in background.");
       
       return data;
     } catch (e) {
       console.error("Errore download articoli:", e);
       return {};
     }
   }
   
   /**
    * 🆕 Permette ad altre funzioni (es. invio ordine) di aspettare
    * che il download in background finisca prima di procedere.
    */
   export async function waitForArticlesDownload() {
     if (_downloadPromise) {
       console.log("⏳ Attendo il completamento del download in corso...");
       await _downloadPromise;
       console.log("✅ Download completato, procedo con l'invio.");
     }
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
    */
   export async function addPriceToHistory(code, oldPrice, source) {
     const key = sanitizeKey(code);
     const snap = await get(ref(db, `${ARTICLES_PATH}/${key}/priceHistory`));
     const history = snap.exists() ? snap.val() : {};
   
     const newHistory = {};
     const entries = Object.entries(history)
       .sort((a, b) => (b[1].date || 0) - (a[1].date || 0));
   
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
     await clearArticlesCache();
   }