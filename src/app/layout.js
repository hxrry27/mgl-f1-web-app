'use client';

import "./globals.css";
import React, { useState } from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import NewHeader from '@/components/NewHeader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConsoleArt } from './console-art';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes default
      retry: 2,
      refetchOnWindowFocus: false, // Prevent unnecessary refetches when user switches tabs
      refetchOnReconnect: true, // Refetch when internet reconnects
    },
  },
});

export default function RootLayout({ children }) {
  // Create query client instance (only once per app)
  const [queryClient] = useState(() => createQueryClient());

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background font-sans antialiased">
        <ConsoleArt/>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <NewHeader />
            {children}
          </ThemeProvider>
          
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools 
              initialIsOpen={false} 
              position="bottom-right"
            />
          )}
        </QueryClientProvider>
      </body>
    </html>
  );
}