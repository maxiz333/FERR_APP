import { loadArchivedCarts } from "../../data/archive-repository.js";
import { printOrders } from "../components/print-orders-modal.js";
import { printDDT } from "../components/print-ddt.js"; // 🆕 Importa il DDT
import { getClientByKey } from "../../data/client-repository.js"; // 🆕 Serve per recuperare l'indirizzo del cliente
import { getOrderTimestamp } from "../../data/cart-repository.js";
import { getSession } from "../../core/auth.js";

let _archivedOrders = [];
let _searchQuery = "";

export async function initArchivioController() {
  const user = getSession();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const listEl = document.getElementById("archiveList");
  const searchInput = document.getElementById("archiveSearch");

  if (!listEl) return;

  // Leggi il parametro data dall'URL (es. ?date=2026-11-14)
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get("date");
  let autoExpand = false;

  if (dateParam) {
    const [y, m, d] = dateParam.split("-");
    const formattedDate = `${d}/${m}/${y}`;
    _searchQuery = formattedDate;
    if (searchInput) searchInput.value = formattedDate;
    autoExpand = true;
  }

  try {
    _archivedOrders = await loadArchivedCarts();
    renderList(listEl, autoExpand);
  } catch (error) {
    console.error("Errore caricamento archivio:", error);
    listEl.innerHTML = `<div class="archive-empty" style="color:var(--danger)">Errore nel caricamento dell'archivio.</div>`;
  }

  if (searchInput) {
    let debounce = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        _searchQuery = searchInput.value.trim().toLowerCase();
        renderList(listEl, false);
      }, 150);
    });
  }
}

function renderList(container, expandAll = false) {
  let filtered = _archivedOrders;

  if (_searchQuery) {
    filtered = filtered.filter(o => {
      const clientName = (o.meta?.clientName || "").toLowerCase();
      const orderNum = `#${o.meta?.orderNumber || ""}`.toLowerCase();
      const invoiceNum = o.meta?.invoiceNumber ? `fattura ${o.meta.invoiceNumber}`.toLowerCase() : "";
      const ts = getOrderTimestamp(o.meta);
      const dateStr = new Date(ts).toLocaleDateString("it-IT");
      
      return clientName.includes(_searchQuery) || 
             orderNum.includes(_searchQuery) || 
             invoiceNum.includes(_searchQuery) ||
             dateStr.includes(_searchQuery);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="archive-empty">Nessun ordine trovato.</div>`;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const meta = order.meta || {};
    const isInvoice = !!meta.invoiceNumber;
    
    // 🆕 Nome visualizzato: se è fattura mostra "Fattura N", altrimenti "Ordine #N"
    let orderName;
    if (isInvoice) {
      orderName = `Fattura ${meta.invoiceNumber}${meta.clientName && meta.clientName !== "Cliente 1" ? " · " + meta.clientName : ""}`;
    } else if (meta.orderNumber && meta.orderCode) {
      orderName = `Ordine #${meta.orderNumber} - ${meta.orderCode}`;
    } else {
      orderName = meta.clientName || "Cliente 1";
    }
    
    const ts = getOrderTimestamp(meta);
    const date = new Date(ts).toLocaleDateString("it-IT");
    const total = (meta.totals?.grandTotal || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 🆕 Etichetta del tasto Stampa
    const stampaLabel = isInvoice ? "🖨 Stampa DDT" : "🖨 Stampa";

    const linesHtml = Object.entries(order.lines || {}).map(([id, l]) => {
      const qty = Number(l.qty) || 0;
      const unit = (l.unit || "PZ").toUpperCase();
      const price = Number(l.unitPrice ?? l.basePrice) || 0;
      const lineTot = Number(l.lineTotal) || 0;
      const isReturn = !!l.isReturn;
      const sign = isReturn ? "-" : "";
      const redClass = isReturn ? "is-return" : "";

      return `
        <div class="archive-line">
          <span class="archive-line-code">${escapeHtml(l.code || "")}</span>
          <span class="archive-line-desc">${escapeHtml(l.description || "")}</span>
          <span class="archive-line-qty">${qty} ${unit}</span>
          <span class="archive-line-price ${redClass}">${sign}€ ${price.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
          <span class="archive-line-tot ${redClass}">${sign}€ ${lineTot.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="archive-item" data-id="${order.id}">
        <div class="archive-item-header">
          <div class="archive-item-info">
            <div class="archive-item-title">
              <span class="archive-toggle-icon">${expandAll ? '▼' : '▶'}</span>
              ${escapeHtml(orderName)}
            </div>
            <div class="archive-item-meta">${escapeHtml(meta.clientName || "")} · ${date} · ${Object.keys(order.lines || {}).length} articoli</div>
          </div>
          <div class="archive-item-total">€ ${total}</div>
          <button class="btn-print" data-id="${order.id}">${stampaLabel}</button>
        </div>
        
        <div class="archive-item-lines" style="${expandAll ? 'display: block;' : 'display: none;'}">
          ${linesHtml}
        </div>
      </div>
    `;
  }).join("");

  // Listener per il tasto Stampa
  container.querySelectorAll(".btn-print").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Evita di aprire/chiudere la card
      const orderId = btn.dataset.id;
      const order = _archivedOrders.find(o => o.id === orderId);
      if (!order) return;

      const meta = order.meta || {};

      if (meta.invoiceNumber) {
        // 🆕 È una fattura -> Stampa DDT
        let client = null;
        if (meta.clientId) {
          try { client = await getClientByKey(meta.clientId); } catch (err) { /* ignora */ }
        }
        printDDT({
          cart: { meta: meta, lines: order.lines || {} },
          invoiceNumber: meta.invoiceNumber,
          client: client
        });
      } else {
        // Non è una fattura -> Stampa normale
        printOrders([{
          id: order.id,
          orderNumber: meta.orderNumber,
          orderCode: meta.orderCode,
          clientName: meta.clientName,
          createdByName: meta.createdByName,
          createdAt: getOrderTimestamp(meta),
          wasModified: meta.wasModified,
          note: meta.note,
          lines: order.lines || {},
          grandTotal: Number(meta.totals?.grandTotal) || 0
        }]);
      }
    });
  });

  // Listener per aprire/chiudere l'ordine
  container.querySelectorAll(".archive-item-header").forEach(header => {
    header.addEventListener("click", () => {
      const linesContainer = header.nextElementSibling;
      const icon = header.querySelector(".archive-toggle-icon");
      if (linesContainer.style.display === "none") {
        linesContainer.style.display = "block";
        if (icon) icon.textContent = "▼";
      } else {
        linesContainer.style.display = "none";
        if (icon) icon.textContent = "▶";
      }
    });
  });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}