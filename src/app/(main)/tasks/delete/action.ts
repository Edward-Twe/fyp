'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { validateRequest } from '@/auth';

export async function deleteTask(taskId: string) {
    const { user } = await validateRequest();
    
      if (!user) throw Error("Unauthorized");
  try {

    await prisma.tasks.delete({
      where: { id: taskId },
    })
    revalidatePath('/tasks')
    return { success: true, message: 'Task deleted successfully' }
  } catch (error) {
    console.error('Error deleting task:', error)
    return { success: false, message: 'Failed to delete task' }
  }
}

