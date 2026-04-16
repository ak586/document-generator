import fs from "node:fs/promises";
import path from "node:path";
import {
  buildDefaultReferenceNo,
  formatOrdinal,
  getAcademicYearLabel,
  getCourseById,
  getCourseSessionLabel
} from "@/lib/course-catalog";
import { getBankDetails } from "@/lib/bank-details";
import { getRequiredFeeStructure } from "@/lib/fee-structures";
import { renderTemplateBuffer } from "@/lib/pdf";
import {
  AdminStudentRecordInput,
  GeneratedDocumentLink,
  GeneratedDocumentType
} from "@/lib/types";

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

async function readAssetAsDataUri(fileName: string, mimeType: string): Promise<string> {
  try {
    console.log("📦 Reading asset:", fileName);
    const buffer = await fs.readFile(path.join(process.cwd(), "public", fileName));
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.warn("⚠️ Asset not found:", fileName);
    return "";
  }
}

async function buildStudentBundleContext(input: AdminStudentRecordInput): Promise<StudentBundleContext> {
  console.log("🔍 Building student context");

  const course = getCourseById(input.courseId);
  console.log("📚 Course:", course);

  const feeStructure = await getRequiredFeeStructure(input.courseId, input.startYear);
  console.log("💰 Fee structure loaded");

  const bankDetails = getBankDetails(input.courseId);

  const issueDate = new Date();
  const issuedDate = formatDateDash(issueDate);
  const issuedDateSlash = formatDateSlash(issuedDate);

  const logoDataUri = await readAssetAsDataUri("pharmacy-logo.jpeg", "image/jpeg");

  return {
    studentName: input.studentName.trim(),
    fatherName: input.fatherName.trim(),
    dateOfBirth: formatDateOfBirth(input.dateOfBirth),
    mobileNumber: input.mobileNumber.trim(),
    enrollmentNo: input.enrollmentNo.trim(),
    compactEnrollmentNo: input.enrollmentNo,
    issuedDate,
    issuedDateSlash,
    referenceNo: "AUTO",
    startYear: input.startYear,
    currentYear: input.currentYear,
    currentYearLabel: "1st Year",
    academicYearLabel: getAcademicYearLabel(input.startYear),
    courseSessionLabel: getCourseSessionLabel(input.startYear, course.durationYears),
    courseFullName: course.fullName,
    courseShortName: course.shortName,
    courseReferenceCode: course.referenceCode,
    durationYears: course.durationYears,
    durationLabel: `${course.durationYears} Years`,
    bankAccountHolderName: bankDetails.accountHolderName,
    bankAccountNumber: bankDetails.accountNumber,
    bankIfscCode: bankDetails.ifscCode,
    bankAccountType: bankDetails.accountType,
    bankBranch: bankDetails.bankBranch,
    collegeDisplayNameText: "College",
    collegeDisplayNameHtml: "College",
    logoDataUri,
    watermarkDataUri: "",
    headerBannerDataUri: "",
    bonafideYearHeaders: [],
    bonafideFeeRows: [],
    bonafideTotalDue: "",
    firstYearGrossTotal: "",
    firstYearTuitionFee: "",
    firstYearLabFee: "",
    firstYearExaminationFee: "",
    firstYearHostelFee: "",
    firstYearTransportFee: "",
    firstYearOtherFee: "",
    hasFirstYearTransportFee: false,
    hasFirstYearOtherFee: false,
    firstYearPaidAmount: "",
    firstYearDueAmount: "",
    admissionAmountValue: "",
    admissionAmountInWords: "",
    admissionSlipSerialNumber: "001",
    feeAcademicChecked: true,
    feeHostelChecked: false,
    feeTransportChecked: false
  };
}

export async function generateDocumentBundle(input: AdminStudentRecordInput): Promise<GeneratedDocumentLink[]> {
  console.log("🚀 START generateDocumentBundle");

  const context = await buildStudentBundleContext(input);

  const shouldPersistToDisk = !process.env.VERCEL;
  console.log("🌍 VERCEL:", process.env.VERCEL);
  console.log("💾 Persist:", shouldPersistToDisk);

  const diskDir = path.join(process.cwd(), "public", "generated");

  if (shouldPersistToDisk) {
    await fs.mkdir(diskDir, { recursive: true });
  }

  const documents: GeneratedDocumentType[] = [
    "bonafide_certificate",
    "dues_letter",
    "admission_slip",
    "admission_letter"
  ];

  return Promise.all(
    documents.map(async (type, i) => {
      console.log("🛠 Generating:", type);

      try {
        const pdfBuffer = await renderTemplateBuffer(type, context);

        if (shouldPersistToDisk) {
          const fileName = `${type}-${Date.now() + i}.pdf`;
          await fs.writeFile(path.join(diskDir, fileName), pdfBuffer);
        }

        console.log("✅ Done:", type);

        return {
          type,
          label: type,
          fileName: `${type}.pdf`,
          pdfUrl: "",
          pdfBase64: pdfBuffer.toString("base64")
        };
      } catch (err: any) {
        console.error("💥 ERROR in:", type);
        console.error(err?.message, err?.stack);
        throw err;
      }
    })
  );
}