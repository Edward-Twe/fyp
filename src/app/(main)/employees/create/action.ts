"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { employeeSchema, EmployeeValues } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function createEmployee(
  values: EmployeeValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { name, email, area, orgId, space, areaLat, areaLong } = employeeSchema.parse(values);

    const organization = await prisma.organization.findFirst({
        where: {
            id: {
                equals: orgId
            }
        }
    })

    if (!organization) return {error: "Please select organization"}

    await prisma.employees.create({
      data: {
        name: name,
        email: email,
        area: area, 
        orgId: orgId, 
        space: space, 
        areaLat: areaLat, 
        areaLong: areaLong
      },
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
