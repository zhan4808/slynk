"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail, ArrowLeft } from "lucide-react"
import { AnimatedLogo } from "@/components/animated-logo"
import { motion } from "framer-motion"

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white via-purple-50 to-pink-50 p-6">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 24 
        }}
      >
        <div className="text-center mb-8">
          <motion.div 
            className="mx-auto flex justify-center mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 17,
              delay: 0.2
            }}
          >
            <AnimatedLogo isAnimating={true} />
          </motion.div>
        </div>
        
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl border border-gray-100 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div 
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-pink-100 to-purple-100"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Mail className="h-8 w-8 text-pink-600" />
            </motion.div>
            
            <motion.h1 
              className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              Check your email
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-gray-600">
                A sign-in link has been sent to your email address.
              </p>
              <p className="mt-1 text-gray-600">
                Please check your inbox and click the link to sign in.
              </p>
            </motion.div>
          </div>

          <motion.div 
            className="mt-6 space-y-4"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    The email might take a few minutes to arrive. Be sure to check your spam folder.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <motion.div
                whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Link href="/signin">
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl h-12 border-gray-200"
                  >
                    <ArrowLeft size={16} />
                    Back to sign in
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
} 