import React, { useEffect } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { RADII, TABULAR_NUMS } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { PlaceLocation } from '@/types';

interface InteractiveMapProps {
  pickup?: PlaceLocation;
  destination?: PlaceLocation | null;
  showRoute?: boolean;
  showRadar?: boolean;
  driverProgress?: number; // 0..1 along route
  etaPillLabel?: string;
  pinMode?: boolean;
  onPinSelect?: (mapX: number, mapY: number) => void;
}

/**
 * Stylized native vector map of Baybay City & Visayas State University (VSU),
 * rendering smoothly across iOS & Android without external API keys.
 */
export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup,
  destination,
  showRoute = false,
  showRadar = false,
  driverProgress,
  etaPillLabel,
  pinMode = false,
  onPinSelect,
}) => {
  const { colors, isDark } = useAppTheme();
  const [size, setSize] = React.useState({ width: 400, height: 860 });

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [pulse]);

  const radarRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + pulse.value * 1.45 }],
    opacity: 0.55 * (1 - pulse.value),
  }));

  const radarRingSecondaryStyle = useAnimatedStyle(() => {
    const shifted = (pulse.value + 0.5) % 1;
    return {
      transform: [{ scale: 0.7 + shifted * 1.45 }],
      opacity: 0.45 * (1 - shifted),
    };
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
  };

  // Map colors tailored for iOS 26 Light & Dark map themes
  const m = isDark
    ? {
        land: '#161C26',
        sea: '#0E243B',
        hills: '#192924',
        campus: '#232934',
        river: '#1E4A73',
        highway: '#C8A53D',
        highwayStroke: '#8F7425',
        road: '#2B3444',
        label: '#8FA0B8',
        campusLabel: '#D2C29B',
        route: '#FFD95A',
        routeGlow: 'rgba(255, 217, 90, 0.28)',
      }
    : {
        land: '#ECEAE2',
        sea: '#A8D8F8',
        hills: '#CDE6B9',
        campus: '#EFE2CE',
        river: '#89C4F4',
        highway: '#FCD65C',
        highwayStroke: '#E2B83B',
        road: '#FFFFFF',
        label: '#6D7684',
        campusLabel: '#8A6C42',
        route: '#007AFF',
        routeGlow: 'rgba(0, 122, 255, 0.22)',
      };

  const px = (pickup?.mapX ?? 0.34) * size.width;
  const py = (pickup?.mapY ?? 0.42) * size.height * 0.62;
  const dx = (destination?.mapX ?? 0.70) * size.width;
  const dy = (destination?.mapY ?? 0.26) * size.height * 0.62;

  const ctrlX = (px + dx) / 2 - 24;
  const ctrlY = Math.min(py, dy) - 18;
  const routePath = `M ${px} ${py} Q ${ctrlX} ${ctrlY} ${dx} ${dy}`;

  // Point along quadratic bezier for driver marker
  const t = Math.max(0, Math.min(1, driverProgress ?? 0.45));
  const inv = 1 - t;
  const drvX = inv * inv * px + 2 * inv * t * ctrlX + t * t * dx;
  const drvY = inv * inv * py + 2 * inv * t * ctrlY + t * t * dy;

  const midX = 0.25 * px + 0.5 * ctrlX + 0.25 * dx;
  const midY = 0.25 * py + 0.5 * ctrlY + 0.25 * dy;

  return (
    <Pressable
      disabled={!pinMode}
      onLayout={handleLayout}
      onPress={(e) => {
        if (!pinMode || !onPinSelect) return;
        const nx = Math.max(0.12, Math.min(0.88, e.nativeEvent.locationX / size.width));
        const ny = Math.max(0.15, Math.min(0.82, e.nativeEvent.locationY / (size.height * 0.62)));
        onPinSelect(nx, ny);
      }}
      style={[styles.container, { backgroundColor: m.land }]}
    >
      <Svg
        width={size.width}
        height={size.height}
        viewBox="0 0 440 956"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="seaGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={m.sea} stopOpacity="1" />
            <Stop offset="1" stopColor={m.sea} stopOpacity="0.88" />
          </LinearGradient>
        </Defs>

        {/* Base Land */}
        <Rect x="0" y="0" width="440" height="956" fill={m.land} />

        {/* Camotes Sea Coastline (West) */}
        <Path
          d="M0 240 C 35 310, 62 390, 95 450 C 122 500, 148 560, 172 640 L 172 956 L 0 956 Z"
          fill="url(#seaGrad)"
        />

        {/* Mount Pangasugan / Green Highlands (East) */}
        <Path
          d="M270 0 L 440 0 L 440 580 C 370 540, 325 460, 310 380 C 292 280, 260 150, 270 0 Z"
          fill={m.hills}
        />

        {/* VSU Campus Zone */}
        <Path
          d="M90 110 L 295 85 L 315 260 L 210 315 L 115 265 Z"
          fill={m.campus}
          opacity={0.92}
        />

        {/* Catbiga-a River */}
        <Path
          d="M0 78 C 85 95, 130 142, 200 120 C 260 100, 315 110, 440 95"
          stroke={m.river}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M120 390 C 185 370, 250 385, 315 352 C 365 326, 405 335, 440 315"
          stroke={m.river}
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Secondary Campus & Town Streets */}
        <Path
          d="M42 260 L 180 210 L 270 230 M130 150 L 165 290 M180 210 L 250 150 L 320 175 M115 340 L 245 310 L 335 360 M210 420 L 365 440 M155 475 L 290 490"
          stroke={m.road}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* National Highway 70 (Signature Golden Arterial) */}
        <Path
          d="M72 0 C 86 95, 80 155, 118 228 C 148 286, 202 308, 224 352 C 242 388, 238 465, 232 560 L 222 956"
          stroke={m.highwayStroke}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M72 0 C 86 95, 80 155, 118 228 C 148 286, 202 308, 224 352 C 242 388, 238 465, 232 560 L 222 956"
          stroke={m.highway}
          strokeWidth="8.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Map Labels */}
        <SvgText
          x="198"
          y="196"
          fill={m.campusLabel}
          fontSize="13"
          fontWeight="700"
          textAnchor="middle"
        >
          Visayas State University
        </SvgText>
        <SvgText
          x="74"
          y="258"
          fill={isDark ? '#F87171' : '#DC2626'}
          fontSize="11"
          fontWeight="600"
        >
          VSU Hospital
        </SvgText>
        <SvgText
          x="168"
          y="292"
          fill={m.campusLabel}
          fontSize="11"
          fontWeight="600"
        >
          Stomach Inn
        </SvgText>
        <SvgText
          x="262"
          y="366"
          fill={m.label}
          fontSize="12"
          fontWeight="600"
          letterSpacing="1"
        >
          UPPER GUADALUPE
        </SvgText>
        <SvgText
          x="150"
          y="466"
          fill={m.label}
          fontSize="11"
          fontWeight="600"
          letterSpacing="0.8"
        >
          GUADALUPE
        </SvgText>
        <SvgText
          x="130"
          y="246"
          fill={m.label}
          fontSize="10"
          fontWeight="700"
        >
          HWY 70
        </SvgText>
      </Svg>

      {/* Dynamic Route Layer (screen-space SVG matching actual container dimensions) */}
      <Svg
        width={size.width}
        height={size.height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {showRoute && pickup && destination ? (
          <>
            <Path
              d={routePath}
              stroke={m.routeGlow}
              strokeWidth={14}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={routePath}
              stroke={m.route}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            {/* Pickup Pin */}
            <Circle
              cx={px}
              cy={py}
              r={10}
              fill={colors.success}
              stroke="#FFFFFF"
              strokeWidth={3}
            />
            {/* Destination Pin */}
            <Circle
              cx={dx}
              cy={dy}
              r={10}
              fill={colors.danger}
              stroke="#FFFFFF"
              strokeWidth={3}
            />
            {/* Driver Live Marker */}
            {typeof driverProgress === 'number' ? (
              <>
                <Circle
                  cx={drvX}
                  cy={drvY}
                  r={18}
                  fill="rgba(255, 217, 90, 0.35)"
                />
                <Circle
                  cx={drvX}
                  cy={drvY}
                  r={11}
                  fill={colors.brandGold}
                  stroke={colors.obsidian}
                  strokeWidth={3}
                />
              </>
            ) : null}
          </>
        ) : (
          /* Default Blue User GPS Dot */
          <>
            <Circle
              cx={px}
              cy={py}
              r={20}
              fill={isDark ? 'rgba(10, 132, 255, 0.28)' : 'rgba(0, 122, 255, 0.20)'}
            />
            <Circle
              cx={px}
              cy={py}
              r={8.5}
              fill={colors.info}
              stroke="#FFFFFF"
              strokeWidth={3}
            />
          </>
        )}
      </Svg>

      {/* Animated Concentric Radar Pulse (Finding Driver state) */}
      {showRadar ? (
        <View
          pointerEvents="none"
          style={[
            styles.radarAnchor,
            { left: px - 60, top: py - 60 },
          ]}
        >
          <Animated.View
            style={[
              styles.radarRing,
              {
                borderColor: colors.brandGoldDeep,
                backgroundColor: colors.brandGoldSoft,
              },
              radarRingStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              {
                borderColor: colors.brandGold,
                backgroundColor: colors.brandGoldSoft,
              },
              radarRingSecondaryStyle,
            ]}
          />
          <View
            style={[
              styles.radarDot,
              {
                backgroundColor: colors.obsidian,
                borderColor: colors.brandGold,
              },
            ]}
          />
        </View>
      ) : null}

      {/* Floating Route ETA Pill */}
      {showRoute && etaPillLabel ? (
        <View
          pointerEvents="none"
          style={[
            styles.etaPillWrap,
            {
              left: Math.max(24, Math.min(size.width - 158, midX - 66)),
              top: Math.max(120, midY - 40),
            },
          ]}
        >
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
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  radarAnchor: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  radarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
  },
  etaPillWrap: {
    position: 'absolute',
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
