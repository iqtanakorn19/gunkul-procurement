import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { setCompanyUpdate, removeCompanyUpdate } from "../data/procurement";

/**
 * Glass panel for the procurement hero — shows the last-updated date per
 * company. Auto-filled on import; each row is editable (and addable) because
 * companies imported before this feature existed have no recorded date.
 */
export default function CompanyUpdates() {
  const [updates, setUpdates] = useState<Record<string, string>>({});
  const [newCode, setNewCode] = useState("");
  const [newDate, setNewDate] = useState("");
  const [open, setOpen] = useState(true);

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

  const labelStyle: React.CSSProperties = { color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 600 };
  const dateInput: React.CSSProperties = {
    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "white",
    borderRadius: "8px", padding: "3px 6px", fontSize: "11px", colorScheme: "dark",
  };

  const add = () => {
    if (!newCode.trim() || !newDate) return;
    setCompanyUpdate(newCode, newDate);
    setNewCode(""); setNewDate("");
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.12)", padding: "14px 16px", minWidth: "230px", maxWidth: "300px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: open ? "10px" : 0 }}>
        <span style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>🕒 อัปเดตล่าสุดต่อบริษัท</span>
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "12px" }}>
          {open ? "▲" : "▼"}
        </button>
      </div>

      {open && (
        <>
          {rows.length === 0 && (
            <p style={{ margin: "0 0 10px", ...labelStyle }}>ยังไม่มีข้อมูล — เพิ่มด้านล่าง หรือ import จะลงวันที่ให้อัตโนมัติ</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
            {rows.map(([code, date]) => (
              <div key={code} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "white", fontSize: "12px", fontWeight: 700, width: "54px", flexShrink: 0 }}>{code}</span>
                <input type="date" value={date} onChange={(e) => setCompanyUpdate(code, e.target.value)} style={{ ...dateInput, flex: 1 }} />
                <button onClick={() => removeCompanyUpdate(code)} title="ลบ"
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "13px", padding: 0 }}>✕</button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="โค้ด"
              style={{ ...dateInput, width: "54px", flexShrink: 0 }} />
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ ...dateInput, flex: 1 }} />
            <button onClick={add} title="เพิ่ม"
              style={{ background: "rgba(226,201,126,0.25)", border: "1px solid rgba(226,201,126,0.5)", color: "#e2c97e", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700, padding: "3px 8px" }}>+</button>
          </div>
        </>
      )}
    </div>
  );
}
