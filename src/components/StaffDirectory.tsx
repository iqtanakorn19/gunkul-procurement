import { useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { IconCopy, IconCopyCheck, IconPlus, IconSearch, IconTrash, IconUsers } from "@tabler/icons-react";

/* ============================================================
   Editable, searchable staff directory — sits below the org chart
   canvas so it doesn't interfere with chart drag/zoom. Each row is
   its own Firestore doc (not one big array) so two people editing
   different rows at once never clobber each other. Cells are plain
   <input>s edited directly; changes are debounced per-row before
   writing, mirroring the org chart's own save-debounce pattern above.
   One-time seed from the PU-GKE roster Excel, only when the
   collection is empty, so it never overwrites real edits.
   ============================================================ */

interface StaffRow {
  id: string;
  employeeId: string;
  nameThai: string;
  nameEn: string;
  position: string;
  phone: string;
  email: string;
  notes: string;
  order: number;
}

const SEED: Omit<StaffRow, "id" | "order">[] = [
  { employeeId: "641201-01G", nameThai: "นายนันทวัฒน์ ธนานิจกุล", nameEn: "Nantawat Thananijiakul", position: "ผู้ช่วยผู้อำนวยการ สายงานโลจิสติกส์", phone: "-", email: "nantawat.tha@gunkul.com", notes: "" },
  { employeeId: "651025-01G", nameThai: "น.ส.สุวรรณี แปลงศรี", nameEn: "Suwannee Plaengsri", position: "ผู้จัดการแผนกจัดซื้อ", phone: "087-888-8575", email: "Suwannee.pla@gunkul.com", notes: "" },
  { employeeId: "441106G", nameThai: "นางณัฐนันท์ พนานุรักษา", nameEn: "Nathanun Pananuraksa", position: "หัวหน้าแผนกจัดซื้อใน - ต่างประเทศ", phone: "086-378-7352", email: "nathanun_gke@gunkul.com", notes: "" },
  { employeeId: "620611-04G", nameThai: "นายปัณณวัชร์ ไชยสิทธิ์ปัญญา", nameEn: "Pannawat Chaisitpanya", position: "หัวหน้าแผนกจัดซื้อ", phone: "065-998-4227", email: "pannawat.cha@gunkul.com", notes: "" },
  { employeeId: "600807-06G", nameThai: "น.ส.ทัศนีย์ สิงห์ดี", nameEn: "Thasanee Singdee", position: "เจ้าหน้าที่จัดซื้อ", phone: "083-112-5897", email: "thasanee.sin@gunkul.com", notes: "" },
  { employeeId: "500801M", nameThai: "นายประพนธ์ ปานกลิ่นพุฒ", nameEn: "Prapon Prankinput", position: "ชิปปิ้ง", phone: "090-090-9689", email: "Shipping.gke@gunkul.com", notes: "" },
  { employeeId: "550402-02G", nameThai: "นายสุธี ฤทธิรงค์", nameEn: "Suthee Rittirong", position: "ชิปปิ้ง", phone: "090-090-9688", email: "Suthee.rit@gunkul.co.th", notes: "" },
  { employeeId: "680602-05G", nameThai: "นาย โฆษิต ฟุกล่อย", nameEn: "Kosit Fukloy", position: "วิศวกรจัดซื้อ", phone: "084-228-5298", email: "kosit.fuk@gunkul.com", notes: "" },
  { employeeId: "681215-03G", nameThai: "นาย ธนาธิป วงศ์ศิริเลิศชน", nameEn: "Thanathip Wongsirilertchon", position: "ผู้จัดการแผนกจัดซื้อ", phone: "089-504-0311", email: "thanathip.won@gunkul.com", notes: "" },
  { employeeId: "690119-09G", nameThai: "นางสาวพัสตราภรณ์ อิสสะอาด", nameEn: "Pastraporn Is-sa-ard", position: "วิศวกรจัดซื้อ", phone: "099-614-9094", email: "pastraporn.iss@gunkul.com", notes: "" },
  { employeeId: "690302-08G", nameThai: "นางสาวเกศกนก อุ่นเรือน", nameEn: "Kedkanok Aonraen", position: "วิศวกรจัดซื้อ", phone: "065-998-4228", email: "kedkanok.aon@gunkul.com", notes: "" },
  { employeeId: "690504-29G", nameThai: "นายพงศกร สัตยาวัฒนากุล", nameEn: "Pongsagone Satayawattanagul", position: "วิศวกรจัดซื้อ", phone: "096-142-5300", email: "Pongsagone.sat@gunkul.com", notes: "" },
  { employeeId: "690504-09G", nameThai: "นายธนกฤต คำไล้", nameEn: "Thanakrit Khamlai", position: "วิศวกรจัดซื้อ", phone: "063-889-7454", email: "thanakrit.kha@gunkul.com", notes: "" },
  { employeeId: "690504-12G", nameThai: "วัลวิสาข์ อินมั่น", nameEn: "Wanvisa Inman", position: "วิศวกรจัดซื้อ", phone: "061-775-2292", email: "wanvisa.inm@gunkul.com", notes: "" },
];

const COLLECTION = "staffDirectory";

const cellInputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid transparent", background: "transparent", font: "inherit",
  fontSize: "var(--fs-sm)", color: "var(--text)", padding: "6px 8px", borderRadius: "var(--radius-sm)",
};

export default function StaffDirectory() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const seeded = useRef(false);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        setLoadError(null);
        if (snap.empty && !seeded.current) {
          seeded.current = true;
          SEED.forEach((s, i) => setDoc(doc(collection(db, COLLECTION)), { ...s, order: i }));
          return;
        }
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffRow, "id">) }));
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setRows(list);
      },
      (err) => setLoadError(err.message),
    );
    return unsub;
  }, []);

  const scheduleSave = (id: string, patch: Partial<StaffRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const timers = saveTimers.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        setDoc(doc(db, COLLECTION, id), patch, { merge: true });
      }, 500),
    );
  };

  const addRow = () => {
    const order = rows.length ? Math.max(...rows.map((r) => r.order ?? 0)) + 1 : 0;
    const empty = { employeeId: "", nameThai: "", nameEn: "", position: "", phone: "", email: "", notes: "", order };
    setDoc(doc(collection(db, COLLECTION)), empty);
  };

  const removeRow = async (id: string) => {
    if (!window.confirm("ยืนยันการลบพนักงานคนนี้ออกจากทำเนียบ?")) return;
    await deleteDoc(doc(db, COLLECTION, id));
  };

  const copyEmail = async (row: StaffRow) => {
    if (!row.email) return;
    try {
      await navigator.clipboard.writeText(row.email);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 1500);
    } catch { /* clipboard unavailable — silently ignore */ }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.employeeId, r.nameThai, r.nameEn, r.position, r.phone, r.email, r.notes]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const columns: { key: keyof StaffRow; label: string; width?: string }[] = [
    { key: "employeeId", label: "รหัสพนักงาน", width: "120px" },
    { key: "nameThai", label: "ชื่อ-สกุล", width: "200px" },
    { key: "nameEn", label: "Name-Surname", width: "200px" },
    { key: "position", label: "ตำแหน่ง", width: "220px" },
    { key: "phone", label: "เบอร์โทร", width: "130px" },
    { key: "notes", label: "Notes", width: "160px" },
  ];

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--sp-5)", marginTop: "var(--sp-6)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-4)" }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: "1rem", color: "var(--text-strong)" }}>
          <IconUsers size={18} stroke={1.75} /> ทำเนียบพนักงานฝ่ายจัดซื้อ (PU-GKE)
        </h3>
        <button
          type="button"
          onClick={addRow}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", border: "none", background: "var(--primary)", color: "var(--primary-contrast)", borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer" }}
        >
          <IconPlus size={16} stroke={2} /> เพิ่มพนักงาน
        </button>
      </div>

      {loadError && (
        <div style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)", borderRadius: "var(--radius)", padding: "var(--sp-3)", marginBottom: "var(--sp-3)", fontSize: "var(--fs-xs)" }}>
          โหลดข้อมูลไม่สำเร็จ: {loadError}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)", background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "6px 10px", maxWidth: "320px" }}>
        <IconSearch size={16} stroke={1.75} style={{ color: "var(--text-faint)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, ตำแหน่ง, อีเมล..."
          style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: "var(--fs-sm)", color: "var(--text)", width: "100%" }}
        />
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", textAlign: "left", color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>
              {columns.map((c) => (
                <th key={c.key} style={{ padding: "10px 12px", fontWeight: 700, width: c.width }}>{c.label}</th>
              ))}
              <th style={{ padding: "10px 12px", fontWeight: 700 }}>E-mail</th>
              <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} style={{ padding: "var(--sp-5)", textAlign: "center", color: "var(--text-muted)" }}>
                  ไม่พบพนักงานที่ค้นหา
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: "2px 4px" }}>
                      <input
                        value={r[c.key] as string}
                        onChange={(e) => scheduleSave(r.id, { [c.key]: e.target.value })}
                        style={cellInputStyle}
                      />
                    </td>
                  ))}
                  <td style={{ padding: "2px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        value={r.email}
                        onChange={(e) => scheduleSave(r.id, { email: e.target.value })}
                        style={{ ...cellInputStyle, minWidth: "180px" }}
                      />
                      <button
                        type="button"
                        title="คัดลอกอีเมล"
                        onClick={() => copyEmail(r)}
                        disabled={!r.email}
                        style={{ border: "none", background: "transparent", cursor: r.email ? "pointer" : "default", color: copiedId === r.id ? "var(--success)" : "var(--text-faint)", padding: 6, flexShrink: 0, opacity: r.email ? 1 : 0.4 }}
                      >
                        {copiedId === r.id ? <IconCopyCheck size={16} stroke={1.75} /> : <IconCopy size={16} stroke={1.75} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "2px 4px", textAlign: "right" }}>
                    <button
                      type="button"
                      title="ลบ"
                      onClick={() => removeRow(r.id)}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", padding: 6 }}
                    >
                      <IconTrash size={16} stroke={1.75} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
