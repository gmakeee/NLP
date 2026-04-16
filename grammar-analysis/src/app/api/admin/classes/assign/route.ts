import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { teacher_id, class_id } = await req.json();

    if (!teacher_id || !class_id) {
      return NextResponse.json({ error: 'Both teacher_id and class_id are required' }, { status: 400 });
    }

    const assignment = await prisma.teacherClass.upsert({
      where: {
        teacher_id_class_id: {
          teacher_id,
          class_id,
        },
      },
      update: {}, // Do nothing if it exists
      create: {
        teacher_id,
        class_id,
      },
    });

    return NextResponse.json({ message: 'Teacher assigned to class successfully', assignment });
  } catch (error) {
    console.error('Error assigning teacher to class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
