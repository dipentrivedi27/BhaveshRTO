import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CATEGORY_LABELS = {
  insurance: 'Insurance',
  permit: 'Permit',
  fitness_puc: 'Fitness/PUC',
  license: 'License',
};

export default function Receipts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/receipts');
      setData(res.data.data);
    } catch {
      toast.error('Failed to load receipt data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownloadPDF = async (customerId, customerName) => {
    setPdfLoadingId(customerId);
    try {
      const res = await api.get(`/receipts/${customerId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${customerName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('PDF generation failed. Ensure Puppeteer is set up.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const filtered = data?.customers?.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.contact_number.includes(search)
  ) || [];

  if (loading) return (
    <div className="app-content">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spinner" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f' }} />
      </div>
    </div>
  );

  return (
    <div className="app-content">
      <div className="page-header">
        <h1 className="page-title">Payment Receipts</h1>
        <p className="page-subtitle">Bhavesh RTO Payment Receipt — collected vs. pending overview</p>
      </div>

      {/* Overall Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Grand Total', value: data?.summary?.grandTotal || 0, color: '#1e3a5f', bg: '#dbeafe' },
          { label: 'Total Collected', value: data?.summary?.grandPaid || 0, color: '#065f46', bg: '#d1fae5' },
          { label: 'Total Pending', value: data?.summary?.grandPending || 0, color: '#92400e', bg: '#fef3c7' },
        ].map((item) => (
          <div key={item.label} className="stat-card" style={{ borderLeft: `4px solid ${item.color}` }}>
            <div>
              <div className="stat-label">{item.label}</div>
              <div className="stat-value" style={{ color: item.color }}>
                ₹{parseFloat(item.value).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-Customer Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Per-Customer Breakdown</h2>
          <input
            className="form-control"
            style={{ maxWidth: 240 }}
            placeholder="Search customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid #e2e8f0' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Contact</th>
                  <th>Category</th>
                  <th>Total Amount</th>
                  <th>Amount Paid</th>
                  <th>Pending</th>
                  <th>PDF Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No customers found.
                    </td>
                  </tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.contact_number}</td>
                    <td>
                      <span className="badge badge-info">{CATEGORY_LABELS[c.category]}</span>
                    </td>
                    <td>₹{parseFloat(c.amount_total).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#059669' }}>₹{parseFloat(c.amount_paid).toLocaleString('en-IN')}</td>
                    <td style={{ color: parseFloat(c.amount_pending) > 0 ? '#d97706' : '#059669', fontWeight: 600 }}>
                      ₹{parseFloat(c.amount_pending).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDownloadPDF(c.id, c.name)}
                        disabled={pdfLoadingId === c.id}
                      >
                        {pdfLoadingId === c.id ? (
                          <span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#1e3a5f', width: 12, height: 12 }} />
                        ) : (
                          <>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            PDF
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
