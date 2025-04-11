'use client';

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 bg-opacity-90 text-white flex flex-col">
     
      {/* Main Content Area - Full Height Minus Header */}
      <main className="flex-1">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}