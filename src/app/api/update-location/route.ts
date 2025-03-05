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

    // First find the employee
    const employee = await prisma.employees.findFirst({
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

    // Then update using the id
    await prisma.employees.update({
      where: { id: employee.id },
      data: {
        lastLat: latitude,
        lastLong: longitude
      }
    });

    // Get job orders for this schedule
    const jobOrders = await prisma.jobOrders.findMany({
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

      // If within range (300 meters) and not already in progress, update status
      if (distanceInMeters <= 300 && order.status !== 'inprogress') {
        await prisma.jobOrders.update({
          where: { id: order.id },
          data: { status: 'inprogress' }
        });
      }
    }

    return NextResponse.json({
      message: "Location updated successfully",
      employeeId: employee.id
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
