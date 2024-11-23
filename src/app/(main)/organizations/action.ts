"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { organizationSchema, OrganizationValues } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from 'next/navigation';

export async function createOrganization(
  values: OrganizationValues,
): Promise<{ error: string }> {
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

    return redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
