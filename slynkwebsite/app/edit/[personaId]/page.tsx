"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { 
  Loader2, ArrowLeft, Save, Upload, Check, Play, X,
  Mic, Image as ImageIcon, UserRound, Sparkles
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { AnimatedInput } from "@/components/create/animated-input"
import { FileDropZone } from "@/components/create/file-drop-zone"
import { QATable } from "@/components/create/qa-table"
import { motion } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { generateFaceId, generateVideoPreview } from "@/lib/simli-api"
import { CircularSpinner } from "@/components/ui/circular-spinner"
import { Spinner } from "@/components/ui/spinner"
import { DynamicNavbar } from "@/components/dynamic-navbar"
import { elevenLabsVoices, DEFAULT_VOICE } from '@/lib/voice-options'

interface PersonaData {
  id: string
  name: string
  description: string
  pageLink?: string
  adImage?: File | null
  voiceSample?: File | null
  systemPrompt?: string
  firstMessage?: string
  faceId?: string
  voice?: string
  qaPairs: Array<{
    id: string
    question: string
    answer: string
  }>
}

export default function EditPersonaPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [persona, setPersona] = useState<PersonaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isGeneratingFace, setIsGeneratingFace] = useState(false)
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
  const [videoPreview, setVideoPreview] = useState<{hlsUrl: string, mp4Url: string} | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // If not authenticated, redirect to sign-in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin")
    }
  }, [status, router])
  
  // Auto advance steps when criteria are met
  useEffect(() => {
    if (persona?.name && persona?.description && activeStep === 1) {
      setActiveStep(2)
    }
    if (persona?.faceId && activeStep === 2) {
      setActiveStep(3)
    }
  }, [persona?.name, persona?.description, persona?.faceId, activeStep])

  // Fetch persona data
  useEffect(() => {
    const fetchPersona = async () => {
      if (status !== "authenticated" || !params.personaId) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/personas/${params.personaId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Persona not found")
          } else {
            throw new Error(`Error fetching persona: ${response.status}`)
          }
        }
        
        const data = await response.json()
        setPersona({
          id: data.id,
          name: data.name || data.productName,
          description: data.description,
          pageLink: data.pageLink,
          faceId: data.faceId,
          systemPrompt: data.systemPrompt,
          firstMessage: data.firstMessage,
          voice: data.voice || DEFAULT_VOICE,
          qaPairs: data.qaPairs || []
        })
      } catch (error) {
        console.error("Error fetching persona:", error)
        setError(error instanceof Error ? error.message : "Failed to load persona")
      } finally {
        setLoading(false)
      }
    }

    fetchPersona()
  }, [params.personaId, status])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPersona((prev) => prev ? { ...prev, [name]: value } : null)
  }

  const handleVoiceChange = (value: string) => {
    setPersona((prev) => prev ? { ...prev, voice: value } : null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateFaceId = async () => {
    if (!image) {
      setError("Please upload an image first")
      return
    }
    
    setIsGeneratingFace(true)
    setError(null)
    
    try {
      // Attempt to generate a face ID
      let faceId: string
      try {
        console.log("Generating face ID from uploaded image...")
        const result = await generateFaceId(image, persona?.name || "unnamed_persona")
        faceId = result.faceId
        console.log("Successfully generated face ID:", faceId)
      } catch (e) {
        console.error("Error generating face ID, using default:", e)
        // Use default face ID if generation fails
        faceId = "tmp9i8bbq7c"
      }
      
      setPersona(prev => prev ? { ...prev, faceId } : null)
    } catch (error) {
      console.error("Error generating face ID:", error)
      setError(error instanceof Error ? error.message : "Failed to generate face")
      
      // Set a default face ID even if there's an error
      setPersona(prev => prev ? { ...prev, faceId: "tmp9i8bbq7c" } : null)
    } finally {
      setIsGeneratingFace(false)
    }
  }
  
  const handleGenerateAvatar = async () => {
    // Use default Face ID for avatar generation
    setIsGeneratingAvatar(true)
    setError(null)
    
    try {
      // In production, you would call a different API endpoint for avatar generation
      // For now, we'll use the default face ID
      setPersona(prev => prev ? { ...prev, faceId: "tmp9i8bbq7c" } : null)
    } catch (error) {
      console.error("Error generating avatar:", error)
      setError(error instanceof Error ? error.message : "Failed to generate avatar")
    } finally {
      setIsGeneratingAvatar(false)
    }
  }
  
  const handleGeneratePreview = async () => {
    if (!persona?.faceId) {
      setError("Please generate a face ID or avatar first")
      return
    }
    
    const previewText = persona.firstMessage || 
      `Hello, I'm ${persona.name || "your AI assistant"}. How can I help you today?`
    
    setIsGeneratingPreview(true)
    setError(null)
    
    try {
      const preview = await generateVideoPreview(previewText, persona.faceId)
      setVideoPreview(preview)
    } catch (error) {
      console.error("Error generating preview:", error)
      setError(error instanceof Error ? error.message : "Failed to generate preview")
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleFileChange = (field: "adImage" | "voiceSample", file: File | null) => {
    setPersona((prev) => prev ? { ...prev, [field]: file } : null)
  }

  const handleQAPairsChange = (qaPairs: Array<{ id: string; question: string; answer: string }>) => {
    setPersona((prev) => prev ? { ...prev, qaPairs } : null)
  }

  const handleSave = async () => {
    if (!persona) return
    
    setSaving(true)
    setError(null)
    
    try {
      // Prepare data for API request
      const formData = new FormData()
      formData.append("name", persona.name)
      formData.append("description", persona.description)
      
      if (persona.systemPrompt) {
        formData.append("systemPrompt", persona.systemPrompt)
      }
      
      if (persona.firstMessage) {
        formData.append("firstMessage", persona.firstMessage)
      }
      
      if (persona.faceId) {
        formData.append("faceId", persona.faceId)
      }
      
      if (persona.voice) {
        formData.append("voice", persona.voice)
      }
      
      if (persona.pageLink) {
        formData.append("pageLink", persona.pageLink)
      }
      
      if (persona.qaPairs && persona.qaPairs.length > 0) {
        formData.append("qaPairs", JSON.stringify(persona.qaPairs))
      }
      
      if (image) {
        formData.append("image", image)
      }
      
      if (persona.adImage) {
        formData.append("adImage", persona.adImage)
      }
      
      if (persona.voiceSample) {
        formData.append("voiceSample", persona.voiceSample)
      }
      
      // Send update request
      const response = await fetch(`/api/personas/${persona.id}`, {
        method: "PUT",
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update persona: ${response.status}`)
      }
      
      toast({
        title: "Success",
        description: "Persona updated successfully",
      })
      
      router.push("/dashboard")
    } catch (error) {
      console.error("Error saving persona:", error)
      setError(error instanceof Error ? error.message : "Failed to save persona")
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save persona",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Generate preview button component
  const GeneratePreviewButton = () => (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <Button
        onClick={handleGeneratePreview}
        disabled={isGeneratingPreview || !persona?.faceId}
        className={`gap-2 ${persona?.faceId ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} shadow-md hover:shadow-lg rounded-xl transition-all`}
      >
        {isGeneratingPreview ? (
          <>
            <CircularSpinner size="sm" variant="gradient" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span>Generate Preview</span>
          </>
        )}
      </Button>
    </motion.div>
  )

  // Save button component
  const SaveButton = () => (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <Button
        onClick={handleSave}
        disabled={saving || !persona?.name || !persona?.description}
        className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md hover:shadow-lg rounded-xl"
      >
        {saving ? (
          <>
            <CircularSpinner size="sm" variant="gradient" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </>
        )}
      </Button>
    </motion.div>
  )

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          }}
        >
          <CircularSpinner size="lg" variant="gradient" label="Loading persona..." />
        </motion.div>
      </div>
    )
  }
  
  // Error state
  if (error && !persona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <DynamicNavbar />
        <div className="container mx-auto max-w-4xl px-4 pt-24 pb-12">
          <motion.div 
            className="bg-white p-8 rounded-2xl shadow-md text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="mb-6 text-red-500">
              <X className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Error Loading Persona</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/dashboard">
                <Button className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md hover:shadow-lg rounded-xl">
                  <ArrowLeft className="h-4 w-4" />
                  Return to Dashboard
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!persona) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg bg-yellow-50 p-4 text-yellow-700">
          No persona data available.
        </div>
        <div className="mt-4">
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DynamicNavbar />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <CircularSpinner size="lg" variant="default" />
          </div>
        ) : error ? (
          <div className="text-center p-8 border rounded-lg shadow-sm bg-white">
            <div className="text-red-500 font-medium mb-2">Error</div>
            <div className="text-gray-700">{error}</div>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        ) : persona ? (
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  className="h-9 w-9 shrink-0"
                >
                  <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                  </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Edit Persona</h1>
              </div>
              <SaveButton />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic Information Section */}
              <motion.div 
                className="md:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium">Basic Information</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Persona Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      value={persona.name}
                      onChange={handleInputChange}
                      placeholder="Enter a name for your persona"
                      className="block w-full rounded-lg border border-gray-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={persona.description}
                      onChange={handleInputChange}
                      placeholder="Describe your persona in a few sentences"
                      rows={3}
                      className="block w-full rounded-lg border border-gray-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700">
                      System Prompt
                    </label>
                    <textarea
                      id="systemPrompt"
                      name="systemPrompt"
                      value={persona.systemPrompt || ""}
                      onChange={handleInputChange}
                      placeholder="Instructions for how the AI should behave"
                      rows={3}
                      className="block w-full rounded-lg border border-gray-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="firstMessage" className="block text-sm font-medium text-gray-700">
                      First Message
                    </label>
                    <textarea
                      id="firstMessage"
                      name="firstMessage"
                      value={persona.firstMessage || ""}
                      onChange={handleInputChange}
                      placeholder="The first message the AI will say to users"
                      rows={3}
                      className="block w-full rounded-lg border border-gray-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Appearance & Voice Section */}
              <motion.div 
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium">Appearance & Voice</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Avatar
                    </label>
                    
                    {/* Image Upload */}
                    <div className="flex flex-col items-center gap-4">
                      {persona.faceId && !previewImage ? (
                        <div className="relative rounded-xl overflow-hidden w-32 h-32 border border-gray-200">
                          <img 
                            src={`https://simli.ai/api/avatars/${persona.faceId}/image.jpg`} 
                            alt="Avatar preview" 
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : previewImage ? (
                        <div className="relative rounded-xl overflow-hidden w-32 h-32 border border-gray-200">
                          <img 
                            src={previewImage} 
                            alt="Upload preview" 
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl h-32 w-32">
                          <UserRound className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        
                        {previewImage && (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleGenerateFaceId}
                            disabled={isGeneratingFace}
                          >
                            {isGeneratingFace ? (
                              <><Spinner className="mr-2" /> Processing...</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-2" /> Generate</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Voice
                    </label>
                    <Select
                      value={persona.voice || DEFAULT_VOICE}
                      onValueChange={handleVoiceChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {elevenLabsVoices.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview Generation */}
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGeneratePreview}
                      disabled={isGeneratingPreview || !persona.faceId}
                    >
                      {isGeneratingPreview ? (
                        <><Spinner className="mr-2" /> Generating Preview...</>
                      ) : (
                        <><Play className="h-4 w-4 mr-2" /> Generate Preview</>
                      )}
                    </Button>
                    
                    {videoPreview && (
                      <div className="mt-4">
                        <div className="rounded-lg overflow-hidden">
                          <video
                            controls
                            className="w-full"
                            autoPlay
                          >
                            <source src={videoPreview.mp4Url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* QA Pairs Section */}
            <motion.div 
              className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 px-6 py-4">
                <h2 className="text-lg font-medium">Q&A Pairs</h2>
              </div>
              <div className="p-6">
                <QATable
                  pairs={persona.qaPairs}
                  onChange={handleQAPairsChange}
                />
              </div>
            </motion.div>
          </div>
        ) : null}
      </main>
    </div>
  )
} 