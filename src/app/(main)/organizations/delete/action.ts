'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { validateRequest } from '@/auth'

export async function deleteOrganization(organizationId: string) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return { success: false, message: "Unauthorized" }
    }

   
      await prisma.organization.delete({
        where: { id: organizationId }
      })

    revalidatePath('/')

    return { success: true, message: 'Organization deleted successfully' }
  } catch (error) {
    console.error('Error deleting organization:', error)
    return { success: false, message: 'Failed to delete organization' }
  }
}

