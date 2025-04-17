"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { organizationSchema, OrganizationValues } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function createOrganization(
  values: OrganizationValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { name, email, location } = organizationSchema.parse(values);

    await prisma.$transaction(async (tx) => {
      // Create the organization
      const organization = await tx.organization.create({
        data: {
          name: name,
          email: email,
          location: location,
          ownerId: user.id,
        },
      });

      // Create owner role for the organization
      await tx.organizationRole.create({
        data: {
          userId: user.id,
          orgId: organization.id,
          role: "owner",
        },
      });
    });
    
    revalidatePath("/");  
    return { success: true };

  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
