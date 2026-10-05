// js/ui/components/summary-modal.js
// Blocco 2B.4 — Modale Riepilogo Ordine (v2 corretta)

export const SummaryModal = (() => {
  let overlayEl = null;
  let state = { lines: [], checked: new Set(), onConfirm: null };

  function open({ lines, onConfirm }) {
    if (!Array.isArray(lines) || lines.length === 0) return;
    state.lines = lines;
    state.checked = new Set();
    state.onConfirm = typeof onConfirm === 'function' ? onConfirm : null;
    render();
  }

  // Rimuove SOLO il DOM, NON resetta lo state
  function destroy() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    document.removeEventListener('keydown', onKeydown);
  }

  // Chiude tutto E resetta
  function close() {
    destroy();
    state = { lines: [], checked: new Set(), onConfirm: null };
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
    // Rimuove solo il vecchio overlay, NON resetta lo state
    destroy();

    overlayEl = document.createElement('div');
    overlayEl.className = 'fapp-modal-overlay';
    overlayEl.innerHTML = `
      <div class="fapp-modal-box summary-modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>📋 Riepilogo Ordine</h3>
          <button class="modal-close" type="button" aria-label="Chiudi">✕</button>
        </div>

        <div class="summary-toolbar">
          <label class="summary-check-all">
            <input type="checkbox" id="summary-check-all">
            <span>Spunta tutto</span>
          </label>
          <span class="summary-count" id="summary-count">0 / ${state.lines.length}</span>
        </div>

        <div class="summary-list" id="summary-list"></div>

        <div class="summary-total">
          <span>Totale ordine</span>
          <strong id="summary-grand-total">€ 0,00</strong>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" id="summary-cancel">Annulla</button>
          <button class="btn btn-primary" type="button" id="summary-confirm" disabled>Conferma</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    // Riempi lista
    const listEl = overlayEl.querySelector('#summary-list');
    state.lines.forEach((line, idx) => {
      const row = document.createElement('label');
      row.className = 'summary-row';
      row.dataset.idx = String(idx);
      row.innerHTML = `
        <input type="checkbox" class="summary-row-check" data-idx="${idx}">
        <div class="summary-row-main">
          <div class="summary-row-desc">
            <span class="summary-row-code">${escapeHtml(line.code || '')}</span>
            <span class="summary-row-name">${escapeHtml(line.description || '')}</span>
          </div>
          <div class="summary-row-meta">
            <span>${fmtQty(line.qty)} ${escapeHtml(line.unit || '')}</span>
            <span>•</span>
            <span>€ ${fmtMoney(line.unitPrice ?? line.basePrice)}</span>
            ${Number(line.discountPct) ? `<span class="summary-disc">-${Number(line.discountPct)}%</span>` : ''}
          </div>
        </div>
        <div class="summary-row-total">€ ${fmtMoney(lineTotal(line))}</div>
      `;
      listEl.appendChild(row);
    });

    // Totale complessivo
    const grand = state.lines.reduce((s, l) => s + lineTotal(l), 0);
    overlayEl.querySelector('#summary-grand-total').textContent = `€ ${fmtMoney(grand)}`;

    // --- LISTENER ---
    // Chiusura con X
    overlayEl.querySelector('.modal-close').addEventListener('click', close);
    // Chiusura con Annulla
    overlayEl.querySelector('#summary-cancel').addEventListener('click', close);
    // Chiusura click fuori (sull'overlay, non dentro)
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    // Spunta tutto
    overlayEl.querySelector('#summary-check-all').addEventListener('change', (e) => {
      const on = e.target.checked;
      state.checked.clear();
      if (on) state.lines.forEach((_, i) => state.checked.add(i));
      syncCheckboxes();
    });

    // Spunta singola
    listEl.addEventListener('change', (e) => {
      const cb = e.target.closest('.summary-row-check');
      if (!cb) return;
      const idx = Number(cb.dataset.idx);
      if (cb.checked) state.checked.add(idx);
      else state.checked.delete(idx);
      syncCheckboxes();
    });

    // Conferma
    overlayEl.querySelector('#summary-confirm').addEventListener('click', () => {
      if (state.checked.size !== state.lines.length) return;
      const cb = state.onConfirm;
      close();
      if (cb) cb();
    });

    document.addEventListener('keydown', onKeydown);
    syncCheckboxes();
  }

  function syncCheckboxes() {
    if (!overlayEl) return;
    const all = overlayEl.querySelector('#summary-check-all');
    const total = state.lines.length;
    const done = state.checked.size;

    overlayEl.querySelectorAll('.summary-row-check').forEach((cb) => {
      cb.checked = state.checked.has(Number(cb.dataset.idx));
      cb.closest('.summary-row').classList.toggle('is-checked', cb.checked);
    });

    all.checked = done === total;
    all.indeterminate = done > 0 && done < total;

    overlayEl.querySelector('#summary-count').textContent = `${done} / ${total}`;
    overlayEl.querySelector('#summary-confirm').disabled = done !== total;
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