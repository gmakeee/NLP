import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        teacher_classes: {
          include: {
            teacher: { select: { id: true, email: true } }
          }
        }
      }
    });

    // Flatten for easier frontend consumption
    const result = classes.map(c => ({
      id: c.id,
      name: c.name,
      teachers: c.teacher_classes.map(tc => tc.teacher)
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: { name },
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
