// Enlace externo al sitio principal de GovBidder (fuera de esta app de certificados).
export default function GovBidderLink() {
  return (
    <a href="https://govbidder.net" target="_blank" rel="noopener noreferrer" className="nav-external">
      GovBidder.net
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M8 7H17V16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
