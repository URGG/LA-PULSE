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
  
  const mapHeight = 240;
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

  const majorRoads = [
    { x: 0.08, y: 0.35, w: 0.85, h: 4, horizontal: true },
    { x: 0.05, y: 0.55, w: 0.90, h: 4, horizontal: true },
    { x: 0.10, y: 0.75, w: 0.80, h: 4, horizontal: true },
    { x: 0.25, y: 0.05, w: 4, h: 0.90, horizontal: false },
    { x: 0.50, y: 0.08, w: 4, h: 0.85, horizontal: false },
    { x: 0.75, y: 0.10, w: 4, h: 0.80, horizontal: false },
  ];

  const minorRoads = [
    { x: 0.15, y: 0.20, w: 0.70, h: 2, horizontal: true },
    { x: 0.20, y: 0.45, w: 0.60, h: 2, horizontal: true },
    { x: 0.12, y: 0.65, w: 0.75, h: 2, horizontal: true },
    { x: 0.18, y: 0.85, w: 0.65, h: 2, horizontal: true },
    { x: 0.35, y: 0.12, w: 2, h: 0.75, horizontal: false },
    { x: 0.62, y: 0.15, w: 2, h: 0.70, horizontal: false },
    { x: 0.88, y: 0.20, w: 2, h: 0.60, horizontal: false },
  ];

  const parks = [
    { x: 0.22, y: 0.12, w: 0.12, h: 0.10, name: 'Griffith' },
    { x: 0.70, y: 0.60, w: 0.08, h: 0.12, name: 'Echo' },
    { x: 0.05, y: 0.82, w: 0.15, h: 0.08, name: '' },
  ];

  const districts = [
    { name: 'Hollywood', x: 0.28, y: 0.28, icon: 'star' },
    { name: 'Downtown', x: 0.58, y: 0.48, icon: 'home' },
    { name: 'Santa Monica', x: 0.08, y: 0.62, icon: 'sun' },
    { name: 'Pasadena', x: 0.78, y: 0.18, icon: 'book' },
    { name: 'Venice', x: 0.05, y: 0.78, icon: 'compass' },
    { name: 'Koreatown', x: 0.45, y: 0.42, icon: 'grid' },
  ];

  const landColor = isDark ? '#2A4A6A' : '#C8E6C9';
  const oceanColor = isDark ? '#1A365D' : '#81D4FA';
  const parkColor = isDark ? '#1B5E20' : '#66BB6A';
  const roadColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)';
  const minorRoadColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)';

  return (
    <View 
      style={styles.snapMapContainer}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.snapMap, { backgroundColor: landColor }]}>
        <View style={[styles.oceanArea, { backgroundColor: oceanColor, width: containerWidth * 0.12 }]} />
        <View style={[styles.oceanWave, { backgroundColor: isDark ? '#2196F3' : '#4FC3F7', left: containerWidth * 0.10 }]} />
        <View style={[styles.oceanWave, { backgroundColor: isDark ? '#1976D2' : '#29B6F6', left: containerWidth * 0.08, opacity: 0.5 }]} />
        
        {parks.map((park, i) => (
          <View 
            key={`park-${i}`}
            style={[
              styles.parkArea,
              {
                left: park.x * containerWidth,
                top: park.y * mapHeight,
                width: park.w * containerWidth,
                height: park.h * mapHeight,
                backgroundColor: parkColor,
              }
            ]}
          >
            {park.name ? (
              <ThemedText style={[styles.parkLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                {park.name}
              </ThemedText>
            ) : null}
          </View>
        ))}

        {minorRoads.map((road, i) => (
          <View 
            key={`minor-${i}`}
            style={[
              styles.mapRoad,
              {
                left: road.x * containerWidth,
                top: road.y * mapHeight,
                width: road.horizontal ? road.w * containerWidth : road.w,
                height: road.horizontal ? road.h : road.h * mapHeight,
                backgroundColor: minorRoadColor,
              }
            ]}
          />
        ))}

        {majorRoads.map((road, i) => (
          <View 
            key={`major-${i}`}
            style={[
              styles.mapRoad,
              {
                left: road.x * containerWidth,
                top: road.y * mapHeight,
                width: road.horizontal ? road.w * containerWidth : road.w,
                height: road.horizontal ? road.h : road.h * mapHeight,
                backgroundColor: roadColor,
                borderRadius: 2,
              }
            ]}
          />
        ))}

        {districts.map((district, i) => (
          <View key={`district-${i}`} style={[styles.districtLabel, { left: district.x * containerWidth, top: district.y * mapHeight }]}>
            <View style={[styles.districtBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)' }]}>
              <Feather name={district.icon as any} size={8} color={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'} />
              <ThemedText style={[styles.districtText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }]}>
                {district.name}
              </ThemedText>
            </View>
          </View>
        ))}

        {events.slice(0, 20).map((event, index) => {
          const x = lngToX(event.longitude, containerWidth);
          const y = latToY(event.latitude);
          if (x < 20 || x > containerWidth - 20 || y < 15 || y > mapHeight - 25) return null;
          const color = EventColors[event.category] || theme.primary;
          return (
            <Pressable
              key={event.id}
              style={[
                styles.snapMarker,
                { 
                  left: x - 16, 
                  top: y - 40,
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
                    size={14} 
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
        <View style={[styles.snapLocationBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)' }]}>
          <Feather name="map-pin" size={14} color={isDark ? '#FF6B6B' : '#E53935'} />
          <ThemedText style={[styles.snapLocationText, { color: isDark ? '#fff' : '#333' }]}>
            Los Angeles, CA
          </ThemedText>
        </View>
        <View style={[styles.eventCountBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.9)' }]}>
          <ThemedText style={styles.eventCountText}>
            {events.length} events
          </ThemedText>
        </View>
      </View>

      <View style={styles.mapLegendBar}>
        <View style={[styles.legendItem, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}>
          <View style={[styles.legendDot, { backgroundColor: EventColors.entertainment }]} />
          <ThemedText style={[styles.legendText, { color: isDark ? '#fff' : '#333' }]}>Shows</ThemedText>
        </View>
        <View style={[styles.legendItem, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}>
          <View style={[styles.legendDot, { backgroundColor: EventColors.sports }]} />
          <ThemedText style={[styles.legendText, { color: isDark ? '#fff' : '#333' }]}>Sports</ThemedText>
        </View>
        <View style={[styles.legendItem, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}>
          <View style={[styles.legendDot, { backgroundColor: EventColors.food }]} />
          <ThemedText style={[styles.legendText, { color: isDark ? '#fff' : '#333' }]}>Food</ThemedText>
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
    height: 240,
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
});
