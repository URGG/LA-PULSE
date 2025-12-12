import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
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
  onToggleFavorite,
}: {
  event: Event;
  onPress: () => void;
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
        <Feather name="heart" size={20} color="#FF3B5C" />
      </Pressable>
    </AnimatedPressable>
  );
}

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, toggleFavorite } = useFavorites();
  const { events, isLoading } = useEvents();

  const favoriteEvents = events.filter((event) => favorites.includes(event.id));

  const handleEventPress = (event: Event) => {
    navigation.navigate("EventDetails", { event });
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading favorites...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={favoriteEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { 
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 80
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => handleEventPress(item)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="heart" size={64} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
              No Favorites Yet
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Tap the heart icon on any event to save it here
            </ThemedText>
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
  favoriteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    paddingTop: Spacing["5xl"] * 2,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    fontSize: 24,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: Spacing.sm,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});