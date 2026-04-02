import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../../api/client'
import MapView from '../../components/shared/MapView'

export default function VillageMap() {
  const [points, setPoints] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    client.get('/village/map-data').then((res) => setPoints(res.data)).catch(() => setPoints([]))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Village gap map</h1>
        <p className="text-sm text-gray-500">High gap scores are shown in red; low gap scores in green.</p>
      </div>
      <MapView points={points} onSelect={(id) => navigate(`/village/${id}`)} />
    </div>
  )
}

