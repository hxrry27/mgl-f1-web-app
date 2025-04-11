'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardContainer from '@/components/dashboard/DashboardContainer';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContainer />
    </DashboardLayout>
  );
}