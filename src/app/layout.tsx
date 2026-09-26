import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { ServiceWorker } from "@/components/business/service-worker";
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
  // Tab icon: app/favicon.ico and app/icon.png (square logo, transparent background).
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Installed on an iPhone: full screen, own name under the icon.
  appleWebApp: { capable: true, title: "AfriSaytu", statusBarStyle: "default" },
};

// Colour of the phone's status bar and of the installed app's title bar (#0B5D4B, brand primary).
export const viewport: Viewport = {
  themeColor: "#0B5D4B",
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
        <body className="min-h-full flex flex-col">
          {children}
          <ServiceWorker />
        </body>
      </html>
    </ClerkProvider>
  );
}
