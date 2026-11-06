/* ============================================
   CLIENT-SERVICE.JS
   Cache locale clienti + ricerca istantanea.
   ============================================ */

   import { loadAllClients, listenClients } from "../data/client-repository.js";

   let _clients = null;    // { key: client }
   let _loading = null;
   let _unsubListener = null;
   
   /**
    * Carica tutti i clienti in cache (una sola volta).
    */
   export async function ensureClientsLoaded() {
     if (_clients) return _clients;
     if (_loading) return _loading;
   
     _loading = (async () => {
       console.log("👥 Caricamento clienti in cache...");
       const t0 = performance.now();
       _clients = await loadAllClients();
       const t1 = performance.now();
       const count = Object.keys(_clients).length;
       console.log(`👥 ${count} clienti caricati in ${Math.round(t1 - t0)}ms`);
       return _clients;
     })();
   
     return _loading;
   }
   
   /**
    * Sottoscrive i clienti in tempo reale (per aggiornamenti live).
    */
   export function subscribeClients() {
     if (_unsubListener) return _unsubListener;
     _unsubListener = listenClients((data) => {
       _clients = data;
     });
     return _unsubListener;
   }
   
   /**
    * Forza il ricaricamento della cache.
    */
   export async function reloadClients() {
     _clients = null;
     _loading = null;
     return ensureClientsLoaded();
   }
   
   /**
    * Ritorna il numero di clienti in cache.
    */
   export function getClientCount() {
     return _clients ? Object.keys(_clients).length : 0;
   }
   
/**
 * Funzione di supporto per "pulire" il testo: 
 * toglie maiuscole, accenti, punteggiatura e CODICI HTML.
 */
function normalizeStr(s) {
  if (!s) return "";
  
  return String(s)
    .toLowerCase()
    // 🆕 Decodifica i codici HTML comuni del vecchio file
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Ora pulisce accenti e punteggiatura
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
   
   /**
    * Ricerca clienti SUPER INTELLIGENTE.
    */
   export function searchClients(term, limit = 30) {
     if (!_clients) return [];
     if (!term || term.trim().length < 1) return [];
   
     const q = normalizeStr(term);
     const tokens = q.split(/\s+/).filter(t => t.length > 0);
     const results = [];
   
     for (const [key, c] of Object.entries(_clients)) {
       const name = normalizeStr(c.name);
       const city = normalizeStr(c.city);
       const address = normalizeStr(c.address);
       const legacy = normalizeStr(c.legacyId);
   
       let score = 0;
   
       if (name === q) {
         score = 1000;
       } 
       else if (name.startsWith(q)) {
         score = 500;
       } 
       else if (name.includes(q)) {
         score = 200;
       } 
       else {
         const combinedText = `${name} ${city} ${address} ${legacy}`;
         const allTokensMatch = tokens.every(t => combinedText.includes(t));
         
         if (allTokensMatch) {
           score = 100; 
           if (name.startsWith(tokens[0])) {
             score += 50; 
           }
         }
       }
   
       if (score > 0) {
         results.push({ key, ...c, _score: score });
       }
     }
   
     results.sort((a, b) => {
       if (b._score !== a._score) return b._score - a._score;
       return (a.name || "").localeCompare(b.name || "");
     });
   
     return results.slice(0, limit).map(r => {
       delete r._score;
       return r;
     });
   }
   
   /**
    * Ritorna un cliente dalla cache.
    */
   export function getClientFromCache(key) {
     if (!_clients) return null;
     return _clients[key] ? { key, ..._clients[key] } : null;
   }