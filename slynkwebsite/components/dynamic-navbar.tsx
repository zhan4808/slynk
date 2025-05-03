"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, useMotionValueEvent, useScroll, useMotionValue } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Menu, X } from "lucide-react"
import { AnimatedLogo } from "@/components/animated-logo"
import { useIsMobile } from "@/hooks/use-mobile"

interface NavItem {
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Customers", href: "/customers" },
  { label: "Use Cases", href: "/use-cases" },
]

// Animation variants for consistent transitions
const navContainerVariants = {
  expanded: { 
    y: 0, 
    opacity: 1,
    transition: { 
      duration: 0.4,
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  collapsed: { 
    y: -60, 
    opacity: 0,
    transition: { 
      duration: 0.3,
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
}

const navItemVariants = {
  expanded: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },
  collapsed: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  }
}

const pillVariants = {
  hidden: { y: -100, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 30,
      when: "beforeChildren"
    }
  }
}

// Mobile menu variants
const mobileMenuVariants = {
  closed: {
    opacity: 0,
    y: -20,
    transition: { 
      duration: 0.2,
      when: "afterChildren"
    }
  },
  open: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      when: "beforeChildren",
      staggerChildren: 0.05
    }
  }
}

const mobileNavItemVariants = {
  closed: { 
    opacity: 0, 
    y: -10, 
    transition: { duration: 0.1 } 
  },
  open: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.2 } 
  }
}

export function DynamicNavbar() {
  const [navState, setNavState] = useState<number>(0) // 0-1 range for transition
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { scrollY } = useScroll()
  const isMobile = useIsMobile()
  
  // Close mobile menu on navigation
  useEffect(() => {
    const handleRouteChange = () => {
      setMobileMenuOpen(false)
    }
    
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])
  
  // Create motion values for smooth transitions
  const navProgress = useMotionValue(0)
  
  // Track scroll position to update the navbar state with a smoother range
  useMotionValueEvent(scrollY, "change", (latest) => {
    // Start transition at 50px, complete at 200px (longer range)
    const scrollProgress = Math.min(Math.max((latest - 50) / 150, 0), 1)
    setNavState(scrollProgress)
    navProgress.set(scrollProgress)
  })

  // Use scrollY value to determine if we should show the pill navbar
  const shouldShowPill = navState > 0.8 && !mobileMenuOpen
  
  // Handle navigation
  const navigateTo = (path: string) => {
    router.push(path)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      {/* Top spread-out navigation when at top of page */}
      <motion.header 
        className="fixed top-0 left-0 w-full z-50 px-6 py-6"
        style={{ 
          opacity: 1 - navState,
          pointerEvents: navState > 0.9 ? "none" : "auto" 
        }}
        variants={navContainerVariants}
        initial="collapsed"
        animate={navState < 0.9 ? "expanded" : "collapsed"}
        key="spread-navbar"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo on the left */}
          <motion.div
            variants={navItemVariants}
            className="z-20"
          >
            <div className="cursor-pointer" onClick={() => navigateTo("/")}>
              <AnimatedLogo />
            </div>
          </motion.div>
          
          {/* Nav Links in center - desktop only */}
          {!isMobile && (
            <motion.div 
              variants={navItemVariants}
              className="z-10 absolute left-0 right-0 mx-auto flex justify-center"
            >
              <nav className="flex items-center space-x-8">
                {NAV_ITEMS.map((item, index) => (
                  <WideNavButton 
                    key={item.label}
                    label={item.label}
                    href={item.href}
                    index={index}
                  />
                ))}
              </nav>
            </motion.div>
          )}
          
          {/* Right side controls */}
          <motion.div
            variants={navItemVariants}
            className="z-20 flex items-center gap-2"
          >
            {/* Create Ad Button - Only on desktop */}
            {!isMobile && (
              <Button
                onClick={() => navigateTo("/create")}
                className="text-base font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 rounded-xl px-5 py-2 h-auto shadow-md shadow-pink-400/10 hover:shadow-pink-400/20 transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  <Plus size={18} />
                  <span>Create Ad</span>
                </span>
              </Button>
            )}
            
            {/* Mobile menu toggle button */}
            {isMobile && (
              <Button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-white/90 shadow-sm border border-gray-100"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className="fixed inset-0 z-40 bg-white pt-24 px-6"
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
          >
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              {NAV_ITEMS.map((item, i) => (
                <motion.div 
                  key={item.label}
                  variants={mobileNavItemVariants}
                  custom={i}
                >
                  <button
                    onClick={() => navigateTo(item.href)}
                    className="w-full py-4 px-4 text-left text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors flex items-center"
                  >
                    {item.label}
                  </button>
                </motion.div>
              ))}
              
              <motion.div 
                variants={mobileNavItemVariants}
                className="mt-4"
              >
                <Button
                  onClick={() => navigateTo("/create")}
                  className="w-full text-base font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 rounded-xl h-14 shadow-md shadow-pink-400/10 hover:shadow-pink-400/20 transition-all duration-300"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={18} />
                    <span>Create Ad</span>
                  </span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating pill navbar when scrolled - desktop */}
      <AnimatePresence>
        {shouldShowPill && !isMobile && (
          <motion.div 
            className="fixed top-6 left-0 w-full z-50 px-4 flex justify-center"
            style={{ opacity: navState }}
            variants={pillVariants}
            initial="hidden"
            animate="visible"
            exit={{ y: -100, opacity: 0, transition: { duration: 0.3 } }}
            key="pill-navbar"
          >
            <motion.div 
              className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-full shadow-xl px-6 py-3 flex items-center justify-between gap-6"
              initial={{ width: "60%" }}
              animate={{ width: "80%" }}
              transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
              style={{ maxWidth: "900px" }}
            >
              {/* Logo */}
              <motion.div
                className="cursor-pointer"
                onClick={() => navigateTo("/")}
              >
                <AnimatedLogo isAnimating={true} />
              </motion.div>
              
              {/* Nav Links */}
              <nav className="flex items-center space-x-6 mx-4">
                {NAV_ITEMS.map((item, index) => (
                  <PillNavButton
                    key={item.label}
                    label={item.label}
                    href={item.href}
                    index={index}
                  />
                ))}
              </nav>
              
              {/* Create Ad Button */}
              <motion.div>
                <Button
                  onClick={() => navigateTo("/create")}
                  className="text-base font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 rounded-full px-5 py-2 h-auto shadow-md hover:shadow-pink-400/20 hover:shadow-lg transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={18} />
                    <span>Create Ad</span>
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating compact navbar when scrolled - mobile */}
      <AnimatePresence>
        {shouldShowPill && isMobile && (
          <motion.div 
            className="fixed top-4 left-0 w-full z-50 px-4 flex justify-center"
            style={{ opacity: navState }}
            variants={pillVariants}
            initial="hidden"
            animate="visible"
            exit={{ y: -100, opacity: 0, transition: { duration: 0.3 } }}
            key="pill-navbar-mobile"
          >
            <motion.div 
              className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-full shadow-xl py-2 px-4 flex items-center justify-between"
              initial={{ width: "80%" }}
              animate={{ width: "90%" }}
              transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            >
              {/* Logo */}
              <motion.div
                className="cursor-pointer"
                onClick={() => navigateTo("/")}
              >
                <AnimatedLogo isAnimating={true} scale={1.2} />
              </motion.div>
              
              {/* Mobile menu button */}
              <Button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full bg-white/90 shadow-sm border border-gray-100"
              >
                <Menu size={18} />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Full-size navigation button for the spread-out navbar
function WideNavButton({ label, href, index }: { label: string, href: string, index: number }) {
  const router = useRouter()
  
  return (
    <motion.button
      onClick={() => router.push(href)}
      className="relative px-4 py-2 text-base font-medium text-gray-800 transition-all rounded-full hover:bg-gray-100/70"
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  )
}

// Compact navigation button for the pill navbar
function PillNavButton({ label, href, index }: { label: string, href: string, index: number }) {
  const router = useRouter()
  
  return (
    <motion.button
      onClick={() => router.push(href)}
      className="relative px-4 py-2 text-base font-medium text-gray-800 transition-all rounded-full hover:bg-gray-100/80"
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: { delay: 0.1 + (index * 0.05), duration: 0.3 }
      }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  )
} 