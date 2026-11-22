"use client";

import { useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { AedRecord } from "../domain/types";

const labels = {
  public: "Dostęp publiczny",
  customers: "Dla klientów lub użytkowników obiektu",
  restricted: "Dostęp ograniczony",
  private: "Dostęp prywatny",
  unknown: "Dostęp nieznany",
} as const;

type MarkersProps = { records: AedRecord[]; synthetic: boolean };

function VisibleMarkers({ records, synthetic }: MarkersProps) {
  const [viewport, setViewport] = useState(0);
  const map = useMapEvents({ moveend: () => setViewport((n) => n + 1) });
  const markers = useMemo(() => {
    const bounds = map.getBounds().pad(0.15);
    const zoom = map.getZoom();
    const groupNearby = records.length > 200 && zoom < 16;
    const groups = new Map<string, { record: AedRecord; count: number }>();
    for (const record of records) {
      const point: [number, number] = [record.location.latitude, record.location.longitude];
      if (!bounds.contains(point)) continue;
      let key = record.id;
      if (groupNearby) {
        const pixel = map.project(point, zoom);
        key = `${Math.floor(pixel.x / 40)}:${Math.floor(pixel.y / 40)}`;
      }
      const existing = groups.get(key);
      if (existing) existing.count++;
      else groups.set(key, { record, count: 1 });
    }
    return Array.from(groups.values());
  }, [records, map, viewport]);
  return markers.map(({ record, count }) => {
    const center: [number, number] = [record.location.latitude, record.location.longitude];
    return <CircleMarker key={record.id} center={center} radius={count > 1 ? 13 : 9}
      pathOptions={{ color: "#075d58", fillColor: count === 1 && record.operationalStatus === "reported_out_of_service" ? "#c54b40" : "#0a8278", fillOpacity: 0.92, weight: 3 }}>
      <Popup>{count > 1 ? <>
        <strong>{count} wpisów AED w tej okolicy</strong><br />
        <button type="button" onClick={() => map.setView(center, Math.min(16, map.getZoom() + 2))}>Powiększ obszar</button>
      </> : <><strong>{record.name ?? "Punkt AED"}</strong><br />{labels[record.accessType]}<br /><small>{synthetic ? "Pozycja syntetyczna — przykład" : "Dane źródłowe po moderacji — sprawdź dostęp u dysponenta."}</small></>}</Popup>
    </CircleMarker>;
  });
}

export function AedMap({ records, synthetic }: { records: AedRecord[]; synthetic: boolean }) {
  return <section className="map-shell" role="region" aria-labelledby="aed-map-title" aria-describedby="aed-map-description">
    <h3 id="aed-map-title" className="visually-hidden">Mapa punktów AED</h3>
    <MapContainer center={synthetic ? [52.23, 21.01] : [52.1, 19.4]} zoom={synthetic ? 13 : 6} preferCanvas scrollWheelZoom={false} className="aed-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <VisibleMarkers records={records} synthetic={synthetic} />
    </MapContainer>
    <p id="aed-map-description" className="map-credit">Mapa wymaga połączenia z internetem. Pełna lista punktów jest dostępna bez kafelków mapy i pozostaje alternatywą dla tej wizualizacji.</p>
  </section>;
}
