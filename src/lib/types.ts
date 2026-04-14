export type DocumentType = "bonafide_certificate" | "transcript_request" | "admission_slip" | "dues_letter";

export type AdmissionSlipFeeType = "academic" | "hostel" | "transport";

export interface AdmissionSlipMetadata {
  serialNumber: string;
  referenceCode: string;
  slipDate: string;
  dateOfBirth: string;
  course: string;
  amountInWords: string;
  amountValue: string;
  feeTypes: AdmissionSlipFeeType[];
}

export interface ApplicationMetadata {
  admissionSlip?: AdmissionSlipMetadata;
}

export type ApplicationStatus = "submitted" | "approved" | "rejected";

export interface StudentApplicationInput {
  studentName: string;
  fatherName: string;
  rollNumber: string;
  email: string;
  phone: string;
  documentType: DocumentType;
  semester: string;
  notes?: string;
  metadata?: ApplicationMetadata;
}

export interface StudentApplication extends StudentApplicationInput {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  pdfUrl: string | null;
  rejectionComment: string | null;
  metadata: ApplicationMetadata;
}
