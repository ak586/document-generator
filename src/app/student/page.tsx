"use client";

import { FormEvent, useState } from "react";
import { AdmissionSlipFeeType, DocumentType } from "@/lib/types";

export default function StudentPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("bonafide_certificate");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const selectedDocumentType = String(formData.get("documentType") || "") as DocumentType;
    const feeTypes = formData
      .getAll("feeTypes")
      .map((value) => String(value))
      .filter((value): value is AdmissionSlipFeeType => value === "academic" || value === "hostel" || value === "transport");

    const payload = {
      studentName: String(formData.get("studentName") || ""),
      fatherName: String(formData.get("fatherName") || ""),
      rollNumber: String(formData.get("rollNumber") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      semester: String(formData.get("semester") || ""),
      documentType: selectedDocumentType,
      notes: String(formData.get("notes") || ""),
      metadata:
        selectedDocumentType === "admission_slip"
          ? {
              admissionSlip: {
                serialNumber: String(formData.get("serialNumber") || ""),
                referenceCode: String(formData.get("referenceCode") || ""),
                slipDate: String(formData.get("slipDate") || ""),
                dateOfBirth: String(formData.get("dateOfBirth") || ""),
                course: String(formData.get("course") || ""),
                amountInWords: String(formData.get("amountInWords") || ""),
                amountValue: String(formData.get("amountValue") || ""),
                feeTypes
              }
            }
          : {}
    };

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setMessage("Submitted successfully.");
      event.currentTarget.reset();
      setDocumentType("bonafide_certificate");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Failed to submit.");
    }

    setLoading(false);
  }

  const isAdmissionSlip = documentType === "admission_slip";

  return (
    <div className="card">
      <h1 className="section-title">Student Request Form</h1>
      <p className="section-subtitle">Fill all required academic details to request an official document.</p>
      <form className="grid two-col" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="studentName">
            Student Name
          </label>
          <input id="studentName" className="input" name="studentName" placeholder="Enter full name" required />
        </div>

        <div>
          <label className="label" htmlFor="fatherName">
            Father's Name
          </label>
          <input id="fatherName" className="input" name="fatherName" placeholder="Enter father's name" required />
        </div>

        <div>
          <label className="label" htmlFor="rollNumber">
            {isAdmissionSlip ? "Admission No / Roll No" : "Roll Number"}
          </label>
          <input
            id="rollNumber"
            className="input"
            name="rollNumber"
            placeholder={isAdmissionSlip ? "Enter admission no or roll no" : "Enter roll number"}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email Address
          </label>
          <input id="email" className="input" name="email" type="email" placeholder="name@college.edu" required />
        </div>

        <div>
          <label className="label" htmlFor="phone">
            Phone Number
          </label>
          <input id="phone" className="input" name="phone" placeholder="10-digit mobile number" required />
        </div>

        <div>
          <label className="label" htmlFor="semester">
            {isAdmissionSlip ? "Session" : "Current Semester"}
          </label>
          <input
            id="semester"
            className="input"
            name="semester"
            placeholder={isAdmissionSlip ? "For example: 2027-28" : "For example: Semester 3"}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="documentType">
            Requested Document
          </label>
          <select
            id="documentType"
            className="select"
            name="documentType"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentType)}
            required
          >
            <option value="bonafide_certificate">Bonafide Certificate</option>
            <option value="transcript_request">Transcript Request</option>
            <option value="admission_slip">Admission Slip</option>
            <option value="dues_letter">Dues Letter</option>
          </select>
        </div>

        {isAdmissionSlip ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <div
              style={{
                border: "1px solid #d7e7df",
                borderRadius: 14,
                padding: 18,
                background: "#f8fffb"
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 6 }}>Admission Slip Details</h2>
              <p className="section-subtitle" style={{ marginTop: 0, marginBottom: 16 }}>
                These fields are used to generate the admission slip shown in the reference image.
              </p>

              <div className="grid two-col">
                <div>
                  <label className="label" htmlFor="serialNumber">
                    Slip Serial Number
                  </label>
                  <input id="serialNumber" className="input" name="serialNumber" placeholder="For example: 017" required={isAdmissionSlip} />
                </div>

                <div>
                  <label className="label" htmlFor="referenceCode">
                    Office Reference Code
                  </label>
                  <input id="referenceCode" className="input" name="referenceCode" placeholder="For example: B.O.T/24/32" required={isAdmissionSlip} />
                </div>

                <div>
                  <label className="label" htmlFor="slipDate">
                    Slip Date
                  </label>
                  <input id="slipDate" className="input" name="slipDate" type="date" required={isAdmissionSlip} />
                </div>

                <div>
                  <label className="label" htmlFor="dateOfBirth">
                    Date of Birth
                  </label>
                  <input id="dateOfBirth" className="input" name="dateOfBirth" type="date" required={isAdmissionSlip} />
                </div>

                <div>
                  <label className="label" htmlFor="course">
                    Course
                  </label>
                  <input id="course" className="input" name="course" placeholder="For example: B.O.T" required={isAdmissionSlip} />
                </div>

                <div>
                  <label className="label" htmlFor="amountValue">
                    Amount
                  </label>
                  <input id="amountValue" className="input" name="amountValue" placeholder="For example: 10000" required={isAdmissionSlip} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label" htmlFor="amountInWords">
                    Amount in Words
                  </label>
                  <input
                    id="amountInWords"
                    className="input"
                    name="amountInWords"
                    placeholder="For example: Ten Thousand Only"
                    required={isAdmissionSlip}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <span className="label" style={{ display: "block", marginBottom: 10 }}>
                    Fee Type
                  </span>
                  <div className="row">
                    <label className="checkbox-row">
                      <input type="checkbox" name="feeTypes" value="academic" defaultChecked />
                      <span>Academic</span>
                    </label>
                    <label className="checkbox-row">
                      <input type="checkbox" name="feeTypes" value="hostel" />
                      <span>Hostel</span>
                    </label>
                    <label className="checkbox-row">
                      <input type="checkbox" name="feeTypes" value="transport" />
                      <span>Transport</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label" htmlFor="notes">
            Notes (Optional)
          </label>
          <textarea id="notes" className="textarea" name="notes" placeholder="Any extra note for admin review" rows={4} />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <button className="button" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
      {message ? <p className="message">{message}</p> : null}
    </div>
  );
}
