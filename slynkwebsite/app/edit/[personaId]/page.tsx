"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Loader2, ArrowLeft, Save, Upload, Check, Play, X,
  Mic, Image as ImageIcon, UserRound, Sparkles, RefreshCw,
  Volume2, User, Settings, Info, CheckCircle, AlertCircle, MessageSquare
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { 
  generateFaceId, 
  generateVideoPreview, 
  DEFAULT_FACE_ID,
  checkFaceGenerationStatus 
} from "@/lib/simli-api"
import { DynamicNavbar } from "@/components/dynamic-navbar"
import { elevenLabsVoices, DEFAULT_VOICE } from '@/lib/voice-options'
import { Slider } from "@/components/ui/slider"
import { generateEnhancedPrompt, PersonaType } from '@/lib/enhanced-prompts'

interface PersonaFormData {
  id?: string
  name: string
  description: string
  firstMessage: string
  faceId: string
  voice: string
  voiceId?: string
  stability?: number
  similarity?: number
  useCustomVoice: boolean
  productName: string
  productDescription: string
  productLink: string
  originalCharacterId?: string
  isCustomFaceInQueue?: boolean
  personaType: PersonaType
}

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

// Add missing voice type definitions
interface VoiceOption {
  id: string;
  name: string;
  gender: string;
}

// Add mapping to add gender information to voice options
const enhancedVoiceOptions = elevenLabsVoices.map(voice => {
  // Determine gender based on voice name
  const nameLower = voice.name.toLowerCase();
  const isFemale = 
    nameLower.includes('rachel') || 
    nameLower.includes('domi') || 
    nameLower.includes('bella') || 
    nameLower.includes('elli');
  
  return {
    ...voice,
    gender: isFemale ? 'female' : 'male'
  };
});

// Use the enhanced voice options
const voiceOptions = enhancedVoiceOptions;

export default function EditPersonaPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [persona, setPersona] = useState<PersonaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<PersonaFormData>({
    name: "",
    description: "",
    firstMessage: "",
    faceId: "",
    voice: DEFAULT_VOICE,
    useCustomVoice: false,
    productName: "",
    productDescription: "",
    productLink: "",
    personaType: "default" as PersonaType
  })

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
        
        // Update form data with persona data
        setFormData({
          id: data.id,
          name: data.name || data.productName || "",
          description: data.description || "",
          firstMessage: data.firstMessage || "",
          faceId: data.faceId || "",
          voice: data.voice || DEFAULT_VOICE,
          useCustomVoice: !!data.voiceSample,
          productName: data.productName || "",
          productDescription: data.productDescription || "",
          productLink: data.productLink || "",
          personaType: data.personaType || "default" as PersonaType
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
            <EditPersonaForm persona={persona} personaId={params.personaId as string} formData={formData} setFormData={setFormData} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

interface EditPersonaFormProps {
  persona: PersonaData;
  personaId: string;
  formData: PersonaFormData;
  setFormData: React.Dispatch<React.SetStateAction<PersonaFormData>>;
}

function EditPersonaForm({ persona, personaId, formData, setFormData }: EditPersonaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isGeneratingFace, setIsGeneratingFace] = useState(false)
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
  const [videoPreview, setVideoPreview] = useState<{ mp4Url: string } | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPreviewGenerated, setIsPreviewGenerated] = useState(false)
  const [isCustomFaceInQueue, setIsCustomFaceInQueue] = useState(false)
  const [faceGenerationStatus, setFaceGenerationStatus] = useState<{
    isReady: boolean,
    progress: number,
    message: string,
    lastChecked: number,
    faceId?: string,
    failed?: boolean,
    status?: string
  }>({
    isReady: false,
    progress: 0,
    message: 'Not started',
    lastChecked: Date.now()
  })
  const [originalFaceResponse, setOriginalFaceResponse] = useState<any>(null)
  const [isPollingActive, setIsPollingActive] = useState(false)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Voice upload
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [isUploadingVoice, setIsUploadingVoice] = useState(false)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null)
  const voiceInputRef = useRef<HTMLInputElement>(null)
  
  // Voice selection state
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male')
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  
  // Processing timer
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  
  // Helper function to format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Load persona image if available
  useEffect(() => {
    // If persona has faceId, set active step to at least 2
    if (persona.faceId) {
      setActiveStep(Math.max(activeStep, 2));
      
      // Set the faceId in the form data
      setFormData(prev => ({
        ...prev,
        faceId: persona.faceId || DEFAULT_FACE_ID
      }));
    }
    
    // Try to fetch the existing face image if available
    if (persona.faceId) {
      // Check if we have an existing preview for this persona
      const checkForExistingPreview = async () => {
        try {
          // For this example, we'll just set isPreviewGenerated to true
          // In a real implementation, you might want to check if a preview exists
          setIsPreviewGenerated(true);
        } catch (error) {
          console.error("Error checking for existing preview:", error);
        }
      };
      
      checkForExistingPreview();
    }
  }, [persona, activeStep]);
  
  // Add user interaction detection for video autoplay
  useEffect(() => {
    // Flag to track if we've already set up the listeners
    let listenerAdded = false;
    
    const markUserInteraction = () => {
      // Add a class to the document root to indicate user interaction has occurred
      document.documentElement.classList.add('user-interaction');
      console.log("User interaction detected, enabling autoplay");
      
      // Remove listeners after first interaction
      if (listenerAdded) {
        document.removeEventListener('click', markUserInteraction);
        document.removeEventListener('touchstart', markUserInteraction);
        document.removeEventListener('keydown', markUserInteraction);
      }
    };
    
    // Only add listeners if they haven't been added yet
    if (!listenerAdded) {
      document.addEventListener('click', markUserInteraction);
      document.addEventListener('touchstart', markUserInteraction);
      document.addEventListener('keydown', markUserInteraction);
      listenerAdded = true;
    }
    
    // Return cleanup function
    return () => {
      document.removeEventListener('click', markUserInteraction);
      document.removeEventListener('touchstart', markUserInteraction);
      document.removeEventListener('keydown', markUserInteraction);
    };
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // Generate the system prompt
      const systemPrompt = generateSystemPrompt(
        formData.name,
        formData.description,
        formData.productName,
        formData.productDescription,
        formData.productLink,
        formData.personaType
      )
      
      // Prepare data to send
      const personaData = {
        id: personaId,
        name: formData.name,
        description: formData.description,
        systemPrompt,
        firstMessage: formData.firstMessage,
        faceId: formData.faceId,
        voice: formData.voice,
        productName: formData.productName,
        productDescription: formData.productDescription,
        productLink: formData.productLink,
        personaType: formData.personaType
      }
      
      // Check if we have a face ID
      if (!formData.faceId) {
        // Set default face ID if none exists
        personaData.faceId = DEFAULT_FACE_ID
      }
      
      // Create form data for file upload if we have a custom voice
      let voiceDataUrl = null;
      
      if (formData.useCustomVoice && voiceFile) {
        console.log("Using custom voice sample:", voiceFile.name);
        
        // Convert the audio file to a data URL for processing
        try {
          voiceDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(voiceFile);
          });
        } catch (error) {
          console.error("Error reading voice file:", error);
          // If there's an error, continue without the custom voice
          setError("Could not process voice file. Using default voice instead.");
          // Wait 3 seconds to let user see the error message
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      console.log("Updating persona with settings:", personaData)
      
      // Prepare data for API request
      const formDataToSend = new FormData()
      
      // Text fields
      formDataToSend.append("name", personaData.name)
      formDataToSend.append("description", personaData.description)
      formDataToSend.append("systemPrompt", personaData.systemPrompt)
      formDataToSend.append("firstMessage", personaData.firstMessage || "")
      formDataToSend.append("faceId", personaData.faceId || DEFAULT_FACE_ID)
      formDataToSend.append("voice", personaData.voice)
      formDataToSend.append("useCustomVoice", formData.useCustomVoice.toString())
      formDataToSend.append("personaType", personaData.personaType || "default")
      
      if (personaData.productName) {
        formDataToSend.append("productName", personaData.productName)
      }
      
      if (personaData.productDescription) {
        formDataToSend.append("productDescription", personaData.productDescription)
      }
      
      if (personaData.productLink) {
        formDataToSend.append("productLink", personaData.productLink)
      }
      
      // Append files if any
      if (image) {
        formDataToSend.append("image", image)
      }
      
      // Append voice data if available
      if (voiceDataUrl) {
        formDataToSend.append("voiceData", voiceDataUrl)
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
      setError(error instanceof Error ? error.message : "Failed to save persona")
    } finally {
      setLoading(false)
    }
  }
  
  // Function to handle persona type change
  const handlePersonaTypeChange = (value: string) => {
    setFormData({
      ...formData,
      personaType: value as PersonaType
    })
  }
  
  // Function to generate system prompt based on product and persona info
  const generateSystemPrompt = (
    personaName: string,
    personaDescription: string,
    productName?: string,
    productDescription?: string,
    productLink?: string,
    personaType: PersonaType = "default"
  ) => {
    // Use the enhanced prompt generator
    return generateEnhancedPrompt({
      name: personaName,
      description: personaDescription,
      productName: productName || "",
      productDescription: productDescription || "",
      productLink: productLink || "",
      personaType
    })
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleVoiceChange = (value: string) => {
    setFormData({
      ...formData,
      voice: value
    })
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
    
    // Check image size before attempting generation
    if (image.size > 10 * 1024 * 1024) { // 10MB limit
      setError("Image size exceeds 10MB limit. Please upload a smaller image.")
      return
    }
    
    // Clear any existing face generation data
    clearFaceGeneration()
    
    setIsGeneratingFace(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // Attempt to generate a face ID using Simli's API
      console.log("Generating face ID from uploaded image...")
      const result = await generateFaceId(image, formData.name || "unnamed_persona")
      console.log("Successfully generated face ID:", result)
      
      if (!result || !result.faceId) {
        throw new Error("No face ID was returned from the API")
      }
      
      setFormData({
        ...formData,
        faceId: result.faceId
      })
      
      // Set additional state for queue status
      setIsCustomFaceInQueue(result.isInQueue)
      if (result.originalResponse) {
        setOriginalFaceResponse(result.originalResponse)
      }
      
      if (result.isInQueue) {
        // Handle queued face ID scenario
        setSuccessMessage(
          "Your custom face has been added to the processing queue! " +
          "This can take 1-3 minutes to complete. " +
          "We'll notify you when it's ready for preview generation."
        )
        
        // Set up periodic checking if needed
        if (result.originalResponse?.character_uid) {
          // Start polling immediately for status updates
          console.log("Face generation queued with character_uid:", result.originalResponse.character_uid)
        }
      } else {
        setSuccessMessage("Face ID generated successfully! Now proceed to Step 3 to generate a preview.")
      }
    } catch (error) {
      console.error("Error generating face ID:", error)
      
      // Extract error details for better messages
      let errorMsg = error instanceof Error ? error.message : "Failed to generate face"
      
      // Handle specific errors with better messages
      if (errorMsg.includes("512x512")) {
        errorMsg = "Image must be at least 512x512 pixels. Please upload a larger image."
      } else if (errorMsg.includes("502")) {
        errorMsg = "Server error when processing image. Please try again with a different image."
      }
      
      setError(errorMsg)
    } finally {
      setIsGeneratingFace(false)
    }
  }
  
  const handleGenerateAvatar = async () => {
    setIsGeneratingAvatar(true)
    setError(null)
    setSuccessMessage(null)
    setIsCustomFaceInQueue(false)
    setOriginalFaceResponse(null)
    
    try {
      // For demo/MVP purposes, we use a default face ID
      // In production, you would call an API to generate a custom avatar
      setFormData({
        ...formData,
        faceId: DEFAULT_FACE_ID // Use imported constant from simli-api.ts
      })
      
      setSuccessMessage("Pre-built avatar selected! Now proceed to Step 3 to generate a preview.")
    } catch (error) {
      console.error("Error generating avatar:", error)
      setError(error instanceof Error ? error.message : "Failed to generate avatar")
    } finally {
      setIsGeneratingAvatar(false)
    }
  }
  
  const handleGeneratePreview = async () => {
    if (!formData.faceId) {
      setError("Please generate a face ID or avatar first")
      return
    }
    
    // If the face is still in queue and not ready, show a helpful message
    if (isCustomFaceInQueue && !faceGenerationStatus.isReady) {
      setError(
        "Your custom face is still being processed. Please wait for it to complete before generating a preview. " +
        "You'll be notified when it's ready."
      )
      return
    }
    
    const previewText = formData.firstMessage || 
      `Hello, I'm ${formData.name || "your new AI assistant"}. How can I help you today?`
    
    setIsGeneratingPreview(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // Check if the faceId is a UUID (character_uid format from queue)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formData.faceId);
      
      // Log which ID we're using for clarity
      if (isUuid && isCustomFaceInQueue) {
        console.log(`Cannot generate preview with character_uid that's still being processed: ${formData.faceId}`);
        throw new Error("Your custom face is still being processed. Please wait until the face generation is complete.");
      } else {
        console.log(`Generating preview with face ID: ${formData.faceId}`);
      }
      
      // Try to get the ElevenLabs API key if needed
      let elevenLabsAPIKey;
      try {
        // Attempt to fetch ElevenLabs API key from server endpoint
        const response = await fetch('/api/simli/voice-api-key');
        if (response.ok) {
          const data = await response.json();
          if (data.ttsAPIKey) {
            console.log("Retrieved ElevenLabs API key for voice customization");
            elevenLabsAPIKey = data.ttsAPIKey;
          }
        }
      } catch (error) {
        console.log("Could not retrieve ElevenLabs API key, will try without it:", error);
      }
      
      // Pass the selected voice to the generateVideoPreview function
      const preview = await generateVideoPreview(
        previewText, 
        formData.faceId,
        formData.voice, // Pass the selected ElevenLabs voice ID
        elevenLabsAPIKey // Pass ElevenLabs API key if available
      )
      
      setVideoPreview(preview)
      setIsPreviewGenerated(true)
      setSuccessMessage("Video preview generated! You can now update your persona.")
    } catch (error) {
      console.error("Error generating preview:", error)
      
      // Extract error details for better messages
      let errorMsg = error instanceof Error ? error.message : "Failed to generate preview"
      
      // Handle specific errors with better messages
      if (errorMsg.includes("Invalid face ID")) {
        errorMsg = "Your custom face is still being processed. Please wait until face generation is complete before generating a preview."
      }
      
      setError(errorMsg)
    } finally {
      setIsGeneratingPreview(false)
    }
  }
  
  // Add a function to clear the face generation queue
  const clearFaceGeneration = () => {
    setIsCustomFaceInQueue(false);
    setOriginalFaceResponse(null);
    setFaceGenerationStatus({
      status: "not_started",
      progress: 0,
      isReady: false,
      message: "Face generation not started",
      lastChecked: 0
    });
    setSuccessMessage(null);
    setError(null);
    
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setIsPollingActive(false);
  }
  
  // Handle voice file upload
  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is audio
      if (!file.type.startsWith('audio/')) {
        setError("Please upload an audio file");
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Voice file must be less than 10MB");
        return;
      }
      
      setVoiceFile(file);
      setIsUploadingVoice(true);
      setError(null);
      
      // Create a preview URL
      const url = URL.createObjectURL(file);
      setVoicePreviewUrl(url);
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        useCustomVoice: true
      }));
      
      setIsUploadingVoice(false);
      setSuccessMessage("Voice sample uploaded! Generate a preview to hear it.");
    }
  };

  // Function to play voice sample
  const playVoiceSample = () => {
    setIsPlayingVoice(true)
    // In a real implementation, you would play a sample of the selected voice
    // For now, we'll just simulate it with a timeout
    setTimeout(() => {
      setIsPlayingVoice(false)
    }, 2000)
  }

  // Add missing previewText state
  const [previewText, setPreviewText] = useState(
    formData.firstMessage || 
    `Hello, I'm ${formData.name}. How can I help you with ${formData.productName || 'your questions'} today?`
  );

  // Fix checkFaceStatus function
  const checkFaceStatus = async () => {
    if (!originalFaceResponse?.character_uid) return;
    
    try {
      setIsPollingActive(true);
      const status = await checkFaceGenerationStatus(originalFaceResponse.character_uid);
      
      // Update status display
      setFaceGenerationStatus(prev => ({
        ...prev,
        ...status,
        lastChecked: Date.now()
      }));
      
      if (status.isReady) {
        // Face is ready, set the face ID
        setFormData(prev => ({
          ...prev,
          faceId: status.faceId || prev.faceId
        }));
        setIsCustomFaceInQueue(false);
        setSuccessMessage("Custom face is ready! You can now generate a preview.");
      } else if (status.failed) {
        setError("Face generation failed. Please try with a different image.");
        setIsCustomFaceInQueue(false);
      }
    } catch (error) {
      console.error("Error checking face generation status:", error);
      setFaceGenerationStatus(prev => ({
        ...prev,
        lastChecked: Date.now(),
        message: "Error checking status"
      }));
    } finally {
      setIsPollingActive(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information Section */}
      <motion.div 
        className="bg-white rounded-3xl shadow-lg overflow-hidden"
        style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.1)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="p-8">
          <motion.div
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Basic Information</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-medium text-gray-700">Name</Label>
                <Input 
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
                  placeholder="E.g., Business Advisor Bob"
                  className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-gray-50"
              required
            />
          </div>
          
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium text-gray-700">Description</Label>
                <Textarea 
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
                  placeholder="Describe the persona's background, expertise, and personality"
                  className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-gray-50"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="personaType" className="text-base font-medium text-gray-700">Persona Type</Label>
                <Select 
                  value={formData.personaType} 
                  onValueChange={handlePersonaTypeChange}
                >
                  <SelectTrigger className="w-full border border-indigo-200 focus:border-indigo-400 bg-white rounded-xl shadow-sm">
                    <SelectValue placeholder="Select a persona type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-0 shadow-lg rounded-xl overflow-hidden">
                    <div className="p-2 max-h-[300px] overflow-y-auto bg-white">
                      <SelectGroup>
                        <SelectLabel className="px-2 py-1 text-xs font-medium text-gray-500">Persona Types</SelectLabel>
                        <SelectItem value="default" className="rounded-lg my-1 hover:bg-indigo-50">Default - Professional & Balanced</SelectItem>
                        <SelectItem value="tech" className="rounded-lg my-1 hover:bg-indigo-50">Tech - Technical & Innovative</SelectItem>
                        <SelectItem value="lifestyle" className="rounded-lg my-1 hover:bg-indigo-50">Lifestyle - Approachable & Trendy</SelectItem>
                        <SelectItem value="finance" className="rounded-lg my-1 hover:bg-indigo-50">Finance - Authoritative & Precise</SelectItem>
                        <SelectItem value="healthcare" className="rounded-lg my-1 hover:bg-indigo-50">Healthcare - Caring & Informative</SelectItem>
                        <SelectItem value="entertainment" className="rounded-lg my-1 hover:bg-indigo-50">Entertainment - Energetic & Engaging</SelectItem>
                        <SelectItem value="food" className="rounded-lg my-1 hover:bg-indigo-50">Food - Passionate & Descriptive</SelectItem>
                        <SelectItem value="travel" className="rounded-lg my-1 hover:bg-indigo-50">Travel - Adventurous & Inspiring</SelectItem>
                        <SelectItem value="education" className="rounded-lg my-1 hover:bg-indigo-50">Education - Patient & Instructive</SelectItem>
                        <SelectItem value="luxury" className="rounded-lg my-1 hover:bg-indigo-50">Luxury - Sophisticated & Exclusive</SelectItem>
                        <SelectItem value="fitness" className="rounded-lg my-1 hover:bg-indigo-50">Fitness - Motivational & Supportive</SelectItem>
                      </SelectGroup>
                    </div>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-indigo-700 italic">
                  Select the persona type that best matches your product or service. This affects
                  how your AI spokesperson will communicate with users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
            
      {/* Product Information Section */}
      <motion.div 
        className="bg-white rounded-3xl shadow-lg overflow-hidden"
        style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.1)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="p-8">
          <motion.div
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Product Information</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-base font-medium text-gray-700">Product Name</Label>
                <Input 
                  id="productName"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  placeholder="E.g., Smart Home Controller"
                  className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-gray-50"
                  required
                />
              </div>
          
              <div className="space-y-2">
                <Label htmlFor="productDescription" className="text-base font-medium text-gray-700">Product Description</Label>
                <Textarea 
                  id="productDescription"
                  name="productDescription"
                  value={formData.productDescription}
                  onChange={handleChange}
                  placeholder="Describe the product's features, benefits, and unique selling points"
                  className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-gray-50"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="productLink" className="text-base font-medium text-gray-700">Product Link (Optional)</Label>
                <Input 
                  id="productLink"
                  name="productLink"
                  value={formData.productLink}
                  onChange={handleChange}
                  placeholder="https://example.com/product"
                  className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="firstMessage" className="text-base font-medium text-gray-700">First Message (Optional)</Label>
                <Textarea 
                  id="firstMessage"
                  name="firstMessage"
                  value={formData.firstMessage}
                  onChange={handleChange}
                  placeholder="First message to send when starting a conversation (auto-generated if left empty)"
                  className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-gray-50"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Preview and Voice Section */}
      <motion.div 
        className="bg-white rounded-3xl shadow-lg overflow-hidden"
        style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.1)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="p-8">
          <motion.div
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Preview & Voice</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Preview */}
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    Preview Message
                  </h3>
                  
                  <Textarea 
                    id="previewText"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Enter the message your AI persona will say in the preview"
                    className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-white bg-opacity-80"
                    rows={3}
                  />
                  
                  <div className="mt-4">
                      <Button 
                        type="button" 
                      onClick={handleGeneratePreview}
                      disabled={isGeneratingPreview || !formData.faceId}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl"
                      >
                      {isGeneratingPreview ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Generate Video Preview
                        </>
                      )}
                      </Button>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm min-h-[200px] flex items-center justify-center">
                  {videoPreview ? (
                    <video
                      src={videoPreview.mp4Url}
                      controls
                      className="w-full rounded-xl"
                      preload="auto"
                      playsInline
                      onLoadedMetadata={(e) => {
                        // Ensure video has loaded metadata before playing
                        const video = e.currentTarget;
                        console.log("Video metadata loaded, duration:", video.duration);
                        
                        // Explicitly set currentTime to 0 to ensure video starts from beginning
                        video.currentTime = 0;
                        
                        // Only attempt playback if user has interacted with page
                        if (document.documentElement.classList.contains('user-interaction')) {
                          video.play().catch(err => console.error("Auto-play failed:", err));
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-2">Generate a preview to see your AI persona in action</p>
                    </div>
                )}
              </div>
                  </div>
                </div>
                
            {/* Right Column: Voice Selection */}
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                  <Mic className="h-5 w-5 text-amber-500" />
                  Voice Selection
                </h3>
                <p className="text-sm text-gray-600 mb-4 p-4 bg-white bg-opacity-60 rounded-xl">
                  Choose a voice for your AI persona, or upload your own voice sample.
                </p>
                
                <div className="space-y-5">
                  {/* Pre-defined voice options */}
                    <div className="space-y-2">
                    <Label htmlFor="voice" className="text-base font-medium text-gray-700">Select Voice</Label>
            <Select
                      value={formData.voice} 
              onValueChange={handleVoiceChange}
                      disabled={formData.useCustomVoice}
            >
                      <SelectTrigger className="w-full border border-amber-200 focus:border-amber-400 bg-white rounded-xl shadow-sm">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                      <SelectContent className="bg-white border-0 shadow-lg rounded-xl overflow-hidden">
                        <div className="p-2 max-h-[300px] overflow-y-auto bg-white">
                {elevenLabsVoices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id} className="rounded-lg my-1 hover:bg-amber-50">
                    {voice.name}
                  </SelectItem>
                ))}
                        </div>
                        </SelectContent>
                      </Select>
                    <p className="text-xs text-amber-700 italic mt-1">
                      Powered by ElevenLabs voice technology
                    </p>
                    </div>
            
                  {/* Divider with OR text */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-amber-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-gradient-to-r from-amber-50 to-yellow-50 px-3 text-sm text-amber-600 font-medium">
                        OR
                      </span>
                    </div>
                  </div>
                  
                  {/* Custom voice upload */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-700">Upload Your Voice</Label>
                    
                    <input
                      ref={voiceInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleVoiceUpload}
                      className="hidden"
                    />
                    
                    {voicePreviewUrl ? (
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                          <audio
                            src={voicePreviewUrl}
                            controls
                            className="w-full h-10"
                          ></audio>
                          <p className="text-xs text-amber-700 mt-2">
                            Your custom voice sample will be used for this AI persona
                          </p>
                        </div>
                        <div className="flex gap-2">
            <Button 
              type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setVoiceFile(null);
                              setVoicePreviewUrl(null);
                              setFormData(prev => ({ ...prev, useCustomVoice: false }));
                            }}
                            className="text-amber-700 border-amber-300 hover:bg-amber-100 rounded-xl"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => voiceInputRef.current?.click()}
                            className="text-amber-700 border-amber-300 hover:bg-amber-100 rounded-xl"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1" />
                            Change
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <motion.div 
                          whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.1)" }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => voiceInputRef.current?.click()}
                            className="w-full h-20 border-2 border-dashed border-amber-300 hover:border-amber-400 bg-white flex flex-col items-center justify-center gap-2 transition-all duration-300 rounded-xl"
                          >
                            <Upload className="h-5 w-5 text-amber-500" />
                            <span className="text-sm text-amber-700">Upload voice sample</span>
            </Button>
                        </motion.div>
                        <p className="text-xs text-amber-700 mt-2">
                          Supported formats: MP3, WAV, M4A (max 10MB)<br />
                          A clear 10-20 second sample works best
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Processing Status Section - shown only when a custom face is in the queue */}
      {isCustomFaceInQueue && (
        <motion.div 
          className="mt-8 p-6 rounded-2xl bg-white shadow-md border-0 overflow-hidden relative"
          style={{ 
            boxShadow: "0 10px 30px -5px rgba(79, 70, 229, 0.1)" 
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="rounded-full p-3 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 self-start">
              {faceGenerationStatus.isReady ? (
                <Check className="h-6 w-6 text-green-500" />
              ) : faceGenerationStatus.failed ? (
                <X className="h-6 w-6 text-red-500" />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-6 w-6 text-indigo-500" />
                </motion.div>
              )}
              </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {faceGenerationStatus.isReady 
                    ? "Face Generation Complete! 🎉" 
                    : faceGenerationStatus.failed
                    ? "Face Generation Failed"
                    : `Face Processing - Please Wait`}
                </h3>
                
                {/* Processing Timer */}
                {!faceGenerationStatus.isReady && !faceGenerationStatus.failed && (
                  <div className="text-sm font-mono bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                    Processing Time: {formatTime(processingTime)}
              </div>
            )}
          </div>
              
              <p className="text-indigo-600 mt-2">
                {faceGenerationStatus.message}
                {!faceGenerationStatus.isReady && !faceGenerationStatus.failed && (
                  <span className="block mt-1 text-sm opacity-70 flex justify-between">
                    <span>Last checked: {new Date(faceGenerationStatus.lastChecked).toLocaleTimeString()}</span>
                    <button 
                      onClick={checkFaceStatus} 
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                      disabled={isPollingActive}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Check Status
                    </button>
                  </span>
                )}
              </p>
        </div>
      </div>
        </motion.div>
      )}
      
      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-600 flex items-start">
          <CheckCircle className="h-5 w-5 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}
      
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
  );
} 