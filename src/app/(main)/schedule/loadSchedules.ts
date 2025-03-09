"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { validateRole } from "@/roleAuth";

export async function findEmployeebyUserId(userId: string, orgId: string) {
  const employee = await prisma.employees.findFirst({
    where: {
      AND: [{ userId: userId }, { orgId: orgId }],
    },
  });

  return employee;
}

export async function loadSchedules(orgId: string | undefined) {
  const { user } = await validateRequest();

  if (!user || !orgId) throw Error("Unauthorized");

  const role = await validateRole(user, orgId);

  const employee = await findEmployeebyUserId(user.id, orgId);
  let schedules;

  if (employee) {
    console.log(employee);
  }

  try {
    if (role === "user") {
      console.log('Finding...')
      schedules = await prisma.schedules.findMany({
        where: {
          AND: [
            {
              orgId: orgId,
              EmployeeSchedules: {
                some: {
                  employeeId: employee?.id,
                },
              },
            },
          ],
        },
        include: {
          jobOrder: {
            include: {
              JobOrderTask: {
                include: {
                  task: true,
                },
              },
            },
          },
        },
        orderBy: {
          departTime: "desc",
        },
      });
    } else {
      schedules = await prisma.schedules.findMany({
        where: {
          orgId: orgId,
        },
        include: {
          jobOrder: {
            include: {
              JobOrderTask: {
                include: {
                  task: true,
                },
              },
            },
          },
        },
        orderBy: {
          departTime: "desc",
        },
      });
    }

    if (schedules.length === 0) {
      return [];
    }

    console.log(schedules);

    return schedules;
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong, Please try again.",
    };
  }
}

export async function loadEmployeeSchedules(orgId: string | undefined) {
  const { user } = await validateRequest();

  if (!user || !orgId) throw Error("Unauthorized");
  
  const empployeeSchedules = await prisma.employeeSchedules.findMany({
    where: {
      schedule: {
        orgId: orgId,
      },
    },
    include: {
      schedule: true,
    },
  });

  return empployeeSchedules;
}
