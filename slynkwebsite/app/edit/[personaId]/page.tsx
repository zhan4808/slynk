"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { 
  Loader2, ArrowLeft, Save, Upload, Check, Play, X,
  Mic, Image as ImageIcon, UserRound, Sparkles, MessageSquare
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
  productName?: string
  productDescription?: string
  productLink?: string
}

export default function EditPersonaPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [persona, setPersona] = useState<PersonaData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // If not authenticated, redirect to sign-in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin?callbackUrl=/edit/" + params.personaId)
    }
  }, [status, router, params.personaId])

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
          qaPairs: data.qaPairs || [],
          productName: data.productName,
          productDescription: data.productDescription,
          productLink: data.productLink
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

  // Show loading or return null while checking authentication status
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-purple-200 mb-4"></div>
          <div className="h-4 w-32 bg-purple-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-purple-50">
      <DynamicNavbar />
      
      <div className="container mx-auto max-w-6xl px-4 pt-24 pb-16">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Edit AI Persona
            </motion.h1>
            
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full border-2 border-gray-200 hover:border-gray-300">
                <ArrowLeft size={16} className="mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
              {error}
            </div>
          ) : persona ? (
            <EditPersonaForm persona={persona} personaId={params.personaId as string} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

interface EditPersonaFormProps {
  persona: PersonaData;
  personaId: string;
}

function EditPersonaForm({ persona, personaId }: EditPersonaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PersonaData>({
    ...persona
  })
  const [image, setImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isGeneratingFace, setIsGeneratingFace] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoPreview, setVideoPreview] = useState<{mp4Url: string} | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  
  // Reuse the PersonaForm state management and logic, but with saving changes
  // instead of creating a new persona
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Prepare data for API request
      const formDataToSend = new FormData()
      formDataToSend.append("name", formData.name)
      formDataToSend.append("description", formData.description)
      
      if (formData.systemPrompt) {
        formDataToSend.append("systemPrompt", formData.systemPrompt)
      }
      
      if (formData.firstMessage) {
        formDataToSend.append("firstMessage", formData.firstMessage)
      }
      
      if (formData.faceId) {
        formDataToSend.append("faceId", formData.faceId)
      }
      
      if (formData.voice) {
        formDataToSend.append("voice", formData.voice)
      }
      
      if (formData.productName) {
        formDataToSend.append("productName", formData.productName)
      }
      
      if (formData.productDescription) {
        formDataToSend.append("productDescription", formData.productDescription)
      }
      
      if (formData.productLink) {
        formDataToSend.append("productLink", formData.productLink)
      }
      
      // QA pairs
      if (formData.qaPairs && formData.qaPairs.length > 0) {
        formDataToSend.append("qaPairs", JSON.stringify(formData.qaPairs))
      }
      
      // Append files if any
      if (image) {
        formDataToSend.append("image", image)
      }
      
      // Send the update request
      const response = await fetch(`/api/personas/${personaId}`, {
        method: "PUT",
        body: formDataToSend,
      })
      
      if (!response.ok) {
        throw new Error(`Error updating persona: ${response.status}`)
      }
      
      // Success
      toast({
        title: "Success!",
        description: "Your AI persona has been updated successfully.",
      })
      
      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error saving persona:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save persona",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleVoiceChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      voice: value
    }))
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
      toast({
        title: "Error",
        description: "Please upload an image first",
        variant: "destructive",
      })
      return
    }
    
    setIsGeneratingFace(true)
    
    try {
      // Attempt to generate a face ID
      const result = await generateFaceId(image, formData.name || "unnamed_persona")
      
      setFormData(prev => ({
        ...prev,
        faceId: result.faceId
      }))
      
      toast({
        title: "Success",
        description: "Face ID generated successfully",
      })
    } catch (error) {
      console.error("Error generating face ID:", error)
      toast({
        title: "Error",
        description: "Failed to generate face ID. Using default instead.",
        variant: "destructive",
      })
      
      // Use default face ID if generation fails
      setFormData(prev => ({
        ...prev,
        faceId: "tmp9i8bbq7c"
      }))
    } finally {
      setIsGeneratingFace(false)
    }
  }
  
  const handleGeneratePreview = async () => {
    if (!formData.faceId) {
      toast({
        title: "Error",
        description: "Please generate a face ID first",
        variant: "destructive",
      })
      return
    }
    
    const previewText = formData.firstMessage || 
      `Hello, I'm ${formData.name || "your AI assistant"}. How can I help you today?`
    
    setIsGeneratingPreview(true)
    
    try {
      const preview = await generateVideoPreview(previewText, formData.faceId)
      setVideoPreview(preview)
    } catch (error) {
      console.error("Error generating preview:", error)
      toast({
        title: "Error",
        description: "Failed to generate preview",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Details and description */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <UserRound className="mr-2 h-5 w-5 text-pink-500" />
          Persona Details
        </h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.description}
              onChange={handleChange}
                      required
                    />
                  </div>
                  
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea
              id="systemPrompt"
              name="systemPrompt"
                      rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.systemPrompt || ""}
              onChange={handleChange}
                      placeholder="Instructions for how the AI should behave"
                    />
                  </div>
                  
          <div>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Product/Service Name</label>
            <input
              id="productName"
              name="productName"
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.productName || ""}
              onChange={handleChange}
              placeholder="Name of the product or service"
            />
          </div>
          
          <div>
            <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 mb-1">Product/Service Description</label>
            <textarea
              id="productDescription"
              name="productDescription"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.productDescription || ""}
              onChange={handleChange}
              placeholder="Describe the product or service"
            />
          </div>
          
          <div>
            <label htmlFor="productLink" className="block text-sm font-medium text-gray-700 mb-1">Product/Service Link</label>
            <input
              id="productLink"
              name="productLink"
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.productLink || ""}
              onChange={handleChange}
              placeholder="URL to product or service information"
            />
          </div>
          
          <div>
            <label htmlFor="firstMessage" className="block text-sm font-medium text-gray-700 mb-1">First Message</label>
            <textarea
              id="firstMessage"
                      name="firstMessage"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.firstMessage || ""}
              onChange={handleChange}
              placeholder="The first message the AI will say to users"
                    />
                  </div>
                </div>
              </div>
            
      {/* Appearance & Voice */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <ImageIcon className="mr-2 h-5 w-5 text-pink-500" />
          Appearance & Voice
        </h2>
        
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Avatar</label>
            
            <div className="flex flex-col items-center gap-4">
              {formData.faceId && !previewImage ? (
                <div className="relative rounded-xl overflow-hidden w-32 h-32 border border-gray-200">
                  <img 
                    src={`https://simli.ai/api/avatars/${formData.faceId}/image.jpg`} 
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
                  className="gap-1.5"
                      >
                  <Upload className="h-4 w-4" />
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
                    className="gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                    >
                      {isGeneratingFace ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate Face
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
              value={formData.voice || DEFAULT_VOICE}
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
          <div className="space-y-4">
            <Button 
              type="button"
              className="gap-2 w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview || !formData.faceId}
            >
              {isGeneratingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Generate Preview
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
      </div>
      
      {/* QA Pairs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-pink-500" />
          Q&A Pairs
        </h2>
        
        <div className="space-y-4">
          <QATable
            pairs={formData.qaPairs || []}
            onChange={(qaPairs) => {
              setFormData(prev => ({
                ...prev,
                qaPairs
              }))
            }}
          />
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button 
            type="submit" 
            className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg rounded-xl"
            disabled={loading || !formData.name || !formData.description}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </motion.div>
    </div>
    </form>
  )
} 