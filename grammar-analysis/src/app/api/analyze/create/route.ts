import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

// Ensure this route behaves dynamically
export const dynamic = "force-dynamic";

// Zod schema for input validation
const analyzeRequestSchema = z.object({
  text: z
    .string()
    .min(10, { message: "Text must be at least 10 characters long." })
    .max(10000, { message: "Text cannot exceed 10,000 characters." }),
});

// Simple regex to verify Cyrillic content (basic language check)
function isCyrillic(text: string): boolean {
  // Strip out everything except Russian letters
  const cleanText = text.replace(/[^а-яА-ЯёЁ]/g, "");
  // Must have at least some valid Russian text to analyze
  if (cleanText.length < 3) return false;
  // Verify it contains no typical ASCII english alphabet letters as a crude mixed-language filter
  if (/[a-zA-Z]/.test(text)) return false; 
  return true;
}

export async function POST(req: Request) {
  try {
    // 1. Zod Input Validation
    const body = await req.json();
    const result = analyzeRequestSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues?.[0]?.message || "Invalid input data";
      return NextResponse.json(
        { status: "error", detail: errorMessage },
        { status: 400 }
      );
    }

    const { text } = result.data;

    // 2. Language Detection
    if (!isCyrillic(text)) {
      return NextResponse.json(
        { status: "error", detail: "Only Russian text is supported" },
        { status: 400 }
      );
    }

    // 3. Call FastAPI NLP Engine (with 20s timeout constraint)
    const nlpEngineUrl = process.env.NLP_ENGINE_URL || "http://127.0.0.1:8001";
    let nlpResponse;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

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
      console.error("[POST /api/analyze/create] NLP Engine Unreachable:", err);
      // Fallback for Fetch timeouts or connection refused
      return NextResponse.json(
        { status: "error", detail: "Linguistic engine is currently offline" },
        { status: 503 }
      );
    }

    const nlpData = await nlpResponse.json();

    // 4. Prisma Transaction Implementation (Data Integrity)
    // Wrap User creation, Analysis creation, and RuleResult bulk insert cleanly.
    const savedAnalysis = await prisma.$transaction(async (tx) => {
      // Find a default class or create it
      // In a real app we'd expect student_id in the request from authenticated dashboard
      let testClass = await tx.class.findFirst();
      if (!testClass) {
        testClass = await tx.class.create({ data: { name: 'API Default Class' } });
      }

      // Find or create default student for external API tests
      const student = await tx.student.upsert({
        where: {
          full_name_birth_date_class_id: {
            full_name: 'API Test Student',
            birth_date: new Date('2010-01-01'),
            class_id: testClass.id,
          }
        },
        update: {},
        create: {
          full_name: 'API Test Student',
          birth_date: new Date('2010-01-01'),
          class_id: testClass.id,
        }
      });

      // Insert core AnalysisResult record
      const analysisResult = await tx.analysisResult.create({
        data: {
          raw_text: nlpData.text || text,
          metrics: {
            rds: nlpData.rds,
            car: nlpData.car,
            gci: nlpData.gci,
            matches: nlpData.matches || []
          },
          student_id: student.id,
        },
      });

      return tx.analysisResult.findUnique({
        where: { id: analysisResult.id },
        include: { student: true },
      });
    });

    return NextResponse.json(
      { status: "success", data: savedAnalysis },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[POST /api/analyze/create] Database Save Failed:", error);
    return NextResponse.json(
      { status: "error", detail: "Critical error saving analysis results." },
      { status: 500 }
    );
  }
}
