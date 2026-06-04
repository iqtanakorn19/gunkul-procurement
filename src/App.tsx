import VendorPage from "./VendorPage";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import DashboardPage from "./Dashboard";
import UpdatePage from "./UpdatePage";
import TaskPage from "./TaskPage";

type Page = "home" | "dashboard" | "update" | "tasks" | "vendor" | "team" | "knowledge";
type Role = "manager" | "employee";

const mockUser = { name: "สมชาย", role: "employee" as Role };

function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // ตอนนี้ใช้ mock role ก่อน ทีหลังดึงจาก Firestore
      onLogin("employee");
    } catch (err: any) {
      setError("Email หรือ Password ไม่ถูกต้อง");
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", backgroundColor: "#f5f5f5"
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1a3c6e 0%, #2d6abf 100%)",
        padding: "40px", borderRadius: "20px 20px 0 0", textAlign: "center", width: "320px"
      }}>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "white", letterSpacing: "3px" }}>GUNKUL</div>
        <div style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.8)", marginTop: "4px" }}>
          not only the energy, we care
        </div>
      </div>

      <div style={{
        background: "white", padding: "32px", borderRadius: "0 0 20px 20px",
        width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
      }}>
        <h3 style={{ margin: "0 0 24px", color: "#1a3c6e", textAlign: "center" }}>เข้าสู่ระบบ</h3>
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ width: "100%", padding: "10px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
        />
        {error && <p style={{ color: "red", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>{error}</p>}
        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: "12px", backgroundColor: "#1a3c6e",
          color: "white", border: "none", borderRadius: "8px", cursor: "pointer",
          fontWeight: "600", fontSize: "15px", opacity: loading ? 0.7 : 1
        }}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </div>
    </div>
  );
}

function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg, #1a3c6e 0%, #2d6abf 100%)",
        color: "white", padding: "60px 40px", textAlign: "center"
      }}>
        <div style={{ fontSize: "48px", fontWeight: "bold", letterSpacing: "4px", marginBottom: "8px" }}>GUNKUL</div>
        <div style={{ fontSize: "16px", fontStyle: "italic", opacity: 0.85, marginBottom: "24px" }}>not only the energy, we care</div>
        <div style={{ fontSize: "20px", fontWeight: "500", opacity: 0.9 }}>ฝ่ายจัดซื้อ — Procurement Department</div>
      </div>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ color: "#1a3c6e", borderBottom: "2px solid #1a3c6e", paddingBottom: "8px", marginBottom: "24px" }}>📌 สารบัญ</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { icon: "📊", label: "Dashboard & KPI", page: "dashboard" as Page },
              { icon: "✏️", label: "Update งาน", page: "update" as Page },
              { icon: "📋", label: "Task List", page: "tasks" as Page },
              { icon: "👥", label: "Team & Profile", page: "team" as Page },
              { icon: "📚", label: "Knowledge Base", page: "knowledge" as Page },
            ].map(item => (
              <button key={item.page} onClick={() => setPage(item.page)} style={{
                background: "white", border: "2px solid #1a3c6e", borderRadius: "12px",
                padding: "24px 16px", cursor: "pointer", textAlign: "center",
                fontSize: "15px", fontWeight: "600", color: "#1a3c6e",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}
                onMouseOver={e => { e.currentTarget.style.background = "#1a3c6e"; e.currentTarget.style.color = "white"; }}
                onMouseOut={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#1a3c6e"; }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>{item.icon}</div>
                {item.label}
              </button>
            ))}
          </div>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          <section style={{ background: "white", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: "#1a3c6e", marginTop: 0 }}>📋 หน้าที่และความรับผิดชอบ</h2>
            <ul style={{ color: "#555", lineHeight: "2", paddingLeft: "20px" }}>
              <li>จัดทำและดำเนินการ PR และ PO</li>
              <li>บริหารจัดการฐานข้อมูล Vendor</li>
              <li>ดำเนินกระบวนการ RFQ และ Price Approval</li>
              <li>ประสานงานในระบบ Microsoft Dynamics 365</li>
              <li>จัดทำเอกสารและ Work Instruction</li>
              <li>ติดตามและรายงาน KPI ของฝ่าย</li>
            </ul>
          </section>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <section style={{ background: "white", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h2 style={{ color: "#1a3c6e", marginTop: 0 }}>📍 ที่ตั้งฝ่ายจัดซื้อ</h2>
              <p style={{ color: "#555", lineHeight: "1.8", margin: 0 }}>
                <strong>548 อาคาร วัน ซิตี้ เซ็นเตอร์ (โอซีซี)</strong><br />
                ชั้นที่ 44 ถนนเพลินจิต<br />แขวงลุมพินี เขตปทุมวัน<br />กรุงเทพมหานคร 10330
              </p>
            </section>
            <section style={{ background: "white", borderRadius: "12px", padding: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h2 style={{ color: "#1a3c6e", marginTop: 0 }}>🔗 ลิงก์ที่เกี่ยวข้อง</h2>
              <a href="https://www.gunkul.com" target="_blank" rel="noopener noreferrer" style={{
                display: "block", background: "#1a3c6e", color: "white",
                textDecoration: "none", padding: "12px 20px", borderRadius: "8px",
                textAlign: "center", fontWeight: "600"
              }}>🌐 Website หลัก Gunkul</a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>("employee");
  const [currentPage, setCurrentPage] = useState<Page>("home");

  if (!loggedIn) {
    return <LoginPage onLogin={(r) => { setRole(r); setLoggedIn(true); }} />;
  }

  const navItems = [
    { page: "home" as Page, label: "🏠 Home" },
    { page: "dashboard" as Page, label: "📊 Dashboard" },
    { page: "update" as Page, label: "✏️ Update" },
    { page: "tasks" as Page, label: "📋 Tasks" },
    { page: "vendor" as Page, label: "🏢 Vendor" },
    { page: "team" as Page, label: "👥 Team" },
    { page: "knowledge" as Page, label: "📚 Knowledge" },
  ];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <nav style={{ backgroundColor: "#1a3c6e", padding: "12px 24px", display: "flex", gap: "12px", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginRight: "16px" }}>
  <img src="/logo-default.svg" alt="Gunkul Logo" style={{ height: "32px", filter: "brightness(0) invert(1)" }} />
</div>
        {navItems.map(({ page, label }) => (
          <button key={page} onClick={() => setCurrentPage(page)} style={{
            background: currentPage === page ? "white" : "transparent",
            color: currentPage === page ? "#1a3c6e" : "white",
            border: "1px solid white", borderRadius: "4px",
            padding: "6px 12px", cursor: "pointer", fontSize: "13px"
          }}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "white", fontSize: "13px" }}>
          👤 {mockUser.name} ({role === "manager" ? "หัวหน้า" : "พนักงาน"})
        </span>
        <button onClick={() => setLoggedIn(false)} style={{
          background: "transparent", color: "white", border: "1px solid white",
          borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "13px"
        }}>
          ออกจากระบบ
        </button>
      </nav>

      <div>
        {currentPage === "home" && <HomePage setPage={setCurrentPage} />}
        {currentPage === "dashboard" && <DashboardPage role={role} />}
        {currentPage === "update" && <UpdatePage />}
        {currentPage === "tasks" && <TaskPage />}
        {currentPage === "vendor" && <VendorPage />}
        {currentPage === "team" && <div style={{ padding: "40px" }}><h1>👥 หน้า Team</h1></div>}
        {currentPage === "knowledge" && <div style={{ padding: "40px" }}><h1>📚 หน้า Knowledge Base</h1></div>}
      </div>
    </div>
  );
}