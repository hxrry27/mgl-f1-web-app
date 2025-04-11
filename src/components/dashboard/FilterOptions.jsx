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
    <div className="bg-gray-900/30 rounded-lg p-4 space-y-4 border border-gray-800">
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 className="font-semibold text-white">Display Options</h3>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs h-7 px-2 border-gray-700 hover:bg-gray-800"
            onClick={handleSelectAll}
          >
            All
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs h-7 px-2 border-gray-700 hover:bg-gray-800"
            onClick={handleDeselectAll}
          >
            None
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch 
            id="display-mode" 
            checked={displayMode === 'compound'}
            onCheckedChange={handleDisplayModeToggle}
          />
          <Label htmlFor="display-mode" className="cursor-pointer flex items-center gap-2">
            <Palette size={16} className="text-gray-400" />
            {displayMode === 'team' ? 'Team Colors' : 'Compound Colors'}
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="filter-outlaps" 
            checked={filterOutlaps}
            onCheckedChange={setFilterOutlaps}
          />
          <Label htmlFor="filter-outlaps" className="cursor-pointer">
            Filter Out Laps
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="filter-inlaps" 
            checked={filterInlaps}
            onCheckedChange={setFilterInlaps}
          />
          <Label htmlFor="filter-inlaps" className="cursor-pointer">
            Filter In Laps
          </Label>
        </div>
      </div>
    </div>
  );
}