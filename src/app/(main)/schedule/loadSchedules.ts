"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function loadSchedules(orgId: string | undefined) {
  const { user } = await validateRequest();

  if (!user || !orgId) throw Error("Unauthorized");

  try {
    const schedules = await prisma.schedules.findMany({
      where: {
        orgId: orgId,
      },
    });

    if (schedules.length === 0) {
      return [];
    }

    return schedules;
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
