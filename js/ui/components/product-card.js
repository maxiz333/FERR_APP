/* ============================================================
   PRODUCT-CARD.JS — Blocco 2B.6
   Scheda Prodotto (modale) — apre da banco, ufficio, ricerca
   ============================================================ */

   import {
    getArticleByCode,
    updateArticle,
    addPriceToHistory
  } from "../../data/article-repository.js";
  import { searchArticles, updateArticleInCache } from "../../domain/article-service.js";
  
  export const ProductCard = (() => {
    let overlayEl = null;
    let current = null;      // articolo corrente (con modifiche applicate)
    let original = null;     // copia per diff
    let pending = {};        // campi modificati non salvati
    let onSavedCb = null;
    let openSections = { history: false, correlati: false, scaglioni: false };
    let correlatiCache = {}; // { key: {code, description} }
  
    /* ============================================================
       OPEN / CLOSE
       ============================================================ */
       async function open({ articleKey, articleCode, articleData = null, onSaved = null } = {}) {
        onSavedCb = onSaved;
    
        // 🆕 Carica SEMPRE da Firebase per avere il prezzo più recente
        const code = articleCode || articleData?.code || articleKey;
        let art = null;
        try {
          art = await getArticleByCode(code);
        } catch (e) {
          console.error("Errore caricamento articolo da Firebase:", e);
        }
    
        // Fallback: usa articleData (cache) solo se Firebase fallisce
        if (!art && articleData) {
          art = { ...articleData };
        }
    
        if (!art) {
          alert("Articolo non trovato");
          return;
        }
  
      current = { ...art };
      original = { ...art };
      pending = {};
      openSections = { history: false, correlati: false, scaglioni: false };
      correlatiCache = {};
  
      render();
    }
  
    function close(force = false) {
      if (!force && hasPendingChanges()) {
        if (!confirm("Ci sono modifiche non salvate. Uscire comunque?")) return;
      }
      if (overlayEl) { overlayEl.remove(); overlayEl = null; }
      current = null; original = null; pending = {}; onSavedCb = null;
      document.removeEventListener("keydown", onKeydown);
    }
  
    function onKeydown(e) { if (e.key === "Escape") close(); }
  
    function hasPendingChanges() {
      return Object.keys(pending).some(k => pending[k] !== original[k]);
    }
  
    /* ============================================================
       HELPERS
       ============================================================ */
    function currentUnit() {
      return (pending.unit ?? current.unit ?? "PZ").toUpperCase();
    }
  
    function isMeasured() {
      return ["KG", "MT", "MQ"].includes(currentUnit());
    }
  
    function getPriceDot() {
      if (!current.priceVerified || !current.priceLastChangedAt) {
        return { cls: "gray", label: "Mai verificato" };
      }
      const days = (Date.now() - current.priceLastChangedAt) / (24 * 60 * 60 * 1000);
      const months = days / 30;
      if (months < 1)  return { cls: "green",  label: "Verificato di recente (0-1 mese)" };
      if (months < 3)  return { cls: "yellow", label: "Da controllare (1 mese)" };
      if (months < 6)  return { cls: "orange", label: "Da aggiornare (3 mesi)" };
      if (months < 12) return { cls: "red",    label: "Urgente (6 mesi)" };
      return { cls: "purple", label: "Critico (12+ mesi)" };
    }
  
    function historyEntries() {
      const h = current.priceHistory || {};
      return Object.entries(h)
        .map(([_, v]) => v)
        .filter(v => v && v.price != null)
        .sort((a, b) => (b.date || 0) - (a.date || 0))
        .slice(0, 5);
    }
  
    /* ============================================================
       RENDER
       ============================================================ */
    function render() {
      if (overlayEl) overlayEl.remove();
  
      const dot = getPriceDot();
      const hist = historyEntries();
      const correlati = Array.isArray(current.correlati) ? current.correlati : [];
      const scaglioni = Array.isArray(current.scaglioni) ? current.scaglioni : [];
  
      overlayEl = document.createElement("div");
      overlayEl.className = "pc-overlay";
      overlayEl.innerHTML = `
        <div class="pc-modal" role="dialog" aria-modal="true">
          <div class="pc-header">
            <span>📝 Modifica articolo</span>
            <button class="pc-close" type="button" id="pcClose">✕</button>
          </div>
  
          <div class="pc-body">
  
            <div class="pc-field">
              <label>DESCRIZIONE</label>
              <input id="pcDescription" class="pc-input" type="text"
                     value="${escAttr(current.description || "")}">
            </div>
  
            <div class="pc-grid-2">
              <div class="pc-field">
                <label>COD. FORN.</label>
                <input id="pcSupplierCode" class="pc-input" type="text"
                       value="${escAttr(current.supplierCode || "")}">
              </div>
              <div class="pc-field">
                <label>MIO COD.</label>
                <input class="pc-input pc-readonly" type="text"
                       value="${escAttr(current.code || "")}" readonly>
              </div>
            </div>
  
            <div class="pc-grid-3">
              <div class="pc-field">
                <label>PREZZO <span class="pc-dot pc-dot-${dot.cls}" title="${escAttr(dot.label)}"></span></label>
                <input id="pcBasePrice" class="pc-input" type="number" step="0.01" min="0"
                       value="${fmtNum(current.basePrice)}">
              </div>
              <div class="pc-field">
                <label>PRZ. VECCHIO</label>
                <button class="pc-input pc-history-btn" id="pcHistoryBtn" type="button">
                  <span>${openSections.history ? "▾" : "▸"} (${hist.length}) ${openSections.history ? "▲" : "▼"}</span>
                </button>
              </div>
              <div class="pc-field">
                <label>ACQ.</label>
                <input id="pcPurchasePrice" class="pc-input" type="number" step="0.01" min="0"
                       value="${fmtNum(current.purchasePrice)}">
              </div>
            </div>
  
            ${openSections.history ? renderHistory(hist) : ""}
            ${isMeasured() ? `<div class="pc-hint">💡 Prezzo Base collegato (€/kg) e usato nel magazzino</div>` : ""}
  
            <div class="pc-field">
              <label>SPECIFICHE TECNICHE</label>
              <textarea id="pcSpecs" class="pc-input pc-textarea" rows="3"
                        placeholder="Es: M6×30mm, Inox A2, IP44, 1000W...">${esc(current.specs || "")}</textarea>
            </div>
  
            <div class="pc-grid-4">
              <div class="pc-field">
                <label>QUANTITÀ</label>
                <div class="pc-stepper">
                  <button type="button" id="pcQtyMinus" class="pc-step-btn">−</button>
                  <input id="pcStock" type="number" class="pc-step-input" value="${fmtNum(current.stock)}">
                  <button type="button" id="pcQtyPlus" class="pc-step-btn">+</button>
                </div>
              </div>
              <div class="pc-field">
                <label>UNITÀ</label>
                <select id="pcUnit" class="pc-input">
                  <option value="PZ">pz</option>
                  <option value="KG">kg</option>
                  <option value="MT">mt</option>
                  <option value="MQ">mq</option>
                </select>
              </div>
              <div class="pc-field">
                <label>SCORTA MIN.</label>
                <input id="pcMinStock" type="number" class="pc-input pc-input-red" value="${fmtNum(current.minStock)}">
              </div>
              <div class="pc-field" id="pcTotUWrap" ${isMeasured() ? "" : "hidden"}>
                <label>TOT.U</label>
                <input id="pcTotU" type="number" step="0.01" class="pc-input" value="${fmtNum(current.totU)}">
              </div>
            </div>
  
            <div class="pc-grid-2" id="pcMeasuresWrap" ${isMeasured() ? "" : "hidden"}>
              <div class="pc-field">
                <label>MT.ROT</label>
                <input id="pcMtRot" type="number" step="0.01" class="pc-input" value="${fmtNum(current.mtRot)}">
              </div>
              <div class="pc-field">
                <label>PESO PER UNITÀ</label>
                <input id="pcKgPerUm" type="number" step="0.001" class="pc-input"
                       placeholder="Es: 0.289 (Peso al mt/mq)"
                       value="${fmtNum(current.kgPerUm)}">
              </div>
            </div>
  
            <div class="pc-section">
              <button class="pc-section-head" id="pcCorrelatiHead" type="button">
                <span>🔗 CORRELATI (<span id="pcCorrelatiCount">${correlati.length}</span>)</span>
                <span class="pc-caret">${openSections.correlati ? "▲" : "▼"}</span>
              </button>
              <div class="pc-section-body" id="pcCorrelatiBody" ${openSections.correlati ? "" : "hidden"}>
                ${renderCorrelati(correlati)}
              </div>
            </div>
  
            <div class="pc-section">
              <button class="pc-section-head" id="pcScaglioniHead" type="button">
                <span>📊 SCAGLIONI (<span id="pcScaglioniCount">${scaglioni.length}</span>)</span>
                <span class="pc-caret">${openSections.scaglioni ? "▲" : "▼"}</span>
              </button>
              <div class="pc-section-body" id="pcScaglioniBody" ${openSections.scaglioni ? "" : "hidden"}>
                ${renderScaglioni(scaglioni)}
              </div>
            </div>
  
          </div>
  
          <div class="pc-footer">
            <button class="pc-btn pc-btn-cancel" id="pcCancel" type="button">❌ Annulla</button>
            <button class="pc-btn pc-btn-save" id="pcSave" type="button">💾 Salva</button>
          </div>
        </div>
      `;
  
      document.body.appendChild(overlayEl);
      wireEvents();
      document.addEventListener("keydown", onKeydown);
    }
  
    function renderHistory(hist) {
      if (hist.length === 0) {
        return `<div class="pc-history-box"><div class="pc-history-empty">Nessuno storico</div></div>`;
      }
      return `
        <div class="pc-history-box">
          ${hist.map(h => `
            <div class="pc-history-row">
              <span class="pc-history-date">${fmtDate(h.date)}</span>
              <span class="pc-history-price">${fmtEuro(h.price)}</span>
              <span class="pc-history-src">${esc(h.source || "manual")}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
  
    function renderCorrelati(keys) {
      if (keys.length === 0) {
        return `<div class="pc-correlati-empty">Nessun articolo correlato</div>`;
      }
      // Mostra placeholder, poi carica async
      setTimeout(loadCorrelatiDetails, 10);
      return `
        <div class="pc-correlati-list" id="pcCorrelatiList">
          ${keys.map(k => `
            <div class="pc-correlati-row" data-key="${escAttr(k)}">
              <span class="pc-correlati-code">${esc(k)}</span>
              <span class="pc-correlati-desc">…</span>
              <button class="pc-correlati-open" type="button" data-key="${escAttr(k)}">→</button>
            </div>
          `).join("")}
        </div>
      `;
    }
  
    async function loadCorrelatiDetails() {
      const keys = Array.isArray(current.correlati) ? current.correlati : [];
      for (const k of keys) {
        if (correlatiCache[k]) continue;
        try {
          const art = await getArticleByCode(k);
          correlatiCache[k] = art || { code: k, description: "(non trovato)" };
        } catch {
          correlatiCache[k] = { code: k, description: "(errore)" };
        }
        const row = overlayEl?.querySelector(`.pc-correlati-row[data-key="${CSS.escape(k)}"] .pc-correlati-desc`);
        if (row) row.textContent = correlatiCache[k].description;
      }
    }
  
    function renderScaglioni(list) {
      if (list.length === 0) {
        return `<div class="pc-scaglioni-empty">Nessuno scaglione</div>`;
      }
      return `
        <div class="pc-scaglioni-list">
          ${list.map((s, i) => `
            <div class="pc-scaglioni-row">
              <span class="pc-scaglioni-qty">da ${esc(String(s.qty))} ${esc(currentUnit().toLowerCase())}</span>
              <span class="pc-scaglioni-pct">${esc(String(s.pct))}%</span>
            </div>
          `).join("")}
        </div>
      `;
    }
  
    /* ============================================================
       WIRE EVENTS
       ============================================================ */
    function wireEvents() {
      // Chiudi
      overlayEl.querySelector("#pcClose").addEventListener("click", () => close());
      overlayEl.querySelector("#pcCancel").addEventListener("click", () => close());
      overlayEl.addEventListener("click", (e) => { if (e.target === overlayEl) close(); });
  
      // Campi base
      bindField("#pcDescription", "description", "string");
      bindField("#pcSupplierCode", "supplierCode", "string");
      bindField("#pcBasePrice", "basePrice", "number");
      bindField("#pcPurchasePrice", "purchasePrice", "number");
      bindField("#pcSpecs", "specs", "string");
      bindField("#pcStock", "stock", "number");
      bindField("#pcMinStock", "minStock", "number");
      bindField("#pcTotU", "totU", "number");
      bindField("#pcMtRot", "mtRot", "number");
      bindField("#pcKgPerUm", "kgPerUm", "number");
  
      // Unità
      const unitSel = overlayEl.querySelector("#pcUnit");
      unitSel.value = currentUnit();
      unitSel.addEventListener("change", () => {
        pending.unit = unitSel.value;
        current.unit = unitSel.value;
        applyUnitVisibility();
      });
  
      // Stepper quantità
      const stockInput = overlayEl.querySelector("#pcStock");
      overlayEl.querySelector("#pcQtyMinus").addEventListener("click", () => {
        const v = Math.max(0, (parseFloat(stockInput.value) || 0) - 1);
        stockInput.value = v;
        pending.stock = v;
      });
      overlayEl.querySelector("#pcQtyPlus").addEventListener("click", () => {
        const v = (parseFloat(stockInput.value) || 0) + 1;
        stockInput.value = v;
        pending.stock = v;
      });
  
      // Tendina storico prezzi
      overlayEl.querySelector("#pcHistoryBtn").addEventListener("click", () => {
        openSections.history = !openSections.history;
        render();
      });
  
      // Tendina correlati
      overlayEl.querySelector("#pcCorrelatiHead").addEventListener("click", () => {
        openSections.correlati = !openSections.correlati;
        render();
      });
  
      // Tendina scaglioni
      overlayEl.querySelector("#pcScaglioniHead").addEventListener("click", () => {
        openSections.scaglioni = !openSections.scaglioni;
        render();
      });
  
      // Click su correlato → apre scheda prodotto di quello
      overlayEl.querySelectorAll(".pc-correlati-open").forEach(btn => {
        btn.addEventListener("click", async () => {
          const k = btn.dataset.key;
          const art = await getArticleByCode(k);
          if (art) {
            // Reset e riapri con il nuovo articolo
            current = { ...art };
            original = { ...art };
            pending = {};
            correlatiCache = {};
            render();
          } else {
            alert("Articolo correlato non trovato");
          }
        });
      });
  
      // Salva
      overlayEl.querySelector("#pcSave").addEventListener("click", saveChanges);
    }
  
    function bindField(sel, field, type) {
      const el = overlayEl.querySelector(sel);
      if (!el) return;
      el.addEventListener("input", () => {
        if (type === "number") {
          pending[field] = parseFloat(el.value) || 0;
        } else {
          pending[field] = el.value;
        }
      });
    }
  
    function applyUnitVisibility() {
      const isM = isMeasured();
      const totU = overlayEl.querySelector("#pcTotUWrap");
      const measures = overlayEl.querySelector("#pcMeasuresWrap");
      if (totU) totU.hidden = !isM;
      if (measures) measures.hidden = !isM;
  
      // Aggiorna hint "Prezzo Base collegato"
      const existingHint = overlayEl.querySelector(".pc-hint");
      const pricesGrid = overlayEl.querySelector(".pc-grid-3");
      if (isM && !existingHint) {
        const hint = document.createElement("div");
        hint.className = "pc-hint";
        hint.textContent = "💡 Prezzo Base collegato (€/kg) e usato nel magazzino";
        pricesGrid.parentNode.insertBefore(hint, pricesGrid.nextSibling);
      } else if (!isM && existingHint) {
        existingHint.remove();
      }
    }
  
    /* ============================================================
       SALVA
       ============================================================ */
    async function saveChanges() {
      if (!current || !original) return;
  
      const code = current.code;
      const updates = {};
      const now = Date.now();
  
      // Descrizione
      if (pending.description !== undefined && pending.description !== original.description) {
        updates.description = pending.description;
        updates.descriptionLower = pending.description.toLowerCase();
      }
  
      // Cod. Forn.
      if (pending.supplierCode !== undefined && pending.supplierCode !== original.supplierCode) {
        updates.supplierCode = pending.supplierCode;
      }
  
      // ACQ
      if (pending.purchasePrice !== undefined && pending.purchasePrice !== (original.purchasePrice || 0)) {
        updates.purchasePrice = pending.purchasePrice;
      }
  
      // Specifiche
      if (pending.specs !== undefined && pending.specs !== original.specs) {
        updates.specs = pending.specs;
      }
  
      // Stock
      if (pending.stock !== undefined && pending.stock !== (original.stock || 0)) {
        updates.stock = pending.stock;
      }
  
      // Unità
      if (pending.unit !== undefined && pending.unit !== original.unit) {
        updates.unit = pending.unit;
      }
  
      // Scorta min
      if (pending.minStock !== undefined && pending.minStock !== (original.minStock || 0)) {
        updates.minStock = pending.minStock;
      }
  
      // TOT.U
      if (pending.totU !== undefined && pending.totU !== (original.totU || 0)) {
        updates.totU = pending.totU;
      }
  
      // MT.ROT
      if (pending.mtRot !== undefined && pending.mtRot !== (original.mtRot || 0)) {
        updates.mtRot = pending.mtRot;
      }
  
      // Peso
      if (pending.kgPerUm !== undefined && pending.kgPerUm !== (original.kgPerUm || 0)) {
        updates.kgPerUm = pending.kgPerUm;
      }

      // 🆕 Ricalcola kgPerUm automaticamente se totU/mtRot sono cambiati
      const newTotU = pending.totU !== undefined ? pending.totU : (original.totU || 0);
      const newMtRot = pending.mtRot !== undefined ? pending.mtRot : (original.mtRot || 0);
      const newKgPerUm = newMtRot > 0 ? (newTotU / newMtRot) : 0;

      if (newKgPerUm !== (original.kgPerUm || 0) && newMtRot > 0) {
        updates.kgPerUm = newKgPerUm;
      }
  
      // PREZZO — gestione speciale: salva vecchio in storico
      const priceChanged = pending.basePrice !== undefined && pending.basePrice !== (original.basePrice || 0);
      if (priceChanged) {
        try {
          await addPriceToHistory(code, original.basePrice || 0, "manual");
        } catch (err) {
          console.error("Errore addPriceToHistory:", err);
        }
        updates.basePrice = pending.basePrice;
        updates.priceLastChangedAt = now;
        updates.priceVerified = true;
      }
  
      if (Object.keys(updates).length === 0) {
        close(true);
        return;
      }
  
      try {
        await updateArticle(code, updates);

        // 🆕 Aggiorna cache locale (per i pallini in banco/ufficio/cassa)
        updateArticleInCache(code, updates);

        // Aggiorna current/original
        Object.assign(current, updates);
        original = { ...current };
        pending = {};
  
        if (typeof onSavedCb === "function") {
          try { onSavedCb(current); } catch (e) { console.error(e); }
        }
  
        close(true);
      } catch (err) {
        console.error("Errore salvataggio scheda prodotto:", err);
        alert("Errore durante il salvataggio: " + err.message);
      }
    }
  
    /* ============================================================
       UTILS
       ============================================================ */
    function fmtNum(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return "";
      return String(n);
    }
  
    function fmtEuro(n) {
      const v = Number(n) || 0;
      return "€ " + v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  
    function fmtDate(ts) {
      if (!ts) return "—";
      const d = new Date(ts);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
  
    function esc(s) {
      return String(s ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[c]));
    }
  
    function escAttr(s) { return esc(s); }
  
    return { open, close };
  })();