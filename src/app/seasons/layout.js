'use client';

import React from 'react';

export default function SeasonsLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 bg-opacity-90 text-white">
      {/* Main Content */}
      <div className="flex-grow pt-6 pb-8">
        {children}
      </div>
    </div>
  );
}