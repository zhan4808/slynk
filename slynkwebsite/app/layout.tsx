import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import { Providers } from "./providers"
import { DynamicNavbar } from "@/components/dynamic-navbar"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://slynk.studio"),
  title: "slynk",
  description: "reimagining ads with live interaction",
  keywords: ["AI", "advertising", "interactive ads", "conversational AI", "digital advertising"],
  authors: [{ name: "Slynk Team" }],
  creator: "Slynk",
  publisher: "Slynk",
  
  // Open Graph metadata for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "slynk",
    title: "slynk",
    description: "reimagining ads with live interaction",
    images: [
      {
        url: "/og/social-preview.png",
        width: 1200,
        height: 630,
        alt: "slynk - reimagining ads with live interaction"
      }
    ]
  },
  
  // Twitter card
  twitter: {
    card: "summary_large_image",
    title: "slynk",
    description: "reimagining ads with live interaction",
    images: ["/og/social-preview.png"],
    creator: "@slynk"
  },
  
  icons: {
    icon: "/slynkfavicon.svg",
    shortcut: "/slynkfavicon.svg",
    apple: "/slynkfavicon.svg",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased overflow-x-hidden`}>
        <Providers>
          <DynamicNavbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}