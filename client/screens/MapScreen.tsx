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
import { useHeaderHeight, HeaderButton } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useEvents } from "@/hooks/useEvents";
import { Spacing, BorderRadius, EventColors, Shadows } from "@/constants/theme";
import { RootStackParamList, Event } from "@/navigation/RootStackNavigator";

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

function isDarkTheme(theme: any): boolean {
  return theme.background === '#000000' || theme.background === '#121212' || theme.text === '#FFFFFF';
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

export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<any>(null);
  const { events, isLoading } = useEvents();

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const hasRequestedPermission = useRef(false);

  useEffect(() => {
    if (!permission || hasRequestedPermission.current) return;
    
    if (!permission.granted && permission.canAskAgain) {
      hasRequestedPermission.current = true;
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (permission?.granted) {
      setLocationLoading(true);
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.15,
                longitudeDelta: 0.15,
              },
              500
            );
          }
        })
        .catch((error) => {
          console.log("Error getting location:", error);
        })
        .finally(() => {
          setLocationLoading(false);
        });
    }
  }, [permission?.granted]);

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

  const handleRequestLocation = useCallback(async () => {
    if (permission?.status === "denied" && !permission.canAskAgain) {
      if (Platform.OS !== "web") {
        try {
          await Linking.openSettings();
        } catch (error) {
          console.log("Could not open settings");
        }
      }
    } else {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleMarkerPress = useCallback(
    (event: Event) => {
      navigation.navigate("EventDetails", { event });
    },
    [navigation]
  );

  const getMarkerColor = (category: Event["category"]) => {
    return EventColors[category] || EventColors.entertainment;
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton onPress={() => navigation.navigate("EventList")}>
          <Feather name="list" size={22} color={theme.text} />
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={() => navigation.navigate("Settings")}>
          <Feather name="settings" size={22} color={theme.text} />
        </HeaderButton>
      ),
    });
  }, [navigation, theme]);

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
        >
          {Marker && sortedEvents.map((event) => (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              pinColor={getMarkerColor(event.category)}
              onPress={() => handleMarkerPress(event)}
              title={event.title}
              description={event.category}
            />
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
        {!permission?.granted ? (
          <Pressable
            onPress={handleRequestLocation}
            style={[
              styles.locationBanner,
              { backgroundColor: theme.primary },
            ]}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="map-pin" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
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
  mapRoad: {
    position: "absolute",
    borderRadius: 2,
  },
  neighborhoodLabel: {
    position: "absolute",
  },
  neighborhoodText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
  snapMapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  snapMapHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  snapLocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  snapLocationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  oceanArea: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: 40,
    borderBottomRightRadius: 60,
  },
  oceanWave: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  parkArea: {
    position: "absolute",
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  parkLabel: {
    fontSize: 8,
    fontWeight: "600",
  },
  districtLabel: {
    position: "absolute",
  },
  districtBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 3,
  },
  districtText: {
    fontSize: 9,
    fontWeight: "600",
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
  eventCountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  eventCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  mapLegendBar: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "500",
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
});
