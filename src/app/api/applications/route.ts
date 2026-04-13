import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { StudentApplicationInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as StudentApplicationInput;

  if (!body.studentName || !body.rollNumber || !body.email || !body.documentType || !body.semester) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const result = await db.query(
      `insert into student_applications
      (student_name, roll_number, email, phone, document_type, semester, notes, status)
      values ($1, $2, $3, $4, $5, $6, $7, 'submitted')
      returning id`,
      [body.studentName, body.rollNumber, body.email, body.phone, body.documentType, body.semester, body.notes || null]
    );

    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Database insert failed." }, { status: 500 });
  }
}
