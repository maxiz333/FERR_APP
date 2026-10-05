/* ============================================
   MODAL.JS
   Modale generica riutilizzabile.
   ============================================ */

   let _activeModal = null;

   export function openModal(opts) {
     if (_activeModal) {
       _activeModal.close();
       _activeModal = null;
     }
   
     const config = {
       title: opts.title || "",
       body: opts.body || "",
       buttons: opts.buttons || [],
       size: opts.size || "md",
       onMount: opts.onMount || null
     };
   
     const overlay = document.createElement("div");
     overlay.className = "modal-overlay";
   
     let buttonsHtml = "";
     config.buttons.forEach((btn, i) => {
       const variant = btn.variant || "outline";
       buttonsHtml += `<button class="btn btn-${variant}" data-modal-btn="${i}">${btn.label}</button>`;
     });
   
     overlay.innerHTML = `
       <div class="modal-box modal-${config.size}">
         <div class="modal-header">
           <span class="modal-title">${config.title}</span>
           <button class="modal-close" data-modal-close>✕</button>
         </div>
         <div class="modal-body">${config.body}</div>
         ${config.buttons.length > 0 ? `<div class="modal-footer">${buttonsHtml}</div>` : ""}
       </div>
     `;
   
     document.body.appendChild(overlay);
   
     function close() {
       overlay.classList.add("closing");
       setTimeout(() => {
         if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
         document.removeEventListener("keydown", onKeyDown);
       }, 150);
       _activeModal = null;
     }
   
     overlay.querySelector("[data-modal-close]").addEventListener("click", close);
   
     overlay.querySelectorAll("[data-modal-btn]").forEach(btn => {
       btn.addEventListener("click", () => {
         const idx = Number(btn.dataset.modalBtn);
         const btnConfig = config.buttons[idx];
         let shouldClose = true;
         if (btnConfig.action) {
           const result = btnConfig.action(overlay);
           if (result === false) shouldClose = false;
         }
         if (btnConfig.closeAfter !== false && shouldClose) close();
       });
     });
   
     overlay.addEventListener("click", (e) => {
       if (e.target === overlay) close();
     });
   
     function onKeyDown(e) {
       if (e.key === "Escape") close();
     }
     document.addEventListener("keydown", onKeyDown);
   
     _activeModal = { close };
   
     if (config.onMount) {
       setTimeout(() => config.onMount(overlay), 50);
     }
   
     return _activeModal;
   }
   
   export function closeModal() {
     if (_activeModal) {
       _activeModal.close();
       _activeModal = null;
     }
   }