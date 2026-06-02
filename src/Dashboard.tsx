import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

type Role = 'manager' | 'employee';

const mockKPI = [
  {
    name: 'สมชาย',
    po: 400,
    poTarget: 1000,
    pr: 25,
    prTarget: 50,
    vendor: 8,
    vendorTarget: 20,
  },
  {
    name: 'สมหญิง',
    po: 600,
    poTarget: 1000,
    pr: 40,
    prTarget: 50,
    vendor: 15,
    vendorTarget: 20,
  },
  {
    name: 'วิชัย',
    po: 200,
    poTarget: 1000,
    pr: 15,
    prTarget: 50,
    vendor: 5,
    vendorTarget: 20,
  },
  {
    name: 'นภา',
    po: 750,
    poTarget: 1000,
    pr: 45,
    prTarget: 50,
    vendor: 18,
    vendorTarget: 20,
  },
];

const budgetData = [
  { month: 'ม.ค.', actual: 8, plan: 12 },
  { month: 'ก.พ.', actual: 10, plan: 12 },
  { month: 'มี.ค.', actual: 9, plan: 12 },
  { month: 'เม.ย.', actual: 11, plan: 12 },
  { month: 'พ.ค.', actual: 7, plan: 12 },
  { month: 'มิ.ย.', actual: 0, plan: 12 },
];

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        borderTop: `4px solid ${color}`,
      }}
    >
      <p style={{ margin: '0 0 8px', color: '#888', fontSize: '13px' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color }}>
        {value}
        <span
          style={{
            fontSize: '14px',
            fontWeight: '400',
            color: '#888',
            marginLeft: '6px',
          }}
        >
          {unit}
        </span>
      </p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#555' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color }}>
          {value}/{max} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div
        style={{ background: '#f0f0f0', borderRadius: '999px', height: '8px' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '999px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage({ role }: { role: Role }) {
  const [selectedMonth, setSelectedMonth] = React.useState('2026-05');
  const totalPO = mockKPI.reduce((s, k) => s + k.po, 0);
  const totalPR = mockKPI.reduce((s, k) => s + k.pr, 0);
  const totalVendor = mockKPI.reduce((s, k) => s + k.vendor, 0);
  const totalBudgetUsed = budgetData.reduce((s, b) => s + b.actual, 0);

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#1a3c6e', fontSize: '26px' }}>
            📊 Dashboard & KPI
          </h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '14px' }}>
            ภาพรวมผลการดำเนินงานฝ่ายจัดซื้อ
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            color: '#1a3c6e',
            fontWeight: '600',
            background: 'white',
          }}
        >
          {['2026-03', '2026-04', '2026-05'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          label="PO ทั้งหมด"
          value={totalPO.toString()}
          unit="รายการ"
          color="#1a3c6e"
        />
        <StatCard
          label="PR ทั้งหมด"
          value={totalPR.toString()}
          unit="รายการ"
          color="#2d6abf"
        />
        <StatCard
          label="Vendor ที่ดำเนินการ"
          value={totalVendor.toString()}
          unit="ราย"
          color="#0ea5e9"
        />
        <StatCard
          label="Budget ที่ใช้ไป"
          value={totalBudgetUsed.toString()}
          unit="ล้านบาท"
          color="#10b981"
        />
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Budget Bar Chart */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ margin: '0 0 20px', color: '#1a3c6e' }}>
            💰 Budget Actual vs Plan (ล้านบาท)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="plan"
                name="Plan"
                fill="#e2e8f0"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill="#1a3c6e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PO Bar Chart */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ margin: '0 0 20px', color: '#1a3c6e' }}>📦 PO รายคน</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockKPI}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar
                dataKey="poTarget"
                name="เป้าหมาย"
                fill="#e2e8f0"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="po"
                name="ทำได้"
                fill="#2d6abf"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Progress per person */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <h3 style={{ margin: '0 0 24px', color: '#1a3c6e' }}>
          {role === 'manager' ? '👥 KPI รายคน' : '🎯 KPI ของฉัน'}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {mockKPI
            .filter((k) => (role === 'manager' ? true : k.name === 'สมชาย'))
            .map((k) => (
              <div
                key={k.name}
                style={{
                  padding: '20px',
                  background: '#f8faff',
                  borderRadius: '12px',
                  border: '1px solid #e8eef8',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#1a3c6e',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '14px',
                    }}
                  >
                    {k.name[0]}
                  </div>
                  <span style={{ fontWeight: '600', color: '#1a3c6e' }}>
                    {k.name}
                  </span>
                </div>
                <ProgressRow
                  label="PO"
                  value={k.po}
                  max={k.poTarget}
                  color="#1a3c6e"
                />
                <ProgressRow
                  label="PR"
                  value={k.pr}
                  max={k.prTarget}
                  color="#2d6abf"
                />
                <ProgressRow
                  label="Vendor"
                  value={k.vendor}
                  max={k.vendorTarget}
                  color="#0ea5e9"
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
