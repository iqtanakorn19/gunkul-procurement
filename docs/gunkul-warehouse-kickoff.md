# Kickoff — gunkul-warehouse Web App

Hand this file to Claude at the start of the **new session** (new repo:
`gunkul-warehouse`). It contains the full scope, the plan, open questions,
data model, what to reuse from `gunkul-procurement`, and how to work with me
so I don't have to re-explain everything.

---

## 0. TL;DR for the new Claude session

- Build a **Warehouse dashboard web app** for the FG (finished-goods) warehouse team.
- **Deploy target: Firebase Hosting** (`*.web.app`), NOT Vercel.
- Reuse the design/UX/UI + code patterns from `gunkul-procurement`
  (its `CLAUDE.md` documents the architecture — same stack: React 19 + Vite +
  TypeScript + Firebase + recharts + xlsx + Tabler icons, inline styles + tokens).
- Work in **two tracks**: (A) start the NEW inventory dashboard now (greenfield);
  (B) do NOT touch the existing live pages until we've met "เกม" and understand his setup.
- **Ownership:** "เกม" owns everything. I (intern) am only an editor during the
  internship; after it ends, เกม maintains/fixes bugs. Set the project up in เกม's
  Firebase project + GitHub repo where possible so nothing needs transferring.

---

## 1. Background / current state

- There is an existing rough web app by a colleague named **"เกม"**, on Firebase
  Hosting under `gunkul-my-task-system.web.app`:
  - Receiving + KPI dashboard: `/warehouse/dashboard.html`
  - **FG incoming-goods page (USED IN PRODUCTION DAILY):** `/warehouse/user.html`
  - Login: `deliveries.user@mytasksystem.com` / `NP@2026`
- A **Checker admin** actively edits data in that live page. It is **not**
  centralized the way gunkul-procurement is.
- These pages are login-gated (return 403 to unauthenticated fetches), so their
  internal structure has NOT been inspected yet. **Action for new session:** get
  screenshots of both pages (and ideally เกม's code + Firebase access) so Claude
  can study the real elements/data model. Claude reads screenshots well.

## 2. Scope of work (what I need to build)

### A. Dashboard web app — centralize the tools
- One unified Warehouse web app that brings together: the delivery/transport
  piece, the checker piece, and future pages — the same "central hub" approach
  that worked for procurement.

### B. Inventory page (the core new feature — greenfield)
- Stock-on-hand dashboard: product type (panel / model), quantity remaining,
  stock value; how many pieces of each item remain; **turnover**; **safety stock**.
- **Excel upload from AX 365**: user uploads the AX-365-exported Excel → system
  parses it → auto-generates the dashboard (reduce manual work).
- **Search / filter**: by Item Number or Product Name; show reorder/purchase status.

### C. Technical calculations
- **Aging** (age of stock = today − receipt date).
- **Per-warehouse breakdown** by warehouse code: value + quantity per code —
  **NP01 (นพวงศ์), PC01 (พิชัย), RJ01 (ร่วมจิต), T01 (สินค้าหน้างาน)**.

## 3. Recommended plan (two parallel tracks)

**Track A — start NOW (greenfield, no dependency on เกม):**
1. New repo `gunkul-warehouse`; scaffold from the gunkul-procurement stack + design system.
2. Firebase Hosting setup (`firebase init hosting`) targeting a Firebase project
   (see §5 on which project).
3. Build the **Inventory dashboard**: AX-365 Excel parser → Firestore →
   dashboard (stock, value, aging, per-warehouse NP01/PC01/RJ01/T01, search/filter).
   This closely mirrors procurement's Item Master + Excel import — heavy reuse.

**Track B — needs เกม first (do NOT touch until then):**
4. Meet เกม (questions in §6). Learn his Firebase project, data structure, repo, auth.
5. Then decide: absorb/re-implement his delivery + checker pages into the unified
   app, or integrate with his existing Firestore. Avoid running two live sources
   of truth for the same data (split-brain risk on a system in daily use).

> Rationale: waiting idle wastes time; blindly rebuilding his live system risks
> breaking production. Do the independent part now, coordinate the shared part.

## 4. What to REUSE from gunkul-procurement (big head start)

- Design system: `src/styles/tokens.css`, `Sidebar.tsx`, `components/PageKit.tsx`
  (Reveal, Section, HoverCard, IconBadge, grid, tint).
- Auth + login flow (`LoginPage.tsx`, `firebase.ts` pattern).
- Excel import pipeline (`data/procurement.ts`, `components/ImportModal.tsx`) —
  adapt `PO_HEADERS`-style header mapping to the AX 365 columns.
- Chart components (recharts + `ChartCard`), dashboard layout patterns.
- The app shell (`App.tsx` state-based page router + sidebar).

## 5. Firebase Hosting vs Vercel (how deployment differs)

| | gunkul-procurement (Vercel) | gunkul-warehouse (Firebase Hosting) |
|---|---|---|
| Deploy | push to GitHub → Vercel auto build+deploy | run `firebase deploy` (or a GitHub Action) |
| URL | `*.vercel.app` | `*.web.app` |
| Data | Firebase (separate service) | Firebase — same project as hosting |
| Ownership fit | mine | **เกม's project → เกม owns it** |

- The React app is **portable across Firebase projects**: which project it talks
  to is just the `firebaseConfig` object in `src/firebase.ts`. Develop against one
  project now, swap the config later to point at เกม's project + `firebase deploy`
  there. **Caveat:** only *code* moves by swapping config; *Firestore data* must be
  exported/imported separately (it does not migrate automatically).
- First-time setup: `npm i -g firebase-tools` → `firebase login` → `firebase init hosting`
  (public dir = `dist`, single-page app = yes) → `npm run build` → `firebase deploy`.

## 6. Questions to ask เกม (bring to the meeting)

**Firebase**
- What is the Firebase **project ID**? Can I get access?
- Use the **same** project (so I can read his data directly) or a **separate** one?

**Code**
- Where is the code? Is there a **git repo**, or just loose files?
- Can I be added as a **collaborator/editor** (ownership stays with him)?

**Data**
- How does the **Checker admin** write data — which **Firestore collection**, what structure?
- How is **Auth / users** managed (the `deliveries.user` account)?

**Integration**
- Does the new Inventory dashboard need to **read the FG incoming-goods data** too,
  or is inventory a separate AX-365 feed?

## 7. Data / inputs to collect before/while building

- **A sample AX 365 Excel export** (most important) — needed to design the parser
  and the Firestore schema. Cannot finalize the Inventory data model without it.
- ⚠️ **Turnover & safety stock need movement history (in/out over time)**, not just
  a single stock snapshot. Confirm whether AX exports historical movement, or only
  current on-hand — this changes what can be computed.
- Warehouse codes confirmed: NP01, PC01, RJ01, T01 (map codes → readable names in UI).

## 8. Ownership & handover setup (important)

- Prefer creating the GitHub repo under/**shared with เกม** and building against
  **เกม's Firebase project**, with me added as editor/collaborator. That way, when
  the internship ends, everything already lives in เกม's accounts — no transfer,
  and เกม can fix bugs directly.
- If we must start on my own Firebase project (Track A before the เกม meeting),
  keep the code cleanly portable (all Firebase-specific config isolated in
  `firebase.ts`) and plan a config swap + data export/import at handover.
- Document any Apps Script / manual deploy steps in the new repo's `CLAUDE.md`
  so เกม can maintain it after I leave.

## 9. How to work with me (standing preferences — don't re-ask)

- **Ship automatically:** commit → push → open PR → **squash-merge to `main`**
  without asking each time (like the procurement project). Live site = `main`.
- **Verify UI changes visually before shipping.** The sandbox can't reach Firebase,
  so temporarily bypass the login gate in `App.tsx` + inject mock data, screenshot
  with Playwright (Chromium at `/opt/pw-browsers/chromium`), then REVERT the temp
  bypass/mocks before committing. Do not ship UI changes unverified.
- **Gate before commit:** `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run build` must pass.
- **UI/layout tasks must not change data/content** unless explicitly asked.
- **Communicate in Thai.**
- Be direct and honest — if something wasn't checked or a step was skipped, say so.

## 10. First moves in the new session (suggested order)

1. Create repo `gunkul-warehouse`; copy the design system + PageKit + shell from procurement.
2. `firebase init hosting`; get a first empty page deployed to `*.web.app` (prove the pipeline).
3. Get the sample AX 365 Excel → design Inventory schema + parser.
4. Build Inventory dashboard (stock, value, aging, per-warehouse, search/filter).
5. In parallel: meet เกม (§6) → then plan absorbing delivery/checker pages.
