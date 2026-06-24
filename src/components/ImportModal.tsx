import { useState } from "react";
import { importPurchaseOrders, parseProducts, type ImportResult } from "../data/procurement";

/**
 * Shared import dialog for the procurement data.
 * - PO file (All_Purchase orders) is required — merged by PO number.
 * - Products file (All_Products) is optional — only enriches item names.
 * - Start date optionally drops POs older than the chosen cut-off.
 */
export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [poFile, setPoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (!poFile) { setError("กรุณาเลือกไฟล์ All_Purchase orders ก่อน"); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      let productMap;
      if (productFile) {
        setStage("กำลังอ่านไฟล์สินค้า (All_Products)...");
        productMap = parseProducts(await productFile.arrayBuffer());
      }
      setStage("กำลังอ่านและรวมข้อมูล PO...");
      const poBuf = await poFile.arrayBuffer();
      setStage("กำลังคำนวณยอด Vendor และราคา Item ใหม่...");
      const res = await importPurchaseOrders(poBuf, startDate, productMap);
      setResult(res);
      setStage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("");
    } finally {
      setBusy(false);
    }
  };

  const fileRow = (
    label: string, hint: string, file: File | null,
    set: (f: File | null) => void,
  ) => (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "#1a3c6e" }}>{label}</p>
      <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#94a3b8" }}>{hint}</p>
      <input type="file" accept=".xlsx,.xls,.csv" disabled={busy}
        onChange={(e) => set(e.target.files?.[0] ?? null)}
        style={{ fontSize: "13px" }} />
      {file && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#0f766e", fontWeight: 700 }}>✓ {file.name}</span>}
    </div>
  );

  return (
    <div onClick={busy ? undefined : onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "20px", width: "520px", maxWidth: "94vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(26,60,110,0.3)" }}>
        <div style={{ background: "linear-gradient(135deg, #1a3c6e, #2d5a9e)", padding: "22px 26px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, color: "white", fontSize: "18px", fontWeight: 800 }}>📥 นำเข้าข้อมูลจัดซื้อ</h2>
          {!busy && <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "white", fontSize: "16px" }}>✕</button>}
        </div>

        <div style={{ padding: "24px 26px" }}>
          {!result && (
            <>
              {fileRow("ไฟล์ใบสั่งซื้อ (All_Purchase orders) *", "ระบบจะเพิ่มเฉพาะ PO ใหม่ — PO เดิมที่มีอยู่แล้วจะไม่ถูกแก้", poFile, setPoFile)}
              {fileRow("ไฟล์สินค้า (All_Products) — ไม่บังคับ", "ใช้เสริมชื่อสินค้าให้สวยขึ้นเท่านั้น", productFile, setProductFile)}
              <div style={{ marginBottom: "18px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "#1a3c6e" }}>วันเริ่มต้น (ไม่บังคับ)</p>
                <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#94a3b8" }}>ข้าม PO ที่เก่ากว่าวันนี้ เว้นว่างไว้ = นำเข้าทั้งหมด</p>
                <input type="date" value={startDate} disabled={busy}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "13px" }} />
              </div>

              {error && <p style={{ color: "#dc2626", fontSize: "13px", fontWeight: 700, margin: "0 0 12px" }}>⚠️ {error}</p>}
              {busy && <p style={{ color: "#1a3c6e", fontSize: "13px", fontWeight: 700, margin: "0 0 12px" }}>⏳ {stage}</p>}

              <button onClick={run} disabled={busy || !poFile}
                style={{ width: "100%", padding: "13px", background: busy || !poFile ? "#cbd5e1" : "linear-gradient(135deg, #1a3c6e, #2d5a9e)", border: "none", borderRadius: "12px", cursor: busy || !poFile ? "not-allowed" : "pointer", fontWeight: 700, color: "white", fontSize: "15px" }}>
                {busy ? "กำลังนำเข้า..." : "เริ่มนำเข้า"}
              </button>
            </>
          )}

          {result && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "18px" }}>
                <div style={{ fontSize: "48px" }}>✅</div>
                <h3 style={{ margin: "8px 0 0", color: "#0f766e", fontSize: "18px" }}>นำเข้าสำเร็จ</h3>
              </div>
              {[
                ["PO ใหม่ที่เพิ่ม", result.newPOs],
                ["บรรทัดใหม่ที่เพิ่ม", result.newLines],
                ["PO เดิม (ข้ามไป)", result.skippedExisting],
                ["ข้าม (เก่ากว่าวันเริ่ม)", result.skippedBeforeDate],
                ["ข้าม (ไม่มีเลข PO/Vendor)", result.skippedNoPO],
                ["Vendor ที่อัพเดท", result.vendorsUpserted],
                ["Item ที่อัพเดท", result.itemsUpserted],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>{label}</span>
                  <strong style={{ color: "#1a3c6e" }}>{(val as number).toLocaleString()}</strong>
                </div>
              ))}
              <button onClick={onClose} style={{ width: "100%", marginTop: "18px", padding: "12px", background: "linear-gradient(135deg, #1a3c6e, #2d5a9e)", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: 700, color: "white", fontSize: "14px" }}>
                เสร็จสิ้น
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
