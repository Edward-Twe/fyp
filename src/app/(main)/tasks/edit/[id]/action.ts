"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { UpdateTaskValues, updateTaskSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function editTask(
  values: UpdateTaskValues,
): Promise<{ error?: string; success?: boolean }> {
  const { user } = await validateRequest();

  if (!user) throw Error("Unauthorized");

  try {
    const { id, task, requiredTimeValue, requiredTimeUnit, spaceNeeded } = updateTaskSchema.parse(values);

    // Check if the task exists
    const selectedTask = await findTask(id);

    if (!selectedTask) {
      // selectedTask doesn't exists
      throw Error("Task doesn't exist");
    }

    await prisma.tasks.update({
      where: { id },
      data: {
        task: task,
        requiredTimeValue: requiredTimeValue,
        requiredTimeUnit: requiredTimeUnit, 
        spaceNeeded: spaceNeeded, 
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

export async function findTask(id: string) {
  const selectedTask = await prisma.tasks.findUnique({
    where: { id },
  });

  if (!selectedTask) {
    return null;
  }

  return selectedTask;
}
