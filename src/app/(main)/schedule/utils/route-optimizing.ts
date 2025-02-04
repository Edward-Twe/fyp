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

    // Find the furthest location from the depot
    const furthestLocation = locations.reduce((furthest, current) => {
      const furthestDistance = calculateDistance(depot, furthest);
      const currentDistance = calculateDistance(depot, current);
      return currentDistance > furthestDistance ? current : furthest;
    }, locations[0]);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=place_id:${depot.placeId}&` +
        `destination=place_id:${furthestLocation.placeId}&` +
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

// Helper function to calculate distance between two locations
function calculateDistance(loc1: Location, loc2: Location): number {
  // Implement the distance calculation logic here
  return Math.sqrt(
    Math.pow(loc2.lat - loc1.lat, 2) + Math.pow(loc2.lng - loc1.lng, 2)
  );
}
