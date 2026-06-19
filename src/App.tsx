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