"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FaGoogle } from "react-icons/fa"
import { Mail } from "lucide-react"
import Link from "next/link"
import { AnimatedLogo } from "@/components/animated-logo"
import { motion } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import { CircularSpinner } from "@/components/ui/circular-spinner"

// Separate component that uses useSearchParams
function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }
    
    try {
      setLoading(true)
      
      // Check if we're in mock mode
      const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
      
      if (isMockMode) {
        // In mock mode, use credentials provider
        const result = await signIn("credentials", {
          email,
          redirect: false,
          callbackUrl,
        })
        
        if (result?.error) {
          toast({
            title: "Sign in failed",
            description: result.error,
            variant: "destructive",
          })
          return
        }
        
        router.push(callbackUrl)
      } else {
        // In real mode, use email provider
        const result = await signIn("email", {
          email,
          redirect: false,
          callbackUrl,
        })
        
        if (result?.error) {
          toast({
            title: "Sign in failed",
            description: result.error,
            variant: "destructive",
          })
          return
        }
        
        router.push("/check-email")
      }
    } catch (err) {
      console.error("Sign in error:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      
      await signIn("google", {
        callbackUrl,
      })
    } catch (err) {
      console.error("Google sign in error:", err)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
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
          
          <motion.h2 
            className="mt-6 text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Sign in to your account
          </motion.h2>
          
          <motion.p 
            className="mt-2 text-sm text-gray-600"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Or{" "}
            <Link href="/" className="font-medium text-pink-600 hover:text-pink-500 underline decoration-2 decoration-pink-500/30 underline-offset-2 transition-all">
              go back to the homepage
            </Link>
          </motion.p>
        </div>

        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl border border-gray-100 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="space-y-6">
            {/* Google Sign in */}
            <motion.div
              whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full justify-center gap-2 bg-white text-gray-800 border border-gray-200 shadow-sm hover:shadow-md rounded-xl h-12"
              >
                {loading ? (
                  <CircularSpinner size="sm" variant="default" />
                ) : (
                  <FaGoogle className="text-red-500" />
                )}
                <span className="font-medium">{loading ? "Signing in..." : "Sign in with Google"}</span>
              </Button>
            </motion.div>

            <div className="relative flex items-center justify-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm px-3 rounded-full">Or continue with</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Email Sign in */}
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 shadow-sm bg-gray-50/80 focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all rounded-xl"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  {loading ? (
                    <CircularSpinner size="sm" variant="default" />
                  ) : (
                    "Sign in with Email"
                  )}
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
} 