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

type Lang = "en" | "th";

function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [showForgot, setShowForgot] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const t = {
    en: {
      title: "PROCUREMENT",
      signin: "Sign In",
      signup: "Create Account",
      switchToSignUp: "Don't have an account? Sign up",
      switchToSignIn: "Already have an account? Sign in",
      email: "Email Address",
      password: "Password",
      confirmPassword: "Confirm Password",
      button: "Sign In",
      signUpButton: "Create Account",
      loading: "Please wait...",
      error_invalid: "Invalid email or password",
      error_domain: "Only @gunkul.com emails are allowed",
      error_password_match: "Passwords do not match",
      error_password_length: "Password must be at least 6 characters",
      forgot: "Forgot password?",
      forgotTitle: "Reset Password",
      forgotDesc: "Enter your email and we'll send you a reset link.",
      forgotButton: "Send Reset Link",
      forgotSent: "Reset link sent! Please check your email.",
      back: "← Back to Sign In",
      signUpSuccess: "Account created! You can now sign in.",
    },
    th: {
      title: "ฝ่ายจัดซื้อ",
      signin: "เข้าสู่ระบบ",
      signup: "สร้างบัญชีใหม่",
      switchToSignUp: "ยังไม่มีบัญชี? สมัครสมาชิก",
      switchToSignIn: "มีบัญชีแล้ว? เข้าสู่ระบบ",
      email: "อีเมล",
      password: "รหัสผ่าน",
      confirmPassword: "ยืนยันรหัสผ่าน",
      button: "เข้าสู่ระบบ",
      signUpButton: "สร้างบัญชี",
      loading: "กรุณารอสักครู่...",
      error_invalid: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      error_domain: "อนุญาตเฉพาะอีเมล @gunkul.com เท่านั้น",
      error_password_match: "รหัสผ่านไม่ตรงกัน",
      error_password_length: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      forgot: "ลืมรหัสผ่าน?",
      forgotTitle: "รีเซ็ตรหัสผ่าน",
      forgotDesc: "กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตให้",
      forgotButton: "ส่งลิงก์รีเซ็ต",
      forgotSent: "ส่งลิงก์แล้ว! กรุณาตรวจสอบอีเมลของคุณ",
      back: "← กลับไปเข้าสู่ระบบ",
      signUpSuccess: "สร้างบัญชีสำเร็จ! กรุณาเข้าสู่ระบบ",
    }
  }[lang];

  const validateDomain = (e: string) => e.endsWith("@gunkul.com");

  const handleLogin = async () => {
    setError("");
    if (!validateDomain(email)) { setError(t.error_domain); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin("employee");
    } catch {
      setError(t.error_invalid);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setError("");
    if (!validateDomain(email)) { setError(t.error_domain); return; }
    if (password.length < 6) { setError(t.error_password_length); return; }
    if (password !== confirmPassword) { setError(t.error_password_match); return; }
    setLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      await createUserWithEmailAndPassword(auth, email, password);
      setSignUpSuccess(true);
      setShowSignUp(false);
      setEmail(""); setPassword(""); setConfirmPassword("");
    } catch {
      setError(t.error_invalid);
    }
    setLoading(false);
  };

  const handleForgot = () => {
    if (!forgotEmail) return;
    setForgotSent(true);
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1.5px solid #e0e0e0", boxSizing: "border-box" as const,
    fontSize: "14px", outline: "none", background: "#fafafa"
  };

  const buttonPrimary = {
    width: "100%", padding: "14px", backgroundColor: "#1a3c6e", color: "white",
    border: "none", borderRadius: "10px", cursor: "pointer",
    fontWeight: "700" as const, fontSize: "15px", letterSpacing: "0.03em"
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundImage: "url('/bg-financial.webp')",
      backgroundSize: "cover", backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      fontFamily: "sans-serif",
      overflow: "hidden"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet" />

      <div style={{ position: "absolute", inset: 0, background: "rgba(8, 20, 45, 0.62)" }} />

      {/* Language Toggle */}
      <div style={{ position: "absolute", top: "20px", right: "24px", zIndex: 10, display: "flex", gap: "8px" }}>
        {(["en", "th"] as Lang[]).map(l => (
          <button key={l} onClick={() => setLang(l)} style={{
            padding: "6px 16px", borderRadius: "999px", cursor: "pointer",
            fontWeight: "600", fontSize: "13px", letterSpacing: "0.05em",
            background: lang === l ? "white" : "rgba(255,255,255,0.15)",
            color: lang === l ? "#1a3c6e" : "white",
            border: lang === l ? "none" : "1px solid rgba(255,255,255,0.35)",
          }}>
            {l === "en" ? "EN" : "TH"}
          </button>
        ))}
      </div>

      {/* Card */}
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "420px", margin: "0 16px" }}>

        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: "48px", width: "100%" }}>
        <img src="/logo-default.svg" alt="Gunkul Logo"
            style={{ height: "144px", width: "auto", filter: "brightness(0) invert(1)", display: "block", margin: "-40px auto 48px auto", transform: "translateX(-10%)" }} />
          <h1 style={{
            margin: 0, color: "white", fontWeight: "700",
            letterSpacing: lang === "en" ? "0.3em" : "0.05em",
            fontSize: lang === "en" ? "26px" : "34px",
            fontFamily: lang === "en" ? "'Cormorant Garamond', serif" : "'Sarabun', sans-serif",
            textTransform: lang === "en" ? "uppercase" : "none",
            textShadow: "0 2px 16px rgba(0,0,0,0.4)"
          }}>
            {t.title}
          </h1>
        </div>

        {/* Form Card */}
        <div style={{
          background: "rgba(255,255,255,0.97)", borderRadius: "20px",
          padding: "36px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.35)"
        }}>

          {signUpSuccess && (
            <div style={{ background: "#d1fae5", color: "#065f46", padding: "12px", borderRadius: "8px", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>
              ✅ {t.signUpSuccess}
            </div>
          )}

          {!showForgot ? (
            <>
              <h2 style={{ margin: "0 0 24px", color: "#1a3c6e", fontSize: "18px", textAlign: "center", fontWeight: "700" }}>
                {showSignUp ? t.signup : t.signin}
              </h2>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#444" }}>{t.email}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@gunkul.com" style={inputStyle}
                  onKeyDown={e => !showSignUp && e.key === "Enter" && handleLogin()} />
              </div>

              <div style={{ marginBottom: showSignUp ? "16px" : "8px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#444" }}>{t.password}</label>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: "44px" }}
                    onKeyDown={e => !showSignUp && e.key === "Enter" && handleLogin()} />
                  <button onClick={() => setShowPassword(!showPassword)} style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#888"
                  }}>{showPassword ? "🙈" : "👁️"}</button>
                </div>
              </div>

              {showSignUp && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#444" }}>{t.confirmPassword}</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" style={inputStyle} />
                </div>
              )}

              {!showSignUp && (
                <div style={{ textAlign: "right", marginBottom: "20px" }}>
                  <button onClick={() => setShowForgot(true)} style={{
                    background: "none", border: "none", color: "#2d6abf", fontSize: "13px", cursor: "pointer", fontWeight: "600"
                  }}>{t.forgot}</button>
                </div>
              )}

              {error && (
                <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px", textAlign: "center" }}>
                  ⚠️ {error}
                </div>
              )}

              <button onClick={showSignUp ? handleSignUp : handleLogin} disabled={loading} style={{ ...buttonPrimary, opacity: loading ? 0.7 : 1, marginBottom: "12px" }}>
                {loading ? t.loading : showSignUp ? t.signUpButton : t.button}
              </button>

              <button onClick={() => { setShowSignUp(!showSignUp); setError(""); setPassword(""); setConfirmPassword(""); }} style={{
                width: "100%", padding: "11px", background: "none", border: "none",
                color: "#2d6abf", cursor: "pointer", fontSize: "13px", fontWeight: "600"
              }}>
                {showSignUp ? t.switchToSignIn : t.switchToSignUp}
              </button>
            </>
          ) : (
            <>
              <h2 style={{ margin: "0 0 8px", color: "#1a3c6e", fontSize: "18px", textAlign: "center", fontWeight: "700" }}>{t.forgotTitle}</h2>
              <p style={{ margin: "0 0 24px", color: "#888", fontSize: "13px", textAlign: "center", lineHeight: "1.6" }}>{t.forgotDesc}</p>
              {!forgotSent ? (
                <>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#444" }}>{t.email}</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="name@gunkul.com" style={inputStyle} />
                  </div>
                  <button onClick={handleForgot} style={{ ...buttonPrimary, marginBottom: "12px" }}>{t.forgotButton}</button>
                </>
              ) : (
                <div style={{ background: "#d1fae5", color: "#065f46", padding: "16px", borderRadius: "10px", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>
                  ✅ {t.forgotSent}
                </div>
              )}
              <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} style={{
                width: "100%", padding: "12px", background: "#f5f5f5", border: "none",
                borderRadius: "10px", cursor: "pointer", color: "#555", fontWeight: "600", fontSize: "13px"
              }}>{t.back}</button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "12px", marginTop: "24px" }}>
          © 2026 Gunkul Engineering — Procurement Department
        </p>
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