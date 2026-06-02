import { useState } from "react";

type WorkType = "PO" | "PR" | "Vendor";

interface UpdateEntry {
  id: string;
  type: WorkType;
  amount: number;
  note: string;
  timestamp: string;
}

export default function UpdatePage() {
  const [type, setType] = useState<WorkType>("PO");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<UpdateEntry[]>([]);
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    if (!amount) return;
    const newEntry: UpdateEntry = {
      id: Date.now().toString(),
      type,
      amount: Number(amount),
      note,
      timestamp: new Date().toLocaleString("th-TH"),
    };
    setEntries([newEntry, ...entries]);
    setAmount("");
    setNote("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px", fontFamily: "sans-serif" }}>
      
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: 0, color: "#1a3c6e", fontSize: "26px" }}>✏️ Update งาน</h1>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: "14px" }}>บันทึกความคืบหน้าของงานพร้อม timestamp อัตโนมัติ</p>
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

        {/* จำนวน */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px" }}>
            จำนวนที่ทำไปแล้ว
          </label>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="เช่น 400"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "15px" }}
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

        {/* Submit */}
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
            {entries.map(entry => (
              <div key={entry.id} style={{
                padding: "16px", background: "#f8faff", borderRadius: "10px",
                border: "1px solid #e8eef8", display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <span style={{
                    background: "#1a3c6e", color: "white", padding: "3px 10px",
                    borderRadius: "999px", fontSize: "12px", fontWeight: "600", marginRight: "10px"
                  }}>
                    {entry.type}
                  </span>
                  <span style={{ fontWeight: "600", color: "#1a3c6e" }}>{entry.amount} รายการ</span>
                  {entry.note && <span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>— {entry.note}</span>}
                </div>
                <span style={{ color: "#888", fontSize: "12px" }}>{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}