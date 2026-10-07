/* ============================================
   BANCO-CONTROLLER.JS
   Logica del Banco (Magazzino).
   ============================================ */

   import { initSearchBar } from "../components/search-bar.js";
   import { openKeypad } from "../components/keypad.js";
   import { openCutCalculator } from "../components/cut-calculator.js";
   import { openModal } from "../components/modal.js";
   import { openClientPicker } from "../components/client-picker.js";
   import { getArticleFromCache } from "../../domain/article-service.js";
   import {
    setCart, getCart, getLines, subscribe,
    createLineFromArticle, computeLine, computeTotals,
    newLineId, formatEuro,
    isEmpty, canConfirm
  } from "../../domain/cart-service.js";
    import {
      createCart, loadCart, listenCart, listenAllCarts, getCurrentCartId,
      setCurrentCartId, addLine, updateLine, deleteLine, updateTotals,
      updateNote, updateClient,
      updateStatus, lockCart, updateLineLock,
      generateOrderCode
    } from "../../data/cart-repository.js";
  import {
    trashCart, listenTrashCarts, restoreCart, deleteCartPermanently,
    runScheduledCleanup
  } from "../../data/trash-repository.js";
   import { getSession } from "../../core/auth.js";
   import { SummaryModal } from "../components/summary-modal.js";
import { CompareArticles } from "../components/compare-articles.js";
import { ProductCard } from "../components/product-card.js";
import { renderPriceDot } from "../components/price-dot.js";
import { openInvoiceModal } from "../components/invoice-modal.js";
import { openInvoiceNumberModal } from "../components/invoice-number-modal.js";
import { printInvoice } from "../components/print-invoice.js";
import { generateInvoiceNumber, saveInvoiceToCart, peekNextInvoiceNumber, setNextInvoiceNumber } from "../../data/invoice-repository.js";
import { getClientByKey } from "../../data/client-repository.js";

let _user = null;
let _cartId = null;
let _unsubCart = null;
let _unsubAllCarts = null;
let _allCarts = [];
let _midnightTimer = null;
let _ordersDropdownWired = false;
   
   export async function initBancoController() {
     _user = getSession();
     if (!_user) return;
   
     // Inizializza search bar
     initSearchBar(onArticleSelected);

     wireActionButtons();
     wireBottomButtons();
     startOrdersCounter();
     wireOrdersDropdown();
     wireTrashTab();
     wireNewCartTab();
     startTrashListener();
     runScheduledCleanup();
     
      // Click sul logo → Cassa
      const logoBtn = document.getElementById("bancoLogoBtn");
      if (logoBtn && !logoBtn._hasLogoClick) {
        logoBtn._hasLogoClick = true;
        logoBtn.addEventListener("click", () => {
          window.location.href = "cassa.html";
        });
      }
    
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
   
     // Carica o crea il carrello attivo
     await ensureActiveCart();
   
     console.log("🎛 Banco controller attivo");
   }
   
   /* ============================================
      CARRELLO ATTIVO
      ============================================ */
   
      async function ensureActiveCart() {
        let cartId = getCurrentCartId();
        let cart = null;
      
        // 🆕 Controlla se il carrello appartiene all'utente attuale
        if (cartId) {
          const owner = cartId.split("_")[0].replace(/^C/, "");
          if (owner !== _user.id) {
            console.log(`⚠️ Carrello "${cartId}" è di "${owner}", ma utente è "${_user.id}" → ne creo uno nuovo`);
            setCurrentCartId(null);
            cartId = null;
          }
        }
      
        if (cartId) {
          cart = await loadCart(cartId);
        }
      
        if (!cart) {
          cartId = await createCart(_user, null, "Cliente 1");
          cart = { meta: { id: cartId, clientName: "Cliente 1", status: "modifica" }, lines: {} };
        }
      
        _cartId = cartId;
        setCart(cart);
      
        if (_unsubCart) _unsubCart();
        _unsubCart = listenCart(cartId, (updated) => {
          if (!updated) return;
          setCart(updated);
          renderCart();
        });
      
        renderCart();
        renderTotals();
      }
   
   /* ============================================
      AGGIUNTA ARTICOLO
      ============================================ */
   
   async function onArticleSelected(articleKey) {
     const article = getArticleFromCache(articleKey);
     if (!article) return;
   
     if (!_cartId) {
       showToast("Errore: carrello non inizializzato", "error");
       return;
     }

     await markOrderAsModified();
   
     // Controlla se l'articolo è già presente (match per articleId)
     const existing = getLines().find(l => l.articleId === article.key);
   
     if (existing) {
       // Incrementa quantità
       const newQty = (Number(existing.qty) || 0) + 1;
       const updated = computeLine({ ...existing, qty: newQty });
       await updateLine(_cartId, existing.id, {
         qty: updated.qty,
         lineTotal: updated.lineTotal,
         discountAmount: updated.discountAmount
       });
       showToast(`+1 ${article.description} (${newQty})`, "success");
     } else {
       // Nuova riga
       const lineId = newLineId();
       const line = computeLine(createLineFromArticle(article, _user));
       await addLine(_cartId, lineId, line);
       showToast(`+ ${article.description}`, "success");
     }
   }
   
   /* ============================================
      AZIONI SU UNA RIGA
      ============================================ */
   
      async function onLineAction(lineId, action, extra) {
        const line = getLines().find(l => l.id === lineId);
        if (!line) return;

        // 🆕 LAVORO D — toggle tasti azione (non richiede markOrderAsModified)
        if (action === "toggle-actions") {
          const cartLineEl = document.querySelector(`.cart-line[data-line-id="${lineId}"]`);
          if (!cartLineEl) return;
          const actionsEl = cartLineEl.querySelector(".cart-line-actions");
          if (!actionsEl) return;
          if (actionsEl.hasAttribute("hidden")) {
            actionsEl.removeAttribute("hidden");
          } else {
            actionsEl.setAttribute("hidden", "");
          }
          return;
        }

        await markOrderAsModified();
      
        if (action === "inc") {
          const newQty = (Number(line.qty) || 0) + 1;
          const updated = computeLine({ ...line, qty: newQty });
          await updateLine(_cartId, lineId, {
            qty: updated.qty,
            lineTotal: updated.lineTotal,
            discountAmount: updated.discountAmount
          });
        }
        else if (action === "dec") {
          const newQty = (Number(line.qty) || 0) - 1;
          if (newQty <= 0) {
            await onLineAction(lineId, "delete");
            return;
          }
          const updated = computeLine({ ...line, qty: newQty });
          await updateLine(_cartId, lineId, {
            qty: updated.qty,
            lineTotal: updated.lineTotal,
            discountAmount: updated.discountAmount
          });
        }
        else if (action === "edit-qty") {
          await openKeypadForLine(lineId, "qty");
        }
        else if (action === "edit-price") {
          await openKeypadForLine(lineId, "price");
        }
        else if (action === "edit-price-base") {
          await openKeypadForLine(lineId, "price-base");
        }
        else if (action === "change-unit") {
          if (!extra) return;
          await updateLine(_cartId, lineId, { unit: extra });
          showToast(`Unità: ${extra}`, "success");
        }
        else if (action === "change-unit") {
          const newUnit = arguments[2];
          if (!newUnit) return;
          await updateLine(_cartId, lineId, {
            unit: newUnit
          });
          showToast(`Unità: ${newUnit}`, "success");
        }
        else if (action === "forbici") {
          await cycleForbici(lineId);
        }
        else if (action === "discount") {
          const result = await openKeypad({
            title: "Sconto %",
            value: line.discountPct || 0,
            unit: "%",
            allowDecimal: true,
            min: 0,
            max: 100
          });
          if (result == null) return;
      
          const updated = computeLine({ ...line, discountPct: result });
          await updateLine(_cartId, lineId, {
            discountPct: updated.discountPct,
            discountAmount: updated.discountAmount,
            lineTotal: updated.lineTotal
          });
          if (result > 0) {
            showToast(`Sconto ${result}% applicato`, "success");
          } else {
            showToast("Sconto rimosso", "info");
          }
        }
        else if (action === "delete") {
          if (!confirm(`Eliminare "${line.description}" dal carrello?`)) return;
          await deleteLine(_cartId, lineId);
        }
        else if (action === "note") {
          const note = prompt("Nota per questa riga:", line.note || "");
          if (note === null) return;
          await updateLine(_cartId, lineId, { note });
        }
        else if (action === "product-card") {
          const article = getArticleFromCache(line.articleId);
          if (!article) {
            showToast("Articolo non trovato", "error");
            return;
          }
          ProductCard.open({
            articleData: article,
            onSaved: () => {
              // ricarica cache per aggiornare descrizioni
              import("../../domain/article-service.js").then(m => m.reloadArticles());
            }
          });
        }
        else if (action === "order") {
          showToast("Funzione Ordina: in arrivo nel Blocco 2B.5", "info");
        }
      }
   
   /* ============================================
      RENDER
      ============================================ */
   
      function renderCart() {
        const area = document.getElementById("cartArea");
        if (!area) return;
      
        const cart = getCart();
        const lines = getLines();
        
        // 🆕 LAVORO A — in banco il più recente sta in cima
        lines.sort((a, b) => {
          const ta = Number(a.addedAt || 0);
          const tb = Number(b.addedAt || 0);
          return tb - ta;
        });
      
        // Aggiorna client bar
        updateClientBar(cart);
      
        if (lines.length === 0) {
          area.innerHTML = `
            <div class="cart-empty">
              <div class="cart-empty-icon">🛒</div>
              <div class="cart-empty-text">Carrello vuoto</div>
              <div class="cart-empty-hint">
                Cerca un articolo con il campo qui sopra oppure usa il tastierino
              </div>
            </div>
          `;
          return;
        }
      
        const orderNote = cart?.meta?.note || "";
      
        const linesHtml = lines.map((line, idx) => {
          const total = formatEuro(line.lineTotal);
          const discountBadge = line.discountPct > 0
            ? `<span class="line-discount-badge">-${line.discountPct}%</span>`
            : "";
      
          const unit = (line.unit || "PZ").toUpperCase();
          const isMeasured = ["KG", "MT", "MQ"].includes(unit);
  
          const article = getArticleFromCache(line.articleId);
          const priceDot = renderPriceDot(article, { size: "sm" });
      
          const forbiciState = line.forbiciState || "neutro";
          const forbiciIcon = "✂️";
          const forbiciLabel = {
            neutro:      "FORBICI",
            scampolo:    "SCAMPOLO",
            rotolo:      "ROTOLO",
            scaglionato: "SCAGLIONATO"
          }[forbiciState];
      
          const noteIndicator = line.note
          ? `<span class="line-note-indicator" title="${escapeHtml(line.note)}">📝</span>`
          : "";

        // 🎨 LAVORO B — colore ciclico (10 varianti)
        const colorClass = `clr-${idx % 10}`;
      
                     return `
            <div class="cart-line ${colorClass}" data-line-id="${line.id}">
              <div class="cart-line-grid">

                <!-- Colonna 1: descrizione + codice cliccabile -->
                <div class="clv2-prod">
                  <div class="cart-line-desc pc-clickable" data-action="product-card" title="Apri scheda prodotto">
                    ${idx + 1}. ${escapeHtml(line.description)} ${noteIndicator}
                  </div>
                  <button class="cart-line-code-toggle" data-action="toggle-actions" type="button" title="Mostra/nascondi tasti">
                    ${escapeHtml(line.code)} • ${escapeHtml(line.unit)}
                  </button>
                </div>

                <!-- Colonna 2: qty + unità + H×L + prezzo base -->
                <div class="clv2-qty-col">
                  <div class="cart-line-qty">
                    <button class="qty-btn" data-action="dec">−</button>
                    <button class="qty-value qty-editable" data-action="edit-qty" title="Modifica">${formatQty(line.qty)}</button>
                    <button class="qty-btn" data-action="inc">+</button>
                  </div>

                  <select class="cart-line-unit" data-action="change-unit" data-line-id="${line.id}">
                    <option value="PZ" ${unit === "PZ" ? "selected" : ""}>PZ</option>
                    <option value="KG" ${unit === "KG" ? "selected" : ""}>KG</option>
                    <option value="MT" ${unit === "MT" ? "selected" : ""}>MT</option>
                    <option value="MQ" ${unit === "MQ" ? "selected" : ""}>MQ</option>
                  </select>

                  ${unit === "MQ" ? `
                    <div class="clv2-hxl">
                      <span class="clv2-hxl-label">H</span>
                      <input type="number" class="clv2-hxl-input" data-field="h"
                             value="${line.h ?? ""}" placeholder="0" step="0.01" inputmode="decimal">
                      <span class="clv2-hxl-x">×</span>
                      <span class="clv2-hxl-label">L</span>
                      <input type="number" class="clv2-hxl-input" data-field="l"
                             value="${line.l ?? ""}" placeholder="0" step="0.01" inputmode="decimal">
                    </div>
                  ` : ""}

                  ${isMeasured ? `
                    <div class="clv2-base">
                      <button class="clv2-base-label" data-action="edit-price-base" title="Apri calcolatore">PREZZO BASE</button>
                      <button class="clv2-base-value" data-action="edit-price" title="Modifica prezzo base">${formatEuro(line.basePrice || 0)}</button>
                    </div>
                  ` : ""}
                </div>

                <!-- Colonna 3: prezzo -->
                <div class="cart-line-price-inline" data-action="edit-price">
                  ${formatEuro(isMeasured ? (line.basePrice || 0) : (line.unitPrice || 0))}${priceDot}
                </div>

                <!-- Colonna 4: totale -->
                <div class="cart-line-total-inline">${total}</div>

              </div>

              ${discountBadge}

              <div class="cart-line-actions" hidden>
                <button class="line-action forbici forbici-${forbiciState}" data-action="forbici" title="${forbiciLabel}">
                  <span class="forbici-icon">${forbiciIcon}</span>
                  <span class="forbici-label">${forbiciLabel}</span>
                </button>
                <button class="line-action" data-action="discount" title="Sconto %">%</button>
                <button class="line-action" data-action="note" title="Nota">📄</button>
                <button class="line-action" data-action="order" title="Ordina">🛒</button>
                <button class="line-action danger" data-action="delete" title="Elimina">🗑</button>
              </div>
            </div>
          `;
        }).join("");
      
        const noteHtml = `
          <div class="order-note-wrapper">
            <label class="order-note-label">
              <span class="order-note-icon">📝</span>
              Nota ordine
            </label>
            <textarea class="order-note-textarea" id="orderNoteInput"
                      placeholder="Aggiungi una nota per questo ordine..."
                      rows="2">${escapeHtml(orderNote)}</textarea>
          </div>
        `;
      
        const colsHeaderHtml = `
        <div class="cart-cols-header">
          <span class="ccol-prod">PRODOTTO</span>
          <span class="ccol-qty">Q.TÀ</span>
          <span class="ccol-unit">UNIT</span>
          <span class="ccol-prez">PREZZO</span>
          <span class="ccol-tot">TOT</span>
        </div>
      `;

      area.innerHTML = colsHeaderHtml + linesHtml + noteHtml;
      
        area.querySelectorAll(".cart-line").forEach(el => {
          const lineId = el.dataset.lineId;

          el.querySelectorAll("[data-action]").forEach(btn => {
            const tag = btn.tagName.toLowerCase();
            if (tag === "select") {
              btn.addEventListener("change", (e) => {
                e.stopPropagation();
                onLineAction(lineId, "change-unit", e.target.value);
              });
            } else {
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                onLineAction(lineId, btn.dataset.action);
              });
            }
          });

          el.querySelectorAll(".clv2-hxl-input").forEach(input => {
            input.addEventListener("change", () => onHlChange(lineId, el));
          });
        });
          
      
      
        const noteInput = document.getElementById("orderNoteInput");
        if (noteInput) {
          let noteTimer = null;
          noteInput.addEventListener("input", () => {
            clearTimeout(noteTimer);
            noteTimer = setTimeout(() => {
              saveOrderNote(noteInput.value);
            }, 600);
          });
        }
      
        renderTotals();
        scheduleTotalsSync();
      }
      
      /**
       * Aggiorna la barra cliente in alto.
       */
      function updateClientBar(cart) {
        const nameEl = document.getElementById("clientName");
        const countEl = document.getElementById("clientCount");
        const changeBtn = document.getElementById("btnClientPicker");
      
        if (nameEl) {
          const meta = cart?.meta || {};
          let name;
          if (meta.invoiceNumber) {
            const clientPart = (meta.clientName && meta.clientName !== "Cliente 1")
              ? ` · ${meta.clientName}`
              : "";
            name = `Fattura ${meta.invoiceNumber}${clientPart}`;
          } else if (meta.orderNumber && meta.orderCode) {
            name = `Ordine #${meta.orderNumber} - ${meta.orderCode}`;
          } else {
            name = meta.clientName || "Cliente 1";
          }
          const status = meta.status || "modifica";
          const icon = getClientIcon(status, meta.wasModified);
          nameEl.textContent = icon ? `${name} ${icon}` : name;

          // 👁️ Blocco 4 — occhio vicino a CAMBIA (angolo destro della client-bar)
          const bar = nameEl.closest(".client-bar");
          if (bar) {
            const oldEye = bar.querySelector(".client-eye");
            if (oldEye) oldEye.remove();
            const eyeHtml = renderEyeBanco(meta.seenBy);
            if (eyeHtml) {
              const changeBtn = bar.querySelector("#btnClientPicker");
              if (changeBtn) {
                changeBtn.insertAdjacentHTML("beforebegin", eyeHtml);
              }
            }
          }
        }
      
        if (countEl) {
          const lines = getLines();
          countEl.textContent = `${lines.length} art.`;
        }
        if (changeBtn && !changeBtn._hasListener) {
          changeBtn._hasListener = true;
          changeBtn.addEventListener("click", openClientPickerForCart);
        }
      }

      /**
       * 👁️ Blocco 4 — Ritorna l'HTML dell'occhio se ALTRI utenti
       * (diversi da quello corrente) hanno visto questo ordine.
       * Altrimenti stringa vuota.
       */
      function renderEyeBanco(seenBy) {
        if (!seenBy || typeof seenBy !== "object") return "";
        const seen = Object.entries(seenBy)
          .filter(([, ts]) => Number(ts) > 0)
          .sort((a, b) => Number(b[1]) - Number(a[1]));
        if (seen.length === 0) return "";

        const users = seen.map(([uid]) => uid.toUpperCase()).join(", ");
        const lastTs = Number(seen[0][1]) || 0;
        const d = new Date(lastTs);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        const tooltip = `Visto da ${users} · ${hh}:${mm}`;
        return `<span class="client-eye" style="margin-left:8px;opacity:0.7;cursor:help;font-size:0.95rem;" title="${tooltip}">👁️</span>`;
      }
      /**
 * Apre il client picker e aggiorna il carrello.
 */
async function openClientPickerForCart() {
  const cart = getCart();
  const currentName = cart?.meta?.clientName || "Cliente 1";

  const result = await openClientPicker({
    currentClientName: currentName
  });

  if (!result) return; // annullato

  // Aggiorna il carrello su Firebase
  await updateClient(_cartId, result.clientKey, result.name);
  showToast(`Cliente: ${result.name}`, "success");
}

   function renderTotals() {
     const lines = getLines();
     const totals = computeTotals(lines);
   
     const totalEl = document.getElementById("totalValue");
     if (totalEl) totalEl.textContent = formatEuro(totals.grandTotal);
   
     const countEl = document.getElementById("clientCount");
     if (countEl) countEl.textContent = `${lines.length} art.`;
   }
   
   /* ============================================
      UTILS
      ============================================ */
   
   function formatQty(q) {
     const n = Number(q);
     if (Number.isInteger(n)) return String(n);
     return n.toFixed(2).replace(".", ",");
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;");
   }
   
   function showToast(msg, type = "info") {
    // 🆕 Safety: se body non è pronto, ignora
    if (!document.body) return;
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
     toast.className = `toast toast-${type}`;
     toast.textContent = msg;
     container.appendChild(toast);
     setTimeout(() => toast.remove(), 2500);
   }
   /**
 * Apre il tastierino per modificare un valore.
 */
   async function openKeypadForLine(lineId, field) {
    const line = getLines().find(l => l.id === lineId);
    if (!line) return;
  
    const unit = (line.unit || "PZ").toUpperCase();
  
    if (field === "qty") {
      const result = await openKeypad({
        title: "Quantità",
        value: line.qty,
        unit: line.unit,
        allowDecimal: true,
        min: 0.01
      });
      if (result == null) return;
  
      const updated = computeLine({ ...line, qty: result });
      await updateLine(_cartId, lineId, {
        qty: updated.qty,
        lineTotal: updated.lineTotal,
        discountAmount: updated.discountAmount
      });
      showToast(`Quantità: ${formatQty(result)} ${line.unit}`, "success");
      return;
    }
  
    if (field === "price-base") {
      const isMeasured = ["KG", "MT", "MQ"].includes(unit);
      if (!isMeasured) return;

      const art = getArticleFromCache(line.articleId);
      const result = await openCutCalculator({
        description: line.description,
        basePrice: art?.basePrice ?? line.basePrice ?? 0,
        totU: art?.totU ?? line.totU ?? 0,
        mtRot: art?.mtRot ?? line.mtRot ?? 0,
        unit: unit
      });

      if (result == null) return;
  
        // 🆕 qty = PESO in kg, prezzo = basePrice (€/kg)
        // I metri vengono salvati a parte in mtTotal per annotazione
        const updated = computeLine({
          ...line,
          qty: result.kg,               // 0,281 kg
          unitPrice: line.basePrice,    // 11,00 €/kg (invariato!)
          basePrice: line.basePrice     // 11,00 (invariato!)
        });
  
        await updateLine(_cartId, lineId, {
          qty: updated.qty,              // 0,281 (kg)
          unitPrice: updated.unitPrice,  // 11,00 (€/kg)
          lineTotal: updated.lineTotal,  // 3,09 ✅
          discountAmount: updated.discountAmount,
          // 🆕 Valori extra per riferimento
          totU: art?.totU ?? line.totU ?? 0,
          mtRot: art?.mtRot ?? line.mtRot ?? 0,
          kgPerUm: art?.kgPerUm ?? line.kgPerUm ?? 0,
          kgTotal: result.kg,            // 0,281 (peso)
          mtTotal: result.meters         // 10 (metri tagliati)
        });
  
        showToast(
          `${result.meters.toFixed(2).replace(".", ",")} mt → ${result.kg.toFixed(3).replace(".", ",")} kg → ${formatEuro(result.price)}`,
          "success"
        );
        return;
    }

    if (field === "price") {
      const isMeasured = ["KG", "MT", "MQ"].includes(unit);

      if (isMeasured) {
        // 🆕 Articolo a misura → modifica il PREZZO BASE (€/MQ, €/KG, €/MT)
        const result = await openKeypad({
          title: `Prezzo base (€/${unit})`,
          value: line.basePrice || 0,
          unit: "€/" + unit,
          allowDecimal: true,
          min: 0
        });
        if (result == null) return;

        const updated = computeLine({
          ...line,
          basePrice: result,
          unitPrice: result
        });
        await updateLine(_cartId, lineId, {
          basePrice: updated.basePrice,
          unitPrice: updated.unitPrice,
          lineTotal: updated.lineTotal,
          discountAmount: updated.discountAmount
        });
        showToast(`Prezzo base: ${formatEuro(result)}/${unit}`, "success");
        return;
      }

      // PZ → tastierino prezzo unitario normale
      const result = await openKeypad({
        title: "Prezzo unitario",
        value: line.unitPrice,
        unit: "€",
        allowDecimal: true,
        min: 0
      });
      if (result == null) return;

      const updated = computeLine({ ...line, unitPrice: result });
      await updateLine(_cartId, lineId, {
        unitPrice: updated.unitPrice,
        lineTotal: updated.lineTotal,
        discountAmount: updated.discountAmount
      });
      showToast(`Prezzo: ${formatEuro(result)}`, "success");
    }
  }
/**
 * Cicla lo stato forbici di una riga.
 * neutro → scampolo → rotolo → scaglionato → neutro
 */
async function cycleForbici(lineId) {
  const line = getLines().find(l => l.id === lineId);
  if (!line) return;

  const current = line.forbiciState || "neutro";

  const order = ["neutro", "scampolo", "rotolo", "scaglionato"];
  const nextIdx = (order.indexOf(current) + 1) % order.length;
  const next = order[nextIdx];

  // Reset dei campi relativi
  const updates = {
    forbiciState: next,
    isRemnant: false,
    isRoll: false,
    isTiered: false
  };

  // Applica effetti specifici
  if (next === "scampolo") {
    // Apre tastierino per sconto scampolo (default 30)
    const pct = await openKeypad({
      title: "Sconto Scampolo %",
      value: line.scampoloPct || 30,
      unit: "%",
      allowDecimal: true,
      min: 0,
      max: 100
    });
    if (pct == null) {
      // Annullato: torna a neutro
      await updateLine(_cartId, lineId, {
        forbiciState: "neutro",
        isRemnant: false,
        isRoll: false,
        isTiered: false
      });
      return;
    }
    updates.isRemnant = true;
    updates.scampoloPct = pct;
    updates.discountPct = pct;

    // Ricalcola la riga
    const recalc = computeLine({ ...line, discountPct: pct });
    updates.discountAmount = recalc.discountAmount;
    updates.lineTotal = recalc.lineTotal;

    await updateLine(_cartId, lineId, updates);
    showToast(`Scampolo -${pct}%`, "success");
    return;
  }

  if (next === "rotolo") {
    updates.isRoll = true;
    await updateLine(_cartId, lineId, updates);
    showToast("Rotolo intero attivato", "info");
    return;
  }

  if (next === "scaglionato") {
    updates.isTiered = true;
    await updateLine(_cartId, lineId, updates);
    showToast("Scaglionato attivato", "info");
    return;
  }

  // neutro → rimuove tutti gli effetti, ma non tocca discountPct manuale
  await updateLine(_cartId, lineId, updates);
  showToast("Forbici: neutro", "info");
}
/**
 * Salva la nota dell'ordine su Firebase.
 */
async function saveOrderNote(text) {
  if (!_cartId) return;
  try {
    await updateNote(_cartId, text);
  } catch (e) {
    console.error("Errore salvataggio nota ordine:", e);
  }
}

/* ============================================
   BLOCCO 2B.4 — RIEPILOGO ORDINE
   ============================================ */

/**
 * Apre la modale di riepilogo ordine.
 * Mostra tutte le righe con checkbox + "spunta tutto".
 */
function openSummaryModal() {
  const lines = getLines();

  if (lines.length <= 1) {
    showToast("Il riepilogo serve da 2 articoli in su", "info");
    return;
  }

  SummaryModal.open({
    lines,
    onConfirm: () => {
      showToast("✅ Ordine verificato! Ora premi UFF. o CONFERMA", "success");
    }
  });
}

/**
 * Collega il pulsante RIEP. alla modale.
 * Sicuro: non aggiunge listener doppi.
 */
function wireActionButtons() {
  const btnRiep = document.getElementById("btnRiepilogo");
  if (btnRiep && !btnRiep._hasSummaryListener) {
    btnRiep._hasSummaryListener = true;
    btnRiep.addEventListener("click", openSummaryModal);
    console.log("✅ Pulsante RIEP. collegato");
  }
}
/* ============================================
   BLOCCO 2B.5 — BOZZA / CONFERMA / TRASH
   ============================================ */

/**
 * 📤 Invia la bozza all'ufficio.
 * Il carrello resta aperto per aggiungere altri articoli.
 */
async function sendDraftToOffice() {
  if (isEmpty()) {
    showToast("Carrello vuoto, niente da inviare", "error");
    return;
  }

  try {
    await updateStatus(_cartId, "bozza");

    // 🎫 Genera codice ordine (Blocco 3.7)
    const cart = getCart();
    const hasCode = cart?.meta?.orderCode;
    if (!hasCode) {
      try {
        const code = await generateOrderCode(_cartId);
        console.log(`🎫 Codice ordine: #${code.number} - ${code.letter}`);
        showToast(`📤 Bozza inviata · #${code.number} - ${code.letter}`, "success");
      } catch (codeErr) {
        console.error("Errore generazione codice:", codeErr);
        showToast("📤 Bozza inviata all'ufficio", "success");
      }
    } else {
      showToast("📤 Bozza inviata all'ufficio", "success");
    }

    console.log("📤 Bozza inviata, cartId:", _cartId);
  } catch (e) {
    console.error("Errore invio bozza:", e);
    showToast("Errore invio bozza", "error");
  }
}

/**
 * ✅ Conferma l'ordine.
 * Chiude il carrello e ne crea uno nuovo vuoto.
 */
async function confirmOrder() {
  // Nessuna validazione bloccante: il banco può inviare anche senza prezzi.
// L'ufficio metterà i prezzi. (Vedi PROGETTO.md v2.2)
// Solo avviso se carrello vuoto:
if (isEmpty()) {
  showToast("Carrello vuoto, niente da inviare", "error");
  return;
}

  if (!confirm("Confermare l'ordine? Il carrello verrà chiuso e ne inizierà uno nuovo.")) {
    return;
  }

  try {
    // 1) Stato finale: se era bozza → in_arrivo, altrimenti → nuovo
    const cart = getCart();
    const currentStatus = cart?.meta?.status || "modifica";
    const finalStatus = currentStatus === "bozza" ? "in_arrivo" : "nuovo";

    // 2) Aggiorna stato + blocca
    await updateStatus(_cartId, finalStatus);

    showToast(`✅ Ordine confermato (${finalStatus})`, "success");
    console.log("✅ Ordine confermato:", _cartId, "→", finalStatus);

    // 3) Passa a un nuovo carrello vuoto
    await switchToNewCart();
  } catch (e) {
    console.error("Errore conferma ordine:", e);
    showToast("Errore durante la conferma", "error");
  }
}

/**
 * 🗑 Cestina il carrello corrente.
 */
async function trashCurrentCart() {
  if (isEmpty()) {
    showToast("Carrello già vuoto", "info");
    return;
  }

  // 🆕 Blocco 8 — cestina solo se il carrello è in "modifica" o "sbloccato"
  // (cioè il banco ci sta lavorando). Se è già stato inviato all'ufficio
  // (bozza/nuovo/in_arrivo/fatto/pronto) NON va cestinato da qui.
  const cart = getCart();
  const status = cart?.meta?.status || "modifica";
  const canTrash = (status === "modifica");

  if (!canTrash) {
    if (!confirm(`Questo ordine è già stato inviato all'ufficio (stato: "${status}").\n\nVuoi comunque iniziare un nuovo carrello vuoto?\n(l'ordine resta in ufficio, NON viene cestinato)`)) {
      return;
    }
    // Solo nuovo carrello, NON cestinare
    await switchToNewCart();
    showToast("🆕 Nuovo carrello avviato", "success");
    return;
  }

  if (!confirm("Svuotare il carrello? Verrà spostato nel cestino.")) {
    return;
  }

  try {
    // 1) Sposta nel cestino (con source="banco")
    await trashCart(_cartId, "banco", _user);

    // 2) Passa a un nuovo carrello vuoto
    await switchToNewCart();

    showToast("🗑 Carrello cestinato", "success");
  } catch (e) {
    console.error("Errore cestinamento:", e);
    showToast("Errore durante il cestinamento", "error");
  }
}

/**
 * Collega i 3 pulsanti UFF., CONFERMA e TRASH.
 */
function wireBottomButtons() {
  const btnUff = document.getElementById("btnUfficio");
  if (btnUff && !btnUff._hasUffListener) {
    btnUff._hasUffListener = true;
    btnUff.addEventListener("click", sendDraftToOffice);
    console.log("✅ Pulsante UFF. collegato");
  }

  // 🆕 Tasto BOL
  const btnBol = document.getElementById("btnBol");
  if (btnBol && !btnBol._hasBolListener) {
    btnBol._hasBolListener = true;
    btnBol.addEventListener("click", handleBolClick);
    console.log("✅ Pulsante BOL. collegato");
  }

  const btnConf = document.getElementById("btnConferma");
  if (btnConf && !btnConf._hasConfListener) {
    btnConf._hasConfListener = true;
    btnConf.addEventListener("click", confirmOrder);
    console.log("✅ Pulsante CONFERMA collegato");
  }

  const btnTrash = document.getElementById("btnTrash");
  if (btnTrash && !btnTrash._hasTrashListener) {
    btnTrash._hasTrashListener = true;
    btnTrash.addEventListener("click", trashCurrentCart);
    console.log("✅ Pulsante TRASH collegato");
  }

  // Aggiorna subito il testo del BOL
  updateBolButton();
}

/* ============================================
   🆕 BLOCCO 7 — BOL / FATTURA
   ============================================ */

/**
 * Aggiorna testo e comportamento del tasto BOL in base
 * allo stato del carrello (già fatturato o no).
 */
function updateBolButton() {
  const btn = document.getElementById("btnBol");
  if (!btn) return;
  const cart = getCart();
  const meta = cart?.meta || {};
  if (meta.invoiceNumber) {
    btn.textContent = "🖨 Stampa DDT";
    btn.title = `Ristampa fattura ${meta.invoiceNumber}`;
  } else {
    btn.textContent = "📄 BOL.";
    btn.title = "Crea fattura";
  }
}

/**
 * Handler del tasto BOL.
 * - Se già fatturato → ristampa
 * - Altrimenti → popup → genera numero → salva → stampa
 */
async function handleBolClick() {
  if (isEmpty()) {
    alert("Carrello vuoto");
    return;
  }
  const cart = getCart();
  const meta = cart?.meta || {};

    // Già fatturato → il tasto è diventato "Stampa DDT" → stampa!
    if (meta.invoiceNumber) {
      let client = null;
      if (meta.clientId) {
        try { client = await getClientByKey(meta.clientId); } catch (e) {}
      }
      printInvoice({
        cart: cart,
        invoiceNumber: meta.invoiceNumber,
        client: client
      });
      return;
    }

  // Chiedi conferma con dialogo NATIVO
  const clientName = meta.clientName || "Cliente 1";
  const preview = await peekNextInvoiceNumber();
  const ok = confirm(
    "Creare fattura per questo ordine?\n\n" +
    "Cliente: " + clientName + "\n" +
    "Numero bolla: " + preview
  );
  if (!ok) return;

  try {
    const invoiceNumber = await generateInvoiceNumber();
    await saveInvoiceToCart(_cartId, invoiceNumber);

    if (cart?.meta) cart.meta.invoiceNumber = invoiceNumber;
    updateBolButton();
    updateClientBar(getCart());

    alert("✅ Fattura " + invoiceNumber + " creata!\n\nOra premi '🖨 Stampa DDT' per stamparla.");
  } catch (err) {
    console.error("Errore fatturazione:", err);
    alert("Errore: " + err.message);
  }
}
/* ============================================
   BLOCCO 2B.5b — Cambio carrello (fix listener)
   ============================================ */

/**
 * 🔄 Passa a un nuovo carrello vuoto.
 * Fa TUTTO: stacca il vecchio listener, crea il nuovo carrello,
 * riattacca il listener al NUOVO carrello, e renderizza.
 */
async function switchToNewCart() {
  // 1) Stacca il vecchio listener (importante!)
  if (_unsubCart) {
    _unsubCart();
    _unsubCart = null;
  }

  // 2) Crea un nuovo carrello vuoto
  const newId = await createCart(_user, null, "Cliente 1");
  _cartId = newId;

  // 3) Carica il nuovo carrello e mettilo in memoria
  const fresh = await loadCart(newId);
  if (fresh) setCart(fresh);

  // 4) Riattacca il listener al NUOVO carrello (fondamentale!)
  _unsubCart = listenCart(newId, (updated) => {
    if (!updated) return;
    setCart(updated);
    renderCart();
  });

  // 5) Renderizza
  renderCart();
  renderTotals();

  console.log("🔄 Passato a nuovo carrello:", newId);
  return newId;
}

/**
 * Segna l'ordine come "modificato" per la matita permanente.
 */

/**
 * Segna l'ordine come "modificato" per la matita permanente.
 */
async function markOrderAsModified() {
  if (!_cartId) return;

  const cart = getCart();
  const status = cart?.meta?.status;

  // Il banco NON scrive seenBy. Solo l'ufficio lo fa.
  // (L'occhio in banco appare solo se l'ufficio tocca l'ordine)

  // Solo se stiamo modificando un ordine sbloccato
  if (status !== "sbloccato") return;
  if (cart?.meta?.wasModified === true) return;

  try {
    const { db, ref, update } = await import("../../core/firebase-init.js");
    await update(ref(db, `activeCarts/${_cartId}/meta`), {
      wasModified: true,
      updatedAt: Date.now()
    });
    console.log("📝 Ordine marcato wasModified:", _cartId);
  } catch (err) {
    console.error("Errore markOrderAsModified:", err);
  }
}

/**
 * 🎯 Carica un ordine esistente come carrello attivo del banco.
 * Usato dal pulsante "Sblocca e modifica".
 */
async function switchToCart(cartId) {
  // 1) Stacca il vecchio listener
  if (_unsubCart) {
    _unsubCart();
    _unsubCart = null;
  }

  // 2) Imposta il cartId corrente
  _cartId = cartId;
  setCurrentCartId(cartId);

  // 3) Carica il carrello da Firebase
  const cart = await loadCart(cartId);
  if (cart) setCart(cart);

  // 4) Riattacca il listener
  _unsubCart = listenCart(cartId, (updated) => {
    if (!updated) return;
    setCart(updated);
    renderCart();
  });

  // 5) Render
  renderCart();
  renderTotals();

  console.log("🔄 Caricato carrello esistente nel banco:", cartId);
}

/* ============================================
   CONTATORE ORDINI GIORNO (Blocco 3.3b)
   Conta gli ordini di oggi (tutti gli utenti).
   Si azzera automaticamente a mezzanotte.
   ============================================ */

   function startOrdersCounter() {
    if (_unsubAllCarts) _unsubAllCarts();
  
    _unsubAllCarts = listenAllCarts((carts) => {
      _allCarts = carts || [];
      updateOrdersCount();
    });
  
    scheduleMidnightRefresh();
  }
  
  function updateOrdersCount() {
    const visible = _allCarts.filter(isVisibleInDropdown);
    const el = document.getElementById("countOrdini");
    if (el) el.textContent = String(visible.length);
  }

  /**
   * 🆕 Blocco 8 — Regola visibilità tendina banco:
   * - Ordini di OGGI (createdAt >= mezzanotte) → sempre visibili
   * - Ordini vecchi → visibili SOLO se:
   *     · status === "modifica"   (✏️ in corso)
   *     · status === "bozza"      (🔵 in lavorazione)
   *     · status === "sbloccato"  (🔓 ripreso in mano)
   *     · status === "pronto"     (🟣 in attesa)
   *     · wasModified === true    (✏️ permanente)
   *   Quelli con ✅ (nuovo/in_arrivo/fatto) di giorni precedenti
   *   spariscono dalla tendina ma RESTANO in activeCarts (ufficio).
   */
  function isVisibleInDropdown(cart) {
    const meta = cart.meta || {};
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if ((meta.createdAt || 0) >= startOfToday.getTime()) return true;

    const st = meta.status || "modifica";
    if (st === "modifica" || st === "bozza" || st === "sbloccato" || st === "pronto") return true;
    if (meta.wasModified === true) return true;
    return false;
  }
  
  function scheduleMidnightRefresh() {
    if (_midnightTimer) clearTimeout(_midnightTimer);
  
    const now = new Date();
    const next = new Date();
    next.setHours(24, 0, 5, 0); // domani 00:00:05 (5 secondi di margine)
    const ms = next.getTime() - now.getTime();
  
    _midnightTimer = setTimeout(() => {
      updateOrdersCount();
      scheduleMidnightRefresh();
      console.log("🌙 Contatore ordini resettato (mezzanotte)");
    }, ms);
  }
  
/* ============================================
   TENDINA ORDINI (Blocco 3.3c)
   ============================================ */

function wireOrdersDropdown() {
  if (_ordersDropdownWired) return;

  const btnTabOrdini = document.getElementById("btnTabOrdini");
  const dropdown = document.getElementById("ordersDropdown");
  if (!btnTabOrdini || !dropdown) return;

  // Toggle apertura
  btnTabOrdini.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.hasAttribute("hidden")) {
      openOrdersDropdown();
    } else {
      closeOrdersDropdown();
    }
  });

  // Chiudi cliccando fuori dalla CARD (l'overlay scuro)
  dropdown.addEventListener("click", (e) => {
    if (e.target === dropdown) closeOrdersDropdown();
  });

  // Chiudi su Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOrdersDropdown();
  });

  _ordersDropdownWired = true;
}

function openOrdersDropdown() {
  const dropdown = document.getElementById("ordersDropdown");
  if (!dropdown) return;
  renderOrdersDropdown();
  dropdown.removeAttribute("hidden");
}

function closeOrdersDropdown() {
  const dropdown = document.getElementById("ordersDropdown");
  if (dropdown) dropdown.setAttribute("hidden", "");
}

function renderOrdersDropdown() {
  const listEl = document.getElementById("ordersDropdownList");
  const countEl = document.getElementById("ordersDropdownCount");
  if (!listEl) return;

  const visibleCarts = _allCarts
    .filter(isVisibleInDropdown)
    .sort((a, b) => (b.meta?.createdAt || 0) - (a.meta?.createdAt || 0));

  if (countEl) countEl.textContent = String(visibleCarts.length);

  if (visibleCarts.length === 0) {
    listEl.innerHTML = `<div class="orders-empty">Nessun ordine</div>`;
    return;
  }

  listEl.innerHTML = visibleCarts.map((cart) => {
    const status = cart.meta?.status || "modifica";
    const icon = getStatusIcon(status);
    const clientName = cart.meta?.clientName || "Cliente 1";
    const time = formatTimeHHMM(cart.meta?.createdAt);
    const total = formatEuro(cart.meta?.totals?.grandTotal || 0);
    const lineCount = Object.keys(cart.lines || {}).length;

    let displayName;
    if (cart.meta?.invoiceNumber) {
      const cp = (cart.meta?.clientName && cart.meta.clientName !== "Cliente 1")
        ? " · " + cart.meta.clientName
        : "";
      displayName = `Fattura ${cart.meta.invoiceNumber}${cp}`;
    } else if (cart.meta?.orderNumber && cart.meta?.orderCode) {
      displayName = `Ordine #${cart.meta.orderNumber} - ${cart.meta.orderCode}`;
    } else {
      displayName = clientName;
    }

    return `
      <div class="orders-dropdown-item"
           data-cart-id="${cart.id}"
           data-status="${status}">
        <span class="orders-dropdown-icon">${icon}</span>
        <div class="orders-dropdown-info">
          <div class="orders-dropdown-client">${escapeHtml(displayName)}</div>
          <div class="orders-dropdown-meta">${time} · ${lineCount} art.</div>
        </div>
        <div class="orders-dropdown-total">${total}</div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll(".orders-dropdown-item").forEach((el) => {
    el.addEventListener("click", () => {
      handleOrderFromDropdown(el.dataset.cartId, el.dataset.status);
    });
  });
}

function getStatusIcon(status) {
  if (status === "modifica") return "✏️";
  if (status === "bozza") return "🔵";
  if (status === "nuovo" || status === "in_arrivo" || status === "fatto") return "✅";
  if (status === "pronto") return "🟣";
  if (status === "sbloccato") return "🔓";
  return "⚪";
}

function getClientIcon(status, wasModified) {
  if (status === "modifica") return "✏️";
  if (status === "bozza") return "🔵";
  if (wasModified === true) return "✏️";
  return "";
}

function formatTimeHHMM(ms) {
  if (!ms) return "--:--";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function handleOrderFromDropdown(cartId, status) {
  closeOrdersDropdown();

  // Se è il TUO carrello in modifica corrente
  if (cartId === _cartId && status === "modifica") {
    showToast("Stai già lavorando su questo ordine", "info");
    return;
  }

  // Apri anteprima ordine dentro il banco
  openOrderPreview(cartId);
}

function openOrderPreview(cartId) {
  const cart = _allCarts.find((c) => c.id === cartId);
  if (!cart) {
    showToast("Ordine non trovato", "error");
    return;
  }

  const meta = cart.meta || {};
  const lines = Object.entries(cart.lines || {}).map(([id, l]) => ({ id, ...l }));
  const status = meta.status || "modifica";

  // Banner info per stato
  const bannerInfo = {
    modifica:   { text: "✏️ In modifica",                },
    bozza:      { text: "🔵 In lavorazione"              },
    nuovo:      { text: "🟡 Nuovo"                       },
    in_arrivo:  { text: "🔴 In arrivo"                   },
    fatto:      { text: "✅ Ordine inviato alla cassa"    },
    pronto:     { text: "🟣 Pronto"                      },
    sbloccato:  { text: "🟢 Sbloccato"                   },
  }[status] || { text: status.toUpperCase() };

  const linesHtml = lines.length === 0
    ? `<div class="banco-order-line-empty">Nessun articolo</div>`
    : lines.map((l, i) => {
        const qty = Number(l.qty) || 0;
        const price = Number(l.unitPrice ?? l.basePrice) || 0;
        const total = Number(l.lineTotal) || 0;
        return `
          <div class="banco-order-line">
            <span class="idx">${i + 1}.</span>
            <div class="desc">
              <div class="name">${escapeHtml(l.description || "")}</div>
              <div class="code">${escapeHtml(l.code || "")}</div>
            </div>
            <span class="qty">${formatQty(qty)} ${escapeHtml((l.unit || "PZ").toLowerCase())}</span>
            <span class="price">${formatEuro(price)}</span>
            <span class="total">${formatEuro(total)}</span>
          </div>
        `;
      }).join("");

  const total = Number(meta.totals?.grandTotal) || 0;

  const overlay = document.createElement("div");
  overlay.className = "fapp-modal-overlay";
  overlay.innerHTML = `
    <div class="fapp-modal-box banco-order-view">
      <div class="banco-order-banner" data-status="${status}">
        <span>${bannerInfo.text}</span>
        <span class="banco-order-eye">👁️</span>
      </div>
     
      <div class="banco-order-client">${escapeHtml(
        meta.invoiceNumber
          ? `Fattura ${meta.invoiceNumber}${meta.clientName && meta.clientName !== "Cliente 1" ? " · " + meta.clientName : ""}`
          : (meta.orderNumber && meta.orderCode)
            ? `Ordine #${meta.orderNumber} - ${meta.orderCode}`
            : (meta.clientName || "Cliente 1")
      )}</div>

      <div class="banco-order-lines">
        ${linesHtml}
      </div>

      <div class="banco-order-totalbox">
        <span>TOTALE</span>
        <strong>${formatEuro(total)}</strong>
      </div>

      <div class="banco-order-actions">
        <div class="banco-order-actions-row">
          <button class="btn btn-primary" id="boBtnSblocca" type="button">🔓 Sblocca e modifica</button>
          <button class="btn btn-outline" id="boBtnOrdini" type="button">📋 Ordini</button>
        </div>
        <div class="banco-order-actions-row">
          <button class="btn btn-danger btn-icon" id="boBtnTrash" type="button">🗑</button>
          <button class="btn btn-outline" id="boBtnStampa" type="button">🖨 Stampa DDT</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  // Pulsante ORDINI → chiude e riapre tendina (dopo 1 tick per evitare che il click fuori la richiuda subito)
  overlay.querySelector("#boBtnOrdini").addEventListener("click", (e) => {
    e.stopPropagation();
    close();
    setTimeout(() => openOrdersDropdown(), 10);
  });

    // Pulsante STAMPA → stampa l'ordine corrente (Blocco 3.8)
    overlay.querySelector("#boBtnStampa").addEventListener("click", async () => {
      const { printOrders } = await import("../components/print-orders-modal.js");
      printOrders([{
        id: cartId,
        orderNumber: meta.orderNumber,
        orderCode: meta.orderCode,
        clientName: meta.clientName,
        createdByName: meta.createdByName,
        createdAt: meta.createdAt,
        wasModified: meta.wasModified,
        note: meta.note,
        lines: cart.lines || {},
        grandTotal: Number(meta.totals?.grandTotal) || 0
      }]);
      showToast("🖨 Apertura stampa…", "info");
    });

  // Pulsante TRASH → Blocco 8 (regola A: cestina solo se status = "modifica")
  overlay.querySelector("#boBtnTrash").addEventListener("click", async () => {
    const st = meta.status || "modifica";
    if (st !== "modifica") {
      showToast(`🗑 Non cestinabile: ordine in stato "${st}"`, "info");
      return;
    }
    if (!confirm("Spostare questo ordine nel cestino?")) return;
    try {
      await trashCart(cartId, "banco", _user);
      close();
      showToast("🗑 Ordine cestinato", "success");
    } catch (e) {
      console.error("Errore cestinamento da preview:", e);
      showToast("Errore cestinamento", "error");
    }
  });

  // Pulsante SBLOCCA → sblocca + carica nel banco come carrello attivo
  overlay.querySelector("#boBtnSblocca").addEventListener("click", async () => {
    if (!confirm("Sbloccare l'ordine per modificarlo?")) return;
    try {
      // 1) Cambia stato + isLocked
      await updateStatus(cartId, "sbloccato");
      await updateLineLock(cartId, false);

      // 2) Chiudi modale
      close();

      // 3) Carica nel banco come carrello attivo
      await switchToCart(cartId);

      showToast("🔓 Ordine caricato nel banco", "success");
    } catch (err) {
      console.error("Errore sblocco:", err);
      showToast("Errore sblocco", "error");
    }
  });
}
/* ============================================
   SYNC TOTALI (Blocco 3.2b)
   Aggiorna lineCount e totals su Firebase ogni
   volta che il carrello cambia. Debounced per
   evitare loop.
   ============================================ */

   let _totalsSyncTimer = null;
let _lastSyncedKey = null;

function scheduleTotalsSync() {
  if (_totalsSyncTimer) clearTimeout(_totalsSyncTimer);
  _totalsSyncTimer = setTimeout(async () => {
    if (!_cartId) return;
    const lines = getLines();
    const totals = computeTotals(lines);

    // 🛡️ GUARDIA ANTI-LOOP: se identico all'ultimo sync, non scrivere
    const key = `${_cartId}|${totals.lineCount}|${totals.subtotal}|${totals.discount}|${totals.grandTotal}`;
    if (key === _lastSyncedKey) return;
    _lastSyncedKey = key;

    try {
      await updateTotals(_cartId, totals);
      console.log(`🔄 Sync totali: ${totals.lineCount} righe, €${totals.grandTotal}`);
    } catch (e) {
      console.error("Errore sync totali:", e);
      _lastSyncedKey = null; // in caso di errore, permetti retry
    }
  }, 400);
}
/* ============================================
   CESTINO (Blocco 8) — Tab 🗑 in banco
   ============================================ */

   let _unsubTrash = null;
   let _trashCarts = [];
   
   function startTrashListener() {
     if (_unsubTrash) _unsubTrash();
     _unsubTrash = listenTrashCarts((carts) => {
       _trashCarts = carts || [];
       updateTrashCount();
       // Se la modale cestino è aperta, aggiorna la lista
       const dd = document.getElementById("trashDropdown");
       if (dd) renderTrashDropdown();
     });
   }
   
   function updateTrashCount() {
     const el = document.getElementById("countCestino");
     if (el) el.textContent = String(_trashCarts.length);
   }
   
   function wireTrashTab() {
     const tab = document.querySelector('.banco-tab[data-tab="cestino"]');
     if (!tab || tab._hasTrashListener) return;
     tab._hasTrashListener = true;
     tab.addEventListener("click", openTrashOverlay);
   }
   
   function openTrashOverlay() {
     const existing = document.getElementById("trashDropdown");
     if (existing) existing.remove();
   
     const overlay = document.createElement("div");
     overlay.id = "trashDropdown";
     overlay.className = "fapp-modal-overlay";
     overlay.innerHTML = `
       <div class="fapp-modal-box banco-order-view">
         <div class="banco-order-banner" style="background:#7f1d1d;color:#fff;">
           <span>🗑 CESTINO <span id="trashOverlayCount">${_trashCarts.length}</span></span>
         </div>
         <div class="banco-order-lines" id="trashListArea"></div>
         <div class="banco-order-actions">
           <div class="banco-order-actions-row">
             <button class="btn btn-outline" id="trashBtnClose" type="button">Chiudi</button>
           </div>
         </div>
       </div>
     `;
     document.body.appendChild(overlay);
   
     overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
     document.addEventListener("keydown", function esc(e) {
       if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", esc); }
     });
     overlay.querySelector("#trashBtnClose").addEventListener("click", () => overlay.remove());
   
     renderTrashDropdown();
   }
   
   function renderTrashDropdown() {
     const area = document.getElementById("trashListArea");
     const cnt = document.getElementById("trashOverlayCount");
     if (cnt) cnt.textContent = String(_trashCarts.length);
     if (!area) return;
   
     if (_trashCarts.length === 0) {
       area.innerHTML = `<div class="banco-order-line-empty">Cestino vuoto</div>`;
       return;
     }
   
     area.innerHTML = _trashCarts.map((c) => {
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
   
     area.querySelectorAll("[data-trash-action]").forEach((btn) => {
       btn.addEventListener("click", async (e) => {
         e.stopPropagation();
         const cartId = btn.dataset.trashId;
         const action = btn.dataset.trashAction;
         if (action === "restore") {
           if (!confirm("Ripristinare questo ordine? Tornerà in stato 'modifica'.")) return;
           try {
             await restoreCart(cartId);
             showToast("♻️ Ordine ripristinato", "success");
           } catch (err) {
             console.error("Errore ripristino:", err);
             showToast("Errore ripristino", "error");
           }
         } else if (action === "delete") {
           if (!confirm("Eliminare DEFINITIVAMENTE questo ordine? Irreversibile!")) return;
           try {
             await deleteCartPermanently(cartId);
             showToast("❌ Eliminato definitivamente", "success");
           } catch (err) {
             console.error("Errore eliminazione:", err);
             showToast("Errore eliminazione", "error");
           }
         }
       });
     });
   }

/* ============================================
   🆕 Tab "+ NUOVO" — crea un nuovo carrello
   ============================================ */

   function wireNewCartTab() {
    const tab = document.querySelector('.banco-tab[data-tab="nuovo"]');
    if (!tab || tab._hasNewCartListener) return;
    tab._hasNewCartListener = true;
    tab.addEventListener("click", startNewCart);
  }
  
  async function startNewCart() {
    const lines = getLines();
  
    // Carrello vuoto → nulla da mettere in sospeso
    if (lines.length === 0) {
      showToast("Carrello già vuoto", "info");
      return;
    }
  
    // Chiedi conferma
    if (!confirm("Iniziare un nuovo ordine?\nQuello attuale resta salvato negli ORDINI (non viene perso).")) {
      return;
    }
  
    try {
      // Il carrello attuale è già salvato in Firebase (status "modifica").
      // Basta staccarsi da esso e creare un nuovo carrello vuoto.
      await switchToNewCart();
      showToast("🆕 Nuovo ordine avviato", "success");
    } catch (e) {
      console.error("Errore nuovo ordine:", e);
      showToast("Errore apertura nuovo ordine", "error");
    }
  }

   /**
 * Gestisce il cambio di H o L (solo MQ) → ricalcola qty = H × L
 */
async function onHlChange(lineId, lineEl) {
  const inputs = lineEl.querySelectorAll(".clv2-hxl-input");
  if (inputs.length < 2) return;

  const h = parseFloat(inputs[0].value) || 0;
  const l = parseFloat(inputs[1].value) || 0;
  const qty = h * l;
  if (qty <= 0) return;

  const line = getLines().find(x => x.id === lineId);
  if (!line) return;

  const updated = computeLine({ ...line, qty: qty });
  await updateLine(_cartId, lineId, {
    qty: updated.qty,
    h: h,
    l: l,
    lineTotal: updated.lineTotal,
    discountAmount: updated.discountAmount
  });

  showToast(`H ${h} × L ${l} = ${qty} MQ`, "success");
}

  