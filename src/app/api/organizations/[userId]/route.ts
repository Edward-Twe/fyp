import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = (await params).userId;

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    const organizations = await prisma.organization.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            Employees: {
              some: {
                userId: userId
              }
            }
          },
          {
            Role: {
              some: {
                userId: userId
              }
            }
          }
        ]
      },
      select: {
        id: true,
        name: true
      }
    });

    if (organizations.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(organizations);
    
  } catch (error) {
    console.error('[ORGANIZATIONS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
