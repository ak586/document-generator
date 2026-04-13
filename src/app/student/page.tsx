"use client";

import { FormEvent, useState } from "react";
import { DocumentType } from "@/lib/types";

export default function StudentPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      studentName: String(formData.get("studentName") || ""),
      rollNumber: String(formData.get("rollNumber") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      semester: String(formData.get("semester") || ""),
      documentType: String(formData.get("documentType") || "") as DocumentType,
      notes: String(formData.get("notes") || "")
    };

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setMessage("Submitted successfully.");
      event.currentTarget.reset();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Failed to submit.");
    }

    setLoading(false);
  }

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
          <label className="label" htmlFor="rollNumber">
            Roll Number
          </label>
          <input id="rollNumber" className="input" name="rollNumber" placeholder="Enter roll number" required />
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
            Current Semester
          </label>
          <input id="semester" className="input" name="semester" placeholder="For example: Semester 3" required />
        </div>

        <div>
          <label className="label" htmlFor="documentType">
            Requested Document
          </label>
          <select id="documentType" className="select" name="documentType" defaultValue="bonafide_certificate" required>
            <option value="bonafide_certificate">Bonafide Certificate</option>
            <option value="transcript_request">Transcript Request</option>
          </select>
        </div>

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
