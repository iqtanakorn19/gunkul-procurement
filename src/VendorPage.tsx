import { useState } from "react";

type VendorStatus = "active" | "inactive";

const CATEGORIES = [
  "สายไฟ AC", "สายไฟ DC", "แผงโซลาร์ (Solar Panel)", "Inverter",
  "Transformer", "Switchgear & MDB", "อุปกรณ์ป้องกัน (Surge, Breaker, Fuse)",
  "Battery & Energy Storage", "Mounting Structure", "โยธา & งานฐานราก",
  "นั่งร้าน (Scaffolding)", "รั้ว & งานภูมิทัศน์", "ขนส่ง & โลจิสติกส์",
  "ติดตั้ง & Commissioning", "ตรวจสอบ & Survey (วิศวกร)", "ประกันภัย",
  "Monitoring System", "SCADA & Software", "IT & Network",
  "เครื่องมือ & อุปกรณ์ช่าง", "PPE & Safety", "อื่นๆ"
];

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

interface VendorModalProps {
  vendor?: Vendor;
  onClose: () => void;
  onSave: (vendor: Vendor) => void;
}

function VendorModal({ vendor, onClose, onSave }: VendorModalProps) {
  const [form, setForm] = useState<Vendor>(vendor || {
    id: Date.now().toString(),
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
    <div style={{ position: "fixed", inset: 0, background: "#00000060", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "520px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#1a3c6e" }}>{vendor ? "✏️ แก้ไข Vendor" : "➕ เพิ่ม Vendor ใหม่"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: f.key === "name" || f.key === "address" ? "1 / -1" : "auto" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" }} />
            </div>
          ))}

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>หมวดหมู่</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>สถานะ</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as VendorStatus })}
              style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" }}>
              <option value="active">✅ Active</option>
              <option value="inactive">❌ Inactive</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>หมายเหตุ</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2} placeholder="หมายเหตุเพิ่มเติม..."
            style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }} />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "#f5f5f5", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#555" }}>
            ยกเลิก
          </button>
          <button onClick={handleSave} style={{ flex: 2, padding: "11px", backgroundColor: "#1a3c6e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | undefined>();

  const filtered = vendors.filter(v => {
    const matchSearch = search === "" ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      v.contact.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "ทั้งหมด" || v.category === filterCategory;
    const matchStatus = filterStatus === "ทั้งหมด" || v.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const handleSave = (vendor: Vendor) => {
    if (editVendor) {
      setVendors(vendors.map(v => v.id === vendor.id ? vendor : v));
    } else {
      setVendors([vendor, ...vendors]);
    }
    setEditVendor(undefined);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("ต้องการลบ Vendor นี้มั้ย?")) {
      setVendors(vendors.filter(v => v.id !== id));
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", fontFamily: "sans-serif" }}>

      {(showModal || editVendor) && (
        <VendorModal
          vendor={editVendor}
          onClose={() => { setShowModal(false); setEditVendor(undefined); }}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1a3c6e", fontSize: "26px" }}>🏢 Vendor Directory</h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: "14px" }}>รายชื่อ Vendor ของฝ่ายจัดซื้อ</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: "10px 20px", backgroundColor: "#1a3c6e", color: "white",
          border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px"
        }}>
          ➕ เพิ่ม Vendor
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Vendor ทั้งหมด", count: vendors.length, color: "#1a3c6e" },
          { label: "Active", count: vendors.filter(v => v.status === "active").length, color: "#059669" },
          { label: "Inactive", count: vendors.filter(v => v.status === "inactive").length, color: "#dc2626" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `4px solid ${s.color}` }}>
            <p style={{ margin: "0 0 8px", color: "#888", fontSize: "13px" }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>🔍 ค้นหา</label>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อบริษัท, หมวดหมู่, เจ้าหน้าที่..."
              style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "14px" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>หมวดหมู่</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>สถานะ</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#888" }}>แสดง {filtered.length} จาก {vendors.length} Vendor</p>
      </div>

      {/* Vendor Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px", color: "#888", background: "white", borderRadius: "12px" }}>
            ไม่พบ Vendor ที่ตรงกับการค้นหา
          </div>
        ) : (
          filtered.map(vendor => (
            <div key={vendor.id} style={{
              background: "white", borderRadius: "12px", padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${vendor.status === "active" ? "#059669" : "#dc2626"}`
            }}>
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 4px", color: "#1a3c6e", fontSize: "15px" }}>{vendor.name}</h3>
                  <span style={{ background: "#e8eef8", color: "#1a3c6e", padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>
                    {vendor.category}
                  </span>
                </div>
                <span style={{
                  background: vendor.status === "active" ? "#d1fae5" : "#fee2e2",
                  color: vendor.status === "active" ? "#059669" : "#dc2626",
                  padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap"
                }}>
                  {vendor.status === "active" ? "✅ Active" : "❌ Inactive"}
                </span>
              </div>

              {/* Contact Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                {[
                  { icon: "📞", value: vendor.phone },
                  { icon: "📧", value: vendor.email },
                  { icon: "👤", value: vendor.contact },
                  { icon: "📍", value: vendor.address },
                ].filter(f => f.value).map(f => (
                  <div key={f.icon} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "13px", minWidth: "20px" }}>{f.icon}</span>
                    <span style={{ fontSize: "13px", color: "#555", lineHeight: "1.4" }}>{f.value}</span>
                  </div>
                ))}
                {vendor.website && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "13px" }}>🌐</span>
                    <a href={`https://${vendor.website}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "13px", color: "#2d6abf", textDecoration: "none" }}>
                      {vendor.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Note */}
              {vendor.note && (
                <div style={{ background: "#f8faff", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>💬 {vendor.note}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f0f0f0", paddingTop: "12px" }}>
                <button onClick={() => setEditVendor(vendor)} style={{
                  flex: 1, padding: "8px", background: "#f8faff", border: "1px solid #e8eef8",
                  borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#1a3c6e", fontWeight: "600"
                }}>
                  ✏️ แก้ไข
                </button>
                <button onClick={() => handleDelete(vendor.id)} style={{
                  flex: 1, padding: "8px", background: "#fff5f5", border: "1px solid #fee2e2",
                  borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#dc2626", fontWeight: "600"
                }}>
                  🗑️ ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}