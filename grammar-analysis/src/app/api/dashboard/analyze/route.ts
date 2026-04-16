import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = "force-dynamic";

function isCyrillic(text: string): boolean {
  const cleanText = text.replace(/[^а-яА-ЯёЁ]/g, "");
  if (cleanText.length < 3) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, student_id } = await req.json();

    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: 'Text must be at least 5 characters long.' }, { status: 400 });
    }

    if (!student_id) {
      return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
    }

    // IDOR Check
    const student = await prisma.student.findUnique({ where: { id: student_id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    if (session.role === 'TEACHER') {
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

    if (!isCyrillic(text)) {
      return NextResponse.json({ error: 'Only Russian text is supported.' }, { status: 400 });
    }

    // Call external Fast NLP Engine
    const nlpEngineUrl = process.env.NLP_ENGINE_URL || "http://127.0.0.1:8001";
    let nlpResponse;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      nlpResponse = await fetch(`${nlpEngineUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!nlpResponse.ok) {
        throw new Error(`NLP Engine returned ${nlpResponse.status}`);
      }
    } catch (err: unknown) {
      console.error("NLP Engine Request failed:", err);
      return NextResponse.json({ error: 'Analysis service is temporarily unavailable.' }, { status: 503 });
    }

    const nlpData = await nlpResponse.json();

    // Save to database
    const analysisResult = await prisma.analysisResult.create({
      data: {
        raw_text: nlpData.text || text,
        student_id: student.id,
        metrics: {
          rds: nlpData.rds,
          car: nlpData.car,
          gci: nlpData.gci,
          matches: nlpData.matches || []
        }
      }
    });

    return NextResponse.json(analysisResult, { status: 201 });

  } catch (error) {
    console.error('Error in analysis route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
