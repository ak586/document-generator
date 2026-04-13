export type DocumentType = "bonafide_certificate" | "transcript_request";

export type ApplicationStatus = "submitted" | "approved" | "rejected";

export interface StudentApplicationInput {
  studentName: string;
  rollNumber: string;
  email: string;
  phone: string;
  documentType: DocumentType;
  semester: string;
  notes?: string;
}

export interface StudentApplication extends StudentApplicationInput {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  pdfUrl: string | null;
  rejectionComment: string | null;
}
