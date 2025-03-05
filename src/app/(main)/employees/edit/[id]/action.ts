"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { UpdateEmployeeValues, updateEmployeeSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return user;
}

export async function editEmployee(
  values: UpdateEmployeeValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { id, name, email, area, space, areaLat, areaLong, role } = updateEmployeeSchema.parse(values);

    // Check if the employee exists
    const employee = await findEmployee(id);

    if (!employee) {
      throw Error("Employee doesn't exist");
    }

    await prisma.$transaction(async (tx) => {
      // If email is removed, delete the organization role
      if (!email && employee.userId) {
        await tx.organizationRole.delete({
          where: {
            userId_orgId: {
              userId: employee.userId,
              orgId: employee.orgId
            }
          }
        }).catch(() => {
          // Ignore if record doesn't exist
        });
      }

      // If email exists, upsert the organization role
      if (email) {
        const userId = (await findUserByEmail(email))?.id;
        if (userId) {
          await tx.organizationRole.upsert({
            where: {
              userId_orgId: {
                userId: userId,
                orgId: employee.orgId
              }
            },
            update: {
              role: role || 'user'
            },
            create: {
              userId: userId,
              orgId: employee.orgId,
              role: role || 'user'
            }
          });
        }
      }

      // Update employee details
      await tx.employees.update({
        where: { id },
        data: {
          name,
          email,
          area,
          space, 
          areaLat,
          areaLong,
          userId: email ? (await findUserByEmail(email))?.id : null,
        },
      });
    });

    revalidatePath('/employees');
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}

export async function findEmployee(id: string) {
  const employee = await prisma.employees.findUnique({
    where: { id },
  });

  if (!employee) {
    return null;
  }

  return employee;
}

export async function checkExistingEmployeeInOrg(email: string, orgId: string, employeeId?: string): Promise<boolean> {
  try {
    const user = await findUserByEmail(email);
    if (!user) return false;

    const existingEmployee = await prisma.employees.findFirst({
      where: {
        orgId: orgId,
        email: email,
      }
    });

    // If no existing employee found with this email
    if (!existingEmployee) return false;

    // If editing (employeeId provided), check if email belongs to same employee
    if (employeeId && existingEmployee.id === employeeId) {
      return false; // Allow editing own email
    }

    // Email exists and belongs to different employee
    return true;

  } catch (error) {
    console.error('Error checking existing employee:', error);
    return false;
  }
}
