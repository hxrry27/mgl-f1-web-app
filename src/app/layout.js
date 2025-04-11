'use client';

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from '@/components/Header';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Fixed Header */}
          <Header />
          
          {/* Main Content */}
          <div className="flex min-h-screen flex-col">
            {/* Content starts below the header */}
            <div className="flex-1"> 
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}