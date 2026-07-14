"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isValidCertNumber } from "../lib/certNumber.js";
import { t, LANG_COOKIE, DEFAULT_LANG } from "../lib/i18n.jsx";
import LangToggle from "./LangToggle.jsx";
import GovBidderLink from "./GovBidderLink.jsx";

function TopBar({ lang }) {
  const s = t(lang);
  return (
    <div className="topbar"><div className="wrap">
      <img src="/logo.png" alt="GovBidder" className="logo" />
      <span style={{ fontWeight: 500 }}>{s.brand}</span>
      <nav className="nav">
        <a href="#verify">{s.nav.verify}</a>
        <a href="#how">{s.nav.how}</a>
        <a href="#security">{s.nav.security}</a>
        <a href="mailto:team@govbidder.net">{s.nav.support}</a>
        <GovBidderLink />
        <LangToggle lang={lang} />
      </nav>
    </div></div>
  );
}

export default function Home() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [lang, setLang] = useState(DEFAULT_LANG);
  const router = useRouter();

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`${LANG_COOKIE}=(en|es)`));
    if (match) setLang(match[1]);
  }, []);

  const s = t(lang);

  function submit(e) {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (!isValidCertNumber(code)) {
      setError(s.invalidNumber);
      return;
    }
    router.push(`/certificate/${encodeURIComponent(code)}`);
  }

  return (
    <main>
      <TopBar lang={lang} />
      <section className="hero" id="verify"><div className="wrap">
        <div className="eyebrow">{s.officialPortal}</div>
        <h1>{s.homeTitle}</h1>
        <p>{s.homeIntro}</p>
        <div className="card">
          <div className="label">{s.certNumberLabel}</div>
          <form className="searchbar" onSubmit={submit}>
            <input value={value} onChange={(e) => { setValue(e.target.value); setError(""); }}
                   placeholder="GBC-26G-0001" autoFocus />
            <button className="btn" type="submit">{s.verifyBtn}</button>
          </form>
          {error && <div style={{ color: "var(--red)", marginTop: 10, fontSize: 14 }}>{error}</div>}
          <div className="muted" style={{ marginTop: 10 }}>
            {s.exampleHint(
              <a style={{ fontWeight: 600, cursor: "pointer" }}
                 onClick={() => setValue("GBC-26G-0001")}>GBC-26G-0001</a>
            )}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            {s.freeHint}
          </div>
        </div>
      </div></section>

      <section className="section" id="how"><div className="wrap">
        <div className="kicker">{s.threeSteps}</div>
        <h2>{s.howItWorks}</h2>
        <p className="muted" style={{ maxWidth: 620 }}>{s.howItWorksIntro}</p>
        <div className="steps">
          <div className="step"><div className="num">1</div><h3>{s.step1Title}</h3><p>{s.step1Body}</p></div>
          <div className="step"><div className="num">2</div><h3>{s.step2Title}</h3><p>{s.step2Body}</p></div>
          <div className="step"><div className="num">3</div><h3>{s.step3Title}</h3><p>{s.step3Body}</p></div>
        </div>
      </div></section>

      <section className="section" id="security" style={{ background: "#fff" }}><div className="wrap">
        <div className="kicker">{s.securityTrust}</div>
        <h2>{s.whatVerificationTells}</h2>
        <div className="trust">
          <div className="item"><h3>{s.trust1Title}</h3><p>{s.trust1Body}</p></div>
          <div className="item"><h3>{s.trust2Title}</h3><p>{s.trust2Body}</p></div>
          <div className="item"><h3>{s.trust3Title}</h3><p>{s.trust3Body}</p></div>
          <div className="item"><h3>{s.trust4Title}</h3><p>{s.trust4Body}</p></div>
        </div>
      </div></section>

      <footer className="foot"><div className="wrap">{s.footer}</div></footer>
    </main>
  );
}
