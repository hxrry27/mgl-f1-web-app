'use client';

import React from 'react';

export default function ResultsLayout({ children }) {
  return (
    <div className="bg-gray-900 bg-opacity-90 text-white h-full">
      <div className="pt-6 pb-8">
        {children}
      </div>
    </div>
  );
}