'use client';

import React from 'react';

export default function AccountLayout({ children }) {
  return (
    <div className="min-h-screen bg-primary text-white">
      <div className="relative z-10 min-h-screen px-8 lg:px-16 xl:px-24 py-24">
        <div className="max-w-[1200px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}