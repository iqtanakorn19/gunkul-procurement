import { useState } from "react";

type WorkType = "PO" | "PR" | "Vendor";

interface UpdateEntry {
  id: string;
  type: WorkType;
  fileName: string;
  note: string;
  timestamp: string;
}

export default function UpdatePage() {
  const [type, setType] = useState<WorkType>("PO");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<UpdateEntry[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const counts = {
    PO: entries.filter(e => e.type === "PO").length,
    PR: entries.filter(e => e.type === "PR").length,
    Vendor: entries.filter(e => e.type === "Vendor").length,
  };

  const handleSubmit = () => {
    if (!file) {
      setError("กรุณาแนบไฟล์ก่อนบันทึก");
      return;
    }
    setError("");
    const newEntry: UpdateEntry = {
      id: Date.now().toString(),
      type,
      fileName: file.name,
      note,
      timestamp: new Date().toLocaleString("th-TH"),
    };
    setEntries([newEntry, ...entries]);
    setFile(null);
    setNote("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: 0, color: "#1a3c6e", fontSize: "26px" }}>✏️ Update งาน</h1>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: "14px" }}>แนบไฟล์หลักฐาน 1 ไฟล์ = 1 งาน พร้อม timestamp อัตโนมัติ</p>
      </div>

      {/* Count Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {(["PO", "PR", "Vendor"] as WorkType[]).map(t => (
          <div key={t} style={{
            background: "white", borderRadius: "12px", padding: "20px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)", textAlign: "center",
            borderTop: `4px solid ${t === "PO" ? "#1a3c6e" : t === "PR" ? "#2d6abf" : "#0ea5e9"}`
          }}>
            <p style={{ margin: "0 0 8px", color: "#888", fontSize: "13px" }}>{t} ที่บันทึกแล้ว</p>
            <p style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: t === "PO" ? "#1a3c6e" : t === "PR" ? "#2d6abf" : "#0ea5e9" }}>
              {counts[t]}
            </p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ background: "white", borderRadius: "16px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 20px", color: "#1a3c6e" }}>📝 บันทึกงานใหม่</h3>

        {/* ประเภทงาน */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px" }}>ประเภทงาน</label>
          <div style={{ display: "flex", gap: "12px" }}>
            {(["PO", "PR", "Vendor"] as WorkType[]).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: "8px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "600",
                border: type === t ? "none" : "1px solid #ddd",
                background: type === t ? "#1a3c6e" : "white",
                color: type === t ? "white" : "#555",
              }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* แนบไฟล์ */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px" }}>
            แนบไฟล์หลักฐาน <span style={{ color: "red" }}>*</span>
          </label>
          <div style={{
            border: "2px dashed #ddd", borderRadius: "10px", padding: "24px",
            textAlign: "center", background: file ? "#f0fdf4" : "#fafafa",
            cursor: "pointer"
          }}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            {file ? (
              <div>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                <p style={{ margin: 0, fontWeight: "600", color: "#1a3c6e" }}>{file.name}</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📎</div>
                <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>คลิกเพื่อเลือกไฟล์</p>
                <p style={{ margin: "4px 0 0", color: "#bbb", fontSize: "12px" }}>รองรับทุกประเภทไฟล์</p>
              </div>
            )}
          </div>
          <input
            id="fileInput" type="file" style={{ display: "none" }}
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* หมายเหตุ */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px" }}>
            หมายเหตุ (ถ้ามี)
          </label>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม..."
            rows={3}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "15px", resize: "vertical" }}
          />
        </div>

        {error && <p style={{ color: "red", fontSize: "13px", marginBottom: "12px" }}>⚠️ {error}</p>}
        {success && (
          <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 16px", borderRadius: "8px", marginBottom: "12px", fontSize: "14px" }}>
            ✅ บันทึกสำเร็จแล้ว!
          </div>
        )}

        <button onClick={handleSubmit} style={{
          width: "100%", padding: "12px", backgroundColor: "#1a3c6e",
          color: "white", border: "none", borderRadius: "8px",
          cursor: "pointer", fontWeight: "600", fontSize: "15px"
        }}>
          บันทึก
        </button>
      </div>

      {/* History */}
      {entries.length > 0 && (
        <div style={{ background: "white", borderRadius: "16px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 20px", color: "#1a3c6e" }}>🕐 ประวัติการ Update</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {entries.map((entry, index) => (
              <div key={entry.id} style={{
                padding: "16px", background: "#f8faff", borderRadius: "10px",
                border: "1px solid #e8eef8", display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: "#888", fontSize: "13px", fontWeight: "600" }}>#{entries.length - index}</span>
                  <span style={{
                    background: entry.type === "PO" ? "#1a3c6e" : entry.type === "PR" ? "#2d6abf" : "#0ea5e9",
                    color: "white", padding: "3px 10px",
                    borderRadius: "999px", fontSize: "12px", fontWeight: "600"
                  }}>
                    {entry.type}
                  </span>
                  <span style={{ color: "#555", fontSize: "14px" }}>📄 {entry.fileName}</span>
                  {entry.note && <span style={{ color: "#888", fontSize: "13px" }}>— {entry.note}</span>}
                </div>
                <span style={{ color: "#888", fontSize: "12px", whiteSpace: "nowrap" }}>{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}