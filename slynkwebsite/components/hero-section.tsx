"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ShineBorder } from "@/components/ui/shine-border"
import { Sparkles, ArrowRight, MousePointer2, Play, Zap } from "lucide-react"
import Link from "next/link"
import { AnimatedText } from "@/components/animated-text"
import { AnimatedEmojiBackground } from "@/components/animated-emoji-background"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedLogo } from "@/components/animated-logo"
import dynamic from "next/dynamic"
import { DEFAULT_FACE_ID } from "@/lib/simli-api"

// Dynamically import SimliAgent to avoid SSR issues
const SimliAgent = dynamic(() => import("@/components/SimliAgent"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video rounded-2xl bg-gradient-to-r from-pink-100 to-purple-100 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span>Loading interactive demo...</span>
      </div>
    </div>
  )
})

export function HeroSection() {
  const [isVideoHovered, setIsVideoHovered] = useState(false)
  const [showLiveDemo, setShowLiveDemo] = useState(false)

  return (
    <section className="relative min-h-screen pt-32 pb-16 overflow-hidden bg-gradient-to-b from-white to-pink-50/30">
      <AnimatedEmojiBackground />

      <ShineBorder className="relative z-10 max-w-6xl mx-auto px-6" borderClassName="rounded-2xl overflow-hidden">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-gray-900">
              Bring Your{" "}
              <span className="relative inline-block">
                <span className="animate-pulse-glow bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-pink-600">
                  <AnimatedText 
                    words={["Brand", "Ads", "Conference"]} 
                    typingSpeed={100} 
                    deletingSpeed={60} 
                    delayBetweenWords={2500} 
                  />
                </span>
                <motion.span 
                  className="absolute -inset-1 bg-pink-400/20 blur-lg rounded-lg"
                  animate={{ 
                    opacity: [0.3, 0.7, 0.3],
                    scale: [0.95, 1.05, 0.95], 
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                ></motion.span>
              </span>{" "}
              to Life
              <br />
              with AI personas
            </h1>
            <div className="flex justify-center mt-6 mb-6">
              <AnimatedLogo isAnimating={true} />
            </div>
          </motion.div>
          
          <motion.p 
            className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Transform static advertisements into engaging, conversational experiences. Upload your content and let our
            AI-driven avatars tell your story.
          </motion.p>
          
          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Attention-grabbing floating elements */}
            <motion.div
              className="absolute -top-8 -right-8 text-pink-500 hidden md:block pointer-events-none"
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <MousePointer2 className="h-6 w-6" />
              <motion.div 
                className="absolute h-12 w-12 border-2 border-dashed border-pink-300 rounded-full -inset-3"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            
            <motion.div
              className="absolute -top-10 left-10 hidden md:block pointer-events-none"
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            >
              <Sparkles className="h-6 w-6 text-purple-500" />
            </motion.div>

            <Link href="/create" className="relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button className="h-14 px-8 text-base font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 rounded-xl transition-all shadow-md hover:shadow-pink-400/20 hover:shadow-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            </Link>

            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Animated gradient border */}
                <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 opacity-75 blur-sm animate-border-flow pointer-events-none"></div>
                
                <Link href="/live-demo" passHref legacyBehavior>
                  <Button
                    className="relative h-14 px-8 text-base font-medium gap-2 bg-white/90 backdrop-blur-sm text-purple-600 rounded-xl transition-all shadow-xl hover:shadow-purple-400/20 hover:shadow-lg border-none hover:bg-white"
                  >
                    <Play className="w-5 h-5" />
                    Try Live Demo
                  </Button>
                </Link>
                
                {/* Subtle pulse animation around the button */}
                <motion.div 
                  className="absolute -inset-4 rounded-3xl border border-purple-200/40 pointer-events-none"
                  animate={{ 
                    scale: [1, 1.01, 1],
                    opacity: [0.2, 0.3, 0.2]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Live Interactive Demo */}
          <AnimatePresence>
            {showLiveDemo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-12"
              >
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-200">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 Live Demo</h3>
                    <p className="text-gray-600 text-sm">
                      Talk with our AI persona in real-time
                    </p>
                  </div>
                  
                  <ShineBorder className="relative mx-auto max-w-md" borderClassName="rounded-2xl overflow-hidden">
                    <div className="aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
                      <SimliAgent 
                        personaId="default"
                        personaData={{
                          name: "Demo Assistant",
                          systemPrompt: "You are a demo assistant for Slynk. Be engaging and concise. Keep responses under 20 words.",
                          firstMessage: "Hi! I'm a live demo of Slynk's AI technology. Try talking to me!",
                          faceId: DEFAULT_FACE_ID,
                          voice: "default",
                          personaType: "default"
                        }}
                        onStart={() => console.log("Demo started")}
                        onClose={() => console.log("Demo closed")}
                      />
                    </div>
                  </ShineBorder>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Demo Video Section */}
        <ShineBorder className="relative mx-auto" borderClassName="rounded-2xl overflow-hidden pink-glow" id="demo-video">
          <motion.div 
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div 
              className="aspect-video rounded-2xl overflow-hidden relative bg-gradient-to-r from-pink-100 to-purple-100"
              onMouseEnter={() => setIsVideoHovered(true)}
              onMouseLeave={() => setIsVideoHovered(false)}
            >
              <iframe
                src="https://www.youtube-nocookie.com/embed/ay2a3qXnbzo?autoplay=1&mute=1&loop=1&playlist=ay2a3qXnbzo&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3"
                title="Slynk Demo Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-2xl"
                style={{ border: 'none' }}
              ></iframe>
            </div>
          </motion.div>
        </ShineBorder>
      </ShineBorder>
    </section>
  )
}
