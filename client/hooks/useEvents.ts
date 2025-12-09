import { useQuery } from "@tanstack/react-query";
import { Event } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type EventsResponse = {
  events: Event[];
  source: "ticketmaster" | "mock";
};

export function useEvents() {
  const query = useQuery<EventsResponse>({
    queryKey: ["events"],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL("/api/events", baseUrl);
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    events: query.data?.events || [],
    source: query.data?.source || "mock",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
