'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { validateRequest } from '@/auth';

export async function deleteEmployee(employeeId: string) {
    const { user } = await validateRequest();
    
      if (!user) throw Error("Unauthorized");
  try {

    await prisma.employees.delete({
      where: { id: employeeId },
    })
    revalidatePath('/employees')
    return { success: true, message: 'Employee deleted successfully' }
  } catch (error) {
    console.error('Error deleting employee:', error)
    return { success: false, message: 'Failed to delete employee' }
  }
}

