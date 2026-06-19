import VendorPage from "./VendorPage";
import { useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "./firebase";
import DashboardPage from "./Dashboard";
import UpdatePage from "./UpdatePage";
import TaskPage from "./TaskPage";
import KnowledgePage from "./KnowledgePage";
import LoginPage from "./LoginPage";
import Sidebar from "./Sidebar";
import type { Page } from "./Sidebar";

type Role = "manager" | "employee";

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useState(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUser(user); setLoggedIn(true); }
      else { setCurrentUser(null); setLoggedIn(false); }
    });
  });

  if (!loggedIn) {
    return <LoginPage onLogin={(r) => { setRole(r); setLoggedIn(true); }} />;
  }

  const userLabel = `${currentUser?.email?.split("@")[0] ?? ""} (${role === "manager" ? "หัวหน้า" : "พนักงาน"})`;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        userLabel={userLabel}
        onLogout={() => setLoggedIn(false)}
      />
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {currentPage === "home" && <HomePage setPage={setCurrentPage} />}
        {currentPage === "dashboard" && <DashboardPage role={role} />}
        {currentPage === "update" && <UpdatePage />}
        {currentPage === "tasks" && <TaskPage />}
        {currentPage === "vendor" && <VendorPage />}
        {currentPage === "team" && <div style={{ padding: "40px" }}><h1>👥 หน้า Team</h1></div>}
        {currentPage === "knowledge" && <KnowledgePage />}
      </main>
    </div>
  );
}