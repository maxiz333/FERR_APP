/* ============================================================
   PRINT-INVOICE.JS — Blocco 7
   Stampa DDT in una nuova finestra
   ============================================================ */

   export function printInvoice({ cart, invoiceNumber, client }) {
    if (!cart || !invoiceNumber) {
      alert("Dati fattura mancanti");
      return;
    }
  
    const html = renderDDT({ cart, invoiceNumber, client });
    const cssHref = new URL("assets/css/invoice.css", window.location.href).href;
  
    const fullHtml = `<!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="UTF-8">
    <title>DDT ${invoiceNumber}</title>
    <link rel="stylesheet" href="${cssHref}">
  </head>
  <body class="print-invoice-body">
    ${html}
  </body>
  </html>`;
  
    // iframe nascosto fuori schermo
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:1000px;border:0;";
    iframe.srcdoc = fullHtml;
    document.body.appendChild(iframe);
  
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error("Errore stampa:", e);
        }
        // Rimuovi iframe dopo 5 secondi (tempo per chiudere la stampa)
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 5000);
      }, 500);
    };
  }
  
  /* ============================================================
     RENDER DDT
     ============================================================ */
  function renderDDT({ cart, invoiceNumber, client }) {
    const meta = cart.meta || {};
    const lines = Object.entries(cart.lines || {}).map(([id, l]) => ({ id, ...l }));
  
    const clientName    = client?.name    || meta.clientName || "Cliente 1";
    const clientAddress = client?.address || "";
    const clientCity    = (client?.city || "") + (client?.province ? ` (${client.province})` : "");
  
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const dateStr = `${dd}/${mm}/${yy}`;
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hh}:${mi}`;
  
    const linesHtml = lines.map((l) => {
      const qty   = Number(l.qty) || 0;
      const unit  = (l.unit || "PZ").toLowerCase();
      const price = Number(l.unitPrice ?? l.basePrice) || 0;
      return `
        <tr>
          <td class="d-cod">${esc(l.code || "")}</td>
          <td class="d-desc">${esc(l.description || "")}</td>
          <td class="d-prz">${price.toFixed(2).replace(".", ",")}</td>
          <td class="d-um">${esc(unit)}</td>
          <td class="d-qty">${fmtQty(qty)}</td>
          <td class="d-pu"></td>
        </tr>
      `;
    }).join("");
  
    const emptyRows = Array.from({ length: 12 }).map(() => `
      <tr>
        <td class="d-cod"></td>
        <td class="d-desc"></td>
        <td class="d-prz"></td>
        <td class="d-um"></td>
        <td class="d-qty"></td>
        <td class="d-pu"></td>
      </tr>
    `).join("");
  
    return `
      <div class="ddt-doc">
        <table class="ddt-t1">
          <tr>
            <td class="ddt-cedente" rowspan="2">
              <div class="ddt-ced-label">CEDENTE</div>
              <div class="ddt-logo">RATTAZZI</div>
              <div class="ddt-srl">S.R.L.</div>
              <div class="ddt-addr">
                <div>Via Ettore Piazza, 10</div>
                <div>28064 CARPIGNANO SESIA (NO)</div>
                <div>Tel. 0321.825.145 - Fax 0321.825.917</div>
              </div>
              <div class="ddt-fiscal">
                <div>Cap. Soc. € 116.000 i.v.</div>
                <div>Cod. Fisc. e P.IVA 00029360039</div>
                <div>Reg. Imprese Novara 00029360039</div>
                <div>R.E.A. n. 89056</div>
              </div>
            </td>
            <td class="ddt-head">
              <div class="ddt-title-row">
                <span class="ddt-title">Documento di trasporto N. <strong>${invoiceNumber}</strong></span>
                <span class="ddt-date">del <strong>${dateStr}</strong></span>
              </div>
              <div class="ddt-dpr">(D.P.R. 472/96)</div>
            </td>
          </tr>
          <tr>
            <td class="ddt-client">
              <div class="ddt-line"><span class="ddt-lbl">SPETT.LE</span></div>
              <div class="ddt-line">
                <span class="ddt-lbl">Ditta</span>
                <span class="ddt-val ddt-underline">${esc(clientName)}</span>
              </div>
              <div class="ddt-line">
                <span class="ddt-lbl">Residenza<br>o domicilio</span>
                <span class="ddt-val ddt-underline">${esc(clientAddress)}</span>
              </div>
              <div class="ddt-line ddt-line-small">
                <span class="ddt-sub ddt-underline">Comune ${esc(clientCity)}</span>
                <span class="ddt-sub ddt-underline">Via</span>
                <span class="ddt-sub ddt-underline">n.</span>
              </div>
              <div class="ddt-line">
                <span class="ddt-lbl">Luogo di<br>destinazione</span>
                <span class="ddt-val ddt-underline"></span>
              </div>
              <div class="ddt-line ddt-line-small">
                <span class="ddt-sub ddt-underline">Comune</span>
                <span class="ddt-sub ddt-underline">Via</span>
                <span class="ddt-sub ddt-underline">n.</span>
              </div>
              <div class="ddt-line">
                <span class="ddt-lbl">Pagamento</span>
                <span class="ddt-val ddt-underline"></span>
              </div>
            </td>
          </tr>
        </table>
  
        <table class="ddt-t2">
          <tr>
            <td class="ddt-trasporto" rowspan="2">
              <div class="ddt-small-lbl">Trasporto a cura del</div>
              <div class="ddt-checks">
                <label><span class="ddt-box"></span> Cedente</label>
                <label><span class="ddt-box"></span> Cessionario</label>
                <label><span class="ddt-box"></span> Vettore</label>
              </div>
            </td>
            <td class="ddt-causale">
              <span class="ddt-small-lbl">Causale del trasporto</span>
              <span class="ddt-check-inline"><span class="ddt-box"></span> Vendita</span>
            </td>
          </tr>
          <tr>
            <td class="ddt-inizio">
              <div class="ddt-small-lbl">Inizio del trasporto o consegna</div>
              <div class="ddt-inizio-row">
                <span>Data <strong>${dateStr}</strong></span>
                <span>Ora <strong>${timeStr}</strong></span>
              </div>
            </td>
          </tr>
        </table>
  
        <table class="ddt-articoli">
          <thead>
            <tr>
              <th class="d-cod">Codici</th>
              <th class="d-desc">Descrizione dei beni (Natura - Qualità)</th>
              <th class="d-prz"></th>
              <th class="d-um">U.M.</th>
              <th class="d-qty">Quantità</th>
              <th class="d-pu">Prezzo unit.</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
            ${emptyRows}
          </tbody>
        </table>
  
        <table class="ddt-vettore">
          <tr>
            <td class="ddt-vettore-l">Vettore</td>
            <td class="ddt-vettore-r">
              <div class="ddt-colli">
                N. Colli <span class="ddt-underline-sm"></span> Kg <span class="ddt-underline-sm"></span>
              </div>
              <div class="ddt-firma-box">Firma Vettore</div>
            </td>
          </tr>
        </table>
  
        <table class="ddt-firme">
          <tr>
            <td>Firma cessionario</td>
            <td>Firma conducente</td>
          </tr>
        </table>
  
        <table class="ddt-annot">
          <tr>
            <td>
              <div class="ddt-small-lbl">Annotazioni</div>
              <div class="ddt-annot-body"></div>
            </td>
          </tr>
        </table>
  
        <div class="ddt-copia">Copia per Cedente</div>
        <div class="ddt-um-note">
          UNITÀ DI MISURA: PZ = pezzi · MT = metri lineari · MQ = metri quadri · KG = chilogrammi · RT = pz/rotolo · LT = litri · CF = confezioni · BL = blister · SO = scatole · CT = cartone · MG = maglia
        </div>
      </div>
    `;
  }
  
  function fmtQty(q) {
    const n = Number(q) || 0;
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2).replace(".", ",");
  }
  
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }