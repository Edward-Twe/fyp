"use server"

import { User } from "lucia"
import prisma from "@/lib/prisma"
import { Roles } from "@prisma/client"

export const validateRole = async (user: User, orgId: string): Promise<Roles | null> => {
  try {
    const orgRole = await prisma.organizationRole.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: orgId
        }
      }
    })
    
    return orgRole?.role || null
  } catch (error) {
    console.error('Error validating role:', error)
    return null
  }
}