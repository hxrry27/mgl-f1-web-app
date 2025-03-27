'use client'

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Papa from 'papaparse';
import { applyPhysicsEffects } from './physicsEffects';

import { preprocessTelemetryData } from './telemetryPreprocessing';
import { createSplinePath, getPositionAtTime, createSplineVisual } from './splinePath';

// Track configuration
const trackConfigs = {
  "silverstone": {
    name: "Great Britain",
    trackId: "07",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 1.5708, y: 0, z: 0 },
    miniMapScale: 0.0002,
    miniMapPosition: { x: -50, y: 85, z: 0 },
    miniMapPositionMobile: { x: -136.66, y: 85, z: 4.71 },
    miniMapRotation: { x: -1.233, y: 0, z: 1.5 },
    leftFactor: -0.24,
    bottomFactor: 0.54,
  }
};

// Camera layers for visibility control
const cameraLayers = {
  all: 0,
  mainTrack: 1,
  miniMap: 2,
};

// Constants for steering effects
const STEERING_SENSITIVITY = 35;
const FRONT_WHEEL_STEERING_SENSITIVITY = 275;

// Wheel structures for the F1 car
const car1Wheels = {
  frontLeftTyre: null,
  frontRightTyre: null,
  backLeftTyre: null,
  backtRightTyre: null,
  frontLeftWheel: null,
  frontRightWheel: null,
  backLeftWheel: null,
  backRightWheel: null,
  LeftFin: null,
  RightFin: null,
};

let car1SteeringWheelModel = null;

// F1 Car component
const F1Car = () => {
  const { scene } = useGLTF("/models/f1-car.glb");
  const carRef = useRef();
  
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }

        // Capture steering wheel and wheel references
        if (child.name === "steer_master") {
          car1SteeringWheelModel = child;
        }
        
        // Capture wheels
        if (child.name === "x0_tyre_fl") car1Wheels.frontLeftTyre = child;
        if (child.name === "x0_tyre_fr") car1Wheels.frontRightTyre = child;
        if (child.name === "x0_tyre_bl") car1Wheels.backLeftTyre = child;
        if (child.name === "x0_tyre_br") car1Wheels.backtRightTyre = child;
        
        if (child.name === "x6_wheel_fl_shadow") car1Wheels.frontLeftWheel = child;
        if (child.name === "x6_wheel_fr_shadow") car1Wheels.frontRightWheel = child;
        if (child.name === "x6_wheel_bl_shadow") car1Wheels.backLeftWheel = child;
        if (child.name === "x6_wheel_br_shadow") car1Wheels.backRightWheel = child;
        
        if (child.name === "x6_suspension_fin_fl_shadow") car1Wheels.LeftFin = child;
        if (child.name === "x6_suspension_fin_fr_shadow") car1Wheels.RightFin = child;
      });
    }
  }, [scene]);

  return (
    <primitive
      ref={carRef}
      object={scene}
      scale={[0.002, 0.002, 0.002]}
    />
  );
};

// Track component using GLB model
const Track = ({ trackId }) => {
  const config = trackConfigs["silverstone"];
  const [model, setModel] = useState(null);
  const trackRef = useRef();

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      `/models/tracks/${trackId}.glb`, 
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.receiveShadow = true;
            child.material.roughness = 0.8;
            child.material.metalness = 0.2;
          }
        });
        setModel(gltf.scene);
      },
      (progress) => {
        console.log(`Loading track: ${(progress.loaded / progress.total) * 100}%`);
      },
      (error) => {
        console.error("Error loading track model:", error);
      }
    );
  }, [trackId]);

  if (!model) {
    return null;
  }

  return (
    <group
      ref={trackRef}
      position={[config.position.x, config.position.y, config.position.z]}
      rotation={[config.rotation.x, config.rotation.y, config.rotation.z]}
      scale={config.miniMapScale * 1000}
    >
      <primitive object={model} />
    </group>
  );
};

// Point marker component
const PointMarker = ({ telemetryData, pointIndex, trackConfig }) => {
  if (!telemetryData || !telemetryData[pointIndex]) return null;
  
  const data = telemetryData[pointIndex];
  
  return (
    <mesh 
      position={[
        data["X [m]"] * trackConfig.miniMapScale * 1000,
        data["Y [m]"] * trackConfig.miniMapScale * 1000 + 2,
        data["Z [m]"] * trackConfig.miniMapScale * 1000
      ]}
    >
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#FF5733" emissive="#FF5733" emissiveIntensity={0.5} />
    </mesh>
  );
};

// Main scene with animation - fixed hooks order
const AnimatedScene = ({ 
  speed, 
  isPlaying, 
  progress, 
  setProgress, 
  onProgressUpdate,
  telemetryData,
  currentPointIndex,
  passedUseSplineInterpolation,
  passedSplinePath
}) => {
  // All refs first
  const carRef = useRef();
  const lastFrameTime = useRef(0);
  const animationTimeRef = useRef(0);
  const currentDataIndex = useRef(0);
  const deltaTimeRef = useRef(0);
  
  // All state variables
  const [processedTelemetry, setProcessedTelemetry] = useState([]);
  const [splinePath, setSplinePath] = useState(null);
  const [splineVisual, setSplineVisual] = useState(null);
  const [useSplineInterpolation, setUseSplineInterpolation] = useState(!!passedUseSplineInterpolation);
  
  // Access track config
  const trackConfig = trackConfigs["silverstone"];

  // Process telemetry data
  useEffect(() => {
    if (!telemetryData || telemetryData.length === 0) return;
    
    setProcessedTelemetry(telemetryData);
    
    if (passedSplinePath) {
      setSplinePath(passedSplinePath);
    } else if (telemetryData.length > 0) {
      const newSplinePath = createSplinePath(telemetryData, trackConfig);
      setSplinePath(newSplinePath);
    }
  }, [telemetryData, trackConfig, passedSplinePath]);
  
  // Create visual for spline path
  useEffect(() => {
    if (splinePath) {
      const visual = createSplineVisual(splinePath, "#3AD8F6");
      setSplineVisual(visual);
    }
  }, [splinePath]);
  
  // Handle play state changes
  useEffect(() => {
    if (!processedTelemetry || processedTelemetry.length === 0) return;
    
    if (isPlaying) {
      // When starting to play, initialize the animation timer based on current position
      if (currentPointIndex >= 0 && currentPointIndex < processedTelemetry.length) {
        animationTimeRef.current = processedTelemetry[currentPointIndex]["LapTime [s]"];
      } else {
        animationTimeRef.current = 0;
      }
      lastFrameTime.current = 0; // Will be set on first frame
    }
  }, [isPlaying, currentPointIndex, processedTelemetry]);
  
  // Handle stepping mode
  useEffect(() => {
    if (!processedTelemetry || processedTelemetry.length === 0) return;
    
    if (!isPlaying && currentPointIndex !== undefined) {
      currentDataIndex.current = currentPointIndex;
    }
  }, [currentPointIndex, isPlaying, processedTelemetry]);
  
  // Sync with parent component's state
  useEffect(() => {
    setUseSplineInterpolation(!!passedUseSplineInterpolation);
  }, [passedUseSplineInterpolation]);
  
  // Update car position using spline path
  const updateCarWithSpline = (time) => {
    if (!carRef.current || !splinePath || !processedTelemetry || processedTelemetry.length === 0) return;
    
    // Get position, rotation, and interpolated data at current time
    const result = getPositionAtTime(splinePath, processedTelemetry, time);
    if (!result) return;
    
    const { position, quaternion, interpolatedData } = result;
    
    // Apply position and rotation to car
    carRef.current.position.copy(position);
    carRef.current.quaternion.copy(quaternion);
    
    // Apply steering wheel rotation if available in the interpolated data
    if (interpolatedData.steering !== undefined && car1SteeringWheelModel) {
      const steeringAngle = (interpolatedData.steering / STEERING_SENSITIVITY) * -1;
      const steeringEuler = new THREE.Euler(0, 0, steeringAngle);
      car1SteeringWheelModel.setRotationFromEuler(steeringEuler);
      
      // Apply front wheel steering
      const frontWheelAngle = interpolatedData.steering / FRONT_WHEEL_STEERING_SENSITIVITY;
      const frontWheelEuler = new THREE.Euler(0, frontWheelAngle, 0);
      
      // Apply to all wheels with null checks
      if (car1Wheels?.LeftFin) car1Wheels.LeftFin.setRotationFromEuler(frontWheelEuler);
      if (car1Wheels?.RightFin) car1Wheels.RightFin.setRotationFromEuler(frontWheelEuler);
      if (car1Wheels?.frontLeftTyre) car1Wheels.frontLeftTyre.setRotationFromEuler(frontWheelEuler);
      if (car1Wheels?.frontRightTyre) car1Wheels.frontRightTyre.setRotationFromEuler(frontWheelEuler);
      if (car1Wheels?.frontLeftWheel) car1Wheels.frontLeftWheel.setRotationFromEuler(frontWheelEuler);
      if (car1Wheels?.frontRightWheel) car1Wheels.frontRightWheel.setRotationFromEuler(frontWheelEuler);
    }
    
    // Apply physics-like effects for added realism
    try {
      applyPhysicsEffects(carRef.current, car1Wheels, interpolatedData, deltaTimeRef.current, speed);
    } catch (error) {
      console.warn("Could not apply physics effects:", error);
    }
  };
  
  // Standard linear interpolation between points
  const updateCarWithLinearInterpolation = (currentIndex, nextIndex, alpha) => {
    if (!carRef.current || !processedTelemetry || 
        !processedTelemetry[currentIndex] || !processedTelemetry[nextIndex]) return;
    
    // Get current and next data points
    const currentData = processedTelemetry[currentIndex];
    const nextData = processedTelemetry[nextIndex];
    
    // Extract positions from telemetry
    const currentPos = new THREE.Vector3(
      currentData["X [m]"] * trackConfig.miniMapScale * 1000,
      currentData["Y [m]"] * trackConfig.miniMapScale * 1000,
      currentData["Z [m]"] * trackConfig.miniMapScale * 1000
    );
    
    const nextPos = new THREE.Vector3(
      nextData["X [m]"] * trackConfig.miniMapScale * 1000,
      nextData["Y [m]"] * trackConfig.miniMapScale * 1000,
      nextData["Z [m]"] * trackConfig.miniMapScale * 1000
    );
    
    // Apply position with linear interpolation
    carRef.current.position.lerpVectors(currentPos, nextPos, alpha);
    
    // Handle rotation - using quaternions if available, otherwise speed vectors
    if (currentData["qw"] !== undefined && currentData["qx"] !== undefined &&
        nextData["qw"] !== undefined && nextData["qx"] !== undefined) {
      
      // Create quaternions for both data points
      const currentQuat = new THREE.Quaternion(
        currentData["qx"], 
        currentData["qy"], 
        currentData["qz"], 
        currentData["qw"]
      );
      
      const nextQuat = new THREE.Quaternion(
        nextData["qx"], 
        nextData["qy"], 
        nextData["qz"], 
        nextData["qw"]
      );
      
      // Spherical interpolation between quaternions
      carRef.current.quaternion.slerpQuaternions(currentQuat, nextQuat, alpha);
    } else {
      // If quaternions not available, use speed vectors for direction
      const currentDirX = currentData["WoldSpeedX [km/h]"] || 0;
      const currentDirZ = currentData["WoldSpeedZ [km/h]"] || 0;
      const nextDirX = nextData["WoldSpeedX [km/h]"] || 0;
      const nextDirZ = nextData["WoldSpeedZ [km/h]"] || 0;
      
      // If speed is very low, use the position difference for orientation
      const usePositionDiff = (Math.abs(currentDirX) + Math.abs(currentDirZ) < 1);
      
      let currentAngle, nextAngle;
      
      if (usePositionDiff) {
        // Calculate direction from position difference
        const dirVec = nextPos.clone().sub(currentPos);
        currentAngle = Math.atan2(dirVec.z, dirVec.x);
        nextAngle = currentAngle;
      } else {
        // Calculate angles from direction vectors
        currentAngle = Math.atan2(currentDirZ, currentDirX);
        nextAngle = Math.atan2(nextDirZ, nextDirX);
      }
      
      // Need to handle angle wrapping
      let angleDiff = nextAngle - currentAngle;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      // Apply interpolated angle
      carRef.current.rotation.y = currentAngle + angleDiff * alpha;
    }
    
    // Interpolate steering data for wheel rotation
    if (currentData.steering !== undefined && nextData.steering !== undefined) {
      const interpolatedSteering = currentData.steering + (nextData.steering - currentData.steering) * alpha;
      
      // Create interpolated data object for physics effects
      const interpolatedData = {
        steering: interpolatedSteering,
        speed: currentData.speed + (nextData.speed - currentData.speed) * alpha
      };
      
      // Apply physics-like effects
      try {
        applyPhysicsEffects(carRef.current, car1Wheels, interpolatedData, deltaTimeRef.current, speed);
      } catch (error) {
        console.warn("Could not apply physics effects:", error);
      }
    }
  };
  
  // Main update loop in play mode
  useFrame(({ clock }) => {
    if (!isPlaying || !processedTelemetry || processedTelemetry.length === 0) {
      lastFrameTime.current = clock.getElapsedTime();
      return;
    }
    
    // Calculate delta time with speed modifier
    const currentTime = clock.getElapsedTime();
    if (lastFrameTime.current === 0) {
      lastFrameTime.current = currentTime;
      return;
    }
    
    const deltaTime = (currentTime - lastFrameTime.current) * speed;
    lastFrameTime.current = currentTime;
    deltaTimeRef.current = deltaTime;
    
    // Skip if delta time is too large
    if (deltaTime > 0.1) {
      return;
    }
    
    // Update animation time
    animationTimeRef.current += deltaTime;
    
    // Get the total lap time for progress calculation
    const totalLapTime = processedTelemetry[processedTelemetry.length - 1]["LapTime [s]"];
    
    // Loop back to beginning if we've reached the end
    if (animationTimeRef.current > totalLapTime) {
      animationTimeRef.current = 0;
    }
    
    // Calculate progress and update UI
    const newProgress = animationTimeRef.current / totalLapTime;
    setProgress(newProgress);
    onProgressUpdate(newProgress);
    
    // Update car position based on chosen interpolation method
    if (useSplineInterpolation && splinePath) {
      // Use spline interpolation
      updateCarWithSpline(animationTimeRef.current);
    } else {
      // Use standard linear interpolation
      
      // Find the current data index based on animation time
      let currentIndex = 0;
      while (currentIndex < processedTelemetry.length - 1 && 
             processedTelemetry[currentIndex + 1]["LapTime [s]"] < animationTimeRef.current) {
        currentIndex++;
      }
      
      // Update the current data index
      currentDataIndex.current = currentIndex;
      
      // Calculate interpolation factor between current and next point
      let alpha = 0;
      if (currentIndex < processedTelemetry.length - 1) {
        const currentPointTime = processedTelemetry[currentIndex]["LapTime [s]"];
        const nextPointTime = processedTelemetry[currentIndex + 1]["LapTime [s]"];
        const timeDiff = nextPointTime - currentPointTime;
        
        if (timeDiff > 0) {
          alpha = (animationTimeRef.current - currentPointTime) / timeDiff;
          alpha = Math.max(0, Math.min(1, alpha)); // Clamp between 0 and 1
        }
        
        // Apply position and rotation with smooth interpolation
        const nextIndex = currentIndex < processedTelemetry.length - 1 ? currentIndex + 1 : 0;
        updateCarWithLinearInterpolation(currentIndex, nextIndex, alpha);
      } else {
        // If we're at the last point, interpolate to the first point
        updateCarWithLinearInterpolation(currentIndex, 0, 0);
      }
    }
  });
  
  // Handle stepping mode (when not playing)
  useFrame(() => {
    if (isPlaying || !processedTelemetry || processedTelemetry.length === 0) {
      return;
    }
    
    // In stepping mode, just position the car at the exact data point
    if (!carRef.current || !processedTelemetry[currentPointIndex]) return;
    
    if (useSplineInterpolation && splinePath) {
      // Use spline-based positioning even in stepping mode
      updateCarWithSpline(processedTelemetry[currentPointIndex]["LapTime [s]"]);
    } else {
      // Use direct positioning
      const data = processedTelemetry[currentPointIndex];
      
      // Extract position from telemetry
      const x = data["X [m]"];
      const y = data["Y [m]"];
      const z = data["Z [m]"];
      
      // Apply position - using the track's scale to match the track model
      carRef.current.position.set(
        x * trackConfig.miniMapScale * 1000, 
        y * trackConfig.miniMapScale * 1000, 
        z * trackConfig.miniMapScale * 1000
      );
      
      // Calculate rotation - using the direction of travel
      if (data["qw"] !== undefined && data["qx"] !== undefined) {
        // If we have quaternion data, use it
        carRef.current.quaternion.set(data["qx"], data["qy"], data["qz"], data["qw"]);
      } else if (data["WoldSpeedX [km/h]"] !== undefined && data["WoldSpeedZ [km/h]"] !== undefined) {
        // If we have speed vectors, calculate rotation
        const directionX = data["WoldSpeedX [km/h]"];
        const directionZ = data["WoldSpeedZ [km/h]"];
        
        if (Math.abs(directionX) + Math.abs(directionZ) > 1) {
          // Only rotate if we have meaningful direction data
          const angle = Math.atan2(directionZ, directionX);
          carRef.current.rotation.y = angle;
        } else if (currentPointIndex < processedTelemetry.length - 1) {
          // If speed is too low, use position difference with next point
          const nextData = processedTelemetry[currentPointIndex + 1];
          const dx = nextData["X [m]"] - data["X [m]"];
          const dz = nextData["Z [m]"] - data["Z [m]"];
          if (Math.abs(dx) + Math.abs(dz) > 0.1) {
            carRef.current.rotation.y = Math.atan2(dz, dx);
          }
        }
      }
      
      // Apply steering for wheels
      if (data.steering !== undefined) {
        // Apply physics-like effects even in stepping mode
        try {
          applyPhysicsEffects(carRef.current, car1Wheels, data, 0.016, 1); // Use a small fixed deltaTime
        } catch (error) {
          console.warn("Could not apply physics effects:", error);
        }
      }
    }
  });
  
  if (!processedTelemetry || processedTelemetry.length === 0) {
    return null;
  }
  
  // Calculate initial position index
  const initialIndex = isPlaying 
    ? Math.min(Math.floor(processedTelemetry.length * progress), processedTelemetry.length - 1)
    : (currentPointIndex || 0);
    
  const initialData = processedTelemetry[initialIndex];
  
  return (
    <>
      {/* Use "07" as the trackId for Silverstone */}
      <Track trackId="07" />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      <group 
        ref={carRef} 
        position={[
          initialData["X [m]"] * trackConfig.miniMapScale * 1000,
          initialData["Y [m]"] * trackConfig.miniMapScale * 1000,
          initialData["Z [m]"] * trackConfig.miniMapScale * 1000
        ]}
      >
        <F1Car />
      </group>
      
      {/* Marker for current point */}
      <PointMarker 
        telemetryData={processedTelemetry}
        pointIndex={isPlaying ? currentDataIndex.current : currentPointIndex}
        trackConfig={trackConfig}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 50, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
      />
      <hemisphereLight args={['#ffffff', '#303030', 0.5]} />
      
      {/* Telemetry path */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={processedTelemetry.length}
            array={new Float32Array(
              processedTelemetry.map(data => [
                data["X [m]"] * trackConfig.miniMapScale * 1000, 
                data["Y [m]"] * trackConfig.miniMapScale * 1000, 
                data["Z [m]"] * trackConfig.miniMapScale * 1000
              ]).flat()
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3AD8F6" linewidth={3} />
      </line>
      
      {/* Show spline path visualization when using spline mode */}
      {splineVisual && useSplineInterpolation && (
        <primitive object={splineVisual} />
      )}
    </>
  );
};

// UI components (outside Three.js canvas)
const ProgressBar = ({ progress, onSeek }) => (
  <div 
    style={{
      position: "absolute",
      bottom: "20px",
      left: "20px",
      right: "20px",
      height: "8px",
      backgroundColor: "#333",
      borderRadius: "4px",
      cursor: "pointer"
    }}
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newProgress = clickX / rect.width;
      onSeek(newProgress);
    }}
  >
    <div 
      style={{
        height: "100%",
        width: `${progress * 100}%`,
        backgroundColor: "#3AD8F6",
        borderRadius: "4px",
        transition: "width 0.1s ease-out"
      }}
    />
  </div>
);

const SpeedControls = ({ currentSpeed, onSpeedChange }) => (
  <div style={{
    position: "absolute",
    bottom: "40px",
    left: "20px",
    display: "flex",
    gap: "8px"
  }}>
    {[0.25, 0.5, 1, 2, 4].map(speed => (
      <button 
        key={speed}
        style={{
          padding: "8px 12px",
          backgroundColor: currentSpeed === speed ? "#3AD8F6" : "#333",
          color: currentSpeed === speed ? "#000" : "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
        onClick={() => onSpeedChange(speed)}
      >
        {speed}x
      </button>
    ))}
  </div>
);

const PlayPauseButton = ({ isPlaying, onToggle }) => (
  <button
    style={{
      position: "absolute",
      bottom: "40px",
      right: "20px",
      padding: "8px 16px",
      backgroundColor: "#333",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer"
    }}
    onClick={onToggle}
  >
    {isPlaying ? "Pause" : "Play"}
  </button>
);

const StepButtons = ({ onPrevious, onNext }) => (
  <div style={{
    position: "absolute",
    bottom: "40px",
    right: "120px",
    display: "flex",
    gap: "8px"
  }}>
    <button
      style={{
        padding: "8px 16px",
        backgroundColor: "#333",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
      }}
      onClick={onPrevious}
    >
      Previous
    </button>
    <button
      style={{
        padding: "8px 16px",
        backgroundColor: "#333",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
      }}
      onClick={onNext}
    >
      Next
    </button>
  </div>
);

const InterpolationToggle = ({ useSplineInterpolation, onToggle }) => (
  <div 
    style={{
      position: "absolute",
      top: "20px",
      right: "20px",
      padding: "8px 16px",
      backgroundColor: useSplineInterpolation ? "#3AD8F6" : "#333",
      color: useSplineInterpolation ? "#000" : "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
    }}
    onClick={onToggle}
  >
    {useSplineInterpolation ? "Spline" : "Linear"} Interpolation
  </div>
);

// Main component
const F1Visualization = () => {
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [telemetryData, setTelemetryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [splinePath, setSplinePath] = useState(null);
  const [useSplineInterpolation, setUseSplineInterpolation] = useState(true);
  
  // Toggle interpolation mode
  const toggleInterpolationMode = () => {
    setUseSplineInterpolation(!useSplineInterpolation);
  };

  // Load telemetry data
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        setIsLoading(true);
        
        // Load the telemetry CSV
        const response = await fetch('/telemetrycsv/silverstone-telemetry-mclaren.csv');
        const csvText = await response.text();
        
        // Parse CSV
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        // Preprocess raw data
        const processedData = preprocessTelemetryData(result.data);
        
        // Create spline path from processed data
        const splinePath = createSplinePath(processedData, trackConfigs["silverstone"]);
        
        // Store both the raw data and the spline path
        setTelemetryData(processedData);
        setSplinePath(splinePath);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading telemetry:", error);
        setIsLoading(false);
      }
    };
    
    fetchTelemetry();
  }, []);
  
  // Handle speed change
  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };
  
  // Toggle play/pause
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  // Handle seeking
  const handleSeek = (newProgress) => {
    setProgress(newProgress);
    
    // Update current point index based on progress
    if (telemetryData.length > 0) {
      const totalTime = telemetryData[telemetryData.length - 1]["LapTime [s]"];
      const targetTime = newProgress * totalTime;
      
      // Find the closest point
      let index = 0;
      while (index < telemetryData.length - 1 && 
             telemetryData[index]["LapTime [s]"] < targetTime) {
        index++;
      }
      
      setCurrentPointIndex(index);
    }
    
    if (isPlaying) {
      setIsPlaying(false);
      // Small delay before resuming to allow position update
      setTimeout(() => setIsPlaying(true), 100);
    }
  };
  
  // Navigate to previous point
  const handlePrevious = () => {
    if (telemetryData.length === 0) return;
    
    // Go to previous point, loop to end if at start
    const newIndex = currentPointIndex > 0 
      ? currentPointIndex - 1 
      : telemetryData.length - 1;
    
    setCurrentPointIndex(newIndex);
    
    // Update progress to match this point
    const totalTime = telemetryData[telemetryData.length - 1]["LapTime [s]"];
    const pointTime = telemetryData[newIndex]["LapTime [s]"];
    setProgress(pointTime / totalTime);
    
    // Make sure we're paused
    setIsPlaying(false);
  };
  
  // Navigate to next point
  const handleNext = () => {
    if (telemetryData.length === 0) return;
    
    // Go to next point, loop to beginning if at end
    const newIndex = currentPointIndex < telemetryData.length - 1 
      ? currentPointIndex + 1 
      : 0;
    
    setCurrentPointIndex(newIndex);
    
    // Update progress to match this point
    const totalTime = telemetryData[telemetryData.length - 1]["LapTime [s]"];
    const pointTime = telemetryData[newIndex]["LapTime [s]"];
    setProgress(pointTime / totalTime);
    
    // Make sure we're paused
    setIsPlaying(false);
  };
  
  // Update progress
  const handleProgressUpdate = (newProgress) => {
    // Only update if playing
    if (isPlaying) {
      setProgress(newProgress);
    }
  };
  
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {isLoading && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          fontSize: "24px",
          zIndex: 100
        }}>
          Loading telemetry data...
        </div>
      )}
      
      <Canvas shadows camera={{ position: [0, 50, 100], fov: 60 }}>
        <color attach="background" args={["#141724"]} />
        {!isLoading && telemetryData.length > 0 && (
          <AnimatedScene 
            speed={speed}
            isPlaying={isPlaying}
            progress={progress}
            setProgress={setProgress}
            onProgressUpdate={handleProgressUpdate}
            telemetryData={telemetryData}
            currentPointIndex={currentPointIndex}
            passedUseSplineInterpolation={useSplineInterpolation}
            passedSplinePath={splinePath}
          />
        )}
        <OrbitControls 
          enableDamping={true}
          dampingFactor={0.1}
          rotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>
      
      {/* Track info display */}
      {telemetryData.length > 0 && !isLoading && (
        <div style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: 10,
          borderRadius: 5,
          fontSize: 14
        }}>
          <div>Track: Silverstone</div>
          <div>Telemetry Points: {telemetryData.length}</div>
          <div>Current Point: {currentPointIndex + 1} / {telemetryData.length}</div>
          <div>Point Time: {telemetryData[currentPointIndex]["LapTime [s]"].toFixed(3)}s</div>
          <div>Lap Time: {(telemetryData[telemetryData.length-1]["LapTime [s]"]).toFixed(3)}s</div>
        </div>
      )}
      
      {/* UI Controls */}
      <ProgressBar progress={progress} onSeek={handleSeek} />
      <SpeedControls currentSpeed={speed} onSpeedChange={handleSpeedChange} />
      <PlayPauseButton isPlaying={isPlaying} onToggle={handlePlayPause} />
      <StepButtons onPrevious={handlePrevious} onNext={handleNext} />
      <InterpolationToggle 
        useSplineInterpolation={useSplineInterpolation} 
        onToggle={toggleInterpolationMode} 
      />
    </div>
  );
};

export default F1Visualization;