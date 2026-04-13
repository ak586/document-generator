import { StudentApplication } from "@/lib/types";

export function mapApplicationRow(row: any): StudentApplication {
  return {
    id: row.id,
    studentName: row.student_name,
    rollNumber: row.roll_number,
    email: row.email,
    phone: row.phone,
    semester: row.semester,
    documentType: row.document_type,
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    pdfUrl: row.pdf_url,
    rejectionComment: row.rejection_comment ?? null
  };
}
