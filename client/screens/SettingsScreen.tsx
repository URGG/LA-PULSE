import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography, EventColors } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AVATAR_OPTIONS = [
  { id: "palm", icon: "sunset", label: "Palm Tree" },
  { id: "sun", icon: "sun", label: "Sunshine" },
  { id: "city", icon: "home", label: "City" },
];

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
      <View
        style={[
          styles.sectionContent,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    if (onPress) scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[styles.settingsRow, animatedStyle]}
    >
      <Feather name={icon as any} size={20} color={theme.primary} />
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      {value ? (
        <ThemedText style={[styles.rowValue, { color: theme.textSecondary }]}>
          {value}
        </ThemedText>
      ) : null}
      {showChevron && onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </AnimatedPressable>
  );
}

function SettingsToggle({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: string;
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.settingsRow}>
      <Feather name={icon as any} size={20} color={theme.primary} />
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.backgroundSecondary, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function AvatarSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.avatarContainer}>
      {AVATAR_OPTIONS.map((avatar) => {
        const isSelected = avatar.id === selectedId;
        const scale = useSharedValue(1);

        const animatedStyle = useAnimatedStyle(() => ({
          transform: [{ scale: scale.value }],
        }));

        return (
          <AnimatedPressable
            key={avatar.id}
            onPress={() => onSelect(avatar.id)}
            onPressIn={() => {
              scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
            }}
            onPressOut={() => {
              scale.value = withSpring(1, { damping: 15, stiffness: 150 });
            }}
            style={[
              styles.avatarOption,
              {
                backgroundColor: isSelected
                  ? theme.primary
                  : theme.backgroundDefault,
                borderColor: isSelected ? theme.primary : theme.border,
              },
              animatedStyle,
            ]}
          >
            <Feather
              name={avatar.icon as any}
              size={32}
              color={isSelected ? "#FFFFFF" : theme.text}
            />
            <ThemedText
              style={[
                styles.avatarLabel,
                { color: isSelected ? "#FFFFFF" : theme.textSecondary },
              ]}
            >
              {avatar.label}
            </ThemedText>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function CategoryPreferences({
  selectedCategories,
  onToggle,
}: {
  selectedCategories: Record<string, boolean>;
  onToggle: (category: string) => void;
}) {
  const { theme } = useTheme();

  const categories = [
    { key: "entertainment", label: "Entertainment", icon: "film" },
    { key: "food", label: "Food", icon: "coffee" },
    { key: "sports", label: "Sports", icon: "activity" },
    { key: "arts", label: "Arts", icon: "image" },
  ];

  return (
    <View style={styles.categoriesContainer}>
      {categories.map((cat) => {
        const isSelected = selectedCategories[cat.key];
        const color = EventColors[cat.key as keyof typeof EventColors];

        return (
          <Pressable
            key={cat.key}
            onPress={() => onToggle(cat.key)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: isSelected ? color : theme.backgroundDefault,
                borderColor: isSelected ? color : theme.border,
              },
            ]}
          >
            <Feather
              name={cat.icon as any}
              size={16}
              color={isSelected ? "#FFFFFF" : theme.text}
            />
            <ThemedText
              style={[
                styles.categoryLabel,
                { color: isSelected ? "#FFFFFF" : theme.text },
              ]}
            >
              {cat.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedAvatar, setSelectedAvatar] = useState("palm");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [categoryPreferences, setCategoryPreferences] = useState({
    entertainment: true,
    food: true,
    sports: true,
    arts: true,
  });

  const handleCategoryToggle = (category: string) => {
    setCategoryPreferences((prev) => ({
      ...prev,
      [category]: !prev[category as keyof typeof prev],
    }));
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Profile">
          <View style={styles.avatarSection}>
            <ThemedText style={styles.avatarTitle}>Choose Avatar</ThemedText>
            <AvatarSelector
              selectedId={selectedAvatar}
              onSelect={setSelectedAvatar}
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsToggle
            icon="bell"
            label="Event Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsToggle
            icon="moon"
            label="Dark Mode"
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
          />
        </SettingsSection>

        <SettingsSection title="Event Categories">
          <View style={styles.categorySection}>
            <ThemedText
              style={[styles.categoryHint, { color: theme.textSecondary }]}
            >
              Select which types of events you want to see
            </ThemedText>
            <CategoryPreferences
              selectedCategories={categoryPreferences}
              onToggle={handleCategoryToggle}
            />
          </View>
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow icon="info" label="Version" value="1.0.0" showChevron={false} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow icon="heart" label="Made with love in LA" showChevron={false} />
        </SettingsSection>
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
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionContent: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  rowValue: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },
  avatarSection: {
    padding: Spacing.lg,
  },
  avatarTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  avatarOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  avatarLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
    fontWeight: "500",
  },
  categorySection: {
    padding: Spacing.lg,
  },
  categoryHint: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
