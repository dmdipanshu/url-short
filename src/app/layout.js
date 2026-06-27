import './globals.css';

export const metadata = {
  title: 'DM ShortX — Lightning Fast URL Shortener',
  description: 'Shorten your URLs instantly with DM ShortX. Fast, reliable URL shortener with analytics, QR codes, link expiry, and password protection.',
  keywords: ['url shortener', 'link shortener', 'short url', 'DM ShortX', 'qr code generator'],
  openGraph: {
    title: 'DM ShortX — Lightning Fast URL Shortener',
    description: 'Shorten your URLs instantly. Fast, reliable, and feature-packed.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Animated background */}
        <div className="bg-grid">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>

        {children}
      </body>
    </html>
  );
}
