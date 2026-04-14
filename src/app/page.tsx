export default function HomePage() {
  return (
    <div className="card hero">
      <h1 className="section-title">Academic Document Generation Desk</h1>
      <p className="section-subtitle">
        The portal is now set up for an admin-first workflow: enter one student record, confirm the details in a popup, and generate the complete document bundle in one go.
      </p>
      <div className="hero-grid">
        <div className="hero-chip">
          <p className="hero-chip-title">Single Student Entry</p>
          <p className="hero-chip-copy">Admin staff enter the student profile once instead of handling separate request forms.</p>
        </div>
        <div className="hero-chip">
          <p className="hero-chip-title">Confirmation Popup</p>
          <p className="hero-chip-copy">The full record is shown before generation so the admin can cancel and fix any mistake.</p>
        </div>
        <div className="hero-chip">
          <p className="hero-chip-title">Four Documents Together</p>
          <p className="hero-chip-copy">Generate the bonafide, first-year dues letter, admission slip, and admission letter from the same data.</p>
        </div>
      </div>
    </div>
  );
}
