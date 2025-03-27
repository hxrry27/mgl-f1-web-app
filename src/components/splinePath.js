import * as THREE from 'three';

/**
 * Create a spline path from telemetry position data 
 * @param {Array} telemetryData - The telemetry data array
 * @param {Object} trackConfig - Track configuration settings
 * @returns {Object} - Object containing spline curve and derived data
 */
export function createSplinePath(telemetryData, trackConfig) {
  if (!telemetryData || telemetryData.length < 3) {
    console.error("Not enough data points for spline creation");
    return null;
  }
  
  // Extract position points from telemetry
  const points = telemetryData.map(data => 
    new THREE.Vector3(
      data["X [m]"] * trackConfig.miniMapScale * 1000, 
      data["Y [m]"] * trackConfig.miniMapScale * 1000,
      data["Z [m]"] * trackConfig.miniMapScale * 1000
    )
  );
  
  // Create a closed loop Catmull-Rom spline (tension 0.5 is smoother)
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
  
  // Pre-calculate curve points for performance
  // The higher this number, the smoother the curve but more expensive
  const curvePoints = curve.getPoints(telemetryData.length * 3);
  
  // Pre-calculate curve lengths for lookup
  const totalLength = curve.getLength();
  
  // Calculate time-to-distance mapping for consistent speed
  const timeDistanceMap = calculateTimeDistanceMap(telemetryData, curve);
  
  return {
    curve,
    curvePoints,
    totalLength,
    timeDistanceMap
  };
}

/**
 * Calculate a mapping between time and distance along the curve
 * This helps with consistent speed interpolation
 */
function calculateTimeDistanceMap(telemetryData, curve) {
  const timeDistanceMap = [];
  let prevPoint = null;
  let cumulativeDistance = 0;
  
  // Create a mapping between timestamp and distance along curve
  telemetryData.forEach((data, index) => {
    const position = new THREE.Vector3(data["X [m]"], data["Y [m]"], data["Z [m]"]);
    
    if (prevPoint) {
      cumulativeDistance += position.distanceTo(prevPoint);
    }
    
    timeDistanceMap.push({
      time: data["LapTime [s]"],
      distance: cumulativeDistance
    });
    
    prevPoint = position.clone();
  });
  
  return timeDistanceMap;
}

/**
 * Get position and rotation at a specific time using the spline
 * @param {Object} splinePath - The spline path data from createSplinePath
 * @param {Array} telemetryData - The original telemetry data 
 * @param {number} time - Current lap time in seconds
 * @returns {Object} - Contains position and rotation information
 */
export function getPositionAtTime(splinePath, telemetryData, time) {
  if (!splinePath || !telemetryData || telemetryData.length === 0) {
    return null;
  }
  
  const { curve, timeDistanceMap } = splinePath;
  
  // Find the two time points that our current time falls between
  let lowerIndex = 0;
  while (lowerIndex < timeDistanceMap.length - 1 && 
         timeDistanceMap[lowerIndex + 1].time < time) {
    lowerIndex++;
  }
  
  const upperIndex = Math.min(lowerIndex + 1, timeDistanceMap.length - 1);
  
  // Calculate how far we are between the two points (0-1)
  let alpha = 0;
  if (lowerIndex < upperIndex) {
    const lowerTime = timeDistanceMap[lowerIndex].time;
    const upperTime = timeDistanceMap[upperIndex].time;
    alpha = (time - lowerTime) / (upperTime - lowerTime);
  }
  
  // Clamp alpha between 0 and 1
  alpha = Math.max(0, Math.min(1, alpha));
  
  // Calculate the distance along the curve
  const lowerDistance = timeDistanceMap[lowerIndex].distance;
  const upperDistance = timeDistanceMap[upperIndex].distance;
  const interpolatedDistance = lowerDistance + (upperDistance - lowerDistance) * alpha;
  
  // Convert distance to a curve parameter (0-1)
  const totalDistance = timeDistanceMap[timeDistanceMap.length - 1].distance;
  const curveParameter = interpolatedDistance / totalDistance;
  
  // Get position from curve
  const position = curve.getPointAt(curveParameter);
  
  // Calculate tangent for rotation (this is the direction the car is facing)
  const tangent = curve.getTangentAt(curveParameter).normalize();
  
  // Calculate quaternion from tangent (assuming car forward is along X axis)
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3(1, 0, 0);
  
  // Create rotation matrix from tangent
  const matrix = new THREE.Matrix4();
  matrix.lookAt(new THREE.Vector3(), tangent, up);
  quaternion.setFromRotationMatrix(matrix);
  
  // Additional data: interpolate between the two telemetry points
  const lowerData = telemetryData[lowerIndex];
  const upperData = telemetryData[upperIndex];
  
  // Only try to interpolate if we have both data points
  const interpolatedData = {};
  if (lowerData && upperData) {
    // Interpolate simple numeric values
    for (const key in lowerData) {
      if (typeof lowerData[key] === 'number' && typeof upperData[key] === 'number') {
        interpolatedData[key] = lowerData[key] + (upperData[key] - lowerData[key]) * alpha;
      } else {
        interpolatedData[key] = lowerData[key];
      }
    }
    
    // If quaternion data is available, use quaternion interpolation
    if (lowerData.qw !== undefined && upperData.qw !== undefined) {
      const lowerQuat = new THREE.Quaternion(
        lowerData.qx, lowerData.qy, lowerData.qz, lowerData.qw
      );
      
      const upperQuat = new THREE.Quaternion(
        upperData.qx, upperData.qy, upperData.qz, upperData.qw
      );
      
      // Use slerp for smooth quaternion interpolation
      lowerQuat.slerp(upperQuat, alpha);
      
      // Store interpolated quaternion
      interpolatedData.qx = lowerQuat.x;
      interpolatedData.qy = lowerQuat.y;
      interpolatedData.qz = lowerQuat.z;
      interpolatedData.qw = lowerQuat.w;
    }
  }
  
  return {
    position,
    quaternion,
    tangent,
    interpolatedData,
    curveParameter
  };
}

/**
 * Create a visual representation of the spline path for debugging
 * @param {Object} splinePath - The spline path data
 * @param {string} color - Color of the path line
 * @returns {Object} - Three.js line object
 */
export function createSplineVisual(splinePath, color = 0x00ff00) {
  if (!splinePath) return null;
  
  const { curvePoints } = splinePath;
  
  // Create geometry from curve points
  const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
  
  // Create material
  const material = new THREE.LineBasicMaterial({ 
    color,
    linewidth: 2
  });
  
  // Create line
  return new THREE.Line(geometry, material);
}