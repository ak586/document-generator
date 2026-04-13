export default function HomePage() {
  return (
    <div className="card hero">
      <h1 className="section-title">Pharma Academic Document Center</h1>
      <p className="section-subtitle">
        Students can request official certificates and transcript documents. Admin staff can verify submissions and generate PDF documents in a controlled review flow.
      </p>
      <div className="hero-grid">
        <div className="hero-chip">
          <p className="hero-chip-title">Student-Friendly Form</p>
          <p className="hero-chip-copy">Simple details collection designed for quick submissions.</p>
        </div>
        <div className="hero-chip">
          <p className="hero-chip-title">Admin Verification</p>
          <p className="hero-chip-copy">Review, approve, or reject requests with transparent status tracking.</p>
        </div>
        <div className="hero-chip">
          <p className="hero-chip-title">Template-based PDFs</p>
          <p className="hero-chip-copy">Generate college-standard documents using selected HTML templates.</p>
        </div>
      </div>
    </div>
  );
}
