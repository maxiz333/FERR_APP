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
  
    // --- 1. RICERCA ESATTA (Veloce) ---
    for (const [key, art] of Object.entries(_articles)) {
      let score = 0;
  
      if (art.codeNorm && art.codeNorm.toLowerCase() === q) {
        score = 1000;
      }
      else if (art.codeNorm && art.codeNorm.toLowerCase().startsWith(q)) {
        score = 500;
      }
      else if (art.descriptionLower && art.descriptionLower.startsWith(q)) {
        score = 300;
      }
      else if (art.codeNorm && art.codeNorm.toLowerCase().includes(q)) {
        score = 100;
      }
      else if (art.descriptionLower && art.descriptionLower.includes(q)) {
        score = 50;
      }
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
  
    // --- 2. PIANO B (Fuzzy Search + Plurali) ---
    // Si attiva SOLO se la ricerca esatta non ha trovato NULLA
    if (results.length === 0) {
      const qStem = stemWord(q);
      // Tolleranza errori: 0 per parole < 4 caratteri, 1 per < 8, 2 per più lunghe
      const maxDist = q.length <= 3 ? 0 : (q.length <= 7 ? 1 : 2);
      
      for (const [key, art] of Object.entries(_articles)) {
        let fuzzyScore = 0;
  
        // Controlla codice (match esatto con tolleranza)
        if (art.codeNorm && levenshtein(art.codeNorm.toLowerCase(), q, maxDist) <= maxDist) {
          fuzzyScore = 150; // Alto punteggio ma meno del match esatto
        }
        
        // Se non ha matchato il codice, controlla i token della descrizione
        if (fuzzyScore === 0 && art.searchTokens && Array.isArray(art.searchTokens)) {
          for (const tok of art.searchTokens) {
            // Se il token è troppo corto, ignora per non creare falsi positivi
            if (tok.length < 3) continue;
            
            // Match per plurale/singolare (es. VITI e VITE)
            if (tok === qStem || stemWord(tok) === qStem || tok.startsWith(qStem)) {
              fuzzyScore = 40;
              break;
            }
            
            // Match per errore di battitura
            if (maxDist > 0 && levenshtein(tok, q, maxDist) <= maxDist) {
              fuzzyScore = 30;
              break;
            }
          }
        }
  
        if (fuzzyScore > 0) {
          results.push({ key, ...art, _score: fuzzyScore });
        }
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

/* ============================================
   HELPER PER RICERCA FUZZY (Piano B)
   ============================================ */

/**
 * Taglia l'ultima vocale per unificare singolari e plurali in italiano.
 * Es. "VITI" -> "VIT", "VITE" -> "VIT", "TRAPANI" -> "TRAPAN"
 */
function stemWord(word) {
  if (!word || word.length <= 3) return word;
  // Se finisce per vocale (a,e,i,o), la toglie. (esclude 'u' per non rompere parole tipo "MENU")
  if (/[aeio]$/.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Calcola la distanza di Levenshtein (numero di modifiche necessarie per trasformare a in b)
 * con uscita anticipata se supera maxDist, per non sprecare CPU.
 */
function levenshtein(a, b, maxDist) {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    let minRow = Infinity;
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sostituzione
          matrix[i][j - 1] + 1,     // inserimento
          matrix[i - 1][j] + 1      // cancellazione
        );
      }
      if (matrix[i][j] < minRow) minRow = matrix[i][j];
    }
    // Se anche il minimo di questa riga supera maxDist, possiamo fermarci
    if (minRow > maxDist) return maxDist + 1;
  }
  return matrix[b.length][a.length];
}