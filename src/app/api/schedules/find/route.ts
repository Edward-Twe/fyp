import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("scheduleId");
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return new NextResponse("Employee ID is required", { status: 400 });
    }

    if (!scheduleId) {
      return new NextResponse("Schedule ID is required", { status: 400 });
    }

    const schedule = await prisma.schedules.findUnique({
      where: {
        id: scheduleId,
      },
      include: {
        jobOrder: {
          where: {
            AND: [
              {
                scheduledEmp: {
                  id: employeeId,
                },
                schedulesId: scheduleId,
              },
            ],
          },
          include: {
            JobOrderTask: {
              include: {
                task: true,
              },
            },
          },
        },
        EmployeeSchedules: {
          where: {
            AND: [
              {
                employeeId: employeeId,
                scheduleId: scheduleId,
              },
            ],
          },
        },
      },
    });

    if (!schedule) {
      return new NextResponse("Schedule not found", { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("[SCHEDULE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
