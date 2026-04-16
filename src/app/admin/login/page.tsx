"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      username: String(formData.get("username") || ""),
      password: String(formData.get("password") || "")
    };

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const nextPath = new URLSearchParams(window.location.search).get("next") || "/admin";
      window.location.assign(nextPath);
      return;
    }

    const data = await res.json().catch(() => ({}));
    setMessage(data.error || "Login failed.");
    setLoading(false);
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginInline: "auto" }}>
      <h1 className="section-title">Admin Login</h1>
      <p className="section-subtitle">Only authorized admin users can access the admin panel.</p>
      <form className="grid" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input id="username" name="username" className="input" placeholder="Enter admin username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" className="input" placeholder="Enter password" required />
        </div>
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      {message ? <p className="message">{message}</p> : null}
    </div>
  );
}
