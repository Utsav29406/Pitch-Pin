"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

type Point = { lat: number; lng: number };

const pinIcon = L.divIcon({
  className: "",
  html: `<div class="price-pin">Your turf</div>`,
  iconSize: [0, 0],
});

/**
 * Tap the map (or drag the pin) to set the turf's exact location.
 * Same lifecycle rule as VenueMap: the map is created and removed by one effect.
 */
export default function LocationPicker({ value, onChange }: { value: Point; onChange: (p: Point) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ((el as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (el as unknown as { _leaflet_id?: number })._leaflet_id;
      el.innerHTML = "";
    }
    const map = L.map(el, { center: [value.lat, value.lng], zoom: 15, scrollWheelZoom: false, fadeAnimation: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    const marker = L.marker([value.lat, value.lng], { icon: pinIcon, draggable: true, keyboard: true, title: "Your turf" }).addTo(map);
    const set = (p: L.LatLng) => {
      marker.setLatLng(p);
      onChangeRef.current({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });
    };
    marker.on("dragend", () => set(marker.getLatLng()));
    map.on("click", (e: L.LeafletMouseEvent) => set(e.latlng));
    mapRef.current = map;
    markerRef.current = marker;

    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0) map.invalidateSize({ animate: false });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.stop();
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; `value` changes are applied below
  }, []);

  // Follow outside changes (area picked, "use my location").
  useEffect(() => {
    const m = markerRef.current;
    const map = mapRef.current;
    if (!m || !map) return;
    const cur = m.getLatLng();
    if (Math.abs(cur.lat - value.lat) > 1e-6 || Math.abs(cur.lng - value.lng) > 1e-6) {
      m.setLatLng([value.lat, value.lng]);
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15), { animate: false });
    }
  }, [value.lat, value.lng]);

  return <div ref={ref} className="size-full" />;
}
