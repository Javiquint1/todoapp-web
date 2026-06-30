import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Todero Marketplace',
  description: 'Marketplace de servicios verificados para Colombia',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
