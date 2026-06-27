'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PasswordGatePage() {
  const { code } = useParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/verify/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Incorrect password');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
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
          <div className="login-logo">🔒</div>
          <h1 className="login-title">Protected Link</h1>
          <p className="login-subtitle">This link is password protected</p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2>Enter Password</h2>
            <p>The owner of this link requires a password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="link-password" className="form-label">
                Password
              </label>
              <div className="form-input-wrapper">
                <span className="form-icon">🔑</span>
                <input
                  id="link-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter link password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
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
              type="submit"
              className="submit-btn login-submit"
              disabled={loading || !password.trim()}
            >
              <span>
                {loading ? (
                  <>
                    <div className="spinner" />
                    Verifying...
                  </>
                ) : (
                  '🔓 Continue'
                )}
              </span>
            </button>
          </form>

          <div className="login-footer-note">
            <p>
              Powered by{' '}
              <Link href="/" style={{ color: 'var(--accent-secondary)', textDecoration: 'none' }}>
                DM ShortX
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
