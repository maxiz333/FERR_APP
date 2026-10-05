/* ============================================
   CASSA-CONTROLLER.JS
   Logica della Cassa (scontrino) - Blocco 3B
   ============================================ */

   import { renderOrders, isEditMode, setEditMode, getCurrentDetailId, closeDetail } from "../views/cassa-view.js";
   import { listenAllCarts, updateStatus, updateLine } from "../../data/cart-repository.js";
   import { openKeypad } from "../components/keypad.js";
   import { computeLine, computeTotals } from "../../domain/cart-service.js";
   import { ensureArticlesLoaded, getArticleFromCache, updateArticleInCache } from "../../domain/article-service.js";
   
   let _user = null;
   let _orders = [];
   let _searchQuery = "";
   let _unsubListener = null;
   
   /* ============================================
      INIT
      ============================================ */
   
   export async function initCassaController(user) {
     _user = user;
   
     const userEl = document.getElementById("casUser");
     if (userEl) userEl.textContent = _user.name;
   
     // Wire ricerca
     const searchInput = document.getElementById("casSearch");
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
   
     // 🆕 Precarica articoli in cache (per i pallini stato prezzo)
     ensureArticlesLoaded()
       .then(() => {
         console.log("📚 Cache articoli pronta (cassa)");
         refresh();  // ridisegna con i pallini
       })
       .catch(err => {
         console.error("Errore caricamento articoli:", err);
       });
   
     // Ascolta Firebase
     if (_unsubListener) _unsubListener();
     _unsubListener = listenAllCarts((carts) => {
       // Cassa vede SOLO ordini da battere:
       // - stato "nuovo" o "in_arrivo"
       // - NON bloccati, NON fatti
       _orders = carts
         .map((c) => {
           const meta = c.meta || {};
           return {
             id: c.id,
             status: meta.status || "modifica",
             clientName: meta.clientName || "Cliente 1",
             createdByName: meta.createdByName || "—",
             createdAt: meta.createdAt || 0,
             orderNumber: meta.orderNumber || null,
             orderCode: meta.orderCode || null,
             lines: c.lines || {},
           };
         })
         .filter((o) => ["nuovo", "in_arrivo"].includes(o.status));
   
       console.log(`💰 Ricevuti ${_orders.length} ordini da battere`);
       refresh();
     });
   
     // Wire pulsanti FATTO (delegation)
     document.getElementById("casList").addEventListener("click", onListClick);
     window.addEventListener("cassa:refresh", () => refresh());
   
     console.log("💰 Cassa controller attivo (Blocco 3B)");
   }
   
   /* ============================================
      REFRESH
      ============================================ */
   
   function refresh() {
     let result = _orders;
   
     if (_searchQuery) {
       result = result.filter((o) => {
         const hay = `${o.clientName} ${o.createdByName} ${o.id}`.toLowerCase();
         return hay.includes(_searchQuery);
       });
     }
   
     // Ordina: più recenti prima
     result = result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
   
     // 🆕 Arricchisci righe con l'articolo dal cache (per il pallino prezzo)
     const enriched = result.map((o) => {
       const enrichedLines = {};
       for (const [lid, l] of Object.entries(o.lines || {})) {
         const art = l.articleId ? getArticleFromCache(l.articleId) : null;
         enrichedLines[lid] = { ...l, _article: art };
       }
       return { ...o, lines: enrichedLines };
     });
   
     renderOrders(enriched);
   }
   
   /* ============================================
      CLICK HANDLER
      ============================================ */
   
   async function onListClick(e) {
     // 1) Tasto FATTO
     const btnFatto = e.target.closest("#casDetFatto");
     if (btnFatto) {
       e.stopPropagation();
       const orderId = btnFatto.dataset.orderId;
       if (!orderId) return;
       if (!confirm("Segnare questo ordine come FATTO? Sparirà dalla cassa.")) return;
   
       try {
         btnFatto.disabled = true;
         btnFatto.textContent = "⏳";
   
         // 🆕 PRIMA sincronizza i prezzi delle righe → articoli
         try {
           const { syncOrderPricesToArticles } = await import("../../data/cart-repository.js");
           const res = await syncOrderPricesToArticles(orderId);
           if (res.updated > 0 || res.skipped > 0) {
             console.log(`💰 Prezzi sincronizzati (cassa): ${res.updated} aggiornati, ${res.skipped} invariati`);
           }
           // 🆕 Aggiorna cache locale
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
         console.log(`✅ Ordine ${orderId} → fatto (da cassa)`);
         closeDetail();
       } catch (err) {
         console.error("Errore:", err);
         alert("Errore durante l'aggiornamento");
         btnFatto.disabled = false;
         btnFatto.textContent = "✅ FATTO";
       }
       return;
     }
   
     // 2) Tasto SBLOCCA (solo locale — NON cambia stato Firebase)
     const btnUnlock = e.target.closest("#casDetUnlock");
     if (btnUnlock) {
       e.stopPropagation();
       const newMode = !isEditMode();
       setEditMode(newMode);
       console.log(newMode ? "🔓 Edit mode attivo" : "🔒 Edit mode disattivo");
       return;
     }
   
     // 3) Click su QTY (solo se edit mode)
     const btnQty = e.target.closest('[data-action="edit-qty"]');
     if (btnQty && isEditMode()) {
       e.stopPropagation();
       await editLineFromCassa(btnQty.dataset.lineId, "qty");
       return;
     }
   
     // 4) Click su PREZZO (solo se edit mode)
     const btnPrice = e.target.closest('[data-action="edit-price"]');
     if (btnPrice && isEditMode()) {
       e.stopPropagation();
       await editLineFromCassa(btnPrice.dataset.lineId, "price");
       return;
     }
   }
   
   /* ============================================
      MODIFICA RIGHE DA CASSA
      ============================================ */
   
   async function editLineFromCassa(lineId, field) {
     const orderId = getCurrentDetailId();
     if (!orderId) return;
   
     const order = _orders.find((o) => o.id === orderId);
     if (!order) return;
   
     const line = order.lines[lineId];
     if (!line) return;
   
     let result, updates;
   
     if (field === "qty") {
       result = await openKeypad({
         title: "Quantità",
         value: Number(line.qty) || 1,
         unit: line.unit || "PZ",
         allowDecimal: true,
         min: 0.01
       });
       if (result == null) return;
   
       const updated = computeLine({ ...line, qty: result });
       updates = {
         qty: updated.qty,
         lineTotal: updated.lineTotal,
         discountAmount: updated.discountAmount
       };
     } else if (field === "price") {
       const currentPrice = Number(line.unitPrice ?? line.basePrice) || 0;
       result = await openKeypad({
         title: "Prezzo unitario",
         value: currentPrice,
         unit: "€",
         allowDecimal: true,
         min: 0
       });
       if (result == null) return;
   
       const updated = computeLine({ ...line, unitPrice: result });
       updates = {
         unitPrice: updated.unitPrice,
         lineTotal: updated.lineTotal,
         discountAmount: updated.discountAmount
       };
     }
   
     try {
       await updateLine(orderId, lineId, updates);
   
       // Ricalcola totali generali
       const allLines = Object.entries(order.lines).map(([id, l]) => {
         if (id === lineId) return { id, ...line, ...updates };
         return { id, ...l };
       });
       const totals = computeTotals(allLines);
   
       // Aggiorna totals su Firebase
       const { updateTotals } = await import("../../data/cart-repository.js");
       await updateTotals(orderId, totals);
   
       // 🆕 Aggiorna cache articolo locale (per pallini)
       if (line.articleId && field === "price") {
         updateArticleInCache(line.articleId, {
           basePrice: updates.unitPrice,
           priceLastChangedAt: Date.now(),
           priceVerified: true
         });
       }
   
       // 🆕 Aggiorna OGGETTO locale per riflettere subito i cambi
       Object.assign(line, updates);
   
       // 🆕 Forza refresh immediato (non aspettare il listener Firebase)
       setTimeout(() => refresh(), 50);
   
       console.log(`✏️ Cassa: riga ${lineId} aggiornata (${field})`);
     } catch (err) {
       console.error("Errore modifica:", err);
       alert("Errore durante la modifica");
     }
   }