import { useEffect, useMemo, useState } from "react";
import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  IconBuildingFactory2, IconSearch, IconPlus, IconPencil, IconTrash, IconX,
} from "@tabler/icons-react";
import { Reveal, Section } from "./components/PageKit";

export const CONTRACT_TYPE_OPTIONS = ["EPC", "PPA", "PEAESCO", "-"] as const;
export type ContractType = (typeof CONTRACT_TYPE_OPTIONS)[number];

export const ROOF_TYPE_OPTIONS = [
  "Rooftop", "Carport", "Farm", "Floating", "Reinforcement", "Reroof", "Civil", "อื่นๆ",
] as const;

export const STATUS_OPTIONS = [
  "ไม่ระบุ", "Awarded", "Kick Off แล้ว", "ยังไม่ Kick Off", "Bidding Subcon", "อื่นๆ",
] as const;
export type ProjectStatus = (typeof STATUS_OPTIONS)[number];

export const COLOR_STATUS_OPTIONS = ["Done", "Cancelled", "Hold", "On going"] as const;
export type ColorStatus = (typeof COLOR_STATUS_OPTIONS)[number];

export const COLOR_STATUS_HEX: Record<ColorStatus, string> = {
  Done: "#3fa34d",
  Cancelled: "#d64545",
  Hold: "#3a8fd6",
  "On going": "#9aa3ad",
};

export interface ProjectPhase {
  name: string;
  roofType: string;
  capacityKwp: number | null;
  meterCount: number | null;
  location: string;
  contractPrice: number | string | null;
  subconAwardAmount: number | string | null;
  subconName: string;
  pvBrand: string;
  powerClass: string;
  inverterBrand: string;
  inverterModel: string;
  kickoffDate: string;
}

export interface ProjectSeed {
  jobNo: number | null;
  name: string;
  roofType: string;
  contractType: ContractType;
  capacityKwp: number | null;
  roofCount: number | null;
  meterCount: number | null;
  connectionPoint: string;
  safetyLevel: string;
  workmanship: string;
  counterparty: string;
  location: string;
  contractPrice: number | string | null;
  subconAwardAmount: number | string | null;
  materialThbWatt: number | null;
  labourThbWatt: number | null;
  subconName: string;
  awardDate: string;
  pvBrand: string;
  powerClass: string;
  inverterBrand: string;
  inverterModel: string;
  optimizer: string;
  bessBrand: string;
  bessSize: string;
  om: string;
  kickoffDate: string;
  puPic: string;
  pmPic: string;
  engPic: string;
  status: ProjectStatus;
  colorStatus: ColorStatus;
  boi: string;
  note: string;
  estimateSiteMob: string;
  forecastSiteMob1: string;
  forecastSiteMob2: string;
  phases: ProjectPhase[];
}

export interface Project extends ProjectSeed {
  id: string;
}

const EMPTY_PHASE: ProjectPhase = {
  name: "", roofType: "Rooftop", capacityKwp: null, meterCount: null, location: "",
  contractPrice: null, subconAwardAmount: null, subconName: "", pvBrand: "",
  powerClass: "", inverterBrand: "", inverterModel: "", kickoffDate: "",
};

const EMPTY_PROJECT: ProjectSeed = {
  jobNo: null, name: "", roofType: "Rooftop", contractType: "EPC", capacityKwp: null,
  roofCount: null, meterCount: null, connectionPoint: "", safetyLevel: "", workmanship: "",
  counterparty: "", location: "", contractPrice: null, subconAwardAmount: null,
  materialThbWatt: null, labourThbWatt: null, subconName: "", awardDate: "", pvBrand: "",
  powerClass: "", inverterBrand: "", inverterModel: "", optimizer: "", bessBrand: "",
  bessSize: "", om: "", kickoffDate: "", puPic: "", pmPic: "", engPic: "", status: "ไม่ระบุ",
  colorStatus: "On going", boi: "", note: "", estimateSiteMob: "", forecastSiteMob1: "",
  forecastSiteMob2: "", phases: [],
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.65rem", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-strong)", background: "var(--surface)",
  color: "var(--text)", fontSize: "var(--fs-sm)", fontFamily: "var(--font-sans)",
};
const labelStyle: React.CSSProperties = {
  fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "0.25rem", display: "block",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

function ProjectEditModal({
  project, onSave, onClose,
}: {
  project: Project | null;
  onSave: (data: ProjectSeed) => Promise<void>;
  onClose: () => void;
}) {
  const [data, setData] = useState<ProjectSeed>(project ? { ...project } : { ...EMPTY_PROJECT });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProjectSeed>(key: K, value: ProjectSeed[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const addPhase = () => set("phases", [...data.phases, { ...EMPTY_PHASE }]);
  const removePhase = (i: number) => set("phases", data.phases.filter((_, idx) => idx !== i));
  const setPhase = (i: number, key: keyof ProjectPhase, value: ProjectPhase[typeof key]) =>
    set("phases", data.phases.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));

  const handleSave = async () => {
    if (!data.name.trim()) return;
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--sp-4)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: "var(--radius-lg)", width: "min(880px, 100%)",
          maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--sp-4) var(--sp-5)", borderBottom: "1px solid var(--border)",
        }}>
          <h3 style={{ margin: 0 }}>{project ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)" }}>
            <IconX size={20} />
          </button>
        </div>

        <div style={{ padding: "var(--sp-5)", display: "grid", gap: "var(--sp-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--sp-3)" }}>
            <Field label="Job No."><input style={inputStyle} type="number" value={data.jobNo ?? ""} onChange={(e) => set("jobNo", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="ชื่อโครงการ *"><input style={inputStyle} value={data.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="ประเภทหลังคา">
              <select style={inputStyle} value={data.roofType} onChange={(e) => set("roofType", e.target.value)}>
                {ROOF_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="ประเภทสัญญา">
              <select style={inputStyle} value={data.contractType} onChange={(e) => set("contractType", e.target.value as ContractType)}>
                {CONTRACT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="กำลังผลิต (kWp)"><input style={inputStyle} type="number" value={data.capacityKwp ?? ""} onChange={(e) => set("capacityKwp", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="จำนวนหลังคา"><input style={inputStyle} type="number" value={data.roofCount ?? ""} onChange={(e) => set("roofCount", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="จำนวน Meter"><input style={inputStyle} type="number" value={data.meterCount ?? ""} onChange={(e) => set("meterCount", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="จุดเชื่อมต่อ"><input style={inputStyle} value={data.connectionPoint} onChange={(e) => set("connectionPoint", e.target.value)} /></Field>
            <Field label="Safety Level"><input style={inputStyle} value={data.safetyLevel} onChange={(e) => set("safetyLevel", e.target.value)} /></Field>
            <Field label="Workmanship"><input style={inputStyle} value={data.workmanship} onChange={(e) => set("workmanship", e.target.value)} /></Field>
            <Field label="คู่สัญญา"><input style={inputStyle} value={data.counterparty} onChange={(e) => set("counterparty", e.target.value)} /></Field>
            <Field label="Location"><input style={inputStyle} value={data.location} onChange={(e) => set("location", e.target.value)} /></Field>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--sp-3)" }}>
            <strong style={{ fontSize: "var(--fs-sm)" }}>การเงิน / Subcon</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
              <Field label="ราคาตามสัญญา"><input style={inputStyle} value={data.contractPrice ?? ""} onChange={(e) => set("contractPrice", e.target.value)} /></Field>
              <Field label="Award Subcon (บาท)"><input style={inputStyle} value={data.subconAwardAmount ?? ""} onChange={(e) => set("subconAwardAmount", e.target.value)} /></Field>
              <Field label="THB/Watt (Material)"><input style={inputStyle} type="number" value={data.materialThbWatt ?? ""} onChange={(e) => set("materialThbWatt", e.target.value === "" ? null : Number(e.target.value))} /></Field>
              <Field label="THB/Watt (Labour)"><input style={inputStyle} type="number" value={data.labourThbWatt ?? ""} onChange={(e) => set("labourThbWatt", e.target.value === "" ? null : Number(e.target.value))} /></Field>
              <Field label="Subcon Name"><input style={inputStyle} value={data.subconName} onChange={(e) => set("subconName", e.target.value)} /></Field>
              <Field label="Award Date"><input style={inputStyle} type="date" value={data.awardDate} onChange={(e) => set("awardDate", e.target.value)} /></Field>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--sp-3)" }}>
            <strong style={{ fontSize: "var(--fs-sm)" }}>สเปคอุปกรณ์</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
              <Field label="PV Brand"><input style={inputStyle} value={data.pvBrand} onChange={(e) => set("pvBrand", e.target.value)} /></Field>
              <Field label="Power Class"><input style={inputStyle} value={data.powerClass} onChange={(e) => set("powerClass", e.target.value)} /></Field>
              <Field label="Inverter Brand"><input style={inputStyle} value={data.inverterBrand} onChange={(e) => set("inverterBrand", e.target.value)} /></Field>
              <Field label="Inverter Model"><input style={inputStyle} value={data.inverterModel} onChange={(e) => set("inverterModel", e.target.value)} /></Field>
              <Field label="Optimizer"><input style={inputStyle} value={data.optimizer} onChange={(e) => set("optimizer", e.target.value)} /></Field>
              <Field label="BESS Brand"><input style={inputStyle} value={data.bessBrand} onChange={(e) => set("bessBrand", e.target.value)} /></Field>
              <Field label="BESS Size (kWh)"><input style={inputStyle} value={data.bessSize} onChange={(e) => set("bessSize", e.target.value)} /></Field>
              <Field label="OM"><input style={inputStyle} value={data.om} onChange={(e) => set("om", e.target.value)} /></Field>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--sp-3)" }}>
            <strong style={{ fontSize: "var(--fs-sm)" }}>ติดตามสถานะ</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
              <Field label="Kick off Date"><input style={inputStyle} type="date" value={data.kickoffDate} onChange={(e) => set("kickoffDate", e.target.value)} /></Field>
              <Field label="PU PIC"><input style={inputStyle} value={data.puPic} onChange={(e) => set("puPic", e.target.value)} /></Field>
              <Field label="PM PIC"><input style={inputStyle} value={data.pmPic} onChange={(e) => set("pmPic", e.target.value)} /></Field>
              <Field label="ENG PIC"><input style={inputStyle} value={data.engPic} onChange={(e) => set("engPic", e.target.value)} /></Field>
              <Field label="Status">
                <select style={inputStyle} value={data.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
                  {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="สถานะสี (ตามไฮไลท์)">
                <select style={inputStyle} value={data.colorStatus} onChange={(e) => set("colorStatus", e.target.value as ColorStatus)}>
                  {COLOR_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="BOI"><input style={inputStyle} value={data.boi} onChange={(e) => set("boi", e.target.value)} /></Field>
              <Field label="Estimate Site Mob"><input style={inputStyle} value={data.estimateSiteMob} onChange={(e) => set("estimateSiteMob", e.target.value)} /></Field>
              <Field label="Forecast Site Mob 1"><input style={inputStyle} value={data.forecastSiteMob1} onChange={(e) => set("forecastSiteMob1", e.target.value)} /></Field>
              <Field label="Forecast Site Mob 2"><input style={inputStyle} value={data.forecastSiteMob2} onChange={(e) => set("forecastSiteMob2", e.target.value)} /></Field>
            </div>
            <div style={{ marginTop: "var(--sp-3)" }}>
              <Field label="Note">
                <textarea style={{ ...inputStyle, minHeight: 60 }} value={data.note} onChange={(e) => set("note", e.target.value)} />
              </Field>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--sp-3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: "var(--fs-sm)" }}>Phases (โครงการย่อยภายใต้ Job เดียวกัน)</strong>
              <button type="button" onClick={addPhase} style={{
                display: "flex", alignItems: "center", gap: "0.3rem", border: "1px solid var(--border-strong)",
                background: "var(--surface)", borderRadius: "var(--radius-sm)", padding: "0.35rem 0.65rem",
                cursor: "pointer", fontSize: "var(--fs-xs)",
              }}>
                <IconPlus size={14} /> เพิ่ม Phase
              </button>
            </div>
            {data.phases.map((p, i) => (
              <div key={i} style={{
                marginTop: "var(--sp-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                padding: "var(--sp-3)", display: "grid", gap: "var(--sp-2)",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              }}>
                <Field label="ชื่อ Phase"><input style={inputStyle} value={p.name} onChange={(e) => setPhase(i, "name", e.target.value)} /></Field>
                <Field label="ประเภทหลังคา">
                  <select style={inputStyle} value={p.roofType} onChange={(e) => setPhase(i, "roofType", e.target.value)}>
                    {ROOF_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="kWp"><input style={inputStyle} type="number" value={p.capacityKwp ?? ""} onChange={(e) => setPhase(i, "capacityKwp", e.target.value === "" ? null : Number(e.target.value))} /></Field>
                <Field label="Subcon"><input style={inputStyle} value={p.subconName} onChange={(e) => setPhase(i, "subconName", e.target.value)} /></Field>
                <Field label="Kick off Date"><input style={inputStyle} type="date" value={p.kickoffDate} onChange={(e) => setPhase(i, "kickoffDate", e.target.value)} /></Field>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="button" onClick={() => removePhase(i)} style={{
                    border: "none", background: "transparent", color: "var(--danger)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "var(--fs-xs)",
                  }}>
                    <IconTrash size={14} /> ลบ Phase
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)",
          padding: "var(--sp-4) var(--sp-5)", borderTop: "1px solid var(--border)",
        }}>
          <button onClick={onClose} style={{
            border: "1px solid var(--border-strong)", background: "var(--surface)", borderRadius: "var(--radius-sm)",
            padding: "0.55rem 1.1rem", cursor: "pointer",
          }}>
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving || !data.name.trim()} style={{
            border: "none", background: "var(--primary)", color: "white", borderRadius: "var(--radius-sm)",
            padding: "0.55rem 1.1rem", cursor: "pointer", opacity: saving || !data.name.trim() ? 0.6 : 1,
          }}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterColor, setFilterColor] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "jobNo" | "kWp" | "status">("jobNo");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    let seeded = false;
    const colRef = collection(db, "kickoffProjects");
    const unsub = onSnapshot(
      colRef,
      async (snap) => {
        setLoadError(null);
        if (snap.empty && !seeded) {
          seeded = true;
          try {
            const { SEED_PROJECTS } = await import("./data/projectSeed");
            const batch = writeBatch(db);
            SEED_PROJECTS.forEach((p) => batch.set(doc(colRef), p));
            await batch.commit();
          } catch (err) {
            setLoadError(err instanceof Error ? err.message : String(err));
          }
          return;
        }
        setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ProjectSeed) })));
      },
      (err) => setLoadError(err.message)
    );
    return unsub;
  }, []);

  const saveProjectEdit = async (data: ProjectSeed) => {
    if (!editingProject) return;
    await updateDoc(doc(db, "kickoffProjects", editingProject.id), { ...data });
    setEditingProject(null);
  };
  const addNewProject = async (data: ProjectSeed) => {
    await addDoc(collection(db, "kickoffProjects"), data);
    setAddingProject(false);
  };
  const deleteProject = async (id: string) => {
    if (!window.confirm("ยืนยันการลบโครงการนี้?")) return;
    await deleteDoc(doc(db, "kickoffProjects", id));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.counterparty.toLowerCase().includes(q)) return false;
      if (filterColor !== "all" && p.colorStatus !== filterColor) return false;
      if (filterType !== "all" && p.contractType !== filterType) return false;
      return true;
    });

    result.sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      if (sortBy === "jobNo") {
        aVal = a.jobNo ?? 999999;
        bVal = b.jobNo ?? 999999;
      } else if (sortBy === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortBy === "kWp") {
        aVal = a.capacityKwp ?? 0;
        bVal = b.capacityKwp ?? 0;
      } else {
        aVal = a.colorStatus;
        bVal = b.colorStatus;
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [projects, search, filterColor, filterType, sortBy, sortAsc]);

  const colorChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) counts[p.colorStatus] = (counts[p.colorStatus] ?? 0) + 1;
    return COLOR_STATUS_OPTIONS.map((c) => ({ name: c, value: counts[c] ?? 0 })).filter((d) => d.value > 0);
  }, [projects]);

  const typeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) counts[p.contractType] = (counts[p.contractType] ?? 0) + 1;
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [projects]);

  const roofChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const key = p.roofType || "ไม่ระบุ";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [projects]);

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
      <Reveal>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "var(--sp-2)" }}>
          <IconBuildingFactory2 size={16} stroke={1.75} />
          Project
        </div>
        <h1 style={{ margin: "0 0 var(--sp-5)", color: "var(--text-strong)" }}>โครงการทั้งหมด (Kick Off)</h1>
      </Reveal>

      {loadError && (
        <div style={{
          color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", borderRadius: "var(--radius)",
          padding: "var(--sp-4)", fontSize: "var(--fs-sm)", marginBottom: "var(--sp-5)",
        }}>
          โหลดข้อมูลไม่สำเร็จ: {loadError}
        </div>
      )}

      <Reveal delay={80}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--sp-4)", marginBottom: "var(--sp-6)" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--sp-4)" }}>
            <h4 style={{ margin: "0 0 var(--sp-2)", fontSize: "var(--fs-sm)" }}>สัดส่วนสถานะ (สีไฮไลท์)</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={colorChartData} dataKey="value" nameKey="name" outerRadius={80} label={(e) => `${e.name}: ${e.value}`}>
                  {colorChartData.map((d) => (
                    <Cell key={d.name} fill={COLOR_STATUS_HEX[d.name as ColorStatus]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--sp-4)" }}>
            <h4 style={{ margin: "0 0 var(--sp-2)", fontSize: "var(--fs-sm)" }}>สัดส่วนประเภทสัญญา</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--sp-4)" }}>
            <h4 style={{ margin: "0 0 var(--sp-2)", fontSize: "var(--fs-sm)" }}>สัดส่วนประเภทหลังคา</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roofChartData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Reveal>

      <Section
        eyebrow="Project List"
        title="รายการโครงการ"
        right={
          <button onClick={() => setAddingProject(true)} style={{
            display: "flex", alignItems: "center", gap: "0.4rem", border: "none", background: "var(--primary)",
            color: "white", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.9rem", cursor: "pointer", fontSize: "var(--fs-sm)",
          }}>
            <IconPlus size={16} /> เพิ่มโครงการ
          </button>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <IconSearch size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อโครงการ / คู่สัญญา"
              style={{ ...inputStyle, paddingLeft: "2rem" }}
            />
          </div>
          <select style={{ ...inputStyle, width: 160 }} value={filterColor} onChange={(e) => setFilterColor(e.target.value)}>
            <option value="all">สถานะทั้งหมด</option>
            {COLOR_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={{ ...inputStyle, width: 160 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">ประเภทสัญญาทั้งหมด</option>
            {CONTRACT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--sp-8)", color: "var(--text-faint)" }}>
            {projects.length === 0 ? "ยังไม่มีโครงการ" : "ไม่พบโครงการที่ตรงกับการค้นหา"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ marginBottom: "var(--sp-3)", display: "flex", gap: "var(--sp-2)", alignItems: "center", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
              <span>เรียงลำดับ:</span>
              {[{ key: "jobNo", label: "Job No." }, { key: "name", label: "ชื่อ" }, { key: "kWp", label: "kWp" }, { key: "status", label: "สถานะ" }].map((o) => (
                <button
                  key={o.key}
                  onClick={() => {
                    if (sortBy === o.key) setSortAsc(!sortAsc);
                    else { setSortBy(o.key as typeof sortBy); setSortAsc(true); }
                  }}
                  style={{
                    border: sortBy === o.key ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
                    background: sortBy === o.key ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                    color: sortBy === o.key ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: "var(--radius-sm)", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "var(--fs-xs)",
                  }}
                >
                  {o.label} {sortBy === o.key && (sortAsc ? "↑" : "↓")}
                </button>
              ))}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-strong)" }}>
                  <th style={{ padding: "0.5rem" }}>Job</th>
                  <th style={{ padding: "0.5rem" }}>ชื่อโครงการ</th>
                  <th style={{ padding: "0.5rem" }}>ประเภท</th>
                  <th style={{ padding: "0.5rem" }}>kWp</th>
                  <th style={{ padding: "0.5rem" }}>PV</th>
                  <th style={{ padding: "0.5rem" }}>Inverter</th>
                  <th style={{ padding: "0.5rem" }}>Optimizer</th>
                  <th style={{ padding: "0.5rem" }}>BESS</th>
                  <th style={{ padding: "0.5rem" }}>PM PIC</th>
                  <th style={{ padding: "0.5rem" }}>สถานะ</th>
                  <th style={{ padding: "0.5rem" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem", fontWeight: 600 }}>{p.jobNo ?? "-"}</td>
                    <td style={{ padding: "0.5rem", maxWidth: 180 }}>
                      <div>{p.name}</div>
                      {p.phases.length > 0 && (
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>+{p.phases.length} phase</div>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{p.contractType}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>{p.capacityKwp ?? "-"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {p.pvBrand && <div>{p.pvBrand} {p.powerClass}</div>}
                      {!p.pvBrand && <span style={{ color: "var(--text-faint)" }}>-</span>}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {p.inverterBrand && <div>{p.inverterBrand}</div>}
                      {p.inverterModel && <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{p.inverterModel}</div>}
                      {!p.inverterBrand && <span style={{ color: "var(--text-faint)" }}>-</span>}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{p.optimizer || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {p.bessBrand && <div>{p.bessBrand}</div>}
                      {p.bessSize && <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{p.bessSize}</div>}
                      {!p.bessBrand && <span style={{ color: "var(--text-faint)" }}>-</span>}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{p.pmPic || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "0.35rem",
                        padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "var(--fs-xs)",
                        background: `color-mix(in srgb, ${COLOR_STATUS_HEX[p.colorStatus]} 16%, transparent)`,
                        color: COLOR_STATUS_HEX[p.colorStatus],
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLOR_STATUS_HEX[p.colorStatus] }} />
                        {p.colorStatus}
                      </span>
                    </td>
                    <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                      <button onClick={() => setEditingProject(p)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", marginRight: "0.4rem" }}>
                        <IconPencil size={16} />
                      </button>
                      <button onClick={() => deleteProject(p.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--danger)" }}>
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {editingProject && (
        <ProjectEditModal project={editingProject} onSave={saveProjectEdit} onClose={() => setEditingProject(null)} />
      )}
      {addingProject && (
        <ProjectEditModal project={null} onSave={addNewProject} onClose={() => setAddingProject(false)} />
      )}
    </div>
  );
}
