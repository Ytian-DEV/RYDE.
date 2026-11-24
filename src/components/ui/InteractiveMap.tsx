import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { GlassSurface } from '@/components/ui/GlassSurface';
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

function buildLeafletHtml(isDark: boolean): string {
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const bg = isDark ? '#14181F' : '#ECEAE2';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${bg}; overflow: hidden; }
  .leaflet-control-attribution { font-size: 9px !important; opacity: 0.45; background: transparent !important; }
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
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map', {
    zoomControl: false,
    attributionControl: true
  }).setView([${DEFAULT_CENTER.lat}, ${DEFAULT_CENTER.lng}], 14);

  L.tileLayer('${tileUrl}', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; OSM &copy; CARTO'
  }).addTo(map);

  let layerGroup = L.layerGroup().addTo(map);
  let lastFitKey = '';
  let pinMode = false;

  function postToHost(payload) {
    const str = JSON.stringify(payload);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(str);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(str, '*');
    }
  }

  map.on('click', function(e) {
    if (!pinMode) return;
    postToHost({ type: 'pin', lat: e.latlng.lat, lng: e.latlng.lng });
  });

  window.updateRydeMap = function(state) {
    pinMode = !!state.pinMode;
    layerGroup.clearLayers();

    const p = state.pickup;
    const d = state.destination;
    const showRoute = !!state.showRoute;
    const showRadar = !!state.showRadar;
    const routeCoords = Array.isArray(state.routeCoords) && state.routeCoords.length >= 2
      ? state.routeCoords
      : (p && d ? [[p.lat, p.lng], [d.lat, d.lng]] : []);

    if (showRadar && p) {
      const radarIcon = L.divIcon({
        className: '',
        html: '<div class="ryde-radar-wrap"><div class="ryde-radar-ring"></div><div class="ryde-radar-ring delay"></div><div class="ryde-radar-core"></div></div>',
        iconSize: [120, 120],
        iconAnchor: [60, 60]
      });
      L.marker([p.lat, p.lng], { icon: radarIcon }).addTo(layerGroup);
      const key = 'radar-' + p.lat.toFixed(4) + '-' + p.lng.toFixed(4);
      if (key !== lastFitKey) {
        lastFitKey = key;
        map.setView([p.lat - 0.004, p.lng], 15, { animate: true });
      }
      return;
    }

    if (showRoute && p && d && routeCoords.length >= 2) {
      const routeColor = state.isDark ? '#FFD95A' : '#007AFF';
      L.polyline(routeCoords, { color: routeColor, weight: 10, opacity: 0.24, lineCap: 'round' }).addTo(layerGroup);
      const poly = L.polyline(routeCoords, { color: routeColor, weight: 5, opacity: 0.95, lineCap: 'round' }).addTo(layerGroup);

      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', html: '<div class="ryde-pin-pickup"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })
      }).addTo(layerGroup);

      L.marker([d.lat, d.lng], {
        icon: L.divIcon({ className: '', html: '<div class="ryde-pin-dest"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })
      }).addTo(layerGroup);

      if (state.driverPoint) {
        L.marker([state.driverPoint.lat, state.driverPoint.lng], {
          icon: L.divIcon({ className: '', html: '<div class="ryde-driver"></div>', iconSize: [24, 24], iconAnchor: [12, 12] })
        }).addTo(layerGroup);
      }

      const key = 'route-' + p.lat.toFixed(4) + ',' + p.lng.toFixed(4) + '-' + d.lat.toFixed(4) + ',' + d.lng.toFixed(4);
      if (key !== lastFitKey) {
        lastFitKey = key;
        map.fitBounds(poly.getBounds(), { paddingTopLeft: [48, 110], paddingBottomRight: [48, 360], maxZoom: 16 });
      }
      return;
    }

    if (p) {
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', html: '<div class="ryde-pulse"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })
      }).addTo(layerGroup);

      const key = 'center-' + p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
      if (key !== lastFitKey) {
        lastFitKey = key;
        map.setView([p.lat - 0.005, p.lng], 14, { animate: true });
      }
    }
  };

  window.addEventListener('message', function(ev) {
    try {
      const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (msg && msg.type === 'sync') {
        window.updateRydeMap(msg.payload);
      }
    } catch (_) {}
  });

  postToHost({ type: 'ready' });
</script>
</body>
</html>`;
}

/**
 * Real interactive OpenStreetMap + CartoDB Leaflet map working across iOS, Android, and Web
 * with zero paid API keys. Supports real OSRM road polylines, live driver GPS, and tap-to-pin.
 */
export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup,
  destination,
  routeCoords,
  showRoute = false,
  showRadar = false,
  driverCoords,
  driverProgress,
  etaPillLabel,
  pinMode = false,
  onPinSelect,
}) => {
  const { colors, isDark } = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);

  const html = useMemo(() => buildLeafletHtml(isDark), [isDark]);

  // Compute driver coordinate (prefer live GPS from Supabase, fallback to polyline interpolation)
  const resolvedDriverPoint: LatLng | null = useMemo(() => {
    if (driverCoords) return driverCoords;
    if (typeof driverProgress !== 'number' || !pickup || !destination) {
      return null;
    }
    const pts =
      routeCoords && routeCoords.length >= 2
        ? routeCoords
        : [
            [pickup.lat, pickup.lng] as [number, number],
            [destination.lat, destination.lng] as [number, number],
          ];
    const clamped = Math.max(0, Math.min(1, driverProgress));
    const idx = Math.min(pts.length - 1, Math.floor(clamped * (pts.length - 1)));
    const pt = pts[idx] ?? pts[0]!;
    return { lat: pt[0], lng: pt[1] };
  }, [driverCoords, driverProgress, pickup, destination, routeCoords]);

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
          title: 'Ryde Live Map',
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
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  etaPillWrap: {
    position: 'absolute',
    top: 122,
    alignSelf: 'center',
    zIndex: 10,
  },
  etaPillInner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  etaPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
