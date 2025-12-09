import React, { useState } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  SharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "./RootStackNavigator";
import MapScreen from "@/screens/MapScreen";
import EventListScreen from "@/screens/EventListScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Tab = {
  key: string;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { key: "map", label: "Map", icon: "map" },
  { key: "events", label: "Events", icon: "calendar" },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabBar({
  activeIndex,
  onTabPress,
  scrollOffset,
}: {
  activeIndex: number;
  onTabPress: (index: number) => void;
  scrollOffset: SharedValue<number>;
}) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (SCREEN_WIDTH - Spacing.xl * 2) / TABS.length;
    return {
      transform: [
        {
          translateX: interpolate(
            scrollOffset.value,
            [0, 1],
            [0, tabWidth]
          ),
        },
      ],
      width: tabWidth - Spacing.sm,
    };
  });

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={styles.tabBarBlur}
      >
        <View style={styles.tabBar}>
          <Animated.View
            style={[
              styles.tabIndicator,
              { backgroundColor: theme.primary },
              indicatorStyle,
            ]}
          />
          {TABS.map((tab, index) => (
            <TabButton
              key={tab.key}
              tab={tab}
              isActive={activeIndex === index}
              onPress={() => onTabPress(index)}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

function TabButton({
  tab,
  isActive,
  onPress,
}: {
  tab: Tab;
  isActive: boolean;
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
      style={[styles.tabButton, animatedStyle]}
    >
      <Feather
        name={tab.icon as any}
        size={22}
        color={isActive ? "#FFFFFF" : theme.textSecondary}
      />
      <ThemedText
        style={[
          styles.tabLabel,
          { color: isActive ? "#FFFFFF" : theme.textSecondary },
        ]}
      >
        {tab.label}
      </ThemedText>
    </AnimatedPressable>
  );
}

function FloatingHeader() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    <View style={[styles.headerContainer, { paddingTop: insets.top + Spacing.sm }]}>
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={styles.headerBlur}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Feather name="map-pin" size={20} color={theme.primary} />
            <ThemedText style={styles.headerTitle}>LA Events</ThemedText>
          </View>
          <AnimatedPressable
            onPress={() => navigation.navigate("Settings")}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.settingsButton, animatedStyle]}
          >
            <Feather name="settings" size={20} color={theme.text} />
          </AnimatedPressable>
        </View>
      </BlurView>
    </View>
  );
}

export default function SwipeableTabsNavigator() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollOffset = useSharedValue(0);

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    scrollOffset.value = withSpring(index, { damping: 20, stiffness: 100 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.webContent}>
        {activeIndex === 0 ? <MapScreen /> : <EventListScreen />}
      </View>
      <FloatingHeader />
      <TabBar
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
        scrollOffset={scrollOffset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContent: {
    flex: 1,
  },
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
  },
  tabBarBlur: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  tabBar: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: Spacing.xs,
    bottom: Spacing.xs,
    left: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    zIndex: 100,
  },
  headerBlur: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  settingsButton: {
    padding: Spacing.xs,
  },
});
