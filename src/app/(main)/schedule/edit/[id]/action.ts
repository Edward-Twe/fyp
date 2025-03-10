"use server";

import { Columns } from "@/app/types/routing";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { updateScheduleSchema, UpdateScheduleValues } from "@/lib/validation";
import { Roles, Status } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function editSchedule(
  values: UpdateScheduleValues,
  columns: Columns,
): Promise<{ error?: string; success?: boolean }> {

  const { user } = await validateRequest();

  if (!user) return { error: "Unauthorized" };

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
      departPlaceId,
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
          departPlaceId,
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

      // Delete existing EmployeeSchedules for this schedule
      await tx.employeeSchedules.deleteMany({
        where: {
          scheduleId: id,
        },
      });

      // Update job orders for each employee column
      for (const [columnId, column] of Object.entries(columns)) {
        // Skip the 'jobOrders' column as it contains unassigned jobs
        if (columnId === "jobOrders") continue;

        // Calculate total distance, time, and space for the employee
        const totalDistance = column.totalDistance ?? 0; 
        const totalTime = column.totalTime ?? 0; 
        const totalSpace = column.totalSpace ?? 0; 
        const totalOrders = column.totalOrders ?? 0; 

        // Create new EmployeeSchedules entry
        await tx.employeeSchedules.create({
          data: {
            employeeId: columnId,
            scheduleId: id,
            totalDistance,
            totalTime,
            totalOrders,
            totalSpace,
          },
        });

        // Update job orders for each employee column
        for (const job of column.jobOrders) {

          // Update the job order with the scheduledOrder
          await tx.jobOrders.update({
            where: { id: job.id },
            data: {
              schedulesId: id,
              employeeId: columnId,
              status: job.status === 'unscheduled' ? 'todo' : job.status,
              updatedBy: "admin",
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

export async function updateJobOrderStatus(
  jobOrderId: string,
  jobOrderNumber: string,
  newStatus: Status, 
  orgId: string, 
  employeeId: string,
  role: Roles,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) {
    return { error: "Unauthorized" };
  }



  try {
    return await prisma.$transaction(async (tx) => {
      const employee = await tx.employees.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        return { error: "Employee not found" };
      }

      

      if (role === Roles.admin || role === Roles.owner) {
        await tx.jobOrders.update({
          where: { id: jobOrderId },
          data: { status: newStatus, updatedBy: "admin" },
        });

        await tx.updateMessages.create({
          data: {
            message: `Job order ${jobOrderNumber} updated by admin.`,
            orgId: orgId,
          },
        });
      } else {
        await tx.jobOrders.update({
          where: { id: jobOrderId },
          data: { status: newStatus, updatedBy: "employee" },
        });
        
        await tx.updateMessages.create({
          data: {
            message: `Job order ${jobOrderNumber} updated by employee: ${employee.name}.`,
            orgId: orgId,
          },
        });
      }

      return { success: true };
    });
  } catch (error) {
    console.error(error);
    return {
      error: "Failed to update job order status. Please try again.",
    };
  }
}
