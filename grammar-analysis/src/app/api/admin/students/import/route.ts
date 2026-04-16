import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { students } = await req.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No valid student data provided' }, { status: 400 });
    }

    const unmapped: any[] = [];
    let count = 0;

    // To optimize, we could fetch all classes first Map<ClassName, ClassId>
    const allClasses = await prisma.class.findMany();
    const classMap = new Map(allClasses.map(c => [c.name.toLowerCase().trim(), c.id]));

    for (const [index, stu] of students.entries()) {
      const { Name, BirthDate, ClassName } = stu;
      if (!Name || !BirthDate || !ClassName) {
        unmapped.push({ row: index + 1, error: 'Missing required fields' });
        continue;
      }

      const classId = classMap.get(String(ClassName).toLowerCase().trim());
      if (!classId) {
        unmapped.push({ row: index + 1, error: `Class not found: ${ClassName}` });
        continue;
      }

      let parsedDate;
      try {
        parsedDate = new Date(BirthDate);
        if (isNaN(parsedDate.getTime())) throw new Error('Invalid Date');
      } catch (e) {
        unmapped.push({ row: index + 1, error: `Invalid date format: ${BirthDate}` });
        continue;
      }

      // Create student
      try {
        await prisma.student.upsert({
          where: {
            full_name_birth_date_class_id: {
              full_name: String(Name).trim(),
              birth_date: parsedDate,
              class_id: classId,
            }
          },
          update: {},
          create: {
            full_name: String(Name).trim(),
            birth_date: parsedDate,
            class_id: classId,
          }
        });
        count++;
      } catch (err: any) {
         unmapped.push({ row: index + 1, error: `DB Error: ${err.message}` });
      }
    }

    return NextResponse.json({ 
      message: `Imported ${count} students successfully.`, 
      errors: unmapped 
    });

  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
