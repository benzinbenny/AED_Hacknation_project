import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./source-catalog.css";

export const metadata: Metadata = {
  title: { default: "Punkt Życia — dane AED", template: "%s | Punkt Życia" },
  description: "Otwarty prototyp do zbierania, sprawdzania i przygotowania danych o defibrylatorach AED.",
  applicationName: "Punkt Życia",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body><a className="skip-link" href="#main-content">Przejdź do treści</a>{children}</body></html>;
}
