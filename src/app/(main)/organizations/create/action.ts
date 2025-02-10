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
    const { name, email, location, logoUrl } = organizationSchema.parse(values);

    await prisma.organization.create({
      data: {
        name: name,
        email: email,
        location: location,
        orgPic: logoUrl,
        ownerId: user.id,
      },
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
