'use client';

import React from 'react';

export default function RacemapLayout({ children }) {
  return (
    <div className="min-h-screen bg-primary text-white overflow-y-auto">
      <div className="p-8 pt-24">
        {children}
      </div>
    </div>
  );
}