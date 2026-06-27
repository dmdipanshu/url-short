'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Dynamic import to avoid SSR issues with qrcode's canvas dependency
async function generateQRDataUrl(text, options = {}) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(text, options);
}

export default function DashboardPage() {
  const [urls, setUrls] = useState([]);
  const [stats, setStats] = useState({ totalLinks: 0, totalClicks: 0, activeLinks: 0, expiredLinks: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchUrls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, search });
      const res = await fetch(`/api/urls?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setUrls(data.urls || []);
      setTotalPages(data.totalPages || 1);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      showToast('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUrls(); }, [fetchUrls]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = async (code) => {
    try {
      const res = await fetch(`/api/urls/${code}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      showToast('Link deleted');
      setDeleteConfirm(null);
      fetchUrls();
    } catch { showToast('Delete failed'); }
  };

  const handleEdit = async (code, updates) => {
    try {
      const res = await fetch(`/api/urls/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Update failed');
        return;
      }
      showToast('Link updated');
      setEditModal(null);
      fetchUrls();
    } catch { showToast('Update failed'); }
  };

  const openQr = async (code) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/${code}`;
    try {
      const dataUrl = await generateQRDataUrl(shortUrl, {
        width: 280, margin: 2,
        color: { dark: '#ffffff', light: '#0a0a0f' },
      });
      setQrDataUrl(dataUrl);
      setQrModal(code);
    } catch (err) { console.error(err); }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `dmshortx-${qrModal || 'qr'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const copyUrl = async (code) => {
    const shortUrl = `${window.location.origin}/${code}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
    } catch {
      const input = document.createElement('input');
      input.value = shortUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    showToast('✓ Copied');
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

  const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();
  const getStatus = (url) => {
    if (isExpired(url.expiresAt)) return 'expired';
    if (url.password) return 'protected';
    return 'active';
  };

  return (
    <main className="dashboard-container">
      {/* Top Bar */}
      <div className="admin-bar">
        <div className="admin-bar-left">
          <Link href="/" className="brand-link">⚡ DM ShortX</Link>
          <span className="admin-badge">📊 Dashboard</span>
        </div>
        <button className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Signing out...' : '🚪 Logout'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-value">{stats.totalLinks}</div>
          <div className="dash-stat-label">Total Links</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{stats.totalClicks.toLocaleString()}</div>
          <div className="dash-stat-label">Total Clicks</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{stats.activeLinks}</div>
          <div className="dash-stat-label">Active</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{stats.expiredLinks}</div>
          <div className="dash-stat-label">Expired</div>
        </div>
      </div>

      {/* Search Bar */}
      <form className="dash-search" onSubmit={handleSearch}>
        <input
          type="text"
          className="dash-search-input"
          placeholder="Search by URL or code..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="dash-search-btn">🔍 Search</button>
        {search && (
          <button type="button" className="dash-search-clear" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
            ✕ Clear
          </button>
        )}
      </form>

      {/* URL Table */}
      <div className="dash-table-wrap">
        {loading ? (
          <div className="dash-loading">
            <div className="spinner" /> Loading...
          </div>
        ) : urls.length === 0 ? (
          <div className="dash-empty">
            {search ? 'No results found' : 'No links yet. Create one from the home page!'}
          </div>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Short Code</th>
                <th>Destination</th>
                <th>Clicks</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => {
                const status = getStatus(url);
                return (
                  <tr key={url.code} className={status === 'expired' ? 'row-expired' : ''}>
                    <td>
                      <span className="code-cell">/{url.code}</span>
                    </td>
                    <td>
                      <span className="dest-cell" title={url.originalUrl}>
                        {url.originalUrl.length > 50 ? url.originalUrl.slice(0, 50) + '...' : url.originalUrl}
                      </span>
                    </td>
                    <td>
                      <span className="clicks-cell">{url.clicks.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${status}`}>
                        {status === 'expired' ? '⏰ Expired' : status === 'protected' ? '🔒 Protected' : '✅ Active'}
                      </span>
                    </td>
                    <td>
                      <span className="date-cell">{new Date(url.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="icon-btn" onClick={() => copyUrl(url.code)} title="Copy">📋</button>
                        <button className="icon-btn" onClick={() => openQr(url.code)} title="QR">📱</button>
                        <button className="icon-btn" onClick={() => setEditModal(url)} title="Edit">✏️</button>
                        <button className="icon-btn icon-btn-danger" onClick={() => setDeleteConfirm(url.code)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dash-pagination">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Prev
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Link</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>/{deleteConfirm}</strong>? This cannot be undone.</p>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="delete-btn" onClick={() => handleDelete(deleteConfirm)}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <EditModal
          url={editModal}
          onClose={() => setEditModal(null)}
          onSave={handleEdit}
        />
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="modal-overlay" onClick={() => setQrModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>QR Code — /{qrModal}</h3>
              <button className="modal-close" onClick={() => setQrModal(null)}>✕</button>
            </div>
            <div className="qr-modal-body">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="qr-image-large" />}
              <button className="submit-btn" onClick={downloadQR} style={{ marginTop: '16px' }}>
                <span>⬇️ Download QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
    </main>
  );
}

/* ===== Edit Modal Component ===== */
function EditModal({ url, onClose, onSave }) {
  const [originalUrl, setOriginalUrl] = useState(url.originalUrl);
  const [expiresAt, setExpiresAt] = useState(
    url.expiresAt ? new Date(url.expiresAt).toISOString().slice(0, 16) : ''
  );
  const [password, setPassword] = useState(url.password || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(url.code, {
      originalUrl,
      expiresAt: expiresAt || null,
      password: password || null,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit — /{url.code}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Destination URL</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '16px' }}
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">⏰ Expires At (leave empty for no expiry)</label>
            <input
              type="datetime-local"
              className="form-input expiry-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">🔒 Password (leave empty to remove)</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '16px' }}
              placeholder="No password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
