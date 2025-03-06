import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const orgId = searchParams.get('orgId');

    if (!userId || !orgId) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    const employee = await prisma.employees.findFirst({
        where: {
          AND: [
            { userId: userId },
            { orgId: orgId },
          ],
        },
      });

    return NextResponse.json(employee);
    
  } catch (error) {
    console.error('[SCHEDULES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
