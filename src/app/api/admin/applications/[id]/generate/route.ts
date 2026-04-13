import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
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
  const relativePdfUrl = `/generated/${fileName}`;
  const diskDir = path.join(process.cwd(), "public", "generated");
  const diskPath = path.join(diskDir, fileName);

  await fs.mkdir(diskDir, { recursive: true });
  await fs.writeFile(diskPath, pdfBuffer);

  await db.query(`update student_applications set pdf_url = $1 where id = $2`, [relativePdfUrl, id]);

  return NextResponse.json({ ok: true, pdfUrl: relativePdfUrl });
}
