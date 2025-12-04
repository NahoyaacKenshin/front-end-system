'use client';

import React, { useEffect, useRef, useState } from 'react';

// FIX: Declare types globally so you don't get the 'L' error
declare global {
  interface Window {
    L: any;
  }
}

interface SimpleMapPickerProps {
  lat?: number | null;
  lng?: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
  disabled?: boolean;
  address: string;
}

export default function SimpleMapPicker({
  lat,
  lng,
  onLocationSelect,
  height = '400px',
  disabled = false,
}: SimpleMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- CONFIGURATION FOR MACTAN ISLAND & CORDOVA ONLY ---
  const ISLAND_BOUNDS_OPTS = {
    minLat: 10.2300,  // South: Tip of Cordova
    maxLat: 10.3600,  // North: Tip of Punta Engaño / Airport
    minLng: 123.9300, // West: The Bridges / Mandaue Channel
    maxLng: 124.0600, // East: The sea past Maribago
  };

  const ISLAND_BOUNDS: [[number, number], [number, number]] = [
    [ISLAND_BOUNDS_OPTS.minLat, ISLAND_BOUNDS_OPTS.minLng],
    [ISLAND_BOUNDS_OPTS.maxLat, ISLAND_BOUNDS_OPTS.maxLng],
  ];

  // Default Center: Basak/Marigondon area (Center of the island)
  const DEFAULT_CENTER: [number, number] = [10.2929, 123.9750]; 

  // Helper to check if a coordinate is valid within our specific region
  const isWithinBounds = (latitude: number, longitude: number) => {
    return (
      latitude >= ISLAND_BOUNDS_OPTS.minLat &&
      latitude <= ISLAND_BOUNDS_OPTS.maxLat &&
      longitude >= ISLAND_BOUNDS_OPTS.minLng &&
      longitude <= ISLAND_BOUNDS_OPTS.maxLng
    );
  };

  // 1. Load Leaflet Resources
  useEffect(() => {
    if (window.L) {
      setIsLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setIsLoaded(true);
    document.body.appendChild(script);
  }, []);

  // 2. Initialize Map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.L) return;

    // Destroy old map to apply new bounds cleanly
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    let startLat = DEFAULT_CENTER[0];
    let startLng = DEFAULT_CENTER[1];

    // Only use props if they are inside Mactan/Cordova
    if (lat && lng && isWithinBounds(lat, lng)) {
      startLat = lat;
      startLng = lng;
    }

    const map = window.L.map(mapRef.current, {
      center: [startLat, startLng],
      zoom: 13,
      minZoom: 12, // Prevents zooming out to see Cebu City mainland
      maxZoom: 18,
      maxBounds: ISLAND_BOUNDS, // LOCKS view to the island
      maxBoundsViscosity: 1.0,  // Hard stop at edges
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Place Marker
    if (lat && lng && isWithinBounds(lat, lng)) {
      const marker = window.L.marker([lat, lng], { draggable: !disabled }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        onLocationSelect(lat, lng);
      });
    }

    // Click Handler
    if (!disabled) {
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Strict check: If user clicks water outside bounds, do nothing
        if (!isWithinBounds(lat, lng)) return;

        if (markerRef.current) map.removeLayer(markerRef.current);

        const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        
        onLocationSelect(lat, lng);
        map.flyTo([lat, lng], map.getZoom());

        marker.on('dragend', () => {
            const { lat, lng } = marker.getLatLng();
            onLocationSelect(lat, lng);
        });
      });
    }

  }, [isLoaded, disabled, lat, lng]); 

  if (!isLoaded) {
    return (
      <div className="w-full bg-gray-900 rounded-lg flex items-center justify-center text-white/50" style={{ height }}>
        Loading Map...
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div
        ref={mapRef}
        style={{ width: '100%', height, borderRadius: '8px', zIndex: 0 }}
        className="border border-gray-700"
      />
      {!disabled && (
        <div className="absolute bottom-2 right-2 z-[400] bg-black/70 px-2 py-1 rounded text-xs text-white">
          Lapu-Lapu & Cordova Only
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    L: any;
  }
}