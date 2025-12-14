import { useQuery } from "@tanstack/react-query";
import { Event } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type EventsResponse = {
  events: Event[];
  sources?: {
    ticketmaster: number;
    yelp: number;
    eventbrite: number;
    total: number;
  };
};

export function useEvents() {
  const query = useQuery<EventsResponse>({
    queryKey: ["events"],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL("/api/events", baseUrl);
      
      console.log("🔄 Fetching events from:", url.toString());
      
      const res = await fetch(url.toString());
      
      console.log("📡 Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ API Error:", errorText);
        throw new Error(`Failed to fetch events: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("✅ Events received:", data.events?.length || 0);
      console.log("📊 Sources:", data.sources);
      
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    events: query.data?.events || [],
    sources: query.data?.sources,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
