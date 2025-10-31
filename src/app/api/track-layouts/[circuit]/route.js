import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { circuit } = params;
  
  // Check cache first
  const cacheDir = path.join(process.cwd(), 'cache', 'tracks');
  const cacheFile = path.join(cacheDir, `${circuit}.json`);
  
  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // If cached data exists and is less than 7 days old, use it
  if (fs.existsSync(cacheFile)) {
    const stats = fs.statSync(cacheFile);
    const cacheAge = Date.now() - stats.mtimeMs;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (cacheAge < maxAge) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return NextResponse.json(data);
    }
  }
  
  // If not cached or cache is old, run Python script
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'get_track_layout.py');
    
    // Promisify exec
    const result = await new Promise((resolve, reject) => {
      exec(`python ${scriptPath} ${circuit}`, (error, stdout, stderr) => {
        if (error || stderr) {
          reject(error || new Error(stderr));
        } else {
          resolve(stdout);
        }
      });
    });
    
    // Parse the output from Python
    const data = JSON.parse(result);
    
    // Cache the result
    fs.writeFileSync(cacheFile, JSON.stringify(data));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error executing Python script:', error);
    return getFallbackData(circuit);
  }
}

// Fallback function to use static data when Python/FastF1 fails
function getFallbackData(circuit) {
  try {
    // Try to use pre-generated fallback data
    const fallbackPath = path.join(process.cwd(), 'data', 'track-layouts.json');
    const fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    
    if (fallbackData[circuit]) {
      return NextResponse.json({
        circuit,
        circuitLayout: fallbackData[circuit],
        fromFallback: true
      });
    } else {
      return NextResponse.json({ error: 'Track layout not found' }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Could not retrieve track layout data' }, { status: 500 });
  }
}