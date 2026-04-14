import { db } from "@/lib/db";
import { getCourseById } from "@/lib/course-catalog";
import { FeeStructureRecord, FeeStructureUpsertInput, FeeStructureYearInput, FeeStructureYearRecord } from "@/lib/types";

function toYearRecord(year: FeeStructureYearInput): FeeStructureYearRecord {
  return {
    ...year,
    totalFee: year.tuitionFee + year.labFee + year.examinationFee + year.hostelFee + year.transportFee + year.otherFee
  };
}

export function buildEmptyFeeYear(yearNo: number): FeeStructureYearRecord {
  return toYearRecord({
    yearNo,
    tuitionFee: 0,
    labFee: 0,
    examinationFee: 0,
    hostelFee: 0,
    transportFee: 0,
    otherFee: 0
  });
}

export function buildEmptyFeeStructure(courseId: string, batchYear: number): FeeStructureRecord {
  const course = getCourseById(courseId);
  const years = Array.from({ length: course.durationYears }, (_, index) => buildEmptyFeeYear(index + 1));

  return {
    id: "",
    courseId,
    batchYear,
    mode: "same_for_all_years",
    admissionPaymentDefault: 0,
    years,
    createdAt: "",
    updatedAt: ""
  };
}

function mapFeeStructureRows(headerRow: any, yearRows: any[]): FeeStructureRecord {
  const years = yearRows
    .map((row) =>
      toYearRecord({
        yearNo: row.year_no,
        tuitionFee: row.tuition_fee,
        labFee: row.lab_fee,
        examinationFee: row.examination_fee,
        hostelFee: row.hostel_fee,
        transportFee: row.transport_fee,
        otherFee: row.other_fee
      })
    )
    .sort((left, right) => left.yearNo - right.yearNo);

  return {
    id: headerRow.id,
    courseId: headerRow.course_id,
    batchYear: headerRow.batch_year,
    mode: headerRow.mode,
    admissionPaymentDefault: headerRow.admission_payment_default,
    years,
    createdAt: headerRow.created_at,
    updatedAt: headerRow.updated_at
  };
}

export async function getFeeStructure(courseId: string, batchYear: number): Promise<FeeStructureRecord | null> {
  let headerResult;

  try {
    headerResult = await db.query(`select * from fee_structures where course_id = $1 and batch_year = $2`, [courseId, batchYear]);
  } catch (error: any) {
    if (error?.code === "42P01") return null;
    throw error;
  }

  const headerRow = headerResult.rows[0];

  if (!headerRow) return null;

  const yearResult = await db.query(`select * from fee_structure_years where fee_structure_id = $1 order by year_no asc`, [headerRow.id]);
  return mapFeeStructureRows(headerRow, yearResult.rows);
}

export async function getRequiredFeeStructure(courseId: string, batchYear: number): Promise<FeeStructureRecord> {
  const record = await getFeeStructure(courseId, batchYear);
  if (!record) {
    const course = getCourseById(courseId);
    throw new Error(`Fee structure not found for ${course.shortName} batch ${batchYear}. Please add the fee data first.`);
  }
  return record;
}

export async function upsertFeeStructure(input: FeeStructureUpsertInput): Promise<FeeStructureRecord> {
  const course = getCourseById(input.courseId);
  const sanitizedYears = input.years
    .map((year) => ({
      yearNo: year.yearNo,
      tuitionFee: Math.max(0, year.tuitionFee),
      labFee: Math.max(0, year.labFee),
      examinationFee: Math.max(0, year.examinationFee),
      hostelFee: Math.max(0, year.hostelFee),
      transportFee: Math.max(0, year.transportFee),
      otherFee: Math.max(0, year.otherFee)
    }))
    .sort((left, right) => left.yearNo - right.yearNo)
    .slice(0, course.durationYears);

  const client = await db.connect();

  try {
    await client.query("begin");

    const headerResult = await client.query(
      `insert into fee_structures (course_id, batch_year, mode, admission_payment_default, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (course_id, batch_year)
       do update set mode = excluded.mode,
                     admission_payment_default = excluded.admission_payment_default,
                     updated_at = now()
       returning *`,
      [input.courseId, input.batchYear, input.mode, Math.max(0, input.admissionPaymentDefault)]
    );

    const headerRow = headerResult.rows[0];

    await client.query(`delete from fee_structure_years where fee_structure_id = $1`, [headerRow.id]);

    for (const year of sanitizedYears) {
      await client.query(
        `insert into fee_structure_years
          (fee_structure_id, year_no, tuition_fee, lab_fee, examination_fee, hostel_fee, transport_fee, other_fee, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [headerRow.id, year.yearNo, year.tuitionFee, year.labFee, year.examinationFee, year.hostelFee, year.transportFee, year.otherFee]
      );
    }

    await client.query("commit");
    return (await getFeeStructure(input.courseId, input.batchYear)) as FeeStructureRecord;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
