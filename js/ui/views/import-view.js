/* ============================================
   IMPORT-VIEW.JS
   UI di importazione articoli + clienti.
   ============================================ */

   import { parseArticlesFile, parseClientsFile } from "../../core/file-parser.js";
   import { importArticles } from "../../data/article-repository.js";
   import { importClients } from "../../data/client-repository.js";
   import { reloadArticles, getArticleCount } from "../../domain/article-service.js";
   
   let _parsedArticles = [];
   let _parsedClients = [];
   
   export function initImportView() {
     wireTabs();
     wireArticoli();
     wireClienti();
   }
   
   /* ============================================
      TAB SWITCHING
      ============================================ */
   
   function wireTabs() {
     document.querySelectorAll(".import-tab").forEach(tab => {
       tab.addEventListener("click", () => {
         const target = tab.dataset.tab;
         document.querySelectorAll(".import-tab").forEach(t => t.classList.remove("is-active"));
         document.querySelectorAll(".import-panel").forEach(p => p.classList.remove("is-active"));
         tab.classList.add("is-active");
         document.getElementById("panel" + capitalize(target))?.classList.add("is-active");
       });
     });
   }
   
   function capitalize(s) {
     return s.charAt(0).toUpperCase() + s.slice(1);
   }
   
   /* ============================================
      ARTICOLI
      ============================================ */
   
   function wireArticoli() {
     const dropZone = document.getElementById("dropZoneArt");
     const fileInput = document.getElementById("fileInputArt");
     const previewBox = document.getElementById("previewBoxArt");
     const btnImport = document.getElementById("btnImportArt");
     const progressBar = document.getElementById("progressBarArt");
     const progressFill = document.getElementById("progressFillArt");
     const statusMsg = document.getElementById("statusMsgArt");
   
     dropZone.addEventListener("click", () => fileInput.click());
   
     ["dragenter", "dragover"].forEach(ev => {
       dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
     });
     ["dragleave", "drop"].forEach(ev => {
       dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("dragover"); });
     });
     dropZone.addEventListener("drop", (e) => {
       const file = e.dataTransfer.files[0];
       if (file) handleArticleFile(file);
     });
     fileInput.addEventListener("change", (e) => {
       const file = e.target.files[0];
       if (file) handleArticleFile(file);
     });
     btnImport.addEventListener("click", startArticleImport);
   
     async function handleArticleFile(file) {
       statusMsg.className = "status-msg";
       statusMsg.textContent = "";
   
       if (!file.name.endsWith(".txt")) {
         showStatus(statusMsg, "Il file deve essere .txt", "error");
         return;
       }
   
       try {
         const text = await file.text();
         const { articles, errors } = parseArticlesFile(text);
   
         if (articles.length === 0) {
           showStatus(statusMsg, "Nessun articolo trovato", "error");
           return;
         }
   
         _parsedArticles = articles;
   
         document.getElementById("fileInfoArt").textContent =
           `📎 ${file.name} — ${(file.size / 1024).toFixed(1)} KB — ${articles.length} articoli${errors.length > 0 ? ` (${errors.length} ignorate)` : ""}`;
   
         const tbody = document.querySelector("#previewTableArt tbody");
         tbody.innerHTML = "";
         articles.slice(0, 10).forEach(art => {
           const tr = document.createElement("tr");
           tr.innerHTML = `
             <td><strong>${escapeHtml(art.code)}</strong></td>
             <td>${escapeHtml(art.description)}</td>
             <td>${escapeHtml(art.unit)}</td>
             <td>${art.stock}</td>
           `;
           tbody.appendChild(tr);
         });
   
         document.getElementById("statTotalArt").textContent = articles.length;
   
         previewBox.classList.add("active");
         btnImport.disabled = false;
       } catch (e) {
         console.error(e);
         showStatus(statusMsg, "Errore lettura file: " + e.message, "error");
       }
     }
   
     async function startArticleImport() {
       if (_parsedArticles.length === 0) return;
   
       btnImport.disabled = true;
       btnImport.textContent = "⏳ Importazione in corso...";
       progressBar.classList.add("active");
   
       try {
         await importArticles(_parsedArticles, (current, total) => {
           const pct = Math.round((current / total) * 100);
           progressFill.style.width = pct + "%";
           progressFill.textContent = pct + "%";
         });
   
         await reloadArticles();
   
         showStatus(statusMsg,
           `✅ Importati ${_parsedArticles.length} articoli. Cache: ${getArticleCount()}.`,
           "success");
   
         btnImport.textContent = "✅ IMPORTATO";
         progressFill.style.width = "100%";
         progressFill.textContent = "100%";
       } catch (e) {
         console.error(e);
         showStatus(statusMsg, "❌ Errore: " + e.message, "error");
         btnImport.disabled = false;
         btnImport.textContent = "🚀 RIPROVA";
       }
     }
   }
   
   /* ============================================
      CLIENTI
      ============================================ */
   
   function wireClienti() {
     const dropZone = document.getElementById("dropZoneCli");
     const fileInput = document.getElementById("fileInputCli");
     const previewBox = document.getElementById("previewBoxCli");
     const btnImport = document.getElementById("btnImportCli");
     const progressBar = document.getElementById("progressBarCli");
     const progressFill = document.getElementById("progressFillCli");
     const statusMsg = document.getElementById("statusMsgCli");
   
     dropZone.addEventListener("click", () => fileInput.click());
   
     ["dragenter", "dragover"].forEach(ev => {
       dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
     });
     ["dragleave", "drop"].forEach(ev => {
       dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("dragover"); });
     });
     dropZone.addEventListener("drop", (e) => {
       const file = e.dataTransfer.files[0];
       if (file) handleClientFile(file);
     });
     fileInput.addEventListener("change", (e) => {
       const file = e.target.files[0];
       if (file) handleClientFile(file);
     });
     btnImport.addEventListener("click", startClientImport);
   
     async function handleClientFile(file) {
       statusMsg.className = "status-msg";
       statusMsg.textContent = "";
   
       if (!file.name.endsWith(".txt")) {
         showStatus(statusMsg, "Il file deve essere .txt", "error");
         return;
       }
   
       try {
         const text = await file.text();
         const { clients, errors } = parseClientsFile(text);
   
         if (clients.length === 0) {
           showStatus(statusMsg, "Nessun cliente trovato", "error");
           return;
         }
   
         _parsedClients = clients;
   
         document.getElementById("fileInfoCli").textContent =
           `📎 ${file.name} — ${(file.size / 1024).toFixed(1)} KB — ${clients.length} clienti${errors.length > 0 ? ` (${errors.length} ignorate)` : ""}`;
   
         const tbody = document.querySelector("#previewTableCli tbody");
         tbody.innerHTML = "";
         clients.slice(0, 10).forEach(c => {
           const tr = document.createElement("tr");
           tr.innerHTML = `
             <td><strong>${escapeHtml(c.name)}</strong></td>
             <td>${escapeHtml(c.address)}</td>
             <td>${escapeHtml(c.city)}</td>
             <td>${escapeHtml(c.province)}</td>
           `;
           tbody.appendChild(tr);
         });
   
         document.getElementById("statTotalCli").textContent = clients.length;
   
         previewBox.classList.add("active");
         btnImport.disabled = false;
       } catch (e) {
         console.error(e);
         showStatus(statusMsg, "Errore lettura file: " + e.message, "error");
       }
     }
   
     async function startClientImport() {
       if (_parsedClients.length === 0) return;
   
       btnImport.disabled = true;
       btnImport.textContent = "⏳ Importazione in corso...";
       progressBar.classList.add("active");
   
       try {
         await importClients(_parsedClients, (current, total) => {
           const pct = Math.round((current / total) * 100);
           progressFill.style.width = pct + "%";
           progressFill.textContent = pct + "%";
         });
   
         showStatus(statusMsg,
           `✅ Importati ${_parsedClients.length} clienti su Firebase.`,
           "success");
   
         btnImport.textContent = "✅ IMPORTATO";
         progressFill.style.width = "100%";
         progressFill.textContent = "100%";
       } catch (e) {
         console.error(e);
         showStatus(statusMsg, "❌ Errore: " + e.message, "error");
         btnImport.disabled = false;
         btnImport.textContent = "🚀 RIPROVA";
       }
     }
   }
   
   /* ============================================
      UTILS
      ============================================ */
   
   function showStatus(el, msg, type) {
     el.textContent = msg;
     el.className = "status-msg active " + type;
   }
   
   function escapeHtml(s) {
     return String(s || "")
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;");
   }