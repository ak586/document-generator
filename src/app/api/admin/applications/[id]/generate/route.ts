import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapApplicationRow } from "@/lib/application";
import { renderPdfBuffer } from "@/lib/pdf";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const result = await db.query(`select * from student_applications where id = $1`, [id]);
  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const application = mapApplicationRow(row);

  if (application.status !== "approved") {
    return NextResponse.json({ error: "Only approved requests can generate PDFs." }, { status: 400 });
  }

  const pdfBuffer = await renderPdfBuffer(application);
  const safeRoll = application.rollNumber.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${application.documentType}-${safeRoll}-${Date.now()}.pdf`;

  await db.query(`update student_applications set pdf_url = null where id = $1`, [id]);

  return NextResponse.json({
    ok: true,
    fileName,
    pdfUrl: "",
    pdfBase64: pdfBuffer.toString("base64")
  });
}
