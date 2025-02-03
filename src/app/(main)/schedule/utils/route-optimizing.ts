import { Location } from "@/app/types/routing";

interface DirectionsResponse {
  routes?: [
    {
      waypoint_order: number[];
    },
  ];
  status?: string;
  geocoded_waypoints?: {
    geocoder_status: string;
    place_id: string;
    types: string[];
  }[];
}

export async function optimizeRoute(
  locations: Location[],
  depot: Location,
): Promise<{ locations: Location[], error?: string }> {
  if (locations.length === 0) return { locations };

  try {
    // Prepare waypoints using Place IDs
    const waypoints = locations
      .map((loc) => `place_id:${loc.placeId}`)
      .join("|");

    // console.log("Number of locations:", locations.length);
    // console.log("Waypoints:", waypoints);
    // console.log("depot: " + depot.placeId);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=place_id:${depot.placeId}&` +
        `destination=place_id:${depot.placeId}&` +
        `waypoints=optimize:true|${waypoints}&` +
        `key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data: DirectionsResponse = await response.json();

    if (data.geocoded_waypoints) {
      console.log("Waypoint statuses:", data.geocoded_waypoints.map(wp => wp.geocoder_status));
    }

    if (data.status === 'NOT_FOUND') {
      return { 
        locations,
        error: "One or more locations could not be found" 
      };
    }

    if (!data.routes?.[0]) {
      return { 
        locations,
        error: "No route found from the API" 
      };
    }

    const optimizedOrder: number[] = data.routes[0].waypoint_order;
    // console.log("Optimized Order:", optimizedOrder);
    // console.log("Original Locations:", locations);
    if (!optimizedOrder || optimizedOrder.length === 0) {
      return {
        locations,
        error: "Failed to optimize route order"
      };
    }

    const optimizedRoute: Location[] = optimizedOrder.map(
      (index: number) => locations[index]
    );
    
    return { locations: optimizedRoute };
  } catch (error) {
    console.error("Error optimizing route:", error);
    return { 
      locations,
      error: "Failed to optimize route" 
    };
  }
}
