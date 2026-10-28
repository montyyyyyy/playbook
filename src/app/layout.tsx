import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "CX Playbook — Wissen, das weiterbringt",
    template: "%s · CX Playbook",
  },
  description:
    "Eine Knowledge- und Enablement-Plattform für SAP Customer Experience. Sprint 01 mit synthetischen Demo-Inhalten.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
