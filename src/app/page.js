'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Dynamic import to avoid SSR issues with qrcode's canvas dependency
async function generateQRDataUrl(text, options = {}) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(text, options);
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [recentUrls, setRecentUrls] = useState([]);
  const [toast, setToast] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dmshortx_recent_urls');
      if (stored) setRecentUrls(JSON.parse(stored));
    } catch (e) { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (recentUrls.length > 0) {
      localStorage.setItem('dmshortx_recent_urls', JSON.stringify(recentUrls));
    }
  }, [recentUrls]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const generateQR = async (text) => {
    try {
      const dataUrl = await generateQRDataUrl(text, {
        width: 280,
        margin: 2,
        color: { dark: '#ffffff', light: '#0a0a0f' },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch { showToast('Logout failed'); }
    finally { setLoggingOut(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);
    setQrDataUrl('');

    let finalUrl = url.trim();
    if (!finalUrl) return;

    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
      setUrl(finalUrl);
    }

    setLoading(true);

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: finalUrl,
          customAlias: customAlias.trim() || undefined,
          expiresAt: expiresAt || undefined,
          password: password.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setResult(data);
      generateQR(data.shortUrl);

      setRecentUrls((prev) => {
        const filtered = prev.filter((item) => item.code !== data.code);
        return [{
          shortUrl: data.shortUrl,
          originalUrl: data.originalUrl,
          code: data.code,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          hasPassword: data.hasPassword,
        }, ...filtered].slice(0, 10);
      });

      setUrl('');
      setCustomAlias('');
      setExpiresAt('');
      setPassword('');
      setShowAdvanced(false);
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    showToast('✓ Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `dmshortx-${result?.code || 'qr'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const openQrModal = async (shortUrl) => {
    try {
      const dataUrl = await generateQRDataUrl(shortUrl, {
        width: 280, margin: 2,
        color: { dark: '#ffffff', light: '#0a0a0f' },
      });
      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) { console.error(err); }
  };

  const clearRecent = () => {
    setRecentUrls([]);
    localStorage.removeItem('dmshortx_recent_urls');
    showToast('History cleared');
  };

  const deleteRecent = (code) => {
    setRecentUrls((prev) => {
      const updated = prev.filter((item) => item.code !== code);
      if (updated.length === 0) localStorage.removeItem('dmshortx_recent_urls');
      return updated;
    });
  };

  // Min datetime for expiry picker (now + 5 min)
  const minDateTime = () => {
    const d = new Date(Date.now() + 5 * 60000);
    return d.toISOString().slice(0, 16);
  };

  return (
    <main className="main-container">
      {/* Admin Top Bar */}
      <div className="admin-bar">
        <div className="admin-bar-left">
          <span className="admin-badge">🛡️ Admin</span>
          <Link href="/dashboard" className="dashboard-link">📊 Dashboard</Link>
        </div>
        <button
          id="logout-btn"
          className="logout-btn"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Signing out...' : '🚪 Logout'}
        </button>
      </div>

      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">
          <span className="dot" />
          Fast & Secure
        </div>
        <h1>DM ShortX</h1>
        <p>
          Shorten URLs instantly with analytics, QR codes, link expiry,
          and password protection.
        </p>
      </div>

      {/* Shortener Card */}
      <div className="shortener-card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="url-input-wrapper">
              <input
                ref={inputRef}
                id="url-input"
                type="text"
                className="url-input"
                placeholder="Paste your long URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck="false"
              />
              <span className="icon">🔗</span>
            </div>

            {/* Advanced options toggle */}
            <button
              type="button"
              className="alias-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className={`chevron ${showAdvanced ? 'open' : ''}`}>▼</span>
              Advanced Options
            </button>

            <div className={`alias-input-wrapper ${showAdvanced ? 'visible' : ''}`} style={{ maxHeight: showAdvanced ? '300px' : '0' }}>
              {/* Custom alias */}
              <div className="advanced-field">
                <label className="advanced-label">🏷️ Custom Alias</label>
                <div className="alias-row">
                  <span className="alias-prefix">yoursite.com/</span>
                  <input
                    id="alias-input"
                    type="text"
                    className="alias-input"
                    placeholder="my-custom-link"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    disabled={loading}
                    maxLength={30}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Expiry date */}
              <div className="advanced-field">
                <label className="advanced-label">⏰ Expire After</label>
                <input
                  id="expiry-input"
                  type="datetime-local"
                  className="form-input expiry-input"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={minDateTime()}
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="advanced-field">
                <label className="advanced-label">🔒 Password Protect</label>
                <input
                  id="password-input"
                  type="text"
                  className="form-input"
                  placeholder="Leave empty for no password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <button
              id="submit-btn"
              type="submit"
              className="submit-btn"
              disabled={loading || !url.trim()}
            >
              <span>
                {loading ? (
                  <><div className="spinner" /> Shortening...</>
                ) : (
                  '⚡ Shorten URL'
                )}
              </span>
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div className="result-card">
            <div className="result-label">✓ Your short URL is ready</div>
            <div className="result-url-row">
              <div className="result-url">{result.shortUrl}</div>
              <button
                id="copy-btn"
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={() => copyToClipboard(result.shortUrl)}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="qr-section">
                <img src={qrDataUrl} alt="QR Code" className="qr-image" />
                <button className="qr-download-btn" onClick={downloadQR}>
                  ⬇️ Download QR
                </button>
              </div>
            )}

            <div className="result-meta">
              <div className="result-original">
                Redirects to: <span>{result.originalUrl}</span>
              </div>
              {result.expiresAt && (
                <div className="result-badge expiry-badge">
                  ⏰ Expires: {new Date(result.expiresAt).toLocaleString()}
                </div>
              )}
              {result.hasPassword && (
                <div className="result-badge password-badge">
                  🔒 Password Protected
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-msg">⚠️ {error}</div>
        )}
      </div>

      {/* Stats bar */}
      {recentUrls.length > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{recentUrls.length}</div>
            <div className="stat-label">Links Created</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">∞</div>
            <div className="stat-label">No Limit</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">&lt;50ms</div>
            <div className="stat-label">Redirect Speed</div>
          </div>
        </div>
      )}

      {/* Recent URLs */}
      {recentUrls.length > 0 && (
        <div className="recent-section">
          <div className="recent-header">
            <h2>📌 Recent Links</h2>
            <button id="clear-history-btn" className="clear-btn" onClick={clearRecent}>
              Clear All
            </button>
          </div>
          <div className="recent-list">
            {recentUrls.map((item) => (
              <div key={item.code} className="recent-item">
                <div className="recent-item-info">
                  <div className="recent-item-short">
                    {item.shortUrl}
                    {item.hasPassword && <span className="mini-badge">🔒</span>}
                    {item.expiresAt && <span className="mini-badge">⏰</span>}
                  </div>
                  <div className="recent-item-original">{item.originalUrl}</div>
                </div>
                <div className="recent-item-actions">
                  <button className="icon-btn" onClick={() => openQrModal(item.shortUrl)} title="QR Code">
                    📱
                  </button>
                  <button className="icon-btn" onClick={() => copyToClipboard(item.shortUrl)} title="Copy">
                    📋
                  </button>
                  <button className="icon-btn" onClick={() => deleteRecent(item.code)} title="Remove">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>
          DM ShortX ⚡ Built with Next.js & MongoDB — Deployed on{' '}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a>
        </p>
      </footer>

      {/* QR Modal */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>QR Code</h3>
              <button className="modal-close" onClick={() => setShowQrModal(false)}>✕</button>
            </div>
            {qrDataUrl && (
              <div className="qr-modal-body">
                <img src={qrDataUrl} alt="QR Code" className="qr-image-large" />
                <button className="submit-btn" onClick={downloadQR} style={{ marginTop: '16px' }}>
                  <span>⬇️ Download QR Code</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
    </main>
  );
}
