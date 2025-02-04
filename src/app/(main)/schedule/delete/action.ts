'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { validateRequest } from '@/auth'
import { Status } from '@prisma/client'

export async function deleteSchedule(scheduleId: string) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return { success: false, message: "Unauthorized" }
    }

    await prisma.$transaction(async (tx) => {
      // 1. First, get all job orders associated with this schedule
      const jobOrders = await tx.jobOrders.findMany({
        where: { schedulesId: scheduleId }
      })

      // 2. Update job orders status to unscheduled and remove schedule reference
      if (jobOrders.length > 0) {
        await tx.jobOrders.updateMany({
          where: { schedulesId: scheduleId },
          data: {
            status: Status.unscheduled,
            schedulesId: null,
            employeeId: null,
            scheduledOrder: null
          }
        })
      }

      // 4. Finally delete the schedule
      await tx.schedules.delete({
        where: { id: scheduleId }
      })
    })

    try {
      revalidatePath('/schedule')
    } catch (revalidateError) {
      console.error('Revalidation error:', revalidateError)
    }

    return { success: true, message: 'Schedule deleted successfully' }
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return { success: false, message: 'Failed to delete schedule' }
  }
}

