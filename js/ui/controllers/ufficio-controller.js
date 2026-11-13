/* ============================================
   UFFICIO-CONTROLLER.JS
   Logica dell'Ufficio (Cassa).
   Blocco 3.4/3.5 — Modifica ordini
   ============================================ */

 /* ============================================
   IMPORTS
   ============================================ */
import { runAutoArchive } from "../../data/archive-repository.js";
import { renderOrders } from "../views/ufficio-view.js";

import {
  listenAllCarts,
  updateStatus,
  updateLine,
  updateTotals,
  markCartAsModified,
  writeSeenBy,
  getOrderTimestamp,
  addLine, // 🆕 Aggiunto per il tasto Aggiungi Articolo
  deleteLine,
  updateClient,
  updateNote,
  createCart,
  generateOrderCode
} from "../../data/cart-repository.js";

import {
  trashCart, listenTrashCarts, restoreCart, deleteCartPermanently,
  runScheduledCleanup
} from "../../data/trash-repository.js";

import { generateInvoiceNumber, saveInvoiceToCart, peekNextInvoiceNumber, setNextInvoiceNumber } from "../../data/invoice-repository.js";
import { getClientByKey } from "../../data/client-repository.js";

// 🆕 Aggiunto searchArticles per la ricerca intelligente
import { ensureArticlesLoaded, getArticleFromCache, updateArticleInCache, searchArticles } from "../../domain/article-service.js";
// 🆕 Aggiunti newLineId e createLineFromArticle per creare la riga
import { computeLine, computeTotals, newLineId, createLineFromArticle } from "../../domain/cart-service.js";

import { openKeypad } from "../components/keypad.js";
import { openClientPicker } from "../components/client-picker.js";
import { ProductCard } from "../components/product-card.js";
import { openInvoiceModal } from "../components/invoice-modal.js";
import { openInvoiceNumberModal } from "../components/invoice-number-modal.js";
import { printInvoice } from "../components/print-invoice.js";
import { printDDT } from "../components/print-ddt.js";
import { openFornitoriModal } from "../components/fornitori-modal.js";
// 🆕 Aggiunto per la tendina del tasto 🛒
import { openFornitoriTendina, openEsauritoPopup } from "../components/esauriti-helpers.js";

import { showOfficeToast, requestNotificationPermission } from "../../core/notify.js";

let _user = null;
let _orders = [];

   let _activeFilter = "nuovi";
   let _activeDay = null;           // "YYYY-MM-DD" o null = "Tutti"
   let _dayDetailOpen = null;       // "YYYY-MM-DD" del giorno con dettaglio aperto
   let _searchQuery = "";
   let _collapsed = false;
   let _unsubListener = null;
   let _unsubTrash = null;
   let _trashCarts = [];
   let _notifiedOrders = new Map();   // "cartId|status" → timestamp
   let _firstLoadDone = false;        // evita la raffica al primo caricamento
   let _editingNoteCarts = new Set(); // 🆕 cartId con nota in edit mode
   let _dayPickerKey = null;   // 🆕 dayKey del bottone con tendina settimane aperta
   let _dayPickerHandlers = null;
let _pendingRefresh = false;       // 🛡️ refresh rinviato (nota in edit)
let _currentWeekOffset = 0; // 🆕 0 = settimana corrente, 1 = scorsa, ecc.
let _openActionsLinesUff = new Set(); // 🆕 Righe con barra azioni aperta
let _calCurrentDate = new Date(); // Per gestire il mese visualizzato
   
   /* ============================================
      INIT
      ============================================ */
   
   export async function initUfficioController(user) {
    _user = user;
    runAutoArchive();

    // 🆕 Imposta di default il giorno attivo = OGGI
    _activeDay = dayKeyFromTs(Date.now());
   
     const userEl = document.getElementById("uffUser");
     if (userEl) userEl.textContent = _user.name;
   
     // Wire tab filtri
     document.querySelectorAll(".uff-tab").forEach((tab) => {
       tab.addEventListener("click", () => {
         document.querySelectorAll(".uff-tab").forEach((t) => t.classList.remove("is-active"));
         tab.classList.add("is-active");
         _activeFilter = tab.dataset.filter;
         refresh();
       });
     });
   
     // Wire ricerca
     const searchInput = document.getElementById("uffSearch");
     if (searchInput) {
       let debounce = null;
       searchInput.addEventListener("input", () => {
         clearTimeout(debounce);
         debounce = setTimeout(() => {
           _searchQuery = searchInput.value.trim().toLowerCase();
           refresh();
         }, 150);
       });
     }
   
     // Wire toggle espansione
     const toggleBtn = document.getElementById("uffToggleExpand");
     if (toggleBtn) {
       toggleBtn.addEventListener("click", () => {
         _collapsed = !_collapsed;
         updateToggleIcon();
         refresh();
       });
       updateToggleIcon();
     }
   
          // 🆕 Precarica articoli in cache (per i pallini stato prezzo)
          ensureArticlesLoaded()
          .then(() => {
            console.log("📚 Cache articoli pronta (ufficio)");
            refresh();  // ridisegna con i pallini
          })
          .catch(err => {
            console.error("Errore caricamento articoli:", err);
          });

         // 🆕 Tasto Fornitori
         const btnForn = document.getElementById("btnFornitori");
         if (btnForn && !btnForn._hasFornitoriListener) {
           btnForn._hasFornitoriListener = true;
           btnForn.addEventListener("click", () => openFornitoriModal());
           console.log("✅ Pulsante FORNITORI collegato (ufficio)");
         }

         // 🆕 Tasto F: impostazioni bolla
         const btnF = document.getElementById("btnInvoiceNumber");
         if (btnF && !btnF._hasFListener) {
           btnF._hasFListener = true;
           btnF.addEventListener("click", () => {
             openInvoiceNumberModal();
           });
         }

         // 🆕 Blocco 8 — Cestino ufficio
         wireTrashUfficio();
         startTrashListener();
         runScheduledCleanup();
         wireNewOrderButton();
         // 🆕 Inizializza il calendario
         wireCalendarUfficio();

         // 🔔 Blocco 4 — chiedi permesso notifiche al primo click
         document.addEventListener("click", async () => {
           await requestNotificationPermission();
         }, { once: true });
    
         // Ascolta Firebase
         if (_unsubListener) _unsubListener();
         _unsubListener = listenAllCarts((carts) => {
      _orders = carts.map((c) => {
        const meta = c.meta || {};
        return {
          id: c.id,
          status: meta.status || "modifica",
          clientName: meta.clientName || "Cliente 1",
          createdByName: meta.createdByName || "—",
          createdAt: getOrderTimestamp(meta),
          lineCount: meta.lineCount || 0,
          grandTotal: (meta.totals && meta.totals.grandTotal) || 0,
          isLocked: meta.isLocked || false,
          wasModified: meta.wasModified || false,
          orderNumber: meta.orderNumber || null,
          orderCode: meta.orderCode || null,
          note: meta.note || "",
          // 🆕 Blocco 7 — fatturazione
          invoiceNumber: meta.invoiceNumber || null,
          invoiceDate: meta.invoiceDate || 0,
          clientId: meta.clientId || null,
          // 🆕 Blocco 4 — occhio
          seenBy: meta.seenBy || null,
          lines: c.lines || {},
        };
      });
   
      console.log(`📥 Ricevuti ${_orders.length} ordini da Firebase`);

      // 🔔 Blocco 4 — notifica i nuovi ordini da altri utenti
      _maybeNotifyNewOrders(carts);

      // 🛡️ ANTI-FALSO-BLUR: se una nota è in edit mode,
      // NON fare refresh ora (altrimenti la textarea verrebbe
      // distrutta e l'utente perderebbe focus + testo).
      // Il refresh verrà fatto quando l'edit mode si chiude.
      if (_editingNoteCarts.size > 0) {
        _pendingRefresh = true;
        console.log("⏸ Refresh rinviato (nota in edit mode)");
        return;
      }

      refresh();
    });
   
     console.log("🏢 Ufficio controller attivo (Blocco 3.4/3.5)");
   }
   
   /* ============================================
      TOGGLE ICON
      ============================================ */
   
   function updateToggleIcon() {
     const icon = document.getElementById("uffToggleIcon");
     const btn = document.getElementById("uffToggleExpand");
     if (icon) icon.textContent = _collapsed ? "📕" : "📖";
     if (btn) btn.title = _collapsed ? "Espandi tutti" : "Comprimi tutti";
   }
   
   /* ============================================
      REFRESH
      ============================================ */
   
      function refresh() {
        const filtered = filterOrders(_orders);
        const enriched = enrichWithArticles(filtered);
        updateCounts(_orders);
        renderDaysBar();             // 🆕 barra giorni
        renderOrders(enriched, _collapsed);
        wireOrderActions();
        wireNoteInputs();
      }

            /* 🆕 Barra giorni */
            function renderDaysBar() {
              const nav = document.getElementById("uffDays");
              if (!nav) return;
      
              const visibleOrders = _orders.filter((o) => o.status !== "modifica");
              let tabOrders = visibleOrders;
              if (_activeFilter === "nuovi") {
                tabOrders = tabOrders.filter(o => ["bozza", "nuovo", "in_arrivo", "sbloccato"].includes(o.status));
              } else if (_activeFilter === "fatti") {
                tabOrders = tabOrders.filter(o => o.status === "fatto");
              } else if (_activeFilter === "pronto") {
                tabOrders = tabOrders.filter(o => o.status === "pronto");
              }
      
              const monday = getMondayOfWeek(_currentWeekOffset);
              const labels = ["Lun.", "Mar.", "Mer.", "Gio.", "Ven.", "Sab.", "D."];
              const todayKey = dayKeyFromTs(Date.now());
              const canSeeDetails = ["papa", "mati", "massi"].includes(_user?.id);
      
              const html = labels.map((label, i) => {
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + i);
                const dayKey = dayKeyFromTs(dayDate.getTime());
      
                const isToday  = dayKey === todayKey;
                const isActive = _activeDay === dayKey;
                const isOpen   = _dayDetailOpen === dayKey;
      
                let countHtml = "";
                if (_activeFilter !== "pronto") {
                  const count = tabOrders.filter(o => dayKeyFromTs(safeTs(o.createdAt)) === dayKey).length;
                  countHtml = count > 0 ? `<span class="uff-day-count">${count}</span>` : "";
                }
      
                // 🆕 Etichetta con indicazione settimana
                let dayLabel = label;
                if (_currentWeekOffset === 1) dayLabel = `S. ${label}`;
                else if (_currentWeekOffset > 1) dayLabel = `${_currentWeekOffset}° ${label}`;
      
                const classes = [
                  "uff-day",
                  isToday  ? "is-today"  : "",
                  isActive ? "is-active" : "",
                  isOpen   ? "is-open"   : ""
                ].filter(Boolean).join(" ");
      
                return `
                  <div class="uff-day-wrap">
                    <button class="${classes}" data-day="${dayKey}">${dayLabel}${countHtml}</button>
                  </div>
                `;
              }).join("");
      
              let detailBar = "";
              if (_activeFilter !== "pronto" && _activeDay && _dayDetailOpen && canSeeDetails) {
                const dayOrders = tabOrders.filter(o => dayKeyFromTs(o.createdAt) === _activeDay);
                const ordini = dayOrders.filter(o => !o.invoiceNumber);
                const fatture = dayOrders.filter(o => o.invoiceNumber);
                const totOrdini = ordini.reduce((s, o) => s + Number(o.grandTotal || 0), 0);
                const totFatture = fatture.reduce((s, o) => s + Number(o.grandTotal || 0), 0);
                detailBar = `
                  <div class="uff-day-detail-bar">
                    <span class="udd-ico">📊</span>
                    <span class="udd-txt">${ordini.length} ordini <strong>${formatEuroUff(totOrdini)}</strong> · ${fatture.length} fatture <strong>${formatEuroUff(totFatture)}</strong></span>
                  </div>
                `;
              }
      
              nav.innerHTML = html + detailBar;
      
              nav.querySelectorAll(".uff-day").forEach((btn) => {
                const dayKey = btn.dataset.day;
                let lastClick = 0;
      
                btn.addEventListener("click", (e) => {
                  const now = Date.now();
                  if (now - lastClick < 300) {
                    e.preventDefault();
                    e.stopPropagation();
                    openWeekPicker(btn, dayKey);
                    lastClick = 0;
                  } else {
                    lastClick = now;
                    setTimeout(() => {
                      if (lastClick === now) {
                        if (_dayPickerKey === dayKey) return;
                        onDayClick(dayKey);
                      }
                    }, 300);
                  }
                });
              });
            }
      /* 🆕 Apre la tendina con le 4 settimane scorse */
      function openWeekPicker(btn, dayKey) {
        closeWeekPicker();

        if (_dayDetailOpen) {
          _dayDetailOpen = null;
          refresh();
          btn = document.querySelector(`.uff-day[data-day="${dayKey}"]`);
          if (!btn) return;
        }

        _dayPickerKey = dayKey;

        const baseDate = new Date(dayKey + "T00:00:00");
        const items = [];

        // 🆕 Ciclo da 0 (questa settimana) fino a 4 settimane fa
        for (let w = 0; w <= 4; w++) {
          const d = new Date(baseDate);
          d.setDate(d.getDate() - (w * 7));
          const key = dayKeyFromTs(d.getTime());
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          
          let weekLabel = "";
          if (w === 0) weekLabel = "Questa sett. · ";
          else if (w === 1) weekLabel = "S. ";
          else weekLabel = `${w}° `;

          items.push({
            key,
            label: `${weekLabel}${dayLabelShort(key)} · ${dd}/${mm}`,
            weekOffset: w
          });
        }

        const picker = document.createElement("div");
        picker.className = "uff-week-picker";
        picker.innerHTML = items.map(it => `
          <div class="uff-week-picker-item" data-day="${it.key}" data-offset="${it.weekOffset}">${it.label}</div>
        `).join("");

        document.body.appendChild(picker);

        const r = btn.getBoundingClientRect();
        picker.style.left = (r.left + r.width / 2) + "px";
        picker.style.top = (r.bottom + 6) + "px";

        picker.querySelectorAll(".uff-week-picker-item").forEach(item => {
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            _activeDay = item.dataset.day;
            _currentWeekOffset = parseInt(item.dataset.offset, 10);
            _dayDetailOpen = null;
            closeWeekPicker();
            refresh();
          });
        });

        setTimeout(() => {
          _dayPickerHandlers = (e) => {
            const p = document.querySelector(".uff-week-picker");
            if (!p) return;
            if (p.contains(e.target)) return;
            closeWeekPicker();
          };
          document.addEventListener("click", _dayPickerHandlers);

          const escHandler = (e) => {
            if (e.key === "Escape") {
              closeWeekPicker();
              document.removeEventListener("keydown", escHandler);
            }
          };
          document.addEventListener("keydown", escHandler);
          picker._escHandler = escHandler;
        }, 350);
      }

      /* 🆕 Chiude la tendina settimane */
      function closeWeekPicker() {
        const picker = document.querySelector(".uff-week-picker");
        if (picker) {
          if (picker._escHandler) document.removeEventListener("keydown", picker._escHandler);
          picker.remove();
        }
        if (_dayPickerHandlers) {
          document.removeEventListener("click", _dayPickerHandlers);
          _dayPickerHandlers = null;
        }
        _dayPickerKey = null;
      }

      /* 🆕 Etichetta breve del giorno (Lun., Mar., ...) */
      function dayLabelShort(dayKey) {
        const d = new Date(dayKey + "T00:00:00");
        const names = ["Dom.", "Lun.", "Mar.", "Mer.", "Gio.", "Ven.", "Sab."];
        return names[d.getDay()];
      }

      /** 🆕 Ritorna il lunedì della settimana (offset 0 = corrente, 1 = scorsa...) */
      function getMondayOfWeek(offsetWeeks) {
        const now = new Date();
        const dow = now.getDay(); // 0=dom, 1=lun, ..., 6=sab
        const diffToMon = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon - (offsetWeeks * 7)); // 🆕 MENO invece di PIÙ
        monday.setHours(0, 0, 0, 0);
        return monday;
      }

      function onDayClick(day) {
        // Nel tab PRONTO il click sul giorno non fa nulla (i pronti si vedono tutti)
        if (_activeFilter === "pronto") return;

        const canSeeDetails = ["papa", "mati", "massi"].includes(_user?.id);

        if (_activeDay === day) {
          // 🆕 Click di nuovo sullo stesso giorno → toggle totali (solo per papa/mati/massi)
          if (canSeeDetails) {
            _dayDetailOpen = _dayDetailOpen === day ? null : day;
          }
        } else {
          // 🆕 Primo click su un nuovo giorno → filtro (settimana corrente)
          _activeDay = day;
          _dayDetailOpen = null;
        }
        refresh();
      }

      /* Formattazione euro per il riepilogo */
      function formatEuroUff(n) {
        const v = Number(n) || 0;
        return "€ " + v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      /* 🆕 Wiring textarea note ordine */
      function wireNoteInputs() {
        document.querySelectorAll(".uff-order-note-textarea").forEach((ta) => {
          if (ta._wiredNote) return;
          ta._wiredNote = true;
          const orderId = ta.dataset.orderId;

          let timer = null;
          ta.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              updateNote(orderId, ta.value);
            }, 600);
          });

          ta.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              clearTimeout(timer);
              updateNote(orderId, ta.value).then(() => {
                _editingNoteCarts.delete(orderId);
                // 🛡️ Se c'era un refresh in sospeso, fallo ora
                _pendingRefresh = false;
                refresh();
              });
            }
          });

          // 🆕 Se clicchi fuori: salva e passa in display (o torna a placeholder se vuota)
          ta.addEventListener("blur", () => {
            setTimeout(() => {
              // 🛡️ ANTI-FALSO-BLUR: se la textarea è stata rimossa dal DOM
              // (perché un re-render di Firebase l'ha ricostruita), NON chiudere
              // l'edit mode. Il "blur" è stato causato dal re-render, non dall'utente.
              if (!document.body.contains(ta)) {
                return;
              }

              clearTimeout(timer);
              updateNote(orderId, ta.value).then(() => {
                _editingNoteCarts.delete(orderId);
                // 🛡️ Se c'era un refresh in sospeso, fallo ora
                _pendingRefresh = false;
                refresh();
              });
            }, 150);
          });
        });
      }
   
      /**
       * Arricchisce ogni riga con l'articolo dal cache locale
       * (per mostrare il pallino stato prezzo).
       */
      function enrichWithArticles(orders) {
        return orders.map((o) => {
          const enrichedLines = {};
          for (const [lid, l] of Object.entries(o.lines || {})) {
            const art = l.articleId ? getArticleFromCache(l.articleId) : null;
            enrichedLines[lid] = { ...l, _article: art, _isActionsOpen: _openActionsLinesUff.has(lid) };
          }

                    // 👁️ Blocco 4 — occhio per TUTTI (anche te stesso)
                    let _eyeTooltip = "";
                    if (o.seenBy && typeof o.seenBy === "object") {
                      const seen = Object.entries(o.seenBy)
                        .filter(([, ts]) => Number(ts) > 0)
                        .sort((a, b) => Number(b[1]) - Number(a[1]));
                      if (seen.length > 0) {
                        const users = seen.map(([uid]) => uid.toUpperCase()).join(", ");
                        const lastTs = Number(seen[0][1]) || 0;
                        const d = new Date(lastTs);
                        const hh = String(d.getHours()).padStart(2, "0");
                        const mm = String(d.getMinutes()).padStart(2, "0");
                        _eyeTooltip = `Visto da ${users} · ${hh}:${mm}`;
                      }
                    }

                    return { ...o, lines: enrichedLines, _eyeTooltip, _noteEditing: _editingNoteCarts.has(o.id) };
        });
      }
   
      function filterOrders(orders) {
        let result = orders.filter((o) => o.status !== "modifica");
      
        if (_activeFilter === "nuovi") {
          result = result.filter((o) => ["bozza", "nuovo", "in_arrivo", "sbloccato"].includes(o.status));
        } else if (_activeFilter === "fatti") {
          result = result.filter((o) => o.status === "fatto");
        } else if (_activeFilter === "pronto") {
          result = result.filter((o) => o.status === "pronto");
        }
   
        // 🆕 Filtro per giorno — NON applicato al tab PRONTO
        // (i pronti si vedono sempre tutti, indipendentemente dal giorno)
        if (_activeDay && _activeFilter !== "pronto") {
          result = result.filter((o) => dayKeyFromTs(safeTs(o.createdAt)) === _activeDay);
        }
      
        if (_searchQuery) {
          const q = _searchQuery.toLowerCase();
          result = result.filter((o) => {
            // 1) Campi base (cliente, creatore, id, codice ordine, nota)
            const hay = [
              o.clientName,
              o.createdByName,
              o.id,
              o.note || "",
              o.orderCode || "",
              o.orderNumber || "",
              o.invoiceNumber || ""
            ].join(" ").toLowerCase();
  
            if (hay.includes(q)) return true;
  
            // 2) 🆕 Ricerca dentro gli articoli (codice + descrizione)
            const lines = o.lines || {};
            for (const lid in lines) {
              const l = lines[lid] || {};
              const code = String(l.code || "").toLowerCase();
              const desc = String(l.description || "").toLowerCase();
              if (code.includes(q) || desc.includes(q)) return true;
            }
  
            return false;
          });
        }
      
        return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
   
      /* 🆕 Utils giorni */
      function dayKeyFromTs(ts) {
        if (!ts) return null;
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const g = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${g}`;
      }
   
      function dayLabel(dayKey) {
        const today = dayKeyFromTs(Date.now());
        const yesterday = dayKeyFromTs(Date.now() - 24*60*60*1000);
        if (dayKey === today) return "OGGI";
        if (dayKey === yesterday) return "IERI";
        const [y, m, d] = dayKey.split("-");
        return `${d}/${m}`;
      }
   
   function updateCounts(orders) {
     const visible = orders.filter((o) => o.status !== "modifica");
     const nuovi = visible.filter((o) => ["bozza", "nuovo", "in_arrivo", "sbloccato"].includes(o.status)).length;
     const fatti = visible.filter((o) => o.status === "fatto").length;
     const pronti = visible.filter((o) => o.status === "pronto").length;
   
     const elNuovi = document.getElementById("countNuovi");
     const elFatti = document.getElementById("countFatti");
     const elTutti = document.getElementById("countTutti");
     const elPronto = document.getElementById("countPronto");
   
     if (elNuovi) elNuovi.textContent = nuovi;
     if (elFatti) elFatti.textContent = fatti;
     if (elTutti) elTutti.textContent = visible.length;
     if (elPronto) elPronto.textContent = pronti;
   }
   
   /* ============================================
      AZIONI ORDINI
      ============================================ */
   
      function wireOrderActions() {
        document.querySelectorAll("[data-action]").forEach((btn) => {
          if (btn._wired) return;
          btn._wired = true;
      
          btn.addEventListener("click", async (e) => {
           e.stopPropagation();
           const action = btn.dataset.action;
           const orderId = btn.dataset.orderId;
           const lineId = btn.dataset.lineId;
     
           try {
             if (action === "fatto") {
               if (!confirm("Segnare questo ordine come FATTO?")) return;
   
               try {
                 const { syncOrderPricesToArticles } = await import("../../data/cart-repository.js");
                 const res = await syncOrderPricesToArticles(orderId);
                 if (res.updated > 0 || res.skipped > 0) {
                   console.log(`💰 Prezzi sincronizzati: ${res.updated} aggiornati, ${res.skipped} invariati`);
                 }
                 if (res.articles && res.articles.length > 0) {
                   const now = Date.now();
                   for (const a of res.articles) {
                     updateArticleInCache(a.key, {
                       basePrice: a.price,
                       priceLastChangedAt: now,
                       priceVerified: true
                     });
                   }
                 }
               } catch (err) {
                 console.error("Errore sync prezzi:", err);
               }
   
               await updateStatus(orderId, "fatto");
               await updateLineLock(orderId, true);
               console.log(`✅ Ordine ${orderId} → fatto`);
      
             } else if (action === "toggle-actions") {
               const lineEl = btn.closest(".uff-order-line");
               const actionsEl = lineEl.querySelector(".uff-line-actions");
               if (actionsEl.hasAttribute("hidden")) {
                 actionsEl.removeAttribute("hidden");
                 _openActionsLinesUff.add(lineId);
               } else {
                 actionsEl.setAttribute("hidden", "");
                 _openActionsLinesUff.delete(lineId);
               }
             } else if (action === "forbici") {
               await cycleForbiciUfficio(orderId, lineId);
             } else if (action === "return") {
               const order = _orders.find((o) => o.id === orderId);
               const line = order?.lines[lineId];
               if (!line) return;
               const confirmMsg = line.isReturn ? "Annullare il reso per questo articolo?" : "Questo articolo è un reso?";
               if (!confirm(confirmMsg)) return;
   
               const updated = computeLine({ ...line, isReturn: !line.isReturn });
               writeSeenBy(orderId, _user.id);
               await updateLine(orderId, lineId, {
                 isReturn: updated.isReturn,
                 lineTotal: updated.lineTotal,
                 discountAmount: updated.discountAmount
               });
               await recomputeAndSaveTotals(order, lineId, updated);
               await markCartAsModified(orderId);
             } else if (action === "note") {
               const order = _orders.find((o) => o.id === orderId);
               const line = order?.lines[lineId];
               if (!line) return;
               
               const note = prompt("Nota per questa riga:", line.note || "");
               if (note === null) return;
               
               writeSeenBy(orderId, _user.id);
               await updateLine(orderId, lineId, { note });
               await recomputeAndSaveTotals(order, lineId, { ...line, note });
               await markCartAsModified(orderId);
             } else if (action === "order") {
               const order = _orders.find((o) => o.id === orderId);
               const line = order?.lines[lineId];
               if (!line) return;
   
               openFornitoriTendina(btn, (fornitore) => {
                 openEsauritoPopup({
                   description: line.description,
                   fornitore,
                   initialQty: line.esauritoQty ?? 0,
                   initialNote: line.esauritoNote || "",
                   onConfirm: async (qty, note) => {
                     await updateLine(orderId, lineId, {
                       esauritoFornitore: fornitore,
                       esauritoQty: qty,
                       esauritoNote: note
                     });
                     showToastUff(`📦 Esaurito · ${fornitore.nome}`);
                   }
                 });
               });
             } else if (action === "delete") {
               const order = _orders.find((o) => o.id === orderId);
               const line = order?.lines[lineId];
               if (!line) return;
   
               if (!confirm(`Eliminare "${line.description}" dall'ordine?`)) return;
   
               writeSeenBy(orderId, _user.id);
               await deleteLine(orderId, lineId);
   
               if (order) {
                 const updatedLines = { ...order.lines };
                 delete updatedLines[lineId];
                 const allLines = Object.entries(updatedLines).map(([id, l]) => ({ id, ...l }));
                 const totals = computeTotals(allLines);
                 await updateTotals(orderId, totals);
               }
   
               await markCartAsModified(orderId);
               showToastUff(`🗑 Articolo eliminato`);
   
             } else if (action === "discount" || action === "edit-discount") {
               await editLineDiscount(orderId, lineId);
             } else if (action === "pronto") {
                await updateStatus(orderId, "pronto");
                console.log(`📋 Ordine ${orderId} → pronto`);
               } else if (action === "unlock") {
                 if (!confirm("Sbloccare l'ordine per modificarlo?")) return;
                 await updateStatus(orderId, "sbloccato");
                 await updateLineLock(orderId, false);
                 console.log(`🔓 Ordine ${orderId} sbloccato`);
               
                 _activeFilter = "nuovi";
                 document.querySelectorAll(".uff-tab").forEach((t) => {
                   t.classList.toggle("is-active", t.dataset.filter === "nuovi");
                 });
                 refresh();
               
                 setTimeout(() => {
                   const el = document.querySelector(`[data-order-id="${orderId}"]`);
                   if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                 }, 150);
               } else if (action === "stampa") {
                 const { openPrintOrdersModal } = await import("../components/print-orders-modal.js");
                 const filtered = filterOrders(_orders);
   
                 const ordersOnly = filtered.filter(o => !o.invoiceNumber);
   
                 const filterLabels = {
                   nuovi: "🟡 NUOVI",
                   fatti: "🟢 FATTI",
                   tutti: "📋 TUTTI",
                   pronto: "🟣 PRONTO"
                 };
                 openPrintOrdersModal({
                   orders: ordersOnly,
                   currentOrderId: orderId,
                   filterLabel: filterLabels[_activeFilter] || _activeFilter
                 });
   
               } else if (action === "bol") {
                 const order = _orders.find((o) => o.id === orderId);
                 if (!order) return;
   
                 const pick = await openClientPicker({
                   currentClientName: order.clientName || "Cliente 1"
                 });
   
                 if (!pick) return;
   
                 if (pick.clientKey) {
                   try { await updateClient(orderId, pick.clientKey, pick.name); }
                   catch (e) { console.error(e); }
                 }
   
                 const preview = await peekNextInvoiceNumber();
                 const ok = confirm(
                   "Creare fattura per questo ordine?\n\n" +
                   "Cliente: " + pick.name + "\n" +
                   "Numero bolla: " + preview
                 );
                 if (!ok) return;
   
                 try {
                   const invoiceNumber = await generateInvoiceNumber();
                   await saveInvoiceToCart(orderId, invoiceNumber);
                   alert("✅ Fattura " + invoiceNumber + " creata!\n\nOra premi '🖨 Stampa DDT' per stamparla.");
                 } catch (err) {
                   console.error("Errore fatturazione:", err);
                   alert("Errore: " + err.message);
                 }
             } else if (action === "stampa-ddt") {
               const order = _orders.find((o) => o.id === orderId);
               if (!order || !order.invoiceNumber) return;
   
               let client = null;
               if (order.clientId) {
                 try { client = await getClientByKey(order.clientId); }
                 catch (e) { /* ignore */ }
               }
   
               printDDT({
                 cart: { meta: order, lines: order.lines },
                 invoiceNumber: order.invoiceNumber,
                 client: client
               });
      
             } else if (action === "elimina") {
               if (!confirm("Spostare questo ordine nel cestino?")) return;
               try {
                 await trashCart(orderId, "ufficio", _user);
                 console.log(`🗑 Ordine ${orderId} cestinato (ufficio)`);
               } catch (err) {
                 console.error("Errore cestinamento:", err);
                 alert("Errore: " + err.message);
               }
   
             // 🆕 NUOVO BLOCCO AZIONI (pulito)
             } else if (action === "add-article") {
               openAddArticleModal(orderId);
             } else if (action === "edit-price") {
               await editLinePrice(orderId, lineId);
             } else if (action === "edit-qty") {
               await editLineQty(orderId, lineId);
             } else if (action === "product-card") {
               const code = btn.dataset.articleCode;
               if (!code) return;
               ProductCard.open({
                 articleCode: code,
                 onSaved: () => {
                   // niente da fare
                 }
               });
             } else if (action === "copy-code") {
               const code = btn.dataset.code || "";
               if (!code) return;
               try {
                 await navigator.clipboard.writeText(code);
                 showToastUff("📋 Codice copiato: " + code);
               } catch (err) {
                 const tmp = document.createElement("textarea");
                 tmp.value = code;
                 tmp.style.position = "fixed";
                 tmp.style.opacity = "0";
                 document.body.appendChild(tmp);
                 tmp.select();
                 try { document.execCommand("copy"); } catch (e) {}
                 document.body.removeChild(tmp);
                 showToastUff("📋 Codice copiato: " + code);
               }
             } else if (action === "edit-note") {
               _editingNoteCarts.add(orderId);
               refresh();
               setTimeout(() => {
                 const ta = document.querySelector(`.uff-order-note-textarea[data-order-id="${orderId}"]`);
                 if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
               }, 30);
             }
              
            } catch (err) {
              console.error("Errore azione:", action, err);
              alert("Errore: " + err.message);
            }
          });
        });
      }
   
   /* ============================================
      MODIFICA RIGHE
      ============================================ */
   
      async function editLinePrice(orderId, lineId) {
        const order = _orders.find((o) => o.id === orderId);
        if (!order) return;
        const line = order.lines[lineId];
        if (!line) return;
   
        // Trova il bottone nel DOM
        const btn = document.querySelector(
          `[data-action="edit-price"][data-order-id="${orderId}"][data-line-id="${lineId}"]`
        );
        if (!btn || btn._editing) return;
        btn._editing = true;
   
        const currentPrice = Number(line.unitPrice ?? line.basePrice) || 0;
        const originalHTML = btn.innerHTML;
   
        // Crea input inline
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "decimal";
        input.value = String(currentPrice).replace(".", ",");
        input.className = "uff-inline-price-input";
        input.autocomplete = "off";
   
        btn.innerHTML = "";
        btn.appendChild(input);
        input.focus();
        input.select();
   
        let cancelled = false;
   
        const restore = () => {
          btn._editing = false;
          btn.innerHTML = originalHTML;
        };
   
        const commit = async () => {
          if (cancelled) { restore(); return; }
   
          const raw = String(input.value || "").replace(",", ".").trim();
          const result = parseFloat(raw);
   
          if (!Number.isFinite(result) || result < 0 || Math.abs(result - currentPrice) < 0.001) {
            restore();
            return;
          }
   
          try {
            writeSeenBy(orderId, _user.id);
   
            const updated = computeLine({ ...line, unitPrice: result });
   
            await updateLine(orderId, lineId, {
              unitPrice: updated.unitPrice,
              lineTotal: updated.lineTotal,
              discountAmount: updated.discountAmount
            });
   
            await recomputeAndSaveTotals(order, lineId, updated);
            await markCartAsModified(orderId);
   
            if (line.articleId) {
              updateArticleInCache(line.articleId, {
                basePrice: updated.unitPrice,
                priceLastChangedAt: Date.now(),
                priceVerified: true
              });
            }
   
            console.log(`✏️ Prezzo aggiornato: ${orderId}/${lineId} → €${result}`);
            // Il refresh() ricostruirà la card, quindi non serve restore()
          } catch (err) {
            console.error("Errore modifica prezzo:", err);
            restore();
          }
        };
   
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelled = true;
            input.blur();
          }
        });
      }
   
   async function editLineQty(orderId, lineId) {
    const order = _orders.find((o) => o.id === orderId);
    if (!order) return;
    const line = order.lines[lineId];
    if (!line) return;
  
    const result = await openKeypad({
      title: "Quantità",
      value: Number(line.qty) || 1,
      unit: line.unit || "PZ",
      allowDecimal: true,
      min: 0.01
    });
    if (result == null) return;

    // 👁️ Blocco 4 — modifica reale → segna come visto
    writeSeenBy(orderId, _user.id);
   
     const updated = computeLine({ ...line, qty: result });
   
     await updateLine(orderId, lineId, {
       qty: updated.qty,
       lineTotal: updated.lineTotal,
       discountAmount: updated.discountAmount
     });
   
     await recomputeAndSaveTotals(order, lineId, updated);
     await markCartAsModified(orderId);
   
     console.log(`✏️ Quantità aggiornata: ${orderId}/${lineId} → ${result}`);
   }
   
   async function editLineDiscount(orderId, lineId) {
    const order = _orders.find((o) => o.id === orderId);
    if (!order) return;
    const line = order.lines[lineId];
    if (!line) return;
  
    const currentDisc = Number(line.discountPct) || 0;
  
    const result = await openKeypad({
      title: "Sconto %",
      value: currentDisc,
      unit: "%",
      allowDecimal: true,
      min: 0,
      max: 100
    });
    if (result == null) return;

    // 👁️ Blocco 4 — modifica reale → segna come visto
    writeSeenBy(orderId, _user.id);
   
     const updated = computeLine({ ...line, discountPct: result });
   
     await updateLine(orderId, lineId, {
       discountPct: updated.discountPct,
       lineTotal: updated.lineTotal,
       discountAmount: updated.discountAmount
     });
   
     await recomputeAndSaveTotals(order, lineId, updated);
     await markCartAsModified(orderId);
   
     console.log(`✏️ Sconto aggiornato: ${orderId}/${lineId} → ${result}%`);
   }
   
   /* ============================================
      RICALCOLO TOTALI
      ============================================ */
   
   async function recomputeAndSaveTotals(order, changedLineId, updatedLine) {
     // Prendi tutte le righe, sostituisci quella cambiata con la versione aggiornata
     const allLines = Object.entries(order.lines || {}).map(([id, l]) => {
       if (id === changedLineId) return { id, ...updatedLine };
       return { id, ...l };
     });
   
     const totals = computeTotals(allLines);
     await updateTotals(order.id, totals);
   
     console.log(`📊 Totali aggiornati ordine ${order.id}: ${totals.lineCount} righe, €${totals.grandTotal}`);
   }
   
   /* ============================================
      UNLOCK
      ============================================ */
   
/* ============================================
   CICLO FORBICI UFFICIO
   ============================================ */
   async function cycleForbiciUfficio(orderId, lineId) {
    const order = _orders.find((o) => o.id === orderId);
    if (!order) return;
    const line = order.lines[lineId];
    if (!line) return;
  
    const current = line.forbiciState || "neutro";
    const orderSeq = ["neutro", "scampolo", "rotolo", "scaglionato"];
    const nextIdx = (orderSeq.indexOf(current) + 1) % orderSeq.length;
    const next = orderSeq[nextIdx];
  
    const updates = { forbiciState: next, isRemnant: false, isRoll: false, isTiered: false };
  
    if (next === "scampolo") {
      updates.isRemnant = true;
      updates.scampoloPct = 30;
      updates.discountPct = 30;
      const recalc = computeLine({ ...line, discountPct: 30 });
      updates.discountAmount = recalc.discountAmount;
      updates.lineTotal = recalc.lineTotal;
    } else if (next === "rotolo") {
      updates.isRoll = true;
      updates.discountPct = 0;
      const recalc = computeLine({ ...line, discountPct: 0 });
      updates.discountAmount = recalc.discountAmount;
      updates.lineTotal = recalc.lineTotal;
    } else if (next === "scaglionato") {
      updates.isTiered = true;
    } else {
      updates.discountPct = 0;
      const recalc = computeLine({ ...line, discountPct: 0 });
      updates.discountAmount = recalc.discountAmount;
      updates.lineTotal = recalc.lineTotal;
    }
  
    writeSeenBy(orderId, _user.id);
    await updateLine(orderId, lineId, updates);
    
    const updatedLine = { ...line, ...updates };
    await recomputeAndSaveTotals(order, lineId, updatedLine);
    await markCartAsModified(orderId);
    
    showToastUff(`✂️ ${next.toUpperCase()}`);
  }

/* ============================================
   MODALE AGGIUNGI ARTICOLO (UFFICIO)
   ============================================ */
   function openAddArticleModal(orderId) {
    const overlay = document.createElement("div");
    overlay.className = "fapp-modal-overlay";
    overlay.innerHTML = `
      <div class="fapp-modal-box add-article-modal">
        <div class="add-article-header">
          <h2>➕ Aggiungi Articolo</h2>
          <button id="closeAddArticle" class="add-article-close">&times;</button>
        </div>
        <div class="add-article-search-wrap">
          <input type="text" id="addArticleSearch" placeholder="Cerca per nome o codice..." autocomplete="off">
        </div>
        <div id="addArticleResults" class="add-article-results">
          <div class="add-article-empty">Digita per cercare un articolo...</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  
    const close = () => overlay.remove();
    overlay.querySelector("#closeAddArticle").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  
    const input = overlay.querySelector("#addArticleSearch");
    const resultsArea = overlay.querySelector("#addArticleResults");
  
    let debounce = null;
  
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      const q = input.value.trim();
      
      if (!q) {
        resultsArea.innerHTML = `<div class="add-article-empty">Digita per cercare un articolo...</div>`;
        return;
      }
  
      debounce = setTimeout(() => {
        const { results, total } = searchArticles(q, 30, 0);
  
        if (results.length === 0) {
          resultsArea.innerHTML = `<div class="add-article-empty">Nessun articolo trovato per "${escapeHtml(q)}"</div>`;
          return;
        }
  
        resultsArea.innerHTML = results.map(art => `
          <div class="add-article-item" data-key="${escapeHtml(art.key)}">
            <div class="add-article-code">${escapeHtml(art.code)} • ${escapeHtml(art.unit)}</div>
            <div class="add-article-desc">${escapeHtml(art.description)}</div>
          </div>
        `).join("");
  
        resultsArea.querySelectorAll(".add-article-item").forEach(el => {
          el.addEventListener("click", async () => {
            const articleKey = el.dataset.key;
            const article = getArticleFromCache(articleKey);
            if (!article) return;
  
            try {
              // 1. Prepara la nuova riga
              const lineId = newLineId();
              const line = computeLine(createLineFromArticle(article, _user));
  
              // 2. Salva su Firebase
              await addLine(orderId, lineId, line);
  
              // 3. Ricalcola i totali dell'ordine
              const order = _orders.find(o => o.id === orderId);
              if (order) {
                const updatedLines = { ...order.lines, [lineId]: line };
                const allLines = Object.entries(updatedLines).map(([id, l]) => ({ id, ...l }));
                const totals = computeTotals(allLines);
                await updateTotals(orderId, totals);
              }
  
              // 4. Segna come modificato
              await markCartAsModified(orderId);
              
              showToastUff(`➕ Aggiunto: ${article.description}`);
              close();
            } catch (err) {
              console.error("Errore aggiunta articolo:", err);
              showToastUff("❌ Errore durante l'aggiunta");
            }
          });
        });
      }, 200);
    });
  
    input.focus();
  }

/* ============================================
   🆕 CREAZIONE NUOVO ORDINE DA UFFICIO
   ============================================ */
   export function wireNewOrderButton() {
    const btn = document.getElementById("btnNewOrderUfficio");
    if (!btn || btn._hasListener) return;
    btn._hasListener = true;
    btn.addEventListener("click", openNewOrderSearchModal);
  }
  
  function openNewOrderSearchModal() {
    const overlay = document.createElement("div");
    overlay.className = "fapp-modal-overlay";
    overlay.innerHTML = `
      <div class="fapp-modal-box add-article-modal">
        <div class="add-article-header">
          <h2>➕ Nuovo Ordine</h2>
          <button id="closeNewOrder" class="add-article-close">&times;</button>
        </div>
        <div class="add-article-search-wrap">
          <input type="text" id="newOrderSearch" placeholder="Cerca articolo per codice o nome..." autocomplete="off">
        </div>
        <div id="newOrderResults" class="add-article-results">
          <div class="add-article-empty">Digita per cercare il primo articolo dell'ordine...</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  
    const close = () => overlay.remove();
    overlay.querySelector("#closeNewOrder").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  
    const input = overlay.querySelector("#newOrderSearch");
    const resultsArea = overlay.querySelector("#newOrderResults");
  
    let debounce = null;
  
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      const q = input.value.trim();
      
      if (!q) {
        resultsArea.innerHTML = `<div class="add-article-empty">Digita per cercare il primo articolo dell'ordine...</div>`;
        return;
      }
  
      debounce = setTimeout(() => {
        const { results } = searchArticles(q, 30, 0);
  
        if (results.length === 0) {
          resultsArea.innerHTML = `<div class="add-article-empty">Nessun articolo trovato per "${escapeHtml(q)}"</div>`;
          return;
        }
  
        resultsArea.innerHTML = results.map(art => `
          <div class="add-article-item" data-key="${escapeHtml(art.key)}">
            <div class="add-article-code">${escapeHtml(art.code)} • ${escapeHtml(art.unit)}</div>
            <div class="add-article-desc">${escapeHtml(art.description)}</div>
          </div>
        `).join("");
  
        resultsArea.querySelectorAll(".add-article-item").forEach(el => {
          el.addEventListener("click", async () => {
            const articleKey = el.dataset.key;
            const article = getArticleFromCache(articleKey);
            if (!article) return;
  
            // Mostra un feedback visivo
            resultsArea.innerHTML = `<div class="add-article-empty" style="color:#facc15;">Creazione ordine in corso...</div>`;
  
            try {
              // 1. Crea un carrello vuoto (Cliente 1 di default)
              const newCartId = await createCart(_user, null, "Cliente 1");
  
              // 2. Prepara la riga
              const lineId = newLineId();
              const line = computeLine(createLineFromArticle(article, _user));
  
              // 3. Aggiungi la riga al carrello
              await addLine(newCartId, lineId, line);
  
              // 4. Calcola e salva i totali
              const totals = computeTotals([{ id: lineId, ...line }]);
              await updateTotals(newCartId, totals);
  
              // 5. Imposta lo stato su "nuovo" (come se avessi premuto CONFERMA in banco)
              await updateStatus(newCartId, "nuovo");
  
              // 6. Genera il codice ordine (#N - L)
              await generateOrderCode(newCartId);
  
              // 7. Chiudi modale, mostra messaggio e aggiorna la lista
              close();
              showToastUff(`✅ Nuovo Ordine creato con: ${article.description}`);
              
              // Ricarica la vista per far apparire il nuovo ordine in cima
              _activeFilter = "nuovi";
              document.querySelectorAll(".uff-tab").forEach((t) => {
                t.classList.toggle("is-active", t.dataset.filter === "nuovi");
              });
              refresh();
  
            } catch (err) {
              console.error("Errore creazione nuovo ordine:", err);
              showToastUff("❌ Errore durante la creazione dell'ordine");
              close();
            }
          });
        });
      }, 200);
    });
  
    input.focus();
  }

   async function updateLineLock(orderId, isLocked) {
     // Aggiorna isLocked direttamente nel meta
     const { db, ref, update } = await import("../../core/firebase-init.js");
     await update(ref(db, `activeCarts/${orderId}/meta`), {
       isLocked: isLocked,
       updatedAt: Date.now()
     });
   }
   /* ============================================
   CESTINO (Blocco 8) — Ufficio
   ============================================ */

function startTrashListener() {
  if (_unsubTrash) _unsubTrash();
  _unsubTrash = listenTrashCarts((carts) => {
    _trashCarts = carts || [];
    updateTrashCount();
    if (!document.getElementById("uffTrashOverlay")?.hasAttribute("hidden")) {
      renderTrashUfficio();
    }
  });
}

function updateTrashCount() {
  const el = document.getElementById("countCestinoUff");
  if (el) el.textContent = String(_trashCarts.length);
}

function wireTrashUfficio() {
  const btn = document.getElementById("btnTrashUfficio");
  const overlay = document.getElementById("uffTrashOverlay");
  const closeBtn = document.getElementById("uffTrashClose");
  if (!btn || !overlay) return;

  if (!btn._hasListener) {
    btn._hasListener = true;
    btn.addEventListener("click", () => {
      renderTrashUfficio();
      overlay.removeAttribute("hidden");
    });
  }
  if (closeBtn && !closeBtn._hasListener) {
    closeBtn._hasListener = true;
    closeBtn.addEventListener("click", () => overlay.setAttribute("hidden", ""));
  }
  if (!overlay._hasBgListener) {
    overlay._hasBgListener = true;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.setAttribute("hidden", "");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") overlay.setAttribute("hidden", "");
    });
  }
}

function renderTrashUfficio() {
  const list = document.getElementById("uffTrashList");
  const cnt = document.getElementById("uffTrashCount");
  if (cnt) cnt.textContent = String(_trashCarts.length);
  if (!list) return;

  if (_trashCarts.length === 0) {
    list.innerHTML = `<div class="banco-order-line-empty">Cestino vuoto</div>`;
    return;
  }

  list.innerHTML = _trashCarts.map((c) => {
    const meta = c.meta || {};
    const lines = Object.entries(c.lines || {});
    let name;
    if (meta.invoiceNumber) {
      const cp = (meta.clientName && meta.clientName !== "Cliente 1") ? ` · ${meta.clientName}` : "";
      name = `Fattura ${meta.invoiceNumber}${cp}`;
    } else if (meta.orderNumber && meta.orderCode) {
      name = `Ordine #${meta.orderNumber} - ${meta.orderCode}`;
    } else {
      name = meta.clientName || "Cliente 1";
    }
    const time = formatTimeHHMM(c.trashedAt);
    const total = formatEuro(meta.totals?.grandTotal || 0);
    const src = c.source === "ufficio" ? "🏢" : "🏭";
    const who = c.trashedBy?.name || "—";

    return `
      <div class="banco-order-line" data-trash-id="${c.id}" style="flex-wrap:wrap;align-items:center;">
        <div class="desc" style="flex:1;min-width:160px;">
          <div class="name">${escapeHtml(name)}</div>
          <div class="code">${src} ${escapeHtml(who)} · ${time} · ${lines.length} art.</div>
        </div>
        <span class="total" style="min-width:80px;text-align:right;">${total}</span>
        <button class="btn btn-success" data-trash-action="restore" data-trash-id="${c.id}" style="margin-left:8px;">♻️ Ripristina</button>
        <button class="btn btn-danger" data-trash-action="delete" data-trash-id="${c.id}" style="margin-left:4px;">❌ Elimina</button>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-trash-action]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const cartId = btn.dataset.trashId;
      const action = btn.dataset.trashAction;
      if (action === "restore") {
        if (!confirm("Ripristinare questo ordine? Tornerà in stato 'modifica'.")) return;
        try {
          await restoreCart(cartId);
          showToastUff("♻️ Ordine ripristinato");
        } catch (err) { console.error(err); showToastUff("Errore ripristino"); }
      } else if (action === "delete") {
        if (!confirm("Eliminare DEFINITIVAMENTE questo ordine? Irreversibile!")) return;
        try {
          await deleteCartPermanently(cartId);
          showToastUff("❌ Eliminato definitivamente");
        } catch (err) { console.error(err); showToastUff("Errore eliminazione"); }
      }
    });
  });
}

function formatTimeHHMM(ms) {
  if (!ms) return "--:--";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatEuro(n) {
  const v = Number(n) || 0;
  return "€ " + v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function showToastUff(msg) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = "toast toast-success";
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

/* ============================================
   🔔 BLOCCO 4 — NOTIFICHE NUOVI ORDINI
   ============================================ */

   function _maybeNotifyNewOrders(carts) {
    const notifyStatuses = ["nuovo", "bozza", "in_arrivo"];
    const now = Date.now();
  
    // Primo caricamento: marca tutto come "già notificato" senza toast
    if (!_firstLoadDone) {
      for (const c of carts || []) {
        const st = c.meta?.status || "modifica";
        if (notifyStatuses.includes(st)) {
          _notifiedOrders.set(`${c.id}|${st}`, now);
        }
      }
      _firstLoadDone = true;
      return;
    }
  
    // Caricamenti successivi: notifica solo i NUOVI o cambiati di stato
    for (const c of carts || []) {
      const meta = c.meta || {};
      const st = meta.status || "modifica";
      if (!notifyStatuses.includes(st)) continue;
      // Non notificare i miei
      if (meta.createdBy === _user.id) continue;
  
      const key = `${c.id}|${st}`;
      if (_notifiedOrders.has(key)) continue;
      _notifiedOrders.set(key, now);
  
    // Prepara il testo della notifica
    const lineEntries = Object.entries(c.lines || {}).map(([_, l]) => l);
    let body = "";
    if (lineEntries.length === 0) {
      body = "Nessun articolo";
    } else if (lineEntries.length === 1) {
      const l = lineEntries[0];
      body = `${formatQtyNotif(l.qty)} × ${l.description || ""}`;
    } else {
      const l = lineEntries[0];
      const rest = lineEntries.length - 1;
      body = `${formatQtyNotif(l.qty)} × ${l.description || ""} + ${rest} altr${rest === 1 ? "o" : "i"}`;
    }

    showOfficeToast({
      status: st,
      clientName: meta.clientName || "Cliente 1",
      body: body,
      time: now,
      onClick: () => {
        writeSeenBy(c.id, _user.id);
        _scrollToOrder(c.id);
      }
    });
    }
  }
  
  /**
   * Scrolla alla card dell'ordine, cambiando tab se serve.
   */
  function _scrollToOrder(orderId) {
    const o = _orders.find((x) => x.id === orderId);
    if (!o) return;
  
    // Scegli il tab giusto in base allo status
    let targetFilter = "nuovi";
    if (o.status === "fatto") targetFilter = "fatti";
    else if (o.status === "pronto") targetFilter = "pronto";
  
    if (_activeFilter !== targetFilter) {
      _activeFilter = targetFilter;
      document.querySelectorAll(".uff-tab").forEach((t) => {
        t.classList.toggle("is-active", t.dataset.filter === targetFilter);
      });
      refresh();
    }
  
    setTimeout(() => {
      const el = document.querySelector(`[data-order-id="${orderId}"]`);
      if (!el) return;
      // Scroll con offset: lascia ~140px sopra la card per header + tabs + searchbar
      const rect = el.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const OFFSET = 140;
      window.scrollTo({ top: Math.max(0, absoluteTop - OFFSET), behavior: "smooth" });
      el.classList.add("ferapp-flash");
      setTimeout(() => el.classList.remove("ferapp-flash"), 1600);
    }, 150);
  }
  /**
 * Formatta una quantità per la notifica (intero senza decimali, altrimenti 2 decimali).
 */
function formatQtyNotif(q) {
  const n = Number(q) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
}

function safeTs(ts) {
  if (typeof ts === "number" && !isNaN(ts)) return ts;
  return Date.now();
}

/* ============================================
   🆕 CALENDARIO UFFICIO
   ============================================ */
   function wireCalendarUfficio() {
    const btn = document.getElementById("btnCalendarUfficio");
    const overlay = document.getElementById("uffCalendarOverlay");
    const closeBtn = document.getElementById("calClose");
    const closeBtnX = document.getElementById("calCloseX");
    const prevBtn = document.getElementById("calPrev");
    const nextBtn = document.getElementById("calNext");
  
    if (!btn || !overlay) return;
  
    btn.addEventListener("click", () => {
      _calCurrentDate = new Date(); // Riparte dal mese corrente
      overlay.removeAttribute("hidden"); // Mostra la modale
      
      // 🆕 Aspetta un frame per far calcolare le dimensioni al browser e disegna i giorni
      requestAnimationFrame(() => {
        renderCalendar();
      });
    });
  
    // Funzione di chiusura
    const closeCal = () => overlay.setAttribute("hidden", "");
    
    if (closeBtn) closeBtn.addEventListener("click", closeCal);
    if (closeBtnX) closeBtnX.addEventListener("click", closeCal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCal(); });
  
    prevBtn.addEventListener("click", () => {
      _calCurrentDate.setMonth(_calCurrentDate.getMonth() - 1);
      renderCalendar();
    });
    nextBtn.addEventListener("click", () => {
      _calCurrentDate.setMonth(_calCurrentDate.getMonth() + 1);
      renderCalendar();
    });
  }
  
  function renderCalendar() {
    const grid = document.getElementById("calGrid");
    const title = document.getElementById("calMonthYear");
    if (!grid || !title) return;
  
    const year = _calCurrentDate.getFullYear();
    const month = _calCurrentDate.getMonth();
  
    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    title.textContent = `${monthNames[month]} ${year}`;
  
    // Primo giorno del mese (0=Dom, 1=Lun...)
    const firstDay = new Date(year, month, 1).getDay();
    // Convertiamo per far iniziare la settimana di Lunedì (0=Lun, 6=Dom)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  
    const daysInMonth = new Date(year, month + 1, 0).getDate();
  
    let html = "";
    // Celle vuote per l'inizio del mese
    for (let i = 0; i < startOffset; i++) {
      html += `<div class="uff-cal-day is-empty"></div>`;
    }
  
    const todayKey = dayKeyFromTs(Date.now());
    
    // Calcola il lunedì di 5 settimane fa per decidere quando andare in archivio
    // _currentWeekOffset = 0 (questa settimana), 4 (5a settimana andando indietro)
    const monday5WeeksAgo = getMondayOfWeek(4);
    monday5WeeksAgo.setHours(0,0,0,0);
  
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const dayKey = dayKeyFromTs(dayDate.getTime());
      const isToday = dayKey === todayKey;
      
      // Se il giorno è precedente al lunedì di 5 settimane fa -> Archivio
      const isArchive = dayDate < monday5WeeksAgo;
  
      const classes = ["uff-cal-day", isToday ? "is-today" : "", isArchive ? "is-past-archive" : ""].filter(Boolean).join(" ");
      
      html += `<div class="${classes}" data-day="${dayKey}">${d}</div>`;
    }
  
    grid.innerHTML = html;
  
    // Aggiungi i listener ai giorni
    grid.querySelectorAll(".uff-cal-day:not(.is-empty)").forEach(el => {
      el.addEventListener("click", () => {
        const dayKey = el.dataset.day;
        const dayDate = new Date(dayKey + "T00:00:00");
        
        document.getElementById("uffCalendarOverlay").setAttribute("hidden", "");
  
        if (dayDate < monday5WeeksAgo) {
          // Vai all'archivio
          window.location.href = `archivio.html?date=${dayKey}`;
        } else {
          // Filtra normalmente in ufficio
          _activeDay = dayKey;
          
          // Calcola l'offset della settimana per far spostare la barra in alto
          const todayMonday = getMondayOfWeek(0);
          const diffTime = todayMonday.getTime() - getMondayOfWeek(0).getTime(); // Dummy per sicurezza
          const dayMonday = new Date(dayDate);
          const dow = dayMonday.getDay();
          const diffToMon = dow === 0 ? -6 : 1 - dow;
          dayMonday.setDate(dayMonday.getDate() + diffToMon);
          dayMonday.setHours(0,0,0,0);
          
          const msDiff = todayMonday.getTime() - dayMonday.getTime();
          _currentWeekOffset = Math.round(msDiff / (7 * 24 * 60 * 60 * 1000));
          
          _dayDetailOpen = null; // Chiudi eventuali dettagli aperti
          refresh();
        }
      });
    });
  }