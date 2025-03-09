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

        if (distanceInMeters <= 20 && order.status !== 'inprogress') {
          await tx.jobOrders.update({
            where: { id: order.id },
            data: { status: 'inprogress', updatedBy: 'system' }
          });

          await tx.updateMessages.create({
            data: {
              message: `Job order ${order.id} in progress by system (updated by system)`,
              orgId: orgId,
            }
          })
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
