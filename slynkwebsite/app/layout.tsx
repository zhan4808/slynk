import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import { Providers } from "./providers"
import { DynamicNavbar } from "@/components/dynamic-navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "slynk",
  description:
    "reimagining ads with live interactive videos",
  icons: {
    icon: "/slynkfavicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <Providers>
          <DynamicNavbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}


import './globals.css'