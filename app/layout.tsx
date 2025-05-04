import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';

import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/providers/query-provider';
import { SheetProvider } from '@/providers/sheet-provider';
import { ruRU } from "@clerk/localizations";

import './globals.css';
import React from "react";

const inter = Inter({ subsets: ['cyrillic'] });

export const metadata: Metadata = {
  title: 'Финансовая SaaS Платформа учета расходов',
  description:
    'Платформа для учета доходов и расходов',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={ruRU}>
      <html lang="ru">
        <body className={inter.className}>
          <QueryProvider>
            <SheetProvider />
            <Toaster />
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
