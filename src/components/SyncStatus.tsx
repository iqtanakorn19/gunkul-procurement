import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { IconRefresh } from "@tabler/icons-react";

/* ============================================================
   Shows when trackingTabs data (PR/PA/PO tracking) was last pushed
   from the master Google Sheet, via meta/trackingSync.lastSyncedAt —
   stamped by the Apps Script on every onEdit + the 6-hour fullResync
   (see google-apps-script/Code.gs: writeLastSyncedAt). Both the
   Tracking page and the Dashboard read the same tab/row data, so they
   share this one indicator instead of guessing data freshness.
   ============================================================ */

function timeAgoLabel(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "เมื่อสักครู่";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

function freshnessColor(date: Date): string {
  const hours = (Date.now() - date.getTime()) / 3_600_000;
  if (hours < 1) return "var(--success)";
  if (hours < 3) return "var(--warning)";
  return "var(--danger)";
}

export default function SyncStatus() {
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Re-render every 30s so the "X minutes ago" text and dot color stay
  // current without the user refreshing the page.
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "meta", "trackingSync"),
      (snap) => {
        setError(null);
        const raw = snap.data()?.lastSyncedAt as Timestamp | string | undefined;
        if (!raw) { setLastSyncedAt(null); return; }
        setLastSyncedAt(raw instanceof Timestamp ? raw.toDate() : new Date(raw));
      },
      (err) => setError(err.message),
    );
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  if (error || !lastSyncedAt) return null;

  const color = freshnessColor(lastSyncedAt);

  return (
    <div
      title={lastSyncedAt.toLocaleString("th-TH")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: "var(--fs-xs)", color: "var(--text-muted)",
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-full)", padding: "5px 12px",
      }}
    >
      <IconRefresh size={13} stroke={2} style={{ color }} />
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      ซิงค์ล่าสุด: {timeAgoLabel(lastSyncedAt)}
    </div>
  );
}
