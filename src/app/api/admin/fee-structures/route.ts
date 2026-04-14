import { NextRequest, NextResponse } from "next/server";
import { getCourseById } from "@/lib/course-catalog";
import { buildEmptyFeeStructure, getFeeStructure, upsertFeeStructure } from "@/lib/fee-structures";
import { FeeStructureUpsertInput } from "@/lib/types";

export const runtime = "nodejs";

function normalizeYearValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function validatePayload(body: FeeStructureUpsertInput): string | null {
  if (!body.courseId?.trim()) return "Course is required.";
  if (!Number.isInteger(body.batchYear) || body.batchYear < 2000 || body.batchYear > 2100) return "Batch year is invalid.";
  if (body.mode !== "same_for_all_years" && body.mode !== "year_wise") return "Fee mode is invalid.";
  if (!Number.isInteger(body.admissionPaymentDefault) || body.admissionPaymentDefault < 0) return "Admission payment is invalid.";

  let course;
  try {
    course = getCourseById(body.courseId);
  } catch (error: any) {
    return error.message || "Invalid course.";
  }

  if (!Array.isArray(body.years) || body.years.length !== course.durationYears) {
    return `Expected ${course.durationYears} year entries for the selected course.`;
  }

  for (const year of body.years) {
    if (!Number.isInteger(year.yearNo) || year.yearNo < 1 || year.yearNo > course.durationYears) {
      return "Year entry is invalid.";
    }

    const amounts = [year.tuitionFee, year.labFee, year.examinationFee, year.hostelFee, year.transportFee, year.otherFee];
    if (amounts.some((amount) => !Number.isInteger(amount) || amount < 0)) {
      return "Fee amounts must be whole numbers and cannot be negative.";
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const courseId = (url.searchParams.get("courseId") || "").trim();
  const batchYear = normalizeYearValue(url.searchParams.get("batchYear"));

  if (!courseId) {
    return NextResponse.json({ error: "Course is required." }, { status: 400 });
  }

  if (!batchYear) {
    return NextResponse.json({ error: "Batch year is required." }, { status: 400 });
  }

  try {
    const record = await getFeeStructure(courseId, batchYear);
    return NextResponse.json({ record: record ?? buildEmptyFeeStructure(courseId, batchYear), exists: Boolean(record) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch fee structure." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as FeeStructureUpsertInput;
  const validationError = validatePayload(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const record = await upsertFeeStructure(body);
    return NextResponse.json({ ok: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save fee structure." }, { status: 500 });
  }
}
