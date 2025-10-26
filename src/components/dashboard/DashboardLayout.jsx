'use client';

import React from 'react';

export default function DashboardLayout({ children }) {
  return (
    <div className="bg-gray-900 bg-opacity-90 text-white h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}