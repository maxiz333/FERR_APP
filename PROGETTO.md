 📘 FerApp — Documento di Progetto Ufficiale

**Versione**: 2.8  
**Data creazione**: 22 settembre 2026  
**Ultima modifica**: 09 ottobre 2026  
**Stato progetto**: In sviluppo attivo — Blocchi 1-8 completati. Prossimo: fix Occhio Cassa / Blocco 5 (Ordini Fornitori) / Blocco 2B.8 (Ricerca Generica) / DDT definitivo

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
- Stampa DDT (**funzionante dal 05/10/2026**)
- **Tasto + NUOVO** → mette in sospeso il carrello attuale e ne apre uno nuovo
- **Tab 🗑** → cestino con contatore
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
- **Notifiche modali** al centro schermo quando arrivano nuovi ordini da altri utenti
- **Barra giorni** sotto i tab: filtra per giorno (OGGI/IERI/dd/mm)
  - **Solo papa/mati/massi**: click sul giorno attivo → mostra `N ordini € X · N fatture € Y` (fatture separate)
  - **Paul**: i giorni sono cliccabili solo per filtrare, nessun totale
- **Codice articolo** cliccabile per copiarlo negli appunti
- **Nota riga articolo** visibile in arancione con contorno nero sottile
- **Nota ordine** con editor placeholder/textarea/div giallo (stessa logica del banco)
- Blocca/sblocca ordini
- Chiude ordine ("Fatto") → va in tab FATTI + **sync prezzi automatico**
- Sblocca ordini fatti → tab NUOVI + scroll automatico
- **🖨 Stampa** ordini (multi-selezione) — **esclude le fatture**
- **🖨 Stampa DDT** (se l'ordine è fattura)
- **📄 BOL.** in ogni ordine → apre client picker + conferma → crea fattura
- **📄 F** in header → modifica prossimo numero bolla
- **Pulsante 🗑 in header** → cestino con contatore

**Accesso**: TUTTI (papa, mati, massi, paul, cassa). Tutti possono modificare tutto.

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
│ ├── addedBy, addedByName, addedAt, updatedAt
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

#### Ricerca articoli
- Cache locale (~19.348 articoli)
- Ricerca istantanea in RAM
- Match intelligente (codice esatto > inizio > descrizione > token)
- Max 20 risultati + "Carica altri"
- Tastierino numerico utilizzabile per quantità e prezzi

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

#### Nota ordine in banco (08/10/2026)
- **Nota vuota** → textarea con placeholder
- **INVIO** → salva e diventa **div giallo** (non corsivo)
- **Shift+Invio** → va a capo senza salvare
- **Click sul div giallo** → torna textarea, cursore alla fine
- **Fix cursore**: prima del render salvo `value` + `selectionStart/End` se la textarea ha focus; dopo il render ripristino tutto (bug del re-render che perdeva il focus)

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

#### Vista dettaglio ordine in banco (Blocco 3.5-bis)
- Modale con banner colorato, righe readonly, totale, azioni
- Pulsanti: **🔓 Sblocca e modifica** · **📋 Ordini** · **🗑** · **🖨 Stampa DDT**
- 🗑 → cestina solo se `modifica`

#### Tasto F (header banco)
- Piccolo pulsante **📄 F** accanto a "🏢 Ufficio"
- Click → prompt nativo → salva `counters/invoiceNumber`

#### Icona stato cliente
- ✏️ se `status === "modifica"` **oppure** `wasModified === true`
- 🔵 se `status === "bozza"`

---

### 8.2 Tab Ordini (Ufficio)

#### Filtri
- Tab: **🟡 NUOVI** / **🟢 FATTI** / **📋 TUTTI** / **🟣 PRONTO**
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

#### Cestino ufficio (Blocco 8)
- Pulsante **🗑** in header con contatore

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
| ⚫ | Grigio | Prezzo mai verificato |
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

### 8.7 Template DDT ⚠️ (PROVVISORIO — IN ATTESA DEL DEFINITIVO)

> ⚠️ **NOTA IMPORTANTE (05/10/2026)**: Il template DDT attuale è **provvisorio**. L'utente fornirà un **template definitivo** (file HTML compilabile, identico all'originale cartaceo).
> Quando arriverà, sostituire:
> - Funzione `renderDDT()` in `js/ui/components/print-invoice.js`
> - CSS in `assets/css/invoice.css` (sezione `@media print`)

#### Formato attuale
HTML + CSS A4 verticale con:
- Intestazione RATTAZZI S.R.L. + indirizzo + dati fiscali
- Campi: **N. DDT** (`invoiceNumber`), **Data** (oggi), **Ora** (adesso), **Ditta**, **Residenza**, **Comune**
- Righe articoli: Codice · Descrizione · Prezzo · UM · Quantità
- 12 righe vuote in fondo
- Campi vuoti: Pagamento / Luogo destinazione / N. Colli / Kg / Vettore / Firme / Annotazioni

#### Stampa
- **Iframe isolato** con `srcdoc` → mai pagina bianca
- CSS `@media print` agisce **solo dentro l'iframe**
- **Nessun** header/footer del browser
- Non tocca mai la pagina principale

#### File
- `js/ui/components/print-invoice.js`
- `assets/css/invoice.css`

---

### 8.8 Ordini Fornitori (FUTURO — Blocco 5)

#### Da carrello
- Tasto **ORDINA** → dropdown fornitori colorati
- 🔴 usag, 🟢 as, 🔵 vm, 🟡 EuroBit, ⚪ Maestri, 🟣 AirCom, 🌸 sabart, ⚫ custom

#### Sotto-tab CSV
- Carichi CSV fattura fornitore
- Tabella: codice, descrizione, prezzo vecchio/nuovo, qty vecchia/nuova
- Aggiorna solo prezzi e qty per match codice

#### Storico prezzi
- Max **5 prezzi** per articolo (FIFO)

---

### 8.9 Cassa (Scontrino) — aggiornato 07/10/2026

#### Vista LISTA
- Card piccole: cliente / `Ordine #N - L` · stato + codice · N° articoli + data · totale giallo
- Border-left colorato per stato

#### Vista DETTAGLIO
- Pulsante **←** per tornare alla lista
- Header cliente + `#xxxxxx · data · N articoli`
- Righe: n° riga + descrizione · **codice articolo giallo più grande e no a capo** · **BADGE QTY GIALLO** · prezzo · pallino · totale
- **Totale grande in basso**
- Pulsante **🔓 Sblocca e modifica** + **✅ FATTO**

#### Modalità EDIT
- Default sola lettura
- **🔓 Sblocca e modifica** → edit mode **locale** (NON cambia stato Firebase):
  - Pulsante diventa **🔒 Blocca modifiche** (giallo)
  - Badge qty e prezzo cliccabili → tastierino → salvataggio automatico
  - **Refresh live** + ricalcolo totale automatico
- **⚠️ IMPORTANTE**: l'edit mode è **locale**, NON cambia lo stato Firebase

#### Aggiornamento 07/10/2026
- `.cas-det-name` 15px · `.cas-det-code` 14px (no a capo) · `.cas-det-qty-badge` 14px · `.cas-det-price` e `.cas-det-linetotal` 16px · `.cas-det-client` 18px

#### Futuro (rinviato)
- Integrazione con registratore di cassa fiscale

#### File
- `cassa.html`, `js/ui/controllers/cassa-controller.js`, `js/ui/views/cassa-view.js`, `assets/css/cassa.css`

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

### Layout Banco (aggiornato 09/10/2026)
┌────────────────────────────────────────────────────────┐
│ ⚙ RATTAZZI CARTELLINI [📄 F] [🏢 Ufficio] [🚪] │
├────────────────────────────────────────────────────────┤
│ [+ NUOVO] [👥 CLIENTI] [📋 ORDINI N] [🗑 N] │
├────────────────────────────────────────────────────────┤
│ 🔍 Cerca per codice o descrizione… │
├────────────────────────────────────────────────────────┤
│ Ordine #N - L 🔵 • N art. 👁️ [👤 CAMBIA] │
├────────────────────────────────────────────────────────┤
│ PRODOTTO Q.TÀ PREZZO TOT │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 1. ARTICOLO [− 1 +] 10,00 € 10,00 │ │
│ │ 6240005 • MQ [MQ ▼] │ │
│ │ H[]×L[] │ │
│ │ PREZZO BASE [10,00] │ │
│ │ 📝 nota riga (se presente) │ │
│ │ [✂] [%] [📄] [🛒] [🗑] (toggle da codice) │ │
│ └──────────────────────────────────────────────────┘ │
│ [📝 Nota ordine] │
├────────────────────────────────────────────────────────┤
│ TOTALE € 0,00 │
│ [BOL.] [RIEP.] [UFF.] [CONFERMA] [🗑] │
└────────────────────────────────────────────────────────┘

text

**Barra in basso** (aggiornata 09/10/2026):
- Bottoni con **icona sopra + label sotto**
- **Niente scroll orizzontale** → tutto in una riga
- BOL viola · RIEP giallo · UFF blu · CONFERMA verde (più largo) · cestino rosso (40px)

### Layout Ufficio (aggiornato 09/10/2026)
┌──────────────────────────────────────────────────┐
│ ⚙ RATTAZZI [📄 F] [🗑 N] [🏭 Banco] [🚪] │
├──────────────────────────────────────────────────┤
│ [🟡 NUOVI] [🟢 FATTI] [📋 TUTTI] [🟣 PRONTO] │
├──────────────────────────────────────────────────┤
│ [OGGI] [IERI] [07/10] [06/10] [05/10] ← giorni │
├──────────────────────────────────────────────────┤
│ 🔍 Cerca… [📖] │
├──────────────────────────────────────────────────┤
│ [card ordine espansa] │
│ banner colorato per stato + 👁️ se visto │
│ PRODOTTO | Q.TÀ | PREZZO | TOT │
│ codice giallo copiabile + nota arancione │
│ [✅ Fatto] │
│ [🖨 Stampa] [📋 Pronto] [🗑 Elimina] │
│ [📄 BOL.] ← solo se non fatturato │
└──────────────────────────────────────────────────┘

text

### Elementi UI
- Banner colorati per stati ordine
- Badge per stati e conteggi
- Toast per notifiche temporanee
- **Modale centrale** per notifiche ufficio
- Modali per input e conferme
- Tastierino numerico custom
- **Pallini stato prezzo**
- **Scheda prodotto** con tendine espandibili
- **Dialoghi nativi** (`confirm`, `prompt`, `alert`) per BOL/F/nota riga
- Icona **✏️** accanto al nome cliente
- Icona **👁️** quando qualcuno ha visto l'ordine
- **Input inline** per modifica prezzo (ufficio)
- **Colori alternati righe** (banco)
- **Barra giorni** (ufficio)
- **Placeholder nota** compatto quando vuota, div giallo quando piena

### Rimosso dall'app attuale
- Tasto % nell'header
- Tab Inventario, Fatture, Cartellini, Altro
- Partita IVA obbligatoria alla creazione cliente
- **Pulsante "CASSA" verde dal login**
- **Tastierino per modifica prezzo in ufficio** (sostituito da input inline)
- **Fascia header colonne** `.cart-cols-header` (creava disallineamento)
- **Doppio/triplo `<link>` a `invoice.css`** in banco.html

---

## 10. Struttura File Completa
ferr_app definitiva/
├── index.html ✅
├── banco.html ✅
├── ufficio.html ✅
├── cassa.html ✅
├── import.html ✅
├── PROGETTO.md ✅ (v2.8)
├── assets/
│ └── css/
│ ├── base.css ✅
│ ├── components.css ✅
│ ├── theme-dark.css ✅
│ ├── theme-light.css ✅
│ ├── banco.css ✅ (+ .clv2-, .clr-, .bb-, .smv2-, .order-note-display)
│ ├── ufficio.css ✅ (+ .uff-inline-price-input, .uff-line-note, .uff-days, .uff-day, .uff-order-note-*)
│ ├── cassa.css ✅
│ ├── print.css ✅
│ ├── product-card.css ✅
│ ├── price-dot.css ✅
│ └── invoice.css ✅
└── js/
├── app.js ✅
├── core/
│ ├── firebase-config.js ✅
│ ├── firebase-init.js ✅
│ ├── auth.js ✅ (poli → paul)
│ ├── file-parser.js ✅
│ ├── notify.js ✅ (Blocco 4)
│ └── utils.js ❌ (mai creato)
├── data/
│ ├── article-repository.js ✅
│ ├── cart-repository.js ✅ (+ writeSeenBy, syncOrderPricesToArticles, generateOrderCode, updateLineLock, markCartAsModified)
│ ├── client-repository.js ✅
│ ├── invoice-repository.js ✅ (Blocco 7)
│ ├── trash-repository.js ✅ (Blocco 8)
│ ├── order-repository.js ❌
│ └── supplier-repository.js ❌
├── domain/
│ ├── article-service.js ✅
│ ├── cart-service.js ✅
│ ├── client-service.js ✅
│ └── ...altri ❌
└── ui/
├── components/
│ ├── search-bar.js ✅
│ ├── keypad.js ✅
│ ├── cut-calculator.js ✅
│ ├── modal.js ✅
│ ├── client-picker.js ✅
│ ├── summary-modal.js ✅ (v2 stile vecchia app)
│ ├── compare-articles.js ✅
│ ├── cart-line.js ✅
│ ├── product-card.js ✅
│ ├── print-orders-modal.js ✅ (+ print-area fix)
│ ├── price-dot.js ✅
│ ├── invoice-modal.js ✅ (creato, non usato)
│ ├── invoice-number-modal.js ✅ (creato, non usato)
│ ├── print-invoice.js ✅
│ └── ...altri ❌
├── controllers/
│ ├── banco-controller.js ✅ (~2000 righe, da rifattorizzare)
│ ├── ufficio-controller.js ✅
│ └── cassa-controller.js ✅
└── views/
├── login-view.js ✅
├── import-view.js ✅
├── banco-view.js ✅
├── ufficio-view.js ✅
└── cassa-view.js ✅

text

---

## 11. Ambiente di Sviluppo

### Setup
- **Editor**: Cursor
- **Estensione**: Live Server (Ritwick Dey)
- **Server**: `http://127.0.0.1:5500`
- **Browser**: Chrome/Edge con DevTools
- **Sistema**: Windows
- **Deploy**: GitHub Pages → `https://maxiz333.github.io/FERR_APP/`

### Regole operative
1. **Sempre `Ctrl + S`** prima di testare
2. **`Ctrl + Shift + R`** per ricaricare forzato
3. **Aprire SEMPRE con Live Server**
4. **Mai usare la preview interna di Cursor**
5. **Controllare sempre la Console**
6. **Se vedi "pagina bianca"**: chiudi tutte le tab + riapri + Ctrl+Shift+R

### Firebase
- **Progetto**: `ferr-app-5e277`
- **Regione**: europe-west1
- **Regole attuali**: `.read: true, .write: true` (sviluppo)
- **SDK**: Firebase v10 via CDN
- **`runTransaction`**: esportato da `firebase-init.js`

### GitHub
- **Repo**: `https://github.com/maxiz333/FERR_APP`
- **Sito online**: `https://maxiz333.github.io/FERR_APP/`
- **Deploy**: automatico al push su `main`

---

## 12. Roadmap Completa

### ✅ COMPLETATI

- ✅ **BLOCCO 1** — Login
- ✅ **BLOCCO 2A** — Import articoli
- ✅ **BLOCCO 2B.1** — Layout Banco + Ricerca
- ✅ **BLOCCO 2B.2** — Carrello base
- ✅ **BLOCCO 2B.3.1** — Tastierino + Sconti
- ✅ **BLOCCO 2B.3.2** — Ciclo forbici
- ✅ **BLOCCO 2B.3.3** — Calcolatore taglio/peso
- ✅ **BLOCCO 2B.3.4a** — Note riga + note ordine
- ✅ **BLOCCO 2B.3.4b** — Cliente Picker
- ✅ **BLOCCO 2B.4** — Riepilogo (>1 articolo, spunta tutto) → **v2 08-09/10**
- ✅ **BLOCCO 2B.5** — Bozza / Conferma / Invio / Trash
- ✅ **BLOCCO 2B.6** — Scheda Prodotto
- ✅ **BLOCCO 2B.7** — Pallini Stato Prezzo
- ✅ **BLOCCO 3.1** — Layout Ufficio
- ✅ **BLOCCO 3.2** — Collegamento Firebase
- ✅ **BLOCCO 3.3** — Contatori + tendina ordini giorno
- ✅ **BLOCCO 3.4** — Vista dettaglio ordine
- ✅ **BLOCCO 3.5** — Azioni ordine
- ✅ **BLOCCO 3.5-bis** — Sblocco ordine
- ✅ **BLOCCO 3.7 (parte 1)** — Codice Ordine `Ordine #N - L`
- ✅ **BLOCCO 3.8** — Stampa Multi-Ordine (+ fix print-area 09/10)
- ✅ **BLOCCO 3B** — Pagina Cassa
- ✅ **BLOCCO 3B-bis** — Cassa stile COMPATTO
- ✅ **BLOCCO 4** — Occhio + Notifiche (06-07/10)
- ✅ **BLOCCO 5A** — Import Clienti (~3.651)
- ✅ **BLOCCO 6** — Anagrafica Clienti
- ✅ **BLOCCO 7** — Fatturazione DDT
- ✅ **BLOCCO 8** — Cestino condiviso (06/10)
- ✅ **LAVORO A** — Ordinamento articoli banco (07/10)
- ✅ **LAVORO B** — 10 colori righe vicine (07-09/10)
- ✅ **LAVORO C** — Layout MQ (H×L + PREZZO BASE) (07/10)
- ✅ **LAVORO D (estetica + logica)** — Tasti azione nascosti + codice cliccabile (07-08/10)
- ✅ **Barra giorni ufficio** — filtra + totali per giorno (09/10)
- ✅ **Vista completa tendina banco** — tutti gli ordini per giorno (09/10)
- ✅ **Pulizia carrelli vuoti** — automatica all'avvio (09/10)
- ✅ **Fix stampe** — `print-area` mancante (09/10)
- ✅ **Nota ordine** — banco + ufficio con editor inline (08-09/10)
- ✅ **Nota riga articolo** — visibile in ufficio in arancione (09/10)
- ✅ **Codice articolo** — copiabile in ufficio (08-09/10)
- ✅ **Rinomina poli → paul** (09/10)
- ✅ **Barra in basso banco** — bottoni con icona + label, no scroll (09/10)
- ✅ **Modale riepilogo v2** — stile vecchia app (09/10)
- ✅ **Fix `_orderNoteEditMode`** — variabile mancante (09/10)
- ✅ **Fix `updateOrdersTabStyle` duplicata** (09/10)
- ✅ **Colori righe stabili** — hash ID riga (09/10)
- ✅ **GitHub Pages** — deploy automatico

### 🔄 IN CORSO

- *(nessuno)*

### 📋 DA FARE (in ordine di priorità)

| # | Blocco | Cosa | Complessità |
|---|---|---|---|
| 1 | **DDT definitivo** | Sostituire template attuale con quello ufficiale (file HTML dell'utente) | 🟡 Media |
| 2 | **Occhio 👁️ in Cassa** | Simmetrico a banco e ufficio | 🟡 Bassa |
| 3 | **Occhio condizionale preview banco** | Attualmente fisso, dovrebbe apparire solo se altri hanno visto | 🟡 Bassa |
| 4 | **Pulizia debito tecnico** | `banco-controller.js` (2000+ righe) → spezzare in più file; `banco.css` regole duplicate; `js/core/utils.js` mai creato | 🟠 Alta |
| 5 | **2B.8** — Barra Ricerca Generica (nel logo) | 3 tab: articoli/clienti/ordini | 🟡 Media |
| 6 | **5** — Ordini Fornitori + CSV | Con `addedAt`, `addedBy`, `lastOrderedAt` articolo | 🟠 Alta |
| 7 | **10** — Scaglioni (auto-apply + UI) | | 🟡 Media |
| 8 | **11** — Tema Light + Selettore | | 🟡 Media |
| 9 | **12** — Regole Firebase + Deploy produzione | | 🟠 Alta |
| 10 | **3.7 p2** — Anti-truffa | | 🟠 Rinviato |

### 📌 RINVIATI

- 📌 **Reset mezzanotte "carrelli modifica → nuovo"** — mai implementato, forse non più necessario con filtro giorni
- 📌 **BLOCCO 13** — Tasti avanti/indietro
- 📌 **BLOCCO 14** — Categorie/Sottocategorie
- 📌 **FUTURO** — Integrazione registratore di cassa fiscale
- 📌 **FUTURO** — Fattura fiscale (la fa il commercialista)
- 📌 **Codice fornitore `f. XXX`** — Serve import (Blocco 5)
- 📌 **Cartellini** — Funzione vecchia app, non si farà (app deve restare semplice)

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
| 2B.3.3 | Calcolatore taglio/peso | ✅ |
| 2B.3.4a | Note riga + ordine | ✅ |
| 2B.3.4b | Cliente Picker | ✅ |
| 2B.4 | Riepilogo + Confronto | ✅ (v2 09/10) |
| 2B.5 | Bozza/Conferma/Invio | ✅ |
| 2B.6 | Scheda Prodotto | ✅ |
| 2B.7 | Pallini Stato Prezzo | ✅ |
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
| 3.8 | Stampa Multi-Ordine | ✅ (+ fix print-area) |
| 3B | Pagina Cassa | ✅ |
| 3B-bis | Cassa stile COMPATTO | ✅ |
| 4 | Occhio + Notifiche | ✅ |
| 5 | Ordini Fornitori + CSV | ⏳ |
| 5A | Import Clienti | ✅ |
| 6 | Anagrafica Clienti | ✅ |
| 7 | Fatturazione DDT | ✅ (template provvisorio) |
| 8 | Cestino + Reset | ✅ (manca reset mezzanotte) |
| 9 | Storico prezzi | ✅ |
| 10 | Scaglioni | ⏳ |
| 11 | Tema Light | ⏳ |
| 12 | Regole + Deploy | ⏳ |
| LAVORO A | Ordinamento articoli banco | ✅ |
| LAVORO B | 10 colori righe | ✅ |
| LAVORO C | Layout MQ (H×L + PREZZO BASE) | ✅ |
| LAVORO D | Tasti nascosti (logica + estetica) | ✅ |
| Barra giorni ufficio | Filtro + totali | ✅ |
| Vista completa tendina banco | Raggruppata per giorno | ✅ |

### 🎯 Prossimo passo immediato

**DDT definitivo** (quando arriva il file HTML) · **Occhio in Cassa** · **Pulizia debito tecnico**

---

## 14. Note Tecniche Importanti

### Struttura cartelle CRITICA
- `search-bar.js` in `js/ui/components/`
- `banco-controller.js` in `js/ui/controllers/`
- Se sposti un file, aggiorna gli import

### Salvataggio file
Cursor **non ha autosave**. Sempre `Ctrl + S`.

### Ricarica forzata
`Ctrl + Shift + R`

### Errori innocui (IGNORALI)
- `favicon.ico 404`
- `DevTools is now available in Italian`
- `[Violation] Permissions policy violation: unload is not allowed`
- `WebSocket ... BFCache`
- `[Violation] Avoid using document.write()`
- Eventuali warning CORS in sviluppo

### 🛡️ Guardia anti-loop `scheduleTotalsSync`
In `banco-controller.js` c'è `scheduleTotalsSync()` con debounce 400ms e guardia `_lastSyncedKey`. **NON rimuoverla**.

### 🔒 `updateLineLock`
In `ufficio-controller.js` è **locale**. In `cart-repository.js` è **esportata**.

### 🔒 `saveOrderNote`
In `banco-controller.js` è **locale**, usa `updateNote` da `cart-repository.js`.

### 🔒 `markOrderAsModified` vs `markCartAsModified`
- **`markOrderAsModified()`** in `banco-controller.js`: chiamata in banco dopo modifiche, scrive solo se stato `sbloccato`
- **`markCartAsModified(cartId)`** in `cart-repository.js`: esportata, chiamata da ufficio

### 🎫 `generateOrderCode(cartId)` — Blocco 3.7
- Esportata in `cart-repository.js`
- Genera `Ordine #N - L` con alfabeto alternato A-Z-B-Y-C-X...
- Incrementa `counters/orderNumber`, salva `meta/orderNumber` + `meta/orderCode`
- Reset automatico a mezzanotte
- Chiamata in **`sendDraftToOffice()` (bozza)** e in **`confirmOrder()` (ordine diretto senza bozza)** — solo se il carrello non ha già un codice

### 🎯 `switchToCart(cartId)` — Blocco 3.5-bis
- In `banco-controller.js`: stacca listener, imposta nuovo `_cartId`, carica carrello, riattacca
- Usata da **🔓 Sblocca e modifica**

### 📝 `wasModified`
- Salvato in `meta/wasModified` (bool)
- Settato **solo se `sbloccato`**, resta `true` per sempre
- Visibile come **✏️** accanto al nome cliente

### Numerazione fatture — Blocco 7
- **`generateInvoiceNumber()`** in `invoice-repository.js` usa `runTransaction`
- Parte da **2000**, salvato in `counters/invoiceNumber`
- **NON si resetta**
- **`peekNextInvoiceNumber()`** mostra il prossimo senza assegnarlo
- **`setNextInvoiceNumber(n)`** modifica manuale (tasto F)
- **`saveInvoiceToCart(cartId, num)`** salva `meta/invoiceNumber` + `meta/invoiceDate`

### 🖨️ Stampa senza pagina bianca
- **Regola d'oro**: MAI `window.print()` sulla pagina principale
- **Soluzione**: iframe nascosto con `srcdoc` + `iframe.contentWindow.print()`
- CSS `@media print` agisce **solo dentro l'iframe**
- **NON** usare `window.open()`
- **NON** usare `document.write()` direttamente
- **`print-orders-modal.js`**: il contenuto degli ordini DEVE essere dentro `<div class="print-area">` (bug fix 09/10) — altrimenti `body > *:not(.print-area) { display: none }` nasconde tutto

### Dialoghi nativi per BOL e F
- BOL in banco → `confirm()`
- BOL in ufficio → `openClientPicker()` + `confirm()`
- Tasto F → `prompt()` + `alert()`
- Motivo: le modali custom (`invoice-modal.js`, `invoice-number-modal.js`) esistono ma non sono utilizzate

### Cache locale articoli
- **`updateArticleInCache(key, fields)`** in `article-service.js`
- Usato da: `product-card.js`, `ufficio-controller.js`, `cassa-controller.js`, `banco-controller.js`
- **`ensureArticlesLoaded().then(() => refresh())`** in ufficio/cassa

### Sync prezzi ordine → articoli
- **`syncOrderPricesToArticles(orderId)`** in `cart-repository.js`
- Chiamato quando ordine va in `fatto`

### Calcolatore taglio/peso
- `qty = result.kg`, `unitPrice = basePrice` (invariato), `mtTotal`, `kgTotal`
- **NON cambia mai `basePrice`** dell'articolo

### 🆕 Cestino condiviso — Blocco 8
- **`trashCart(cartId, source, user)`** in `trash-repository.js`
  - Copia in `trash/carts/{id}` + rimuove da `activeCarts`
  - Aggiunge `trashedAt`, `trashedBy`, `source`
- **`restoreCart(cartId)`**: rimette in `activeCarts` con `status: "modifica"` + `isLocked: false`
- **`runScheduledCleanup()`**: chiamata al boot
  - Cestino banco → 1 volta al giorno
  - Cestino ufficio → la domenica

### 🆕 Occhio 👁️ — Blocco 4
- **`writeSeenBy(cartId, userId)`** in `cart-repository.js`
- Scrive `meta/seenBy/{userId} = Date.now()`
- Idempotente: skip se già scritto negli ultimi 60s
- **Chiamata solo da ufficio**: `editLinePrice`, `editLineQty`, `editLineDiscount`, click notifica
- **NON chiamata dal banco**
- In banco: mostrato vicino a CAMBIA
- In ufficio: nel banner
- In tendina banco: accanto al nome (solo vista normale)

### 🆕 Notifiche — Blocco 4
- **`showOfficeToast({status, clientName, body, time, onClick})`** in `js/core/notify.js`
- Modale centrale, una alla volta (`_currentNotifOverlay`)
- Colori: `ferapp-notif-bozza/nuovo/in_arrivo`
- **CSS in `<style>` dentro `ufficio.html`**
- `playBeep()`: 880Hz + 1320Hz
- `requestNotificationPermission()`: al primo click
- `showNativeNotification()`: notifica nativa PC

### 🆕 Ordinamento articoli in banco
- In `renderCart`, `lines.sort((a,b) => (b.addedAt||0) - (a.addedAt||0))`

### 🆕 Colori righe carrello (LAVORO B + fix 09/10)
- Classe `clr-{hashLineId(line.id) % 10}` in `renderCart`
- **`hashLineId(id)`** in `banco-controller.js` → hash stabile dell'ID
- Colori **trasparenti** `rgba` con opacità 9-11%:
  - clr-0 giallo · clr-1 grigio · clr-2 verde · clr-3 blu · clr-4 rosso · clr-5 viola · clr-6 arancio · clr-7 turchese · clr-8 rosa · clr-9 marrone
- CSS in `banco.css`

### 🆕 Layout riga articolo MQ (LAVORO C)
- HTML: `.cart-line-grid` (4 colonne: prod | qty-col | price | tot)
- Colonna qty (`.clv2-col-qty`): qty stepper + select unità + H×L (MQ) + PREZZO BASE
- H×L: input `data-field="h"` e `data-field="l"` → `onHlChange()` calcola `qty = h * l`
- PREZZO BASE: label `data-action="edit-price-base"` → calcolatore · riquadro `data-action="edit-price"` → tastierino
- CSS mobile in `banco.css` con `@media (max-width: 640px)` e `(max-width: 420px)`

### 🆕 Tasti azione nascosti + codice cliccabile (LAVORO D)
- `<div class="cart-line-actions" hidden>` di default
- `<button class="cart-line-code-toggle" data-action="toggle-actions">` sul codice
- Handler in `onLineAction`: toggle `hidden` + aggiorna `_openActionsLines` Set
- **Stato persistente**: `_openActionsLines` mantiene i lineId con tasti aperti → al re-render i tasti restano aperti
- Reset al cambio carrello (`switchToNewCart`, `switchToCart`)

### 🆕 Modifica prezzo inline in ufficio
- `editLinePrice` **NON usa tastierino**
- Crea `<input>` inline dentro il bottone prezzo
- **Invio** o blur salva, **Esc** annulla

### 🆕 Tasto "+ NUOVO" in banco
- `wireNewCartTab()` in `banco-controller.js`
- Click → conferma → `switchToNewCart()`

### 🆕 Cassa — testi più grandi (07/10)

### 🆕 localStorage — chiavi usate
- `ferapp_session`, `ferapp_current_cart_id`, `firebase:host:*`
- ⚠️ Se su `maxiz333.github.io` il localStorage si riempie di chiavi `cp4_*` (vecchia app): cancellarle con
Object.keys(localStorage).filter(k => k.startsWith("cp4_")).forEach(k => localStorage.removeItem(k))

text

### 🆕 Nota ordine (banco + ufficio) — comportamento unificato
- **Vuota** → textarea con placeholder
- **INVIO** o **click fuori** → salva e passa a **div giallo**
- **Shift+Invio** → va a capo
- **Click sul div giallo** → torna textarea, cursore alla fine
- **Fix cursore banco**: prima del render salvo `value` + `selectionStart/End` se textarea ha focus
- **Memoria stato**: `_orderNoteEditMode` (banco), `_editingNoteCarts` Set (ufficio)

### 🆕 Nota riga articolo in ufficio
- Visibile sotto il codice articolo con `✏️`
- Stile: **arancione** (`#fb923c`), `font-size: 1rem`, `font-weight: 700`
- **Contorno nero sottile attorno alle lettere** (`-webkit-text-stroke: 0.4px #000` + `text-shadow` 4 direzioni)
- Solo se `line.note` esiste

### 🆕 Codice articolo copiabile in ufficio
- **Giallo brillante** (`var(--primary, #facc15)`), `font-size: 0.95rem`, `font-weight: 900`, monospace
- **Click** → copia negli appunti + toast
- Fallback `execCommand('copy')` per browser vecchi
- **Fix importante**: rimosso `opacity: 0.6` da `.uff-line-sub`

### 🆕 Barra giorni ufficio
- HTML: `<nav class="uff-days" id="uffDays"></nav>` dopo i tab
- JS: `renderDaysBar()` in `ufficio-controller.js`
- Variabili: `_activeDay`, `_dayDetailOpen`
- Totali visibili solo a `papa`/`mati`/`massi`
- **Ordini e fatture separati**: `invoiceNumber` presente → fattura

### 🆕 Vista completa tendina banco
- Variabile `_ordersFullView`
- Pulsante toggle `#ordersViewToggle` in `banco.html`
- Click in `wireOrdersViewToggle()` → toggle + `renderOrdersDropdown()`
- Vista completa: raggruppata per giorno via `groupCartsByDay(carts)`
- Vista normale: lista piatta

### 🆕 Pulizia carrelli vuoti all'avvio
- **`cleanupEmptyModificaCarts()`** in `banco-controller.js`
- Chiamata in `initBancoController` dopo `runScheduledCleanup()`
- Cancella da `activeCarts` i carrelli vuoti (`lines = {}`) dell'utente corrente in stato `modifica`, tranne quello attivo

### 🆕 Barra in basso banco (09/10)
- Bottoni con icona sopra + label sotto: `.bb-btn`
- Classi colore: `.bb-bol` (viola), `.bb-riep` (giallo), `.bb-uff` (blu), `.bb-conf` (verde, flex 1.25)
- `.bb-trash` (flex 0 0 40px, rosso)
- Niente scroll orizzontale → `overflow: hidden` su `.bottom-actions`
- **Bug fix**: `updateBolButton()` aggiorna solo `.bb-icon` e `.bb-label`, non `textContent`

### 🆕 Modale riepilogo v2 (08-09/10)
- Classi CSS: `.smv2-*` in `banco.css`
- Header: cliente + counter `N/M` giallo + X
- Box TOTALE ORDINE grande
- Righe: `€ prezzo x qty unità = € totale` a destra
- Verde scuro quando spuntata
- Footer: Reset spunte (bordo giallo) + Chiudi (giallo pieno)
- **Chiudi** conferma solo se tutto spuntato
- **Memoria spunte** `savedCheckedByLineId` fuori dallo state → sopravvive a `close()`

### 🆕 Hash lineId per colore stabile
- **`hashLineId(id)`** in `banco-controller.js`
- Restituisce numero 0-9 (modulo 10)
- Usato in `renderCart` per classe colore

### 🆕 Rinomina poli → paul
- In `auth.js`: `id: "poli"`, `name: "paul"`
- Ordini esistenti con `createdBy: "poli"` continuano a funzionare

---

## 15. Come Riprendere il Lavoro

### In una NUOVA chat
Allega `PROGETTO.md` e scrivi:
> *"Leggi PROGETTO.md del mio progetto FerApp e riprendiamo dal prossimo blocco."*

### In una SESSIONE normale
1. Apri Cursor su `ferr_app definitiva`
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

### Se vedi "pagina bianca"
1. Chiudi **tutte** le tab
2. Riapri con `Ctrl + Shift + R`
3. F12 → Network → **Disable cache** → ricarica
4. Se ancora: F12 → Application → **Clear site data**

### Comandi git frequenti
```bash
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

L = lettera alfabeto alternato

Alfabeto alternato:

text
A, Z, B, Y, C, X, D, W, E, V, F, U, G, T,
H, S, I, R, J, Q, K, P, L, O, M, N
Reset giornaliero: numero e lettera si azzerano a mezzanotte

Salvataggio:

text
activeCarts/{cartId}/meta/orderNumber
activeCarts/{cartId}/meta/orderCode
counters/orderNumber
counters/lastResetDate
Implementazione: generateOrderCode(cartId) in cart-repository.js

Chiamata in sendDraftToOffice() (bozza)

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

Il CSS print.css ha body > *:not(.print-area) { display: none } → se manca .print-area il browser nasconde tutto

Aggiornamento 09/10: la stampa ordini esclude le fatture (quelle si stampano con 🖨 Stampa DDT diretta)

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

Svuotamento automatico al boot (banco 1x/die, ufficio la domenica)

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

LAVORO D: tasti azione nascosti + codice cliccabile (logica + estetica)

16.13 🗂 SESSIONE 08/10/2026 — Note, scampolo, ordine senza bozza
✅ COMPLETATO (08/10/2026)
Tasti azione logica — forbici/nota/ordina/cestino funzionanti, stato persistente

SCAMPOLO — sconto 30% automatico + tasto % editabile + importo sconto rosso

ROTOLO — rimuove sconto

SCAGLIONATO — solo stato visivo

Prezzo/totale a 3 righe con sconto (pieno barrato + giallo + rosso)

Nota riga in banco (giallo corsivo sotto la riga)

Codice articolo ufficio (giallo brillante + copia)

Ordine diretto senza bozza — anche CONFERMA genera Ordine #N - L

16.14 🗂 SESSIONE 09/10/2026 — Barra giorni, vista completa tendina, fix
✅ COMPLETATO (09/10/2026)
POMERIGGIO:

Fix stampa ordini — print-area mancante

Nota banco — fix cursore + div giallo

Nota ufficio — nuova con placeholder compatto

Codice articolo ufficio — copia + fix colore

Nota riga in ufficio — arancione + contorno nero lettere

Codice ordine anche su CONFERMA

SERA:

Pulizia carrelli vuoti — cleanupEmptyModificaCarts()

Filtro tendina stretto — vecchi visibili solo se modifica/bozza

Vista completa tendina — pulsante toggle + raggruppamento per giorno

Anteprima articoli + occhio in tendina

Fix _orderNoteEditMode — variabile mancante

Fix updateOrdersTabStyle duplicata

Barra giorni ufficio — filtra + totali per papa/mati/massi

Rinomina poli → paul

Modale riepilogo v2

Barra in basso banco — BOL/RIEP/UFF/CONFERMA/🗑, no scroll

Colori righe stabili — hash dell'ID riga

Bug fix: updateBolButton usava textContent → distruggeva gli span (fix: aggiorna solo .bb-icon e .bb-label)
Rimosso invoice.css duplicato 3 volte in banco.html

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
Ultima sessione: 09/10/2026
Versione attuale: v2.8

Fine documento.

text

---

## 🚀 Come salvarlo

1. Apri `PROGETTO.md` in Cursor
2. **Ctrl + A** (seleziona tutto)
3. **Ctrl + V** (incolla questo testo — sostituisce il vecchio)
4. **Ctrl + S**
5. Poi nel terminale: