"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { AnimatedLogo } from "@/components/animated-logo"
import { Twitter, Instagram, Linkedin, CheckCircle2 } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-8 md:py-12 px-4 md:px-6 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Left Column */}
          <div className="space-y-4 md:space-y-6">
            <AnimatedLogo scale={0.9} />
            
            <p className="text-gray-600 max-w-md text-sm md:text-base">
              Slynk is an AI-powered platform that transforms static advertisements into engaging, 
              conversational experiences through intelligent personas.
            </p>
            
            <div className="flex gap-3 md:gap-4">
              <Link href="https://twitter.com" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <Twitter size={16} className="md:w-5 md:h-5" />
              </Link>
              <Link href="https://instagram.com" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <Instagram size={16} className="md:w-5 md:h-5" />
              </Link>
              <Link href="https://linkedin.com" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                <Linkedin size={16} className="md:w-5 md:h-5" />
              </Link>
            </div>
            
            <div className="flex items-center text-xs md:text-sm text-gray-500">
              <CheckCircle2 size={14} className="text-green-500 mr-2 md:w-4 md:h-4" />
              <span>All services are online</span>
            </div>
            
            <p className="text-xs md:text-sm text-gray-500">
              &copy; {currentYear} Slynk. All rights reserved.
            </p>
          </div>
          
          {/* Right Column */}
          <div className="grid grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-3 md:space-y-4">
              <h3 className="font-medium text-sm md:text-base text-gray-900">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-sm text-gray-600 hover:text-pink-500 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-gray-600 hover:text-pink-500 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              <h3 className="font-medium text-sm md:text-base text-gray-900">Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-sm text-gray-600 hover:text-pink-500 transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/create" className="text-sm text-gray-600 hover:text-pink-500 transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link href="/signin" className="text-sm text-gray-600 hover:text-pink-500 transition-colors">
                    Log in to Slynk
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Mobile-only bottom nav */}
        <div className="mt-8 pt-6 border-t border-gray-100 md:hidden">
          <nav className="flex justify-between items-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-pink-500">
              Home
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-pink-500">
              Dashboard
            </Link>
            <Link href="/create" className="text-sm text-gray-600 hover:text-pink-500">
              Create
            </Link>
            <Link href="/customers" className="text-sm text-gray-600 hover:text-pink-500">
              Customers
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}