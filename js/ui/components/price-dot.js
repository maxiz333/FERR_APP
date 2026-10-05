/* ============================================================
   PRICE-DOT.JS — Blocco 2B.7
   Logica del pallino stato prezzo (condivisa tra banco/ufficio/cassa)
   ============================================================ */

/**
 * Ritorna info sul pallino: { cls, label }
 * - cls: "gray" | "green" | "yellow" | "orange" | "red" | "purple"
 * - label: testo tooltip
 */
export function getPriceDotInfo(article) {
    if (!article) return { cls: "gray", label: "Articolo non trovato" };
  
    const verified = article.priceVerified === true;
    const lastChange = Number(article.priceLastChangedAt) || 0;
  
    // ⚫ Mai verificato
    if (!verified || !lastChange) {
      return { cls: "gray", label: "Prezzo mai verificato" };
    }
  
    const days = (Date.now() - lastChange) / (24 * 60 * 60 * 1000);
    const months = days / 30;
  
    if (months < 1)  return { cls: "green",  label: "Verificato di recente (0-1 mese)" };
    if (months < 3)  return { cls: "yellow", label: "Invariato da 1 mese — da controllare" };
    if (months < 6)  return { cls: "orange", label: "Invariato da 3 mesi — da aggiornare" };
    if (months < 12) return { cls: "red",    label: "Invariato da 6 mesi — urgente" };
    return { cls: "purple", label: "Invariato da 12+ mesi — critico" };
  }
  
  /**
   * Ritorna HTML del pallino. Se non c'è articolo → "" (niente pallino).
   * opts.size: "sm" | "md" | "lg" (default "md")
   */
  export function renderPriceDot(article, opts = {}) {
    if (!article) return "";
    const info = getPriceDotInfo(article);
    const size = opts.size || "md";
    return `<span class="price-dot price-dot-${info.cls} price-dot-${size}" title="${escapeHtml(info.label)}"></span>`;
  }
  
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }