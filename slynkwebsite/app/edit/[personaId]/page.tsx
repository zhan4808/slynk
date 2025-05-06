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
      // Reset any existing error messages when a new image is selected
      setError(null)
      
      // Create a preview of the image
      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        setPreviewImage(readerEvent.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateFaceId = async () => {
    if (!image) {
      setError("Please upload an image first")
      return
    }

    try {
      // Clear messages
      setError(null)
      setSuccessMessage(null)
      setIsGeneratingFace(true)
      
      // Generate face ID
      const { faceId, isInQueue, originalResponse } = await generateFaceId(image, formData.name)
      
      // If face is put in a processing queue, indicate this to the user
      if (isInQueue) {
        setFormData({
          ...formData,
          isCustomFaceInQueue: true,
          originalCharacterId: originalResponse?.character_uid
        })
        setFaceGenerationStatus({
          isReady: false,
          progress: 10,
          message: "Your face is currently being processed. This typically takes 1-3 minutes.",
          lastChecked: Date.now()
        })
        setSuccessMessage("Processing your image. This will take a few minutes...")
        
        // Start polling for status if we have a character_uid
        if (originalResponse?.character_uid) {
          startPollingFaceStatus(originalResponse.character_uid)
        }
      } else {
        // Face ID was generated immediately
        setFormData({
          ...formData,
          faceId,
          isCustomFaceInQueue: false
        })
        setSuccessMessage("Face ID generated successfully!")
      }
    } catch (err: any) {
      console.error("Face generation error:", err)
      setError(`Failed to generate face: ${err.message || "Unknown error"}`)
      // Show more helpful message for common errors
      if (err.message?.includes("dimensions")) {
        setError("The image dimensions are too small. Please upload a larger image (at least 512x512 pixels).")
      } else if (err.message?.includes("format")) {
        setError("Unsupported image format. Please upload a JPG, PNG or WebP image.")
      } else if (err.message?.includes("too large")) {
        setError("The image is too large. Please upload an image smaller than 10MB.")
      } else if (err.message?.includes("corrupted")) {
        setError("The image appears to be corrupted. Please try a different image.")
      }
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

  // Function to start polling for face generation status
  const startPollingFaceStatus = (characterUid: string) => {
    if (isPollingActive) return;
    
    console.log("Starting polling for face status with character_uid:", characterUid);
    setIsPollingActive(true);
    
    // Check the face status immediately
    checkFaceStatus();
    
    // Set up adaptive polling
    let pollCount = 0;
    const pollWithBackoff = () => {
      // Clear any existing timeout
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      
      // Calculate next interval based on how many polls we've done
      let interval = 5000; // Start with 5 seconds
      if (pollCount >= 3 && pollCount < 10) {
        interval = 15000; // 15 seconds after 3 attempts
      } else if (pollCount >= 10) {
        interval = 30000; // 30 seconds after 10 attempts
      }
      
      pollingTimeoutRef.current = setTimeout(async () => {
        pollCount++;
        console.log(`Poll #${pollCount} for face status`);
        
        await checkFaceStatus();
        
        // Continue polling if still needed
        if (formData.isCustomFaceInQueue) {
          pollWithBackoff();
        } else {
          console.log("Stopping polling - face is ready or failed");
          setIsPollingActive(false);
        }
      }, interval);
    };
    
    // Start polling sequence
    pollWithBackoff();
  };
  
  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      setIsPollingActive(false);
    };
  }, []);
  
  // Function to check face generation status
  const checkFaceStatus = async () => {
    if (!formData.originalCharacterId) return;
    
    try {
      console.log(`Checking face status for character_uid: ${formData.originalCharacterId}`);
      const result = await checkFaceGenerationStatus(formData.originalCharacterId);
      console.log("Face status check result:", result);
      
      // Calculate progress percentage
      let progress = 0;
      if (result.status === "processing") progress = 40;
      else if (result.status === "in_progress") progress = 60;
      else if (result.status === "generating") progress = 80;
      else if (result.status === "completed" || result.status === "ready") progress = 100;
      else if (result.status === "failed") progress = 0;
      
      setFaceGenerationStatus({
        status: result.status,
        progress,
        isReady: result.isReady,
        message: result.message || `Face generation ${result.status}`,
        lastChecked: Date.now(),
        faceId: result.faceId,
        failed: result.failed
      });
      
      // Update the form data if face is ready or failed
      if (result.failed) {
        setError("Face generation failed. You can try again with a different image.");
        setFormData(prev => ({
          ...prev,
          isCustomFaceInQueue: false
        }));
      } else if (result.isReady && result.faceId) {
        setFormData(prev => ({
          ...prev,
          faceId: result.faceId || prev.faceId,
          isCustomFaceInQueue: false
        }));
        setSuccessMessage("Your custom face is ready! You can now generate a preview.");
      }
    } catch (error) {
      console.error("Error checking face status:", error);
    }
  };

  // Image upload section
  const renderImageUploadSection = () => {
    const [localIsDragging, setLocalIsDragging] = useState(false);
    
    return (
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-gray-700">Face Image</p>
        <div
          className={`rounded-lg border-2 border-dashed p-4 transition-all ${
            localIsDragging ? "border-pink-400 bg-pink-50" : 
            error && error.toLowerCase().includes("image") ? "border-red-400 bg-red-50" : 
            "border-gray-300 hover:border-pink-300 hover:bg-gray-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setLocalIsDragging(true); }}
          onDragLeave={() => setLocalIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setLocalIsDragging(false);
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              const file = e.dataTransfer.files[0];
              if (file.type.startsWith('image/')) {
                setImage(file);
                setError(null);
                
                const reader = new FileReader();
                reader.onload = (event) => {
                  setPreviewImage(event.target?.result as string);
                };
                reader.readAsDataURL(file);
              } else {
                setError("Please upload an image file (JPG, PNG, or WebP)");
              }
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-4">
            {!previewImage ? (
              <div className="text-center">
                <UserRound size={36} className="mx-auto mb-2 text-gray-400" />
                <p className="mb-1 text-sm text-gray-500">
                  <span className="font-medium text-pink-500">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PNG, JPG or WebP</p>
                <p className="text-xs text-gray-400 mt-1">Minimum 512x512 pixels</p>
              </div>
            ) : (
              <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-lg">
                <Image 
                  src={previewImage} 
                  alt="Preview" 
                  fill 
                  style={{objectFit: 'cover'}} 
                  className="rounded-lg border border-gray-200" 
                />
                <button 
                  className="absolute top-1 right-1 rounded-full bg-gray-800 bg-opacity-70 p-1 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(null);
                    setImage(null);
                    setError(null);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageUpload}
            />
          </div>
        </div>
        
        {/* Image error message display */}
        {error && error.toLowerCase().includes("image") && (
          <div className="mt-2 flex items-start gap-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <div className="mt-3 flex gap-2">
          <Button
            onClick={handleGenerateFaceId}
            disabled={!image || isGeneratingFace}
            className="gap-2"
          >
            {isGeneratingFace ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Face ID
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Form section: Basic Information */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <User size={18} className="text-pink-600" />
            <span>Basic Information</span>
          </h3>
          
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Product Expert Sarah"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your AI persona..."
                className="mt-1"
                rows={4}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="firstMessage">Greeting Message</Label>
              <Textarea
                id="firstMessage"
                name="firstMessage"
                value={formData.firstMessage}
                onChange={handleChange}
                placeholder="Hello! I'm [Name]. How can I help you today?"
                className="mt-1"
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">
                This is the first message your AI will say when starting a conversation.
              </p>
            </div>
          </div>
        </div>
        
        {/* Form section: Visual Appearance */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <ImageIcon size={18} className="text-pink-600" />
            <span>Visual Appearance</span>
          </h3>
          
          <div className="mt-4 space-y-5">
            {renderImageUploadSection()}
          </div>
          
          {/* Show success message or error */}
          {successMessage && (
            <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <div className="flex items-center">
                <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                <p>{successMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Form submission button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
} 