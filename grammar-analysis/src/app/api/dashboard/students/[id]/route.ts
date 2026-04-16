import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = params.id;

    // Fetch the student with their class
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        analysis_results: {
          orderBy: { created_at: 'desc' },
        },
        class: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const role = session.role;
    // IDOR Check if TEACHER
    if (role === 'TEACHER') {
      const tc = await prisma.teacherClass.findUnique({
        where: {
          teacher_id_class_id: {
            teacher_id: session.userId as string,
            class_id: student.class_id,
          },
        },
      });

      if (!tc) {
        return NextResponse.json({ error: 'Forbidden: Student not in your classes' }, { status: 403 });
      }
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student context:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
