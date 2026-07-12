import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-raleway",
});

export const metadata = {
  title: "GovBidder · Verificación de certificados",
  description: "Verificá el estado de un certificado emitido por GovBidder Academy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={raleway.variable}>
      <body>{children}</body>
    </html>
  );
}
