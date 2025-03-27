import * as THREE from 'three';

/**
 * Apply physics-like effects to enhance visual realism
 * @param {Object} carRef - Reference to the car Three.js object
 * @param {Object} wheelsRef - References to the car's wheels
 * @param {Object} data - Current telemetry data point
 * @param {number} deltaTime - Time since last frame in seconds
 * @param {number} speed - Current playback speed
 */
export function applyPhysicsEffects(carRef, wheelsRef, data, deltaTime, speed) {
  if (!carRef || !data) return;
  
  // Get telemetry values
  const carSpeed = data.speed || 0; // km/h
  const steeringAngle = data.steering || 0;
  
  // 1. Apply suspension effects (subtle up/down movement)
  applySuspensionEffects(carRef, carSpeed, deltaTime);
  
  // 2. Apply weight transfer effects (pitch forward on braking, back on acceleration)
  applyWeightTransferEffects(carRef, data, deltaTime);
  
  // 3. Apply wheel rotation based on speed
  if (wheelsRef) {
    applyWheelRotation(wheelsRef, carSpeed, deltaTime, speed);
  }
  
  // 4. Apply subtle vibration/shake at high speeds
  applySpeedVibration(carRef, carSpeed, deltaTime);
}

/**
 * Apply subtle suspension movement effects
 */
function applySuspensionEffects(carRef, speed, deltaTime) {
  // Create a subtle bobbing movement that scales with speed
  // Higher speed = higher frequency, lower amplitude
  
  // Get current time for oscillation
  const time = performance.now() * 0.001;
  
  // Calculate oscillation parameters based on speed
  const speedFactor = Math.min(1, speed / 100); // Normalize speed (0-1)
  const frequency = 3 + speedFactor * 7; // Oscillation frequency increases with speed (3-10Hz)
  const baseAmplitude = 0.03; // Base oscillation amplitude
  const amplitude = baseAmplitude * (1 - speedFactor * 0.7); // Decreases with speed
  
  // Apply different oscillations for front and rear suspension
  // This simulates the car's front and rear suspension moving semi-independently
  const frontOscillation = Math.sin(time * frequency) * amplitude;
  const rearOscillation = Math.sin(time * frequency + 0.6) * amplitude; // Slight phase shift
  
  // Apply to car's pitch (rotation around X axis)
  // This subtly tilts the car forward and backward
  const pitchAngle = (frontOscillation - rearOscillation) * 0.8;
  
  // Apply a very subtle roll oscillation (side to side)
  const rollFrequency = 2.5 + speedFactor * 5;
  const rollAmplitude = 0.01 * (1 - speedFactor * 0.5);
  const rollOscillation = Math.sin(time * rollFrequency + 1.5) * rollAmplitude;
  
  // Apply these subtle movements to the car
  // We don't want to override other rotations, so we add to existing rotation
  carRef.rotation.x += pitchAngle;
  carRef.rotation.z += rollOscillation;
  
  // Apply a very subtle vertical movement
  const verticalMovement = (frontOscillation + rearOscillation) * 0.5;
  carRef.position.y += verticalMovement;
}

/**
 * Apply weight transfer effects (pitch forward on braking, back on acceleration)
 */
function applyWeightTransferEffects(carRef, data, deltaTime) {
  // For this we need acceleration data, which can be derived from speed changes
  // This would be better with actual acceleration data, but we can approximate
  
  // Keep track of previous speed to calculate acceleration
  if (!carRef.userData.prevSpeed) {
    carRef.userData.prevSpeed = data.speed || 0;
    return;
  }
  
  const currentSpeed = data.speed || 0;
  const previousSpeed = carRef.userData.prevSpeed;
  
  // Calculate acceleration (change in speed per second)
  const acceleration = (currentSpeed - previousSpeed) / deltaTime;
  
  // Update previous speed for next frame
  carRef.userData.prevSpeed = currentSpeed;
  
  // Apply pitch effect based on acceleration
  // Negative acceleration (braking) = pitch forward
  // Positive acceleration = pitch backward
  const maxPitchAngle = 0.03; // radians
  const pitchFactor = Math.max(-1, Math.min(1, acceleration / 100)); // normalize to -1 to 1
  const targetPitch = -pitchFactor * maxPitchAngle; // Negate to get correct direction
  
  // Smooth pitch transition
  if (!carRef.userData.currentPitch) carRef.userData.currentPitch = 0;
  
  // Interpolate current pitch toward target
  const pitchLerpFactor = 0.1; // how quickly the pitch changes
  carRef.userData.currentPitch += (targetPitch - carRef.userData.currentPitch) * pitchLerpFactor;
  
  // Apply the pitch rotation
  carRef.rotation.x = carRef.userData.currentPitch;
}

/**
 * Apply wheel rotation based on speed
 */
function applyWheelRotation(wheelsRef, speed, deltaTime, playbackSpeed) {
  // Speed is in km/h, convert to radians per second for wheel rotation
  // Assuming 0.35m wheel radius
  const wheelRadius = 0.35; // meters
  const wheelCircumference = 2 * Math.PI * wheelRadius;
  const metersPerSecond = speed * 1000 / 3600; // convert km/h to m/s
  
  // Calculate rotation speed in radians per second
  const rotationSpeed = metersPerSecond / wheelCircumference * (2 * Math.PI);
  
  // Apply rotation increment based on delta time and playback speed
  const rotationIncrement = rotationSpeed * deltaTime * playbackSpeed;
  
  // Apply rotation to each wheel
  if (wheelsRef.frontLeftTyre) wheelsRef.frontLeftTyre.rotation.x += rotationIncrement;
  if (wheelsRef.frontRightTyre) wheelsRef.frontRightTyre.rotation.x += rotationIncrement;
  if (wheelsRef.backLeftTyre) wheelsRef.backLeftTyre.rotation.x += rotationIncrement;
  if (wheelsRef.backtRightTyre) wheelsRef.backtRightTyre.rotation.x += rotationIncrement;
  
  // If we have wheel mesh objects separate from tires, apply to them too
  if (wheelsRef.frontLeftWheel) wheelsRef.frontLeftWheel.rotation.x += rotationIncrement;
  if (wheelsRef.frontRightWheel) wheelsRef.frontRightWheel.rotation.x += rotationIncrement;
  if (wheelsRef.backLeftWheel) wheelsRef.backLeftWheel.rotation.x += rotationIncrement;
  if (wheelsRef.backRightWheel) wheelsRef.backRightWheel.rotation.x += rotationIncrement;
}

/**
 * Apply subtle vibration/shake at high speeds
 */
function applySpeedVibration(carRef, speed, deltaTime) {
  // Only apply vibration at higher speeds
  if (speed < 150) return;
  
  // Calculate vibration intensity based on speed
  const maxVibration = 0.003; // maximum amount of vibration
  const speedFactor = Math.min(1, (speed - 150) / 150); // 0 at 150km/h, 1 at 300km/h
  const vibrationIntensity = maxVibration * speedFactor;
  
  // Use noise for random but smooth vibration
  const time = performance.now() * 0.01;
  
  // Simple noise function (you could use a proper noise library for better results)
  const noise = () => Math.sin(time * 73.129) * Math.cos(time * 19.723) * 0.5 + 0.5;
  
  // Apply subtle random offsets to position
  carRef.position.x += (noise() * 2 - 1) * vibrationIntensity;
  carRef.position.y += (noise() * 2 - 1) * vibrationIntensity * 0.8;
  carRef.position.z += (noise() * 2 - 1) * vibrationIntensity;
  
  // Apply subtle random rotation vibrations
  const rotationVibration = vibrationIntensity * 0.3;
  carRef.rotation.x += (noise() * 2 - 1) * rotationVibration;
  carRef.rotation.y += (noise() * 2 - 1) * rotationVibration * 0.5;
  carRef.rotation.z += (noise() * 2 - 1) * rotationVibration * 0.7;
}