import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";

// Conditional import for haptics
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch (e) {
  console.log("Haptics module not available");
}

import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useEvents } from "@/hooks/useEvents";
import { Spacing, BorderRadius, EventColors, Shadows } from "@/constants/theme";
import { RootStackParamList, Event } from "@/navigation/RootStackNavigator";
import { useLocationTracking } from "@/hooks/useLocationTracking";

let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let PROVIDER_GOOGLE: any = null;
let mapsAvailable = false;

if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
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

// Stable custom marker - uses View snapshot to prevent re-renders
const CustomMarker = React.memo(({ event }: { event: Event }) => {
  const color = EventColors[event.category] || EventColors.entertainment;
  
  return (
    <View style={styles.markerContainer}>
      <View style={[styles.markerOuter, { borderColor: color }]}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.markerImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : (
          <View style={[styles.markerIconContainer, { backgroundColor: color }]}>
            <Feather
              name={
                event.category === "sports" ? "activity" :
                event.category === "food" ? "coffee" :
                event.category === "arts" ? "image" :
                event.category === "bars" ? "moon" : "film"
              }
              size={14}
              color="#FFFFFF"
            />
          </View>
        )}
      </View>
      {/* Bottom pointer */}
      <View style={[styles.markerPointer, { borderTopColor: color }]} />
    </View>
  );
}, (prev, next) => prev.event.id === next.event.id && prev.event.imageUrl === next.event.imageUrl);

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

  const [searchQuery, setSearchQuery] = useState("");
  const [currentRegion, setCurrentRegion] = useState<Region>(LA_REGION);
  const [visibleCategories, setVisibleCategories] = useState<Set<Event["category"]>>(
    new Set(["entertainment", "food", "sports", "arts", "bars"])
  );
  
  const { location: userLocation, loading: locationLoading, error: locationError, refreshLocation } = useLocationTracking(true);
  
  // Stable events - only update when actually different
  const stableEvents = useMemo(() => events, [events.length]);
  
  useEffect(() => {
    if (userLocation && mapRef.current) {
      const newRegion = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
      setCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    if (locationError && Platform.OS !== 'web') {
      Alert.alert(
        'Location Error',
        'Unable to get your location. Make sure location services are enabled.',
        [{ text: 'OK' }]
      );
    }
  }, [locationError]);

  // Toggle category visibility
  const toggleCategory = useCallback((category: Event["category"]) => {
    setVisibleCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const filteredEvents = useMemo(() => {
    return stableEvents.filter((event) => {
      if (!visibleCategories.has(event.category)) {
        return false;
      }
      
      const matchesSearch =
        searchQuery === "" ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [stableEvents, searchQuery, visibleCategories]);
  
  const sortedEvents = useMemo(() => {
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
    
    const sorted = userLocation
      ? [...eventsWithDistance].sort((a, b) => (a.distance || 0) - (b.distance || 0))
      : eventsWithDistance;
    
    // Limit to 25 closest events
    return sorted.slice(0, 25);
  }, [filteredEvents, userLocation?.latitude, userLocation?.longitude]);

  const handleMarkerPress = useCallback((event: Event) => {
    if (Platform.OS !== "web" && Haptics) {
      try {
        Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium || 1);
      } catch (e) {}
    }
    navigation.navigate("EventDetails", { event });
  }, [navigation]);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 0.5,
        longitudeDelta: currentRegion.longitudeDelta * 0.5,
      };
      setCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 300);
    }
  }, [currentRegion]);
  
  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      const newRegion = {
        ...currentRegion,
        latitudeDelta: Math.min(currentRegion.latitudeDelta * 2, 2),
        longitudeDelta: Math.min(currentRegion.longitudeDelta * 2, 2),
      };
      setCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 300);
    }
  }, [currentRegion]);
  
  const handleRecenter = useCallback(() => {
    if (userLocation && mapRef.current) {
      const newRegion = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
      setCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 500);
    } else if (mapRef.current) {
      setCurrentRegion(LA_REGION);
      mapRef.current.animateToRegion(LA_REGION, 500);
    }
  }, [userLocation]);
  
  const handleRefreshLocation = useCallback(async () => {
    await refreshLocation();
  }, [refreshLocation]);

  const handleMapPress = useCallback(() => {
    // Map press logic if needed
  }, []);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    setCurrentRegion(region);
  }, []);

  if (Platform.OS === "web" || !mapsAvailable) {
    return (
      <View style={styles.container}>
        <ThemedView style={styles.webFallback}>
          <View style={[styles.loadingContainer, { paddingTop: headerHeight + 100 }]}>
            <ThemedText style={styles.loadingText}>
              Map view not available on web.
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading events...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={LA_REGION}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        userInterfaceStyle={isDark ? "dark" : "light"}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChangeComplete}
        mapType="standard"
      >
        {Circle && userLocation && (
          <Circle
            center={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            radius={userLocation.accuracy || 50}
            fillColor="rgba(59, 130, 246, 0.1)"
            strokeColor="rgba(59, 130, 246, 0.3)"
            strokeWidth={1}
          />
        )}
        
        {sortedEvents.map((event) => (
          <Marker
            key={event.id}
            identifier={`marker-${event.id}`}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            onPress={() => handleMarkerPress(event)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <CustomMarker event={event} />
          </Marker>
        ))}
      </MapView>

      <View style={[styles.searchAndFilterContainer, { top: headerHeight + Spacing.md }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }, Shadows.small]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search events..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
        
        <View style={styles.filterHeader}>
          <ThemedText style={[styles.filterHeaderText, { color: theme.textSecondary }]}>
            {sortedEvents.length} events • Tap to toggle categories
          </ThemedText>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: "entertainment", label: "Shows", icon: "film" },
            { key: "food", label: "Food", icon: "coffee" },
            { key: "sports", label: "Sports", icon: "activity" },
            { key: "arts", label: "Arts", icon: "image" },
            { key: "bars", label: "Bars", icon: "moon" },
          ].map((cat) => {
            const isVisible = visibleCategories.has(cat.key as Event["category"]);
            const color = EventColors[cat.key as keyof typeof EventColors];
            
            return (
              <Pressable
                key={cat.key}
                onPress={() => toggleCategory(cat.key as Event["category"])}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isVisible ? color : theme.cardBackground,
                    borderColor: isVisible ? color : theme.border,
                    opacity: isVisible ? 1 : 0.5,
                  },
                  Shadows.small,
                ]}
              >
                <Feather
                  name={cat.icon as any}
                  size={14}
                  color={isVisible ? "#FFFFFF" : theme.text}
                />
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isVisible ? "#FFFFFF" : theme.text, marginLeft: 4 },
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.mapControls, { bottom: insets.bottom + Spacing.xl }]}>
        <Pressable
          onPress={handleZoomIn}
          style={[styles.mapControlButton, { backgroundColor: theme.cardBackground }, Shadows.small]}
        >
          <Feather name="plus" size={22} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={handleZoomOut}
          style={[styles.mapControlButton, { backgroundColor: theme.cardBackground }, Shadows.small]}
        >
          <Feather name="minus" size={22} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={handleRecenter}
          style={[styles.mapControlButton, { backgroundColor: theme.cardBackground }, Shadows.small]}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Feather name="navigation" size={22} color={theme.text} />
          )}
        </Pressable>
      </View>

      {locationError && (
        <View style={[styles.locationErrorBanner, { top: headerHeight + 140, backgroundColor: '#ef4444' }]}>
          <Feather name="alert-circle" size={16} color="#FFFFFF" />
          <ThemedText style={styles.locationErrorText}>Location unavailable</ThemedText>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  webFallback: {
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
  filterHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  filterHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
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
  locationErrorBanner: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  locationErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markerContainer: {
    alignItems: 'center',
    width: 40,
    height: 50,
  },
  markerOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerImage: {
    width: 32,
    height: 32,
  },
  markerIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
