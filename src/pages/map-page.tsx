import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Crosshair,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Complaint } from '@/lib/complaints-data'
import { formatDate } from '@/lib/utils'
import { complaintService } from '@/services/complaints-service'
import { reverseGeocode, isMeaningfulAddress } from '@/services/geocoding-service'

// Default center: India central coordinates
const defaultMapCenter: LatLngExpression = [20.5937, 78.9629]

const severityColors: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#0284c7',
  Low: '#10b981',
}

const tileProviders = {
  roads: {
    name: 'Roads & Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OSM Team',
    subdomains: 'abc',
    maxZoom: 19,
  },
  highways: {
    name: 'Highways & Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Highway and Street Infrastructure',
    subdomains: '',
    maxZoom: 19,
  },
  satellite: {
    name: 'Aerial Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    subdomains: '',
    maxZoom: 19,
  },
}

interface DisplayComplaint extends Complaint {
  displayCoordinates: [number, number]
  isCoLocated?: boolean
  coLocatedTotal?: number
}

/**
 * Controller to guarantee container sizing and sync view with complaints
 */
function MapController({
  complaints,
  selectedId,
  isFullScreen,
  onRecenterRef,
}: {
  complaints: DisplayComplaint[]
  selectedId: string | null
  isFullScreen: boolean
  onRecenterRef: React.MutableRefObject<(() => void) | null>
}) {
  const map = useMap()

  // Invalidate size immediately, after CSS transitions, and upon resize/fullscreen
  useEffect(() => {
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 60)
    const t2 = setTimeout(() => map.invalidateSize(), 200)
    const t3 = setTimeout(() => map.invalidateSize(), 500)

    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)

    const container = map.getContainer()
    let observer: ResizeObserver | null = null
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        map.invalidateSize()
      })
      observer.observe(container)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      window.removeEventListener('resize', handleResize)
      if (observer) observer.disconnect()
    }
  }, [map, isFullScreen])

  // Recenter function passed to parent ref
  useEffect(() => {
    onRecenterRef.current = () => {
      const validPoints = complaints
        .filter(
          (c) =>
            c.displayCoordinates &&
            Array.isArray(c.displayCoordinates) &&
            c.displayCoordinates.length === 2 &&
            !isNaN(c.displayCoordinates[0]) &&
            !isNaN(c.displayCoordinates[1]) &&
            (c.displayCoordinates[0] !== 0 || c.displayCoordinates[1] !== 0)
        )
        .map((c) => c.displayCoordinates)

      if (validPoints.length === 1) {
        map.flyTo(validPoints[0], 14, { duration: 0.6 })
      } else if (validPoints.length > 1) {
        map.fitBounds(validPoints, { padding: [50, 50], maxZoom: 13 })
      } else {
        map.flyTo(defaultMapCenter, 5, { duration: 0.6 })
      }
    }
  }, [complaints, map, onRecenterRef])

  // Handle selected complaint zoom
  useEffect(() => {
    if (selectedId) {
      const selected = complaints.find((c) => c.id === selectedId)
      if (
        selected?.displayCoordinates &&
        Array.isArray(selected.displayCoordinates) &&
        !isNaN(selected.displayCoordinates[0]) &&
        !isNaN(selected.displayCoordinates[1])
      ) {
        map.flyTo(selected.displayCoordinates, 15, { duration: 0.6 })
      }
    }
  }, [selectedId, complaints, map])

  // Initial fit to complaints
  useEffect(() => {
    const validPoints = complaints
      .filter(
        (c) =>
          c.displayCoordinates &&
          Array.isArray(c.displayCoordinates) &&
          c.displayCoordinates.length === 2 &&
          !isNaN(c.displayCoordinates[0]) &&
          !isNaN(c.displayCoordinates[1]) &&
          (c.displayCoordinates[0] !== 0 || c.displayCoordinates[1] !== 0)
      )
      .map((c) => c.displayCoordinates)

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 13)
    } else if (validPoints.length > 1) {
      map.fitBounds(validPoints, { padding: [50, 50], maxZoom: 13 })
    }
  }, [complaints, map])

  return null
}

function SeverityLegend({ complaints }: { complaints: Complaint[] }) {
  const counts = useMemo(() => {
    const tally: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    complaints.forEach((c) => {
      if (tally[c.priority] !== undefined) tally[c.priority]++
    })
    return tally
  }, [complaints])

  return (
    <div className="absolute bottom-4 left-4 z-[400] rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur-md">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Severity Distribution
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        {Object.entries(severityColors).map(([label, color]) => (
          <span
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
            key={label}
          >
            <i
              className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-xs"
              style={{ backgroundColor: color }}
            />
            {label}
            <span className="ml-0.5 rounded-sm bg-slate-100 px-1 text-[10px] text-slate-500 font-mono">
              {counts[label] || 0}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function MapPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [priority, setPriority] = useState('All priorities')
  const [zone, setZone] = useState('All zones')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTileLayer, setActiveTileLayer] = useState<'roads' | 'highways' | 'satellite'>('roads')
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Prevent background scroll when full screen
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullScreen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false)
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen])

  const recenterRef = useRef<(() => void) | null>(null)

  const loadComplaints = () => {
    setLoading(true)
    setError('')
    complaintService
      .list({ page: 1, pageSize: 100 })
      .then((response) => {
        setComplaints(response.items)
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error ? reason.message : 'Unable to load map reports.'
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadComplaints()
  }, [])

  const zones = useMemo(
    () => [...new Set(complaints.map((c) => c.zone).filter(Boolean))],
    [complaints]
  )

  // Disambiguate co-located coordinates so every complaint is individually visible & clickable
  const displayComplaints = useMemo<DisplayComplaint[]>(() => {
    const valid = complaints.filter(
      (c) =>
        c.coordinates &&
        Array.isArray(c.coordinates) &&
        c.coordinates.length === 2 &&
        !isNaN(c.coordinates[0]) &&
        !isNaN(c.coordinates[1]) &&
        (c.coordinates[0] !== 0 || c.coordinates[1] !== 0)
    )

    // Group by location key (rounded to 4 decimals ~ 11m)
    const groups = new Map<string, Complaint[]>()
    valid.forEach((c) => {
      const key = `${c.coordinates![0].toFixed(4)},${c.coordinates![1].toFixed(4)}`
      const arr = groups.get(key) || []
      arr.push(c)
      groups.set(key, arr)
    })

    return valid.map((c) => {
      const key = `${c.coordinates![0].toFixed(4)},${c.coordinates![1].toFixed(4)}`
      const group = groups.get(key) || [c]
      if (group.length <= 1) {
        return {
          ...c,
          displayCoordinates: c.coordinates as [number, number],
          isCoLocated: false,
          coLocatedTotal: 1,
        }
      }

      // Small radial offset for co-located points (~150m) so all dots are visible
      const index = group.findIndex((item) => item.id === c.id)
      const angle = (index * 2 * Math.PI) / group.length
      const offsetRadius = 0.0016
      const lat = c.coordinates![0]
      const lng = c.coordinates![1]
      const offsetLat = lat + offsetRadius * Math.cos(angle)
      const cosLat = Math.cos((lat * Math.PI) / 180) || 1
      const offsetLng = lng + (offsetRadius * Math.sin(angle)) / cosLat

      return {
        ...c,
        displayCoordinates: [offsetLat, offsetLng],
        isCoLocated: true,
        coLocatedTotal: group.length,
      }
    })
  }, [complaints])

  const filtered = useMemo(() => {
    return displayComplaints.filter((complaint) => {
      const haystack = `${complaint.id} ${complaint.title} ${complaint.location} ${complaint.zone} ${complaint.address || ''} ${complaint.area || ''}`.toLowerCase()
      return (
        haystack.includes(search.toLowerCase()) &&
        (status === 'All statuses' || complaint.status === status) &&
        (priority === 'All priorities' || complaint.priority === priority) &&
        (zone === 'All zones' || complaint.zone === zone)
      )
    })
  }, [displayComplaints, priority, search, status, zone])

  const selected = displayComplaints.find((complaint) => complaint.id === selectedId) ?? null
  const [selectedAddress, setSelectedAddress] = useState<string>('')

  useEffect(() => {
    if (!selected) {
      setSelectedAddress('')
      return
    }
    const initial = isMeaningfulAddress(selected.address)
      ? selected.address!
      : isMeaningfulAddress(selected.location)
      ? selected.location
      : ''
    setSelectedAddress(initial)

    if (
      selected.coordinates &&
      Array.isArray(selected.coordinates) &&
      !isNaN(selected.coordinates[0]) &&
      !isNaN(selected.coordinates[1])
    ) {
      reverseGeocode(selected.coordinates[0], selected.coordinates[1]).then(
        (res) => {
          if (res?.displayName) {
            setSelectedAddress(res.displayName)
          }
        }
      )
    }
  }, [selected])

  const handleResetView = () => {
    if (recenterRef.current) {
      recenterRef.current()
    }
  }

  const renderComplaintDetails = (complaint: DisplayComplaint, onClose?: () => void) => (
    <div>
      <div className="flex items-start justify-between border-b border-slate-100 p-4 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-orange-600">
              {complaint.id}
            </span>
            {complaint.isCoLocated && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                Hub ({complaint.coLocatedTotal} issues)
              </span>
            )}
          </div>
          <h2 className="mt-1 text-sm font-bold leading-snug text-slate-900">
            {complaint.title}
          </h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close location details"
            className="h-7 w-7 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3.5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={complaint.status} />
          <Badge
            variant="outline"
            className="border-slate-200 bg-white font-semibold text-slate-700 text-xs"
          >
            {complaint.priority} priority
          </Badge>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
          <p className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-snug">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
            <span>{selectedAddress || complaint.address || complaint.location}</span>
          </p>
          <p className="pl-5 text-[11px] text-slate-500 font-medium">
            {complaint.zone} · {complaint.category}
          </p>
          {complaint.coordinates && (
            <p className="pl-5 font-mono text-[10px] text-slate-400">
              {complaint.coordinates[0].toFixed(5)}, {complaint.coordinates[1].toFixed(5)}
            </p>
          )}
        </div>

        {complaint.coordinates && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              selectedAddress || `${complaint.coordinates[0]},${complaint.coordinates[1]}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 shadow-2xs hover:bg-teal-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-teal-600" />
            <span>Open in Google Maps</span>
          </a>
        )}

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Description
          </h3>
          <p className="text-xs leading-relaxed text-slate-600">
            {complaint.description || 'No description provided.'}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Reported:</span>{' '}
          {formatDate(complaint.reportedAt)}
        </div>

        <Link
          to="/incidents"
          className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs font-bold text-orange-700 shadow-xs hover:bg-orange-100 transition-colors"
        >
          <span>Open complaint management</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )

  const filterControls = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Map status filter"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="h-9 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 text-xs font-medium text-slate-700 shadow-xs outline-hidden backdrop-blur-md hover:bg-white"
      >
        <option>All statuses</option>
        <option>Submitted</option>
        <option>Under review</option>
        <option>AI processing</option>
        <option>Assigned</option>
        <option>In progress</option>
        <option>Resolved</option>
        <option>Rejected</option>
      </select>

      <select
        aria-label="Map priority filter"
        value={priority}
        onChange={(event) => setPriority(event.target.value)}
        className="h-9 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 text-xs font-medium text-slate-700 shadow-xs outline-hidden backdrop-blur-md hover:bg-white"
      >
        <option>All priorities</option>
        <option>Critical</option>
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>

      <select
        aria-label="Map zone filter"
        value={zone}
        onChange={(event) => setZone(event.target.value)}
        className="h-9 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 text-xs font-medium text-slate-700 shadow-xs outline-hidden backdrop-blur-md hover:bg-white"
      >
        <option>All zones</option>
        {zones.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>
  )

  const layerSwitchControls = (
    <div className="flex items-center rounded-lg border border-slate-200/90 bg-white/95 p-1 shadow-xs backdrop-blur-md">
      <button
        type="button"
        onClick={() => setActiveTileLayer('roads')}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-all cursor-pointer ${
          activeTileLayer === 'roads'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="OpenStreetMap Standard Roads & Streets (Free & Clear)"
      >
        <Layers className="h-3 w-3" />
        Roads
      </button>
      <button
        type="button"
        onClick={() => setActiveTileLayer('highways')}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-all cursor-pointer ${
          activeTileLayer === 'highways'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Esri Highway & Street Infrastructure"
      >
        Highways
      </button>
      <button
        type="button"
        onClick={() => setActiveTileLayer('satellite')}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-all cursor-pointer ${
          activeTileLayer === 'satellite'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Esri World Satellite Imagery"
      >
        Satellite
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Infrastructure & Live Operations"
        title="Live road map"
        description="Monitor reported road incidents, maintenance zones, and real-time pothole hazards across India."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadComplaints}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live data connected ({displayComplaints.length} mapped)
            </div>
          </div>
        }
      />

      {/* FULL SCREEN OVERLAY VIEW */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950 animate-in fade-in duration-150">
          {/* Header Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="rounded bg-orange-600 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-white">
                LIVE ROAD MAP
              </span>
              <span className="text-xs font-bold text-slate-800 hidden sm:inline">
                SadakSetu Monitoring Console
              </span>
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search incidents or areas..."
                  className="h-8 border-slate-200 pl-8 text-xs bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filterControls}
              {layerSwitchControls}

              <button
                type="button"
                onClick={() => {
                  setIsFullScreen(false)
                  setTimeout(() => window.dispatchEvent(new Event('resize')), 150)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-xs"
                title="Exit Full Screen (Esc)"
              >
                <Minimize2 className="h-3.5 w-3.5 text-rose-600" />
                <span>Exit Full Screen</span>
                <kbd className="hidden sm:inline rounded bg-rose-200/60 px-1 py-0.2 text-[10px] text-rose-800">Esc</kbd>
              </button>
            </div>
          </div>

          {/* Full Screen Map Body */}
          <div className="relative flex-1 w-full min-h-0 bg-slate-100">
            <MapContainer
              center={defaultMapCenter}
              zoom={5}
              scrollWheelZoom
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
              className="h-full w-full"
            >
              <TileLayer
                key={`fullscreen-${activeTileLayer}`}
                attribution={tileProviders[activeTileLayer].attribution}
                url={tileProviders[activeTileLayer].url}
                subdomains={tileProviders[activeTileLayer].subdomains}
                maxZoom={tileProviders[activeTileLayer].maxZoom}
              />

              <ZoomControl position="bottomright" />

              <MapController
                complaints={filtered}
                selectedId={selectedId}
                isFullScreen={isFullScreen}
                onRecenterRef={recenterRef}
              />

              {filtered.map((complaint) => (
                <CircleMarker
                  key={complaint.id}
                  center={complaint.displayCoordinates}
                  radius={complaint.id === selectedId ? 14 : 9}
                  pathOptions={{
                    color: complaint.id === selectedId ? '#0f172a' : '#ffffff',
                    weight: complaint.id === selectedId ? 3.5 : 2,
                    fillColor: severityColors[complaint.priority] || '#f97316',
                    fillOpacity: 0.95,
                  }}
                  eventHandlers={{
                    click: () => setSelectedId(complaint.id),
                  }}
                >
                  <Popup>
                    <div className="min-w-[210px] p-1 font-sans">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-orange-600">
                          {complaint.id}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white uppercase"
                          style={{
                            backgroundColor: severityColors[complaint.priority] || '#f97316',
                          }}
                        >
                          {complaint.priority}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-900 leading-tight">
                        {complaint.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {complaint.location}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="text-slate-400 font-medium">
                          {complaint.status}
                        </span>
                        <button
                          type="button"
                          className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                          onClick={() => setSelectedId(complaint.id)}
                        >
                          View details →
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              <Button
                variant="secondary"
                size="icon"
                aria-label="Recenter map"
                title="Recenter on all complaints"
                className="absolute bottom-20 right-2.5 z-[400] h-8 w-8 rounded-lg border border-slate-200 bg-white shadow-md hover:bg-slate-50 cursor-pointer"
                onClick={handleResetView}
              >
                <Crosshair className="h-4 w-4 text-slate-700" />
              </Button>

              <SeverityLegend complaints={filtered} />
            </MapContainer>

            {/* Slide-in Full Screen Inspector Drawer */}
            {selected && (
              <div className="absolute top-4 right-4 z-[500] w-[340px] max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200">
                {renderComplaintDetails(selected, () => setSelectedId(null))}
              </div>
            )}
          </div>

          {/* Full Screen Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
            <span className="font-medium">
              Showing {filtered.length} of {displayComplaints.length} road incidents
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-500">
              <Navigation className="h-3.5 w-3.5 text-orange-500" />
              Scroll to zoom · Click any marker to inspect incident details
            </span>
          </div>
        </div>
      )}

      {/* STANDARD DASHBOARD VIEW */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Map Card */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="relative p-0 flex flex-col">
            {/* Top Overlay Filters */}
            <div className="absolute left-3 right-3 top-3 z-[400] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    aria-label="Search map complaints"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search locations or IDs..."
                    className="h-9 border-slate-200/90 bg-white/95 pl-9 text-xs shadow-md backdrop-blur-md focus:bg-white"
                  />
                </div>
                {filterControls}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {layerSwitchControls}

                {/* Full Screen Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFullScreen(true)
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 150)
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md hover:bg-white transition-all cursor-pointer"
                  title="Expand Map to Full Screen"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Full Screen</span>
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="absolute left-4 right-4 top-16 z-[400] rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700 shadow-md"
              >
                {error}
              </p>
            )}

            {/* Map Canvas - calibrated height to align with side card */}
            <div className="relative w-full overflow-hidden bg-slate-100 h-[480px] lg:h-[520px]">
              <MapContainer
                center={defaultMapCenter}
                zoom={5}
                scrollWheelZoom
                zoomControl={false}
                style={{ height: '100%', width: '100%', minHeight: '480px' }}
                className="h-full w-full"
              >
                <TileLayer
                  key={`standard-${activeTileLayer}`}
                  attribution={tileProviders[activeTileLayer].attribution}
                  url={tileProviders[activeTileLayer].url}
                  subdomains={tileProviders[activeTileLayer].subdomains}
                  maxZoom={tileProviders[activeTileLayer].maxZoom}
                />

                <ZoomControl position="bottomright" />

                <MapController
                  complaints={filtered}
                  selectedId={selectedId}
                  isFullScreen={isFullScreen}
                  onRecenterRef={recenterRef}
                />

                {filtered.map((complaint) => (
                  <CircleMarker
                    key={complaint.id}
                    center={complaint.displayCoordinates}
                    radius={complaint.id === selectedId ? 14 : 9}
                    pathOptions={{
                      color: complaint.id === selectedId ? '#0f172a' : '#ffffff',
                      weight: complaint.id === selectedId ? 3.5 : 2,
                      fillColor: severityColors[complaint.priority] || '#f97316',
                      fillOpacity: 0.95,
                    }}
                    eventHandlers={{
                      click: () => setSelectedId(complaint.id),
                    }}
                  >
                    <Popup>
                      <div className="min-w-[210px] p-1 font-sans">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-orange-600">
                            {complaint.id}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white uppercase"
                            style={{
                              backgroundColor: severityColors[complaint.priority] || '#f97316',
                            }}
                          >
                            {complaint.priority}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-bold text-slate-900 leading-tight">
                          {complaint.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {complaint.location}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                          <span className="text-slate-400 font-medium">
                            {complaint.status}
                          </span>
                          <button
                            type="button"
                            className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                            onClick={() => setSelectedId(complaint.id)}
                          >
                            View details →
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Reset map view"
                  title="Recenter on all complaints"
                  className="absolute bottom-20 right-2.5 z-[400] h-8 w-8 rounded-lg border border-slate-200/80 bg-white/95 shadow-md backdrop-blur-md hover:bg-white cursor-pointer"
                  onClick={handleResetView}
                >
                  <Crosshair className="h-4 w-4 text-slate-700" />
                </Button>

                <SeverityLegend complaints={filtered} />
              </MapContainer>
            </div>

            {/* Map footer status bar */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              <span className="font-medium">
                {loading
                  ? 'Loading reports…'
                  : `${filtered.length} of ${displayComplaints.length} complaints visible`}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <Navigation className="h-3.5 w-3.5 text-orange-500" />
                Scroll to zoom · Click a marker for details
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right-Side Inspector Card */}
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {selected ? (
              renderComplaintDetails(selected, () => setSelectedId(null))
            ) : (
              <div className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="mt-3.5 text-base font-bold text-slate-900">
                  Select a road marker
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Choose any incident marker on the map to inspect its location, road condition,
                  severity, and maintenance status.
                </p>

                <div className="mt-5 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Live Road Overview
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Mapped incidents</span>
                    <span className="font-bold text-slate-900">{filtered.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">High / Critical priority</span>
                    <span className="font-bold text-red-600">
                      {
                        filtered.filter(
                          (c) => c.priority === 'Critical' || c.priority === 'High'
                        ).length
                      }
                    </span>
                  </div>
                </div>

                {filtered.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Quick Jump to Issue
                    </p>
                    <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                      {filtered.slice(0, 6).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-white p-2.5 text-left text-xs shadow-2xs hover:border-orange-200 hover:bg-orange-50/60 transition-all cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-mono text-[11px] font-bold text-slate-800 truncate block">
                              {c.id}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {c.title}
                            </span>
                          </div>
                          <span
                            className="shrink-0 h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: severityColors[c.priority] || '#f97316',
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
