import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import SettingsScreen from "@/screens/SettingsScreen";
import EventDetailsModal from "@/screens/EventDetailsModal";
import SwipeableTabsNavigator from "./SwipeableTabsNavigator";

export type Event = {
  id: string;
  title: string;
  description: string;
  category: "entertainment" | "food" | "sports" | "arts" | "bars";
  date: string;
  time: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  ticketUrl?: string;
  
  // Trending indicators
  viewCount?: number;
  favoriteCount?: number;
  isTrending?: boolean;
  
  // Transportation info
  parkingInfo?: {
    available: boolean;
    cost?: string;
    locations?: string[];
  };
  nearbyTransit?: {
    type: "metro" | "bus" | "light_rail";
    station: string;
    distance: string;
  }[];
};

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  EventDetails: { event: Event };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={SwipeableTabsNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsModal}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
