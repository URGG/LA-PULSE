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

// ============================================
// TICKETMASTER API (Entertainment, Sports, Arts)
// ============================================
async function fetchTicketmasterEvents(): Promise<Event[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  
  if (!apiKey) {
    console.log("TICKETMASTER_API_KEY not set");
    return [];
  }

  try {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("latlong", "34.0522,-118.2437"); // LA coordinates
    url.searchParams.set("radius", "50");
    url.searchParams.set("unit", "miles");
    url.searchParams.set("size", "100");
    url.searchParams.set("sort", "date,asc");
    
    const now = new Date();
    url.searchParams.set("startDateTime", now.toISOString().split('.')[0] + "Z");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error("Ticketmaster API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data._embedded?.events) {
      return [];
    }

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
    console.error("Error fetching Ticketmaster events:", error);
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

// ============================================
// YELP API (Food & Bars)
// ============================================
async function fetchYelpEvents(): Promise<Event[]> {
  const apiKey = process.env.YELP_API_KEY;
  
  if (!apiKey) {
    console.log("YELP_API_KEY not set");
    return [];
  }

  try {
    // Search for restaurants and bars with events/special offerings
    const categories = ["restaurants", "bars", "nightlife", "foodtrucks"];
    const allEvents: Event[] = [];

    for (const category of categories) {
      const url = new URL("https://api.yelp.com/v3/businesses/search");
      url.searchParams.set("latitude", "34.0522");
      url.searchParams.set("longitude", "-118.2437");
      url.searchParams.set("radius", "25000"); // 25km
      url.searchParams.set("categories", category);
      url.searchParams.set("limit", "25");
      url.searchParams.set("sort_by", "rating");
      url.searchParams.set("open_now", "false");

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Yelp API error for ${category}:`, response.status);
        continue;
      }

      const data = await response.json();

      if (data.businesses) {
        const events = data.businesses.map((business: any) => ({
          id: `yelp-${business.id}`,
          title: business.name,
          description: business.categories?.map((c: any) => c.title).join(", ") || "Great spot in LA",
          category: (category === "bars" || category === "nightlife") ? "bars" : "food",
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

    return allEvents;
  } catch (error) {
    console.error("Error fetching Yelp events:", error);
    return [];
  }
}

// ============================================
// EVENTBRITE API (Optional - Community Events)
// ============================================
async function fetchEventbriteEvents(): Promise<Event[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  
  if (!apiKey) {
    console.log("EVENTBRITE_API_KEY not set");
    return [];
  }

  try {
    const url = new URL("https://www.eventbriteapi.com/v3/events/search/");
    url.searchParams.set("location.latitude", "34.0522");
    url.searchParams.set("location.longitude", "-118.2437");
    url.searchParams.set("location.within", "50mi");
    url.searchParams.set("expand", "venue");
    url.searchParams.set("sort_by", "date");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error("Eventbrite API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.events) {
      return [];
    }

    const events: Event[] = data.events.map((event: any) => {
      const venue = event.venue;
      
      return {
        id: `eb-${event.id}`,
        title: event.name.text,
        description: event.description?.text || event.summary || "Community event",
        category: categorizeEventbriteEvent(event),
        date: event.start.local ? formatDate(event.start.local) : "TBA",
        time: event.start.local ? formatTime(event.start.local.split("T")[1]) : "TBA",
        address: venue ? venue.address.localized_address_display : "Location TBA",
        latitude: venue?.latitude ? parseFloat(venue.latitude) : 34.0522,
        longitude: venue?.longitude ? parseFloat(venue.longitude) : -118.2437,
        imageUrl: event.logo?.url,
        ticketUrl: event.url,
      };
    });

    return events;
  } catch (error) {
    console.error("Error fetching Eventbrite events:", error);
    return [];
  }
}

function categorizeEventbriteEvent(event: any): Event["category"] {
  const category = event.category?.name?.toLowerCase() || "";
  const subcategory = event.subcategory?.name?.toLowerCase() || "";
  
  if (category.includes("music") || category.includes("entertainment")) return "entertainment";
  if (category.includes("food") || category.includes("drink")) return "food";
  if (category.includes("sports") || category.includes("fitness")) return "sports";
  if (category.includes("arts") || category.includes("culture")) return "arts";
  if (subcategory.includes("nightlife") || subcategory.includes("bar")) return "bars";
  
  return "entertainment";
}

// ============================================
// MOCK DATA (Fallback)
// ============================================
const MOCK_EVENTS: Event[] = [
  {
    id: "mock-1",
    title: "Hollywood Bowl Concert",
    description: "Live music under the stars",
    category: "entertainment",
    date: "Dec 15, 2025",
    time: "7:30 PM",
    address: "2301 N Highland Ave, Los Angeles, CA",
    latitude: 34.1122,
    longitude: -118.3391,
  },
  {
    id: "mock-2",
    title: "Grand Central Market",
    description: "Diverse food marketplace",
    category: "food",
    date: "Ongoing",
    time: "11:00 AM",
    address: "317 S Broadway, Los Angeles, CA",
    latitude: 34.0509,
    longitude: -118.2489,
  },
];

// ============================================
// MAIN API ENDPOINT
// ============================================
export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/events", async (req, res) => {
    try {
      console.log("Fetching events from all sources...");
      
      // Fetch from all sources in parallel
      const [ticketmasterEvents, yelpEvents, eventbriteEvents] = await Promise.all([
        fetchTicketmasterEvents(),
        fetchYelpEvents(),
        fetchEventbriteEvents(),
      ]);

      // Combine all events
      const allEvents = [
        ...ticketmasterEvents,
        ...yelpEvents,
        ...eventbriteEvents,
      ];

      // Use mock data if no events found
      const finalEvents = allEvents.length > 0 ? allEvents : MOCK_EVENTS;

      // Sort by date
      const sortedEvents = finalEvents.sort((a, b) => {
        if (a.date === "Ongoing") return 1;
        if (b.date === "Ongoing") return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      console.log(`Total events: ${sortedEvents.length}`);
      console.log(`- Ticketmaster: ${ticketmasterEvents.length}`);
      console.log(`- Yelp: ${yelpEvents.length}`);
      console.log(`- Eventbrite: ${eventbriteEvents.length}`);

      res.json({
        events: sortedEvents,
        sources: {
          ticketmaster: ticketmasterEvents.length,
          yelp: yelpEvents.length,
          eventbrite: eventbriteEvents.length,
          total: sortedEvents.length,
        }
      });
    } catch (error) {
      console.error("Error in /api/events:", error);
      res.json({ events: MOCK_EVENTS, sources: { mock: MOCK_EVENTS.length } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
