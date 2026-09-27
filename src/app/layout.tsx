import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/business/navigation-progress";
import { ServiceWorker } from "@/components/business/service-worker";
import { Toaster } from "@/components/ui/sonner";
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

// iPhone launch screens: [CSS width, CSS height, pixel ratio] of each screen.
const SPLASH_SCREENS = (
  [
    [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3],
    [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
  ] as const
).map(([width, height, ratio]) => ({
  url: `/splash/splash-${width * ratio}x${height * ratio}.png`,
  media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
}));

export const metadata: Metadata = {
  title: "AfriSaytu",
  description:
    "Le logiciel de caisse des agents de transfert d'argent : soldes, commissions, clôture journalière.",
  // Tab icon: app/favicon.ico and app/icon.png (square logo, transparent background).
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Installed on an iPhone: full screen, own name under the icon, and a green launch screen
  // with the logo (public/splash, one image per iPhone screen size, portrait).
  appleWebApp: { capable: true, title: "AfriSaytu", statusBarStyle: "default", startupImage: SPLASH_SCREENS },
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
          {/* Reads the address: its own Suspense boundary, so no page waits for it. */}
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
          <Toaster />
          <ServiceWorker />
        </body>
      </html>
    </ClerkProvider>
  );
}
