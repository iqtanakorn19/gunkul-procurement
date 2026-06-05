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
          ? <mark key={i} style={{ background: "#fde68a", borderRadius: "2px", padding: "0 1px" }}>{p}</mark>
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
    <button onClick={handleCopy} style={{
      background: "none", border: "none", cursor: "pointer",
      fontSize: "11px", color: copied ? "#059669" : "#aaa",
      padding: "0 4px", transition: "color 0.2s"
    }}>
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: "4px solid #e5e7eb" }}>
      {[80, 50, 70, 60, 55].map((w, i) => (
        <div key={i} style={{ height: "12px", background: "#f3f4f6", borderRadius: "6px", width: `${w}%`, marginBottom: "12px", animation: "pulse 1.5s ease-in-out infinite" }} />
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
    <div style={{ position: "fixed", inset: 0, background: "#00000070", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "540px", maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ margin: 0, color: "#1a3c6e", fontSize: "18px" }}>{vendor ? "✏️ แก้ไข Vendor" : "➕ เพิ่ม Vendor ใหม่"}</h3>
          <button onClick={onClose} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: f.key === "name" || f.key === "address" ? "1 / -1" : "auto" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", boxSizing: "border-box", fontSize: "14px", outline: "none" }} />
            </div>
          ))}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>หมวดหมู่</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", boxSizing: "border-box", fontSize: "14px" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>สถานะ</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as VendorStatus })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", boxSizing: "border-box", fontSize: "14px" }}>
              <option value="active">✅ Active</option>
              <option value="inactive">❌ Inactive</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: "14px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>หมายเหตุ</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2} placeholder="หมายเหตุเพิ่มเติม..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }} />
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#f5f5f5", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", color: "#555" }}>ยกเลิก</button>
          <button onClick={handleSave} style={{ flex: 2, padding: "12px", backgroundColor: "#1a3c6e", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "15px" }}>บันทึก</button>
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
  const catColor = CATEGORY_COLORS[vendor.category] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000070", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: "20px", width: "500px", maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1a3c6e, #2d6abf)", padding: "28px 28px 24px", borderRadius: "20px 20px 0 0", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "700" }}>{vendor.name}</h2>
              <span style={{ background: catColor.bg, color: catColor.color, padding: "3px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "600" }}>
                {vendor.category}
              </span>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "white", fontSize: "16px" }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
            {[
              { icon: "📞", label: "เบอร์โทร", value: vendor.phone, copy: true },
              { icon: "📧", label: "Email", value: vendor.email, copy: true },
              { icon: "👤", label: "เจ้าหน้าที่", value: vendor.contact, copy: false },
              { icon: "📍", label: "ที่อยู่", value: vendor.address, copy: false },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "18px", minWidth: "24px" }}>{f.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#aaa", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#333" }}>{f.value}</p>
                    {f.copy && <CopyButton value={f.value} />}
                  </div>
                </div>
              </div>
            ))}
            {vendor.website && (
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "18px", minWidth: "24px" }}>🌐</span>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#aaa", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Website</p>
                  <a href={`https://${vendor.website}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "14px", color: "#2d6abf", textDecoration: "none" }}>{vendor.website}</a>
                </div>
              </div>
            )}
          </div>

          {vendor.note && (
            <div style={{ background: "#f8faff", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#aaa", fontWeight: "600" }}>💬 หมายเหตุ</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#555" }}>{vendor.note}</p>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", marginBottom: "20px" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>สถานะ</span>
            <button onClick={onToggleStatus} style={{
              padding: "6px 16px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px",
              background: vendor.status === "active" ? "#d1fae5" : "#fee2e2",
              color: vendor.status === "active" ? "#059669" : "#dc2626",
              transition: "all 0.2s"
            }}>
              {vendor.status === "active" ? "✅ Active" : "❌ Inactive"}
            </button>
          </div>

          <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#bbb", textAlign: "right" }}>เพิ่มเมื่อ: {vendor.createdAt}</p>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onEdit} style={{ flex: 1, padding: "11px", background: "#f0f4ff", border: "1px solid #c7d7f7", borderRadius: "10px", cursor: "pointer", fontWeight: "600", color: "#1a3c6e", fontSize: "14px" }}>✏️ แก้ไข</button>
            <button onClick={onDelete} style={{ flex: 1, padding: "11px", background: "#fff5f5", border: "1px solid #fee2e2", borderRadius: "10px", cursor: "pointer", fontWeight: "600", color: "#dc2626", fontSize: "14px" }}>🗑️ ลบ</button>
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

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || { bg: "#f3f4f6", color: "#374151" };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", fontFamily: "sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        .vendor-card { transition: transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s cubic-bezier(0.22,1,0.36,1); cursor: pointer; }
        .vendor-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(26,60,110,0.13) !important; }
      `}</style>

      {/* Form Modal */}
      {(showFormModal || editVendor) && (
        <VendorFormModal
          vendor={editVendor}
          onClose={() => { setShowFormModal(false); setEditVendor(undefined); }}
          onSave={handleSave}
        />
      )}

      {/* Detail Modal */}
      {detailVendor && (
        <VendorDetailModal
          vendor={detailVendor}
          onClose={() => setDetailVendor(undefined)}
          onEdit={() => { setEditVendor(detailVendor); setDetailVendor(undefined); }}
          onDelete={() => handleDelete(detailVendor.id)}
          onToggleStatus={() => handleToggleStatus(detailVendor)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1a3c6e", fontSize: "26px", fontWeight: "700" }}>🏢 Vendor Directory</h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: "14px" }}>รายชื่อ Vendor ของฝ่ายจัดซื้อ</p>
        </div>
        <button onClick={() => setShowFormModal(true)} style={{
          padding: "11px 22px", backgroundColor: "#1a3c6e", color: "white",
          border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px",
          boxShadow: "0 4px 12px rgba(26,60,110,0.25)", transition: "all 0.2s"
        }}>
          ➕ เพิ่ม Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Vendor ทั้งหมด", count: vendors.length, color: "#1a3c6e", bg: "#eef2ff" },
          { label: "Active", count: vendors.filter(v => v.status === "active").length, color: "#059669", bg: "#f0fdf4" },
          { label: "Inactive", count: vendors.filter(v => v.status === "inactive").length, color: "#dc2626", bg: "#fff5f5" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "20px 24px", borderTop: `4px solid ${s.color}` }}>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "13px", fontWeight: "600" }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{ background: "white", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "12px", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>🔍 ค้นหา</label>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อบริษัท, หมวดหมู่, เจ้าหน้าที่..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", boxSizing: "border-box", fontSize: "14px" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>หมวดหมู่</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "13px" }}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>สถานะ</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "13px" }}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>เรียงตาม</label>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "13px" }}>
              <option value="createdAt">วันที่เพิ่มล่าสุด</option>
              <option value="name">ชื่อ A-Z</option>
              <option value="category">หมวดหมู่</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>แสดง <strong>{filtered.length}</strong> จาก <strong>{vendors.length}</strong> Vendor</p>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["card", "table"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding: "6px 14px", borderRadius: "8px", border: "1.5px solid",
                borderColor: viewMode === m ? "#1a3c6e" : "#e5e7eb",
                background: viewMode === m ? "#1a3c6e" : "white",
                color: viewMode === m ? "white" : "#888",
                cursor: "pointer", fontWeight: "600", fontSize: "13px"
              }}>
                {m === "card" ? "⊞ Card" : "☰ Table"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>🏢</div>
          <h3 style={{ margin: "0 0 8px", color: "#1a3c6e", fontSize: "18px" }}>
            {vendors.length === 0 ? "ยังไม่มี Vendor" : "ไม่พบ Vendor ที่ตรงกับการค้นหา"}
          </h3>
          <p style={{ margin: "0 0 24px", color: "#aaa", fontSize: "14px" }}>
            {vendors.length === 0 ? "เริ่มต้นด้วยการเพิ่ม Vendor รายแรก" : "ลองเปลี่ยน keyword หรือ filter ดูครับ"}
          </p>
          {vendors.length === 0 && (
            <button onClick={() => setShowFormModal(true)} style={{
              padding: "12px 28px", backgroundColor: "#1a3c6e", color: "white",
              border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px"
            }}>➕ เพิ่ม Vendor แรก</button>
          )}
        </div>
      )}

      {/* Card View */}
      {!loading && filtered.length > 0 && viewMode === "card" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filtered.map(vendor => {
            const cc = catColor(vendor.category);
            return (
              <div key={vendor.id} className="vendor-card"
                onClick={() => setDetailVendor(vendor)}
                style={{ background: "white", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${vendor.status === "active" ? "#059669" : "#dc2626"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ flex: 1, marginRight: "8px" }}>
                    <h3 style={{ margin: "0 0 6px", color: "#1a3c6e", fontSize: "15px", fontWeight: "700", lineHeight: "1.3" }}>
                      {highlight(vendor.name, search)}
                    </h3>
                    <span style={{ background: cc.bg, color: cc.color, padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>
                      {highlight(vendor.category, search)}
                    </span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleToggleStatus(vendor); }} style={{
                    background: vendor.status === "active" ? "#d1fae5" : "#fee2e2",
                    color: vendor.status === "active" ? "#059669" : "#dc2626",
                    padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600",
                    border: "none", cursor: "pointer", whiteSpace: "nowrap"
                  }}>
                    {vendor.status === "active" ? "✅ Active" : "❌ Inactive"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {[
                    { icon: "📞", value: vendor.phone },
                    { icon: "📧", value: vendor.email },
                    { icon: "👤", value: vendor.contact },
                  ].filter(f => f.value).map(f => (
                    <div key={f.icon} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", minWidth: "18px" }}>{f.icon}</span>
                      <span style={{ fontSize: "13px", color: "#666" }}>{highlight(f.value, search)}</span>
                      <CopyButton value={f.value} />
                    </div>
                  ))}
                </div>
                {vendor.note && (
                  <div style={{ marginTop: "10px", background: "#f8faff", borderRadius: "8px", padding: "7px 10px" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>💬 {vendor.note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {!loading && filtered.length > 0 && viewMode === "table" && (
        <div style={{ background: "white", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#1a3c6e", color: "white" }}>
                {["ชื่อบริษัท", "หมวดหมู่", "เบอร์โทร", "เจ้าหน้าที่", "สถานะ", ""].map(h => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((vendor, i) => {
                const cc = catColor(vendor.category);
                return (
                  <tr key={vendor.id}
                    onClick={() => setDetailVendor(vendor)}
                    onMouseEnter={() => setHoveredId(vendor.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer", background: hoveredId === vendor.id ? "#f8faff" : i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.15s" }}>
                    <td style={{ padding: "14px 16px", fontWeight: "600", color: "#1a3c6e" }}>{highlight(vendor.name, search)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: cc.bg, color: cc.color, padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>{vendor.category}</span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#555" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {vendor.phone} <CopyButton value={vendor.phone} />
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#555" }}>{highlight(vendor.contact, search)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={e => { e.stopPropagation(); handleToggleStatus(vendor); }} style={{
                        background: vendor.status === "active" ? "#d1fae5" : "#fee2e2",
                        color: vendor.status === "active" ? "#059669" : "#dc2626",
                        padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600",
                        border: "none", cursor: "pointer"
                      }}>
                        {vendor.status === "active" ? "✅ Active" : "❌ Inactive"}
                      </button>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={e => { e.stopPropagation(); setEditVendor(vendor); }} style={{
                        padding: "5px 12px", background: "#f0f4ff", border: "1px solid #c7d7f7",
                        borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "#1a3c6e", fontWeight: "600"
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
  );
}