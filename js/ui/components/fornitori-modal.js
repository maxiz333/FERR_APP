/* ============================================
FORNITORI-MODAL.JS
Modale per consultare listini fornitori.
Per ora ha solo USAG. In futuro se ne aggiungono altri.
============================================ */

// 🆕 Lista fornitori — per aggiungerne uno, basta aggiungere qui
const FORNITORI = [
{ id: 'usag', nome: 'USAG', colore: '#e11d48', path: 'fornitori/usag.html' }
// { id: 'as',   nome: 'AS',   colore: '#16a34a', path: 'fornitori/as.html' },
// { id: 'vm',   nome: 'VM',   colore: '#3b82f6', path: 'fornitori/vm.html' },
// ecc.
];

let _activeModal = null;

/**
* Apre la modale con la lista fornitori.
*/
export function openFornitoriModal() {
// Se già aperta, ignora
if (_activeModal) return;

const overlay = document.createElement('div');
overlay.className = 'fornitori-overlay';
overlay.innerHTML = `
 <div class="fornitori-modal">
   <div class="fornitori-header">
     <span class="fornitori-title">💰 Listini fornitori</span>
     <button class="fornitori-close" type="button" title="Chiudi">✕</button>
   </div>
   <div class="fornitori-content">
     ${renderLista()}
   </div>
 </div>
`;
document.body.appendChild(overlay);
_activeModal = overlay;

// Chiudi su X
overlay.querySelector('.fornitori-close').addEventListener('click', closeFornitoriModal);

// Chiudi cliccando fuori dalla card
overlay.addEventListener('click', (e) => {
 if (e.target === overlay) closeFornitoriModal();
});

// Chiudi su Escape
const escHandler = (e) => {
 if (e.key === 'Escape') {
   if (overlay.querySelector('.fornitori-iframe-wrap')) {
     // Se c'è un iframe aperto, torna alla lista
     showList(overlay);
   } else {
     closeFornitoriModal();
     document.removeEventListener('keydown', escHandler);
   }
 }
};
document.addEventListener('keydown', escHandler);

// Click sui tasti fornitori
overlay.querySelectorAll('.fornitori-btn').forEach(btn => {
 btn.addEventListener('click', () => {
   const fId = btn.dataset.fornitoreId;
   const f = FORNITORI.find(x => x.id === fId);
   if (f) showFornitore(overlay, f);
 });
});
}

/**
* Chiude la modale.
*/
export function closeFornitoriModal() {
if (_activeModal) {
 _activeModal.remove();
 _activeModal = null;
}
}

/**
* Mostra la lista dei tasti fornitori.
*/
function renderLista() {
return `
 <div class="fornitori-grid">
   ${FORNITORI.map(f => `
     <button class="fornitori-btn" data-fornitore-id="${f.id}" type="button" style="background:${f.colore};">
       ${f.nome}
     </button>
   `).join('')}
 </div>
`;
}

/**
* Torna alla lista fornitori.
*/
function showList(overlay) {
const content = overlay.querySelector('.fornitori-content');
content.innerHTML = renderLista();
content.querySelectorAll('.fornitori-btn').forEach(btn => {
 btn.addEventListener('click', () => {
   const fId = btn.dataset.fornitoreId;
   const f = FORNITORI.find(x => x.id === fId);
   if (f) showFornitore(overlay, f);
 });
});
}

/**
* Mostra l'iframe del fornitore selezionato.
*/
function showFornitore(overlay, fornitore) {
const content = overlay.querySelector('.fornitori-content');
content.innerHTML = `
 <div class="fornitori-iframe-wrap">
   <div class="fornitori-iframe-bar">
     <button class="fornitori-back" type="button" title="Torna alla lista">← Indietro</button>
     <span class="fornitori-iframe-title" style="color:${fornitore.colore};">${fornitore.nome}</span>
     <button class="fornitori-close2" type="button" title="Chiudi">✕</button>
   </div>
   <iframe class="fornitori-iframe" src="${fornitore.path}" title="Listino ${fornitore.nome}"></iframe>
 </div>
`;

content.querySelector('.fornitori-back').addEventListener('click', () => showList(overlay));
content.querySelector('.fornitori-close2').addEventListener('click', closeFornitoriModal);
}