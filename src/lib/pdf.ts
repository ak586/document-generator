import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import handlebars from "handlebars";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { StudentApplication } from "@/lib/types";

const templateMap = {
  bonafide_certificate: "bonafide-certificate.html",
  transcript_request: "transcript-request.html"
} as const;

const LOCAL_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
].filter(Boolean) as string[];

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

  const refNo = `AS/${application.documentType === "bonafide_certificate" ? "BFC" : "DOC"}/${application.id.slice(0, 8).toUpperCase()}`;

  const html = compile({
    ...application,
    issuedDate: formattedDate,
    refNo
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
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
