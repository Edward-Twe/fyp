"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function loadJobOrders(orgId: string | undefined) {
  const { user } = await validateRequest();

  if (!user || !orgId) throw Error("Unauthorized");

  try {
    const jobOrders = await prisma.jobOrders.findMany({
      where: {
        orgId: orgId,
      },
      include: {
        JobOrderTask: {
          include: {
            task: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return jobOrders;
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}

