'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { validateRequest } from '@/auth';


export async function deleteJobOrder(jobOrderId: string) {
    const { user } = await validateRequest();
    
      if (!user) throw Error("Unauthorized");
  try {

    await prisma.jobOrders.delete({
      where: { id: jobOrderId },
    })
    revalidatePath('/job-orders')
    return { success: true, message: 'Job Order deleted successfully' }
  } catch (error) {
    console.error('Error deleting job order:', error)
    return { success: false, message: 'Failed to delete job order' }
  }
}

