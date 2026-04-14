"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { buildDefaultReferenceNo, COURSE_CATALOG, getAcademicYearLabel, getCourseById, getCourseSessionLabel } from "@/lib/course-catalog";
import { GeneratedDocumentLink } from "@/lib/types";

type AdminFormState = {
  studentName: string;
  fatherName: string;
  dateOfBirth: string;
  mobileNumber: string;
  courseId: string;
  enrollmentNo: string;
  currentYear: string;
  startYear: string;
  referenceNo: string;
};

const INITIAL_FORM: AdminFormState = {
  studentName: "",
  fatherName: "",
  dateOfBirth: "",
  mobileNumber: "",
  courseId: "",
  enrollmentNo: "",
  currentYear: "1",
  startYear: String(new Date().getFullYear()),
  referenceNo: "OSSCPS/"
};

function formatDatePreview(date: Date): string {
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    .replace(/\//g, "-");
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN").format(amount);
}

const DEFAULT_ADMISSION_PAYMENT = 10000;
const DEFAULT_FIRST_YEAR_TOTAL = 135000;

function normalizeGeneratedDocuments(documents: GeneratedDocumentLink[]): GeneratedDocumentLink[] {
  return documents.map((document) => {
    if (!document.pdfBase64) {
      return document;
    }

    const pdfBytes = Uint8Array.from(atob(document.pdfBase64), (char) => char.charCodeAt(0));
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(blob);

    return {
      ...document,
      pdfUrl
    };
  });
}

export default function AdminPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<AdminFormState>(INITIAL_FORM);
  const [referenceEdited, setReferenceEdited] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocumentLink[]>([]);
  const [feeStructureExists, setFeeStructureExists] = useState(true);
  const [feeStructureMessage, setFeeStructureMessage] = useState("");

  const selectedCourse = useMemo(() => {
    if (!form.courseId) return null;
    try {
      return getCourseById(form.courseId);
    } catch {
      return null;
    }
  }, [form.courseId]);

  const currentYearNumber = Number.parseInt(form.currentYear, 10) || 1;
  const startYearNumber = Number.parseInt(form.startYear, 10) || new Date().getFullYear();
  const academicYear = getAcademicYearLabel(startYearNumber);
  const courseSession = selectedCourse ? getCourseSessionLabel(startYearNumber, selectedCourse.durationYears) : "-";
  const paymentDefault = formatCurrency(DEFAULT_ADMISSION_PAYMENT);
  const firstYearTotal = formatCurrency(DEFAULT_FIRST_YEAR_TOTAL);
  const firstYearDue = formatCurrency(DEFAULT_FIRST_YEAR_TOTAL - DEFAULT_ADMISSION_PAYMENT);

  useEffect(() => {
    return () => {
      generatedDocuments.forEach((document) => {
        if (document.pdfUrl.startsWith("blob:")) {
          URL.revokeObjectURL(document.pdfUrl);
        }
      });
    };
  }, [generatedDocuments]);

  useEffect(() => {
    if (referenceEdited) return;
    if (!selectedCourse || !form.enrollmentNo.trim()) {
      setForm((prev) => ({
        ...prev,
        referenceNo: "OSSCPS/"
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      referenceNo: buildDefaultReferenceNo(selectedCourse, startYearNumber, prev.enrollmentNo.trim())
    }));
  }, [referenceEdited, selectedCourse, startYearNumber, form.enrollmentNo]);

  useEffect(() => {
    if (!selectedCourse) {
      setFeeStructureExists(true);
      setFeeStructureMessage("");
      return;
    }

    void fetch(`/api/admin/fee-structures?courseId=${encodeURIComponent(selectedCourse.id)}&batchYear=${startYearNumber}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to check fee structure.");
        }

        setFeeStructureExists(Boolean(data.exists));
        setFeeStructureMessage(data.exists ? "" : `Fee data is missing for ${selectedCourse.shortName} batch ${startYearNumber}. Please add it before generating documents.`);
      })
      .catch((error: any) => {
        setFeeStructureExists(false);
        setFeeStructureMessage(error.message || "Failed to check fee structure.");
      });
  }, [selectedCourse, startYearNumber]);

  function updateField(name: keyof AdminFormState, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openReview(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!formRef.current?.reportValidity()) return;
    if (!selectedCourse) {
      setErrorMessage("Please select a course.");
      return;
    }

    if (currentYearNumber > selectedCourse.durationYears) {
      setErrorMessage("Current year cannot exceed the selected course duration.");
      return;
    }

    if (!feeStructureExists) {
      setErrorMessage(feeStructureMessage || "Fee data is missing. Please enter the fee structure first.");
      return;
    }

    setReviewOpen(true);
  }

  async function submitGeneration() {
    if (!selectedCourse) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/generate-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: form.studentName,
          fatherName: form.fatherName,
          dateOfBirth: form.dateOfBirth,
          mobileNumber: form.mobileNumber,
          courseId: form.courseId,
          enrollmentNo: form.enrollmentNo,
          currentYear: currentYearNumber,
          startYear: startYearNumber,
          referenceNo: form.referenceNo
        })
      });

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error || "Document generation failed.");
        return;
      }

      setGeneratedDocuments((previousDocuments) => {
        previousDocuments.forEach((document) => {
          if (document.pdfUrl.startsWith("blob:")) {
            URL.revokeObjectURL(document.pdfUrl);
          }
        });

        return normalizeGeneratedDocuments(data.documents || []);
      });
      setReviewOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setReferenceEdited(false);
    setReviewOpen(false);
    setErrorMessage("");
  }

  return (
    <>
      <div className="card admin-shell">
        <div className="admin-page-top">
          <div>
            <p className="portal-eyebrow" style={{ marginBottom: 8 }}>
              Admin Document Desk
            </p>
            <h1 className="section-title" style={{ marginBottom: 8 }}>
              Generate Complete Student Document Set
            </h1>
            <p className="section-subtitle" style={{ maxWidth: 760 }}>
              Enter the student record once, review the confirmation popup, and generate the bonafide certificate, first-year dues letter, admission slip, and admission letter together.
            </p>
          </div>
          <div className="row">
            <Link className="button secondary tight" href="/admin/fee-structures">
              Fee Structures
            </Link>
            <button className="button secondary tight" onClick={resetForm} type="button">
              Start Fresh
            </button>
            <button className="button danger tight" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        <div className="admin-layout">
          <form ref={formRef} className="request-card admin-form-card" onSubmit={openReview}>
            <div className="admin-card-head">
              <h2 className="section-title">Student Data</h2>
              <p className="section-subtitle">The reference number can be edited, but it starts with the `OSSCPS/` prefix automatically.</p>
            </div>

            <div className="grid two-col">
              <div>
                <label className="label" htmlFor="studentName">
                  Student Name
                </label>
                <input
                  id="studentName"
                  className="input"
                  value={form.studentName}
                  onChange={(event) => updateField("studentName", event.target.value)}
                  placeholder="Enter full student name"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="fatherName">
                  Father's Name
                </label>
                <input
                  id="fatherName"
                  className="input"
                  value={form.fatherName}
                  onChange={(event) => updateField("fatherName", event.target.value)}
                  placeholder="Enter father's name"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="dateOfBirth">
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  className="input"
                  value={form.dateOfBirth}
                  onChange={(event) => updateField("dateOfBirth", event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="mobileNumber">
                  Mobile Number
                </label>
                <input
                  id="mobileNumber"
                  className="input"
                  value={form.mobileNumber}
                  onChange={(event) => updateField("mobileNumber", event.target.value)}
                  placeholder="Enter mobile number"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="courseId">
                  Course Name
                </label>
                <select id="courseId" className="select" value={form.courseId} onChange={(event) => updateField("courseId", event.target.value)} required>
                  <option value="">Select a course</option>
                  {COURSE_CATALOG.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.shortName} - {course.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="enrollmentNo">
                  Enrollment / Roll No
                </label>
                <input
                  id="enrollmentNo"
                  className="input"
                  value={form.enrollmentNo}
                  onChange={(event) => updateField("enrollmentNo", event.target.value)}
                  placeholder="Enter enrollment or roll number"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="currentYear">
                  Current Year
                </label>
                <input
                  id="currentYear"
                  type="number"
                  min="1"
                  max={selectedCourse?.durationYears ?? 10}
                  className="input"
                  value={form.currentYear}
                  onChange={(event) => updateField("currentYear", event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="startYear">
                  Start Year
                </label>
                <input
                  id="startYear"
                  type="number"
                  min="2000"
                  max="2100"
                  className="input"
                  value={form.startYear}
                  onChange={(event) => updateField("startYear", event.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="label" htmlFor="referenceNo">
                Reference No
              </label>
              <input
                id="referenceNo"
                className="input"
                value={form.referenceNo}
                onChange={(event) => {
                  setReferenceEdited(true);
                  updateField("referenceNo", event.target.value);
                }}
                placeholder="OSSCPS/"
                required
              />
            </div>

            {errorMessage ? <p className="message" style={{ marginTop: 14 }}>{errorMessage}</p> : null}
            {!feeStructureExists ? (
              <p className="message" style={{ marginTop: 14 }}>
                {feeStructureMessage} <Link href="/admin/fee-structures">Open Fee Structure Management</Link>
              </p>
            ) : null}

            <div className="row" style={{ marginTop: 18 }}>
              <button className="button tight" type="submit">
                Review Before Generate
              </button>
            </div>
          </form>

          <div className="request-card admin-preview-card">
            <div className="admin-card-head">
              <h2 className="section-title">Live Summary</h2>
              <p className="section-subtitle">This is the data that will feed all four documents.</p>
            </div>

            <div className="admin-summary-list">
              <div className="admin-summary-item">
                <span className="admin-summary-label">Course</span>
                <span className="admin-summary-value">{selectedCourse ? `${selectedCourse.shortName} - ${selectedCourse.fullName}` : "Select a course"}</span>
              </div>
              <div className="admin-summary-item">
                <span className="admin-summary-label">Duration</span>
                <span className="admin-summary-value">{selectedCourse ? `${selectedCourse.durationYears} ${selectedCourse.durationYears === 1 ? "Year" : "Years"}` : "-"}</span>
              </div>
              <div className="admin-summary-item">
                <span className="admin-summary-label">Academic Year</span>
                <span className="admin-summary-value">{academicYear}</span>
              </div>
              <div className="admin-summary-item">
                <span className="admin-summary-label">Course Session</span>
                <span className="admin-summary-value">{courseSession}</span>
              </div>
              <div className="admin-summary-item">
                <span className="admin-summary-label">Reference</span>
                <span className="admin-summary-value">{form.referenceNo || "OSSCPS/"}</span>
              </div>
              <div className="admin-summary-item">
                <span className="admin-summary-label">Generation Date</span>
                <span className="admin-summary-value">{formatDatePreview(new Date())}</span>
              </div>
            </div>

            <div className="admin-doc-list">
              <div className="admin-doc-card">
                <h3>Bonafide Certificate</h3>
                <p>Uses the selected course duration and the common fee structure table. The first-year paid amount defaults to Rs. {paymentDefault}.</p>
              </div>
              <div className="admin-doc-card">
                <h3>Dues Letter</h3>
                <p>Generated for the first year. Current total fee is Rs. {firstYearTotal} and the due amount is Rs. {firstYearDue} after the default payment entry.</p>
              </div>
              <div className="admin-doc-card">
                <h3>Admission Slip</h3>
                <p>Generates the payment slip for the default first-year payment of Rs. {paymentDefault}.</p>
              </div>
              <div className="admin-doc-card">
                <h3>Admission Letter</h3>
                <p>Uses the bonafide document header and footer with the admission confirmation content.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {generatedDocuments.length ? (
        <div className="card">
          <h2 className="section-title">Generated Documents</h2>
          <p className="section-subtitle">Each file below was created from the current student record.</p>
          <div className="generated-doc-grid">
            {generatedDocuments.map((document) => (
              <div className="generated-doc-card" key={document.type}>
                <h3>{document.label}</h3>
                <p>{document.fileName}</p>
                <a className="button tight" href={document.pdfUrl} target="_blank" rel="noreferrer">
                  Open PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="review-title">
            <div className="admin-card-head">
              <h2 className="section-title" id="review-title">
                Confirm Student Data
              </h2>
              <p className="section-subtitle">Review everything once before the system generates all four documents.</p>
            </div>

            <div className="modal-grid">
              <div className="modal-detail">
                <span className="modal-label">Student Name</span>
                <span className="modal-value">{form.studentName}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Father's Name</span>
                <span className="modal-value">{form.fatherName}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Date of Birth</span>
                <span className="modal-value">{form.dateOfBirth}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Mobile Number</span>
                <span className="modal-value">{form.mobileNumber}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Course</span>
                <span className="modal-value">{selectedCourse ? `${selectedCourse.shortName} - ${selectedCourse.fullName}` : "-"}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Duration</span>
                <span className="modal-value">{selectedCourse ? `${selectedCourse.durationYears} ${selectedCourse.durationYears === 1 ? "Year" : "Years"}` : "-"}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Enrollment / Roll No</span>
                <span className="modal-value">{form.enrollmentNo}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Current Year</span>
                <span className="modal-value">{currentYearNumber}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Start Year</span>
                <span className="modal-value">{form.startYear}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Academic Year</span>
                <span className="modal-value">{academicYear}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Course Session</span>
                <span className="modal-value">{courseSession}</span>
              </div>
              <div className="modal-detail">
                <span className="modal-label">Reference No</span>
                <span className="modal-value">{form.referenceNo}</span>
              </div>
            </div>

            <div className="modal-note">
              <strong>Documents to generate:</strong> Bonafide Certificate, Dues Letter, Admission Slip, Admission Letter
            </div>

            <div className="row" style={{ marginTop: 16 }}>
              <button className="button secondary tight" onClick={() => setReviewOpen(false)} type="button" disabled={isSubmitting}>
                Cancel and Edit
              </button>
              <button className="button tight" onClick={submitGeneration} type="button" disabled={isSubmitting}>
                {isSubmitting ? "Generating..." : "Confirm and Generate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
