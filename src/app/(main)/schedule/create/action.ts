"use server";

import { Columns } from "@/app/types/routing";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { scheduleSchema, ScheduleValues } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

export async function createSchedule(
  values: ScheduleValues,
  columns: Columns,
): Promise<{ error: string }> {
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
      orgId
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
        // First create the schedule
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
          if (columnId === 'jobOrders') continue;
  
          // Update all job orders in this column
          await tx.jobOrders.updateMany({
            where: {
              id: {
                in: column.jobOrders.map(job => job.id)
              }
            },
            data: {
              schedulesId: schedule.id,
              employeeId: columnId, // columnId is the employeeId
              status: 'todo'
            }
          });
        }
      });

    return redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
