'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  // South-West corner (Minglanilla/Talisay area) to North-East corner (Liloan/Mactan tip)
  const CEBU_BOUNDS = [
    [10.2000, 123.8000], // South West
    [10.4500, 124.0500], // North East
  ];
  const DEFAULT_CENTER = [10.3157, 123.8854]; // Center of Cebu City

  // Load Leaflet CSS and JS
  useEffect(() => {
    if (window.L) {
      setIsLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setIsLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.L) return;

    // Use provided lat/lng or default to Cebu City
    const startLat = lat || DEFAULT_CENTER[0];
    const startLng = lng || DEFAULT_CENTER[1];
    
    // Initialize map with strict constraints
    const map = window.L.map(mapRef.current, {
      center: [startLat, startLng],
      zoom: 13,
      minZoom: 12, // User cannot zoom out to see the whole country
      maxBounds: CEBU_BOUNDS, // RESTRICT PANNING TO CEBU/CORDOVA
      maxBoundsViscosity: 1.0, // Makes the bounds feel "solid" (no rubber banding)
    });

    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add marker if coordinates exist
    if (lat && lng) {
      const marker = window.L.marker([lat, lng], {
        draggable: !disabled,
      }).addTo(map);

      markerRef.current = marker;

      if (!disabled) {
        marker.on('dragend', (e: any) => {
          const position = marker.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });
      }
    }

    // Handle map clicks
    if (!disabled) {
      map.on('click', (e: any) => {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;

        // Check if click is within bounds (Double safety)
        if (!map.getBounds().contains(e.latlng)) return;

        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        const marker = window.L.marker([clickedLat, clickedLng], {
          draggable: true,
        }).addTo(map);

        markerRef.current = marker;
        onLocationSelect(clickedLat, clickedLng);
        
        // Center the map on the click smoothly
        map.flyTo([clickedLat, clickedLng], map.getZoom());

        marker.on('dragend', (e: any) => {
          const position = marker.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [isLoaded, disabled]); // Removed lat/lng from dependency to prevent map re-initialization on every click

  if (!isLoaded) {
    return (
      <div className="w-full bg-[#2a2a2a] rounded-lg p-8 text-center border border-white/10" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ab8d8] mx-auto"></div>
        <p className="text-white/60 mt-4">Loading Cebu map...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={mapRef}
        style={{ width: '100%', height, borderRadius: '8px', overflow: 'hidden' }}
        className="border border-white/10 z-0 relative"
      />
      
      {!disabled && (
        <div className="flex justify-between items-center mt-2">
           <p className="text-white/60 text-xs">
            Region restricted to Cebu City & Cordova
          </p>
          <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                // Reset view to Cebu Center
                if(mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(DEFAULT_CENTER, 13);
                }
            }}
            className="text-[#6ab8d8] text-xs hover:underline cursor-pointer"
          >
            Reset View
          </button>
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