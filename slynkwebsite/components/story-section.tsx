"use client"
import { useInView } from "react-intersection-observer"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, ArrowRight, Calendar, Star, Award } from "lucide-react"
import { AnimatedIcon } from "@/components/animated-icon"
import Image from "next/image"

export function StorySection() {
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

  const timelineItems = [
    {
      year: "February 2025",
      title: "The Beginning",
      description: "Slynk was founded by a team of entrepreneurs who are passionate about creating meaningful connections between brands and consumers.",
      icon: Star,
      color: "text-indigo-500",
    },
    { 
      year: "March 2025", 
      title: "First Prototype", 
      description: "Developed our app more and continued to work on the platform.",
      icon: Calendar,
      color: "text-pink-500",
    },
    { 
      year: "April 2025", 
      title: "Launch", 
      description: "Expanded our services and launched the platform to the public.",
      icon: Award,
      color: "text-teal-500",
    },
  ]

  return (
    <section id="story" className="py-24 px-6 bg-white relative overflow-hidden">
      {/* Decorative gradients */}
      <motion.div 
        className="absolute w-96 h-96 rounded-full bg-indigo-100 opacity-20 blur-3xl top-1/4 -left-48"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-5xl mx-auto relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div 
            className="inline-block mb-4 p-2 rounded-xl bg-indigo-50"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <BookOpen className="h-6 w-6 text-indigo-500" />
          </motion.div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">
            Our <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">Journey</span>
          </h2>
          
          <p className="text-gray-600 max-w-2xl mx-auto text-lg mb-8">
            Building the future of interactive brand experiences, one innovation at a time
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {timelineItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
              whileHover={{ 
                y: -8,
                boxShadow: "0 20px 60px -15px rgba(0,0,0,0.1)", 
                transition: { duration: 0.3 }
              }}
              className="rounded-2xl overflow-hidden border border-gray-100 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${item.color.split('-')[1]}-50`}>
                  <item.icon className={item.color} size={20} />
                </div>
                <div className="text-sm font-medium text-gray-400">{item.year}</div>
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-gray-900">{item.title}</h3>
              
              <p className="text-gray-600 mb-5">{item.description}</p>
              
              <motion.div
                className={`inline-flex items-center text-sm font-medium ${item.color}`}
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span>Read more</span>
                <ArrowRight size={14} className="ml-1" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}