/* ============================================
   UFFICIO-VIEW.JS
   Blocco 3.4/3.5b — Lock solo per FATTO + sconto €
   ============================================ */

   import { renderPriceDot } from "../components/price-dot.js";
   export function renderOrders(orders, collapsed = false) {
    const container = document.getElementById("uffList");
    if (!container) return;
  
    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="uff-empty">
          <div class="uff-empty-icon">📭</div>
          <div class="uff-empty-text">Nessun ordine da mostrare</div>
        </div>
      `;
      return;
    }
  
    container.innerHTML = orders.map((o) => renderOrder(o, collapsed)).join("");
  }
  
/**
 * Occhio 👁️ condizionale (Blocco 4)
 * Mostra l'occhio solo se qualcuno ha visto l'ordine.
 * Tooltip: "Visto da PAPA · 22:45"  (elenco utenti + ultima ora)
 */
function renderEye(seenBy) {
  if (!seenBy || typeof seenBy !== "object") return "";
  const entries = Object.entries(seenBy)
    .filter(([, ts]) => Number(ts) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  if (entries.length === 0) return "";

  const users = entries.map(([uid]) => uid.toUpperCase()).join(", ");
  const lastTs = Number(entries[0][1]) || 0;
  const d = new Date(lastTs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const tooltip = `Visto da ${users} · ${hh}:${mm}`;
  return `<span class="uff-order-banner-eye" title="${tooltip}">👁️</span>`;
}

  /* ============================================
     RENDER ORDINE
     ============================================ */
  
  function renderOrder(order, collapsed) {
    const status = order.status || "modifica";
    const banner = statusBanner(status);
    const date = formatDate(order.createdAt);
    const lines = Object.entries(order.lines || {}).map(([id, l]) => ({ id, ...l }));
  
    // 🔑 LOCK SOLO SE STATO = "fatto"
    const isLocked = status === "fatto";
  
    // Totali generali con eventuale sconto
    const totals = computeOrderTotals(lines);
    const totalHtml = renderTotals(totals);
  
    const linesHtml = lines.length
      ? lines.map((line, idx) => renderLine(line, idx, order.id, isLocked)).join("")
      : `<div class="uff-order-empty">Nessun articolo</div>`;
  
            // 🆕 Nota in stile banco: textarea in edit, div giallo se c'è nota, placeholder sottile se vuota
    const isNoteEditing = !!order._noteEditing;
    const hasNote = !!order.note;
    const noteHtml = isNoteEditing
      ? `<textarea class="uff-order-note-textarea" data-order-id="${escapeHtml(order.id)}"
                   placeholder="Scrivi e premi INVIO per salvare..."
                   rows="2">${escapeHtml(order.note || "")}</textarea>`
      : hasNote
        ? `<div class="uff-order-note-display" data-action="edit-note" data-order-id="${escapeHtml(order.id)}"
                  title="Clicca per modificare">${escapeHtml(order.note)}</div>`
        : `<div class="uff-order-note-placeholder" data-action="edit-note" data-order-id="${escapeHtml(order.id)}"
                  title="Aggiungi una nota">📝 Nota</div>`;
  
    // Azioni
    const isInvoice = !!order.invoiceNumber;
    const stampaAction = isInvoice ? "stampa-ddt" : "stampa";
    const stampaLabel = isInvoice ? "🖨 Stampa DDT" : "🖨 Stampa";

    const actionsHtml = isLocked
      ? `
        <button class="uff-action-btn uff-act-unlock" data-action="unlock" data-order-id="${escapeHtml(order.id)}">
          🔓 Sblocca e modifica
        </button>
        <div class="uff-action-row">
          <button class="uff-action-btn uff-act-stampa" data-action="${stampaAction}" data-order-id="${escapeHtml(order.id)}">${stampaLabel}</button>
        </div>
      `
      : `
        <button class="uff-action-btn uff-act-fatto" data-action="fatto" data-order-id="${escapeHtml(order.id)}">
          ✅ Fatto
        </button>
        <div class="uff-action-row">
          <button class="uff-action-btn uff-act-stampa" data-action="${stampaAction}" data-order-id="${escapeHtml(order.id)}">${stampaLabel}</button>
          <button class="uff-action-btn uff-act-pronto" data-action="pronto" data-order-id="${escapeHtml(order.id)}">📋 Pronto</button>
          <button class="uff-action-btn uff-act-elimina" data-action="elimina" data-order-id="${escapeHtml(order.id)}">🗑 Elimina</button>
        </div>
        ${isInvoice ? "" : `<button class="uff-action-btn uff-act-bol" data-action="bol" data-order-id="${escapeHtml(order.id)}">📄 BOL.</button>`}
      `;
  
    return `
      <article class="uff-order ${collapsed ? "is-collapsed" : ""} ${isLocked ? "is-locked" : ""}" data-status="${status}" data-order-id="${escapeHtml(order.id)}">
        <div class="uff-order-banner" data-status="${status}">
          <span class="uff-order-banner-label">${banner}</span>
          ${order._eyeTooltip ? `<span class="uff-order-banner-eye" title="${escapeHtml(order._eyeTooltip)}">👁️</span>` : ""}
        </div>
  
        <div class="uff-order-inner">
                    <div class="uff-order-header">
            <h3 class="uff-order-client">${escapeHtml(
              order.invoiceNumber
                ? `Fattura ${order.invoiceNumber}${order.clientName && order.clientName !== "Cliente 1" ? " · " + order.clientName : ""}`
                : (order.orderNumber && order.orderCode)
                  ? `Ordine #${order.orderNumber} - ${order.orderCode}`
                  : (order.clientName || "Cliente 1")
            )}${order.wasModified ? " ✏️" : ""}</h3>
            <div class="uff-order-meta">
              <span>${date}</span>
              <span>·</span>
              <span>${lines.length} articol${lines.length === 1 ? "o" : "i"}</span>
              <span>·</span>
              <span>👤 ${escapeHtml(order.createdByName)}</span>
            </div>
          </div>
  
          <div class="uff-order-body">
            <div class="uff-order-cols">
              <span class="col-prod">PRODOTTO</span>
              <span class="col-qty">Q.TÀ</span>
              <span class="col-prez">PREZZO</span>
              <span class="col-tot">TOT</span>
            </div>
  
            <div class="uff-order-lines">${linesHtml}</div>
  
             <div class="uff-order-notebox">${noteHtml}</div>
  
            <div class="uff-order-totalbox">${totalHtml}</div>
  
            <div class="uff-order-actions">${actionsHtml}</div>
          </div>
        </div>
      </article>
    `;
  }
  
  /* ============================================
     RENDER RIGA
     ============================================ */
  
     function renderLine(line, idx, orderId, isLocked) {
      const qty = formatQty(line.qty);
      const qtyNum = Number(line.qty) || 0;
      const unit = (line.unit || "PZ").toLowerCase();
      const code = line.code || "";
      const desc = line.description || "";
      const disc = Number(line.discountPct) || 0;
      const editable = isLocked ? "" : "uff-editable";
    
      // 💰 PREZZO UNITARIO (pieno, scontato, sconto unitario)
      const unitPrice = Number(line.unitPrice ?? line.basePrice) || 0;
      const unitDiscAmount = disc > 0 ? (unitPrice * disc / 100) : 0;
      const unitPriceDisc = unitPrice - unitDiscAmount;
    
      // 📦 TOTALE RIGA (pieno, scontato, sconto riga)
      const subTotal = unitPrice * qtyNum;
      const discountAmount = Number(line.discountAmount) || (subTotal * disc / 100);
      const finalTotal = Number(line.lineTotal) || (subTotal - discountAmount);
    
      const hasDiscount = disc > 0 && discountAmount > 0.001;
    
      // Badge sconto % (cliccabile)
      const discBadge = disc > 0
        ? `<button class="uff-line-disc ${editable}" data-action="edit-discount" data-order-id="${escapeHtml(orderId)}" data-line-id="${escapeHtml(line.id)}" title="${isLocked ? "Bloccato" : "Modifica sconto"}" ${isLocked ? "disabled" : ""}>-${disc}%</button>`
        : (isLocked ? "" : `<button class="uff-line-disc-add uff-editable" data-action="edit-discount" data-order-id="${escapeHtml(orderId)}" data-line-id="${escapeHtml(line.id)}" title="Aggiungi sconto">%</button>`);
    
            // 🆕 Pallino stato prezzo (Blocco 2B.7)
            const priceDot = renderPriceDot(line._article, { size: "sm" });

            // 🆕 Info extra per articoli a misura (KG/MT/MQ)
            const unitUp = (line.unit || "PZ").toUpperCase();
            const isMeasuredLine = ["KG", "MT", "MQ"].includes(unitUp) && line.basePrice > 0 && line.mtTotal;
            let priceSubHtml = "";
            if (isMeasuredLine) {
              const mtTotal = Number(line.mtTotal) || 0;
              const kgTotal = Number(line.kgTotal) || 0;
              const pricePerMt = mtTotal > 0 ? (Number(line.lineTotal) / mtTotal) : 0;
              priceSubHtml = `
                <span class="uff-p-sub-perunit">${mtTotal.toFixed(2).replace(".", ",")} mt · € ${pricePerMt.toFixed(3).replace(".", ",")}/mt</span>
                <span class="uff-p-sub-base">base € ${Number(line.basePrice).toFixed(2).replace(".", ",")}/kg · ${kgTotal.toFixed(3).replace(".", ",")} kg</span>
              `;
            }
      
            // 💰 HTML colonna PREZZO (3 numeri se sconto, 1 se no)
            const priceHtml = hasDiscount
              ? `
                <span class="uff-p-old">${formatEuro(unitPrice)}</span>
                <span class="uff-p-new">${formatEuro(unitPriceDisc)}${priceDot}</span>
                <span class="uff-p-disc">-${formatEuro(unitDiscAmount)}</span>
                ${priceSubHtml}
              `
              : `<span class="uff-p-single">${formatEuro(unitPrice)}${priceDot}</span>${priceSubHtml}`;
    
      // 📦 HTML colonna TOT riga (3 numeri se sconto, 1 se no)
      const totHtml = hasDiscount
        ? `
          <span class="uff-t-old">${formatEuro(subTotal)}</span>
          <span class="uff-t-new">${formatEuro(finalTotal)}</span>
          <span class="uff-t-disc">-${formatEuro(discountAmount)}</span>
        `
        : `<span class="uff-t-new">${formatEuro(finalTotal)}</span>`;
    
      return `
        <div class="uff-order-line">
          <div class="uff-line-prod">
            <button class="uff-line-title pc-clickable" type="button"
                    data-action="product-card"
                    data-order-id="${escapeHtml(orderId)}"
                    data-line-id="${escapeHtml(line.id)}"
                    data-article-code="${escapeHtml(code)}"
                    title="Apri scheda prodotto">${idx + 1}. ${escapeHtml(desc)}</button>
            <div class="uff-line-sub">
              <span class="uff-line-code uff-code-copy" data-action="copy-code" data-code="${escapeHtml(code)}" title="Clicca per copiare il codice">${escapeHtml(code)}</span>
              ${discBadge}
            </div>
            ${line.note ? `<div class="uff-line-note" title="Nota articolo">✏️ ${escapeHtml(line.note)}</div>` : ""}
          </div>
          <button class="uff-line-qty ${editable}" data-action="edit-qty" data-order-id="${escapeHtml(orderId)}" data-line-id="${escapeHtml(line.id)}" title="${isLocked ? "Bloccato" : "Modifica quantità"}" ${isLocked ? "disabled" : ""}>
            <span class="uff-line-qty-val">${qty}</span>
            <span class="uff-line-qty-unit">${unit}</span>
          </button>
          <button class="uff-line-prez ${editable}" data-action="edit-price" data-order-id="${escapeHtml(orderId)}" data-line-id="${escapeHtml(line.id)}" title="${isLocked ? "Bloccato" : "Modifica prezzo"}" ${isLocked ? "disabled" : ""}>
            ${priceHtml}
          </button>
          <div class="uff-line-tot">${totHtml}</div>
        </div>
      `;
    }
  
  /* ============================================
     TOTALI ORDINE
     ============================================ */
  
  function computeOrderTotals(lines) {
    let subtotal = 0;
    let discount = 0;
    let grandTotal = 0;
  
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
  
  function renderTotals(t) {
    const hasDisc = t.discount > 0.001;
  
    if (!hasDisc) {
      return `
        <span class="uff-order-totlabel">TOTALE</span>
        <span class="uff-order-totvalue">${formatEuro(t.grandTotal)}</span>
      `;
    }
  
    return `
      <span class="uff-order-totlabel">TOTALE</span>
      <div class="uff-order-totstack">
        <span class="uff-tot-old">${formatEuro(t.subtotal)}</span>
        <span class="uff-tot-new">${formatEuro(t.grandTotal)}</span>
        <span class="uff-tot-disc">-${formatEuro(t.discount)}</span>
      </div>
    `;
  }
  
  /* ============================================
     UTILS
     ============================================ */
  
  function statusBanner(status) {
    return {
      modifica:   "MODIFICA",
      bozza:      "🔵 BOZZA",
      nuovo:      "🟡 NUOVO",
      in_arrivo:  "🔴 IN ARRIVO",
      fatto:      "🟢 FATTO",
      pronto:     "🟣 PRONTO",
      sbloccato:  "🟢 SBLOCCO",
    }[status] || status.toUpperCase();
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
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mo}/${yy} ${hh}:${mm}`;
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