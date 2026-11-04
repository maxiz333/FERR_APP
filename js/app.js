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
         console.log("📄 Pagina Ufficio");
         break;
   
       case "cassa":
         console.log("📄 Pagina Cassa");
         break;
   
       case "archivio": {
         const { initArchivioController } = await import("./ui/controllers/archivio-controller.js");
         initArchivioController();
         break;
       }
   
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
     if (file === "cassa.html") return "cassa";
     if (file === "archivio.html") return "archivio";
     return "unknown";
   }