'use client';

import React from 'react';

export default function RacemapLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-y-auto">
      <div className="p-8 pt-24">
        {children}
      </div>
    </div>
  );
}