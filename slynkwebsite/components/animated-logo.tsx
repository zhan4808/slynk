"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface AnimatedLogoProps {
  isAnimating?: boolean
  scale?: number
}

export function AnimatedLogo({ isAnimating = false, scale = 1 }: AnimatedLogoProps) {
  const [isHovered, setIsHovered] = useState(false)
  const shouldAnimate = isHovered || isAnimating
  
  // Scale transformations
  const containerSize = `${Math.round(8 * scale)}px`
  const innerSize = `${Math.round(6 * scale)}px`
  const glowSize = `${Math.round(4 * scale)}px`
  const fontSize = scale < 1 ? "text-lg" : "text-xl"
  
  return (
    <div className="inline-block">
      <motion.div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ 
          backgroundColor: "rgba(243, 244, 246, 0.8)" 
        }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Logo mark */}
        <motion.div 
          className="relative"
          style={{ width: containerSize, height: containerSize }}
        >
          {/* Background glow */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 blur-sm"
            animate={shouldAnimate ? {
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            } : {}}
            transition={{
              duration: 1.5,
              repeat: shouldAnimate ? Infinity : 0,
              ease: "easeInOut"
            }}
          />
          
          {/* Logo shape */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white flex items-center justify-center"
            animate={shouldAnimate ? { rotate: 360 } : {}}
            transition={{ duration: 10, repeat: shouldAnimate ? Infinity : 0, ease: "linear" }}
          >
            <motion.div
              className="rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500"
              style={{ width: innerSize, height: innerSize }}
              animate={shouldAnimate ? {
                background: [
                  "linear-gradient(to bottom right, rgb(236, 72, 153), rgb(168, 85, 247), rgb(99, 102, 241))",
                  "linear-gradient(to bottom right, rgb(99, 102, 241), rgb(236, 72, 153), rgb(168, 85, 247))",
                  "linear-gradient(to bottom right, rgb(168, 85, 247), rgb(99, 102, 241), rgb(236, 72, 153))",
                  "linear-gradient(to bottom right, rgb(236, 72, 153), rgb(168, 85, 247), rgb(99, 102, 241))"
                ]
              } : {}}
              transition={{ duration: 3, repeat: shouldAnimate ? Infinity : 0, ease: "linear" }}
            >
              <motion.div 
                className="absolute rounded-full bg-white/90"
                style={{ 
                  width: glowSize, 
                  height: glowSize,
                  top: `${Math.round(1 * scale)}px`,
                  left: `${Math.round(1 * scale)}px`
                }}
                animate={shouldAnimate ? { 
                  x: [0, 2 * scale, -2 * scale, 0],
                  y: [0, -2 * scale, 2 * scale, 0]
                } : {}}
                transition={{ 
                  duration: 2, 
                  repeat: shouldAnimate ? Infinity : 0,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
        
        {/* Logo text */}
        <div className={`${fontSize} font-bold text-gray-900`}>
          slynk
          <span className="text-pink-500 ml-[1px]">.</span>
        </div>
      </motion.div>
    </div>
  )
} 