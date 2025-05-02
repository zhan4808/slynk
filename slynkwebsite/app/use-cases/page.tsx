"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShineCard } from '@/components/ui/shine-border'
import { CheckCircle, ArrowRight, Monitor, Building, PenSquare, VideoIcon, MessageSquare, Users, Plus, MousePointer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

// Types for use cases
interface UseCase {
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number }>;
  keyPoints: string[];
}

interface UseCaseCardProps extends UseCase {
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export default function UseCasesPage() {
  const [hoveredCase, setHoveredCase] = useState<number | null>(null)
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white to-pink-50/30 pt-32 pb-20 px-6">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full bg-pink-400/10 blur-[120px]"
          style={{ top: '5%', left: '0%' }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-[100px]"
          style={{ bottom: '10%', right: '5%' }}
          animate={{ 
            scale: [1.1, 0.9, 1.1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
      </div>

      <motion.div 
        className="max-w-6xl mx-auto relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            className="flex justify-center items-center mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-indigo-500/20 flex items-center justify-center shadow-sm">
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                <MousePointer className="h-8 w-8 text-pink-500" />
              </motion.div>
            </div>
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-gray-900">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
              Transform
            </span>{" "}
            Marketing with AI
          </h1>
          <p className="text-gray-600 text-lg">
            Interactive AI personas for modern engagement
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {useCases.map((useCase, index) => (
            <UseCaseCard 
              key={index} 
              {...useCase} 
              index={index} 
              isHovered={hoveredCase === index}
              onHover={() => setHoveredCase(index)}
              onLeave={() => setHoveredCase(null)}
            />
          ))}
        </div>

        {/* CTA Section */}
        <motion.div 
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <ShineCard>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-2xl bg-gradient-to-br from-white to-gray-50">
              <div className="max-w-lg">
                <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
                <Link href="/create">
                  <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl mt-2">
                    Create Your First Persona
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <motion.div 
                className="w-40 h-40 relative"
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div 
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-300/30 to-purple-400/30 blur-xl"
                  animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plus className="w-16 h-16 text-pink-500" />
                </div>
              </motion.div>
            </div>
          </ShineCard>
        </motion.div>
      </motion.div>
    </div>
  )
}

// Use Case Card Component
function UseCaseCard({ title, description, icon: Icon, keyPoints, index, isHovered, onHover, onLeave }: UseCaseCardProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 25 },
        visible: { 
          opacity: 1, 
          y: 0,
        }
      }}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -8 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="h-full"
    >
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Card header with icon */}
        <div className="border-b border-gray-100 p-4 bg-gradient-to-r from-gray-50 to-white">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${getBgColor(index)}`}>
            <motion.div
              animate={isHovered ? { 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              } : {}}
              transition={{ duration: 0.5 }}
            >
              <Icon size={22} />
            </motion.div>
          </div>
        </div>
        
        {/* Card content */}
        <div className="p-5 flex-grow flex flex-col">
          <h3 className="text-lg font-bold mb-2 text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm mb-4 flex-grow">{description}</p>
          
          <div className="mt-auto">
            {keyPoints.map((point: string, i: number) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <CheckCircle className={`${getKeyPointColor(index)} h-4 w-4 flex-shrink-0`} />
                <span className="text-gray-700 text-xs">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Helper functions for colors
function getBgColor(index: number): string {
  const colors = [
    'bg-gradient-to-br from-pink-500 to-pink-600',      // Digital Advertising
    'bg-gradient-to-br from-purple-500 to-indigo-600',  // Corporate Training
    'bg-gradient-to-br from-blue-500 to-cyan-600',      // Content Marketing
    'bg-gradient-to-br from-orange-500 to-amber-600',   // Product Demos
    'bg-gradient-to-br from-teal-500 to-green-600',     // Customer Support
    'bg-gradient-to-br from-violet-500 to-fuchsia-600'  // Event Marketing
  ];
  return colors[index % colors.length];
}

function getKeyPointColor(index: number): string {
  const colors = [
    'text-pink-500',      // Digital Advertising
    'text-purple-500',    // Corporate Training
    'text-blue-500',      // Content Marketing
    'text-orange-500',    // Product Demos
    'text-teal-500',      // Customer Support
    'text-violet-500'     // Event Marketing
  ];
  return colors[index % colors.length];
}

// Use cases data - condensed
const useCases: UseCase[] = [
  {
    title: "Digital Advertising",
    description: "Transform static ads into interactive AI experiences",
    icon: Monitor,
    keyPoints: [
      "Higher conversion rates",
      "Measurable engagement",
      "Personalized experiences"
    ]
  },
  {
    title: "Corporate Training",
    description: "AI trainers for employee onboarding and skill development",
    icon: Building,
    keyPoints: [
      "Available 24/7",
      "Consistent delivery",
      "Interactive Q&A"
    ]
  },
  {
    title: "Content Marketing",
    description: "Conversational AI that brings your content to life",
    icon: PenSquare,
    keyPoints: [
      "Increased engagement",
      "Better information retention",
      "Personalized recommendations"
    ]
  },
  {
    title: "Product Demos",
    description: "Interactive showcases instead of static videos",
    icon: VideoIcon,
    keyPoints: [
      "Answer product questions",
      "Guide through features",
      "Reduce sales team workload"
    ]
  },
  {
    title: "Customer Support",
    description: "AI personas trained on your support documentation",
    icon: MessageSquare,
    keyPoints: [
      "24/7 availability",
      "Reduced ticket volume",
      "Consistent experience"
    ]
  },
  {
    title: "Event Marketing",
    description: "Interactive AI hosts for virtual events and conferences",
    icon: Users,
    keyPoints: [
      "Engaging experiences",
      "Personalized navigation",
      "Post-event followup"
    ]
  }
] 