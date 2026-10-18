/* ============================================
   PRINT-DDT.JS
   Stampa DDT con template definitivo
   ============================================ */

   import { getStampaSenzaNumero } from "../../data/impostazioni-repository.js";
   import { getClientByKey } from "../../data/client-repository.js";

   const TEMPLATE_PATH = 'templates/ddt-template.html';
   const MAX_ROWS = 23;
   
   let _templateCache = null;
   
   async function loadTemplate() {
     if (_templateCache) return _templateCache;
     const res = await fetch(TEMPLATE_PATH);
     if (!res.ok) throw new Error('Template DDT non trovato: ' + TEMPLATE_PATH);
     _templateCache = await res.text();
     return _templateCache;
   }
   
   function formatEuro(n) {
     const v = Number(n) || 0;
     return v.toLocaleString('it-IT', {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
     });
   }
   
   function formatQty(q) {
     const n = Number(q) || 0;
     if (Number.isInteger(n)) return String(n);
     return n.toFixed(2).replace('.', ',');
   }
   
   function formatDateTime(ts) {
     const d = ts ? new Date(ts) : new Date();
     const dd = String(d.getDate()).padStart(2, '0');
     const mm = String(d.getMonth() + 1).padStart(2, '0');
     const yy = d.getFullYear();
     const hh = String(d.getHours()).padStart(2, '0');
     const mn = String(d.getMinutes()).padStart(2, '0');
     return `${dd}/${mm}/${yy}  ${hh}:${mn}`;
   }
   
   function formatDate(ts) {
     const d = ts ? new Date(ts) : new Date();
     const dd = String(d.getDate()).padStart(2, '0');
     const mm = String(d.getMonth() + 1).padStart(2, '0');
     const yy = d.getFullYear();
     return `${dd}/${mm}/${yy}`;
   }
   
   function fillTemplate(root, data) {
     const set = (name, value) => {
       const el = root.querySelector(`input[name="${name}"]`);
       if (el) {
         el.value = value ?? '';
         el.setAttribute('value', value ?? '');
       }
     };
   
     const now = Date.now();
     const dt = new Date(now);
     const dataStr = String(dt.getDate()).padStart(2, '0') + '/' +
                     String(dt.getMonth() + 1).padStart(2, '0') + '/' +
                     dt.getFullYear();
     const oraStr = String(dt.getHours()).padStart(2, '0') + ':' +
                    String(dt.getMinutes()).padStart(2, '0');
   
     // Residenza = "CITTÀ (PV) VIA CIVICO"
     const prov = data.clientProvince ? ` (${data.clientProvince})` : '';
     const resStr = [
       (data.clientCity || '') + prov,
       data.clientAddress || ''
     ].filter(Boolean).join(' ');
   
          // 🆕 Se flag "stampa senza numero" attivo → vuoto
          const numeroDaStampare = data.stampaSenzaNumero ? '' : (data.invoiceNumber ? String(data.invoiceNumber) : '');
          set('doc_numero', numeroDaStampare);
     set('doc_data', dataStr);
     set('ditta', data.clientName || '');
     set('residenza', resStr);
     set('luogo_comune', '');
     set('luogo_via', '');
     set('luogo_n', '');
     set('pagamento', '');
     set('causale_altro', '');
     set('data_inizio', dataStr);
     set('ora_inizio', oraStr);
   
     // ☒ Vendita
     const cbVendita = root.querySelector('input[name="cb_vendita"]');
     if (cbVendita) {
       cbVendita.checked = true;
       cbVendita.setAttribute('checked', 'checked');
     }
   
     set('vettore_nome', '');
     set('n_colli', '');
     set('kg', '');
     set('firma_vettore', '');
     set('firma_cessionario', '');
     set('firma_conducente', '');
     set('annotazioni', data.note || '');
   
     const lines = Object.values(data.lines || {})
       .sort((a, b) => (Number(b.addedAt) || 0) - (Number(a.addedAt) || 0))
       .slice(0, MAX_ROWS);
   
     for (let i = 1; i <= MAX_ROWS; i++) {
       const line = lines[i - 1];
       if (line) {
         set(`r${i}_codici`,      line.code || '');
         set(`r${i}_descrizione`, line.description || '');
                  // 🆕 Se il prezzo è 0, non stampare nulla
                  const prezzo = Number(line.unitPrice ?? line.basePrice ?? 0);
                  set(`r${i}_extra`, prezzo > 0 ? formatEuro(prezzo) : '');
         set(`r${i}_um`,          (line.unit || '').toUpperCase());
         set(`r${i}_quantita`,    formatQty(line.qty));
         set(`r${i}_prezzo`,      '');
       } else {
         set(`r${i}_codici`,      '');
         set(`r${i}_descrizione`, '');
         set(`r${i}_extra`,       '');
         set(`r${i}_um`,          '');
         set(`r${i}_quantita`,    '');
         set(`r${i}_prezzo`,      '');
       }
     }
   }
   
   function autoFitFonts(win, doc) {
     const pageEl = doc.querySelector('.page');
     if (!pageEl) return;
   
     const pageWidth = pageEl.getBoundingClientRect().width;
     if (!pageWidth) return;
   
     const measurer = doc.createElement('span');
     measurer.style.cssText =
       'position:absolute;visibility:hidden;white-space:nowrap;' +
       'top:-9999px;left:-9999px;pointer-events:none;';
     doc.body.appendChild(measurer);
   
     const inputs = doc.querySelectorAll('input[type="text"]');
   
     inputs.forEach(el => {
       const text = el.value;
       if (!text) return;
   
       const rect = el.getBoundingClientRect();
       if (!rect.width) return;
   
       const cs = win.getComputedStyle(el);
       const padL = parseFloat(cs.paddingLeft) || 0;
       const padR = parseFloat(cs.paddingRight) || 0;
   
    // 🆕 Margine di sicurezza 8% (min 10px) — compatibile Win 8 / 10 / 11
    const safetyMargin = Math.max(10, rect.width * 0.08);
    const availableWidth = rect.width - padL - padR - safetyMargin;
       if (availableWidth <= 4) return;
   
       measurer.style.fontFamily    = cs.fontFamily;
       measurer.style.fontWeight    = cs.fontWeight;
       measurer.style.fontStyle     = cs.fontStyle;
       measurer.style.letterSpacing = cs.letterSpacing;
       measurer.textContent = text;
   
       let fontSizePx = parseFloat(cs.fontSize) || 12;
       const MIN_FONT = 3;
   
       let safety = 200;
       while (safety-- > 0) {
         measurer.style.fontSize = fontSizePx + 'px';
         const w = measurer.getBoundingClientRect().width;
         if (w <= availableWidth) break;
         fontSizePx -= 0.5;
         if (fontSizePx < MIN_FONT) { fontSizePx = MIN_FONT; break; }
       }
   
       const fontCqw = (fontSizePx / pageWidth) * 100;
       el.style.fontSize = fontCqw + 'cqw';
     });
   
     measurer.remove();
   }
   
   function printViaIframe(html) {
     const iframe = document.createElement('iframe');
     iframe.style.cssText =
       'position:fixed;left:0;top:0;width:900px;height:1300px;border:0;' +
       'opacity:0;pointer-events:none;z-index:-1;';
     document.body.appendChild(iframe);
   
     iframe.onload = () => {
       const runAutoFit = () => {
         try {
           autoFitFonts(iframe.contentWindow, iframe.contentDocument);
         } catch (e) {
           console.error('Errore auto-fit:', e);
         }
       };
   
       setTimeout(() => {
         try {
           iframe.contentWindow.requestAnimationFrame(() => {
             iframe.contentWindow.requestAnimationFrame(runAutoFit);
           });
         } catch (e) {
           runAutoFit();
         }
       }, 150);
   
       setTimeout(() => {
         try {
           iframe.contentWindow.focus();
           iframe.contentWindow.print();
         } catch (e) {
           console.error('Errore stampa iframe:', e);
         }
         setTimeout(() => {
           if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
         }, 30000);
       }, 400);
     };
   
     iframe.srcdoc = html;
   }
   
   export async function printDDT(opts) {
     const { cart, invoiceNumber, client, extraFields } = opts || {};
     if (!cart) {
       alert('Nessun ordine da stampare');
       return;
     }
   
     const meta = cart.meta || {};
     const lines = cart.lines || {};
     const stampaSenzaNumero = await getStampaSenzaNumero();
   
     // 🆕 Se non mi è stato passato il cliente, lo scarico da Firebase
     let clientData = client;
     if (!clientData && meta.clientId) {
       try {
         clientData = await getClientByKey(meta.clientId);
       } catch (e) {
         console.warn('Client non trovato:', e);
       }
     }
   
     const templateHtml = await loadTemplate();
   
     const parser = new DOMParser();
     const doc = parser.parseFromString(templateHtml, 'text/html');
   
     const data = {
      invoiceNumber:  invoiceNumber || meta.invoiceNumber,
      stampaSenzaNumero,            // 🆕 Aggiunto qui!
      clientName:     clientData?.name     || meta.clientName || '',
      clientAddress:  clientData?.address  || '',
      clientCity:     clientData?.city     || '',
      clientProvince: clientData?.province || '',
      note:           meta.note || '',
      lines,
      ...extraFields
    };
   
     fillTemplate(doc, data);
   
     const finalHtml = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
     printViaIframe(finalHtml);
   }