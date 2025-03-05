import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scheduleId = params.id;

    if (!scheduleId) {
      return new NextResponse('Schedule ID is required', { status: 400 });
    }

    const schedule = await prisma.schedules.findUnique({
      where: {
        id: scheduleId
      },
      include: {
        EmployeeSchedules: {
          include: {
            employee: true
          }
        },
        jobOrder: {
          include: {
            JobOrderTask: {
              include: {
                task: true
              }
            }
          }
        }
      }
    });

    if (!schedule) {
      return new NextResponse('Schedule not found', { status: 404 });
    }

    return NextResponse.json(schedule);
    
  } catch (error) {
    console.error('[SCHEDULE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
