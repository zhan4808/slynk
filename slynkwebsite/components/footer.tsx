"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { AnimatedLogo } from "@/components/animated-logo"
import { Twitter, Instagram, Linkedin, CheckCircle2 } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 px-6 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Column */}
          <div className="space-y-6">
            <AnimatedLogo />
            
            <p className="text-gray-600 max-w-md">
              Slynk is an AI-powered platform that transforms static advertisements into engaging, 
              conversational experiences through intelligent personas.
            </p>
            
            <div className="flex gap-4">
              <Link href="https://twitter.com" className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <Twitter size={18} />
              </Link>
              <Link href="https://instagram.com" className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <Instagram size={18} />
              </Link>
              <Link href="https://linkedin.com" className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <Linkedin size={18} />
              </Link>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <CheckCircle2 size={16} className="text-green-500 mr-2" />
              <span>All services are online</span>
            </div>
            
            <p className="text-sm text-gray-500">
              &copy; {currentYear} Slynk. All rights reserved.
            </p>
          </div>
          
          {/* Right Column */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-gray-600 hover:text-pink-500 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-600 hover:text-pink-500 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-gray-600 hover:text-pink-500 transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/create" className="text-gray-600 hover:text-pink-500 transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link href="/signin" className="text-gray-600 hover:text-pink-500 transition-colors">
                    Log in to Slynk
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}