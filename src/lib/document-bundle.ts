import fs from "node:fs/promises";
import path from "node:path";
import { buildDefaultReferenceNo, formatOrdinal, getAcademicYearLabel, getCourseById, getCourseSessionLabel } from "@/lib/course-catalog";
import { getBankDetails } from "@/lib/bank-details";
import { getRequiredFeeStructure } from "@/lib/fee-structures";
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
  collegeDisplayNameText: string;
  collegeDisplayNameHtml: string;
  devanagariFontDataUri: string;
  logoDataUri: string;
  watermarkDataUri: string;
  headerBannerDataUri: string;
  bonafideYearHeaders: string[];
  bonafideFeeRows: Array<{ label: string; total: string; yearlyAmounts: string[] }>;
  bonafideTotalDue: string;
  firstYearGrossTotal: string;
  firstYearTuitionFee: string;
  firstYearLabFee: string;
  firstYearExaminationFee: string;
  firstYearHostelFee: string;
  firstYearTransportFee: string;
  firstYearOtherFee: string;
  hasFirstYearTransportFee: boolean;
  hasFirstYearOtherFee: boolean;
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
  if (!trimmed || trimmed === "OSSCPS/" || trimmed === "OSSPCE/") return fallback;
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

function isPharmacyCourse(courseId: string): boolean {
  return courseId === "b-pharm" || courseId === "d-pharm" || courseId === "b-pharm-lateral";
}

function getCollegeDisplayNameHtml(courseId: string): string {
  return isPharmacyCourse(courseId)
    ? "OM SRI SAI PHARMACY<br />COLLEGE OF EDUCATION"
    : "Om Sri Sai College of Paramedical and Sciences";
}

function getCollegeDisplayNameText(courseId: string): string {
  return isPharmacyCourse(courseId) ? "Om Sri Sai Pharmacy College of Education" : "Om Sri Sai College of Paramedical and Sciences";
}

async function buildStudentBundleContext(input: AdminStudentRecordInput): Promise<StudentBundleContext> {
  const course = getCourseById(input.courseId);
  const feeStructure = await getRequiredFeeStructure(input.courseId, input.startYear);
  const bankDetails = getBankDetails(input.courseId);
  const issueDate = new Date();
  const issuedDate = formatDateDash(issueDate);
  const issuedDateSlash = formatDateSlash(issuedDate);
  const normalizedCurrentYear = Math.max(1, Math.min(input.currentYear, course.durationYears));
  const fallbackReference = buildDefaultReferenceNo(course, input.startYear, input.enrollmentNo);
  const referenceNo = sanitizeReferenceNo(input.referenceNo, fallbackReference);
  const bonafideYearHeaders = Array.from({ length: course.durationYears }, (_, index) => `${formatOrdinal(index + 1)} Year`);
  const yearRecords = bonafideYearHeaders.map((_, index) => feeStructure.years[index]);
  const yearlyTotals = yearRecords.map((year) => year.totalFee);
  const yearlyPayments = yearRecords.map((_, index) => (index === 0 ? feeStructure.admissionPaymentDefault : 0));
  const yearlyDues = yearlyTotals.map((amount, index) => amount - yearlyPayments[index]);
  const firstYearRecord = yearRecords[0];
  const firstYearDue = yearlyDues[0];

  const buildRow = (label: string, total: number, yearlyAmounts: number[]) => ({
    label,
    total: formatInr(total),
    yearlyAmounts: yearlyAmounts.map(formatInr)
  });

  const logoDataUri = isPharmacyCourse(input.courseId)
    ? await readAssetAsDataUri("pharmacy-logo.jpeg", "image/jpeg")
    : await readAssetAsDataUri("paramedical-logo.jpeg", "image/jpeg");
  const watermarkDataUri = isPharmacyCourse(input.courseId)
    ? await readAssetAsDataUri("pharmacy-watermark.png", "image/png")
    : await readAssetAsDataUri("paramedical-watermark.png", "image/png");
  const devanagariFontDataUri = await readAssetAsDataUri("fonts/NotoSansDevanagari-Regular.ttf", "font/ttf");
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
    collegeDisplayNameText: getCollegeDisplayNameText(input.courseId),
    collegeDisplayNameHtml: getCollegeDisplayNameHtml(input.courseId),
    devanagariFontDataUri,
    logoDataUri,
    watermarkDataUri,
    headerBannerDataUri,
    bonafideYearHeaders,
    bonafideFeeRows: [
      buildRow("Tuition Fee", yearRecords.reduce((sum, year) => sum + year.tuitionFee, 0), yearRecords.map((year) => year.tuitionFee)),
      buildRow("LAB/Library Fee", yearRecords.reduce((sum, year) => sum + year.labFee, 0), yearRecords.map((year) => year.labFee)),
      buildRow("Examination Fee", yearRecords.reduce((sum, year) => sum + year.examinationFee, 0), yearRecords.map((year) => year.examinationFee)),
      buildRow("Hostel Fee", yearRecords.reduce((sum, year) => sum + year.hostelFee, 0), yearRecords.map((year) => year.hostelFee)),
      ...(yearRecords.some((year) => year.transportFee > 0)
        ? [buildRow("Transport Fee", yearRecords.reduce((sum, year) => sum + year.transportFee, 0), yearRecords.map((year) => year.transportFee))]
        : []),
      ...(yearRecords.some((year) => year.otherFee > 0)
        ? [buildRow("Other Fee", yearRecords.reduce((sum, year) => sum + year.otherFee, 0), yearRecords.map((year) => year.otherFee))]
        : []),
      buildRow("Paid Amount", feeStructure.admissionPaymentDefault, yearlyPayments),
      buildRow("Dues Amount", yearlyDues.reduce((sum, amount) => sum + amount, 0), yearlyDues),
      buildRow("G.Total", yearlyTotals.reduce((sum, amount) => sum + amount, 0), yearlyTotals)
    ],
    bonafideTotalDue: formatInr(yearlyDues.reduce((sum, amount) => sum + amount, 0)),
    firstYearGrossTotal: formatInr(firstYearRecord.totalFee),
    firstYearTuitionFee: formatInr(firstYearRecord.tuitionFee),
    firstYearLabFee: formatInr(firstYearRecord.labFee),
    firstYearExaminationFee: formatInr(firstYearRecord.examinationFee),
    firstYearHostelFee: formatInr(firstYearRecord.hostelFee),
    firstYearTransportFee: formatInr(firstYearRecord.transportFee),
    firstYearOtherFee: formatInr(firstYearRecord.otherFee),
    hasFirstYearTransportFee: firstYearRecord.transportFee > 0,
    hasFirstYearOtherFee: firstYearRecord.otherFee > 0,
    firstYearPaidAmount: formatInr(feeStructure.admissionPaymentDefault),
    firstYearDueAmount: formatInr(firstYearDue),
    admissionAmountValue: formatInr(feeStructure.admissionPaymentDefault),
    admissionAmountInWords: amountToWords(feeStructure.admissionPaymentDefault),
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
      duesTransportFee: context.firstYearTransportFee,
      duesOtherFee: context.firstYearOtherFee,
      duesPaidAmount: context.firstYearPaidAmount,
      duesGrossTotalFee: context.firstYearGrossTotal,
      duesNetPayable: context.firstYearDueAmount
    },
    admission_slip: {
      ...context,
      admissionReferenceCode: context.referenceNo,
      admissionEnrollmentNo: context.enrollmentNo,
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
  const shouldPersistToDisk = !process.env.VERCEL;
  const diskDir = path.join(process.cwd(), "public", "generated");
  const safeEnrollment = context.enrollmentNo.replace(/[^a-zA-Z0-9_-]/g, "") || "student";
  const generatedAt = Date.now();

  if (shouldPersistToDisk) {
    await fs.mkdir(diskDir, { recursive: true });
  }

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

      if (shouldPersistToDisk) {
        await fs.writeFile(path.join(diskDir, fileName), pdfBuffer);
      }

      return {
        type: document.type,
        label: document.label,
        fileName,
        pdfUrl: shouldPersistToDisk ? `/generated/${fileName}` : "",
        pdfBase64: shouldPersistToDisk ? undefined : pdfBuffer.toString("base64")
      };
    })
  );
}
