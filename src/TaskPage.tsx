import { useState } from "react";

type Status = "todo" | "inprogress" | "done";
type Priority = "low" | "medium" | "high";
type Category = "PO" | "PR" | "Vendor" | "Admin" | "Other";

interface Task {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  status: Status;
  priority: Priority;
  category: Category;
  note: string;
  createdAt: string;
}

const mockTasks: Task[] = [
  { id: "1", title: "เปิด PO Solar Farm นราธิวาส", assignee: "สมชาย", deadline: "2026-06-15", status: "inprogress", priority: "high", category: "PO", note: "รอ Approve จากหัวหน้า", createdAt: "2026-06-01" },
  { id: "2", title: "RFQ นั่งร้านญี่ปุ่น", assignee: "สมหญิง", deadline: "2026-06-20", status: "todo", priority: "medium", category: "PR", note: "", createdAt: "2026-06-02" },
  { id: "3", title: "Add Vendor บริษัท ABC", assignee: "วิชัย", deadline: "2026-06-10", status: "done", priority: "low", category: "Vendor", note: "เสร็จแล้ว", createdAt: "2026-05-28" },
  { id: "4", title: "Price Approval สายไฟ", assignee: "นภา", deadline: "2026-06-25", status: "todo", priority: "high", category: "PR", note: "รอเอกสารจาก Vendor", createdAt: "2026-06-03" },
  { id: "5", title: "จัดทำ WI-005", assignee: "สมชาย", deadline: "2026-07-01", status: "inprogress", priority: "medium", category: "Admin", note: "", createdAt: "2026-06-01" },
];

const members = ["ทั้งหมด", "สมชาย", "สมหญิง", "วิชัย", "นภา"];
const months = ["ทั้งหมด", "2026-05", "2026-06", "2026-07"];

const statusConfig = {
  todo: { label: "รอดำเนินการ", color: "#6b7280", bg: "#f3f4f6" },
  inprogress: { label: "กำลังดำเนินการ", color: "#d97706", bg: "#fef3c7" },
  done: { label: "เสร็จแล้ว", color: "#059669", bg: "#d1fae5" },
};

const priorityConfig = {
  low: { label: "ต่ำ", color: "#6b7280", bg: "#f3f4f6" },
  medium: { label: "กลาง", color: "#d97706", bg: "#fef3c7" },
  high: { label: "สูง", color: "#dc2626", bg: "#fee2e2" },
};

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: Task) => void;
}

function AddTaskModal({ onClose, onAdd }: AddTaskModalProps) {
  const [form, setForm] = useState({
    title: "", assignee: "สมชาย", deadline: "", status: "todo" as Status,
    priority: "medium" as Priority, category: "PO" as Category, note: ""
  });

  const handleSubmit = () => {
    if (!form.title || !form.deadline) return;
    onAdd({
      ...form, id: Date.now().toString(),
      createdAt: new Date().toISOString().split("T")[0]
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000060", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "480px", maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#1a3c6e" }}>➕ เพิ่ม Task ใหม่</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {[
          { label: "ชื่องาน *", key: "title", type: "text", placeholder: "เช่น เปิด PO Solar Farm" },
          { label: "Deadline *", key: "deadline", type: "date", placeholder: "" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }} />
          </div>
        ))}

        {[
          { label: "ผู้รับผิดชอบ", key: "assignee", options: ["สมชาย", "สมหญิง", "วิชัย", "นภา"] },
          { label: "สถานะ", key: "status", options: [["todo", "รอดำเนินการ"], ["inprogress", "กำลังดำเนินการ"], ["done", "เสร็จแล้ว"]] },
          { label: "Priority", key: "priority", options: [["low", "ต่ำ"], ["medium", "กลาง"], ["high", "สูง"]] },
          { label: "หมวดหมู่", key: "category", options: ["PO", "PR", "Vendor", "Admin", "Other"] },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>{f.label}</label>
            <select value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}>
              {f.options.map((o: any) => (
                <option key={Array.isArray(o) ? o[0] : o} value={Array.isArray(o) ? o[0] : o}>
                  {Array.isArray(o) ? o[1] : o}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" }}>หมายเหตุ</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2} placeholder="รายละเอียดเพิ่มเติม..."
            style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", resize: "vertical" }} />
        </div>

        <button onClick={handleSubmit} style={{
          width: "100%", padding: "12px", backgroundColor: "#1a3c6e", color: "white",
          border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "15px"
        }}>
          บันทึก Task
        </button>
      </div>
    </div>
  );
}

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filterAssignee, setFilterAssignee] = useState("ทั้งหมด");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [filterMonth, setFilterMonth] = useState("ทั้งหมด");
  const [filterPriority, setFilterPriority] = useState("ทั้งหมด");
  const [showModal, setShowModal] = useState(false);

  const filtered = tasks.filter(t => {
    if (filterAssignee !== "ทั้งหมด" && t.assignee !== filterAssignee) return false;
    if (filterStatus !== "ทั้งหมด" && t.status !== filterStatus) return false;
    if (filterMonth !== "ทั้งหมด" && !t.deadline.startsWith(filterMonth)) return false;
    if (filterPriority !== "ทั้งหมด" && t.priority !== filterPriority) return false;
    return true;
  });

  const counts = {
    todo: tasks.filter(t => t.status === "todo").length,
    inprogress: tasks.filter(t => t.status === "inprogress").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", fontFamily: "sans-serif" }}>

      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onAdd={t => setTasks([t, ...tasks])} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1a3c6e", fontSize: "26px" }}>📋 Task List</h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: "14px" }}>รายการงานทั้งหมดของทีม</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: "10px 20px", backgroundColor: "#1a3c6e", color: "white",
          border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px"
        }}>
          ➕ เพิ่ม Task
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "รอดำเนินการ", count: counts.todo, color: "#6b7280", bg: "#f3f4f6" },
          { label: "กำลังดำเนินการ", count: counts.inprogress, color: "#d97706", bg: "#fef3c7" },
          { label: "เสร็จแล้ว", count: counts.done, color: "#059669", bg: "#d1fae5" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${s.color}` }}>
            <p style={{ margin: "0 0 8px", color: "#888", fontSize: "13px" }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "ผู้รับผิดชอบ", value: filterAssignee, options: members, onChange: setFilterAssignee },
            { label: "สถานะ", value: filterStatus, options: ["ทั้งหมด", "todo", "inprogress", "done"], labels: ["ทั้งหมด", "รอดำเนินการ", "กำลังดำเนินการ", "เสร็จแล้ว"], onChange: setFilterStatus },
            { label: "เดือน", value: filterMonth, options: months, onChange: setFilterMonth },
            { label: "Priority", value: filterPriority, options: ["ทั้งหมด", "high", "medium", "low"], labels: ["ทั้งหมด", "สูง", "กลาง", "ต่ำ"], onChange: setFilterPriority },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#888" }}>{f.label}</label>
              <select value={f.value} onChange={e => f.onChange(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
                {f.options.map((o, i) => (
                  <option key={o} value={o}>{(f as any).labels ? (f as any).labels[i] : o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#888" }}>แสดง {filtered.length} จาก {tasks.length} รายการ</p>
      </div>

      {/* Task Table */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8faff", borderBottom: "1px solid #e8eef8" }}>
              {["ชื่องาน", "ผู้รับผิดชอบ", "หมวดหมู่", "Deadline", "Priority", "สถานะ", "หมายเหตุ"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#1a3c6e" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#888" }}>ไม่พบ Task ที่ตรงกับ Filter</td></tr>
            ) : (
              filtered.map((task, i) => (
                <tr key={task.id} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1a3c6e", fontSize: "14px" }}>{task.title}</td>
                  <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1a3c6e", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700" }}>
                        {task.assignee[0]}
                      </div>
                      {task.assignee}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "#e8eef8", color: "#1a3c6e", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600" }}>{task.category}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: new Date(task.deadline) < new Date() && task.status !== "done" ? "#dc2626" : "#555" }}>
                    {task.deadline}
                    {new Date(task.deadline) < new Date() && task.status !== "done" && <span style={{ marginLeft: "6px", fontSize: "11px" }}>⚠️ เกินกำหนด</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: priorityConfig[task.priority].bg, color: priorityConfig[task.priority].color, padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600" }}>
                      {priorityConfig[task.priority].label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: statusConfig[task.status].bg, color: statusConfig[task.status].color, padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600" }}>
                      {statusConfig[task.status].label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>{task.note || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}