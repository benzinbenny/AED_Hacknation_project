"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { AedRecord } from "../domain/types";

const labels = {
  public: "Dostęp publiczny",
  customers: "Dla klientów lub użytkowników obiektu",
  restricted: "Dostęp ograniczony",
  private: "Dostęp prywatny",
  unknown: "Dostęp nieznany",
} as const;

export function AedMap({ records }: { records: AedRecord[] }) {
  return <section className="map-shell" role="region" aria-labelledby="aed-map-title" aria-describedby="aed-map-description">
    <h3 id="aed-map-title" className="visually-hidden">Mapa punktów AED</h3>
    <MapContainer center={[52.23, 21.01]} zoom={13} scrollWheelZoom={false} className="aed-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {records.map((record) => <CircleMarker
        key={record.id}
        center={[record.location.latitude, record.location.longitude]}
        radius={9}
        pathOptions={{ color: "#075d58", fillColor: record.operationalStatus === "reported_out_of_service" ? "#c54b40" : "#0a8278", fillOpacity: 0.92, weight: 3 }}
      >
        <Popup><strong>{record.name ?? "Punkt AED"}</strong><br />{labels[record.accessType]}<br /><small>Pozycja syntetyczna — przykład</small></Popup>
      </CircleMarker>)}
    </MapContainer>
    <p id="aed-map-description" className="map-credit">Mapa wymaga połączenia z internetem. Pełna lista punktów jest dostępna bez kafelków mapy i pozostaje alternatywą dla tej wizualizacji.</p>
  </section>;
}
