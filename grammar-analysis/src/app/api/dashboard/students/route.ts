import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { full_name, birth_date, class_id } = await req.json();

    if (!full_name || !birth_date || !class_id) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const parsedDate = new Date(birth_date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // IDOR Check - Ensure Teacher owns the class
    if (session.role === 'TEACHER') {
      const tc = await prisma.teacherClass.findUnique({
        where: {
          teacher_id_class_id: {
            teacher_id: session.userId as string,
            class_id: class_id,
          }
        }
      });
      if (!tc) {
        return NextResponse.json({ error: 'Forbidden: You cannot add students to a class you do not manage.' }, { status: 403 });
      }
    }

    const newStudent = await prisma.student.create({
      data: {
        full_name: full_name.trim(),
        birth_date: parsedDate,
        class_id,
      },
    });

    return NextResponse.json(newStudent, { status: 201 });

  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Student already exists in this class with this birth date' }, { status: 400 });
    }
    console.error('Error creating student from dashboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
