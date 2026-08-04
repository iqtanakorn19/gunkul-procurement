import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import type { Tab, TrackingRow } from "../TrackingPage";

/* ============================================================
   Shared Firestore listeners for the tracking dataset.

   Dashboard, TrackingOverview, and TrackingPage all read the same
   `trackingTabs` collection, and often the same tabs' `rows` subcollections
   too. Before this module existed, each page opened its OWN onSnapshot for
   the same data — since App.tsx keeps every visited page mounted for the
   session (see App.tsx's `visited` set), a staff member who opens both
   Dashboard and Tracking Sheet paid for the same reads twice (three times,
   counting TrackingOverview embedded in Dashboard).

   Every resource here (the tabs list, and each tab's rows) is backed by
   ONE Firestore listener no matter how many components subscribe to it.
   Subscribing late gets the current cached value delivered synchronously,
   so a second/third subscriber costs zero extra reads. Rows are NOT
   status-normalized here (that would need importing `normalizeStatus`, a
   value from TrackingPage.tsx, creating a circular runtime import) —
   callers normalize on read, same as before this module existed.
   ============================================================ */

type Listener = () => void;

// --- trackingTabs (one listener, shared) ---
let tabsCache: Tab[] = [];
let tabsError: string | null = null;
let tabsUnsub: (() => void) | null = null;
const tabsListeners = new Set<Listener>();

function ensureTabsListener() {
  if (tabsUnsub) return;
  const q = query(collection(db, "trackingTabs"), orderBy("order"));
  tabsUnsub = onSnapshot(
    q,
    (snap) => {
      tabsCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tab, "id">) }));
      tabsError = null;
      tabsListeners.forEach((l) => l());
    },
    (err) => {
      tabsError = err.message;
      tabsListeners.forEach((l) => l());
    }
  );
}

/** Subscribe to the shared tabs list. Fires immediately with the current
 * cache (or once the first snapshot lands, if nothing's cached yet). */
export function subscribeTabs(listener: Listener): () => void {
  ensureTabsListener();
  tabsListeners.add(listener);
  if (tabsCache.length > 0 || tabsError) listener();
  return () => { tabsListeners.delete(listener); };
}

export function getTabsSnapshot(): Tab[] {
  return tabsCache;
}

export function getTabsError(): string | null {
  return tabsError;
}

// --- rows per tab (one listener per tabId, shared) ---
const rowsCache: Record<string, TrackingRow[]> = {};
const rowsUnsub: Record<string, () => void> = {};
const rowsListeners: Record<string, Set<Listener>> = {};
const rowsErrorByTab: Record<string, string | null> = {};

function ensureRowsListener(tabId: string) {
  if (rowsUnsub[tabId]) return;
  rowsListeners[tabId] = rowsListeners[tabId] ?? new Set();
  const q = query(collection(db, "trackingTabs", tabId, "rows"), orderBy("no"));
  rowsUnsub[tabId] = onSnapshot(
    q,
    (snap) => {
      rowsCache[tabId] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TrackingRow, "id">) }));
      rowsErrorByTab[tabId] = null;
      rowsListeners[tabId].forEach((l) => l());
    },
    (err) => {
      rowsErrorByTab[tabId] = err.message;
      rowsListeners[tabId].forEach((l) => l());
    }
  );
}

/** Subscribe to one tab's rows. Fires immediately with the current cache
 * if this tab's listener is already open from another component. */
export function subscribeRows(tabId: string, listener: Listener): () => void {
  ensureRowsListener(tabId);
  rowsListeners[tabId].add(listener);
  if (rowsCache[tabId] || rowsErrorByTab[tabId]) listener();
  return () => { rowsListeners[tabId]?.delete(listener); };
}

export function getRowsSnapshot(tabId: string): TrackingRow[] {
  return rowsCache[tabId] ?? [];
}

export function getRowsError(tabId: string): string | null {
  return rowsErrorByTab[tabId] ?? null;
}
