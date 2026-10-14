/* ============================================
   ESAURITI-MODAL.JS
   Modale "Esauriti" (Step 3 + Step 4A.1).
   Apre dal tasto 📦 ESAUR. in banco.
   ============================================ */

   import {
    ESAURITI_FORNITORI,
    loadFornitori,
    reloadFornitori,
    pushFornitoreLocale,
    removeFornitoreLocale
  } from "./esauriti-fornitori.js";
  import {
    saveFornitore,
    removeFornitore
  } from "../../data/fornitori-repository.js";
import { listenAllCarts } from "../../data/cart-repository.js";
import { listenEsauriti, removeEsaurito, updateEsaurito } from "../../data/esauriti-repository.js";
import { updateLine } from "../../data/cart-repository.js";
import { openFornitoriTendina, openEsauritoPopup } from "./esauriti-helpers.js";
import {
  searchArticles,
  ensureArticlesLoaded
} from "../../domain/article-service.js";
import {
  leggiUltimiArchivi
} from "../../data/esauriti-archivio-repository.js";
   
   let _activeModal = null;
   let _currentMode = "esauriti";      // "esauriti" | "catalogo"
   let _currentFornitore = "tutti";
   let _currentSearch = "";
   let _allCarts = [];
let _unsubCarts = null;
let _esauritiCatalogo = [];       // 🆕 esauriti "puri" da catalogo
let _unsubEsauriti = null;
   let _expandedItems = new Set();
   let _onAddEsaurito = null;
   let _onArchivia = null;             // 🆕 callback archiviazione (da banco-controller)
   let _ultimiArchivi = [];            // cache ultimi 5
let _tuttiArchivi = [];             // 🆕 cache completa per ricerca
   let _archivioSearchResults = [];    // 🆕 risultati ricerca archivio (se serve)
   
   /**
    * Apre la modale Esauriti.
    */
   export async function openEsauritiModal(opts = {}) {
    if (_activeModal) return;
  
    // Carica fornitori da Firebase prima di disegnare la barra
    try {
      await loadFornitori();
    } catch (e) {
      console.warn("loadFornitori fallito:", e);
    }
   
     _currentMode = "esauriti";
     _currentFornitore = "tutti";
     _currentSearch = "";
     _expandedItems.clear();
     _onAddEsaurito = opts.onAddEsaurito || null;
     _onArchivia = opts.onArchivia || null;
   
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
   
         <div class="esauriti-order-actions" id="esauritiOrderActions" hidden>
           <div class="esauriti-note-row">
             <span class="esauriti-note-icon">✏️</span>
             <input type="text" class="esauriti-note-input" id="esauritiNoteInput"
                    placeholder="Nota per questo ordine (opzionale)...">
           </div>
           <button class="esauriti-archive-btn" id="esauritiArchiveBtn" type="button">
             📨 Invia & Archivia · <span id="esauritiArchiveCount">0</span> art.
           </button>
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
         updateOrderActionsVisibility();
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
         updateOrderActionsVisibility();
         renderContent();
       });
     });
   
       // Tasto "+"
  overlay.querySelector(".esauriti-forn-add").addEventListener("click", () => {
    openAddFornitorePopup(overlay);
  });
   
     // 🆕 Tasto Invia & Archivia
     overlay.querySelector("#esauritiArchiveBtn").addEventListener("click", () => {
       openArchiviaConfirm();
     });
   
  // Carica ultimi archivi (per lo storico in fondo)
  leggiUltimiArchivi(5).then(list => {
    _ultimiArchivi = list;
    renderContent();
  }).catch(err => {
    console.error("Errore lettura archivi:", err);
  });

  // 🆕 Carica TUTTI gli archivi (per la ricerca estesa)
  import("../../data/esauriti-archivio-repository.js").then(m => {
    return m.leggiTuttiArchivi();
  }).then(list => {
    _tuttiArchivi = list || [];
  }).catch(err => {
    console.error("Errore lettura tutti archivi:", err);
  });
   
  // 🆕 Renderizza la barra fornitori aggiornata
  renderFornitoriBar(overlay);

  // Avvia listener carrelli
  if (_unsubCarts) _unsubCarts();
  _unsubCarts = listenAllCarts((carts) => {
    _allCarts = carts || [];
    updateFornitoriCounts();
    renderContent();
  });

  // 🆕 Avvia listener esauriti "puri" (da catalogo)
  if (_unsubEsauriti) _unsubEsauriti();
  _unsubEsauriti = listenEsauriti((items) => {
    _esauritiCatalogo = items || [];
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
    if (_unsubEsauriti) {
      _unsubEsauriti();
      _unsubEsauriti = null;
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
    * Mostra/nascondi la riga "Nota + Invia & Archivia".
    * Visibile solo se fornitore specifico (≠ tutti) e modalità esauriti.
    */
   function updateOrderActionsVisibility() {
     const box = document.getElementById("esauritiOrderActions");
     const cnt = document.getElementById("esauritiArchiveCount");
     if (!box) return;
   
     const show = _currentFornitore !== "tutti" && _currentMode === "esauriti";
     box.hidden = !show;
     if (!show) return;
   
     // Conta articoli di quel fornitore
     const items = collectEsauriti().filter(it => it.fornitoreId === _currentFornitore);
     if (cnt) cnt.textContent = String(items.length);
   
     // Svuota la nota quando cambi fornitore (nota è per-invio, non persistente)
     const input = document.getElementById("esauritiNoteInput");
     if (input) input.value = "";
   
     // Disabilita bottone se 0 articoli
     const btn = document.getElementById("esauritiArchiveBtn");
     if (btn) {
       btn.disabled = items.length === 0;
     }
   }
   
   /**
    * Estrae tutti gli item esauriti da tutti i carrelli.
    */
   function collectEsauriti() {
    const items = [];
  
    // 1) Da carrelli (activeCarts)
    for (const cart of _allCarts) {
      const meta = cart.meta || {};
      const lines = cart.lines || {};
      for (const [lineId, line] of Object.entries(lines)) {
        if (!line.esauritoFornitore) continue;
        items.push({
          source: "carrello",
          key: `cart_${cart.id}_${lineId}`,
          cartId: cart.id,
          lineId,
          fornitoreId: line.esauritoFornitore.id,
          fornitoreNome: line.esauritoFornitore.nome,
          fornitoreColore: line.esauritoFornitore.colore,
          code: line.code || "",
          supplierCode: "",
          description: line.description || "",
          unit: (line.unit || "PZ").toUpperCase(),
          qty: Number(line.esauritoQty) || 0,
          note: line.esauritoNote || "",
          price: Number(line.unitPrice ?? line.basePrice) || 0,
          clientName: meta.clientName || "Cliente 1",
          addedAt: Number(line.addedAt) || Number(meta.createdAt) || 0,
          addedByName: line.addedByName || meta.createdByName || ""
        });
      }
    }
  
    // 2) Da nodo esauriti/ (catalogo)
    for (const e of _esauritiCatalogo) {
      items.push({
        source: "catalogo",
        key: `cat_${e.id}`,
        esauritoId: e.id,
        fornitoreId: e.fornitoreId,
        fornitoreNome: e.fornitoreNome,
        fornitoreColore: e.fornitoreColore,
        code: e.code || "",
        supplierCode: e.supplierCode || "",
        description: e.description || "",
        unit: (e.unit || "PZ").toUpperCase(),
        qty: Number(e.qty) || 0,
        note: e.note || "",
        price: Number(e.price) || 0,
        clientName: "Catalogo",
        addedAt: Number(e.addedAt) || 0,
        addedByName: (e.addedBy && e.addedBy.name) || ""
      });
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
   
     let items = collectEsauriti();
   
     if (_currentFornitore !== "tutti") {
       items = items.filter(it => it.fornitoreId === _currentFornitore);
     }
   
     if (_currentSearch) {
       const q = _currentSearch;
       items = items.filter(it =>
         it.description.toLowerCase().includes(q) ||
         it.code.toLowerCase().includes(q) ||
         it.clientName.toLowerCase().includes(q) ||
         it.note.toLowerCase().includes(q)
       );
     }
   
       // 🆕 Calcola prima i risultati archivio (così decidiamo se mostrare il "vuoto")
  const foundArchives = _currentSearch ? searchInArchives(_currentSearch) : [];

  let html = "";

  if (items.length === 0) {
    // Mostra "Nessun esaurito" SOLO se non ci sono nemmeno risultati archivio
    if (foundArchives.length === 0) {
      html += `
        <div class="esauriti-empty">
          <div class="esauriti-empty-icon">📦</div>
          <div class="esauriti-empty-text">Nessun esaurito</div>
          <div class="esauriti-empty-hint">${_currentSearch ? "Nessun risultato per la ricerca" : "Gli articoli esauriti appariranno qui"}</div>
        </div>
      `;
    }
  } else {
    const groups = groupByDay(items);
    html += Object.entries(groups).map(([dayLabel, groupItems]) => `
      <div class="esauriti-day-group">
        <div class="esauriti-day-header">${escapeHtml(dayLabel)}</div>
        <div class="esauriti-day-list">
          ${groupItems.map(it => renderItem(it)).join("")}
        </div>
      </div>
    `).join("");
  }

  // 🆕 Sezione archivio — appare SUBITO dopo i risultati degli esauriti attivi
  if (foundArchives.length > 0) {
    html += renderArchivioResults(foundArchives);
  }

  // 🆕 Sezione GIÀ ORDINATI (ultimi 5) — solo se NON c'è ricerca attiva
  if (!_currentSearch) {
    html += renderStorico(_ultimiArchivi);
  }

  content.innerHTML = html;

  // 🆕 Listener click risultati archivio
  content.querySelectorAll(".esauriti-arch-result").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.archiveId;
      const arch = _tuttiArchivi.find(a => a.id === id);
      if (arch) openArchivioDetail(arch);
    });
  });
   
  // Listener item: click = espandi, dblclick (PC) / long-press (mobile) = menu
  content.querySelectorAll(".esauriti-item").forEach(el => {
    const key = el.dataset.key;
    const item = items.find(it => it.key === key);
    if (!item) return;

    let suppressClick = false;
    let pressTimer = null;
    let touchMoved = false;

    // Click semplice → espandi/chiudi
    el.addEventListener("click", (e) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      if (_expandedItems.has(key)) _expandedItems.delete(key);
      else _expandedItems.add(key);
      renderContent();
    });

    // Doppio click (PC) → menu
    el.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = true;
      openEsauritoMenu(item, e.clientX, e.clientY);
      setTimeout(() => { suppressClick = false; }, 400);
    });

    // Long-press (mobile, 500ms) → menu
    el.addEventListener("touchstart", (e) => {
      touchMoved = false;
      const touch = e.touches[0];
      pressTimer = setTimeout(() => {
        if (touchMoved) return;
        suppressClick = true;
        openEsauritoMenu(item, touch.clientX, touch.clientY);
        setTimeout(() => { suppressClick = false; }, 400);
      }, 500);
    }, { passive: true });

    el.addEventListener("touchmove", () => {
      touchMoved = true;
      clearTimeout(pressTimer);
    }, { passive: true });

    el.addEventListener("touchend", () => {
      clearTimeout(pressTimer);
    });
    el.addEventListener("touchcancel", () => {
      clearTimeout(pressTimer);
    });
  });
   
     // 🆕 Listener click storico
     content.querySelectorAll(".esauriti-storico-item").forEach(el => {
       el.addEventListener("click", () => {
         const id = el.dataset.archiveId;
         const arch = _ultimiArchivi.find(a => a.id === id);
         if (arch) openArchivioDetail(arch);
       });
     });
   }
   
   /**
    * Renderizza la sezione "GIÀ ORDINATI" con ultimi 5 archivi.
    */
   function renderStorico(archivi) {
     if (!archivi || archivi.length === 0) return "";
   
     const rows = archivi.map(a => {
       const d = new Date(a.dataArchiviazione || 0);
       const dd = String(d.getDate()).padStart(2, "0");
       const mm = String(d.getMonth() + 1).padStart(2, "0");
       const yy = d.getFullYear();
       const dataStr = `${yy}-${mm}-${dd}`;
       return `
         <div class="esauriti-storico-item" data-archive-id="${escapeHtml(a.id)}">
           <span class="esauriti-storico-data">${dataStr}</span>
           <span class="esauriti-storico-sep">—</span>
           <span class="esauriti-storico-forn">
             <span class="esauriti-storico-dot" style="background:${escapeHtml(a.fornitoreColore || "#888")};"></span>
             ${escapeHtml(a.fornitoreNome || "")}
           </span>
           <span class="esauriti-storico-sep">—</span>
           <span class="esauriti-storico-count">${a.articoliCount || 0} art.</span>
         </div>
       `;
     }).join("");
   
     return `
       <div class="esauriti-storico">
         <div class="esauriti-storico-title">📚 GIÀ ORDINATI (ultimi 5)</div>
         <div class="esauriti-storico-list">${rows}</div>
       </div>
     `;
   }
   
   /**
    * Apre il dettaglio di un archivio (Step 4A.2 completerà stampa + CSV).
    */
   function openArchivioDetail(archivio) {
    const overlay = document.createElement("div");
    overlay.className = "fapp-modal-overlay";
    overlay.innerHTML = `
      <div class="fapp-modal-box esauriti-archivio-detail">
        <div class="esauriti-archivio-header" style="border-color:${escapeHtml(archivio.fornitoreColore || "#888")};">
          <span class="esauriti-archivio-dot" style="background:${escapeHtml(archivio.fornitoreColore || "#888")};"></span>
          <span class="esauriti-archivio-title">${escapeHtml(archivio.fornitoreNome || "")}</span>
          <span class="esauriti-archivio-sub">Archiviato il ${formatDataArchivio(archivio.dataArchiviazione)} — ${archivio.articoliCount || 0} articoli</span>
        </div>
        <div class="esauriti-archivio-body">
          <table class="esauriti-archivio-table">
            <thead>
              <tr>
                <th>Descrizione</th>
                <th>Cod.Mag</th>
                <th>Cod.Form</th>
                <th>Q.tà</th>
                <th>UM</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(archivio.articoli || {}).map(a => `
                <tr>
                  <td>
                    ${escapeHtml(a.description || "")}
                    ${a.note ? `<div class="esauriti-archivio-artnote">📝 ${escapeHtml(a.note)}</div>` : ""}
                  </td>
                  <td class="mono">${escapeHtml(a.code || "")}</td>
                  <td class="mono">${escapeHtml(a.supplierCode || "")}</td>
                  <td class="num">${formatQty(a.qty)}</td>
                  <td>${escapeHtml(a.unit || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ${archivio.note ? `<div class="esauriti-archivio-note">📝 Nota ordine: ${escapeHtml(archivio.note)}</div>` : ""}
        </div>
        <div class="esauriti-archivio-footer">
          <button class="btn btn-outline" id="eaBtnClose" type="button">Chiudi</button>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-outline" id="eaBtnCsv" type="button">📄 CSV</button>
            <button class="btn btn-primary" id="eaBtnPrint" type="button">🖨 Stampa</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  
    const close = () => overlay.remove();
    overlay.querySelector("#eaBtnClose").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
  
    // 🆕 Stampa
    overlay.querySelector("#eaBtnPrint").addEventListener("click", () => {
      printOrdineFornitore({
        fornitore: {
          id: archivio.fornitoreId,
          nome: archivio.fornitoreNome,
          colore: archivio.fornitoreColore
        },
        articoli: Object.values(archivio.articoli || {}),
        note: archivio.note || "",
        dataArchiviazione: archivio.dataArchiviazione
      });
    });
  
    // 🆕 CSV
    overlay.querySelector("#eaBtnCsv").addEventListener("click", () => {
      scaricaCsvArchivio(archivio);
    });
  }
   
   /**
    * Modale di conferma archiviazione.
    */
   function openArchiviaConfirm() {
     const items = collectEsauriti().filter(it => it.fornitoreId === _currentFornitore);
     if (items.length === 0) {
       toastMini("Nessun articolo da archiviare", "#ef4444");
       return;
     }
   
     const fornitore = ESAURITI_FORNITORI.find(f => f.id === _currentFornitore);
     if (!fornitore) return;
   
     const notaInput = document.getElementById("esauritiNoteInput");
     const note = notaInput ? notaInput.value.trim() : "";
   
     const overlay = document.createElement("div");
     overlay.className = "fapp-modal-overlay";
     overlay.innerHTML = `
       <div class="fapp-modal-box esauriti-archive-modal">
         <div class="esauriti-archive-header" style="border-color:${fornitore.colore};">
           <span class="esauriti-archive-dot" style="background:${fornitore.colore};"></span>
           <div class="esauriti-archive-title-wrap">
             <div class="esauriti-archive-title">${escapeHtml(fornitore.nome)}</div>
             <div class="esauriti-archive-sub">Confermi archiviazione? — ${items.length} articoli</div>
           </div>
         </div>
   
         <div class="esauriti-archive-body">
           <table class="esauriti-archivio-table">
             <thead>
               <tr>
                 <th>Descrizione</th>
                 <th>Cod.Mag</th>
                 <th>Cod.Form</th>
                 <th>Q.tà</th>
                 <th>UM</th>
               </tr>
             </thead>
             <tbody>
               ${items.map(a => `
                 <tr>
                   <td>${escapeHtml(a.description || "")}</td>
                   <td class="mono">${escapeHtml(a.code || "")}</td>
                   <td class="mono">${escapeHtml(a.supplierCode || "")}</td>
                   <td class="num">${formatQty(a.qty)}</td>
                   <td>${escapeHtml(a.unit || "")}</td>
                 </tr>
               `).join("")}
             </tbody>
           </table>
         </div>
   
      <div class="esauriti-archive-footer">
        <button class="btn btn-outline" id="eamNo" type="button">No</button>
        <button class="btn btn-outline" id="eamPrint" type="button">🖨 Stampa</button>
        <button class="btn btn-primary" id="eamArchive" type="button">✓ Sì, archivia</button>
       </div>
       </div>
     `;
     document.body.appendChild(overlay);
   
     const close = () => overlay.remove();
     overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
     document.addEventListener("keydown", function esc(e) {
       if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
     });
   
     overlay.querySelector("#eamNo").addEventListener("click", close);

     // 🆕 Stampa senza archiviare
     overlay.querySelector("#eamPrint").addEventListener("click", () => {
       printOrdineFornitore({
         fornitore,
         articoli: items.map(a => ({
           code: a.code,
           supplierCode: a.supplierCode || "",
           description: a.description,
           note: a.note || "",
           qty: a.qty,
           unit: a.unit,
           price: a.price
         })),
         note,
         dataArchiviazione: Date.now()
       });
     });
   
     overlay.querySelector("#eamArchive").addEventListener("click", async () => {
       if (typeof _onArchivia !== "function") {
         toastMini("Funzione archivio non collegata", "#ef4444");
         return;
       }
       try {
         await _onArchivia(fornitore, items, note);
         close();
         // Pulisci nota
         if (notaInput) notaInput.value = "";
         // Ricarica ultimi archivi
         const list = await leggiUltimiArchivi(5);
         _ultimiArchivi = list;
         updateFornitoriCounts();
         renderContent();
         toastMini(`📦 ${items.length} articoli archiviati · ${fornitore.nome}`, "#22c55e");
       } catch (err) {
         console.error("Errore archiviazione:", err);
         toastMini("Errore archiviazione", "#ef4444");
       }
     });
   }
   
   /* ============================================================
      RICERCA NEL CATALOGO + Ordina (Step 3C)
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
           if (!_onAddEsaurito) return;
           const ok = await _onAddEsaurito(article.key, fornitore, qty, note);
           if (ok) {
             toastMini(`📦 ${article.description} · ${fornitore.nome}`, "#22c55e");
             setTimeout(() => updateFornitoriCounts(), 300);
           }
         }
       });
     });
   }
   
   /* ============================================================
      UTILS
      ============================================================ */
   
   function groupByDay(items) {
     const groups = {};
     const now = new Date();
     const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
     const yesterday = today - 24 * 60 * 60 * 1000;
     const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
   
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
   
   function renderItem(it) {
    const expanded = _expandedItems.has(it.key);
    const qtyStr = formatQty(it.qty) + " " + it.unit.toLowerCase();
    const priceStr = formatEuro(it.price);
  
    // 🆕 Data/ora + chi ha aggiunto
    const dataStr = formatDataOraBreve(it.addedAt);
    const autoreStr = it.addedByName ? ` · ${escapeHtml(it.addedByName)}` : "";
  
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
              <div class="esauriti-item-when">🕒 ${dataStr}${autoreStr}</div>
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

   /**
 * Formatta un timestamp in "dd/mm HH:MM".
 */
function formatDataOraBreve(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}
   
   function formatDataArchivio(ts) {
     if (!ts) return "—";
     const d = new Date(ts);
     const dd = String(d.getDate()).padStart(2, "0");
     const mm = String(d.getMonth() + 1).padStart(2, "0");
     const yy = d.getFullYear();
     const hh = String(d.getHours()).padStart(2, "0");
     const mi = String(d.getMinutes()).padStart(2, "0");
     return `${dd}/${mm}/${yy} ${hh}:${mi}`;
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");
   }
   
   function toastMini(msg, color = "#22c55e") {
     const t = document.createElement("div");
     t.textContent = msg;
     t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${color};color:#000;padding:8px 16px;border-radius:8px;font-weight:800;font-size:0.85rem;z-index:10001;max-width:90vw;text-align:center;`;
     document.body.appendChild(t);
     setTimeout(() => t.remove(), 2400);
   }

   /* ============================================================
   🆕 STEP 4A.2 — Stampa Ordine Fornitore (A4)
   ============================================================ */

function printOrdineFornitore({ fornitore, articoli, note, dataArchiviazione }) {
  const d = new Date(dataArchiviazione || Date.now());
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const dataStr = `${dd}/${mm}/${yy} ${hh}:${mi}`;

  const rowsHtml = articoli.map((a, i) => `
    <tr>
      <td>
        <div class="art-desc">${escapeHtml(a.description || "")}</div>
        ${a.note ? `<div class="art-note">📝 ${escapeHtml(a.note)}</div>` : ""}
      </td>
      <td class="mono">${escapeHtml(a.code || "")}</td>
      <td class="mono">${escapeHtml(a.supplierCode || "")}</td>
      <td class="num">${formatQty(a.qty)}</td>
      <td class="center">${escapeHtml(a.unit || "")}</td>
    </tr>
  `).join("");

  const noteHtml = note
    ? `<div class="note-block"><strong>Nota ordine:</strong> ${escapeHtml(note)}</div>`
    : "";

  const fullHtml = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Ordine Fornitore - ${escapeHtml(fornitore.nome)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, sans-serif;
    color: #000;
    margin: 0;
    padding: 20px;
    font-size: 12px;
  }
  h1 { font-size: 18px; margin: 0 0 2px; letter-spacing: 1px; }
  .subtitle { font-size: 11px; color: #444; margin-bottom: 16px; letter-spacing: 1px; }
  .header-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #000;
    font-size: 12px;
  }
  .header-info .forn { font-weight: bold; }
  .note-block {
    background: #fffbea;
    border-left: 3px solid #facc15;
    padding: 8px 10px;
    margin-bottom: 10px;
    font-size: 11px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  thead th {
    background: #000;
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-size: 10px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  tbody td {
    padding: 5px 8px;
    border-bottom: 1px solid #ddd;
    vertical-align: top;
  }
  tbody tr:nth-child(even) { background: #f7f7f7; }
  td.mono { font-family: 'Courier New', monospace; }
  td.num { text-align: right; white-space: nowrap; }
  td.center { text-align: center; }
  .art-desc { font-weight: bold; }
  .art-note {
    font-size: 10px;
    color: #b45309;
    margin-top: 2px;
    font-style: italic;
  }
  .footer-info {
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #000;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #555;
  }
  .tot-articoli { font-weight: bold; }
</style>
</head>
<body>
  <h1>FERRAMENTA RATTAZZI</h1>
  <div class="subtitle">Ordine Fornitore</div>

  <div class="header-info">
    <div><span class="forn">Fornitore:</span> ${escapeHtml(fornitore.nome)}</div>
    <div><strong>Data:</strong> ${dataStr}</div>
  </div>

  ${noteHtml}

  <table>
    <thead>
      <tr>
        <th style="width:45%;">Descrizione articolo</th>
        <th style="width:15%;">Cod. Magazzino</th>
        <th style="width:15%;">Cod. Fornitore</th>
        <th style="width:12%;">Q.tà</th>
        <th style="width:13%;">UM</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer-info">
    <span class="tot-articoli">Totale articoli: ${articoli.length}</span>
    <span>Generato il ${dataStr}</span>
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:1000px;border:0;";
  iframe.srcdoc = fullHtml;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error("Errore stampa:", e);
      }
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 5000);
    }, 500);
  };
}

/* ============================================================
   🆕 STEP 4A.2 — CSV Archivio
   ============================================================ */

function scaricaCsvArchivio(archivio) {
  const articoli = Object.values(archivio.articoli || {});

  // Separatore ; per compatibilità Excel italiano
  const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;

  const rows = [];
  rows.push(["Cod.Mag", "Cod.Form", "Descrizione", "Note", "Q.tà", "UM", "Prezzo"].map(esc).join(";"));

  for (const a of articoli) {
    rows.push([
      a.code || "",
      a.supplierCode || "",
      a.description || "",
      a.note || "",
      formatQty(a.qty),
      a.unit || "",
      (Number(a.price) || 0).toFixed(2).replace(".", ",")
    ].map(esc).join(";"));
  }

  // Aggiungi nota ordine come riga finale (se presente)
  if (archivio.note) {
    rows.push("");
    rows.push([esc("Nota ordine"), esc(archivio.note)].join(";"));
  }

  const csv = "\uFEFF" + rows.join("\r\n"); // BOM per Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  const d = new Date(archivio.dataArchiviazione || Date.now());
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const fname = `${archivio.fornitoreNome || "fornitore"}_${yy}-${mm}-${dd}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   🆕 STEP 4C — Menu Modifica/Elimina esaurito
   ============================================================ */

   function openEsauritoMenu(item, x, y) {
    // Rimuovi menu esistente
    document.querySelectorAll(".esauriti-item-menu").forEach(el => el.remove());
  
    const menu = document.createElement("div");
    menu.className = "esauriti-item-menu";
    menu.innerHTML = `
      <button type="button" class="esauriti-item-menu-btn" data-menu="edit">✏️ Modifica</button>
      <button type="button" class="esauriti-item-menu-btn esauriti-item-menu-danger" data-menu="delete">🗑 Elimina</button>
    `;
    document.body.appendChild(menu);
  
    // Posiziona
    const menuW = 180;
    const menuH = menu.offsetHeight || 90;
    let mx = x + 6;
    let my = y + 6;
    if (mx + menuW > window.innerWidth - 8) mx = window.innerWidth - menuW - 8;
    if (my + menuH > window.innerHeight - 8) my = window.innerHeight - menuH - 8;
    menu.style.left = mx + "px";
    menu.style.top = my + "px";
  
    // Handler
    menu.querySelectorAll("[data-menu]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.menu;
        menu.remove();
        if (action === "edit") handleModificaEsaurito(item);
        else if (action === "delete") handleEliminaEsaurito(item);
      });
    });
  
    // Chiudi cliccando fuori
    setTimeout(() => {
      const closeMenu = (ev) => {
        if (!menu.contains(ev.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
          document.removeEventListener("touchstart", closeMenu);
        }
      };
      document.addEventListener("click", closeMenu);
      document.addEventListener("touchstart", closeMenu);
    }, 10);
  }
  
  function handleModificaEsaurito(item) {
    const fornitore = ESAURITI_FORNITORI.find(f => f.id === item.fornitoreId)
      || { id: item.fornitoreId, nome: item.fornitoreNome, colore: item.fornitoreColore };
  
    openEsauritoPopup({
      description: item.description,
      fornitore,
      initialQty: item.qty,
      initialNote: item.note,
      allowFornitoreChange: true,
      onConfirm: async (qty, note, newFornitore) => {
        try {
          if (item.source === "carrello") {
            await updateLine(item.cartId, item.lineId, {
              esauritoFornitore: newFornitore,
              esauritoQty: qty,
              esauritoNote: note
            });
          } else {
            await updateEsaurito(item.esauritoId, {
              fornitoreId: newFornitore.id,
              fornitoreNome: newFornitore.nome,
              fornitoreColore: newFornitore.colore,
              qty: qty,
              note: note
            });
          }
          toastMini("✏️ Esaurito modificato", "#22c55e");
        } catch (err) {
          console.error("Errore modifica esaurito:", err);
          toastMini("Errore modifica", "#ef4444");
        }
      }
    });
  }
  
  async function handleEliminaEsaurito(item) {
    const ok = confirm(`Rimuovere l'esaurito di "${item.description}"?`);
    if (!ok) return;
  
    try {
      if (item.source === "carrello") {
        await updateLine(item.cartId, item.lineId, {
          esauritoFornitore: null,
          esauritoQty: null,
          esauritoNote: null
        });
      } else {
        await removeEsaurito(item.esauritoId);
      }
      toastMini("🗑 Esaurito rimosso", "#ef4444");
    } catch (err) {
      console.error("Errore eliminazione esaurito:", err);
      toastMini("Errore eliminazione", "#ef4444");
    }
  }

  /* ============================================================
   🆕 Gestione fornitori: doppio click su tasto → menu
   ============================================================ */

function renderFornitoriBar(overlay) {
  const bar = overlay.querySelector(".esauriti-fornitori");
  if (!bar) return;

  // Mantieni "Tutti" e il "+", ricostruisci gli altri
  const tuttiBtn = bar.querySelector('[data-fornitore="tutti"]');
  const addBtn = bar.querySelector(".esauriti-forn-add");

  // Rimuovi i bottoni fornitori vecchi
  bar.querySelectorAll('.esauriti-forn-btn:not([data-fornitore="tutti"])').forEach(el => el.remove());

  // Inserisci i nuovi prima del "+"
  const htmlFornitori = ESAURITI_FORNITORI.map(f => `
    <button class="esauriti-forn-btn" data-fornitore="${f.id}" type="button"
            style="--forn-color:${f.colore};">
      <span class="esauriti-forn-dot" style="background:${f.colore};"></span>
      ${escapeHtml(f.nome)}
      <span class="esauriti-forn-count" data-count-forn="${f.id}">0</span>
    </button>
  `).join("");

  if (addBtn) {
    addBtn.insertAdjacentHTML("beforebegin", htmlFornitori);
  } else {
    bar.insertAdjacentHTML("beforeend", htmlFornitori);
  }

  // Ricollega i listener
  bar.querySelectorAll(".esauriti-forn-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _currentFornitore = btn.dataset.fornitore;
      overlay.querySelectorAll(".esauriti-forn-btn").forEach(b => {
        b.classList.toggle("is-active", b === btn);
      });
      updateOrderActionsVisibility();
      renderContent();
    });

    // 🆕 Doppio click / long-press → menu modifica/elimina
    if (btn.dataset.fornitore !== "tutti") {
      let suppressClick = false;
      let pressTimer = null;
      let touchMoved = false;

      btn.addEventListener("click", (e) => {
        if (suppressClick) { suppressClick = false; return; }
      });

      btn.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = true;
        const f = ESAURITI_FORNITORI.find(x => x.id === btn.dataset.fornitore);
        if (f) openFornitoreMenu(f, e.clientX, e.clientY, overlay);
        setTimeout(() => { suppressClick = false; }, 400);
      });

      btn.addEventListener("touchstart", (e) => {
        touchMoved = false;
        const touch = e.touches[0];
        pressTimer = setTimeout(() => {
          if (touchMoved) return;
          suppressClick = true;
          const f = ESAURITI_FORNITORI.find(x => x.id === btn.dataset.fornitore);
          if (f) openFornitoreMenu(f, touch.clientX, touch.clientY, overlay);
          setTimeout(() => { suppressClick = false; }, 400);
        }, 500);
      }, { passive: true });

      btn.addEventListener("touchmove", () => {
        touchMoved = true;
        clearTimeout(pressTimer);
      }, { passive: true });

      btn.addEventListener("touchend", () => clearTimeout(pressTimer));
      btn.addEventListener("touchcancel", () => clearTimeout(pressTimer));
    }
  });

  // Aggiorna contatori
  updateFornitoriCounts();
}

function openFornitoreMenu(fornitore, x, y, overlay) {
  document.querySelectorAll(".esauriti-item-menu").forEach(el => el.remove());

  const menu = document.createElement("div");
  menu.className = "esauriti-item-menu";
  menu.innerHTML = `
    <button type="button" class="esauriti-item-menu-btn" data-menu="edit-forn">✏️ Modifica fornitore</button>
    <button type="button" class="esauriti-item-menu-btn esauriti-item-menu-danger" data-menu="delete-forn">🗑 Elimina fornitore</button>
  `;
  document.body.appendChild(menu);

  const menuW = 200;
  const menuH = menu.offsetHeight || 90;
  let mx = x + 6;
  let my = y + 6;
  if (mx + menuW > window.innerWidth - 8) mx = window.innerWidth - menuW - 8;
  if (my + menuH > window.innerHeight - 8) my = window.innerHeight - menuH - 8;
  menu.style.left = mx + "px";
  menu.style.top = my + "px";

  menu.querySelectorAll("[data-menu]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.menu;
      menu.remove();
      if (action === "edit-forn") openEditFornitorePopup(fornitore, overlay);
      else if (action === "delete-forn") handleEliminaFornitore(fornitore, overlay);
    });
  });

  setTimeout(() => {
    const closeMenu = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
        document.removeEventListener("touchstart", closeMenu);
      }
    };
    document.addEventListener("click", closeMenu);
    document.addEventListener("touchstart", closeMenu);
  }, 10);
}

function openEditFornitorePopup(fornitore, overlay) {
  const popup = document.createElement("div");
  popup.className = "fapp-modal-overlay";
  popup.innerHTML = `
    <div class="fapp-modal-box forn-popup">
      <div class="forn-popup-header">✏️ Modifica fornitore</div>
      <div class="forn-popup-body">
        <label class="forn-popup-field">
          <span>Nome</span>
          <input type="text" id="fornNome" value="${escapeHtml(fornitore.nome)}" maxlength="30">
        </label>
        <label class="forn-popup-field">
          <span>Colore</span>
          <div class="forn-popup-color-row">
            <input type="color" id="fornColore" value="${fornitore.colore}">
            <span id="fornColoreLabel">${fornitore.colore}</span>
          </div>
        </label>
      </div>
      <div class="forn-popup-actions">
        <button class="btn btn-outline" id="fornCancel" type="button">Annulla</button>
        <button class="btn btn-primary" id="fornSave" type="button">Salva</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  const close = () => popup.remove();
  popup.addEventListener("click", (e) => { if (e.target === popup) close(); });
  popup.querySelector("#fornCancel").addEventListener("click", close);

  const colorInput = popup.querySelector("#fornColore");
  const colorLabel = popup.querySelector("#fornColoreLabel");
  colorInput.addEventListener("input", () => {
    colorLabel.textContent = colorInput.value;
  });

  popup.querySelector("#fornSave").addEventListener("click", async () => {
    const nome = popup.querySelector("#fornNome").value.trim();
    const colore = popup.querySelector("#fornColore").value;
    if (!nome) { toastMini("Nome richiesto", "#ef4444"); return; }

    try {
      const updated = { id: fornitore.id, nome, colore };
      await saveFornitore(updated);
      pushFornitoreLocale(updated);
      close();
      renderFornitoriBar(overlay);
      toastMini("✏️ Fornitore aggiornato", "#22c55e");
    } catch (err) {
      console.error("Errore salvataggio fornitore:", err);
      toastMini("Errore salvataggio", "#ef4444");
    }
  });
}

async function handleEliminaFornitore(fornitore, overlay) {
  // Blocca se ci sono esauriti attivi
  const items = collectEsauriti().filter(it => it.fornitoreId === fornitore.id);
  if (items.length > 0) {
    toastMini(`⚠️ ${items.length} esauriti attivi. Archiviali prima.`, "#ef4444");
    return;
  }

  const ok = confirm(`Eliminare il fornitore "${fornitore.nome}"?`);
  if (!ok) return;

  try {
    await removeFornitore(fornitore.id);
    removeFornitoreLocale(fornitore.id);

    // Se era selezionato, torna a "tutti"
    if (_currentFornitore === fornitore.id) {
      _currentFornitore = "tutti";
    }
    renderFornitoriBar(overlay);
    // Rimetti "tutti" attivo
    const tuttiBtn = overlay.querySelector('[data-fornitore="tutti"]');
    if (tuttiBtn) {
      overlay.querySelectorAll(".esauriti-forn-btn").forEach(b => b.classList.remove("is-active"));
      tuttiBtn.classList.add("is-active");
    }
    updateOrderActionsVisibility();
    renderContent();
    toastMini("🗑 Fornitore eliminato", "#ef4444");
  } catch (err) {
    console.error("Errore eliminazione fornitore:", err);
    toastMini("Errore eliminazione", "#ef4444");
  }
}

/* ============================================================
   🆕 STEP 4D — Ricerca estesa agli archivi
   ============================================================ */

/**
 * Cerca la query negli archivi completi.
 * Cerca in: fornitore, note, e negli articoli (code, description, supplierCode).
 * Ritorna max 20 archivi.
 */
function searchInArchives(query) {
  if (!query || !_tuttiArchivi.length) return [];
  const q = query.toLowerCase();
  const results = [];

  for (const arch of _tuttiArchivi) {
    // Match su fornitore / note
    const forn = String(arch.fornitoreNome || "").toLowerCase();
    const note = String(arch.note || "").toLowerCase();
    let matched = forn.includes(q) || note.includes(q);
    const matchedArticles = [];

    // Match sugli articoli — traccia QUALI hanno fatto match
    const articoli = Object.values(arch.articoli || {});
    for (const a of articoli) {
      const code = String(a.code || "").toLowerCase();
      const desc = String(a.description || "").toLowerCase();
      const sup = String(a.supplierCode || "").toLowerCase();
      if (code.includes(q) || desc.includes(q) || sup.includes(q)) {
        matched = true;
        matchedArticles.push(a);
      }
    }

    if (matched) {
      results.push({
        ...arch,
        _matchedArticles: matchedArticles   // 🆕 quali articoli hanno matchato
      });
      if (results.length >= 20) break;
    }
  }

  return results;
}

/**
 * Renderizza la sezione "Dall'archivio" con i risultati.
 */
function renderArchivioResults(archives) {
  const rows = archives.map(a => {
    const d = new Date(a.dataArchiviazione || 0);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const dataStr = `${yy}-${mm}-${dd}`;

    // 🆕 Anteprima articoli che hanno fatto match
    const matched = a._matchedArticles || [];
    let preview = "";
    if (matched.length > 0) {
      const first = matched.slice(0, 2).map(x => x.description || "").join(", ");
      const rest = matched.length > 2 ? `, +${matched.length - 2}` : "";
      preview = `<div class="esauriti-arch-preview">${escapeHtml(first + rest)}</div>`;
    } else if (a.note) {
      preview = `<div class="esauriti-arch-preview esauriti-arch-note">📝 ${escapeHtml(a.note)}</div>`;
    }

    return `
      <div class="esauriti-arch-result" data-archive-id="${escapeHtml(a.id)}">
        <div class="esauriti-arch-row-main">
          <span class="esauriti-storico-data">${dataStr}</span>
          <span class="esauriti-storico-sep">—</span>
          <span class="esauriti-storico-forn">
            <span class="esauriti-storico-dot" style="background:${escapeHtml(a.fornitoreColore || "#888")};"></span>
            ${escapeHtml(a.fornitoreNome || "")}
          </span>
          <span class="esauriti-storico-count">${a.articoliCount || 0} art.</span>
        </div>
        ${preview}
      </div>
    `;
  }).join("");

  return `
    <div class="esauriti-arch-section">
      <div class="esauriti-arch-title">📚 DALL'ARCHIVIO (${archives.length})</div>
      <div class="esauriti-arch-list">${rows}</div>
    </div>
  `;
}

/* ============================================================
   🆕 Aggiungi fornitore col tasto "+"
   ============================================================ */

function openAddFornitorePopup(overlay) {
  const popup = document.createElement("div");
  popup.className = "fapp-modal-overlay";
  popup.innerHTML = `
    <div class="fapp-modal-box forn-popup">
      <div class="forn-popup-header">➕ Nuovo fornitore</div>
      <div class="forn-popup-body">
        <label class="forn-popup-field">
          <span>ID (solo lettere minuscole, no spazi)</span>
          <input type="text" id="fornNewId" placeholder="es. bricoman" maxlength="20">
        </label>
        <label class="forn-popup-field">
          <span>Nome visualizzato</span>
          <input type="text" id="fornNewNome" placeholder="es. Bricoman" maxlength="30">
        </label>
        <label class="forn-popup-field">
          <span>Colore</span>
          <div class="forn-popup-color-row">
            <input type="color" id="fornNewColore" value="#3b82f6">
            <span id="fornNewColoreLabel">#3b82f6</span>
          </div>
        </label>
      </div>
      <div class="forn-popup-actions">
        <button class="btn btn-outline" id="fornNewCancel" type="button">Annulla</button>
        <button class="btn btn-primary" id="fornNewSave" type="button">Aggiungi</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  const close = () => popup.remove();
  popup.addEventListener("click", (e) => { if (e.target === popup) close(); });
  popup.querySelector("#fornNewCancel").addEventListener("click", close);

  const colorInput = popup.querySelector("#fornNewColore");
  const colorLabel = popup.querySelector("#fornNewColoreLabel");
  colorInput.addEventListener("input", () => {
    colorLabel.textContent = colorInput.value;
  });

  popup.querySelector("#fornNewSave").addEventListener("click", async () => {
    const id = popup.querySelector("#fornNewId").value.trim().toLowerCase().replace(/\s+/g, "");
    const nome = popup.querySelector("#fornNewNome").value.trim();
    const colore = popup.querySelector("#fornNewColore").value;

    if (!id || !/^[a-z0-9_-]+$/.test(id)) {
      toastMini("ID non valido", "#ef4444");
      return;
    }
    if (!nome) { toastMini("Nome richiesto", "#ef4444"); return; }
    if (ESAURITI_FORNITORI.find(f => f.id === id)) {
      toastMini("ID già esistente", "#ef4444");
      return;
    }

    try {
      const nuovo = { id, nome, colore };
      await saveFornitore(nuovo);
      pushFornitoreLocale(nuovo);
      close();
      renderFornitoriBar(overlay);
      toastMini("➕ Fornitore aggiunto", "#22c55e");
    } catch (err) {
      console.error("Errore aggiunta fornitore:", err);
      toastMini("Errore aggiunta", "#ef4444");
    }
  });
}