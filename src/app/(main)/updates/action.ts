"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { Organization } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function CreateMessage(
  message: string,
  org: Organization,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const organization = await prisma.organization.findFirst({
      where: {
        id: {
          equals: org.id,
        },
      },
    });

    if (!organization) return { error: "Please select organization" };

    if (user.id === organization.ownerId) {
      message = "Owner " + message;
    } else {
      message = user.username + " " + message;
    }

    await prisma.updateMessages.create({
      data: {
        message,
        orgId: org.id, 
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
