import type { Metadata, Viewport } from "next";
import { Archivo, Doto, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { themeScript } from "@/components/ThemeToggle";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Society Treasury",
  description: "Membership passes, committee voting and spending records for student societies, built on NEAR.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1013" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${archivo.variable} ${doto.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved or system theme before first paint, so there's no flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
