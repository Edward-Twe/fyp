"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function loadEmployees(orgId: string | undefined) {
  const { user } = await validateRequest();

  if (!user || !orgId) throw Error("Unauthorized");

  try {
    const employees = await prisma.employees.findMany({
      where: {
        orgId: orgId,
      },
    });

    if (employees.length === 0) {
      return [];
    }

    return employees;
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
