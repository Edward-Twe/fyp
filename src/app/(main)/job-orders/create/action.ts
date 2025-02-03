"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { jobOrderSchema, JobOrderValues } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function createJobOrder(
  values: JobOrderValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { orderNumber, address, city, postCode, state, country, orgId, latitude, longitude, placeId, tasks, spaceRequried } = jobOrderSchema.parse(values);

    const organization = await prisma.organization.findFirst({
        where: {
            id: {
                equals: orgId
            }
        }
    })

    if (!organization) return {error: "Please select organization"}

    await prisma.jobOrders.create({
      data: {
        orderNumber,
        address, 
        city, 
        postCode, 
        state, 
        country, 
        latitude, 
        longitude, 
        placeId, 
        orgId,
        spaceRequried, 
        JobOrderTask: {
          create: tasks.map(task => ({
            quantity: task.quantity,
            task: {
              connect: { id: task.taskId }
            }
          }))
        }
      },
      include: {
        JobOrderTask: true
      }
    });

    revalidatePath("/job-orders");
    return {success: true};
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
