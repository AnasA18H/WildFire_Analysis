"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, useMap, Marker, Popup, CircleMarker } from "react-leaflet"
import { useWildfireStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { BurnSeverityLegend } from "@/components/burn-severity-legend"
import { cn } from "@/lib/utils"
import L from "leaflet"

// Import Leaflet CSS
import "leaflet/dist/leaflet.css"

// This component handles map clicks
function MapClickHandler() {
  const map = useMap()
  const { isLoading, setSelectedLocation } = useWildfireStore()

  useEffect(() => {
    if (!map) return

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isLoading) return

      console.log("Map clicked at:", e.latlng)
      const { lat, lng } = e.latlng
      setSelectedLocation({
        latitude: lat,
        longitude: lng,
      })
    }

    map.on("click", handleClick)

    return () => {
      map.off("click", handleClick)
    }
  }, [map, isLoading, setSelectedLocation])

  return null
}

export default function MapClient() {
  const { selectedLocation, burnSeverityPolygons, isLoading, toggleLayerVisibility, visibleLayers } = useWildfireStore()

  // Fix Leaflet icon issues
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    })
  }, [])

  interface BurnSeverityPoint {
    latlng: [number, number];
    properties: {
      severity?: number;
      area?: number;
    };
  }

  // Function to extract points from GeoJSON polygons
  const extractPointsFromPolygons = () => {
    if (!burnSeverityPolygons) return [] as BurnSeverityPoint[]
    
    const points: BurnSeverityPoint[] = []
    
    // GeoJSON data can be complex with multiple layers
    const processFeature = (feature: GeoJSON.Feature) => {
      if (!feature.geometry) return
      
      // For Point type
      if (feature.geometry.type === 'Point') {
        points.push({
          latlng: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
          properties: {
            severity: feature.properties?.severity as number | undefined,
            area: feature.properties?.area as number | undefined
          }
        })
      }
      // For Polygon type
      else if (feature.geometry.type === 'Polygon') {
        // Sample points from the polygon (e.g., use the first coordinate of each ring)
        feature.geometry.coordinates.forEach(ring => {
          // Take points at intervals to reduce density
          for (let i = 0; i < ring.length; i += Math.max(1, Math.floor(ring.length / 10))) {
            const coord = ring[i]
            points.push({
              latlng: [coord[1], coord[0]],
              properties: {
                severity: feature.properties?.severity as number | undefined,
                area: feature.properties?.area as number | undefined
              }
            })
          }
        })
      }
      // For MultiPolygon type
      else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            // Take points at intervals to reduce density
            for (let i = 0; i < ring.length; i += Math.max(1, Math.floor(ring.length / 10))) {
              const coord = ring[i]
              points.push({
                latlng: [coord[1], coord[0]],
                properties: {
                  severity: feature.properties?.severity as number | undefined,
                  area: feature.properties?.area as number | undefined
                }
              })
            }
          })
        })
      }
    }
    
    // Process all features
    if (burnSeverityPolygons.type === 'FeatureCollection') {
      burnSeverityPolygons.features.forEach(processFeature)
    } else if (burnSeverityPolygons.type === 'Feature') {
      processFeature(burnSeverityPolygons)
    }
    
    return points
  }

  // Get points from polygons
  const burnSeverityPoints = burnSeverityPolygons ? extractPointsFromPolygons() : []

  return (
    <>
      <MapContainer
        center={selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : [37.7749, -122.4194]}
        zoom={10}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Add the click handler component */}
        <MapClickHandler />

        {selectedLocation && (
          <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
            <Popup>
              Selected Location
              <br />
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Popup>
          </Marker>
        )}

        {/* Render dots instead of polygons */}
        {visibleLayers.burnSeverity && burnSeverityPoints.map((point, index) => (
          <CircleMarker
            key={`dot-${index}`}
            center={point.latlng}
            radius={4}
            pathOptions={{
              fillColor: getBurnSeverityColor(point.properties?.severity || 0),
              color: getBurnSeverityColor(point.properties?.severity || 0),
              fillOpacity: 0.8,
              weight: 1
            }}
          >
            <Popup>
              <strong>Burn Severity:</strong> {getSeverityLabel(point.properties?.severity || 0)}<br />
              {point.properties?.area && (
                <><strong>Area:</strong> {point.properties.area.toFixed(2)} km²</>
              )}
            </Popup>
          </CircleMarker>
        ))}

        <MapCenterUpdater />
      </MapContainer>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="bg-white p-2 rounded-md shadow-md">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleLayerVisibility("burnSeverity")}
            className={cn(
              "flex items-center gap-2",
              visibleLayers.burnSeverity ? "bg-primary text-primary-foreground" : "",
            )}
          >
            {visibleLayers.burnSeverity ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Burn Severity
          </Button>
        </div>

        {burnSeverityPolygons && visibleLayers.burnSeverity && <BurnSeverityLegend />}
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-[1000]">
          <div className="bg-white p-4 rounded-md shadow-md flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analyzing wildfire data...</span>
          </div>
        </div>
      )}
    </>
  )
}

// Helper component to update map center when selectedLocation changes
function MapCenterUpdater() {
  const map = useMap()
  const { selectedLocation } = useWildfireStore()

  useEffect(() => {
    if (selectedLocation && map) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], map.getZoom())
    }
  }, [selectedLocation, map])

  return null
}

function getBurnSeverityColor(severity: number): string {
  switch (severity) {
    case 1:
      return "#69B34C" // Low
    case 2:
      return "#FAB733" // Moderate
    case 3:
      return "#FF8E15" // High
    case 4:
      return "#FF4E11" // Very High
    case 5:
      return "#FF0D0D" // Extreme
    default:
      return "#CCCCCC"
  }
}

function getSeverityLabel(severity: number): string {
  switch (severity) {
    case 1:
      return "Low"
    case 2:
      return "Moderate"
    case 3:
      return "High"
    case 4:
      return "Very High"
    case 5:
      return "Extreme"
    default:
      return "Unknown"
  }
}