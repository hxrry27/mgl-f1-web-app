'use client';

import React from 'react';

export default function ResultsLayout({ children }) {
  return (
    <div className="min-h-screen bg-primary text-white">
      <div className="pt-24 pb-8">
        {children}
      </div>
    </div>
  );
}