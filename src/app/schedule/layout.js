'use client';

import React from 'react';

export default function ScheduleLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="pt-24">
        {children}
      </div>
    </div>
  );
}