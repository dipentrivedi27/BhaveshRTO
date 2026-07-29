import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [adminId, setAdminId] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');

  const { register: regCreds, handleSubmit: handleCreds, formState: { errors: credErrors, isSubmitting: credLoading } } = useForm();
  const { register: regOtp, handleSubmit: handleOtp, formState: { errors: otpErrors, isSubmitting: otpLoading } } = useForm();

  const onLoginSubmit = async (data) => {
    try {
      const res = await api.post('/auth/login', data);
      setAdminId(res.data.adminId);
      setAdminEmail(data.email);
      setStep('otp');
      toast.success('OTP sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  const onOtpSubmit = async (data) => {
    try {
      const res = await api.post('/auth/verify-otp', { adminId, code: data.code });
      login(res.data.admin, res.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    }
  };

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
          <p>RTO & Insurance Advisor Portal</p>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleCreds(onLoginSubmit)}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1e293b' }}>Sign in to your account</h2>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className={`form-control ${credErrors.email ? 'error' : ''}`}
                placeholder="admin@example.com"
                {...regCreds('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
              />
              {credErrors.email && <p className="form-error">{credErrors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className={`form-control ${credErrors.password ? 'error' : ''}`}
                placeholder="••••••••"
                {...regCreds('password', { required: 'Password is required' })}
              />
              {credErrors.password && <p className="form-error">{credErrors.password.message}</p>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 8 }} disabled={credLoading}>
              {credLoading ? <span className="spinner" /> : 'Send OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtp(onOtpSubmit)}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, background: '#f0f9ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="26" height="26" fill="none" stroke="#1e3a5f" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Enter your OTP</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                We sent a 6-digit code to <strong>{adminEmail}</strong>
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">6-Digit OTP Code</label>
              <input
                className={`form-control ${otpErrors.code ? 'error' : ''}`}
                placeholder="123456"
                maxLength={6}
                style={{ fontSize: 22, letterSpacing: 8, textAlign: 'center' }}
                {...regOtp('code', {
                  required: 'OTP is required',
                  minLength: { value: 6, message: 'Must be 6 digits' },
                  maxLength: { value: 6, message: 'Must be 6 digits' },
                })}
              />
              {otpErrors.code && <p className="form-error">{otpErrors.code.message}</p>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15 }} disabled={otpLoading}>
              {otpLoading ? <span className="spinner" /> : 'Verify & Login'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setStep('credentials')}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
