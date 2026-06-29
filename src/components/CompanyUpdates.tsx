import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Read-only glass panel for the procurement hero — shows the last-updated date
 * per company. Fully automatic: imports stamp meta/companyUpdates with the
 * company code (from the PO file) and the import date, so new companies appear
 * and dates refresh on their own.
 */
function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function CompanyUpdates() {
  const [updates, setUpdates] = useState<Record<string, string>>({});

  useEffect(() => {
    return onSnapshot(doc(db, "meta", "companyUpdates"), (snap) => {
      const data = snap.data() as { updates?: Record<string, string> } | undefined;
      setUpdates(data?.updates ?? {});
    });
  }, []);

  const rows = useMemo(
    () => Object.entries(updates).sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : a[0].localeCompare(b[0]))),
    [updates],
  );

  return (
    <div style={{
      background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.12)", padding: "14px 16px", minWidth: "230px", maxWidth: "300px",
    }}>
      <div style={{ color: "white", fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>🕒 อัปเดตล่าสุดต่อบริษัท</div>

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 600 }}>
          จะแสดงอัตโนมัติเมื่อ import PO ของบริษัทนั้น
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "200px", overflowY: "auto" }}>
          {rows.map(([code, date]) => (
            <div key={code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ color: "white", fontSize: "12px", fontWeight: 700 }}>{code}</span>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{fmtDate(date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
