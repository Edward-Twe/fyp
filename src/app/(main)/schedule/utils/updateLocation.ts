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
    return await prisma.$transaction(async (tx) => {
      const employee = await tx.employees.findUnique({
        where: {
          id: employeeId
        }
      });

      if (!employee) {
        return { error: "Employee not found" };
      }

      const lastUpdated = employee.lastUpdatedAt;
      const lastLat = employee.currentLat;
      const lastLong = employee.currentLong;

      await tx.employees.update({
        where: { id: employeeId },
        data: {
          currentLat: latitude,
          currentLong: longitude,
          lastUpdatedAt: new Date()
        },
      });

      // Find todo and in-progress job orders
      const jobOrders = await tx.jobOrders.findMany({
        where: {
          schedulesId: scheduleId,
          employeeId: employeeId,
          status: {
            in: ["inprogress", "todo"]
          },
        },
      });

      // Process each job order
      for (const order of jobOrders) {
        const currentDistanceResult = await tx.$queryRaw`
          SELECT 
            (6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${longitude})) + 
              sin(radians(${latitude})) * 
              sin(radians(latitude))
            ) * 1000) as distance
          FROM "job_orders"
          WHERE id = ${order.id}
        `;

        const currentDistanceInMeters = (currentDistanceResult as any)[0].distance;

        // Calculate distance from last known location to the job order
        const lastDistanceResult = await tx.$queryRaw`
          SELECT 
            (6371 * acos(
              cos(radians(${lastLat})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${lastLong})) + 
              sin(radians(${lastLat})) * 
              sin(radians(latitude))
            ) * 1000) as distance
          FROM "job_orders"
          WHERE id = ${order.id}
        `;

        const lastDistanceInMeters = (lastDistanceResult as any)[0].distance;

        if (order.status === "todo" && lastDistanceInMeters <= 20 && currentDistanceInMeters <= 20 && lastUpdated && lastLat && lastLong) {
          // Start job when within 20 meters
          const now = new Date();
          const timeDiffInSeconds = Math.floor((now.getTime() - new Date(lastUpdated).getTime()) / 1000);

          //only if user stayed near the location for 5 mins
          if (timeDiffInSeconds >= 295) {
            await tx.jobOrders.update({
              where: { id: order.id },
              data: { status: "inprogress", updatedBy: "system" },
            });
  
            await tx.updateMessages.create({
              data: {
                message: `Job order ${order.orderNumber} in progress by system`,
                orgId: orgId,
              }
            });
          }
          
        } else if (order.status === "inprogress" && currentDistanceInMeters > 100) {
          // Complete job when employee moves more than 100 meters away
          await tx.jobOrders.update({
            where: { id: order.id },
            data: { status: "completed", updatedBy: "system" },
          });

          await tx.updateMessages.create({
            data: {
              message: `Job order ${order.orderNumber} completed by system`,
              orgId: orgId,
            }
          });
        }
      }

      return { success: "Location updated successfully" };
    });
  } catch (error) {
    console.error(error);
    return { error: "Unauthorized" };
  }
}
