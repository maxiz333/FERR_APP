import { db, ref, get, set } from "../core/firebase-init.js";

export async function getStampaSenzaNumero() {
  try {
    const snap = await get(ref(db, "config/impostazioni/stampaSenzaNumero"));
    return snap.exists() ? snap.val() === true : false;
  } catch (e) {
    console.warn("Errore lettura stampaSenzaNumero:", e);
    return false;
  }
}

export async function setStampaSenzaNumero(value) {
  await set(ref(db, "config/impostazioni/stampaSenzaNumero"), value === true);
}