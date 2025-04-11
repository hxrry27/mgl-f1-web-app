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
    'mercedes': 'bg-[#00D2BE] text-black',
    'redbull': 'bg-[#0600EF] text-white',
    'ferrari': 'bg-[#DC0000] text-white',
    'mclaren': 'bg-[#FF8700] text-black',
    'alpine': 'bg-[#0090FF] text-white',
    'astonmartin': 'bg-[#006F62] text-white',
    'alfaromeo': 'bg-[#900000] text-white',
    'alphatauri': 'bg-[#2B4562] text-white',
    'racingbulls': 'bg-[#2B4562] text-white',
    'haas': 'bg-[#FFFFFF] text-black',
    'williams': 'bg-[#005AFF] text-white',
    'default': 'bg-gray-800 text-white'
  };

  const getTeamColor = () => {
    if (!team) return teamColors.default;
    return teamColors[team.toLowerCase().replace(/[^a-z0-9]/g, '')] || teamColors.default;
  };

  return (
    <Card className="bg-gray-900/60 border-gray-800 overflow-hidden">
      <div className={cn("h-1", getTeamColor())}></div>
      <CardContent className="pt-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-3 w-16 bg-gray-700 rounded mb-3"></div>
            <div className="h-5 w-32 bg-gray-700 rounded mb-2"></div>
            {subValue && <div className="h-3 w-24 bg-gray-700 rounded"></div>}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div className="font-medium text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</div>
              {icon && <span className="text-blue-500">{icon}</span>}
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
            {subValue && <div className="text-sm text-gray-400 mt-1">{subValue}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}