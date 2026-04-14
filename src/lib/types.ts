export type DocumentType = "bonafide_certificate" | "transcript_request" | "admission_slip" | "dues_letter" | "admission_letter";

export type GeneratedDocumentType = "bonafide_certificate" | "dues_letter" | "admission_slip" | "admission_letter";

export interface CourseDefinition {
  id: string;
  shortName: string;
  fullName: string;
  durationYears: number;
  referenceCode: string;
}

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  bankBranch: string;
}

export type FeeStructureMode = "same_for_all_years" | "year_wise";

export interface FeeStructureYearInput {
  yearNo: number;
  tuitionFee: number;
  labFee: number;
  examinationFee: number;
  hostelFee: number;
  transportFee: number;
  otherFee: number;
}

export interface FeeStructureYearRecord extends FeeStructureYearInput {
  totalFee: number;
}

export interface FeeStructureRecord {
  id: string;
  courseId: string;
  batchYear: number;
  mode: FeeStructureMode;
  admissionPaymentDefault: number;
  years: FeeStructureYearRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureUpsertInput {
  courseId: string;
  batchYear: number;
  mode: FeeStructureMode;
  admissionPaymentDefault: number;
  years: FeeStructureYearInput[];
}

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

export interface AdminStudentRecordInput {
  studentName: string;
  fatherName: string;
  dateOfBirth: string;
  mobileNumber: string;
  courseId: string;
  enrollmentNo: string;
  currentYear: number;
  startYear: number;
  referenceNo: string;
}

export interface GeneratedDocumentLink {
  type: GeneratedDocumentType;
  label: string;
  fileName: string;
  pdfUrl: string;
  pdfBase64?: string;
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
