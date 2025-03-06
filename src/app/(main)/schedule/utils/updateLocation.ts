"use server";
import prisma from "@/lib/prisma";

export async function updateLocation(
  latitude: number,
  longitude: number,
  orgId: string,
  employeeId: string,
  scheduleId: string,
) {
  try {
    await prisma.employees.update({
      where: { id: employeeId },
      data: {
        lastLat: latitude,
        lastLong: longitude,
      },
    });

    console.log("Location updated successfully");

    const jobOrders = await prisma.jobOrders.findMany({
      where: {
        schedulesId: scheduleId,
        employeeId: employeeId,
        NOT: {
          status: "completed",
        },
      },
    });

    // Process each job order
    for (const order of jobOrders) {
      // Calculate distance using Prisma's raw query
      const distanceResult = await prisma.$queryRaw`
          SELECT 
            (6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians(${latitude})) * 
              sin(radians(latitude))
            ) * 1000) as distance
          FROM "job_orders"
          WHERE id = ${order.id}
        `;

      const distanceInMeters = (distanceResult as any)[0].distance;

      // If within range (50 meters) and not already in progress, update status
      if (distanceInMeters <= 50 && order.status !== "inprogress") {
        await prisma.jobOrders.update({
          where: { id: order.id },
          data: { status: "inprogress" },
        });
      }
    }

    return { success: "Location updated successfully" };
  } catch (error) {
    console.error(error);
    return { error: "Unauthorized" };
  }
}
