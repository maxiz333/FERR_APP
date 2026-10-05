/* ============================================
   APP.JS — Entry point
   ============================================ */

   import "./core/firebase-init.js";
   import { initLoginView } from "./ui/views/login-view.js";
   
   document.addEventListener("DOMContentLoaded", async () => {
     const page = detectPage();
     console.log("📄 Pagina rilevata:", page);
   
     switch (page) {
       case "login":
         initLoginView();
         break;
   
       case "import": {
         const { initImportView } = await import("./ui/views/import-view.js");
         initImportView();
         break;
       }
   
       case "banco": {
         const { initBancoView } = await import("./ui/views/banco-view.js");
         const { initBancoController } = await import("./ui/controllers/banco-controller.js");
         initBancoView();
         initBancoController();
         break;
       }
   
       case "ufficio":
        // La logica è gestita direttamente in ufficio.html (script inline)
        console.log("📄 Pagina Ufficio");
        break;

       case "cassa":
        // La logica è gestita direttamente in cassa.html (script inline)
         console.log("📄 Pagina Cassa");
        break;
   
       default:
         console.warn("Pagina non riconosciuta:", page);
     }
   });
   
   function detectPage() {
     const file = window.location.pathname.split("/").pop() || "index.html";
     if (file === "" || file === "index.html") return "login";
     if (file === "import.html") return "import";
     if (file === "banco.html") return "banco";
     if (file === "ufficio.html") return "ufficio";
     if (file === "cassa.html")   return "cassa";
     return "unknown";
   }