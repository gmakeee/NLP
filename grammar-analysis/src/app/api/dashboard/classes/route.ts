import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isTeacher = session.role === 'TEACHER';

    let classes;
    if (isTeacher) {
      const tc = await prisma.teacherClass.findMany({
        where: { teacher_id: session.userId as string },
        include: {
          class: {
            include: {
              students: { 
                orderBy: { full_name: 'asc' },
                include: {
                  analysis_results: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: { metrics: true }
                  }
                }
              }
            }
          }
        }
      });
      classes = tc.map((item) => item.class);
    } else {
      classes = await prisma.class.findMany({
        include: {
          students: { 
            orderBy: { full_name: 'asc' },
            include: {
              analysis_results: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: { metrics: true }
              }
            }
          }
        }
      });
    }

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching dashboard classes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    // Wrap in transaction: Create class, then bind to teacher
    const newClass = await prisma.$transaction(async (tx) => {
      const cls = await tx.class.create({
        data: { name: name.trim() }
      });

      if (session.role === 'TEACHER') {
        await tx.teacherClass.create({
          data: {
            teacher_id: session.userId as string,
            class_id: cls.id,
          }
        });
      }

      return cls;
    });

    return NextResponse.json(newClass, { status: 201 });

  } catch (error) {
    console.error('Error creating class from dashboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
