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
        background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)",
        color: "#fffdf8", padding: "var(--sp-8) var(--sp-6)", textAlign: "center"
      }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--fs-display)", fontWeight: "bold", letterSpacing: "4px", marginBottom: "var(--sp-2)" }}>GUNKUL</div>
        <div style={{ fontSize: "var(--fs-body)", fontStyle: "italic", opacity: 0.85, marginBottom: "var(--sp-5)" }}>not only the energy, we care</div>
        <div style={{ fontSize: "var(--fs-h3)", fontWeight: "500", opacity: 0.9 }}>ฝ่ายจัดซื้อ — Procurement Department</div>
      </div>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--sp-7) var(--sp-5)" }}>
        <section style={{ marginBottom: "var(--sp-8)" }}>
          <h2 style={{ borderBottom: "2px solid var(--primary)", paddingBottom: "var(--sp-2)", marginBottom: "var(--sp-5)" }}>📌 สารบัญ</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--sp-4)" }}>
            {[
              { icon: "📊", label: "Dashboard & KPI", page: "dashboard" as Page },
              { icon: "✏️", label: "Update งาน", page: "update" as Page },
              { icon: "📋", label: "Task List", page: "tasks" as Page },
              { icon: "👥", label: "Team & Profile", page: "team" as Page },
              { icon: "📚", label: "Knowledge Base", page: "knowledge" as Page },
            ].map(item => (
              <button key={item.page} onClick={() => setPage(item.page)} style={{
                background: "var(--surface)", border: "2px solid var(--primary)", borderRadius: "var(--radius-lg)",
                padding: "var(--sp-5) var(--sp-4)", cursor: "pointer", textAlign: "center",
                fontFamily: "var(--font-sans)", fontSize: "var(--fs-sm)", fontWeight: "600", color: "var(--primary)",
                boxShadow: "var(--shadow-sm)", transition: "background-color var(--transition), color var(--transition)"
              }}
                onMouseOver={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "var(--primary-contrast)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--primary)"; }}
              >
                <div style={{ fontSize: "32px", marginBottom: "var(--sp-2)" }}>{item.icon}</div>
                {item.label}
              </button>
            ))}
          </div>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-6)" }}>
          <section style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "var(--sp-6)", boxShadow: "var(--shadow-sm)" }}>
            <h2 style={{ marginTop: 0 }}>📋 หน้าที่และความรับผิดชอบ</h2>
            <ul style={{ color: "var(--text-muted)", lineHeight: "2", paddingLeft: "var(--sp-5)" }}>
              <li>จัดทำและดำเนินการ PR และ PO</li>
              <li>บริหารจัดการฐานข้อมูล Vendor</li>
              <li>ดำเนินกระบวนการ RFQ และ Price Approval</li>
              <li>ประสานงานในระบบ Microsoft Dynamics 365</li>
              <li>จัดทำเอกสารและ Work Instruction</li>
              <li>ติดตามและรายงาน KPI ของฝ่าย</li>
            </ul>
          </section>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
            <section style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "var(--sp-6)", boxShadow: "var(--shadow-sm)" }}>
              <h2 style={{ marginTop: 0 }}>📍 ที่ตั้งฝ่ายจัดซื้อ</h2>
              <p style={{ color: "var(--text-muted)", lineHeight: "1.8", margin: 0 }}>
                <strong>548 อาคาร วัน ซิตี้ เซ็นเตอร์ (โอซีซี)</strong><br />
                ชั้นที่ 44 ถนนเพลินจิต<br />แขวงลุมพินี เขตปทุมวัน<br />กรุงเทพมหานคร 10330
              </p>
            </section>
            <section style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "var(--sp-6)", boxShadow: "var(--shadow-sm)" }}>
              <h2 style={{ marginTop: 0 }}>🔗 ลิงก์ที่เกี่ยวข้อง</h2>
              <a href="https://www.gunkul.com" target="_blank" rel="noopener noreferrer" style={{
                display: "block", background: "var(--primary)", color: "var(--primary-contrast)",
                textDecoration: "none", padding: "var(--sp-3) var(--sp-5)", borderRadius: "var(--radius)",
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