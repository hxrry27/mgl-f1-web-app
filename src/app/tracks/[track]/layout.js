'use client';

import React from 'react';

export default function TracksLayout({ children }) {
  return (
    <div className="bg-gray-900 bg-opacity-90 text-white h-full">
      <div className="pt-6">
        {children}
      </div>
    </div>
  );
}