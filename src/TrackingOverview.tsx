import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";
import { IconAlertTriangle, IconClockHour4, IconChartLine } from "@tabler/icons-react";
import {
  STATUS_OPTIONS, STATUS_COLOR, normalizeStatus,
} from "./TrackingPage";
import type { TrackingRow, Tab } from "./TrackingPage";

/* ============================================================
   Cycle-time analysis — average calendar days spent in each stage
   of the PR -> PA -> PO pipeline, so the team can see which step is
   the actual bottleneck instead of guessing. Delivery isn't tracked
   consistently by the team, so it's excluded here. Only rows with
   BOTH boundary dates present (and a plausible <1yr gap, to ignore
   obvious typos) count toward a stage's average.
   ============================================================ */
const CYCLE_STAGES: { label: string; from: keyof TrackingRow; to: keyof TrackingRow }[] = [
  { label: "ได้รับ PR → เปิด PA", from: "prDate", to: "paSubmittedDate" },
  { label: "เปิด PA → อนุมัติ PA", from: "paSubmittedDate", to: "paApprovedDate" },
  { label: "อนุมัติ PA → เปิด PO", from: "paApprovedDate", to: "poSubmittedDate" },
  { label: "เปิด PO → อนุมัติ PO", from: "poSubmittedDate", to: "poApprovedDate" },
];

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/* ============================================================
   PR-received-per-month trend, broken down by person — shows whether
   workload is rising/falling and who's carrying the load, month by
   month, instead of just a lifetime total (see workloadData above).
   ============================================================ */
const TH_MONTHS_SHORT = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function monthKey(dateStr: string | undefined): string | null {
  const d = parseDate(dateStr);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const beYearShort = (parseInt(y, 10) + 543) % 100;
  return `${TH_MONTHS_SHORT[parseInt(m, 10)]} ${String(beYearShort).padStart(2, "0")}`;
}
// Same distinct-PR rule as countByDistinctPr, bucketed by the PR's month.
function countDistinctPrByMonth(rows: TrackingRow[]): Record<string, number> {
  const seenPerMonth: Record<string, Set<string>> = {};
  const result: Record<string, number> = {};
  for (const r of rows) {
    const m = monthKey(r.prDate);
    if (!m) continue;
    const pr = r.prNo?.trim();
    if (!pr) {
      result[m] = (result[m] ?? 0) + 1;
      continue;
    }
    const seen = (seenPerMonth[m] ??= new Set());
    if (!seen.has(pr)) {
      seen.add(pr);
      result[m] = (result[m] ?? 0) + 1;
    }
  }
  return result;
}
// Fixed categorical order (never reassigned when the person list is filtered),
// reused from the palette already used elsewhere in the app (Project page).
const PERSON_PALETTE = ["#7CA6D8", "#8FCBAE", "#F2B6A0", "#D6B8E0", "#F4D58D", "#9AD0D6", "#C9B7A0", "#A8B8D8"];

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

  const monthlyPrSeries = useMemo(() => {
    // In "all" scope, one line per person; in a single-person scope, one line
    // for that person only — always keyed by tab name so colors stay assigned
    // by person, not by chart position.
    const groups = scope === "all"
      ? tabs.map((t) => ({ key: t.name, counts: countDistinctPrByMonth(rowsByTab[t.id] ?? []) }))
      : [{ key: tabs.find((t) => t.id === scope)?.name ?? "รายการ", counts: countDistinctPrByMonth(rows) }];

    const months = new Set<string>();
    groups.forEach((g) => Object.keys(g.counts).forEach((m) => months.add(m)));
    const sortedMonths = [...months].sort();

    const chartData = sortedMonths.map((m) => {
      const point: Record<string, number | string> = { month: m, monthLabel: formatMonthLabel(m) };
      groups.forEach((g) => { point[g.key] = g.counts[m] ?? 0; });
      return point;
    });

    return { chartData, seriesKeys: groups.map((g) => g.key) };
  }, [scope, tabs, rowsByTab, rows]);

  const cycleTimeData = useMemo(() => {
    return CYCLE_STAGES.map(({ label, from, to }) => {
      const diffs: number[] = [];
      for (const r of rows) {
        const df = parseDate(r[from] as string | undefined);
        const dt = parseDate(r[to] as string | undefined);
        if (!df || !dt) continue;
        const diff = daysBetween(df, dt);
        // Guard against obviously bad data (negative gaps, >1yr typos) so a
        // handful of mis-keyed dates can't skew the result.
        if (diff >= 0 && diff <= 365) diffs.push(diff);
      }
      diffs.sort((a, b) => a - b);
      const n = diffs.length;
      // Median, not mean: procurement lead times are long-tailed (a handful of
      // stuck/backlog PRs can sit for months), so a straight average gets
      // dragged way above what most rows actually experience. Median reflects
      // the typical case; mean is kept alongside (tooltip) for transparency.
      const median = n === 0 ? 0 : n % 2 === 1 ? diffs[(n - 1) / 2] : (diffs[n / 2 - 1] + diffs[n / 2]) / 2;
      const mean = n === 0 ? 0 : diffs.reduce((a, b) => a + b, 0) / n;
      return {
        label,
        medianDays: Math.round(median * 10) / 10,
        meanDays: Math.round(mean * 10) / 10,
        n,
      };
    });
  }, [rows]);

  const bottleneckStage = useMemo(() => {
    const withSamples = cycleTimeData.filter((d) => d.n > 0);
    if (!withSamples.length) return null;
    return withSamples.reduce((max, d) => (d.medianDays > max.medianDays ? d : max));
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

      {/* PR received per month, by person */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 var(--sp-3)", display: "flex", alignItems: "center", gap: 6, fontSize: "1rem", color: "var(--text-strong)" }}>
          <IconChartLine size={18} stroke={1.75} style={{ color: "var(--primary)" }} /> จำนวน PR ที่ได้รับต่อเดือน{scope === "all" ? " (แยกตามคน)" : ""}
        </h3>
        {monthlyPrSeries.chartData.length === 0 ? (
          <div style={{ color: "var(--text-faint)", fontSize: "var(--fs-sm)" }}>ยังไม่มีข้อมูลวันที่ PR ให้แสดงแนวโน้มรายเดือน</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyPrSeries.chartData} margin={{ right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              {monthlyPrSeries.seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {monthlyPrSeries.seriesKeys.map((key, i) => (
                <Line
                  key={key}
                  type="linear"
                  dataKey={key}
                  name={key}
                  stroke={PERSON_PALETTE[i % PERSON_PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cycle time per pipeline stage */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 var(--sp-1)", display: "flex", alignItems: "center", gap: 6, fontSize: "1rem", color: "var(--text-strong)" }}>
          <IconClockHour4 size={18} stroke={1.75} style={{ color: "var(--accent)" }} /> เวลาที่ใช้แต่ละขั้นตอน — ค่ามัธยฐาน (วัน)
        </h3>
        {bottleneckStage ? (
          <p style={{ margin: "0 0 var(--sp-3)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            ขั้นตอนที่ช้าที่สุด: <strong style={{ color: "var(--danger)" }}>{bottleneckStage.label}</strong> มัธยฐาน {bottleneckStage.medianDays} วัน
            (จาก {bottleneckStage.n} รายการที่มีข้อมูลครบ) — ใช้ค่ามัธยฐานเพราะบาง PR ค้างนานผิดปกติจนดึงค่าเฉลี่ยให้สูงเกินจริง
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
                const mean = item?.payload?.meanDays ?? 0;
                return [`มัธยฐาน ${value} วัน (เฉลี่ย ${mean} วัน จาก ${n} รายการ)`, "เวลาที่ใช้"];
              }}
            />
            <Bar dataKey="medianDays" radius={[0, 4, 4, 0]}>
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
