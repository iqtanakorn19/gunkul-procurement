import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase";
import * as XLSX from "xlsx";
import {
  IconPlus,
  IconX,
  IconTrash,
  IconPencil,
  IconFileSpreadsheet,
  IconFlag,
  IconFlagFilled,
  IconSearch,
  IconClipboardList,
} from "@tabler/icons-react";

/* ============================================================
   Unified PR/PA/PO tracking schema — union of every column found
   across the 4 personal Excel trackers (PJAME / PWHITE / PKAE / PGAM),
   with duplicate headers (e.g. "PR No." vs "เลขที่เอกสาร PR") merged
   into a single field, and the working-day diff columns dropped per
   user decision (not needed). N/U was Urgent/Not-urgent — kept on as
   a manual highlight flag instead of a column.
   ============================================================ */

export const STATUS_OPTIONS = [
  "Draft",
  "Pending PA Approval",
  "Pending PO Approval",
  "In Progress",
  "Completed",
  "Cancelled",
  "On Hold",
] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  Draft: { bg: "var(--surface-2)", fg: "var(--text-muted)" },
  "Pending PA Approval": { bg: "color-mix(in srgb, var(--warning) 16%, transparent)", fg: "var(--warning)" },
  "Pending PO Approval": { bg: "color-mix(in srgb, var(--warning) 16%, transparent)", fg: "var(--warning)" },
  "In Progress": { bg: "color-mix(in srgb, var(--info) 16%, transparent)", fg: "var(--info)" },
  Completed: { bg: "color-mix(in srgb, var(--success) 16%, transparent)", fg: "var(--success)" },
  Cancelled: { bg: "color-mix(in srgb, var(--danger) 14%, transparent)", fg: "var(--danger)" },
  "On Hold": { bg: "color-mix(in srgb, var(--accent) 16%, transparent)", fg: "var(--accent)" },
};

export interface TrackingRow {
  id: string;
  no?: number;
  company?: string;
  dept?: string;
  project?: string;
  description?: string;
  prNo?: string;
  prDate?: string;
  paNo?: string;
  paSubmittedDate?: string;
  paApprovedDate?: string;
  poNo?: string;
  poSubmittedDate?: string;
  poApprovedDate?: string;
  vendor?: string;
  vendorId?: string;
  compareSuppliers?: string[];
  qty?: number;
  unit?: string;
  unitPrice?: number;
  discount?: number;
  budget?: number;
  saveCost?: number;
  payment?: string;
  neededDate?: string;
  deliveredDate?: string;
  status?: Status | string;
  urgent?: boolean;
  remark?: string;
}

interface Tab {
  id: string;
  name: string;
  order: number;
}

/* ============================================================
   Header aliases for importing the legacy per-person Excel files —
   every variant header text we found across the 4 trackers maps to
   one unified field.
   ============================================================ */
const HEADER_ALIASES: Record<string, keyof TrackingRow> = {
  "no": "no", "no.": "no",
  "company": "company",
  "dept": "dept", "department": "dept", "ฝ่าย": "dept",
  "project": "project",
  "description": "description", "descriptions": "description",
  "เลขที่เอกสาร pr": "prNo", "pr no.": "prNo", "pr no": "prNo",
  "date pr": "prDate", "date pr received": "prDate",
  "เลขที่เอกสาร pa": "paNo", "pa no.": "paNo", "pa no": "paNo", "create-pa": "paNo",
  "date pa submitted": "paSubmittedDate", "date pa": "paSubmittedDate",
  "date pa approved": "paApprovedDate", "date pa \n approved": "paApprovedDate",
  "เลขที่เอกสาร po": "poNo", "po no.": "poNo", "po no": "poNo",
  "date po submitted": "poSubmittedDate", "date po \n submitted": "poSubmittedDate",
  "date po approved": "poApprovedDate", "date po\n approved": "poApprovedDate",
  "vendor": "vendor",
  "id vendor": "vendorId", "vendor code": "vendorId",
  "qty": "qty", "จำนวนซื้อ": "qty",
  "หน่วย": "unit",
  "ราคา/หน่วย": "unitPrice",
  "dis.": "discount",
  "budget": "budget",
  "รวม save cost": "saveCost",
  "payment": "payment",
  "วันต้องการสินค้า": "neededDate",
  "ทำรับ": "deliveredDate", "sent to supplier": "deliveredDate", "d'ly date": "deliveredDate",
  "status": "status", "po status": "status",
  "remark": "remark", "remarks": "remark", "หมายเหตุ": "remark",
};

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/\s+/g, " ").trim();
}

function excelDateToISO(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.trim() && v.trim() !== "-") return v.trim();
  return undefined;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;

/* ============================================================
   Money / vat helpers — qty, unitPrice, discount drive the rest
   ============================================================ */
function computeMoney(row: TrackingRow) {
  const qty = row.qty ?? 0;
  const unitPrice = row.unitPrice ?? 0;
  const discount = row.discount ?? 0;
  const subtotal = Math.max(0, qty * unitPrice - discount);
  const vat = subtotal * 0.07;
  const total = subtotal + vat;
  return { subtotal, vat, total };
}
function baht(n: number) {
  return (n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

/* ============================================================
   Row edit modal
   ============================================================ */
function RowEditModal({
  initial,
  onSave,
  onClose,
}: {
  initial: TrackingRow;
  onSave: (row: TrackingRow) => void;
  onClose: () => void;
}) {
  const [row, setRow] = useState<TrackingRow>(initial);
  const set = <K extends keyof TrackingRow>(k: K, v: TrackingRow[K]) => setRow((r) => ({ ...r, [k]: v }));
  const { subtotal, vat, total } = computeMoney(row);

  const field = (label: string, node: React.ReactNode) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
      {label}
      {node}
    </label>
  );

  const inputStyle: React.CSSProperties = {
    font: "inherit",
    fontSize: "var(--fs-sm)",
    color: "var(--text)",
    background: "var(--surface)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    padding: "6px 9px",
  };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "var(--sp-4)",
      }}
    >
      <div
        style={{
          background: "var(--surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow)",
          width: "min(760px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: "var(--sp-5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
          <h3 style={{ margin: 0, color: "var(--text-strong)" }}>แก้ไขรายการ PR/PO</h3>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)" }}>
            <IconX size={20} stroke={1.75} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--sp-3)" }}>
          {field("Company", <input style={inputStyle} value={row.company ?? ""} onChange={(e) => set("company", e.target.value)} />)}
          {field("Dept", <input style={inputStyle} value={row.dept ?? ""} onChange={(e) => set("dept", e.target.value)} />)}
          {field("Project", <input style={inputStyle} value={row.project ?? ""} onChange={(e) => set("project", e.target.value)} />)}
          {field("Description", <input style={inputStyle} value={row.description ?? ""} onChange={(e) => set("description", e.target.value)} />)}

          {field("PR No.", <input style={inputStyle} value={row.prNo ?? ""} onChange={(e) => set("prNo", e.target.value)} />)}
          {field("Date PR", <input type="date" style={inputStyle} value={row.prDate ?? ""} onChange={(e) => set("prDate", e.target.value)} />)}

          {field("PA No.", <input style={inputStyle} value={row.paNo ?? ""} onChange={(e) => set("paNo", e.target.value)} />)}
          {field("Date PA Submitted", <input type="date" style={inputStyle} value={row.paSubmittedDate ?? ""} onChange={(e) => set("paSubmittedDate", e.target.value)} />)}
          {field("Date PA Approved", <input type="date" style={inputStyle} value={row.paApprovedDate ?? ""} onChange={(e) => set("paApprovedDate", e.target.value)} />)}

          {field("PO No.", <input style={inputStyle} value={row.poNo ?? ""} onChange={(e) => set("poNo", e.target.value)} />)}
          {field("Date PO Submitted", <input type="date" style={inputStyle} value={row.poSubmittedDate ?? ""} onChange={(e) => set("poSubmittedDate", e.target.value)} />)}
          {field("Date PO Approved", <input type="date" style={inputStyle} value={row.poApprovedDate ?? ""} onChange={(e) => set("poApprovedDate", e.target.value)} />)}

          {field("Vendor", <input style={inputStyle} value={row.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} />)}
          {field("Vendor ID", <input style={inputStyle} value={row.vendorId ?? ""} onChange={(e) => set("vendorId", e.target.value)} />)}

          {field("Qty", <input type="number" style={inputStyle} value={row.qty ?? ""} onChange={(e) => set("qty", e.target.value === "" ? undefined : Number(e.target.value))} />)}
          {field("Unit", <input style={inputStyle} value={row.unit ?? ""} onChange={(e) => set("unit", e.target.value)} />)}
          {field("ราคา/หน่วย", <input type="number" style={inputStyle} value={row.unitPrice ?? ""} onChange={(e) => set("unitPrice", e.target.value === "" ? undefined : Number(e.target.value))} />)}
          {field("Dis.", <input type="number" style={inputStyle} value={row.discount ?? ""} onChange={(e) => set("discount", e.target.value === "" ? undefined : Number(e.target.value))} />)}
          {field("Budget", <input type="number" style={inputStyle} value={row.budget ?? ""} onChange={(e) => set("budget", e.target.value === "" ? undefined : Number(e.target.value))} />)}
          {field("รวม Save Cost", <input type="number" style={inputStyle} value={row.saveCost ?? ""} onChange={(e) => set("saveCost", e.target.value === "" ? undefined : Number(e.target.value))} />)}

          {field("Payment", <input style={inputStyle} value={row.payment ?? ""} onChange={(e) => set("payment", e.target.value)} />)}
          {field("วันต้องการสินค้า", <input type="date" style={inputStyle} value={row.neededDate ?? ""} onChange={(e) => set("neededDate", e.target.value)} />)}
          {field("ทำรับ/ส่งมอบ", <input type="date" style={inputStyle} value={row.deliveredDate ?? ""} onChange={(e) => set("deliveredDate", e.target.value)} />)}

          {field("Status", (
            <select style={inputStyle} value={row.status ?? ""} onChange={(e) => set("status", e.target.value)}>
              <option value="">—</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ))}
        </div>

        <div style={{ marginTop: "var(--sp-3)" }}>
          {field("Supplier เทียบราคา (สูงสุด 3 ราย)", (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  style={{ ...inputStyle, flex: 1, minWidth: 140 }}
                  placeholder={`Supplier ${i + 1}`}
                  value={row.compareSuppliers?.[i] ?? ""}
                  onChange={(e) => {
                    const arr = [...(row.compareSuppliers ?? ["", "", ""])];
                    arr[i] = e.target.value;
                    set("compareSuppliers", arr.filter((v, idx) => v || idx < (row.compareSuppliers?.length ?? 0)));
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "var(--sp-3)" }}>
          {field("Remark", <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={row.remark ?? ""} onChange={(e) => set("remark", e.target.value)} />)}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "var(--sp-3)", fontSize: "var(--fs-sm)", color: "var(--text)", cursor: "pointer" }}>
          <input type="checkbox" checked={row.urgent ?? false} onChange={(e) => set("urgent", e.target.checked)} />
          ตั้งเป็นงานเร่งด่วน (highlight แถวนี้)
        </label>

        <div
          style={{
            marginTop: "var(--sp-4)", padding: "var(--sp-3)", borderRadius: "var(--radius)",
            background: "var(--surface-2)", display: "flex", gap: "var(--sp-4)", fontSize: "var(--fs-sm)", flexWrap: "wrap",
          }}
        >
          <span>ก่อน VAT: <b>{baht(subtotal)}</b></span>
          <span>VAT 7%: <b>{baht(vat)}</b></span>
          <span>สุทธิ: <b>{baht(total)}</b></span>
          <span style={{ color: "var(--text-faint)" }}>(คำนวณอัตโนมัติจาก Qty × ราคา/หน่วย − Dis.)</span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)", marginTop: "var(--sp-4)" }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle}>ยกเลิก</button>
          <button type="button" onClick={() => onSave(row)} style={primaryBtnStyle}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  border: "none", background: "var(--primary)", color: "var(--primary-contrast)",
  borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer",
};
const secondaryBtnStyle: React.CSSProperties = {
  border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)",
  borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", cursor: "pointer",
};

/* ============================================================
   Main page
   ============================================================ */
export default function TrackingPage() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<TrackingRow | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [renamingTab, setRenamingTab] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "trackingTabs"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLoadError(null);
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tab, "id">) }));
        setTabs(list);
        setActiveTab((cur) => (cur && list.some((t) => t.id === cur) ? cur : list[0]?.id ?? null));
      },
      (err) => setLoadError(err.message)
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeTab) { setRows([]); return; }
    const q = query(collection(db, "trackingTabs", activeTab, "rows"), orderBy("no"));
    const unsub = onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TrackingRow, "id">) }))),
      (err) => setLoadError(err.message)
    );
    return unsub;
  }, [activeTab]);

  const addTab = async () => {
    const name = prompt("ชื่อแท็ปใหม่ (เช่น ชื่อพี่ที่ดูแล)");
    if (!name?.trim()) return;
    const order = tabs.length ? Math.max(...tabs.map((t) => t.order)) + 1 : 0;
    const ref = await addDoc(collection(db, "trackingTabs"), { name: name.trim(), order });
    setActiveTab(ref.id);
  };

  const removeTab = async (tab: Tab) => {
    if (!confirm(`ลบแท็ป "${tab.name}" และข้อมูลทั้งหมดในแท็ปนี้?`)) return;
    const rowsSnap = await getDocs(collection(db, "trackingTabs", tab.id, "rows"));
    const batch = writeBatch(db);
    rowsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "trackingTabs", tab.id));
    await batch.commit();
  };

  const renameTab = async (tab: Tab, name: string) => {
    if (!name.trim()) return;
    await setDoc(doc(db, "trackingTabs", tab.id), { name: name.trim(), order: tab.order }, { merge: true });
  };

  const saveRow = async (row: TrackingRow) => {
    if (!activeTab) return;
    const { id, ...data } = row;
    const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Omit<TrackingRow, "id">;
    if (editingRow === "new") {
      const nextNo = rows.length ? Math.max(...rows.map((r) => r.no ?? 0)) + 1 : 1;
      await addDoc(collection(db, "trackingTabs", activeTab, "rows"), { ...cleaned, no: cleaned.no ?? nextNo, createdAt: serverTimestamp() });
    } else {
      await setDoc(doc(db, "trackingTabs", activeTab, "rows", id), { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
    }
    setEditingRow(null);
  };

  const deleteRow = async (row: TrackingRow) => {
    if (!activeTab) return;
    if (!confirm("ลบรายการนี้?")) return;
    await deleteDoc(doc(db, "trackingTabs", activeTab, "rows", row.id));
  };

  const onImportFile = async (file: File) => {
    if (!activeTab) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: undefined });
    if (!raw.length) { alert("ไม่พบข้อมูลในไฟล์นี้"); return; }

    const imported: Omit<TrackingRow, "id">[] = raw.map((line, i) => {
      const out: Record<string, unknown> = {};
      for (const [header, value] of Object.entries(line)) {
        const key = HEADER_ALIASES[normalizeHeader(header)];
        if (!key || value === undefined || value === "" || value === "-") continue;
        if (key.toLowerCase().includes("date")) out[key] = excelDateToISO(value);
        else if (["qty", "unitPrice", "discount", "budget", "saveCost", "no"].includes(key)) out[key] = typeof value === "number" ? value : Number(value) || undefined;
        else out[key] = String(value).trim();
      }
      if (out.no === undefined) out.no = (rows.length || 0) + i + 1;
      return out as Omit<TrackingRow, "id">;
    }).filter((r) => Object.keys(r).length > 1);

    if (!imported.length) { alert("ไม่พบคอลัมน์ที่รู้จักในไฟล์นี้ — ตรวจชื่อหัวตารางอีกครั้ง"); return; }
    if (!confirm(`พบ ${imported.length} แถว นำเข้าไปยังแท็ปนี้เลยหรือไม่?`)) return;

    const chunks: (typeof imported)[] = [];
    for (let i = 0; i < imported.length; i += 400) chunks.push(imported.slice(i, i + 400));
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const r of chunk) {
        const ref = doc(collection(db, "trackingTabs", activeTab, "rows"));
        batch.set(ref, { ...r, createdAt: serverTimestamp() });
      }
      await batch.commit();
    }
    alert(`นำเข้าสำเร็จ ${imported.length} แถว`);
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (urgentOnly && !r.urgent) return false;
      if (!q) return true;
      return [r.prNo, r.paNo, r.poNo, r.project, r.description, r.vendor, r.remark]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter, urgentOnly]);

  if (loadError) {
    return (
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
        <div style={{
          color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", borderRadius: "var(--radius)",
          padding: "var(--sp-4)", fontSize: "var(--fs-sm)",
        }}>
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <br />
          (ส่วนใหญ่เกิดจาก Firestore security rules ยังไม่อนุญาตให้อ่าน/เขียน collection "trackingTabs")
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "var(--sp-2)" }}>
        <IconClipboardList size={16} stroke={1.75} />
        PR / PA / PO Tracking
      </div>
      <h1 style={{ margin: 0, color: "var(--text-strong)" }}>PR/PO Tracking</h1>
      <p style={{ margin: "var(--sp-2) 0 var(--sp-5)", color: "var(--text-muted)", fontSize: "var(--fs-sm)", maxWidth: "70ch" }}>
        แท็ปแยกตามผู้ดูแล format กลางเดียวกัน ทุกคนแก้ไขข้อมูลของตัวเองได้ และ supervisor เปิดดูทุกแท็ปเพื่อเช็คงานได้ในที่เดียว
      </p>

      {/* Tabs bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: "var(--sp-4)", paddingBottom: "var(--sp-2)" }}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <div
              key={tab.id}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: active ? "var(--accent-bg)" : "transparent",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-full)", padding: "5px 6px 5px 12px",
                cursor: "pointer", fontSize: "var(--fs-sm)",
                color: active ? "var(--text-strong)" : "var(--text-muted)",
                fontWeight: active ? 700 : 500,
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {renamingTab === tab.id ? (
                <input
                  autoFocus
                  defaultValue={tab.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => { renameTab(tab, e.target.value); setRenamingTab(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  style={{ font: "inherit", border: "1px solid var(--primary)", borderRadius: 4, padding: "1px 4px", width: 100 }}
                />
              ) : (
                <span onDoubleClick={(e) => { e.stopPropagation(); setRenamingTab(tab.id); }} title="ดับเบิลคลิกเพื่อเปลี่ยนชื่อ">
                  {tab.name}
                </span>
              )}
              <IconX
                size={13}
                stroke={2}
                style={{ color: "var(--text-faint)", flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); removeTab(tab); }}
              />
            </div>
          );
        })}
        <button type="button" onClick={addTab} style={{ ...secondaryBtnStyle, display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: "var(--radius-full)" }}>
          <IconPlus size={14} stroke={2} /> เพิ่มแท็ป
        </button>
      </div>

      {!activeTab ? (
        <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>ยังไม่มีแท็ป — กด "เพิ่มแท็ป" เพื่อเริ่มต้น</div>
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", alignItems: "center", marginBottom: "var(--sp-4)" }}>
            <div style={{ position: "relative" }}>
              <IconSearch size={15} stroke={1.75} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา PR/PA/PO, project, vendor..."
                style={{ font: "inherit", fontSize: "var(--fs-xs)", color: "var(--text)", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "8px 12px 8px 32px", width: 260 }}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ font: "inherit", fontSize: "var(--fs-xs)", color: "var(--text)", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "8px 10px" }}>
              <option value="">ทุกสถานะ</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} />
              เฉพาะงานเร่งด่วน
            </label>
            <div style={{ flex: 1 }} />
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ""; }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...secondaryBtnStyle, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <IconFileSpreadsheet size={15} stroke={1.75} /> นำเข้าจาก Excel
            </button>
            <button type="button" onClick={() => setEditingRow("new")} style={{ ...primaryBtnStyle, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <IconPlus size={15} stroke={2} /> เพิ่มแถว
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)", whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)", textAlign: "left", color: "var(--text-muted)" }}>
                  {["", "No.", "PR No.", "Date PR", "PA No.", "PO No.", "Project", "Description", "Vendor", "Qty", "ก่อน VAT", "VAT 7%", "สุทธิ", "Status", "ทำรับ", "Remark", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const { subtotal, vat, total } = computeMoney(r);
                  const statusColor = r.status ? STATUS_COLOR[r.status] : undefined;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: r.urgent ? "color-mix(in srgb, var(--danger) 8%, transparent)" : undefined,
                        cursor: "pointer",
                      }}
                      onClick={() => setEditingRow(r)}
                    >
                      <td style={{ padding: "8px 12px" }}>
                        {r.urgent ? <IconFlagFilled size={14} stroke={1.75} style={{ color: "var(--danger)" }} /> : <IconFlag size={14} stroke={1.75} style={{ color: "var(--text-faint)" }} />}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.no}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-strong)" }}>{r.prNo}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.prDate}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.paNo}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.poNo}</td>
                      <td style={{ padding: "8px 12px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.project}</td>
                      <td style={{ padding: "8px 12px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</td>
                      <td style={{ padding: "8px 12px" }}>{r.vendor}</td>
                      <td style={{ padding: "8px 12px" }}>{r.qty}{r.unit ? ` ${r.unit}` : ""}</td>
                      <td style={{ padding: "8px 12px" }}>{subtotal ? baht(subtotal) : ""}</td>
                      <td style={{ padding: "8px 12px" }}>{vat ? baht(vat) : ""}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{total ? baht(total) : ""}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {r.status && (
                          <span style={{ background: statusColor?.bg, color: statusColor?.fg, borderRadius: "var(--radius-full)", padding: "2px 9px", fontSize: "10.5px", fontWeight: 700 }}>
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.deliveredDate}</td>
                      <td style={{ padding: "8px 12px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-muted)" }}>{r.remark}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditingRow(r); }} style={iconBtnStyle} title="แก้ไข">
                            <IconPencil size={14} stroke={1.75} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); deleteRow(r); }} style={iconBtnStyle} title="ลบ">
                            <IconTrash size={14} stroke={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={17} style={{ padding: "var(--sp-5)", textAlign: "center", color: "var(--text-faint)" }}>
                      ไม่มีข้อมูล — กด "เพิ่มแถว" หรือ "นำเข้าจาก Excel"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingRow && (
        <RowEditModal
          initial={editingRow === "new" ? { id: uid() } : editingRow}
          onClose={() => setEditingRow(null)}
          onSave={saveRow}
        />
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-muted)",
  borderRadius: "var(--radius-sm)", padding: 5, cursor: "pointer", display: "inline-flex",
};
