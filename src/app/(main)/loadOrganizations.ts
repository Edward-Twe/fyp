"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function loadOrganizations() {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const organizations = await prisma.organization.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          {
            Employees: {
              some: {
                userId: user.id
              }
            }
          }
        ]
      },
    });

    if (organizations.length === 0) {
      return [];
    }

    return organizations;
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
