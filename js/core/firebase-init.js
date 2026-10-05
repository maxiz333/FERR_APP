/* ============================================
   FIREBASE-INIT.JS
   Inizializza Firebase e esporta database.
   Unico punto di contatto con l'SDK Firebase.
   ============================================ */

   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
   import { getDatabase, ref, set, get, update, push, onValue,
            off, remove, runTransaction, serverTimestamp, query,
            orderByChild, startAt, endAt, limitToFirst, limitToLast,
            equalTo }
     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
   
   import { firebaseConfig } from "./firebase-config.js";
   
   // Inizializza app Firebase
   export const app = initializeApp(firebaseConfig);
   
   // Inizializza Realtime Database
   export const db = getDatabase(app);
   
   // Riesporta i metodi utili così gli altri moduli non devono
   // reimportare dall'SDK direttamente.
   export {
     ref, set, get, update, push, onValue, off, remove,
     runTransaction, serverTimestamp, query, orderByChild,
     startAt, endAt, limitToFirst, limitToLast, equalTo
   };
   
   // Log di conferma
   console.log("🔥 Firebase inizializzato:", firebaseConfig.projectId);