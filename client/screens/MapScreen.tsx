import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
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

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
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

const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    title: "Hollywood Bowl Concert",
    description: "Live music under the stars at the iconic Hollywood Bowl amphitheater.",
    category: "entertainment",
    date: "Dec 15, 2025",
    time: "7:30 PM",
    address: "2301 N Highland Ave, Los Angeles, CA 90068",
    latitude: 34.1122,
    longitude: -118.3391,
  },
  {
    id: "2",
    title: "Grand Central Market Food Tour",
    description: "Explore diverse cuisines from around the world at this historic marketplace.",
    category: "food",
    date: "Dec 12, 2025",
    time: "11:00 AM",
    address: "317 S Broadway, Los Angeles, CA 90013",
    latitude: 34.0509,
    longitude: -118.2489,
  },
  {
    id: "3",
    title: "Lakers vs Celtics",
    description: "Watch the Lakers take on the Celtics at Crypto.com Arena.",
    category: "sports",
    date: "Dec 20, 2025",
    time: "7:00 PM",
    address: "1111 S Figueroa St, Los Angeles, CA 90015",
    latitude: 34.043,
    longitude: -118.2673,
  },
  {
    id: "4",
    title: "LACMA Art Exhibition",
    description: "Explore contemporary art installations at the Los Angeles County Museum of Art.",
    category: "arts",
    date: "Dec 10, 2025",
    time: "10:00 AM",
    address: "5905 Wilshire Blvd, Los Angeles, CA 90036",
    latitude: 34.0639,
    longitude: -118.3592,
  },
  {
    id: "5",
    title: "Santa Monica Pier Festival",
    description: "Annual festival with rides, games, and live entertainment on the pier.",
    category: "entertainment",
    date: "Dec 18, 2025",
    time: "12:00 PM",
    address: "200 Santa Monica Pier, Santa Monica, CA 90401",
    latitude: 34.0097,
    longitude: -118.4977,
  },
  {
    id: "6",
    title: "Koreatown Food Crawl",
    description: "Sample the best Korean BBQ and street food in LA's Koreatown.",
    category: "food",
    date: "Dec 14, 2025",
    time: "6:00 PM",
    address: "621 S Western Ave, Los Angeles, CA 90005",
    latitude: 34.0615,
    longitude: -118.3095,
  },
  {
    id: "7",
    title: "Dodgers Spring Training",
    description: "Watch the Dodgers prepare for the upcoming season.",
    category: "sports",
    date: "Dec 22, 2025",
    time: "1:00 PM",
    address: "1000 Vin Scully Ave, Los Angeles, CA 90012",
    latitude: 34.0739,
    longitude: -118.24,
  },
  {
    id: "8",
    title: "Getty Center Gardens Tour",
    description: "Guided tour through the beautiful gardens and architecture of the Getty.",
    category: "arts",
    date: "Dec 11, 2025",
    time: "2:00 PM",
    address: "1200 Getty Center Dr, Los Angeles, CA 90049",
    latitude: 34.0781,
    longitude: -118.4741,
  },
];

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
}: {
  events: Event[];
  onEventPress: (event: Event) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
          {events.slice(0, 4).map((event) => (
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
                  { backgroundColor: EventColors[event.category] },
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
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

export default function MapScreen() {
  const { theme, isDark } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<any>(null);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");

  const filteredEvents =
    activeFilter === "all"
      ? MOCK_EVENTS
      : MOCK_EVENTS.filter((event) => event.category === activeFilter);

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
    mapRef.current?.animateToRegion(LA_REGION, 500);
  }, []);

  const handleMarkerPress = useCallback(
    (event: Event) => {
      navigation.navigate("EventDetails", { event });
    },
    [navigation]
  );

  const getMarkerColor = (category: Event["category"]) => {
    return EventColors[category];
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
        <WebMapFallback events={filteredEvents} onEventPress={handleMarkerPress} />
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
          {Marker && filteredEvents.map((event) => (
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

      <View
        style={[
          styles.mapControls,
          { bottom: insets.bottom + Spacing.xl },
        ]}
      >
        <MapControlButton icon="plus" onPress={handleZoomIn} />
        <MapControlButton icon="minus" onPress={handleZoomOut} />
        <MapControlButton icon="navigation" onPress={handleRecenter} />
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
