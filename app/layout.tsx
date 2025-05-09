import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';

import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/providers/query-provider';
import { SheetProvider } from '@/providers/sheet-provider';
import { ruRU } from "@clerk/localizations";

import './globals.css';
import React from "react";
import {ThemeProvider} from "@/app/providers/theme-provider";

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
      <html lang="ru" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <SheetProvider />
              <Toaster />
              {children}
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
