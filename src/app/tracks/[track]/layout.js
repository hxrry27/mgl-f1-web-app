'use client';

import React from 'react';
import Header from '@/components/Header';

export default function TracksLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 bg-opacity-90 text-white">
      
      {/* Main Content */}
      <div className="flex-grow">
        <main className="pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}