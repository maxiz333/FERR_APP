/* ============================================
   ESAURITI-MODAL.JS
   Modale "Esauriti" (Step 3).
   Apre dal tasto 📦 ESAUR. in banco.
   Step 3A: struttura.
   Step 3B: dati live da activeCarts.
   ============================================ */

   import { ESAURITI_FORNITORI } from "./esauriti-fornitori.js";
import { listenAllCarts } from "../../data/cart-repository.js";
import { openFornitoriTendina, openEsauritoPopup } from "./esauriti-helpers.js";
import {
  searchArticles,
  ensureArticlesLoaded
} from "../../domain/article-service.js";
   
   let _activeModal = null;
   let _currentMode = "esauriti";      // "esauriti" | "catalogo"
   let _currentFornitore = "tutti";
   let _currentSearch = "";
   let _allCarts = [];
   let _unsubCarts = null;
   let _expandedItems = new Set();     // chiavi degli item espansi
let _onAddEsaurito = null;          // 🆕 callback da banco-controller
   
   /**
    * Apre la modale Esauriti.
    */
   export function openEsauritiModal(opts = {}) {
    if (_activeModal) return;
  
    // Reset stato
    _currentMode = "esauriti";
    _currentFornitore = "tutti";
    _currentSearch = "";
    _expandedItems.clear();
    _onAddEsaurito = opts.onAddEsaurito || null;
   
     const overlay = document.createElement("div");
     overlay.className = "esauriti-overlay";
     overlay.innerHTML = `
       <div class="esauriti-modal">
         <div class="esauriti-header">
           <span class="esauriti-title">📦 Esauriti</span>
           <button class="esauriti-close" type="button" title="Chiudi">✕</button>
         </div>
   
         <div class="esauriti-switch">
           <button class="esauriti-switch-btn is-active" data-mode="esauriti" type="button">
             📦 Cerca negli Esauriti
           </button>
           <button class="esauriti-switch-btn" data-mode="catalogo" type="button">
             🔍 Cerca nel Catalogo
           </button>
         </div>
   
         <div class="esauriti-search-row">
           <span class="esauriti-search-label" id="esauritiSearchLabel">ORDINI</span>
           <div class="esauriti-search-wrapper">
             <input type="text" class="esauriti-search-input" id="esauritiSearchInput"
                    placeholder="Cerca negli esauriti..." autocomplete="off">
             <button class="esauriti-search-clear" type="button" title="Pulisci">✕</button>
           </div>
         </div>
   
         <div class="esauriti-fornitori">
           <button class="esauriti-forn-btn is-active" data-fornitore="tutti" type="button">
             Tutti
             <span class="esauriti-forn-count" data-count-forn="tutti">0</span>
           </button>
           ${ESAURITI_FORNITORI.map(f => `
             <button class="esauriti-forn-btn" data-fornitore="${f.id}" type="button"
                     style="--forn-color:${f.colore};">
               <span class="esauriti-forn-dot" style="background:${f.colore};"></span>
               ${f.nome}
               <span class="esauriti-forn-count" data-count-forn="${f.id}">0</span>
             </button>
           `).join("")}
           <button class="esauriti-forn-add" type="button" title="Aggiungi fornitore (in arrivo)">+</button>
         </div>
   
         <div class="esauriti-content" id="esauritiContent">
           <div class="esauriti-empty">
             <div class="esauriti-empty-icon">📦</div>
             <div class="esauriti-empty-text">Caricamento…</div>
           </div>
         </div>
       </div>
     `;
     document.body.appendChild(overlay);
     _activeModal = overlay;
   
     // Chiudi su X / sfondo / Esc
     overlay.querySelector(".esauriti-close").addEventListener("click", closeEsauritiModal);
     overlay.addEventListener("click", (e) => {
       if (e.target === overlay) closeEsauritiModal();
     });
     document.addEventListener("keydown", _escHandler);
   
     // Switch modalità
     overlay.querySelectorAll(".esauriti-switch-btn").forEach(btn => {
       btn.addEventListener("click", () => {
         const mode = btn.dataset.mode;
         if (mode === _currentMode) return;
         _currentMode = mode;
         overlay.querySelectorAll(".esauriti-switch-btn").forEach(b => {
           b.classList.toggle("is-active", b.dataset.mode === mode);
         });
         const label = overlay.querySelector("#esauritiSearchLabel");
         const input = overlay.querySelector("#esauritiSearchInput");
         if (mode === "esauriti") {
           label.textContent = "ORDINI";
           input.placeholder = "Cerca negli esauriti...";
         } else {
           label.textContent = "CATALOGO";
           input.placeholder = "Cerca nel catalogo (nome, codice, fornitore)...";
         }
         _currentSearch = "";
         input.value = "";
         renderContent();
       });
     });
   
     // Barra ricerca
     const input = overlay.querySelector("#esauritiSearchInput");
     let searchTimer = null;
     input.addEventListener("input", () => {
       clearTimeout(searchTimer);
       searchTimer = setTimeout(() => {
         _currentSearch = input.value.trim().toLowerCase();
         renderContent();
       }, 180);
     });
     overlay.querySelector(".esauriti-search-clear").addEventListener("click", () => {
       input.value = "";
       _currentSearch = "";
       renderContent();
     });
   
     // Filtro fornitore
     overlay.querySelectorAll(".esauriti-forn-btn").forEach(btn => {
       btn.addEventListener("click", () => {
         _currentFornitore = btn.dataset.fornitore;
         overlay.querySelectorAll(".esauriti-forn-btn").forEach(b => {
           b.classList.toggle("is-active", b === btn);
         });
         renderContent();
       });
     });
   
     // Tasto "+"
     overlay.querySelector(".esauriti-forn-add").addEventListener("click", () => {
       const t = document.createElement("div");
       t.textContent = "Funzione 'aggiungi fornitore' in arrivo";
       t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#facc15;color:#000;padding:8px 16px;border-radius:8px;font-weight:800;font-size:0.85rem;z-index:10001;";
       document.body.appendChild(t);
       setTimeout(() => t.remove(), 2000);
     });
   
     // Avvia listener dati live
     if (_unsubCarts) _unsubCarts();
     _unsubCarts = listenAllCarts((carts) => {
       _allCarts = carts || [];
       updateFornitoriCounts();
       renderContent();
     });
   
     renderContent();
   }
   
   /**
    * Chiude la modale.
    */
   export function closeEsauritiModal() {
     if (_unsubCarts) {
       _unsubCarts();
       _unsubCarts = null;
     }
     if (_activeModal) {
       _activeModal.remove();
       _activeModal = null;
       document.removeEventListener("keydown", _escHandler);
     }
   }
   
   function _escHandler(e) {
     if (e.key === "Escape") closeEsauritiModal();
   }
   
   /**
    * Estrae tutti gli item esauriti da tutti i carrelli.
    */
   function collectEsauriti() {
     const items = [];
     for (const cart of _allCarts) {
       const meta = cart.meta || {};
       const lines = cart.lines || {};
       for (const [lineId, line] of Object.entries(lines)) {
         if (!line.esauritoFornitore) continue;
         items.push({
           key: `${cart.id}_${lineId}`,
           cartId: cart.id,
           lineId,
           fornitoreId: line.esauritoFornitore.id,
           fornitoreNome: line.esauritoFornitore.nome,
           fornitoreColore: line.esauritoFornitore.colore,
           code: line.code || "",
           description: line.description || "",
           unit: (line.unit || "PZ").toUpperCase(),
           qty: Number(line.esauritoQty) || 0,
           note: line.esauritoNote || "",
           price: Number(line.unitPrice ?? line.basePrice) || 0,
           clientName: meta.clientName || "Cliente 1",
           addedAt: Number(line.addedAt) || Number(meta.createdAt) || 0
         });
       }
     }
     return items;
   }
   
   /**
    * Aggiorna i contatori sui tasti fornitori.
    */
   function updateFornitoriCounts() {
     const items = collectEsauriti();
     const counts = { tutti: items.length };
     for (const f of ESAURITI_FORNITORI) counts[f.id] = 0;
     for (const it of items) {
       if (counts[it.fornitoreId] !== undefined) counts[it.fornitoreId]++;
     }
     document.querySelectorAll("[data-count-forn]").forEach(el => {
       const id = el.dataset.countForn;
       el.textContent = String(counts[id] || 0);
     });
   }
   
   /**
    * Renderizza il contenuto.
    */
   function renderContent() {
    const content = document.getElementById("esauritiContent");
    if (!content) return;
  
    if (_currentMode === "catalogo") {
      renderCatalogo(content);
      return;
    }
   
     // Modalità ESAURITI
     let items = collectEsauriti();
   
     // Filtro fornitore
     if (_currentFornitore !== "tutti") {
       items = items.filter(it => it.fornitoreId === _currentFornitore);
     }
   
     // Filtro ricerca
     if (_currentSearch) {
       const q = _currentSearch;
       items = items.filter(it =>
         it.description.toLowerCase().includes(q) ||
         it.code.toLowerCase().includes(q) ||
         it.clientName.toLowerCase().includes(q) ||
         it.note.toLowerCase().includes(q)
       );
     }
   
     if (items.length === 0) {
       content.innerHTML = `
         <div class="esauriti-empty">
           <div class="esauriti-empty-icon">📦</div>
           <div class="esauriti-empty-text">Nessun esaurito</div>
           <div class="esauriti-empty-hint">${_currentSearch ? "Nessun risultato per la ricerca" : "Gli articoli esauriti appariranno qui"}</div>
         </div>
       `;
       return;
     }
   
     // Raggruppa per data di aggiunta
     const groups = groupByDay(items);
   
     content.innerHTML = Object.entries(groups).map(([dayLabel, groupItems]) => `
       <div class="esauriti-day-group">
         <div class="esauriti-day-header">${escapeHtml(dayLabel)}</div>
         <div class="esauriti-day-list">
           ${groupItems.map(it => renderItem(it)).join("")}
         </div>
       </div>
     `).join("");
   
     // Listener click item
     content.querySelectorAll(".esauriti-item").forEach(el => {
       el.addEventListener("click", (e) => {
         // Ignora se il click è dentro il cestino (in futuro)
         const key = el.dataset.key;
         if (_expandedItems.has(key)) _expandedItems.delete(key);
         else _expandedItems.add(key);
         renderContent();
       });
     });
   }
   
   /**
    * Raggruppa gli item per giorno (Oggi, Ieri, "12 agosto").
    */
   function groupByDay(items) {
     const groups = {};
     const now = new Date();
     const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
     const yesterday = today - 24 * 60 * 60 * 1000;
     const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
   
     // Ordina per data DESC
     items.sort((a, b) => b.addedAt - a.addedAt);
   
     for (const it of items) {
       const d = new Date(it.addedAt || 0);
       const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
   
       let label;
       if (dayStart === today) label = "Oggi";
       else if (dayStart === yesterday) label = "Ieri";
       else label = `${d.getDate()} ${MESI[d.getMonth()]}`;
   
       if (!groups[label]) groups[label] = [];
       groups[label].push(it);
     }
   
     return groups;
   }
   
   /**
    * Renderizza un singolo item esaurito.
    */
   function renderItem(it) {
     const expanded = _expandedItems.has(it.key);
     const qtyStr = formatQty(it.qty) + " " + it.unit.toLowerCase();
     const priceStr = formatEuro(it.price);
   
     return `
       <div class="esauriti-item${expanded ? " is-expanded" : ""}"
            data-key="${escapeHtml(it.key)}"
            style="--forn-color:${it.fornitoreColore};">
         <div class="esauriti-item-main">
           <div class="esauriti-item-left">
             <div class="esauriti-item-dot" style="background:${it.fornitoreColore};"></div>
             <div class="esauriti-item-info">
               <div class="esauriti-item-desc">${escapeHtml(it.description)}</div>
               <div class="esauriti-item-meta">
                 <span class="esauriti-item-code">${escapeHtml(it.code)}</span>
                 <span class="esauriti-item-client">· ${escapeHtml(it.clientName)}</span>
               </div>
               ${it.note ? `<div class="esauriti-item-note">📝 ${escapeHtml(it.note)}</div>` : ""}
             </div>
           </div>
           <div class="esauriti-item-right">
             <span class="esauriti-item-qty">${qtyStr}</span>
             <span class="esauriti-item-price">${priceStr}</span>
           </div>
         </div>
       </div>
     `;
   }
   
   function formatQty(q) {
     const n = Number(q);
     if (Number.isInteger(n)) return String(n);
     return n.toFixed(2).replace(".", ",");
   }
   
   function formatEuro(v) {
     return "€ " + (Number(v) || 0).toFixed(2).replace(".", ",");
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");
   }

   /* ============================================================
   🆕 STEP 3C — Ricerca nel catalogo + Ordina
   ============================================================ */

function renderCatalogo(content) {
    if (!_currentSearch || _currentSearch.length < 1) {
      content.innerHTML = `
        <div class="esauriti-empty">
          <div class="esauriti-empty-icon">🔍</div>
          <div class="esauriti-empty-text">Cerca un articolo nel catalogo</div>
          <div class="esauriti-empty-hint">Scrivi nome o codice per iniziare</div>
        </div>
      `;
      return;
    }
  
    ensureArticlesLoaded().then(() => {
      // doppio check: la modale potrebbe essere stata chiusa nel frattempo
      if (!_activeModal) return;
  
      const { results } = searchArticles(_currentSearch, 30, 0);
  
      if (results.length === 0) {
        content.innerHTML = `
          <div class="esauriti-empty">
            <div class="esauriti-empty-icon">❌</div>
            <div class="esauriti-empty-text">Nessun articolo trovato</div>
          </div>
        `;
        return;
      }
  
      content.innerHTML = results.map(art => `
        <div class="esauriti-cat-item" data-key="${escapeHtml(art.key)}">
          <div class="esauriti-cat-info">
            <div class="esauriti-cat-desc">${escapeHtml(art.description)}</div>
            <div class="esauriti-cat-meta">
              <span class="esauriti-cat-code">${escapeHtml(art.code)}</span>
              ${art.supplier ? `· ${escapeHtml(art.supplier)}` : ""}
              ${art.unit ? `· ${escapeHtml(art.unit)}` : ""}
            </div>
          </div>
          <button class="esauriti-cat-order" type="button" data-action="order" title="Aggiungi agli esauriti">
            🛒 Ordina
          </button>
        </div>
      `).join("");
  
      content.querySelectorAll('[data-action="order"]').forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const item = btn.closest(".esauriti-cat-item");
          const key = item.dataset.key;
          const art = results.find(r => r.key === key);
          if (art) handleCatalogoOrder(btn, art);
        });
      });
    });
  }
  
  function handleCatalogoOrder(anchorBtn, article) {
    openFornitoriTendina(anchorBtn, (fornitore) => {
      openEsauritoPopup({
        description: article.description,
        fornitore,
        initialQty: 0,
        initialNote: "",
        onConfirm: async (qty, note) => {
            if (!_onAddEsaurito) {
              console.warn("onAddEsaurito non impostata");
              return;
            }
            const ok = await _onAddEsaurito(article.key, fornitore, qty, note);
            if (ok) {
              toastMini(`📦 ${article.description} · ${fornitore.nome}`);
              setTimeout(() => updateFornitoriCounts(), 300);
            }
          }
      });
    });
  }
  
  function toastMini(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#22c55e;color:#000;padding:8px 16px;border-radius:8px;font-weight:800;font-size:0.85rem;z-index:10001;max-width:90vw;text-align:center;";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }