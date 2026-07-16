import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Section, grid } from "./PageKit";
import {
  IconX, IconUpload, IconDownload, IconPencil, IconTrash, IconPlus, IconFile, IconSearch,
} from "@tabler/icons-react";

/* ============================================================
   Reusable file repository — upload / list / download / replace /
   delete files, backed by a Firestore collection + Storage folder
   (both named `collectionName`). Used on the ESG page for the ESG
   document library and the evaluation-template library.
   ============================================================ */

export interface VaultCategory {
  value: string;
  label: string;
}

interface VaultDoc {
  id: string;
  title: string;
  description: string;
  category: string;
  fileName: string;
  url: string;
}

const inputStyle: React.CSSProperties = {
  font: "inherit", fontSize: "var(--fs-sm)", color: "var(--text)", background: "var(--surface)",
  border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", padding: "8px 10px", width: "100%",
};

function VaultModal({
  categories, accept, item, onSave, onClose,
}: {
  categories: VaultCategory[];
  accept: string;
  item: VaultDoc | null;
  onSave: (data: { title: string; description: string; category: string }, file: File | null) => Promise<void>;
  onClose: () => void;
}) {
  const isNew = item === null;
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [category, setCategory] = useState(item?.category ?? categories[0]?.value ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || (isNew && !file)) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), description: description.trim(), category }, file);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // Portal to <body>: the modal is rendered inside a Section/Reveal that uses
  // CSS transform, which would otherwise scope position:fixed to that box (so
  // the overlay wouldn't cover the viewport and would overlap page content).
  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 320, padding: "var(--sp-4)" }}
    >
      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: "var(--sp-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
          <h3 style={{ margin: 0, color: "var(--text-strong)" }}>{isNew ? "เพิ่มไฟล์ใหม่" : "แก้ไขข้อมูลไฟล์"}</h3>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)" }}>
            <IconX size={20} stroke={1.75} />
          </button>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-3)" }}>
          ชื่อไฟล์
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-3)" }}>
          คำอธิบาย (ไม่บังคับ)
          <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {categories.length > 1 && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-3)" }}>
            หมวดหมู่
            <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "var(--sp-4)" }}>
          {isNew ? "เลือกไฟล์" : "แทนที่ไฟล์ (ไม่บังคับ — อัปโหลดเวอร์ชันใหม่)"}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <IconUpload size={16} stroke={1.75} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
            <input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }} />
          </div>
        </label>
        {error && (
          <div style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)", borderRadius: "var(--radius)", padding: "var(--sp-3)", marginBottom: "var(--sp-3)", fontSize: "var(--fs-xs)", wordBreak: "break-word" }}>
            บันทึกไม่สำเร็จ: {error}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)" }}>
          <button type="button" onClick={onClose} style={{ border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", cursor: "pointer" }}>
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={saving || !title.trim() || (isNew && !file)}
            onClick={handleSave}
            style={{ border: "none", background: "var(--primary)", color: "var(--primary-contrast)", borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving || !title.trim() || (isNew && !file) ? 0.6 : 1 }}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function FileVault({
  collectionName, eyebrow, title, intro, categories, accept = "*/*", color = "var(--accent)",
}: {
  collectionName: string;
  eyebrow: string;
  title: string;
  intro?: string;
  categories: VaultCategory[];
  accept?: string;
  color?: string;
}) {
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<VaultDoc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snap) => { setLoadError(null); setDocs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VaultDoc, "id">) }))); },
      (err) => setLoadError(err.message),
    );
    return unsub;
  }, [collectionName]);

  const catLabel = (v: string) => categories.find((c) => c.value === v)?.label ?? v;

  // Fail loudly instead of hanging forever: if Storage is unreachable or the
  // upload stalls (e.g. blocked by Storage rules / CORS), reject after 30s so
  // the modal shows an error rather than sitting on "กำลังบันทึก..." indefinitely.
  const withTimeout = <T,>(p: Promise<T>, ms = 30000): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("หมดเวลาอัปโหลด (30 วิ) — อาจติด Firebase Storage rules หรือเครือข่าย")), ms),
      ),
    ]);

  const upload = async (id: string, file: File) => {
    const fileRef = ref(storage, `${collectionName}/${id}-${file.name}`);
    await withTimeout(uploadBytes(fileRef, file));
    return getDownloadURL(fileRef);
  };

  const addNew = async (data: { title: string; description: string; category: string }, file: File | null) => {
    if (!file) return;
    const newRef = await addDoc(collection(db, collectionName), { ...data, url: "", fileName: file.name });
    try {
      const url = await upload(newRef.id, file);
      await updateDoc(newRef, { url });
    } catch (e) {
      // Upload failed — don't leave an orphan doc with no file behind.
      await deleteDoc(doc(db, collectionName, newRef.id)).catch(() => {});
      throw e;
    }
    setAdding(false);
  };

  const saveEdit = async (data: { title: string; description: string; category: string }, file: File | null) => {
    if (!editing) return;
    const update: Partial<VaultDoc> = { ...data };
    if (file) { update.url = await upload(editing.id, file); update.fileName = file.name; }
    await updateDoc(doc(db, collectionName, editing.id), update);
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!window.confirm("ยืนยันการลบไฟล์นี้?")) return;
    await deleteDoc(doc(db, collectionName, id));
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs
      .filter((d) => filter === "all" || d.category === filter)
      .filter((d) => !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || catLabel(d.category).toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, search, filter]);

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: "var(--radius-full)", fontSize: "var(--fs-xs)", fontWeight: 600,
    cursor: "pointer", border: "1px solid " + (active ? "transparent" : "var(--border-strong)"),
    background: active ? "var(--primary)" : "var(--surface)", color: active ? "var(--primary-contrast)" : "var(--text-muted)",
  });

  return (
    <Section
      eyebrow={eyebrow}
      title={title}
      intro={intro}
      right={
        <button onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", border: "none", background: "var(--primary)", color: "var(--primary-contrast)", borderRadius: "var(--radius)", padding: "8px 16px", fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer" }}>
          <IconPlus size={16} stroke={2} /> เพิ่มไฟล์
        </button>
      }
    >
      {loadError && (
        <div style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)", borderRadius: "var(--radius)", padding: "var(--sp-3)", marginBottom: "var(--sp-3)", fontSize: "var(--fs-xs)" }}>
          โหลดข้อมูลไม่สำเร็จ: {loadError}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", alignItems: "center", marginBottom: "var(--sp-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", flex: "1 1 220px", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", padding: "6px 10px" }}>
          <IconSearch size={16} stroke={1.75} style={{ color: "var(--text-faint)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาไฟล์..." style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: "var(--fs-sm)", color: "var(--text)", width: "100%" }} />
        </div>
        {categories.length > 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span style={chip(filter === "all")} onClick={() => setFilter("all")}>ทั้งหมด</span>
            {categories.map((c) => <span key={c.value} style={chip(filter === c.value)} onClick={() => setFilter(c.value)}>{c.label}</span>)}
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--fs-sm)", padding: "var(--sp-6)", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-lg)" }}>
          ยังไม่มีไฟล์ — กด “เพิ่มไฟล์” เพื่ออัปโหลด
        </div>
      ) : (
        <div style={grid(280)}>
          {shown.map((d) => (
            <div key={d.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--sp-2)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "var(--radius)", background: "color-mix(in srgb, " + color + " 16%, transparent)", color, flexShrink: 0 }}>
                  <IconFile size={22} stroke={1.75} />
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button type="button" title="แก้ไข / อัปโหลดใหม่" onClick={() => setEditing(d)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", padding: 4 }}>
                    <IconPencil size={16} stroke={1.75} />
                  </button>
                  <button type="button" title="ลบ" onClick={() => remove(d.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)", padding: 4 }}>
                    <IconTrash size={16} stroke={1.75} />
                  </button>
                </div>
              </div>
              {categories.length > 1 && (
                <span style={{ alignSelf: "flex-start", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color, background: "color-mix(in srgb, " + color + " 12%, transparent)", borderRadius: "var(--radius-full)", padding: "2px 10px" }}>
                  {catLabel(d.category)}
                </span>
              )}
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" title="เปิดดูไฟล์" style={{ fontWeight: 600, color: "var(--text-strong)", textDecoration: "none", cursor: "pointer" }}>{d.title}</a>
              ) : (
                <div style={{ fontWeight: 600, color: "var(--text-strong)" }}>{d.title}</div>
              )}
              {d.description && <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.6 }}>{d.description}</p>}
              <div style={{ marginTop: "auto", paddingTop: "var(--sp-2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-2)" }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.fileName}</span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0, color: "var(--primary)", fontSize: "var(--fs-sm)", fontWeight: 600, textDecoration: "none" }}>
                    <IconDownload size={16} stroke={1.75} /> ดาวน์โหลด
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && <VaultModal categories={categories} accept={accept} item={null} onSave={addNew} onClose={() => setAdding(false)} />}
      {editing && <VaultModal categories={categories} accept={accept} item={editing} onSave={saveEdit} onClose={() => setEditing(null)} />}
    </Section>
  );
}
