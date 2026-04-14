import Link from "next/link";
import { FeeStructureManager } from "@/components/fee-structure-manager";

export default function FeeStructuresPage() {
  return (
    <div className="card admin-shell">
      <div className="admin-page-top">
        <div>
          <p className="portal-eyebrow" style={{ marginBottom: 8 }}>
            Admin Fee Desk
          </p>
          <h1 className="section-title" style={{ marginBottom: 8 }}>
            Manage Batch Fee Structures
          </h1>
          <p className="section-subtitle" style={{ maxWidth: 760 }}>
            Maintain batch-wise course fees here. You can keep the same fee for every year or define different values year by year.
          </p>
        </div>
        <div className="row">
          <Link className="button secondary tight" href="/admin">
            Back To Admin Desk
          </Link>
        </div>
      </div>

      <FeeStructureManager />
    </div>
  );
}
