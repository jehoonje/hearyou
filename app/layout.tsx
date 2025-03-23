import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eavesdrop Visualizer',
  description: 'Visualize your voice with interactive 3D particles',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}