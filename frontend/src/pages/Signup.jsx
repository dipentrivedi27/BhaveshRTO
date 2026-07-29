import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Signup() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    api.get('/auth/admin-exists').then((res) => {
      if (res.data.exists) {
        // Admin already created — redirect permanently
        navigate('/login', { replace: true });
      } else {
        setAllowed(true);
      }
    }).catch(() => {
      navigate('/login', { replace: true });
    }).finally(() => setChecking(false));
  }, [navigate]);

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/signup', data);
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    }
  };

  if (checking) return (
    <div className="auth-page">
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p style={{ marginTop: 12 }}>Checking system status…</p>
      </div>
    </div>
  );

  if (!allowed) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ width: 56, height: 56, background: '#1e3a5f', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1>Bhavesh RTO CRM</h1>
          <p>Create your admin account</p>
        </div>

        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
          ⚠️ This is a one-time setup. Once created, this account cannot be changed or duplicated.
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              className={`form-control ${errors.name ? 'error' : ''}`}
              placeholder="Bhavesh Solanki"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="admin@example.com"
              {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className={`form-control ${errors.password ? 'error' : ''}`}
              placeholder="Minimum 6 characters"
              {...register('password', { required: 'Password required', minLength: { value: 6, message: 'At least 6 characters' } })}
            />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 8 }} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
