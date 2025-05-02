import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import { Providers } from "./providers"
import { DynamicNavbar } from "@/components/dynamic-navbar"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "slynk",
  description:
    "reimagining ads with live interactive videos",
  icons: {
    icon: "/slynkfavicon.svg",
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


import './globals.css'