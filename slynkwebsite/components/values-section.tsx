"use client"

import { useInView } from "react-intersection-observer"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Lightbulb, Heart, Users, Zap } from "lucide-react"
import { AnimatedIcon } from "@/components/animated-icon"

export function ValuesSection() {
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

  const values = [
    {
      title: "Innovation",
      description: "Continuously pushing the boundaries of what's possible in digital advertising.",
      icon: Lightbulb,
      color: "pink",
      gradient: "from-pink-400 to-pink-600",
      delay: 0.2
    },
    {
      title: "Authenticity",
      description: "Ensuring that every virtual spokesperson genuinely represents the brand's voice and message.",
      icon: Heart,
      color: "indigo",
      gradient: "from-indigo-400 to-indigo-600",
      delay: 0.3
    },
    {
      title: "User-Centric Design",
      description: "Creating intuitive tools that empower businesses to craft compelling narratives effortlessly.",
      icon: Users,
      color: "teal",
      gradient: "from-teal-400 to-teal-600",
      delay: 0.4
    },
    {
      title: "Performance",
      description: "Building high-performance solutions that deliver results and exceed expectations.",
      icon: Zap,
      color: "amber",
      gradient: "from-amber-400 to-amber-600",
      delay: 0.5
    }
  ]

  return (
    <section id="values" className="py-24 px-6 bg-gray-50 relative overflow-hidden">
      {/* Background decorations */}
      <motion.div 
        className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-b from-pink-50/50 to-indigo-50/50 blur-3xl opacity-70"
        animate={{ 
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-6xl mx-auto relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">
            Our Core <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-600">Values</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            The principles that guide our innovation and shape our product
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: value.delay }}
              whileHover={{ 
                y: -5,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.1)",
              }}
              className="relative rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100"
            >
              <div className="absolute h-full w-1 bg-gradient-to-b" style={{ 
                background: `linear-gradient(to bottom, rgb(var(--color-${value.color}-400)), rgb(var(--color-${value.color}-600)))` 
              }} />
              
              <div className="relative z-10 p-6 pl-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${value.color}-50 text-${value.color}-500`}>
                    <value.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{value.title}</h3>
                </div>
                
                <p className="text-gray-600 pl-16">{value.description}</p>
                
                <motion.div 
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${value.gradient}`}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
