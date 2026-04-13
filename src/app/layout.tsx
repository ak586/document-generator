import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "MPharma College Portal",
  description: "Student document request and admin review portal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-shape bg-shape-one" />
        <div className="bg-shape bg-shape-two" />
        <div className="container">
          <header className="site-header">
            <div>
              <p className="eyebrow">Academic Records</p>
              <h2 className="site-title">MPharma College Portal</h2>
            </div>
            <nav className="nav">
              <Link className="nav-link" href="/">
                Home
              </Link>
              <Link className="nav-link" href="/student">
                Student Form
              </Link>
              <Link className="nav-link" href="/admin">
                Admin Panel
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
