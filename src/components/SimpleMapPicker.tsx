'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SimpleMapPickerProps {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
  disabled?: boolean;
}

export default function SimpleMapPicker({
  lat,
  lng,
  address,
  onLocationSelect,
  height = '400px',
  disabled = false,
}: SimpleMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Leaflet CSS and JS
  useEffect(() => {
    // Check if already loaded
    if (window.L) {
      setIsLoaded(true);
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setIsLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (link.parentNode) link.parentNode.removeChild(link);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.L) return;

    // Always default to Philippines (Manila) if no coordinates provided
    const defaultLat = lat || 14.5995;
    const defaultLng = lng || 120.9842;
    // Use zoom 6 to show more of Philippines when no coordinates, zoom 15 when coordinates exist
    const defaultZoom = lat && lng ? 15 : 6;

    // Initialize map
    const map = window.L.map(mapRef.current).setView([defaultLat, defaultLng], defaultZoom);

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

      // Handle marker drag
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

        // Remove existing marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        // Create new marker
        const marker = window.L.marker([clickedLat, clickedLng], {
          draggable: true,
        }).addTo(map);

        markerRef.current = marker;
        onLocationSelect(clickedLat, clickedLng);

        // Handle marker drag
        marker.on('dragend', (e: any) => {
          const position = marker.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });
      });
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [isLoaded, lat, lng, disabled, onLocationSelect]);

  if (!isLoaded) {
    return (
      <div className="w-full bg-[#2a2a2a] rounded-lg p-8 text-center border border-white/10" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ab8d8] mx-auto"></div>
        <p className="text-white/60 mt-4">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Map Container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height, borderRadius: '8px', overflow: 'hidden' }}
        className="border border-white/10"
      />
      
      {!disabled && (
        <p className="text-white/60 text-sm mt-2">
          Click on the map to set your business location
        </p>
      )}
    </div>
  );
}

// Extend Window interface for Leaflet
declare global {
  interface Window {
    L: any;
  }
}

