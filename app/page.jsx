"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidCertNumber } from "../lib/certNumber.js";

function TopBar() {
  return (
    <div className="topbar"><div className="wrap">
      <span className="logo">G</span>
      <span style={{ fontWeight: 500 }}>GovBidder Certificate Verification</span>
      <nav className="nav">
        <a href="#verify">Verify</a>
        <a href="#how">How it works</a>
        <a href="#security">Security</a>
        <a href="mailto:team@govbidder.net">Support</a>
      </nav>
    </div></div>
  );
}

export default function Home() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function submit(e) {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (!isValidCertNumber(code)) {
      setError("That does not look like a GovBidder certificate number. Numbers look like GBC-26G-0001.");
      return;
    }
    router.push(`/certificate/${encodeURIComponent(code)}`);
  }

  return (
    <main>
      <TopBar />
      <section className="hero" id="verify"><div className="wrap">
        <div className="eyebrow">Official verification portal</div>
        <h1>Verify a GovBidder Certificate</h1>
        <p>Confirm the current standing of a certificate issued through GovBidder training
        programs. Enter the certificate number exactly as it appears on the document.</p>
        <div className="card">
          <div className="label">Certificate number</div>
          <form className="searchbar" onSubmit={submit}>
            <input value={value} onChange={(e) => { setValue(e.target.value); setError(""); }}
                   placeholder="GBC-26G-0001" autoFocus />
            <button className="btn" type="submit">Verify certificate</button>
          </form>
          {error && <div style={{ color: "#b3261e", marginTop: 10, fontSize: 14 }}>{error}</div>}
          <div className="muted" style={{ marginTop: 10 }}>
            Numbers look like{" "}
            <a style={{ fontWeight: 600, cursor: "pointer" }}
               onClick={() => setValue("GBC-26G-0001")}>GBC-26G-0001</a>{" "}
            — select the example to fill the field.
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Verification is free, public, and requires no account.
          </div>
        </div>
      </div></section>

      <section className="section" id="how"><div className="wrap">
        <div className="kicker">Three steps</div>
        <h2>How verification works</h2>
        <p className="muted" style={{ maxWidth: 620 }}>
          Every certificate can be checked against GovBidder's official certificate registry —
          the record of certificates as issued.
        </p>
        <div className="steps">
          <div className="step"><div className="num">1</div><h3>One certificate, one code</h3>
            <p>Every certificate GovBidder issues carries a unique certificate number, printed on the document itself.</p></div>
          <div className="step"><div className="num">2</div><h3>Look it up here</h3>
            <p>Enter the number in the verifier above. Anyone holding or offered a certificate can check it — no account, no fee.</p></div>
          <div className="step"><div className="num">3</div><h3>The registry answers</h3>
            <p>The portal reports the certificate's current standing: valid, revoked, pending, or not on file.</p></div>
        </div>
      </div></section>

      <section className="section" id="security" style={{ background: "#fff" }}><div className="wrap">
        <div className="kicker">Security &amp; trust</div>
        <h2>What a verification tells you</h2>
        <div className="trust">
          <div className="item"><h3>Public by design</h3><p>Verification is open to everyone. You do not need an account, and the person checking never needs permission from the person who presented the certificate.</p></div>
          <div className="item"><h3>One source of record</h3><p>Lookups are answered from GovBidder's official certificate registry — the same record from which certificates are issued.</p></div>
          <div className="item"><h3>Clear statuses</h3><p>A certificate is reported as valid, revoked, pending, or not found — a technical problem is always presented as a technical problem.</p></div>
          <div className="item"><h3>What verification means</h3><p>A lookup confirms whether a number corresponds to a genuine record in the registry, and what its current standing is.</p></div>
        </div>
      </div></section>

      <footer className="foot"><div className="wrap">
        © 2026 GovBidder. All rights reserved. · Certificate statuses are reported from GovBidder's official registry.
      </div></footer>
    </main>
  );
}
