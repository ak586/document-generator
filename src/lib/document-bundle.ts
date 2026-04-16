export async function generateDocumentBundle(input: AdminStudentRecordInput): Promise<GeneratedDocumentLink[]> {
  console.log("🚀 Starting document bundle generation");
  console.log("📥 Input:", input);

  const context = await buildStudentBundleContext(input);
  console.log("✅ Context built");

  const documentContexts = buildDocumentContexts(context);
  console.log("📄 Document contexts ready");

  const shouldPersistToDisk = !process.env.VERCEL;
  console.log("🌍 VERCEL ENV:", process.env.VERCEL);
  console.log("💾 shouldPersistToDisk:", shouldPersistToDisk);

  const diskDir = path.join(process.cwd(), "public", "generated");
  console.log("📁 Disk directory:", diskDir);

  const safeEnrollment = context.enrollmentNo.replace(/[^a-zA-Z0-9_-]/g, "") || "student";
  const generatedAt = Date.now();

  if (shouldPersistToDisk) {
    console.log("📂 Creating directory...");
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
      try {
        console.log(`🛠 Generating PDF for: ${document.type}`);

        const pdfBuffer = await renderTemplateBuffer(
          document.type,
          documentContexts[document.type]
        );

        console.log(`✅ PDF generated for: ${document.type}`);

        const fileName = `${document.type}-${safeEnrollment}-${generatedAt + index}.pdf`;

        if (shouldPersistToDisk) {
          console.log(`💾 Writing file to disk: ${fileName}`);
          await fs.writeFile(path.join(diskDir, fileName), pdfBuffer);
        } else {
          console.log(`☁️ Skipping disk write (Vercel environment)`);
        }

        return {
          type: document.type,
          label: document.label,
          fileName,
          pdfUrl: shouldPersistToDisk ? `/generated/${fileName}` : "",
          pdfBase64: shouldPersistToDisk ? undefined : pdfBuffer.toString("base64")
        };
      } catch (err: any) {
        console.error(`💥 Error generating ${document.type}`);
        console.error("👉 Message:", err?.message);
        console.error("👉 Stack:", err?.stack);
        throw err; // VERY IMPORTANT: rethrow so API catches it
      }
    })
  );
}