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

// Helper function to deduplicate events by ID
function deduplicateEvents(events: Event[]): Event[] {
  const seen = new Map<string, Event>();
  
  for (const event of events) {
    if (!seen.has(event.id)) {
      seen.set(event.id, event);
    }
  }
  
  return Array.from(seen.values());
}

// Helper functions for date/time formatting
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

// Expanded mock data
const MOCK_EVENTS: Event[] = [
  {
    id: "mock-1",
    title: "Hollywood Bowl Summer Concert",
    description: "Live music under the stars at the iconic Hollywood Bowl amphitheater.",
    category: "entertainment",
    date: "Dec 15, 2025",
    time: "7:30 PM",
    address: "2301 N Highland Ave, Los Angeles, CA 90068",
    latitude: 34.1122,
    longitude: -118.3391,
    imageUrl: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800",
    ticketUrl: "https://www.hollywoodbowl.com",
  },
  {
    id: "mock-2",
    title: "Grand Central Market Food Tour",
    description: "Explore diverse cuisines from around the world at this historic marketplace.",
    category: "food",
    date: "Dec 12, 2025",
    time: "11:00 AM",
    address: "317 S Broadway, Los Angeles, CA 90013",
    latitude: 34.0509,
    longitude: -118.2489,
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
  },
  {
    id: "mock-3",
    title: "Lakers vs Celtics",
    description: "Watch the Lakers take on the Celtics in this epic NBA rivalry game.",
    category: "sports",
    date: "Dec 20, 2025",
    time: "7:00 PM",
    address: "1111 S Figueroa St, Los Angeles, CA 90015",
    latitude: 34.043,
    longitude: -118.2673,
    imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800",
  },
  {
    id: "mock-4",
    title: "LACMA Art Exhibition",
    description: "Explore contemporary art installations at the Los Angeles County Museum of Art.",
    category: "arts",
    date: "Dec 10, 2025",
    time: "10:00 AM",
    address: "5905 Wilshire Blvd, Los Angeles, CA 90036",
    latitude: 34.0639,
    longitude: -118.3592,
    imageUrl: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800",
  },
  {
    id: "mock-5",
    title: "Rooftop Bar at The Standard",
    description: "Enjoy craft cocktails and stunning city views at this iconic rooftop bar.",
    category: "bars",
    date: "Ongoing",
    time: "8:00 PM",
    address: "550 S Flower St, Los Angeles, CA 90071",
    latitude: 34.0487,
    longitude: -118.2573,
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800",
  },
];

// Ticketmaster API
async function fetchTicketmasterEvents(): Promise<Event[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  
  if (!apiKey) {
    console.log("⚠️  TICKETMASTER_API_KEY not set");
    return [];
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
    
    if (response.status === 403) {
      console.error("❌ Ticketmaster: 403 Forbidden");
      return [];
    }
    
    if (!response.ok) {
      console.error("❌ Ticketmaster error:", response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data._embedded?.events) {
      console.log("ℹ️  No Ticketmaster events found");
      return [];
    }

    console.log(`✅ Ticketmaster: ${data._embedded.events.length} events`);
    
    const events: Event[] = data._embedded.events.map((event: any) => {
      const venue = event._embedded?.venues?.[0];
      const location = venue?.location || {};
      
      return {
        id: `tm-${event.id}`,
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

    return events;
  } catch (error) {
    console.error("❌ Error fetching Ticketmaster:", error);
    return [];
  }
}

function mapTicketmasterCategory(classifications: any[]): Event["category"] {
  if (!classifications || classifications.length === 0) return "entertainment";
  
  const segment = classifications[0]?.segment?.name?.toLowerCase() || "";
  const genre = classifications[0]?.genre?.name?.toLowerCase() || "";
  
  if (segment === "sports" || genre.includes("sport")) return "sports";
  if (segment === "arts & theatre" || genre.includes("art") || genre.includes("theatre")) return "arts";
  
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

// Yelp API
async function fetchYelpEvents(): Promise<Event[]> {
  const apiKey = process.env.YELP_API_KEY;
  
  if (!apiKey) {
    console.log("⚠️  YELP_API_KEY not set");
    return [];
  }

  try {
    // Only search once for each unique category to avoid duplicates
    const searches = [
      { category: "restaurants", eventCategory: "food" as const },
      { category: "bars,nightlife", eventCategory: "bars" as const },
    ];
    
    const allEvents: Event[] = [];

    for (const search of searches) {
      const url = new URL("https://api.yelp.com/v3/businesses/search");
      url.searchParams.set("latitude", "34.0522");
      url.searchParams.set("longitude", "-118.2437");
      url.searchParams.set("radius", "15000"); // 15km
      url.searchParams.set("categories", search.category);
      url.searchParams.set("limit", "15"); // Reduced to avoid too many duplicates
      url.searchParams.set("sort_by", "rating");

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`❌ Yelp error for ${search.category}:`, response.status);
        continue;
      }

      const data = await response.json();

      if (data.businesses) {
        const events = data.businesses.map((business: any) => ({
          id: `yelp-${business.id}`,
          title: business.name,
          description: business.categories?.map((c: any) => c.title).join(", ") || "Great spot in LA",
          category: search.eventCategory,
          date: "Ongoing",
          time: "See hours",
          address: business.location.display_address.join(", "),
          latitude: business.coordinates.latitude,
          longitude: business.coordinates.longitude,
          imageUrl: business.image_url,
          ticketUrl: business.url,
        }));
        
        allEvents.push(...events);
      }
    }

    console.log(`✅ Yelp: ${allEvents.length} businesses`);
    return allEvents;
  } catch (error) {
    console.error("❌ Error fetching Yelp:", error);
    return [];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/events", async (req, res) => {
    try {
      console.log("\n🔄 Fetching events...");
      
      const [ticketmasterEvents, yelpEvents] = await Promise.all([
        fetchTicketmasterEvents(),
        fetchYelpEvents(),
      ]);

      // Combine all events
      const allEvents = [
        ...ticketmasterEvents,
        ...yelpEvents,
      ];

      // IMPORTANT: Deduplicate events by ID
      const uniqueEvents = deduplicateEvents(allEvents);

      // Use real events if available, otherwise use mock data
      const events = uniqueEvents.length > 0 ? uniqueEvents : MOCK_EVENTS;
      
      console.log(`📊 Total events: ${events.length} (after deduplication)`);
      console.log(`   - Ticketmaster: ${ticketmasterEvents.length}`);
      console.log(`   - Yelp: ${yelpEvents.length}`);
      console.log(`   - Unique: ${uniqueEvents.length}\n`);

      res.json({
        events,
        sources: {
          ticketmaster: ticketmasterEvents.length,
          yelp: yelpEvents.length,
          total: events.length,
        }
      });
    } catch (error) {
      console.error("❌ Error in /api/events:", error);
      res.json({
        events: MOCK_EVENTS,
        sources: { mock: MOCK_EVENTS.length }
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
