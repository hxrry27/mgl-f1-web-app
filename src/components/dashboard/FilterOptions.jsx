'use client';

import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette } from 'lucide-react';

export default function FilterOptions({
  filterOutlaps,
  filterInlaps,
  setFilterOutlaps,
  setFilterInlaps,
  displayMode,
  handleDisplayModeToggle,
  handleSelectAll,
  handleDeselectAll
}) {
  return (
    <div className="bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 space-y-4 border border-neutral-700/50">
      <div className="flex justify-between items-center border-b border-neutral-700/50 pb-4">
        <h3 className="font-black text-white">Display Options</h3>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs h-8 px-3 border-neutral-700 hover:bg-neutral-800 text-white font-bold rounded-xl"
            onClick={handleSelectAll}
          >
            All
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs h-8 px-3 border-neutral-700 hover:bg-neutral-800 text-white font-bold rounded-xl"
            onClick={handleDeselectAll}
          >
            None
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Switch 
            id="display-mode" 
            checked={displayMode === 'compound'}
            onCheckedChange={handleDisplayModeToggle}
          />
          <Label htmlFor="display-mode" className="cursor-pointer flex items-center gap-2 text-white font-medium">
            <Palette size={16} className="text-cyan-400" />
            {displayMode === 'team' ? 'Team Colors' : 'Compound Colors'}
          </Label>
        </div>
        
        <div className="flex items-center space-x-3">
          <Switch 
            id="filter-outlaps" 
            checked={filterOutlaps}
            onCheckedChange={setFilterOutlaps}
          />
          <Label htmlFor="filter-outlaps" className="cursor-pointer text-white font-medium">
            Filter Out Laps
          </Label>
        </div>
        
        <div className="flex items-center space-x-3">
          <Switch 
            id="filter-inlaps" 
            checked={filterInlaps}
            onCheckedChange={setFilterInlaps}
          />
          <Label htmlFor="filter-inlaps" className="cursor-pointer text-white font-medium">
            Filter In Laps
          </Label>
        </div>
      </div>
    </div>
  );
}