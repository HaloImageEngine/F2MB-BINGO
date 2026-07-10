# GetGogi Admin Dashboard — Session History

This file is a running log of development session chats.
Paste each session's conversation below under a new dated entry.
Entries are ordered newest-first so the latest changes are always at the top.

---

## 2026-06-25 — Packet APIs, Admin/Audit pages, Get PID + QR print cards

### Summary
Added **Packet** REST integration (`Get_Latest20_Audit_Records`, `Get_Game_PacketID_Set_byGCI`), new **Admin**, **Audit Records**, and **Get PID** pages, and a **Print QR MST** workflow that prints one 5×5 bingo card per portrait page with PIDT + QR code per square.

### Changes

**New REST APIs (Angular)**
- `environment.ts` / `environment.prod.ts`:
  - `packetLatest20AuditRecordsApiUrl` → `GET …/Packet/Get_Latest20_Audit_Records`
  - `packetGamePacketIdSetByGciApiUrl` → `POST …/Packet/Get_Game_PacketID_Set_byGCI`
- `src/app/models/audit-record.model.ts`: `AuditRecord`, `AuditRecordsResponse`.
- `src/app/models/packet.model.ts`: `PacketMaster`, `PacketDetail`, `GamePacketIdSetByGci`, `GamePacketIdSetByGciRequest`.
- `src/app/services/packet.service.ts`:
  - `getLatest20AuditRecords()` — normalizes `AuditRecords` wrapper.
  - `getGamePacketIdSetByGci({ Game_ID, Call_List_ID })` — POST body; normalizes `PacketMasters` / `PacketDetails`.

**Admin** (`/admin`)
- Three-panel layout: **Status Report**, **Audit Log**, **Error Log** (errors filtered client-side: `SeverityCode >= 2` or `ErrorCode` set).
- Single refresh loads latest 20 audit records for all panels.
- Sidebar nav: **Admin**.

**Audit Records** (`/get-audit-records`)
- Table of latest 20 audit entries from `Get_Latest20_Audit_Records`.
- Sidebar nav: **Audit Records**.

**Get PID** (`/get-pid`)
- Inputs: **Game_ID**, **Call_List_ID**, **QR_URL** (default `https://play.djgogi.com/slidecardbypid/`, 60ch width).
- **Load PID List** → `Get_Game_PacketID_Set_byGCI` with `{ Game_ID, Call_List_ID }`.
- Table columns: PIDT, QR_Link (`QR_URL + PIDT`), PM_ID, Game_ID, Call_List_ID, Inning, User_ID, Card Count.
- Prefills Game_ID / Call_List_ID from console context (`bingo_console_context_v1`) when available.
- Sidebar nav: **Get PID**.

**Print QR MST** (Get PID page)
- **Print QR MST** button next to **Load PID List** (requires loaded PID list + QR URL).
- Prints **one 5×5 bingo card per portrait page** (25 PIDs per card; e.g. 50 PIDs → 2 pages).
- Each square: **PIDT**, QR code image (encodes QR_Link), QR_Link text.
- B-I-N-G-O column headers; card header shows Game, Call List, Card X of Y.
- Uses `QRCodeGeneratorService` QR API URL pattern (`api.qrserver.com`) and `PrintService` with `bodyClass: 'print-qr-mst'`.
- `@page qr-mst-portrait` in `src/styles.scss` (letter portrait).
- Print CSS fixes: grid stays `display: grid` with explicit 5×5 rows; removed overflow clipping that hid squares.

**Routing**
- `app.routes.ts`: lazy routes `/admin`, `/get-audit-records`, `/get-pid` (AuthGuard).

### API routes (added this session)
| Endpoint | Method | Service |
|----------|--------|---------|
| `…/Packet/Get_Latest20_Audit_Records` | GET | `PacketService` |
| `…/Packet/Get_Game_PacketID_Set_byGCI` | POST `{ Game_ID, Call_List_ID }` | `PacketService` |

### Status
- Build verified (`ng build --configuration=development`).
- Print: use **Portrait** in browser print dialog; one bingo card per page.

### Chat Log
Session covered Packet audit + packet-ID-set APIs, Admin three-panel page, Get Audit Records page, Get PID list with QR_URL/QR_Link, table column cleanup (removed GP Code / GP Description / Comment), and Print QR MST portrait bingo-card printing (1 card per page, grid layout fixes).

---

## 2026-06-01 — Console winners, Game Master insert/edit, new Bingo APIs

### Summary
Wired two new Bingo REST APIs (`Get_CallListWinner_by_UserID`, `Update_Game_byGID`). Console gained per-row **Winning Card** links, a bottom **Call List Winners** list, and a Starting Game dropdown fallback. Game Master gained max-ID stats, **Insert / Edit Games** with Update/Insert enable rules, and a **Game Winners** tab fed by winners-by-user.

### Changes

**New REST APIs (Angular)**
- `environment.ts` / `environment.prod.ts`: `bingoGetCallListWinnerByUserIdApiBaseUrl`, `bingoUpdateGameByGidApiUrl`.
- `bingo-game.model.ts`: `BingoCallListWinnerByUserRow`, `BingoUpdateGameByGid`, `BingoUpdateGameByGidResult`.
- `GameMgmtService.getCallListWinnerByUserId(userId, gameId?)` → `GET …/Get_CallListWinner_by_UserID/{User_ID}?gameId=…`.
- `CallListService.updateGameByGid(payload)` → `PUT …/Bingo/Game/Update_Game_byGID`.

**Console** (`/console`)
- **Starting Game** (CL Song Review path): fallback list when API returns no `Game_ID` values (max game ID down to 1, or 26..1).
- **Winner results**: per-row **Winning Card** button → `/slidecardone?cardId=###` (replaces single bottom button).
- **Call List Winners** section at page bottom: loads `Get_CallListWinner_by_UserID` for logged-in user + current `Game_ID`; refresh + **Winning Card** links per row.

**Game Master** (`/console/game-master`)
- **Max Game ID** / **Max CallList ID** stats to the right of **Load Game** (same APIs as console).
- Section renamed **Insert / Edit Games**; removed JSON preview / API summary box.
- **Latest for your account** (max Call List ID) moved into section header (right of title).
- **Update** button calls `Update_Game_byGID`; **Insert** calls `Insert_NewGame`.
  - **Update** enabled when game is loaded and `Game_ID` ≤ user max game ID.
  - **Insert** enabled when `Game_ID` > user max game ID.
  - Form prefilled from `Check_GameSetup` game rows after **Load Game**.
- **Game Winners** tab (under **Game** section): table from `Get_CallListWinner_by_UserID` for current user + game; refresh + **Winning Card** links.

### API routes (added / used this session)
| Endpoint | Method | Service |
|----------|--------|---------|
| `…/Bingo/Bingo/Get_CallListWinner_by_UserID/{userId}?gameId=` | GET | `GameMgmtService` |
| `…/Bingo/Game/Update_Game_byGID` | PUT | `CallListService` |

### Status
- Changes in working tree (not committed).
- `Update_Game_byGID` implemented as **PUT** (confirm live API method if 405).

### Chat Log
Session covered console winner UX, winners-by-user list, Game Master insert/edit flow with Update vs Insert rules, max-ID display, and documentation of new winner/update game endpoints.

---

## 2026-05-31 — Build label + deploy package cleanup

### Summary
Added visible build verification in the app (version + Production/Development) so deployed vs localhost is easy to confirm. Updated deployment flow to package only website output from `dist`, explicitly excluding non-site folders like `sqlscript`.

### Changes

**Build verification UI**
- `src/app/app.component.ts` / `.html` / `.scss`: added `App build` section in sidebar with `environment.version` and Production/Development badge.
- `src/app/pages/login/login.component.ts` / `.html` / `.scss`: added build label on login screen (`Build <version> · <buildKind>`).
- Browser tab title includes build metadata to distinguish tabs/environments quickly.

**Deployment packaging**
- `package.json`:
  - Added `build:prod` → `ng build --configuration production`
  - Added `deploy:prepare` → runs PowerShell packaging script
- Added `scripts/prepare-deploy.ps1`:
  - Copies only `dist/bingo-djgogi-family/*` into `deploy/bingo-djgogi-family`
  - Removes `deploy/bingo-djgogi-family/sqlscript` if present
  - Prints final deploy path

### New Build/Deploy Instructions
- 1) Build production bundle:
  - `npm run build:prod`
- 2) Prepare clean deploy package:
  - `npm run deploy:prepare`
- 3) Deploy **only** this folder:
  - `deploy/bingo-djgogi-family`
- Do not deploy repo root or extra folders (`sqlscript`, docs, local config files, etc.).

### Status
- Deployment prep script verified and produces a site-only deploy folder.
- `sqlscript` is not included in `deploy/bingo-djgogi-family`.

### Chat Log
Session covered build visibility (`.T` vs `.P`), production rebuild/redeploy guidance, and deployment hardening so only web artifacts are published.

---

## 2026-05-30 — Slide Cards print layout, How to Play, console & call-list polish

### Summary
Fixed landscape print for **Slide Cards** (two cards per page at full printable height after sponsor/QR content made cards shrink). GID, CID, CLID, and Inning now print on one row in the card print header. Added **How to Play** page and sidebar link to **djgogi.com**. Console and **Create Call List** hardened async flows (NG0911 / duplicate song add).

### Changes

**Print — Slide Cards & single card**
- `src/styles.scss`: `@page` landscape (11×8.5 in), `body.print-slidecardsw` shell rules, `--bingo-print-page-height: 8.26in`, full-width chain, one slide per page with `page-break-after`.
- `slidecardsw`: `PrintService.print({ bodyClass: 'print-slidecardsw' })`; two-column `1fr 1fr` slide grid; explicit `8.26in` heights on slide / `slide__cards` / each card (replaces collapsing `height: 100%`); print header with four ID pairs (`slidecardsw-card__id-pair`); screen IDs in `__meta--screen`, print IDs in `__print-meta`; optional GID/CID via `showPrintCardMeta()`; screen card header hidden in print.
- `slidecardone`: matching print ID row and height alignment for single-card print.

**Root cause (print sizing)**
- Browser “fit to page” scaling when print DOM exceeded printable area.
- `minmax(0, auto)` / percentage height chains collapsing card height after sponsor banners added vertical content.

**User print settings**
- Landscape, **Scale 100%** (not “Fit to page”).

**Angular — shell & pages**
- **How to Play** (`/how-to-play`): `howtoplay` component; venue growth guide image `src/assets/images/Music_Bingo_Venue_Growth_Guide.png`; nav item in `app.component.ts`.
- Sidebar external link: `djgogi.com` (`app.component.html` / `.scss`).
- **Console** (`console.component.ts`): `gciStatsRefresh$` + `componentAlive` so GCI song stats refresh does not update after destroy (avoids NG0911).
- **Create Call List** (`review-call-list.component.ts`): `addingSongId` guard on add-song; duplicate song / invalid `Song_ID` checks; `resolveInsertInning()` on insert payload; clearer API/NG0911 error messages; refresh latest games after insert.

### Status
- Print layout confirmed good in landscape; session paused.
- Changes in working tree (not committed).

### Pending
- Deploy `usp_Check_GameSetup.sql` (see 2026-05-29 entry) when SQL server is available.
- Card Overview **Check cards** uses `GET …/Bingo/Bingo/Check_Cards_byUser_ID/{User_ID}` (not `Bingo/Check/Check_Cards`).

### Chat Log
Session fixed half-page / shrunk Slide Cards print after Sponsor page ads, restored CLID/Inning on the same line as GID/CID, and tuned landscape CSS so two cards split the page 50/50 at full height. Added How to Play page and sidebar polish; stopped `ng serve` on request.

---

## 2026-05-29 — Bingo APIs, Game Master setup check, printed cards

### Summary
Wired new and updated Bingo REST APIs in Angular (Insert New Game, latest games grid, card generation, printed cards, game setup check). Migrated UI and SQL away from removed `GN_ID` / `GameNight` toward `User_ID` on `Game`. Game Master and Card Master now call `GET …/Bingo/Check/GameSetup/{gameId}` and `GET …/Bingo/Bingo/Get_Printed_Cards/{gameId}`. SQL procedure `usp_Check_GameSetup` rewritten for `User_ID`; deploy pending on server (API still returns `GN_ID_Found` exception until proc is published with `GN_ID_Found` alias columns).

### Changes

**Angular — services & environment**
- `CallListService`: `insertNewGame()`, `getLatestGamesByUserId()`, `generateBingoCardsFromClSongs()`.
- `PrintedCardsService`: JSON flat-row mapping for `Get_Printed_Cards` / `Get_Printed_Cards_byCardID`; `UserID` on cards (replaces `GNID`).
- `GameMgmtService`: `checkGameSetup()` → `Bingo/Check/GameSetup/{gameId}`; `getGameWinnersResults()`.
- `LoginService`, `AuthUserService`; environment URLs for new endpoints.
- Version stamps: `26.05.28.09.T` / `26.05.28.09.P`.

**Angular — pages**
- **Create Call List** (`review-call-list`): Previous Games grid (3 visible rows, scroll for 10), Insert New Game under Game Setup; loads `Get_Latest_Games_by_UserID`.
- **Card Master**: Load cards via `calllistid` + `inning`; User ID column; removed stale 500/fallback warning.
- **Game Master**: Tab 1 displays full `Check/GameSetup` response; labels updated for User ID / user games.

**SQL (repo — deploy to `haloimag_djgogi` tomorrow)**
- `usp_Check_GameSetup.sql` — `User_ID` / `Call_List_ID` from `Game`; no `GameNight`; header includes `User_ID_Found` + `GN_ID_Found` (API compat); result sets 2–8 aligned to current schema.
- `usp_Get_Printed_Cards_byGame_ID.sql` — `User_ID` as GNID alias, `calllistid` / `inning` filters.
- `usp_Insert_NewGame.sql`, `usp_Get_Latest_Games_by_UserID.sql`, `usp_Get_DropDown_CallList_ByUserID.sql`, related call-list scripts.

**API routes (live / expected)**
| Endpoint | Notes |
|----------|--------|
| `POST …/CallList/Insert_NewGame` | Replaces `Insert_Game_GameNight` |
| `GET …/CallList/Get_Latest_Games_by_UserID/{userId}?topN=10` | Previous games grid |
| `POST …/CallList/GenerateBingoCards_From_CLSongs/{callListId}/{gameId}/{inning}` | Card generation |
| `GET …/Bingo/Bingo/Get_Printed_Cards/{gameId}?calllistid=&inning=` | 25 rows/card, `UserID` |
| `GET …/Bingo/Check/GameSetup/{gameId}` | Setup validation (SQL deploy required) |

**Pending**
- Deploy `usp_Check_GameSetup.sql` so `Check/GameSetup` returns data (not `Exception: GN_ID_Found`).

### Chat Log
Session covered API migration from `GN_ID` to `User_ID`, printed cards integration, create-call-list Previous Games + Insert New Game, Card Master 500/fallback fixes, and Game Master `Check/GameSetup` route update. User paused SQL server deploy for next day.

---

## Template — Copy for each new session

```
---

## YYYY-MM-DD — [Short title describing the session goal]

### Summary
[1–3 sentences describing what was accomplished.]

### Chat Log
[Paste session chat here]

---
```

## 2026-03-20 — Discount List, Order List full-screen, sidebar collapse

### Summary
Added a full Discount List page backed by live REST APIs with inline edit modal.
Added full-screen expand mode to the Order List page that collapses the sidebar.
Added a persistent sidebar collapse/reveal control to the global app shell.

### Chat Log

**User:** Add a new discount.component that will call the rest api `Get_All_Discounts?discount=ALL` and display the list of discounts. Add an edit button on the last column to call `CRUD_Discounts`.

**Copilot:**
- Created `src/app/models/discount.model.ts` — `Discount` interface matching API shape.
- Created `src/app/services/discount.service.ts` — `getAllDiscounts()` (GET) and `saveDiscount()` (POST).
- Created `src/app/pages/discounts/discount.component.ts` — signals, reactive form, loading/error/save states.
- Created `src/app/pages/discounts/discount.component.html` — table with Edit button per row; modal overlay with reactive form.
- Created `src/app/pages/discounts/discount.component.scss` — styled to match dashboard design.
- Registered `/discounts` lazy route with `AuthGuard` in `app.routes.ts`.
- Added **Discounts** nav item under Operations in `app.component.ts`.

---

**User:** Add the nav route to the /discounts on the left hand panel and call it 'Discount List'.

**Copilot:** Updated nav label from `'Discounts'` to `'Discount List'` in `app.component.ts`.

---

**User:** In the orders-list.component add a button that will full screen just the orders-list.component and hide (or reduce) the left panel.

**Copilot:**
- Added `fullscreen` signal and `toggleFullscreen()` to `OrdersListComponent`; adds/removes `body.workspace-expanded` class.
- Added `ngOnDestroy()` to clean up the class on navigation.
- Added **Expand / Exit** button in the orders-list header.
- Added `body.workspace-expanded` CSS rules in `app.component.scss` to animate the grid column from `320px → 0px`.

---

**User:** Put a button on the left panel to slide it to the left or hide it.

**Copilot:**
- Added `isSidebarCollapsed` flag and `toggleSidebarCollapse()` method to `AppComponent`.
- Added **‹ Hide panel** button at the top of the sidebar inside `app.component.html`.
- Added a **› reveal tab** (fixed, left edge) that appears when the sidebar is collapsed.
- Added `.sidebar-collapsed` grid and sidebar CSS with smooth transitions in `app.component.scss`.

---



### Summary
Angular 17 standalone admin dashboard scaffolded from scratch for GetGogi.
All core pages, services, models, and routes implemented. A `readme.doc` project
archive was created documenting all components, API endpoints, and codebase state
as of this date. A `readmehistory.md` file (this file) was created to track
all future session chats with dated entries.

### Chat Log

**User:** Create an readme.doc in my project folder directory of all the archived session chats. Ensure they are readable in a date stamp format for me to research any code changes in the future.

**Copilot:** Created `readme.doc` in the project root. Built from a full codebase inspection since previous chat sessions are not stored as workspace files. The archive documents every component, service, model, route, API endpoint, and environment value under a `2026-03-16` dated entry matching the version stamps `26.03.16.P/T`. A blank session template is appended at the bottom for future use.

---

**User:** Create a readmehistory.md file, from this moment on we will copy our session chats into the readmehistory.md and makes sure each entry is dated.

**Copilot:** Created `readmehistory.md` with a dated entry template. Each session should be pasted under a new `## YYYY-MM-DD` heading to maintain a searchable, chronological history of all code changes.

---
