import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = (await request.json()) as { status?: "approved" | "rejected"; reviewer?: string; comment?: string };

  if (!body.status || !["approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (body.status === "rejected" && !(body.comment || "").trim()) {
    return NextResponse.json({ error: "Rejection comment is required." }, { status: 400 });
  }

  try {
    const result = await db.query(
      `update student_applications
       set status = $1, reviewed_at = now(), reviewed_by = $2, rejection_comment = $3
       where id = $4`,
      [body.status, body.reviewer || "admin", body.status === "rejected" ? (body.comment || "").trim() : null, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Database update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
