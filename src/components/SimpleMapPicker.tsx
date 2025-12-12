'use client';

import React, { useEffect, useRef, useState } from 'react';

// FIX: Declare types globally
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

  // --- CONFIGURATION FOR CEBU CITY / CORDOVA ---
  const CEBU_BOUNDS_OPTS = {
    minLat: 10.1500, // South (Naga/Minglanilla)
    maxLat: 10.4500, // North (Liloan)
    minLng: 123.7500, // West (Busay mountains)
    maxLng: 124.0500, // East (Olango/Cordova)
  };

  const CEBU_BOUNDS: [[number, number], [number, number]] = [
    [CEBU_BOUNDS_OPTS.minLat, CEBU_BOUNDS_OPTS.minLng],
    [CEBU_BOUNDS_OPTS.maxLat, CEBU_BOUNDS_OPTS.maxLng],
  ];

  // UPDATED: Default center is now Cordova, Cebu
  const DEFAULT_CENTER: [number, number] = [10.2518, 123.9486]; 

  // Helper to check if a coordinate is valid within our specific region
  const isWithinCebu = (latitude: number, longitude: number) => {
    return (
      latitude >= CEBU_BOUNDS_OPTS.minLat &&
      latitude <= CEBU_BOUNDS_OPTS.maxLat &&
      longitude >= CEBU_BOUNDS_OPTS.minLng &&
      longitude <= CEBU_BOUNDS_OPTS.maxLng
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

    // --- CRITICAL FIX: DESTROY OLD MAP ---
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // --- CRITICAL FIX: VALIDATE COORDINATES ---
    let startLat = DEFAULT_CENTER[0];
    let startLng = DEFAULT_CENTER[1];

    if (lat && lng && isWithinCebu(lat, lng)) {
      startLat = lat;
      startLng = lng;
    }

    // Create the Leaflet Map
    const map = window.L.map(mapRef.current, {
      center: [startLat, startLng],
      zoom: 14, // Slightly closer zoom for Cordova town proper
      minZoom: 12,
      maxZoom: 18,
      maxBounds: CEBU_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    // this adds the tile
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Place Initial Marker (only if we have valid coordinates passed as props)
    if (lat && lng && isWithinCebu(lat, lng)) {
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
        
        // Double check bounds just in case
        if (!isWithinCebu(lat, lng)) return;

        if (markerRef.current) map.removeLayer(markerRef.current);

        const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        
        onLocationSelect(lat, lng);
        map.flyTo([lat, lng], map.getZoom()); // Smooth animate to click

        marker.on('dragend', () => {
            const { lat, lng } = marker.getLatLng();
            onLocationSelect(lat, lng);
        });
      });
    }

  // Add lat/lng to dependency array so map re-centers if props change VALIDLY
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
          Cebu/Cordova Only
        </div>
      )}
    </div>
  );
}