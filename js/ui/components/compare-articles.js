// js/ui/components/compare-articles.js
// Blocco 2B.4 — Modale Confronta Articoli

export const CompareArticles = (() => {
    let overlayEl = null;
    let state = {
      cartLines: [],
      articleService: null,
      slotA: null,
      slotB: null,
    };
  
    function open({ cartLines = [], articleService = null } = {}) {
      state.cartLines = cartLines;
      state.articleService = articleService;
      state.slotA = null;
      state.slotB = null;
      render();
    }
  
    function close() {
      if (overlayEl) {
        overlayEl.remove();
        overlayEl = null;
      }
      document.removeEventListener('keydown', onKeydown);
    }
  
    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }
  
    function render() {
      close();
      overlayEl = document.createElement('div');
      overlayEl.className = 'modal-overlay compare-overlay';
      overlayEl.innerHTML = `
        <div class="modal compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
          <div class="modal-header">
            <h3 id="compare-title">🔍 Confronta Articoli</h3>
            <button class="modal-close" type="button" aria-label="Chiudi">✕</button>
          </div>
  
          <div class="compare-body">
            <div class="compare-slot" data-slot="A">
              <div class="compare-slot-head">
                <span class="compare-slot-label">A</span>
                <button class="compare-slot-clear" type="button" title="Pulisci">✕</button>
              </div>
              <div class="compare-slot-content"></div>
              <div class="compare-slot-picker">
                <input type="text" class="compare-input" placeholder="Cerca codice o descrizione…" autocomplete="off">
                <div class="compare-results"></div>
              </div>
            </div>
  
            <div class="compare-slot" data-slot="B">
              <div class="compare-slot-head">
                <span class="compare-slot-label">B</span>
                <button class="compare-slot-clear" type="button" title="Pulisci">✕</button>
              </div>
              <div class="compare-slot-content"></div>
              <div class="compare-slot-picker">
                <input type="text" class="compare-input" placeholder="Cerca codice o descrizione…" autocomplete="off">
                <div class="compare-results"></div>
              </div>
            </div>
          </div>
  
          <div class="compare-diff" hidden>
            <h4>Differenze</h4>
            <div class="compare-diff-body"></div>
          </div>
  
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" id="compare-close">Chiudi</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlayEl);
  
      overlayEl.querySelector('.modal-close').addEventListener('click', close);
      overlayEl.querySelector('#compare-close').addEventListener('click', close);
  
      overlayEl.querySelectorAll('.compare-slot').forEach((slotEl) => {
        wireSlot(slotEl);
      });
  
      renderSlots();
      document.addEventListener('keydown', onKeydown);
    }
  
    function wireSlot(slotEl) {
      const slot = slotEl.dataset.slot;
      const input = slotEl.querySelector('.compare-input');
      const resultsEl = slotEl.querySelector('.compare-results');
      const clearBtn = slotEl.querySelector('.compare-slot-clear');
  
      clearBtn.addEventListener('click', () => {
        setSlot(slot, null);
        input.value = '';
        resultsEl.innerHTML = '';
        renderSlots();
      });
  
      let debounce = null;
      input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => runSearch(slot, input.value.trim(), resultsEl), 90);
      });
  
      input.addEventListener('focus', () => {
        // Mostra subito i risultati dal carrello se vuoto
        if (!input.value.trim()) runSearch(slot, '', resultsEl);
      });
    }
  
    function runSearch(slot, query, resultsEl) {
      resultsEl.innerHTML = '';
      const q = query.toLowerCase();
      const results = [];
  
      // 1) Righe carrello (match su codice/descrizione)
      state.cartLines.forEach((line) => {
        const hay = `${line.code || ''} ${line.description || ''}`.toLowerCase();
        if (!q || hay.includes(q)) {
          results.push({ source: 'cart', line, article: lineToArticle(line) });
        }
      });
  
      // 2) Catalogo (solo se c'è una query o comunque max pochi risultati)
      if (state.articleService && typeof state.articleService.search === 'function') {
        const cat = state.articleService.search(query, 12) || [];
        cat.forEach((art) => {
          const code = art.code || '';
          // evita duplicati con righe carrello
          if (!results.some((r) => r.article && r.article.code === code)) {
            results.push({ source: 'catalog', article: art });
          }
        });
      }
  
      if (results.length === 0) {
        resultsEl.innerHTML = `<div class="compare-empty">Nessun risultato</div>`;
        return;
      }
  
      results.slice(0, 20).forEach((r) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'compare-result';
        btn.innerHTML = `
          <span class="compare-result-badge ${r.source === 'cart' ? 'is-cart' : ''}">
            ${r.source === 'cart' ? 'CARRELLO' : 'CATALOGO'}
          </span>
          <span class="compare-result-code">${escapeHtml(r.article.code || '')}</span>
          <span class="compare-result-desc">${escapeHtml(r.article.description || '')}</span>
        `;
        btn.addEventListener('click', () => {
          setSlot(slot, r.article);
          const slotEl = overlayEl.querySelector(`.compare-slot[data-slot="${slot}"]`);
          slotEl.querySelector('.compare-input').value = '';
          slotEl.querySelector('.compare-results').innerHTML = '';
          renderSlots();
        });
        resultsEl.appendChild(btn);
      });
    }
  
    function setSlot(slot, article) {
      if (slot === 'A') state.slotA = article;
      else state.slotB = article;
    }
  
    function renderSlots() {
      if (!overlayEl) return;
      ['A', 'B'].forEach((slot) => {
        const art = slot === 'A' ? state.slotA : state.slotB;
        const slotEl = overlayEl.querySelector(`.compare-slot[data-slot="${slot}"]`);
        const contentEl = slotEl.querySelector('.compare-slot-content');
        slotEl.classList.toggle('has-article', !!art);
        contentEl.innerHTML = art ? renderArticleCard(art) : `<div class="compare-placeholder">Nessun articolo</div>`;
      });
      renderDiff();
    }
  
    function renderArticleCard(a) {
      return `
        <div class="compare-card">
          <div class="compare-card-code">${escapeHtml(a.code || '')}</div>
          <div class="compare-card-desc">${escapeHtml(a.description || '')}</div>
          <dl class="compare-specs">
            ${row('UM', a.unit)}
            ${row('Prezzo base', a.basePrice != null ? `€ ${fmtMoney(a.basePrice)}` : '')}
            ${row('Cod. fornitore', a.supplierCode)}
            ${row('Fornitore', a.supplier)}
            ${row('Gruppo', a.group)}
            ${row('Categoria', a.category)}
            ${row('Marca', a.marca)}
            ${row('Posizione', a.position)}
            ${row('TOT.U', a.totU)}
            ${row('MT.ROT', a.mtRot)}
            ${row('Peso/unità', a.kgPerUm)}
            ${row('Giacenza', a.stock)}
            ${row('Specifiche', a.specs)}
          </dl>
        </div>
      `;
    }
  
    function row(label, value) {
      if (value === undefined || value === null || value === '') {
        return `<dt>${escapeHtml(label)}</dt><dd class="is-empty">—</dd>`;
      }
      return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`;
    }
  
    function renderDiff() {
      const diffEl = overlayEl.querySelector('.compare-diff');
      const bodyEl = overlayEl.querySelector('.compare-diff-body');
      const a = state.slotA;
      const b = state.slotB;
      if (!a || !b) {
        diffEl.hidden = true;
        bodyEl.innerHTML = '';
        return;
      }
      const fields = [
        ['Prezzo base', (x) => x.basePrice],
        ['UM', (x) => x.unit],
        ['TOT.U', (x) => x.totU],
        ['MT.ROT', (x) => x.mtRot],
        ['Peso/unità', (x) => x.kgPerUm],
        ['Fornitore', (x) => x.supplier],
        ['Cod. fornitore', (x) => x.supplierCode],
        ['Giacenza', (x) => x.stock],
      ];
      const rows = fields.map(([label, get]) => {
        const va = get(a);
        const vb = get(b);
        const diff = String(va ?? '') !== String(vb ?? '');
        return `<div class="compare-diff-row ${diff ? 'is-diff' : ''}">
          <span class="compare-diff-label">${escapeHtml(label)}</span>
          <span>${escapeHtml(fmtVal(va))}</span>
          <span>${escapeHtml(fmtVal(vb))}</span>
        </div>`;
      });
      bodyEl.innerHTML = rows.join('');
      diffEl.hidden = false;
    }
  
    function lineToArticle(line) {
      return {
        code: line.code,
        description: line.description,
        unit: line.unit,
        basePrice: line.basePrice,
        supplier: line.supplier,
        supplierCode: line.supplierCode,
      };
    }
  
    function fmtVal(v) {
      if (v === undefined || v === null || v === '') return '—';
      return String(v);
    }
  
    function fmtMoney(v) {
      const n = Number(v) || 0;
      return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  
    function escapeHtml(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      ));
    }
  
    return { open, close };
  })();