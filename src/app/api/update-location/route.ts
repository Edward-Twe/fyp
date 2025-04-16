import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

      const now = new Date();
      const lastUpdated = employee.lastUpdatedAt;
      const shouldPerformFullUpdate = !lastUpdated || 
        (now.getTime() - new Date(lastUpdated).getTime() >= 5 * 60 * 1000); // 5 minutes in milliseconds
      
      // Always update current location
      await tx.employees.update({
        where: { id: employee.id },
        data: {
          currentLat: latitude,
          currentLong: longitude,
        }
      });
      
      // Only proceed with job status updates and lastLat/lastLong updates if 5 minutes have passed
      if (shouldPerformFullUpdate) {
        // Update last known location and timestamp
        await tx.employees.update({
          where: { id: employee.id },
          data: {
            lastLat: latitude,
            lastLong: longitude,
            lastUpdatedAt: now
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

          if (order.status === "todo" && currentDistanceInMeters <= 20) {
            // Start job when within 20 meters for 5 minutes
            // Since we're only running this check every 5 minutes, we can immediately update the status
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
          message: "Location fully updated and job statuses processed",
          employeeId: employee.id,
          fullUpdate: true
        });
      }

      return NextResponse.json({
        message: "Current location updated successfully",
        employeeId: employee.id,
        fullUpdate: false
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
