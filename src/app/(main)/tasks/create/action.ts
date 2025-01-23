"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { taskSchema, TaskValues } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function createTask(
  values: TaskValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { task, requiredTimeValue, requiredTimeUnit, spaceNeeded, orgId } = taskSchema.parse(values);

    const organization = await prisma.organization.findFirst({
        where: {
            id: {
                equals: orgId
            }
        }
    })

    if (!organization) return {error: "Please select organization"}

    await prisma.tasks.create({
      data: {
        task: task, 
        requiredTimeValue: requiredTimeValue, 
        requiredTimeUnit: requiredTimeUnit, 
        spaceNeeded: spaceNeeded, 
        orgId: orgId
      },
    });

    revalidatePath("/tasks");
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
