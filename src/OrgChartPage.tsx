import { useEffect, useRef, useState } from "react";
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
  IconZoomIn,
  IconZoomOut,
  IconFocus2,
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
  material?: string[];
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

const person = (name: string, vacant = false, material?: string[]): Person => ({
  id: uid(),
  name,
  vacant,
  material,
});

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
            people: [person("Cherry", false, ["Utility"])],
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
                    people: [
                      person("Jame", false, ["Farm"]),
                      person("Ploy", false, ["Farm"]),
                      person("Mos", false, ["Farm"]),
                      person("Nook", false, ["Farm"]),
                      person("Benz", false, ["Wind", "Transformer", "COP"]),
                    ],
                    children: [],
                  },
                  {
                    id: uid(),
                    title: "Purchasing Officer",
                    people: [person("Is", false, ["O&M", "IT"])],
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
            people: [person("Ruk", false, ["Residential", "C&I (Commercial and Industrial)"])],
            children: [
              {
                id: uid(),
                title: "Imp & Exp Supervisor",
                scope: "Imp & Exp, Shipping, GA, IT, Hemp",
                people: [person("Nok", false, ["Oversea"])],
                children: [
                  {
                    id: uid(),
                    title: "Purchasing Officer",
                    scope: "Oversea",
                    people: [person("Gam", false, ["Inverter", "PV Module", "General Affair"])],
                    children: [],
                  },
                  {
                    id: uid(),
                    title: "Shipping Officer",
                    people: [
                      person("Keng", false, ["Custom Broker", "เคลียร์ตู้ ท่าเรือ สนามบิน"]),
                      person("Nui", false, ["Custom Broker", "เคลียร์ตู้ ท่าเรือ สนามบิน"]),
                    ],
                    children: [],
                  },
                ],
              },
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
                people: [person("Arm", false, ["Inverter & Optimizer"])],
                children: [
                  {
                    id: uid(),
                    title: "Purchasing Engineer",
                    people: [
                      person("White", false, [
                        "DC Cable",
                        "Mounting (Roof, Float, Farm)",
                        "Floater & Pile",
                        "Rapid Shutdown",
                        "ลอผ้า",
                        "PQM",
                        "EDMI",
                        "CT & VT",
                        "Protection Relay",
                      ]),
                      person("Kae", false, [
                        "ACP & RTU",
                        "RMU, Switch Gear",
                        "AC Cable",
                        "Pyranometer",
                        "Module Temp",
                        "Wind Speed",
                        "Tank & Pump",
                        "SCADA Things (IPC, MiniPC, ADAM, Sim, Router & ETC.)",
                        "CCTV",
                      ]),
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
   Material / responsibility tags for each person
   ============================================================ */

function MaterialTags({
  material,
  onChange,
}: {
  material: string[];
  onChange: (m: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commitAdd = () => {
    const v = draft.trim();
    setDraft("");
    setAdding(false);
    if (v) onChange([...material, v]);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 30 }}>
      {material.map((m, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "1px 6px",
            fontSize: "10.5px",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          {m}
          <IconX
            size={10}
            stroke={2.25}
            style={{ cursor: "pointer", color: "var(--text-faint)" }}
            onClick={() => onChange(material.filter((_, j) => j !== i))}
          />
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitAdd();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="งาน/อุปกรณ์ที่ดูแล"
          style={{
            font: "inherit",
            fontSize: "10.5px",
            color: "var(--text)",
            background: "var(--surface)",
            border: "1px solid var(--primary)",
            borderRadius: "var(--radius-sm)",
            padding: "1px 6px",
            width: 120,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          title="เพิ่มงาน/อุปกรณ์ที่ดูแล"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            border: "1px dashed var(--border-strong)",
            background: "transparent",
            color: "var(--text-faint)",
            borderRadius: "var(--radius-sm)",
            padding: "1px 6px",
            fontSize: "10.5px",
            cursor: "pointer",
          }}
        >
          <IconPlus size={10} stroke={2} /> งาน
        </button>
      )}
    </div>
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
        border: `1.5px solid ${isRoot ? "var(--primary)" : "var(--border-strong)"}`,
        borderTop: `4px solid ${isRoot ? "var(--primary)" : "var(--accent)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow)",
        padding: "var(--sp-4)",
        minWidth: 240,
        maxWidth: 270,
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--sp-2)" }}>
        <div style={{ flex: 1 }}>
          <EditableText
            value={node.title}
            placeholder="ชื่อตำแหน่ง"
            onChange={(v) => onUpdate((n) => ({ ...n, title: v }))}
            style={{ fontWeight: 800, color: "var(--text-strong)", fontSize: "var(--fs-body)", lineHeight: 1.3 }}
          />
          <div style={{ marginTop: 3 }}>
            <EditableText
              value={node.scope ?? ""}
              placeholder="ขอบเขตงาน (ถ้ามี)"
              onChange={(v) => onUpdate((n) => ({ ...n, scope: v || undefined }))}
              style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 500 }}
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

      <div
        style={{
          height: 1,
          background: "var(--border)",
          margin: "var(--sp-3) 0",
        }}
      />

      {/* people chips */}
      {node.people.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
          {filled.map((p) => (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--primary)",
                  borderRadius: "var(--radius)",
                  padding: "5px 8px 5px 6px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--primary-contrast)",
                    color: "var(--primary)",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {(p.name.trim()[0] ?? "?").toUpperCase()}
                </span>
                <EditableText
                  value={p.name}
                  placeholder="ชื่อ"
                  onChange={(v) => updatePerson(p.id, (pp) => ({ ...pp, name: v }))}
                  style={{ flex: 1, fontSize: "var(--fs-sm)", color: "var(--primary-contrast)", fontWeight: 700 }}
                />
                <IconX
                  size={13}
                  stroke={2}
                  style={{ cursor: "pointer", color: "var(--primary-contrast)", opacity: 0.7, flexShrink: 0 }}
                  onClick={() => removePerson(p.id)}
                />
              </span>
              <MaterialTags
                material={p.material ?? []}
                onChange={(m) => updatePerson(p.id, (pp) => ({ ...pp, material: m }))}
              />
            </div>
          ))}
          {vacancies.map((p) => (
            <span
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "color-mix(in srgb, var(--danger) 14%, transparent)",
                border: "1.5px dashed color-mix(in srgb, var(--danger) 60%, transparent)",
                borderRadius: "var(--radius)",
                padding: "5px 8px",
              }}
            >
              <IconUserExclamation size={16} stroke={1.75} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: "var(--fs-sm)", color: "var(--danger)", fontWeight: 700 }}>
                ตำแหน่งว่าง
              </span>
              <IconX
                size={13}
                stroke={2}
                style={{ cursor: "pointer", color: "var(--danger)", flexShrink: 0 }}
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
          <IconUserExclamation size={13} stroke={1.75} /> ตำแหน่งว่าง
        </button>
        <button type="button" onClick={onAddChild} style={miniBtnStyle}>
          <IconPlus size={13} stroke={1.75} /> เพิ่มตำแหน่งการดูแล
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
   Pan & zoom viewport — click-drag to pan, scroll wheel to zoom,
   so the chart no longer relies on the page scrollbar to navigate.
   ============================================================ */

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;

function PanZoomCanvas({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dz = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + dz).toFixed(2))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const drag = dragState.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setPan({ x: drag.panX + dx, y: drag.panY + dy });
    };
    const onUp = () => {
      if (moved.current) {
        const suppressClick = (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
        };
        document.addEventListener("click", suppressClick, { capture: true, once: true });
      }
      dragState.current = null;
      setIsDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
    moved.current = false;
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
  };

  const zoomBy = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))));

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={viewportRef}
      onMouseDown={onMouseDown}
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-elevated)",
        height: "min(70vh, 760px)",
        minHeight: 420,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: isDragging ? "none" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: `translate(-50%, 0) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top center",
          padding: "var(--sp-6)",
          transition: isDragging ? "none" : "transform 0.05s linear",
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "var(--sp-3)",
          right: "var(--sp-3)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-full)",
          padding: 4,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <button type="button" onClick={() => zoomBy(-ZOOM_STEP)} title="ซูมออก" style={zoomBtnStyle}>
          <IconZoomOut size={16} stroke={1.75} />
        </button>
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", minWidth: 38, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" onClick={() => zoomBy(ZOOM_STEP)} title="ซูมเข้า" style={zoomBtnStyle}>
          <IconZoomIn size={16} stroke={1.75} />
        </button>
        <button type="button" onClick={resetView} title="รีเซ็ตมุมมอง" style={zoomBtnStyle}>
          <IconFocus2 size={16} stroke={1.75} />
        </button>
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  borderRadius: "var(--radius-full)",
  cursor: "pointer",
};

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
        ทุกช่องแก้ไขได้: คลิกชื่อ/ตำแหน่ง, กดปุ่มเล็กบนการ์ดเพื่อเพิ่มคน ตำแหน่งว่าง หรือเพิ่มตำแหน่งการดูแล
      </div>

      <PanZoomCanvas>
        <ul className="org-tree">
          <Branch node={root} isRoot onUpdate={updateById} onRemoveChild={removeById} />
        </ul>
      </PanZoomCanvas>
    </div>
  );
}
