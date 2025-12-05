'use client';

import { AuthProvider } from '../src/contexts/AuthContext';
import './globals.css';
import { ReactNode } from 'react';


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Locafy</title>
        <link rel="icon" href="logocircle.png" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

