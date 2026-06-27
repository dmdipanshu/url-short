import Link from 'next/link';

export const metadata = {
  title: '404 — Link Not Found | DM ShortX',
};

export default function NotFound() {
  return (
    <main className="main-container">
      <div className="not-found">
        <h1>404</h1>
        <p>This short link doesn&apos;t exist or has been removed.</p>
        <Link href="/">← Back to DM ShortX</Link>
      </div>
    </main>
  );
}
