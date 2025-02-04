'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { validateRequest } from '@/auth'

export async function deleteSchedule(scheduleId: string) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return { success: false, message: "Unauthorized" }
    }

    await prisma.schedules.delete({
      where: { id: scheduleId }
    })

    try {
      revalidatePath('/schedule')
    } catch (revalidateError) {
      console.error('Revalidation error:', revalidateError)
      // Continue execution even if revalidation fails
    }

    return { success: true, message: 'Schedule deleted successfully' }
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return { success: false, message: 'Failed to delete schedule' }
  }
}

