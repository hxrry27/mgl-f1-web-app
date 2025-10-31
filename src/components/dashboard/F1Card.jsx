'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function F1Card({ 
  title, 
  value, 
  subValue = null, 
  team = 'default', 
  icon = null,
  loading = false 
}) {
  // Map F1 team colors
  const teamColors = {
    'mercedes': 'bg-[#00D2BE]',
    'redbull': 'bg-[#0600EF]',
    'ferrari': 'bg-[#DC0000]',
    'mclaren': 'bg-[#FF8700]',
    'alpine': 'bg-[#0090FF]',
    'astonmartin': 'bg-[#006F62]',
    'alfaromeo': 'bg-[#900000]',
    'alphatauri': 'bg-[#2B4562]',
    'racingbulls': 'bg-[#2B4562]',
    'haas': 'bg-[#FFFFFF]',
    'williams': 'bg-[#005AFF]',
    'default': 'bg-cyan-500'
  };

  const getTeamColor = () => {
    if (!team) return teamColors.default;
    return teamColors[team.toLowerCase().replace(/[^a-z0-9]/g, '')] || teamColors.default;
  };

  return (
    <Card className="relative bg-neutral-900/60 backdrop-blur-xl border-neutral-700/50 rounded-3xl overflow-hidden">
      <div className={cn("h-1", getTeamColor())}></div>
      <CardContent className="pt-6 pb-6">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-3 w-20 bg-neutral-700 rounded mb-4"></div>
            <div className="h-6 w-32 bg-neutral-700 rounded mb-2"></div>
            {subValue && <div className="h-3 w-24 bg-neutral-700 rounded"></div>}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-2">
              <div className="font-bold text-xs text-neutral-400 uppercase tracking-wider">{title}</div>
              {icon && <span className="text-cyan-400">{icon}</span>}
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
            {subValue && <div className="text-sm text-neutral-400 mt-1 font-medium">{subValue}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}