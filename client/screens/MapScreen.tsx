import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  TextInput,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useEvents } from "@/hooks/useEvents";
import { Spacing, BorderRadius, EventColors, Shadows } from "@/constants/theme";
import { RootStackParamList, Event } from "@/navigation/RootStackNavigator";
import { useLocationTracking } from "@/hooks/useLocationTracking";

let MapView: any = null;
let Marker: any = null;
let mapsAvailable = false;

if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    mapsAvailable = true;
  } catch (e) {
    console.log("react-native-maps not available, using fallback");
    mapsAvailable = false;
  }
}

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const LA_REGION: Region = {
  latitude: 34.0522,
  longitude: -118.2437,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

type CategoryFilter = "all" | "entertainment" | "food" | "sports" | "arts" | "bars";

const CATEGORIES: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "grid" },
  { key: "entertainment", label: "Entertainment", icon: "film" },
  { key: "food", label: "Food", icon: "coffee" },
  { key: "sports", label: "Sports", icon: "activity" },
  { key: "arts", label: "Arts", icon: "image" },
  { key: "bars", label: "Bars", icon: "moon" },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function FilterChip({
  label,
  icon,
  isActive,
  color,
  onPress,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  color: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.filterChip,
        {
          backgroundColor: isActive ? color : theme.cardBackground,
          borderColor: isActive ? color : theme.border,
        },
        Shadows.small,
        animatedStyle,
      ]}
    >
      <Feather
        name={icon as any}
        size={14}
        color={isActive ? "#FFFFFF" : theme.text}
        style={styles.chipIcon}
      />
      <ThemedText
        style={[
          styles.chipText,
          { color: isActive ? "#FFFFFF" : theme.text },
        ]}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchAndFilterContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  filterContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  mapControls: {
    position: "absolute",
    right: Spacing.lg,
    gap: Spacing.sm,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  locationBanner: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  webFallback: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  eventListContent: {
    paddingHorizontal: Spacing.md,
  },
  eventCard: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  eventImage: {
    width: "100%",
    height: 100,
  },
  eventImagePlaceholder: {
    width: "100%",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardContent: {
    padding: Spacing.md,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  eventCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  eventCardMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  snapMapContainer: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  snapMap: {
    width: "100%",
    height: 280,
    position: "relative",
    overflow: "hidden",
    borderRadius: BorderRadius.lg,
  },
  snapMarker: {
    position: "absolute",
    alignItems: "center",
  },
  snapMarkerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  snapMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  snapMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
  markerGlow: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
    top: -6,
  },
  mapHeaderOverlay: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mapLegendBar: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glassCard: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
  },
  eventBadge: {
    paddingHorizontal: Spacing.md,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  customMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  customMarkerGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.25,
    top: -6,
  },
  customMarkerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  customMarkerImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  customMarkerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  customMarkerPointer: {
    width: 10,
    height: 10,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
    marginTop: -6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCardContainer: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 100,
  },
  selectedCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedCardClose: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  selectedCardContent: {
    flexDirection: "row",
    padding: Spacing.sm,
  },
  selectedCardImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  selectedCardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "center",
  },
  selectedCardCategoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: 4,
  },
  selectedCardCategoryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  selectedCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  selectedCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  selectedCardMetaText: {
    fontSize: 11,
    marginLeft: 4,
  },
  selectedCardHint: {
    fontSize: 11,
    fontWeight: "500",
  },
  carouselContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
  },
  carouselContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  carouselItem: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  carouselItemSelected: {
    borderWidth: 2,
  },
  carouselItemBlur: {
    flexDirection: "row",
    padding: Spacing.xs,
    alignItems: "center",
    minWidth: 160,
  },
  carouselItemImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  carouselItemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselItemInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: "center",
  },
  carouselItemTitle: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 100,
  },
  carouselItemDate: {
    fontSize: 10,
    marginTop: 2,
  },
});

function MapControlButton({
  icon,
  onPress,
}: {
  icon: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.mapControlButton,
        { backgroundColor: theme.cardBackground },
        Shadows.small,
        animatedStyle,
      ]}
    >
      <Feather name={icon as any} size={22} color={theme.text} />
    </AnimatedPressable>
  );
}

function EventCard({
  event,
  onPress,
}: {
  event: Event;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.eventCard,
        { backgroundColor: theme.cardBackground },
        animatedStyle,
      ]}
    >
      {event.imageUrl ? (
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.eventImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.eventImagePlaceholder, { backgroundColor: EventColors[event.category] || theme.primary }]}>
          <Feather
            name={event.category === "sports" ? "activity" : event.category === "food" ? "coffee" : event.category === "arts" ? "image" : event.category === "bars" ? "moon" : "film"}
            size={24}
            color="rgba(255,255,255,0.8)"
          />
        </View>
      )}
      <View style={styles.eventCardContent}>
        <View style={[styles.categoryBadge, { backgroundColor: EventColors[event.category] || theme.primary }]}>
          <ThemedText style={styles.categoryBadgeText}>
            {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
          </ThemedText>
        </View>
        <ThemedText style={styles.eventCardTitle} numberOfLines={2}>{event.title}</ThemedText>
        <View style={styles.eventCardMeta}>
          <Feather name="calendar" size={12} color={theme.textSecondary} />
          <ThemedText style={[styles.eventCardMetaText, { color: theme.textSecondary }]}>
            {event.date}
          </ThemedText>
          <Feather name="clock" size={12} color={theme.textSecondary} style={{ marginLeft: 8 }} />
          <ThemedText style={[styles.eventCardMetaText, { color: theme.textSecondary }]}>
            {event.time}
          </ThemedText>
        </View>
        <View style={styles.eventCardMeta}>
          <Feather name="map-pin" size={12} color={theme.textSecondary} />
          <ThemedText style={[styles.eventCardMetaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {event.address.split(",")[0]}
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function StaticMapView({
  events,
  onEventPress
}: {
  events: Event[];
  onEventPress: (event: Event) => void;
}) {
  const { theme, isDark } = useTheme();
  const Svg = require('react-native-svg').default;
  const { Defs, LinearGradient, Stop, Path, Circle, Rect, G, Text: SvgText } = require('react-native-svg');
  
  const mapHeight = 280;
  const centerLat = 34.0522;
  const centerLng = -118.2437;
  const latRange = 0.35;
  const lngRange = 0.45;

  const latToY = (lat: number) => {
    return ((centerLat + latRange / 2 - lat) / latRange) * mapHeight;
  };

  const lngToX = (lng: number, containerWidth: number) => {
    return ((lng - (centerLng - lngRange / 2)) / lngRange) * containerWidth;
  };

  const [containerWidth, setContainerWidth] = React.useState(380);

  return (
    <View
      style={styles.snapMapContainer}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.snapMap}>
        <Svg width={containerWidth} height={mapHeight} viewBox={`0 0 ${containerWidth} ${mapHeight}`}>
          <Defs>
            <LinearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={isDark ? "#1a2f4a" : "#e8f5e9"} />
              <Stop offset="50%" stopColor={isDark ? "#234567" : "#c8e6c9"} />
              <Stop offset="100%" stopColor={isDark ? "#1e3a5f" : "#a5d6a7"} />
            </LinearGradient>
            <LinearGradient id="oceanGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={isDark ? "#0d47a1" : "#4fc3f7"} />
              <Stop offset="40%" stopColor={isDark ? "#1565c0" : "#29b6f6"} />
              <Stop offset="100%" stopColor={isDark ? "#1976d2" : "#03a9f4"} />
            </LinearGradient>
            <LinearGradient id="parkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={isDark ? "#2e7d32" : "#81c784"} />
              <Stop offset="100%" stopColor={isDark ? "#1b5e20" : "#66bb6a"} />
            </LinearGradient>
            <LinearGradient id="beachGradient" x1="100%" y1="0%" x2="0%" y2="0%">
              <Stop offset="0%" stopColor={isDark ? "#5d4e37" : "#fff8e1"} />
              <Stop offset="100%" stopColor={isDark ? "#4e342e" : "#ffe082"} />
            </LinearGradient>
          </Defs>

          <Rect x="0" y="0" width={containerWidth} height={mapHeight} fill="url(#landGradient)" />

          <Path
            d={`M0,0 L0,${mapHeight} L${containerWidth * 0.08},${mapHeight} 
                Q${containerWidth * 0.12},${mapHeight * 0.85} ${containerWidth * 0.10},${mapHeight * 0.70}
                Q${containerWidth * 0.08},${mapHeight * 0.55} ${containerWidth * 0.12},${mapHeight * 0.40}
                Q${containerWidth * 0.15},${mapHeight * 0.25} ${containerWidth * 0.10},${mapHeight * 0.10}
                L${containerWidth * 0.08},0 Z`}
            fill="url(#oceanGradient)"
          />

          <Path
            d={`M${containerWidth * 0.08},${mapHeight} 
                Q${containerWidth * 0.12},${mapHeight * 0.85} ${containerWidth * 0.10},${mapHeight * 0.70}
                Q${containerWidth * 0.08},${mapHeight * 0.55} ${containerWidth * 0.12},${mapHeight * 0.40}
                Q${containerWidth * 0.15},${mapHeight * 0.25} ${containerWidth * 0.10},${mapHeight * 0.10}
                L${containerWidth * 0.12},${mapHeight * 0.10}
                Q${containerWidth * 0.17},${mapHeight * 0.25} ${containerWidth * 0.14},${mapHeight * 0.40}
                Q${containerWidth * 0.10},${mapHeight * 0.55} ${containerWidth * 0.14},${mapHeight * 0.70}
                Q${containerWidth * 0.16},${mapHeight * 0.85} ${containerWidth * 0.10},${mapHeight} Z`}
            fill="url(#beachGradient)"
            opacity={0.6}
          />

          <Path
            d={`M${containerWidth * 0.18},${mapHeight * 0.08} 
                Q${containerWidth * 0.25},${mapHeight * 0.05} ${containerWidth * 0.35},${mapHeight * 0.10}
                Q${containerWidth * 0.40},${mapHeight * 0.15} ${containerWidth * 0.38},${mapHeight * 0.22}
                Q${containerWidth * 0.32},${mapHeight * 0.25} ${containerWidth * 0.25},${mapHeight * 0.20}
                Q${containerWidth * 0.18},${mapHeight * 0.15} ${containerWidth * 0.18},${mapHeight * 0.08} Z`}
            fill="url(#parkGradient)"
            opacity={0.9}
          />
          <SvgText
            x={containerWidth * 0.28}
            y={mapHeight * 0.16}
            fontSize="9"
            fontWeight="500"
            fill={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,80,0,0.5)"}
            textAnchor="middle"
          >
            Griffith Park
          </SvgText>

          <Circle cx={containerWidth * 0.72} cy={mapHeight * 0.65} r={18} fill="url(#parkGradient)" opacity={0.8} />
          
          <Circle cx={containerWidth * 0.08} cy={mapHeight * 0.88} r={12} fill="url(#parkGradient)" opacity={0.7} />

          <G opacity={isDark ? 0.35 : 0.65}>
            <Path
              d={`M${containerWidth * 0.12},${mapHeight * 0.35} 
                  Q${containerWidth * 0.35},${mapHeight * 0.32} ${containerWidth * 0.55},${mapHeight * 0.36}
                  Q${containerWidth * 0.75},${mapHeight * 0.38} ${containerWidth * 0.95},${mapHeight * 0.34}`}
              stroke={isDark ? "#ffffff" : "#fafafa"}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.10},${mapHeight * 0.55} 
                  Q${containerWidth * 0.30},${mapHeight * 0.58} ${containerWidth * 0.50},${mapHeight * 0.54}
                  Q${containerWidth * 0.70},${mapHeight * 0.52} ${containerWidth * 0.92},${mapHeight * 0.56}`}
              stroke={isDark ? "#ffffff" : "#fafafa"}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.15},${mapHeight * 0.78} 
                  Q${containerWidth * 0.40},${mapHeight * 0.75} ${containerWidth * 0.60},${mapHeight * 0.80}
                  Q${containerWidth * 0.80},${mapHeight * 0.82} ${containerWidth * 0.90},${mapHeight * 0.76}`}
              stroke={isDark ? "#ffffff" : "#fafafa"}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />

            <Path
              d={`M${containerWidth * 0.28},${mapHeight * 0.08} 
                  Q${containerWidth * 0.26},${mapHeight * 0.30} ${containerWidth * 0.30},${mapHeight * 0.50}
                  Q${containerWidth * 0.34},${mapHeight * 0.70} ${containerWidth * 0.32},${mapHeight * 0.92}`}
              stroke={isDark ? "#ffffff" : "#fafafa"}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.52},${mapHeight * 0.05} 
                  Q${containerWidth * 0.48},${mapHeight * 0.25} ${containerWidth * 0.50},${mapHeight * 0.50}
                  Q${containerWidth * 0.52},${mapHeight * 0.75} ${containerWidth * 0.48},${mapHeight * 0.95}`}
              stroke={isDark ? "#ffffff" : "#fafafa"}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.75},${mapHeight * 0.10} 
                  Q${containerWidth * 0.78},${mapHeight * 0.35} ${containerWidth * 0.74},${mapHeight * 0.55}
                  Q${containerWidth * 0.70},${mapHeight * 0.75} ${containerWidth * 0.78},${mapHeight * 0.88}`}
              stroke={isDark ? "#ffffff" : "#fafafa"}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          </G>

          <G opacity={isDark ? 0.2 : 0.45}>
            <Path
              d={`M${containerWidth * 0.18},${mapHeight * 0.22} 
                  Q${containerWidth * 0.50},${mapHeight * 0.20} ${containerWidth * 0.85},${mapHeight * 0.25}`}
              stroke={isDark ? "#ffffff" : "#ffffff"}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.20},${mapHeight * 0.45} 
                  Q${containerWidth * 0.50},${mapHeight * 0.42} ${containerWidth * 0.80},${mapHeight * 0.48}`}
              stroke={isDark ? "#ffffff" : "#ffffff"}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.15},${mapHeight * 0.68} 
                  Q${containerWidth * 0.50},${mapHeight * 0.72} ${containerWidth * 0.88},${mapHeight * 0.65}`}
              stroke={isDark ? "#ffffff" : "#ffffff"}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.40},${mapHeight * 0.12} 
                  Q${containerWidth * 0.38},${mapHeight * 0.50} ${containerWidth * 0.42},${mapHeight * 0.90}`}
              stroke={isDark ? "#ffffff" : "#ffffff"}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.62},${mapHeight * 0.08} 
                  Q${containerWidth * 0.66},${mapHeight * 0.50} ${containerWidth * 0.60},${mapHeight * 0.92}`}
              stroke={isDark ? "#ffffff" : "#ffffff"}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={`M${containerWidth * 0.88},${mapHeight * 0.15} 
                  Q${containerWidth * 0.84},${mapHeight * 0.50} ${containerWidth * 0.90},${mapHeight * 0.85}`}
              stroke={isDark ? "#ffffff" : "#ffffff"}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {events.slice(0, 15).map((event, index) => {
          const x = lngToX(event.longitude, containerWidth);
          const y = latToY(event.latitude);
          if (x < 25 || x > containerWidth - 25 || y < 50 || y > mapHeight - 35) return null;
          const color = EventColors[event.category] || theme.primary;
          return (
            <Pressable
              key={event.id}
              style={[
                styles.snapMarker,
                {
                  left: x - 14,
                  top: y - 36,
                  zIndex: 100 + index,
                }
              ]}
              onPress={() => onEventPress(event)}
            >
              <View style={[styles.markerGlow, { backgroundColor: color }]} />
              <View style={[styles.snapMarkerOuter, { backgroundColor: color }]}>
                <View style={styles.snapMarkerInner}>
                  <Feather
                    name={
                      event.category === "sports" ? "activity" :
                      event.category === "food" ? "coffee" :
                      event.category === "arts" ? "image" :
                      event.category === "bars" ? "moon" : "music"
                    }
                    size={12}
                    color={color}
                  />
                </View>
              </View>
              <View style={[styles.snapMarkerTail, { borderTopColor: color }]} />
            </Pressable>
          );
        })}
      </View>
      
      <View style={styles.mapHeaderOverlay}>
        <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.glassCard}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: '#ef4444' }]} />
            <ThemedText style={[styles.locationText, { color: isDark ? '#fff' : '#1f2937' }]}>
              Los Angeles
            </ThemedText>
          </View>
        </BlurView>
        <BlurView intensity={90} tint="dark" style={[styles.glassCard, styles.eventBadge]}>
          <ThemedText style={styles.eventBadgeText}>
            {events.length} events nearby
          </ThemedText>
        </BlurView>
      </View>

      <View style={styles.mapLegendBar}>
        {[
          { color: EventColors.entertainment, label: 'Shows' },
          { color: EventColors.sports, label: 'Sports' },
          { color: EventColors.food, label: 'Food' },
          { color: EventColors.bars, label: 'Bars' },
        ].map((item, i) => (
          <BlurView key={i} intensity={70} tint={isDark ? "dark" : "light"} style={styles.legendChip}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <ThemedText style={[styles.legendLabel, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              {item.label}
            </ThemedText>
          </BlurView>
        ))}
      </View>
    </View>
  );
}

function WebMapFallback({
  events,
  onEventPress,
  isLoading,
}: {
  events: Event[];
  onEventPress: (event: Event) => void;
  isLoading: boolean;
}) {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const renderEvent = useCallback(({ item }: { item: Event }) => (
    <EventCard event={item} onPress={() => onEventPress(item)} />
  ), [onEventPress]);

  const ListHeader = useCallback(() => (
    <StaticMapView events={events} onEventPress={onEventPress} />
  ), [events, onEventPress]);

  return (
    <ThemedView style={styles.webFallback}>
      {isLoading ? (
        <View style={[styles.loadingContainer, { paddingTop: headerHeight + 100 }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading events...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[
            styles.eventListContent,
            { paddingTop: headerHeight + Spacing["3xl"], paddingBottom: insets.bottom + Spacing.xl }
          ]}
          showsVerticalScrollIndicator={false}
          numColumns={1}
        />
      )}
    </ThemedView>
  );
}

function getDistanceFromLatLonInMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function EventCarousel({
  events,
  selectedEvent,
  onEventPress,
}: {
  events: Event[];
  selectedEvent: Event | null;
  onEventPress: (event: Event) => void;
}) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  React.useEffect(() => {
    if (selectedEvent && flatListRef.current) {
      const index = events.findIndex(e => e.id === selectedEvent.id);
      if (index >= 0) {
        flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }
    }
  }, [selectedEvent, events]);

  const renderItem = useCallback(({ item }: { item: Event }) => {
    const color = EventColors[item.category] || EventColors.entertainment;
    const isSelected = selectedEvent?.id === item.id;
    
    return (
      <Pressable
        onPress={() => onEventPress(item)}
        style={[
          styles.carouselItem,
          isSelected && styles.carouselItemSelected,
          { borderColor: isSelected ? color : 'transparent' },
        ]}
      >
        <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.carouselItemBlur}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.carouselItemImage} contentFit="cover" />
          ) : (
            <View style={[styles.carouselItemImagePlaceholder, { backgroundColor: color }]}>
              <Feather name="calendar" size={16} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.carouselItemInfo}>
            <ThemedText style={styles.carouselItemTitle} numberOfLines={1}>{item.title}</ThemedText>
            <ThemedText style={[styles.carouselItemDate, { color: theme.textSecondary }]}>{item.date}</ThemedText>
          </View>
        </BlurView>
      </Pressable>
    );
  }, [isDark, theme, selectedEvent, onEventPress]);

  if (events.length === 0) return null;

  return (
    <View style={[styles.carouselContainer, { bottom: insets.bottom + Spacing.md }]}>
      <FlatList
        ref={flatListRef}
        data={events.slice(0, 20)}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        onScrollToIndexFailed={() => {}}
      />
    </View>
  );
}

function SelectedEventCard({
  event,
  onPress,
  onClose,
}: {
  event: Event;
  onPress: () => void;
  onClose: () => void;
}) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const color = EventColors[event.category] || EventColors.entertainment;
  const animatedProgress = useSharedValue(0);
  
  React.useEffect(() => {
    animatedProgress.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animatedProgress.value,
    transform: [{ translateY: (1 - animatedProgress.value) * 20 }],
  }));

  return (
    <Animated.View style={[styles.selectedCardContainer, { bottom: insets.bottom + 120 }, animatedStyle]}>
      <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.selectedCard}>
        <Pressable onPress={onClose} style={styles.selectedCardClose}>
          <Feather name="x" size={16} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={onPress} style={styles.selectedCardContent}>
          {event.imageUrl ? (
            <Image
              source={{ uri: event.imageUrl }}
              style={styles.selectedCardImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.selectedCardImagePlaceholder, { backgroundColor: color }]}>
              <Feather name="calendar" size={24} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.selectedCardInfo}>
            <View style={[styles.selectedCardCategoryBadge, { backgroundColor: color }]}>
              <ThemedText style={styles.selectedCardCategoryText}>
                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
              </ThemedText>
            </View>
            <ThemedText style={styles.selectedCardTitle} numberOfLines={2}>
              {event.title}
            </ThemedText>
            <View style={styles.selectedCardMeta}>
              <Feather name="calendar" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.selectedCardMetaText, { color: theme.textSecondary }]}>
                {event.date}
              </ThemedText>
              <Feather name="clock" size={12} color={theme.textSecondary} style={{ marginLeft: 8 }} />
              <ThemedText style={[styles.selectedCardMetaText, { color: theme.textSecondary }]}>
                {event.time}
              </ThemedText>
            </View>
            <ThemedText style={[styles.selectedCardHint, { color: theme.primary }]}>
              Tap to view details
            </ThemedText>
          </View>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

function CustomMarker({
  event,
  isSelected,
  onPress,
}: {
  event: Event;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const color = EventColors[event.category] || EventColors.entertainment;
  const scale = useSharedValue(isSelected ? 1.2 : 1);
  
  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.25 : 1, { damping: 12, stiffness: 200 });
  }, [isSelected]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case "sports": return "activity";
      case "food": return "coffee";
      case "arts": return "image";
      case "bars": return "moon";
      default: return "music";
    }
  };

  return (
    <Animated.View style={[styles.customMarkerContainer, animatedStyle]}>
      <View style={[styles.customMarkerGlow, { backgroundColor: color }]} />
      <View style={[styles.customMarkerRing, { borderColor: color }]}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.customMarkerImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.customMarkerIconBg, { backgroundColor: color }]}>
            <Feather name={getCategoryIcon(event.category) as any} size={18} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={[styles.customMarkerPointer, { backgroundColor: color }]} />
    </Animated.View>
  );
}

export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<any>(null);
  const { events, isLoading } = useEvents();

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Use the location tracking hook - handles all location logic
  const { location: userLocation, loading: locationLoading, refreshLocation } = useLocationTracking(true);
  
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        },
        1000
      );
    }
  }, [userLocation]);

  const filteredEvents = events.filter((event) => {
    const matchesCategory = activeFilter === "all" || event.category === activeFilter;
    const matchesSearch =
      searchQuery === "" ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });
  
  const eventsWithDistance = filteredEvents.map((event) => ({
    ...event,
    distance: userLocation
      ? getDistanceFromLatLonInMiles(
          userLocation.latitude,
          userLocation.longitude,
          event.latitude,
          event.longitude
        )
      : null,
  }));
  
  const sortedEvents = userLocation
    ? [...eventsWithDistance].sort((a, b) => (a.distance || 0) - (b.distance || 0))
    : eventsWithDistance;

  const handleZoomIn = useCallback(() => {
    mapRef.current?.getCamera().then((camera: any) => {
      if (camera.zoom !== undefined) {
        mapRef.current?.animateCamera({ zoom: camera.zoom + 1 });
      }
    });
  }, []);
  
  const handleZoomOut = useCallback(() => {
    mapRef.current?.getCamera().then((camera: any) => {
      if (camera.zoom !== undefined) {
        mapRef.current?.animateCamera({ zoom: camera.zoom - 1 });
      }
    });
  }, []);
  
  const handleRecenter = useCallback(() => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        },
        500
      );
    } else {
      mapRef.current?.animateToRegion(LA_REGION, 500);
    }
  }, [userLocation]);
  
  const handleRefreshLocation = useCallback(() => {
    refreshLocation();
  }, [refreshLocation]);
  
  const handleMarkerPress = useCallback(
    (event: Event) => {
      if (selectedEvent?.id === event.id) {
        navigation.navigate("EventDetails", { event });
      } else {
        setSelectedEvent(event);
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: event.latitude,
              longitude: event.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            },
            300
          );
        }
      }
    },
    [navigation, selectedEvent]
  );
  
  const handleMapPress = useCallback(() => {
    setSelectedEvent(null);
  }, []);
  
  if (Platform.OS === "web" || !mapsAvailable) {
    return (
      <View style={styles.container}>
        <WebMapFallback events={sortedEvents} onEventPress={handleMarkerPress} isLoading={isLoading} />
        <View
          style={[
            styles.filterContainer,
            { top: headerHeight + Spacing.md },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat.key}
                label={cat.label}
                icon={cat.icon}
                isActive={activeFilter === cat.key}
                color={
                  cat.key === "all"
                    ? theme.primary
                    : EventColors[cat.key as keyof typeof EventColors] ||
                      theme.primary
                }
                onPress={() => setActiveFilter(cat.key)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={LA_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          userInterfaceStyle={isDark ? "dark" : "light"}
          onPress={handleMapPress}
        >
          {Marker && sortedEvents.map((event) => (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              onPress={() => handleMarkerPress(event)}
              tracksViewChanges={selectedEvent?.id === event.id}
              anchor={{ x: 0.5, y: 0.9 }}
            >
              <CustomMarker
                event={event}
                isSelected={selectedEvent?.id === event.id}
                onPress={() => handleMarkerPress(event)}
              />
            </Marker>
          ))}
        </MapView>
      ) : null}

      <View style={[styles.searchAndFilterContainer, { top: headerHeight + Spacing.md }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }, Shadows.small]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search events or venues..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.key}
              label={cat.label}
              icon={cat.icon}
              isActive={activeFilter === cat.key}
              color={
                cat.key === "all"
                  ? theme.primary
                  : EventColors[cat.key as keyof typeof EventColors] ||
                    theme.primary
              }
              onPress={() => setActiveFilter(cat.key)}
            />
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.mapControls,
          { bottom: insets.bottom + Spacing.xl },
        ]}
      >
        <MapControlButton icon="plus" onPress={handleZoomIn} />
        <MapControlButton icon="minus" onPress={handleZoomOut} />
        <MapControlButton icon="navigation" onPress={handleRecenter} />
        <MapControlButton icon="refresh-cw" onPress={handleRefreshLocation} />
        {locationLoading ? (
          <View style={[styles.locationBanner, { backgroundColor: theme.primary }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      {selectedEvent ? (
        <SelectedEventCard
          event={selectedEvent}
          onPress={() => navigation.navigate("EventDetails", { event: selectedEvent })}
          onClose={handleMapPress}
        />
      ) : null}

      <EventCarousel
        events={sortedEvents}
        selectedEvent={selectedEvent}
        onEventPress={handleMarkerPress}
      />
    </View>
  );
}
