"use client"

import { Upload, Users, Eye, BarChart2, ArrowRight, ZapIcon, Layers, Globe } from "lucide-react"
import { useInView } from "react-intersection-observer"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AnimatedIcon } from "@/components/animated-icon"
import Link from "next/link"

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  useEffect(() => {
    if (inView) {
      setIsVisible(true)
    }
  }, [inView])

  const features = [
    {
      title: "Live Interaction",
      description: "Engage your audience with real-time, responsive AI personas that adapt to user behavior.",
      icon: Eye,
      color: "text-indigo-500",
      gradient: "from-indigo-500/20 to-indigo-500/5",
      delay: 0.1
    },
    {
      title: "Custom Ad Generation",
      description: "Create personalized, dynamic advertisements that speak directly to your target audience.",
      icon: Layers,
      color: "text-pink-500",
      gradient: "from-pink-500/20 to-pink-500/5",
      delay: 0.2
    },
    {
      title: "Deploy Everywhere",
      description: "Upload once, deploy across platforms. Seamlessly integrate with websites, social media, and more.",
      icon: Globe,
      color: "text-teal-500",
      gradient: "from-teal-500/20 to-teal-500/5",
      delay: 0.3
    }
  ]

  return (
    <section id="features" className="py-24 px-6 bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50" />

      {/* Decorative elements */}
      <motion.div 
        className="absolute w-64 h-64 rounded-full bg-pink-200 opacity-10 blur-3xl -top-20 -left-20"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div 
        className="absolute w-72 h-72 rounded-full bg-indigo-200 opacity-10 blur-3xl -bottom-20 -right-20"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="max-w-6xl mx-auto relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
            Transform Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-600">Digital Presence</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Our platform brings your content to life through AI-powered experiences
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: feature.delay }}
              whileHover={{ 
                y: -8,
                boxShadow: "0 20px 60px -15px rgba(0,0,0,0.1)",
                transition: { duration: 0.3 }
              }}
              className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${feature.gradient.replace('/20', '/60').replace('/5', '/40')}`} />
              
              <div className="p-8">
                <div className="mb-6 relative">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${feature.gradient.replace('/20', '/10').replace('/5', '/5')} ${feature.color}`}>
                    <feature.icon size={24} />
                  </div>
                  <motion.div 
                    className="absolute inset-0 rounded-xl opacity-0"
                    whileHover={{ opacity: 0.4, scale: 1.3 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                
                <p className="text-gray-600 mb-5">{feature.description}</p>
                
                <motion.div
                  className={`flex items-center gap-1 text-sm font-medium ${feature.color}`}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Link href="/customers" className="flex items-center gap-1.5">
                    <span>Learn more</span>
                    <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}