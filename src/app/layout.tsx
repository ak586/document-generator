import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "Om Sri Sai Pharmacy College of Education",
  description: "Student document request and admin review portal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="header-shell">
          <header className="site-header">
            <Link href="/" className="logo-link" aria-label="Om Sri Sai Pharmacy College of Education">
              <img src="/om-shri-collage-logo.png" alt="Om Sri Sai Pharmacy College of Education Logo" className="college-logo" />
            </Link>

            <nav className="top-nav">
              <Link className="top-nav-link active" href="/">
                Home
              </Link>
              <a className="top-nav-link" href="#">
                About Us
              </a>
              <a className="top-nav-link" href="#">
                Academic Program
              </a>
              <Link className="top-nav-link" href="/student">
                Admission
              </Link>
              <a className="top-nav-link" href="#">
                Placement
              </a>
              <a className="top-nav-link" href="#">
                Gallery
              </a>
              <a className="top-nav-link" href="#">
                Contact Us
              </a>
            </nav>

            <Link className="top-cta" href="/student">
              Enquiry
            </Link>
          </header>
        </div>

        <div className="bg-shape bg-shape-one" />
        <div className="bg-shape bg-shape-two" />
        <div className="container">
          <div className="portal-topline">
            <p className="portal-eyebrow">Om Sri Sai Pharmacy College of Education</p>
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
