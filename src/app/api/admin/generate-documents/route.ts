import { NextRequest, NextResponse } from "next/server";
import { generateDocumentBundle } from "@/lib/document-bundle";
import { AdminStudentRecordInput } from "@/lib/types";
import { getCourseById } from "@/lib/course-catalog";

export const runtime = "nodejs";

function validatePayload(body: AdminStudentRecordInput): string | null {
  if (!body.studentName.trim()) return "Student name is required.";
  if (!body.fatherName.trim()) return "Father's name is required.";
  if (!body.enrollmentNo.trim()) return "Enrollment number is required.";
  if (!body.courseId.trim()) return "Course is required.";
  if (!body.dateOfBirth.trim()) return "Date of birth is required.";
  if (!body.mobileNumber.trim()) return "Mobile number is required.";
  if (!/^\d{10}$/.test(body.mobileNumber.trim())) return "Mobile number must be exactly 10 digits.";
  if (!Number.isInteger(body.currentYear) || body.currentYear < 1) return "Current year is invalid.";
  if (!Number.isInteger(body.startYear) || body.startYear < 2000 || body.startYear > 2100) return "Start year is invalid.";

  try {
    const course = getCourseById(body.courseId);
    if (body.currentYear > course.durationYears) {
      return "Current year cannot exceed course duration.";
    }
  } catch (error: any) {
    return error.message || "Selected course is invalid.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AdminStudentRecordInput;
  const validationError = validatePayload(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const documents = await generateDocumentBundle(body);
    return NextResponse.json({ ok: true, documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Document generation failed." }, { status: 500 });
  }
}
