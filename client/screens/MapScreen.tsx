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
  
  const mapHeight = 220;
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

  const roads = [
    { x: 0.1, y: 0.30, horizontal: true },
    { x: 0.20, y: 0.1, horizontal: false },
    { x: 0.50, y: 0.15, horizontal: false },
    { x: 0.80, y: 0.20, horizontal: false },
    { x: 0.05, y: 0.60, horizontal: true },
    { x: 0.30, y: 0.45, horizontal: true },
    { x: 0.15, y: 0.75, horizontal: true },
    { x: 0.35, y: 0.05, horizontal: false },
    { x: 0.65, y: 0.10, horizontal: false },
  ];

  const neighborhoods = [
    { name: 'Hollywood', x: 0.25, y: 0.25 },
    { name: 'Downtown', x: 0.55, y: 0.55 },
    { name: 'Santa Monica', x: 0.15, y: 0.70 },
    { name: 'Pasadena', x: 0.75, y: 0.20 },
  ];

  return (
    <View 
      style={styles.snapMapContainer}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.snapMap, { backgroundColor: isDark ? '#1E3A5F' : '#A8D5BA' }]}>
        {roads.map((road, i) => (
          <View 
            key={i}
            style={[
              styles.mapRoad,
              {
                left: road.x * containerWidth,
                top: road.y * mapHeight,
                width: road.horizontal ? containerWidth * 0.8 : 3,
                height: road.horizontal ? 3 : mapHeight * 0.7,
                backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
              }
            ]}
          />
        ))}
        
        {neighborhoods.map((hood, i) => (
          <View key={i} style={[styles.neighborhoodLabel, { left: hood.x * containerWidth, top: hood.y * mapHeight }]}>
            <ThemedText style={[styles.neighborhoodText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }]}>
              {hood.name}
            </ThemedText>
          </View>
        ))}

        {events.slice(0, 20).map((event, index) => {
          const x = lngToX(event.longitude, containerWidth);
          const y = latToY(event.latitude);
          if (x < 10 || x > containerWidth - 10 || y < 10 || y > mapHeight - 10) return null;
          const color = EventColors[event.category] || theme.primary;
          return (
            <Pressable
              key={event.id}
              style={[
                styles.snapMarker,
                { 
                  left: x - 14, 
                  top: y - 14,
                  zIndex: 100 + index,
                }
              ]}
              onPress={() => onEventPress(event)}
            >
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
      
      <View style={[styles.snapMapOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }]}>
        <View style={styles.snapMapHeader}>
          <View style={[styles.snapLocationBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
            <Feather name="map-pin" size={12} color={isDark ? '#fff' : '#333'} />
            <ThemedText style={[styles.snapLocationText, { color: isDark ? '#fff' : '#333' }]}>
              Los Angeles, CA
            </ThemedText>
          </View>
        </View>
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
    height: 220,
    position: "relative",
    overflow: "hidden",
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
});
