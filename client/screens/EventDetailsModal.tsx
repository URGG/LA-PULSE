import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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
    default:
      return "map-pin";
  }
};

const getCategoryLabel = (category: Event["category"]): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
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
      style={[styles.actionButton, { backgroundColor: color }, animatedStyle]}
    >
      <Feather name={icon as any} size={20} color="#FFFFFF" />
      <ThemedText style={styles.actionButtonText}>{label}</ThemedText>
    </AnimatedPressable>
  );
}

export default function EventDetailsModal() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "EventDetails">>();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { event } = route.params;
  const categoryColor = EventColors[event.category];
  const favorited = isFavorite(event.id);

  const handleToggleFavorite = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleFavorite(event.id);
  };

  const handleGetDirections = () => {
    const url = Platform.select({
      ios: `maps://app?daddr=${event.latitude},${event.longitude}`,
      android: `google.navigation:q=${event.latitude},${event.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`,
    });

    Linking.openURL(url as string).catch((err) =>
      console.error("Error opening maps:", err)
    );
  };

  const handleShare = () => {
    const message = `Check out ${event.title} on ${event.date} at ${event.time}!\n\n${event.address}`;
    
    if (Platform.OS === "web") {
      if (navigator.share) {
        navigator.share({
          title: event.title,
          text: message,
        });
      } else {
        navigator.clipboard.writeText(message);
      }
    } else {
      Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dragHandle} />
        <View style={styles.headerButtons}>
          <Pressable
            onPress={handleToggleFavorite}
            hitSlop={8}
            style={styles.headerButton}
          >
            <Feather
              name="heart"
              size={24}
              color={favorited ? "#FF3B5C" : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.headerButton}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryBadgeContainer}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: categoryColor + "20" },
            ]}
          >
            <Feather
              name={getCategoryIcon(event.category) as any}
              size={16}
              color={categoryColor}
            />
            <ThemedText style={[styles.categoryText, { color: categoryColor }]}>
              {getCategoryLabel(event.category)}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.title}>{event.title}</ThemedText>

        <View style={styles.infoRow}>
          <View
            style={[styles.infoIcon, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="calendar" size={18} color={theme.primary} />
          </View>
          <View style={styles.infoText}>
            <ThemedText style={styles.infoLabel}>Date & Time</ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.textSecondary }]}>
              {event.date} at {event.time}
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View
            style={[styles.infoIcon, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="map-pin" size={18} color={theme.primary} />
          </View>
          <View style={styles.infoText}>
            <ThemedText style={styles.infoLabel}>Location</ThemedText>
            <ThemedText style={[styles.infoValue, { color: theme.textSecondary }]}>
              {event.address}
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        <ThemedText style={styles.sectionTitle}>About</ThemedText>
        <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
          {event.description}
        </ThemedText>

        <View style={styles.actionsContainer}>
          <ActionButton
            icon="navigation"
            label="Get Directions"
            color={theme.primary}
            onPress={handleGetDirections}
          />
          <ActionButton
            icon="share-2"
            label="Share"
            color={theme.secondary}
            onPress={handleShare}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#C7C7CC",
    borderRadius: 2.5,
    marginBottom: Spacing.sm,
  },
  headerButtons: {
    position: "absolute",
    right: Spacing.lg,
    top: Spacing.md,
    flexDirection: "row",
    gap: Spacing.md,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  categoryBadgeContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing["3xl"],
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
