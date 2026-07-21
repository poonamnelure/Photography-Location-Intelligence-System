import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";

const CONTAINER_STYLE = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 16.7050, lng: 74.2433 };

/* Dark gold map theme */
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#111113" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5a5340" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#9e8a62" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#161618" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#5a5340" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#121412" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c1c1f" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b6045" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3020" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f1a0e" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#c8a96e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1a1a1d" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#7a6b4e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1520" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d4a5c" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

/* SVG for the gold result pins */
const resultPinSVG = (isActive) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <ellipse cx="16" cy="38" rx="6" ry="2" fill="%23000" opacity="0.3"/>
    <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0z"
      fill="${isActive ? "%23c8a96e" : "%238a724a"}"
      stroke="${isActive ? "%23f0ede8" : "%236b5738"}"
      stroke-width="1.5"/>
    <circle cx="16" cy="12" r="4" fill="${isActive ? "%230a0a0b" : "%23c8a96e"}" opacity="0.9"/>
  </svg>`;

/* SVG for the user location pin — gold (used for both current & manual) */
const USER_PIN_SVG =
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <ellipse cx="18" cy="42" rx="7" ry="2.5" fill="%23000" opacity="0.35"/>
    <path d="M18 0C10.82 0 5 5.82 5 13c0 10 13 31 13 31S31 23 31 13C31 5.82 25.18 0 18 0z"
      fill="%23c8a96e" stroke="%23f0ede8" stroke-width="2"/>
    <circle cx="18" cy="13" r="5" fill="%230a0a0b" opacity="0.95"/>
    <circle cx="18" cy="13" r="3" fill="%23c8a96e"/>
  </svg>`;

/**
 * MapView
 *
 * Props:
 *   locations           {Array}       — result objects [{ id, lat, lng, ... }]
 *   selectedLocation    {number}      — id of highlighted result marker
 *   setSelectedLocation               — setter
 *   setCoords           {Function}    — called on map click in "manual" mode
 *   locationMode        {string}      — "current" | "manual"
 *   mapCenter           {Object}      — { lat, lng } controlled center
 *   userMarker          {Object|null} — { lat, lng } for "You are here" pin
 *   radiusMeters        {number}      — radius in metres for the golden circle
 */
export default function MapView({
  locations,
  selectedLocation,
  setSelectedLocation,
  setCoords,
  locationMode,
  mapCenter,
  userMarker,
  radiusMeters,
}) {
  const mapRef = useRef(null);  // GoogleMap instance
  const circleRef = useRef(null);  // ONE google.maps.Circle instance — never recreated
  const [recentered, setRecentered] = useState(false); // flash animation state

  /* ── Recenter handler ───────────────────────────────────────────────────── */
  const handleRecenter = () => {
    const target = userMarker || mapCenter;
    if (!mapRef.current || !target) return;
    mapRef.current.panTo(target);
    if (radiusMeters) {
      const EARTH_R = 6378137;
      const dLat = (radiusMeters / EARTH_R) * (180 / Math.PI);
      const dLng = dLat / Math.cos((target.lat * Math.PI) / 180);
      mapRef.current.fitBounds(
        new window.google.maps.LatLngBounds(
          { lat: target.lat - dLat, lng: target.lng - dLng },
          { lat: target.lat + dLat, lng: target.lng + dLng }
        ),
        40
      );
    } else {
      mapRef.current.setZoom(13);
    }
    setRecentered(true);
    setTimeout(() => setRecentered(false), 600);
  };

  /* ── Called once when GoogleMap mounts ─────────────────────────────────── */
  const handleMapLoad = (map) => {
    mapRef.current = map;

    /*
     * Create exactly ONE native Circle and keep it alive for the
     * component lifetime. We update it with setCenter / setRadius —
     * never create a second one.
     *
     * Initially hidden - shows only when radiusMeters is set
     */
    circleRef.current = new window.google.maps.Circle({
      map: radiusMeters ? map : null,  // Only show if radiusMeters exists
      center: mapCenter || DEFAULT_CENTER,
      radius: radiusMeters || 10000,
      strokeColor: "#c8a96e",
      strokeOpacity: 0.85,
      strokeWeight: 2.5,
      fillColor: "#c8a96e",
      fillOpacity: 0.08,   // very faint — map labels fully visible through it
      clickable: false,
      zIndex: 1,
    });
  };

  /* ── Sync circle CENTER when mapCenter changes ──────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !mapCenter) return;
    mapRef.current.panTo(mapCenter);
    circleRef.current?.setCenter(mapCenter);
  }, [mapCenter]);

  /* ── Sync circle RADIUS + refit zoom when radius or center changes ───────── */
  useEffect(() => {
    if (!circleRef.current) return;

    if (radiusMeters) {
      // Show the circle with animation
      circleRef.current.setMap(mapRef.current);
      circleRef.current.setRadius(radiusMeters);

      // Fit map to show the entire circle using pure math (no Circle object)
      if (mapRef.current && mapCenter) {
        const EARTH_R = 6378137;
        const dLat = (radiusMeters / EARTH_R) * (180 / Math.PI);
        const dLng = dLat / Math.cos((mapCenter.lat * Math.PI) / 180);
        mapRef.current.fitBounds(
          new window.google.maps.LatLngBounds(
            { lat: mapCenter.lat - dLat, lng: mapCenter.lng - dLng },
            { lat: mapCenter.lat + dLat, lng: mapCenter.lng + dLng }
          ),
          40  // padding px
        );
      }
    } else {
      // Hide the circle when no radius selected
      circleRef.current.setMap(null);
    }
  }, [radiusMeters, mapCenter]);

  /* ── Cleanup on unmount ─────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={mapCenter || DEFAULT_CENTER}
      zoom={13}
      options={{
        styles: DARK_STYLE,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: "greedy",
      }}
      onLoad={handleMapLoad}
      onClick={(e) => {
        if (locationMode === "manual" && setCoords) {
          setCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      }}
    >
      {/* Gold user pin — same icon for current location & manual entry */}
      {userMarker && (
        <Marker
          position={{ lat: userMarker.lat, lng: userMarker.lng }}
          title="Selected location"
          zIndex={999}
          icon={{
            url: USER_PIN_SVG,
            scaledSize: { width: 36, height: 44 },
            anchor: { x: 18, y: 44 },
          }}
        />
      )}

      {/* Result pins — gold */}
      {locations.map((loc) => {
        const isActive = loc.id === selectedLocation;
        return (
          <Marker
            key={loc.id}
            position={{ lat: loc.lat, lng: loc.lng }}
            title={loc.name}
            onClick={() => setSelectedLocation(loc.id)}
            icon={{
              url: resultPinSVG(isActive),
              scaledSize: { width: 32, height: 40 },
              anchor: { x: 16, y: 40 },
            }}
          />
        );
      })}
    </GoogleMap>

      {/* ── Recenter button ── */}
      <button
        onClick={handleRecenter}
        title="Recenter map"
        style={{
          position: "absolute",
          bottom: "80px",
          right: "12px",
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          border: "1px solid rgba(200,169,110,0.35)",
          background: recentered
            ? "rgba(200,169,110,0.22)"
            : "rgba(17,17,19,0.92)",
          backdropFilter: "blur(8px)",
          color: "#c8a96e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: recentered
            ? "0 0 18px rgba(200,169,110,0.45), 0 2px 12px rgba(0,0,0,0.5)"
            : "0 2px 12px rgba(0,0,0,0.5)",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 10,
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(200,169,110,0.18)";
          e.currentTarget.style.borderColor = "rgba(200,169,110,0.7)";
          e.currentTarget.style.transform = "scale(1.07)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = recentered
            ? "rgba(200,169,110,0.22)"
            : "rgba(17,17,19,0.92)";
          e.currentTarget.style.borderColor = "rgba(200,169,110,0.35)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {/* Crosshair / recenter SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2"  x2="12" y2="6"  />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2"  y1="12" x2="6"  y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </button>
    </div>
  );
}