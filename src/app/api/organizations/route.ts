import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

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
        name: true,
        orgPic: true,
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
