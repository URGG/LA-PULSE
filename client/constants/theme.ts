import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#666666",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: "#FF6B35",
    link: "#004E89",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F5F5F5",
    backgroundSecondary: "#E6E6E6",
    backgroundTertiary: "#D9D9D9",
    primary: "#FF6B35",
    primaryLight: "#FF8F66",
    primaryDark: "#E54F1F",
    secondary: "#004E89",
    secondaryLight: "#3374A8",
    entertainment: "#FF6B35",
    food: "#F7B32B",
    sports: "#00A676",
    arts: "#9B51E0",
    border: "#E0E0E0",
    cardBackground: "#FFFFFF",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#A0A0A0",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#FF8F66",
    link: "#3374A8",
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#2A2A2A",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    primary: "#FF6B35",
    primaryLight: "#FF8F66",
    primaryDark: "#E54F1F",
    secondary: "#3374A8",
    secondaryLight: "#5A94C8",
    entertainment: "#FF6B35",
    food: "#F7B32B",
    sports: "#00A676",
    arts: "#9B51E0",
    border: "#404244",
    cardBackground: "#2A2A2A",
  },
};

export const EventColors = {
  entertainment: "#FF6B35",
  food: "#F7B32B",
  sports: "#00A676",
  arts: "#9B51E0",
  bars: "#E91E63",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
