📘 FerApp — Documento di Progetto Ufficiale

**Versione**: 2.9  
**Data creazione**: 22 settembre 2026  
**Ultima modifica**: 12 ottobre 2026  
**Stato progetto**: In sviluppo attivo — Blocchi 1-8 completati + DDT definitivo + Modale Fornitori USAG. Prossimo: Occhio Cassa / Pulizia debito tecnico / Blocco 2B.8 (Ricerca Generica) / Blocco 5 (Ordini Fornitori)

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
- **2 tasti grandi in alto** per modalità ricerca: `🔢 CODICE` (giallo) e `🔤 NOME` (nero)
  - **CODICE** → tastierino numerico inline (fisso in basso) + risultati live sopra → match esatto aggiunge diretto
  - **NOME** → barra di ricerca + tastiera del telefono automatica + risultati live
  - **Tap fuori dal tastierino** → chiude la ricerca
- Modifica quantità, unità, sconti, scaglioni
- Usa calcolatore taglio/peso per KG/MT/MQ (**funzionante dal 04/10/2026**)
- Crea **bozze** per far iniziare l'ufficio a mettere i prezzi
- **Conferma** ordine quando finito (anche senza prezzi!)
- **Genera codice ordine** sia su bozza (`UFF.`) sia su conferma diretta (`CONFERMA`)
- **Tendina ordini** nell'header:
  - Vista normale: ordini di oggi + vecchi aperti (`modifica`/`bozza`)
  - Vista completa (pulsante toggle): **tutti** gli ordini raggruppati per giorno
  - Anteprima articoli in ogni riga + occhio 👁️ se visto
- **Sblocca e modifica** un ordine fatto direttamente dal banco (carica il carrello)
- **Scheda prodotto** cliccando sul nome articolo
- **Pallini stato prezzo** accanto ai prezzi
- **📄 BOL.** nella bottom bar → crea fattura con numero progressivo atomico
- **📄 F** in header → modifica prossimo numero bolla
- **🖨 Stampa DDT** (nuovo template definitivo dal 12/10/2026)
- **Tasto + NUOVO** → mette in sospeso il carrello attuale e ne apre uno nuovo
- **Tab 🗑** → cestino con contatore
- **Tab 💰** → apre modale fornitori (USAG)
- **Barra in basso** ridisegnata: `BOL · RIEP · UFF · CONFERMA · 🗑` con icona sopra + label sotto
- **Pulizia automatica** carrelli vuoti in `modifica` all'avvio
- **Niente pulsante CASSA nel login**: l'accesso alla cassa è nascosto nel logo

### 🏢 Ufficio (Gestione Ordini)
**A cosa serve**: mettere i prezzi agli ordini in arrivo, gestire tutto il ciclo di vita degli ordini.
- Vede tutti gli ordini/bozze in arrivo
- **Modifica prezzi, sconti, verifica prezzi** (prezzo editabile **inline**, no tastierino)
- **Modifica righe** cliccando sui prezzi/qty/sconto
- **Scheda prodotto** cliccando sul nome articolo
- **Pallini stato prezzo**
- **Occhio 👁️** se qualcuno ha visto l'ordine (tooltip *"Visto da PAPA · 22:45"*)
  - Nel **banner dell'ordine** appare **solo se qualcuno l'ha visto** (12/10/2026)
- **Notifiche modali** al centro schermo quando arrivano nuovi ordini da altri utenti
- **Barra giorni** sotto i tab: filtra per giorno (OGGI/IERI/dd/mm)
  - **Solo papa/mati/massi**: click sul giorno attivo → mostra `N ordini € X · N fatture € Y` (fatture separate)
  - **Paul**: i giorni sono cliccabili solo per filtrare, nessun totale
- **Codice articolo** cliccabile per copiarlo negli appunti
- **Nota riga articolo** visibile in arancione con contorno nero sottile
- **Nota ordine** con editor placeholder/textarea/div giallo (stessa logica del banco)
  - **Allineata a destra** (12/10/2026)
  - **Anti-falso-blur**: `_pendingRefresh` blocca refresh durante edit mode
- Blocca/sblocca ordini
- Chiude ordine ("Fatto") → va in tab FATTI + **sync prezzi automatico**
- Sblocca ordini fatti → tab NUOVI + scroll automatico
- **🖨 Stampa** ordini (multi-selezione) — **esclude le fatture**
- **🖨 Stampa DDT** (se l'ordine è fattura) — **usa nuovo template definitivo**
- **📄 BOL.** in ogni ordine → apre client picker + conferma → crea fattura
- **📄 F** in header → modifica prossimo numero bolla
- **Pulsante 💰 Fornitori** in header → apre modale listini fornitori (USAG)
- **Pulsante 🗑 nei tab** (dopo 🟣 PRONTO) → cestino con contatore
- **Tab bar compatta**: 5 tab su una riga senza scroll

**Accesso**: TUTTI (papa, mati, massi, paul, cassa). Tutti possono modificare tutto.

### 💰 Modale Fornitori (nuova 12/10/2026)
- Si apre da **banco** (tab 💰) e **ufficio** (header 💰)
- **Tasti grandi colorati** per ogni fornitore (attualmente solo **USAG** rosso)
- Click su un fornitore → si apre la sua app in un iframe dentro la modale
- **Tasto ← Indietro** per tornare alla lista fornitori
- **USAG**: barra ricerca codice + **tasto 📋 Incolla** (legge appunti) → mostra descrizione, codice fornitore, prezzo ivato
- **Per aggiungere un fornitore**: basta aggiungere una riga all'array `FORNITORI` in `fornitori-modal.js` + creare il file HTML in `fornitori/`

### 💰 Cassa (Scontrino)
**A cosa serve**: leggere l'ordine già fatto e **battere lo scontrino a mano** sul registratore di cassa fiscale fisico.
- **Lista COMPATTA**: card piccole (cliente, codice ordine, data, n° articoli, totale)
- **Dettaglio su click**: header con cliente + codice + data + n° articoli
- Righe con **BADGE QTY giallo** ben visibile + prezzo + **pallino stato prezzo** + totale riga
- **Codice articolo più grande e su una riga** (aggiornato 07/10)
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
- **Emoji 👁️** quando qualcuno ha visto l'ordine (tooltip "Visto da X · HH:MM")
- **Icona ✏️** accanto al nome cliente quando `wasModified: true`
- **Codice ordine** (`Ordine #N - L`) visibile in banco/ufficio/cassa
- **Codice fattura** (`Fattura N · NOME CLIENTE`) visibile in banco/ufficio
- Pallini stato prezzo ovunque
- **Scheda prodotto** cliccabile da banco e ufficio
- **Cestino condiviso** tra banco e ufficio
- **Notifiche** modali colorate quando arrivano ordini da altri utenti

---

## 3. Utenti e Postazioni

| ID | Nome | Ruolo | Postazione default | Colore |
|---|---|---|---|---|
| papa | PAPA | Proprietario | Banco | Blu `#3b82f6` |
| mati | MATI | Proprietario | Banco | Verde `#22c55e` |
| massi | MASSI | Commesso | Banco | Giallo `#eab308` |
| poli | PAUL | Commesso | Banco | Rosso `#ef4444` |
| cassa | CASSA | Cassa | Ufficio | Verde `#22c55e` |

### 🔑 Regole di accesso
- **Autenticazione**: selezione utente (no password)
- **Sessione**: `localStorage` (chiave `ferapp_session`)
- **Postazione default**: dove l'utente viene reindirizzato al login
- **⚠️ IMPORTANTE**: TUTTI gli utenti possono accedere a TUTTE le interfacce (Banco, Ufficio, Cassa) e **modificare qualsiasi cosa**
- **Cambio interfaccia**: possibile da dentro l'app tramite pulsante nell'header, senza ri-loggarsi
- **Login CASSA**: il pulsante verde "CASSA" è stato **rimosso** dal login (l'utente `cassa` resta nel DB ma non è più mostrato)
- **Rinomina poli → paul (09/10/2026)**: `id` Firebase rimane `poli`, `name` visualizzato è `paul`. Ordini già creati con `createdBy: "poli"` continuano a funzionare

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

### 🏭 → 🏢 Flusso tipico — diretto (senza bozza)
1. Banco crea carrello con prezzi noti
2. **Conferma** → il codice ordine `#N - L` viene generato **anche se non è passato per UFF.**
3. Banner giallo "Nuovo" + notifica all'ufficio
4. Ufficio verifica e preme **Fatto**

### 🏢 → 💰 Flusso Cassa
1. Ufficio ha un ordine **in_arrivo** o **nuovo** (prezzi confermati)
2. Cliente arriva in cassa
3. **Cassa** vede la lista compatta → click su un ordine → dettaglio
4. Cassa **batte lo scontrino a mano** sul registratore fiscale
5. Cassa preme **FATTO** → l'ordine passa in tab FATTI + **sync prezzi**
6. L'ordine **sparisce dalla vista Cassa**
7. L'ordine **resta visibile in Ufficio** nella tab FATTI

### 💰→📄 Flusso Fatturazione (Blocco 7)
1. Ordine pronto (in qualsiasi stato tranne già fatturato)
2. **Banco**: premi **📄 BOL.** → si apre popup con cliente + numero → confermi → fattura creata → il tasto diventa **🖨 Stampa DDT**
3. **Ufficio**: premi **📄 BOL.** → si apre client picker → scegli cliente → confermi → fattura creata → il tasto diventa **🖨 Stampa DDT**
4. **Numerazione atomica** (`runTransaction`): zero duplicati anche con 2 postazioni in contemporanea
5. **🖨 Stampa DDT** → apre anteprima di stampa con **nuovo template DDT definitivo** (12/10/2026):
   - File template HTML compilabile: `templates/ddt-template.html`
   - Modulo `print-ddt.js` riempie tutti i campi
   - **Auto-fit font** (margine sicurezza 8%) per testi lunghi
   - Stampa in **iframe isolato** (mai pagina bianca)
6. Il numero fattura rimane fisso anche se modifichi l'ordine dopo

### 🔓 Flusso "Sblocca e modifica"
1. Un ordine `fatto` non è più modificabile
2. Per modificarlo, si preme **Sblocca e modifica** (da Ufficio, Banco o Cassa)
3. Lo stato passa a `sbloccato`, `isLocked: false`
4. Se modificato (qty/prezzo/sconto) → `wasModified: true` → icona ✏️ appare accanto al nome cliente (permanente)
5. Per richiudere, si preme di nuovo **Fatto** → `isLocked: true`, stato `fatto`
6. **Da Ufficio**: il tab passa automaticamente a NUOVI + scroll sull'ordine
7. **Da Cassa**: la modifica è locale (edit mode), NON cambia lo stato Firebase

### 💰 Consultazione Listini Fornitori (nuovo 12/10/2026)
1. Da **banco** premi tab **💰** oppure da **ufficio** premi **💰 Fornitori** nell'header
2. Si apre **modale a schermo intero** con tasti grandi per ogni fornitore
3. Click su **USAG** → si apre la sua app dentro la modale (iframe)
4. Cerchi per codice gestionale → vedi descrizione, codice fornitore, prezzo di vendita ivato
5. **Tasto 📋 Incolla** per copiare velocemente il codice dagli appunti (attivo su PC e mobile, con popup "Consenti" su Safari/iOS)
6. **← Indietro** per tornare alla lista fornitori, **✕** per chiudere tutto
7. ⚠️ **Non è integrata con il carrello** — il prezzo va ricopiato manualmente

### 🌙 Reset mezzanotte
- **Contatore ordini** (`counters/orderNumber`) → si resetta al primo ordine del nuovo giorno
- **Contatore fattura** (`counters/invoiceNumber`) → **NON si resetta** (progressivo perpetuo)
- **Tendina banco** → si "pulisce" da sola con il filtro `isVisibleInDropdown` (ordini vecchi visibili solo se `modifica`/`bozza`)
- **⚠️ Reset "carrelli modifica → nuovo"**: mai implementato. Con il nuovo filtro giorni, non è più prioritario

### 🗑 Cestino (aggiornato 06/10/2026)
- **Cestino condiviso** tra banco e ufficio (`trash/carts/`)
- Ordini eliminati da **Carrello** o **Ordini** → cestino
- Azioni: **Ripristina** / **Elimina definitivamente**
- **Banco, stato `modifica`** → cestina
- **Banco, altri stati** → NON cestina, solo nuovo carrello
- **Ufficio** → cestina sempre
- **Svuotamento automatico al boot**:
  - Cestino banco → 1 volta al giorno
  - Cestino ufficio → la domenica

### 📅 Barra giorni ufficio (09/10/2026)
- Sotto i tab `NUOVI / FATTI / TUTTI / PRONTO`
- **Click su un giorno** → filtra gli ordini di quel giorno
- **Click di nuovo sul giorno attivo** → mostra accanto `N ordini € X · N fatture € Y`
- **Ordini e fatture separati** (fattura = ordini con `invoiceNumber`)
- **Permessi**: solo `papa`/`mati`/`massi` vedono i totali. `paul` vede solo il filtro

### 🗂 Vista completa tendina banco (09/10/2026)
- Nella modale tendina, il titolo è un pulsante cliccabile:
  - `📋 ORDINI DI OGGI` → vista normale (oggi + vecchi aperti)
  - Click → `📋 TUTTI GLI ORDINI` (giallo con bordo) → mostra tutti gli ordini raggruppati per giorno
- Vista completa: **tutti gli utenti, tutti gli stati**, raggruppati per OGGI/IERI/dd-mm-yyyy

---
🟩 PARTE 2/3 — Sezioni 5 → 12
Incolla questo SUBITO SOTTO la Parte 1 (nello stesso file):

text
## 5. Architettura Tecnica

### Pattern
UI (View + Component)
↓
Controller
↓
Domain Service
↓
Data Repository
↓
Firebase Realtime Database

text

### Regole d'oro
1. UI non chiama mai Firebase direttamente
2. Ogni repository è l'unico punto di contatto con un nodo
3. **Scritture sempre atomiche** su path specifici
4. Mai riscrivere l'intero carrello
5. Transazioni per read-modify-write (`runTransaction` per numerazione fatture)

---

## 6. Modello Dati Firebase
ferr-app-5e277-default-rtdb/
│
├── users/{userId}/
│ └── name, role, color, postazione
│
├── clients/{clientId}/
│ ├── name ← VecchioCodice (nome cliente)
│ ├── address ← Indirizzo
│ ├── city ← c5 (città)
│ ├── province ← Provincia
│ ├── legacyId ← IdAnagrafica
│ ├── discountPct
│ ├── createdAt
│ └── updatedAt
│
├── meta/clients/
│ ├── lastImportAt
│ └── lastImportCount
│
├── articles/{articleKey}/
│ ├── code, codeNorm, type, group, hasSpecial
│ ├── description, descriptionLower, unit
│ ├── stock, inventoried
│ ├── basePrice, totU, mtRot, kgPerUm
│ ├── priceVerified: bool
│ ├── priceLastChangedAt: timestamp
│ ├── supplier, supplierCode, category, marca, position, specs
│ ├── priceHistory/{0..4}: { price, date, source }
│ ├── scaglioni: [ { qty, pct }, ... ]
│ ├── correlati: [ articleKey, ... ]
│ ├── searchTokens[]
│ └── updatedAt
│
├── meta/articles/
│ ├── lastImportAt
│ └── lastImportCount
│
├── activeCarts/{cartId}/
│ ├── meta/
│ │ ├── clientId, clientName
│ │ ├── status
│ │ ├── createdBy, createdByName, createdAt, updatedAt
│ │ ├── lineCount
│ │ ├── totals { subtotal, discount, grandTotal }
│ │ ├── note
│ │ ├── seenBy { userId: timestamp } ← (Blocco 4) occhio 👁️
│ │ ├── isLocked
│ │ ├── wasModified
│ │ ├── orderNumber (es. 27)
│ │ ├── orderCode (es. "A")
│ │ ├── invoiceNumber ← (Blocco 7) — es. 2000
│ │ └── invoiceDate ← (Blocco 7) — timestamp
│ └── lines/{lineId}/
│ ├── articleId, code, description, unit
│ ├── qty, basePrice, unitPrice
│ ├── discountPct, discountAmount, lineTotal
│ ├── totU, mtRot, kgPerUm
│ ├── kgTotal, mtTotal
│ ├── h, l ← (LAVORO C) campi H × L per MQ
│ ├── forbiciState: neutro|scampolo|rotolo|scaglionato
│ ├── scampoloPct, scaglioneApplied
│ ├── isRemnant, isReturn, originalOrderId
│ ├── isOrdered, supplier, supplierColor
│ ├── note
│ └── addedBy, addedByName, addedAt, updatedAt
│
├── orderHistory/{orderId}/
│
├── trash/
│ └── carts/{cartId}/ ← (Blocco 8) cestino condiviso
│ ├── meta, lines
│ ├── trashedAt ← timestamp
│ ├── trashedBy ← { id, name }
│ └── source ← "banco" | "ufficio"
│
├── supplierOrders/{supplierId}/{itemId}/
│
└── counters/
├── orderNumber ← progressivo giornaliero (reset a mezzanotte)
├── lastResetDate ← "YYYY-MM-DD"
├── invoiceNumber ← (Blocco 7) — progressivo perpetuo, inizia da 2000
├── lastMidnightReset
├── lastTrashBancoReset ← (Blocco 8) "YYYY-MM-DD"
└── lastTrashUfficioReset ← (Blocco 8) "YYYY-MM-DD"

text

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
| **Cestinamento** | **`trash/carts/{id}` + remove `activeCarts/{id}`** | **`set()` + `remove()` via `trashCart`** |
| **Ripristino** | **`activeCarts/{id}` + remove `trash/carts/{id}`** | **`set()` + `remove()` via `restoreCart`** |
| **Occhio 👁️** | **`meta/seenBy/{userId}`** | **`update()` via `writeSeenBy`** |
| **Reset cestino banco** | **`counters/lastTrashBancoReset`** | **`update()` via `runScheduledCleanup`** |
| **Reset cestino ufficio** | **`counters/lastTrashUfficioReset`** | **`update()` via `runScheduledCleanup`** |
| **Pulizia carrelli vuoti** | **`remove()` su `activeCarts/{id}`** | **`remove()` via `cleanupEmptyModificaCarts`** |
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

### 👁️ Eye Emoji (Blocco 4)
- `writeSeenBy(cartId, userId)` in `cart-repository.js`
- Scritto **solo dall'ufficio** su: edit reale prezzo/qty/sconto, oppure click su "Vai agli Ordini" della notifica
- Mostrato a **tutti** (in banco vicino a CAMBIA, in ufficio nel banner, in tendina accanto al nome)
- Tooltip: *"Visto da PAPA · 22:45"*
- Sorgente dati: `meta/seenBy/{userId}` = timestamp
- **Nell'anteprima banco (12/10/2026)**: appare **solo se qualcuno l'ha visto** (condizionale)

### 🔔 Notifiche (Blocco 4)
- **File**: `js/core/notify.js`
- **Modale centrale** con sfondo scuro
- **Colori per stato**: giallo `nuovo` · blu `bozza` · rosso `in_arrivo`
- **Pulsanti**: `📋 Vai agli Ordini` (colorato) + `OK` (grigio)
- **Beep** doppio tono (Web Audio API)
- **Notifica nativa PC** (Notification API, permesso al primo click)
- **Niente raffica al primo load** (`_firstLoadDone` flag)
- Click "Vai agli Ordini" → scroll + flash giallo + scrive `seenBy`

---

## 8. Funzionalità Dettagliate

### 8.1 Tab Carrello (Magazzino)

#### Ricerca articoli (aggiornata 12/10/2026)
- Cache locale (~19.348 articoli)
- **2 tasti modalità** in alto: `🔢 CODICE` (giallo) e `🔤 NOME` (nero)
- **Modalità CODICE**:
  - Tastierino numerico inline, **fisso in basso** (`position: fixed; bottom: 0`)
  - Risultati live **sopra** al tastierino
  - Match esatto su 1 codice → aggiunge diretto
  - Tap fuori → chiude tutta la ricerca
- **Modalità NOME**:
  - Barra di ricerca + **tastiera iPhone/Android automatica**
  - Focus sincrono (necessario per iOS)
  - Risultati live con debounce 150ms
- **Tap fuori dal tastierino** (solo in modalità CODICE) → chiude ricerca
- **In modalità nome**: la barra resta aperta, dopo aggiunta articolo si svuota e il focus torna per ricerca multipla veloce
- Max 20 risultati

#### Riga carrello (aggiornata 08-09/10/2026)
- **Colori righe stabili** — 10 sfondi trasparenti (`clr-0`..`clr-9`) assegnati con **hash dell'ID riga** (non cambiano quando aggiungi altri articoli)
- Ordine in banco: articolo nuovo va **in cima** (`addedAt` desc); modifica qty NON lo fa risalire
- **Codice articolo cliccabile** (`cart-line-code-toggle`) → mostra/nasconde tasti azione
- **Tasti azione nascosti di default** (`[hidden]`)
- **Stato tasti aperto persistente** (`_openActionsLines` Set) → non si chiudono al re-render
- **Nome articolo cliccabile** → apre **Scheda Prodotto**
- **Pallino stato prezzo** accanto al prezzo
- **Per articoli PZ**: 1 riquadro `PREZZO`
- **Per articoli KG/MT**: qty + select unità + prezzo inline + totale · `PREZZO BASE [€]`
- **Per articoli MQ**: come KG/MT + riga `H [__] × L [__]` → calcola automaticamente `qty = H × L`
- **Con sconto attivo**: prezzo e totale a **3 righe** (pieno barrato / nuovo giallo / sconto rosso)
- Sconto % manuale (pulsante `%`)
- **Ciclo forbici**: neutro → scampolo → rotolo → scaglionato → neutro
  - **SCAMPOLO**: applica automaticamente sconto **30%** (`scampoloPct`); il tasto `%` diventa un pulsante con il valore 30 + simbolo `%` + importo sconto rosso
  - **ROTOLO**: rimuove lo sconto e mette solo flag visivo
  - **SCAGLIONATO**: solo stato visivo (auto-apply in Blocco 10)
  - **NEUTRO**: rimuove tutti gli sconti
- Note riga (modale nativa con `prompt()`)
- Ordina da fornitore (dropdown — Blocco 5)
- Elimina riga

#### Nota ordine in banco (aggiornata 12/10/2026)
- **Nota vuota** → textarea con placeholder
- **INVIO** → salva e diventa **div giallo** (non corsivo)
- **Shift+Invio** → va a capo senza salvare
- **Click sul div giallo** → torna textarea, cursore alla fine
- **🆕 Anti-falso-blur (12/10)**: cattura `noteState` (value + selection) **sempre se `_orderNoteEditMode`**, anche se il focus è perso per 1 frame (es. re-render Firebase). Ripristina cursore **solo se `wasFocused`** era `true`.

#### Calcolatore taglio/peso (FIX 04/10/2026)
- Formula: `kg = metri * (totU / mtRot)`, `prezzo = kg * basePrice`
- Apre modale con input metri, output prezzo+peso live
- "Applica" salva:
  - `qty = result.kg` (peso)
  - `unitPrice = line.basePrice` (invariato, €/kg)
  - `mtTotal = result.meters` (annotazione)
  - `kgTotal = result.kg` (annotazione)
- Legge `totU`/`mtRot` dalla **cache articolo**

#### Scaglioni
- Salvati nella **scheda prodotto**: `[{ qty, pct }, ...]`
- **Auto-apply** quando la qty raggiunge lo scaglione (Blocco 10, da fare)
- Visibile come **badge sconto** sulla riga

#### Cliente
- **Cliente picker** con ~3.651 clienti reali importati
- Ricerca per nome/città con debounce
- Creazione al volo
- "Cliente 1" generico
- Salva su `meta.clientId` + `meta.clientName`

#### Riepilogo ordine v2 (08-09/10/2026)
- Modale stile vecchia app
- **Header**: `Cliente 1` + counter `N/M` giallo + X
- **Box TOTALE ORDINE** grande in alto (giallo)
- **Righe**: codice giallo + nome + `€ 10,00 x 1 pz = € 10,00` a destra
- **Verde scuro** quando spuntata
- **Footer**: `↺ Reset spunte` (bordo giallo) + `Chiudi` (giallo pieno)
- **Chiudi** → conferma solo se hai spuntato **tutto**, altrimenti chiude e basta
- **Memoria spunte** (`savedCheckedByLineId`): chiudendo e riaprendo, le spunte restano
- Reset spunte → pulisce anche la memoria
- **File**: `js/ui/components/summary-modal.js`

#### Confronta Articoli (Blocco 2B.4)
- Modale isolata, 2 slot
- Pesca dal carrello o catalogo
- Non tocca il carrello

#### Azioni finali (barra in basso)
- **BOL.** → crea fattura / Stampa DDT (se già fatturato)
- **RIEP.** → riepilogo ordine
- **UFF.** → bozza all'ufficio (genera codice ordine se prima volta)
- **CONFERMA** → chiude carrello (genera codice ordine **anche senza bozza**)
- **🗑** → cestina carrello corrente (solo se `modifica`)
- **Layout**: bottoni con icona sopra + label sotto, tutto in **una riga fissa senza scroll**
- **Colori**: BOL viola · RIEP giallo · UFF blu · CONFERMA verde · cestino rosso
- **File**: `banco.html`, `banco.css` (`.bb-btn`, `.bb-bol`, `.bb-riep`, `.bb-uff`, `.bb-conf`, `.bb-trash`)

#### Tasto "+ NUOVO" in alto a sinistra (07/10/2026)
- Click → conferma → il carrello attuale **resta in sospeso** con stato `modifica`
- Viene creato un nuovo carrello vuoto
- Il vecchio è visibile nella tendina 📋 ORDINI
- Se carrello vuoto → toast informativo

#### Cestino banco (Blocco 8)
- Tab **🗑** in alto con contatore
- Modale con lista ordini cestinati
- **♻️ Ripristina** + **❌ Elimina**

#### Tendina Ordini (aggiornata 09/10/2026)
- Pulsante **📋 ORDINI** nell'header con contatore
- **Vista normale** (default): ordini di oggi + ordini vecchi con `modifica`/`bozza`
- **Vista completa**: click sul pulsante toggle nella modale → `📋 TUTTI GLI ORDINI` (giallo)
  - Mostra **tutti** gli ordini (tutti gli utenti, tutti gli stati)
  - Raggruppati per giorno: OGGI · IERI · dd-mm-yyyy
  - Header giorno in giallo con sfondo
- **Ogni riga** mostra:
  - Icona stato (✏️ 🔵 ✅ 🟣 🔓)
  - Nome cliente / `Ordine #N - L` / `Fattura N · NOME`
  - **Anteprima articoli** (max 2 descrizioni, poi `, +N`)
  - **👁️** accanto al nome se qualcuno ha visto l'ordine
  - Ora · N art.
  - Totale
- **Filtro visibilità** (`isVisibleInDropdown`):
  - Carrelli vuoti → **NON mostrati**
  - Ordini di oggi → sempre visibili
  - Ordini vecchi → solo se `modifica` o `bozza`
- Chiude: click sfondo scuro o Esc

#### Vista dettaglio ordine in banco (Blocco 3.5-bis — aggiornata 12/10/2026)
- Modale con banner colorato, righe readonly, totale, azioni
- Pulsanti: **🔓 Sblocca e modifica** · **📋 Ordini** · **🗑** · **🖨 Stampa DDT**
- **🖨 Stampa DDT** (aggiornato 12/10/2026):
  - Se l'ordine **è fatturato** → usa **nuovo template DDT definitivo** (`printDDT`)
  - Se l'ordine **non è fatturato** → vecchia stampa lista ordini (`printOrders`)
- **👁️ Occhio condizionale** (12/10/2026): nel banner appare **solo se qualcuno l'ha visto** (con tooltip)
- 🗑 → cestina solo se `modifica`

#### Tasto F (header banco)
- Piccolo pulsante **📄 F** accanto a "🏢 Ufficio"
- Click → prompt nativo → salva `counters/invoiceNumber`

#### Icona stato cliente
- ✏️ se `status === "modifica"` **oppure** `wasModified === true`
- 🔵 se `status === "bozza"`

#### Tab bar (aggiornata 12/10/2026)
- **Niente scroll orizzontale** → `overflow: hidden`, `gap: 4px`
- **4 tab**: `+ NUOVO | 💰 | 📋 ORDINI N | 🗑 N`
- **Rimosso** `👥 CLIENTI`
- **Aggiunto** `💰` (Fornitori) al secondo posto
- Font 0.68rem, padding 6px 4px, badge count 0.6rem

---

### 8.2 Tab Ordini (Ufficio)

#### Filtri
- Tab: **🟡 NUOVI** / **🟢 FATTI** / **📋 TUTTI** / **🟣 PRONTO** / **🗑 N** (12/10/2026)
- **Barra giorni** sotto i tab (09/10/2026):
  - Mostra solo i giorni con ordini nel tab attivo
  - Etichette: `OGGI`, `IERI`, `dd/mm`
  - Click su giorno → filtra
  - Click di nuovo sul giorno attivo → mostra accanto `N ordini € X · N fatture € Y`
  - Totali visibili solo a `papa`/`mati`/`massi`
- Ricerca globale

#### Vista ordine
- Righe con prezzi modificabili (se non bloccato)
- **Codice articolo giallo** monospace, cliccabile per **copiare negli appunti**
- **Nota riga articolo** sotto il codice, in **arancione** con contorno nero attorno alle lettere
- Pulsanti principali: **✅ Fatto** · **📋 Pronto** · **🗑 Elimina**
- Pulsanti secondari: **🖨 Stampa** (esclude le fatture) · **📋 Pronto** · **🗑 Elimina**
- Pulsante **📄 BOL.** (sparisce se già fatturato)
- **Nota ordine** con stessa logica del banco: placeholder `📝 Nota` compatto quando vuota → textarea → div giallo (INVIO o click fuori salva)
  - **Allineata a destra** (12/10/2026) — sia display che textarea
  - **Anti-falso-blur** (12/10/2026): `_pendingRefresh` blocca refresh durante edit mode; refresh al close
- **🖨 Stampa DDT** (12/10/2026) → usa **nuovo template definitivo**

#### Azioni sblocco (Blocco 3.5-bis)
- Click **🔓 Sblocca e modifica** → stato `sbloccato` + `isLocked: false`
- **Cambio automatico tab a NUOVI** + scroll all'ordine

#### Modifica righe
- Click su **prezzo** → **input inline** (no tastierino) → Invio/blur salva, Esc annulla
- Click su **qty** → tastierino → salva
- Click su **badge sconto** → tastierino % → salva
- Click sul **nome articolo** → **Scheda Prodotto**
- Dopo ogni modifica: `markCartAsModified(orderId)` (scrive solo se `sbloccato`)

#### Tasto BOL in ufficio (Blocco 7)
- Click → client picker → conferma nativa → crea fattura
- Il tasto diventa **🖨 Stampa DDT**

#### Tasto F in ufficio (Blocco 7)
- Prompt nativo → salva `counters/invoiceNumber`

#### Sync prezzi al "Fatto" (Blocco 2B.7)
- `syncOrderPricesToArticles(orderId)` prima di aggiornare stato a `fatto`
- Aggiorna `basePrice`, `priceLastChangedAt`, `priceVerified` se diverso

#### Notifiche in ufficio (Blocco 4)
- **Modale centrale** con sfondo scuro
- **Colori**: giallo/blu/rosso
- **Beep** + **notifica nativa PC**
- Click **Vai agli Ordini** → scroll + flash + scrive `seenBy`

#### Cestino ufficio (Blocco 8 — aggiornato 12/10/2026)
- **Pulsante 🗑 nei tab** (dopo 🟣 PRONTO), **rimosso dall'header**
- **Stretto** (`flex: 0 0 42px`, font count 0.55rem)
- Apre modale con lista ordini cestinati

#### Tasto 💰 Fornitori (nuovo 12/10/2026)
- Nell'**header** (`💰 Fornitori`)
- Click → apre modale fornitori (`openFornitoriModal()`)

---

### 8.3 Scheda Prodotto (Modale) — COMPLETATA (04/10/2026)

#### Come si apre (2 modi)
1. Click sul **nome articolo** nel carrello (banco)
2. Click sul **nome articolo** nell'ordine (ufficio)

#### Contenuto
- DESCRIZIONE, COD. FORN., MIO COD. (readonly)
- PREZZO + pallino verifica
- PRZ. VECCHIO (5 prezzi FIFO: data + sorgente)
- ACQ., SPECIFICHE TECNICHE
- QUANTITÀ, UNITÀ (PZ/KG/MT/MQ), SCORTA MIN.
- TOT.U, MT.ROT, PESO PER UNITÀ (solo KG/MT/MQ)
- CORRELATI, SCAGLIONI (tendine)
- Pulsanti: **❌ Annulla** · **💾 Salva**

#### Regole dinamiche
- TOT.U / MT.ROT / PESO visibili **solo** per KG/MT/MQ
- Se TOT.U o MT.ROT cambiano → ricalcola `kgPerUm = totU / mtRot`

#### Salvataggio
- Se cambia prezzo → vecchio in storico (max 5) + `priceLastChangedAt = now` + `priceVerified = true`
- Aggiorna cache locale con `updateArticleInCache`
- Se aperta su ordine in `modifica`/`sbloccato` → aggiorna riga carrello
- Se aperta su ordine inviato → **NON** aggiorna la riga

#### File
- `assets/css/product-card.css`
- `js/ui/components/product-card.js`

---

### 8.4 Barra Ricerca Generica (nel Logo) — FUTURA (Blocco 2B.8)

> ⚠️ **NOTA**: Attualmente il click sul logo apre la **Cassa**. La ricerca generica è prevista nel Blocco 2B.8.

#### 3 Tab
1. **ARTICOLI**: cerca → click → scheda prodotto
2. **CLIENTI**: cerca → click → ordine cliente
3. **ORDINI**: cerca → click → ordine

---

### 8.5 Import Dati (Pagina con Tab)

#### Tab ARTICOLI
- File `.txt` pipe-delimited
- Formato: `|indice|tipo|codice|gruppo|spec|descrizione|UM|giacenza|inv|`
- Blocchi da 500, progress bar

#### Tab CLIENTI (Blocco 5A)
- File `.txt` `chiave='valore'#chiave='valore'`
- Parser: `parseClientsFile(text)` in `file-parser.js`
- Importati: **~3.651 clienti**

---

### 8.6 Pallini Stato Prezzo (Blocco 2B.7)

| Pallino | Colore | Significato |
|---|---|---|
| ⚪ | Grigio | Prezzo mai verificato |
| 🟢 | Verde | Verificato 0-1 mese |
| 🟡 | Giallo | 1-3 mesi |
| 🟠 | Arancione | 3-6 mesi |
| 🔴 | Rosso | 6-12 mesi |
| 🟣 | Viola | 12+ mesi |

#### Dove
- Carrello banco
- Righe ordine ufficio
- Righe dettaglio cassa
- Scheda prodotto

---

### 8.7 Template DDT ✅ DEFINITIVO (dal 12/10/2026)

> ✅ **AGGIORNATO 12/10/2026**: Il template DDT è ora **definitivo**. È il file HTML compilabile fornito dall'utente, identico all'originale cartaceo.

#### File
- **Template HTML**: `templates/ddt-template.html` (immagine scansita del DDT cartaceo + input posizionati in %)
- **Modulo logica**: `js/ui/components/print-ddt.js`
- **Vecchio template** (`print-invoice.js` + `invoice.css`): **rimasto come fallback** ma **non usato dal flusso principale**

#### API pubblica
```js
import { printDDT } from '../components/print-ddt.js';

printDDT({
  cart: { meta, lines },       // obbligatorio
  invoiceNumber: 1234,          // opzionale (default: meta.invoiceNumber)
  client: { name, address, city, province }  // opzionale (se manca, scarica da Firebase via meta.clientId)
});
Come riempie il template
Header: doc_numero (= numero DDT), doc_data (data oggi), ditta (nome cliente), residenza (= "CITTÀ (PV) VIA CIVICO"), data_inizio (data), ora_inizio (ora), cb_vendita (spuntato)

Luogo di destinazione: VUOTO (comune/via/n.)

Footer: annotazioni = meta.note

Righe articoli: 23 righe rN_*, ordinate per addedAt DESC (come banco)

rN_codici = codice

rN_descrizione = descrizione

rN_extra = prezzo unitario (unitPrice ?? basePrice)

rN_um = unità (maiuscola)

rN_quantita = qty formattata

rN_prezzo = VUOTO (lo compila un altro programma)

Righe non usate → svuotate

Auto-fit font (12/10/2026)
Misura con span invisibile (dipende dal font di sistema)

Riduce il font di 0.5px alla volta finché il testo sta nel riquadro

Margine di sicurezza 8% (min 10px) → compatibile Windows 8/10/11

Esprime il font risultante in cqw (scala con container, ok anche in A4 print)

Limite minimo: 3px (sotto non si legge)

Nota: il padding di .page è gestito con container-type: inline-size + cqw

Stampa
Iframe isolato con srcdoc — mai pagina bianca

Iframe con width: 900px; height: 1300px; opacity: 0; pointer-events: none; z-index: -1 (dimensioni reali per far calcolare il layout)

Doppio requestAnimationFrame + delay 150ms per far applicare i font

Poi contentWindow.print() dopo 400ms

CSS @media print agisce solo dentro l'iframe

Nessun header/footer del browser

Note compatibilità
✅ Chrome/Edge — perfetto

⚠️ Firefox — può tagliare l'ultimo carattere per differenze di motore di rendering (accettato per ora, usare Chrome per stampare)

✅ Windows 8/10/11 — margine 8% copre le differenze di font

8.8 Consultazione Listini Fornitori (nuovo 12/10/2026)
Cosa fa
Modale a schermo intero con tasti grandi per ogni fornitore

Click su un fornitore → si apre la sua app dentro la modale (iframe)

Pulsante ← Indietro per tornare alla lista

File
Modulo: js/ui/components/fornitori-modal.js

App USAG: fornitori/usag.html (file di terzi, 716 articoli)

Aggiungere un nuovo fornitore
Basta modificare l'array FORNITORI in fornitori-modal.js:

js
const FORNITORI = [
  { id: 'usag', nome: 'USAG', colore: '#e11d48', path: 'fornitori/usag.html' },
  // { id: 'as', nome: 'AS', colore: '#16a34a', path: 'fornitori/as.html' },
  // { id: 'vm', nome: 'VM', colore: '#3b82f6', path: 'fornitori/vm.html' },
];
E creare il corrispondente file HTML in fornitori/.

App USAG
716 articoli in costante DATA (codice gestionale → [descrizione, prezzo ivato, affidabilità, codice fornitore])

Barra ricerca codice + tasto 📋 Incolla (legge navigator.clipboard)

Mostra: descrizione, codice fornitore, prezzo di vendita ivato

Tasto 📋 attivo su PC e mobile (su Safari/iOS chiede "Consenti" al primo utilizzo)

Dove si apre
Banco: tab 💰 nella tab bar

Ufficio: pulsante 💰 Fornitori nell'header

⚠️ Attenzione sicurezza
L'app USAG contiene prezzi di vendita ivati e codici fornitore → NON pubblicare su GitHub Pages pubblico

Uso interno (Live Server / rete locale)

⚠️ Integrazione col carrello
NON integrata — il prezzo va ricopiato manualmente

8.9 Ordini Fornitori (FUTURO — Blocco 5)
Da carrello
Tasto ORDINA → dropdown fornitori colorati

🔴 usag, 🟢 as, 🔵 vm, 🟡 EuroBit, ⚪ Maestri, 🟣 AirCom, 🌸 sabart, ⚫ custom

Sotto-tab CSV
Carichi CSV fattura fornitore

Tabella: codice, descrizione, prezzo vecchio/nuovo, qty vecchia/nuova

Aggiorna solo prezzi e qty per match codice

Storico prezzi
Max 5 prezzi per articolo (FIFO)

8.10 Cassa (Scontrino) — aggiornato 07/10/2026
Vista LISTA
Card piccole: cliente / Ordine #N - L · stato + codice · N° articoli + data · totale giallo

Border-left colorato per stato

Vista DETTAGLIO
Pulsante ← per tornare alla lista

Header cliente + #xxxxxx · data · N articoli

Righe: n° riga + descrizione · codice articolo giallo più grande e no a capo · BADGE QTY GIALLO · prezzo · pallino · totale

Totale grande in basso

Pulsante 🔓 Sblocca e modifica + ✅ FATTO

Modalità EDIT
Default sola lettura

🔓 Sblocca e modifica → edit mode locale (NON cambia stato Firebase):

Pulsante diventa 🔒 Blocca modifiche (giallo)

Badge qty e prezzo cliccabili → tastierino → salvataggio automatico

Refresh live + ricalcolo totale automatico

⚠️ IMPORTANTE: l'edit mode è locale, NON cambia lo stato Firebase

Aggiornamento 07/10/2026
.cas-det-name 15px · .cas-det-code 14px (no a capo) · .cas-det-qty-badge 14px · .cas-det-price e .cas-det-linetotal 16px · .cas-det-client 18px

Futuro (rinviato)
Integrazione con registratore di cassa fiscale

File
cassa.html, js/ui/controllers/cassa-controller.js, js/ui/views/cassa-view.js, assets/css/cassa.css

9. UI/UX
Temi
Elemento	Dark	Light
Sfondo	#0a0a0a	#f5f5f5
Card	#1a1a1a	#ffffff
Primario	#facc15	#dc2626
Testo	#ffffff	#111111
Successo	#22c55e	#16a34a
Pericolo	#ef4444	#dc2626
Layout Banco (aggiornato 12/10/2026)
text
┌────────────────────────────────────────────────┐
│ ⚙ RATTAZZI CARTELLINI [📄 F] [🏢 Ufficio] [🚪] │
├────────────────────────────────────────────────┤
│ [+ NUOVO] [💰] [📋 ORDINI N] [🗑 N]            │
├────────────────────────────────────────────────┤
│  [🔢 CODICE]              [🔤 NOME]            │
├────────────────────────────────────────────────┤
│  (in modalità: input ricerca + risultati)      │
│  (in modalità CODICE: tastierino fisso sotto)  │
├────────────────────────────────────────────────┤
│ Ordine #N - L 🔵 • N art. 👁️ [👤 CAMBIA]      │
├────────────────────────────────────────────────┤
│ PRODOTTO              Q.TÀ    PREZZO    TOT    │
│ ...righe carrello...                           │
├────────────────────────────────────────────────┤
│ [📝 Nota ordine]                               │
├────────────────────────────────────────────────┤
│ TOTALE € 0,00                                  │
│ [BOL.] [RIEP.] [UFF.] [CONFERMA] [🗑]          │
└────────────────────────────────────────────────┘
Barra in basso: bottoni con icona sopra + label sotto, niente scroll orizzontale

BOL viola · RIEP giallo · UFF blu · CONFERMA verde · cestino rosso

Tab bar (12/10/2026):

overflow: hidden, gap: 4px, padding: 10px 6px

Ogni tab flex: 1 1 0, padding 6px 4px, font 0.68rem

Badge count 0.6rem, padding 0 4px

Rimosso 👥 CLIENTI, aggiunto 💰 al secondo posto

Layout Ufficio (aggiornato 12/10/2026)
text
┌────────────────────────────────────────────┐
│ ⚙ RATTAZZI [📄 F] [💰 Fornitori] [🏭 Banco] [🚪] │
├────────────────────────────────────────────┤
│ [🟡 NUOVI] [🟢 FATTI] [📋 TUTTI] [🟣 PRONTO] [🗑 N] │
├────────────────────────────────────────────┤
│ [OGGI] [IERI] [07/10] [06/10] ← giorni    │
├────────────────────────────────────────────┤
│ 🔍 Cerca… [📖]                             │
├────────────────────────────────────────────┤
│ [card ordine espansa]                      │
│ banner colorato per stato + 👁️ condizionale │
│ PRODOTTO | Q.TÀ | PREZZO | TOT             │
│ codice giallo copiabile + nota arancione   │
│ [✅ Fatto]                                 │
│ [🖨 Stampa] [📋 Pronto] [🗑 Elimina]        │
│ [📄 BOL.] ← solo se non fatturato           │
└────────────────────────────────────────────┘
Tab bar ufficio (12/10/2026):

overflow: hidden, gap: 4px

Tab: flex: 1 1 0, padding 6px 4px, font 0.68rem

Cestino 🗑: flex: 0 0 42px (stretto), count 0.55rem

Aggiunto 🗑 in fondo (rimosso dall'header)

Header ufficio:

Rimosso pulsante 🗑

Aggiunto 💰 Fornitori

Modale Fornitori (nuovo 12/10/2026)
text
┌─────────────────────────────────────────┐
│ 💰 Listini fornitori                 ✕ │
├─────────────────────────────────────────┤
│  ┌──────────┐                            │
│  │  USAG    │  (rosso, tasto grande)     │
│  └──────────┘                            │
└─────────────────────────────────────────┘

(click USAG → dentro la modale:)
┌─────────────────────────────────────────┐
│ [← Indietro]    USAG    [✕]              │
├─────────────────────────────────────────┤
│ [iframe app USAG]                       │
│  [codice] [📋] [Cerca]                  │
│  risultato...                            │
└─────────────────────────────────────────┘
Elementi UI
Banner colorati per stati ordine

Badge per stati e conteggi

Toast per notifiche temporanee

Modale centrale per notifiche ufficio

Modali per input e conferme

Tastierino numerico custom

Tastierino inline ricerca codice (.inline-keypad, .inline-kp) fisso in basso

2 tasti modalità ricerca banco (.search-mode-btn CODICE giallo / NOME nero)

Modale fornitori (.fornitori-* — overlay + tasti grandi + iframe)

Pallini stato prezzo

Scheda prodotto con tendine espandibili

Dialoghi nativi (confirm, prompt, alert) per BOL/F/nota riga

Icona ✏️ accanto al nome cliente

Icona 👁️ quando qualcuno ha visto l'ordine (condizionale)

Input inline per modifica prezzo (ufficio)

Colori alternati righe (banco)

Barra giorni (ufficio)

Placeholder nota compatto quando vuota, div giallo quando piena

Rimosso dall'app attuale
Tasto % nell'header

Tab Inventario, Fatture, Cartellini, Altro

Partita IVA obbligatoria alla creazione cliente

Pulsante "CASSA" verde dal login

Tastierino per modifica prezzo in ufficio (sostituito da input inline)

Fascia header colonne .cart-cols-header (creava disallineamento)

Doppio/triplo <link> a invoice.css in banco.html

Vecchia barra ricerca fissa in banco (sostituita da 2 tasti CODICE/NOME)

Tab 👥 CLIENTI in banco (sostituito da 💰 Fornitori)

Pulsante 🗑 nell'header ufficio (spostato nei tab)

Occhio fisso nel banner anteprima banco (ora condizionale)

10. Struttura File Completa
text
ferr_app definitiva/
├── index.html ✅
├── banco.html ✅
├── ufficio.html ✅
├── cassa.html ✅
├── import.html ✅
├── PROGETTO.md ✅ (v2.9)
├── templates/                      ← 🆕 (12/10/2026)
│   └── ddt-template.html           ← 🆕
├── fornitori/                      ← 🆕 (12/10/2026)
│   └── usag.html                   ← 🆕
├── assets/
│   └── css/
│       ├── base.css ✅
│       ├── components.css ✅
│       ├── theme-dark.css ✅
│       ├── theme-light.css ✅
│       ├── banco.css ✅ (+ .clv2-, .clr-, .bb-, .smv2-, .order-note-display, .fornitori-*, .search-mode-btn, .inline-keypad)
│       ├── ufficio.css ✅ (+ .uff-inline-price-input, .uff-line-note, .uff-days, .uff-day, .uff-order-note-*, tab compressi, cestino stretto)
│       ├── cassa.css ✅
│       ├── print.css ✅
│       ├── product-card.css ✅
│       ├── price-dot.css ✅
│       └── invoice.css ✅
└── js/
    ├── app.js ✅
    ├── core/
    │   ├── firebase-config.js ✅
    │   ├── firebase-init.js ✅
    │   ├── auth.js ✅ (poli → paul)
    │   ├── file-parser.js ✅
    │   ├── notify.js ✅ (Blocco 4)
    │   └── utils.js ❌ (mai creato)
    ├── data/
    │   ├── article-repository.js ✅
    │   ├── cart-repository.js ✅ (+ writeSeenBy, syncOrderPricesToArticles, generateOrderCode, updateLineLock, markCartAsModified)
    │   ├── client-repository.js ✅
    │   ├── invoice-repository.js ✅ (Blocco 7)
    │   ├── trash-repository.js ✅ (Blocco 8)
    │   ├── order-repository.js ❌
    │   └── supplier-repository.js ❌
    ├── domain/
    │   ├── article-service.js ✅
    │   ├── cart-service.js ✅
    │   ├── client-service.js ✅
    │   └── ...altri ❌
    └── ui/
        ├── components/
        │   ├── search-bar.js ✅ (riscritto 12/10/2026: 2 modalità + tastierino inline)
        │   ├── keypad.js ✅
        │   ├── cut-calculator.js ✅
        │   ├── modal.js ✅
        │   ├── client-picker.js ✅
        │   ├── summary-modal.js ✅ (v2 stile vecchia app)
        │   ├── compare-articles.js ✅
        │   ├── cart-line.js ✅
        │   ├── product-card.js ✅
        │   ├── print-orders-modal.js ✅ (+ print-area fix)
        │   ├── price-dot.js ✅
        │   ├── invoice-modal.js ✅ (creato, non usato)
        │   ├── invoice-number-modal.js ✅ (creato, non usato)
        │   ├── print-invoice.js ✅ (fallback vecchio DDT)
        │   ├── print-ddt.js              ← 🆕 (12/10/2026)
        │   ├── fornitori-modal.js         ← 🆕 (12/10/2026)
        │   └── ...altri ❌
        ├── controllers/
        │   ├── banco-controller.js ✅ (~2000 righe, da rifattorizzare)
        │   ├── ufficio-controller.js ✅
        │   └── cassa-controller.js ✅
        └── views/
            ├── login-view.js ✅
            ├── import-view.js ✅
            ├── banco-view.js ✅
            ├── ufficio-view.js ✅
            └── cassa-view.js ✅
11. Ambiente di Sviluppo
Setup
Editor: Cursor

Estensione: Live Server (Ritwick Dey)

Server: http://127.0.0.1:5500

Browser: Chrome/Edge con DevTools

Sistema: Windows

Deploy: GitHub Pages → https://maxiz333.github.io/FERR_APP/

Regole operative
Sempre Ctrl + S prima di testare

Ctrl + Shift + R per ricaricare forzato

Aprire SEMPRE con Live Server

Mai usare la preview interna di Cursor

Controllare sempre la Console

Se vedi "pagina bianca": chiudi tutte le tab + riapri + Ctrl+Shift+R

Firebase
Progetto: ferr-app-5e277

Regione: europe-west1

Regole attuali: .read: true, .write: true (sviluppo)

SDK: Firebase v10 via CDN

runTransaction: esportato da firebase-init.js

GitHub
Repo: https://github.com/maxiz333/FERR_APP

Sito online: https://maxiz333.github.io/FERR_APP/

Deploy: automatico al push su main

⚠️ Attenzione: l'app USAG contiene prezzi di vendita ivati — NON pubblicare su GitHub Pages pubblico

12. Roadmap Completa
✅ COMPLETATI
Blocchi 1-9 (v1.0 → v2.8):

✅ BLOCCO 1 — Login

✅ BLOCCO 2A — Import articoli

✅ BLOCCO 2B.1 — Layout Banco + Ricerca

✅ BLOCCO 2B.2 — Carrello base

✅ BLOCCO 2B.3.1 — Tastierino + Sconti

✅ BLOCCO 2B.3.2 — Ciclo forbici

✅ BLOCCO 2B.3.3 — Calcolatore taglio/peso

✅ BLOCCO 2B.3.4a — Note riga + note ordine

✅ BLOCCO 2B.3.4b — Cliente Picker

✅ BLOCCO 2B.4 — Riepilogo → v2 08-09/10

✅ BLOCCO 2B.5 — Bozza / Conferma / Invio / Trash

✅ BLOCCO 2B.6 — Scheda Prodotto

✅ BLOCCO 2B.7 — Pallini Stato Prezzo

✅ BLOCCO 3.1 — Layout Ufficio

✅ BLOCCO 3.2 — Collegamento Firebase

✅ BLOCCO 3.3 — Contatori + tendina ordini giorno

✅ BLOCCO 3.4 — Vista dettaglio ordine

✅ BLOCCO 3.5 — Azioni ordine

✅ BLOCCO 3.5-bis — Sblocco ordine

✅ BLOCCO 3.7 (parte 1) — Codice Ordine Ordine #N - L

✅ BLOCCO 3.8 — Stampa Multi-Ordine

✅ BLOCCO 3B — Pagina Cassa

✅ BLOCCO 3B-bis — Cassa stile COMPATTO

✅ BLOCCO 4 — Occhio + Notifiche

✅ BLOCCO 5A — Import Clienti (~3.651)

✅ BLOCCO 6 — Anagrafica Clienti

✅ BLOCCO 7 — Fatturazione DDT

✅ BLOCCO 8 — Cestino condiviso

✅ LAVORO A — Ordinamento articoli banco

✅ LAVORO B — 10 colori righe

✅ LAVORO C — Layout MQ (H×L + PREZZO BASE)

✅ LAVORO D — Tasti azione nascosti + codice cliccabile

✅ Barra giorni ufficio

✅ Vista completa tendina banco

✅ Pulizia carrelli vuoti

✅ Fix stampe print-area

✅ Nota ordine banco + ufficio

✅ Nota riga articolo in ufficio arancione

✅ Codice articolo copiabile in ufficio

✅ Rinomina poli → paul

✅ Barra in basso banco (icona + label, no scroll)

✅ Modale riepilogo v2

✅ Colori righe stabili

Sessione 12/10/2026 (v2.9):

✅ DDT definitivo — template HTML compilabile + auto-fit font

✅ DDT collegato a banco (BOL ristampa, anteprima ordine)

✅ DDT collegato a ufficio (bottone Stampa DDT su fatture)

✅ Modale fornitori + USAG integrata (tasto 📋 Incolla)

✅ Tasti 💰 banco/ufficio

✅ Ricerca banco 2 modalità (CODICE/NOME)

✅ Tastierino inline fisso in basso (CODICE)

✅ Tastiera iPhone automatica (NOME)

✅ Tap fuori tastierino → chiude

✅ Anti-falso-blur note ufficio (_pendingRefresh)

✅ Anti-falso-blur note banco (noteState in edit mode)

✅ Nota ordine ufficio allineata a destra

✅ Occhio condizionale in anteprima banco

✅ Tab banco/ufficio compatti (no scroll)

✅ Cestino ufficio nei tab (stretto)

🔄 IN CORSO
(nessuno)

📋 DA FARE (in ordine di priorità)
#	Blocco	Cosa	Complessità
1	Occhio 👁️ in Cassa	Simmetrico a banco e ufficio	🟡 Bassa
2	Pulizia debito tecnico	banco-controller.js (2000+ righe) → spezzare; banco.css regole duplicate; utils.js mai creato	🟠 Alta
3	2B.8 — Barra Ricerca Generica (nel logo)	3 tab: articoli/clienti/ordini	🟡 Media
4	5 — Ordini Fornitori + CSV	Con addedAt, addedBy, lastOrderedAt articolo	🟠 Alta
5	10 — Scaglioni (auto-apply + UI)		🟡 Media
6	11 — Tema Light + Selettore		🟡 Media
7	12 — Regole Firebase + Deploy produzione		🟠 Alta
8	Estensione fornitori	Aggiungere AS, VM, EuroBit, ecc. alla modale	🟡 Media
9	Test Firefox DDT	Se necessario, refactor auto-fit	🟡 Media
10	3.7 p2 — Anti-truffa		🟠 Rinviato
📌 RINVIATI
📌 Reset mezzanotte "carrelli modifica → nuovo" — mai implementato, forse non più necessario con filtro giorni

📌 BLOCCO 13 — Tasti avanti/indietro

📌 BLOCCO 14 — Categorie/Sottocategorie

📌 FUTURO — Integrazione registratore di cassa fiscale

📌 FUTURO — Fattura fiscale (la fa il commercialista)

📌 Codice fornitore f. XXX — Serve import (Blocco 5)

📌 Cartellini — Funzione vecchia app, non si farà

text

---

## 🟩 PARTE 3/3 — Sezioni 13 → Fine + Cronologia

**Incolla questo SUBITO SOTTO la Parte 2** (nello stesso file):
13. Stato Avanzamento Attuale
📊 Riepilogo
Blocco	Descrizione	Stato
1	Login	✅
2A	Import articoli	✅
2B.1	Layout Banco + Ricerca	✅
2B.2	Carrello base	✅
2B.3.1	Tastierino + Sconti	✅
2B.3.2	Ciclo forbici	✅
2B.3.3	Calcolatore taglio/peso	✅
2B.3.4a	Note riga + ordine	✅
2B.3.4b	Cliente Picker	✅
2B.4	Riepilogo + Confronto	✅ (v2 09/10)
2B.5	Bozza/Conferma/Invio	✅
2B.6	Scheda Prodotto	✅
2B.7	Pallini Stato Prezzo	✅
2B.8	Barra Ricerca Generica	⏳
3.1	Layout Ufficio	✅
3.2	Ordini reali da Firebase	✅
3.3	Contatori + Tendina ordini	✅
3.4	Vista dettaglio ordine	✅
3.5	Azioni ordine	✅
3.5-bis	Sblocco ordine	✅
3.6	Fattura fiscale	❌ (non si fa)
3.7 p1	Codice Ordine #N - L	✅
3.7 p2	Anti-truffa	⏳ rinviato
3.8	Stampa Multi-Ordine	✅
3B	Pagina Cassa	✅
3B-bis	Cassa stile COMPATTO	✅
4	Occhio + Notifiche	✅
DDT definitivo	Template HTML + auto-fit	✅ (12/10)
Modale Fornitori USAG	Tab 💰 banco/ufficio	✅ (12/10)
Ricerca banco 2 modalità	CODICE/NOME + tastierino inline	✅ (12/10)
5	Ordini Fornitori + CSV	⏳
5A	Import Clienti	✅
6	Anagrafica Clienti	✅
7	Fatturazione DDT	✅ (template definitivo 12/10)
8	Cestino + Reset	✅ (manca reset mezzanotte)
9	Storico prezzi	✅
10	Scaglioni	⏳
11	Tema Light	⏳
12	Regole + Deploy	⏳
LAVORO A	Ordinamento articoli banco	✅
LAVORO B	10 colori righe	✅
LAVORO C	Layout MQ (H×L + PREZZO BASE)	✅
LAVORO D	Tasti nascosti (logica + estetica)	✅
Barra giorni ufficio	Filtro + totali	✅
Vista completa tendina banco	Raggruppata per giorno	✅
Anti-falso-blur note	Banco + ufficio	✅ (12/10)
Occhio condizionale banco	Solo se visto	✅ (12/10)
Stampa DDT in anteprima banco	Nuovo template	✅ (12/10)
Tab banco/ufficio compatti	No scroll	✅ (12/10)
Cestino ufficio nei tab	Stretto	✅ (12/10)
🎯 Prossimo passo immediato
Occhio 👁️ in Cassa (simmetrico a banco/ufficio) · Pulizia debito tecnico · Barra Ricerca Generica (2B.8)

14. Note Tecniche Importanti
Struttura cartelle CRITICA
search-bar.js in js/ui/components/

banco-controller.js in js/ui/controllers/

Se sposti un file, aggiorna gli import

Salvataggio file
Cursor non ha autosave. Sempre Ctrl + S.

Ricarica forzata
Ctrl + Shift + R

Errori innocui (IGNORALI)
favicon.ico 404

DevTools is now available in Italian

[Violation] Permissions policy violation: unload is not allowed

WebSocket connection to 'wss://srcdoc/...' failed: ERR_NAME_NOT_RESOLVED ← iframes con srcdoc

WebSocket ... BFCache

[Violation] Avoid using document.write()

Eventuali warning CORS in sviluppo

🛡️ Guardia anti-loop scheduleTotalsSync
In banco-controller.js c'è scheduleTotalsSync() con debounce 400ms e guardia _lastSyncedKey. NON rimuoverla.

🔒 updateLineLock
In ufficio-controller.js è locale. In cart-repository.js è esportata.

🔒 saveOrderNote
In banco-controller.js è locale, usa updateNote da cart-repository.js.

🔒 markOrderAsModified vs markCartAsModified
markOrderAsModified() in banco-controller.js: chiamata in banco dopo modifiche, scrive solo se stato sbloccato

markCartAsModified(cartId) in cart-repository.js: esportata, chiamata da ufficio

🎫 generateOrderCode(cartId) — Blocco 3.7
Esportata in cart-repository.js

Genera Ordine #N - L con alfabeto alternato A-Z-B-Y-C-X...

Incrementa counters/orderNumber, salva meta/orderNumber + meta/orderCode

Reset automatico a mezzanotte

Chiamata in sendDraftToOffice() e confirmOrder() — solo se il carrello non ha già un codice

🎯 switchToCart(cartId) — Blocco 3.5-bis
In banco-controller.js: stacca listener, imposta nuovo _cartId, carica carrello, riattacca

Usata da 🔓 Sblocca e modifica

📝 wasModified
Salvato in meta/wasModified (bool)

Settato solo se sbloccato, resta true per sempre

Visibile come ✏️ accanto al nome cliente

Numerazione fatture — Blocco 7
generateInvoiceNumber() in invoice-repository.js usa runTransaction

Parte da 2000, salvato in counters/invoiceNumber

NON si resetta

peekNextInvoiceNumber() mostra il prossimo senza assegnarlo

setNextInvoiceNumber(n) modifica manuale (tasto F)

saveInvoiceToCart(cartId, num) salva meta/invoiceNumber + meta/invoiceDate

🖨️ Stampa senza pagina bianca
Regola d'oro: MAI window.print() sulla pagina principale

Soluzione: iframe nascosto con srcdoc + iframe.contentWindow.print()

CSS @media print agisce solo dentro l'iframe

NON usare window.open()

NON usare document.write() direttamente

print-orders-modal.js: il contenuto degli ordini DEVE essere dentro <div class="print-area"> — altrimenti body > *:not(.print-area) { display: none } nasconde tutto

Dialoghi nativi per BOL e F
BOL in banco → confirm()

BOL in ufficio → openClientPicker() + confirm()

Tasto F → prompt() + alert()

Cache locale articoli
updateArticleInCache(key, fields) in article-service.js

Usato da: product-card.js, ufficio-controller.js, cassa-controller.js, banco-controller.js

ensureArticlesLoaded().then(() => refresh()) in ufficio/cassa

Sync prezzi ordine → articoli
syncOrderPricesToArticles(orderId) in cart-repository.js

Chiamato quando ordine va in fatto

Calcolatore taglio/peso
qty = result.kg, unitPrice = basePrice (invariato), mtTotal, kgTotal

NON cambia mai basePrice dell'articolo

🆕 Cestino condiviso — Blocco 8
trashCart(cartId, source, user) in trash-repository.js

Copia in trash/carts/{id} + rimuove da activeCarts

Aggiunge trashedAt, trashedBy, source

restoreCart(cartId): rimette in activeCarts con status: "modifica" + isLocked: false

runScheduledCleanup(): chiamata al boot

Cestino banco → 1 volta al giorno

Cestino ufficio → la domenica

🆕 Occhio 👁️ — Blocco 4
writeSeenBy(cartId, userId) in cart-repository.js

Scrive meta/seenBy/{userId} = Date.now()

Idempotente: skip se già scritto negli ultimi 60s

Chiamata solo da ufficio: editLinePrice, editLineQty, editLineDiscount, click notifica

NON chiamata dal banco

In banco: mostrato vicino a CAMBIA

In ufficio: nel banner

In tendina banco: accanto al nome (solo vista normale)

🆕 Nell'anteprima banco: renderEyeBanner(seenBy) — appare solo se qualcuno l'ha visto (12/10)

🆕 Notifiche — Blocco 4
showOfficeToast({status, clientName, body, time, onClick}) in js/core/notify.js

Modale centrale, una alla volta (_currentNotifOverlay)

Colori: ferapp-notif-bozza/nuovo/in_arrivo

CSS in <style> dentro ufficio.html

playBeep(): 880Hz + 1320Hz

requestNotificationPermission(): al primo click

showNativeNotification(): notifica nativa PC

🆕 Ordinamento articoli in banco
In renderCart, lines.sort((a,b) => (b.addedAt||0) - (a.addedAt||0))

🆕 Anche in printDDT: le righe del DDT ordinate per addedAt DESC (12/10)

🆕 Colori righe carrello
Classe clr-{hashLineId(line.id) % 10} in renderCart

hashLineId(id) in banco-controller.js → hash stabile dell'ID

Colori trasparenti rgba con opacità 9-11%:

clr-0 giallo · clr-1 grigio · clr-2 verde · clr-3 blu · clr-4 rosso · clr-5 viola · clr-6 arancio · clr-7 turchese · clr-8 rosa · clr-9 marrone

CSS in banco.css

🆕 Layout riga articolo MQ (LAVORO C)
HTML: .cart-line-grid (4 colonne: prod | qty-col | price | tot)

Colonna qty (.clv2-col-qty): qty stepper + select unità + H×L (MQ) + PREZZO BASE

H×L: input data-field="h" e data-field="l" → onHlChange() calcola qty = h * l

PREZZO BASE: label data-action="edit-price-base" → calcolatore · riquadro data-action="edit-price" → tastierino

CSS mobile in banco.css con @media (max-width: 640px) e (max-width: 420px)

🆕 Tasti azione nascosti + codice cliccabile (LAVORO D)
<div class="cart-line-actions" hidden> di default

<button class="cart-line-code-toggle" data-action="toggle-actions"> sul codice

Handler in onLineAction: toggle hidden + aggiorna _openActionsLines Set

Stato persistente: _openActionsLines mantiene i lineId con tasti aperti → al re-render i tasti restano aperti

Reset al cambio carrello (switchToNewCart, switchToCart)

🆕 Modifica prezzo inline in ufficio
editLinePrice NON usa tastierino

Crea <input> inline dentro il bottone prezzo

Invio o blur salva, Esc annulla

🆕 Tasto "+ NUOVO" in banco
wireNewCartTab() in banco-controller.js

Click → conferma → switchToNewCart()

🆕 Cassa — testi più grandi (07/10)
🆕 localStorage — chiavi usate
ferapp_session, ferapp_current_cart_id, firebase:host:*

⚠️ Se su maxiz333.github.io il localStorage si riempie di chiavi cp4_* (vecchia app): cancellarle con

js
Object.keys(localStorage).filter(k => k.startsWith("cp4_")).forEach(k => localStorage.removeItem(k))
🆕 Nota ordine (banco + ufficio) — comportamento unificato
Vuota → textarea con placeholder

INVIO o click fuori → salva e passa a div giallo

Shift+Invio → va a capo

Click sul div giallo → torna textarea, cursore alla fine

Memoria stato: _orderNoteEditMode (banco), _editingNoteCarts Set (ufficio)

🆕 Ufficio (12/10):

Display e textarea allineati a destra

Anti-falso-blur: _pendingRefresh blocca refresh durante edit mode

Guardia aggiuntiva in blur: if (!document.body.contains(ta)) return;

🆕 Banco (12/10):

Cattura noteState (value + selection) sempre se _orderNoteEditMode (non solo se ha focus)

Ripristina cursore solo se wasFocused

🆕 Nota riga articolo in ufficio
Visibile sotto il codice articolo con ✏️

Stile: arancione (#fb923c), font-size: 1rem, font-weight: 700

Contorno nero sottile attorno alle lettere (-webkit-text-stroke: 0.4px #000 + text-shadow 4 direzioni)

Solo se line.note esiste

🆕 Codice articolo copiabile in ufficio
Giallo brillante (var(--primary, #facc15)), font-size: 0.95rem, font-weight: 900, monospace

Click → copia negli appunti + toast

Fallback execCommand('copy') per browser vecchi

🆕 Barra giorni ufficio
HTML: <nav class="uff-days" id="uffDays"></nav> dopo i tab

JS: renderDaysBar() in ufficio-controller.js

Variabili: _activeDay, _dayDetailOpen

Totali visibili solo a papa/mati/massi

Ordini e fatture separati: invoiceNumber presente → fattura

🆕 Vista completa tendina banco
Variabile _ordersFullView

Pulsante toggle #ordersViewToggle in banco.html

Click in wireOrdersViewToggle() → toggle + renderOrdersDropdown()

Vista completa: raggruppata per giorno via groupCartsByDay(carts)

🆕 Pulizia carrelli vuoti all'avvio
cleanupEmptyModificaCarts() in banco-controller.js

Cancella da activeCarts i carrelli vuoti dell'utente corrente in stato modifica, tranne quello attivo

🆕 Barra in basso banco
Bottoni con icona sopra + label sotto: .bb-btn

Classi colore: .bb-bol (viola), .bb-riep (giallo), .bb-uff (blu), .bb-conf (verde, flex 1.25)

.bb-trash (flex 0 0 40px, rosso)

Niente scroll orizzontale → overflow: hidden su .bottom-actions

Bug fix: updateBolButton() aggiorna solo .bb-icon e .bb-label, non textContent

🆕 Modale riepilogo v2 (08-09/10)
Classi CSS: .smv2-* in banco.css

Header: cliente + counter N/M giallo + X

Box TOTALE ORDINE grande

Righe: € prezzo x qty unità = € totale a destra

Verde scuro quando spuntata

Footer: Reset spunte (bordo giallo) + Chiudi (giallo pieno)

Chiudi conferma solo se tutto spuntato

Memoria spunte savedCheckedByLineId fuori dallo state → sopravvive a close()

🆕 Hash lineId per colore stabile
hashLineId(id) in banco-controller.js

Restituisce numero 0-9 (modulo 10)

Usato in renderCart per classe colore

🆕 Rinomina poli → paul
In auth.js: id: "poli", name: "paul"

Ordini esistenti con createdBy: "poli" continuano a funzionare

🆕 Ricerca banco (2 modalità) — 12/10/2026
File: js/ui/components/search-bar.js (riscritto)

HTML: .search-mode-bar (2 tasti) + .search-input-wrapper.is-hidden + .search-results + .inline-keypad.is-hidden (nell'ordine: risultati sopra, tastierino sotto)

Stato iniziale: solo 2 tasti grandi CODICE/NOME

Apertura CODICE:

input.setAttribute("inputmode", "none") + input.setAttribute("readonly", "readonly") (blocca tastiera telefono)

inlineKeypad.classList.remove("is-hidden")

searchContainer.classList.add("is-code-mode") → tastierino fisso in basso via CSS

Apertura NOME:

Rimuove inputmode e readonly

inlineKeypad.classList.add("is-hidden")

input.focus() sincrono (necessario per iOS che richiede user-gesture)

Rimuove .is-code-mode

Ricerca live: debounce 150ms → searchArticles()

In CODICE: filtro per codice, match esatto su 1 → aggiunge diretto

Tap fuori dal tastierino (solo in CODICE): closeSearchMode()

CSS chiave:

.search-mode-btn.search-mode-code → giallo

.search-mode-btn.search-mode-name → nero/giallo

.inline-keypad.is-hidden { display: none !important; }

.banco-search.is-code-mode .inline-keypad { position: fixed; left:0; right:0; bottom:0; z-index: 500; ... }

body:has(.banco-search.is-code-mode) .cart-area { padding-bottom: 340px; }

🆕 Template DDT definitivo — 12/10/2026
File template: templates/ddt-template.html (input HTML compilabili con nomi tipo rN_codici, rN_descrizione, ecc.)

File modulo: js/ui/components/print-ddt.js

Riempimento input:

el.value = ... + el.setAttribute('value', ...) (per serializzare in outerHTML)

Checkbox: el.checked = true + el.setAttribute('checked', 'checked')

Auto-fit font: misura span invisibile (con font reali del sistema) → riduce di 0.5px finché il testo sta → converte in cqw (scala con container)

Margine sicurezza: 8% (min 10px) → compatibile Win 8/10/11

Iframe: width: 900px; height: 1300px; opacity: 0; pointer-events: none; z-index: -1 (dimensioni reali per far calcolare il layout)

Doppio requestAnimationFrame + delay 150ms prima dell'auto-fit

Print dopo 400ms

🆕 Modale Fornitori — 12/10/2026
File: js/ui/components/fornitori-modal.js

API: openFornitoriModal(), closeFornitoriModal()

Array FORNITORI:

js
const FORNITORI = [
  { id: 'usag', nome: 'USAG', colore: '#e11d48', path: 'fornitori/usag.html' }
];
Apertura banco: wireFornitoriButton() in banco-controller.js

Apertura ufficio: listener in initUfficioController

CSS in banco.css: .fornitori-overlay, .fornitori-modal, .fornitori-btn, .fornitori-iframe-*

App USAG: fornitori/usag.html con tasto 📋 pasteBtn (usa navigator.clipboard.readText())

15. Come Riprendere il Lavoro
In una NUOVA chat
Allega PROGETTO.md e scrivi:

"Leggi PROGETTO.md del mio progetto FerApp e riprendiamo dal prossimo blocco."

In una SESSIONE normale
Apri Cursor su ferr_app definitiva

Verifica Live Server attivo su http://127.0.0.1:5500

Apri index.html → login "papa"

Controlla console (F12)

Riprendi dal blocco in corso

Checklist pre-sessione
□ Live Server attivo
□ Firebase raggiungibile
□ Cache articoli carica (~19.348)
□ Cache clienti carica (~3.651)
□ Login funziona
□ Nessun errore rosso in console (a parte srcdoc e unload)
Se vedi "pagina bianca"
Chiudi tutte le tab

Riapri con Ctrl + Shift + R

F12 → Network → Disable cache → ricarica

Se ancora: F12 → Application → Clear site data

Comandi git frequenti
bash
git add .
git commit -m "descrizione"
git push

# se dà errore "rejected non-fast-forward":
git pull --rebase origin main
git push
📌 Riferimenti Rapidi
Cosa	Dove
Login	http://127.0.0.1:5500/index.html
Banco	http://127.0.0.1:5500/banco.html
Ufficio	http://127.0.0.1:5500/ufficio.html
Cassa	http://127.0.0.1:5500/cassa.html
Import	http://127.0.0.1:5500/import.html
Firebase Console	https://console.firebase.google.com/project/ferr-app-5e277
GitHub Repo	https://github.com/maxiz333/FERR_APP
GitHub Pages	https://maxiz333.github.io/FERR_APP/
Live Server	porta 5500
16. Blocchi in Dettaglio
16.1 🔤 BLOCCO 3.7 — Codice Ordine + Anti-Truffa
✅ PARTE 1 — COMPLETATA (30/09/2026)

Formato: Ordine #N - L

N = numero progressivo (1, 2, 3, ...)

L = lettera alfabeto alternato: A, Z, B, Y, C, X, D, W, E, V, F, U, G, T, H, S, I, R, J, Q, K, P, L, O, M, N

Reset giornaliero: numero e lettera si azzerano a mezzanotte

Salvataggio: activeCarts/{cartId}/meta/orderNumber, meta/orderCode, counters/orderNumber, counters/lastResetDate

Implementazione: generateOrderCode(cartId) in cart-repository.js

Chiamata in: sendDraftToOffice() (bozza) + confirmOrder() (ordine diretto)

Aggiornamento 09/10: anche in confirmOrder() (ordine diretto senza bozza)

⏳ PARTE 2 — ANTI-TRUFFA (da fare)

Doppia protezione se stesso cliente fa più ordini

Nota utente: "non metteremo più il timer, ci limitiamo ad usare il numero dal progetto"

16.2 🔓 BLOCCO 3.5-bis — Sblocco Ordine
✅ COMPLETATO (30/09/2026)

Ordine fatto di default bloccato (sola lettura)

Pulsante 🔓 Sblocca e modifica in Ufficio/Banco/Cassa

Stato → sbloccato, isLocked: false

Se modificato → wasModified: true → icona ✏️ permanente

Per richiudere: Fatto → isLocked: true

16.3 💰 BLOCCO 3B-bis — Cassa stile COMPATTO
✅ COMPLETATO (30/09/2026)

LISTA: card piccole con cliente/codice/stato/N art./data/totale

DETTAGLIO: righe con badge qty giallo + prezzo + pallino + totale

EDIT MODE: locale, no Firebase, refresh live

16.4 🖨️ BLOCCO 3.8 — Stampa Multi-Ordine
✅ COMPLETATO (01/10/2026) — fix print-area 09/10

Ufficio: 🖨 Stampa → modale multi-selezione → anteprima

Banco: 🖨 Stampa DDT nel dettaglio → stampa singolo ordine

Bug fix 09/10: il contenuto degli ordini deve essere dentro <div class="print-area"> in print-orders-modal.js

Aggiornamento 09/10: la stampa ordini esclude le fatture

16.5 📦 BLOCCO 2B.6 — Scheda Prodotto
✅ COMPLETATO (04/10/2026)

Vedi sezione 8.3

16.6 🎯 BLOCCO 2B.7 — Pallini Stato Prezzo
✅ COMPLETATO (04/10/2026)

Vedi sezione 8.6

16.7 📥 BLOCCO 5A — Import Clienti
✅ COMPLETATO (04/10/2026)

Vedi sezione 8.5

16.8 👥 BLOCCO 6 — Anagrafica Clienti
✅ COMPLETATO (04/10/2026)

Client picker da Firebase clients/

Accesso da banco (👤 CAMBIA) e ufficio (popup BOL)

16.9 📄 BLOCCO 7 — Fatturazione DDT
✅ COMPLETATO (05/10/2026)

Vedi sezioni 4 (Flusso Fatturazione) e 8.7 (Template DDT)

File creati: invoice-repository.js, print-invoice.js, invoice.css, invoice-modal.js (non usato), invoice-number-modal.js (non usato)

16.10 🗑 BLOCCO 8 — Cestino Condiviso
✅ COMPLETATO (06/10/2026)

File: js/data/trash-repository.js

Funzioni: trashCart, listenTrashCarts, restoreCart, deleteCartPermanently, emptyTrashBySource, runScheduledCleanup

Comportamento:

Cestino condiviso trash/carts/

Banco modifica → cestina

Banco altri stati → nuovo carrello, non cestina

Ufficio → cestina sempre

Svuotamento automatico al boot

16.11 👁️ BLOCCO 4 — Occhio + Notifiche
✅ COMPLETATO (06-07/10/2026)

File: js/core/notify.js

Occhio: writeSeenBy da ufficio su edit reali + click notifica

Notifiche: modale centrale colorata + beep + nativa PC

16.12 🎨 LAVORO A/B/C/D
✅ COMPLETATI (07-08/10/2026)

LAVORO A: ordinamento articoli banco (nuovo in cima)

LAVORO B: 10 colori righe vicine (fissi per ID riga dal 09/10)

LAVORO C: layout MQ (H×L + PREZZO BASE)

LAVORO D: tasti azione nascosti + codice cliccabile

16.13 🗂 SESSIONE 08/10/2026 — Note, scampolo, ordine senza bozza
✅ COMPLETATO (08/10/2026)

Tasti azione logica — forbici/nota/ordina/cestino funzionanti, stato persistente

SCAMPOLO — sconto 30% automatico + tasto % editabile + importo sconto rosso

ROTOLO — rimuove sconto

SCAGLIONATO — solo stato visivo

Prezzo/totale a 3 righe con sconto

Nota riga in banco

Codice articolo ufficio

Ordine diretto senza bozza

16.14 🗂 SESSIONE 09/10/2026 — Barra giorni, vista completa tendina, fix
✅ COMPLETATO (09/10/2026)

Pomeriggio:

Fix stampa ordini — print-area mancante

Nota banco — fix cursore + div giallo

Nota ufficio — nuova con placeholder compatto

Codice articolo ufficio — copia + fix colore

Nota riga in ufficio — arancione + contorno nero lettere

Codice ordine anche su CONFERMA

Sera:

Pulizia carrelli vuoti — cleanupEmptyModificaCarts()

Filtro tendina stretto — vecchi visibili solo se modifica/bozza

Vista completa tendina — pulsante toggle + raggruppamento per giorno

Anteprima articoli + occhio in tendina

Fix _orderNoteEditMode — variabile mancante

Fix updateOrdersTabStyle duplicata

Barra giorni ufficio

Rinomina poli → paul

Modale riepilogo v2

Barra in basso banco

Colori righe stabili

16.15 📄 SESSIONE 12/10/2026 — DDT definitivo + Fornitori + Ricerca
✅ COMPLETATO (12/10/2026)

DDT definitivo:

Template HTML compilabile (templates/ddt-template.html) — 23 righe articoli + header + footer

Modulo print-ddt.js con auto-fit font (margine 8%, min 10px)

Riempie: numero DDT, data, ditta, residenza (= "CITTÀ (PV) VIA CIVICO"), data+ora inizio trasporto, ☒ Vendita spuntato, annotazioni

Righe articoli ordinate come banco (addedAt DESC)

Colonne: codice, descrizione, prezzo unitario, UM, quantità. Colonna "prezzo" (estrema destra) VUOTA

Collegato a:

Banco: pulsante BOL (già fatturato → ristampa), anteprima ordine (🖨 Stampa DDT)

Ufficio: pulsante 🖨 Stampa DDT su fatture

Vecchio print-invoice.js rimasto come fallback ma non usato dal flusso principale

Modale Fornitori:

fornitori-modal.js + fornitori/usag.html

Array FORNITORI (attualmente solo USAG rosso)

Tasto 💰 in banco (nella tab bar) e ufficio (nell'header)

App USAG in iframe + tasto 📋 Incolla (navigator.clipboard.readText())

Modale a schermo intero + pulsante ← Indietro

Ricerca banco:

2 tasti CODICE/NOME (sostituisce vecchia barra fissa)

Tastierino inline in basso (modalità CODICE) — fisso, non si muove

Tastiera iPhone automatica (modalità NOME) — focus sincrono nel click

Tap fuori dal tastierino → chiude

Match esatto codice → aggiunge diretto

Fix note ordine:

Ufficio:

Display e textarea allineati a destra

Anti-falso-blur: _pendingRefresh blocca refresh durante edit mode

Guardia document.body.contains(ta) nel blur

Banco:

noteState catturato sempre se _orderNoteEditMode

Ripristina cursore solo se wasFocused

UI:

Tab bar banco: rimosso 👥 CLIENTI, aggiunto 💰 al secondo posto, overflow: hidden, tab compressi

Tab bar ufficio: aggiunto 🗑 (stretto, flex: 0 0 42px), 5 tab su una riga senza scroll

Header ufficio: rimosso 🗑, aggiunto 💰 Fornitori

Occhio condizionale nell'anteprima ordine banco (appare solo se qualcuno l'ha visto)

📝 Cronologia Modifiche
Data	Modifica
22/09/2026	Creazione v1.0
23/09/2026	v2.0 — Aggiunte: Clienti, Scheda Prodotto, Barra Ricerca, Pallini Prezzo, Scaglioni, Template DDT
24/09/2026	v2.1 — 2B.3.4b (Cliente Picker), 2B.4 (Riepilogo), 2B.5
24/09/2026	v2.2 — Blocco 3.1 (Layout Ufficio), distinzione UFFICIO/CASSA
25/09/2026	v2.3 — 3.2, 3.4, 3.5, 3B. Fix header
28/09/2026	v2.4 — Fix loop Sync totali, wireBottomButtons, saveOrderNote, isLocked
29-30/09/2026	v2.5 — 3.3, 3.5-bis, 3B-bis, 3.7 p1. Vari bug fix
01/10/2026	v2.6 (1) — 3.8, 2B.6, 2B.7. Fix vari
04/10/2026	v2.6 (2) — Fix calcolatore taglio/peso, cassa refresh live
05/10/2026	v2.6 (3) — 5A, 6, 7. Fix pagina bianca. Nuovi componenti
06/10/2026	v2.7 (1) — Blocco 8 (Cestino), Blocco 4 (Occhio + Notifiche). Fix localStorage cp4_*. GitHub Pages
07/10/2026	v2.7 (2) — LAVORO A/B/C/D. Fix tasto +NUOVO, cassa testi, ufficio prezzo inline
08/10/2026	v2.7 (3) — LAVORO D logica (forbici/scampolo/rotolo), nota banco fix cursore + div giallo, codice ufficio copia, ordine senza bozza genera codice, card carrello non annidate
09/10/2026	v2.8 — Fix stampa ordini (print-area), nota ufficio (placeholder/div giallo), barra giorni ufficio, vista completa tendina banco (raggruppata per giorno + anteprima articoli + occhio), pulizia carrelli vuoti, filtro tendina più stretto, rinomina poli → paul, barra in basso ristrutturata (BOL/RIEP/UFF/CONFERMA/🗑 con icona+label), modale riepilogo v2 stile vecchia app, colori righe stabili per hash ID, nota riga articolo in ufficio arancione. Fix _orderNoteEditMode, updateOrdersTabStyle duplicata, updateBolButton che distruggeva gli span. Rimossi invoice.css duplicati in banco.html
12/10/2026	v2.9 — DDT definitivo (template HTML + auto-fit font 8%), modale fornitori + USAG integrata (tasto 📋 Incolla), 2 tasti CODICE/NOME in banco con tastierino inline in basso, tastiera iOS auto su NOME, anti-falso-blur note ufficio (_pendingRefresh) + banco (noteState in edit mode), occhio condizionale in anteprima ordine banco, stampa DDT in anteprima banco (nuovo template), tab banco/ufficio compatti (no scroll), cestino ufficio nei tab (stretto), nota ordine ufficio allineata a destra, rimossi CLIENTI da banco / cestino da header ufficio
Ultima sessione: 12/10/2026
Versione attuale: v2.9

Fine documento.


---/////////////////////////////////////////////////-----//////////////////////////------------------/////////////////-----

## 17. Sessione 13/10/2026 — Barra giorni settimanale + Ricerca articoli

**Versione**: v2.9 → v2.10  
**Data**: 13 ottobre 2026  
**Sessione**: notturna (dopo v2.9)

### 🆕 Ricerca ufficio dentro gli articoli
- La **barra di ricerca ufficio** ora cerca anche **dentro gli articoli** degli ordini (codice + descrizione)
- Prima: cercava solo in cliente, creatore, id ordine
- Adesso: cerca anche in **nota**, **codice ordine**, **numero fattura**, **codice articolo**, **descrizione articolo**
- Funziona in **tutti i tab** (NUOVI / FATTI / TUTTI / PRONTO)
- File: `js/ui/controllers/ufficio-controller.js` → funzione `filterOrders`

### 🆕 Barra giorni settimanale (sostituisce OGGI/IERI)
- **7 giorni fissi**: `Lun. · Mar. · Mer. · Gio. · Ven. · Sab. · D.` (domenica = "D." abbreviata)
- **Riempie tutta la larghezza** (ogni giorno = 1/7 dello spazio) — PC + mobile
- **Oggi** → bordo giallo (indicatore)
- **Selezionato** → sfondo giallo pieno
- **Di default = oggi** selezionato all'avvio
- **Contatore** dentro ogni giorno (in base al tab attivo): es. `Mer. 5`
- **Click singolo** su un giorno → filtra gli ordini di **quel giorno della settimana corrente**
- **Click di nuovo** sullo stesso giorno → mostra il **riepilogo vendite** (barra gialla a tutta larghezza sotto la barra giorni):
  - Formato: `📊 3 ordini € 55,00 · 2 fatture € 120,00`
  - Visibile solo a `papa` / `mati` / `massi`
- **Doppio click PC** o **long press cell** (500ms) su un giorno → apre tendina con le **4 settimane scorse**:
  - `Lun. scorso · 08/10`
  - `Lun. 2 sett fa · 01/10`
  - `Lun. 3 sett fa · 24/09`
  - `Lun. 4 sett fa · 17/09`
  - Click su una voce → salta a quella settimana e seleziona quel giorno
- **Click fuori / Esc / click su altro giorno** → tendina si chiude
- **Ricarica pagina** → torna al giorno attuale (oggi)
- **Solo ufficio**, banco **non toccato**

### 🐛 Bug fix durante la sessione
- **Tendina settimane si apriva in alto a sinistra** quando il riepilogo vendite era aperto → fix: dopo il `refresh()`, il bottone viene riletto dal DOM prima di calcolare la posizione
- **Tendina settimane non si chiudeva** cliccando fuori → fix: rimosso `e.stopPropagation()` dal click sul giorno
- **Delay "chiudi fuori"** portato da 10ms a 350ms per evitare conflitti con il `dblclick`
- **CSS duplicati** rimossi (vecchi blocchi `.uff-day-detail` popover)

### 📁 File toccati
- `js/ui/controllers/ufficio-controller.js`:
  - `filterOrders()` → cerca anche dentro articoli
  - `renderDaysBar()` → riscritto per barra settimanale + tendina
  - `onDayClick()` → invariato nella logica
  - `openWeekPicker()` / `closeWeekPicker()` → **nuove funzioni**
  - `getMondayOfWeek()` / `dayLabelShort()` → **nuove funzioni**
  - Variabili nuove: `_dayPickerKey`, `_dayPickerHandlers`
- `assets/css/ufficio.css`:
  - `.uff-days` → `flex-wrap: wrap` per far andare a capo il riepilogo
  - `.uff-day` → `flex: 1 1 0`, `is-today` (bordo giallo), `is-active` (sfondo giallo)
  - `.uff-day-count` → contatore dentro il giorno
  - `.uff-day-wrap` → wrapper relativo
  - `.uff-day-detail-bar` → **nuovo** riepilogo vendite a tutta larghezza
  - `.uff-week-picker` + `.uff-week-picker-item` → **nuovo** tendina settimane
  - **Rimosso**: `.uff-day-detail`, `.uff-day-detail::before`, `@keyframes uffDayDetailIn`

### ⚠️ Note tecniche
- La tendina `openWeekPicker` usa `position: fixed` + coordinate calcolate dal `getBoundingClientRect()` del bottone
- Il long press su mobile è 500ms e viene annullato se l'utente muove il dito (`touchmove`)
- Il click singolo ha un **delay di 220ms** per distinguere dal doppio click
- Il "chiudi fuori" viene attivato dopo **350ms** per non intercettare il doppio click stesso
- **Baco noto**: nessuno

**Ultima sessione**: 13/10/2026  
**Versione attuale**: v2.10


//////////////////////////______________________------------------------///////////////////////----------------//////////////////



markdown
---

## 18. Sessione 14-15/10/2026 — Blocco Esauriti (ex Blocco 5)

**Versione**: v2.10 → v2.11  
**Data**: 14-15 ottobre 2026  
**Sessione**: notturna + mattutina

### 🆕 Blocco Esauriti (rimpiazza "Ordini Fornitori")

Il Blocco 5 della roadmap si è evoluto in **"Esauriti"**: un sistema per gestire gli articoli da ordinare ai fornitori, separato dal flusso carrello/ordini/cassa.

#### Funzionalità implementate

**1. Tasto 📦 ESAUR. in banco**
- Aggiunto in alto, grande quanto `+ NUOVO`
- Tasti `📋 ORDINI` e `🗑 CESTINO` compattati (solo icona + badge sotto)
- File: `banco.html`, `assets/css/banco.css`

**2. Tendina fornitori dal carrello**
- Il tasto 🛒 nella riga del carrello ora apre una tendina fornitori **sotto al tasto premuto** (fix posizionamento)
- 7 fornitori di default: usag, as, vm, EuroBit, Maestri, AirCom, sabart
- File: `js/ui/components/esauriti-helpers.js`, `js/ui/components/esauriti-fornitori.js`

**3. Popup Qty + Nota (opzionali)**
- Dopo aver scelto il fornitore, si apre un popup con:
  - Quantità (default 0, opzionale)
  - Nota (opzionale)
- Conferma → l'articolo **resta nel carrello**, mostra scritta "📦 ESAURITO · nomefornitore" + **bordo colorato** del fornitore
- Il popup ha il tasto 🔄 per cambiare fornitore (in fase di modifica)

**4. Modale Esauriti (95% schermo)**
- Apre dal tasto 📦 ESAUR.
- **Switch**: `📦 Cerca negli Esauriti` / `🔍 Cerca nel Catalogo`
- **Barra ricerca** + **tasti fornitori** con contatori
- **Lista raggruppata per data** (Oggi, Ieri, dd mese)
- **Click item** → espande (per leggere note lunghe)
- **Doppio click (PC) / long-press 500ms (mobile)** → menu Modifica/Elimina
- File: `js/ui/components/esauriti-modal.js`, `assets/css/esauriti.css`

**5. Ricerca nel Catalogo**
- Cerca tra i ~19.348 articoli (riuso `searchArticles`)
- Ogni risultato ha un tasto **🛒 Ordina** → tendina fornitori → popup → conferma
- **L'articolo NON viene aggiunto al carrello** (importante!)
- Va nel nodo Firebase `esauriti/{autoId}` (separato dal carrello)

**6. Due fonti di esauriti**
- **Da carrello** → agganciato alla riga del carrello (campi `esauritoFornitore`, `esauritoQty`, `esauritoNote`)
- **Da catalogo** → nodo Firebase `esauriti/` (indipendente da qualsiasi carrello)
- La modale legge da entrambe e le unisce

**7. Nota ordine + Invia & Archivia**
- Quando selezioni un fornitore specifico (≠ "tutti"), compare in alto:
  - Campo **nota** con ✏️ (per singolo invio, non persistente)
  - Tasto **📨 Invia & Archivia · N art.**
- Click → modale di conferma con tabella articoli
- **🖨 Stampa** (anteprima A4 prima di confermare)
- **✓ Sì, archivia** → salva tutto in `esauritiArchivio/` + scollega dal carrello + rimuove dal nodo `esauriti/`

**8. Storico archivi (ultimi 5)**
- In fondo alla modale, sezione **📚 GIÀ ORDINATI (ultimi 5)**
- Formato riga: `2026-10-14 — ● usag — 11 art.`
- Click → modale dettaglio archivio con tabella completa

**9. Stampa A4 + CSV**
- **Stampa**: anteprima A4 con intestazione "FERRAMENTA RATTAZZI · Ordine Fornitore", tabella articoli, nota ordine, footer "Totale articoli: N"
- **CSV**: file scaricabile (separatore `;` per Excel italiano) con colonne: Cod.Mag, Cod.Form, Descrizione, Note, Q.tà, UM, Prezzo
- Nota ordine + nota articolo visibili in entrambi

**10. Gestione fornitori dinamica**
- I fornitori non sono più hardcoded, ma salvati su Firebase in `config/fornitori/{id}`
- **Doppio click (PC) / long-press (mobile)** su un tasto fornitore → menu Modifica/Elimina
- **Modifica**: nome + colore (mini-popup)
- **Elimina**: bloccato se ci sono esauriti attivi
- **Tasto `+`**: aggiunge un nuovo fornitore (ID + nome + colore)

**11. Ricerca estesa agli archivi**
- La barra di ricerca cerca anche negli archivi completi (`esauritiArchivio/`)
- Cerca in: fornitore, note, codice articolo, descrizione, codice fornitore
- I risultati appaiono subito sotto gli esauriti attivi, sezione **📚 DALL'ARCHIVIO (N)**
- Ogni riga mostra quali articoli hanno fatto match (anteprima)

**12. Data/ora + autore**
- Ogni riga esaurito mostra `🕒 dd/mm HH:MM · autore`

### 🐛 Bug fix inclusi
- **Tab PRONTO ignora filtro giorno**: i pronti si vedono sempre tutti, indipendentemente dal giorno selezionato (`ufficio-controller.js`)
- **Stampa ordini invertita**: il primo ordine è in cima, l'ultimo in fondo (`print-orders-modal.js`)

### 🗄️ Nodi Firebase nuovi
esauriti/{autoId}/
├─ fornitoreId, fornitoreNome, fornitoreColore
├─ articleId, code, supplierCode, description, unit, price
├─ qty, note
└─ addedAt, addedBy { id, name }

esauritiArchivio/{archiveId}/
├─ fornitoreId, fornitoreNome, fornitoreColore
├─ dataArchiviazione, note, archiviatoDa { id, name }
├─ articoliCount
└─ articoli/{autoId}/ { code, supplierCode, description, note, qty, unit, price }

config/fornitori/{fornitoreId}/
├─ nome
└─ colore

text

### 📁 File creati
- `js/data/esauriti-repository.js`
- `js/data/esauriti-archivio-repository.js`
- `js/data/fornitori-repository.js`
- `js/ui/components/esauriti-fornitori.js`
- `js/ui/components/esauriti-helpers.js`
- `js/ui/components/esauriti-modal.js`
- `assets/css/esauriti.css`

### 📁 File modificati
- `banco.html` (+ link esauriti.css)
- `assets/css/banco.css`
- `js/ui/controllers/banco-controller.js`
- `js/ui/controllers/ufficio-controller.js` (fix PRONTO)
- `js/ui/components/print-orders-modal.js` (fix stampa invertita)

### 🔜 Cosa manca (futuro)
- **Test mobile iPhone** (verificare modale 95%, popup, tendina su schermo piccolo)
- Eventuale **indice Firebase** su `esauritiArchivio/dataArchiviazione` (quando ci saranno centinaia di archivi)
- Possibile integrazione con **Blocco 10 (scaglioni)** per auto-apply degli sconti quantità

**Ultima sessione**: 15/10/2026  
**Versione attuale**: v2.11
