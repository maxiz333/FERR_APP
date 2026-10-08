# 📘 FerApp — Documento di Progetto Ufficiale

**Versione**: 2.7  
**Data creazione**: 22 settembre 2026  
**Ultima modifica**: 07 ottobre 2026  
**Stato progetto**: In sviluppo attivo — Completati fino al Blocco 8 (Cestino) + Blocco 4 (Occhio + Notifiche). Prossimo: LAVORO D logica / Blocco 5 (Ordini Fornitori) / Blocco 2B.8 (Ricerca Generica)

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
- **Tendina ordini** nell'header (solo oggi + vecchi aperti) → click su un ordine apre **vista dettaglio in banco**
- **Codice ordine** generato automaticamente alla prima bozza (`Ordine #N - L`)
- **Sblocca e modifica** un ordine fatto direttamente dal banco (carica il carrello)
- **Scheda prodotto** cliccando sul nome articolo
- **Pallini stato prezzo** accanto ai prezzi
- **📄 BOL.** nella bottom bar → crea fattura con numero progressivo atomico
- **📄 F** in header → modifica prossimo numero bolla
- Stampa DDT (**funzionante dal 05/10/2026**)
- **Tasto + NUOVO** → mette in sospeso il carrello attuale e ne apre uno nuovo
- **Tab 🗑** → cestino con contatore
- **Niente pulsante CASSA nel login**: l'accesso alla cassa è nascosto nel logo

### 🏢 Ufficio (Gestione Ordini)
**A cosa serve**: mettere i prezzi agli ordini in arrivo, gestire tutto il ciclo di vita degli ordini.
- Vede tutti gli ordini/bozze in arrivo
- **Modifica prezzi, sconti, verifica prezzi** (prezzo editabile **inline**, no tastierino)
- **Modifica righe** cliccando sui prezzi/qty/sconto
- **Scheda prodotto** cliccando sul nome articolo
- **Pallini stato prezzo**
- **Occhio 👁️** se qualcuno ha visto l'ordine (tooltip *"Visto da PAPA · 22:45"*)
- **Notifiche modali** al centro schermo quando arrivano nuovi ordini da altri utenti (colori per stato)
- Blocca/sblocca ordini
- Chiude ordine ("Fatto") → va in tab FATTI + **sync prezzi automatico**
- Sblocca ordini fatti → tab NUOVI + scroll automatico
- **🖨 Stampa** in ogni ordine (multi-selezione modale)
- **🖨 Stampa DDT** (se l'ordine è fattura)
- **📄 BOL.** in ogni ordine → apre client picker + conferma → crea fattura
- **📄 F** in header → modifica prossimo numero bolla
- **Pulsante 🗑 in header** → cestino con contatore

**Accesso**: TUTTI (papa, mati, massi, poli, cassa). Tutti possono modificare tutto.

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
- **Emoji 👁️** quando qualcuno ha visto l'ordine (con tooltip "Visto da X · HH:MM")
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
- Automatico lato client
- Carrelli con spunta → si puliscono
- Carrelli `modifica` → passano all'ufficio come `nuovo` ⚠️ **NON IMPLEMENTATO**
- **Contatore ordini** (`counters/orderNumber`) → si resetta al primo ordine del nuovo giorno
- **Contatore fattura** (`counters/invoiceNumber`) → **NON si resetta** (progressivo perpetuo)

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
│ │ ├── seenBy { userId: timestamp } ← 🆕 (Blocco 4) occhio 👁️
│ │ ├── isLocked
│ │ ├── wasModified
│ │ ├── orderNumber (es. 27)
│ │ ├── orderCode (es. "A")
│ │ ├── invoiceNumber ← NUOVO (Blocco 7) — es. 2000
│ │ └── invoiceDate ← NUOVO (Blocco 7) — timestamp
│ └── lines/{lineId}/
│ ├── articleId, code, description, unit
│ ├── qty, basePrice, unitPrice
│ ├── discountPct, discountAmount, lineTotal
│ ├── totU, mtRot, kgPerUm ← 🆕 (per articoli a misura)
│ ├── kgTotal, mtTotal ← 🆕 (dal calcolatore taglio/peso)
│ ├── h, l ← 🆕 (LAVORO C) campi H × L per MQ
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
│ └── carts/{cartId}/ ← 🆕 (Blocco 8) cestino condiviso banco + ufficio
│ ├── meta, lines (copia del carrello)
│ ├── trashedAt ← timestamp cestinamento
│ ├── trashedBy ← { id, name } di chi ha cestinato
│ └── source ← "banco" | "ufficio"
│
├── supplierOrders/{supplierId}/{itemId}/
│
└── counters/
├── orderNumber ← progressivo giornaliero (reset a mezzanotte)
├── lastResetDate ← "YYYY-MM-DD"
├── invoiceNumber ← NUOVO (Blocco 7) — progressivo perpetuo, inizia da 2000
├── lastMidnightReset
├── lastTrashBancoReset ← 🆕 (Blocco 8) "YYYY-MM-DD"
└── lastTrashUfficioReset ← 🆕 (Blocco 8) "YYYY-MM-DD"

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

### 👁️ Eye Emoji (✅ Blocco 4 completato)
- `writeSeenBy(cartId, userId)` in `cart-repository.js`
- Scritto **solo dall'ufficio** su: edit reale prezzo/qty/sconto, oppure click su "Vai agli Ordini" della notifica
- Mostrato a **tutti** (in banco vicino a CAMBIA, in ufficio nel banner)
- Tooltip: *"Visto da PAPA · 22:45"*
- Sorgente dati: `meta/seenBy/{userId}` = timestamp

### 🔔 Notifiche (✅ Blocco 4 completato)
- **File**: `js/core/notify.js`
- **Modale centrale** stile vecchia app (con sfondo scuro overlay)
- **Colori per stato**: giallo `nuovo` · blu `bozza` · rosso `in_arrivo`
- **Pulsanti**: `📋 Vai agli Ordini` (colorato) + `OK` (grigio)
- **Beep** doppio tono (Web Audio API — nessun file audio)
- **Notifica nativa PC** (Notification API, permesso chiesto al primo click)
- **Niente raffica al primo load** (`_firstLoadDone` flag)
- Notifica solo se: status `nuovo/bozza/in_arrivo` + creato da **altro utente** + non già notificato
- Click "Vai agli Ordini" → scroll alla card con offset 140px + flash giallo animato

---

## 8. Funzionalità Dettagliate

### 8.1 Tab Carrello (Magazzino)

#### Ricerca articoli
- Cache locale (~19.348 articoli)
- Ricerca istantanea in RAM
- Match intelligente (codice esatto > inizio > descrizione > token)
- Max 20 risultati + "Carica altri"
- Tastierino numerico utilizzabile per quantità e prezzi

#### Riga carrello (aggiornata 07/10/2026)
- **Colori alternati** — 10 sfondi spenti ciclici (`clr-0`..`clr-9`) per distinguere righe vicine
- Quantità (+/−) e click sul numero per tastierino
- Unità: PZ, KG, MT, MQ (selettore dropdown)
- **Ordine in banco**: articolo nuovo va **in cima** (ordinato per `addedAt` desc); modifica qty NON lo fa risalire
- **Codice articolo cliccabile** → mostra/nasconde i tasti azione (forbici, %, nota, ordina, cestino)
- **Tasti azione nascosti di default** (`[hidden]`), solo estetica
- **Nome articolo cliccabile** → apre **Scheda Prodotto**
- **Pallino stato prezzo** accanto al prezzo
- **Per articoli PZ**: 1 riquadro `PREZZO` → apre tastierino
- **Per articoli KG/MT**:
  - Riga 1: `[− qty +] [KG/MT ▼] [prezzo inline] [totale]`
  - Riga 2: `PREZZO BASE [€ valore]` (scritta → calcolatore, riquadro → tastierino)
- **Per articoli MQ** (come sopra +):
  - Riga 2: `H [__] × L [__]` → calcola automaticamente `qty = H × L`
- **Header colonne** sopra la lista: `PRODOTTO · Q.TÀ · PREZZO · TOT`
- Sconto % manuale (pulsante `%`)
- **Ciclo forbici**: neutro → scampolo → rotolo → scaglionato → neutro
- Note riga (modale)
- Ordina da fornitore (dropdown)
- Elimina riga

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
- **🗑** → cestina carrello corrente (va in `trash/carts/` con `source=banco`)

#### 🆕 Tasto "+ NUOVO" in alto a sinistra (07/10/2026)
- Click → conferma → il carrello attuale **resta in sospeso** con stato `modifica`
- Viene creato un nuovo carrello vuoto in banco
- Il vecchio carrello è ancora visibile nella tendina 📋 ORDINI
- Per riprenderlo: click in tendina → **🔓 Sblocca e modifica**
- Se carrello vuoto → toast "Carrello già vuoto", non crea nulla

#### 🆕 Cestino banco (Blocco 8)
- Tab **🗑** in alto con contatore
- Click → modale con lista ordini cestinati
- Ogni voce ha: **♻️ Ripristina** + **❌ Elimina**
- Ripristina → torna in `activeCarts` con stato `modifica`
- Elimina → rimuove da `trash/carts/`
- **Click su `+ NUOVO`**: se carrello attuale vuoto → toast informativo

#### 📋 Tendina Ordini (Blocco 3.3c + aggiornamento 06/10)
- Pulsante **📋 ORDINI** nell'header con contatore
- Click → tendina POPUP con lista ordini
- **Filtro visibilità**: 
  - Ordini di **oggi** → sempre visibili
  - Ordini **vecchi** → solo se `modifica`, `bozza`, `sbloccato`, `pronto` o `wasModified: true`
  - ✅ vecchi (nuovo/in_arrivo/fatto) → nascosti dalla tendina ma restano in ufficio
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
- Pulsante **🗑** → cestina **solo se stato `modifica`**, altrimenti toast "Non cestinabile"

#### Tasto F (header banco)
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

#### Modifica righe (aggiornato 07/10/2026)
- Click su **prezzo** → **input inline** (scrive direttamente, no tastierino) → **Invio** o blur salva, **Esc** annulla
- Click su **qty** → tastierino → salva
- Click su **badge sconto** → tastierino % → salva
- Click sul **nome articolo** → **Scheda Prodotto**
- Dopo ogni modifica: `markCartAsModified(orderId)` (scrive `wasModified: true` **solo se stato `sbloccato`**)
- Aggiorna anche la cache articolo (`updateArticleInCache`) → pallini si aggiornano subito

#### Tasto BOL in ufficio (Blocco 7)
- Click **📄 BOL.** → apre **client picker** → scegli cliente → **confirm nativo** → crea fattura
- Il tasto diventa **🖨 Stampa DDT**
- Se l'ordine è già fatturato, **📄 BOL.** non appare più

#### Tasto F in ufficio (Blocco 7)
- Pulsante **📄 F** nell'header accanto a "🏭 Banco"
- Click → prompt nativo → salva su `counters/invoiceNumber`

#### Sync prezzi al "Fatto" (Blocco 2B.7)
- Prima di aggiornare lo stato a `fatto`, chiama `syncOrderPricesToArticles(orderId)`
- Confronta ogni prezzo di riga con quello attuale dell'articolo
- Se diverso → aggiorna `basePrice`, `priceLastChangedAt`, `priceVerified`
- Aggiorna anche la cache locale
- Ritorna `{ updated, skipped, articles }`

#### 🆕 Notifiche in ufficio (Blocco 4)
- **Modale centrale** con sfondo scuro quando arriva un nuovo ordine da altro utente
- **Colori**: giallo (nuovo) · blu (bozza) · rosso (in_arrivo)
- **Beep** + **notifica nativa PC** (permesso al primo click)
- Click **📋 Vai agli Ordini** → scroll all'ordine + flash giallo + scrive `seenBy`
- Click **OK** / fuori / Esc → chiude senza azione
- Niente raffica al primo load

#### 🆕 Cestino ufficio (Blocco 8)
- Pulsante **🗑** in header con contatore
- Click → modale con lista ordini cestinati (banco + ufficio)
- Azioni identiche a cestino banco
- Tendina banco non mostra più l'ordine cestinato

#### 🆕 Occhio 👁️ (Blocco 4)
- Nel banner dell'ordine, in alto a destra
- Appare se `meta/seenBy` contiene almeno un utente
- Tooltip: *"Visto da PAPA · 22:45"*
- Mostrato a **tutti** (anche te stesso)

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
┌─────────────────────────────────────┐
│ 📥 IMPORTAZIONE DATI │
├─────────────────────────────────────┤
│ [ ARTICOLI ] [ CLIENTI ] │
├─────────────────────────────────────┤
│ (drag&drop + anteprima + import) │
└─────────────────────────────────────┘

text

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

### 8.9 Cassa (Scontrino) — aggiornato al Blocco 3B-bis + 07/10/2026

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
  - Descrizione + **codice articolo giallo più grande e su una riga (no a capo)**
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

#### Aggiornamento 07/10/2026
- Codice articolo più grande (14px, no a capo)
- Nome articolo 15px
- Qty badge 14px
- Prezzo e totale riga 16px
- Nome cliente header 18px

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

### Layout Banco (aggiornato 07/10/2026)
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
│ └──────────────────────────────────────────────────┘ │
│ [📝 Nota ordine] │
├────────────────────────────────────────────────────────┤
│ TOTALE € 0,00 │
│ [RIEP.] [UFF.] [✅ CONFERMA] [📄 BOL.] [🗑] │
└────────────────────────────────────────────────────────┘

text

**Note**:
- Il logo RATTAZZI è cliccabile → apre la Cassa
- **📄 F** in header → modifica numero bolla
- **📄 BOL.** in bottom bar → crea fattura
- "CASSA" non è più mostrato nel login (accesso nascosto nel logo)
- **Colori righe**: 10 sfondi spenti ciclici per distinguere righe vicine
- **Codice articolo cliccabile** → toggle tasti azione

### Layout Ufficio
┌──────────────────────────────────────────────────┐
│ ⚙ RATTAZZI [📄 F] [🗑 N] [🏭 Banco] [🚪] │
├──────────────────────────────────────────────────┤
│ [🟡 NUOVI] [🟢 FATTI] [📋 TUTTI] [🟣 PRONTO] │
├──────────────────────────────────────────────────┤
│ 🔍 Cerca… [📖] │
├──────────────────────────────────────────────────┤
│ [card ordine espansa] │
│ banner colorato per stato + 👁️ se visto │
│ PRODOTTO | Q.TÀ | PREZZO | TOT │
│ [✅ Fatto] │
│ [🖨 Stampa] [📋 Pronto] [🗑 Elimina] │
│ [📄 BOL.] ← solo se non fatturato │
└──────────────────────────────────────────────────┘

text

### Elementi UI
- Banner colorati per stati ordine
- Badge per stati e conteggi
- Toast per notifiche temporanee (in banco)
- **Modale centrale** per notifiche ufficio (Blocco 4)
- Modali per input e conferme
- Tastierino numerico custom
- **Pallini stato prezzo**
- **Scheda prodotto** con tendine espandibili
- **Dialoghi nativi** (`confirm`, `prompt`, `alert`) per BOL e tasto F
- Icona **✏️** accanto al nome cliente
- **Icona 👁️** quando qualcuno ha visto l'ordine
- **Input inline** per modifica prezzo (ufficio)
- **Colori alternati righe** (banco)

### Rimosso dall'app attuale
- Tasto % nell'header
- Tab Inventario, Fatture, Cartellini, Altro
- Partita IVA obbligatoria alla creazione cliente
- **Pulsante "CASSA" verde dal login**
- **Tastierino per modifica prezzo in ufficio** (sostituito da input inline)

---

## 10. Struttura File Completa

### ✅ Completati
ferr_app definitiva/
├── index.html ✅
├── banco.html ✅
├── ufficio.html ✅
├── cassa.html ✅
├── import.html ✅
├── PROGETTO.md ✅ (v2.7)
├── assets/
│ └── css/
│ ├── base.css ✅
│ ├── components.css ✅ (+ z-index client picker)
│ ├── theme-dark.css ✅
│ ├── theme-light.css ✅
│ ├── banco.css ✅ (+ .clv2-* layout riga + .clr-* colori)
│ ├── ufficio.css ✅ (+ .uff-inline-price-input)
│ ├── cassa.css ✅ (+ testi più grandi)
│ ├── print.css ✅ (3.8)
│ ├── product-card.css ✅ (2B.6)
│ ├── price-dot.css ✅ (2B.7)
│ └── invoice.css ✅ (7)
└── js/
├── app.js ✅
├── core/
│ ├── firebase-config.js ✅
│ ├── firebase-init.js ✅ (con runTransaction esportato)
│ ├── auth.js ✅
│ ├── file-parser.js ✅ (+ parseClientsFile)
│ ├── notify.js ✅ 🆕 (Blocco 4)
│ └── utils.js ❌
├── data/
│ ├── article-repository.js ✅
│ ├── cart-repository.js ✅ (+ updateLineLock, markCartAsModified, generateOrderCode, syncOrderPricesToArticles, writeSeenBy)
│ ├── client-repository.js ✅
│ ├── invoice-repository.js ✅ 🆕 (Blocco 7)
│ ├── trash-repository.js ✅ 🆕 (Blocco 8)
│ ├── order-repository.js ❌
│ └── supplier-repository.js ❌
├── domain/
│ ├── article-service.js ✅ (+ updateArticleInCache)
│ ├── cart-service.js ✅ (+ totU/mtRot/kgPerUm in createLineFromArticle)
│ ├── client-service.js ✅
│ ├── pricing-service.js ❌
│ ├── order-service.js ❌
│ ├── compare-service.js ❌
│ ├── supplier-service.js ❌
│ └── ddt-service.js ❌
└── ui/
├── components/
│ ├── search-bar.js ✅
│ ├── keypad.js ✅
│ ├── cut-calculator.js ✅ (funzionante dal 04/10)
│ ├── modal.js ✅
│ ├── client-picker.js ✅
│ ├── summary-modal.js ✅
│ ├── compare-articles.js ✅ (pronto, da collegare in 2B.8)
│ ├── cart-line.js ✅
│ ├── product-card.js ✅ 🆕 (2B.6)
│ ├── print-orders-modal.js ✅ 🆕 (3.8)
│ ├── price-dot.js ✅ 🆕 (2B.7)
│ ├── invoice-modal.js ✅ 🆕 (7, creato ma attualmente non usato — vedi Note)
│ ├── invoice-number-modal.js ✅ 🆕 (7, creato ma attualmente non usato — vedi Note)
│ ├── print-invoice.js ✅ 🆕 (7, con iframe srcdoc)
│ ├── global-search.js ❌
│ ├── supplier-dropdown.js ❌
│ └── toast.js ❌
├── controllers/
│ ├── banco-controller.js ✅
│ ├── ufficio-controller.js ✅
│ └── cassa-controller.js ✅
└── views/
├── login-view.js ✅ (senza CASSA)
├── import-view.js ✅ (tab clienti)
├── banco-view.js ✅
├── ufficio-view.js ✅
├── clienti-view.js ❌
├── ddt-view.js ❌
└── cassa-view.js ✅

text

---

## 11. Ambiente di Sviluppo

### Setup
- **Editor**: Cursor
- **Estensione**: Live Server (Ritwick Dey)
- **Server**: `http://127.0.0.1:5500`
- **Browser**: Chrome/Edge con DevTools (F12)
- **Sistema**: Windows
- **Deploy**: GitHub Pages → `https://maxiz333.github.io/FERR_APP/`

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

### GitHub
- **Repo**: `https://github.com/maxiz333/FERR_APP`
- **Sito online**: `https://maxiz333.github.io/FERR_APP/`
- **Deploy**: automatico al push su `main`
- **Workflow**: `pages-build-deployment` (GitHub Actions)

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
- ✅ **BLOCCO 4** — Occhio 👁️ + Notifiche **COMPLETATO 06-07/10/2026**
- ✅ **BLOCCO 5A** — Import Clienti (~3.651) **COMPLETATO 04/10/2026**
- ✅ **BLOCCO 6** — Anagrafica Clienti **COMPLETATO 04/10/2026**
- ✅ **BLOCCO 7** — Fatturazione DDT **COMPLETATO 05/10/2026**
- ✅ **BLOCCO 8** — Cestino condiviso **COMPLETATO 06/10/2026** (manca solo reset mezzanotte "carrelli modifica → nuovo")
- ✅ **LAVORO A** — Ordinamento articoli banco (nuovo in cima) **07/10/2026**
- ✅ **LAVORO B** — 10 colori sfondi righe vicine **07/10/2026**
- ✅ **LAVORO C** — Layout MQ (H×L + PREZZO BASE + header colonne) **07/10/2026**
- ✅ **LAVORO D (estetica)** — Tasti azione nascosti + codice cliccabile **07/10/2026**
- ✅ **Header** — Logo → Cassa, toggle Ufficio/Banco, colori uniformati
- ✅ **GitHub Pages** — Deploy automatico su push
- ✅ **Bug fix 28/09** — `isLocked`, loop `Sync totali`, `wireBottomButtons`, `saveOrderNote`
- ✅ **Bug fix 29-30/09** — `markCartAsModified` solo se `sbloccato`, doppia `markOrderAsModified`, graffa `else if`, tendina chiude su sfondo
- ✅ **Bug fix 01-05/10** — Fix calcolatore taglio/peso, fix cassa refresh live, fix sync prezzi, fix pagina bianca stampa/BOL, rimozione CASSA dal login, fix Banco ↔ Ufficio per tutti
- ✅ **Bug fix 06-07/10** — Fix tasto "+ NUOVO", fix cass a testi, fix ufficio tastierino prezzo → inline

### 🔄 IN CORSO

- *(nessuno)*

### 📋 DA FARE (in ordine di priorità)

| # | Blocco | Cosa | Complessità |
|---|---|---|---|
| 1 | **LAVORO D logica** | Testare la logica dei tasti azione dentro il toggle (forbici, %, nota, ordina, cestino) | 🟡 Bassa |
| 2 | **8-bis** | Reset mezzanotte "carrelli `modifica` → `nuovo`" (parte mancante) | 🟡 Media |
| 3 | **2B.8** | Barra Ricerca Generica (nel logo) | 🟡 Media |
| 4 | **5** | Ordini Fornitori + CSV (con `addedAt`, `addedBy`, `lastOrderedAt` articolo) | 🟠 Alta |
| 5 | **10** | Scaglioni (auto-apply + UI) | 🟡 Media |
| 6 | **11** | Tema Light + Selettore | 🟡 Media |
| 7 | **12** | Regole Firebase + Deploy produzione | 🟠 Alta |
| 8 | **3.7 p2** | Anti-truffa | 🟠 Rinviato alla fine |

### 📌 RINVIATI

- 📌 **BLOCCO 13** — Tasti avanti/indietro
- 📌 **BLOCCO 14** — Categorie/Sottocategorie
- 📌 **FUTURO** — Integrazione registratore di cassa fiscale
- 📌 **FUTURO** — Fattura fiscale (la fa il commercialista)
- 📌 **Occhio in Cassa** — Mai implementato
- 📌 **Occhio condizionale nella preview banco** — attualmente fisso
- 📌 **Codice fornitore `f. XXX`** — Serve import (Blocco 5)

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
| **4** | **Occhio + Notifiche** | **✅ COMPLETATO 06-07/10** |
| 5 | Ordini Fornitori + CSV | ⏳ |
| **5A** | **Import Clienti** | **✅ COMPLETATO (~3.651)** |
| **6** | **Anagrafica Clienti** | **✅ COMPLETATO** |
| **7** | **Fatturazione DDT** | **✅ COMPLETATO** |
| **8** | **Cestino + Reset** | **✅ COMPLETATO** (manca solo reset "modifica → nuovo") |
| 9 | Storico prezzi | ✅ (in scheda prodotto) |
| 10 | Scaglioni | ⏳ |
| 11 | Tema Light | ⏳ |
| 12 | Regole + Deploy | ⏳ |
| **LAVORO A** | **Ordinamento articoli banco** | **✅ COMPLETATO 07/10** |
| **LAVORO B** | **10 colori righe** | **✅ COMPLETATO 07/10** |
| **LAVORO C** | **Layout MQ (H×L + PREZZO BASE)** | **✅ COMPLETATO 07/10** |
| **LAVORO D** | **Tasti nascosti (estetica)** | **✅ COMPLETATO 07/10** (logica da testare) |

### 🎯 Prossimo passo immediato

**LAVORO D logica** (testare tasti azione dentro il toggle) oppure **Reset mezzanotte "carrelli modifica → nuovo"** oppure **Blocco 5 — Ordini Fornitori + CSV**. Vedi Sezione 16.

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

### Numerazione fatture — Blocco 7
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

### Dialoghi nativi per BOL e F
- **BOL in banco** → `confirm()` nativo
- **BOL in ufficio** → `openClientPicker()` + `confirm()` nativo
- **Tasto F** → `prompt()` + `alert()` nativi
- **Motivo**: le modali custom (`invoice-modal.js`, `invoice-number-modal.js`) **esistono nel progetto** ma **non sono attualmente utilizzate** perché causavano problemi di pagina bianca in combinazione con il client picker. Si preferisce il dialogo nativo che **non tocca mai il DOM**.

### Cache locale articoli
- **`updateArticleInCache(key, fields)`** in `article-service.js` → aggiorna un articolo in cache **senza ricaricare** tutti i 19k
- Usato da: `product-card.js`, `ufficio-controller.js`, `cassa-controller.js`, `banco-controller.js` (dopo sync)
- **`ensureArticlesLoaded().then(() => refresh())`** in ufficio/cassa → pallini visibili automaticamente al primo caricamento

### Sync prezzi ordine → articoli
- **`syncOrderPricesToArticles(orderId)`** in `cart-repository.js`
- Chiamato quando un ordine va in `fatto` (da ufficio e cassa)
- Confronta ogni prezzo riga con quello attuale dell'articolo
- Se diverso → aggiorna `basePrice`, `priceLastChangedAt`, `priceVerified`
- Se identico → **skip** (no scrittura inutile)
- Ritorna `{ updated, skipped, articles: [{key, price}] }`

### Calcolatore taglio/peso — comportamento
- **`qty = result.kg`** (peso, non metri)
- **`unitPrice = line.basePrice`** (invariato, €/kg)
- **`mtTotal`** = metri tagliati (annotazione)
- **`kgTotal`** = peso (annotazione)
- **NON cambia mai `basePrice`** dell'articolo → il sync salva il prezzo corretto in €/kg

### 🆕 Cestino condiviso — Blocco 8
- **`trashCart(cartId, source, user)`** in `trash-repository.js`
  - Copia in `trash/carts/{id}` + rimuove da `activeCarts`
  - Aggiunge `trashedAt`, `trashedBy: {id, name}`, `source: "banco"|"ufficio"`
- **Comportamento banco**: cestina **solo** se stato `modifica`, altrimenti solo nuovo carrello
- **Comportamento ufficio**: cestina sempre → sparisce anche dalla tendina banco
- **`restoreCart(cartId)`**: rimette in `activeCarts` con stato `modifica` + `isLocked: false`
- **`runScheduledCleanup()`**: chiamata al boot app (in `initBancoController` e `initUfficioController`)
  - Cestino **banco**: svuotato 1 volta al giorno (`counters/lastTrashBancoReset`)
  - Cestino **ufficio**: svuotato la **domenica** (`counters/lastTrashUfficioReset`)

### 🆕 Occhio 👁️ — Blocco 4
- **`writeSeenBy(cartId, userId)`** in `cart-repository.js`
- Scrive `activeCarts/{id}/meta/seenBy/{userId} = Date.now()`
- Idempotente: skip se già scritto negli ultimi 60s
- **Chiamata solo da ufficio** in:
  - `editLinePrice`, `editLineQty`, `editLineDiscount` (dopo il `if (result == null) return`)
  - Click su "Vai agli Ordini" dalla notifica
- **NON chiamata dal banco** (per evitare occhio immediato su ordini in modifica)

### 🆕 Notifiche — Blocco 4
- **`showOfficeToast({status, clientName, body, time, onClick})`** in `js/core/notify.js`
- Modale centrale con `_currentNotifOverlay` (una alla volta)
- Colori per classe CSS: `ferapp-notif-bozza`, `ferapp-notif-nuovo`, `ferapp-notif-in_arrivo`
- **CSS in `ufficio.html`** dentro `<style>` (non in file separato)
- `playBeep()`: doppio tono (880Hz + 1320Hz, 0.10s + 0.12s)
- `requestNotificationPermission()`: chiesta al primo click utente
- `showNativeNotification()`: notifica nativa PC

### 🆕 Ordinamento articoli in banco
- In `renderCart`, `lines.sort((a,b) => (b.addedAt||0) - (a.addedAt||0))`
- Modifiche qty/prezzo/sconto **NON** cambiano `addedAt`, quindi non fanno risalire
- Solo ufficio resta invariato

### 🆕 Colori alternati righe carrello (LAVORO B)
- Classe `clr-{idx % 10}` assegnata in `renderCart`
- 10 sfondi spenti (grigio/blu/rosso/giallo/verde/viola/arancio/turchese/rosa/neutro)
- CSS in `banco.css`

### 🆕 Layout riga articolo MQ (LAVORO C)
- **HTML**: `.cart-line-grid` (4 colonne: prod | qty-col | price | tot)
- **Colonna qty** (`.clv2-col-qty`): qty stepper + select unità + H×L (MQ) + PREZZO BASE
- **H×L**: input `data-field="h"` e `data-field="l"`, `onHlChange()` calcola `qty = h * l` e la salva su Firebase
- **PREZZO BASE**: label `data-action="edit-price-base"` → calcolatore · riquadro `data-action="edit-price"` → tastierino €/MQ
- **Prezzo inline** (`.cart-line-price-inline`): a destra, apre tastierino
- **Totale inline** (`.cart-line-total-inline`): a destra
- **CSS** in `banco.css` con `@media (max-width: 640px)` e `@media (max-width: 420px)` per mobile compatto
- **Header colonne** sopra la lista: `.cart-cols-header` con `PRODOTTO · Q.TÀ · PREZZO · TOT`

### 🆕 Tasti azione nascosti + codice cliccabile (LAVORO D — solo estetica)
- **HTML**: `<div class="cart-line-actions" hidden>` di default
- **Codice articolo**: `<button class="cart-line-code-toggle" data-action="toggle-actions">`
- **Handler** in `onLineAction`: se `action === "toggle-actions"` → toggle attributo `hidden` sul `.cart-line-actions`
- **CSS**: `.cart-line-actions[hidden] { display: none !important; }`
- **⚠️ La logica dei tasti (forbici, %, nota, ordina, cestino) non è ancora testata** dopo questa modifica

### 🆕 Modifica prezzo inline in ufficio
- In `ufficio-controller.js`, `editLinePrice` **NON usa più il tastierino**
- Crea un `<input>` inline dentro il bottone del prezzo
- **Invio** o **blur** salva, **Esc** annulla
- CSS `.uff-inline-price-input` in `ufficio.css`

### 🆕 Tasto "+ NUOVO" in banco
- `wireNewCartTab()` in `banco-controller.js`
- Click → conferma → `switchToNewCart()` (il carrello attuale resta in `activeCarts` con stato `modifica`)

### 🆕 Cassa — testi più grandi (07/10)
- `.cas-det-name` 15px · `.cas-det-code` 14px (con `nowrap`) · `.cas-det-qty-badge` 14px · `.cas-det-price` e `.cas-det-linetotal` 16px · `.cas-det-client` 18px

### 🆕 localStorage — chiavi usate
- `ferapp_session` — utente loggato
- `ferapp_current_cart_id` — carrello attivo banco
- `firebase:host:*` — creata automaticamente dall'SDK

**⚠️ Attenzione**: sul dominio `maxiz333.github.io` le chiavi `cp4_*` della **vecchia app** (cp4) possono ripresentarsi se qualcuno usa la vecchia app. Se il `localStorage` si riempie di nuovo, cancellare le `cp4_*` con:
Object.keys(localStorage).filter(k => k.startsWith("cp4_")).forEach(k => localStorage.removeItem(k))

text

### 🆕 GitHub Pages
- **Repo**: `https://github.com/maxiz333/FERR_APP`
- **Sito**: `https://maxiz333.github.io/FERR_APP/`
- **Deploy**: automatico al push su `main`
- **Workflow**: `pages-build-deployment` (GitHub Actions)
- **⚠️ Se il push dà `rejected non-fast-forward`**: `git pull --rebase origin main` poi `git push`

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
📌 Contesto (perché serve)
Il 90% degli ordini usa "Cliente 1" generico (no nome)

Un cliente può fare 2 ordini su banchi diversi

In ufficio può fingere di aver fatto solo 1 ordine

Serve un sistema per: 1) dare un codice al cliente, 2) verificare la presenza di altri ordini, 3) avvisare l'operatore

Il cliente NON deve capire quanti ordini sono stati fatti oggi

✅ PARTE 1 — COMPLETATA (30/09/2026)
Formato codice: Ordine #N - L

N = numero progressivo (1, 2, 3, ...)

L = lettera alfabeto alternato

Alfabeto alternato:

text
A, Z, B, Y, C, X, D, W, E, V, F, U, G, T,
H, S, I, R, J, Q, K, P, L, O, M, N
Esempi:

Numero	Lettera
Ordine #1	A
Ordine #2	Z
Ordine #3	B
Ordine #4	Y
...	...
Ordine #26	N
Ordine #27	A (ricomincia lettera)
Ordine #28	Z
Reset giornaliero:

Sia il NUMERO sia la LETTERA si azzerano a mezzanotte

Domani riparte da: #1 - A

Salvataggio Firebase:

text
activeCarts/{cartId}/meta/orderNumber = 27
activeCarts/{cartId}/meta/orderCode = "A"
counters/orderNumber = 27              (contatore globale del giorno)
counters/lastResetDate = "2026-09-30"  (per reset automatico)
Implementazione:

generateOrderCode(cartId) in cart-repository.js

Chiamata in banco-controller.js dentro sendDraftToOffice() (pulsante UFF.), solo se il carrello non ha già un codice

Visualizzato in banco (barra cliente + tendina + vista dettaglio)

Visualizzato in ufficio (card ordine)

Visualizzato in cassa (card lista + dettaglio)

⏳ PARTE 2 — ANTI-TRUFFA (da fare)
Problema specifico:

Cliente entra → fa ordine al Banco 1 → va al Banco 2 → fa altro ordine

In ufficio finge di aver fatto solo 1 ordine

L'ufficio rischia di incassare solo 1 dei 2

Soluzione (doppia protezione):

1. Quando l'ufficio cerca un codice in barra ricerca:

Trova l'ordine principale

Sotto mostra anche "⚠️ Altri ordini recenti (ultimi 10 min)"

Lista di ordini aperti con orario simile

2. Al click FATTO su un ordine:

Se esistono altri ordini aperti con orario ±10 min:

Popup: "Questo cliente ha altri N ordini aperti:

Ordine #28 - Z (14:33) €23,10

Ordine #29 - B (14:35) €12,00
Chiudi solo questo o anche gli altri?"

Opzioni: [Solo questo] / [Chiudi anche gli altri] / [Annulla]

Filosofia:

Il software mette in guardia l'operatore

L'operatore DECIDE (non è automatico)

Zero codici visibili al cliente

Zero numeri rivelati al cliente

⚠️ Nota utente: "non metteremo più il timer ci limitiamo ad usare il numero dal progetto"

16.2 🔓 BLOCCO 3.5-bis — Sblocco Ordine
✅ COMPLETATO (30/09/2026)
Dove
Ufficio + Banco + Cassa

Come funziona
Ordine di default bloccato in stato fatto (sola lettura)

Pulsante "🔓 Sblocca e modifica":

In Ufficio: accanto a Fatto/Pronto/Elimina → cambia stato sbloccato + isLocked: false + tab NUOVI + scroll automatico

In Banco: dentro vista dettaglio ordine → cambia stato sbloccato + carica l'ordine come carrello attivo in banco

In Cassa: dentro dettaglio → cambia stato sbloccato + isLocked: false → l'ordine sparisce dalla cassa

Stato Firebase
text
activeCarts/{cartId}/meta/isLocked   = true | false
activeCarts/{cartId}/meta/wasModified = true (dopo la prima modifica post-sblocco)
Icona ✏️ (matita)
getClientIcon(status, wasModified) in banco-controller.js

✏️ se status === "modifica" oppure wasModified === true

🔵 se status === "bozza"

Nessuna icona negli altri casi

Chiamate scrittura wasModified
Banco: markOrderAsModified() in banco-controller.js (chiamata in onArticleSelected + onLineAction)

Ufficio: markCartAsModified(orderId) in cart-repository.js (chiamata in editLinePrice/Qty/Discount)

Entrambe scrivono SOLO se lo stato è sbloccato (mai su ordini normali)

16.3 💰 BLOCCO 3B-bis — Cassa stile COMPATTO
✅ COMPLETATO (30/09/2026)
Layout
LISTA (schermata principale):

Card piccole:

Cliente (oppure Ordine #N - L)

Stato + codice ordine

N° articoli + data

Totale grande giallo a destra

Border-left colorato (rosso per in_arrivo, giallo per nuovo)

Click su una card → DETTAGLIO

DETTAGLIO (click su una card):

Pulsante ← per tornare alla lista

Header: cliente (oppure Ordine #N - L) + #xxxxxx · data · N articoli

Righe articoli con:

Numero riga + descrizione

Codice articolo (sotto, giallo)

BADGE QTY GIALLO ben visibile

Prezzo unitario (× € 1,80)

Pallino stato prezzo

Totale riga (a destra, giallo)

Totale ordine grande in basso

Pulsante 🔓 Sblocca e modifica in basso a sinistra

Pulsante ✅ FATTO in basso a destra

Modalità EDIT
Di default: sola lettura

Click 🔓 Sblocca e modifica → edit mode locale (NON cambia stato Firebase):

Il pulsante diventa 🔒 Blocca modifiche (giallo)

Badge qty e prezzo diventano cliccabili (hover)

In edit mode:

Click su badge qty → tastierino → salvataggio automatico

Click su prezzo → tastierino → salvataggio automatico

Refresh live: riga aggiornata subito

Ricalcolo totale automatico

Click 🔒 Blocca modifiche → torna sola lettura

Azioni
✅ FATTO → stato fatto, sparisce dalla cassa + sync prezzi

🔓 Sblocca e modifica → stato sbloccato, sparisce dalla cassa (va in Ufficio tab NUOVI con banner 🟢 SBLOCCO)

Screenshot riferimento
Vecchia app FerApp (foto lista compatta + foto dettaglio aperto).

16.4 🖨️ BLOCCO 3.8 — Stampa Multi-Ordine
✅ COMPLETATO (01/10/2026)
Dove
Ufficio: tasto "🖨 Stampa" dentro ogni ordine

Banco: tasto "🖨 Stampa DDT" nel popup ordini

Flusso ufficio
Click su "🖨 Stampa" in un ordine

Si apre modale con lista ordini filtrati (stesso filtro attivo), ordine corrente pre-selezionato

Checkbox per selezione multipla + "Seleziona tutti"

"🖨 STAMPA" → anteprima di stampa

Flusso banco
Click su "🖨 Stampa DDT" nel dettaglio ordine

Stampa solo quell'ordine (nessuna modale)

Contenuto ogni ordine stampato
Codice ordine oppure Fattura N · NOME

Cliente + matita ✏️

Data + ora + operatore

Righe: descrizione + codice + qty + prezzo + totale

Totale ordine

Note (se presenti)

Layout stampa
A4 verticale

page-break-inside: avoid

Solo nero/bianco

Nessun header/footer browser

Implementazione
assets/css/print.css

js/ui/components/print-orders-modal.js (con iframe srcdoc)

File modificati
ufficio.html, banco.html, ufficio-controller.js, banco-controller.js

16.5 📦 BLOCCO 2B.6 — Scheda Prodotto
✅ COMPLETATO (04/10/2026)
Come si apre
Click sul nome articolo nel carrello banco

Click sul nome articolo nella riga dell'ordine ufficio

Campi
DESCRIZIONE (editabile)

COD. FORN. (editabile)

MIO COD. (readonly, grigio)

PREZZO + pallino stato verifica

PRZ. VECCHIO (tendina 5 prezzi FIFO: data, prezzo, sorgente)

ACQ. (editabile)

SPECIFICHE TECNICHE (textarea, placeholder)

QUANTITÀ (stepper −/+)

UNITÀ (dropdown PZ/KG/MT/MQ)

SCORTA MIN. (bordo rosso)

TOT.U (solo KG/MT/MQ)

MT.ROT (solo KG/MT/MQ)

PESO PER UNITÀ (solo KG/MT/MQ, placeholder Es: 0.289 (Peso al mt/mq))

CORRELATI (tendina espandibile)

SCAGLIONI (tendina espandibile)

Pulsanti: ❌ Annulla · 💾 Salva

Regole dinamiche
TOT.U / MT.ROT / PESO visibili solo per KG/MT/MQ

Nota gialla "Prezzo Base collegato (€/kg) e usato nel magazzino" visibile solo per articoli a misura

Quando TOT.U o MT.ROT cambiano → ricalcola automaticamente kgPerUm = totU / mtRot

Salvataggio
Se cambia prezzo → vecchio in storico (max 5) + priceLastChangedAt = now + priceVerified = true

Aggiorna cache locale con updateArticleInCache

Se aperta su ordine in modifica o sbloccato → aggiorna anche la riga carrello

Se aperta su ordine già inviato → NON aggiorna la riga (mantiene prezzo inviato)

File creati
assets/css/product-card.css

js/ui/components/product-card.js

File modificati
banco.html, ufficio.html, banco-controller.js, banco.css, ufficio-view.js, ufficio.css, ufficio-controller.js

16.6 🎯 BLOCCO 2B.7 — Pallini Stato Prezzo
✅ COMPLETATO (04/10/2026)
Dove
Carrello banco

Righe ordine ufficio

Righe dettaglio cassa

Scheda prodotto

Colori
⚫ grigio — mai verificato

🟢 verde — verificato 0-1 mese

🟡 giallo — 1-3 mesi

🟠 arancione — 3-6 mesi

🔴 rosso — 6-12 mesi

🟣 viola — 12+ mesi

Update automatico
Ufficio e cassa caricano la cache in background

Al termine: .then(() => refresh()) → pallini appaiono automaticamente

File creati
assets/css/price-dot.css

js/ui/components/price-dot.js

File modificati
banco.html, ufficio.html, cassa.html, banco-controller.js, ufficio-controller.js, ufficio-view.js, cassa-controller.js, cassa-view.js

16.7 📥 BLOCCO 5A — Import Clienti
✅ COMPLETATO (04/10/2026)
Dove
Tab CLIENTI in import.html

Parser
parseClientsFile(text) in file-parser.js

Formato: VecchioCodice='NOME'#Indirizzo='...'#c5='CITTÀ'#Provincia='XX'#IdAnagrafica='12345'

Decodifica HTML entities (&#x27; → ', &amp; → &, ecc.)

Import
Blocchi da 500

Progress bar

Anteprima primi 10 clienti (Nome · Indirizzo · Città · Prov.)

Chiave = VecchioCodice (sanitizzato)

Importati
~3.651 clienti ✅

File modificati
file-parser.js, import.html, import-view.js

16.8 👥 BLOCCO 6 — Anagrafica Clienti
✅ COMPLETATO (04/10/2026)
Cosa fa
Client picker legge da Firebase clients/

Ricerca per nome/città con debounce

Click su cliente → salvato su meta.clientId + meta.clientName

"Crea nuovo cliente" funziona

"Cliente 1" generico se non specificato

Accesso
Da banco: pulsante 👤 CAMBIA nella barra cliente

Da ufficio: nel popup BOL (Blocco 7)

16.9 📄 BLOCCO 7 — Fatturazione DDT
✅ COMPLETATO (05/10/2026)
Dove
Banco: pulsante 📄 BOL. nella bottom bar + pulsante 📄 F in header

Ufficio: pulsante 📄 BOL. in ogni ordine + pulsante 📄 F in header

Flusso banco
Click 📄 BOL.

confirm nativo con cliente + anteprima numero

OK → numero atomico assegnato + salvato su meta.invoiceNumber

Barra cliente diventa Fattura N · NOME CLIENTE

Tasto bottom bar diventa 🖨 Stampa DDT

Click → iframe nascosto → anteprima di stampa

Flusso ufficio
Click 📄 BOL. su un ordine

Apre client picker → scegli cliente → OK

confirm nativo → OK → numero assegnato

Titolo ordine diventa Fattura N · NOME CLIENTE

Tasto 📄 BOL. sparisce, il tasto 🖨 Stampa diventa 🖨 Stampa DDT

Tasto F (banco + ufficio)
Click 📄 F

Prompt nativo: "Numero prossima bolla:" con valore corrente

Salva su counters/invoiceNumber

Alert ✅ Prossima bolla: X

Numerazione
Parte da 2000

Progressivo atomico (runTransaction)

Non si resetta mai

Zero duplicati anche con 2 postazioni in contemporanea

Template DDT
Attualmente provvisorio (vedi sezione 8.7)

Quando arriverà il template definitivo dall'utente, sostituire renderDDT() in print-invoice.js e il CSS in invoice.css

Stampa
Iframe isolato con srcdoc → mai pagina bianca, mai ricarica

CSS @media print agisce solo dentro l'iframe

File creati
js/data/invoice-repository.js

js/ui/components/invoice-modal.js (creato ma non utilizzato — vedi Note)

js/ui/components/invoice-number-modal.js (creato ma non utilizzato — vedi Note)

js/ui/components/print-invoice.js

assets/css/invoice.css

File modificati
banco.html, ufficio.html, banco.css, ufficio.css, banco-controller.js, ufficio-controller.js, ufficio-view.js, cart-repository.js

16.10 🗑 BLOCCO 8 — Cestino Condiviso
✅ COMPLETATO (06/10/2026)
File creato
js/data/trash-repository.js

Funzioni esportate
trashCart(cartId, source, user) — sposta in cestino

listenTrashCarts(cb) — listener trash/carts/

restoreCart(cartId) — rimette in activeCarts come modifica

deleteCartPermanently(cartId) — rimuove dal cestino

emptyTrashBySource(source) — svuota per fonte

runScheduledCleanup() — pulizia automatica al boot

Comportamento
Cestino condiviso (trash/carts/) tra banco e ufficio

Banco, stato modifica → cestina

Banco, altri stati (bozza/nuovo/in_arrivo/fatto/pronto/sbloccato) → NON cestina, solo nuovo carrello

Ufficio → cestina sempre

Preview ordine in banco → cestina solo se modifica

Ripristino → torna in activeCarts con status: "modifica" + isLocked: false

Svuotamento automatico al boot:

Cestino banco: 1 volta al giorno

Cestino ufficio: la domenica

UI
Banco: tab 🗑 con contatore + modale con lista

Ufficio: pulsante 🗑 in header con contatore + modale identica (usa banco.css)

Ogni voce: ♻️ Ripristina + ❌ Elimina

Tendina banco — filtro aggiornato
isVisibleInDropdown(cart):

Ordini di oggi → sempre visibili

Ordini vecchi → solo se modifica, bozza, sbloccato, pronto o wasModified: true

✅ vecchi (nuovo/in_arrivo/fatto) → nascosti dalla tendina ma restano in ufficio

⏳ PARTE MANCANTE
Reset mezzanotte "carrelli modifica → nuovo": i carrelli in modifica a mezzanotte devono passare automaticamente all'ufficio come nuovo. MAI IMPLEMENTATO.

16.11 👁️ BLOCCO 4 — Occhio + Notifiche
✅ COMPLETATO (06-07/10/2026)
File creato
js/core/notify.js

Funzioni esportate
playBeep() — doppio tono Web Audio API

requestNotificationPermission() — chiede permesso (una volta)

showOfficeToast(opts) — modale centrale colorata

Occhio
writeSeenBy(cartId, userId) in cart-repository.js

Scritto solo dall'ufficio su:

Edit reale (prezzo/qty/sconto)

Click su "Vai agli Ordini" della notifica

NON scritto dal banco (evita occhio immediato su ordini in modifica)

Mostrato a tutti in banco (vicino a CAMBIA) e ufficio (nel banner)

Tooltip: "Visto da PAPA · 22:45"

Notifiche
Modale centrale con sfondo scuro

Colori per stato: giallo/blu/rosso

Pulsanti: 📋 Vai agli Ordini + OK

Beep + notifica nativa

Niente raffica al primo load (_firstLoadDone)

Click "Vai agli Ordini" → scroll + flash giallo

CSS
In <style> dentro ufficio.html:

.ferapp-notif-overlay, .ferapp-notif-box, .ferapp-notif-header, ecc.

Varianti colore .ferapp-notif-bozza, .ferapp-notif-nuovo, .ferapp-notif-in_arrivo

.ferapp-flash per flash giallo sull'ordine scrollato

File modificati
ufficio.html, ufficio-controller.js, ufficio-view.js, banco-controller.js, cart-repository.js, trash-repository.js

16.12 🎨 LAVORO A/B/C/D — Layout e colori righe (07/10/2026)
✅ COMPLETATI (07/10/2026)
LAVORO A — Ordinamento articoli banco
In renderCart, lines.sort((a,b) => (b.addedAt||0) - (a.addedAt||0))

Nuovo articolo → in cima

Modifica qty/prezzo → resta dov'è

Ufficio resta invariato (ultimo aggiunto in fondo)

LAVORO B — Colori righe vicine
10 sfondi spenti ciclici (clr-0..clr-9)

Classi CSS in banco.css

Righe vicine sempre di colore diverso

LAVORO C — Layout articolo MQ
Header colonne: PRODOTTO · Q.TÀ · PREZZO · TOT

Riga 1: qty stepper + select unità + prezzo inline + totale

Riga 2 (solo MQ): H [__] × L [__] → calcola qty automaticamente

Riga 3 (solo KG/MT/MQ): PREZZO BASE [€ ___] (scritta → calcolatore, riquadro → tastierino)

CSS: .cart-line-grid, .clv2-col-qty, .clv2-hxl, .clv2-base, media query mobile

LAVORO D — Tasti azione nascosti (solo estetica)
HTML: <div class="cart-line-actions" hidden>

Codice articolo cliccabile (.cart-line-code-toggle)

Handler toggle in onLineAction

⚠️ Logica tasti non ancora testata

Fix correlati (07/10)
Tasto "+ NUOVO" funzionante (wireNewCartTab)

Ufficio prezzo editabile inline (no tastierino)

Cassa testi più grandi, codice no a capo

📝 Cronologia Modifiche
Data	Modifica
22/09/2026	Creazione v1.0
23/09/2026	v2.0 — Aggiunte: Clienti, Scheda Prodotto, Barra Ricerca Generica, Pallini Prezzo, Scaglioni, Template DDT, Tasti avanti/indietro (rinviati)
24/09/2026	v2.1 — Completati 2B.3.4b (Cliente Picker), 2B.4 (Riepilogo), 2B.5 (Bozza/Conferma/Invio). Aggiunto fix listener cambio carrello
24/09/2026	v2.2 — Completato Blocco 3.1 (Layout Ufficio). Chiarita distinzione UFFICIO vs CASSA. Aggiunta sezione 8.9 Cassa. Aggiornati utenti/accessi (tutti possono tutto). Aggiunto cambio interfaccia da header
25/09/2026	v2.3 — Completati: 3.2 (Ordini reali da Firebase), 3.4/3.5 (Modifica ordini), 3B (Pagina Cassa). Fix header Banco/Ufficio/Cassa
28/09/2026	v2.4 — Sessione di riparazione. Fix applicati: loop infinito Sync totali, doppia dichiarazione scheduleTotalsSync, wireBottomButtons() mai chiamata, saveOrderNote() ricreata, bug isLocked risolto
29-30/09/2026	v2.5 — Sessione lunga. Completati: 3.3, 3.5-bis, 3B-bis, 3.7 parte 1. Bug fix: graffa doppia updateClientBar, doppia markOrderAsModified, tendina chiude su sfondo, pulsante PRONTO rotto, markCartAsModified solo se sbloccato, tab NUOVI automatico dopo sblocco
01/10/2026	v2.6 (parte 1) — Completati: 3.8 (Stampa Multi-Ordine), 2B.6 (Scheda Prodotto), 2B.7 (Pallini Stato Prezzo). Fix: Banco ↔ Ufficio per tutti gli utenti, rimozione CASSA dal login, cache articoli aggiornata dopo modifiche, sync prezzi al "Fatto", pallini visibili automaticamente
04/10/2026	v2.6 (parte 2) — Fix: calcolatore taglio/peso (bug bloccante risolto), cassa refresh live (prezzo si aggiorna subito), prezzo proporzionale KG (qty = kg, unitPrice = basePrice, mtTotal, kgTotal)
05/10/2026	v2.6 (parte 3) — Completati: 5A (Import ~3.651 clienti), 6 (Anagrafica Clienti), 7 (Fatturazione DDT). Fix: pagina bianca risolta (iframe srcdoc + dialoghi nativi). Nuove funzioni repository: syncOrderPricesToArticles, generateInvoiceNumber (atomica), peekNextInvoiceNumber, setNextInvoiceNumber, saveInvoiceToCart. Nuovi componenti: product-card.js, print-orders-modal.js, price-dot.js, invoice-modal.js, invoice-number-modal.js, print-invoice.js. Nuovi CSS: product-card.css, price-dot.css, print.css, invoice.css
06/10/2026	v2.7 (parte 1) — Completati: BLOCCO 8 (Cestino condiviso + runScheduledCleanup). BLOCCO 4 (Occhio 👁️ + Notifiche stile vecchia app). Nuovi file: js/data/trash-repository.js, js/core/notify.js. Fix: QuotaExceededError localStorage (chiavi cp4_* vecchia app cancellate). GitHub Pages configurato
07/10/2026	v2.7 (parte 2) — Completati: LAVORO A (ordinamento articoli banco), LAVORO B (10 colori righe vicine), LAVORO C (layout MQ con H×L + PREZZO BASE + header colonne), LAVORO D estetica (tasti azione nascosti + codice cliccabile). Fix: tasto "+ NUOVO" funzionante, cassa testi più grandi, ufficio prezzo editabile inline (no tastierino). Modifiche CSS: banco.css (.clv2-*, .clr-*, @media mobile), cassa.css, ufficio.css
🚧 PROSSIMI PASSI (07/10/2026)
🔥 Da fare SUBITO (in ordine)
#	Blocco	Cosa	Complessità
1	LAVORO D logica	Testare la logica dei tasti azione dentro il toggle (forbici, %, nota, ordina, cestino)	🟡 Bassa
2	8-bis	Reset mezzanotte "carrelli modifica → nuovo"	🟡 Media
3	2B.8	Barra Ricerca Generica (nel logo)	🟡 Media
4	5	Ordini Fornitori + CSV con addedAt, addedBy, lastOrderedAt articolo	🟠 Alta
5	10	Scaglioni (auto-apply + UI)	🟡 Media
6	11	Tema Light	🟡 Media
7	12	Regole Firebase + Deploy produzione	🟠 Alta
8	3.7 p2	Anti-truffa	🟠 Rinviato
✅ Fixati nel 06-07/10/2026
✅ Blocco 8 — Cestino condiviso + reset automatico all'avvio

✅ Blocco 4 — Occhio 👁️ + Notifiche stile vecchia app

✅ GitHub Pages + push automatico

✅ Fix QuotaExceededError localStorage (chiavi cp4_*)

✅ LAVORO A — Ordinamento articoli banco (nuovo in cima)

✅ LAVORO B — 10 colori righe vicine

✅ LAVORO C — Layout articolo MQ (H×L, PREZZO BASE, header colonne)

✅ LAVORO D (estetica) — Tasti azione nascosti + codice cliccabile

✅ Tasto "+ NUOVO" funzionante

✅ Cassa testi più grandi, codice no a capo

✅ Ufficio prezzo editabile inline

⚠️ Bug noti (residui)
LAVORO D — logica tasti azione: dopo il toggle, i tasti non sono stati testati (forbici/nota/ordina/cestino)

Reset mezzanotte "carrelli modifica → nuovo": mai implementato

Occhio in Cassa: mai implementato

Occhio condizionale nella preview banco: attualmente è fisso (👁️ sempre visibile)

Codice fornitore f. XXX: impossibile mostrare — dato assente negli articoli (arriverà con Blocco 5)

Dead code: renderEye() in ufficio-view.js non è più chiamata (sostituita da _eyeTooltip)

js/core/utils.js: mai creato — funzioni duplicate in ogni file

favicon.ico 404: innocuo

WebSocket ... BFCache: innocuo

📌 NOTE FUTURE (Promemoria)
🧾 1. Template DDT definitivo
Stato attuale: template provvisorio riprodotto dal PDF generico.

Cosa serve: l'utente fornirà un template HTML compilabile identico all'originale cartaceo.

Quando arriva, sostituire:

Funzione renderDDT() in js/ui/components/print-invoice.js

CSS in assets/css/invoice.css (sezione @media print)

📦 2. Ordinazione fornitori (Blocco 5)
Da implementare: dropdown fornitori colorati + CSV import.
Da aggiungere: addedAt, addedBy quando si preme ORDINA; lastOrderedAt, lastOrderId, lastOrderQty sull'articolo quando un ordine va in "fatto".

👁️ 3. Notifiche native PC
Implementate ma non testate in produzione. Verificare che funzionino su tutti i PC (permesso browser).

🎨 4. Cassa — pulsante Refresh
Non necessario per ora, la cassa si aggiorna in real-time via Firebase.

📄 5. Fattura fiscale
Non si fa in FerApp → la fa il commercialista.

🖨️ 6. Cassa — occhio 👁️
Da implementare (simmetrico a banco e ufficio).

Ultima sessione: 07/10/2026
Versione attuale: v2.7

Fine documento.




---

## 🆕 AGGIORNAMENTO SESSIONE — 08/10/2026 (sera)

### ✅ Cosa abbiamo fatto stasera

**LAVORO D (logica tasti azione in banco)** — COMPLETATO
- Tasti forbici / % / nota / ordina / cestino funzionanti
- Tasti aperti restano aperti dopo il click (`_openActionsLines` Set)
- Tasto `+ NUOVO` funzionante (mette in pausa il carrello attuale)
- **Fix layout card carrello**: risolto bug card annidate (mancava una `</div>`)
- Spazio tra le card con `gap: 14px` su `.cart-area`

**SCAMPOLO/ROTOLO/SCAGLIONATO**
- SCAMPOLO → applica sconto 30% automatico
- ROTOLO → rimuove sconto
- SCAGLIONATO → solo stato visivo
- NEUTRO → rimuove sconto
- Quando SCAMPOLO attivo, il tasto `%` diventa editabile inline con il valore dello sconto
- Importo sconto `-€ X,XX` visibile accanto al `%`

**PREZZO E TOTALE CON SCONTO A 3 RIGHE** (banco)
- Con sconto: prezzo pieno barrato grigio + prezzo scontato giallo + sconto rosso
- Senza sconto: 1 numero giallo
- Stessa cosa per la colonna totale

**NOTA RIGA IN BANCO**
- La nota appare sotto la riga in giallo corsivo (stile vecchia app)
- Funziona con il tasto 📄 che apre il prompt nativo

**UFFICIO — CODICE ARTICOLO**
- Codice più grande (`font-size: 0.95rem`, `font-weight: 900`)
- Colore **giallo brillante** identico al prezzo
- **Fix importante**: rimosso `opacity: 0.6` da `.uff-line-sub` (era la causa del codice sbiadito)
- **Click sul codice → copia negli appunti** con toast di conferma

**ORDINE CONFERMATO SENZA BOZZA**
- Ora anche premendo **CONFERMA** (senza passare da UFF.) viene generato il codice `Ordine #N - L`
- Il contatore è condiviso con le bozze → niente buchi nella numerazione

**CSS PULIZIA**
- Rimossa la fascia header colonne `.cart-cols-header` (creava disallineamento)
- Fix `.cart-line` → `display: block`, `height: auto`, `flex: 0 0 auto`

---

### 🔴 Cosa dobbiamo fare domani (09/10/2026)

**1) ELIMINAZIONE ORDINE IN UFFICIO → cosa deve succedere**
- Verificare che quando elimini un ordine dall'ufficio sparisca **anche dalla tendina banco** (dovrebbe già funzionare, ma da testare)
- **Retrocessione numero ordine** — DA DECIDERE:
  - (A) Prossimo ordine riprende il numero eliminato
  - (B) Tutti i successivi scalano di 1
  - (C) Contatore globale retrocede
  - **Decisione rimandata**: discutere prima della scelta, poi implementare

**2) NOTE IN UFFICIO**
- Le note riga devono apparire in ufficio come in banco (giallo corsivo sotto la riga)
- Attualmente in ufficio la nota è a piè di card, non per riga

**3) EDIT NOTA MIGLIORE**
- Sostituire il `prompt()` nativo con modale custom (più carina)
- Stessa cosa per il tasto nota in banco

**4) PULIZIA DEBITO TECNICO** (quando c'è tempo)
- `banco-controller.js` è troppo grande (2000+ righe)
- Va spezzato in più file:
  - `banco/cart-render.js`
  - `banco/fattura.js`
  - `banco/cestino.js`
  - `banco/notifiche.js`
  - `banco/tendina.js`
- `banco.css` ha regole duplicate (`.cart-line`, `.cart-area` scritti più volte)
- `js/core/utils.js` mai creato → funzioni duplicate in ogni file

**5) OGGETTI PICCOLI IN SOSPESO**
- Occhio 👁️ in Cassa
- Occhio condizionale nella preview banco (ora è fisso)
- Reset mezzanotte "carrelli `modifica` → `nuovo`" (mai implementato)
- Codice fornitore `f. XXX` (serve import — Blocco 5)
- Test notifiche native PC su altri PC

---

### 📌 Commit pushati questa sessione

- Commit **08/10/2026** — "LAVORO D logica tasti + fix layout card + note + codice ufficio copia + ordine senza bozza"

### 📊 Stato attuale

- **Blocco 8** → ✅ (manca solo reset mezzanotte)
- **Blocco 4** → ✅ (occhio + notifiche)
- **LAVORO A/B/C/D** → ✅ COMPLETATI
- **PROGETTO.md** → aggiornato a v2.7




---

## 🆕 AGGIORNAMENTO SESSIONE — 09/10/2026 (pomeriggio)

### ✅ Cosa abbiamo fatto oggi

**FIX STAMPA ORDINI (non DDT)**
- Risolto bug: la stampa degli ordini era **pagina bianca**
- Causa: mancava il `<div class="print-area">` che avvolge gli ordini in `print-orders-modal.js`
- Il CSS `print.css` fa `body > *:not(.print-area) { display: none }` → senza `.print-area` il browser nascondeva tutto
- Ora la stampa multi-ordine funziona (testata in ufficio)

**NOTA ORDINE IN BANCO (migliorata)**
- Prima: textarea che si chiudeva dopo 3 lettere (bug del re-render Firebase che perdeva il focus)
- **Fix**: prima del render salvo `value` + posizione cursore se textarea ha focus; dopo il render li ripristino
- Ora si può scrivere quanto si vuole senza perdere il cursore
- **Comportamento nuovo**:
  - Nota vuota → textarea normale
  - **Premi INVIO** → salva e diventa **div giallo** (non corsivo)
  - **Clic sul div giallo** → torna textarea per modificare
  - **Shift+Invio** → va a capo senza salvare

**NOTA ORDINE IN UFFICIO (nuova)**
- **Stessa cosa del banco**:
  - Nota vuota → **placeholder compatto** `📝 Nota` in grigio (piccolissimo)
  - Click sul placeholder → si apre textarea
  - Scrivi + **INVIO** → diventa **div giallo** con `💬 + testo`
  - **Click fuori dal riquadro** con contenuto → salva e passa in div giallo
  - Click fuori senza contenuto → torna placeholder grigio
  - Click sul div giallo → torna textarea per modificare
- **Fix**: rimossa emoji `📝` doppia (era sia nel contenitore che nel placeholder)

**CODICE ARTICOLO IN UFFICIO**
- Più grande (`font-size: 0.95rem`, `font-weight: 900`)
- **Giallo brillante** identico al prezzo (`var(--primary, #facc15)`)
- **Fix importante**: rimosso `opacity: 0.6` da `.uff-line-sub` (era la causa del codice sbiadito)
- **Click sul codice → copia negli appunti** con toast di conferma
- Fallback per browser vecchi con `execCommand('copy')`

**NOTA RIGA ARTICOLO IN UFFICIO (nuova)**
- Ora in ufficio si vede la nota che il banco ha messo **sulla singola riga articolo**
- Appare **sotto il codice articolo**
- Formato: `✏️ + testo nota`
- Stile: **arancione** (`#fb923c`), `font-size: 1rem`, `font-weight: 700`
- **Contorno nero sottile attorno alle lettere** (`-webkit-text-stroke: 0.4px #000` + `text-shadow`)
- Si vede solo se la riga ha effettivamente una nota

**ORDINE CONFERMATO SENZA BOZZA**
- Ora anche premendo **CONFERMA** (senza passare da UFF.) viene generato il codice `Ordine #N - L`
- Il contatore è condiviso con le bozze → niente buchi nella numerazione

### 🔴 Cosa dobbiamo fare domani

**1) ELIMINAZIONE ORDINE IN UFFICIO + numerazione** (decisione rimandata)
- Verificare che sparisca anche dalla tendina banco (dovrebbe già funzionare)
- **Decidere** cosa deve fare il contatore quando elimini un ordine:
  - (A) Prossimo riprende il numero eliminato
  - (B) Tutti i successivi scalano di 1
  - (C) Contatore globale retrocede

**2) PULIZIA DEBITO TECNICO** (quando c'è tempo)
- `banco-controller.js` è troppo grande (2000+ righe) → spezzare in più file
- `banco.css` ha regole duplicate
- `js/core/utils.js` mai creato → funzioni duplicate in ogni file

**3) OGGETTI PICCOLI IN SOSPESO**
- Occhio 👁️ in Cassa
- Occhio condizionale nella preview banco (ora è fisso)
- Reset mezzanotte "carrelli `modifica` → `nuovo`"
- Codice fornitore `f. XXX` (serve import — Blocco 5)
- Test notifiche native PC su altri PC

### 📌 Commit pushati questa sessione

- "Sessione 09/10 - Fix stampa ordini + note stile banco in ufficio + codice copiabile"

### 📊 Stato attuale

- **Blocco 8** → ✅ (manca solo reset mezzanotte)
- **Blocco 4** → ✅ (occhio + notifiche)
- **LAVORO A/B/C/D** → ✅ COMPLETATI
- **Stamp ordini** → ✅ funzionante
- **Note (banco + ufficio)** → ✅ con stile coerente
- **PROGETTO.md** → v2.7 aggiornato