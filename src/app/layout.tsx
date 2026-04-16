import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "Om Sri Sai Academic Document Desk",
  description: "Admin-first academic document generation portal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="header-shell">
          <header className="site-header">
            <Link href="/" className="logo-link" aria-label="Om Sri Sai College of Paramedical and Sciences">
              <img src="/om-shri-collage-logo.png" alt="Om Sri Sai College of Paramedical and Sciences Logo" className="college-logo" />
            </Link>

            <nav className="top-nav">
              <Link className="top-nav-link active" href="/">
                Home
              </Link>
              <Link className="top-nav-link" href="/admin">
                Admin Desk
              </Link>
            </nav>

            <Link className="top-cta" href="/admin">
              Admin Login
            </Link>
          </header>
        </div>

        <div className="bg-shape bg-shape-one" />
        <div className="bg-shape bg-shape-two" />
        <div className="container">
          <div className="portal-topline">
            <p className="portal-eyebrow">Om Sri Sai College of Paramedical and Sciences</p>
            <Link className="portal-admin-link" href="/admin">
              Admin Login
            </Link>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
