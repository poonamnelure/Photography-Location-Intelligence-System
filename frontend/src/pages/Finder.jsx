import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useJsApiLoader } from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import Navbar from "../components/Navbar";
import LocationCard from "../components/LocationCard";
import "../css/finder.css";

// CONSTANTS

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES = ["places"]; // stable reference — defined outside component

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api/locations/search";

const PHOTO_TYPES = [
  { id: "astrophotography", label: "Astrophotography", img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=600" },
  { id: "celebration", label: "Celebration", img: "https://images.unsplash.com/photo-1704399527621-82de0422490c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
  { id: "landscape", label: "Landscape", img: "https://images.unsplash.com/photo-1637611556344-e497c7568faa?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
  { id: "street", label: "Street", img: "https://images.unsplash.com/photo-1509610696553-9243c1e230f0?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
];

const RADIUS_OPTIONS = [10, 20, 30, 40]; // km

// GOOGLE GEOLOCATION API FALLBACK

async function getLocationViaGoogleAPI() {
  const res = await fetch(
    `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
  );
  if (!res.ok) throw new Error("Google Geolocation API failed");
  const data = await res.json();
  return { lat: data.location.lat, lng: data.location.lng };
}

// TWO-TIER LOCATION DETECTION

function detectCurrentLocation(onSuccess, onStatus) {
  if (!navigator.geolocation) {
    onStatus("Browser GPS not available — trying Google API…");
    getLocationViaGoogleAPI()
      .then((c) => { onSuccess(c); onStatus("✓ Location detected via Google API"); })
      .catch(() => { onStatus("⚠ Could not detect location — using Kolhapur default"); onSuccess({ lat: 16.7050, lng: 74.2433 }); });
    return;
  }

  onStatus("Detecting your location…");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onSuccess({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      onStatus("✓ Current location detected");
    },
    (err) => {
      console.warn("navigator.geolocation error:", err.code, err.message);
      onStatus("GPS unavailable — trying Google Geolocation API…");
      getLocationViaGoogleAPI()
        .then((c) => { onSuccess(c); onStatus("✓ Location detected via Google API"); })
        .catch(() => { onStatus("⚠ Could not detect location — using Kolhapur default"); onSuccess({ lat: 16.7050, lng: 74.2433 }); });
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

// GOOGLE PLACES AUTOCOMPLETE HOOK
// — now accepts a locationBias { lat, lng } for proximity ranking

function useGooglePlaces() {
  const svcRef = useRef(null);
  const tokenRef = useRef(null);
  const debounce = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let pollId;

    const tryInit = () => {
      if (!window.google?.maps?.places) return false;
      svcRef.current = new window.google.maps.places.AutocompleteService();
      tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      setSdkReady(true);
      return true;
    };

    if (tryInit()) return;

    pollId = setInterval(() => { if (tryInit()) clearInterval(pollId); }, 150);
    return () => clearInterval(pollId);
  }, []);

  const fetchSuggestions = useCallback((text, locationBias) => {
    clearTimeout(debounce.current);
    if (!text.trim()) { setSuggestions([]); return; }

    debounce.current = setTimeout(() => {
      if (!svcRef.current) return;

      const req = {
        input: text,
        sessionToken: tokenRef.current,
      };

      if (locationBias?.lat != null && window.google?.maps?.LatLng) {
        req.location = new window.google.maps.LatLng(locationBias.lat, locationBias.lng);
        req.radius = 50000;
      }

      svcRef.current.getPlacePredictions(req, (preds, status) => {
        const OK = window.google?.maps?.places?.PlacesServiceStatus?.OK;
        setSuggestions(status === OK && preds ? preds.slice(0, 7) : []);
      });
    }, 200);
  }, []);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  const geocodePlaceId = useCallback(async (placeId) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
    } catch (e) { console.warn("geocodePlaceId REST error", e); }
    return null;
  }, []);

  const geocodeByName = useCallback(async (text, locationBias) => {
    // ── Strategy 1: Places Autocomplete (fuzzy / typo-tolerant) ─────────
    if (svcRef.current) {
      try {
        const req = {
          input: text,
          sessionToken: tokenRef.current,
        };
        if (locationBias?.lat != null && window.google?.maps?.LatLng) {
          req.location = new window.google.maps.LatLng(locationBias.lat, locationBias.lng);
          req.radius = 50000;
        }

        const preds = await new Promise((res) => {
          svcRef.current.getPlacePredictions(req, (preds, status) => {
            const OK = window.google?.maps?.places?.PlacesServiceStatus?.OK;
            res(status === OK && preds?.length ? preds : null);
          });
        });
        if (preds) {
          const c = await geocodePlaceId(preds[0].place_id);
          if (c) return { coords: c, resolvedName: preds[0].description };
        }
      } catch (e) { console.warn("Strategy 1 (Autocomplete):", e); }
    }

    // ── Strategy 2: Client-side PlacesService textSearch ──
    try {
      if (window.google?.maps?.places?.PlacesService) {
        const dummyDiv = document.createElement("div");
        const placesService = new window.google.maps.places.PlacesService(dummyDiv);
        const req2 = { query: text };
        if (locationBias?.lat != null) {
          req2.location = new window.google.maps.LatLng(locationBias.lat, locationBias.lng);
          req2.radius = 50000;
        }
        const result2 = await new Promise((res2) => {
          placesService.textSearch(req2, (results, status) => {
            const OK = window.google.maps.places.PlacesServiceStatus.OK;
            res2(status === OK && results?.length ? results[0] : null);
          });
        });
        if (result2) {
          const lat = result2.geometry.location.lat();
          const lng = result2.geometry.location.lng();
          const name = result2.formatted_address || result2.name || text;
          return { coords: { lat, lng }, resolvedName: name };
        }
      }
    } catch (e) { console.warn("Strategy 2 (PlacesService textSearch):", e); }

    // ── Strategy 3: Geocoding REST API ───────────────────────────────────
    try {
      const gcUrl = `https://maps.googleapis.com/maps/api/geocode/json`
        + `?address=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}`;
      const gcRes = await fetch(gcUrl);
      const gcData = await gcRes.json();
      if (gcData.status === "OK" && gcData.results?.[0]) {
        const { lat, lng } = gcData.results[0].geometry.location;
        return { coords: { lat, lng }, resolvedName: gcData.results[0].formatted_address };
      }
    } catch (e) { console.warn("Strategy 3 (Geocoding):", e); }

    return null;
  }, [geocodePlaceId]);

  return { suggestions, fetchSuggestions, clearSuggestions, geocodePlaceId, geocodeByName, sdkReady };
}

/* ─────────────────────────────────────────────────────────────
   SCORE HELPERS
───────────────────────────────────────────────────────────── */
const calcScore = (p) => {
  if (!p) return 50;
  const { weatherSuitability = 0, lightingCondition = 0,
    accessibility = 0, crowdDensity = 0,
    timeSuitability = 0, lightPollution = 0 } = p;
  return Math.round(
    (weatherSuitability + lightingCondition + accessibility +
      crowdDensity + timeSuitability + lightPollution) * (100 / 6)
  );
};

const scoreLabel = (s) => s > 80 ? "Perfect" : s > 60 ? "Great" : s > 40 ? "Good" : "Average";
const scoreColor = (s) => s > 80 ? "#c8a96e" : s > 60 ? "#a88c5d" : s > 40 ? "#8a724a" : "#6b5738";

const transform = (raw = []) =>
  raw.map((item, i) => {
    const score = item.finalScore != null
      ? Math.round(item.finalScore * 100)
      : calcScore(item.rawParameters);
    return {
      id: i,
      name: item.name,
      area: item.area || item.vicinity || "Nearby",
      score,
      label: scoreLabel(score),
      highlights: item.keyHighlights || [],
      routeUrl: item.routeUrl || `https://www.google.com/maps/dir/?api=1&destination=${item.location.lat},${item.location.lng}`,
      lat: item.location.lat,
      lng: item.location.lng,
      distance: parseFloat(item.distanceKm) || 0,
      parameters: item.rawParameters || {},
      finalScore: item.finalScore,
    };
  });

/* ─────────────────────────────────────────────────────────────
   FINDER PAGE
───────────────────────────────────────────────────────────── */
export default function Finder() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  const navigate = useNavigate();

  /* ── Form state ───────────────────────────────────────────────────────── */
  const [photoType, setPhotoType] = useState("");
  const [radiusKm, setRadiusKm] = useState(null);
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [locationMode, setLocationMode] = useState("");
  const [manualSubMode, setManualSubMode] = useState("");

  /* Name-search state */
  const [nameText, setNameText] = useState("");
  const [pickedPred, setPickedPred] = useState(null);

  /* LatLng DMS state */
  const [latDeg, setLatDeg] = useState("");
  const [latMin, setLatMin] = useState("");
  const [latSec, setLatSec] = useState("");
  const [latDir, setLatDir] = useState("N");
  const [lngDeg, setLngDeg] = useState("");
  const [lngMin, setLngMin] = useState("");
  const [lngSec, setLngSec] = useState("");
  const [lngDir, setLngDir] = useState("E");

  /* Map state */
  const [coords, setCoords] = useState({ lat: 16.7050, lng: 74.2433 });
  const [mapCenter, setMapCenter] = useState({ lat: 16.7050, lng: 74.2433 });
  const [userMarker, setUserMarker] = useState(null);

  const userRealLocation = useRef(null);

  const [locStatus, setLocStatus] = useState("");

  /* Result state */
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [error, setError] = useState("");

  /* Highlighted suggestion index for keyboard nav */
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  /* Google Places */
  const { suggestions, fetchSuggestions, clearSuggestions,
    geocodePlaceId, geocodeByName, sdkReady } = useGooglePlaces();
  const inputRef = useRef(null);
  const suggestBoxRef = useRef(null);

  /* Cursor glow */
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 20 });
  const sy = useSpring(my, { stiffness: 90, damping: 20 });
  useEffect(() => {
    const h = (e) => { mx.set(e.clientX); my.set(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  /* ── Auto-detect real location on mount ── */
  useEffect(() => {
    detectCurrentLocation(
      (c) => { userRealLocation.current = c; },
      () => {}
    );
  }, []);

  /* ── Geolocation (for "Current Location" mode) ──────────────────────── */
  useEffect(() => {
    if (locationMode !== "current") return;
    setLocStatus("Detecting your location…");
    detectCurrentLocation(
      (c) => {
        setCoords(c);
        setMapCenter(c);
        setUserMarker(c);
        userRealLocation.current = c;
        setLocStatus("✓ Location detected");
      },
      (statusText) => setLocStatus(statusText)
    );
  }, [locationMode]);

  /* Reset manual sub-state when switching away */
  useEffect(() => {
    if (locationMode !== "manual") {
      setManualSubMode("");
      setNameText("");
      setPickedPred(null);
      setLatDeg(""); setLatMin(""); setLatSec(""); setLatDir("N");
      setLngDeg(""); setLngMin(""); setLngSec(""); setLngDir("E");
      clearSuggestions();
      setHighlightedIdx(-1);
    }
  }, [locationMode]);

  /* Reset highlight when suggestions change */
  useEffect(() => { setHighlightedIdx(-1); }, [suggestions]);

  /* Close suggestion box on outside click */
  useEffect(() => {
    const h = (e) => {
      if (!suggestBoxRef.current?.contains(e.target) &&
        !inputRef.current?.contains(e.target)) clearSuggestions();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [clearSuggestions]);

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  const pickSuggestion = async (pred) => {
    setNameText(pred.description);
    setPickedPred(pred);
    clearSuggestions();
    setHighlightedIdx(-1);
    const c = await geocodePlaceId(pred.place_id);
    if (c) {
      setCoords(c);
      setMapCenter(c);
      setUserMarker(c);
    }
  };

  const handleInputKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[highlightedIdx]);
    } else if (e.key === "Escape") {
      clearSuggestions();
    }
  };

  /* ── DMS helpers ──────────────────────────────────────────────────────── */
  const decimalToDMS = (decimal) => {
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const minFull = (abs - deg) * 60;
    const min = Math.floor(minFull);
    const sec = ((minFull - min) * 60).toFixed(4);
    return { deg: String(deg), min: String(min), sec: String(sec) };
  };

  const resolveLatLngForm = () => {
    const d = parseFloat(latDeg);
    const m = parseFloat(latMin) || 0;
    const s = parseFloat(latSec) || 0;
    const D = parseFloat(lngDeg);
    const M = parseFloat(lngMin) || 0;
    const S = parseFloat(lngSec) || 0;
    if (isNaN(d) || isNaN(D)) return null;
    if (d < 0 || d > 90 || D < 0 || D > 180) return null;
    if (m < 0 || m >= 60 || M < 0 || M >= 60) return null;
    if (s < 0 || s >= 60 || S < 0 || S >= 60) return null;
    let lat = d + m / 60 + s / 3600;
    let lng = D + M / 60 + S / 3600;
    if (latDir === "S") lat = -lat;
    if (lngDir === "W") lng = -lng;
    return { lat, lng };
  };

  /* ── Search ───────────────────────────────────────────────────────────── */
  const handleSearch = async () => {
    setError("");

    if (!photoType) {
      setError("Please select a Photography Type.");
      return;
    }
    if (!radiusKm) {
      setError("Please select a Radius.");
      return;
    }
    if (!locationMode) {
      setError("Please choose a location — Select Current Location or Enter Manually.");
      return;
    }

    let searchCoords = null;

    if (locationMode === "current") {
      if (!userMarker) {
        setError("Still detecting your location, please wait…");
        return;
      }
      searchCoords = userMarker;
    }

    if (locationMode === "manual") {
      if (!manualSubMode) {
        setError("Please choose how to enter the location — by Name or by Lat / Lng.");
        return;
      }

      if (manualSubMode === "name") {
        if (!nameText.trim()) {
          setError("Please type a place name.");
          return;
        }

        if (pickedPred && userMarker) {
          searchCoords = userMarker;
        } else {
          setLoading(true);
          const result = await geocodeByName(nameText.trim(), coords);
          setLoading(false);
          if (!result) {
            setError(`Couldn't locate "${nameText}". Try selecting from the suggestions or add a city name.`);
            return;
          }
          setNameText(result.resolvedName);
          setCoords(result.coords);
          setMapCenter(result.coords);
          setUserMarker(result.coords);
          searchCoords = result.coords;
        }
      }

      if (manualSubMode === "latlng") {
        const c = resolveLatLngForm();
        if (!c) {
          setError("Please enter valid Latitude (0–90) and Longitude (0–180) values.");
          return;
        }
        setCoords(c);
        setMapCenter(c);
        setUserMarker(c);
        searchCoords = c;
      }
    }

    if (!searchCoords) {
      setError("Location could not be resolved. Please try again.");
      return;
    }

    setLoading(true);
    setMapCenter({ lat: searchCoords.lat, lng: searchCoords.lng });

    const realLoc = userRealLocation.current;
    const body = {
      lat: searchCoords.lat,
      lng: searchCoords.lng,
      radius: radiusKm * 1000,
      photographyType: photoType,
      dateTime: dateTime || new Date().toISOString(),
      ...(realLoc ? { userLat: realLoc.lat, userLng: realLoc.lng } : {}),
    };

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fmt = transform(data.rankedLocations || [])
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      setResults(fmt);
      setSelected(fmt[0]?.id ?? null);
      if (fmt.length > 0) {
        const midLat = (searchCoords.lat + fmt[0].lat) / 2;
        const midLng = (searchCoords.lng + fmt[0].lng) / 2;
        setMapCenter({ lat: midLat, lng: midLng });
      }
      // Navigate to Results page with results + payload — no payload shown on screen
      navigate("/results", { state: { results: fmt, payload: body } });
    } catch (err) {
      console.error(err);
      setError("Could not reach the server. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────── */
  if (!isLoaded) return null;

  return (
    <>
      <Navbar />

      <div className="finder-root">
        <motion.div className="f-cursor-glow" style={{ left: sx, top: sy }} />

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <motion.header
          className="f-hero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
        >
          <h1 className="f-heading">
            Find Your <em>Perfect</em> Location
          </h1>
          <p className="f-sub">
            Intelligent spot recommendations based on weather, lighting & crowd data.
          </p>
        </motion.header>

        {/* ── Search Form ────────────────────────────────────────────────── */}
        <motion.div
          className="f-card"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12 }}
        >
          {/* Row 1: Photo Type (Full width image grid) */}
          <div className="f-field f-field--full">
            <label className="f-label">Type of Photography</label>
            <div className="f-photo-type-grid">
              {PHOTO_TYPES.map((t) => (
                <label
                  key={t.id}
                  className={`f-photo-card ${photoType === t.id ? "f-photo-card--on" : ""}`}
                >
                  <input type="radio" name="photoType" value={t.id}
                    checked={photoType === t.id} onChange={() => setPhotoType(t.id)} />
                  <img src={t.img} alt={t.label} className="f-photo-img" />
                  <div className="f-photo-overlay"></div>
                  <span className="f-photo-label">{t.label}</span>
                  {photoType === t.id && (
                    <div className="f-photo-check">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="f-check-icon">
                        <circle cx="12" cy="12" r="12" fill="#c8a96e" />
                        <path d="M17 8L10 16L7 12.5" stroke="#0a0a0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Row 2: Location + Radius */}
          <div className="f-row-split">
            {/* ── Left Column: Radius + Date ──────────────────────────────────────── */}
            <div className="f-col-stack" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* ── Radius field ──────────────────────────────────────── */}
              <div className="f-field" style={{ alignSelf: 'start', width: '100%' }}>
                <label className="f-label">Select Radius in KM</label>
                <div className="f-radius-grid">
                  {RADIUS_OPTIONS.map((r) => (
                    <button key={r}
                      className={`f-radius-btn ${radiusKm === r ? "f-radius-btn--on" : ""}`}
                      onClick={() => setRadiusKm(r)}>
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Date and Time ──────────────────────────────────────────── */}
              <div className="f-field">
                <label className="f-label">Date and Time</label>
                <div className="f-input-wrap">
                  <span className="f-input-icon">◷</span>
                  <input className="f-input" type="datetime-local"
                    value={dateTime}
                    min={getMinDateTime()}
                    onChange={(e) => {
                      if (e.target.value < getMinDateTime()) return;
                      setDateTime(e.target.value);
                    }} />
                </div>
                <div className="f-date-actions">
                  <p className="f-hint">Defaults to current date &amp; time.</p>
                  <button
                    className="f-today-btn"
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                      setDateTime(now.toISOString().slice(0, 16));
                    }}
                  >
                    ↺ Use Today
                  </button>
                </div>
              </div>
            </div> {/* End Left Column */}

            {/* ── Location field ──────────────────────────────────────── */}
            <div className="f-field">
              <label className="f-label">Input Location</label>

              <div className="f-location-radios">
                <label className={`f-loc-radio ${locationMode === "current" ? "f-loc-radio--on" : ""}`}>
                  <input type="radio" name="locMode" value="current"
                    checked={locationMode === "current"}
                    onChange={() => {
                      setLocationMode("current");
                      setUserMarker(null);
                      setLocStatus("");
                    }} />
                  <span className="f-radio-dot" />
                  Select Current Location
                </label>

                <label className={`f-loc-radio ${locationMode === "manual" ? "f-loc-radio--on" : ""}`}>
                  <input type="radio" name="locMode" value="manual"
                    checked={locationMode === "manual"}
                    onChange={() => {
                      setLocationMode("manual");
                      setUserMarker(null);
                      setLocStatus("");
                    }} />
                  <span className="f-radio-dot" />
                  Enter Location Manually
                </label>
              </div>

              {/* Current location status chip */}
              <AnimatePresence>
                {locationMode === "current" && locStatus && (
                  <motion.div
                    className={`f-status-chip ${locStatus.startsWith("✓") ? "f-status-chip--ok" : ""}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="f-status-icon">
                      {locStatus.startsWith("✓") ? "✓" : "⟳"}
                    </span>
                    <span>{locStatus.replace("✓ ", "")}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Manual sub-options */}
              <AnimatePresence>
                {locationMode === "manual" && (
                  <motion.div
                    className="f-manual-block"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    {/* Sub-mode tabs */}
                    <div className="f-submode-tabs">
                      <button
                        type="button"
                        className={`f-submode-tab ${manualSubMode === "name" ? "f-submode-tab--on" : ""}`}
                        onClick={() => {
                          setManualSubMode("name");
                          setUserMarker(null);
                          setPickedPred(null);
                          setNameText("");
                          clearSuggestions();
                          setHighlightedIdx(-1);
                          setTimeout(() => inputRef.current?.focus(), 120);
                        }}
                      >
                        <span className="f-tab-icon">◎</span>
                        Search by Name
                      </button>
                      <button
                        type="button"
                        className={`f-submode-tab ${manualSubMode === "latlng" ? "f-submode-tab--on" : ""}`}
                        onClick={() => {
                          setManualSubMode("latlng");
                          setUserMarker(null);
                          setLatDeg(""); setLngDeg("");
                          setLatDir("N"); setLngDir("E");
                          clearSuggestions();
                        }}
                      >
                        <span className="f-tab-icon">🧭</span>
                        Enter Lat / Lng
                      </button>
                    </div>

                    {/* ── Name search panel ─────────────────────────────── */}
                    <AnimatePresence mode="wait">
                      {manualSubMode === "name" && (
                        <motion.div
                          key="name-panel"
                          className="f-subpanel"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* ── Enhanced autocomplete input ─────────────── */}
                          <div className="f-autocomplete-wrap" ref={suggestBoxRef}>
                            <div className="f-search-input-row">
                              <span className="f-input-icon f-search-icon">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                                  <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </span>
                              <input
                                ref={inputRef}
                                className="f-input f-search-input"
                                type="text"
                                placeholder="Search temples, beaches, landmarks…"
                                value={nameText}
                                autoComplete="off"
                                spellCheck="false"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNameText(val);
                                  setPickedPred(null);
                                  setUserMarker(null);
                                  fetchSuggestions(val, coords);
                                }}
                                onKeyDown={handleInputKeyDown}
                              />
                              {!sdkReady && nameText && (
                                <span className="f-input-spinner">⟳</span>
                              )}
                              {nameText && (
                                <button
                                  className="f-input-clear"
                                  type="button"
                                  onClick={() => {
                                    setNameText("");
                                    setPickedPred(null);
                                    setUserMarker(null);
                                    clearSuggestions();
                                    inputRef.current?.focus();
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* ── Suggestion dropdown ─ */}
                            <AnimatePresence>
                              {suggestions.length > 0 && (
                                <motion.div
                                  className="f-suggestions-panel"
                                  initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                  exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
                                  transition={{ duration: 0.15 }}
                                  style={{ transformOrigin: "top" }}
                                >
                                  <ul className="f-suggestions-list">
                                    {suggestions.map((p, idx) => {
                                      const main = p.structured_formatting?.main_text || p.description;
                                      const secondary = p.structured_formatting?.secondary_text || "";
                                      const isHighlighted = idx === highlightedIdx;
                                      return (
                                        <li
                                          key={p.place_id}
                                          className={`f-sug-row ${isHighlighted ? "f-sug-row--active" : ""}`}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            pickSuggestion(p);
                                          }}
                                          onMouseEnter={() => setHighlightedIdx(idx)}
                                        >
                                          <span className="f-sug-icon-wrap">
                                            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                                              <path d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                                                fill={isHighlighted ? "#c8a96e" : "#6b5f4a"} />
                                              <circle cx="7" cy="7" r="2.5"
                                                fill={isHighlighted ? "#0a0a0b" : "#c8a96e"} />
                                            </svg>
                                          </span>

                                          <span className="f-sug-content">
                                            <span className="f-sug-main">{main}</span>
                                            {secondary && (
                                              <span className="f-sug-secondary">{secondary}</span>
                                            )}
                                          </span>

                                          {isHighlighted && (
                                            <span className="f-sug-arrow">↗</span>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <div className="f-sug-footer">
                                    <span>Powered by</span>
                                    <span className="f-sug-brand">Google</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Gold chip when pin is placed */}
                          <AnimatePresence>
                            {pickedPred && userMarker && (
                              <motion.div
                                className="f-coords-chip"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <span style={{ display: "inline-flex", alignItems: "center" }}>
                                  <svg width="11" height="14" viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.5 0C2.46 0 0 2.46 0 5.5c0 3.85 5.5 8.5 5.5 8.5S11 9.35 11 5.5C11 2.46 8.54 0 5.5 0z" fill="#c8a96e" />
                                    <circle cx="5.5" cy="5.5" r="2" fill="#0a0a0b" />
                                  </svg>
                                </span>
                                <span>lat {userMarker.lat.toFixed(4)}</span>
                                <span className="f-coords-sep">·</span>
                                <span>lng {userMarker.lng.toFixed(4)}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <p className="f-hint">
                            Select from suggestions to pin the location on the map,
                            or just type and click <em>Discover Locations</em>.
                          </p>
                        </motion.div>
                      )}

                      {/* ── Lat / Lng DMS panel ──────────────────────────── */}
                      {manualSubMode === "latlng" && (
                        <motion.div
                          key="latlng-panel"
                          className="f-subpanel"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* ── Latitude DMS ── */}
                          <div className="f-latlng-row">
                            <label className="f-latlng-label">Latitude</label>
                            <div className="f-dms-inputs">
                              <div className="f-dms-field">
                                <input className="f-latlng-num" type="number" min="0" max="90" step="1"
                                  placeholder="°" value={latDeg}
                                  onChange={(e) => { setLatDeg(e.target.value); setUserMarker(null); }} />
                                <span className="f-dms-unit">°</span>
                              </div>
                              <div className="f-dms-field">
                                <input className="f-latlng-num" type="number" min="0" max="59" step="1"
                                  placeholder="′" value={latMin}
                                  onChange={(e) => { setLatMin(e.target.value); setUserMarker(null); }} />
                                <span className="f-dms-unit">′</span>
                              </div>
                              <div className="f-dms-field">
                                <input className="f-latlng-num" type="number" min="0" max="59.9999" step="any"
                                  placeholder="″" value={latSec}
                                  onChange={(e) => { setLatSec(e.target.value); setUserMarker(null); }} />
                                <span className="f-dms-unit">″</span>
                              </div>
                              <select className="f-latlng-dir" value={latDir}
                                onChange={(e) => { setLatDir(e.target.value); setUserMarker(null); }}>
                                <option value="N">N</option>
                                <option value="S">S</option>
                              </select>
                            </div>
                          </div>

                          {/* ── Longitude DMS ── */}
                          <div className="f-latlng-row">
                            <label className="f-latlng-label">Longitude</label>
                            <div className="f-dms-inputs">
                              <div className="f-dms-field">
                                <input className="f-latlng-num" type="number" min="0" max="180" step="1"
                                  placeholder="°" value={lngDeg}
                                  onChange={(e) => { setLngDeg(e.target.value); setUserMarker(null); }} />
                                <span className="f-dms-unit">°</span>
                              </div>
                              <div className="f-dms-field">
                                <input className="f-latlng-num" type="number" min="0" max="59" step="1"
                                  placeholder="′" value={lngMin}
                                  onChange={(e) => { setLngMin(e.target.value); setUserMarker(null); }} />
                                <span className="f-dms-unit">′</span>
                              </div>
                              <div className="f-dms-field">
                                <input className="f-latlng-num" type="number" min="0" max="59.9999" step="any"
                                  placeholder="″" value={lngSec}
                                  onChange={(e) => { setLngSec(e.target.value); setUserMarker(null); }} />
                                <span className="f-dms-unit">″</span>
                              </div>
                              <select className="f-latlng-dir" value={lngDir}
                                onChange={(e) => { setLngDir(e.target.value); setUserMarker(null); }}>
                                <option value="E">E</option>
                                <option value="W">W</option>
                              </select>
                            </div>
                          </div>

                          {/* Live decimal preview */}
                          <AnimatePresence>
                            {resolveLatLngForm() && (() => {
                              const c = resolveLatLngForm();
                              return (
                                <motion.div
                                  className="f-coords-chip"
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <span>📍</span>
                                  <span>{latDeg}°{latMin ? latMin + "′" : ""}{latSec ? latSec + "″" : ""} {latDir}</span>
                                  <span className="f-coords-sep">·</span>
                                  <span>{lngDeg}°{lngMin ? lngMin + "′" : ""}{lngSec ? lngSec + "″" : ""} {lngDir}</span>
                                  <span className="f-coords-sep">≈</span>
                                  <span>{c.lat.toFixed(6)}, {c.lng.toFixed(6)}</span>
                                </motion.div>
                              );
                            })()}
                          </AnimatePresence>
                          <p className="f-hint">
                            Format: <strong>41°24′12.2″N</strong> · Degrees (0–90/180), Minutes (0–59),
                            Seconds (0–59.99), then N/S or E/W hemisphere.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div> {/* End f-row-split */}

          {/* CTA */}
          {error && <p className="f-error">{error}</p>}

          <motion.button
            className="f-search-btn"
            onClick={handleSearch}
            disabled={loading}
            whileTap={{ scale: 0.975 }}
          >
            {loading ? <span className="f-spinner" /> : <>✦&nbsp;&nbsp;Discover Locations</>}
          </motion.button>

        </motion.div>

        {/* ── Map ────────────────────────────────────────────────────────── */}
        <motion.div
          className="f-map-wrap"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.28 }}
        >
          <MapView
            locations={results}
            selectedLocation={selected}
            setSelectedLocation={setSelected}
            setCoords={(c) => {
              setCoords(c);
              setMapCenter(c);
              setUserMarker(c);
              setLocationMode("manual");
              setManualSubMode("latlng");
              const latDMS = decimalToDMS(c.lat);
              const lngDMS = decimalToDMS(c.lng);
              setLatDeg(latDMS.deg); setLatMin(latDMS.min); setLatSec(latDMS.sec);
              setLatDir(c.lat >= 0 ? "N" : "S");
              setLngDeg(lngDMS.deg); setLngMin(lngDMS.min); setLngSec(lngDMS.sec);
              setLngDir(c.lng >= 0 ? "E" : "W");
            }}
            locationMode={locationMode}
            mapCenter={mapCenter}
            userMarker={userMarker}
            radiusMeters={radiusKm ? radiusKm * 1000 : null}
          />
        </motion.div>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.section
              className="f-results"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="f-results-title">
                Top Locations
                <span className="f-results-count">{results.length} found</span>
              </h2>
              <div className="f-results-grid">
                {results.map((loc, idx) => (
                  <div key={loc.id} onClick={() => {
                    setSelected(loc.id);
                    setMapCenter({ lat: loc.lat, lng: loc.lng });
                  }}>
                    <LocationCard
                      location={loc}
                      index={idx}
                      isSelected={selected === loc.id}
                      expandedCard={expanded}
                      setExpandedCard={setExpanded}
                      hoveredCard={hovered}
                      setHoveredCard={setHovered}
                      getScoreColor={scoreColor}
                      getScoreLabel={scoreLabel}
                    />
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}