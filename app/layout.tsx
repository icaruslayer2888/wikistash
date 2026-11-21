import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WikiStash — $0/Month Self-Updating AI Micro-Learning',
  description:
    'Deepstash-style bite-sized mental models and micro-learning summaries from Wikipedia. Daily automated ingestion at $0/month via GitHub Actions, Gemini AI, Cloudflare D1, and Cloudflare Pages CDN.',
  keywords: [
    'micro-learning',
    'Deepstash',
    'Wikipedia summaries',
    'Gemini AI',
    'mental models',
    'self-updating',
    'Cloudflare D1',
  ],
  authors: [{ name: 'WikiStash Team' }],
  openGraph: {
    title: 'WikiStash — $0/Month Self-Updating AI Micro-Learning',
    description: 'Master 1 big idea in under 3 minutes. Zero cost, zero database pausing.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#080c14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
