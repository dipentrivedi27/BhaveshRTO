import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import CustomerForm from '../components/CustomerForm';
import toast from 'react-hot-toast';

const CATEGORY_LABELS = {
  insurance: 'Insurance',
  permit: 'Permit',
  fitness_puc: 'Fitness/PUC',
  license: 'License',
};

const CATEGORY_COLORS = {
  insurance: 'badge-info',
  permit: 'badge-success',
  fitness_puc: 'badge-warning',
  license: 'badge-danger',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await api.get(`/customers?${params.toString()}&limit=200`);
      setCustomers(res.data.data);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      loadCustomers();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="app-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">All Customers</h1>
          <p className="page-subtitle">Manage all customer records across categories</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditCustomer(null); setShowForm(true); }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="form-control"
            style={{ maxWidth: 280 }}
            placeholder="Search by name, contact, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-control"
            style={{ maxWidth: 180 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="insurance">Insurance</option>
            <option value="permit">Permit</option>
            <option value="fitness_puc">Fitness/PUC</option>
            <option value="license">License</option>
          </select>
          <span style={{ alignSelf: 'center', fontSize: 13, color: '#64748b' }}>
            {customers.length} record{customers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f', margin: '0 auto' }} />
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
            <h3>No customers yet</h3>
            <p>Click "Add Customer" to create your first record.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Category</th>
                  <th>Vehicle No.</th>
                  <th>End Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.contact_number}</td>
                    <td>
                      <span className={`badge ${CATEGORY_COLORS[c.category]}`}>
                        {CATEGORY_LABELS[c.category]}
                      </span>
                    </td>
                    <td>{c.vehicle_number || '—'}</td>
                    <td>{c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>₹{parseFloat(c.amount_total).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#059669' }}>₹{parseFloat(c.amount_paid).toLocaleString('en-IN')}</td>
                    <td style={{ color: parseFloat(c.amount_pending) > 0 ? '#d97706' : '#059669', fontWeight: 600 }}>
                      ₹{parseFloat(c.amount_pending || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditCustomer(c); setShowForm(true); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.name)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          customer={editCustomer}
          onSuccess={loadCustomers}
          onClose={() => { setShowForm(false); setEditCustomer(null); }}
        />
      )}
    </div>
  );
}
