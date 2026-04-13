"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentApplication } from "@/lib/types";

type Filters = {
  name: string;
  roll: string;
  date: string;
};

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function AdminPage() {
  const [items, setItems] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ name: "", roll: "", date: "" });
  const [errorMessage, setErrorMessage] = useState("");

  const queueItems = useMemo(() => items.filter((item) => item.status === "submitted"), [items]);
  const reviewedItems = useMemo(() => items.filter((item) => item.status !== "submitted"), [items]);

  async function loadItems(activeFilters: Filters = filters) {
    setLoading(true);
    setErrorMessage("");

    const query = new URLSearchParams();
    if (activeFilters.name.trim()) query.set("name", activeFilters.name.trim());
    if (activeFilters.roll.trim()) query.set("roll", activeFilters.roll.trim());
    if (activeFilters.date.trim()) query.set("date", activeFilters.date.trim());

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`/api/admin/applications${suffix}`);
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || "Failed to load requests.");
      setLoading(false);
      return;
    }

    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function review(id: string, status: "approved" | "rejected") {
    let comment = "";
    if (status === "rejected") {
      comment = (window.prompt("Please enter proper rejection comment (required):") || "").trim();
      if (!comment) {
        alert("Rejection comment is required.");
        return;
      }
    }

    const res = await fetch(`/api/admin/applications/${id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewer: "admin@college.edu", comment })
    });

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to update request.");
      return;
    }

    await loadItems();
  }

  async function generatePdf(id: string) {
    const res = await fetch(`/api/admin/applications/${id}/generate`, { method: "POST" });

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      alert(data.error || "PDF generation failed.");
      return;
    }

    await loadItems();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  function onFilterChange(name: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  async function applyFilters() {
    await loadItems(filters);
  }

  async function clearFilters() {
    const reset = { name: "", roll: "", date: "" };
    setFilters(reset);
    await loadItems(reset);
  }

  return (
    <div className="card">
      <h1 className="section-title">Admin Review Panel</h1>
      <p className="section-subtitle">All student requests come into the queue. Search, review, approve/reject with comment, and generate final PDFs.</p>

      <div className="admin-toolbar">
        <button className="button danger tight" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="request-card">
        <h3 className="section-title">Search Filters</h3>
        <div className="grid three-col">
          <div>
            <label className="label" htmlFor="filterName">
              Student Name
            </label>
            <input
              id="filterName"
              className="input"
              value={filters.name}
              onChange={(e) => onFilterChange("name", e.target.value)}
              placeholder="Search by student name"
            />
          </div>
          <div>
            <label className="label" htmlFor="filterRoll">
              Roll Number
            </label>
            <input
              id="filterRoll"
              className="input"
              value={filters.roll}
              onChange={(e) => onFilterChange("roll", e.target.value)}
              placeholder="Search by roll number"
            />
          </div>
          <div>
            <label className="label" htmlFor="filterDate">
              Request Date
            </label>
            <input id="filterDate" type="date" className="input" value={filters.date} onChange={(e) => onFilterChange("date", e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="button tight" onClick={applyFilters}>
            Apply Filters
          </button>
          <button className="button secondary tight" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? <p>Loading requests...</p> : null}
      {errorMessage ? <p className="message">{errorMessage}</p> : null}
      {!loading && items.length === 0 ? <p className="message">No requests found for selected filters.</p> : null}

      <h3 className="section-title">Request Queue ({queueItems.length})</h3>
      {queueItems.length === 0 ? <p className="section-subtitle">No pending requests in queue.</p> : null}
      {queueItems.map((item) => (
        <RequestCard key={item.id} item={item} onReview={review} onGenerate={generatePdf} />
      ))}

      <h3 className="section-title" style={{ marginTop: 18 }}>
        Reviewed Requests ({reviewedItems.length})
      </h3>
      {reviewedItems.length === 0 ? <p className="section-subtitle">No reviewed requests yet.</p> : null}
      {reviewedItems.map((item) => (
        <RequestCard key={item.id} item={item} onReview={review} onGenerate={generatePdf} />
      ))}
    </div>
  );
}

function RequestCard({
  item,
  onReview,
  onGenerate
}: {
  item: StudentApplication;
  onReview: (id: string, status: "approved" | "rejected") => Promise<void>;
  onGenerate: (id: string) => Promise<void>;
}) {
  return (
    <div className="request-card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontWeight: 700 }}>
          {item.studentName} ({item.rollNumber})
        </p>
        <span className={`status-badge status-${item.status}`}>{item.status}</span>
      </div>

      <div className="meta-grid">
        <p style={{ margin: 0 }}>
          <strong>Requested Doc:</strong> {item.documentType}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Semester:</strong> {item.semester}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Email:</strong> {item.email}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Phone:</strong> {item.phone}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Submitted On:</strong> {formatDate(item.createdAt)}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Reviewed By:</strong> {item.reviewedBy || "-"}
        </p>
      </div>

      {item.rejectionComment ? (
        <p className="reject-note">
          <strong>Rejection Comment:</strong> {item.rejectionComment}
        </p>
      ) : null}

      <details className="details-box">
        <summary>View Full Student Form Data</summary>
        <div className="details-grid">
          <p>
            <strong>ID:</strong> {item.id}
          </p>
          <p>
            <strong>Name:</strong> {item.studentName}
          </p>
          <p>
            <strong>Roll Number:</strong> {item.rollNumber}
          </p>
          <p>
            <strong>Email:</strong> {item.email}
          </p>
          <p>
            <strong>Phone:</strong> {item.phone}
          </p>
          <p>
            <strong>Semester:</strong> {item.semester}
          </p>
          <p>
            <strong>Document Type:</strong> {item.documentType}
          </p>
          <p>
            <strong>Status:</strong> {item.status}
          </p>
          <p>
            <strong>Notes:</strong> {item.notes || "-"}
          </p>
          <p>
            <strong>Reviewed At:</strong> {item.reviewedAt ? formatDate(item.reviewedAt) : "-"}
          </p>
        </div>
      </details>

      <div className="row" style={{ marginTop: 10 }}>
        <button className="button secondary tight" onClick={() => onReview(item.id, "approved")} disabled={item.status === "approved"}>
          Approve
        </button>
        <button className="button danger tight" onClick={() => onReview(item.id, "rejected")} disabled={item.status === "rejected"}>
          Reject
        </button>
        <button className="button tight" onClick={() => onGenerate(item.id)} disabled={item.status !== "approved"}>
          Generate PDF
        </button>
      </div>

      {item.pdfUrl ? (
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          PDF:{" "}
          <a className="download-link" href={item.pdfUrl} target="_blank" rel="noreferrer">
            Download
          </a>
        </p>
      ) : null}
    </div>
  );
}
