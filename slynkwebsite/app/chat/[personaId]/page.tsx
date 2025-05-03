"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, AlertTriangle, Home, LogOut, MessageSquare, Users } from "lucide-react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import SimliAgent from "@/components/SimliAgent"
import { Logo } from "@/components/logo"
import { DynamicNavbar } from "@/components/dynamic-navbar"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const personaId = params.personaId as string
  const [persona, setPersona] = useState<{
    id: string, 
    name: string, 
    description?: string,
    systemPrompt?: string,
    firstMessage?: string,
    faceId?: string,
    voice?: string,
    useCustomVoice?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session, status } = useSession()

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/signin?callbackUrl=/chat/${personaId}`)
    }
  }, [status, router, personaId])

  useEffect(() => {
    // Fetch persona details
    const fetchPersona = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/personas/${personaId}`)
        
        if (response.status === 401) {
          // Authentication error
          setError("You need to be signed in to access this AI persona.")
          return
        }
        
        if (response.status === 403) {
          // Permission error
          setError("You don't have permission to access this AI persona.")
          return
        }
        
        if (response.status === 404) {
          // Not found
          setError("This AI persona doesn't exist or has been deleted.")
          return
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch persona: ${response.status}`)
        }
        
        const data = await response.json()
        setPersona(data)
      } catch (error) {
        console.error("Error fetching persona:", error)
        setError("Failed to load AI persona. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (personaId && status === "authenticated") {
      fetchPersona()
    }
  }, [personaId, status])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  }

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm border border-gray-100">
          <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-pink-500 animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading conversation...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !persona) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-8 py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Unable to Load AI Persona</h2>
          <p className="text-red-500 mb-6">{error || "AI persona not found."}</p>
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="gap-2 rounded-full"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              Try Again
            </Button>
            <Link href="/dashboard">
              <Button className="gap-2 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:opacity-90">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
                  <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"></path>
                  <path d="M3 9h2"></path>
                  <path d="M19 9h2"></path>
                </svg>
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Generate System Prompt from persona description or use existing one
  const systemPrompt = persona.systemPrompt || 
    `You are a virtual spokesperson for ${persona.name}. ${persona.description || ''}. Keep your responses friendly, helpful, and concise.`

  // Generate First Message if not specified
  const firstMessage = persona.firstMessage || 
    `Hello! I'm ${persona.name}. How can I help you today?`

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <DynamicNavbar />
      <div className="flex-1 flex flex-col pt-20 md:pt-24">
        <div className="container mx-auto max-w-6xl px-4 pb-10">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800">
              {persona.name}
            </h1>
            
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full border border-gray-200 hover:border-gray-300 h-9 md:h-10 px-3 md:px-4">
                <ArrowLeft size={16} className="mr-1 md:mr-2" />
                <span className="text-sm md:text-base">Back</span>
              </Button>
            </Link>
          </div>
          
          <SimliAgent 
            personaId={personaId}
            personaData={{
              name: persona.name,
              systemPrompt: systemPrompt,
              firstMessage: firstMessage,
              faceId: persona.faceId,
              voice: persona.voice,
              useCustomVoice: persona.useCustomVoice
            }}
          />
        </div>
      </div>
    </div>
  )
} 