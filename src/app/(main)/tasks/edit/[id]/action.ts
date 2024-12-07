"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { UpdateTaskValues, updateTaskSchema } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

export async function editTask(
  values: UpdateTaskValues,
): Promise<{ error: string }> {
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

    return redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
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
