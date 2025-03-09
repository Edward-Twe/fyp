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
        const distanceResult = await tx.$queryRaw`
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

        const distanceInMeters = (distanceResult as any)[0].distance;

        if (order.status === "todo" && distanceInMeters <= 20) {
          // Start job when within 20 meters
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
        } else if (order.status === "inprogress" && distanceInMeters > 100) {
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
