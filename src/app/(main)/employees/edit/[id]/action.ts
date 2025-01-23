"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { UpdateEmployeeValues, updateEmployeeSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function editEmployee(
  values: UpdateEmployeeValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { id, name, email, area, space } = updateEmployeeSchema.parse(values);

    // Check if the employee exists
    const employee = await findEmployee(id);

    if (!employee) {
      // employee doesn't exists
      throw Error("Employee doesn't exist");
    }

    await prisma.employees.update({
      where: { id },
      data: {
        name: name,
        email: email,
        area: area,
        space: space, 
      },
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
