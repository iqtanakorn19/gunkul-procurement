import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import { IconLayoutDashboard } from "@tabler/icons-react";
import TrackingOverview from "./TrackingOverview";
import type { Tab } from "./TrackingPage";

export default function DashboardPage() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "trackingTabs"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLoadError(null);
        setTabs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tab, "id">) })));
      },
      (err) => setLoadError(err.message)
    );
    return unsub;
  }, []);

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "var(--sp-2)" }}>
        <IconLayoutDashboard size={16} stroke={1.75} />
        ภาพรวม
      </div>
      <h1 style={{ margin: "0 0 var(--sp-5)", color: "var(--text-strong)" }}>Dashboard</h1>

      {loadError ? (
        <div style={{
          color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", borderRadius: "var(--radius)",
          padding: "var(--sp-4)", fontSize: "var(--fs-sm)",
        }}>
          โหลดข้อมูลไม่สำเร็จ: {loadError}
        </div>
      ) : tabs.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>ยังไม่มีข้อมูลใน Tracking Sheet</div>
      ) : (
        <TrackingOverview tabs={tabs} />
      )}
    </div>
  );
}
