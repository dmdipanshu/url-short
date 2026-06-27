'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-container">
      <div className="login-wrapper">
        <div className="login-brand">
          <div className="login-logo">⚡</div>
          <h1 className="login-title">DM ShortX</h1>
          <p className="login-subtitle">Admin Access Required</p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome Back</h2>
            <p>Sign in to manage your short links</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-username" className="form-label">
                Username
              </label>
              <div className="form-input-wrapper">
                <span className="form-icon">👤</span>
                <input
                  id="login-username"
                  type="text"
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <div className="form-input-wrapper">
                <span className="form-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">⚠️ {error}</div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="submit-btn login-submit"
              disabled={loading || !username.trim() || !password.trim()}
            >
              <span>
                {loading ? (
                  <>
                    <div className="spinner" />
                    Signing in...
                  </>
                ) : (
                  '🔐 Sign In'
                )}
              </span>
            </button>
          </form>

          <div className="login-footer-note">
            <p>🛡️ DM ShortX Admin Panel</p>
          </div>
        </div>
      </div>
    </main>
  );
}
