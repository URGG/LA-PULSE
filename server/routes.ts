import type { Express } from "express";
import { createServer, type Server } from "node:http";

type Event = {
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
    ticketUrl: "https://www.hollywoodbowl.com/tickets",
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
    ticketUrl: "https://www.grandcentralmarket.com/tours",
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
    ticketUrl: "https://www.nba.com/lakers/tickets",
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
    ticketUrl: "https://www.lacma.org/visit",
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
    ticketUrl: "https://www.santamonicapier.org/events",
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
    ticketUrl: "https://www.eventbrite.com/e/koreatown-food-crawl",
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
    ticketUrl: "https://www.mlb.com/dodgers/tickets",
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
    ticketUrl: "https://www.getty.edu/visit",
  },
  {
    id: "9",
    title: "Sunset Rooftop at The Standard",
    description: "Enjoy craft cocktails and stunning city views at this iconic rooftop bar in Downtown LA.",
    category: "bars",
    date: "Dec 13, 2025",
    time: "8:00 PM",
    address: "550 S Flower St, Los Angeles, CA 90071",
    latitude: 34.0487,
    longitude: -118.2573,
    ticketUrl: "https://www.standardhotels.com/la/features/rooftop",
  },
  {
    id: "10",
    title: "Jazz Night at The Dresden",
    description: "Classic cocktails and live jazz performances at this legendary Los Feliz lounge.",
    category: "bars",
    date: "Dec 16, 2025",
    time: "9:00 PM",
    address: "1760 N Vermont Ave, Los Angeles, CA 90027",
    latitude: 34.1021,
    longitude: -118.2912,
    ticketUrl: "https://www.thedresden.com/events",
  },
  {
    id: "11",
    title: "Wine Tasting at Everson Royce",
    description: "Explore natural wines and small plates at this trendy Arts District wine bar.",
    category: "bars",
    date: "Dec 19, 2025",
    time: "7:00 PM",
    address: "1936 E 7th St, Los Angeles, CA 90021",
    latitude: 34.0328,
    longitude: -118.2281,
    ticketUrl: "https://www.eversonroyce.com/reservations",
  },
  {
    id: "12",
    title: "Speakeasy Night at The Varnish",
    description: "Experience prohibition-era cocktails in this hidden downtown speakeasy behind Cole's.",
    category: "bars",
    date: "Dec 21, 2025",
    time: "10:00 PM",
    address: "118 E 6th St, Los Angeles, CA 90014",
    latitude: 34.0452,
    longitude: -118.2493,
    ticketUrl: "https://www.213hospitality.com/thevarnish",
  },
  {
    id: "13",
    title: "Taco Tuesday at Guisados",
    description: "Authentic braised meat tacos and house-made tortillas at this popular spot.",
    category: "food",
    date: "Dec 17, 2025",
    time: "5:30 PM",
    address: "2100 E Cesar E Chavez Ave, Los Angeles, CA 90033",
    latitude: 34.0481,
    longitude: -118.2137,
  },
  {
    id: "14",
    title: "Street Art Walking Tour",
    description: "Guided tour of the best murals and street art in the Arts District.",
    category: "arts",
    date: "Dec 23, 2025",
    time: "11:00 AM",
    address: "Arts District, Los Angeles, CA 90013",
    latitude: 34.0389,
    longitude: -118.2342,
    ticketUrl: "https://www.laconservancy.org/tours",
  },
  {
    id: "15",
    title: "Kings vs Sharks Hockey",
    description: "Catch the LA Kings in action at Crypto.com Arena.",
    category: "sports",
    date: "Dec 24, 2025",
    time: "7:30 PM",
    address: "1111 S Figueroa St, Los Angeles, CA 90015",
    latitude: 34.043,
    longitude: -118.2673,
    ticketUrl: "https://www.nhl.com/kings/tickets",
  },
];

function mapTicketmasterCategory(classifications: any[]): Event["category"] {
  if (!classifications || classifications.length === 0) return "entertainment";
  
  const segment = classifications[0]?.segment?.name?.toLowerCase() || "";
  const genre = classifications[0]?.genre?.name?.toLowerCase() || "";
  const subGenre = classifications[0]?.subGenre?.name?.toLowerCase() || "";
  
  if (segment === "sports" || genre.includes("sport")) return "sports";
  if (segment === "arts & theatre" || genre.includes("art") || genre.includes("theatre")) return "arts";
  if (genre.includes("food") || genre.includes("culinary")) return "food";
  if (genre.includes("club") || genre.includes("nightlife") || genre.includes("bar") || 
      subGenre.includes("club") || subGenre.includes("nightlife") || subGenre.includes("bar")) return "bars";
  return "entertainment";
}

function selectBestImage(images: any[]): string | undefined {
  if (!images || images.length === 0) return undefined;
  
  const sorted = [...images].sort((a, b) => {
    const aSize = (a.width || 0) * (a.height || 0);
    const bSize = (b.width || 0) * (b.height || 0);
    return bSize - aSize;
  });
  
  const preferred = sorted.find(img => img.width >= 640 && img.ratio === "16_9");
  if (preferred) return preferred.url;
  
  const large = sorted.find(img => img.width >= 400);
  if (large) return large.url;
  
  return sorted[0]?.url;
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
        imageUrl: selectBestImage(event.images),
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
