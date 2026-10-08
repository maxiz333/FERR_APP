// js/ui/components/summary-modal.js
// Blocco 2B.4 — Modale Riepilogo Ordine (v3, stile vecchia app)

export const SummaryModal = (() => {
  let overlayEl = null;
  let state = { lines: [], checked: new Set(), onConfirm: null, clientName: "Cliente 1" };

  // 🆕 Memoria persistente delle spunte per lineId (non si azzera alla chiusura)
  let savedCheckedByLineId = new Set();

  function open({ lines, clientName, onConfirm }) {
    if (!Array.isArray(lines) || lines.length === 0) return;
    state.lines = lines;
    state.clientName = clientName || "Cliente 1";
    state.onConfirm = typeof onConfirm === 'function' ? onConfirm : null;

    // 🆕 Ripristina spunte dalle righe già spuntate in precedenza
    state.checked = new Set();
    state.lines.forEach((line, idx) => {
      const id = line.id;
      if (id && savedCheckedByLineId.has(id)) {
        state.checked.add(idx);
      }
    });

    render();
  }

  function destroy() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    document.removeEventListener('keydown', onKeydown);
  }

  function close() {
    destroy();
    state = { lines: [], checked: new Set(), onConfirm: null, clientName: "Cliente 1" };
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function fmtMoney(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function lineTotal(line) {
    if (typeof line.lineTotal === 'number') return line.lineTotal;
    const qty = Number(line.qty) || 0;
    const price = Number(line.unitPrice ?? line.basePrice) || 0;
    const disc = Number(line.discountPct) || 0;
    return qty * price * (1 - disc / 100);
  }

  function render() {
    destroy();

    const total = state.lines.length;
    const done = state.checked.size;
    const grand = state.lines.reduce((s, l) => s + lineTotal(l), 0);

    overlayEl = document.createElement('div');
    overlayEl.className = 'fapp-modal-overlay summary-overlay';
    overlayEl.innerHTML = `
      <div class="fapp-modal-box summary-modal-v2" role="dialog" aria-modal="true">

        <div class="smv2-header">
          <span class="smv2-client">${escapeHtml(state.clientName)}</span>
          <span class="smv2-counter" id="smv2-counter">${done}/${total}</span>
          <button class="smv2-close" type="button" aria-label="Chiudi">✕</button>
        </div>

        <div class="smv2-totbox">
          <div class="smv2-totlabel">TOTALE ORDINE</div>
          <div class="smv2-totvalue" id="smv2-grand">€ ${fmtMoney(grand)}</div>
        </div>

        <div class="smv2-countlines" id="smv2-countlines">${total} articoli</div>

        <div class="smv2-list" id="smv2-list"></div>

        <div class="smv2-footer">
          <button class="smv2-btn-reset" type="button" id="smv2-reset">↺ Reset spunte</button>
          <button class="smv2-btn-close" type="button" id="smv2-close-btn">Chiudi</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    // Riempimento lista
    const listEl = overlayEl.querySelector('#smv2-list');
    state.lines.forEach((line, idx) => {
      const qty = Number(line.qty) || 0;
      const unitPrice = Number(line.unitPrice ?? line.basePrice) || 0;
      const tot = lineTotal(line);
      const unitLabel = (line.unit || 'PZ').toLowerCase();

      const row = document.createElement('label');
      row.className = 'smv2-row';
      row.dataset.idx = String(idx);
      row.innerHTML = `
        <input type="checkbox" class="smv2-check" data-idx="${idx}">
        <div class="smv2-row-main">
          <div class="smv2-row-code">${escapeHtml(line.code || '')}</div>
          <div class="smv2-row-desc">${escapeHtml(line.description || '')}</div>
        </div>
        <div class="smv2-row-price">€ ${fmtMoney(unitPrice)} x ${fmtQty(qty)} ${escapeHtml(unitLabel)} = € ${fmtMoney(tot)}</div>
      `;
      listEl.appendChild(row);
    });

    // --- LISTENER ---
    overlayEl.querySelector('.smv2-close').addEventListener('click', close);

    overlayEl.querySelector('#smv2-close-btn').addEventListener('click', () => {
      const allChecked = state.checked.size === state.lines.length;
      const cb = state.onConfirm;
      close();
      if (allChecked && cb) cb();
    });

    overlayEl.querySelector('#smv2-reset').addEventListener('click', () => {
      state.checked.clear();
      savedCheckedByLineId.clear();   // 🆕 pulisce anche la memoria
      syncCheckboxes();
    });

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    // Click sulla riga → toggla checkbox
    listEl.addEventListener('change', (e) => {
      const cb = e.target.closest('.smv2-check');
      if (!cb) return;
      const idx = Number(cb.dataset.idx);
      const line = state.lines[idx];
      const lineId = line?.id;

      if (cb.checked) {
        state.checked.add(idx);
        if (lineId) savedCheckedByLineId.add(lineId);
      } else {
        state.checked.delete(idx);
        if (lineId) savedCheckedByLineId.delete(lineId);
      }
      syncCheckboxes();
    });

    document.addEventListener('keydown', onKeydown);
    syncCheckboxes();
  }

  function syncCheckboxes() {
    if (!overlayEl) return;
    const total = state.lines.length;
    const done = state.checked.size;

    overlayEl.querySelectorAll('.smv2-check').forEach((cb) => {
      cb.checked = state.checked.has(Number(cb.dataset.idx));
      cb.closest('.smv2-row').classList.toggle('is-checked', cb.checked);
    });

    overlayEl.querySelector('#smv2-counter').textContent = `${done}/${total}`;
  }

  function fmtQty(q) {
    const n = Number(q) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  return { open, close };
})();