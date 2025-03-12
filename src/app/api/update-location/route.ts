import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

//TODO
export async function POST(request: NextRequest) {
  try {
    const { userId, latitude, longitude, orgId, scheduleId } = await request.json();

    // Validate required data
    if (!userId || !latitude || !longitude || !orgId || !scheduleId) {
      return NextResponse.json(
        { message: "Missing required data" },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      // First find the employee
      const employee = await tx.employees.findFirst({
        where: {
          AND: {
            userId: userId,
            orgId: orgId
          }
        }
      });

      if (!employee) {
        return NextResponse.json(
          { message: "Employee not found" },
          { status: 404 }
        );
      }

      const lastUpdated = employee.lastUpdatedAt;
      const lastLat = employee.currentLat;
      const lastLong = employee.currentLong;

      // Update employee location
      await tx.employees.update({
        where: { id: employee.id },
        data: {
          currentLat: latitude,
          currentLong: longitude,
          lastUpdatedAt: new Date()
        }
      });

      // Get job orders for this schedule
      const jobOrders = await tx.jobOrders.findMany({
        where: {
          schedulesId: scheduleId,
          employeeId: employee.id,
          NOT: {
            status: 'completed'
          }
        }
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

      return NextResponse.json({
        message: "Location updated successfully",
        employeeId: employee.id
      });
    });

  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { message: "Error updating location data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const locations = await prisma.employees.findMany({
      select: {
        id: true,
        name: true,
        lastLat: true,
        lastLong: true,
      },
      where: {
        lastLat: { not: null },
        lastLong: { not: null }
      }
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error retrieving locations:", error);
    return NextResponse.json(
      { message: "Error retrieving location data" },
      { status: 500 }
    );
  }
}
