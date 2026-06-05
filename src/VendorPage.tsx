import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

type VendorStatus = "active" | "inactive";
type ViewMode = "card" | "table";
type SortKey = "name" | "createdAt" | "category";

const CATEGORIES = [
  "สายไฟ AC", "สายไฟ DC", "แผงโซลาร์ (Solar Panel)", "Inverter",
  "Transformer", "Switchgear & MDB", "อุปกรณ์ป้องกัน (Surge, Breaker, Fuse)",
  "Battery & Energy Storage", "Mounting Structure", "โยธา & งานฐานราก",
  "นั่งร้าน (Scaffolding)", "รั้ว & งานภูมิทัศน์", "ขนส่ง & โลจิสติกส์",
  "ติดตั้ง & Commissioning", "ตรวจสอบ & Survey (วิศวกร)", "ประกันภัย",
  "Monitoring System", "SCADA & Software", "IT & Network",
  "เครื่องมือ & อุปกรณ์ช่าง", "PPE & Safety", "อื่นๆ"
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "สายไฟ AC": { bg: "#fef3c7", color: "#b45309" },
  "สายไฟ DC": { bg: "#fef9c3", color: "#a16207" },
  "แผงโซลาร์ (Solar Panel)": { bg: "#d1fae5", color: "#065f46" },
  "Inverter": { bg: "#dbeafe", color: "#1e40af" },
  "Transformer": { bg: "#ede9fe", color: "#6d28d9" },
  "Switchgear & MDB": { bg: "#fce7f3", color: "#9d174d" },
  "อุปกรณ์ป้องกัน (Surge, Breaker, Fuse)": { bg: "#fee2e2", color: "#991b1b" },
  "Battery & Energy Storage": { bg: "#d1fae5", color: "#065f46" },
  "Mounting Structure": { bg: "#e0f2fe", color: "#0369a1" },
  "โยธา & งานฐานราก": { bg: "#f3f4f6", color: "#374151" },
  "นั่งร้าน (Scaffolding)": { bg: "#fef3c7", color: "#92400e" },
  "ขนส่ง & โลจิสติกส์": { bg: "#e0f2fe", color: "#075985" },
  "ติดตั้ง & Commissioning": { bg: "#d1fae5", color: "#064e3b" },
  "ตรวจสอบ & Survey (วิศวกร)": { bg: "#ede9fe", color: "#5b21b6" },
  "ประกันภัย": { bg: "#fce7f3", color: "#831843" },
  "Monitoring System": { bg: "#dbeafe", color: "#1d4ed8" },
  "SCADA & Software": { bg: "#e0e7ff", color: "#3730a3" },
  "IT & Network": { bg: "#f0fdf4", color: "#166534" },
  "เครื่องมือ & อุปกรณ์ช่าง": { bg: "#f3f4f6", color: "#1f2937" },
  "PPE & Safety": { bg: "#fff7ed", color: "#c2410c" },
  "อื่นๆ": { bg: "#f9fafb", color: "#6b7280" },
};

interface Vendor {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  contact: string;
  category: string;
  website: string;
  note: string;
  status: VendorStatus;
  createdAt: string;
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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} title="คัดลอก" style={{
      background: "none", border: "none", cursor: "pointer",
      fontSize: "12px", color: copied ? "#059669" : "#94a3b8",
      padding: "0 4px", transition: "color 0.2s", lineHeight: 1
    }}>
      {copied ? "✓" : "⎘"}
    </button>
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

interface VendorModalProps {
  vendor?: Vendor;
  onClose: () => void;
  onSave: (vendor: Omit<Vendor, "id">) => void;
}

function VendorFormModal({ vendor, onClose, onSave }: VendorModalProps) {
  const [form, setForm] = useState<Omit<Vendor, "id">>(vendor ? {
    name: vendor.name, address: vendor.address, phone: vendor.phone,
    email: vendor.email, contact: vendor.contact, category: vendor.category,
    website: vendor.website, note: vendor.note, status: vendor.status,
    createdAt: vendor.createdAt
  } : {
    name: "", address: "", phone: "", email: "",
    contact: "", category: CATEGORIES[0], website: "",
    note: "", status: "active", createdAt: new Date().toISOString().split("T")[0]
  });

  const handleSave = () => {
    if (!form.name || !form.phone) return;
    onSave(form);
    onClose();
  };

  const fields = [
    { label: "ชื่อบริษัท *", key: "name", type: "text", placeholder: "เช่น บริษัท สยามสายไฟ จำกัด" },
    { label: "ที่อยู่", key: "address", type: "text", placeholder: "เช่น 123 ถ.พระราม 2 กรุงเทพฯ" },
    { label: "เบอร์โทร *", key: "phone", type: "text", placeholder: "เช่น 02-123-4567" },
    { label: "Email", key: "email", type: "email", placeholder: "เช่น info@company.com" },
    { label: "เจ้าหน้าที่ที่ติดต่อ", key: "contact", type: "text", placeholder: "เช่น คุณสมชาย" },
    { label: "เว็บไซต์", key: "website", type: "text", placeholder: "เช่น www.company.com" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px", padding: "0", width: "560px", maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(26,60,110,0.3)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: "linear-gradient(135deg, #1a3c6e 0%, #2d5a9e 100%)", padding: "28px 32px", borderRadius: "24px 24px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, color: "white", fontSize: "20px", fontWeight: "700" }}>{vendor ? "✏️ แก้ไข Vendor" : "➕ เพิ่ม Vendor ใหม่"}</h3>
              <p style={{ margin: "4px 0 0", color: "rgba(226,201,126,0.9)", fontSize: "13px" }}>กรอกข้อมูล Vendor ให้ครบถ้วน</p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", color: "white", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
        <div style={{ padding: "28px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {fields.map(f => (
              <div key={f.key} style={{ gridColumn: f.key === "name" || f.key === "address" ? "1 / -1" : "auto" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxSizing: "border-box", fontSize: "14px", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = "#1a3c6e"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>หมวดหมู่</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxSizing: "border-box", fontSize: "14px" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>สถานะ</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as VendorStatus })}
                style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxSizing: "border-box", fontSize: "14px" }}>
                <option value="active">✅ Active</option>
                <option value="inactive">❌ Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>หมายเหตุ</label>
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              rows={2} placeholder="หมายเหตุเพิ่มเติม..."
              style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }} />
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "13px", background: "#f1f5f9", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", color: "#64748b", fontSize: "14px" }}>ยกเลิก</button>
            <button onClick={handleSave} style={{ flex: 2, padding: "13px", background: "linear-gradient(135deg, #1a3c6e, #2d5a9e)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "15px", boxShadow: "0 4px 14px rgba(26,60,110,0.35)" }}>บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorDetailModal({ vendor, onClose, onEdit, onDelete, onToggleStatus }: {
  vendor: Vendor; onClose: () => void;
  onEdit: () => void; onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const cc = CATEGORY_COLORS[vendor.category] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px", width: "520px", maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(26,60,110,0.3)" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1a3c6e 0%, #2d5a9e 100%)", padding: "32px", borderRadius: "24px 24px 0 0", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(226,201,126,0.12)" }} />
          <div style={{ position: "absolute", bottom: "-30px", left: "30%", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
            <div style={{ flex: 1, marginRight: "12px" }}>
              <h2 style={{ margin: "0 0 10px", color: "white", fontSize: "20px", fontWeight: "700", lineHeight: "1.3" }}>{vendor.name}</h2>
              <span style={{ background: cc.bg, color: cc.color, padding: "4px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" }}>{vendor.category}</span>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", color: "white", fontSize: "18px", flexShrink: 0 }}>✕</button>
          </div>
          {/* Status pill in header */}
          <div style={{ marginTop: "16px" }}>
            <button onClick={onToggleStatus} style={{
              padding: "6px 18px", borderRadius: "999px", border: "2px solid",
              borderColor: vendor.status === "active" ? "rgba(226,201,126,0.6)" : "rgba(255,255,255,0.3)",
              background: vendor.status === "active" ? "rgba(226,201,126,0.2)" : "rgba(255,255,255,0.1)",
              color: vendor.status === "active" ? "#e2c97e" : "rgba(255,255,255,0.7)",
              cursor: "pointer", fontWeight: "700", fontSize: "13px", transition: "all 0.2s"
            }}>
              {vendor.status === "active" ? "✅ Active — คลิกเพื่อเปลี่ยน" : "❌ Inactive — คลิกเพื่อเปลี่ยน"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {[
              { icon: "📞", label: "เบอร์โทร", value: vendor.phone, copy: true },
              { icon: "📧", label: "Email", value: vendor.email, copy: true },
              { icon: "👤", label: "เจ้าหน้าที่", value: vendor.contact, copy: false },
              { icon: "📍", label: "ที่อยู่", value: vendor.address, copy: false },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #eef2ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{f.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>{f.value}</p>
                    {f.copy && <CopyButton value={f.value} />}
                  </div>
                </div>
              </div>
            ))}
            {vendor.website && (
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #eef2ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🌐</div>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>Website</p>
                  <a href={`https://${vendor.website}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "14px", color: "#1a3c6e", fontWeight: "500", textDecoration: "none" }}>{vendor.website}</a>
                </div>
              </div>
            )}
          </div>

          {vendor.note && (
            <div style={{ background: "linear-gradient(135deg, #fefce8, #fef9c3)", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", borderLeft: "4px solid #e2c97e" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#92400e", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>💬 หมายเหตุ</p>
              <p style={{ margin: 0, fontSize: "14px", color: "#78350f" }}>{vendor.note}</p>
            </div>
          )}

          <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#cbd5e1", textAlign: "right" }}>เพิ่มเมื่อ: {vendor.createdAt}</p>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onEdit} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #eef2ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "12px", cursor: "pointer", fontWeight: "700", color: "#1a3c6e", fontSize: "14px", transition: "all 0.2s" }}>✏️ แก้ไข</button>
            <button onClick={onDelete} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #fff5f5, #fee2e2)", border: "1px solid #fecaca", borderRadius: "12px", cursor: "pointer", fontWeight: "700", color: "#dc2626", fontSize: "14px", transition: "all 0.2s" }}>🗑️ ลบ</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | undefined>();
  const [detailVendor, setDetailVendor] = useState<Vendor | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vendors"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vendor));
      setVendors(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = vendors
    .filter(v => {
      const matchSearch = search === "" ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.category.toLowerCase().includes(search.toLowerCase()) ||
        v.contact.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === "ทั้งหมด" || v.category === filterCategory;
      const matchStatus = filterStatus === "ทั้งหมด" || v.status === filterStatus;
      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "th");
      if (sortKey === "category") return a.category.localeCompare(b.category, "th");
      return b.createdAt.localeCompare(a.createdAt);
    });

  const handleSave = async (vendorData: Omit<Vendor, "id">) => {
    if (editVendor) {
      await updateDoc(doc(db, "vendors", editVendor.id), { ...vendorData });
    } else {
      await addDoc(collection(db, "vendors"), vendorData);
    }
    setEditVendor(undefined);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ต้องการลบ Vendor นี้มั้ย?")) {
      await deleteDoc(doc(db, "vendors", id));
      setDetailVendor(undefined);
    }
  };

  const handleToggleStatus = async (vendor: Vendor) => {
    const newStatus: VendorStatus = vendor.status === "active" ? "inactive" : "active";
    await updateDoc(doc(db, "vendors", vendor.id), { status: newStatus });
    if (detailVendor?.id === vendor.id) setDetailVendor({ ...detailVendor, status: newStatus });
  };

  const cc = (cat: string) => CATEGORY_COLORS[cat] || { bg: "#f3f4f6", color: "#374151" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f4ff 0%, #e8edf8 50%, #f5f0e8 100%)", fontFamily: "sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .vendor-card { transition: transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s cubic-bezier(0.22,1,0.36,1); cursor: pointer; animation: fadeInUp 0.4s ease both; }
        .vendor-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(26,60,110,0.16) !important; }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      {/* Form Modal */}
      {(showFormModal || editVendor) && (
        <VendorFormModal vendor={editVendor}
          onClose={() => { setShowFormModal(false); setEditVendor(undefined); }}
          onSave={handleSave} />
      )}

      {/* Detail Modal */}
      {detailVendor && (
        <VendorDetailModal vendor={detailVendor}
          onClose={() => setDetailVendor(undefined)}
          onEdit={() => { setEditVendor(detailVendor); setDetailVendor(undefined); }}
          onDelete={() => handleDelete(detailVendor.id)}
          onToggleStatus={() => handleToggleStatus(detailVendor)} />
      )}

      {/* ═══ HERO BANNER ═══ */}
      <div style={{ background: "linear-gradient(135deg, #0f2244 0%, #1a3c6e 45%, #2d5a9e 100%)", padding: "48px 40px 40px", position: "relative", overflow: "hidden" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(226,201,126,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-80px", right: "15%", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", left: "-40px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(226,201,126,0.06)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "24px" }}>
            {/* Title */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ background: "rgba(226,201,126,0.2)", border: "1px solid rgba(226,201,126,0.4)", color: "#e2c97e", padding: "4px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em" }}>
                  PROCUREMENT
                </span>
              </div>
              <h1 style={{ margin: "0 0 8px", color: "white", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "800", letterSpacing: "-0.02em" }}>
                🏢 Vendor Directory
              </h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "15px" }}>
                บริหารจัดการรายชื่อ Vendor ของฝ่ายจัดซื้อ
              </p>
            </div>

            {/* Add Button */}
            <button onClick={() => setShowFormModal(true)} className="action-btn" style={{
              padding: "14px 28px", background: "linear-gradient(135deg, #e2c97e, #c9a84c)",
              color: "#1a3c6e", border: "none", borderRadius: "14px", cursor: "pointer",
              fontWeight: "800", fontSize: "15px", boxShadow: "0 8px 24px rgba(226,201,126,0.35)",
              transition: "all 0.2s", whiteSpace: "nowrap"
            }}>
              ➕ เพิ่ม Vendor
            </button>
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "32px", maxWidth: "600px" }}>
            {[
              { label: "Vendor ทั้งหมด", count: vendors.length, icon: "🏢" },
              { label: "Active", count: vendors.filter(v => v.status === "active").length, icon: "✅" },
              { label: "Inactive", count: vendors.filter(v => v.status === "inactive").length, icon: "⏸️" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: "14px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "600" }}>{s.icon} {s.label}</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "white" }}>{s.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Search & Filter Card */}
        <div style={{ background: "white", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 24px rgba(26,60,110,0.08)", marginBottom: "24px", border: "1px solid rgba(226,201,126,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "14px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", marginBottom: "7px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>🔍 ค้นหา</label>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อบริษัท, หมวดหมู่, เจ้าหน้าที่..."
                style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", boxSizing: "border-box", fontSize: "14px", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#1a3c6e"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </div>
            {[
              { label: "หมวดหมู่", value: filterCategory, setter: setFilterCategory, options: ["ทั้งหมด", ...CATEGORIES] },
              { label: "สถานะ", value: filterStatus, setter: setFilterStatus, options: ["ทั้งหมด", "active", "inactive"] },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", marginBottom: "7px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{f.label}</label>
                <select value={f.value} onChange={e => f.setter(e.target.value)}
                  style={{ width: "100%", padding: "11px 10px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "13px" }}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{ display: "block", marginBottom: "7px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>เรียงตาม</label>
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                style={{ width: "100%", padding: "11px 10px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "13px" }}>
                <option value="createdAt">วันที่ล่าสุด</option>
                <option value="name">ชื่อ A-Z</option>
                <option value="category">หมวดหมู่</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
              แสดง <strong style={{ color: "#1a3c6e" }}>{filtered.length}</strong> จาก <strong style={{ color: "#1a3c6e" }}>{vendors.length}</strong> Vendor
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["card", "table"] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{
                  padding: "7px 16px", borderRadius: "8px", border: "1.5px solid",
                  borderColor: viewMode === m ? "#1a3c6e" : "#e2e8f0",
                  background: viewMode === m ? "#1a3c6e" : "white",
                  color: viewMode === m ? "white" : "#94a3b8",
                  cursor: "pointer", fontWeight: "700", fontSize: "13px", transition: "all 0.2s"
                }}>
                  {m === "card" ? "⊞ Card" : "☰ Table"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(26,60,110,0.08)" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏢</div>
            <h3 style={{ margin: "0 0 8px", color: "#1a3c6e", fontSize: "20px", fontWeight: "700" }}>
              {vendors.length === 0 ? "ยังไม่มี Vendor" : "ไม่พบ Vendor ที่ตรงกับการค้นหา"}
            </h3>
            <p style={{ margin: "0 0 28px", color: "#94a3b8", fontSize: "15px" }}>
              {vendors.length === 0 ? "เริ่มต้นด้วยการเพิ่ม Vendor รายแรก" : "ลองเปลี่ยน keyword หรือ filter ดูครับ"}
            </p>
            {vendors.length === 0 && (
              <button onClick={() => setShowFormModal(true)} style={{
                padding: "14px 32px", background: "linear-gradient(135deg, #1a3c6e, #2d5a9e)",
                color: "white", border: "none", borderRadius: "12px", cursor: "pointer",
                fontWeight: "700", fontSize: "15px", boxShadow: "0 6px 20px rgba(26,60,110,0.3)"
              }}>➕ เพิ่ม Vendor แรก</button>
            )}
          </div>
        )}

        {/* Card View */}
        {!loading && filtered.length > 0 && viewMode === "card" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
            {filtered.map((vendor, idx) => {
              const catC = cc(vendor.category);
              return (
                <div key={vendor.id} className="vendor-card"
                  onClick={() => setDetailVendor(vendor)}
                  style={{ animationDelay: `${idx * 0.05}s`, background: "white", borderRadius: "18px", padding: "22px", boxShadow: "0 4px 16px rgba(26,60,110,0.08)", borderTop: `3px solid ${vendor.status === "active" ? "#e2c97e" : "#e2e8f0"}` }}>

                  {/* Card Top */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div style={{ flex: 1, marginRight: "10px" }}>
                      <h3 style={{ margin: "0 0 8px", color: "#1a3c6e", fontSize: "15px", fontWeight: "700", lineHeight: "1.35" }}>
                        {highlight(vendor.name, search)}
                      </h3>
                      <span style={{ background: catC.bg, color: catC.color, padding: "3px 11px", borderRadius: "999px", fontSize: "11px", fontWeight: "700" }}>
                        {vendor.category}
                      </span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleToggleStatus(vendor); }} style={{
                      background: vendor.status === "active" ? "linear-gradient(135deg, #fefce8, #fef9c3)" : "#f1f5f9",
                      color: vendor.status === "active" ? "#92400e" : "#94a3b8",
                      padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700",
                      border: vendor.status === "active" ? "1px solid #e2c97e" : "1px solid #e2e8f0",
                      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s"
                    }}>
                      {vendor.status === "active" ? "✅ Active" : "⏸ Inactive"}
                    </button>
                  </div>

                  {/* Divider */}
                  <div style={{ height: "1px", background: "linear-gradient(90deg, #e2c97e33, transparent)", marginBottom: "14px" }} />

                  {/* Contact Info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {[
                      { icon: "📞", value: vendor.phone },
                      { icon: "📧", value: vendor.email },
                      { icon: "👤", value: vendor.contact },
                    ].filter(f => f.value).map(f => (
                      <div key={f.icon} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", minWidth: "20px" }}>{f.icon}</span>
                        <span style={{ fontSize: "13px", color: "#475569", flex: 1 }}>{highlight(f.value, search)}</span>
                        <CopyButton value={f.value} />
                      </div>
                    ))}
                  </div>

                  {vendor.note && (
                    <div style={{ marginTop: "12px", background: "linear-gradient(135deg, #fefce8, #fef9c3)", borderRadius: "8px", padding: "8px 12px", borderLeft: "3px solid #e2c97e" }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#78350f" }}>💬 {vendor.note}</p>
                    </div>
                  )}

                  <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: "12px", color: "#cbd5e1" }}>คลิกเพื่อดูรายละเอียด →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {!loading && filtered.length > 0 && viewMode === "table" && (
          <div style={{ background: "white", borderRadius: "20px", boxShadow: "0 4px 24px rgba(26,60,110,0.08)", overflow: "hidden", border: "1px solid rgba(226,201,126,0.15)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #1a3c6e, #2d5a9e)" }}>
                  {["ชื่อบริษัท", "หมวดหมู่", "เบอร์โทร", "เจ้าหน้าที่", "สถานะ", ""].map((h, i) => (
                    <th key={i} style={{ padding: "16px 18px", textAlign: "left", fontWeight: "700", fontSize: "12px", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((vendor, i) => {
                  const catC = cc(vendor.category);
                  const isHovered = hoveredId === vendor.id;
                  return (
                    <tr key={vendor.id}
                      onClick={() => setDetailVendor(vendor)}
                      onMouseEnter={() => setHoveredId(vendor.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: isHovered ? "#f8faff" : i % 2 === 0 ? "white" : "#fafbff", transition: "background 0.15s" }}>
                      <td style={{ padding: "16px 18px", fontWeight: "700", color: "#1a3c6e" }}>{highlight(vendor.name, search)}</td>
                      <td style={{ padding: "16px 18px" }}>
                        <span style={{ background: catC.bg, color: catC.color, padding: "3px 11px", borderRadius: "999px", fontSize: "11px", fontWeight: "700" }}>{vendor.category}</span>
                      </td>
                      <td style={{ padding: "16px 18px", color: "#475569" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {vendor.phone} <CopyButton value={vendor.phone} />
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", color: "#475569" }}>{highlight(vendor.contact, search)}</td>
                      <td style={{ padding: "16px 18px" }}>
                        <button onClick={e => { e.stopPropagation(); handleToggleStatus(vendor); }} style={{
                          background: vendor.status === "active" ? "linear-gradient(135deg, #fefce8, #fef9c3)" : "#f1f5f9",
                          color: vendor.status === "active" ? "#92400e" : "#94a3b8",
                          padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700",
                          border: vendor.status === "active" ? "1px solid #e2c97e" : "1px solid #e2e8f0",
                          cursor: "pointer", transition: "all 0.2s"
                        }}>
                          {vendor.status === "active" ? "✅ Active" : "⏸ Inactive"}
                        </button>
                      </td>
                      <td style={{ padding: "16px 18px" }}>
                        <button onClick={e => { e.stopPropagation(); setEditVendor(vendor); }} style={{
                          padding: "6px 14px", background: "linear-gradient(135deg, #eef2ff, #dbeafe)",
                          border: "1px solid #bfdbfe", borderRadius: "8px", cursor: "pointer",
                          fontSize: "12px", color: "#1a3c6e", fontWeight: "700"
                        }}>✏️ แก้ไข</button>
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
