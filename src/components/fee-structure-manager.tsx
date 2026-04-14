"use client";

import { useEffect, useMemo, useState } from "react";
import { COURSE_CATALOG, getCourseById } from "@/lib/course-catalog";
import { FeeStructureMode, FeeStructureRecord, FeeStructureYearRecord } from "@/lib/types";

function createEmptyFeeDraft(durationYears: number): FeeStructureYearRecord[] {
  return Array.from({ length: durationYears }, (_, index) => ({
    yearNo: index + 1,
    tuitionFee: 0,
    labFee: 0,
    examinationFee: 0,
    hostelFee: 0,
    transportFee: 0,
    otherFee: 0,
    totalFee: 0
  }));
}

function recalculateYear(year: FeeStructureYearRecord): FeeStructureYearRecord {
  return {
    ...year,
    totalFee: year.tuitionFee + year.labFee + year.examinationFee + year.hostelFee + year.transportFee + year.otherFee
  };
}

function displayAmount(value: number): string {
  return value === 0 ? "" : String(value);
}

export function FeeStructureManager() {
  const [courseId, setCourseId] = useState("");
  const [batchYear, setBatchYear] = useState(String(new Date().getFullYear()));
  const [feeMode, setFeeMode] = useState<FeeStructureMode>("same_for_all_years");
  const [admissionPaymentDefault, setAdmissionPaymentDefault] = useState("0");
  const [feeYears, setFeeYears] = useState<FeeStructureYearRecord[]>(createEmptyFeeDraft(1));
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeMessage, setFeeMessage] = useState("");
  const [feeExists, setFeeExists] = useState(false);

  const selectedCourse = useMemo(() => {
    if (!courseId) return null;
    try {
      return getCourseById(courseId);
    } catch {
      return null;
    }
  }, [courseId]);

  const normalizedBatchYear = Number.parseInt(batchYear, 10) || new Date().getFullYear();

  useEffect(() => {
    if (!selectedCourse) {
      setFeeYears(createEmptyFeeDraft(1));
      setFeeMode("same_for_all_years");
      setAdmissionPaymentDefault("0");
      setFeeExists(false);
      return;
    }

    setFeeLoading(true);
    setFeeMessage("");

    void fetch(`/api/admin/fee-structures?courseId=${encodeURIComponent(selectedCourse.id)}&batchYear=${normalizedBatchYear}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load fee structure.");
        }

        const record = data.record as FeeStructureRecord;
        setFeeExists(Boolean(data.exists));
        setFeeMode(record.mode);
        setAdmissionPaymentDefault(String(record.admissionPaymentDefault));
        setFeeYears(record.years.map(recalculateYear));
        setFeeMessage(data.exists ? "" : "No fee structure found for this course and batch. Enter the fee data and save it.");
      })
      .catch((error: any) => {
        setFeeMessage(error.message || "Failed to load fee structure.");
        setFeeYears(createEmptyFeeDraft(selectedCourse.durationYears));
        setFeeMode("same_for_all_years");
        setAdmissionPaymentDefault("0");
        setFeeExists(false);
      })
      .finally(() => {
        setFeeLoading(false);
      });
  }, [selectedCourse, normalizedBatchYear]);

  function updateFeeYear(yearNo: number, field: keyof Omit<FeeStructureYearRecord, "yearNo" | "totalFee">, value: string) {
    const numericValue = Math.max(0, Number.parseInt(value || "0", 10) || 0);

    setFeeYears((prev) => {
      const next = prev.map((year) => (year.yearNo === yearNo ? recalculateYear({ ...year, [field]: numericValue }) : year));
      if (feeMode !== "same_for_all_years" || yearNo !== 1) return next;

      const firstYear = next.find((year) => year.yearNo === 1);
      if (!firstYear) return next;
      return next.map((year) => recalculateYear({ ...year, ...firstYear, yearNo: year.yearNo }));
    });
  }

  function applyFirstYearToAll() {
    setFeeYears((prev) => {
      const firstYear = prev[0];
      if (!firstYear) return prev;
      return prev.map((year) => recalculateYear({ ...year, ...firstYear, yearNo: year.yearNo }));
    });
  }

  async function saveFeeStructure() {
    if (!selectedCourse) return;

    setFeeSaving(true);
    setFeeMessage("");

    try {
      const response = await fetch("/api/admin/fee-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          batchYear: normalizedBatchYear,
          mode: feeMode,
          admissionPaymentDefault: Math.max(0, Number.parseInt(admissionPaymentDefault || "0", 10) || 0),
          years: feeYears.map((year) => ({
            yearNo: year.yearNo,
            tuitionFee: year.tuitionFee,
            labFee: year.labFee,
            examinationFee: year.examinationFee,
            hostelFee: year.hostelFee,
            transportFee: year.transportFee,
            otherFee: year.otherFee
          }))
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save fee structure.");
      }

      const record = data.record as FeeStructureRecord;
      setFeeExists(true);
      setFeeMode(record.mode);
      setAdmissionPaymentDefault(String(record.admissionPaymentDefault));
      setFeeYears(record.years.map(recalculateYear));
      setFeeMessage("Fee structure saved.");
    } catch (error: any) {
      setFeeMessage(error.message || "Failed to save fee structure.");
    } finally {
      setFeeSaving(false);
    }
  }

  return (
    <div className="request-card admin-fee-card">
      <div className="admin-card-head">
        <h2 className="section-title">Fee Structure Management</h2>
        <p className="section-subtitle">Select the course and batch year, then save one fee structure for all years or a different one for each year.</p>
      </div>

      <div className="grid three-col">
        <div>
          <label className="label" htmlFor="feeCourseId">
            Course
          </label>
          <select id="feeCourseId" className="select" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            <option value="">Select a course</option>
            {COURSE_CATALOG.map((course) => (
              <option key={course.id} value={course.id}>
                {course.shortName} - {course.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="feeBatchYear">
            Batch Year
          </label>
          <input
            id="feeBatchYear"
            className="input"
            type="number"
            min="2000"
            max="2100"
            value={batchYear}
            onChange={(event) => setBatchYear(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="feeAdmissionPayment">
            Admission Payment
          </label>
          <input
            id="feeAdmissionPayment"
            className="input"
            type="number"
            min="0"
            value={admissionPaymentDefault === "0" ? "" : admissionPaymentDefault}
            onChange={(event) => setAdmissionPaymentDefault(event.target.value)}
            disabled={!selectedCourse}
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button
          className={`button tight ${feeMode === "same_for_all_years" ? "" : "secondary"}`}
          type="button"
          onClick={() => setFeeMode("same_for_all_years")}
          disabled={!selectedCourse}
        >
          Same For All Years
        </button>
        <button
          className={`button tight ${feeMode === "year_wise" ? "" : "secondary"}`}
          type="button"
          onClick={() => setFeeMode("year_wise")}
          disabled={!selectedCourse}
        >
          Year-wise Fees
        </button>
        <button className="button secondary tight" type="button" onClick={applyFirstYearToAll} disabled={!selectedCourse}>
          Copy Year 1 To All
        </button>
        <button className="button tight" type="button" onClick={saveFeeStructure} disabled={!selectedCourse || feeSaving || feeLoading}>
          {feeSaving ? "Saving..." : "Save Fee Structure"}
        </button>
      </div>

      {selectedCourse ? (
        <p className="section-subtitle" style={{ marginTop: 12, marginBottom: 0 }}>
          Duration: {selectedCourse.durationYears} {selectedCourse.durationYears === 1 ? "Year" : "Years"}
        </p>
      ) : null}

      {feeMessage ? <p className="message">{feeMessage}</p> : null}
      {!feeExists && selectedCourse ? <p className="message">Fee data is required before document generation for this course and batch.</p> : null}

      <div className="fee-year-grid">
        {feeYears.map((year) => (
          <div className="admin-doc-card fee-year-card" key={year.yearNo}>
            <h3>Year {year.yearNo}</h3>
            <div className="grid three-col">
              <div>
                <label className="label">Tuition</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={displayAmount(year.tuitionFee)}
                  onChange={(event) => updateFeeYear(year.yearNo, "tuitionFee", event.target.value)}
                  disabled={!selectedCourse || feeLoading || (feeMode === "same_for_all_years" && year.yearNo !== 1)}
                />
              </div>
              <div>
                <label className="label">Lab</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={displayAmount(year.labFee)}
                  onChange={(event) => updateFeeYear(year.yearNo, "labFee", event.target.value)}
                  disabled={!selectedCourse || feeLoading || (feeMode === "same_for_all_years" && year.yearNo !== 1)}
                />
              </div>
              <div>
                <label className="label">Examination</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={displayAmount(year.examinationFee)}
                  onChange={(event) => updateFeeYear(year.yearNo, "examinationFee", event.target.value)}
                  disabled={!selectedCourse || feeLoading || (feeMode === "same_for_all_years" && year.yearNo !== 1)}
                />
              </div>
              <div>
                <label className="label">Hostel</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={displayAmount(year.hostelFee)}
                  onChange={(event) => updateFeeYear(year.yearNo, "hostelFee", event.target.value)}
                  disabled={!selectedCourse || feeLoading || (feeMode === "same_for_all_years" && year.yearNo !== 1)}
                />
              </div>
              <div>
                <label className="label">Transport</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={displayAmount(year.transportFee)}
                  onChange={(event) => updateFeeYear(year.yearNo, "transportFee", event.target.value)}
                  disabled={!selectedCourse || feeLoading || (feeMode === "same_for_all_years" && year.yearNo !== 1)}
                />
              </div>
              <div>
                <label className="label">Other</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={displayAmount(year.otherFee)}
                  onChange={(event) => updateFeeYear(year.yearNo, "otherFee", event.target.value)}
                  disabled={!selectedCourse || feeLoading || (feeMode === "same_for_all_years" && year.yearNo !== 1)}
                />
              </div>
            </div>
            <p className="fee-total-line">Total Fee: Rs. {new Intl.NumberFormat("en-IN").format(year.totalFee)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
