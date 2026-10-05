# 📘 FerApp — Documento di Progetto Ufficiale

**Versione**: 2.6  
**Data creazione**: 22 settembre 2026  
**Ultima modifica**: 05 ottobre 2026  
**Stato progetto**: In sviluppo attivo — Completati fino al Blocco 7 (DDT). Prossimo: 2B.8 (Ricerca Generica) o 8 (Cestino)

> **Documento vivo.** Fonte unica di verità del progetto.
> Ogni volta che si riprende il lavoro, **leggere prima questo file**.

---

## 📑 INDICE

1. [Obiettivo del Progetto](#1-obiettivo-del-progetto)
2. [Panoramica Funzionale](#2-panoramica-funzionale)
3. [Utenti e Postazioni](#3-utenti-e-postazioni)
4. [Flusso di Lavoro](#4-flusso-di-lavoro)
5. [Architettura Tecnica](#5-architettura-tecnica)
6. [Modello Dati Firebase](#6-modello-dati-firebase)
7. [Sincronizzazione e Concorrenza](#7-sincronizzazione-e-concorrenza)
8. [Funzionalità Dettagliate](#8-funzionalità-dettagliate)
9. [UI/UX](#9-uiux)
10. [Struttura File Completa](#10-struttura-file-completa)
11. [Ambiente di Sviluppo](#11-ambiente-di-sviluppo)
12. [Roadmap Completa](#12-roadmap-completa)
13. [Stato Avanzamento Attuale](#13-stato-avanzamento-attuale)
14. [Note Tecniche Importanti](#14-note-tecniche-importanti)
15. [Come Riprendere il Lavoro](#15-come-riprendere-il-lavoro)
16. [Blocchi in Dettaglio](#16-blocchi-in-dettaglio)

---

## 1. Obiettivo del Progetto

Riscrivere **da zero** l'applicazione gestionale "FerApp" della **Ferramenta Rattazzi** (Cartellini Prezzi) in:

- **Vanilla JS ES6+** (JavaScript puro, no framework)
- **HTML5 + CSS3** (Dark Mode alto contrasto)
- **Firebase Realtime Database** come backend
- **Nessun bundler** (no npm, no build)
- **Firebase SDK v10** via CDN ES Modules

### Requisiti chiave
- ⚡ Veloce e leggera
- 📱 Touch-friendly (Mobile + PC)
- 🔄 Zero bug di sincronizzazione tra postazioni
- 🎯 Focus su **Carrello** (magazzino) e **Ordini** (ufficio)
- 🎨 Dark mode (nero/giallo) + Light mode (bianco/rosso)
- 📦 **~19.348 articoli** + **~3.651 clienti** (importati)

---

## 2. Panoramica Funzionale

L'app ha **3 interfacce principali** che condividono gli stessi dati su Firebase:

### 🏭 Banco (Magazzino)
- Inserisce articoli nel carrello via ricerca/tastierino
- Modifica quantità, unità, sconti, scaglioni
- Usa calcolatore taglio/peso per KG/MT/MQ (**funzionante dal 04/10/2026**)
- Crea **bozze** per far iniziare l'ufficio a mettere i prezzi
- **Conferma** ordine quando finito (anche senza prezzi!)
- **Tendina ordini** nell'header (solo oggi) → click su un ordine apre **vista dettaglio in banco**
- **Codice ordine** generato automaticamente alla prima bozza (`Ordine #N - L`)
- **Sblocca e modifica** un ordine fatto direttamente dal banco (carica il carrello)
- **Scheda prodotto** cliccando sul nome articolo
- **Pallini stato prezzo** accanto ai prezzi
- **📄 BOL.** nella bottom bar → crea fattura con numero progressivo atomico
- **📄 F** in header → modifica prossimo numero bolla
- Stampa DDT (**funzionante dal 05/10/2026**)
- **Niente pulsante CASSA nel login**: l'accesso alla cassa è nascosto nel logo

### 🏢 Ufficio (Gestione Ordini)
**A cosa serve**: mettere i prezzi agli ordini in arrivo, gestire tutto il ciclo di vita degli ordini.
- Vede tutti gli ordini/bozze in arrivo
- **Modifica prezzi, sconti, verifica prezzi**
- **Modifica righe** cliccando sui prezzi/qty/sconto
- **Scheda prodotto** cliccando sul nome articolo
- **Pallini stato prezzo**
- Blocca/sblocca ordini
- Chiude ordine ("Fatto") → va in tab FATTI + **sync prezzi automatico**
- Sblocca ordini fatti → tab NUOVI + scroll automatico
- **🖨 Stampa** in ogni ordine (multi-selezione modale)
- **🖨 Stampa DDT** (se l'ordine è fattura)
- **📄 BOL.** in ogni ordine → apre client picker + conferma → crea fattura
- **📄 F** in header → modifica prossimo numero bolla

**Accesso**: TUTTI (papa, mati, massi, poli, cassa). Tutti possono modificare tutto.

### 💰 Cassa (Scontrino)
**A cosa serve**: leggere l'ordine già fatto e **battere lo scontrino a mano** sul registratore di cassa fiscale fisico.
- **Lista COMPATTA**: card piccole (cliente, codice ordine, data, n° articoli, totale)
- **Dettaglio su click**: header con cliente + codice + data + n° articoli
- Righe con **BADGE QTY giallo** ben visibile + prezzo + **pallino stato prezzo** + totale riga
- **Totale grande in basso**
- Pulsante **✅ FATTO** → l'ordine passa in tab FATTI + sync prezzi automatico
- Pulsante **🔓 Sblocca e modifica** → attiva edit mode locale (NON cambia stato Firebase)
- **Modalità edit**: badge qty e prezzo cliccabili → tastierino → salvataggio automatico **con refresh live**
- **Per ora**: scontrino battuto a mano sul registratore fiscale fisico

**Accesso**: TUTTI (chiunque può andare in cassa a battere uno scontrino).

### 🔄 Cambio interfaccia
Da qualsiasi interfaccia si può passare alle altre **senza ri-loggarsi**, tramite pulsante nell'header.
Il **logo RATTAZZI** è cliccabile → apre la Cassa.

### Condivisione
- Tutti vedono tutti i carrelli/ordini
- Nome di chi ha creato ogni ordine visibile
- Emoji 👁️ quando l'ufficio tocca un ordine
- **Icona ✏️** accanto al nome cliente quando `wasModified: true`
- **Codice ordine** (`Ordine #N - L`) visibile in banco/ufficio/cassa
- **Codice fattura** (`Fattura N · NOME CLIENTE`) visibile in banco/ufficio
- Pallini stato prezzo ovunque
- **Scheda prodotto** cliccabile da banco e ufficio

---

## 3. Utenti e Postazioni

| ID | Nome | Ruolo | Postazione default | Colore |
|---|---|---|---|---|
| papa | PAPA | Proprietario | Banco | Blu `#3b82f6` |
| mati | MATI | Proprietario | Banco | Verde `#22c55e` |
| massi | MASSI | Commesso | Banco | Giallo `#eab308` |
| poli | POLI | Commesso | Banco | Rosso `#ef4444` |
| cassa | CASSA | Cassa | Ufficio | Verde `#22c55e` |

### 🔑 Regole di accesso
- **Autenticazione**: selezione utente (no password)
- **Sessione**: `localStorage` (chiave `ferapp_session`)
- **Postazione default**: dove l'utente viene reindirizzato al login
- **⚠️ IMPORTANTE**: TUTTI gli utenti possono accedere a TUTTE le interfacce (Banco, Ufficio, Cassa) e **modificare qualsiasi cosa**
- **Cambio interfaccia**: possibile da dentro l'app tramite pulsante nell'header, senza ri-loggarsi
- **🆕 Login CASSA**: il pulsante verde "CASSA" è stato **rimosso** dal login (l'utente `cassa` resta nel DB ma non è più mostrato)

### 🎯 Postazioni contemporanee
- 2 postazioni Banco (magazzino)
- 2 postazioni Ufficio/Cassa
- Tutte le postazioni vedono gli stessi dati in tempo reale

---

## 4. Flusso di Lavoro

### Stati dell'ordine

| Stato | Banner | Chi lo imposta | Quando |
|---|---|---|---|
| `modifica` | nessuno | Banco (auto) | Carrello attivo non inviato |
| `bozza` | 🔵 Blu "In lavorazione" | Banco | Invia bozza, carrello resta aperto |
| `nuovo` | 🟡 Giallo "Nuovo" | Banco | Ordine diretto (con o senza prezzi) |
| `in_arrivo` | 🔴 Rosso "In arrivo" | Banco | Conferma dopo bozza |
| `fatto` | 🟢 Verde | Ufficio o Cassa | Chiude e blocca |
| `pronto` | 🟣 Viola | Ufficio | In attesa di direttive |
| `sbloccato` | 🟢 Verde | Ufficio o Banco | Riporta a modifica |

### 🏭 → 🏢 Flusso tipico — con bozza
1. Banco crea carrello, aggiunge articoli (anche senza prezzi)
2. **Bozza** → ufficio riceve notifica blu
3. **Alla prima bozza** viene generato il codice ordine `#N - L`
4. Ufficio mette prezzi **mentre** banco aggiunge
5. Banco preme **Conferma** → banner rosso "In arrivo"
6. Ufficio completa e preme **Fatto** → bloccato, va in tab FATTI
7. **Al "Fatto"** → sync automatico dei prezzi delle righe verso gli articoli

### 🏭 → 🏢 Flusso tipico — diretto
1. Banco crea carrello con prezzi noti
2. **Conferma** → notifica, banner giallo "Nuovo"
3. Ufficio verifica e preme **Fatto**

### 🏢 → 💰 Flusso Cassa
1. Ufficio ha un ordine **in_arrivo** o **nuovo** (prezzi confermati)
2. Cliente arriva in cassa
3. **Cassa** vede la lista compatta → click su un ordine → dettaglio
4. Cassa **batte lo scontrino a mano** sul registratore fiscale
5. Cassa preme **FATTO** → l'ordine passa in tab FATTI + **sync prezzi**
6. L'ordine **sparisce dalla vista Cassa**
7. L'ordine **resta visibile in Ufficio** nella tab FATTI

### 🆕 💰→📄 Flusso Fatturazione (Blocco 7)
1. Ordine pronto (in qualsiasi stato tranne già fatturato)
2. **Banco**: premi **📄 BOL.** → si apre popup con cliente + numero → confermi → fattura creata → il tasto diventa **🖨 Stampa DDT**
3. **Ufficio**: premi **📄 BOL.** → si apre client picker → scegli cliente → confermi → fattura creata → il tasto diventa **🖨 Stampa DDT**
4. **Numerazione atomica** (`runTransaction`): zero duplicati anche con 2 postazioni in contemporanea
5. **🖨 Stampa DDT** → apre anteprima di stampa con template DDT (iframe isolato, mai pagina bianca)
6. Il numero fattura rimane fisso anche se modifichi l'ordine dopo

### 🔓 Flusso "Sblocca e modifica"
1. Un ordine `fatto` non è più modificabile
2. Per modificarlo, si preme **Sblocca e modifica** (da Ufficio, Banco o Cassa)
3. Lo stato passa a `sbloccato`, `isLocked: false`
4. Se modificato (qty/prezzo/sconto) → `wasModified: true` → icona ✏️ appare accanto al nome cliente (permanente)
5. Per richiudere, si preme di nuovo **Fatto** → `isLocked: true`, stato `fatto`
6. **Da Ufficio**: il tab passa automaticamente a NUOVI + scroll sull'ordine
7. **Da Cassa**: la modifica è locale (edit mode), NON cambia lo stato Firebase

### 🌙 Reset mezzanotte
- Automatico lato client
- Carrelli con spunta → si puliscono
- Carrelli `modifica` → passano all'ufficio come `nuovo`
- **Contatore ordini** (`counters/orderNumber`) → si resetta al primo ordine del nuovo giorno
- **Contatore fattura** (`counters/invoiceNumber`) → **NON si resetta** (progressivo perpetuo)

### 🗑 Cestino
- Ordini eliminati da **Carrello** o **Ordini** → cestino
- Azioni: **Ripristina** / **Elimina definitivamente**
- **Svuotamento automatico ogni domenica**

---

## 5. Architettura Tecnica

### Pattern

```
UI (View + Component)
        ↓
    Controller
        ↓
 Domain Service
        ↓
 Data Repository
        ↓
Firebase Realtime Database
```

### Regole d'oro
1. UI non chiama mai Firebase direttamente
2. Ogni repository è l'unico punto di contatto con un nodo
3. **Scritture sempre atomiche** su path specifici
4. Mai riscrivere l'intero carrello
5. Transazioni per read-modify-write (`runTransaction` per numerazione fatture)

---

## 6. Modello Dati Firebase

```
ferr-app-5e277-default-rtdb/
│
├── users/{userId}/
│   └── name, role, color, postazione
│
├── clients/{clientId}/
│   ├── name              ← VecchioCodice (nome cliente)
│   ├── address           ← Indirizzo
│   ├── city              ← c5 (città)
│   ├── province          ← Provincia
│   ├── legacyId          ← IdAnagrafica
│   ├── discountPct
│   ├── createdAt
│   └── updatedAt
│
├── meta/clients/
│   ├── lastImportAt
│   └── lastImportCount
│
├── articles/{articleKey}/
│   ├── code, codeNorm, type, group, hasSpecial
│   ├── description, descriptionLower, unit
│   ├── stock, inventoried
│   ├── basePrice, totU, mtRot, kgPerUm
│   ├── priceVerified: bool
│   ├── priceLastChangedAt: timestamp
│   ├── supplier, supplierCode, category, marca, position, specs
│   ├── priceHistory/{0..4}: { price, date, source }
│   ├── scaglioni: [ { qty, pct }, ... ]
│   ├── correlati: [ articleKey, ... ]
│   ├── searchTokens[]
│   └── updatedAt
│
├── meta/articles/
│   ├── lastImportAt
│   └── lastImportCount
│
├── activeCarts/{cartId}/
│   ├── meta/
│   │   ├── clientId, clientName
│   │   ├── status
│   │   ├── createdBy, createdByName, createdAt, updatedAt
│   │   ├── lineCount
│   │   ├── totals { subtotal, discount, grandTotal }
│   │   ├── note
│   │   ├── seenBy { userId: timestamp }
│   │   ├── isLocked
│   │   ├── wasModified
│   │   ├── orderNumber        (es. 27)
│   │   ├── orderCode          (es. "A")
│   │   ├── invoiceNumber      ← NUOVO (Blocco 7) — es. 2000
│   │   └── invoiceDate        ← NUOVO (Blocco 7) — timestamp
│   └── lines/{lineId}/
│       ├── articleId, code, description, unit
│       ├── qty, basePrice, unitPrice
│       ├── discountPct, discountAmount, lineTotal
│       ├── totU, mtRot, kgPerUm  ← 🆕 (per articoli a misura)
│       ├── kgTotal, mtTotal      ← 🆕 (dal calcolatore taglio/peso)
│       ├── forbiciState: neutro|scampolo|rotolo|scaglionato
│       ├── scampoloPct, scaglioneApplied
│       ├── isRemnant, isReturn, originalOrderId
│       ├── isOrdered, supplier, supplierColor
│       ├── note
│       ├── addedBy, addedByName, addedAt, updatedAt
│
├── orderHistory/{orderId}/
│
├── trash/
│   ├── carts/{cartId}/
│   └── orders/{orderId}/
│
├── supplierOrders/{supplierId}/{itemId}/
│
└── counters/
    ├── orderNumber        ← progressivo giornaliero (reset a mezzanotte)
    ├── lastResetDate      ← "YYYY-MM-DD"
    ├── invoiceNumber      ← NUOVO (Blocco 7) — progressivo perpetuo, inizia da 2000
    └── lastMidnightReset
```

---

## 7. Sincronizzazione e Concorrenza

### Regola d'oro
**Mai riscrivere l'intero carrello o l'intera riga**. Sempre scritture atomiche su path specifici.

| Azione | Path | Tipo |
|---|---|---|
| Banco aggiunge riga | `lines/{nuovoId}` | `set()` |
| Ufficio modifica prezzo | `lines/{id}/unitPrice` | `update()` |
| Magazzino modifica qty | `lines/{id}/qty` | `update()` o `runTransaction()` |
| Cambio sconto | `lines/{id}/discountPct` | `update()` |
| Cambio stato | `meta/status` | `update()` |
| Blocco/sblocco | `meta/isLocked` | `update()` via `updateLineLock` |
| Marca "modificato" | `meta/wasModified` | `update()` via `markCartAsModified` (solo se `sbloccato`) |
| Codice ordine | `meta/orderNumber` + `meta/orderCode` | `update()` via `generateOrderCode` |
| **Numero fattura** | **`meta/invoiceNumber`** | **`update()` via `saveInvoiceToCart`** |
| **Contatore fatture** | **`counters/invoiceNumber`** | **`runTransaction()` via `generateInvoiceNumber`** |
| Occhio 👁️ | `meta/seenBy/{userId}` | `update()` |
| Totali | `meta/totals` | `update()` con delta |

### 🛡️ Guardie anti-loop
- `scheduleTotalsSync()` in `banco-controller.js` ha una **memoria dell'ultimo sync** (`_lastSyncedKey`). Se i totali sono identici all'ultimo invio, **non riscrive** su Firebase.
- Questo spezza il ciclo infinito `listener → scrive → listener → scrive`.

### 🎫 Numerazione fatture atomica
- `generateInvoiceNumber()` usa `runTransaction` → garantisce zero duplicati anche con 2 postazioni in contemporanea
- Se tu e un collega premete BOL nello stesso momento:
  - Transazione assegna **2000** al primo che scrive
  - Transazione assegna **2001** al secondo
- Se annulli **prima** di confermare, il numero non si "brucia"
- Se annulli **dopo** la conferma, il numero è tuo (blocchi di bolle cartacee → buchi normali)

### Eye Emoji 👁️
Quando l'ufficio apre/tocca un ordine scrive `seenBy/{userId} = timestamp`. L'emoji appare a tutti quelli che hanno quell'ordine aperto.

### Notifiche (Blocco 4 — futuro)
- Permesso richiesto **una volta**, salvato
- Suono via **Web Audio API** (nessun file audio)
- Notifica nativa `Notification` API
- Funziona anche in background

---

## 8. Funzionalità Dettagliate

### 8.1 Tab Carrello (Magazzino)

#### Ricerca articoli
- Cache locale (~19.348 articoli)
- Ricerca istantanea in RAM
- Match intelligente (codice esatto > inizio > descrizione > token)
- Max 20 risultati + "Carica altri"
- Tastierino numerico utilizzabile per quantità e prezzi

#### Riga carrello
- Quantità (+/−) e click sul numero per tastierino
- Unità: PZ, KG, MT, MQ
- **PREZZO BASE** (KG/MT/MQ) → apre calcolatore taglio/peso
- **PREZZO** (PZ) → apre tastierino prezzo
- **Nome articolo cliccabile** → apre **Scheda Prodotto**
- Sconto % manuale (pulsante `%`)
- **Ciclo forbici**: neutro → scampolo → rotolo → scaglionato → neutro
- Note riga (modale)
- Ordina da fornitore (dropdown)
- Elimina riga
- **Pallino stato prezzo** accanto a "PREZZO"
- **Per articoli a misura**: annotazione `10 mt · € 0,309/mt` + `base € 11,00/kg · 0,281 kg`

#### Calcolatore taglio/peso (✅ FIX 04/10/2026)
- Formula: `kg = metri * (totU / mtRot)`, `prezzo = kg * basePrice`
- Apre modale con input metri, output prezzo+peso live
- "Applica" salva:
  - `qty = result.kg` (peso)
  - `unitPrice = line.basePrice` (invariato, €/kg)
  - `mtTotal = result.meters` (metri tagliati, annotazione)
  - `kgTotal = result.kg` (peso, annotazione)
- Legge `totU`/`mtRot` dalla **cache articolo** (sempre aggiornati)

#### Scaglioni
- Salvati nella **scheda prodotto**: `[{ qty, pct }, ...]`
- **Auto-apply** quando la qty raggiunge lo scaglione (Blocco 10, da fare)
- **Ricalcola** se la qty cambia manualmente
- Visibile come **badge sconto** sulla riga

#### Cliente
- **Cliente picker** con ~3.651 clienti reali importati
- Ricerca per nome/città con debounce
- Creazione al volo
- "Cliente 1" generico
- Salva su `meta.clientId` + `meta.clientName`

#### Riepilogo (Blocco 2B.4)
- Modale se ordine ha >1 articolo
- Checkbox "spunta tutto"
- Conferma solo se tutto spuntato

#### Confronta Articoli (Blocco 2B.4)
- Modale isolata, 2 slot
- Pesca dal carrello o catalogo
- Mostra specifiche tecniche
- Non tocca il carrello

#### Azioni finali
- **RIEP.** → riepilogo
- **UFF.** → bozza all'ufficio (carrello resta aperto) — genera codice ordine se prima volta
- **CONFERMA** → chiude carrello
- **📄 BOL.** → crea fattura (popup + conferma + numero atomico)
- **🗑** → svuota carrello (va nel cestino)

#### 📋 Tendina Ordini (Blocco 3.3c)
- Pulsante **📋 ORDINI** nell'header con contatore (**solo oggi**)
- Click → tendina POPUP con lista ordini del giorno
- Icone: 🔵 bozza · ✏️ modifica · ✅ nuovo/in_arrivo/fatto · 🟣 pronto · 🔓 sbloccato
- Codice ordine visibile (`Ordine #N - L`) o **`Fattura N · NOME`** se fatturato
- Click su un ordine → apre **vista dettaglio in banco**
- Chiude: click sfondo scuro o Esc

#### Vista dettaglio ordine in banco (Blocco 3.5-bis)
- Modale con:
  - **Banner colorato** in alto
  - Nome cliente **oppure** `Ordine #N - L` **oppure** `Fattura N · NOME`
  - Righe articoli readonly
  - Totale grande
  - Pulsanti: **🔓 Sblocca e modifica** · **📋 Ordini** · **🗑** · **🖨 Stampa DDT**
- Pulsante **Ordini** → chiude modale e riapre tendina
- Pulsante **Sblocca** → cambia stato a `sbloccato`, chiude modale, carica l'ordine come **carrello attivo** in banco (`switchToCart`)

#### 🆕 Tasto F (header banco)
- Piccolo pulsante **📄 F** accanto a "🏢 Ufficio"
- Click → prompt nativo: *"Numero prossima bolla:"* con valore corrente
- Salva su `counters/invoiceNumber`
- Alert `✅ Prossima bolla: X`

#### Icona stato cliente
- `getClientIcon(status, wasModified)` in `banco-controller.js`
- ✏️ se `status === "modifica"` **oppure** `wasModified === true`
- 🔵 se `status === "bozza"`
- Nessuna icona negli altri casi

---

### 8.2 Tab Ordini (Ufficio e Magazzino)

#### Filtri
- Giorni settimana (con dropdown "lunedì scorso")
- Calendario date-picker + archivio
- Ricerca globale
- Filtri stato: Nuovi, Fatti, Tutti, Pronto

#### Vista ordine
- Righe con prezzi modificabili (se non bloccato)
- Pulsanti principali: **✅ Fatto** · **📋 Pronto** · **🗑 Elimina**
- Pulsanti secondari (row sotto): **🖨 Stampa** (o **🖨 Stampa DDT** se fatturato) · **📋 Pronto** · **🗑 Elimina**
- Pulsante **📄 BOL.** sotto le azioni (sparisce se già fatturato)
- Nome cliente **oppure** `Ordine #N - L` **oppure** `Fattura N · NOME` con **✏️** se `wasModified: true`

#### Azioni sblocco (Blocco 3.5-bis)
- Click **🔓 Sblocca e modifica** → stato `sbloccato` + `isLocked: false`
- **Cambio automatico tab a NUOVI** + scroll all'ordine

#### Modifica righe
- Click su prezzo → tastierino → salva su Firebase
- Click su qty → tastierino → salva
- Click su badge sconto → tastierino % → salva
- Click sul **nome articolo** → **Scheda Prodotto**
- Dopo ogni modifica: `markCartAsModified(orderId)` (scrive `wasModified: true` **solo se stato `sbloccato`**)
- Aggiorna anche la cache articolo (`updateArticleInCache`) → pallini si aggiornano subito

#### 🆕 Tasto BOL in ufficio (Blocco 7)
- Click **📄 BOL.** → apre **client picker** → scegli cliente → **confirm nativo** → crea fattura
- Il tasto diventa **🖨 Stampa DDT**
- Se l'ordine è già fatturato, **📄 BOL.** non appare più

#### 🆕 Tasto F in ufficio (Blocco 7)
- Pulsante **📄 F** nell'header accanto a "🏭 Banco"
- Click → prompt nativo → salva su `counters/invoiceNumber`

#### 🆕 Sync prezzi al "Fatto" (Blocco 2B.7)
- Prima di aggiornare lo stato a `fatto`, chiama `syncOrderPricesToArticles(orderId)`
- Confronta ogni prezzo di riga con quello attuale dell'articolo
- Se diverso → aggiorna `basePrice`, `priceLastChangedAt`, `priceVerified`
- Aggiorna anche la cache locale
- Ritorna `{ updated, skipped, articles }`

---

### 8.3 Scheda Prodotto (Modale) — ✅ COMPLETATA (04/10/2026)

#### Come si apre (2 modi)
1. Click sul **nome articolo** nel carrello (banco)
2. Click sul **nome articolo** nell'ordine (ufficio)

#### Contenuto
- **DESCRIZIONE** (editabile)
- **COD. FORN.** (editabile)
- **MIO COD.** (readonly, grigio)
- **PREZZO** con pallino stato verifica
- **PRZ. VECCHIO** (tendina 5 prezzi FIFO con data + sorgente)
- **ACQ.** (prezzo acquisto, editabile)
- **SPECIFICHE TECNICHE** (textarea)
- **QUANTITÀ** (stepper −/+)
- **UNITÀ** (dropdown PZ/KG/MT/MQ)
- **SCORTA MIN.** (bordo rosso)
- **TOT.U** (solo se KG/MT/MQ)
- **MT.ROT** (solo se KG/MT/MQ)
- **PESO PER UNITÀ** (solo se KG/MT/MQ)
- **CORRELATI** (tendina)
- **SCAGLIONI** (tendina)
- Pulsanti: **❌ Annulla** · **💾 Salva**

#### Regole dinamiche
- TOT.U / MT.ROT / PESO visibili **solo** per KG/MT/MQ
- Nota gialla **"Prezzo Base collegato (€/kg) e usato nel magazzino"** visibile **solo** per articoli a misura
- Quando salvi, se TOT.U o MT.ROT cambiano → **ricalcola automaticamente** `kgPerUm = totU / mtRot`

#### Salvataggio
- Se cambia prezzo → vecchio in storico (max 5) + `priceLastChangedAt = now` + `priceVerified = true`
- Aggiorna **cache locale** con `updateArticleInCache`
- Se aperta da banco/ufficio su ordine **in modifica/sbloccato** → aggiorna anche la riga del carrello
- Se aperta su ordine **già inviato** → **NON** aggiorna la riga (mantiene prezzo inviato)

#### Chi può modificare
**Chiunque** (magazzino o ufficio)

---

### 8.4 Barra Ricerca Generica (nel Logo) — futura (Blocco 2B.8)

> ⚠️ **NOTA**: Attualmente il click sul logo apre la **Cassa**. La ricerca generica qui descritta è prevista nel Blocco 2B.8. Da valutare come far convivere le 2 cose.

#### Come si apre
Click sul **logo RATTAZZI** → popup modale di ricerca (o combinazione, da decidere)

#### 3 Tab
1. **ARTICOLI**: cerca articoli → click → apre scheda prodotto
2. **CLIENTI**: cerca nomi clienti → click → apre ordine cliente
3. **ORDINI**: cerca ordini → click → apre ordine

#### Comportamento
- `Esc` chiude
- Click fuori chiude
- Tasti **avanti/indietro** browser funzionano naturalmente

---

### 8.5 Import Dati (Pagina Unica con Tab)

#### Pagina `import.html`

```
┌─────────────────────────────────────┐
│         📥 IMPORTAZIONE DATI        │
├─────────────────────────────────────┤
│    [ ARTICOLI ]    [ CLIENTI ]      │
├─────────────────────────────────────┤
│  (drag&drop + anteprima + import)   │
└─────────────────────────────────────┘
```

#### Tab ARTICOLI
- File `.txt` pipe-delimited
- Formato: `|indice|tipo|codice|gruppo|spec|descrizione|UM|giacenza|inv|`
- Blocchi da 500, progress bar
- Chiave = codice

#### Tab CLIENTI ✅ (Blocco 5A completato)
- File `.txt` `chiave='valore'#chiave='valore'`
- Formato: `VecchioCodice='NOME'#Indirizzo='...'#c5='CITTÀ'#Provincia='XX'#IdAnagrafica='12345'`
- Parser: `parseClientsFile(text)` in `file-parser.js`
- Campi: nome (VecchioCodice), indirizzo, città (c5), provincia, id legacy
- Chiave = VecchioCodice (sanitizzato)
- Blocchi da 500, progress bar
- Importati: **~3.651 clienti**

---

### 8.6 Pallini Stato Prezzo ✅ (Blocco 2B.7 completato)

Ogni articolo ha un **pallino colorato** accanto al prezzo.

| Pallino | Colore | Significato |
|---|---|---|
| ⚫ | Grigio | Prezzo mai verificato |
| 🟢 | Verde | Verificato di recente (0-1 mese) |
| 🟡 | Giallo | Invariato da 1 mese (da controllare) |
| 🟠 | Arancione | Invariato da 3 mesi (da aggiornare) |
| 🔴 | Rosso | Invariato da 6 mesi (urgente) |
| 🟣 | Viola | Invariato da 12 mesi (critico) |

#### Dove appare
- ✅ Carrello banco (accanto a "PREZZO")
- ✅ Righe ordine ufficio
- ✅ Righe dettaglio cassa
- ✅ Scheda prodotto

#### Regole
- Il conteggio parte dall'**ultima modifica del prezzo**
- Il pallino si **aggiorna da solo** in base alla data
- Se il prezzo viene modificato → torna 🟢 verde
- Tooltip al passaggio del mouse
- Si aggiorna **automaticamente** dopo il caricamento cache (ufficio e cassa usano `.then(() => refresh())`)

#### Dati salvati
- `priceVerified: bool`
- `priceLastChangedAt: timestamp`

#### File dedicati
- `assets/css/price-dot.css`
- `js/ui/components/price-dot.js`

---

### 8.7 Template DDT ⚠️ (provvisorio)

> ⚠️ **NOTA IMPORTANTE (05/10/2026)**: Il template DDT attuale è **provvisorio** — riproduce un PDF generico Rattazzi. L'utente fornirà a breve un **template definitivo** (file HTML compilabile, identico all'originale cartaceo). Quando arriverà, va sostituito integralmente:
> - La funzione `renderDDT()` in `js/ui/components/print-invoice.js`
> - Il CSS in `assets/css/invoice.css` (sezione `@media print`)

#### Formato attuale
HTML + CSS fedele al PDF generico (A4 verticale)

#### Intestazione
- RATTAZZI S.R.L.
- Via Ettore Piazza 10, 28064 Carpignano Sesia (NO)
- Tel. 0321.825.145 - Fax 0321.825.917
- Cap. Soc. € 116.000 i.v.
- Cod. Fisc. e P.IVA 00029360039
- Reg. Imprese Novara 00029360039
- R.E.A. n. 89056

#### Campi auto-compilati
- **N. DDT** (`invoiceNumber`)
- **Data** (oggi) + **Ora** (adesso)
- **Ditta** (nome cliente)
- **Residenza o domicilio** (indirizzo cliente)
- **Comune** (città + provincia)
- **Righe articoli**: Codice · Descrizione · Prezzo · UM · Quantità · (Prezzo unit. vuoto)
- **12 righe vuote** sotto per completamento manuale
- **Pagamento / Luogo destinazione / N. Colli / Kg / Vettore / Firme / Annotazioni**: vuoti

#### Stampa
- **Iframe isolato** con `srcdoc` → mai pagina bianca, mai ricarica
- CSS `@media print` agisce **solo dentro l'iframe**
- **Nessun** header/footer del browser
- Non tocca mai la pagina principale

#### File dedicati
- `js/ui/components/print-invoice.js`
- `assets/css/invoice.css`

---

### 8.8 Ordini Fornitori (futuro — Blocco 5)

#### Da carrello
- Tasto **ORDINA** → dropdown fornitori colorati
- 🔴 usag, 🟢 as, 🔵 vm, 🟡 EuroBit, ⚪ Maestri, 🟣 AirCom, 🌸 sabart, ⚫ custom
- Crea ordine separato in `supplierOrders/`
- Marca la riga con colore fornitore

#### Sotto-tab CSV
- Carichi CSV fattura fornitore
- Parser flessibile
- Tabella: codice, descrizione, prezzo vecchio/nuovo, qty vecchia/nuova
- Differenze evidenziate in giallo
- Selezioni cosa aggiornare → "Aggiorna"
- Aggiorna solo prezzi e qty per match codice

#### Storico prezzi
- Max **5 prezzi** per articolo (FIFO)
- Ad ogni modifica, il vecchio va nello storico
- Visibile nella scheda prodotto

---

### 8.9 Cassa (Scontrino) — aggiornato al Blocco 3B-bis

#### A cosa serve
Leggere l'ordine già preparato dall'ufficio e **battere lo scontrino a mano** sul registratore di cassa fiscale fisico.

#### Accesso
Tutti gli utenti (papa, mati, massi, poli, cassa).

#### Vista LISTA (schermata principale)
- Card **piccole** (una riga ciascuna):
  - Nome cliente **oppure** `Ordine #N - L`
  - Stato (NUOVO/IN ARRIVO) + codice ordine
  - N° articoli + data
  - Totale grande giallo a destra
- Click su una card → **DETTAGLIO**

#### Vista DETTAGLIO (click su una card)
- Header con pulsante **←** per tornare alla lista
- Nome cliente **oppure** `Ordine #N - L` in giallo
- Sotto: `#xxxxxx · data · N articoli`
- Righe articoli con:
  - Numero riga
  - Descrizione + codice articolo (giallo)
  - **BADGE QTY GIALLO** ben visibile
  - Prezzo unitario (`× € 1,80`)
  - **Pallino stato prezzo**
  - Totale riga a destra
- Totale ordine grande in basso
- Pulsante **🔓 Sblocca e modifica** in basso a sinistra
- Pulsante **✅ FATTO** in basso a destra

#### Modalità EDIT
- Di default: **sola lettura**
- Click **🔓 Sblocca e modifica** → attiva **edit mode locale** (NON cambia stato Firebase):
  - Il pulsante diventa **🔒 Blocca modifiche** (giallo)
  - Badge qty e prezzo diventano **cliccabili** (leggero effetto hover)
- In edit mode:
  - Click su **badge qty** → tastierino → cambia quantità → salvataggio automatico
  - Click su **prezzo** → tastierino → cambia prezzo → salvataggio automatico
  - **Refresh live**: la riga si aggiorna subito (non aspetta listener Firebase)
  - Ricalcolo totale automatico
- Click **🔒 Blocca modifiche** → torna sola lettura
- **⚠️ Importante**: l'edit mode è **locale**, NON cambia lo stato Firebase

#### Azioni
- **✅ FATTO** → l'ordine passa in stato `fatto` + **sync prezzi automatico** → sparisce dalla cassa
- **🔓 Sblocca e modifica** → cambia stato a `sbloccato` + `isLocked: false` → sparisce dalla cassa (va in Ufficio tab NUOVI con banner 🟢 SBLOCCO)

#### Futuro (rinviato)
- Possibile integrazione con registratore di cassa fiscale (da valutare quando si comprerà)

#### File dedicati
- `cassa.html`
- `js/ui/controllers/cassa-controller.js`
- `js/ui/views/cassa-view.js`
- `assets/css/cassa.css`

---

## 9. UI/UX

### Temi

| Elemento | Dark | Light |
|---|---|---|
| Sfondo | `#0a0a0a` | `#f5f5f5` |
| Card | `#1a1a1a` | `#ffffff` |
| Primario | `#facc15` | `#dc2626` |
| Testo | `#ffffff` | `#111111` |
| Successo | `#22c55e` | `#16a34a` |
| Pericolo | `#ef4444` | `#dc2626` |

### Layout Banco

```
┌──────────────────────────────────────────────────┐
│  ⚙ RATTAZZI CARTELLINI  [📄 F] [🏢 Ufficio] [🚪]│
├──────────────────────────────────────────────────┤
│  [+ NUOVO] [👥 CLIENTI] [📋 ORDINI N] [🗑]      │
├──────────────────────────────────────────────────┤
│  🔍 Cerca per codice o descrizione…              │
├──────────────────────────────────────────────────┤
│  Cliente 1 ✏️ • 0 art.            👤 CAMBIA     │
├──────────────────────────────────────────────────┤
│  [righe carrello]                                │
│  [📝 Nota ordine]                                │
├──────────────────────────────────────────────────┤
│  TOTALE € 0,00                                   │
│  [RIEP.] [UFF.] [✅ CONFERMA] [📄 BOL.] [🗑]   │
└──────────────────────────────────────────────────┘
```

**Note**:
- Il logo RATTAZZI è cliccabile → apre la Cassa
- **📄 F** in header → modifica numero bolla
- **📄 BOL.** in bottom bar → crea fattura
- "CASSA" non è più mostrato nel login (accesso nascosto nel logo)

### Layout Ufficio

```
┌──────────────────────────────────────────────────┐
│  ⚙ RATTAZZI       [📄 F] [🏭 Banco] [🚪]         │
├──────────────────────────────────────────────────┤
│  [🟡 NUOVI] [🟢 FATTI] [📋 TUTTI] [🟣 PRONTO]   │
├──────────────────────────────────────────────────┤
│  🔍 Cerca…                            [📖]      │
├──────────────────────────────────────────────────┤
│  [card ordine espansa]                            │
│    PRODOTTO | Q.TÀ | PREZZO | TOT                │
│    [✅ Fatto]                                     │
│    [🖨 Stampa] [📋 Pronto] [🗑 Elimina]         │
│    [📄 BOL.]      ← solo se non fatturato       │
└──────────────────────────────────────────────────┘
```

### Elementi UI
- Banner colorati per stati ordine
- Badge per stati e conteggi
- Toast per notifiche temporanee
- Modali per input e conferme
- Tastierino numerico custom
- **Pallini stato prezzo**
- **Scheda prodotto** con tendine espandibili
- **Dialoghi nativi** (`confirm`, `prompt`, `alert`) per BOL e tasto F
- Icona **✏️** accanto al nome cliente

### Rimosso dall'app attuale
- Tasto % nell'header
- Tab Inventario, Fatture, Cartellini, Altro
- Partita IVA obbligatoria alla creazione cliente
- **Pulsante "CASSA" verde dal login**

---

## 10. Struttura File Completa

### ✅ Completati

```
ferr_app definitiva/
├── index.html                       ✅
├── banco.html                       ✅
├── ufficio.html                     ✅
├── cassa.html                       ✅
├── import.html                      ✅
├── PROGETTO.md                      ✅ (v2.6)
├── assets/
│   └── css/
│       ├── base.css                 ✅
│       ├── components.css           ✅ (+ z-index client picker)
│       ├── theme-dark.css           ✅
│       ├── theme-light.css          ✅
│       ├── banco.css                ✅
│       ├── ufficio.css              ✅
│       ├── cassa.css                ✅
│       ├── print.css                ✅ (3.8)
│       ├── product-card.css         ✅ (2B.6)
│       ├── price-dot.css            ✅ (2B.7)
│       └── invoice.css              ✅ (7)
└── js/
    ├── app.js                       ✅
    ├── core/
    │   ├── firebase-config.js       ✅
    │   ├── firebase-init.js         ✅ (con runTransaction esportato)
    │   ├── auth.js                  ✅
    │   ├── file-parser.js           ✅ (+ parseClientsFile)
    │   ├── notify.js                ❌
    │   └── utils.js                 ❌
    ├── data/
    │   ├── article-repository.js    ✅
    │   ├── cart-repository.js       ✅ (+ updateLineLock, markCartAsModified, generateOrderCode, syncOrderPricesToArticles)
    │   ├── client-repository.js     ✅
    │   ├── invoice-repository.js    ✅ 🆕 (Blocco 7)
    │   ├── order-repository.js      ❌
    │   ├── supplier-repository.js   ❌
    │   └── trash-repository.js      ❌
    ├── domain/
    │   ├── article-service.js       ✅ (+ updateArticleInCache)
    │   ├── cart-service.js          ✅ (+ totU/mtRot/kgPerUm in createLineFromArticle)
    │   ├── client-service.js        ✅
    │   ├── pricing-service.js       ❌
    │   ├── order-service.js         ❌
    │   ├── compare-service.js       ❌
    │   ├── supplier-service.js      ❌
    │   └── ddt-service.js           ❌
    └── ui/
        ├── components/
        │   ├── search-bar.js        ✅
        │   ├── keypad.js            ✅
        │   ├── cut-calculator.js    ✅ (funzionante dal 04/10)
        │   ├── modal.js             ✅
        │   ├── client-picker.js     ✅
        │   ├── summary-modal.js     ✅
        │   ├── compare-articles.js  ✅ (pronto, da collegare in 2B.8)
        │   ├── cart-line.js         ✅
        │   ├── product-card.js      ✅ 🆕 (2B.6)
        │   ├── print-orders-modal.js ✅ 🆕 (3.8)
        │   ├── price-dot.js         ✅ 🆕 (2B.7)
        │   ├── invoice-modal.js     ✅ 🆕 (7, creato ma attualmente non usato — vedi Note)
        │   ├── invoice-number-modal.js ✅ 🆕 (7, creato ma attualmente non usato — vedi Note)
        │   ├── print-invoice.js     ✅ 🆕 (7, con iframe srcdoc)
        │   ├── global-search.js     ❌
        │   ├── supplier-dropdown.js ❌
        │   └── toast.js             ❌
        ├── controllers/
        │   ├── banco-controller.js  ✅
        │   ├── ufficio-controller.js ✅
        │   └── cassa-controller.js  ✅
        └── views/
            ├── login-view.js        ✅ (senza CASSA)
            ├── import-view.js       ✅ (tab clienti)
            ├── banco-view.js        ✅
            ├── ufficio-view.js      ✅
            ├── clienti-view.js      ❌
            ├── ddt-view.js          ❌
            └── cassa-view.js        ✅
```

---

## 11. Ambiente di Sviluppo

### Setup
- **Editor**: Cursor
- **Estensione**: Live Server (Ritwick Dey)
- **Server**: `http://127.0.0.1:5500`
- **Browser**: Chrome/Edge con DevTools (F12)
- **Sistema**: Windows
- **Deploy**: GitHub Pages → `maxiz333.github.io/ferapp/`

### Regole operative
1. **Sempre `Ctrl + S`** prima di testare
2. **`Ctrl + Shift + R`** per ricaricare forzato
3. **Aprire SEMPRE con Live Server** (mai doppio click)
4. **Mai usare la preview interna di Cursor**
5. **Controllare sempre la Console**
6. **Se vedi "pagina bianca"**: probabile cache vecchia → **chiudi tutte le tab + riapri + Ctrl+Shift+R**

### Firebase
- **Progetto**: `ferr-app-5e277`
- **Regione**: europe-west1
- **Regole attuali**: `.read: true, .write: true` (sviluppo)
- **SDK**: Firebase v10 via CDN
- **`runTransaction`**: esportato da `firebase-init.js` (usato per la numerazione fatture)

---

## 12. Roadmap Completa

### ✅ COMPLETATI

- ✅ **BLOCCO 1** — Login (5 utenti, CASSA, sessione, redirect)
- ✅ **BLOCCO 2A** — Importazione Articoli (parser `.txt`, cache locale)
- ✅ **BLOCCO 2B.1** — Layout Banco + Ricerca
- ✅ **BLOCCO 2B.2** — Carrello Base
- ✅ **BLOCCO 2B.3.1** — Tastierino numerico + modifica qty/prezzo + sconto %
- ✅ **BLOCCO 2B.3.2** — Ciclo forbici (neutro/scampolo/rotolo/scaglionato)
- ✅ **BLOCCO 2B.3.3** — Calcolatore taglio/peso (✅ FIX 04/10/2026)
- ✅ **BLOCCO 2B.3.4a** — Note riga + note ordine
- ✅ **BLOCCO 2B.3.4b** — Cliente Picker
- ✅ **BLOCCO 2B.4** — Modale Riepilogo (>1 articolo, spunta tutto)
- ✅ **BLOCCO 2B.5** — Bozza / Conferma / Invio / Trash
- ✅ **BLOCCO 2B.6** — Scheda Prodotto **COMPLETATO 04/10/2026**
- ✅ **BLOCCO 2B.7** — Pallini Stato Prezzo **COMPLETATO 04/10/2026**
- ✅ **BLOCCO 3.1** — Layout Ufficio (lista ordini)
- ✅ **BLOCCO 3.2** — Collegamento Firebase (ordini reali)
- ✅ **BLOCCO 3.3** — Contatori + tendina ordini giorno (3.3a + 3.3b + 3.3c)
- ✅ **BLOCCO 3.4** — Vista dettaglio ordine (modifica prezzi/qty/sconto)
- ✅ **BLOCCO 3.5** — Azioni ordine (Fatto, Pronto, Sblocca)
- ✅ **BLOCCO 3.5-bis** — Sblocco ordine da Ufficio, Banco e Cassa
- ✅ **BLOCCO 3.7 (parte 1)** — Codice Ordine `Ordine #N - L`
- ✅ **BLOCCO 3.8** — Stampa Multi-Ordine **COMPLETATO 01/10/2026**
- ✅ **BLOCCO 3B** — Pagina Cassa (scontrino + FATTO)
- ✅ **BLOCCO 3B-bis** — Cassa stile COMPATTO (lista + dettaglio + edit mode)
- ✅ **BLOCCO 5A** — Import Clienti (~3.651) **COMPLETATO 04/10/2026**
- ✅ **BLOCCO 6** — Anagrafica Clienti **COMPLETATO 04/10/2026**
- ✅ **BLOCCO 7** — Fatturazione DDT **COMPLETATO 05/10/2026**
- ✅ **Header** — Logo → Cassa, toggle Ufficio/Banco, colori uniformati
- ✅ **Bug fix 28/09** — `isLocked`, loop `Sync totali`, `wireBottomButtons`, `saveOrderNote`
- ✅ **Bug fix 29-30/09** — `markCartAsModified` solo se `sbloccato`, doppia `markOrderAsModified`, graffa `else if`, tendina chiude su sfondo
- ✅ **Bug fix 01-05/10** — Fix calcolatore taglio/peso, fix cassa refresh live, fix sync prezzi, fix pagina bianca stampa/BOL, rimozione CASSA dal login, fix Banco ↔ Ufficio per tutti

### 🔄 IN CORSO

- *(nessuno)*

### 📋 DA FARE (in ordine di priorità)

| # | Blocco | Cosa | Complessità |
|---|---|---|---|
| 1 | **2B.8** | Barra Ricerca Generica (nel logo) | 🟡 Media |
| 2 | **4** | Occhio 👁️ + Notifiche | 🟡 Media |
| 3 | **5** | Ordini Fornitori + CSV | 🟠 Alta |
| 4 | **8** | Cestino + Archivio + Reset mezzanotte | 🟡 Media |
| 5 | **10** | Scaglioni (auto-apply + UI) | 🟡 Media |
| 6 | **11** | Tema Light + Selettore | 🟡 Media |
| 7 | **12** | Regole Firebase + Deploy produzione | 🟠 Alta |
| 8 | **3.7 p2** | Anti-truffa | 🟠 Rinviato alla fine |

### 📌 RINVIATI

- 📌 **BLOCCO 13** — Tasti avanti/indietro
- 📌 **BLOCCO 14** — Categorie/Sottocategorie
- 📌 **FUTURO** — Integrazione registratore di cassa fiscale
- 📌 **FUTURO** — Fattura fiscale (la fa il commercialista)

---

## 13. Stato Avanzamento Attuale

### 📊 Riepilogo

| Blocco | Descrizione | Stato |
|---|---|---|
| 1 | Login | ✅ |
| 2A | Import articoli | ✅ |
| 2B.1 | Layout Banco + Ricerca | ✅ |
| 2B.2 | Carrello base | ✅ |
| 2B.3.1 | Tastierino + Sconti | ✅ |
| 2B.3.2 | Ciclo forbici | ✅ |
| 2B.3.3 | Calcolatore taglio/peso | ✅ (fix 04/10) |
| 2B.3.4a | Note riga + ordine | ✅ |
| 2B.3.4b | Cliente Picker | ✅ |
| 2B.4 | Riepilogo + Confronto | ✅ |
| 2B.5 | Bozza/Conferma/Invio | ✅ |
| **2B.6** | **Scheda Prodotto** | **✅ COMPLETATO** |
| **2B.7** | **Pallini Stato Prezzo** | **✅ COMPLETATO** |
| 2B.8 | Barra Ricerca Generica | ⏳ |
| 3.1 | Layout Ufficio | ✅ |
| 3.2 | Ordini reali da Firebase | ✅ |
| 3.3 | Contatori + Tendina ordini | ✅ |
| 3.4 | Vista dettaglio ordine | ✅ |
| 3.5 | Azioni ordine | ✅ |
| 3.5-bis | Sblocco ordine | ✅ |
| 3.6 | Fattura fiscale | ❌ (non si fa) |
| 3.7 p1 | Codice Ordine `#N - L` | ✅ |
| 3.7 p2 | Anti-truffa | ⏳ rinviato |
| **3.8** | **Stampa Multi-Ordine** | **✅ COMPLETATO** |
| 3B | Pagina Cassa | ✅ |
| 3B-bis | Cassa stile COMPATTO | ✅ |
| 4 | Occhio + Notifiche | ⏳ |
| 5 | Ordini Fornitori + CSV | ⏳ |
| **5A** | **Import Clienti** | **✅ COMPLETATO (~3.651)** |
| **6** | **Anagrafica Clienti** | **✅ COMPLETATO** |
| **7** | **Fatturazione DDT** | **✅ COMPLETATO** |
| 8 | Cestino + Reset | ⏳ |
| 9 | Storico prezzi | ✅ (in scheda prodotto) |
| 10 | Scaglioni | ⏳ |
| 11 | Tema Light | ⏳ |
| 12 | Regole + Deploy | ⏳ |

### 🎯 Prossimo passo immediato

**BLOCCO 2B.8 — Barra Ricerca Generica** oppure **BLOCCO 8 — Cestino**. Vedi Sezione 16.

---

## 14. Note Tecniche Importanti

### Struttura cartelle CRITICA
- `search-bar.js` in `js/ui/components/`
- `banco-controller.js` in `js/ui/controllers/`
- Se sposti un file, aggiorna gli import

### `banco.css` deve esistere
Senza, l'header non si stila.

### Parser solo `.txt`
- Articoli: pipe-delimited
- Clienti: `chiave='valore'#chiave='valore'`
- CSV fornitori: gestito dalla sotto-tab dedicata (Blocco 5)

### Prezzi a 0
Gli articoli importati hanno `basePrice: 0`. I prezzi reali verranno da scheda prodotto o CSV fornitori.

### Salvataggio file
Cursor **non ha autosave**. Sempre `Ctrl + S`.

### Ricarica forzata
`Ctrl + Shift + R` per bypassare cache.

### Errori innocui (IGNORALI)
- `favicon.ico 404` (non c'è un'icona)
- `DevTools is now available in Italian`
- `[Violation] Permissions policy violation: unload is not allowed`
- `WebSocket connection to 'ws://127.0.0.1:5500/...' failed: Page entered Back-Forward Cache` ← Live Server + BFCache, si riconnette da solo
- `WebSocket connection to 'wss://s-gke-euw1-nssi2-5.europe-west1.firebasedatabase.app/...' failed: Page entered Back-Forward Cache` ← Firebase + BFCache, si riconnette da solo
- `[Violation] Avoid using document.write()` ← warning innocuo (usato per iframe stampa)
- Eventuali warning CORS in sviluppo

### Due codici articolo
- **MIO COD.** → codice interno (chiave Firebase)
- **COD. FORN.** → codice fornitore (per match CSV)

### DDT e fiscalità
Il DDT è un documento fiscale. Il template definitivo verrà fornito dall'utente (HTML compilabile, identico all'originale cartaceo). Non inventare campi.

### 🛡️ Guardia anti-loop `scheduleTotalsSync`
In `banco-controller.js` c'è una funzione `scheduleTotalsSync()` con debounce 400ms. Al suo interno c'è una guardia `_lastSyncedKey` che **impedisce la riscrittura** dei totali se identici all'ultimo invio. **NON rimuoverla**.

### 🔒 `updateLineLock`
In `ufficio-controller.js` è **locale** (definita in fondo). In `cart-repository.js` è **esportata** (per banco e cassa).

### 🔒 `saveOrderNote`
In `banco-controller.js`, `saveOrderNote(text)` è **locale**. Usa `updateNote` (importato da `cart-repository.js`).

### 🔒 `markOrderAsModified` (banco) vs `markCartAsModified` (repo)
- **`markOrderAsModified()`** in `banco-controller.js`: chiamata dopo ogni modifica in banco, scrive solo se lo stato è `sbloccato`
- **`markCartAsModified(cartId)`** in `cart-repository.js`: esportata, chiamata da ufficio dopo `editLinePrice/Qty/Discount`. Legge lo stato da Firebase e scrive solo se è `sbloccato`

### 🎫 `generateOrderCode(cartId)` — Blocco 3.7
- Funzione esportata in `cart-repository.js`
- Genera un codice `Ordine #N - L` con alfabeto alternato A-Z-B-Y-C-X...
- Incrementa `counters/orderNumber`, salva `meta/orderNumber` + `meta/orderCode`
- Reset automatico a mezzanotte
- Chiamata in `banco-controller.js` dentro `sendDraftToOffice()`, **solo se il carrello non ha già un codice**

### 🎯 `switchToCart(cartId)` — Blocco 3.5-bis
- In `banco-controller.js`
- Stacca il listener corrente, imposta il nuovo `_cartId`, carica il carrello, riattacca il listener
- Usata dal pulsante **🔓 Sblocca e modifica** in banco

### 📝 `wasModified` (flag)
- Salvato in `meta/wasModified` (booleano)
- Settato **solo se lo stato è `sbloccato`**
- Una volta `true`, **rimane per sempre**
- Visibile come **✏️** accanto al nome cliente

### 🆕 Numerazione fatture — Blocco 7
- **`generateInvoiceNumber()`** in `invoice-repository.js` usa `runTransaction` → atomico, zero duplicati
- Parte da **2000**, salvato in `counters/invoiceNumber`
- **NON si resetta a mezzanotte** (progressivo perpetuo)
- **`peekNextInvoiceNumber()`** mostra il prossimo numero senza assegnarlo
- **`setNextInvoiceNumber(n)`** modifica manualmente il prossimo numero (tasto F)
- **`saveInvoiceToCart(cartId, num)`** salva `meta/invoiceNumber` + `meta/invoiceDate`

### 🖨️ Stampa senza pagina bianca — Blocco 7
- **Regola d'oro**: MAI usare `window.print()` sulla pagina principale
- **Soluzione**: iframe nascosto con `srcdoc` + `iframe.contentWindow.print()`
- **`print-invoice.js`** e **`print-orders-modal.js`** usano questo pattern
- Il CSS `@media print` agisce **solo dentro l'iframe** → mai pagina bianca
- **NON** usare `window.open()` (crea finestra `about:blank`)
- **NON** usare `document.write()` direttamente (rompe la pagina principale)

### 🆕 Dialoghi nativi per BOL e F
- **BOL in banco** → `confirm()` nativo
- **BOL in ufficio** → `openClientPicker()` + `confirm()` nativo
- **Tasto F** → `prompt()` + `alert()` nativi
- **Motivo**: le modali custom (`invoice-modal.js`, `invoice-number-modal.js`) **esistono nel progetto** ma **non sono attualmente utilizzate** perché causavano problemi di pagina bianca in combinazione con il client picker. Si preferisce il dialogo nativo che **non tocca mai il DOM**.

### 🆕 Cache locale articoli
- **`updateArticleInCache(key, fields)`** in `article-service.js` → aggiorna un articolo in cache **senza ricaricare** tutti i 19k
- Usato da: `product-card.js`, `ufficio-controller.js`, `cassa-controller.js`, `banco-controller.js` (dopo sync)
- **`ensureArticlesLoaded().then(() => refresh())`** in ufficio/cassa → pallini visibili automaticamente al primo caricamento

### 🆕 Sync prezzi ordine → articoli
- **`syncOrderPricesToArticles(orderId)`** in `cart-repository.js`
- Chiamato quando un ordine va in `fatto` (da ufficio e cassa)
- Confronta ogni prezzo riga con quello attuale dell'articolo
- Se diverso → aggiorna `basePrice`, `priceLastChangedAt`, `priceVerified`
- Se identico → **skip** (no scrittura inutile)
- Ritorna `{ updated, skipped, articles: [{key, price}] }`

### 🆕 Calcolatore taglio/peso — comportamento
- **`qty = result.kg`** (peso, non metri)
- **`unitPrice = line.basePrice`** (invariato, €/kg)
- **`mtTotal`** = metri tagliati (annotazione)
- **`kgTotal`** = peso (annotazione)
- **NON cambia mai `basePrice`** dell'articolo → il sync salva il prezzo corretto in €/kg

---

## 15. Come Riprendere il Lavoro

### In una NUOVA chat
Allega `PROGETTO.md` e scrivi:
> *"Leggi PROGETTO.md del mio progetto FerApp e riprendiamo dal prossimo blocco."*

### In una SESSIONE normale
1. Apri Cursor sulla cartella `ferr_app definitiva`
2. Verifica Live Server attivo su `http://127.0.0.1:5500`
3. Apri `index.html` → login "papa"
4. Controlla console (F12)
5. Riprendi dal blocco in corso

### Checklist pre-sessione
- [ ] Live Server attivo
- [ ] Firebase raggiungibile
- [ ] Cache articoli carica (~19.348)
- [ ] Cache clienti carica (~3.651)
- [ ] Login funziona
- [ ] Nessun errore rosso in console
- [ ] Pulsanti RIEP./UFF./CONFERMA/BOL collegati (log in console)

### Se vedi "pagina bianca"
1. Chiudi **tutte** le tab del browser
2. Riapri con `Ctrl + Shift + R`
3. Apri F12 → Network → spunta **"Disable cache"**
4. Ricarica ancora
5. Se ancora: F12 → Application → Storage → **Clear site data** → ricarica

---

## 📌 Riferimenti Rapidi

| Cosa | Dove |
|---|---|
| Login | `http://127.0.0.1:5500/index.html` |
| Banco | `http://127.0.0.1:5500/banco.html` |
| Ufficio | `http://127.0.0.1:5500/ufficio.html` |
| Cassa | `http://127.0.0.1:5500/cassa.html` |
| Import | `http://127.0.0.1:5500/import.html` |
| Firebase Console | https://console.firebase.google.com/project/ferr-app-5e277 |
| Live Server | porta 5500 |

---

## 16. Blocchi in Dettaglio

### 16.1 🔤 BLOCCO 3.7 — Codice Ordine + Anti-Truffa

#### 📌 Contesto (perché serve)
- Il 90% degli ordini usa "Cliente 1" generico (no nome)
- Un cliente può fare 2 ordini su banchi diversi
- In ufficio può fingere di aver fatto solo 1 ordine
- Serve un sistema per: 1) dare un codice al cliente, 2) verificare la presenza di altri ordini, 3) avvisare l'operatore
- **Il cliente NON deve capire quanti ordini sono stati fatti oggi**

#### ✅ PARTE 1 — COMPLETATA (30/09/2026)

**Formato codice**: `Ordine #N - L`
- **N** = numero progressivo (1, 2, 3, ...)
- **L** = lettera alfabeto alternato

**Alfabeto alternato**:
```
A, Z, B, Y, C, X, D, W, E, V, F, U, G, T,
H, S, I, R, J, Q, K, P, L, O, M, N
```

**Esempi**:
| Numero | Lettera |
|---|---|
| Ordine #1 | A |
| Ordine #2 | Z |
| Ordine #3 | B |
| Ordine #4 | Y |
| ... | ... |
| Ordine #26 | N |
| Ordine #27 | A (ricomincia lettera) |
| Ordine #28 | Z |

**Reset giornaliero**:
- Sia il NUMERO sia la LETTERA si azzerano a mezzanotte
- Domani riparte da: `#1 - A`

**Salvataggio Firebase**:
```
activeCarts/{cartId}/meta/orderNumber = 27
activeCarts/{cartId}/meta/orderCode = "A"
counters/orderNumber = 27              (contatore globale del giorno)
counters/lastResetDate = "2026-09-30"  (per reset automatico)
```

**Implementazione**:
- `generateOrderCode(cartId)` in `cart-repository.js`
- Chiamata in `banco-controller.js` dentro `sendDraftToOffice()` (pulsante UFF.), **solo se il carrello non ha già un codice**
- Visualizzato in banco (barra cliente + tendina + vista dettaglio)
- Visualizzato in ufficio (card ordine)
- Visualizzato in cassa (card lista + dettaglio)

#### ⏳ PARTE 2 — ANTI-TRUFFA (da fare)

**Problema specifico**:
- Cliente entra → fa ordine al Banco 1 → va al Banco 2 → fa altro ordine
- In ufficio finge di aver fatto solo 1 ordine
- L'ufficio rischia di incassare solo 1 dei 2

**Soluzione (doppia protezione)**:

**1. Quando l'ufficio cerca un codice in barra ricerca:**
- Trova l'ordine principale
- Sotto mostra anche **"⚠️ Altri ordini recenti (ultimi 10 min)"**
- Lista di ordini aperti con orario simile

**2. Al click FATTO su un ordine:**
- Se esistono altri ordini aperti con orario ±10 min:
- Popup: *"Questo cliente ha altri N ordini aperti:*
  - *Ordine #28 - Z (14:33) €23,10*
  - *Ordine #29 - B (14:35) €12,00*
  *Chiudi solo questo o anche gli altri?"*
- Opzioni: **[Solo questo]** / **[Chiudi anche gli altri]** / **[Annulla]**

**Filosofia**:
- Il software mette in guardia l'operatore
- L'operatore **DECIDE** (non è automatico)
- Zero codici visibili al cliente
- Zero numeri rivelati al cliente

**⚠️ Nota utente**: "non metteremo più il timer ci limitiamo ad usare il numero dal progetto"

---

### 16.2 🔓 BLOCCO 3.5-bis — Sblocco Ordine

#### ✅ COMPLETATO (30/09/2026)

#### Dove
Ufficio + Banco + Cassa

#### Come funziona
- Ordine di default bloccato in stato `fatto` (sola lettura)
- Pulsante **"🔓 Sblocca e modifica"**:
  - **In Ufficio**: accanto a Fatto/Pronto/Elimina → cambia stato `sbloccato` + `isLocked: false` + tab NUOVI + scroll automatico
  - **In Banco**: dentro vista dettaglio ordine → cambia stato `sbloccato` + carica l'ordine come **carrello attivo** in banco
  - **In Cassa**: dentro dettaglio → cambia stato `sbloccato` + `isLocked: false` → l'ordine sparisce dalla cassa

#### Stato Firebase
```
activeCarts/{cartId}/meta/isLocked   = true | false
activeCarts/{cartId}/meta/wasModified = true (dopo la prima modifica post-sblocco)
```

#### Icona ✏️ (matita)
- `getClientIcon(status, wasModified)` in `banco-controller.js`
- ✏️ se `status === "modifica"` **oppure** `wasModified === true`
- 🔵 se `status === "bozza"`
- Nessuna icona negli altri casi

#### Chiamate scrittura `wasModified`
- **Banco**: `markOrderAsModified()` in `banco-controller.js` (chiamata in `onArticleSelected` + `onLineAction`)
- **Ufficio**: `markCartAsModified(orderId)` in `cart-repository.js` (chiamata in `editLinePrice/Qty/Discount`)
- **Entrambe scrivono SOLO se lo stato è `sbloccato`** (mai su ordini normali)

---

### 16.3 💰 BLOCCO 3B-bis — Cassa stile COMPATTO

#### ✅ COMPLETATO (30/09/2026)

#### Layout

**LISTA (schermata principale)**:
- Card **piccole**:
  - Cliente (oppure `Ordine #N - L`)
  - Stato + codice ordine
  - N° articoli + data
  - Totale grande giallo a destra
- Border-left colorato (rosso per in_arrivo, giallo per nuovo)
- Click su una card → **DETTAGLIO**

**DETTAGLIO (click su una card)**:
- Pulsante **←** per tornare alla lista
- Header: cliente (oppure `Ordine #N - L`) + `#xxxxxx · data · N articoli`
- Righe articoli con:
  - Numero riga + descrizione
  - Codice articolo (sotto, giallo)
  - **BADGE QTY GIALLO** ben visibile
  - Prezzo unitario (`× € 1,80`)
  - **Pallino stato prezzo**
  - Totale riga (a destra, giallo)
- Totale ordine grande in basso
- Pulsante **🔓 Sblocca e modifica** in basso a sinistra
- Pulsante **✅ FATTO** in basso a destra

#### Modalità EDIT
- Di default: **sola lettura**
- Click **🔓 Sblocca e modifica** → **edit mode locale** (NON cambia stato Firebase):
  - Il pulsante diventa **🔒 Blocca modifiche** (giallo)
  - Badge qty e prezzo diventano **cliccabili** (hover)
- In edit mode:
  - Click su **badge qty** → tastierino → salvataggio automatico
  - Click su **prezzo** → tastierino → salvataggio automatico
  - **Refresh live**: riga aggiornata subito
  - Ricalcolo totale automatico
- Click **🔒 Blocca modifiche** → torna sola lettura

#### Azioni
- **✅ FATTO** → stato `fatto`, sparisce dalla cassa + sync prezzi
- **🔓 Sblocca e modifica** → stato `sbloccato`, sparisce dalla cassa (va in Ufficio tab NUOVI con banner 🟢 SBLOCCO)

#### Screenshot riferimento
Vecchia app FerApp (foto lista compatta + foto dettaglio aperto).

---

### 16.4 🖨️ BLOCCO 3.8 — Stampa Multi-Ordine

#### ✅ COMPLETATO (01/10/2026)

#### Dove
- **Ufficio**: tasto **"🖨 Stampa"** dentro ogni ordine
- **Banco**: tasto **"🖨 Stampa DDT"** nel popup ordini

#### Flusso ufficio
1. Click su "🖨 Stampa" in un ordine
2. Si apre modale con lista ordini filtrati (stesso filtro attivo), ordine corrente pre-selezionato
3. Checkbox per selezione multipla + "Seleziona tutti"
4. "🖨 STAMPA" → anteprima di stampa

#### Flusso banco
1. Click su "🖨 Stampa DDT" nel dettaglio ordine
2. Stampa **solo quell'ordine** (nessuna modale)

#### Contenuto ogni ordine stampato
- Codice ordine **oppure** `Fattura N · NOME`
- Cliente + matita ✏️
- Data + ora + operatore
- Righe: descrizione + codice + qty + prezzo + totale
- Totale ordine
- Note (se presenti)

#### Layout stampa
- A4 verticale
- `page-break-inside: avoid`
- Solo nero/bianco
- **Nessun** header/footer browser

#### Implementazione
- `assets/css/print.css`
- `js/ui/components/print-orders-modal.js` (con iframe `srcdoc`)

#### File modificati
`ufficio.html`, `banco.html`, `ufficio-controller.js`, `banco-controller.js`

---

### 16.5 📦 BLOCCO 2B.6 — Scheda Prodotto

#### ✅ COMPLETATO (04/10/2026)

#### Come si apre
1. Click sul **nome articolo** nel carrello banco
2. Click sul **nome articolo** nella riga dell'ordine ufficio

#### Campi
- DESCRIZIONE (editabile)
- COD. FORN. (editabile)
- MIO COD. (readonly, grigio)
- PREZZO + pallino stato verifica
- PRZ. VECCHIO (tendina 5 prezzi FIFO: data, prezzo, sorgente)
- ACQ. (editabile)
- SPECIFICHE TECNICHE (textarea, placeholder)
- QUANTITÀ (stepper −/+)
- UNITÀ (dropdown PZ/KG/MT/MQ)
- SCORTA MIN. (bordo rosso)
- TOT.U (solo KG/MT/MQ)
- MT.ROT (solo KG/MT/MQ)
- PESO PER UNITÀ (solo KG/MT/MQ, placeholder `Es: 0.289 (Peso al mt/mq)`)
- CORRELATI (tendina espandibile)
- SCAGLIONI (tendina espandibile)
- Pulsanti: **❌ Annulla** · **💾 Salva**

#### Regole dinamiche
- TOT.U / MT.ROT / PESO visibili **solo** per KG/MT/MQ
- Nota gialla "Prezzo Base collegato (€/kg) e usato nel magazzino" visibile solo per articoli a misura
- Quando TOT.U o MT.ROT cambiano → ricalcola automaticamente `kgPerUm = totU / mtRot`

#### Salvataggio
- Se cambia prezzo → vecchio in storico (max 5) + `priceLastChangedAt = now` + `priceVerified = true`
- Aggiorna cache locale con `updateArticleInCache`
- Se aperta su ordine in `modifica` o `sbloccato` → aggiorna anche la riga carrello
- Se aperta su ordine **già inviato** → **NON** aggiorna la riga (mantiene prezzo inviato)

#### File creati
- `assets/css/product-card.css`
- `js/ui/components/product-card.js`

#### File modificati
`banco.html`, `ufficio.html`, `banco-controller.js`, `banco.css`, `ufficio-view.js`, `ufficio.css`, `ufficio-controller.js`

---

### 16.6 🎯 BLOCCO 2B.7 — Pallini Stato Prezzo

#### ✅ COMPLETATO (04/10/2026)

#### Dove
- Carrello banco
- Righe ordine ufficio
- Righe dettaglio cassa
- Scheda prodotto

#### Colori
- ⚫ grigio — mai verificato
- 🟢 verde — verificato 0-1 mese
- 🟡 giallo — 1-3 mesi
- 🟠 arancione — 3-6 mesi
- 🔴 rosso — 6-12 mesi
- 🟣 viola — 12+ mesi

#### Update automatico
- Ufficio e cassa caricano la cache in background
- Al termine: `.then(() => refresh())` → pallini appaiono automaticamente

#### File creati
- `assets/css/price-dot.css`
- `js/ui/components/price-dot.js`

#### File modificati
`banco.html`, `ufficio.html`, `cassa.html`, `banco-controller.js`, `ufficio-controller.js`, `ufficio-view.js`, `cassa-controller.js`, `cassa-view.js`

---

### 16.7 📥 BLOCCO 5A — Import Clienti

#### ✅ COMPLETATO (04/10/2026)

#### Dove
Tab **CLIENTI** in `import.html`

#### Parser
`parseClientsFile(text)` in `file-parser.js`
- Formato: `VecchioCodice='NOME'#Indirizzo='...'#c5='CITTÀ'#Provincia='XX'#IdAnagrafica='12345'`
- Decodifica HTML entities (`&#x27;` → `'`, `&amp;` → `&`, ecc.)

#### Import
- Blocchi da 500
- Progress bar
- Anteprima primi 10 clienti (Nome · Indirizzo · Città · Prov.)
- Chiave = VecchioCodice (sanitizzato)

#### Importati
- **~3.651 clienti** ✅

#### File modificati
`file-parser.js`, `import.html`, `import-view.js`

---

### 16.8 👥 BLOCCO 6 — Anagrafica Clienti

#### ✅ COMPLETATO (04/10/2026)

#### Cosa fa
- **Client picker** legge da Firebase `clients/`
- Ricerca per nome/città con debounce
- Click su cliente → salvato su `meta.clientId` + `meta.clientName`
- "Crea nuovo cliente" funziona
- "Cliente 1" generico se non specificato

#### Accesso
- Da banco: pulsante **👤 CAMBIA** nella barra cliente
- Da ufficio: nel popup BOL (Blocco 7)

---

### 16.9 📄 BLOCCO 7 — Fatturazione DDT

#### ✅ COMPLETATO (05/10/2026)

#### Dove
- **Banco**: pulsante **📄 BOL.** nella bottom bar + pulsante **📄 F** in header
- **Ufficio**: pulsante **📄 BOL.** in ogni ordine + pulsante **📄 F** in header

#### Flusso banco
1. Click **📄 BOL.**
2. `confirm` nativo con cliente + anteprima numero
3. OK → numero atomico assegnato + salvato su `meta.invoiceNumber`
4. Barra cliente diventa **`Fattura N · NOME CLIENTE`**
5. Tasto bottom bar diventa **🖨 Stampa DDT**
6. Click → iframe nascosto → anteprima di stampa

#### Flusso ufficio
1. Click **📄 BOL.** su un ordine
2. Apre **client picker** → scegli cliente → OK
3. `confirm` nativo → OK → numero assegnato
4. Titolo ordine diventa **`Fattura N · NOME CLIENTE`**
5. Tasto **📄 BOL.** sparisce, il tasto **🖨 Stampa** diventa **🖨 Stampa DDT**

#### Tasto F (banco + ufficio)
1. Click **📄 F**
2. Prompt nativo: *"Numero prossima bolla:"* con valore corrente
3. Salva su `counters/invoiceNumber`
4. Alert `✅ Prossima bolla: X`

#### Numerazione
- Parte da **2000**
- Progressivo atomico (`runTransaction`)
- Non si resetta mai
- Zero duplicati anche con 2 postazioni in contemporanea

#### Template DDT
- **Attualmente provvisorio** (vedi sezione 8.7)
- Quando arriverà il template definitivo dall'utente, sostituire `renderDDT()` in `print-invoice.js` e il CSS in `invoice.css`

#### Stampa
- **Iframe isolato con `srcdoc`** → mai pagina bianca, mai ricarica
- CSS `@media print` agisce solo dentro l'iframe

#### File creati
- `js/data/invoice-repository.js`
- `js/ui/components/invoice-modal.js` *(creato ma non utilizzato — vedi Note)*
- `js/ui/components/invoice-number-modal.js` *(creato ma non utilizzato — vedi Note)*
- `js/ui/components/print-invoice.js`
- `assets/css/invoice.css`

#### File modificati
`banco.html`, `ufficio.html`, `banco.css`, `ufficio.css`, `banco-controller.js`, `ufficio-controller.js`, `ufficio-view.js`, `cart-repository.js`

---

## 📝 Cronologia Modifiche

| Data | Modifica |
|---|---|
| 22/09/2026 | Creazione v1.0 |
| 23/09/2026 | v2.0 — Aggiunte: Clienti, Scheda Prodotto, Barra Ricerca Generica, Pallini Prezzo, Scaglioni, Template DDT, Tasti avanti/indietro (rinviati) |
| 24/09/2026 | v2.1 — Completati 2B.3.4b (Cliente Picker), 2B.4 (Riepilogo), 2B.5 (Bozza/Conferma/Invio). Aggiunto fix listener cambio carrello |
| 24/09/2026 | v2.2 — Completato Blocco 3.1 (Layout Ufficio). Chiarita distinzione UFFICIO vs CASSA. Aggiunta sezione 8.9 Cassa. Aggiornati utenti/accessi (tutti possono tutto). Aggiunto cambio interfaccia da header |
| 25/09/2026 | v2.3 — Completati: 3.2 (Ordini reali da Firebase), 3.4/3.5 (Modifica ordini), 3B (Pagina Cassa). Fix header Banco/Ufficio/Cassa |
| 28/09/2026 | v2.4 — Sessione di riparazione. Fix applicati: loop infinito Sync totali, doppia dichiarazione `scheduleTotalsSync`, `wireBottomButtons()` mai chiamata, `saveOrderNote()` ricreata, bug `isLocked` risolto |
| 29-30/09/2026 | **v2.5** — Sessione lunga. **Completati**: 3.3, 3.5-bis, 3B-bis, 3.7 parte 1. **Bug fix**: graffa doppia `updateClientBar`, doppia `markOrderAsModified`, tendina chiude su sfondo, pulsante PRONTO rotto, `markCartAsModified` solo se `sbloccato`, tab NUOVI automatico dopo sblocco |
| 01/10/2026 | **v2.6 (parte 1)** — **Completati**: 3.8 (Stampa Multi-Ordine), 2B.6 (Scheda Prodotto), 2B.7 (Pallini Stato Prezzo). **Fix**: Banco ↔ Ufficio per tutti gli utenti, rimozione CASSA dal login, cache articoli aggiornata dopo modifiche, sync prezzi al "Fatto", pallini visibili automaticamente |
| 04/10/2026 | **v2.6 (parte 2)** — **Fix**: calcolatore taglio/peso (bug bloccante risolto), cassa refresh live (prezzo si aggiorna subito), prezzo proporzionale KG (qty = kg, unitPrice = basePrice, mtTotal, kgTotal) |
| 05/10/2026 | **v2.6 (parte 3)** — **Completati**: 5A (Import ~3.651 clienti), 6 (Anagrafica Clienti), 7 (Fatturazione DDT). **Fix**: **pagina bianca risolta** (iframe srcdoc + dialoghi nativi). **Nuove funzioni repository**: `syncOrderPricesToArticles`, `generateInvoiceNumber` (atomica), `peekNextInvoiceNumber`, `setNextInvoiceNumber`, `saveInvoiceToCart`. **Nuovi componenti**: `product-card.js`, `print-orders-modal.js`, `price-dot.js`, `invoice-modal.js`, `invoice-number-modal.js`, `print-invoice.js`. **Nuovi CSS**: `product-card.css`, `price-dot.css`, `print.css`, `invoice.css` |

---

## 🚧 PROSSIMI PASSI (05/10/2026)

### 🔥 Da fare SUBITO (in ordine)

| # | Blocco | Cosa | Complessità |
|---|---|---|---|
| 1 | **2B.8** | Barra Ricerca Generica (nel logo) | 🟡 Media |
| 2 | **4** | Occhio 👁️ + Notifiche | 🟡 Media |
| 3 | **5** | Ordini Fornitori + CSV | 🟠 Alta |
| 4 | **8** | Cestino + Reset mezzanotte | 🟡 Media |
| 5 | **10** | Scaglioni (auto-apply + UI) | 🟡 Media |
| 6 | **11** | Tema Light | 🟡 Media |
| 7 | **12** | Regole + Deploy | 🟠 Alta |
| 8 | **3.7 p2** | Anti-truffa | 🟠 Rinviato |

### ✅ Fixati nel 01-05/10/2026

- ✅ Banco ↔ Ufficio per tutti gli utenti
- ✅ Rimozione CASSA dal login
- ✅ Cache articoli aggiornata dopo modifica prezzo in scheda prodotto
- ✅ Scheda prodotto carica sempre da Firebase
- ✅ Modifica prezzo scheda prodotto → aggiorna riga carrello solo se in `modifica`/`sbloccato`
- ✅ Sync prezzi automatico su "Fatto" (ufficio + cassa)
- ✅ Pallini visibili automaticamente al primo caricamento cache
- ✅ Rimosso import duplicato `getArticleFromCache`
- ✅ Calcolatore taglio/peso funzionante
- ✅ Prezzo proporzionale KG (qty = kg, unitPrice = basePrice)
- ✅ Annotazione `10 mt · € 0,309/mt` + `base € 11,00/kg · 0,281 kg`
- ✅ Cassa refresh live dopo modifica in edit mode
- ✅ Fix "pagina bianca" dopo stampa e BOL (iframe `srcdoc` + dialoghi nativi)
- ✅ Rimozione `location.reload()` da tutti i file di stampa

### ⚠️ Bug noti (residui)

- **Occhio 👁️** non scrive `seenBy` (solo visivo) → Blocco 4
- **Cestino**: `alert()` placeholder → Blocco 8
- **`favicon.ico 404`** → **innocuo**
- **`WebSocket ... BFCache`** → **innocuo**

---

## 📌 NOTE FUTURE (Promemoria)

### 🧾 1. Template DDT definitivo

**Stato attuale**: template **provvisorio** riprodotto dal PDF generico.

**Cosa serve**: l'utente fornirà un **template HTML compilabile** identico all'originale cartaceo.

**Quando arriva**, sostituire:
- Funzione `renderDDT()` in `js/ui/components/print-invoice.js`
- CSS in `assets/css/invoice.css` (sezione `@media print`)

### 📦 2. Ordinazione fornitori (Blocco 5)
Da implementare: dropdown fornitori colorati + CSV import.

### 👁️ 3. Notifiche (Blocco 4)
Web Audio API + Notification API per sincronizzazione tra postazioni.

### 🎨 4. Cassa — pulsante Refresh
Non necessario per ora, la cassa si aggiorna in real-time via Firebase.

### 📄 5. Fattura fiscale
Non si fa in FerApp → la fa il commercialista.

---

**Ultima sessione**: 05/10/2026  
**Versione attuale**: **v2.6**

**Fine documento.**