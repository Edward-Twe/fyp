"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { jobOrderSchema, JobOrderValues } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from 'next/navigation';

export async function createJobOrder(
  values: JobOrderValues,
): Promise<{ error: string }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { orderNumber, address, city, postCode, state, country, orgId, latitude, longitude, tasks, spaceRequried } = jobOrderSchema.parse(values);

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
      //make sure to return this value as well
      include: {
        JobOrderTask: true
      }
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
