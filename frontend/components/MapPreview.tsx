"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface MapPreviewProps {
  classroomLat: number;
  classroomLng: number;
  radius: number;
  studentLat?: number | null;
  studentLng?: number | null;
}

export default function MapPreview({
  classroomLat,
  classroomLng,
  radius,
  studentLat,
  studentLng,
}: MapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (typeof window === "undefined" || !container) return;

    // Load Leaflet dynamically
    import("leaflet").then((L) => {
      // Fix default marker icon assets loading issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      // Create map instance
      if (mapRef.current) {
        mapRef.current.remove();
      }

      const map = L.map(container).setView([classroomLat, classroomLng], 16);
      mapRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Classroom marker
      const classroomIcon = L.divIcon({
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-lg animate-pulse"><span class="text-white text-xs font-bold">🏫</span></div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([classroomLat, classroomLng], { icon: classroomIcon })
        .addTo(map)
        .bindPopup("Classroom Center")
        .openPopup();

      // Radius circle
      L.circle([classroomLat, classroomLng], {
        radius: radius,
        color: "#6366f1", // indigo-500
        fillColor: "#818cf8", // indigo-400
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);

      // Student marker (if provided)
      if (studentLat != null && studentLng != null) {
        const studentIcon = L.divIcon({
          html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg"><span class="text-white text-[10px] font-bold">🧑‍🎓</span></div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker([studentLat, studentLng], { icon: studentIcon })
          .addTo(map)
          .bindPopup("Your Location")
          .openPopup();

        // Fit bounds to show both classroom and student
        const group = L.featureGroup([
          L.marker([classroomLat, classroomLng]),
          L.marker([studentLat, studentLng]),
        ]);
        map.fitBounds(group.getBounds().pad(0.2));
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [classroomLat, classroomLng, radius, studentLat, studentLng]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
      <div ref={mapContainerRef} className="z-10 h-72 w-full" />
    </div>
  );
}
