import { useState } from "react";

interface Doc {
  id: string;
  title: string;
  description: string;
  type: "wi" | "manual" | "scope";
  pages: string;
  url: string;
  icon: string;
}

const DOCS: Doc[] = [
  { id: "wi001", title: "WI-001 — Add Vendor", description: "ขั้นตอนการเพิ่ม Vendor ใหม่เข้าระบบ D365 พร้อมเอกสารที่ต้องเตรียม", type: "wi", pages: "19 หน้า", url: "/documents/draft WI_Add_Vendor_01.pdf", icon: "👤" },
  { id: "wi002", title: "WI-002 — Purchase Order", description: "ขั้นตอนการสร้าง PO ในระบบ D365 ตั้งแต่รับ PR จนถึงส่งให้ Supplier", type: "wi", pages: "33 หน้า", url: "/documents/draft WI_Purchase_Order_01.pdf", icon: "🛒" },
  { id: "wi003", title: "WI-003 — Price Approval", description: "กระบวนการขออนุมัติราคา PA ตามระดับวงเงิน Manager / VP / CEO", type: "wi", pages: "30 หน้า", url: "/documents/draft WI_Price_Approval_01.pdf", icon: "✅" },
  { id: "wi004", title: "WI-004 — Good Receipt", description: "ขั้นตอนการทำ Good Receive หลัง Supplier ส่งของ เพื่อให้บัญชีจ่ายเงินได้", type: "wi", pages: "16 หน้า", url: "/documents/draft WI_Good_Receipt_01.pdf", icon: "📦" },
  { id: "manual", title: "GK User Manual — D365 PU", description: "คู่มือการใช้งาน Microsoft Dynamics 365 สำหรับฝ่ายจัดซื้อ", type: "manual", pages: "", url: "/documents/GK_User_Manual_PU_V1.0.pdf", icon: "💻" },
  { id: "scope", title: "Procurement Scope & Overview", description: "ภาพรวมฝ่ายจัดซื้อ Stakeholder, กระบวนการทำงาน, โครงการปัจจุบัน EPC/PPA", type: "scope", pages: "", url: "/documents/procurement_scope.pdf", icon: "🗂️" },
];

const STEPS = [
  { name: "รับ PR / RFQ จากทีม PM", detail: "Project Manager ส่ง Purchase Requisition มาให้ฝ่ายจัดซื้อ" },
  { name: "เชิญ Supplier เข้าร่วม RFQ", detail: "ชี้แจง TOR กำหนด Bid Submission ให้ Supplier ส่งเอกสาร 3 ชุด" },
  { name: "คัดเลือก Supplier เหลือ 3 ราย", detail: "ประเมินร่วมกับ Engineer → เสนอ CEO พร้อมวิเคราะห์ ค.เสี่ยง + Breakeven" },
  { name: "ทำ Contract", detail: "จัดทำสัญญากับ Supplier ที่ CEO เลือก" },
  { name: "เปิด PA ใน D365", detail: "<100k: Manager | 100k–499k: VP | ≥500k: CEO" },
  { name: "เปิด PO ใน D365", detail: "สร้าง Purchase Order และส่งให้ Supplier" },
  { name: "ติดตามการส่งมอบ", detail: "Align กับหน้างาน เรื่อง Laydown, Layout, วันส่งของ" },
  { name: "ทำ Good Receive", detail: "ใช้ Invoice + Delivery Order → รอ Admin / PM / Supervisor Approve" },
  { name: "ติดตามการจ่ายเงิน", detail: "บัญชีโอนเงินให้ Supplier หลัง GR Approve ครบ" },
];

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  wi: { bg: "#dbeafe", color: "#1e40af", label: "WI Document" },
  manual: { bg: "#d1fae5", color: "#065f46", label: "Manual" },
  scope: { bg: "#fef3c7", color: "#92400e", label: "Scope Guide" },
};

export default function KnowledgePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "wi" | "manual" | "scope">("all");
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [doneSteps, setDoneSteps] = useState<boolean[]>(Array(9).fill(false));

  const filtered = DOCS.filter(d => {
    const matchSearch = search === "" || d.title.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.type === filter;
    return matchSearch && matchFilter;
  });

  const toggleStep = (i: number) => {
    setDoneSteps(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  };

  const doneCount = doneSteps.filter(Boolean).length;
  const progressPct = Math.round((doneCount / 9) * 100);

  const cardHover = {
    transition: "transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s cubic-bezier(0.22,1,0.36,1)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f4ff 0%, #e8edf8 50%, #f5f0e8 100%)", fontFamily: "sans-serif" }}>

      {/* PDF Viewer Modal */}
      {selectedDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={() => setSelectedDoc(null)}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "900px", height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(26,60,110,0.35)" }}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ background: "linear-gradient(135deg, #0f2244, #1a3c6e)", padding: "18px 24px", display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(226,201,126,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                {selectedDoc.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: "700" }}>{selectedDoc.title}</p>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                  {TYPE_BADGE[selectedDoc.type].label}{selectedDoc.pages ? ` • ${selectedDoc.pages}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <a href={selectedDoc.url} download style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
                  background: "linear-gradient(135deg, #e2c97e, #c9a84c)", color: "#1a3c6e",
                  borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: "700"
                }}>
                  ⬇ ดาวน์โหลด
                </a>
                <button onClick={() => setSelectedDoc(null)} style={{
                  width: "36px", height: "36px", borderRadius: "50%", border: "none",
                  background: "rgba(255,255,255,0.15)", color: "white", cursor: "pointer", fontSize: "18px"
                }}>✕</button>
              </div>
            </div>

            {/* PDF iframe */}
            <div style={{ flex: 1, overflow: "hidden", background: "#525659" }}>
              <iframe
                src={selectedDoc.url}
                style={{ width: "100%", height: "100%", border: "none" }}
                title={selectedDoc.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div style={{ background: "linear-gradient(135deg, #0f2244 0%, #1a3c6e 45%, #2d5a9e 100%)", padding: "48px 40px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(226,201,126,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-80px", left: "20%", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
          <div style={{ marginBottom: "8px" }}>
            <span style={{ background: "rgba(226,201,126,0.2)", border: "1px solid rgba(226,201,126,0.4)", color: "#e2c97e", padding: "4px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em" }}>
              PROCUREMENT
            </span>
          </div>
          <h1 style={{ margin: "0 0 8px", color: "white", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: "800" }}>📚 Knowledge Base</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "15px" }}>คู่มือและเอกสารสำหรับพนักงานฝ่ายจัดซื้อ</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: "14px", marginTop: "28px", width: "fit-content" }}>
            {[
              { label: "📄 เอกสารทั้งหมด", count: DOCS.length },
              { label: "📋 WI Documents", count: DOCS.filter(d => d.type === "wi").length },
              { label: "📖 Manuals & Guides", count: DOCS.filter(d => d.type !== "wi").length },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px 20px", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
                <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{s.label}</p>
                <p style={{ margin: 0, color: "white", fontSize: "26px", fontWeight: "800" }}>{s.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "white", border: "2px solid #e2c97e", borderRadius: "12px", padding: "10px 16px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(26,60,110,0.06)" }}>
          <span style={{ fontSize: "18px", color: "#94a3b8" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาเอกสาร, ขั้นตอน, คำศัพท์..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: "15px", background: "transparent", color: "#1e293b" }} />
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {(["all", "wi", "manual", "scope"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 18px", borderRadius: "999px", border: "1.5px solid",
              borderColor: filter === f ? "#1a3c6e" : "#e2e8f0",
              background: filter === f ? "#1a3c6e" : "white",
              color: filter === f ? "white" : "#64748b",
              cursor: "pointer", fontWeight: "600", fontSize: "13px", transition: "all 0.2s"
            }}>
              {f === "all" ? "ทั้งหมด" : f === "wi" ? "WI Documents" : f === "manual" ? "Manual" : "Scope & Guide"}
            </button>
          ))}
        </div>

        {/* Document Cards */}
        <p style={{ fontSize: "16px", fontWeight: "700", color: "#1a3c6e", marginBottom: "14px" }}>📄 เอกสารทั้งหมด</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px", background: "white", borderRadius: "16px", color: "#94a3b8" }}>
              ไม่พบเอกสารที่ตรงกับการค้นหา
            </div>
          ) : filtered.map(doc => {
            const badge = TYPE_BADGE[doc.type];
            return (
              <div key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                style={{ ...cardHover, background: "white", borderRadius: "16px", padding: "22px", cursor: "pointer", borderTop: "3px solid #e2c97e", boxShadow: "0 2px 12px rgba(26,60,110,0.07)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px rgba(26,60,110,0.14)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(26,60,110,0.07)"; }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #eef2ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "14px" }}>
                  {doc.icon}
                </div>
                <p style={{ margin: "0 0 6px", color: "#1a3c6e", fontSize: "15px", fontWeight: "700" }}>{doc.title}</p>
                <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>{doc.description}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ background: badge.bg, color: badge.color, padding: "3px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700" }}>{badge.label}</span>
                  {doc.pages && <span style={{ fontSize: "11px", color: "#94a3b8" }}>{doc.pages}</span>}
                </div>
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>คลิกเพื่อเปิดอ่าน →</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step-by-step */}
        <div style={{ background: "white", borderRadius: "20px", padding: "28px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(26,60,110,0.07)", border: "1px solid rgba(226,201,126,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1a3c6e" }}>🗺️ Step-by-step: กระบวนการจัดซื้อหลัก</p>
            <span style={{ fontSize: "13px", color: "#64748b" }}>{doneCount} / 9 เสร็จแล้ว</span>
          </div>
          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", marginBottom: "20px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #1a3c6e, #e2c97e)", borderRadius: "3px", transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {STEPS.map((step, i) => (
              <div key={i} onClick={() => toggleStep(i)}
                style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 14px", borderRadius: "10px", cursor: "pointer", transition: "background 0.2s", border: "0.5px solid",
                  borderColor: doneSteps[i] ? "rgba(16,185,129,0.25)" : "transparent",
                  background: doneSteps[i] ? "linear-gradient(135deg, rgba(209,250,229,0.4), rgba(167,243,208,0.15))" : "transparent" }}
                onMouseEnter={e => { if (!doneSteps[i]) (e.currentTarget as HTMLDivElement).style.background = "#f8faff"; }}
                onMouseLeave={e => { if (!doneSteps[i]) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0,
                  background: doneSteps[i] ? "#d1fae5" : i === doneSteps.indexOf(false) ? "#1a3c6e" : "#f1f5f9",
                  color: doneSteps[i] ? "#065f46" : i === doneSteps.indexOf(false) ? "white" : "#94a3b8" }}>
                  {doneSteps[i] ? "✓" : i + 1}
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{step.name}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Reference */}
        <p style={{ fontSize: "16px", fontWeight: "700", color: "#1a3c6e", marginBottom: "12px" }}>⚡ Quick Reference</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            { label: "Approval — Manager", value: "< 100,000 บาท" },
            { label: "Approval — VP", value: "100,000 – 499,999 บาท" },
            { label: "Approval — CEO", value: "≥ 500,000 บาท" },
            { label: "Lead time < 1 MW", value: "2–3 เดือน" },
            { label: "Lead time > 1 MW", value: "4–6 เดือน" },
            { label: "Bottleneck หลัก", value: "ใบอนุญาต อ.1 (≥ 6 เดือน)" },
          ].map(r => (
            <div key={r.label} style={{ background: "white", borderRadius: "10px", padding: "14px 16px", borderLeft: "3px solid #e2c97e", boxShadow: "0 1px 6px rgba(26,60,110,0.06)" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.label}</p>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1a3c6e" }}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}