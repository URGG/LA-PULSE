import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
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
import { useEvents } from "@/hooks/useEvents";
import { Spacing, BorderRadius, EventColors } from "@/constants/theme";
import { RootStackParamList, Event } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Category = {
  key: Event["category"];
  label: string;
  icon: string;
  color: string;
};

const CATEGORIES: Category[] = [
  { key: "entertainment", label: "Entertainment", icon: "film", color: EventColors.entertainment },
  { key: "food", label: "Food & Dining", icon: "coffee", color: EventColors.food },
  { key: "sports", label: "Sports", icon: "activity", color: EventColors.sports },
  { key: "arts", label: "Arts & Culture", icon: "image", color: EventColors.arts },
  { key: "bars", label: "Nightlife", icon: "moon", color: EventColors.bars },
];

function CategoryCard({
  category,
  eventCount,
  onPress,
}: {
  category: Category;
  eventCount: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
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
        styles.categoryCard,
        { backgroundColor: category.color },
        animatedStyle,
      ]}
    >
      <View style={styles.categoryIconContainer}>
        <View style={[styles.categoryIconBg, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name={category.icon as any} size={32} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.categoryInfo}>
        <ThemedText style={styles.categoryLabel}>{category.label}</ThemedText>
        <ThemedText style={styles.categoryCount}>
          {eventCount} {eventCount === 1 ? "event" : "events"}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
    </AnimatedPressable>
  );
}

function EventListItem({
  event,
  onPress,
}: {
  event: Event;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const categoryColor = EventColors[event.category] || EventColors.entertainment;

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
        styles.eventItem,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={[styles.eventIconSmall, { backgroundColor: categoryColor + "20" }]}>
        <Feather
          name={event.category === "sports" ? "activity" : event.category === "food" ? "coffee" : event.category === "arts" ? "image" : event.category === "bars" ? "moon" : "film"}
          size={16}
          color={categoryColor}
        />
      </View>
      <View style={styles.eventItemInfo}>
        <ThemedText style={styles.eventItemTitle} numberOfLines={1}>
          {event.title}
        </ThemedText>
        <ThemedText style={[styles.eventItemDate, { color: theme.textSecondary }]}>
          {event.date}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </AnimatedPressable>
  );
}

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { events } = useEvents();
  const [selectedCategory, setSelectedCategory] = useState<Event["category"] | null>(null);

  const eventsByCategory = CATEGORIES.map((category) => ({
    ...category,
    events: events.filter((event) => event.category === category.key),
  }));

  const handleCategoryPress = (categoryKey: Event["category"]) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedCategory(categoryKey === selectedCategory ? null : categoryKey);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate("EventDetails", { event });
  };

  const selectedCategoryData = selectedCategory
    ? eventsByCategory.find((c) => c.key === selectedCategory)
    : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!selectedCategory ? (
          <>
            <ThemedText style={styles.sectionTitle}>Browse by Category</ThemedText>
            <View style={styles.categoriesContainer}>
              {eventsByCategory.map((category) => (
                <CategoryCard
                  key={category.key}
                  category={category}
                  eventCount={category.events.length}
                  onPress={() => handleCategoryPress(category.key)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.backButtonContainer}>
              <Pressable
                onPress={() => setSelectedCategory(null)}
                style={[styles.backButton, { backgroundColor: theme.backgroundDefault }]}
              >
                <Feather name="arrow-left" size={20} color={theme.text} />
                <ThemedText style={styles.backButtonText}>Back</ThemedText>
              </Pressable>
            </View>

            <View style={styles.categoryHeader}>
              <View
                style={[
                  styles.categoryHeaderIcon,
                  { backgroundColor: selectedCategoryData?.color },
                ]}
              >
                <Feather
                  name={selectedCategoryData?.icon as any}
                  size={32}
                  color="#FFFFFF"
                />
              </View>
              <View>
                <ThemedText style={styles.categoryHeaderTitle}>
                  {selectedCategoryData?.label}
                </ThemedText>
                <ThemedText style={[styles.categoryHeaderCount, { color: theme.textSecondary }]}>
                  {selectedCategoryData?.events.length || 0} events
                </ThemedText>
              </View>
            </View>

            <View style={styles.eventsList}>
              {selectedCategoryData?.events.map((event) => (
                <EventListItem
                  key={event.id}
                  event={event}
                  onPress={() => handleEventPress(event)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },
  categoriesContainer: {
    gap: Spacing.md,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  categoryIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconBg: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  backButtonContainer: {
    marginBottom: Spacing.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  categoryHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryHeaderTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  categoryHeaderCount: {
    fontSize: 14,
    marginTop: 2,
  },
  eventsList: {
    gap: Spacing.sm,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  eventIconSmall: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  eventItemInfo: {
    flex: 1,
  },
  eventItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  eventItemDate: {
    fontSize: 13,
  },
});
