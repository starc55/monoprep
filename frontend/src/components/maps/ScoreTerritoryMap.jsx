import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const tashkentCenter = [69.2401, 41.2995];
const uzbekistanAreaKm2 = 448978;

const mapStyle = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: 'CARTO, OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'carto',
      type: 'raster',
      source: 'carto',
      paint: {
        'raster-saturation': -0.22,
        'raster-contrast': 0.18,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.86
      }
    }
  ]
};

function scoreToRadius(score) {
  if (!score) return 1.6;
  return Math.max(2, Math.min(28, 2 + ((score - 400) / 1200) * 26));
}

function scoreToZoom(score) {
  if (score >= 1450) return 9.45;
  if (score >= 1250) return 10.05;
  if (score >= 1050) return 10.65;
  if (score >= 800) return 11.35;
  return 12.05;
}

function offsetCoordinate(origin, eastKm, northKm) {
  const lat = origin[1] + northKm / 110.574;
  const lng = origin[0] + eastKm / (111.32 * Math.cos((origin[1] * Math.PI) / 180));
  return [lng, lat];
}

function buildLoopCoordinates(radiusKm, origin) {
  const scale = Math.max(1.2, radiusKm);
  const shape = [
    [0.36, 0.46],
    [0.12, 0.54],
    [-0.12, 0.42],
    [-0.24, 0.2],
    [-0.42, -0.08],
    [-0.28, -0.52],
    [0.06, -0.43],
    [0.18, -0.12],
    [0.35, -0.24],
    [0.5, 0.18],
    [0.36, 0.46]
  ];

  return shape.map(([east, north]) => offsetCoordinate(origin, east * scale, north * scale));
}

function createTerritoryFeature(coordinates) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    }
  };
}

function createRouteFeature(coordinates) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates
    }
  };
}

function getUnlockedArea(radiusKm) {
  return Math.min(uzbekistanAreaKm2, Math.round(Math.PI * radiusKm * radiusKm));
}

function fitLoop(map, coordinates, duration = 700) {
  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach((point) => bounds.extend(point));
  map.fitBounds(bounds, { padding: 86, duration, bearing: -18, pitch: 42 });
}

export default function ScoreTerritoryMap({ score, label }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const scoreMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const finishMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [origin, setOrigin] = useState(tashkentCenter);
  const radius = useMemo(() => scoreToRadius(score), [score]);
  const loopCoordinates = useMemo(() => buildLoopCoordinates(radius, origin), [origin, radius]);
  const unlockedArea = useMemo(() => getUnlockedArea(radius), [radius]);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const { longitude, latitude } = position.coords;
        const insideUzbekistan =
          longitude >= 55.8 && longitude <= 73.3 && latitude >= 37.1 && latitude <= 45.7;
        setOrigin(insideUzbekistan ? [longitude, latitude] : tashkentCenter);
      },
      () => setOrigin(tashkentCenter),
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 600000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: origin,
      zoom: scoreToZoom(score),
      pitch: 42,
      bearing: -18,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    window.setTimeout(() => map.resize(), 180);
    const failTimer = window.setTimeout(() => setMapFailed(true), 5200);

    map.on('load', () => {
      window.clearTimeout(failTimer);
      setMapReady(true);
      setMapFailed(false);

      map.addSource('score-territory', {
        type: 'geojson',
        data: createTerritoryFeature(loopCoordinates)
      });
      map.addSource('score-route', {
        type: 'geojson',
        data: createRouteFeature(loopCoordinates)
      });
      map.addLayer({
        id: 'score-territory-fill',
        type: 'fill',
        source: 'score-territory',
        paint: {
          'fill-color': '#12b981',
          'fill-opacity': 0.1
        }
      });
      map.addLayer({
        id: 'score-route-glow',
        type: 'line',
        source: 'score-route',
        paint: {
          'line-color': '#15e0ad',
          'line-width': 9,
          'line-opacity': 0.22,
          'line-blur': 4
        }
      });
      map.addLayer({
        id: 'score-territory-line',
        type: 'line',
        source: 'score-territory',
        paint: {
          'line-color': '#10d7a5',
          'line-width': 4,
          'line-opacity': 0.95
        }
      });
      map.addLayer({
        id: 'score-route-line',
        type: 'line',
        source: 'score-route',
        paint: {
          'line-color': '#0fbe8d',
          'line-width': 2.3,
          'line-opacity': 0.95
        }
      });
      fitLoop(map, loopCoordinates, 900);
    });

    map.on('error', () => {
      if (!map.loaded()) setMapFailed(true);
    });

    const scoreNode = document.createElement('div');
    scoreNode.className = 'score-map-marker';
    scoreNode.innerHTML = `<span>${score || '--'}</span>`;
    scoreMarkerRef.current = new maplibregl.Marker({ element: scoreNode, anchor: 'center' })
      .setLngLat(origin)
      .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${label}</strong><br/>${score ? `${unlockedArea.toLocaleString()} km2 unlocked` : 'Complete a scored attempt'}`))
      .addTo(map);

    const startNode = document.createElement('div');
    startNode.className = 'score-route-pin start';
    const finishNode = document.createElement('div');
    finishNode.className = 'score-route-pin finish';
    startMarkerRef.current = new maplibregl.Marker({ element: startNode, anchor: 'center' })
      .setLngLat(loopCoordinates[0])
      .addTo(map);
    finishMarkerRef.current = new maplibregl.Marker({ element: finishNode, anchor: 'center' })
      .setLngLat(loopCoordinates[1])
      .addTo(map);

    mapRef.current = map;
    return () => {
      window.clearTimeout(failTimer);
      scoreMarkerRef.current?.remove();
      startMarkerRef.current?.remove();
      finishMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const update = () => {
      const territorySource = map.getSource('score-territory');
      if (territorySource) {
        territorySource.setData(createTerritoryFeature(loopCoordinates));
      }
      const routeSource = map.getSource('score-route');
      if (routeSource) {
        routeSource.setData(createRouteFeature(loopCoordinates));
      }
      scoreMarkerRef.current
        ?.setLngLat(origin)
        .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${label}</strong><br/>${score ? `${unlockedArea.toLocaleString()} km2 unlocked` : 'Complete a scored attempt'}`));
      const markerElement = scoreMarkerRef.current?.getElement();
      if (markerElement) markerElement.innerHTML = `<span>${score || '--'}</span>`;
      startMarkerRef.current?.setLngLat(loopCoordinates[0]);
      finishMarkerRef.current?.setLngLat(loopCoordinates[1]);
      fitLoop(map, loopCoordinates, 700);
      window.setTimeout(() => map.resize(), 50);
    };

    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [label, loopCoordinates, origin, score, unlockedArea]);

  return (
    <div className={`score-map-shell ${mapReady ? 'ready' : ''} ${mapFailed ? 'failed' : ''}`.trim()} aria-label={`${label} score territory map`}>
      <div className="uzbekistan-map-fallback" aria-hidden="true">
        <svg viewBox="0 0 620 420" role="img">
          <path className="fallback-water" d="M0 308 C70 262 138 286 203 245 C275 202 334 220 396 176 C471 123 533 142 620 91 L620 420 L0 420 Z" />
          <g className="fallback-roads">
            {Array.from({ length: 12 }).map((_, index) => (
              <line key={`v-${index}`} x1={index * 62 - 80} y1="-20" x2={index * 62 + 88} y2="440" />
            ))}
            {Array.from({ length: 9 }).map((_, index) => (
              <line key={`h-${index}`} x1="-30" y1={index * 50 + 12} x2="650" y2={index * 50 - 42} />
            ))}
            <path d="M20 372 C158 314 214 205 334 150 C435 104 509 64 610 18" />
            <path d="M-18 244 C120 250 198 188 288 132 C390 68 489 57 638 82" />
          </g>
          <path className="fallback-territory-fill" d="M422 80 L320 100 L246 155 L184 238 L220 350 L318 324 L348 242 L434 282 L498 158 Z" />
          <path className="fallback-territory-line" d="M422 80 L320 100 L246 155 L184 238 L220 350 L318 324 L348 242 L434 282 L498 158 Z" />
          <circle className="fallback-route-pin start" cx="422" cy="80" r="13" />
          <circle className="fallback-route-pin finish" cx="438" cy="78" r="13" />
        </svg>
      </div>
      <div ref={containerRef} className="score-map-canvas" />
      <div className="score-map-overlay">
        <div className="score-map-overlay-title">
          <span className="score-map-bike-dot" />
          <strong>{label}</strong>
        </div>
        <div className="score-map-metrics">
          <span><b>{unlockedArea.toLocaleString()}</b><small>KM2</small></span>
          <span><b>{score || 0}</b><small>SCORE</small></span>
          <span><b>{radius.toFixed(1)}</b><small>KM</small></span>
        </div>
      </div>
    </div>
  );
}
