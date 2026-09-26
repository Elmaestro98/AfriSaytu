import type { MetadataRoute } from "next"

// Web app manifest: AfriSaytu installs like an app on the agent's phone (home screen icon, full
// screen, no address bar). Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AfriSaytu",
    short_name: "AfriSaytu",
    description: "Le logiciel de caisse des agents de transfert d'argent : soldes, commissions, clôture journalière.",
    lang: "fr",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any", // agents on a phone, managers on a computer
    background_color: "#ffffff",
    theme_color: "#0B5D4B",
    categories: ["finance", "business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nouvelle opération", short_name: "Saisir", url: "/operations/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Caisse", url: "/cash", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  }
}
