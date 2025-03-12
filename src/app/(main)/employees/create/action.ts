"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { employeeSchema, EmployeeValues } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { findUserByEmail } from "../edit/[id]/action";

export async function createEmployee(
  values: EmployeeValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { name, email, area, orgId, space, areaLat, areaLong, role } = employeeSchema.parse(values);

    const organization = await prisma.organization.findFirst({
        where: {
            id: {
                equals: orgId
            }
        }
    })

    if (!organization) return {error: "Please select organization"}

    await prisma.$transaction(async (tx) => {

      // If email exists, upsert the organization role
      if (email) {
        const userId = (await findUserByEmail(email))?.id;
        if (userId) {
          const existingRole = await tx.organizationRole.findFirst({
            where: {
              AND: {
                userId: userId,
                orgId: orgId
              }
            }
          })

          

          await tx.organizationRole.upsert({
            where: {
              userId_orgId: {
                userId: userId,
                orgId: orgId
              }
            },
            update: {
              role: role || 'user'
            },
            create: {
              userId: userId,
              orgId: orgId,
              role: role || 'user'
            }
          });
        }
      }

      // Update employee details
      await tx.employees.create({
        data: {
          name,
          email,
          area,
          space, 
          orgId, 
          areaLat,
          areaLong,
          userId: email ? (await findUserByEmail(email))?.id : null,
        },
      });
    });

    revalidatePath("/employees")
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
