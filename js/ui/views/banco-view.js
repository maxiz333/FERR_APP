/* ============================================
   BANCO-VIEW.JS
   Renderizza la pagina Banco.
   ============================================ */

   import { getSession } from "../../core/auth.js";

   export function initBancoView() {
     const user = getSession();
     if (!user) {
       window.location.href = "index.html";
       return;
     }
   
     // Utente in header
     const userEl = document.getElementById("currentUser");
     if (userEl) {
       userEl.textContent = user.name.toUpperCase();
       userEl.style.color = user.color;
     }
   
     // Logout
     const logoutBtn = document.getElementById("btnLogout");
     if (logoutBtn) {
       logoutBtn.addEventListener("click", () => {
         if (confirm("Vuoi uscire?")) {
           localStorage.removeItem("ferapp_session");
           window.location.href = "index.html";
         }
       });
     }
   }