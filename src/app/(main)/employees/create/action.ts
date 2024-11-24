"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { employeeSchema, EmployeeValues } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from 'next/navigation';

export async function createEmployee(
  values: EmployeeValues,
): Promise<{ error: string }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { name, email, area, orgId } = employeeSchema.parse(values);

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
        orgId: orgId
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
