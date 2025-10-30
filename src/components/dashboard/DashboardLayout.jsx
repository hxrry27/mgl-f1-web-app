'use client';

import React from 'react';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-y-auto">
      <div className="container mx-auto px-4 py-6 pt-24">
        {children}
      </div>
    </div>
  );
}