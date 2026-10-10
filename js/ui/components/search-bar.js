/* ============================================
   SEARCH-BAR.JS
   Due modalità, stessa barra:
   - CODICE → tastierino numerico inline (custom)
   - NOME   → tastiera normale del telefono
   Entrambe mostrano risultati live mentre digiti.
   ============================================ */

   import { searchArticles, ensureArticlesLoaded } from "../../domain/article-service.js";

   let _onSelectCallback = null;
   
   export function initSearchBar(onSelect) {
     _onSelectCallback = onSelect;
   
     const input = document.getElementById("searchInput");
     const resultsBox = document.getElementById("searchResults");
     const inlineKeypad = document.getElementById("inlineKeypad");
     if (!input || !resultsBox) return;
   
     const searchContainer = input.closest(".banco-search");
     const inputWrapper = input.closest(".search-input-wrapper");
     const closeBtn = inputWrapper?.querySelector(".icon-close-mode");
     const codeBtn = document.querySelector('.search-mode-btn[data-mode="code"]');
     const nameBtn = document.querySelector('.search-mode-btn[data-mode="name"]');
   
     ensureArticlesLoaded().catch(err => {
       console.error("Errore caricamento articoli:", err);
     });
   
     let _currentMode = "name";
     let _debounceTimer = null;
   
     /* ---------- APRI / CHIUDI ---------- */
   
     function openSearchMode(mode) {
       _currentMode = mode;
       searchContainer?.classList.add("is-searching");
       inputWrapper?.classList.remove("is-hidden");
       input.value = "";
       resultsBox.classList.remove("active");
       resultsBox.innerHTML = "";
   
       if (mode === "code") {
         // Tastierino custom visibile, NIENTE tastiera telefono
         input.setAttribute("inputmode", "none");
         input.setAttribute("readonly", "readonly");   // blocca tastiera telefono
         input.placeholder = "Cerca per codice...";
         inlineKeypad?.classList.remove("is-hidden");
       } else {
         // Tastiera normale del telefono
         input.removeAttribute("inputmode");
         input.removeAttribute("readonly");
         input.placeholder = "Cerca per nome...";
         inlineKeypad?.classList.add("is-hidden");
         setTimeout(() => input.focus(), 80);
       }
     }
   
     function closeSearchMode() {
       searchContainer?.classList.remove("is-searching");
       inputWrapper?.classList.add("is-hidden");
       inlineKeypad?.classList.add("is-hidden");
       input.value = "";
       input.blur();
       resultsBox.classList.remove("active");
       resultsBox.innerHTML = "";
     }
   
     /* ---------- TASTI ---------- */
   
     codeBtn?.addEventListener("click", () => openSearchMode("code"));
     nameBtn?.addEventListener("click", () => openSearchMode("name"));
     closeBtn?.addEventListener("click", closeSearchMode);
   
     /* ---------- TASTIERINO INLINE (solo CODICE) ---------- */
   
     inlineKeypad?.querySelectorAll(".inline-kp").forEach(btn => {
       btn.addEventListener("click", (e) => {
         e.preventDefault();
         e.stopPropagation();
   
         const k = btn.dataset.k;
         let v = input.value;
   
         if (k === "clear") {
           v = "";
         } else if (k === "backspace") {
           v = v.slice(0, -1);
         } else if (/^\d$/.test(k)) {
           if (v.length < 15) v += k;   // limite lunghezza
         }
   
         input.value = v;
         // Triggera ricerca live
         clearTimeout(_debounceTimer);
         if (!v) {
           resultsBox.classList.remove("active");
           resultsBox.innerHTML = "";
           return;
         }
         _debounceTimer = setTimeout(() => doSearch(v), 120);
       });
     });
   
     /* ---------- INPUT (solo NOME) ---------- */
   
     input.addEventListener("input", () => {
       if (_currentMode !== "name") return;
       const term = input.value.trim();
       clearTimeout(_debounceTimer);
   
       if (!term) {
         resultsBox.classList.remove("active");
         resultsBox.innerHTML = "";
         return;
       }
   
       _debounceTimer = setTimeout(() => doSearch(term), 150);
     });
   
     input.addEventListener("keydown", (e) => {
       if (e.key === "Escape") closeSearchMode();
     });
   
     /* ---------- RICERCA ---------- */
   
     function doSearch(term) {
       if (!term) return;
   
       let { results, total } = searchArticles(term, 20, 0);
   
       // In modalità CODICE: tieni solo articoli col codice che contiene il termine
       if (_currentMode === "code") {
         const lower = term.toLowerCase();
         results = results.filter(r =>
           String(r.code || "").toLowerCase().includes(lower)
         );
         // Match esatto su 1 solo → aggiungi diretto
         if (results.length === 1 &&
             String(results[0].code || "").toLowerCase() === lower) {
           addArticle(results[0].key);
           return;
         }
       }
   
       if (results.length === 0) {
         resultsBox.innerHTML = `
           <div class="search-result-empty">
             ❌ Nessun articolo trovato per "<strong>${escapeHtml(term)}</strong>"
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
   
       resultsBox.querySelectorAll(".search-result-item").forEach(item => {
         item.addEventListener("click", (e) => {
           e.preventDefault();
           e.stopPropagation();
           addArticle(item.dataset.key);
         });
       });
     }
   
     /* ---------- AGGIUNTA ARTICOLO ---------- */
   
     function addArticle(key) {
       resultsBox.classList.remove("active");
       resultsBox.innerHTML = "";
   
       if (_onSelectCallback) {
         try { _onSelectCallback(key); } catch (err) { console.error(err); }
       }
   
       // Dopo aggiunta: pulisci input e mantieni la modalità
       input.value = "";
       if (_currentMode === "name") {
         input.focus();
       }
     }
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");
   }