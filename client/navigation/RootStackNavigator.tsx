import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import MapScreen from "@/screens/MapScreen";
import EventListScreen from "@/screens/EventListScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import EventDetailsModal from "@/screens/EventDetailsModal";

export type Event = {
  id: string;
  title: string;
  description: string;
  category: "entertainment" | "food" | "sports" | "arts";
  date: string;
  time: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type RootStackParamList = {
  Map: undefined;
  EventList: undefined;
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
        name="Map"
        component={MapScreen}
        options={{
          headerTitle: () => <HeaderTitle title="LA Events" />,
        }}
      />
      <Stack.Screen
        name="EventList"
        component={EventListScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "Events List",
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
