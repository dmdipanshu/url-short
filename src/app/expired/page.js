import Link from 'next/link';

export const metadata = {
  title: 'Link Expired | DM ShortX',
};

export default function ExpiredPage() {
  return (
    <main className="main-container">
      <div className="not-found">
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>⏰</div>
        <h1 style={{ fontSize: '3rem' }}>Link Expired</h1>
        <p>This short link has expired and is no longer active.</p>
        <Link href="/">← Back to DM ShortX</Link>
      </div>
    </main>
  );
}
