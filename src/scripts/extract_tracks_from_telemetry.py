# scripts/extract_tracks_from_telemetry.py
import fastf1
import json
import os
import time
import numpy as np

# Set absolute paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
CACHE_DIR = os.path.join(PROJECT_ROOT, 'cache', 'fastf1')
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'data')

# Create directories
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Enable FastF1 cache
print(f"Using cache directory: {CACHE_DIR}")
fastf1.Cache.enable_cache(CACHE_DIR)

print(f"FastF1 version: {fastf1.__version__}")

# Circuit mappings - following examples from FastF1 docs
CIRCUIT_MAPPING = {
    'bahrain': 'Bahrain Grand Prix',
    'jeddah': 'Saudi Arabian Grand Prix', 
    'melbourne': 'Australian Grand Prix',
    'baku': 'Azerbaijan Grand Prix',
    'miami': 'Miami Grand Prix',
    'imola': 'Emilia Romagna Grand Prix',
    'monaco': 'Monaco Grand Prix',
    'barcelona': 'Spanish Grand Prix',
    'montreal': 'Canadian Grand Prix',
    'spielberg': 'Austrian Grand Prix',
    'silverstone': 'British Grand Prix',
    'budapest': 'Hungarian Grand Prix',
    'spa': 'Belgian Grand Prix',
    'zandvoort': 'Dutch Grand Prix',
    'monza': 'Italian Grand Prix',
    'singapore': 'Singapore Grand Prix',
    'suzuka': 'Japanese Grand Prix',
    'losail': 'Qatar Grand Prix',
    'austin': 'United States Grand Prix',
    'mexico': 'Mexico City Grand Prix',
    'interlagos': 'São Paulo Grand Prix',
    'las-vegas': 'Las Vegas Grand Prix',
    'yas-marina': 'Abu Dhabi Grand Prix'
}

def coordinates_to_svg_path(x_coords, y_coords):
    """Convert track coordinates to SVG path format"""
    if len(x_coords) == 0 or len(y_coords) == 0:
        return None
        
    # Normalize coordinates to fit in viewBox
    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)
    
    # Calculate ranges
    x_range = x_max - x_min
    y_range = y_max - y_min
    
    # SVG viewport size 
    view_width = 400
    view_height = 400
    padding = 30
    
    # Scale factor based on the larger dimension
    scale_factor = min(
        (view_width - 2 * padding) / x_range,
        (view_height - 2 * padding) / y_range
    )
    
    # Center in viewport
    x_translate = padding + (view_width - 2 * padding - x_range * scale_factor) / 2
    y_translate = padding + (view_height - 2 * padding - y_range * scale_factor) / 2
    
    # Normalize coordinates
    normalized_coords = []
    for i in range(len(x_coords)):
        x = (x_coords[i] - x_min) * scale_factor + x_translate
        # Invert y-axis for SVG (y increases downward in SVG)
        y = view_height - ((y_coords[i] - y_min) * scale_factor + y_translate)
        normalized_coords.append((x, y))
    
    # Generate path with reduced points for efficiency
    step = max(1, len(normalized_coords) // 100)  # Use about 100 points
    simplified_coords = [normalized_coords[i] for i in range(0, len(normalized_coords), step)]
    
    # Create SVG path
    path = f"M{simplified_coords[0][0]},{simplified_coords[0][1]}"
    for i in range(1, len(simplified_coords)):
        path += f" L{simplified_coords[i][0]},{simplified_coords[i][1]}"
    
    # Close the path if the first and last points are close
    first_point = simplified_coords[0]
    last_point = simplified_coords[-1]
    distance = ((first_point[0] - last_point[0])**2 + (first_point[1] - last_point[1])**2)**0.5
    
    if distance < 20:  # Close if endpoints are close
        path += " Z"
    
    return path

def get_track_from_lap(session_year, event_name, session_type='Q'):
    """Extract track coordinates from lap telemetry - following FastF1 examples exactly"""
    print(f"Loading {session_type} session for {event_name} {session_year}...")
    
    try:
        # Load the session - EXACTLY like the examples
        session = fastf1.get_session(session_year, event_name, session_type)
        session.load()
        
        # Get the fastest lap - EXACTLY like the examples
        lap = session.laps.pick_fastest()
        
        if lap is None:
            print("No fastest lap found, trying first lap...")
            if len(session.laps) > 0:
                lap = session.laps.iloc[0]
            else:
                print("No laps found in session")
                return None, None
        
        # Get telemetry data - EXACTLY like the examples
        telemetry = lap.get_telemetry()
        
        # Extract X and Y coordinates - EXACTLY like the examples
        x = telemetry['X']
        y = telemetry['Y']
        
        # Convert to lists and remove NaNs
        x_coords = x.dropna().tolist()
        y_coords = y.dropna().tolist()
        
        # Verify we have enough points
        if len(x_coords) > 50 and len(y_coords) > 50:
            print(f"✅ Successfully extracted {len(x_coords)} points from {session_type}")
            return x_coords, y_coords
        else:
            print(f"Not enough valid coordinates ({len(x_coords)}/{len(y_coords)})")
            return None, None
            
    except Exception as e:
        print(f"Error extracting track: {e}")
        return None, None

def get_track_layout(circuit_slug):
    """Get track layout SVG path for a specific circuit"""
    # Get the official event name
    if circuit_slug not in CIRCUIT_MAPPING:
        print(f"No event mapping found for {circuit_slug}")
        return None
    
    event_name = CIRCUIT_MAPPING[circuit_slug]
    print(f"Getting track layout for {circuit_slug} ({event_name})...")
    
    # Try different years and session types
    for year in [2024, 2023, 2022, 2021, 2020, 2019]:
        for session_type in ['Q', 'R', 'FP3', 'FP2', 'FP1']:
            try:
                # Get track coordinates from lap telemetry
                x_coords, y_coords = get_track_from_lap(year, event_name, session_type)
                
                if x_coords and y_coords and len(x_coords) > 50:
                    # Convert coordinates to SVG path
                    svg_path = coordinates_to_svg_path(x_coords, y_coords)
                    if svg_path:
                        print(f"✅ Successfully generated SVG path for {circuit_slug} ({year} {session_type})")
                        return svg_path
            except Exception as e:
                print(f"Error with {event_name} {year} {session_type}: {e}")
                continue
    
    print(f"❌ Failed to get track layout for {circuit_slug}")
    return None

# Test with Montreal first
print("\n📍 Testing with montreal...")
montreal_path = get_track_layout('montreal')

if montreal_path:
    # Create initial track layouts dictionary
    track_layouts = {'montreal': montreal_path}
    
    # Save the initial test result
    output_file = os.path.join(OUTPUT_DIR, 'track-layouts.json')
    with open(output_file, 'w') as f:
        json.dump(track_layouts, f, indent=2)
    
    print(f"✅ Test successful! Montreal track layout saved.")
    
    # Process a few more key circuits
    print("\nProcessing a few key circuits...")
    key_circuits = ['monza', 'silverstone', 'spa', 'monaco', 'bahrain']
    
    for circuit in key_circuits:
        print(f"\n📍 Processing {circuit}...")
        track_path = get_track_layout(circuit)
        
        if track_path:
            track_layouts[circuit] = track_path
            
            # Save after each successful circuit
            with open(output_file, 'w') as f:
                json.dump(track_layouts, f, indent=2)
            
            print(f"✅ Added and saved {circuit}")
        else:
            print(f"❌ Failed to get {circuit}")
        
        # Add a delay to avoid overloading the API
        time.sleep(2)
    
    print(f"\n✅ Processed {len(track_layouts)} circuits. Check {output_file}")
    
    # Ask if user wants to process remaining circuits
    process_all = input("\nProcess all remaining circuits? (y/n): ")
    if process_all.lower() == 'y':
        remaining = [c for c in CIRCUIT_MAPPING.keys() if c not in track_layouts]
        print(f"\nProcessing {len(remaining)} remaining circuits...")
        
        for circuit in remaining:
            print(f"\n📍 Processing {circuit}...")
            track_path = get_track_layout(circuit)
            
            if track_path:
                track_layouts[circuit] = track_path
                
                # Save after each successful circuit
                with open(output_file, 'w') as f:
                    json.dump(track_layouts, f, indent=2)
                
                print(f"✅ Added and saved {circuit}")
            else:
                print(f"❌ Failed to get {circuit}")
            
            # Add a delay to avoid overloading the API
            time.sleep(2)
        
        print(f"\n✅ Completed! Processed {len(track_layouts)} out of {len(CIRCUIT_MAPPING)} circuits.")
else:
    print("❌ Test failed. Check errors above.")