import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useFavorites } from "@/hooks/useFavorites";
import { Spacing, BorderRadius, EventColors, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList, Event } from "@/navigation/RootStackNavigator";

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getCategoryIcon = (category: Event["category"]): string => {
  switch (category) {
    case "entertainment":
      return "film";
    case "food":
      return "coffee";
    case "sports":
      return "activity";
    case "arts":
      return "image";
    default:
      return "map-pin";
  }
};

function EventCard({
  event,
  onPress,
  isFavorite,
  onToggleFavorite,
}: {
  event: Event;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
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

  const handleFavoritePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggleFavorite();
  };

  const categoryColor = EventColors[event.category];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.eventCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.categoryIcon,
          { backgroundColor: categoryColor + "20" },
        ]}
      >
        <Feather
          name={getCategoryIcon(event.category) as any}
          size={24}
          color={categoryColor}
        />
      </View>
      <View style={styles.eventInfo}>
        <ThemedText style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </ThemedText>
        <View style={styles.eventMeta}>
          <Feather
            name="calendar"
            size={14}
            color={theme.textSecondary}
            style={styles.metaIcon}
          />
          <ThemedText style={[styles.eventDate, { color: theme.textSecondary }]}>
            {event.date} at {event.time}
          </ThemedText>
        </View>
        <View style={styles.eventMeta}>
          <Feather
            name="map-pin"
            size={14}
            color={theme.textSecondary}
            style={styles.metaIcon}
          />
          <ThemedText
            style={[styles.eventLocation, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {event.address}
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={handleFavoritePress}
        hitSlop={8}
        style={styles.favoriteButton}
      >
        <Feather
          name="heart"
          size={20}
          color={isFavorite ? "#FF3B5C" : theme.textSecondary}
        />
      </Pressable>
    </AnimatedPressable>
  );
}

type FilterTab = "all" | "favorites";

export default function EventListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filteredEvents = useMemo(() => {
    let events = MOCK_EVENTS;
    
    if (activeTab === "favorites") {
      events = events.filter((event) => favorites.includes(event.id));
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      events = events.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query) ||
          event.address.toLowerCase().includes(query)
      );
    }
    
    return events;
  }, [searchQuery, activeTab, favorites]);

  const handleEventPress = (event: Event) => {
    navigation.navigate("EventDetails", { event });
  };

  const handleTabChange = (tab: FilterTab) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setActiveTab(tab);
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search events..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => handleTabChange("all")}
          style={[
            styles.tabButton,
            activeTab === "all" && { backgroundColor: theme.primary },
          ]}
        >
          <Feather
            name="grid"
            size={16}
            color={activeTab === "all" ? "#FFFFFF" : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === "all" ? "#FFFFFF" : theme.textSecondary },
            ]}
          >
            All Events
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleTabChange("favorites")}
          style={[
            styles.tabButton,
            activeTab === "favorites" && { backgroundColor: "#FF3B5C" },
          ]}
        >
          <Feather
            name="heart"
            size={16}
            color={activeTab === "favorites" ? "#FFFFFF" : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === "favorites" ? "#FFFFFF" : theme.textSecondary },
            ]}
          >
            Favorites ({favorites.length})
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => handleEventPress(item)}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather
              name={activeTab === "favorites" ? "heart" : "calendar"}
              size={48}
              color={theme.textSecondary}
            />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              {activeTab === "favorites"
                ? "No favorites yet"
                : "No events found"}
            </ThemedText>
            {activeTab === "favorites" ? (
              <ThemedText
                style={[styles.emptySubtext, { color: theme.textSecondary }]}
              >
                Tap the heart icon to save events
              </ThemedText>
            ) : null}
          </View>
        }
        showsVerticalScrollIndicator={true}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  metaIcon: {
    marginRight: Spacing.xs,
  },
  eventDate: {
    fontSize: 13,
  },
  eventLocation: {
    fontSize: 13,
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  favoriteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    fontSize: 14,
  },
});
