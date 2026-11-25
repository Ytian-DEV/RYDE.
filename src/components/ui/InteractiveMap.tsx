import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { WebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { GlassSurface } from '@/components/ui/GlassSurface';
import {
  getFallbackRasterStyle,
  getMapLibreStyleUrl,
} from '@/config/mapConfig';
import { RADII, TABULAR_NUMS } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { DEFAULT_CENTER } from '@/services/geoService';
import { LatLng, PlaceLocation } from '@/types';

const NativeWebView = WebView as unknown as React.ComponentType<
  WebViewProps & { ref?: React.Ref<WebView> }
>;

export interface InteractiveMapProps {
  pickup?: PlaceLocation;
  destination?: PlaceLocation | null;
  routeCoords?: Array<[number, number]>;
  showRoute?: boolean;
  showRadar?: boolean;
  driverCoords?: LatLng | null;
  driverProgress?: number; // fallback 0..1 interpolation if driverCoords not supplied
  etaPillLabel?: string;
  pinMode?: boolean;
  pinTarget?: 'pickup' | 'destination';
  recenterTrigger?: number;
  onPinSelect?: (lat: number, lng: number) => void;
  onPinCenterChange?: (lat: number, lng: number) => void;
}

const PICKUP_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" fill="#FFFFFF"/></svg>`;
const DEST_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="#FFFFFF"/></svg>`;

function buildMapLibreHtml(
  isDark: boolean,
  accentColor: string,
  accentDeepColor: string,
  accentSoftColor: string
): string {
  const styleUrl = getMapLibreStyleUrl(isDark);
  const fallbackStyleJson = JSON.stringify(getFallbackRasterStyle(isDark));
  const bg = isDark ? '#14181F' : '#ECEAE2';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@5.2.0/dist/maplibre-gl.css" rel="stylesheet" />
<style>
  html, body, #map {
    margin: 0; padding: 0; width: 100%; height: 100%;
    background: ${bg}; overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .maplibregl-ctrl-attrib {
    font-size: 9px !important;
    opacity: 0.48;
    background: transparent !important;
  }
  .ryde-pin-pickup {
    width: 30px; height: 30px; border-radius: 11px;
    background: #181C23; border: 2px solid #FFFFFF;
    display: flex; align-items: center; justify-content: center;
  }
  .ryde-pin-dest {
    width: 30px; height: 30px; border-radius: 11px;
    background: ${accentColor}; border: 2px solid #FFFFFF;
    display: flex; align-items: center; justify-content: center;
  }
  .ryde-driver {
    width: 26px; height: 26px; border-radius: 50%;
    background: ${accentColor}; border: 3px solid #181C23;
    box-shadow: 0 0 0 8px ${accentSoftColor};
  }
  .ryde-radar-wrap {
    position: relative; width: 120px; height: 120px;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }
  .ryde-radar-ring {
    position: absolute; width: 120px; height: 120px; border-radius: 50%;
    border: 2px solid ${accentDeepColor}; background: ${accentSoftColor};
    animation: rydePulse 2s ease-out infinite;
  }
  .ryde-radar-ring.delay { animation-delay: 1s; }
  .ryde-radar-core {
    width: 20px; height: 20px; border-radius: 50%;
    background: #181C23; border: 4px solid ${accentColor}; z-index: 2;
  }
  @keyframes rydePulse {
    0% { transform: scale(0.35); opacity: 0.85; }
    100% { transform: scale(1.25); opacity: 0; }
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@5.2.0/dist/maplibre-gl.js"></script>
<script>
  const PRIMARY_STYLE = ${JSON.stringify(styleUrl)};
  const FALLBACK_STYLE = ${fallbackStyleJson};
  const PICKUP_ICON_HTML = ${JSON.stringify(PICKUP_SVG)};
  const DEST_ICON_HTML = ${JSON.stringify(DEST_SVG)};

  let usedFallback = false;
  let mapReady = false;
  let lastState = null;
  let pinMode = false;
  let userHasPanned = false;
  let lastRecenterTrigger = 0;
  let lastFitKey = '';
  let activeMarkers = [];

  function switchToFallback() {
    if (usedFallback) return;
    usedFallback = true;
    try {
      map.setStyle(FALLBACK_STYLE);
    } catch (e) {}
  }

  function postToHost(payload) {
    const str = JSON.stringify(payload);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(str);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(str, '*');
    }
  }

  let map;
  try {
    map = new maplibregl.Map({
      container: 'map',
      style: PRIMARY_STYLE,
      center: [${DEFAULT_CENTER.lng}, ${DEFAULT_CENTER.lat}],
      zoom: 14.2,
      pitch: 0,
      attributionControl: { compact: true }
    });
  } catch (initErr) {
    usedFallback = true;
    map = new maplibregl.Map({
      container: 'map',
      style: FALLBACK_STYLE,
      center: [${DEFAULT_CENTER.lng}, ${DEFAULT_CENTER.lat}],
      zoom: 14.2,
      pitch: 0,
      attributionControl: { compact: true }
    });
  }

  map.on('error', function(err) {
    if (!usedFallback) {
      switchToFallback();
    }
  });

  // Track manual user pan/zoom gestures so we never snap the camera back automatically
  map.on('dragstart', function() {
    userHasPanned = true;
  });
  map.on('zoomstart', function(e) {
    if (e && e.originalEvent) {
      userHasPanned = true;
    }
  });
  map.on('moveend', function(e) {
    if (!pinMode) return;
    if (e && e.originalEvent) {
      const c = map.getCenter();
      postToHost({ type: 'pinCenter', lat: c.lat, lng: c.lng });
    }
  });

  function ensureRouteLayers(isDark) {
    if (!map.getSource('ryde-route')) {
      map.addSource('ryde-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }
    if (!map.getLayer('ryde-route-casing')) {
      map.addLayer({
        id: 'ryde-route-casing',
        type: 'line',
        source: 'ryde-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': isDark ? '#0B0E14' : '#181C23',
          'line-width': 9,
          'line-opacity': 0.55
        }
      });
    }
    if (!map.getLayer('ryde-route-line')) {
      map.addLayer({
        id: 'ryde-route-line',
        type: 'line',
        source: 'ryde-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': isDark ? '${accentColor}' : '${accentDeepColor}',
          'line-width': 5,
          'line-opacity': 0.96
        }
      });
    }
  }

  function clearMarkers() {
    for (let i = 0; i < activeMarkers.length; i++) {
      activeMarkers[i].remove();
    }
    activeMarkers = [];
  }

  function makeEl(className, innerHtml) {
    const el = document.createElement('div');
    if (className) el.className = className;
    if (innerHtml) el.innerHTML = innerHtml;
    return el;
  }

  function applyState(state, preserveCamera) {
    const enteringPinMode = !pinMode && !!state.pinMode;
    lastState = state;
    if (!mapReady) {
      return;
    }

    pinMode = !!state.pinMode;
    clearMarkers();
    try {
      ensureRouteLayers(!!state.isDark);
    } catch (e) {}

    const p = state.pickup;
    const d = state.destination;
    const route = state.routeCoords || [];
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    const routeSource = map.getSource('ryde-route');
    if (state.showRoute && route.length >= 2) {
      const lngLatCoords = route.map(function(pt) { return [pt[1], pt[0]]; });
      if (routeSource) {
        routeSource.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lngLatCoords }
        });
      }
      lngLatCoords.forEach(function(ll) {
        bounds.extend(ll);
        hasBounds = true;
      });
    } else if (routeSource) {
      routeSource.setData({ type: 'FeatureCollection', features: [] });
    }

    // In pinMode, the user drags the map freely underneath the fixed center crosshair pin
    if (!pinMode) {
      if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
        const pLngLat = [p.lng, p.lat];
        if (state.showRadar) {
          const el = makeEl(
            'ryde-radar-wrap',
            '<div class="ryde-radar-ring"></div><div class="ryde-radar-ring delay"></div><div class="ryde-radar-core"></div>'
          );
          activeMarkers.push(
            new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat(pLngLat)
              .addTo(map)
          );
        } else {
          const el = makeEl('ryde-pin-pickup', PICKUP_ICON_HTML);
          activeMarkers.push(
            new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat(pLngLat)
              .addTo(map)
          );
        }
        bounds.extend(pLngLat);
        hasBounds = true;
      }

      if (d && typeof d.lat === 'number' && typeof d.lng === 'number' && state.showRoute) {
        const dLngLat = [d.lng, d.lat];
        const el = makeEl('ryde-pin-dest', DEST_ICON_HTML);
        activeMarkers.push(
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(dLngLat)
            .addTo(map)
        );
        bounds.extend(dLngLat);
        hasBounds = true;
      }

      if (state.driverPoint && typeof state.driverPoint.lat === 'number' && typeof state.driverPoint.lng === 'number') {
        const drvLngLat = [state.driverPoint.lng, state.driverPoint.lat];
        const el = makeEl('ryde-driver');
        activeMarkers.push(
          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(drvLngLat)
            .addTo(map)
        );
        bounds.extend(drvLngLat);
        hasBounds = true;
      }
    }

    if (preserveCamera) {
      return;
    }

    const explicitRecenter =
      typeof state.recenterTrigger === 'number' &&
      state.recenterTrigger !== lastRecenterTrigger;

    if (explicitRecenter) {
      lastRecenterTrigger = state.recenterTrigger;
      userHasPanned = false;
    }

    // Center once when entering pinMode on the active target, then never snap back while panning
    if (enteringPinMode) {
      const target = state.pinTarget === 'destination' && d ? d : p;
      if (target && typeof target.lat === 'number' && typeof target.lng === 'number') {
        map.jumpTo({ center: [target.lng, target.lat], zoom: 15.4 });
      }
      return;
    }

    if (pinMode) {
      if (explicitRecenter && p) {
        map.easeTo({ center: [p.lng, p.lat], zoom: 15.6, duration: 550 });
        setTimeout(function() {
          postToHost({ type: 'pinCenter', lat: p.lat, lng: p.lng });
        }, 580);
      }
      return;
    }

    if (userHasPanned && !explicitRecenter && !state.showRoute) {
      return;
    }

    const fitKey = JSON.stringify([
      p ? [p.lat.toFixed(4), p.lng.toFixed(4)] : null,
      d && state.showRoute ? [d.lat.toFixed(4), d.lng.toFixed(4)] : null,
      route.length,
      state.showRoute,
      state.recenterTrigger || 0
    ]);

    if (fitKey !== lastFitKey && hasBounds) {
      lastFitKey = fitKey;
      if (state.showRoute && d && p) {
        map.fitBounds(bounds, {
          padding: { top: 96, bottom: 260, left: 48, right: 48 },
          maxZoom: 16,
          duration: 650
        });
      } else if (p) {
        map.easeTo({
          center: [p.lng, p.lat],
          zoom: 14.8,
          duration: 650
        });
      }
    }
  }

  function markMapReady() {
    const firstReady = !mapReady;
    mapReady = true;
    try {
      ensureRouteLayers(${isDark ? 'true' : 'false'});
      if (lastState) {
        applyState(lastState, !firstReady);
      }
    } catch (e) {}
    if (firstReady) {
      postToHost({ type: 'ready' });
    }
  }

  map.on('style.load', function() {
    if (mapReady && lastState) {
      try {
        ensureRouteLayers(!!lastState.isDark);
        applyState(lastState, true);
      } catch (e) {}
    } else {
      markMapReady();
    }
  });
  map.on('load', markMapReady);
  setTimeout(function() {
    if (!map.isStyleLoaded() && !usedFallback) {
      switchToFallback();
    }
    markMapReady();
  }, 1800);

  map.on('click', function(e) {
    if (!pinMode) return;
    userHasPanned = true;
    map.easeTo({ center: [e.lngLat.lng, e.lngLat.lat], duration: 320 });
    postToHost({ type: 'pinCenter', lat: e.lngLat.lat, lng: e.lngLat.lng });
  });

  window.updateRydeMap = applyState;

  window.addEventListener('message', function(ev) {
    try {
      const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (msg && msg.type === 'sync' && msg.payload) {
        applyState(msg.payload, false);
      }
    } catch (e) {}
  });
</script>
</body>
</html>`;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup,
  destination,
  routeCoords,
  showRoute = false,
  showRadar = false,
  driverCoords = null,
  driverProgress,
  etaPillLabel,
  pinMode = false,
  pinTarget = 'pickup',
  recenterTrigger = 0,
  onPinSelect,
  onPinCenterChange,
}) => {
  const { colors, isDark } = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const html = useMemo(
    () =>
      buildMapLibreHtml(
        isDark,
        colors.brandGold,
        colors.brandGoldDeep,
        colors.brandGoldSoft
      ),
    [isDark, colors.brandGold, colors.brandGoldDeep, colors.brandGoldSoft]
  );

  // Use a same-origin Blob URL on Web so MapLibre WebGL workers & tile CORS
  // inherit the real page origin instead of an opaque `about:srcdoc` null origin
  const webBlobUrl = useMemo(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      typeof Blob === 'undefined' ||
      typeof URL?.createObjectURL !== 'function'
    ) {
      return null;
    }
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [html]);

  useEffect(() => {
    return () => {
      if (webBlobUrl && typeof URL?.revokeObjectURL === 'function') {
        URL.revokeObjectURL(webBlobUrl);
      }
    };
  }, [webBlobUrl]);

  // Reset loaded shimmer briefly when switching Light/Dark vector style
  useEffect(() => {
    readyRef.current = false;
    setMapLoaded(false);
    const safety = setTimeout(() => {
      setMapLoaded(true);
    }, 1500);
    return () => clearTimeout(safety);
  }, [isDark]);

  // Compute driver coordinate (prefer live GPS, fallback to route polyline interpolation)
  const resolvedDriverPoint = useMemo<LatLng | null>(() => {
    if (driverCoords) return driverCoords;
    if (typeof driverProgress !== 'number') return null;
    const clamped = Math.max(0, Math.min(1, driverProgress));
    if (routeCoords && routeCoords.length >= 2) {
      const idx = Math.min(
        routeCoords.length - 1,
        Math.floor(clamped * (routeCoords.length - 1))
      );
      const pt = routeCoords[idx];
      if (pt) return { lat: pt[0], lng: pt[1] };
    }
    if (pickup && destination) {
      return {
        lat: pickup.lat + (destination.lat - pickup.lat) * clamped,
        lng: pickup.lng + (destination.lng - pickup.lng) * clamped,
      };
    }
    return null;
  }, [driverCoords, driverProgress, routeCoords, pickup, destination]);

  const mapPayload = useMemo(
    () => ({
      isDark,
      pickup: pickup ? { lat: pickup.lat, lng: pickup.lng } : DEFAULT_CENTER,
      destination: destination
        ? { lat: destination.lat, lng: destination.lng }
        : null,
      routeCoords: routeCoords ?? [],
      showRoute,
      showRadar,
      driverPoint: resolvedDriverPoint,
      pinMode,
      pinTarget,
      recenterTrigger,
    }),
    [
      isDark,
      pickup,
      destination,
      routeCoords,
      showRoute,
      showRadar,
      resolvedDriverPoint,
      pinMode,
      pinTarget,
      recenterTrigger,
    ]
  );

  const pushStateToMap = () => {
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'sync', payload: mapPayload }),
        '*'
      );
    } else if (readyRef.current) {
      webViewRef.current?.injectJavaScript(
        `window.updateRydeMap && window.updateRydeMap(${JSON.stringify(mapPayload)}, false); true;`
      );
    }
  };

  useEffect(() => {
    pushStateToMap();
  }, [mapPayload]);

  // Listen to iframe postMessage on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (data?.type === 'ready') {
          readyRef.current = true;
          setMapLoaded(true);
          pushStateToMap();
        } else if (data?.type === 'pin' && onPinSelect) {
          onPinSelect(Number(data.lat), Number(data.lng));
        } else if (data?.type === 'pinCenter') {
          const lat = Number(data.lat);
          const lng = Number(data.lng);
          if (onPinCenterChange) {
            onPinCenterChange(lat, lng);
          } else if (onPinSelect) {
            onPinSelect(lat, lng);
          }
        }
      } catch {
        // Ignore unrelated browser messages
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPinSelect, onPinCenterChange, mapPayload]);

  const handleNativeMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        lat?: number;
        lng?: number;
      };
      if (data.type === 'ready') {
        readyRef.current = true;
        setMapLoaded(true);
        pushStateToMap();
      } else if (
        data.type === 'pin' &&
        typeof data.lat === 'number' &&
        typeof data.lng === 'number' &&
        onPinSelect
      ) {
        onPinSelect(data.lat, data.lng);
      } else if (
        data.type === 'pinCenter' &&
        typeof data.lat === 'number' &&
        typeof data.lng === 'number'
      ) {
        if (onPinCenterChange) {
          onPinCenterChange(data.lat, data.lng);
        } else if (onPinSelect) {
          onPinSelect(data.lat, data.lng);
        }
      }
    } catch {
      // Ignore malformed bridge messages
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {Platform.OS === 'web' ? (
        React.createElement('iframe', {
          ref: iframeRef,
          ...(webBlobUrl ? { src: webBlobUrl } : { srcDoc: html }),
          title: 'Ryde Vector Map',
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          },
        })
      ) : (
        <NativeWebView
          ref={webViewRef}
          source={{ html }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          onMessage={handleNativeMessage}
          style={styles.webview}
        />
      )}

      {/* Smooth loading overlay while MapLibre vector tiles initialize */}
      {!mapLoaded ? (
        <Animated.View
          pointerEvents="none"
          exiting={FadeOut.duration(280)}
          style={[styles.loadingOverlay, { backgroundColor: colors.canvas }]}
        >
          <GlassSurface radius={RADII.pill} contentStyle={styles.loadingPill}>
            <ActivityIndicator size="small" color={colors.brandGoldDeep} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading map…
            </Text>
          </GlassSurface>
        </Animated.View>
      ) : null}

      {/* Floating Route ETA Pill */}
      {showRoute && etaPillLabel ? (
        <View pointerEvents="none" style={styles.etaPillWrap}>
          <GlassSurface radius={RADII.pill} contentStyle={styles.etaPillInner}>
            <Text
              style={[
                styles.etaPillText,
                TABULAR_NUMS,
                { color: colors.textPrimary },
              ]}
            >
              {etaPillLabel}
            </Text>
          </GlassSurface>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 140,
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  etaPillWrap: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
  },
  etaPillInner: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  etaPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
