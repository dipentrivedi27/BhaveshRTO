import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function StatCard({ icon, label, value, color, bgColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bgColor }}>
        {icon}
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>₹{payload[0].value.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { admin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/monthly-collection'),
    ]).then(([sumRes, monthRes]) => {
      setSummary(sumRes.data.data);
      setMonthly(monthRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div className="app-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div className="spinner" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f' }} />
      </div>
    </div>
  );

  return (
    <div className="app-content">
      {/* Greeting */}
      <div className="page-header">
        <h1 className="page-title">{greeting()}, {admin?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's an overview of your CRM today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        <StatCard
          label="Total Customers"
          value={summary?.totalCustomers ?? 0}
          color="#1e3a5f"
          bgColor="#dbeafe"
          icon={
            <svg width="22" height="22" fill="none" stroke="#1e40af" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Total Collection"
          value={`₹${parseFloat(summary?.totalCollection || 0).toLocaleString('en-IN')}`}
          color="#065f46"
          bgColor="#d1fae5"
          icon={
            <svg width="22" height="22" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Pending Collection"
          value={`₹${parseFloat(summary?.pendingCollection || 0).toLocaleString('en-IN')}`}
          color="#92400e"
          bgColor="#fef3c7"
          icon={
            <svg width="22" height="22" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>

      {/* Monthly Chart */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <h2 className="card-title">Monthly Collection</h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>Last 12 months</span>
        </div>
        <div className="card-body">
          {monthly.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No payment data yet. Add customers and record payments.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {monthly.map((_, i) => (
                    <Cell key={i} fill={i === monthly.length - 1 ? '#1e3a5f' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
