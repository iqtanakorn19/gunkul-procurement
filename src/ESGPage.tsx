import { useState } from "react";
import {
  IconLeaf,
  IconShieldCheck,
  IconUsersGroup,
  IconAlertTriangle,
  IconClipboardCheck,
  IconBuildingFactory2,
  IconRecycle,
  IconCertificate,
  IconFileCheck,
  IconUserPlus,
  IconListCheck,
  IconEye,
  IconHeartHandshake,
  IconCircleCheck,
  IconCircleDashed,
  IconClock,
} from "@tabler/icons-react";
import { Reveal, IconBadge, Section, HoverCard, grid, tint, WorkflowTimeline } from "./components/PageKit";

/* ---------- data ---------- */

const SSCM_STEPS = [
  {
    icon: IconUserPlus,
    title: "1. คัดเลือกคู่ค้ารายใหม่",
    detail:
      "คู่ค้าใหม่ทุกรายกรอกแบบประเมิน 5 ด้าน (ธุรกิจ 10% / คุณภาพ 30% / ส่งมอบ 30% / ราคา 20% / ความยั่งยืน 10%) ต้องผ่าน ≥70% (Critical/Tier-1) หรือ ≥60% (General/Affiliated) และลงนามรับทราบ Supplier Code of Conduct ก่อนขึ้นทะเบียน AVL",
  },
  {
    icon: IconUsersGroup,
    title: "2. จัดกลุ่มคู่ค้า",
    detail:
      "จำแนกคู่ค้าทุกรายเป็น 4 กลุ่มตามมูลค่าซื้อขายและความสำคัญ: Critical Tier-1 / Tier-1 / General Supplier / Critical Non-Tier-1 / Affiliated Company",
  },
  {
    icon: IconAlertTriangle,
    title: "3. ประเมินความเสี่ยง (ESG Risk Assessment)",
    detail:
      "ทำอย่างน้อย 1 ครั้ง/3 ปี ครอบคลุมคู่ค้าหลักทุกราย ประเมิน 4 ด้าน (สินค้า&บริการ / ดำเนินธุรกิจ / สิ่งแวดล้อม / สังคม) ด้วยคะแนน โอกาส × ผลกระทบ",
  },
  {
    icon: IconClipboardCheck,
    title: "4. ประเมินประสิทธิภาพคู่ค้า",
    detail:
      "ประเมินทุก 6 เดือน ด้วยใบประเมินผู้ขาย/ผู้รับเหมา ออกเกรด A–F ครอบคลุมมิติเศรษฐกิจ สังคม สิ่งแวดล้อม — เกรด D ติดกัน 2 ครั้ง หรือ F = ตัดออกจาก AVL",
  },
  {
    icon: IconBuildingFactory2,
    title: "5. ตรวจประเมิน & เข้าเยี่ยมคู่ค้า (On-site Audit)",
    detail:
      "บังคับสำหรับคู่ค้าหลักรายใหม่ + ความเสี่ยงสูง/สูงมาก + เกรด D ทุกราย อย่างน้อย 1 ครั้ง/ปี ทีมตรวจประกอบด้วยตัวแทนฝ่ายจัดซื้อ + ผู้รู้ด้านความปลอดภัย/กฎหมายแรงงาน/CG",
  },
  {
    icon: IconHeartHandshake,
    title: "6. สร้างการมีส่วนร่วม & เสริมศักยภาพคู่ค้า",
    detail:
      "สื่อสารนโยบาย จัดอบรม ส่งเสริมจัดซื้อท้องถิ่นและ Green Procurement ร่วมพัฒนานวัตกรรมกับคู่ค้า เปิดช่องทางร้องเรียนที่ปลอดภัย",
  },
];

const SUPPLIER_GROUPS = [
  { name: "Critical Tier-1 Supplier", count: "38 ราย", countNum: 38, value: "679.5 ลบ.", valueNum: 679.5, desc: "มูลค่าซื้อขายสูง ≥80% ของมูลค่ารวม / ตัวเลือกน้อยราย / สำคัญต่อธุรกิจสูง", color: "var(--danger)" },
  { name: "Tier-1 Supplier", count: "65 ราย", countNum: 65, value: "160.2 ลบ.", valueNum: 160.2, desc: "มูลค่าปานกลาง-ต่ำ ซื้อขายต่อเนื่อง สำคัญปานกลาง", color: "var(--warning)" },
  { name: "General Supplier", count: "525 ราย", countNum: 525, value: "76.1 ลบ.", valueNum: 76.1, desc: "มูลค่าต่ำ ซื้อครั้งเดียว สำคัญน้อย", color: "var(--info)" },
  { name: "Affiliated Company", count: "16 ราย", countNum: 16, value: "364.4 ลบ.", valueNum: 364.4, desc: "คู่ค้าที่เป็นบริษัทในเครือกลุ่ม GUNKUL", color: "var(--success)" },
];

const RISK_LEVELS = [
  { range: "1–2", level: "ความเสี่ยงต่ำ", action: "ติดตามเพื่อรักษาหรือลดระดับความเสี่ยง", color: "var(--success)" },
  { range: "3–4", level: "ความเสี่ยงปานกลาง", action: "ติดตามเพื่อรักษาหรือลดระดับความเสี่ยง", color: "var(--info)" },
  { range: "5–8", level: "ความเสี่ยงสูง", action: "กำหนดมาตรการควบคุมเพื่อลดความเสี่ยง", color: "var(--warning)" },
  { range: "9–16", level: "ความเสี่ยงสูงมาก", action: "กำหนดมาตรการควบคุมเพื่อลดความเสี่ยง + On-site Audit ภาคบังคับ", color: "var(--danger)" },
];

function riskColor(score: number) {
  if (score <= 2) return "var(--success)";
  if (score <= 4) return "var(--info)";
  if (score <= 8) return "var(--warning)";
  return "var(--danger)";
}

const GRADES = [
  { grade: "A", label: "ดีมาก", score: "> 80%", result: "คงสถานะคู่ค้าใน AVL", color: "var(--success)" },
  { grade: "B", label: "ดี", score: "70–79%", result: "คงสถานะคู่ค้าใน AVL", color: "var(--success)" },
  { grade: "C", label: "พอใช้", score: "60–69%", result: "เกณฑ์ผ่านขั้นต่ำ", color: "var(--info)" },
  { grade: "D", label: "ต้องปรับปรุง", score: "50–59%", result: "ต้องประเมินความเสี่ยง + On-site Audit / ติดกัน 2 ครั้ง = ตัดออกจาก AVL", color: "var(--warning)" },
  { grade: "F", label: "ตัดออก", score: "< 50%", result: "ตัดออกจากรายชื่อคู่ค้าทันที", color: "var(--danger)" },
];

const RESPONSIBILITY: { task: string; owner: string; due: string }[] = [
  { task: "สื่อสาร Supplier Code of Conduct ให้คู่ค้าหลัก + AVL ใหม่ทุกราย", owner: "PU-All", due: "ดำเนินการต่อเนื่อง" },
  { task: "ปรับปรุงแบบฟอร์มคัดเลือกคู่ค้าใหม่ (เพิ่มเกณฑ์ ESG 10%)", owner: "PU-All", due: "30 มิ.ย. 2025" },
  { task: "ปรับปรุงใบประเมินผู้ขาย/ผู้รับเหมา ให้ครอบคลุม ESG", owner: "PU-All", due: "30 มิ.ย. 2025" },
  { task: "จัดทำแบบฟอร์ม On-site Audit ครอบคลุม ESG", owner: "PU-GPD", due: "30 มิ.ย. 2025" },
  { task: "จัดกลุ่มคู่ค้า 4 กลุ่มตามเกณฑ์ใหม่", owner: "PU-All", due: "31 ก.ค. 2025" },
  { task: "จัดทำแบบฟอร์มประเมินความเสี่ยงคู่ค้า", owner: "SD", due: "31 ก.ค. 2025" },
  { task: "จัดอบรม/กิจกรรมเสริมศักยภาพคู่ค้า", owner: "SD", due: "31 ต.ค. 2025" },
];

type GapStatus = "done" | "progress" | "todo";

const FTSE_INDICATORS: { code: string; label: string; status: GapStatus }[] = [
  { code: "ESC09 / SSC10", label: "Risk Assessment คู่ค้าใหม่และคู่ค้าเดิมที่เสี่ยงสูง", status: "done" },
  { code: "ESC08 / SSC09", label: "สื่อสารนโยบายและ Code of Conduct ให้คู่ค้า", status: "done" },
  { code: "SSC11_1", label: "ฝึกอบรมพนักงานจัดซื้อ/ผู้ซื้อภายในองค์กรเอง", status: "progress" },
  { code: "SSC11_2", label: "นโยบายจัดซื้อ/สัญญาคู่ค้าเปิดเผยต่อสาธารณะ", status: "done" },
  { code: "ESC11 / SSC12", label: "On-site Audit และเปิดเผยสัดส่วนคู่ค้าที่ตรวจ", status: "done" },
  { code: "SSC17", label: "อบรม / เป็นพี่เลี้ยงให้คู่ค้า (Capacity Building)", status: "done" },
  { code: "ESC10", label: "รายงาน/ลดผลกระทบสิ่งแวดล้อมจากคู่ค้า", status: "todo" },
  { code: "ESC12 / SSC16", label: "เป็นสมาชิก/ผู้นำเครือข่ายความร่วมมือ Supply Chain (เช่น Sedex)", status: "todo" },
  { code: "GRI 204-1", label: "เปิดเผยสัดส่วนจัดซื้อจากผู้จัดหาในท้องถิ่น", status: "todo" },
];

const STATUS_META: Record<GapStatus, { label: string; color: string; icon: typeof IconCircleCheck }> = {
  done: { label: "พร้อมเปิดเผย", color: "var(--success)", icon: IconCircleCheck },
  progress: { label: "กำลังดำเนินการ", color: "var(--warning)", icon: IconClock },
  todo: { label: "ยังไม่ได้ทำ", color: "var(--danger)", icon: IconCircleDashed },
};

const BENCHMARKS = [
  {
    company: "Bangchak Corporation",
    icon: IconCertificate,
    points: [
      "Procurement Center ผูก ESG เข้ากับงานจัดซื้อโดยตรง (Shared Service)",
      "On-site ESG Audit ครบ 100% ของ Significant Supplier ทุกปี",
      "สัมมนาคู่ค้าประจำปี + มอบ Certificate ให้คู่ค้าดีเด่น",
    ],
  },
  {
    company: "KCG Corporation",
    icon: IconEye,
    points: ["ฝ่ายจัดซื้อร่วมกับฝ่าย QC เป็นเจ้าภาพ Audit คู่ค้าร่วมกัน"],
  },
  {
    company: "A.J. Plast",
    icon: IconRecycle,
    points: [
      "ประเมินคู่ค้ารายเดือน (ถี่กว่า GUNKUL ที่ทำทุก 6 เดือน)",
      "เกรด D ติดกัน 2 ครั้ง = หยุดการสั่งซื้อทันที",
      "โครงการ Circular Economy ร่วมกับคู่ค้า ลด GHG ได้เป็นตันคาร์บอนจริง",
    ],
  },
];

const STAFF_CHECKLIST = [
  { item: "คู่ค้าใหม่: ให้กรอกแบบประเมิน ESG 10% ก่อนขึ้น AVL", freq: "ทุกครั้งที่รับคู่ค้าใหม่" },
  { item: "ส่ง Supplier Code of Conduct ให้คู่ค้าใหม่ลงนามรับทราบ", freq: "ก่อนขึ้นทะเบียน AVL" },
  { item: "ประเมินประสิทธิภาพคู่ค้า (ใบประเมินผู้ขาย/ผู้รับเหมา)", freq: "ทุก 6 เดือน" },
  { item: "คู่ค้าเกรด D/F: แจ้งเตือนและพิจารณาตัดออกจาก AVL", freq: "ทุก 6 เดือน" },
  { item: "ทำ ESG Risk Assessment คู่ค้าหลักทุกราย", freq: "ทุกปี" },
  { item: "จัด On-site Audit คู่ค้าความเสี่ยงสูง/เกรด D", freq: "ทุกปี" },
  { item: "ทำ ESG Self-Assessment Questionnaire (SAQ)", freq: "ทุก 3 ปี" },
  { item: "สรุปผลการดำเนินงานส่งทีม SSCM Working Team", freq: "ทุกไตรมาส" },
];

/* ---------- page ---------- */

export default function ESGPage() {
  const [doneChecklist, setDoneChecklist] = useState<boolean[]>(Array(STAFF_CHECKLIST.length).fill(false));

  const toggle = (i: number) =>
    setDoneChecklist((prev) => {
      const n = [...prev];
      n[i] = !n[i];
      return n;
    });

  const doneCount = doneChecklist.filter(Boolean).length;

  return (
    <div>
      {/* Hero */}
      <header
        style={{
          position: "relative",
          background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)",
          color: "#fffdf8",
          padding: "var(--sp-8) var(--sp-6)",
          overflow: "hidden",
        }}
      >
        <div className="hero-aurora" aria-hidden />
        <div style={{ position: "relative", maxWidth: "1100px", margin: "0 auto", zIndex: 1 }}>
          <Reveal>
            <span
              style={{
                display: "inline-block",
                background: "rgba(226,201,126,0.18)",
                border: "1px solid rgba(226,201,126,0.4)",
                color: "var(--accent)",
                padding: "4px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: "var(--sp-3)",
              }}
            >
              SUSTAINABLE PROCUREMENT
            </span>
            <h1 style={{ margin: "0 0 var(--sp-2)", color: "#fffdf8", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 800 }}>
              ESG & Sustainable Supply Chain
            </h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "var(--fs-body)" }}>
              บทบาทฝ่ายจัดซื้อในการบริหารห่วงโซ่อุปทานอย่างยั่งยืน (SSCM) ตามกรอบ FTSE Russell ESG
            </p>
          </Reveal>

          <Reveal delay={120} style={{ marginTop: "var(--sp-5)" }}>
            <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
              {[
                { label: "FTSE Themes", count: "11" },
                { label: "Indicators ทั้งหมด", count: "175" },
                { label: "กลุ่มคู่ค้า", count: "4" },
                { label: "ขั้นตอน SSCM", count: "6" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "var(--radius)",
                    padding: "var(--sp-3) var(--sp-5)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)", fontSize: "var(--fs-xs)" }}>{s.label}</p>
                  <p style={{ margin: 0, color: "white", fontSize: "var(--fs-h2)", fontWeight: 800 }}>{s.count}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </header>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
        {/* Why */}
        <Section
          eyebrow="ทำไมต้องทำ"
          title="FTSE ESG Score กับฝ่ายจัดซื้อ"
          intro="ตั้งแต่ปี 2570 เป็นต้นไป FTSE assessment จะครอบคลุม 495+ บริษัทและประกาศคะแนนต่อสาธารณะ ใช้อ้างอิงกองทุน ESG, รางวัล SET Sustainability Awards และ FTSE ESG Index — หมวด Supply Chain คือหมวดที่ฝ่ายจัดซื้อเป็นเจ้าภาพหลักโดยตรง ไม่ใช่หน้าที่ของทีม ESG/SD เพียงฝ่ายเดียว"
        >
          <HoverCard interactive={false} style={{ display: "flex", alignItems: "flex-start", gap: "var(--sp-3)" }}>
            <IconBadge icon={IconShieldCheck} color="var(--success)" />
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.7 }}>
              ถ้าฝ่ายจัดซื้อไม่ทำระบบ AVL / ประเมินคู่ค้า / Audit ให้ครบตามเกณฑ์ คะแนน ESG ของบริษัทจะตกในหมวด Supply Chain ทันที
              เพราะ FTSE ตรวจจากกระบวนการจัดซื้อจัดจ้างจริง ไม่ใช่แค่คำแถลงนโยบาย
            </p>
          </HoverCard>
        </Section>

        {/* SSCM process */}
        <Section
          eyebrow="กระบวนการหลัก"
          title="SSCM 6 ขั้นตอน"
          intro="คู่มือ Sustainable Supply Chain Management (POL-PU_68-001) ที่ฝ่ายจัดซื้อต้องปฏิบัติกับคู่ค้าทุกราย"
        >
          <HoverCard interactive={false}>
            <WorkflowTimeline steps={SSCM_STEPS} />
          </HoverCard>
        </Section>

        {/* Supplier groups */}
        <Section eyebrow="จำแนกคู่ค้า" title="4 กลุ่มคู่ค้า" intro="จัดกลุ่มตามมูลค่าซื้อขายและความสำคัญต่อธุรกิจ — ตัวอย่างจริงจากกลุ่ม GKE">
          <HoverCard interactive={false} style={{ marginBottom: "var(--sp-4)" }}>
            <p style={{ margin: "0 0 var(--sp-4)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              มูลค่าซื้อขายต่อกลุ่ม (ล้านบาท)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {(() => {
                const max = Math.max(...SUPPLIER_GROUPS.map((g) => g.valueNum));
                return SUPPLIER_GROUPS.map((g) => (
                  <div key={g.name} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                    <span style={{ width: 150, flexShrink: 0, fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--text-strong)" }}>{g.name}</span>
                    <div style={{ flex: 1, height: 14, borderRadius: "var(--radius-full)", background: "var(--surface-2)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(g.valueNum / max) * 100}%`,
                          background: g.color,
                          borderRadius: "var(--radius-full)",
                          transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                    <span style={{ width: 90, flexShrink: 0, textAlign: "right", fontSize: "var(--fs-xs)", fontWeight: 700, color: g.color }}>{g.value}</span>
                    <span style={{ width: 60, flexShrink: 0, textAlign: "right", fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{g.count}</span>
                  </div>
                ));
              })()}
            </div>
          </HoverCard>
          <div style={grid(240)}>
            {SUPPLIER_GROUPS.map((g) => (
              <HoverCard key={g.name}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 700,
                    color: g.color,
                    background: tint(g.color),
                    padding: "3px 10px",
                    borderRadius: "var(--radius-full)",
                    marginBottom: "var(--sp-3)",
                  }}
                >
                  {g.count} • {g.value}
                </span>
                <p style={{ margin: "0 0 var(--sp-2)", fontWeight: 700, color: "var(--text-strong)" }}>{g.name}</p>
                <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>{g.desc}</p>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* Risk matrix */}
        <Section
          eyebrow="ประเมินความเสี่ยง"
          title="ระดับความเสี่ยงคู่ค้า"
          intro="คะแนนความเสี่ยง = โอกาสที่จะเกิด (Likelihood) × ผลกระทบ (Impact) ครอบคลุม 4 ด้าน: สินค้า&บริการ / ดำเนินธุรกิจ / สิ่งแวดล้อม / สังคม"
        >
          <HoverCard interactive={false} style={{ marginBottom: "var(--sp-4)" }}>
            <div style={{ display: "flex", gap: "var(--sp-3)" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontSize: "var(--fs-xs)",
                  fontWeight: 700,
                  color: "var(--text-faint)",
                  flexShrink: 0,
                }}
              >
                โอกาสเกิด (Likelihood) →
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-2)" }}>
                  {[4, 3, 2, 1].map((l) =>
                    [1, 2, 3, 4].map((i) => {
                      const score = l * i;
                      return (
                        <div
                          key={`${l}-${i}`}
                          title={`โอกาส ${l} × ผลกระทบ ${i} = ${score}`}
                          style={{
                            aspectRatio: "1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "var(--radius-sm)",
                            background: tint(riskColor(score)),
                            color: riskColor(score),
                            fontWeight: 800,
                            fontSize: "var(--fs-sm)",
                          }}
                        >
                          {score}
                        </div>
                      );
                    })
                  )}
                </div>
                <p style={{ margin: "var(--sp-2) 0 0", textAlign: "center", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-faint)" }}>
                  ผลกระทบ (Impact) →
                </p>
              </div>
            </div>
          </HoverCard>
          <HoverCard interactive={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              {RISK_LEVELS.map((r) => (
                <div
                  key={r.range}
                  style={{
                    display: "flex",
                    gap: "var(--sp-3)",
                    alignItems: "center",
                    padding: "var(--sp-3)",
                    borderRadius: "var(--radius)",
                    background: "var(--surface-2)",
                    borderLeft: `3px solid ${r.color}`,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "var(--fs-xs)",
                      fontWeight: 800,
                      color: r.color,
                      background: tint(r.color),
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 10px",
                      minWidth: 52,
                      textAlign: "center",
                    }}
                  >
                    {r.range}
                  </span>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-strong)" }}>{r.level}</p>
                    <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{r.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </HoverCard>
        </Section>

        {/* Grades */}
        <Section
          eyebrow="ประเมินประสิทธิภาพ"
          title="เกรดประเมินคู่ค้า"
          intro="ประเมินทุก 6 เดือน ด้วยใบประเมินผู้ขาย/ผู้รับเหมา ครอบคลุมมิติเศรษฐกิจ สังคม สิ่งแวดล้อม"
        >
          <HoverCard interactive={false} style={{ marginBottom: "var(--sp-4)" }}>
            <div style={{ display: "flex", height: 28, borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              {[
                { grade: "F", width: 50, color: "var(--danger)" },
                { grade: "D", width: 10, color: "var(--warning)" },
                { grade: "C", width: 10, color: "var(--info)" },
                { grade: "B", width: 10, color: "var(--success)" },
                { grade: "A", width: 20, color: "var(--success)" },
              ].map((s) => (
                <div
                  key={s.grade}
                  style={{
                    width: `${s.width}%`,
                    background: s.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "var(--fs-xs)",
                    opacity: s.grade === "F" ? 0.85 : 1,
                  }}
                >
                  {s.grade}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--sp-2)", fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>
              <span>0%</span>
              <span>50%</span>
              <span>60%</span>
              <span>70%</span>
              <span>80%</span>
              <span>100%</span>
            </div>
          </HoverCard>
          <div style={grid(200)}>
            {GRADES.map((g) => (
              <HoverCard key={g.grade}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-2)" }}>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-full)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "var(--fs-h3)",
                      background: tint(g.color),
                      color: g.color,
                      flexShrink: 0,
                    }}
                  >
                    {g.grade}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--text-strong)" }}>{g.label}</p>
                    <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{g.score}</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>{g.result}</p>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* Responsibility table */}
        <Section
          eyebrow="แผนงาน 2025"
          title="ผู้รับผิดชอบ & กำหนดเวลา"
          intro="ฝ่ายจัดซื้อ (PU) เป็นเจ้าภาพหลักของงาน SSCM ส่วนทีม SD สนับสนุนเฉพาะแบบฟอร์มความเสี่ยงและการอบรม"
        >
          <HoverCard interactive={false}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--border-strong)" }}>
                    <th style={{ textAlign: "left", padding: "var(--sp-2) var(--sp-3)", color: "var(--text-faint)", fontSize: "var(--fs-xs)", textTransform: "uppercase" }}>งาน</th>
                    <th style={{ textAlign: "left", padding: "var(--sp-2) var(--sp-3)", color: "var(--text-faint)", fontSize: "var(--fs-xs)", textTransform: "uppercase" }}>ผู้รับผิดชอบ</th>
                    <th style={{ textAlign: "left", padding: "var(--sp-2) var(--sp-3)", color: "var(--text-faint)", fontSize: "var(--fs-xs)", textTransform: "uppercase" }}>กำหนดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {RESPONSIBILITY.map((r) => (
                    <tr key={r.task} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "var(--sp-3)", color: "var(--text-strong)" }}>{r.task}</td>
                      <td style={{ padding: "var(--sp-3)" }}>
                        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--primary)", background: tint("var(--primary)"), padding: "3px 10px", borderRadius: "var(--radius-full)" }}>
                          {r.owner}
                        </span>
                      </td>
                      <td style={{ padding: "var(--sp-3)", color: "var(--text-muted)" }}>{r.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </HoverCard>
        </Section>

        {/* FTSE gap */}
        <Section
          eyebrow="FTSE Indicators"
          title="ตัวชี้วัดที่ฝ่ายจัดซื้อต้องปิด Gap"
          intro="สถานะความคืบหน้าของตัวชี้วัด FTSE หมวด Supply Chain ที่เกี่ยวข้องกับงานจัดซื้อโดยตรง"
        >
          <div style={grid(280)}>
            {FTSE_INDICATORS.map((f) => {
              const meta = STATUS_META[f.status];
              return (
                <HoverCard key={f.code}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
                    <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-faint)" }}>{f.code}</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 700,
                        color: meta.color,
                        background: tint(meta.color),
                        padding: "3px 10px",
                        borderRadius: "var(--radius-full)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <meta.icon size={12} stroke={2} />
                      {meta.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-strong)", lineHeight: 1.5 }}>{f.label}</p>
                </HoverCard>
              );
            })}
          </div>
        </Section>

        {/* Benchmark */}
        <Section eyebrow="Benchmark" title="แนวทางจากบริษัทชั้นนำ" intro="แนวปฏิบัติของบริษัทอื่นที่ GUNKUL พิจารณานำมาปรับใช้">
          <div style={grid(280)}>
            {BENCHMARKS.map((b) => (
              <HoverCard key={b.company}>
                <IconBadge icon={b.icon} color="var(--accent)" />
                <p style={{ margin: "var(--sp-3) 0 var(--sp-2)", fontWeight: 700, color: "var(--text-strong)" }}>{b.company}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                  {b.points.map((p) => (
                    <li key={p} style={{ display: "flex", gap: "var(--sp-2)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>
                      <IconLeaf size={14} stroke={2} style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </HoverCard>
            ))}
          </div>
        </Section>

        {/* Staff checklist */}
        <Section
          eyebrow="ปฏิบัติงานประจำ"
          title="Checklist สำหรับพนักงานจัดซื้อ"
          intro="กดติ๊กแต่ละงานเพื่อติดตามความคืบหน้าของรอบงาน SSCM ของคุณเอง"
          right={<span style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{doneCount} / {STAFF_CHECKLIST.length} เสร็จแล้ว</span>}
        >
          <HoverCard interactive={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              {STAFF_CHECKLIST.map((c, i) => {
                const done = doneChecklist[i];
                return (
                  <div
                    key={c.item}
                    onClick={() => toggle(i)}
                    style={{
                      display: "flex",
                      gap: "var(--sp-3)",
                      alignItems: "flex-start",
                      padding: "var(--sp-3)",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: done ? "color-mix(in srgb, var(--success) 35%, transparent)" : "transparent",
                      background: done ? tint("var(--success)") : "var(--surface-2)",
                      transition: "background var(--transition)",
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: done ? "var(--success)" : "var(--surface)",
                        border: done ? "none" : "1.5px solid var(--border-strong)",
                        color: "var(--primary-contrast)",
                        marginTop: 1,
                      }}
                    >
                      {done && <IconListCheck size={14} stroke={2.5} />}
                    </span>
                    <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: "var(--sp-3)", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text-strong)" }}>{c.item}</p>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", whiteSpace: "nowrap" }}>{c.freq}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </HoverCard>
        </Section>

        {/* Reference docs note */}
        <Reveal>
          <HoverCard interactive={false} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <IconBadge icon={IconFileCheck} color="var(--info)" />
            <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
              อ้างอิงจาก POL-PU_68-001 (Sustainable Supply Chain Management), POL-BOD_68-020 (Supplier Code of Conduct),
              FTSE Russell ESG Guidelines และรายงานความยั่งยืนของ GUNKUL และบริษัท Benchmark
            </p>
          </HoverCard>
        </Reveal>
      </div>
    </div>
  );
}
