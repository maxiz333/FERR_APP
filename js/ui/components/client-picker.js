/* ============================================
   CLIENT-PICKER.JS
   Modale selezione/creazione cliente.
   ============================================ */

   import {
    ensureClientsLoaded,
    searchClients,
    getClientFromCache
  } from "../../domain/client-service.js";
  import { upsertClient } from "../../data/client-repository.js";
  
  let _activePicker = null;
  
  /**
   * Apre il client picker.
   *
   * @param {Object} opts
   * @param {string} opts.currentClientName - Nome cliente corrente
   * @returns {Promise<{name:string, clientKey:string|null, isGeneric:boolean}|null>}
   */
  export async function openClientPicker(opts = {}) {
    if (_activePicker) {
      _activePicker.close();
      _activePicker = null;
    }
  
    // Assicura che i clienti siano in cache
    await ensureClientsLoaded();
  
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
  
      overlay.innerHTML = `
        <div class="modal-box modal-md client-picker-box">
          <div class="modal-header">
            <span class="modal-title">👤 Seleziona Cliente</span>
            <button class="modal-close" data-close>✕</button>
          </div>
  
          <div class="modal-body client-picker-body">
  
            <button class="client-generic-btn" data-action="generic">
              <span class="client-generic-icon">👥</span>
              <div>
                <strong>Cliente 1 (generico)</strong>
                <small>Nessun nome associato</small>
              </div>
            </button>
  
            <div class="client-search-wrapper">
              <input type="text" class="input client-search-input"
                     placeholder="Cerca cliente per nome..."
                     autocomplete="off" data-search>
            </div>
  
            <div class="client-results" data-results>
              <div class="client-empty-hint">
                Digita per cercare un cliente o creane uno nuovo
              </div>
            </div>
  
            <button class="btn btn-primary client-new-btn" data-action="new">
              ➕ Crea nuovo cliente
            </button>
  
          </div>
        </div>
      `;
  
      document.body.appendChild(overlay);
  
      const searchInput = overlay.querySelector("[data-search]");
      const resultsBox = overlay.querySelector("[data-results]");
  
      function close() {
        overlay.classList.add("closing");
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          document.removeEventListener("keydown", onKeyDown);
        }, 150);
        _activePicker = null;
      }
  
      function choose(client) {
        close();
        resolve({
          name: client.name,
          clientKey: client.key || null,
          isGeneric: false
        });
      }
  
      function chooseGeneric() {
        close();
        resolve({
          name: "Cliente 1",
          clientKey: null,
          isGeneric: true
        });
      }
  
      async function createNew() {
        const name = prompt("Nome nuovo cliente:");
        if (!name || !name.trim()) return;
  
        try {
          const key = await upsertClient(name.trim());
          // Ricarica cache clienti
          const { reloadClients } = await import("../../domain/client-service.js");
          await reloadClients();
          const client = getClientFromCache(key);
          if (client) choose(client);
        } catch (e) {
          console.error(e);
          alert("Errore creazione cliente: " + e.message);
        }
      }
  
      function runSearch(term) {
        if (term.length < 1) {
          resultsBox.innerHTML = `
            <div class="client-empty-hint">
              Digita per cercare un cliente o creane uno nuovo
            </div>
          `;
          return;
        }
  
        const results = searchClients(term, 30);
  
        if (results.length === 0) {
          resultsBox.innerHTML = `
            <div class="client-empty-hint">
              ❌ Nessun cliente trovato per "<strong>${escapeHtml(term)}</strong>"
              <br><small>Crea un nuovo cliente con il pulsante sotto</small>
            </div>
          `;
          return;
        }
  
        resultsBox.innerHTML = results.map(c => `
          <div class="client-result-item" data-key="${escapeHtml(c.key)}">
            <div class="client-result-info">
              <div class="client-result-name">${escapeHtml(c.name)}</div>
              <div class="client-result-meta">
                ${escapeHtml(c.city || "")}${c.province ? " (" + escapeHtml(c.province) + ")" : ""}
              </div>
            </div>
            <span class="client-result-arrow">›</span>
          </div>
        `).join("");
  
        resultsBox.querySelectorAll(".client-result-item").forEach(el => {
          el.addEventListener("click", () => {
            const key = el.dataset.key;
            const client = getClientFromCache(key);
            if (client) choose(client);
          });
        });
      }
  
      // Search con debounce
      let debounce = null;
      searchInput.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => runSearch(searchInput.value.trim()), 120);
      });
  
      // Bottoni
      overlay.querySelector("[data-close]").addEventListener("click", () => {
        close();
        resolve(null);
      });
  
      overlay.querySelector('[data-action="generic"]').addEventListener("click", chooseGeneric);
      overlay.querySelector('[data-action="new"]').addEventListener("click", createNew);
  
      // Click fuori
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          close();
          resolve(null);
        }
      });
  
      // Esc
      function onKeyDown(e) {
        if (e.key === "Escape") {
          close();
          resolve(null);
        }
      }
      document.addEventListener("keydown", onKeyDown);
  
      _activePicker = { close };
  
      setTimeout(() => searchInput.focus(), 50);
    });
  }
  
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }