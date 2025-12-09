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
} from "react-native";
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
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useEvents } from "@/hooks/useEvents";
import { Spacing, BorderRadius, EventColors, Shadows } from "@/constants/theme";
import { RootStackParamList, Event } from "@/navigation/RootStackNavigator";

let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
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

type CategoryFilter = "all" | "entertainment" | "food" | "sports" | "arts";

const CATEGORIES: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "grid" },
  { key: "entertainment", label: "Entertainment", icon: "film" },
  { key: "food", label: "Food", icon: "coffee" },
  { key: "sports", label: "Sports", icon: "activity" },
  { key: "arts", label: "Arts", icon: "image" },
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
        size={16}
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

  return (
    <ThemedView style={styles.webFallback}>
      <View style={[styles.webContent, { paddingTop: headerHeight + Spacing["3xl"] }]}>
        <Feather name="map" size={64} color={theme.primary} />
        <ThemedText style={styles.webTitle}>LA Events Map</ThemedText>
        <ThemedText style={[styles.webSubtitle, { color: theme.textSecondary }]}>
          Open in Expo Go on your phone to see the interactive map
        </ThemedText>
        <View style={styles.webEventList}>
          <ThemedText style={styles.webEventsTitle}>Upcoming Events</ThemedText>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            events.slice(0, 4).map((event) => (
              <Pressable
                key={event.id}
                onPress={() => onEventPress(event)}
                style={[
                  styles.webEventItem,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.webEventDot,
                    { backgroundColor: EventColors[event.category] || EventColors.entertainment },
                  ]}
                />
                <View style={styles.webEventInfo}>
                  <ThemedText style={styles.webEventTitle}>{event.title}</ThemedText>
                  <ThemedText style={[styles.webEventDate, { color: theme.textSecondary }]}>
                    {event.date} at {event.time}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>
            ))
          )}
        </View>
      </View>
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
        <Pressable
          onPress={() => navigation.navigate("EventList")}
          hitSlop={8}
          style={styles.headerButton}
        >
          <Feather name="list" size={22} color={theme.text} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={8}
          style={styles.headerButton}
        >
          <Feather name="settings" size={22} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, theme]);

  if (Platform.OS === "web") {
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
  headerButton: {
    padding: Spacing.xs,
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
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: Spacing.xs,
  },
  chipText: {
    fontSize: 14,
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
  webContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: Spacing.lg,
  },
  webSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  webEventList: {
    width: "100%",
    maxWidth: 400,
  },
  webEventsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  webEventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  webEventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  webEventInfo: {
    flex: 1,
  },
  webEventTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  webEventDate: {
    fontSize: 14,
    marginTop: 2,
  },
});
