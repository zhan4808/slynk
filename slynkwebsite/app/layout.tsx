import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import { Providers } from "./providers"
import { DynamicNavbar } from "@/components/dynamic-navbar"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://slynk.ai"),
  title: "Slynk | AI-Powered Interactive Advertisements",
  description: "Transform static ads into engaging, conversational experiences with AI-powered personas",
  keywords: ["AI", "advertising", "interactive ads", "conversational AI", "digital advertising"],
  authors: [{ name: "Slynk Team" }],
  creator: "Slynk",
  publisher: "Slynk",
  
  // Open Graph metadata for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Slynk",
    title: "Slynk | Conversational AI Advertising",
    description: "Create interactive video ads with AI personas that engage your audience through natural conversation",
    images: [
      {
        url: "/og/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Slynk - AI-Powered Interactive Advertising"
      }
    ]
  },
  
  // Twitter card
  twitter: {
    card: "summary_large_image",
    title: "Slynk | Conversational AI Advertising",
    description: "Create interactive video ads with AI personas that engage your audience through natural conversation",
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