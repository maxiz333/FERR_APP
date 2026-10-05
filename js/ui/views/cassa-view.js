/* ============================================
   CASSA-VIEW.JS — Blocco 3B-bis
   Lista compatta + Dettaglio
   ============================================ */

   import { renderPriceDot } from "../components/price-dot.js";
   let _currentDetailId = null;
   let _editMode = false;

   export function renderOrders(orders) {
     const container = document.getElementById("casList");
     if (!container) return;
   
     // Se c'è un dettaglio aperto, mostra quello
     if (_currentDetailId) {
       const order = orders.find((o) => o.id === _currentDetailId);
       if (order) {
         renderDetail(order);
         return;
       }
       // Ordine non più in lista → torna alla lista
       _currentDetailId = null;
     }
   
     if (!orders || orders.length === 0) {
       container.innerHTML = `
         <div class="cas-empty">
           <div class="cas-empty-icon">🧾</div>
           <div class="cas-empty-text">Nessun ordine da battere</div>
         </div>
       `;
       return;
     }
   
     container.innerHTML = orders.map(renderCompactCard).join("");
   
     // Delegation click sulla card
     container.querySelectorAll(".cas-card").forEach((el) => {
       el.addEventListener("click", () => {
         _currentDetailId = el.dataset.orderId;
         // Richiama il refresh per ridisegnare
         window.dispatchEvent(new CustomEvent("cassa:refresh"));
       });
     });
   }
   
   export function getCurrentDetailId() {
     return _currentDetailId;
   }
   
export function isEditMode() {
  return _editMode;
}

export function setEditMode(val) {
  _editMode = !!val;
  window.dispatchEvent(new CustomEvent("cassa:refresh"));
}

   export function closeDetail() {
    _currentDetailId = null;
    _editMode = false;
    window.dispatchEvent(new CustomEvent("cassa:refresh"));
  }
   
   /* ---------- LISTA ---------- */
   
   function renderCompactCard(order) {
     const status = order.status || "nuovo";
     const lines = Object.entries(order.lines || {}).map(([id, l]) => ({ id, ...l }));
     const totals = computeOrderTotals(lines);
     const statusLabel = { nuovo: "NUOVO", in_arrivo: "IN ARRIVO" }[status] || status.toUpperCase();
     const statusClass = status === "in_arrivo" ? "is-in-arrivo" : "is-nuovo";
     const date = formatDate(order.createdAt);
     const code = `#${order.id.split("_").pop().slice(-6)}`;
   
     const displayName = (order.orderNumber && order.orderCode)
     ? `Ordine #${order.orderNumber} - ${order.orderCode}`
     : (order.clientName || "Cliente 1");
 
   return `
     <article class="cas-card ${statusClass}" data-order-id="${escapeHtml(order.id)}" data-status="${status}">
       <div class="cas-card-client">${escapeHtml(displayName)}</div>
         <div class="cas-card-meta">
           <span class="cas-card-status">${statusLabel} ${code}</span>
           <span>·</span>
           <span>${lines.length} art.</span>
           <span>·</span>
           <span>${date}</span>
         </div>
         <div class="cas-card-total">${formatEuro(totals.grandTotal)}</div>
       </article>
     `;
   }
   
   /* ---------- DETTAGLIO ---------- */
   
   function renderDetail(order) {
     const container = document.getElementById("casList");
     const status = order.status || "nuovo";
     const lines = Object.entries(order.lines || {}).map(([id, l]) => ({ id, ...l }));
     const totals = computeOrderTotals(lines);
     const date = formatDate(order.createdAt);
     const code = `#${order.id.split("_").pop().slice(-6)}`;
   
     const linesHtml = lines.length === 0
       ? `<div style="padding:30px;text-align:center;opacity:0.4;">Nessun articolo</div>`
       : lines.map((l, i) => {
        const qty = formatQty(l.qty);
        const unit = (l.unit || "PZ").toLowerCase();
        const price = Number(l.unitPrice ?? l.basePrice) || 0;
        const total = Number(l.lineTotal) || 0;
        const editableClass = _editMode ? "is-editable" : "";
        const dataQty = _editMode ? `data-action="edit-qty" data-line-id="${escapeHtml(l.id)}"` : "";
        const dataPrice = _editMode ? `data-action="edit-price" data-line-id="${escapeHtml(l.id)}"` : "";
                // 🆕 Pallino stato prezzo (Blocco 2B.7)
                const priceDot = renderPriceDot(l._article, { size: "sm" });

                return `
                  <div class="cas-det-line">
                    <div class="cas-det-idx">${i + 1}.</div>
                    <div class="cas-det-desc">
                      <div class="cas-det-name">${escapeHtml(l.description || "")}</div>
                      <div class="cas-det-code">${escapeHtml(l.code || "")}</div>
                    </div>
                    <div class="cas-det-qty-badge ${editableClass}" ${dataQty}>${qty} ${unit}</div>
                    <div class="cas-det-price ${editableClass}" ${dataPrice}>× ${formatEuro(price)}${priceDot}</div>
                    <div class="cas-det-linetotal">${formatEuro(total)}</div>
                  </div>
                `;
      }).join("");
   
     container.innerHTML = `
       <div class="cas-detail">
         <header class="cas-det-header">
           <button class="cas-det-back" id="casDetBack">←</button>
        <div class="cas-det-info">
          <div class="cas-det-client">${escapeHtml(
            (order.orderNumber && order.orderCode)
              ? `Ordine #${order.orderNumber} - ${order.orderCode}`
              : (order.clientName || "Cliente 1")
          )}</div>
          <div class="cas-det-meta">${code} · ${date} · ${lines.length} articol${lines.length === 1 ? "o" : "i"}</div>
        </div>
         </header>
   
         <div class="cas-det-lines">
           ${linesHtml}
         </div>
   
         <footer class="cas-det-footer">
           <div class="cas-det-totbox">
             <div class="cas-det-totlabel">TOTALE</div>
             <div class="cas-det-totvalue">${formatEuro(totals.grandTotal)}</div>
             <div class="cas-det-totcount">${lines.length} articol${lines.length === 1 ? "o" : "i"}</div>
           </div>
           <div class="cas-det-actions">
          <button class="cas-det-unlock ${_editMode ? "is-active" : ""}" id="casDetUnlock" data-order-id="${escapeHtml(order.id)}">
            ${_editMode ? "🔒 Blocca modifiche" : "🔓 Sblocca e modifica"}
          </button>
             <button class="cas-det-fatto" id="casDetFatto" data-order-id="${escapeHtml(order.id)}">✅ FATTO</button>
           </div>
         </footer>
       </div>
     `;
   
     // Wire pulsante back
     const backBtn = document.getElementById("casDetBack");
     if (backBtn) backBtn.addEventListener("click", () => closeDetail());
   }
   
   /* ---------- UTILS ---------- */
   
   function computeOrderTotals(lines) {
     let subtotal = 0, discount = 0, grandTotal = 0;
     for (const line of lines) {
       const qty = Number(line.qty) || 0;
       const unitPrice = Number(line.unitPrice ?? line.basePrice) || 0;
       const lineSub = qty * unitPrice;
       const lineDisc = Number(line.discountAmount) || 0;
       const lineTot = Number(line.lineTotal) ?? (lineSub - lineDisc);
       subtotal += lineSub;
       discount += lineDisc;
       grandTotal += lineTot;
     }
     return { subtotal, discount, grandTotal };
   }
   
   function formatDate(ts) {
     if (!ts) return "—";
     const d = new Date(ts);
     const now = new Date();
     const sameDay = d.toDateString() === now.toDateString();
     const hh = String(d.getHours()).padStart(2, "0");
     const mm = String(d.getMinutes()).padStart(2, "0");
     if (sameDay) return `Oggi ${hh}:${mm}`;
     const dd = String(d.getDate()).padStart(2, "0");
     const mo = String(d.getMonth() + 1).padStart(2, "0");
     return `${dd}/${mo} ${hh}:${mm}`;
   }
   
   function formatQty(q) {
     const n = Number(q) || 0;
     return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
   }
   
   function formatEuro(n) {
     const v = Number(n) || 0;
     return "€ " + v.toLocaleString("it-IT", {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
     });
   }
   
   function escapeHtml(s) {
     return String(s ?? "").replace(/[&<>"']/g, (c) => ({
       "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
     }[c]));
   }