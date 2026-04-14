import fs from "node:fs/promises";
import path from "node:path";
import { buildDefaultReferenceNo, DEFAULT_FEE_STRUCTURE, formatOrdinal, getAcademicYearLabel, getCourseById, getCourseSessionLabel } from "@/lib/course-catalog";
import { getBankDetails } from "@/lib/bank-details";
import { renderTemplateBuffer } from "@/lib/pdf";
import { AdminStudentRecordInput, GeneratedDocumentLink, GeneratedDocumentType } from "@/lib/types";

type StudentBundleContext = {
  studentName: string;
  fatherName: string;
  dateOfBirth: string;
  mobileNumber: string;
  enrollmentNo: string;
  compactEnrollmentNo: string;
  issuedDate: string;
  issuedDateSlash: string;
  referenceNo: string;
  startYear: number;
  currentYear: number;
  currentYearLabel: string;
  academicYearLabel: string;
  courseSessionLabel: string;
  courseFullName: string;
  courseShortName: string;
  courseReferenceCode: string;
  durationYears: number;
  durationLabel: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  bankAccountType: string;
  bankBranch: string;
  logoDataUri: string;
  headerBannerDataUri: string;
  bonafideYearHeaders: string[];
  bonafideFeeRows: Array<{ label: string; total: string; yearlyAmounts: string[] }>;
  bonafideTotalDue: string;
  firstYearGrossTotal: string;
  firstYearTuitionFee: string;
  firstYearLabFee: string;
  firstYearExaminationFee: string;
  firstYearHostelFee: string;
  firstYearPaidAmount: string;
  firstYearDueAmount: string;
  admissionAmountValue: string;
  admissionAmountInWords: string;
  admissionSlipSerialNumber: string;
  feeAcademicChecked: boolean;
  feeHostelChecked: boolean;
  feeTransportChecked: boolean;
};

function formatDateDash(date: Date): string {
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    .replace(/\//g, "-");
}

function formatDateSlash(value: string): string {
  return value.replace(/-/g, "/");
}

function formatDateOfBirth(value: string): string {
  if (!value) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    .replace(/\//g, "/");
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN").format(amount);
}

function amountToWords(amount: number): string {
  if (amount === 10000) return "Ten Thousand Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(num: number): string {
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`.trim();
  }

  function threeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    if (!hundred) return twoDigits(remainder);
    return `${ones[hundred]} Hundred${remainder ? ` ${twoDigits(remainder)}` : ""}`.trim();
  }

  const lakh = Math.floor(amount / 100000);
  const remainderAfterLakh = amount % 100000;
  const thousand = Math.floor(remainderAfterLakh / 1000);
  const remainder = remainderAfterLakh % 1000;

  const parts = [];
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (remainder) parts.push(threeDigits(remainder));
  return `${parts.join(" ").trim()} Only`;
}

function sanitizeReferenceNo(referenceNo: string, fallback: string): string {
  const trimmed = referenceNo.trim();
  if (!trimmed || trimmed === "OSSCPS/") return fallback;
  return trimmed;
}

function createSlipSerialNumber(enrollmentNo: string): string {
  const cleaned = enrollmentNo.replace(/[^A-Za-z0-9]/g, "");
  if (!cleaned) return "001";
  return cleaned.slice(-3).toUpperCase();
}

function createCompactEnrollmentNo(referenceCode: string, startYear: number, enrollmentNo: string): string {
  const trimmed = enrollmentNo.trim();
  const lastSegment = trimmed.split("/").filter(Boolean).at(-1) || trimmed;
  return `${referenceCode}-${startYear}/${lastSegment}`;
}

async function readAssetAsDataUri(fileName: string, mimeType: string): Promise<string> {
  try {
    const buffer = await fs.readFile(path.join(process.cwd(), "public", fileName));
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

async function buildStudentBundleContext(input: AdminStudentRecordInput): Promise<StudentBundleContext> {
  const course = getCourseById(input.courseId);
  const bankDetails = getBankDetails();
  const issueDate = new Date();
  const issuedDate = formatDateDash(issueDate);
  const issuedDateSlash = formatDateSlash(issuedDate);
  const normalizedCurrentYear = Math.max(1, Math.min(input.currentYear, course.durationYears));
  const fallbackReference = buildDefaultReferenceNo(course, input.startYear, input.enrollmentNo);
  const referenceNo = sanitizeReferenceNo(input.referenceNo, fallbackReference);
  const annualTotal =
    DEFAULT_FEE_STRUCTURE.tuitionFee +
    DEFAULT_FEE_STRUCTURE.labFee +
    DEFAULT_FEE_STRUCTURE.examinationFee +
    DEFAULT_FEE_STRUCTURE.hostelFee;
  const firstYearDue = annualTotal - DEFAULT_FEE_STRUCTURE.initialPayment;

  const bonafideYearHeaders = Array.from({ length: course.durationYears }, (_, index) => `${formatOrdinal(index + 1)} Year`);
  const yearlyTotals = Array.from({ length: course.durationYears }, () => annualTotal);
  const yearlyPayments = Array.from({ length: course.durationYears }, (_, index) => (index === 0 ? DEFAULT_FEE_STRUCTURE.initialPayment : 0));
  const yearlyDues = yearlyTotals.map((amount, index) => amount - yearlyPayments[index]);

  const buildRow = (label: string, total: number, yearlyAmounts: number[]) => ({
    label,
    total: formatInr(total),
    yearlyAmounts: yearlyAmounts.map(formatInr)
  });

  const logoDataUri = await readAssetAsDataUri("om-shri-collage-logo.png", "image/png");
  const headerBannerDataUri = await readAssetAsDataUri("om-sri-sai-document-header.png", "image/png");

  return {
    studentName: input.studentName.trim(),
    fatherName: input.fatherName.trim(),
    dateOfBirth: formatDateOfBirth(input.dateOfBirth),
    mobileNumber: input.mobileNumber.trim(),
    enrollmentNo: input.enrollmentNo.trim(),
    compactEnrollmentNo: createCompactEnrollmentNo(course.referenceCode, input.startYear, input.enrollmentNo),
    issuedDate,
    issuedDateSlash,
    referenceNo,
    startYear: input.startYear,
    currentYear: normalizedCurrentYear,
    currentYearLabel: `${formatOrdinal(normalizedCurrentYear)} Year`,
    academicYearLabel: getAcademicYearLabel(input.startYear),
    courseSessionLabel: getCourseSessionLabel(input.startYear, course.durationYears),
    courseFullName: course.fullName,
    courseShortName: course.shortName,
    courseReferenceCode: course.referenceCode,
    durationYears: course.durationYears,
    durationLabel: `${course.durationYears} ${course.durationYears === 1 ? "Year" : "Years"}`,
    bankAccountHolderName: bankDetails.accountHolderName,
    bankAccountNumber: bankDetails.accountNumber,
    bankIfscCode: bankDetails.ifscCode,
    bankAccountType: bankDetails.accountType,
    bankBranch: bankDetails.bankBranch,
    logoDataUri,
    headerBannerDataUri,
    bonafideYearHeaders,
    bonafideFeeRows: [
      buildRow("Tuition Fee", DEFAULT_FEE_STRUCTURE.tuitionFee * course.durationYears, Array.from({ length: course.durationYears }, () => DEFAULT_FEE_STRUCTURE.tuitionFee)),
      buildRow("LAB/Library Fee", DEFAULT_FEE_STRUCTURE.labFee * course.durationYears, Array.from({ length: course.durationYears }, () => DEFAULT_FEE_STRUCTURE.labFee)),
      buildRow(
        "Examination Fee",
        DEFAULT_FEE_STRUCTURE.examinationFee * course.durationYears,
        Array.from({ length: course.durationYears }, () => DEFAULT_FEE_STRUCTURE.examinationFee)
      ),
      buildRow("Hostel Fee", DEFAULT_FEE_STRUCTURE.hostelFee * course.durationYears, Array.from({ length: course.durationYears }, () => DEFAULT_FEE_STRUCTURE.hostelFee)),
      buildRow("Paid Amount", DEFAULT_FEE_STRUCTURE.initialPayment, yearlyPayments),
      buildRow("Dues Amount", yearlyDues.reduce((sum, amount) => sum + amount, 0), yearlyDues),
      buildRow("G.Total", yearlyDues.reduce((sum, amount) => sum + amount, 0), yearlyDues)
    ],
    bonafideTotalDue: formatInr(yearlyDues.reduce((sum, amount) => sum + amount, 0)),
    firstYearGrossTotal: formatInr(annualTotal),
    firstYearTuitionFee: formatInr(DEFAULT_FEE_STRUCTURE.tuitionFee),
    firstYearLabFee: formatInr(DEFAULT_FEE_STRUCTURE.labFee),
    firstYearExaminationFee: formatInr(DEFAULT_FEE_STRUCTURE.examinationFee),
    firstYearHostelFee: formatInr(DEFAULT_FEE_STRUCTURE.hostelFee),
    firstYearPaidAmount: formatInr(DEFAULT_FEE_STRUCTURE.initialPayment),
    firstYearDueAmount: formatInr(firstYearDue),
    admissionAmountValue: formatInr(DEFAULT_FEE_STRUCTURE.initialPayment),
    admissionAmountInWords: amountToWords(DEFAULT_FEE_STRUCTURE.initialPayment),
    admissionSlipSerialNumber: createSlipSerialNumber(input.enrollmentNo.trim()),
    feeAcademicChecked: true,
    feeHostelChecked: false,
    feeTransportChecked: false
  };
}

function buildDocumentContexts(context: StudentBundleContext): Record<GeneratedDocumentType, Record<string, unknown>> {
  return {
    bonafide_certificate: {
      ...context,
      refNo: context.referenceNo,
      guardianName: context.fatherName,
      enrollmentNo: context.compactEnrollmentNo,
      sessionRange: context.courseSessionLabel,
      issueYear: context.startYear,
      courseEndYear: context.startYear + context.durationYears,
      bonafideCourseName: context.courseFullName,
      bonafideCurrentYearLabel: context.currentYearLabel,
      bonafideProgramDuration: context.durationLabel
    },
    dues_letter: {
      ...context,
      guardianName: context.fatherName,
      duesReferenceCode: context.referenceNo,
      duesEnrollmentNo: context.compactEnrollmentNo,
      duesSessionRange: context.courseSessionLabel,
      duesCourseName: context.courseFullName,
      duesCourseShort: context.courseReferenceCode,
      duesYearLabel: "1st Year",
      duesTuitionFee: context.firstYearTuitionFee,
      duesLabFee: context.firstYearLabFee,
      duesExaminationFee: context.firstYearExaminationFee,
      duesHostelFee: context.firstYearHostelFee,
      duesPaidAmount: context.firstYearPaidAmount,
      duesGrossTotalFee: context.firstYearGrossTotal,
      duesNetPayable: context.firstYearDueAmount
    },
    admission_slip: {
      ...context,
      admissionReferenceCode: context.referenceNo,
      admissionSerialNumber: context.admissionSlipSerialNumber,
      admissionSlipDate: context.issuedDateSlash,
      admissionBirthDate: context.dateOfBirth,
      admissionCourse: context.courseShortName,
      admissionAmountInWords: context.admissionAmountInWords,
      admissionAmountValue: context.admissionAmountValue,
      admissionSession: context.courseSessionLabel
    },
    admission_letter: {
      ...context,
      guardianName: context.fatherName,
      programName: context.courseFullName,
      programDuration: context.durationLabel,
      academicYear: context.courseSessionLabel,
      admissionLetterReferenceNo: context.referenceNo,
      admissionLetterEnrollmentNo: context.referenceNo
    }
  };
}

export async function generateDocumentBundle(input: AdminStudentRecordInput): Promise<GeneratedDocumentLink[]> {
  const context = await buildStudentBundleContext(input);
  const documentContexts = buildDocumentContexts(context);
  const diskDir = path.join(process.cwd(), "public", "generated");
  const safeEnrollment = context.enrollmentNo.replace(/[^a-zA-Z0-9_-]/g, "") || "student";
  const generatedAt = Date.now();

  await fs.mkdir(diskDir, { recursive: true });

  const documents: Array<{ type: GeneratedDocumentType; label: string }> = [
    { type: "bonafide_certificate", label: "Bonafide Certificate" },
    { type: "dues_letter", label: "Dues Letter" },
    { type: "admission_slip", label: "Admission Slip" },
    { type: "admission_letter", label: "Admission Letter" }
  ];

  return Promise.all(
    documents.map(async (document, index) => {
      const pdfBuffer = await renderTemplateBuffer(document.type, documentContexts[document.type]);
      const fileName = `${document.type}-${safeEnrollment}-${generatedAt + index}.pdf`;
      await fs.writeFile(path.join(diskDir, fileName), pdfBuffer);

      return {
        type: document.type,
        label: document.label,
        pdfUrl: `/generated/${fileName}`
      };
    })
  );
}
