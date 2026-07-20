import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { IconAlertTriangle, IconClockHour4 } from "@tabler/icons-react";
import {
  STATUS_OPTIONS, STATUS_COLOR, normalizeStatus,
} from "./TrackingPage";
import type { TrackingRow, Tab } from "./TrackingPage";

/* ============================================================
   Cycle-time analysis — average calendar days spent in each stage
   of the PR -> PA -> PO -> delivery pipeline, so the team can see
   which step is the actual bottleneck instead of guessing. Only
   rows with BOTH boundary dates present (and a plausible <1yr gap,
   to ignore obvious typos) count toward a stage's average.
   ============================================================ */
const CYCLE_STAGES: { label: string; from: keyof TrackingRow; to: keyof TrackingRow }[] = [
  { label: "PR → ยื่น PA", from: "prDate", to: "paSubmittedDate" },
  { label: "ยื่น PA → อนุมัติ PA", from: "paSubmittedDate", to: "paApprovedDate" },
  { label: "อนุมัติ PA → ยื่น PO", from: "paApprovedDate", to: "poSubmittedDate" },
  { label: "ยื่น PO → อนุมัติ PO", from: "poSubmittedDate", to: "poApprovedDate" },
  { label: "อนุมัติ PO → ส่งมอบ", from: "poApprovedDate", to: "deliveredDate" },
];

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

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

  const cycleTimeData = useMemo(() => {
    return CYCLE_STAGES.map(({ label, from, to }) => {
      let total = 0;
      let n = 0;
      for (const r of rows) {
        const df = parseDate(r[from] as string | undefined);
        const dt = parseDate(r[to] as string | undefined);
        if (!df || !dt) continue;
        const diff = daysBetween(df, dt);
        // Guard against obviously bad data (negative gaps, >1yr typos) so a
        // handful of mis-keyed dates can't skew the whole average.
        if (diff >= 0 && diff <= 365) { total += diff; n += 1; }
      }
      return { label, avgDays: n ? Math.round((total / n) * 10) / 10 : 0, n };
    });
  }, [rows]);

  const bottleneckStage = useMemo(() => {
    const withSamples = cycleTimeData.filter((d) => d.n > 0);
    if (!withSamples.length) return null;
    return withSamples.reduce((max, d) => (d.avgDays > max.avgDays ? d : max));
  }, [cycleTimeData]);

  const PAGE_SIZE = 15;
  const [urgentPage, setUrgentPage] = useState(1);

  const allUrgentRows = useMemo(
    () => rows.filter((r) => r.urgent).sort((a, b) => (b.no ?? 0) - (a.no ?? 0)),
    [rows]
  );
  const urgentPageCount = Math.max(1, Math.ceil(allUrgentRows.length / PAGE_SIZE));
  // Reset to page 1 whenever the underlying list changes (e.g. scope switched)
  // so a stale page number never shows an empty page.
  useEffect(() => { setUrgentPage(1); }, [allUrgentRows.length, scope]);
  const urgentRows = useMemo(
    () => allUrgentRows.slice((urgentPage - 1) * PAGE_SIZE, urgentPage * PAGE_SIZE),
    [allUrgentRows, urgentPage]
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

      {/* Cycle time per pipeline stage */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 var(--sp-1)", display: "flex", alignItems: "center", gap: 6, fontSize: "1rem", color: "var(--text-strong)" }}>
          <IconClockHour4 size={18} stroke={1.75} style={{ color: "var(--accent)" }} /> เวลาเฉลี่ยแต่ละขั้นตอน (วัน)
        </h3>
        {bottleneckStage ? (
          <p style={{ margin: "0 0 var(--sp-3)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            ขั้นตอนที่ช้าที่สุด: <strong style={{ color: "var(--danger)" }}>{bottleneckStage.label}</strong> เฉลี่ย {bottleneckStage.avgDays} วัน
            (จาก {bottleneckStage.n} รายการที่มีข้อมูลครบ)
          </p>
        ) : (
          <p style={{ margin: "0 0 var(--sp-3)", fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>
            ยังไม่มีข้อมูลวันที่ครบพอจะคำนวณ (ต้องมีทั้งวันเริ่มและวันจบของแต่ละขั้นตอน)
          </p>
        )}
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={cycleTimeData} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} unit=" วัน" />
            <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, _name, item) => {
                const n = item?.payload?.n ?? 0;
                return [`${value} วัน (จาก ${n} รายการ)`, "เฉลี่ย"];
              }}
            />
            <Bar dataKey="avgDays" radius={[0, 4, 4, 0]}>
              {cycleTimeData.map((d) => (
                <Cell key={d.label} fill={d.label === bottleneckStage?.label ? "var(--danger)" : "var(--primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Urgent list */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 var(--sp-3)", display: "flex", alignItems: "center", gap: 6, fontSize: "1rem", color: "var(--text-strong)" }}>
          <IconAlertTriangle size={18} stroke={1.75} style={{ color: "var(--danger)" }} /> งานเร่งด่วน ({allUrgentRows.length})
        </h3>
        {allUrgentRows.length === 0 ? (
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
        {urgentPageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--sp-3)", marginTop: "var(--sp-3)" }}>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
              หน้า {urgentPage} / {urgentPageCount}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                disabled={urgentPage <= 1}
                onClick={() => setUrgentPage((p) => Math.max(1, p - 1))}
                style={{ border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "4px 10px", fontSize: "var(--fs-xs)", cursor: urgentPage <= 1 ? "default" : "pointer", opacity: urgentPage <= 1 ? 0.5 : 1 }}
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                disabled={urgentPage >= urgentPageCount}
                onClick={() => setUrgentPage((p) => Math.min(urgentPageCount, p + 1))}
                style={{ border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "4px 10px", fontSize: "var(--fs-xs)", cursor: urgentPage >= urgentPageCount ? "default" : "pointer", opacity: urgentPage >= urgentPageCount ? 0.5 : 1 }}
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
