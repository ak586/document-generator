import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import handlebars from "handlebars";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { AdmissionSlipMetadata, StudentApplication } from "@/lib/types";

const templateMap = {
  bonafide_certificate: "bonafide-certificate.html",
  transcript_request: "transcript-request.html",
  admission_slip: "admission-slip.html",
  dues_letter: "dues-letter.html"
} as const;

const LOCAL_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
].filter(Boolean) as string[];

function formatDateValue(value: string | undefined, fallback = ""): string {
  if (!value) return fallback;

  const normalized = value.trim();
  if (!normalized) return fallback;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized) || /^\d{2}-\d{2}-\d{4}$/.test(normalized)) return normalized.replace(/-/g, "/");

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;

  return parsed
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    .replace(/-/g, "/");
}

function formatAmountValue(value: string | undefined): string {
  if (!value) return "";
  const normalized = value.replace(/,/g, "").trim();
  const amount = Number(normalized);
  if (Number.isNaN(amount)) return value;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount);
}

function createCourseShortCode(course: string | undefined): string {
  if (!course) return "ADM";
  const initials = course
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || course.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "ADM";
}

function getAdmissionSlipContext(application: StudentApplication, issueDate: Date, formattedDate: string) {
  const admissionSlip = application.metadata.admissionSlip as AdmissionSlipMetadata | undefined;
  const courseCode = createCourseShortCode(admissionSlip?.course);
  const yearCode = String(issueDate.getFullYear()).slice(-2);
  const defaultReferenceCode = `OSSCPS/${courseCode}/${yearCode}/${application.rollNumber}`;
  const feeTypes = new Set(admissionSlip?.feeTypes ?? []);

  return {
    admissionReferenceCode: admissionSlip?.referenceCode || defaultReferenceCode,
    admissionSerialNumber: admissionSlip?.serialNumber || application.id.slice(0, 3).toUpperCase(),
    admissionSlipDate: formatDateValue(admissionSlip?.slipDate, formattedDate),
    admissionBirthDate: formatDateValue(admissionSlip?.dateOfBirth),
    admissionCourse: admissionSlip?.course || "Course Name",
    admissionAmountInWords: admissionSlip?.amountInWords || "Amount in words",
    admissionAmountValue: formatAmountValue(admissionSlip?.amountValue),
    admissionSession: application.semester,
    feeAcademicChecked: feeTypes.has("academic"),
    feeHostelChecked: feeTypes.has("hostel"),
    feeTransportChecked: feeTypes.has("transport")
  };
}

function getDuesLetterContext(application: StudentApplication, issueYear: number, sessionRange: string) {
  const enrollmentCode = application.rollNumber || application.id.slice(0, 8).toUpperCase();
  const duesReferenceCode = `OSSCPS/BOCT-${issueYear}/${enrollmentCode}`;
  const tuitionFee = 60000;
  const labFee = 5000;
  const examinationFee = 10000;
  const hostelFee = 60000;
  const paidAmount = 5000;
  const totalFee = tuitionFee + labFee + examinationFee + hostelFee - paidAmount;

  const formatInr = (amount: number) => new Intl.NumberFormat("en-IN").format(amount);

  return {
    duesReferenceCode,
    duesEnrollmentNo: enrollmentCode,
    duesSessionRange: application.semester || sessionRange,
    duesCourseName: "Bachelor of Occupational Therapy",
    duesCourseShort: "BOCT",
    duesYearLabel: "1st Year",
    duesTuitionFee: formatInr(tuitionFee),
    duesLabFee: formatInr(labFee),
    duesExaminationFee: formatInr(examinationFee),
    duesHostelFee: formatInr(hostelFee),
    duesPaidAmount: formatInr(paidAmount),
    duesTotalFee: formatInr(totalFee)
  };
}

export async function renderPdfBuffer(application: StudentApplication): Promise<Buffer> {
  const templateName = templateMap[application.documentType];
  const templatePath = path.join(process.cwd(), "src", "templates", templateName);
  const templateRaw = await fs.readFile(templatePath, "utf8");
  const compile = handlebars.compile(templateRaw);

  const issueDate = new Date();
  const formattedDate = issueDate
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    .replace(/\//g, "-");

  const refNo = `AS/${application.documentType === "bonafide_certificate" ? "BFC" : application.documentType === "admission_slip" ? "ADM" : "DOC"}/${application.id.slice(0, 8).toUpperCase()}`;
  const issueYear = issueDate.getFullYear();
  const sessionRange = `${issueYear}-${issueYear + 1}`;
  const courseEndYear = issueYear + 4;
  const enrollmentNo = application.rollNumber || application.id.slice(0, 8).toUpperCase();
  const guardianName = application.fatherName || "________________________";
  const admissionSlipContext = getAdmissionSlipContext(application, issueDate, formattedDate);
  const duesLetterContext = getDuesLetterContext(application, issueYear, sessionRange);

  let logoDataUri = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "om-shri-collage-logo.png");
    const logoBuffer = await fs.readFile(logoPath);
    logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    logoDataUri = "";
  }

  let headerBannerDataUri = "";
  try {
    const bannerPath = path.join(process.cwd(), "public", "om-sri-sai-document-header.png");
    const bannerBuffer = await fs.readFile(bannerPath);
    headerBannerDataUri = `data:image/png;base64,${bannerBuffer.toString("base64")}`;
  } catch {
    headerBannerDataUri = "";
  }

  const html = compile({
    ...application,
    issuedDate: formattedDate,
    refNo,
    issueYear,
    courseEndYear,
    sessionRange,
    enrollmentNo,
    guardianName,
    logoDataUri,
    headerBannerDataUri,
    ...admissionSlipContext,
    ...duesLetterContext
  });

  const localChromePath = LOCAL_CHROME_CANDIDATES.find((candidate) => fsSync.existsSync(candidate));

  const browser = localChromePath
    ? await puppeteer.launch({
        executablePath: localChromePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      })
    : await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfOptions =
      application.documentType === "admission_slip"
        ? {
            width: "210mm",
            height: "148.5mm",
            printBackground: true,
            preferCSSPageSize: true,
            scale: 0.68,
            margin: {
              top: "0",
              right: "0",
              bottom: "0",
              left: "0"
            }
          }
        : {
            format: "A4" as const,
            printBackground: true
          };
    const pdfBuffer = await page.pdf(pdfOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
