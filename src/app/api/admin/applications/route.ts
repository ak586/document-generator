import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapApplicationRow } from "@/lib/application";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "").trim();
  const name = (url.searchParams.get("name") || "").trim();
  const roll = (url.searchParams.get("roll") || "").trim();
  const date = (url.searchParams.get("date") || "").trim();

  const conditions: string[] = [];
  const values: string[] = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (name) {
    values.push(`%${name}%`);
    conditions.push(`student_name ilike $${values.length}`);
  }

  if (roll) {
    values.push(`%${roll}%`);
    conditions.push(`roll_number ilike $${values.length}`);
  }

  if (date) {
    values.push(date);
    conditions.push(`created_at::date = $${values.length}::date`);
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

  try {
    const result = await db.query(`select * from student_applications ${whereClause} order by created_at desc`, values);
    return NextResponse.json({ items: result.rows.map(mapApplicationRow) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Database fetch failed." }, { status: 500 });
  }
}
