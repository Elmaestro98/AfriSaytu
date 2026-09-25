import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

// Display face: headings and large amounts. Body face: everything else.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AfriSaytu",
  description:
    "Le logiciel de caisse des agents de transfert d'argent : soldes, commissions, clôture journalière.",
  icons: { icon: "/logo.png" },
};

// Clerk renders its own widgets: they receive the brand colour and fonts here.
// #0B5D4B mirrors --primary in globals.css.
const clerkAppearance = {
  variables: {
    colorPrimary: "#0B5D4B",
    colorText: "#14181F",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-body)",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="fr"
        className={`${display.variable} ${body.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
