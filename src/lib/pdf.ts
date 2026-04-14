import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import handlebars from "handlebars";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { AdmissionSlipMetadata, DocumentType, StudentApplication } from "@/lib/types";

const templateMap: Record<DocumentType, string> = {
  bonafide_certificate: "bonafide-certificate.html",
  transcript_request: "transcript-request.html",
  admission_slip: "admission-slip.html",
  dues_letter: "dues-letter.html",
  admission_letter: "admission-letter.html"
};

const LOCAL_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
].filter(Boolean) as string[];

const SERVERLESS_CHROMIUM_BIN_PATH = path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
let serverlessExecutablePathPromise: Promise<string> | null = null;

function configureServerlessChromiumEnv() {
  if (!process.env.VERCEL) return;

  process.env.AWS_EXECUTION_ENV ||= "AWS_Lambda_nodejs20.x";
  process.env.AWS_LAMBDA_JS_RUNTIME ||= "nodejs20.x";
  process.env.FONTCONFIG_PATH ||= "/tmp/fonts";

  const lambdaLibPath = "/tmp/al2023/lib";
  if (!process.env.LD_LIBRARY_PATH) {
    process.env.LD_LIBRARY_PATH = lambdaLibPath;
    return;
  }

  if (!process.env.LD_LIBRARY_PATH.split(":").includes(lambdaLibPath)) {
    process.env.LD_LIBRARY_PATH = `${lambdaLibPath}:${process.env.LD_LIBRARY_PATH}`;
  }
}

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

function getLegacyAdmissionSlipContext(application: StudentApplication, issueDate: Date, formattedDateSlash: string) {
  const admissionSlip = application.metadata.admissionSlip as AdmissionSlipMetadata | undefined;
  const courseCode = createCourseShortCode(admissionSlip?.course);
  const yearCode = String(issueDate.getFullYear()).slice(-2);
  const defaultReferenceCode = `OSSCPS/${courseCode}/${yearCode}/${application.rollNumber}`;
  const feeTypes = new Set(admissionSlip?.feeTypes ?? []);

  return {
    admissionReferenceCode: admissionSlip?.referenceCode || defaultReferenceCode,
    admissionSerialNumber: admissionSlip?.serialNumber || application.id.slice(0, 3).toUpperCase(),
    admissionSlipDate: formatDateValue(admissionSlip?.slipDate, formattedDateSlash),
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

function getLegacyDuesLetterContext(application: StudentApplication, issueYear: number, sessionRange: string) {
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

function getPdfOptions(documentType: DocumentType) {
  if (documentType === "admission_slip") {
    return {
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
    };
  }

  return {
    format: "A4" as const,
    printBackground: true
  };
}

async function loadTemplate(documentType: DocumentType): Promise<handlebars.TemplateDelegate> {
  const templateName = templateMap[documentType];
  const templatePath = path.join(process.cwd(), "src", "templates", templateName);
  const templateRaw = await fs.readFile(templatePath, "utf8");
  return handlebars.compile(templateRaw);
}

async function launchBrowser() {
  const localChromePath = LOCAL_CHROME_CANDIDATES.find((candidate) => fsSync.existsSync(candidate));

  if (localChromePath) {
    return puppeteer.launch({
      executablePath: localChromePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }

  configureServerlessChromiumEnv();

  if (!serverlessExecutablePathPromise) {
    serverlessExecutablePathPromise = chromium.executablePath(SERVERLESS_CHROMIUM_BIN_PATH);
  }

  const executablePath = await serverlessExecutablePathPromise;

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless
  });
}

export async function renderTemplateBuffer(documentType: DocumentType, context: Record<string, unknown>): Promise<Buffer> {
  const compile = await loadTemplate(documentType);
  const html = compile(context);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf(getPdfOptions(documentType));
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function renderPdfBuffer(application: StudentApplication): Promise<Buffer> {
  const issueDate = new Date();
  const formattedDate = issueDate
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    .replace(/\//g, "-");
  const formattedDateSlash = formattedDate.replace(/-/g, "/");

  const refNo = `AS/${application.documentType === "bonafide_certificate" ? "BFC" : application.documentType === "admission_slip" ? "ADM" : "DOC"}/${application.id.slice(0, 8).toUpperCase()}`;
  const issueYear = issueDate.getFullYear();
  const sessionRange = `${issueYear}-${issueYear + 1}`;
  const courseEndYear = issueYear + 4;
  const enrollmentNo = application.rollNumber || application.id.slice(0, 8).toUpperCase();
  const guardianName = application.fatherName || "________________________";
  const admissionSlipContext = getLegacyAdmissionSlipContext(application, issueDate, formattedDateSlash);
  const duesLetterContext = getLegacyDuesLetterContext(application, issueYear, sessionRange);

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

  return renderTemplateBuffer(application.documentType, {
    ...application,
    issuedDate: formattedDate,
    issuedDateSlash: formattedDateSlash,
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
}
