/* ============================================
   FILE-PARSER.JS
   Parser del file articoli (pipe-delimited).
   Formato:
   |N|Tipo|Codice        |Gruppo|Spec|Descrizione...|UM|Giacenza|Inv|
   ============================================ */

/**
 * Parsa il contenuto testuale del file e restituisce
 * un array di oggetti articolo normalizzati.
 */
export function parseArticlesFile(text) {
    if (!text || typeof text !== "string") {
      throw new Error("File vuoto o non valido");
    }
  
    const lines = text.split(/\r?\n/);
    const articles = [];
    const errors = [];
  
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw || !raw.trim()) continue;
      if (raw.startsWith("#")) continue; // commenti
  
      try {
        const parsed = parseLine(raw);
        if (parsed) articles.push(parsed);
      } catch (e) {
        errors.push({ line: i + 1, raw, error: e.message });
      }
    }
  
    return { articles, errors };
  }
  
  /**
   * Parsa una singola riga.
   */
  function parseLine(raw) {
    // Split per pipe
    const parts = raw.split("|");
    // parts[0] è vuoto (prima del primo |)
    // parts[last] è vuoto (dopo l'ultimo |)
    if (parts.length < 9) return null;
  
    const index       = clean(parts[1]);
    const type        = clean(parts[2]);
    const code        = clean(parts[3]);
    const group       = clean(parts[4]);
    const special     = clean(parts[5]);
    const description = cleanDescription(parts[6]);
    const unit        = clean(parts[7]);
    const stockStr    = clean(parts[8]);
    const inventoried = clean(parts[9]) || "N";
  
    if (!code) return null;
    if (!description) return null;
  
    const stock = parseItalianNumber(stockStr);
  
    return {
      code: code,
      codeNorm: code.toUpperCase(),
      type: type,
      group: group,
      hasSpecial: special === "*",
      description: description,
      descriptionLower: description.toLowerCase(),
      unit: unit || "PZ",
      stock: stock,
      inventoried: inventoried === "S",
      basePrice: 0,
      totU: 0,
      mtRot: 0,
      kgPerUm: 0,
      supplier: null,
      supplierCode: null,
      category: null,
      marca: null,
      position: null,
      specs: null,
      priceHistory: {}
    };
  }
  
  /**
   * Pulisce un campo: trim + rimuove padding.
   */
  function clean(str) {
    if (str == null) return "";
    return String(str).trim();
  }
  
  /**
   * Pulisce la descrizione: rimuove asterischi finali e spazi.
   */
  function cleanDescription(str) {
    if (!str) return "";
    let s = String(str).trim();
    // Rimuove asterisco(i) finale
    s = s.replace(/\*+$/, "").trim();
    // Normalizza spazi multipli
    s = s.replace(/\s+/g, " ");
    return s;
  }
  
  /**
   * Converte "000000,00" in numero 0.
   * Supporta virgola decimale italiana.
   */
  function parseItalianNumber(str) {
    if (!str) return 0;
    const cleaned = String(str).replace(/\./g, "").replace(",", ".").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  
  /**
   * Estrae i token di ricerca dalla descrizione.
   * Es. "BTE MA 06X100 5727 NERO"
   *   → ["bte", "ma", "06x100", "5727", "nero", "bte ma", "bte ma 06x100", ...]
   */
  export function extractSearchTokens(description, code) {
    const tokens = new Set();
    if (description) {
      const clean = description.toLowerCase().replace(/[^\w\s]/g, " ");
      const words = clean.split(/\s+/).filter(w => w.length >= 2);
  
      // Singole parole
      words.forEach(w => tokens.add(w));
  
      // Coppie consecutive
      for (let i = 0; i < words.length - 1; i++) {
        tokens.add(words[i] + " " + words[i + 1]);
      }
  
      // Triple consecutive (utili per "bte ma 06x100")
      for (let i = 0; i < words.length - 2; i++) {
        tokens.add(words[i] + " " + words[i + 1] + " " + words[i + 2]);
      }
    }
    if (code) {
      tokens.add(code.toLowerCase());
    }
    return Array.from(tokens);
  }
  /* ============================================
   PARSER CLIENTI
   Formato: VecchioCodice='NOME'#Indirizzo='...'#c5='CITTÀ'#Provincia='XX'#IdAnagrafica='12345'
   ============================================ */

export function parseClientsFile(text) {
  if (!text || typeof text !== "string") {
    throw new Error("File vuoto o non valido");
  }

  const lines = text.split(/\r?\n/);
  const clients = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    if (raw.startsWith("#")) continue;

    try {
      const parsed = parseClientLine(raw);
      if (parsed) clients.push(parsed);
    } catch (e) {
      errors.push({ line: i + 1, raw, error: e.message });
    }
  }

  return { clients, errors };
}

function parseClientLine(raw) {
  const parts = raw.split("#");
  const fields = {};

  for (const part of parts) {
    const m = part.match(/^([^=]+)='([\s\S]*)'$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = decodeHtmlEntities(m[2].trim());
    fields[key] = value;
  }

  const name = fields["VecchioCodice"] || "";
  if (!name) return null;

  return {
    name: name,
    address: fields["Indirizzo"] || "",
    city: fields["c5"] || "",
    province: fields["Provincia"] || "",
    legacyId: fields["IdAnagrafica"] || "",
    discountPct: 0
  };
}

function decodeHtmlEntities(str) {
  return String(str)
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}