import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from 'expo-haptics';
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
  isLoading,
}: {
  icon: string;
  onPress: () => void;
  isLoading?: boolean;
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
      disabled={isLoading}
      style={[
        styles.mapControlButton,
        { backgroundColor: theme.cardBackground },
        Shadows.small,
        animatedStyle,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.text} />
      ) : (
        <Feather name={icon as any} size={22} color={theme.text} />
      )}
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

	

  	
// Memoized marker component to prevent unnecessary re-renders
const CustomMarker = React.memo(({
  event,
  isSelected,
  onPress,
}: {
  event: Event;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const color = EventColors[event.category] || EventColors.entertainment;
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  
  // Pulse animation when selected
  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.3 : 1, { damping: 12, stiffness: 200 });
    
    if (isSelected) {
      // Pulse effect
      pulseScale.value = withSpring(1.1, { damping: 8 }, () => {
        pulseScale.value = withSpring(1, { damping: 8 });
      });
    }
  }, [isSelected]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: isSelected ? 0.6 : 0.3,
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
      {/* Outer glow/pulse effect */}
      <Animated.View style={[styles.customMarkerGlow, { backgroundColor: color }, pulseStyle]} />
      
      {/* Main bubble */}
      <View style={[styles.customMarkerBubble, { backgroundColor: color, borderColor: '#fff' }]}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.customMarkerImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
        ) : (
          <Feather name={getCategoryIcon(event.category) as any} size={20} color="#FFFFFF" />
        )}
      </View>
      
      {/* Bottom pointer/tail */}
      <View style={[styles.customMarkerPointer, { backgroundColor: color }]} />
      
      {/* Tap indicator when selected */}
      {isSelected && (
        <View style={[styles.tapIndicator, { borderColor: color }]}>
          <ThemedText style={styles.tapText}>TAP</ThemedText>
        </View>
      )}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.event.imageUrl === nextProps.event.imageUrl
  );
});

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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(LA_REGION);
  
  const { location: userLocation, loading: locationLoading, error: locationError, refreshLocation } = useLocationTracking(true);
  
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
  
    const handleMarkerPress = useCallback(
      (event: Event) => {
        // Add haptic feedback
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        // Go directly to event details
        navigation.navigate("EventDetails", { event });
      },
      [navigation]
    );
  
  const handleMapPress = useCallback(() => {
    setSelectedEvent(null);
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
              Map view not available on web. Install react-native-maps for mobile support.
            </ThemedText>
          </View>
        </ThemedView>
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
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={false}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
          toolbarEnabled={false}
          userInterfaceStyle={isDark ? "dark" : "light"}
          onPress={handleMapPress}
          onRegionChangeComplete={handleRegionChangeComplete}
          mapType="standard"
        >
          {userLocation && Circle && (
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
          
          {Marker && sortedEvents.map((event) => (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              onPress={() => handleMarkerPress(event)}
            
              anchor={{ x: 0.5, y: 0.9 }}
              centerOffset={{ x: 0, y: 0 }}
                                                  
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
                  : EventColors[cat.key as keyof typeof EventColors] || theme.primary
              }
              onPress={() => setActiveFilter(cat.key)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.mapControls, { bottom: insets.bottom + Spacing.xl }]}>
        <MapControlButton icon="plus" onPress={handleZoomIn} />
        <MapControlButton icon="minus" onPress={handleZoomOut} />
        <MapControlButton
          icon="navigation"
          onPress={handleRecenter}
          isLoading={locationLoading}
        />
        <MapControlButton
          icon="refresh-cw"
          onPress={handleRefreshLocation}
          isLoading={locationLoading}
        />
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
});
