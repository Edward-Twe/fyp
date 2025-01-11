'use server'

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { updateJobOrderSchema, UpdateJobOrderValues } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache'

export async function editJobOrder(
  values: UpdateJobOrderValues
): Promise<{ error: string } | void> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { 
      id, 
      orderNumber, 
      address, 
      city, 
      postCode, 
      state, 
      country, 
      latitude, 
      longitude, 
      tasks, 
      spaceRequried 
    } = updateJobOrderSchema.parse(values);

    // Check if the job order exists
    const jobOrder = await findJobOrder(id);

    if (!jobOrder) {
      throw Error("Job order doesn't exist");
    }

    await prisma.jobOrders.update({
      where: { id },
      data: {
        orderNumber,
        address,
        city,
        postCode,
        state,
        country,
        latitude,
        longitude,
        spaceRequried,
        JobOrderTask: {
          deleteMany: {},
          create: tasks.map(task => ({
            taskId: task.taskId,
            quantity: task.quantity
          }))
        }
      },
    });

    revalidatePath('/job-orders')
    return redirect("/job-orders");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function findJobOrder(id: string) {
  const jobOrder = await prisma.jobOrders.findUnique({
    where: { id },
    include: {
      JobOrderTask: {
        include: {
          task: true
        }
      }
    }
  });

  if (!jobOrder) {
    return null;
  }

  return jobOrder;
}

