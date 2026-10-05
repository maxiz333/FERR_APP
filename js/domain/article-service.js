/* ============================================
   ARTICLE-SERVICE.JS
   Cache locale degli articoli + ricerca istantanea.
   Scarica tutti gli articoli una sola volta (versione
   leggera) e li tiene in memoria per la ricerca.
   ============================================ */

   import { loadAllArticles } from "../data/article-repository.js";

   let _articles = null;   // { key: article }
   let _loading = null;    // Promise in corso
   
   /**
    * Carica tutti gli articoli in cache (una sola volta).
    */
   export async function ensureArticlesLoaded() {
     if (_articles) return _articles;
     if (_loading) return _loading;
   
     _loading = (async () => {
       console.log("📚 Caricamento articoli in cache...");
       const t0 = performance.now();
       _articles = await loadAllArticles();
       const t1 = performance.now();
       const count = Object.keys(_articles).length;
       console.log(`📚 ${count} articoli caricati in ${Math.round(t1 - t0)}ms`);
       return _articles;
     })();
   
     return _loading;
   }
   
   /**
    * Forza ricaricamento della cache.
    */
   export async function reloadArticles() {
     _articles = null;
     _loading = null;
     return ensureArticlesLoaded();
   }
   
   /**
    * Ritorna il numero di articoli in cache.
    */
   export function getArticleCount() {
     return _articles ? Object.keys(_articles).length : 0;
   }
   
   /**
    * Ricerca articoli.
    *
    * @param {string} term - Termine di ricerca
    * @param {number} limit - Max risultati (default 20)
    * @param {number} offset - Offset per paginazione
    * @returns {Array} Array di articoli { key, ...fields }
    */
   export function searchArticles(term, limit = 20, offset = 0) {
     if (!_articles) return { results: [], total: 0 };
     if (!term || term.trim().length < 1) return { results: [], total: 0 };
   
     const q = term.trim().toLowerCase();
     const results = [];
   
     for (const [key, art] of Object.entries(_articles)) {
       let score = 0;
   
       // Match esatto su codice → priorità massima
       if (art.codeNorm && art.codeNorm.toLowerCase() === q) {
         score = 1000;
       }
       // Codice inizia con q → alta priorità
       else if (art.codeNorm && art.codeNorm.toLowerCase().startsWith(q)) {
         score = 500;
       }
       // Descrizione inizia con q
       else if (art.descriptionLower && art.descriptionLower.startsWith(q)) {
         score = 300;
       }
       // Codice contiene q
       else if (art.codeNorm && art.codeNorm.toLowerCase().includes(q)) {
         score = 100;
       }
       // Descrizione contiene q
       else if (art.descriptionLower && art.descriptionLower.includes(q)) {
         score = 50;
       }
       // Match per token
       else if (art.searchTokens && Array.isArray(art.searchTokens)) {
         const allMatch = q.split(/\s+/).every(t =>
           art.searchTokens.some(tok => tok.includes(t))
         );
         if (allMatch) score = 20;
       }
   
       if (score > 0) {
         results.push({ key, ...art, _score: score });
       }
     }
   
     // Ordina per score, poi per descrizione
     results.sort((a, b) => {
       if (b._score !== a._score) return b._score - a._score;
       return (a.description || "").localeCompare(b.description || "");
     });
   
     const total = results.length;
     const paged = results.slice(offset, offset + limit).map(r => {
       delete r._score;
       return r;
     });
   
     return { results: paged, total };
   }
   
   /**
    * Ritorna un articolo dalla cache per chiave.
    */
   export function getArticleFromCache(key) {
     if (!_articles) return null;
     return _articles[key] ? { key, ..._articles[key] } : null;
   }
   /* ============================================
   UPDATE IN CACHE — Blocco 2B.7
   Aggiorna un articolo nella cache locale SENZA ricaricare
   tutti i 19.000 articoli.
   ============================================ */
export function updateArticleInCache(key, fields) {
  if (!_articles) return;
  if (!_articles[key]) return;
  _articles[key] = { ..._articles[key], ...fields };
}