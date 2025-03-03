"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function loadUpdates(orgId: string | undefined) {
  const { user } = await validateRequest();

  if (!user || !orgId) throw Error("Unauthorized");

  try {
    const updates = await prisma.updateMessages.findMany({
      where: {
        orgId: orgId,
      },
    });

    if (updates.length === 0) {
      return [];
    }

    return updates;
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
