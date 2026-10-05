/* ============================================
   SEARCH-BAR.JS
   Barra di ricerca articoli (con cache locale).
   ============================================ */

   import { searchArticles, ensureArticlesLoaded } from "../../domain/article-service.js";

   let _onSelectCallback = null;
   
   export function initSearchBar(onSelect) {
     _onSelectCallback = onSelect;
   
     const input = document.getElementById("searchInput");
     const clearBtn = document.getElementById("searchClear");
     const resultsBox = document.getElementById("searchResults");
   
     if (!input) return;
   
     // Precarica gli articoli in cache
     ensureArticlesLoaded().catch(err => {
       console.error("Errore caricamento articoli:", err);
     });
   
     // Debounce per non cercare ad ogni tasto
     let debounceTimer = null;
   
     input.addEventListener("input", () => {
       const term = input.value.trim();
       clearBtn.style.display = term.length > 0 ? "block" : "none";
   
       clearTimeout(debounceTimer);
       debounceTimer = setTimeout(() => {
         runSearch(term, resultsBox, input);
       }, 180);
     });
   
     input.addEventListener("focus", () => {
       if (input.value.trim().length > 0) {
         runSearch(input.value.trim(), resultsBox, input);
       }
     });
   
     clearBtn.addEventListener("click", () => {
       closeResults(resultsBox, input, clearBtn);
       input.focus();
     });
   
     // Click fuori → chiudi risultati
     document.addEventListener("click", (e) => {
       if (!e.target.closest(".banco-search")) {
         resultsBox.classList.remove("active");
       }
     });
   
     // Escape → chiudi
     input.addEventListener("keydown", (e) => {
       if (e.key === "Escape") {
         resultsBox.classList.remove("active");
         input.blur();
       }
     });
   }
   
   /**
    * Chiude la lista dei risultati e resetta l'input.
    */
   function closeResults(resultsBox, input, clearBtn) {
     resultsBox.classList.remove("active");
     resultsBox.innerHTML = "";
     if (input) input.value = "";
     if (clearBtn) clearBtn.style.display = "none";
   }
   
   function runSearch(term, resultsBox, input) {
     if (term.length < 1) {
       resultsBox.classList.remove("active");
       resultsBox.innerHTML = "";
       return;
     }
   
     const { results, total } = searchArticles(term, 20, 0);
   
     if (results.length === 0) {
       resultsBox.innerHTML = `
         <div class="search-result-empty">
           ❌ Nessun articolo trovato per "<strong>${escapeHtml(term)}</strong>"
           <br><small>Controlla il codice o prova con altre parole</small>
         </div>
       `;
       resultsBox.classList.add("active");
       return;
     }
   
     let html = "";
     results.forEach(art => {
       html += `
         <div class="search-result-item" data-key="${escapeHtml(art.key)}">
           <div class="search-result-info">
             <div class="search-result-title">${escapeHtml(art.description)}</div>
             <div class="search-result-code">${escapeHtml(art.code)} • ${escapeHtml(art.unit)}</div>
           </div>
           <button class="btn btn-success" style="padding:8px 14px;font-size:12px;">
             + Aggiungi
           </button>
         </div>
       `;
     });
   
     if (total > 20) {
       html += `
         <div class="search-result-empty" style="font-size:12px;">
           Mostrati 20 di ${total} risultati. Affina la ricerca.
         </div>
       `;
     }
   
     resultsBox.innerHTML = html;
     resultsBox.classList.add("active");
   
     // Attach click listener a ogni risultato
     resultsBox.querySelectorAll(".search-result-item").forEach(item => {
       item.addEventListener("click", (e) => {
         e.preventDefault();
         e.stopPropagation();
   
         const key = item.dataset.key;
         const clearBtn = document.getElementById("searchClear");
   
         // 1. Chiudi SUBITO la lista
         closeResults(resultsBox, input, clearBtn);
   
         // 2. Poi notifica il controller
         if (_onSelectCallback) {
           try {
             _onSelectCallback(key);
           } catch (err) {
             console.error("Errore in onSelectCallback:", err);
           }
         }
       });
     });
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");
   }