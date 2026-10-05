/* ============================================
   CART-LINE.JS
   Renderizza una riga del carrello.
   ============================================ */

   import { formatEuro } from "../../domain/cart-service.js";

   /**
    * Ritorna l'HTML di una riga carrello.
    */
   export function renderCartLine(line, index) {
     const total = formatEuro(line.lineTotal);
     const basePrice = formatEuro(line.basePrice);
     const unitPrice = formatEuro(line.unitPrice);
   
     const discountBadge = line.discountPct > 0
       ? `<span class="line-discount-badge">-${line.discountPct}%</span>`
       : "";
   
     return `
       <div class="cart-line" data-line-id="${line.id}">
         <div class="cart-line-header">
           <span class="cart-line-index">${index + 1}.</span>
           <div class="cart-line-info">
             <div class="cart-line-desc">${escapeHtml(line.description)}</div>
             <div class="cart-line-code">${escapeHtml(line.code)} • ${escapeHtml(line.unit)}</div>
           </div>
           <div class="cart-line-total">${total}</div>
         </div>
   
         <div class="cart-line-body">
           <div class="cart-line-qty">
             <button class="qty-btn" data-action="dec">−</button>
             <span class="qty-value" data-qty-value>${line.qty}</span>
             <button class="qty-btn" data-action="inc">+</button>
           </div>
   
           <div class="cart-line-prices">
             <div class="price-label">PREZZO BASE</div>
             <div class="price-value">${basePrice}</div>
           </div>
   
           ${discountBadge}
   
           <div class="cart-line-actions">
             <button class="line-action" data-action="note" title="Nota">📄</button>
             <button class="line-action" data-action="order" title="Ordina">🛒</button>
             <button class="line-action danger" data-action="delete" title="Elimina">🗑</button>
           </div>
         </div>
       </div>
     `;
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");
   }