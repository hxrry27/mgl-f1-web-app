'use client';
import { useEffect } from 'react';

export function ConsoleArt() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.clear();
    
    console.log(`

%c███╗   ███╗ ██████╗ ██╗     ███████╗ ██╗
%c████╗ ████║██╔════╝ ██║     ██╔════╝███║
%c██╔████╔██║██║  ███╗██║     █████╗  ╚██║
%c██║╚██╔╝██║██║   ██║██║     ██╔══╝   ██║
%c██║ ╚═╝ ██║╚██████╔╝███████╗██║      ██║
%c╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝      ╚═╝
                                        
%c██╗   ██╗ ██╗    ██████╗     ██████╗    
%c██║   ██║███║   ██╔═████╗   ██╔═████╗   
%c██║   ██║╚██║   ██║██╔██║   ██║██╔██║   
%c╚██╗ ██╔╝ ██║   ████╔╝██║   ████╔╝██║   
%c ╚████╔╝  ██║██╗╚██████╔╝██╗╚██████╔╝   
%c  ╚═══╝   ╚═╝╚═╝ ╚═════╝ ╚═╝ ╚═════╝    
                                        
    `,
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;',
      'color: #7DF9FF; font-weight: bold; font-size: 14px;'
    );

    console.log('%c🔍 Checking out the code? Nice.', 'color: #10B981; font-size: 14px; font-weight: bold;');
  }, []);

  return null;
}