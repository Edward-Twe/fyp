"use server";
import { JobOrderWithTasks, Location } from "@/app/types/routing";
import { DepartureInfo } from "@/components/DepartureDialog";

interface DirectionsResponse {
  routes?: [
    {
      legs: [
        {
          distance: {
            value: number;
            text: string;
          };
          duration: {
            value: number;
            text: string;
          };
        },
      ];
    },
  ];
  status?: string;
}

export async function calculateRoute(
  locations: Location[],
  depot: Location,
): Promise<{ totalDistance: number; totalTime: number; error?: string }> {
  if (locations.length === 0) return { totalDistance: 0, totalTime: 0 };

  try {
    // Prepare waypoints using Place IDs
    const waypoints = locations
      .map((loc) => `place_id:${loc.placeId}`)
      .join("|");

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=place_id:${depot.placeId}&` +
        `destination=place_id:${locations[locations.length - 1].placeId}&` + // Last location as destination
        `waypoints=${waypoints}&` +
        `key=${process.env.GOOGLE_MAPS_API_KEY}`,
    );

    const data: DirectionsResponse = await response.json();

    if (data.status === "NOT_FOUND") {
      return {
        totalDistance: 0,
        totalTime: 0,
        error: "One or more locations could not be found",
      };
    }

    if (!data.routes?.[0]) {
      return {
        totalDistance: 0,
        totalTime: 0,
        error: "No route found from the API",
      };
    }

    const legs = data.routes[0].legs;
    const totalDistance = legs.reduce(
      (total, leg) => total + leg.distance.value,
      0,
    ); // Total distance in meters
    const totalTime = legs.reduce(
      (total, leg) => total + leg.duration.value,
      0,
    ); // Total time in seconds

    return {
      totalDistance: totalDistance / 1000, // Convert to kilometers
      totalTime: Math.round(totalTime / 60), // Convert to minutes
    };
  } catch (error) {
    console.error("Error calculating route:", error);
    return {
      totalDistance: 0,
      totalTime: 0,
      error: "Failed to calculate route",
    };
  }
}

export async function calculateTotalDistanceAndTime(
  jobOrders: JobOrderWithTasks[],
  departure: DepartureInfo,
): Promise<{ totalDistance: number; totalTime: number }> {
  if (jobOrders.length === 0) {
    return { totalDistance: 0, totalTime: 0 };
  }

  // Extract locations for the job orders
  const locations: Location[] = jobOrders.map((jobOrder) => ({
    lat: Number(jobOrder.latitude),
    lng: Number(jobOrder.longitude),
    placeId: jobOrder.placeId,
  }));

  const depot: Location = {
    lat: departure!.location.latitude,
    lng: departure!.location.longitude,
    placeId: departure!.location.placeId,
  };

  // Call the calculateRoute function to get total distance and time
  const { totalDistance, totalTime, error } = await calculateRoute(
    locations,
    depot,
  );

  if (error) {
    console.error("Error calculating total distance and time:", error);
    return { totalDistance: 0, totalTime: 0 }; // Handle error as needed
  }

  return { totalDistance, totalTime };
}

// Function to calculate total space needed for job orders
export async function calculateTotalSpace(
  jobOrders: JobOrderWithTasks[],
): Promise<number> {
  let totalSpace = 0;
  for (const jobOrder of jobOrders) {
    totalSpace += Number(jobOrder.spaceRequried);
    console.log(totalSpace);
  }
  return totalSpace;
}
