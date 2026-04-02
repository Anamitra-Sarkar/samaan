import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type VillagePoint = {
  id: number
  name: string
  state: string
  lat?: number | null
  lng?: number | null
  gap_score: number
  risk_color: string
}

export default function MapView({ points, onSelect }: { points: VillagePoint[]; onSelect?: (id: number) => void }) {
  const center = points.find((point) => point.lat && point.lng) || { lat: 25.0, lng: 82.0 }
  return (
    <div className="h-[600px] overflow-hidden rounded-xl border border-gray-200 bg-white">
      <MapContainer center={[center.lat || 25.0, center.lng || 82.0]} zoom={5} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {points.filter((point) => point.lat && point.lng).map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat as number, point.lng as number]}
            radius={8 + Math.max(0, Math.min(20, point.gap_score / 5))}
            pathOptions={{ color: point.risk_color, fillColor: point.risk_color, fillOpacity: 0.7 }}
            eventHandlers={{ click: () => onSelect?.(point.id) }}
          >
            <Popup>
              <strong>{point.name}</strong>
              <br />
              {point.state}
              <br />
              Gap score: {point.gap_score}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

