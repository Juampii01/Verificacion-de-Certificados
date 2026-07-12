import "./globals.css";

export const metadata = {
  title: "GovBidder · Verificación de certificados",
  description: "Verificá el estado de un certificado emitido por GovBidder Academy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
