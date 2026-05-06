import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
      const status = err.response?.status;
      if (!err.response) {
        console.error('Login failed: no response (network or CORS)', err);
      } else if (status >= 500) {
        console.error('Login failed: server error', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">Task<span>Flow</span></div>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your workspace</p>
        <form onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@company.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          {error ? <div className="error-msg login-error-banner" role="alert">{error}</div> : null}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner spinner-inline" aria-hidden />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        <div className="auth-link">
          No account? <a href="#" onClick={e => { e.preventDefault(); onNavigate('signup'); }}>Create one</a>
        </div>
        <div className="auth-link" style={{marginTop: 12, fontSize: 12, color: 'var(--text3)'}}>
          Demo: demo@taskflow.app / demo123
        </div>
      </div>
    </div>
  );
}
