import { useState } from 'react';
import DashboardPage from './Dashboard';

type Page = 'home' | 'dashboard' | 'update' | 'tasks' | 'team' | 'knowledge';
type Role = 'manager' | 'employee';

const mockUser = { name: 'สมชาย', role: 'employee' as Role };

const mockKPI = [
  {
    name: 'สมชาย',
    role: 'employee',
    po: 400,
    poTarget: 1000,
    pr: 25,
    prTarget: 50,
  },
  {
    name: 'สมหญิง',
    role: 'employee',
    po: 600,
    poTarget: 1000,
    pr: 40,
    prTarget: 50,
  },
  {
    name: 'วิชัย',
    role: 'employee',
    po: 200,
    poTarget: 1000,
    pr: 15,
    prTarget: 50,
  },
  { name: 'นภา', role: 'manager', po: 0, poTarget: 0, pr: 0, prTarget: 0 },
];

const budgetData = { actual: 60, plan: 100, unit: 'ล้านบาท' };

function ProgressBar({
  value,
  max,
  color = '#1a3c6e',
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div
      style={{
        background: '#eee',
        borderRadius: '999px',
        height: '10px',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: '999px',
          transition: 'width 0.5s',
        }}
      />
    </div>
  );
}

function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a3c6e 0%, #2d6abf 100%)',
          color: 'white',
          padding: '60px 40px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            letterSpacing: '4px',
            marginBottom: '8px',
          }}
        >
          GUNKUL
        </div>
        <div
          style={{
            fontSize: '16px',
            fontStyle: 'italic',
            opacity: 0.85,
            marginBottom: '24px',
          }}
        >
          not only the energy, we care
        </div>
        <div style={{ fontSize: '20px', fontWeight: '500', opacity: 0.9 }}>
          ฝ่ายจัดซื้อ — Procurement Department
        </div>
      </div>

      <div
        style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}
      >
        <section style={{ marginBottom: '48px' }}>
          <h2
            style={{
              color: '#1a3c6e',
              borderBottom: '2px solid #1a3c6e',
              paddingBottom: '8px',
              marginBottom: '24px',
            }}
          >
            📌 สารบัญ
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {[
              {
                icon: '📊',
                label: 'Dashboard & KPI',
                page: 'dashboard' as Page,
              },
              { icon: '✏️', label: 'Update งาน', page: 'update' as Page },
              { icon: '📋', label: 'Task List', page: 'tasks' as Page },
              { icon: '👥', label: 'Team & Profile', page: 'team' as Page },
              {
                icon: '📚',
                label: 'Knowledge Base',
                page: 'knowledge' as Page,
              },
            ].map((item) => (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                style={{
                  background: 'white',
                  border: '2px solid #1a3c6e',
                  borderRadius: '12px',
                  padding: '24px 16px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1a3c6e',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#1a3c6e';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#1a3c6e';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
          }}
        >
          <section
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <h2
              style={{ color: '#1a3c6e', marginTop: 0, marginBottom: '16px' }}
            >
              📋 หน้าที่และความรับผิดชอบ
            </h2>
            <ul style={{ color: '#555', lineHeight: '2', paddingLeft: '20px' }}>
              <li>
                จัดทำและดำเนินการ Purchase Requisition (PR) และ Purchase Order
                (PO)
              </li>
              <li>บริหารจัดการฐานข้อมูล Vendor และคัดเลือกผู้ขายที่เหมาะสม</li>
              <li>ดำเนินกระบวนการ RFQ และเปรียบเทียบราคา (Price Approval)</li>
              <li>ประสานงานกับฝ่ายต่างๆ ในระบบ Microsoft Dynamics 365</li>
              <li>จัดทำเอกสารและ Work Instruction สำหรับกระบวนการจัดซื้อ</li>
              <li>ติดตามและรายงาน KPI ของฝ่ายอย่างสม่ำเสมอ</li>
            </ul>
          </section>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <section
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '28px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <h2
                style={{ color: '#1a3c6e', marginTop: 0, marginBottom: '16px' }}
              >
                📍 ที่ตั้งฝ่ายจัดซื้อ
              </h2>
              <p style={{ color: '#555', lineHeight: '1.8', margin: 0 }}>
                <strong>548 อาคาร วัน ซิตี้ เซ็นเตอร์ (โอซีซี)</strong>
                <br />
                ชั้นที่ 44 ถนนเพลินจิต
                <br />
                แขวงลุมพินี เขตปทุมวัน
                <br />
                กรุงเทพมหานคร 10330
              </p>
            </section>

            <section
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '28px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <h2
                style={{ color: '#1a3c6e', marginTop: 0, marginBottom: '16px' }}
              >
                🔗 ลิงก์ที่เกี่ยวข้อง
              </h2>
              <a
                href="https://www.gunkul.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  background: '#1a3c6e',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                🌐 Website หลัก Gunkul
              </a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const role: Role = mockUser.role;

  const navItems = [
    { page: 'home' as Page, label: '🏠 Home' },
    { page: 'dashboard' as Page, label: '📊 Dashboard' },
    { page: 'update' as Page, label: '✏️ Update' },
    { page: 'tasks' as Page, label: '📋 Tasks' },
    { page: 'team' as Page, label: '👥 Team' },
    { page: 'knowledge' as Page, label: '📚 Knowledge' },
  ];

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <nav
        style={{
          backgroundColor: '#1a3c6e',
          padding: '12px 24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <span
          style={{ color: 'white', fontWeight: 'bold', marginRight: '16px' }}
        >
          Gunkul Procurement
        </span>
        {navItems.map(({ page, label }) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              background: currentPage === page ? 'white' : 'transparent',
              color: currentPage === page ? '#1a3c6e' : 'white',
              border: '1px solid white',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'white', fontSize: '13px' }}>
          👤 {mockUser.name} ({role === 'manager' ? 'หัวหน้า' : 'พนักงาน'})
        </span>
      </nav>

      <div>
        {currentPage === 'home' && <HomePage setPage={setCurrentPage} />}
        {currentPage === 'dashboard' && <DashboardPage role={role} />}
        {currentPage === 'update' && (
          <div style={{ padding: '40px' }}>
            <h1>✏️ หน้า Update งาน</h1>
          </div>
        )}
        {currentPage === 'tasks' && (
          <div style={{ padding: '40px' }}>
            <h1>📋 หน้า Tasks</h1>
          </div>
        )}
        {currentPage === 'team' && (
          <div style={{ padding: '40px' }}>
            <h1>👥 หน้า Team</h1>
          </div>
        )}
        {currentPage === 'knowledge' && (
          <div style={{ padding: '40px' }}>
            <h1>📚 หน้า Knowledge Base</h1>
          </div>
        )}
      </div>
    </div>
  );
}
