import VendorPage from "./VendorPage";
import TrackingPage from "./TrackingPage";
import { useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "./firebase";
import DashboardPage from "./Dashboard";
import UpdatePage from "./UpdatePage";
import TaskPage from "./TaskPage";
import KnowledgePage from "./KnowledgePage";
import ESGPage from "./ESGPage";
import OrgChartPage from "./OrgChartPage";
import LoginPage from "./LoginPage";
import HomePage from "./HomePage";
import Sidebar from "./Sidebar";
import type { Page } from "./Sidebar";

type Role = "manager" | "employee";

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
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1 }}>
          {currentPage === "home" && <HomePage setPage={setCurrentPage} />}
          {currentPage === "dashboard" && <DashboardPage role={role} />}
          {currentPage === "update" && <UpdatePage />}
          {currentPage === "tasks" && <TaskPage />}
          {currentPage === "vendor" && <VendorPage />}
          {currentPage === "tracking" && <TrackingPage />}
          {currentPage === "team" && <OrgChartPage />}
          {currentPage === "knowledge" && <KnowledgePage />}
          {currentPage === "esg" && <ESGPage />}
        </div>
        <footer
          style={{
            textAlign: "center",
            padding: "var(--sp-4)",
            fontSize: "var(--fs-xs)",
            color: "var(--text-faint)",
            borderTop: "1px solid var(--border)",
          }}
        >
          © {new Date().getFullYear()} Gunkul Engineering Public Company Limited. All rights reserved.
        </footer>
      </main>
    </div>
  );
}