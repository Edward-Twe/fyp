"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { EmployeeValues, updateEmployeeSchema } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

export async function editEmployee(
  values: EmployeeValues,
): Promise<{ error: string }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { id, name, email, area } = updateEmployeeSchema.parse(values);

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
      },
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

export async function findEmployee(id: string) {
  const employee = await prisma.employees.findUnique({
    where: { id },
  });

  if (!employee) {
    return null;
  }

  return employee;
}
