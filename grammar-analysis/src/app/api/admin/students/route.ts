import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { full_name, birth_date, class_id } = await req.json();

    if (!full_name || !birth_date || !class_id) {
      return NextResponse.json({ error: 'All fields are required (full_name, birth_date, class_id)' }, { status: 400 });
    }

    const parsedDate = new Date(birth_date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const newStudent = await prisma.student.create({
      data: {
        full_name: full_name.trim(),
        birth_date: parsedDate,
        class_id,
      },
    });

    return NextResponse.json(newStudent);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Student already exists in this class with this birth date' }, { status: 400 });
    }
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
