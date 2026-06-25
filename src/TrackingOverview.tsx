import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  STATUS_OPTIONS, STATUS_COLOR, normalizeStatus,
} from "./TrackingPage";
import type { TrackingRow, Tab } from "./TrackingPage";

const cardStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
  padding: "var(--sp-4)",
};

// Count distinct jobs by PR No.: rows sharing a PR No. (the same request split
// into multiple item/PO lines) count once; rows without a PR No. yet count
// individually so nothing in the pipeline is hidden.
function countByDistinctPr(rows: TrackingRow[]): number {
  const seenPr = new Set<string>();
  let count = 0;
  for (const r of rows) {
    const pr = r.prNo?.trim();
    if (!pr) {
      count += 1;
    } else if (!seenPr.has(pr)) {
      seenPr.add(pr);
      count += 1;
    }
  }
  return count;
}

export default function TrackingOverview({ tabs }: { tabs: Tab[] }) {
  const [rowsByTab, setRowsByTab] = useState<Record<string, TrackingRow[]>>({});
  const [scope, setScope] = useState<string>("all");

  useEffect(() => {
    const unsubs = tabs.map((tab) =>
      onSnapshot(query(collection(db, "trackingTabs", tab.id, "rows"), orderBy("no")), (snap) => {
        setRowsByTab((prev) => ({
          ...prev,
          [tab.id]: snap.docs.map((d) => {
            const data = d.data() as Omit<TrackingRow, "id">;
            return { id: d.id, ...data, status: normalizeStatus(data.status) };
          }),
        }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [tabs]);

  const rows = useMemo(() => {
    if (scope === "all") return tabs.flatMap((t) => rowsByTab[t.id] ?? []);
    return rowsByTab[scope] ?? [];
  }, [rowsByTab, scope, tabs]);

  const kpis = useMemo(() => {
    const urgentCount = rows.filter((r) => r.urgent).length;
    const completedCount = rows.filter((r) => r.status === "Completed").length;
    return {
      count: countByDistinctPr(rows),
      urgentCount,
      completedPct: rows.length ? Math.round((completedCount / rows.length) * 100) : 0,
    };
  }, [rows]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const key = r.status && STATUS_OPTIONS.includes(r.status as never) ? r.status : "ไม่ระบุ";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return [...STATUS_OPTIONS, "ไม่ระบุ"].map((s) => ({ status: s, count: counts[s] ?? 0 })).filter((d) => d.count > 0);
  }, [rows]);

  const workloadData = useMemo(() => {
    if (scope !== "all") return [];
    return tabs.map((t) => ({ name: t.name, count: countByDistinctPr(rowsByTab[t.id] ?? []) }));
  }, [tabs, rowsByTab, scope]);

  const urgentRows = useMemo(
    () => rows.filter((r) => r.urgent).sort((a, b) => (b.no ?? 0) - (a.no ?? 0)).slice(0, 12),
    [rows]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>มุมมอง:</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          style={{ font: "inherit", fontSize: "var(--fs-xs)", color: "var(--text)", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "8px 10px" }}
        >
          <option value="all">ทุกคน (ทีม)</option>
          {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--sp-3)" }}>
        <div style={cardStyle}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>จำนวนรายการ</div>
          <div style={{ fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--text-strong)" }}>{kpis.count.toLocaleString()}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>งานเร่งด่วน</div>
          <div style={{ fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--danger)" }}>{kpis.urgentCount.toLocaleString()}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>เสร็จสมบูรณ์</div>
          <div style={{ fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--success)" }}>{kpis.completedPct}%</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--sp-4)" }}>
        {/* Status breakdown */}
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 var(--sp-3)", fontSize: "1rem", color: "var(--text-strong)" }}>สถานะงาน</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="status" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {statusData.map((d) => (
                  <Cell key={d.status} fill={STATUS_COLOR[d.status]?.fg ?? "var(--text-faint)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Workload per person (only meaningful in "all" scope) */}
        {scope === "all" && (
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 var(--sp-3)", fontSize: "1rem", color: "var(--text-strong)" }}>ปริมาณงานต่อคน</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>

      {/* Urgent list */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 var(--sp-3)", display: "flex", alignItems: "center", gap: 6, fontSize: "1rem", color: "var(--text-strong)" }}>
          <IconAlertTriangle size={18} stroke={1.75} style={{ color: "var(--danger)" }} /> งานเร่งด่วน ({urgentRows.length})
        </h3>
        {urgentRows.length === 0 ? (
          <div style={{ color: "var(--text-faint)", fontSize: "var(--fs-sm)" }}>ไม่มีงานที่ตั้งเป็นเร่งด่วนในมุมมองนี้</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "6px 8px" }}>No.</th>
                <th style={{ padding: "6px 8px" }}>Company</th>
                <th style={{ padding: "6px 8px" }}>PR/PO No.</th>
                <th style={{ padding: "6px 8px" }}>Project</th>
                <th style={{ padding: "6px 8px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {urgentRows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{r.no}</td>
                  <td style={{ padding: "6px 8px" }}>{r.company}</td>
                  <td style={{ padding: "6px 8px" }}>{r.poNo || r.prNo}</td>
                  <td style={{ padding: "6px 8px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.project}</td>
                  <td style={{ padding: "6px 8px" }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
