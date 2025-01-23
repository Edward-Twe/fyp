"use server";

import { Columns } from "@/app/types/routing";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { updateScheduleSchema, UpdateScheduleValues } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function editSchedule(
  values: UpdateScheduleValues,
  columns: Columns,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const {
      id,
      name,
      departAddress,
      departCity,
      departPostCode,
      departState,
      departCountry,
      departLatitude,
      departLongitude,
      departTime,
    } = updateScheduleSchema.parse(values);

    // Check if schedule exists
    const existingSchedule = await prisma.schedules.findUnique({
      where: { id },
      include: {
        jobOrder: true,
      },
    });

    if (!existingSchedule) {
      return { error: "Schedule not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Update schedule details
      await tx.schedules.update({
        where: { id },
        data: {
          name,
          departAddress,
          departCity,
          departPostCode,
          departState,
          departCountry,
          departLatitude,
          departLongitude,
          departTime,
        },
      });

      // Reset all existing job orders for this schedule
      await tx.jobOrders.updateMany({
        where: {
          schedulesId: id,
        },
        data: {
          schedulesId: null,
          employeeId: null,
          status: "unscheduled",
          scheduledOrder: null,
        },
      });

      // Update job orders for each employee column
      for (const [columnId, column] of Object.entries(columns)) {
        // Skip the 'jobOrders' column as it contains unassigned jobs
        if (columnId === "jobOrders") continue;

        // Update all job orders in this column
        await tx.jobOrders.updateMany({
          where: {
            id: {
              in: column.jobOrders.map((job) => job.id),
            },
          },
          data: {
            schedulesId: id,
            employeeId: columnId, // columnId is the employeeId
            status: "todo",
          },
        });
      }
    });

    revalidatePath("/schedule");
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}

export async function findSchedule(id: string) {
  const schedule = await prisma.schedules.findUnique({
    where: { id },
    include: {
      jobOrder: {
        include: {
          scheduledEmp: true,
          JobOrderTask: {
            include: {
              task: true,
            },
          },
        },
      },
    },
  });

  if (!schedule) {
    return null;
  }

  return schedule;
}

export async function getEmployees(id: string) {
  const fetchedData = await prisma.jobOrders.findMany({
    where: {
      schedulesId: id,
    },
    select: {
      scheduledEmp: true,
    },
    distinct: ["employeeId"], // Ensure uniqueness
  });

  const employees = fetchedData
    .map((jobOrder) => jobOrder.scheduledEmp)
    .filter((emp) => emp !== null);

  return employees;
}
