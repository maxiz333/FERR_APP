/* ============================================================
   PRINT-ORDERS-MODAL.JS — Blocco 3.8
   Modale selezione ordini + generazione area di stampa A4
   ============================================================ */

/**
 * Apre la modale di selezione ordini.
 * @param {Object} opts
 * @param {Array} opts.orders            Lista ordini filtrati (già ordinati)
 * @param {string} [opts.currentOrderId] ID ordine corrente (pre-selezionato)
 * @param {string} [opts.filterLabel]    Etichetta filtro (es. "🟡 NUOVI")
 */
export function openPrintOrdersModal({ orders, currentOrderId, filterLabel = "" }) {
    if (!orders || orders.length === 0) {
      alert("Nessun ordine da stampare");
      return;
    }
  
    const selectedIds = new Set();
    if (currentOrderId) selectedIds.add(currentOrderId);
  
    const overlay = document.createElement("div");
    overlay.className = "print-modal-overlay";
    overlay.innerHTML = `
      <div class="print-modal-box">
        <div class="print-modal-header">
          <span>🖨 STAMPA ORDINI</span>
          <button class="print-modal-close" id="pmClose" title="Chiudi">✕</button>
        </div>
        <div class="print-modal-toolbar">
          <span class="print-modal-filter">
            Filtro: <strong>${escapeHtml(filterLabel)}</strong> · ${orders.length} ordini
          </span>
          <button class="print-modal-selectall" id="pmSelectAll">☑ Seleziona tutti</button>
        </div>
        <div class="print-modal-list" id="pmList">
          ${orders.map(o => renderRow(o, selectedIds.has(o.id))).join("")}
        </div>
        <div class="print-modal-footer">
          <span class="print-modal-count">
            Selezionati: <strong id="pmCount">${selectedIds.size}</strong> ordini
          </span>
          <span class="print-modal-total">
            Totale: <strong id="pmTotal">${formatEuro(computeSelectedTotal(orders, selectedIds))}</strong>
          </span>
          <div class="print-modal-actions">
            <button class="btn" id="pmCancel">ANNULLA</button>
            <button class="btn btn-primary" id="pmPrint" disabled>🖨 STAMPA</button>
          </div>
        </div>
      </div>
    `;
  
    document.body.appendChild(overlay);
  
    const listEl      = overlay.querySelector("#pmList");
    const countEl     = overlay.querySelector("#pmCount");
    const totalEl     = overlay.querySelector("#pmTotal");
    const selectAllBtn= overlay.querySelector("#pmSelectAll");
    const printBtn    = overlay.querySelector("#pmPrint");
  
    function updateFooter() {
      countEl.textContent = selectedIds.size;
      totalEl.textContent = formatEuro(computeSelectedTotal(orders, selectedIds));
      printBtn.disabled = selectedIds.size === 0;
  
      const allSel = selectedIds.size === orders.length;
      selectAllBtn.textContent = allSel ? "☐ Deseleziona tutti" : "☑ Seleziona tutti";
    }
  
    function toggleRow(id, checked, row) {
      if (checked) selectedIds.add(id); else selectedIds.delete(id);
      row.classList.toggle("is-selected", checked);
      updateFooter();
    }
  
    listEl.querySelectorAll(".print-modal-row").forEach(row => {
      const cb = row.querySelector('input[type="checkbox"]');
      // click sulla riga → toggle checkbox
      row.addEventListener("click", (e) => {
        if (e.target === cb) return; // già gestito dal change
        cb.checked = !cb.checked;
        toggleRow(row.dataset.orderId, cb.checked, row);
      });
      cb.addEventListener("change", () => {
        toggleRow(row.dataset.orderId, cb.checked, row);
      });
    });
  
    selectAllBtn.addEventListener("click", () => {
      const allSel = selectedIds.size === orders.length;
      selectedIds.clear();
      if (!allSel) orders.forEach(o => selectedIds.add(o.id));
  
      listEl.querySelectorAll(".print-modal-row").forEach(row => {
        const sel = selectedIds.has(row.dataset.orderId);
        row.querySelector('input[type="checkbox"]').checked = sel;
        row.classList.toggle("is-selected", sel);
      });
      updateFooter();
    });
  
    function close() {
      overlay.remove();
      document.removeEventListener("keydown", escHandler);
    }
    function escHandler(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", escHandler);
  
    overlay.querySelector("#pmClose").addEventListener("click", close);
    overlay.querySelector("#pmCancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  
    printBtn.addEventListener("click", () => {
      const selected = orders.filter(o => selectedIds.has(o.id));
      if (selected.length === 0) return;
      printOrders(selected);
      close();
    });
  
    updateFooter();
  }
  
  /* ============================================================
     RENDER RIGA MODALE
     ============================================================ */
  function renderRow(order, checked) {
    const code = (order.orderNumber && order.orderCode)
      ? `Ordine #${order.orderNumber} - ${order.orderCode}`
      : (order.clientName || "Cliente 1");
    const pencil = order.wasModified ? " ✏️" : "";
    const time = formatTimeHHMM(order.createdAt);
    const lineCount = Object.keys(order.lines || {}).length;
    const total = formatEuro(order.grandTotal || 0);
  
    return `
      <label class="print-modal-row ${checked ? "is-selected" : ""}" data-order-id="${escapeHtml(order.id)}">
        <input type="checkbox" ${checked ? "checked" : ""}>
        <div>
          <div class="pm-code">${escapeHtml(code)}${pencil}</div>
          <div class="pm-client">${escapeHtml(order.clientName || "Cliente 1")}</div>
        </div>
        <div class="pm-time">${time}</div>
        <div class="pm-lines">${lineCount} art.</div>
        <div class="pm-total">${total}</div>
      </label>
    `;
  }
  
  /* ============================================================
     STAMPA — genera .print-area e chiama window.print()
     Esportata per essere usata anche dal Banco (singolo ordine)
     ============================================================ */
     export function printOrders(orders) {
      if (!orders || orders.length === 0) return;
    
      const html = orders.map(renderPrintOrder).join("");
      const cssHref = new URL("assets/css/print.css", window.location.href).href;
    
      const fullHtml = `<!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>Stampa ordini</title>
      <link rel="stylesheet" href="${cssHref}">
    </head>
    <body class="print-orders-body">
      ${html}
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
     RENDER ORDINE PER LA STAMPA
     ============================================================ */
  function renderPrintOrder(order) {
    const code = (order.orderNumber && order.orderCode)
      ? `Ordine #${order.orderNumber} - ${order.orderCode}`
      : (order.clientName || "Cliente 1");
    const pencil = order.wasModified ? " ✏️" : "";
  
    const lines = Object.entries(order.lines || {}).map(([id, l]) => ({ id, ...l }));
  
    const linesHtml = lines.map((line, idx) => {
      const qty = formatQty(line.qty);
      const unit = (line.unit || "PZ").toLowerCase();
      const unitPrice = Number(line.unitPrice ?? line.basePrice) || 0;
      const lineTotal = Number(line.lineTotal) || 0;
  
      return `
        <div class="print-line">
          <span class="print-idx">${idx + 1}</span>
          <span class="print-desc">
            <span class="print-name">${escapeHtml(line.description || "")}</span>
            <span class="print-code">${escapeHtml(line.code || "")}</span>
          </span>
          <span class="print-qty">${qty} ${unit}</span>
          <span class="print-price">${formatEuro(unitPrice)}</span>
          <span class="print-tot">${formatEuro(lineTotal)}</span>
        </div>
      `;
    }).join("");
  
    const noteHtml = order.note
      ? `<div class="print-note">📝 ${escapeHtml(order.note)}</div>`
      : "";
  
    const grandTotal = Number(order.grandTotal) || 0;
    const dateShort = formatDateShort(order.createdAt);
    const timeShort = formatTimeHHMM(order.createdAt);
  
    return `
      <div class="print-order">
        <div class="print-order-h">
          <span class="print-order-code">${escapeHtml(code)}${pencil}</span>
          <span class="print-order-client">${escapeHtml(order.clientName || "Cliente 1")}</span>
          <span class="print-order-op">${dateShort} ${timeShort} · ${escapeHtml(order.createdByName || "")}</span>
        </div>
        <div class="print-lines">${linesHtml}</div>
        ${noteHtml}
        <div class="print-order-tot">
          <span class="lbl">TOTALE</span>
          <span class="val">${formatEuro(grandTotal)}</span>
        </div>
      </div>
    `;
  }
  
  /* ============================================================
     UTILS
     ============================================================ */
  function computeSelectedTotal(orders, selectedIds) {
    return orders
      .filter(o => selectedIds.has(o.id))
      .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  }
  
  function formatDateShort(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  }
  
  function formatTimeHHMM(ts) {
    if (!ts) return "--:--";
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
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