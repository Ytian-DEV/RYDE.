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
  onPinSelect?: (lat: number, lng: number) => void;
}

function buildMapLibreHtml(isDark: boolean): string {
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
  .ryde-pulse {
    width: 18px; height: 18px; border-radius: 50%;
    background: #007AFF; border: 3px solid #FFFFFF;
    box-shadow: 0 0 0 10px rgba(0, 122, 255, 0.24);
  }
  .ryde-pin-pickup {
    width: 18px; height: 18px; border-radius: 50%;
    background: #16A34A; border: 3px solid #FFFFFF;
    box-shadow: 0 3px 10px rgba(0,0,0,0.35);
  }
  .ryde-pin-dest {
    width: 18px; height: 18px; border-radius: 50%;
    background: #EF4444; border: 3px solid #FFFFFF;
    box-shadow: 0 3px 10px rgba(0,0,0,0.35);
  }
  .ryde-driver {
    width: 24px; height: 24px; border-radius: 50%;
    background: #FFD95A; border: 3px solid #181C23;
    box-shadow: 0 0 0 10px rgba(255, 217, 90, 0.35), 0 4px 12px rgba(0,0,0,0.38);
  }
  .ryde-radar-wrap {
    position: relative; width: 120px; height: 120px;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }
  .ryde-radar-ring {
    position: absolute; width: 120px; height: 120px; border-radius: 50%;
    border: 2px solid #E5B82E; background: rgba(255, 217, 90, 0.22);
    animation: rydePulse 2s ease-out infinite;
  }
  .ryde-radar-ring.delay { animation-delay: 1s; }
  .ryde-radar-core {
    width: 20px; height: 20px; border-radius: 50%;
    background: #181C23; border: 4px solid #FFD95A; z-index: 2;
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

  let usedFallback = false;
  let mapReady = false;
  let pendingState = null;
  let pinMode = false;
  let lastFitKey = '';
  let activeMarkers = [];

  function postToHost(payload) {
    const str = JSON.stringify(payload);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(str);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(str, '*');
    }
  }

  const map = new maplibregl.Map({
    container: 'map',
    style: PRIMARY_STYLE,
    center: [${DEFAULT_CENTER.lng}, ${DEFAULT_CENTER.lat}],
    zoom: 14.2,
    pitch: 0,
    attributionControl: { compact: true }
  });

  map.on('error', function(err) {
    if (!usedFallback && !mapReady) {
      usedFallback = true;
      try {
        map.setStyle(FALLBACK_STYLE);
      } catch (e) {}
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
          'line-color': isDark ? '#FFD95A' : '#E5B82E',
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

  function applyState(state) {
    if (!mapReady) {
      pendingState = state;
      return;
    }

    pinMode = !!state.pinMode;
    clearMarkers();
    ensureRouteLayers(!!state.isDark);

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
        const el = makeEl(state.showRoute ? 'ryde-pin-pickup' : 'ryde-pulse');
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
      const el = makeEl('ryde-pin-dest');
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

    const fitKey = JSON.stringify([
      p ? [p.lat.toFixed(4), p.lng.toFixed(4)] : null,
      d && state.showRoute ? [d.lat.toFixed(4), d.lng.toFixed(4)] : null,
      route.length,
      state.showRoute
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
    if (mapReady) return;
    mapReady = true;
    try {
      ensureRouteLayers(${isDark ? 'true' : 'false'});
      if (pendingState) {
        applyState(pendingState);
        pendingState = null;
      }
    } catch (e) {}
    postToHost({ type: 'ready' });
  }

  map.on('load', markMapReady);
  map.on('idle', markMapReady);
  setTimeout(markMapReady, 1200);

  map.on('click', function(e) {
    if (!pinMode) return;
    postToHost({ type: 'pin', lat: e.lngLat.lat, lng: e.lngLat.lng });
  });

  window.updateRydeMap = applyState;

  window.addEventListener('message', function(ev) {
    try {
      const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (msg && msg.type === 'sync' && msg.payload) {
        applyState(msg.payload);
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
  onPinSelect,
}) => {
  const { colors, isDark } = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const html = useMemo(() => buildMapLibreHtml(isDark), [isDark]);

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
        `window.updateRydeMap && window.updateRydeMap(${JSON.stringify(mapPayload)}); true;`
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
        }
      } catch {
        // Ignore unrelated browser messages
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPinSelect, mapPayload]);

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
          srcDoc: html,
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
