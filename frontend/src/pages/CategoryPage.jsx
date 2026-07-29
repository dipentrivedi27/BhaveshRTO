import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import CustomerForm from '../components/CustomerForm';

// Category config — title, columns, badge style
const CATEGORY_CONFIG = {
  insurance: {
    title: 'Insurance',
    subtitle: 'Vehicle insurance records and renewal reminders',
    color: '#1e40af',
    bg: '#dbeafe',
    columns: [
      { key: 'name', label: 'Customer Name' },
      { key: 'contact_number', label: 'Contact' },
      { key: 'vehicle_number', label: 'Vehicle No.' },
      { key: 'start_date', label: 'Start Date', isDate: true },
      { key: 'end_date', label: 'Expiry Date', isDate: true },
      { key: 'amount_total', label: 'Total', isMoney: true },
      { key: 'amount_paid', label: 'Paid', isMoney: true },
    ],
  },
  permit: {
    title: 'Permit',
    subtitle: 'Vehicle permit records and renewal reminders',
    color: '#065f46',
    bg: '#d1fae5',
    columns: [
      { key: 'name', label: 'Customer Name' },
      { key: 'contact_number', label: 'Contact' },
      { key: 'vehicle_number', label: 'Vehicle No.' },
      { key: 'start_date', label: 'Start Date', isDate: true },
      { key: 'end_date', label: 'Expiry Date', isDate: true },
      { key: 'amount_total', label: 'Total', isMoney: true },
      { key: 'amount_paid', label: 'Paid', isMoney: true },
    ],
  },
  fitness_puc: {
    title: 'Fitness / PUC',
    subtitle: 'Vehicle fitness & PUC certificate records',
    color: '#92400e',
    bg: '#fef3c7',
    columns: [
      { key: 'name', label: 'Customer Name' },
      { key: 'contact_number', label: 'Contact' },
      { key: 'start_date', label: 'Fitness Start Date', isDate: true },
      { key: 'end_date', label: 'Fitness End Date', isDate: true },
    ],
  },
  license: {
    title: 'License',
    subtitle: 'Driving license records and renewal reminders',
    color: '#6d28d9',
    bg: '#ede9fe',
    columns: [
      { key: 'name', label: 'Customer Name' },
      { key: 'contact_number', label: 'Contact' },
      { key: 'start_date', label: 'Issue Date', isDate: true },
      { key: 'end_date', label: 'Expiry Date', isDate: true },
    ],
  },
};

function isExpiringSoon(dateStr, days = 30) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = typeof dateStr === 'string'
    ? dateStr.split('T')[0].split('-').map(Number)
    : [dateStr.getFullYear(), dateStr.getMonth() + 1, dateStr.getDate()];

  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

export default function CategoryPage({ category }) {
  const config = CATEGORY_CONFIG[category];
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?category=${category}&limit=500`);
      setCustomers(res.data.data);
    } catch {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (customer) => {
    setSendingId(customer.id);
    try {
      const res = await api.post(`/customers/${customer.id}/send-reminder`);
      if (res.data.success) {
        toast.success(`Reminder sent to ${customer.name}`);
      } else {
        toast.error('Send failed — check MessageLog');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Send failed');
    } finally {
      setSendingId(null);
    }
  };

  const expiringCount = customers.filter((c) => isExpiringSoon(c.end_date)).length;

  return (
    <div className="app-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title" style={{ color: config.color }}>{config.title}</h1>
          <p className="page-subtitle">{config.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {expiringCount > 0 && (
            <span className="badge badge-warning" style={{ fontSize: 13, padding: '6px 14px' }}>
              ⚠️ {expiringCount} expiring within 30 days
            </span>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f', margin: '0 auto' }} />
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <h3>No {config.title} records</h3>
            <p>Add customers from the "All Customers" section and assign the {config.title} category.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {config.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Status</th>
                  <th>Send Reminder</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => {
                  const expiring = isExpiringSoon(c.end_date);
                  return (
                    <tr key={c.id} className={expiring ? 'expiring' : ''}>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                      {config.columns.map((col) => (
                        <td key={col.key}>
                          {col.isDate
                            ? c[col.key]
                              ? new Date(c[col.key]).toLocaleDateString('en-IN')
                              : '—'
                            : col.isMoney
                            ? `₹${parseFloat(c[col.key] || 0).toLocaleString('en-IN')}`
                            : c[col.key] || '—'}
                        </td>
                      ))}
                      <td>
                        {expiring ? (
                          <span className="badge badge-warning">
                            ⚠️ Expiring Soon
                          </span>
                        ) : (
                          <span className="badge badge-success">✓ Active</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${expiring ? 'btn-accent' : 'btn-ghost'}`}
                          onClick={() => handleSend(c)}
                          disabled={sendingId === c.id}
                          title={`Send WhatsApp reminder to ${c.name}`}
                        >
                          {sendingId === c.id ? (
                            <span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: 'currentColor' }} />
                          ) : (
                            <>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.49 2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9c1.06 1.88 2.6 3.45 4.5 4.56l1.88-1.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2z" />
                              </svg>
                              Send
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditCustomer(c)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editCustomer && (
        <CustomerForm
          customer={editCustomer}
          onSuccess={load}
          onClose={() => setEditCustomer(null)}
        />
      )}
    </div>
  );
}
