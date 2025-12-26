import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
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
import { useEvents } from "@/hooks/useEvents";
import { Spacing, BorderRadius, EventColors, Typography } from "@/constants/theme";
import { RootStackParamList, Event } from "@/navigation/RootStackNavigator";

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
    case "bars":
      return "moon";
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

  const categoryColor = EventColors[event.category] || EventColors.entertainment;

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
      {/* Trending Badge */}
      {event.isTrending && (
        <View style={styles.trendingBadge}>
          <Feather name="trending-up" size={12} color="#FFFFFF" />
          <ThemedText style={styles.trendingText}>TRENDING</ThemedText>
        </View>
      )}

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

        {/* Stats Row */}
        {((event.viewCount && event.viewCount > 100) || (event.favoriteCount && event.favoriteCount > 0)) && (
          <View style={styles.statsRow}>
            {event.viewCount && event.viewCount > 100 && (
              <View style={styles.statItem}>
                <Feather name="eye" size={11} color={theme.textSecondary} />
                <ThemedText style={[styles.statsText, { color: theme.textSecondary }]}>
                  {event.viewCount > 1000
                    ? `${(event.viewCount / 1000).toFixed(1)}k`
                    : `${event.viewCount}`
                  }
                </ThemedText>
              </View>
            )}
            {event.favoriteCount && event.favoriteCount > 0 && (
              <View style={styles.statItem}>
                <Feather name="heart" size={11} color="#FF3B5C" />
                <ThemedText style={[styles.statsText, { color: theme.textSecondary }]}>
                  {`${event.favoriteCount}`}
                </ThemedText>
              </View>
            )}
          </View>
        )}

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
type SortOption = "distance" | "trending" | "date";

export default function EventListScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { events, isLoading } = useEvents();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("distance");

  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events;
    
    // Filter by tab
    if (activeTab === "favorites") {
      filtered = filtered.filter((event) => favorites.includes(event.id));
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query) ||
          event.address.toLowerCase().includes(query)
      );
    }
    
    // Sort
    let sorted = [...filtered];
    switch (sortBy) {
      case "trending":
        sorted.sort((a, b) => {
          const aScore = (a.favoriteCount || 0) * 10 + (a.viewCount || 0);
          const bScore = (b.favoriteCount || 0) * 10 + (b.viewCount || 0);
          return bScore - aScore;
        });
        break;
      case "date":
        // For now, keep original order (you can add date sorting logic)
        break;
      case "distance":
      default:
        // Keep original order (distance sorting happens in backend/map screen)
        break;
    }
    
    return sorted;
  }, [events, searchQuery, activeTab, favorites, sortBy]);

  const handleEventPress = (event: Event) => {
    navigation.navigate("EventDetails", { event });
  };

  const handleTabChange = (tab: FilterTab) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setActiveTab(tab);
  };

  const handleSortChange = (sort: SortOption) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSortBy(sort);
  };

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
            {`Favorites (${favorites.length})`}
          </ThemedText>
        </Pressable>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <ThemedText style={[styles.sortLabel, { color: theme.textSecondary }]}>
          Sort by:
        </ThemedText>
        <Pressable
          onPress={() => handleSortChange("distance")}
          style={[
            styles.sortButton,
            { backgroundColor: theme.backgroundDefault },
            sortBy === "distance" && { backgroundColor: theme.primary },
          ]}
        >
          <Feather
            name="navigation"
            size={14}
            color={sortBy === "distance" ? "#FFFFFF" : theme.text}
          />
          <ThemedText
            style={[
              styles.sortButtonText,
              { color: sortBy === "distance" ? "#FFFFFF" : theme.text },
            ]}
          >
            Nearby
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleSortChange("trending")}
          style={[
            styles.sortButton,
            { backgroundColor: theme.backgroundDefault },
            sortBy === "trending" && { backgroundColor: "#FF3B5C" },
          ]}
        >
          <Feather
            name="trending-up"
            size={14}
            color={sortBy === "trending" ? "#FFFFFF" : theme.text}
          />
          <ThemedText
            style={[
              styles.sortButtonText,
              { color: sortBy === "trending" ? "#FFFFFF" : theme.text },
            ]}
          >
            Trending
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleSortChange("date")}
          style={[
            styles.sortButton,
            { backgroundColor: theme.backgroundDefault },
            sortBy === "date" && { backgroundColor: theme.secondary },
          ]}
        >
          <Feather
            name="calendar"
            size={14}
            color={sortBy === "date" ? "#FFFFFF" : theme.text}
          />
          <ThemedText
            style={[
              styles.sortButtonText,
              { color: sortBy === "date" ? "#FFFFFF" : theme.text },
            ]}
          >
            Date
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={filteredAndSortedEvents}
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
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
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
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
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginRight: Spacing.xs,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "500",
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
    position: "relative",
  },
  trendingBadge: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: "#FF3B5C",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  trendingText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statsText: {
    fontSize: 11,
    fontWeight: "500",
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
