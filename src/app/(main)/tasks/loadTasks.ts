"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

const parseTask = (task: any) => {
  return {
    ...task,
    requiredTimeValue: task.requiredTimeValue || 0,
    spaceNeeded: task.spaceNeeded || 0,
  };
};

export async function loadTasks(orgId: string | undefined) {
  const { user } = await validateRequest();

  if (!user || !orgId) throw Error("Unauthorized");

  try {
    const tasks = await prisma.tasks.findMany({
      where: {
        orgId: orgId,
      },
    });

    if (tasks.length === 0) {
      return [];
    }

    const parsedTasks = tasks.map(parseTask);

    return parsedTasks;
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}
