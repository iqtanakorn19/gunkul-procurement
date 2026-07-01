import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Reveal,
  IconBadge,
  Section,
  HoverCard,
  grid,
  WorkflowTimeline,
  tint,
} from "./components/PageKit";
import {
  IconBuildingFactory2,
  IconBolt,
  IconFileInvoice,
  IconShieldCheck,
  IconClockHour4,
  IconMapPin,
  IconWorld,
  IconUsersGroup,
  IconArrowRight,
  IconReceipt,
  IconTruckDelivery,
  IconClipboardList,
  IconDatabase,
  IconSitemap,
  IconCategory2,
  IconBuildingSkyscraper,
  IconSun,
  IconUserCog,
  IconCalculator,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconFileCheck,
  IconCoin,
  IconBuildingBank,
  IconFolders,
  IconChartBar,
  IconPencil,
  IconTrash,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import type { Page } from "./Sidebar";

/* ============================================================
   Data
   ============================================================ */

const SERVED = [
  { code: "GKE", name: "กันกุล เอ็นจิเนียริ่ง (มหาชน)", note: "บริษัทแม่ของเครือ" },
  { code: "GUE", name: "Gunkul Utility & Energy", note: "ลงทุน & เดินเครื่องโรงไฟฟ้า" },
  { code: "BU", name: "Business Unit ย่อย", note: "หน่วยธุรกิจอื่นในเครือ GUNKUL" },
];

const MODELS = [
  {
    icon: IconBuildingFactory2,
    color: "var(--primary)",
    tag: "EPC",
    title: "Engineering, Procurement & Construction",
    desc: "Gunkul รับจ้างออกแบบ จัดซื้อ และติดตั้งระบบให้ลูกค้า เมื่อทีมขายปิดงานได้ ฝ่ายจัดซื้อจึงเริ่มทำงาน",
    facts: ["ลูกค้าเป็นเจ้าของระบบ", "รับประกัน O&M ราว 2 ปี"],
  },
  {
    icon: IconBolt,
    color: "var(--accent)",
    tag: "PPA",
    title: "Power Purchase Agreement",
    desc: "Gunkul ลงทุนสร้างโรงไฟฟ้าเอง แล้วขายไฟให้ลูกค้าตามราคาที่ตกลง (เช่น ซื้อมา 2 บาท ขาย 4 บาท/หน่วย)",
    facts: ["Gunkul เป็นเจ้าของระบบ", "ดูแล O&M ตลอดอายุสัญญา"],
  },
];

const PROJECT_TYPES = [
  {
    icon: IconBuildingSkyscraper,
    color: "var(--info)",
    title: "Rooftop (Groof)",
    desc: "ติดตั้งบนหลังคา ขนาด 300 kW – 5 MW ราว 90% เป็นงาน EPC",
    focus: "โฟกัสจัดซื้อ: แผงโซลาร์ · Inverter · หม้อแปลง",
  },
  {
    icon: IconSun,
    color: "var(--warning)",
    title: "Solar Farm",
    desc: "โครงการขนาดใหญ่ มี TOR แยกเฉพาะ แบ่ง 2 ระดับ: Pre Rim (ประมูล) และ Falcon (ดำเนินงานจริง)",
    focus: "ขอบเขตกว้าง ใช้พื้นที่หลายร้อยไร่",
  },
];

type ProjectType = "EPC" | "PPA";

interface Project {
  id: string;
  name: string;
  type: ProjectType;
  note: string;
  owners: string[];
}

/* One-time seed for the "homeProjects" Firestore collection — only written
   if the collection is empty on first load. */
const SEED_PROJECTS: Omit<Project, "id">[] = [
  { name: "กำแพงเพชร (GPD)", type: "EPC", note: "ส่วนหนึ่งของโครงการ 900+ MW ร่วมกับ Gulf", owners: [] },
  { name: "สุพรรณบุรี SPB1", type: "EPC", note: "ดูแลโดยทีม SPB1", owners: [] },
  { name: "สุพรรณบุรี SPB8", type: "EPC", note: "ดูแลโดยทีม SPB8", owners: [] },
  { name: "สตูล (91 MW)", type: "PPA", note: "Gunkul O&M ทั้งหมด", owners: [] },
  { name: "นราธิวาส", type: "PPA", note: "Gunkul O&M ทั้งหมด", owners: [] },
  { name: "ปัตตานี (~78.59 MW)", type: "PPA", note: "พื้นที่ 400–500 ไร่ · Gunkul O&M ทั้งหมด", owners: [] },
];

const STAKEHOLDERS = [
  { icon: IconClipboardList, color: "var(--primary)", role: "Project Manager", desc: "ส่ง PR / RFQ ให้เรา และอนุมัติเอกสาร Good Receive" },
  { icon: IconUserCog, color: "var(--info)", role: "Engineer", desc: "กำหนด Spec อุปกรณ์ ทำ TOR และคุยเทคนิคกับ Supplier" },
  { icon: IconCalculator, color: "var(--accent)", role: "Tender", desc: "ถอดแบบหน้างาน ประเมิน Cost และให้ตัวเลขงบประมาณ" },
  { icon: IconBuildingStore, color: "var(--warning)", role: "Vendor / Supplier", desc: "ผู้ขายสินค้า–บริการ เข้าร่วมกระบวนการประมูล RFQ" },
  { icon: IconFileCheck, color: "var(--success)", role: "Admin", desc: "ตรวจสอบความถูกต้องของเอกสารและใบส่งของ" },
  { icon: IconCoin, color: "var(--primary)", role: "Finance / Account", desc: "จ่ายเงินให้ Supplier หลัง Good Receive เรียบร้อย" },
  { icon: IconBuildingWarehouse, color: "var(--info)", role: "Warehouse", desc: "รับของเข้า เก็บสต๊อกไว้ให้ และจ่ายของออกเมื่อมีการเบิกใช้งาน" },
];

const WORKFLOW = [
  { icon: IconBuildingStore, title: "Vendor Master", detail: "ค้นหาก่อนเสมอว่ามี Vendor ในระบบหรือยัง ถ้ายังไม่มีจึงสร้างใหม่ใน D365 (ภายใต้ GKE) พร้อม verify ทุนจดทะเบียน, cash flow, ผลงาน" },
  { icon: IconFileInvoice, title: "รับ PR / RFQ", detail: "รับคำขอจาก PM หรือ Engineer แล้วดาวน์โหลดไฟล์ Budget, Quotation, PR จาก E-doc" },
  { icon: IconUsersGroup, title: "เชิญประมูล & เปรียบเทียบ", detail: "เชิญ Supplier อธิบาย TOR กำหนดวันยื่นซอง คัดเหลือ 3 ราย แล้วทำไฟล์ Compare ราคา/คุณสมบัติ" },
  { icon: IconShieldCheck, title: "Price Approval (PA)", detail: "เปิด PA ใน D365 ส่งเข้า Alfresco เพื่ออนุมัติตามวงเงิน (Manager / VP / CEO) เร่งด่วนใช้ Fast Track ได้" },
  { icon: IconReceipt, title: "Purchase Order (PO)", detail: "หลัง PA ผ่าน เปิด PO ใน D365 ตรวจ Company / PR / PA / Project ให้ตรงกัน แล้ว Confirm เพื่อให้มีผลทางกฎหมาย" },
  { icon: IconTruckDelivery, title: "Good Receipt (GR)", detail: "ใช้ Invoice + Delivery Order ตรวจเทียบ PO แล้ว Receive ใน D365 หากของไม่ครบให้แก้ Quantity ตามจริง" },
  { icon: IconBuildingWarehouse, title: "Warehouse", detail: "Warehouse รับของเข้าเก็บไว้ที่คลัง เมื่อหน้างานต้องใช้อุปกรณ์ก็ทำเรื่องเบิกของออกจากคลังตามจริง" },
];

const PA_TIERS = [
  { level: "Manager", limit: "น้อยกว่า 100,000 บาท", color: "var(--success)" },
  { level: "VP", limit: "100,000 – 499,999 บาท", color: "var(--warning)" },
  { level: "CEO", limit: "ตั้งแต่ 500,000 บาทขึ้นไป", color: "var(--danger)" },
];

const SYSTEMS = [
  { icon: IconDatabase, name: "Dynamics 365", purpose: "ระบบหลักทั้งหมด: Vendor, PR, PA, PO, Good Receipt", primary: true },
  { icon: IconFolders, name: "E-doc", purpose: "รับ–ส่งเอกสาร PR, Budget, Quotation" },
  { icon: IconFileCheck, name: "Alfresco", purpose: "เก็บและอนุมัติเอกสาร Price Approval" },
  { icon: IconChartBar, name: "Excel", purpose: "ติดตามสถานะงานของแต่ละคน" },
];

const PRODUCTS = [
  "แผงโซลาร์",
  "Inverter & Optimizer",
  "สายไฟ",
  "หม้อแปลง",
  "โครงสร้างรับแผง (Racking)",
  "อุปกรณ์ไฟฟ้า",
  "อุปกรณ์ต่อสาย",
];

const SERVICES = [
  "งาน Subcontract",
  "งาน O&M",
  "บริหารโครงการ",
  "ค่าแรง",
  "ค่าเช่า",
  "ค่าธรรมเนียม & สาธารณูปโภค",
  "ยานพาหนะ",
  "สวัสดิการ",
];

const LEAD_TIMES = [
  { scale: "โครงการ < 1 MW", time: "≈ 2–3 เดือน" },
  { scale: "โครงการ > 1 MW", time: "≈ 4–6 เดือน" },
  { scale: "ทั้งโปรเจกต์ (รวมใบอนุญาต)", time: "≈ 2 ปี" },
];

/* ============================================================
   Page
   ============================================================ */

function ProjectEditModal({
  project,
  onSave,
  onClose,
}: {
  project: Project | null;
  onSave: (data: { name: string; type: ProjectType; note: string; owners: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [type, setType] = useState<ProjectType>(project?.type ?? "EPC");
  const [note, setNote] = useState(project?.note ?? "");
  const [ownersText, setOwnersText] = useState(project?.owners.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  const inputStyle: React.CSSProperties = {
    font: "inherit", fontSize: "var(--fs-sm)", color: "var(--text)", background: "var(--surface)",
    border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", padding: "8px 10px", width: "100%",
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const owners = ownersText.split(",").map((o) => o.trim()).filter(Boolean);
      await onSave({ name: name.trim(), type, note: note.trim(), owners });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 320, padding: "var(--sp-4)" }}
    >
      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", width: "min(480px, 100%)", padding: "var(--sp-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
          <h3 style={{ margin: 0, color: "var(--text-strong)" }}>{project ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}</h3>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)" }}>
            <IconX size={20} stroke={1.75} />
          </button>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-3)" }}>
          ชื่อโครงการ
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-3)" }}>
          ประเภท
          <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
            <option value="EPC">EPC</option>
            <option value="PPA">PPA</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-3)" }}>
          รายละเอียด
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-4)" }}>
          ผู้รับผิดชอบโครงการ (คั่นด้วยจุลภาค หากมีมากกว่า 1 คน)
          <input style={inputStyle} value={ownersText} onChange={(e) => setOwnersText(e.target.value)} placeholder="เช่น สมชาย ใจดี, สมหญิง รักงาน" />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)" }}>
          <button type="button" onClick={onClose} style={{ border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", cursor: "pointer" }}>
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={handleSave}
            style={{ border: "none", background: "var(--primary)", color: "var(--primary-contrast)", borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  useEffect(() => {
    let seeded = false;
    const colRef = collection(db, "homeProjects");
    const unsub = onSnapshot(
      colRef,
      async (snap) => {
        setProjectsError(null);
        if (snap.empty && !seeded) {
          seeded = true;
          try {
            const batch = writeBatch(db);
            SEED_PROJECTS.forEach((p) => batch.set(doc(colRef), p));
            await batch.commit();
          } catch (err) {
            setProjectsError(err instanceof Error ? err.message : String(err));
          }
          return;
        }
        setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) })));
      },
      (err) => setProjectsError(err.message)
    );
    return unsub;
  }, []);

  const saveProjectEdit = async (data: { name: string; type: ProjectType; note: string; owners: string[] }) => {
    if (!editingProject) return;
    await updateDoc(doc(db, "homeProjects", editingProject.id), data);
    setEditingProject(null);
  };

  const addNewProject = async (data: { name: string; type: ProjectType; note: string; owners: string[] }) => {
    await addDoc(collection(db, "homeProjects"), data);
    setAddingProject(false);
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm("ยืนยันการลบโครงการนี้?")) return;
    await deleteDoc(doc(db, "homeProjects", id));
  };

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <header
        style={{
          position: "relative",
          background:
            "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)",
          color: "#fffdf8",
          padding: "var(--sp-8) var(--sp-6)",
          overflow: "hidden",
        }}
      >
        <div className="hero-aurora" aria-hidden />
        <div style={{ position: "relative", maxWidth: "1100px", margin: "0 auto", zIndex: 1 }}>
          <Reveal>
            <img
              src="/logo-default.svg"
              alt="Gunkul"
              style={{
                height: 36,
                width: "auto",
                display: "block",
                marginBottom: "var(--sp-5)",
                filter: "brightness(0) invert(1)",
              }}
            />
          </Reveal>
          <Reveal>
            <p
              style={{
                fontSize: "var(--fs-h3)",
                fontWeight: 400,
                opacity: 0.92,
                maxWidth: "none",
                lineHeight: 1.5,
                fontFamily: "var(--font-sans)",
              }}
            >
              ทำความเข้าใจบทบาท ธุรกิจ และกระบวนการทำงานของฝ่ายจัดซื้อส่วนกลาง
              ตั้งแต่รับคำขอจนถึงสั่งซื้อและรับของ
            </p>
          </Reveal>

          {/* CTA */}
          <Reveal delay={120} style={{ marginTop: "var(--sp-5)" }}>
            <button
              type="button"
              onClick={() => setPage("knowledge")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--sp-2)",
                background: "#fffdf8",
                color: "var(--navy-deep)",
                border: "none",
                borderRadius: "var(--radius-full)",
                padding: "var(--sp-3) var(--sp-5)",
                fontWeight: 700,
                fontSize: "var(--fs-sm)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              อ่านคู่มือการทำงาน
              <IconArrowRight size={18} stroke={2} />
            </button>
          </Reveal>
        </div>
      </header>

      {/* ---------- Body ---------- */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
        {/* 1. Who we serve */}
        <Section
          eyebrow="เราคือใคร"
          title="ฝ่ายจัดซื้อส่วนกลางของทั้งเครือ"
          intro="ฝ่ายจัดซื้อไม่ได้ทำงานให้บริษัทเดียว แต่ให้บริการทุกหน่วยงานในเครือ GUNKUL ทุกทีมที่ต้องการซื้ออุปกรณ์ ผู้รับเหมา หรือบริการ จะต้องผ่านฝ่ายจัดซื้อเสมอ"
        >
          <div style={grid(240)}>
            {SERVED.map((s) => (
              <HoverCard key={s.code}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 56,
                      height: 40,
                      padding: "0 var(--sp-2)",
                      borderRadius: "var(--radius-sm)",
                      background: tint("var(--primary)"),
                      color: "var(--primary)",
                      fontWeight: 800,
                      fontFamily: "var(--font-sans)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {s.code}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-strong)" }}>{s.name}</div>
                    <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{s.note}</div>
                  </div>
                </div>
              </HoverCard>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--sp-3)",
              marginTop: "var(--sp-4)",
              padding: "var(--sp-4)",
              borderRadius: "var(--radius-lg)",
              background: tint("var(--accent)"),
              border: "1px solid var(--border)",
            }}
          >
            <IconSitemap size={22} stroke={1.75} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>
              ทุกการจัดซื้อในเครือต้องผ่านฝ่ายจัดซื้อเสมอ
            </span>
          </div>
        </Section>

        {/* 2. Business model */}
        <Section
          eyebrow="บริบทธุรกิจ"
          title="Gunkul ทำธุรกิจพลังงานแสงอาทิตย์อย่างไร"
          intro="ต้องเข้าใจธุรกิจก่อน เพราะมันกำหนดว่าเราซื้ออะไรและซื้อในบริบทไหน — แบ่งเป็น 2 โมเดลหลัก"
        >
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              minHeight: 220,
            }}
          >
            {MODELS.map((m) => (
              <div
                key={m.tag}
                style={{
                  background:
                    m.tag === "EPC"
                      ? "color-mix(in srgb, var(--primary) 10%, var(--surface))"
                      : "color-mix(in srgb, var(--accent) 12%, var(--surface))",
                  padding:
                    m.tag === "EPC"
                      ? "var(--sp-6) 5.5rem var(--sp-6) var(--sp-4)"
                      : "var(--sp-6) var(--sp-4) var(--sp-6) 5.5rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.tag === "EPC" ? "flex-end" : "flex-start",
                  textAlign: m.tag === "EPC" ? "right" : "left",
                }}
              >
                <IconBadge icon={m.icon} color={m.color} size={48} />
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "2.4rem",
                    fontWeight: 800,
                    color: m.color,
                    marginTop: "var(--sp-3)",
                    lineHeight: 1,
                  }}
                >
                  {m.tag}
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-strong)", marginTop: "var(--sp-1)" }}>
                  {m.title}
                </div>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "var(--fs-sm)",
                    lineHeight: 1.6,
                    margin: "var(--sp-3) 0",
                    maxWidth: "32ch",
                  }}
                >
                  {m.desc}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-2)", justifyContent: m.tag === "EPC" ? "flex-end" : "flex-start" }}>
                  {m.facts.map((f) => (
                    <span
                      key={f}
                      style={{
                        fontSize: "var(--fs-xs)",
                        color: "var(--text)",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-full)",
                        padding: "4px 12px",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--bg-elevated)",
                border: "2px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontWeight: 800,
                fontSize: "var(--fs-xs)",
                color: "var(--text-faint)",
                zIndex: 2,
              }}
            >
              VS
            </span>
          </div>

          <h3 style={{ margin: "var(--sp-6) 0 var(--sp-4)", color: "var(--text-strong)" }}>
            งานแบ่งเป็น 2 ประเภท
          </h3>
          <div style={grid(300)}>
            {PROJECT_TYPES.map((p) => (
              <HoverCard key={p.title}>
                <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                  <IconBadge icon={p.icon} color={p.color} />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-strong)" }}>{p.title}</div>
                    <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.6, margin: "var(--sp-1) 0 var(--sp-2)" }}>
                      {p.desc}
                    </p>
                    <div style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: p.color }}>{p.focus}</div>
                  </div>
                </div>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* 3. Current projects */}
        <Section
          eyebrow="พอร์ตงานปัจจุบัน"
          title="Project Farm ที่ดำเนินอยู่"
          right={
            <button
              type="button"
              onClick={() => setAddingProject(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: "var(--radius-full)",
                border: "1.5px solid var(--primary)",
                background: "var(--primary)",
                color: "var(--primary-contrast)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "var(--fs-xs)",
              }}
            >
              <IconPlus size={14} stroke={2} />
              เพิ่มโครงการ
            </button>
          }
        >
          {projectsError ? (
            <div style={{ textAlign: "center", padding: "var(--sp-6)", color: "var(--danger)" }}>
              โหลดโครงการไม่สำเร็จ: {projectsError}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--sp-6)", color: "var(--text-faint)" }}>
              ยังไม่มีโครงการ กดปุ่ม "เพิ่มโครงการ" เพื่อเริ่มต้น
            </div>
          ) : (
            <div style={grid(320)}>
              {projects.map((p) => {
                const isEpc = p.type === "EPC";
                const c = isEpc ? "var(--primary)" : "var(--accent)";
                return (
                  <HoverCard key={p.id} style={{ padding: "var(--sp-4)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--sp-3)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-strong)" }}>{p.name}</div>
                        <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginTop: "var(--sp-1)" }}>{p.note}</div>
                        {p.owners.length > 0 && (
                          <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", marginTop: "var(--sp-2)" }}>
                            ผู้รับผิดชอบ: {p.owners.join(", ")}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--sp-2)", flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: "var(--fs-xs)",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            color: c,
                            background: tint(c),
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)",
                          }}
                        >
                          {p.type}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setEditingProject(p)}
                            title="แก้ไขโครงการ"
                            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", borderRadius: "var(--radius-sm)", padding: 5, cursor: "pointer", display: "inline-flex" }}
                          >
                            <IconPencil size={14} stroke={1.75} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProject(p.id)}
                            title="ลบโครงการ"
                            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", borderRadius: "var(--radius-sm)", padding: 5, cursor: "pointer", display: "inline-flex" }}
                          >
                            <IconTrash size={14} stroke={1.75} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </HoverCard>
                );
              })}
            </div>
          )}
        </Section>

        {editingProject && (
          <ProjectEditModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onSave={saveProjectEdit}
          />
        )}
        {addingProject && (
          <ProjectEditModal
            project={null}
            onClose={() => setAddingProject(false)}
            onSave={addNewProject}
          />
        )}

        {/* 4. Stakeholders */}
        <Section
          eyebrow="คนที่เราทำงานด้วย"
          title="Stakeholders ในกระบวนการจัดซื้อ"
        >
          <div style={grid(260)}>
            {STAKEHOLDERS.map((s) => (
              <HoverCard key={s.role}>
                <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                  <IconBadge icon={s.icon} color={s.color} size={40} />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-strong)" }}>{s.role}</div>
                    <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.55, marginTop: "2px" }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* 5. Workflow */}
        <Section
          eyebrow="หัวใจของงาน"
          title="กระบวนการจัดซื้อ ตั้งแต่ต้นจนจบ"
          intro="ฝ่ายจัดซื้อทำหน้าที่แปลงความต้องการจากหน้างาน ให้กลายเป็นสัญญาและคำสั่งซื้อ ผ่าน 7 ขั้นตอนหลัก"
        >
          <WorkflowTimeline steps={WORKFLOW} />
        </Section>

        {/* 6. Price Approval tiers */}
        <Section
          eyebrow="ระดับการอนุมัติ"
          title="วงเงินอนุมัติราคา (Price Approval)"
          intro="ก่อนเปิด PO ทุกครั้งต้องผ่าน PA ก่อน — ระดับผู้อนุมัติขึ้นกับมูลค่า (รายละเอียดขั้นตอนเต็มดูได้ที่ Knowledge Base)"
        >
          <div style={grid(240)}>
            {PA_TIERS.map((t, i) => (
              <HoverCard key={t.level} style={{ borderTop: `3px solid ${t.color}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", fontWeight: 700 }}>
                    ระดับ {i + 1}
                  </span>
                  <IconShieldCheck size={20} stroke={1.75} style={{ color: t.color }} />
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--text-strong)", margin: "var(--sp-2) 0 var(--sp-1)" }}>
                  {t.level}
                </div>
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{t.limit}</div>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* 7. Systems */}
        <Section
          eyebrow="เครื่องมือ"
          title="ระบบที่ฝ่ายจัดซื้อใช้ทำงาน"
        >
          <div style={grid(240)}>
            {SYSTEMS.map((s) => (
              <HoverCard
                key={s.name}
                style={s.primary ? { borderColor: "var(--primary)" } : undefined}
              >
                <IconBadge icon={s.icon} color={s.primary ? "var(--primary)" : "var(--text-muted)"} size={40} />
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>{s.name}</span>
                  {s.primary && (
                    <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.06em", color: "var(--primary)", background: tint("var(--primary)"), padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
                      ระบบหลัก
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginTop: "var(--sp-1)", lineHeight: 1.55 }}>
                  {s.purpose}
                </div>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* 8. Categories */}
        <Section
          eyebrow="ขอบเขตการจัดซื้อ"
          title="ประเภทสินค้าและบริการ"
          intro="สินค้าและบริการที่ฝ่ายจัดซื้อรับผิดชอบ แบ่งเป็น 31 หมวดหลัก ตัวอย่างเช่น"
        >
          <HoverCard interactive={false}>
            {[
              { icon: IconCategory2, color: "var(--primary)", label: "สินค้า (Products)", items: PRODUCTS },
              { icon: IconUserCog, color: "var(--accent)", label: "บริการ (Services)", items: SERVICES },
            ].map((g, i) => {
              const pct = Math.round((g.items.length / (PRODUCTS.length + SERVICES.length)) * 100);
              return (
                <div key={g.label} style={{ marginBottom: i === 0 ? "var(--sp-5)" : 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "var(--sp-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                      <g.icon size={18} stroke={1.75} style={{ color: g.color }} />
                      <span style={{ fontWeight: 700, color: "var(--text-strong)" }}>{g.label}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: "var(--fs-h3)", color: g.color }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ background: "var(--surface-2)", borderRadius: "var(--radius-full)", height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: g.color, borderRadius: "var(--radius-full)" }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
                    {g.items.map((it) => (
                      <span
                        key={it}
                        style={{
                          fontSize: "var(--fs-xs)",
                          color: "var(--text-muted)",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-full)",
                          padding: "4px 12px",
                        }}
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </HoverCard>
        </Section>

        {/* 9. Timeline & risk */}
        <Section
          eyebrow="ไทม์ไลน์"
          title="ระยะเวลาโดยรวม"
          intro="Bottleneck สำคัญที่สุดคือใบอนุญาต อ.1 (รายละเอียดดูที่ Knowledge Base)"
        >
          <div style={grid(220)}>
            {LEAD_TIMES.map((l) => (
              <HoverCard key={l.scale} style={{ padding: "var(--sp-4)" }}>
                <IconClockHour4 size={22} stroke={1.75} style={{ color: "var(--info)" }} />
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--fs-h3)", fontWeight: 700, color: "var(--text-strong)", marginTop: "var(--sp-2)" }}>
                  {l.time}
                </div>
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginTop: "2px" }}>{l.scale}</div>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* 10. Office + website */}
        <Section eyebrow="ติดต่อ" title="ที่ตั้งและช่องทางบริษัท">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--sp-4)" }}>
            <HoverCard interactive={false}>
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <IconBadge icon={IconMapPin} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-strong)", marginBottom: "var(--sp-1)" }}>
                    ที่ตั้งฝ่ายจัดซื้อ
                  </div>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.7 }}>
                    548 อาคาร วัน ซิตี้ เซ็นเตอร์ (โอซีซี)<br />
                    ชั้นที่ 44 ถนนเพลินจิต<br />
                    แขวงลุมพินี เขตปทุมวัน<br />
                    กรุงเทพมหานคร 10330
                  </p>
                </div>
              </div>
            </HoverCard>

            <HoverCard interactive={false}>
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <IconBadge icon={IconBuildingBank} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-strong)", marginBottom: "var(--sp-1)" }}>
                    Website บริษัท
                  </div>
                  <p style={{ margin: "0 0 var(--sp-3)", color: "var(--text-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.6 }}>
                    เว็บไซต์หลักของกลุ่มบริษัท กันกุล เอ็นจิเนียริ่ง
                  </p>
                  <a
                    href="https://www.gunkul.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "var(--sp-2)",
                      background: "var(--primary)",
                      color: "var(--primary-contrast)",
                      textDecoration: "none",
                      padding: "var(--sp-3) var(--sp-5)",
                      borderRadius: "var(--radius)",
                      fontWeight: 600,
                      fontSize: "var(--fs-sm)",
                    }}
                  >
                    <IconWorld size={18} stroke={1.75} />
                    www.gunkul.com
                  </a>
                </div>
              </div>
            </HoverCard>
          </div>
        </Section>

        {/* 11. Team */}
        <Section eyebrow="ทีมของเรา" title="ฝ่ายจัดซื้อส่วนกลาง">
          <HoverCard interactive={false} style={{ padding: 0, overflow: "hidden" }}>
            <img
              src="/team-photo.jpeg"
              alt="ทีมฝ่ายจัดซื้อ"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </HoverCard>
        </Section>

      </div>
    </div>
  );
}
