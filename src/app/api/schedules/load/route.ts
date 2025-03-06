import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const orgId = searchParams.get('orgId');

    console.log('Query Parameters:', { employeeId, orgId });

    if (!employeeId || !orgId) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    const { user } = await validateRequest();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const schedules = await prisma.schedules.findMany({
      where: {
        orgId,
        EmployeeSchedules: {
          some: {
            employeeId
          }
        }
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        departTime: true,
        departAddress: true
      },
      orderBy: {
        departTime: 'asc'
      }
    });

    return NextResponse.json(schedules);
    
  } catch (error) {
    console.error('[SCHEDULES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
