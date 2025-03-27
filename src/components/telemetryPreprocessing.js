import * as THREE from 'three';

/**
 * Preprocess telemetry data to smooth positions, rotations and other values
 * @param {Array} rawData - The raw telemetry data array from CSV
 * @returns {Array} - Processed data with smoothed values
 */
export function preprocessTelemetryData(rawData) {
  if (!rawData || rawData.length === 0) return [];
  
  console.log("Preprocessing telemetry data...");
  console.log("Original data points:", rawData.length);
  
  // 1. Filter out invalid data points
  const validData = rawData.filter(point => (
    point["X [m]"] !== null && 
    point["Y [m]"] !== null && 
    point["Z [m]"] !== null &&
    point["LapTime [s]"] !== null
  ));
  
  // 2. Apply moving average smoothing to position data
  const positionSmoothed = smoothPositionData(validData);
  
  // 3. Apply smoothing to rotation data (if quaternion data is available)
  const rotationSmoothed = smoothRotationData(positionSmoothed);
  
  // 4. Resample data points for consistent spacing (optional)
  // This can be enabled if you want specific density of points
  // const resampledData = resampleData(rotationSmoothed, 500); // 500 points along the track
  
  console.log("Processed data points:", rotationSmoothed.length);
  return rotationSmoothed;
}

/**
 * Apply moving average smoothing to position data
 * @param {Array} data - The telemetry data
 * @param {number} windowSize - Size of the moving average window
 * @returns {Array} - Data with smoothed positions
 */
function smoothPositionData(data, windowSize = 5) {
  const result = [...data]; // Clone to avoid modifying original
  
  // Skip smoothing if not enough data points
  if (data.length <= windowSize) return data;
  
  // Apply moving average to X, Y, Z positions
  for (let i = windowSize; i < data.length - windowSize; i++) {
    let sumX = 0, sumY = 0, sumZ = 0;
    
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      sumX += data[j]["X [m]"];
      sumY += data[j]["Y [m]"];
      sumZ += data[j]["Z [m]"];
    }
    
    const count = windowSize * 2 + 1;
    
    // Apply smooth factor (blend between original and smoothed)
    const smoothFactor = 0.7; // 0 = no smoothing, 1 = full smoothing
    result[i]["X [m]"] = data[i]["X [m]"] * (1 - smoothFactor) + (sumX / count) * smoothFactor;
    result[i]["Y [m]"] = data[i]["Y [m]"] * (1 - smoothFactor) + (sumY / count) * smoothFactor;
    result[i]["Z [m]"] = data[i]["Z [m]"] * (1 - smoothFactor) + (sumZ / count) * smoothFactor;
  }
  
  // Also smooth speed and steering data if available
  if (data[0]["WoldSpeedX [km/h]"] !== undefined) {
    for (let i = windowSize; i < data.length - windowSize; i++) {
      let sumSpeedX = 0, sumSpeedZ = 0;
      
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        sumSpeedX += data[j]["WoldSpeedX [km/h]"] || 0;
        sumSpeedZ += data[j]["WoldSpeedZ [km/h]"] || 0;
      }
      
      const count = windowSize * 2 + 1;
      const smoothFactor = 0.6;
      
      result[i]["WoldSpeedX [km/h]"] = data[i]["WoldSpeedX [km/h]"] * (1 - smoothFactor) + 
                                      (sumSpeedX / count) * smoothFactor;
      result[i]["WoldSpeedZ [km/h]"] = data[i]["WoldSpeedZ [km/h]"] * (1 - smoothFactor) + 
                                      (sumSpeedZ / count) * smoothFactor;
    }
  }
  
  return result;
}

/**
 * Apply smoothing to rotation data 
 * @param {Array} data - The telemetry data
 * @param {number} windowSize - Window size for smoothing
 * @returns {Array} - Data with smoothed rotations
 */
function smoothRotationData(data, windowSize = 3) {
  const result = [...data]; // Clone data
  
  // Skip smoothing if not enough data points
  if (data.length <= windowSize) return data;
  
  // Check if we have quaternion data
  const hasQuaternions = data[0]["qw"] !== undefined;
  
  if (hasQuaternions) {
    // For quaternions, we need to do proper quaternion interpolation
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const quaternions = [];
      
      // Collect quaternions in window
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        quaternions.push(
          new THREE.Quaternion(
            data[j]["qx"], 
            data[j]["qy"], 
            data[j]["qz"], 
            data[j]["qw"]
          )
        );
      }
      
      // Average the quaternions
      const averageQuat = new THREE.Quaternion();
      const smoothFactor = 0.6;
      
      // Use THREE.js quaternion slerp to blend between original and averaged
      for (let j = 0; j < quaternions.length; j++) {
        if (j === 0) {
          averageQuat.copy(quaternions[j]);
        } else {
          // Weight is 1/count for simple average
          THREE.Quaternion.slerp(
            averageQuat, 
            quaternions[j], 
            averageQuat, 
            1 / (j + 1)
          );
        }
      }
      
      // Blend between original and averaged quaternion
      const originalQuat = new THREE.Quaternion(
        data[i]["qx"], data[i]["qy"], data[i]["qz"], data[i]["qw"]
      );
      
      originalQuat.slerp(averageQuat, smoothFactor);
      
      // Save back to result
      result[i]["qx"] = originalQuat.x;
      result[i]["qy"] = originalQuat.y;
      result[i]["qz"] = originalQuat.z;
      result[i]["qw"] = originalQuat.w;
    }
  }
  // If we don't have quaternions, we might smooth steering data instead
  else if (data[0]["steering"] !== undefined) {
    for (let i = windowSize; i < data.length - windowSize; i++) {
      let sumSteering = 0;
      
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        sumSteering += data[j]["steering"];
      }
      
      const count = windowSize * 2 + 1;
      const smoothFactor = 0.7;
      
      result[i]["steering"] = data[i]["steering"] * (1 - smoothFactor) + 
                             (sumSteering / count) * smoothFactor;
    }
  }
  
  return result;
}

/**
 * Resample data to have consistent spacing (optional)
 * @param {Array} data - The telemetry data
 * @param {number} targetPoints - Target number of points in the result
 * @returns {Array} - Resampled data with consistent spacing
 */
function resampleData(data, targetPoints) {
  // This is more complex and would require path interpolation
  // For now, I'll leave it as a placeholder
  
  // The basic idea is to:
  // 1. Create a spline path from position data
  // 2. Calculate the total path length
  // 3. Sample new points at even intervals along the path
  // 4. Interpolate all data values (rotation, steering, etc.) at those new points
  
  return data; // For now, return unmodified data
}