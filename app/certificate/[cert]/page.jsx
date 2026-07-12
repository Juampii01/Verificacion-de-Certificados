// Página única de verificación. El número viene en la URL:
//   /certificate/GBC-26G-0001
import { cookies } from "next/headers";
import { publicClient } from "../../../lib/supabase.js";
import { t, LANG_COOKIE, DEFAULT_LANG } from "../../../lib/i18n.jsx";
import SendEmailButton from "./SendEmailButton.jsx";
import LangToggle from "../../LangToggle.jsx";

export const dynamic = "force-dynamic";

function maskEmail(email) {
  if (!email) return null;
  return email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
}

function fmtDate(d, lang) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch { return String(d); }
}

function TopBar({ lang }) {
  return (
    <div className="topbar"><div className="wrap">
      <a className="logo" href="/" style={{ textDecoration: "none" }}>G</a>
      <span style={{ fontWeight: 500 }}>{t(lang).brand}</span>
      <nav className="nav">
        <a href="/">{t(lang).verifyAnother}</a>
        <LangToggle lang={lang} />
      </nav>
    </div></div>
  );
}

function Seal() {
  // Sin año en la imagen (se sacó a propósito): el mismo archivo sirve para
  // siempre, no hay que regenerarlo cada 1 de enero.
  return (
    <img src="/verified.png" alt="GovBidder Verified" width={130} height={130} style={{ width: 130, height: 130 }} />
  );
}

export default async function CertificatePage({ params }) {
  const number = decodeURIComponent(params.cert).toUpperCase();
  const lang = cookies().get(LANG_COOKIE)?.value === "es" ? "es" : DEFAULT_LANG;
  const s = t(lang);

  const STATUS = {
    active:  { cls: "status-valid",   title: s.statusValid,     sub: s.statusValidSub,     check: true },
    revoked: { cls: "status-bad",     title: s.statusRevoked,   sub: s.statusRevokedSub },
    pending: { cls: "status-pending", title: s.statusPending,   sub: s.statusPendingSub },
  };

  const supabase = publicClient();
  const { data: cert } = await supabase
    .from("certificates").select("*").eq("certificate_number", number).single();

  return (
    <>
      <TopBar lang={lang} />
      <section className="hero"><div className="wrap">
        <div className="eyebrow">{s.officialPortal}</div>
        <h1 style={{ fontSize: 28 }}>{s.verificationResult}</h1>
      </div></section>

      <div className="result">
        {!cert ? (
          <div className="panel">
            <div className="status-nf"><h2>{s.statusNotFound}</h2>
              <div className="muted">{s.statusNotFoundSub}</div></div>
            <div className="body"><div className="fields">
              <p>{s.notFoundBody(number)}</p>
              <p className="muted">{s.notFoundHint}</p>
              <p><a href="/">{s.tryAnother}</a></p>
            </div></div>
          </div>
        ) : (() => {
          const st = STATUS[cert.status] || STATUS.active;
          return (
            <div className="panel">
              <div className={st.cls}>
                <h2>{st.check && <span className="check">✓</span>}{st.title}</h2>
                <div className="muted">{st.sub}</div>
              </div>
              <div className="body">
                <div className="fields">
                  <div className="label">{s.awardedTo}</div>
                  <div className="name">{cert.full_name || `${cert.first_name || ""} ${cert.last_name || ""}`.trim()}</div>
                  <div className="grid">
                    <div className="field"><div className="label">{s.program}</div><div className="val">{cert.program || "-"}</div></div>
                    <div className="field"><div className="label">{s.certificateType}</div><div className="val">{cert.certificate_type || "-"}</div></div>
                    <div className="field"><div className="label">{s.completedOn}</div><div className="val">{fmtDate(cert.issue_date, lang)}</div></div>
                    <div className="field"><div className="label">{s.hoursCompleted}</div><div className="val">{cert.hours ? `${cert.hours} ${s.hoursSuffix}` : "-"}</div></div>
                    <div className="field"><div className="label">{s.issuedBy}</div><div className="val">{cert.issued_by || "-"}</div></div>
                    <div className="field"><div className="label">{s.signedBy}</div><div className="val">{cert.signed_by || "-"}</div></div>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    {cert.email ? (
                      <SendEmailButton certificateNumber={cert.certificate_number} maskedEmail={maskEmail(cert.email)} lang={lang} />
                    ) : (
                      <p className="muted">{s.noEmailOnFile}</p>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Seal />
                  <div className="certno">
                    <div className="label">{s.certificateNo}</div>
                    <div style={{ fontWeight: 700, color: "var(--navy)" }}>{cert.certificate_number}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}
