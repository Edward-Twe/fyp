import { Location } from "@/app/types/routing";

interface DirectionsResponse {
  routes?: [
    {
      waypoint_order: number[];
    },
  ];
}

export async function optimizeRoute(
  locations: Location[],
  depot: Location,
): Promise<Location[]> {
  if (locations.length === 0) return [depot];

  try {
    // Prepare waypoints (excluding depot which will be origin/destination)
    const waypoints = locations
      .map((loc) => `via:${loc.lat},${loc.lng}`)
      .join("|");

    // Call Directions API with optimization enabled
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${depot.lat},${depot.lng}&` + // Start at depot
        `destination=${depot.lat},${depot.lng}&` + // End at depot
        `waypoints=optimize:true|${waypoints}&` + 
        `key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data: DirectionsResponse = await response.json();

    //console.log(data);

    if (!data.routes?.[0]) {
      throw new Error("No route found");
    }

    // Extract the optimized waypoint order from the response
    const optimizedOrder: number[] = data.routes[0].waypoint_order;

    // Construct the optimized route array
    const optimizedRoute: Location[] = [
      depot, // Start at depot
      ...optimizedOrder.map((index: number) => locations[index]), // Add waypoints in optimized order
      depot, // Return to depot
    ];

    return optimizedRoute;
  } catch (error) {
    console.error("Error optimizing route:", error);
    // Fallback to original order if API fails
    return [depot, ...locations, depot];
  }
}
