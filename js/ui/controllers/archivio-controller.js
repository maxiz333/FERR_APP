import { loadArchivedCarts } from "../../data/archive-repository.js";
import { printOrders } from "../components/print-orders-modal.js";
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

  try {
    _archivedOrders = await loadArchivedCarts();
    renderList(listEl);
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
        renderList(listEl);
      }, 150);
    });
  }
}

function renderList(container) {
  let filtered = _archivedOrders;

  if (_searchQuery) {
    filtered = filtered.filter(o => {
      const clientName = (o.meta?.clientName || "").toLowerCase();
      const orderNum = `#${o.meta?.orderNumber || ""}`.toLowerCase();
      const ts = getOrderTimestamp(o.meta);
      const dateStr = new Date(ts).toLocaleDateString("it-IT");
      
      return clientName.includes(_searchQuery) || 
             orderNum.includes(_searchQuery) || 
             dateStr.includes(_searchQuery);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="archive-empty">Nessun ordine trovato.</div>`;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const meta = order.meta || {};
    const orderName = meta.orderNumber && meta.orderCode 
      ? `Ordine #${meta.orderNumber} - ${meta.orderCode}` 
      : (meta.clientName || "Cliente 1");
    
    const ts = getOrderTimestamp(meta);
    const date = new Date(ts).toLocaleDateString("it-IT");
    const total = (meta.totals?.grandTotal || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
      <div class="archive-item">
        <div class="archive-item-info">
          <div class="archive-item-title">${escapeHtml(orderName)}</div>
          <div class="archive-item-meta">${escapeHtml(meta.clientName || "")} · ${date} · ${Object.keys(order.lines || {}).length} articoli</div>
        </div>
        <div class="archive-item-total">€ ${total}</div>
        <button class="btn-print" data-id="${order.id}">🖨 Stampa</button>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".btn-print").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.dataset.id;
      const order = _archivedOrders.find(o => o.id === orderId);
      if (order) {
        printOrders([{
          id: order.id,
          orderNumber: order.meta?.orderNumber,
          orderCode: order.meta?.orderCode,
          clientName: order.meta?.clientName,
          createdByName: order.meta?.createdByName,
          createdAt: getOrderTimestamp(order.meta),
          wasModified: order.meta?.wasModified,
          note: order.meta?.note,
          lines: order.lines || {},
          grandTotal: Number(order.meta?.totals?.grandTotal) || 0
        }]);
      }
    });
  });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}