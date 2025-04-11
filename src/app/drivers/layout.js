'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Header from '@/components/Header';
import { drivers } from '@/lib/data';
import { Users } from "lucide-react";

// Function to normalize driver names for URLs
const normalizeDriverName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function DriversLayout({ children }) {
  const pathname = usePathname();
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 bg-opacity-90 text-white">
      
      {/* Main Layout Container */}
      <div className="flex flex-grow">
        {/* Fixed Sidebar */}
        <div className="fixed top-16 left-0 w-60 h-[calc(100vh-4rem)] bg-gray-900/70 border-r border-gray-800 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Drivers</h3>
          </div>
          <Separator className="mb-4 bg-gray-800" />
          
          <nav className="space-y-1">
            {drivers.map((driver) => (
              <Link 
                key={driver}
                href={`/drivers/${normalizeDriverName(driver)}`}
                className={cn(
                  "block px-3 py-1.5 rounded-md text-sm transition-colors",
                  pathname === `/drivers/${normalizeDriverName(driver)}` ? 
                    "bg-gray-800 text-white" : 
                    "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                {driver}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow ml-60 p-6 overflow-y-auto min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}