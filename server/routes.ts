import type { Express } from "express";
import { createServer, type Server } from "node:http";

type Event = {
  id: string;
  title: string;
  description: string;
  category: "entertainment" | "food" | "sports" | "arts";
  date: string;
  time: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  ticketUrl?: string;
};

const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    title: "Hollywood Bowl Concert",
    description: "Live music under the stars at the iconic Hollywood Bowl amphitheater.",
    category: "entertainment",
    date: "Dec 15, 2025",
    time: "7:30 PM",
    address: "2301 N Highland Ave, Los Angeles, CA 90068",
    latitude: 34.1122,
    longitude: -118.3391,
  },
  {
    id: "2",
    title: "Grand Central Market Food Tour",
    description: "Explore diverse cuisines from around the world at this historic marketplace.",
    category: "food",
    date: "Dec 12, 2025",
    time: "11:00 AM",
    address: "317 S Broadway, Los Angeles, CA 90013",
    latitude: 34.0509,
    longitude: -118.2489,
  },
  {
    id: "3",
    title: "Lakers vs Celtics",
    description: "Watch the Lakers take on the Celtics at Crypto.com Arena.",
    category: "sports",
    date: "Dec 20, 2025",
    time: "7:00 PM",
    address: "1111 S Figueroa St, Los Angeles, CA 90015",
    latitude: 34.043,
    longitude: -118.2673,
  },
  {
    id: "4",
    title: "LACMA Art Exhibition",
    description: "Explore contemporary art installations at the Los Angeles County Museum of Art.",
    category: "arts",
    date: "Dec 10, 2025",
    time: "10:00 AM",
    address: "5905 Wilshire Blvd, Los Angeles, CA 90036",
    latitude: 34.0639,
    longitude: -118.3592,
  },
  {
    id: "5",
    title: "Santa Monica Pier Festival",
    description: "Annual festival with rides, games, and live entertainment on the pier.",
    category: "entertainment",
    date: "Dec 18, 2025",
    time: "12:00 PM",
    address: "200 Santa Monica Pier, Santa Monica, CA 90401",
    latitude: 34.0097,
    longitude: -118.4977,
  },
  {
    id: "6",
    title: "Koreatown Food Crawl",
    description: "Sample the best Korean BBQ and street food in LA's Koreatown.",
    category: "food",
    date: "Dec 14, 2025",
    time: "6:00 PM",
    address: "621 S Western Ave, Los Angeles, CA 90005",
    latitude: 34.0615,
    longitude: -118.3095,
  },
  {
    id: "7",
    title: "Dodgers Spring Training",
    description: "Watch the Dodgers prepare for the upcoming season.",
    category: "sports",
    date: "Dec 22, 2025",
    time: "1:00 PM",
    address: "1000 Vin Scully Ave, Los Angeles, CA 90012",
    latitude: 34.0739,
    longitude: -118.24,
  },
  {
    id: "8",
    title: "Getty Center Gardens Tour",
    description: "Guided tour through the beautiful gardens and architecture of the Getty.",
    category: "arts",
    date: "Dec 11, 2025",
    time: "2:00 PM",
    address: "1200 Getty Center Dr, Los Angeles, CA 90049",
    latitude: 34.0781,
    longitude: -118.4741,
  },
];

function mapTicketmasterCategory(classifications: any[]): Event["category"] {
  if (!classifications || classifications.length === 0) return "entertainment";
  
  const segment = classifications[0]?.segment?.name?.toLowerCase() || "";
  const genre = classifications[0]?.genre?.name?.toLowerCase() || "";
  
  if (segment === "sports" || genre.includes("sport")) return "sports";
  if (segment === "arts & theatre" || genre.includes("art") || genre.includes("theatre")) return "arts";
  if (genre.includes("food") || genre.includes("culinary")) return "food";
  return "entertainment";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "TBA";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

async function fetchTicketmasterEvents(): Promise<Event[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  
  if (!apiKey) {
    console.log("TICKETMASTER_API_KEY not set, using mock data");
    return MOCK_EVENTS;
  }

  try {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("latlong", "34.0522,-118.2437");
    url.searchParams.set("radius", "50");
    url.searchParams.set("unit", "miles");
    url.searchParams.set("size", "50");
    url.searchParams.set("sort", "date,asc");
    const now = new Date();
    url.searchParams.set("startDateTime", now.toISOString().split('.')[0] + "Z");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error("Ticketmaster API error:", response.status, response.statusText);
      return MOCK_EVENTS;
    }

    const data = await response.json();
    
    if (!data._embedded?.events) {
      console.log("No events found from Ticketmaster, using mock data");
      return MOCK_EVENTS;
    }

    const events: Event[] = data._embedded.events.map((event: any) => {
      const venue = event._embedded?.venues?.[0];
      const location = venue?.location || {};
      
      return {
        id: event.id,
        title: event.name,
        description: event.info || event.pleaseNote || `${event.name} at ${venue?.name || "TBA"}`,
        category: mapTicketmasterCategory(event.classifications),
        date: event.dates?.start?.localDate ? formatDate(event.dates.start.localDate) : "TBA",
        time: event.dates?.start?.localTime ? formatTime(event.dates.start.localTime) : "TBA",
        address: venue ? `${venue.name}, ${venue.city?.name || ""}, ${venue.state?.stateCode || ""}` : "Location TBA",
        latitude: location.latitude ? parseFloat(location.latitude) : 34.0522,
        longitude: location.longitude ? parseFloat(location.longitude) : -118.2437,
        imageUrl: event.images?.[0]?.url,
        ticketUrl: event.url,
      };
    });

    return events.length > 0 ? events : MOCK_EVENTS;
  } catch (error) {
    console.error("Error fetching Ticketmaster events:", error);
    return MOCK_EVENTS;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/events", async (req, res) => {
    try {
      const events = await fetchTicketmasterEvents();
      res.json({ events, source: process.env.TICKETMASTER_API_KEY ? "ticketmaster" : "mock" });
    } catch (error) {
      console.error("Error in /api/events:", error);
      res.json({ events: MOCK_EVENTS, source: "mock" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
