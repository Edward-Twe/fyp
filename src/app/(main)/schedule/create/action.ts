"use server";

import { Columns } from "@/app/types/routing";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { scheduleSchema, ScheduleValues } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function createSchedule(
  values: ScheduleValues,
  columns: Columns,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const {
      name,
      departAddress,
      departCity,
      departPostCode,
      departState,
      departCountry,
      departLatitude,
      departLongitude,
      departTime,
      orgId,
    } = scheduleSchema.parse(values);

    const organization = await prisma.organization.findFirst({
      where: {
        id: {
          equals: orgId,
        },
      },
    });

    if (!organization) return { error: "Please select organization" };

    await prisma.$transaction(async (tx) => {
      const schedule = await tx.schedules.create({
        data: {
          name,
          departAddress,
          departCity,
          departPostCode,
          departState,
          departCountry,
          departLatitude,
          departLongitude,
          orgId,
          departTime,
        },
      });

      // Update job orders for each employee column
      for (const [columnId, column] of Object.entries(columns)) {
        // Skip the 'jobOrders' column as it contains unassigned jobs
        if (columnId === "jobOrders") continue;

        // Loop through jobOrders to assign scheduledOrder based on the order in the array
        for (let i = 0; i < column.jobOrders.length; i++) {
          const job = column.jobOrders[i];

          // Update the job order with the scheduledOrder
          await tx.jobOrders.update({
            where: { id: job.id },
            data: {
              schedulesId: schedule.id,
              employeeId: columnId, // columnId is the employeeId
              status: "todo",
              scheduledOrder: i + 1, // Assign order starting from 1
            },
          });
        }
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
