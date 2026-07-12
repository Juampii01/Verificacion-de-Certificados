"use client";
import { useState, useEffect } from "react";
import { t, LANG_COOKIE, DEFAULT_LANG } from "../../lib/i18n.jsx";
import LangToggle from "../LangToggle.jsx";

// Debe coincidir con MAX_NAME_LENGTH en lib/certificateRequests.js (no se importa acá
// porque ese módulo trae dependencias de servidor que no deben llegar al bundle del cliente).
const MAX_NAME_LENGTH = 45;

function TopBar({ lang }) {
  const s = t(lang);
  return (
    <div className="topbar"><div className="wrap">
      <a className="logo" href="/" style={{ textDecoration: "none" }}>G</a>
      <span style={{ fontWeight: 500 }}>{s.brand}</span>
      <nav className="nav">
        <a href="/">{s.verifyAnother}</a>
        <LangToggle lang={lang} />
      </nav>
    </div></div>
  );
}

export default function RequestCertificate() {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", full_name: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [lang, setLang] = useState(DEFAULT_LANG);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`${LANG_COOKIE}=(en|es)`));
    if (match) setLang(match[1]);
  }, []);

  const s = t(lang);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/certificate-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || s.charLimitError(MAX_NAME_LENGTH)); }
      else { setResult(j); }
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <main>
      <TopBar lang={lang} />
      <section className="hero"><div className="wrap">
        <div className="eyebrow">{s.requestEyebrow}</div>
        <h1>{s.requestTitle}</h1>
        <p>{s.requestIntro}</p>

        <div className="card">
          {result ? (
            <div>
              {result.status === "approved" ? (
                <>
                  <h2 style={{ color: "var(--navy)", margin: "0 0 8px" }}>{s.approvedTitle}</h2>
                  <p>{s.approvedBody(result.certificate_number, result.email_sent)}</p>
                </>
              ) : (
                <>
                  <h2 style={{ color: "var(--navy)", margin: "0 0 8px" }}>{s.pendingTitle}</h2>
                  <p>{s.pendingBody}</p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>{s.firstName}
                  <input value={form.first_name} onChange={set("first_name")} required />
                </label>
                <label>{s.lastName}
                  <input value={form.last_name} onChange={set("last_name")} required />
                </label>
                <label className="full">{s.email}
                  <input type="email" value={form.email} onChange={set("email")} required />
                </label>
                <label className="full">
                  {s.displayNameLabel}
                  <input
                    value={form.full_name}
                    onChange={set("full_name")}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder={s.displayNamePlaceholder}
                    required
                  />
                  <span className="muted">{s.charCount(form.full_name.length, MAX_NAME_LENGTH)}</span>
                </label>
              </div>
              {error && <div style={{ color: "var(--red)", marginTop: 10, fontSize: 14 }}>{error}</div>}
              <div style={{ marginTop: 16 }}>
                <button className="btn" style={{ padding: "12px 22px" }} disabled={busy}>
                  {busy ? s.sendingRequest : s.submitRequest}
                </button>
              </div>
            </form>
          )}
        </div>
      </div></section>
    </main>
  );
}
