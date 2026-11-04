import { db, ref, get, set, update } from "../core/firebase-init.js";
import { getOrderTimestamp } from "./cart-repository.js";

const ACTIVE_PATH = "activeCarts";
const ARCHIVE_PATH = "archivedCarts";
const META_ARCHIVE_PATH = "meta/lastArchiveDate";

export async function runAutoArchive() {
  try {
    const metaSnap = await get(ref(db, META_ARCHIVE_PATH));
    const lastArchiveDate = metaSnap.val() || "";
    const today = new Date().toDateString();
    
    if (lastArchiveDate === today) return; 

    // Salviamo subito la data per evitare doppi avvii
    await set(ref(db, META_ARCHIVE_PATH), today);
    console.log("🗄 Controllo archiviazione ordini vecchi...");
    
    const snap = await get(ref(db, ACTIVE_PATH));
    const activeCarts = snap.val() || {};
    
    const cutoffDate = Date.now() - (35 * 24 * 60 * 60 * 1000);
    
    let batchUpdates = {};
    let count = 0;
    let totalMoved = 0;

    for (const [cartId, cart] of Object.entries(activeCarts)) {
      const meta = cart.meta || {};
      const ts = getOrderTimestamp(meta);
      
      if (meta.status === "fatto" && ts > 0 && ts < cutoffDate) {
        batchUpdates[`${ARCHIVE_PATH}/${cartId}`] = cart;
        batchUpdates[`${ACTIVE_PATH}/${cartId}`] = null;
        count++;
      }

      if (count > 0 && count % 500 === 0) {
        await update(ref(db), batchUpdates);
        totalMoved += count;
        batchUpdates = {}; 
        count = 0;
      }
    }

    if (count > 0) {
      await update(ref(db), batchUpdates);
      totalMoved += count;
    }

    if (totalMoved > 0) {
      console.log(`📦 Spostati ${totalMoved} ordini in archivio.`);
    } else {
      console.log("✅ Nessun ordine da archiviare.");
    }

  } catch (error) {
    console.error("Errore archiviazione automatica:", error);
  }
}

export async function loadArchivedCarts() {
  const snap = await get(ref(db, ARCHIVE_PATH));
  const data = snap.val() || {};
  const carts = Object.entries(data).map(([id, cart]) => {
    return { id, ...cart };
  });
  return carts.sort((a, b) => {
    return getOrderTimestamp(b.meta) - getOrderTimestamp(a.meta);
  });
}