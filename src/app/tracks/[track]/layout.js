'use client';

import React from 'react';

export default function TracksLayout({ children }) {
  return (
    <div className="min-h-screen bg-primary text-white">
      <div className="pt-24">
        {children}
      </div>
    </div>
  );
}