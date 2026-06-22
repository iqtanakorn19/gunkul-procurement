import { useEffect, useState } from "react";
import {
  IconPlus,
  IconX,
  IconUserPlus,
  IconSitemap,
  IconTrash,
  IconUserExclamation,
  IconPencil,
  IconDeviceFloppy,
  IconRotateClockwise2,
} from "@tabler/icons-react";
import "./styles/orgchart.css";

/* ============================================================
   Data model — fully editable, persisted to localStorage so
   changes (names, roles, headcount, vacancies, new boxes) stick
   between visits. No backend yet, so this is the source of truth.
   ============================================================ */

interface Person {
  id: string;
  name: string;
  vacant?: boolean;
}

interface OrgNode {
  id: string;
  title: string;
  scope?: string;
  notes?: string[];
  people: Person[];
  children: OrgNode[];
}

const STORAGE_KEY = "gunkul-orgchart-v1";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const person = (name: string, vacant = false): Person => ({ id: uid(), name, vacant });

/* Default chart, transcribed from the two org-chart PDFs (PU Department,
   GKE — approved naming, 13/01/2026) and cleaned up. Vacancies and the
   shared Imp & Exp line are kept exactly as drawn; everything here can be
   edited in the UI afterward. */
function defaultOrgChart(): OrgNode {
  return {
    id: uid(),
    title: "CEO",
    people: [],
    children: [
      {
        id: uid(),
        title: "VP. Logistics",
        people: [],
        children: [
          {
            id: uid(),
            title: "Purchasing Manager",
            scope: "Utility",
            people: [person("Cherry")],
            children: [
              {
                id: uid(),
                title: "Purchasing Supervisor",
                scope: "Utility, Solar Farm, Wind, O&M",
                people: [person("", true)],
                children: [
                  {
                    id: uid(),
                    title: "Purchasing Engineer",
                    notes: ["รวม 2 ตำแหน่งที่ยังว่าง"],
                    people: [
                      person("Jame"),
                      person("Ploy"),
                      person("Mos"),
                      person("Nook"),
                    ],
                    children: [],
                  },
                  {
                    id: uid(),
                    title: "Purchasing Officer",
                    notes: ["แผนเปลี่ยนตำแหน่งเป็น Engineer"],
                    people: [person("Is")],
                    children: [],
                  },
                ],
              },
              {
                id: uid(),
                title: "Imp & Exp Supervisor",
                scope: "Imp & Exp, Shipping, GA, IT, Hemp",
                notes: ["ดูแลร่วมกับสาย Purchasing Manager (Residential, C&I)"],
                people: [person("P'Nok")],
                children: [
                  {
                    id: uid(),
                    title: "Purchasing Officer (Oversea)",
                    people: [person("", true)],
                    children: [],
                  },
                  {
                    id: uid(),
                    title: "Shipping Officer",
                    people: [person("Gam"), person("Keng"), person("Nhui")],
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            id: uid(),
            title: "Purchasing Manager",
            scope: "Residential, C&I",
            people: [person("Ruk")],
            children: [
              {
                id: uid(),
                title: "Purchasing Supervisor",
                scope: "Contract, Spend Analysis, Evaluation, ESG",
                people: [person("", true)],
                children: [],
              },
              {
                id: uid(),
                title: "Purchasing Supervisor",
                scope: "Residential, C&I, Solar Rooftop, GDFF, FNC",
                people: [person("Arm")],
                children: [
                  {
                    id: uid(),
                    title: "Purchasing Engineer",
                    notes: ["รวม 1 ตำแหน่งที่ยังว่าง", "แผนเปลี่ยนตำแหน่ง Admin เป็น Engineer"],
                    people: [
                      person("Benz"),
                      person("White"),
                      person("Kae"),
                      person("", true),
                    ],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function loadOrgChart(): OrgNode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OrgNode;
  } catch {
    /* fall through to default */
  }
  return defaultOrgChart();
}

/* ============================================================
   Immutable tree helpers
   ============================================================ */

function mapNode(
  node: OrgNode,
  id: string,
  fn: (n: OrgNode) => OrgNode
): OrgNode {
  if (node.id === id) return fn(node);
  return { ...node, children: node.children.map((c) => mapNode(c, id, fn)) };
}

function removeNode(node: OrgNode, id: string): OrgNode {
  return {
    ...node,
    children: node.children
      .filter((c) => c.id !== id)
      .map((c) => removeNode(c, id)),
  };
}

/* ============================================================
   Small editable bits
   ============================================================ */

function EditableText({
  value,
  placeholder,
  onChange,
  style,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onChange(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        style={{
          font: "inherit",
          color: "inherit",
          background: "var(--surface-2)",
          border: "1px solid var(--primary)",
          borderRadius: "var(--radius-sm)",
          padding: "2px 6px",
          width: "100%",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="คลิกเพื่อแก้ไข"
      style={{
        cursor: "pointer",
        borderBottom: "1px dashed transparent",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = "var(--border-strong)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
    >
      {value || <span style={{ color: "var(--text-faint)" }}>{placeholder}</span>}
    </span>
  );
}

/* ============================================================
   Node card
   ============================================================ */

function NodeCard({
  node,
  isRoot,
  onUpdate,
  onRemove,
  onAddChild,
}: {
  node: OrgNode;
  isRoot: boolean;
  onUpdate: (fn: (n: OrgNode) => OrgNode) => void;
  onRemove: () => void;
  onAddChild: () => void;
}) {
  const filled = node.people.filter((p) => !p.vacant);
  const vacancies = node.people.filter((p) => p.vacant);

  const updatePerson = (pid: string, fn: (p: Person) => Person) =>
    onUpdate((n) => ({ ...n, people: n.people.map((p) => (p.id === pid ? fn(p) : p)) }));

  const removePerson = (pid: string) =>
    onUpdate((n) => ({ ...n, people: n.people.filter((p) => p.id !== pid) }));

  const addPerson = (vacant: boolean) =>
    onUpdate((n) => ({ ...n, people: [...n.people, person(vacant ? "" : "ชื่อใหม่", vacant)] }));

  return (
    <div
      className="org-card"
      style={{
        background: "var(--surface)",
        border: `1px solid ${isRoot ? "var(--primary)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--sp-4)",
        minWidth: 220,
        maxWidth: 260,
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--sp-2)" }}>
        <div style={{ flex: 1 }}>
          <EditableText
            value={node.title}
            placeholder="ชื่อตำแหน่ง"
            onChange={(v) => onUpdate((n) => ({ ...n, title: v }))}
            style={{ fontWeight: 700, color: "var(--text-strong)", fontSize: "var(--fs-sm)" }}
          />
          <div style={{ marginTop: 2 }}>
            <EditableText
              value={node.scope ?? ""}
              placeholder="ขอบเขตงาน (ถ้ามี)"
              onChange={(v) => onUpdate((n) => ({ ...n, scope: v || undefined }))}
              style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontStyle: "italic" }}
            />
          </div>
        </div>
        {!isRoot && (
          <button
            type="button"
            onClick={onRemove}
            title="ลบตำแหน่งนี้"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-faint)",
              cursor: "pointer",
              padding: 2,
              flexShrink: 0,
            }}
          >
            <IconTrash size={15} stroke={1.75} />
          </button>
        )}
      </div>

      {/* people chips */}
      {node.people.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-1)", marginTop: "var(--sp-3)" }}>
          {filled.map((p) => (
            <span
              key={p.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "2px 8px",
                fontSize: "var(--fs-xs)",
                color: "var(--primary)",
                fontWeight: 600,
              }}
            >
              <EditableText
                value={p.name}
                placeholder="ชื่อ"
                onChange={(v) => updatePerson(p.id, (pp) => ({ ...pp, name: v }))}
                style={{ fontSize: "var(--fs-xs)", color: "var(--primary)", fontWeight: 600 }}
              />
              <IconX
                size={11}
                stroke={2}
                style={{ cursor: "pointer", color: "var(--text-faint)" }}
                onClick={() => removePerson(p.id)}
              />
            </span>
          ))}
          {vacancies.map((p) => (
            <span
              key={p.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                border: "1px dashed color-mix(in srgb, var(--danger) 55%, transparent)",
                borderRadius: "var(--radius-full)",
                padding: "2px 8px",
                fontSize: "var(--fs-xs)",
                color: "var(--danger)",
                fontWeight: 600,
              }}
            >
              <IconUserExclamation size={12} stroke={1.75} />
              ตำแหน่งว่าง
              <IconX
                size={11}
                stroke={2}
                style={{ cursor: "pointer" }}
                onClick={() => removePerson(p.id)}
              />
            </span>
          ))}
        </div>
      )}

      {node.notes && node.notes.length > 0 && (
        <ul style={{ margin: "var(--sp-2) 0 0", paddingLeft: "var(--sp-4)", color: "var(--text-muted)", fontSize: "var(--fs-xs)", lineHeight: 1.5 }}>
          {node.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      {/* actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
        <button type="button" onClick={() => addPerson(false)} style={miniBtnStyle}>
          <IconUserPlus size={13} stroke={1.75} /> เพิ่มคน
        </button>
        <button type="button" onClick={() => addPerson(true)} style={miniBtnStyle}>
          <IconUserExclamation size={13} stroke={1.75} /> เพิ่มตำแหน่งว่าง
        </button>
        <button type="button" onClick={onAddChild} style={miniBtnStyle}>
          <IconPlus size={13} stroke={1.75} /> เพิ่มตำแหน่งใต้สังกัด
        </button>
      </div>
    </div>
  );
}

const miniBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text-muted)",
  borderRadius: "var(--radius-full)",
  padding: "3px 9px",
  fontSize: "11px",
  cursor: "pointer",
};

/* ============================================================
   Recursive tree branch
   ============================================================ */

function Branch({
  node,
  isRoot,
  onUpdate,
  onRemoveChild,
}: {
  node: OrgNode;
  isRoot: boolean;
  onUpdate: (id: string, fn: (n: OrgNode) => OrgNode) => void;
  onRemoveChild: (id: string) => void;
}) {
  return (
    <li>
      <NodeCard
        node={node}
        isRoot={isRoot}
        onUpdate={(fn) => onUpdate(node.id, fn)}
        onRemove={() => onRemoveChild(node.id)}
        onAddChild={() =>
          onUpdate(node.id, (n) => ({
            ...n,
            children: [
              ...n.children,
              { id: uid(), title: "ตำแหน่งใหม่", people: [], children: [] },
            ],
          }))
        }
      />
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Branch
              key={c.id}
              node={c}
              isRoot={false}
              onUpdate={onUpdate}
              onRemoveChild={onRemoveChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function OrgChartPage() {
  const [root, setRoot] = useState<OrgNode>(loadOrgChart);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
    setSavedAt(Date.now());
  }, [root]);

  const updateById = (id: string, fn: (n: OrgNode) => OrgNode) =>
    setRoot((r) => mapNode(r, id, fn));

  const removeById = (id: string) => setRoot((r) => removeNode(r, id));

  const reset = () => {
    if (window.confirm("รีเซ็ตผังองค์กรกลับเป็นค่าเริ่มต้น? การแก้ไขทั้งหมดจะหายไป")) {
      setRoot(defaultOrgChart());
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--sp-3)",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "var(--sp-6)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--sp-2)",
              fontSize: "var(--fs-xs)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "var(--sp-2)",
            }}
          >
            <IconSitemap size={16} stroke={1.75} />
            โครงสร้างองค์กร
          </div>
          <h1 style={{ margin: 0, color: "var(--text-strong)" }}>Organization Chart</h1>
          <p style={{ margin: "var(--sp-2) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-sm)", maxWidth: "70ch" }}>
            ผังโครงสร้างฝ่ายจัดซื้อ (PU Department, GKE) — คลิกที่ชื่อหรือตำแหน่งเพื่อแก้ไขได้ทันที
            เพิ่ม/ลบคนหรือตำแหน่งได้เสมอ รองรับการ scale up หรือรวมสายงานในอนาคต
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          {savedAt && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>
              <IconDeviceFloppy size={14} stroke={1.75} /> บันทึกอัตโนมัติในเบราว์เซอร์นี้
            </span>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--text)",
              borderRadius: "var(--radius)",
              padding: "var(--sp-2) var(--sp-3)",
              fontSize: "var(--fs-xs)",
              cursor: "pointer",
            }}
          >
            <IconRotateClockwise2 size={14} stroke={1.75} />
            รีเซ็ตเป็นค่าเริ่มต้น
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-2)",
          marginBottom: "var(--sp-5)",
          padding: "var(--sp-3) var(--sp-4)",
          borderRadius: "var(--radius)",
          background: "color-mix(in srgb, var(--info) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)",
          color: "var(--text-muted)",
          fontSize: "var(--fs-xs)",
        }}
      >
        <IconPencil size={14} stroke={1.75} style={{ flexShrink: 0, color: "var(--info)" }} />
        ทุกช่องแก้ไขได้: คลิกชื่อ/ตำแหน่ง, กดปุ่มเล็กบนการ์ดเพื่อเพิ่มคน เพิ่มตำแหน่งว่าง หรือเพิ่มตำแหน่งใต้สังกัด
      </div>

      <div style={{ overflowX: "auto", paddingBottom: "var(--sp-5)" }}>
        <ul className="org-tree">
          <Branch node={root} isRoot onUpdate={updateById} onRemoveChild={removeById} />
        </ul>
      </div>
    </div>
  );
}
