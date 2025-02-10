"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import {
  UpdateOrganizationValues,
  updateOrganizationSchema,
} from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function editOrganization(
  values: UpdateOrganizationValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { id, name, email, location, logoUrl } =
      updateOrganizationSchema.parse(values);

    // Check if the organization exists
    const organization = await findOrganization(id);

    if (!organization) {
      throw Error("Organization doesn't exist");
    }

    await prisma.organization.update({
      where: { id },
      data: {
        name,
        email,
        location,
        orgPic: logoUrl,
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

export async function findOrganization(id: string) {
  const organization = await prisma.organization.findUnique({
    where: { id },
  });

  if (!organization) {
    return null;
  }

  return organization;
}
