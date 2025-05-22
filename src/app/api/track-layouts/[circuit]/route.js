import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { circuit } = req.query;
  
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
      return res.status(200).json(data);
    }
  }
  
  // If not cached or cache is old, run Python script
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'get_track_layout.py');
    
    // Execute Python script
    exec(`python ${scriptPath} ${circuit}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running script: ${error.message}`);
        // Try to use fallback data
        return useFallbackData(circuit, res);
      }
      
      if (stderr) {
        console.error(`Script error: ${stderr}`);
        return useFallbackData(circuit, res);
      }
      
      try {
        // Parse the output from Python
        const data = JSON.parse(stdout);
        
        // Cache the result
        fs.writeFileSync(cacheFile, JSON.stringify(data));
        
        return res.status(200).json(data);
      } catch (e) {
        console.error('Error parsing Python output:', e);
        return useFallbackData(circuit, res);
      }
    });
  } catch (error) {
    console.error('Error executing Python script:', error);
    return useFallbackData(circuit, res);
  }
}

// Fallback function to use static data when Python/FastF1 fails
function useFallbackData(circuit, res) {
  try {
    // Try to use pre-generated fallback data
    const fallbackPath = path.join(process.cwd(), 'data', 'track-layouts.json');
    const fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    
    if (fallbackData[circuit]) {
      return res.status(200).json({
        circuit,
        circuitLayout: fallbackData[circuit],
        fromFallback: true
      });
    } else {
      return res.status(404).json({ error: 'Track layout not found' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Could not retrieve track layout data' });
  }
}