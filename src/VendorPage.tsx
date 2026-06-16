import { useState, useEffect } from "react";
import {
  collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc, getDocs, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

type VendorStatus = "active" | "inactive";
type ViewMode = "card" | "table";
type SortKey = "spend" | "name" | "lastPurchase";

const CATEGORIES = [
  "สายไฟ AC", "สายไฟ DC", "แผงโซลาร์ (Solar Panel)", "Inverter & Optimizer",
  "Transformer", "Switchgear & MDB", "อุปกรณ์ป้องกัน (Surge, Breaker, Fuse)",
  "Battery & Energy Storage", "Mounting Structure", "โยธา & งานฐานราก",
  "นั่งร้าน (Scaffolding)", "รั้ว & งานภูมิทัศน์", "ขนส่ง & โลจิสติกส์",
  "ติดตั้ง & Commissioning", "ตรวจสอบ & Survey (วิศวกร)", "ประกันภัย",
  "Monitoring System", "SCADA & Software", "IT & Network",
  "เครื่องมือ & อุปกรณ์ช่าง", "PPE & Safety",
  // หมวดเพิ่ม (overhead / งาน)
  "ค่าแรง", "งาน Subcontract", "งานบริการ & บำรุงรักษา (O&M)", "งานบริหารโครงการ",
  "ค่าเช่า", "อุปกรณ์/งานสำนักงาน", "สวัสดิการ & บุคคล",
  "ค่าธรรมเนียม & สาธารณูปโภค", "ยานพาหนะ", "อื่นๆ",
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "สายไฟ AC": { bg: "#fef3c7", color: "#b45309" },
  "สายไฟ DC": { bg: "#fef9c3", color: "#a16207" },
  "แผงโซลาร์ (Solar Panel)": { bg: "#d1fae5", color: "#065f46" },
  "Inverter & Optimizer": { bg: "#dbeafe", color: "#1e40af" },
  "Transformer": { bg: "#ede9fe", color: "#6d28d9" },
  "Switchgear & MDB": { bg: "#fce7f3", color: "#9d174d" },
  "อุปกรณ์ป้องกัน (Surge, Breaker, Fuse)": { bg: "#fee2e2", color: "#991b1b" },
  "Battery & Energy Storage": { bg: "#ccfbf1", color: "#0f766e" },
  "Mounting Structure": { bg: "#e0f2fe", color: "#0369a1" },
  "โยธา & งานฐานราก": { bg: "#f3f4f6", color: "#374151" },
  "นั่งร้าน (Scaffolding)": { bg: "#fef3c7", color: "#92400e" },
  "รั้ว & งานภูมิทัศน์": { bg: "#ecfccb", color: "#3f6212" },
  "ขนส่ง & โลจิสติกส์": { bg: "#e0f2fe", color: "#075985" },
  "ติดตั้ง & Commissioning": { bg: "#d1fae5", color: "#064e3b" },
  "ตรวจสอบ & Survey (วิศวกร)": { bg: "#ede9fe", color: "#5b21b6" },
  "ประกันภัย": { bg: "#fce7f3", color: "#831843" },
  "Monitoring System": { bg: "#dbeafe", color: "#1d4ed8" },
  "SCADA & Software": { bg: "#e0e7ff", color: "#3730a3" },
  "IT & Network": { bg: "#f0fdf4", color: "#166534" },
  "เครื่องมือ & อุปกรณ์ช่าง": { bg: "#f3f4f6", color: "#1f2937" },
  "PPE & Safety": { bg: "#fff7ed", color: "#c2410c" },
  "ค่าแรง": { bg: "#fef2f2", color: "#b91c1c" },
  "งาน Subcontract": { bg: "#eef2ff", color: "#4338ca" },
  "งานบริการ & บำรุงรักษา (O&M)": { bg: "#f0fdfa", color: "#0d9488" },
  "งานบริหารโครงการ": { bg: "#faf5ff", color: "#7e22ce" },
  "ค่าเช่า": { bg: "#fffbeb", color: "#a16207" },
  "อุปกรณ์/งานสำนักงาน": { bg: "#f8fafc", color: "#475569" },
  "สวัสดิการ & บุคคล": { bg: "#fdf2f8", color: "#be185d" },
  "ค่าธรรมเนียม & สาธารณูปโภค": { bg: "#f1f5f9", color: "#334155" },
  "ยานพาหนะ": { bg: "#fef9c3", color: "#854d0e" },
  "อื่นๆ": { bg: "#f9fafb", color: "#6b7280" },
};
const catColor = (c: string) => CATEGORY_COLORS[c] || { bg: "#f3f4f6", color: "#374151" };

const GROUP_LABEL: Record<string, string> = {
  LOCAL: "🇹🇭 Local", GROUP: "🏢 ในเครือ", OVERSEA: "🌏 Oversea", EMP: "👤 Employee",
};

interface Vendor {
  id: string;            // = vendorCode (doc id)
  vendorCode: string;
  name: string;
  vendorGroup: string;
  categories: string[];
  totalSpend: number;
  numPOs: number;
  lastPurchase: string;
  topPaymentTerms: string;
  topProject: string;
  status: VendorStatus;
  note: string;
  source: string;
}

// ───────── helpers ─────────
function bahtFull(n: number) {
  return "฿" + (n || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });
}
function bahtShort(n: number) {
  const v = n || 0;
  if (Math.abs(v) >= 1_000_000) return "฿" + (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return "฿" + (v / 1_000).toFixed(0) + "K";
  return "฿" + v.toFixed(0);
}
function highlight(text: string, search: string) {
  if (!search || !text) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${search})`, "gi"));
  return (
    <span>
      {parts.map((p, i) =>
        p.toLowerCase() === search.toLowerCase()
          ? <mark key={i} style={{ background: "#e2c97e", borderRadius: "2px", padding: "0 2px", color: "#1a3c6e" }}>{p}</mark>
          : p
      )}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(26,60,110,0.08)", borderTop: "3px solid #e2e8f0" }}>
      {[70, 40, 80, 60, 50].map((w, i) => (
        <div key={i} style={{ height: "11px", background: "linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9)", backgroundSize: "200% 100%", borderRadius: "6px", width: `${w}%`, marginBottom: "14px", animation: "shimmer 1.5s infinite" }} />
      ))}
    </div>
  );
}

function CategoryChips({ cats, max, search }: { cats: string[]; max?: number; search?: string }) {
  const show = max ? cats.slice(0, max) : cats;
  const extra = max && cats.length > max ? cats.length - max : 0;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {show.map(c => {
        const cc = catColor(c);
        return <span key={c} style={{ background: cc.bg, color: cc.color, padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700" }}>
          {search ? highlight(c, search) : c}
        </span>;
      })}
      {extra > 0 && <span style={{ background: "#1a3c6e", color: "white", padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700" }}>+{extra}</span>}
    </div>
  );
}

// ───────── Detail + Edit modal ─────────
function VendorDetailModal({ vendor, onClose, onDelete, onToggleStatus, onSaveCategories, onSaveNote }: {
  vendor: Vendor; onClose: () => void; onDelete: () => void; onToggleStatus: () => void;
  onSaveCategories: (cats: string[]) => void; onSaveNote: (note: string) => void;
}) {
  const [editingCats, setEditingCats] = useState(false);
  const [cats, setCats] = useState<string[]>(vendor.categories || []);
  const [note, setNote] = useState(vendor.note || "");

  const toggleCat = (c: string) =>
    setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px", width: "560px", maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(26,60,110,0.3)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1a3c6e 0%, #2d5a9e 100%)", padding: "32px", borderRadius: "24px 24px 0 0", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(226,201,126,0.12)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
            <div style={{ flex: 1, marginRight: "12px" }}>
              <p style={{ margin: "0 0 4px", color: "rgba(226,201,126,0.9)", fontSize: "12px", fontWeight: "700", letterSpacing: "0.05em" }}>
                {vendor.vendorCode} · {GROUP_LABEL[vendor.vendorGroup] || vendor.vendorGroup}
              </p>
              <h2 style={{ margin: 0, color: "white", fontSize: "20px", fontWeight: "700", lineHeight: "1.3" }}>{vendor.name}</h2>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", color: "white", fontSize: "18px", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ marginTop: "16px" }}>
            <button onClick={onToggleStatus} style={{
              padding: "6px 18px", borderRadius: "999px", border: "2px solid",
              borderColor: vendor.status === "active" ? "rgba(226,201,126,0.6)" : "rgba(255,255,255,0.3)",
              background: vendor.status === "active" ? "rgba(226,201,126,0.2)" : "rgba(255,255,255,0.1)",
              color: vendor.status === "active" ? "#e2c97e" : "rgba(255,255,255,0.7)",
              cursor: "pointer", fontWeight: "700", fontSize: "13px",
            }}>
              {vendor.status === "active" ? "✅ Active — คลิกเพื่อเปลี่ยน" : "❌ Inactive — คลิกเพื่อเปลี่ยน"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px" }}>
          {/* Stat tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[
              { label: "ยอดซื้อสะสม", value: bahtFull(vendor.totalSpend) },
              { label: "จำนวน PO", value: vendor.numPOs?.toLocaleString() },
              { label: "ซื้อล่าสุด", value: vendor.lastPurchase },
            ].map(s => (
              <div key={s.label} style={{ background: "linear-gradient(135deg, #f8faff, #eef2ff)", borderRadius: "12px", padding: "14px", textAlign: "center", border: "1px solid #e0e7ff" }}>
                <p style={{ margin: "0 0 4px", fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: "15px", color: "#1a3c6e", fontWeight: "800" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* extra info row */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px", fontSize: "13px", color: "#475569" }}>
            <div><span style={{ color: "#94a3b8" }}>เงื่อนไขชำระ: </span><strong>{vendor.topPaymentTerms || "-"}</strong></div>
            <div><span style={{ color: "#94a3b8" }}>โปรเจกต์หลัก: </span><strong>{vendor.topProject || "-"}</strong></div>
          </div>

          {/* Categories with edit */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>หมวดหมู่ ({cats.length})</p>
              {!editingCats
                ? <button onClick={() => setEditingCats(true)} style={{ background: "none", border: "1px solid #bfdbfe", color: "#1a3c6e", borderRadius: "8px", padding: "4px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>✏️ แก้หมวด</button>
                : <button onClick={() => { onSaveCategories(cats); setEditingCats(false); }} style={{ background: "linear-gradient(135deg, #1a3c6e, #2d5a9e)", border: "none", color: "white", borderRadius: "8px", padding: "4px 14px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>💾 บันทึก</button>}
            </div>
            {!editingCats ? (
              cats.length ? <CategoryChips cats={cats} /> : <p style={{ margin: 0, color: "#cbd5e1", fontSize: "13px" }}>ยังไม่มีหมวด</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "200px", overflowY: "auto", padding: "4px" }}>
                {CATEGORIES.map(c => {
                  const on = cats.includes(c); const cc = catColor(c);
                  return (
                    <button key={c} onClick={() => toggleCat(c)} style={{
                      padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                      border: on ? `2px solid ${cc.color}` : "1.5px solid #e2e8f0",
                      background: on ? cc.bg : "white", color: on ? cc.color : "#94a3b8",
                    }}>
                      {on ? "✓ " : ""}{c}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Note */}
          <div style={{ marginBottom: "24px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>💬 หมายเหตุ</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => onSaveNote(note)} rows={2}
              placeholder="พิมพ์หมายเหตุ แล้วคลิกที่อื่นเพื่อบันทึก..."
              style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }} />
          </div>

          <button onClick={onDelete} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #fff5f5, #fee2e2)", border: "1px solid #fecaca", borderRadius: "12px", cursor: "pointer", fontWeight: "700", color: "#dc2626", fontSize: "14px" }}>🗑️ ลบ Vendor นี้</button>
        </div>
      </div>
    </div>
  );
}

// ───────── Temporary import modal ─────────
function ImportModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      setStatus("กำลังโหลด /vendor_master.json ...");
      const res = await fetch("/vendor_master.json");
      if (!res.ok) throw new Error("โหลดไฟล์ไม่ได้ (" + res.status + ")");
      const data: Vendor[] = await res.json();

      setStatus("กำลังล้างข้อมูลเดิมใน vendors ...");
      const existing = await getDocs(collection(db, "vendors"));
      let batch = writeBatch(db); let n = 0;
      for (const d of existing.docs) { batch.delete(d.ref); if (++n >= 450) { await batch.commit(); batch = writeBatch(db); n = 0; } }
      if (n > 0) await batch.commit();

      setStatus(`กำลังเขียน ${data.length} ราย ...`);
      batch = writeBatch(db); n = 0;
      for (const v of data) {
        batch.set(doc(db, "vendors", v.vendorCode), { ...v, status: v.status || "active" });
        if (++n >= 450) { await batch.commit(); batch = writeBatch(db); n = 0; }
      }
      if (n > 0) await batch.commit();

      setStatus(`✅ เสร็จเรียบร้อย! นำเข้า ${data.length} ราย`);
    } catch (e: any) {
      setStatus("❌ ผิดพลาด: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "20px", padding: "28px", width: "440px", maxWidth: "92vw" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 6px", color: "#1a3c6e" }}>🔧 นำเข้า Vendor (เครื่องมือชั่วคราว)</h3>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
          จะ <strong style={{ color: "#dc2626" }}>ลบ vendor เดิมทั้งหมด</strong> แล้วเขียนใหม่จาก <code>/vendor_master.json</code> (454 ราย, doc id = รหัส vendor) กดครั้งเดียวพอ
        </p>
        {status && <div style={{ background: "#f8faff", border: "1px solid #e0e7ff", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#1a3c6e", marginBottom: "16px" }}>{status}</div>}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", color: "#64748b" }}>ปิด</button>
          <button onClick={run} disabled={running} style={{ flex: 2, padding: "12px", background: running ? "#94a3b8" : "linear-gradient(135deg, #1a3c6e, #2d5a9e)", color: "white", border: "none", borderRadius: "10px", cursor: running ? "not-allowed" : "pointer", fontWeight: "700" }}>
            {running ? "กำลังทำงาน..." : "เริ่มนำเข้า 454 ราย"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Main page ─────────
export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [filterGroup, setFilterGroup] = useState("ทั้งหมด");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [detailVendor, setDetailVendor] = useState<Vendor | undefined>();
  const [showImport, setShowImport] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vendors"), (snap) => {
      const data = snap.docs.map(d => {
        const raw = d.data() as any;
        return {
          id: d.id,
          vendorCode: raw.vendorCode || d.id,
          name: raw.name || "",
          vendorGroup: raw.vendorGroup || "",
          categories: raw.categories || [],
          totalSpend: raw.totalSpend || 0,
          numPOs: raw.numPOs || 0,
          lastPurchase: raw.lastPurchase || "",
          topPaymentTerms: raw.topPaymentTerms || "",
          topProject: raw.topProject || "",
          status: raw.status || "active",
          note: raw.note || "",
          source: raw.source || "",
        } as Vendor;
      });
      setVendors(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = vendors
    .filter(v => {
      const s = search.toLowerCase();
      const matchSearch = s === "" ||
        v.name.toLowerCase().includes(s) ||
        v.vendorCode.toLowerCase().includes(s) ||
        v.categories.some(c => c.toLowerCase().includes(s)) ||
        v.note.toLowerCase().includes(s);
      const matchCat = filterCategory === "ทั้งหมด" || v.categories.includes(filterCategory);
      const matchStatus = filterStatus === "ทั้งหมด" || v.status === filterStatus;
      const matchGroup = filterGroup === "ทั้งหมด" || v.vendorGroup === filterGroup;
      return matchSearch && matchCat && matchStatus && matchGroup;
    })
    .sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "th");
      if (sortKey === "lastPurchase") return (b.lastPurchase || "").localeCompare(a.lastPurchase || "");
      return b.totalSpend - a.totalSpend;
    });

  const totalSpendAll = vendors.reduce((s, v) => s + v.totalSpend, 0);

  const handleDelete = async (id: string) => {
    if (window.confirm("ต้องการลบ Vendor นี้มั้ย?")) {
      await deleteDoc(doc(db, "vendors", id));
      setDetailVendor(undefined);
    }
  };
  const handleToggleStatus = async (v: Vendor) => {
    const ns: VendorStatus = v.status === "active" ? "inactive" : "active";
    await updateDoc(doc(db, "vendors", v.id), { status: ns });
    if (detailVendor?.id === v.id) setDetailVendor({ ...detailVendor, status: ns });
  };
  const handleSaveCategories = async (v: Vendor, cats: string[]) => {
    await updateDoc(doc(db, "vendors", v.id), { categories: cats });
    if (detailVendor?.id === v.id) setDetailVendor({ ...detailVendor, categories: cats });
  };
  const handleSaveNote = async (v: Vendor, note: string) => {
    await updateDoc(doc(db, "vendors", v.id), { note });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f4ff 0%, #e8edf8 50%, #f5f0e8 100%)", fontFamily: "sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .vendor-card { transition: transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s cubic-bezier(0.22,1,0.36,1); cursor: pointer; animation: fadeInUp 0.4s ease both; }
        .vendor-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(26,60,110,0.16) !important; }
        .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
      `}</style>

      {detailVendor && (
        <VendorDetailModal vendor={detailVendor}
          onClose={() => setDetailVendor(undefined)}
          onDelete={() => handleDelete(detailVendor.id)}
          onToggleStatus={() => handleToggleStatus(detailVendor)}
          onSaveCategories={(cats) => handleSaveCategories(detailVendor, cats)}
          onSaveNote={(note) => handleSaveNote(detailVendor, note)} />
      )}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      {/* HERO */}
      <div style={{ background: "linear-gradient(135deg, #0f2244 0%, #1a3c6e 45%, #2d5a9e 100%)", padding: "48px 40px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(226,201,126,0.08)" }} />
        <div style={{ position: "absolute", bottom: "-80px", right: "15%", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "24px" }}>
            <div>
              <span style={{ background: "rgba(226,201,126,0.2)", border: "1px solid rgba(226,201,126,0.4)", color: "#e2c97e", padding: "4px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em" }}>PROCUREMENT</span>
              <h1 style={{ margin: "10px 0 8px", color: "white", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "800", letterSpacing: "-0.02em" }}>🏢 Vendor Directory</h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "15px" }}>ฐานข้อมูล Vendor จากประวัติการสั่งซื้อจริง</p>
            </div>
            <button onClick={() => setShowImport(true)} className="action-btn" style={{
              padding: "12px 22px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)",
              color: "white", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "14px", whiteSpace: "nowrap",
            }}>🔧 นำเข้าข้อมูล</button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "32px", maxWidth: "760px" }}>
            {[
              { label: "Vendor ทั้งหมด", count: vendors.length.toLocaleString(), icon: "🏢" },
              { label: "Active", count: vendors.filter(v => v.status === "active").length.toLocaleString(), icon: "✅" },
              { label: "Inactive", count: vendors.filter(v => v.status === "inactive").length.toLocaleString(), icon: "⏸️" },
              { label: "มูลค่าซื้อรวม", count: bahtShort(totalSpendAll), icon: "💰" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: "14px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "600" }}>{s.icon} {s.label}</p>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "white" }}>{s.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Filters */}
        <div style={{ background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 24px rgba(26,60,110,0.08)", marginBottom: "24px", border: "1px solid rgba(226,201,126,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "14px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", marginBottom: "7px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>🔍 ค้นหา</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ชื่อบริษัท, รหัส, หมวดหมู่..."
                style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "2px solid #e2c97e", boxSizing: "border-box", fontSize: "14px", outline: "none", background: "#fffdf5" }}
                onFocus={e => { e.target.style.borderColor = "#1a3c6e"; }} onBlur={e => { e.target.style.borderColor = "#e2c97e"; }} />
            </div>
            {[
              { label: "หมวดหมู่", value: filterCategory, setter: setFilterCategory, options: ["ทั้งหมด", ...CATEGORIES] },
              { label: "กลุ่ม", value: filterGroup, setter: setFilterGroup, options: ["ทั้งหมด", "LOCAL", "GROUP", "OVERSEA", "EMP"] },
              { label: "สถานะ", value: filterStatus, setter: setFilterStatus, options: ["ทั้งหมด", "active", "inactive"] },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", marginBottom: "7px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{f.label}</label>
                <select value={f.value} onChange={e => f.setter(e.target.value)} style={{ width: "100%", padding: "11px 10px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "13px" }}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{ display: "block", marginBottom: "7px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>เรียงตาม</label>
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} style={{ width: "100%", padding: "11px 10px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "13px" }}>
                <option value="spend">ยอดซื้อสูงสุด</option>
                <option value="lastPurchase">ซื้อล่าสุด</option>
                <option value="name">ชื่อ A-Z</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>แสดง <strong style={{ color: "#1a3c6e" }}>{filtered.length}</strong> จาก <strong style={{ color: "#1a3c6e" }}>{vendors.length}</strong> Vendor</p>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["card", "table"] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{
                  padding: "7px 16px", borderRadius: "8px", border: "1.5px solid",
                  borderColor: viewMode === m ? "#1a3c6e" : "#e2e8f0", background: viewMode === m ? "#1a3c6e" : "white",
                  color: viewMode === m ? "white" : "#94a3b8", cursor: "pointer", fontWeight: "700", fontSize: "13px",
                }}>{m === "card" ? "⊞ Card" : "☰ Table"}</button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(26,60,110,0.08)" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏢</div>
            <h3 style={{ margin: "0 0 8px", color: "#1a3c6e", fontSize: "20px", fontWeight: "700" }}>{vendors.length === 0 ? "ยังไม่มี Vendor" : "ไม่พบ Vendor ที่ตรงกับการค้นหา"}</h3>
            <p style={{ margin: "0 0 28px", color: "#94a3b8", fontSize: "15px" }}>{vendors.length === 0 ? "กดปุ่ม 🔧 นำเข้าข้อมูล มุมขวาบน เพื่อโหลด 454 ราย" : "ลองเปลี่ยน keyword หรือ filter ดู"}</p>
          </div>
        )}

        {/* Card view */}
        {!loading && filtered.length > 0 && viewMode === "card" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: "18px" }}>
            {filtered.map((v, idx) => (
              <div key={v.id} className="vendor-card" onClick={() => setDetailVendor(v)}
                style={{ animationDelay: `${Math.min(idx, 12) * 0.04}s`, background: "white", borderRadius: "18px", padding: "22px", boxShadow: "0 4px 16px rgba(26,60,110,0.08)", borderTop: `3px solid ${v.status === "active" ? "#e2c97e" : "#e2e8f0"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ flex: 1, marginRight: "10px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#94a3b8", fontWeight: "700" }}>{v.vendorCode} · {GROUP_LABEL[v.vendorGroup] || v.vendorGroup}</p>
                    <h3 style={{ margin: 0, color: "#1a3c6e", fontSize: "15px", fontWeight: "700", lineHeight: "1.35" }}>{highlight(v.name, search)}</h3>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleToggleStatus(v); }} style={{
                    background: v.status === "active" ? "linear-gradient(135deg, #fefce8, #fef9c3)" : "#f1f5f9",
                    color: v.status === "active" ? "#92400e" : "#94a3b8", padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700",
                    border: v.status === "active" ? "1px solid #e2c97e" : "1px solid #e2e8f0", cursor: "pointer", whiteSpace: "nowrap",
                  }}>{v.status === "active" ? "✅ Active" : "⏸ Inactive"}</button>
                </div>

                <div style={{ height: "1px", background: "linear-gradient(90deg, #e2c97e33, transparent)", margin: "12px 0" }} />

                <div style={{ marginBottom: "14px" }}>
                  <CategoryChips cats={v.categories} max={3} search={search} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {[
                    { label: "ยอดซื้อ", value: bahtShort(v.totalSpend) },
                    { label: "PO", value: v.numPOs.toLocaleString() },
                    { label: "ล่าสุด", value: v.lastPurchase ? v.lastPurchase.slice(2) : "-" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#f8faff", borderRadius: "10px", padding: "9px 6px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "9px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>{s.label}</p>
                      <p style={{ margin: 0, fontSize: "13px", color: "#1a3c6e", fontWeight: "800" }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "12px", color: "#cbd5e1" }}>คลิกดูรายละเอียด / แก้หมวด →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table view */}
        {!loading && filtered.length > 0 && viewMode === "table" && (
          <div style={{ background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(26,60,110,0.08)", overflow: "hidden", border: "1px solid rgba(226,201,126,0.15)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #1a3c6e, #2d5a9e)" }}>
                  {["รหัส", "ชื่อบริษัท", "หมวดหมู่", "ยอดซื้อ", "PO", "ล่าสุด", "สถานะ"].map((h, i) => (
                    <th key={i} style={{ padding: "14px 16px", textAlign: i >= 3 && i <= 4 ? "right" : "left", fontWeight: "700", fontSize: "12px", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => {
                  const hov = hoveredId === v.id;
                  return (
                    <tr key={v.id} onClick={() => setDetailVendor(v)} onMouseEnter={() => setHoveredId(v.id)} onMouseLeave={() => setHoveredId(null)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: hov ? "#f8faff" : i % 2 === 0 ? "white" : "#fafbff" }}>
                      <td style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: "700", fontSize: "12px" }}>{v.vendorCode}</td>
                      <td style={{ padding: "14px 16px", fontWeight: "700", color: "#1a3c6e" }}>{highlight(v.name, search)}</td>
                      <td style={{ padding: "14px 16px" }}><CategoryChips cats={v.categories} max={2} /></td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "700", color: "#1a3c6e" }}>{bahtShort(v.totalSpend)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", color: "#475569" }}>{v.numPOs}</td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>{v.lastPurchase}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <button onClick={e => { e.stopPropagation(); handleToggleStatus(v); }} style={{
                          background: v.status === "active" ? "linear-gradient(135deg, #fefce8, #fef9c3)" : "#f1f5f9",
                          color: v.status === "active" ? "#92400e" : "#94a3b8", padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700",
                          border: v.status === "active" ? "1px solid #e2c97e" : "1px solid #e2e8f0", cursor: "pointer",
                        }}>{v.status === "active" ? "✅" : "⏸"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
