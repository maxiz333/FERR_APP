/* ============================================
   AUTH.JS
   Gestione utenti e sessione locale.
   Nessuna password: selezione utente.
   ============================================ */

const SESSION_KEY = "ferapp_session";

export const USERS = [
  { id: "papa",  name: "papa",  role: "Proprietario", icon: "👑", color: "#3b82f6", postazione: "banco"   },
  { id: "mati",  name: "mati",  role: "Proprietario", icon: "👑", color: "#22c55e", postazione: "banco"   },
  { id: "massi", name: "massi", role: "Commesso",     icon: "👤", color: "#eab308", postazione: "banco"   },
  { id: "poli", name: "paul", role: "Commesso", icon: "👤", color: "#ef4444", postazione: "banco"   },
  { id: "cassa", name: "CASSA", role: "Cassa",        icon: "💰", color: "#22c55e", postazione: "ufficio" }
];

/**
 * Salva la sessione utente in localStorage.
 */
export function setSession(userId) {
  const user = USERS.find(u => u.id === userId);
  if (!user) throw new Error("Utente non trovato: " + userId);
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    ...user,
    loginAt: Date.now()
  }));
  return user;
}

/**
 * Legge la sessione corrente.
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Cancella la sessione (logout).
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Controlla se l'utente è loggato.
 * Se sì, reindirizza alla pagina corretta.
 */
export function redirectIfLogged() {
  const session = getSession();
  if (!session) return false;
  redirectToHome(session);
  return true;
}

/**
 * Reindirizza l'utente alla sua home in base al ruolo.
 */
export function redirectToHome(user) {
  if (user.postazione === "ufficio" || user.id === "cassa") {
    window.location.href = "ufficio.html";
  } else {
    window.location.href = "banco.html";
  }
}