/* ============================================
   ESAURITI-FORNITORI.JS
   Lista fornitori usata da:
   - Tendina 🛒 nel carrello banco
   - Modale "Esauriti"
   
   🆕 Dinamica: si carica da Firebase via loadFornitori().
   Parte con i default hardcoded per non far aspettare l'utente.
   ============================================ */

   import {
    loadFornitoriFromFirebase,
    seedFornitoriIfEmpty
  } from "../../data/fornitori-repository.js";
  
  // Array mutabile: chi lo importa vede gli aggiornamenti
  export const ESAURITI_FORNITORI = [
    { id: 'usag',    nome: 'usag',    colore: '#e11d48' },
    { id: 'as',      nome: 'as',      colore: '#16a34a' },
    { id: 'vm',      nome: 'vm',      colore: '#3b82f6' },
    { id: 'eurobit', nome: 'EuroBit', colore: '#eab308' },
    { id: 'maestri', nome: 'Maestri', colore: '#6b7280' },
    { id: 'aircom',  nome: 'AirCom',  colore: '#a855f7' },
    { id: 'sabart',  nome: 'sabart',  colore: '#ec4899' }
  ];
  
  const _DEFAULT = ESAURITI_FORNITORI.map(f => ({ ...f }));
  
  let _loaded = false;
  let _loading = null;
  
  /**
   * Carica i fornitori da Firebase (una sola volta per sessione).
   * Se vuoto, fa il seed dei default.
   */
  export async function loadFornitori(force = false) {
    if (_loaded && !force) return ESAURITI_FORNITORI;
    if (_loading) return _loading;
  
    _loading = (async () => {
      try {
        await seedFornitoriIfEmpty(_DEFAULT);
        const list = await loadFornitoriFromFirebase();
        if (list.length > 0) {
          ESAURITI_FORNITORI.length = 0;
          for (const f of list) ESAURITI_FORNITORI.push(f);
        }
        _loaded = true;
        return ESAURITI_FORNITORI;
      } catch (err) {
        console.error("Errore caricamento fornitori:", err);
        return ESAURITI_FORNITORI;
      } finally {
        _loading = null;
      }
    })();
  
    return _loading;
  }
  
  /**
   * Ricarica (dopo modifiche/aggiunte).
   */
  export async function reloadFornitori() {
    _loaded = false;
    return loadFornitori(true);
  }
  
  /**
   * Aggiunge un fornitore all'array locale (dopo averlo salvato su Firebase).
   */
  export function pushFornitoreLocale(fornitore) {
    const idx = ESAURITI_FORNITORI.findIndex(f => f.id === fornitore.id);
    if (idx >= 0) {
      ESAURITI_FORNITORI[idx] = fornitore;
    } else {
      ESAURITI_FORNITORI.push(fornitore);
    }
  }
  
  /**
   * Rimuove un fornitore dall'array locale.
   */
  export function removeFornitoreLocale(id) {
    const idx = ESAURITI_FORNITORI.findIndex(f => f.id === id);
    if (idx >= 0) ESAURITI_FORNITORI.splice(idx, 1);
  }