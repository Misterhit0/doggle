import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: maplibregl.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 48.8566, lng: 2.3522 }, // Paris by default
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize MapLibre GL Map
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json", // Elegant, clean map style without API key
      center: [initialCenter.lng, initialCenter.lat], // maplibregl expects [lng, lat]
      zoom: initialZoom,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add navigation controls (zoom, rotate)
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (onMapReady) {
        onMapReady(map);
      }
    });

    return () => {
      map.remove();
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
