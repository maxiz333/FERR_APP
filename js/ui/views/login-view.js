/* ============================================
   LOGIN-VIEW.JS
   Renderizza la schermata di login.
   ============================================ */

import { USERS, setSession, redirectToHome, redirectIfLogged }
  from "../../core/auth.js";

export function initLoginView() {
  // Se già loggato, reindirizza
  if (redirectIfLogged()) return;

  renderUsers();
}

function renderUsers() {
  const container = document.getElementById("userList");
  if (!container) return;

  // Solo utenti non-cassa
  const users = USERS.filter(u => u.id !== "cassa");

  container.innerHTML = "";

  users.forEach(user => {
    const card = document.createElement("button");
    card.className = "user-card";
    card.dataset.userId = user.id;

    card.innerHTML = `
      <div class="user-card-icon" style="color:${user.color}">
        ${user.icon}
      </div>
      <div class="user-card-info">
        <span class="user-card-name" style="color:${user.color}">
          ${user.name}
        </span>
        <span class="user-card-role">${user.role}</span>
      </div>
      <div class="user-card-dot"
           style="background:${user.color};color:${user.color}"></div>
      <div class="user-card-settings" data-settings="1">⚙</div>
    `;

    card.addEventListener("click", (e) => {
      // Se ha cliccato sull'ingranaggio, non loggare
      if (e.target.closest("[data-settings]")) {
        e.stopPropagation();
        alert("Impostazioni utente: in arrivo nella prossima versione.");
        return;
      }
      loginAs(user.id);
    });

    container.appendChild(card);
  });
}


function loginAs(userId) {
  const user = setSession(userId);
  redirectToHome(user);
}