import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Todero Marketplace',
  description: 'Verified home-services marketplace for Colombia',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
