/* ============================================
   CART-SERVICE.JS
   Gestione righe, quantità, totali del carrello.
   Non tocca Firebase: quello è compito del repository.
   ============================================ */

/**
 * Rappresentazione in memoria di un carrello attivo.
 * Struttura:
 * {
 *   meta: { id, clientId, clientName, status, note, createdBy, ... },
 *   lines: { [lineId]: { ...line } }
 * }
 */

let _cart = null;
let _listeners = [];

/* ============================================
   GESTIONE CARRELLO
   ============================================ */

export function setCart(cart) {
  _cart = cart || { meta: {}, lines: {} };
  _notify();
}

export function getCart() {
  return _cart;
}

export function getLines() {
  if (!_cart || !_cart.lines) return [];
  return Object.entries(_cart.lines).map(([id, line]) => ({ id, ...line }));
}

export function subscribe(fn) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter(l => l !== fn);
  };
}

function _notify() {
  _listeners.forEach(fn => {
    try { fn(_cart); } catch (e) { console.error(e); }
  });
}

/* ============================================
   AGGIUNTA ARTICOLO
   ============================================ */

/**
 * Genera un lineId univoco per il carrello corrente.
 * Usa timestamp + random per evitare collisioni tra
 * postazioni diverse che aggiungono nello stesso momento.
 */
export function newLineId() {
  return "L" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

/**
 * Crea una nuova riga a partire da un articolo.
 */
export function createLineFromArticle(article, user) {
  return {
    articleId: article.key,
    code: article.code,
    description: article.description,
    unit: article.unit || "PZ",
    qty: 1,
    basePrice: article.basePrice || 0,
    unitPrice: article.basePrice || 0,
    // 🆕 Campi per calcolatore taglio/peso (KG/MT/MQ)
    totU: article.totU || 0,
    mtRot: article.mtRot || 0,
    kgPerUm: article.kgPerUm || 0,
    discountPct: 0,
    discountAmount: 0,
    lineTotal: article.basePrice || 0,
    isRemnant: false,
    isReturn: false,
    isOrdered: false,
    supplier: null,
    supplierColor: null,
    note: "",
    addedBy: user.id,
    addedByName: user.name,
    addedAt: Date.now(),
    updatedAt: Date.now()
  };
}

/* ============================================
   CALCOLI
   ============================================ */

/**
 * Ricalcola i totali di una riga.
 * Regola: lineTotal = unitPrice * qty * (1 - discountPct/100)
 * Se c'è uno sconto forfettario, prevale discountAmount.
 */
export function computeLine(line) {
  const qty = Number(line.qty) || 0;
  const unitPrice = Number(line.unitPrice) || 0;
  const discountPct = Number(line.discountPct) || 0;

  let subtotal = qty * unitPrice;
  let discountAmount = 0;

  if (discountPct > 0) {
    discountAmount = subtotal * (discountPct / 100);
  }
  let lineTotal = subtotal - discountAmount;

  return {
    ...line,
    qty,
    unitPrice,
    discountPct,
    discountAmount: round2(discountAmount),
    lineTotal: round2(lineTotal)
  };
}

/**
 * Calcola i totali generali del carrello.
 */
export function computeTotals(lines) {
  let subtotal = 0;
  let discount = 0;
  let grandTotal = 0;

  for (const line of lines) {
    const qty = Number(line.qty) || 0;
    const unitPrice = Number(line.unitPrice) || 0;
    const lineSubtotal = qty * unitPrice;
    const lineDiscount = Number(line.discountAmount) || 0;

    subtotal += lineSubtotal;
    discount += lineDiscount;
    grandTotal += (lineSubtotal - lineDiscount);
  }

  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    grandTotal: round2(grandTotal),
    lineCount: lines.length
  };
}

/* ============================================
   UTILS
   ============================================ */

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Formatta un prezzo in formato italiano "€ 12,50".
 */
export function formatEuro(n) {
  if (typeof n !== "number") n = 0;
  return "€ " + n.toFixed(2).replace(".", ",");
}

/* ============================================
   VALIDAZIONI (Blocco 2B.5)
   ============================================ */

/**
 * Il carrello è vuoto?
 */
export function isEmpty() {
  return getLines().length === 0;
}

/**
 * Può essere confermato?
 * Ritorna: { ok: bool, reason: string, linesWithoutPrice: [] }
 */
export function canConfirm() {
  const lines = getLines();

  if (lines.length === 0) {
    return { ok: false, reason: "Carrello vuoto", linesWithoutPrice: [] };
  }

  const linesWithoutPrice = lines.filter(
    (l) => !Number(l.unitPrice) || Number(l.unitPrice) <= 0
  );

  if (linesWithoutPrice.length > 0) {
    return {
      ok: false,
      reason: `${linesWithoutPrice.length} articoli senza prezzo`,
      linesWithoutPrice
    };
  }

  return { ok: true, reason: "", linesWithoutPrice: [] };
}