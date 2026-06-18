import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DropZone — Bridge your devices',
  description:
    'A privacy-first, cross-platform utility that bridges your phone and computer. Real-time clipboard sync, file sharing, and remote file access — all end-to-end encrypted.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
