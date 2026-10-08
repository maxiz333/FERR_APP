/* ============================================
   UFFICIO-CONTROLLER.JS
   Logica dell'Ufficio (Cassa).
   Blocco 3.4/3.5 — Modifica ordini
   ============================================ */

   import { renderOrders } from "../views/ufficio-view.js";
   import {
    listenAllCarts,
    updateStatus,
    updateLine,
    updateTotals,
    markCartAsModified,
    writeSeenBy
  } from "../../data/cart-repository.js";
  import {
    trashCart, listenTrashCarts, restoreCart, deleteCartPermanently,
    runScheduledCleanup
  } from "../../data/trash-repository.js";
   import { openKeypad } from "../components/keypad.js";
   import { openClientPicker } from "../components/client-picker.js";
   import { ProductCard } from "../components/product-card.js";
   import { ensureArticlesLoaded, getArticleFromCache, updateArticleInCache } from "../../domain/article-service.js";
   import { computeLine, computeTotals } from "../../domain/cart-service.js";
   import { openInvoiceModal } from "../components/invoice-modal.js";
   import { openInvoiceNumberModal } from "../components/invoice-number-modal.js";
   import { printInvoice } from "../components/print-invoice.js";
   import { generateInvoiceNumber, saveInvoiceToCart, peekNextInvoiceNumber, setNextInvoiceNumber } from "../../data/invoice-repository.js";
   import { getClientByKey } from "../../data/client-repository.js";
   import { updateClient } from "../../data/cart-repository.js";
import { updateNote } from "../../data/cart-repository.js";
import { showOfficeToast, requestNotificationPermission } from "../../core/notify.js";
   
   let _user = null;
   let _orders = [];
   let _activeFilter = "nuovi";
   let _searchQuery = "";
   let _collapsed = false;
   let _unsubListener = null;
   let _unsubTrash = null;
   let _trashCarts = [];
   let _notifiedOrders = new Map();   // "cartId|status" → timestamp
   let _firstLoadDone = false;        // evita la raffica al primo caricamento
   let _editingNoteCarts = new Set(); // 🆕 cartId con nota in edit mode
   
   /* ============================================
      INIT
      ============================================ */
   
   export async function initUfficioController(user) {
     _user = user;
   
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

         // 🆕 Tasto F: modifica numero bolle
         const btnF = document.getElementById("btnInvoiceNumber");
         if (btnF && !btnF._hasFListener) {
           btnF._hasFListener = true;
           btnF.addEventListener("click", async () => {
             const current = await peekNextInvoiceNumber();
             const input = prompt("Numero prossima bolla:", current);
             if (input === null) return;
             const n = parseInt(input, 10);
             if (!Number.isFinite(n) || n < 0) {
               alert("Numero non valido");
               return;
             }
             await setNextInvoiceNumber(n);
             alert("✅ Prossima bolla: " + n);
           });
         }

         // 🆕 Blocco 8 — Cestino ufficio
         wireTrashUfficio();
         startTrashListener();
         runScheduledCleanup();

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
          createdAt: meta.createdAt || 0,
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
        renderOrders(enriched, _collapsed);
        wireOrderActions();
        wireNoteInputs();   // 🆕 textarea note
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
                refresh();
              });
            }
          });

          // 🆕 Se clicchi fuori: salva e passa in display (o torna a placeholder se vuota)
          ta.addEventListener("blur", () => {
            setTimeout(() => {
              const v = (ta.value || "").trim();
              clearTimeout(timer);
              updateNote(orderId, ta.value).then(() => {
                _editingNoteCarts.delete(orderId);
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
            enrichedLines[lid] = { ...l, _article: art };
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
   
     if (_searchQuery) {
       result = result.filter((o) => {
         const hay = `${o.clientName} ${o.createdByName} ${o.id}`.toLowerCase();
         return hay.includes(_searchQuery);
       });
     }
   
     return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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

            // 🆕 PRIMA sincronizza i prezzi delle righe → articoli
            try {
              const { syncOrderPricesToArticles } = await import("../../data/cart-repository.js");
              const res = await syncOrderPricesToArticles(orderId);
              if (res.updated > 0 || res.skipped > 0) {
                console.log(`💰 Prezzi sincronizzati: ${res.updated} aggiornati, ${res.skipped} invariati`);
              }
              // 🆕 Aggiorna cache locale con i nuovi prezzi
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
   
           } else if (action === "pronto") {
             await updateStatus(orderId, "pronto");
             console.log(`📋 Ordine ${orderId} → pronto`);
   
            } else if (action === "unlock") {
              if (!confirm("Sbloccare l'ordine per modificarlo?")) return;
              await updateStatus(orderId, "sbloccato");
              await updateLineLock(orderId, false);
              console.log(`🔓 Ordine ${orderId} sbloccato`);
            
              // Cambia tab su "nuovi" e mostra l'ordine sbloccato
              _activeFilter = "nuovi";
              document.querySelectorAll(".uff-tab").forEach((t) => {
                t.classList.toggle("is-active", t.dataset.filter === "nuovi");
              });
              refresh();
            
              // Scroll all'ordine appena sbloccato
              setTimeout(() => {
                const el = document.querySelector(`[data-order-id="${orderId}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 150);
            
   
            } else if (action === "stampa") {
              const { openPrintOrdersModal } = await import("../components/print-orders-modal.js");
              const filtered = filterOrders(_orders);
              const filterLabels = {
                nuovi: "🟡 NUOVI",
                fatti: "🟢 FATTI",
                tutti: "📋 TUTTI",
                pronto: "🟣 PRONTO"
              };
              openPrintOrdersModal({
                orders: filtered,
                currentOrderId: orderId,
                filterLabel: filterLabels[_activeFilter] || _activeFilter
              });

                        // 🆕 Blocco 7 — Crea fattura
                      } else if (action === "bol") {
                        const order = _orders.find((o) => o.id === orderId);
                        if (!order) return;
          
                        // Apri client picker per scegliere cliente
                        const pick = await openClientPicker({
                          currentClientName: order.clientName || "Cliente 1"
                        });
          
                        // Se annulla, esci
                        if (!pick) return;
          
                        // Salva nuovo cliente sul carrello (se scelto)
                        if (pick.clientKey) {
                          try { await updateClient(orderId, pick.clientKey, pick.name); }
                          catch (e) { console.error(e); }
                        }
          
                        // Chiedi conferma con dialog nativo
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

            // 🆕 Blocco 7 — Ristampa DDT
            } else if (action === "stampa-ddt") {
              const order = _orders.find((o) => o.id === orderId);
              if (!order || !order.invoiceNumber) return;

              let client = null;
              if (order.clientId) {
                try { client = await getClientByKey(order.clientId); }
                catch (e) { /* ignore */ }
              }

              printInvoice({
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
   
           } else if (action === "edit-price") {
             await editLinePrice(orderId, lineId);
   
           } else if (action === "edit-qty") {
             await editLineQty(orderId, lineId);
   
           } else if (action === "edit-discount") {
             await editLineDiscount(orderId, lineId);
            } else if (action === "product-card") {
              const code = btn.dataset.articleCode;
              if (!code) return;
              ProductCard.open({
                articleCode: code,
                onSaved: () => {
                  // niente da fare: la scheda ricarica da Firebase la prossima apertura
                }
              });
            } else if (action === "copy-code") {
              const code = btn.dataset.code || "";
              if (!code) return;
              try {
                await navigator.clipboard.writeText(code);
                showToastUff("📋 Codice copiato: " + code);
              } catch (err) {
                // Fallback per browser vecchi
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
              // 🆕 Click sul div giallo → passa in edit mode
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