import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AdmissionSlipFeeType, StudentApplicationInput } from "@/lib/types";

export const runtime = "nodejs";

function sanitizeFeeTypes(value: unknown): AdmissionSlipFeeType[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AdmissionSlipFeeType => item === "academic" || item === "hostel" || item === "transport");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as StudentApplicationInput;

  if (!body.studentName || !body.fatherName || !body.rollNumber || !body.email || !body.documentType || !body.semester) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const metadata = body.metadata ?? {};

  if (body.documentType === "admission_slip") {
    const admissionSlip = metadata.admissionSlip;
    const feeTypes = sanitizeFeeTypes(admissionSlip?.feeTypes);

    if (
      !admissionSlip?.serialNumber ||
      !admissionSlip.referenceCode ||
      !admissionSlip.slipDate ||
      !admissionSlip.dateOfBirth ||
      !admissionSlip.course ||
      !admissionSlip.amountInWords ||
      !admissionSlip.amountValue ||
      feeTypes.length === 0
    ) {
      return NextResponse.json({ error: "Missing required admission slip fields." }, { status: 400 });
    }

    metadata.admissionSlip = {
      ...admissionSlip,
      feeTypes
    };
  }

  try {
    const result = await db.query(
      `insert into student_applications
      (student_name, father_name, roll_number, email, phone, document_type, semester, notes, metadata, status)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'submitted')
      returning id`,
      [body.studentName, body.fatherName, body.rollNumber, body.email, body.phone, body.documentType, body.semester, body.notes || null, JSON.stringify(metadata)]
    );

    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Database insert failed." }, { status: 500 });
  }
}
