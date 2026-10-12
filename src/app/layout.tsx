import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RankedGG",
  description:
    "Progreso de gimnasio con rangos RPG, de Madera a Mr Olympia, comparado con estándares mundiales.",
  applicationName: "RankedGG",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RankedGG",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#05060a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="relative min-h-full overflow-x-hidden bg-background text-foreground">
        <div className="orb top-[-80px] left-[-40px] h-56 w-56 bg-sky-500/25" />
        <div className="orb right-[-60px] bottom-[20%] h-64 w-64 bg-violet-500/20" />
        <div className="orb bottom-[-40px] left-[20%] h-48 w-48 bg-amber-400/12" />
        {children}
      </body>
    </html>
  );
}
