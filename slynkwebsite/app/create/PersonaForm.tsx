"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Loader2, Upload, Check, Play, X, 
  Mic, Image as ImageIcon, UserRound, Sparkles, RefreshCw, AlertCircle, CheckCircle
} from "lucide-react"
import Image from "next/image"
import { 
  generateFaceId, 
  generateVideoPreview, 
  DEFAULT_FACE_ID,
  checkFaceGenerationStatus 
} from "@/lib/simli-api"
import { motion } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { elevenLabsVoices, DEFAULT_VOICE } from '@/lib/voice-options'
import { createPersona, PersonaFormData } from '@/lib/api'
import { generateEnhancedPrompt } from '@/lib/enhanced-prompts'

type PersonaType = 
  | 'default'
  | 'tech' 
  | 'lifestyle'
  | 'finance'
  | 'healthcare'
  | 'entertainment'
  | 'food'
  | 'travel'
  | 'education'
  | 'luxury'
  | 'fitness'

export default function PersonaForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PersonaFormData & { personaType: PersonaType }>({
    name: "",
    description: "",
    firstMessage: "",
    faceId: "",
    voice: DEFAULT_VOICE,
    useCustomVoice: false,
    productName: "",
    productDescription: "",
    productLink: "",
    personaType: "default",
  })
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
  const [isDragging, setIsDragging] = useState(false)
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

  // Add a timer ref and state to track processing time
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  // Auto advance steps when criteria are met
  useEffect(() => {
    if (formData.name && formData.description && activeStep === 1) {
      setActiveStep(2)
    }
    if (formData.faceId && activeStep === 2) {
      setActiveStep(3)
    }
  }, [formData.name, formData.description, formData.faceId, activeStep])

  // Set up polling for face generation status with adaptive interval
  useEffect(() => {
    if (isCustomFaceInQueue && originalFaceResponse?.character_uid && !isPollingActive) {
      console.log("Starting adaptive polling for face generation status");
      setIsPollingActive(true);
      
      // Start status check immediately
      checkFaceStatus();
      
      // Set up adaptive polling - check more frequently at the beginning,
      // then gradually increase the interval as time passes
      let pollCount = 0;
      let currentInterval = 5000; // Start with 5 seconds
      
      const scheduleNextPoll = () => {
        // Clear any existing timeout
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
        
        // Calculate next interval - increase after certain number of attempts
        if (pollCount < 3) {
          currentInterval = 5000; // 5 seconds for first 3 checks
        } else if (pollCount < 10) {
          currentInterval = 15000; // 15 seconds for next 7 checks
        } else {
          currentInterval = 30000; // 30 seconds after that
        }
        
        console.log(`Scheduling next face status check in ${currentInterval/1000}s (poll #${pollCount+1})`);
        
        // Schedule next poll
        pollingTimeoutRef.current = setTimeout(async () => {
          pollCount++;
          await checkFaceStatus();
          
          // Only schedule another poll if we should continue polling
          if (isCustomFaceInQueue && !faceGenerationStatus.isReady && !faceGenerationStatus.failed) {
            scheduleNextPoll();
          } else {
            console.log("Stopping polling - face is ready or failed");
            setIsPollingActive(false);
          }
        }, currentInterval);
      };
      
      // Start the polling sequence
      scheduleNextPoll();
      
      // Cleanup function
      return () => {
        console.log("Cleaning up face generation polling");
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
        setIsPollingActive(false);
      };
    }
  }, [isCustomFaceInQueue, originalFaceResponse]);

  // Handle polling cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      setIsPollingActive(false);
    };
  }, []);

  // Stop polling when face is ready
  useEffect(() => {
    if (faceGenerationStatus.isReady && pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
      setIsPollingActive(false);
      
      // If we got a real face ID back, update the form data
      if (faceGenerationStatus.status === "ready" && 
          typeof faceGenerationStatus.faceId === 'string' &&
          faceGenerationStatus.faceId.length > 0) {
            
        setFormData(prev => ({
          ...prev,
          faceId: faceGenerationStatus.faceId || prev.faceId
        }));
        
        setIsCustomFaceInQueue(false);
        setSuccessMessage("Your custom face is ready! You can now generate a preview with your custom face.");
      }
    }
  }, [faceGenerationStatus.isReady, faceGenerationStatus.faceId]);
  
  // Function to check face generation status
  const checkFaceStatus = async () => {
    if (!originalFaceResponse?.character_uid) return
    
    try {
      console.log(`Checking status for character_uid: ${originalFaceResponse.character_uid}`)
      const result = await checkFaceGenerationStatus(originalFaceResponse.character_uid)
      console.log("Face generation status check result:", result)
      
      // Calculate a progress percentage based on status
      let progress = 0
      if (result.status === "processing") progress = 40
      else if (result.status === "in_progress") progress = 60
      else if (result.status === "generating") progress = 80
      else if (result.status === "completed" || result.status === "ready") progress = 100
      else if (result.status === "failed") progress = 0
      
      setFaceGenerationStatus({
        status: result.status,
        progress,
        isReady: result.isReady,
        message: result.message || `Face generation ${result.status}`,
        lastChecked: Date.now(),
        faceId: result.faceId,
        failed: result.failed
      })
      
      // If face generation failed, we should update the UI to allow retry
      if (result.failed) {
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
        setIsPollingActive(false);
        setError("Face generation failed. You can try again with a different image.");
      }
      // If the face is ready and we have a faceId, update the form
      else if (result.isReady && result.faceId) {
        setFormData(prev => ({
          ...prev,
          faceId: result.faceId || prev.faceId
        }))
        setIsCustomFaceInQueue(false)
        setSuccessMessage("Your custom face is ready! You can now generate a preview with your custom face.")
      }
    } catch (error) {
      console.error("Error checking face generation status:", error)
      // Continue showing the progress UI even if there's an error checking status
      setFaceGenerationStatus(prev => ({
        ...prev,
        lastChecked: Date.now(),
        message: "Still processing your face. This can take 1-3 minutes."
      }))
    }
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
        setIsCustomFaceInQueue(true)
        setOriginalFaceResponse(originalResponse)
        setFaceGenerationStatus({
          isReady: false,
          progress: 10,
          message: "Your face is currently being processed. This typically takes 1-3 minutes.",
          lastChecked: Date.now()
        })
        setSuccessMessage("Processing your image. This will take a few minutes...")
      } else {
        // Face ID was generated immediately
        setFormData({
          ...formData,
          faceId
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
      setSuccessMessage("Video preview generated! You can now create your persona.")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // Check if we have a face ID
      if (!formData.faceId) {
        // Set default face ID if none exists
        setFormData(prev => ({
          ...prev,
          faceId: DEFAULT_FACE_ID
        }))
      }
      
      // Generate system prompt from product and persona information
      const systemPrompt = generateSystemPrompt(
        formData.name, 
        formData.description,
        formData.productName,
        formData.productDescription,
        formData.productLink,
        formData.personaType
      )
      
      const firstMessage = formData.firstMessage || 
        `Hello, I'm ${formData.name}. How can I help you with ${formData.productName || 'your questions'} today?`
      
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
      
      console.log("Creating persona with settings:", {
        name: formData.name,
        description: formData.description,
        productName: formData.productName || 'N/A',
        productDescription: formData.productDescription ? (formData.productDescription.substring(0, 50) + "...") : 'N/A',
        productLink: formData.productLink || 'N/A',
        faceId: formData.faceId || DEFAULT_FACE_ID,
        originalCharacterId: isCustomFaceInQueue ? originalFaceResponse?.character_uid : undefined,
        voice: formData.voice,
        hasVoiceFile: !!voiceDataUrl,
        systemPrompt: systemPrompt.substring(0, 50) + "...",
        firstMessage: firstMessage
      })
      
      // Create the persona - our backend will handle Simli agent creation
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          productName: formData.productName || null,
          productDescription: formData.productDescription || null,
          productLink: formData.productLink || null,
          systemPrompt: systemPrompt,
          firstMessage: firstMessage,
          faceId: formData.faceId || DEFAULT_FACE_ID, // Include the Simli face ID with fallback
          originalCharacterId: isCustomFaceInQueue ? originalFaceResponse?.character_uid : undefined,
          voice: formData.voice,
          useCustomVoice: formData.useCustomVoice,
          voiceData: voiceDataUrl, // Include voice data URL if available
          isCustomFaceInQueue: isCustomFaceInQueue
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create persona")
      }
      
      const data = await response.json()
      console.log("Persona created with ID:", data.id)
      
      // Navigate to the persona chat
      router.push(`/chat/${data.id}`)
    } catch (error) {
      console.error("Error submitting form:", error)
      setError(error instanceof Error ? error.message : "Failed to create persona")
      setLoading(false)
    }
  }

  // Function to generate system prompt based on product and persona info
  const generateSystemPrompt = (
    personaName: string,
    personaDescription: string,
    productName?: string,
    productDescription?: string,
    productLink?: string,
    personaType: PersonaType = 'default'
  ) => {
    return generateEnhancedPrompt({
      name: personaName,
      description: personaDescription,
      productName: productName || "",
      productDescription: productDescription || "",
      productLink: productLink || "",
      personaType
    });
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

  // Start timer when face generation begins
  useEffect(() => {
    if (isCustomFaceInQueue && !processingTimerRef.current) {
      // Start the timer
      setProcessingTime(0);
      processingTimerRef.current = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
    } else if (!isCustomFaceInQueue && processingTimerRef.current) {
      // Clear the timer when processing completes
      clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
    };
  }, [isCustomFaceInQueue]);

  // Helper function to format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      setIsPollingActive(false);
    };
  }, []);

  // Add function to handle personaType change
  const handlePersonaTypeChange = (value: PersonaType) => {
    setFormData({
      ...formData,
      personaType: value
    });
  };

  // Step 2: Face ID
  const renderFaceIdStep = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: activeStep >= 2 ? 1 : 0, y: activeStep >= 2 ? 0 : 10 }}
        transition={{ duration: 0.4 }}
        className={`mb-8 rounded-xl bg-white p-6 shadow-sm ${activeStep < 2 ? 'hidden' : ''}`}
      >
        <h2 className="mb-4 text-xl font-semibold">Step 2: Upload or generate a face for your AI</h2>
        
        <div className="mb-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1">
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Upload a portrait photo</p>
                <div
                  className={`rounded-lg border-2 border-dashed p-4 transition-all ${
                    isDragging ? "border-pink-400 bg-pink-50" : 
                    error && error.toLowerCase().includes("image") ? "border-red-400 bg-red-50" : 
                    "border-gray-300 hover:border-pink-300 hover:bg-gray-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/')) {
                        setImage(file);
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setPreviewImage(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                        
                        // Clear errors when user tries again
                        setError(null);
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
              </div>

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
              
              {/* Progress indicator for custom face generation */}
              {isCustomFaceInQueue && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Processing your face...</p>
                    <p className="text-sm font-medium text-gray-600">{faceGenerationStatus.progress}%</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-700"
                      style={{ width: `${faceGenerationStatus.progress}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{faceGenerationStatus.message}</p>
                  
                  {/* Show estimated time left for processing */}
                  {faceGenerationStatus.progress > 0 && faceGenerationStatus.progress < 100 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Processing time: {formatTime(processingTime)} 
                      {processingTime < 180 && " (typically takes 1-3 minutes)"}
                    </p>
                  )}
                </div>
              )}
              
              {formData.faceId && !isCustomFaceInQueue && (
                <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
                  <div className="flex items-center">
                    <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                    <p>Face ID generated successfully!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 font-sans">
      
      {/* Instructions card - Framer style with shaded rounded bars */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { number: 1, title: "Basic Information", desc: "Name and describe your AI assistant" },
            { number: 2, title: "Appearance", desc: "Add a photo or use a pre-made avatar" },
            { number: 3, title: "Voice", desc: "Choose a voice or upload your own" },
            { number: 4, title: "Preview", desc: "See and hear your AI in action" }
          ].map((step, index) => (
            <motion.div 
              key={step.number}
              className={`p-5 rounded-2xl bg-gradient-to-br ${
                activeStep >= step.number 
                  ? 'from-indigo-50 to-purple-50 shadow-sm'
                  : 'from-gray-50 to-gray-100'
              } transition-all duration-500`}
              whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium ${
                  activeStep >= step.number
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.number}
                </div>
                <h3 className={`font-medium ${
                  activeStep >= step.number
                    ? 'text-indigo-900'
                    : 'text-gray-500'
                }`}>
                  {step.title}
                </h3>
              </div>
              <p className={`text-sm pl-11 ${
                activeStep >= step.number
                  ? 'text-indigo-700'
                  : 'text-gray-400'
              }`}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      {/* Error message - Framer style */}
      {error && (
        <motion.div 
          className="mb-8 p-5 bg-white rounded-2xl text-red-500 flex items-start gap-3"
          style={{ boxShadow: "0 10px 30px -5px rgba(254, 202, 202, 0.2)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-full bg-red-50 p-2 flex-shrink-0">
            <X className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
            {faceGenerationStatus.failed && (
              <Button
                type="button"
                onClick={() => {
                  clearFaceGeneration();
                  fileInputRef.current?.click();
                }}
                className="mt-3 bg-white text-red-500 hover:bg-red-50 px-4 py-2 text-sm flex items-center gap-2 rounded-full border border-red-100 transition-colors duration-300"
              >
                <Upload className="h-4 w-4" />
                Try with New Image
              </Button>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Success message - Framer style */}
      {successMessage && !error && (
        <motion.div 
          className="mb-8 p-5 bg-white rounded-2xl text-green-600 flex items-start gap-3"
          style={{ boxShadow: "0 10px 30px -5px rgba(187, 247, 208, 0.2)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-full bg-green-50 p-2 flex-shrink-0">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <p>{successMessage}</p>
        </motion.div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {/* Main form container with Framer-inspired design */}
          <motion.div 
            className="bg-white rounded-3xl shadow-lg overflow-hidden"
            style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.1)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Steps indicator */}
            <div className="py-5 px-8 flex justify-center">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(step => (
                  <div key={step} className="flex items-center">
                    <motion.div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm
                        ${activeStep >= step 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500' 
                          : 'bg-gray-200'}`}
                      whileHover={activeStep >= step ? { scale: 1.05 } : {}}
                      whileTap={activeStep >= step ? { scale: 0.98 } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      {activeStep > step ? <Check className="w-5 h-5" /> : step}
                    </motion.div>
                    {step < 3 && (
                      <div className="flex items-center mx-2 w-20">
                        <motion.div 
                          className={`h-0.5 w-full ${activeStep > step ? 'bg-purple-500' : 'bg-gray-200'}`}
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: activeStep > step ? 0.5 : 0, delay: activeStep > step ? 0.2 : 0 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Content sections - Framer style */}
            <div className="p-8">
              {/* Step 1: Basic Information */}
              <div className="transition-all duration-500">
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
                      <Label htmlFor="personaType">Persona Type</Label>
                  <Select
                    value={formData.personaType}
                    onValueChange={(value) => handlePersonaTypeChange(value as PersonaType)}
                  >
                    <SelectTrigger className="w-full border border-indigo-200 focus:border-indigo-400 bg-white rounded-xl shadow-sm">
                      <SelectValue placeholder="Select a persona type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-0 shadow-lg rounded-xl overflow-hidden">
                      <div className="p-2 max-h-[300px] overflow-y-auto bg-white">
                        <SelectItem value="default" className="rounded-lg my-1 hover:bg-indigo-50">Default - Professional & Balanced</SelectItem>
                        <SelectItem value="tech" className="rounded-lg my-1 hover:bg-indigo-50">Technology - Technical & Innovative</SelectItem>
                        <SelectItem value="lifestyle" className="rounded-lg my-1 hover:bg-indigo-50">Lifestyle - Approachable & Trendy</SelectItem>
                        <SelectItem value="finance" className="rounded-lg my-1 hover:bg-indigo-50">Finance - Authoritative & Precise</SelectItem>
                        <SelectItem value="healthcare" className="rounded-lg my-1 hover:bg-indigo-50">Healthcare - Caring & Informative</SelectItem>
                        <SelectItem value="entertainment" className="rounded-lg my-1 hover:bg-indigo-50">Entertainment - Energetic & Engaging</SelectItem>
                        <SelectItem value="food" className="rounded-lg my-1 hover:bg-indigo-50">Food & Dining - Passionate & Descriptive</SelectItem>
                        <SelectItem value="travel" className="rounded-lg my-1 hover:bg-indigo-50">Travel - Adventurous & Inspiring</SelectItem>
                        <SelectItem value="education" className="rounded-lg my-1 hover:bg-indigo-50">Education - Patient & Instructive</SelectItem>
                        <SelectItem value="luxury" className="rounded-lg my-1 hover:bg-indigo-50">Luxury - Sophisticated & Exclusive</SelectItem>
                        <SelectItem value="fitness" className="rounded-lg my-1 hover:bg-indigo-50">Fitness - Motivational & Supportive</SelectItem>
                      </div>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-indigo-700 italic mt-1">
                    Choose a personality type that best matches your AI spokesperson's role.
                  </p>
                </div>
                
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
                    placeholder="Describe the product"
                        className="p-3 text-base border-0 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl shadow-sm bg-gray-50"
                    rows={3}
                  />
                </div>
                
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
              
              {/* Divider */}
              <div className="my-8 border-t border-gray-100"></div>
          
          {/* Step 2: Appearance */}
              <div className="transition-all duration-500">
          <motion.div 
                  className="flex items-center gap-2 mb-6"
                  initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Appearance</h2>
                </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left column: Image upload */}
              <div className="space-y-6">
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-2xl shadow-sm">
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                    <ImageIcon className="h-5 w-5 text-pink-500" />
                    Reference Image
                  </h3>
                      <div className="text-sm text-gray-700 mb-4 p-4 bg-white bg-opacity-60 rounded-xl">
                        <p className="font-medium mb-2">Image requirements:</p>
                        <ul className="list-disc ml-4 space-y-1 text-gray-600">
                      <li>Clear, front-facing photo of a face</li>
                      <li>Minimum resolution: 512x512 pixels</li>
                      <li>Maximum file size: 10MB</li>
                    </ul>
                  </div>
                  <div className="flex flex-col items-center space-y-4">
                    {previewImage ? (
                          <motion.div 
                            className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-md group"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                          >
                        <Image 
                          src={previewImage} 
                          alt="Preview" 
                          fill
                          className="object-cover transition-all group-hover:scale-105"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setImage(null)
                            setPreviewImage(null)
                          }}
                          className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white"
                        >
                          <X size={14} />
                        </button>
                          </motion.div>
                    ) : (
                          <motion.div 
                            className="w-48 h-48 border-2 border-dashed border-pink-300 rounded-2xl flex items-center justify-center bg-white bg-opacity-50 cursor-pointer hover:border-pink-400 transition-all duration-300"
                        onClick={() => fileInputRef.current?.click()}
                            whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(236, 72, 153, 0.1)" }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                      >
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-pink-400" />
                          <p className="mt-2 text-sm text-gray-600">Upload an image</p>
                        </div>
                          </motion.div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                          className="rounded-full border-2 border-pink-300 hover:border-pink-500 hover:bg-pink-50 text-pink-600 transition-all duration-300"
                    >
                      {previewImage ? "Change Image" : "Upload Image"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Right column: Face ID and Avatar options */}
              <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm">
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                    <UserRound className="h-5 w-5 text-blue-500" />
                    Generate Face ID
                  </h3>
                  
                      {faceGenerationStatus.isReady ? (
                        <div className="mb-4 p-4 bg-green-50 rounded-xl text-sm text-green-800">
                          <p className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span><strong>Face ready:</strong> Your custom face has been generated and is ready to use.</span>
                          </p>
                        </div>
                      ) : isCustomFaceInQueue ? (
                        <div className="mb-4 p-4 bg-indigo-50 rounded-xl text-sm text-indigo-800">
                          <p className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            <span><strong>Face processing:</strong> {faceGenerationStatus.message}</span>
                          </p>
                          <div className="flex items-center justify-between mt-3 text-xs">
                            <span>Last checked: {faceGenerationStatus.lastChecked ? new Date(faceGenerationStatus.lastChecked).toLocaleTimeString() : 'N/A'}</span>
                            <button 
                              onClick={checkFaceStatus} 
                              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                              disabled={isPollingActive}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Refresh Status
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mb-4 p-4 bg-white bg-opacity-60 rounded-xl">
                          <strong>Step 1:</strong> Upload a reference image and generate a face ID using your image.
                          <span className="block mt-1 text-xs italic">
                            Note: Face generation takes 1-3 minutes to process. For faster results, use squared images under 1MB in size.
                          </span>
                        </p>
                      )}
                  
                  <Button
                    type="button"
                        disabled={!image || isGeneratingFace || (isCustomFaceInQueue && !faceGenerationStatus.isReady)}
                    onClick={handleGenerateFaceId}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 transition-opacity rounded-xl h-12"
                  >
                    {isGeneratingFace ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Face ID...
                      </>
                        ) : faceGenerationStatus.isReady ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                            Face ID Generated
                          </>
                        ) : isCustomFaceInQueue ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Face Generation in Progress...
                      </>
                    ) : (
                      <>
                        <UserRound className="mr-2 h-4 w-4" />
                        Generate Face ID
                      </>
                    )}
                  </Button>
                </div>
                
                    {/* Only show avatar option if no custom face is being generated */}
                    {!isCustomFaceInQueue && !faceGenerationStatus.isReady && (
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-2xl shadow-sm">
                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Generate Avatar
                  </h3>
                        <p className="text-sm text-gray-600 mb-4 p-4 bg-white bg-opacity-60 rounded-xl">
                    <strong>Alternative to Step 1:</strong> Skip image upload and use a pre-made AI avatar instead.
                  </p>
                  
                  <Button
                    type="button"
                    disabled={isGeneratingAvatar || Boolean(image && formData.faceId)}
                    onClick={handleGenerateAvatar}
                          className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:opacity-90 transition-opacity rounded-xl h-12"
                  >
                    {isGeneratingAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Avatar...
                      </>
                    ) : formData.faceId && !image ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Avatar Generated
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Avatar
                      </>
                    )}
                  </Button>
                </div>
                    )}
              </div>
            </div>
              </div>
              
              {/* Divider */}
              <div className="my-8 border-t border-gray-100"></div>
          
          {/* Step 3: Preview & Voice */}
              <div className="transition-all duration-500">
          <motion.div 
                  className="flex items-center gap-2 mb-6"
                  initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Preview & Voice</h2>
                </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Preview */}
                  <div className="space-y-5">
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-2xl shadow-sm">
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
                    <Play className="h-5 w-5 text-green-500" />
                    Generate Preview
                  </h3>
                      <p className="text-sm text-gray-600 mb-4 p-4 bg-white bg-opacity-60 rounded-xl">
                    <strong>Step 2:</strong> After generating a Face ID or Avatar, create a video preview to see how your AI looks and sounds.
                  </p>
                      
                      {isCustomFaceInQueue && !faceGenerationStatus.isReady && (
                        <div className="mb-4 p-4 bg-amber-50 rounded-xl text-sm text-amber-800 flex items-start">
                          <span className="mt-0.5">⚠️</span>
                          <p className="ml-2">
                            Please wait for your custom face to finish processing before generating a preview.
                            <span className="block mt-1 font-medium">Current status: {faceGenerationStatus.message}</span>
                          </p>
                        </div>
                      )}
                  
                  {isGeneratingPreview ? (
                    <Button 
                      type="button"
                      variant="default"
                      disabled={true}
                          className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 transition-opacity rounded-xl h-12"
                    >
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Preview...
                    </Button>
                  ) : isPreviewGenerated ? (
                    <Button 
                      type="button"
                      variant="default"
                          disabled={!formData.faceId || (isCustomFaceInQueue && !faceGenerationStatus.isReady)}
                      onClick={handleGeneratePreview}
                          className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 transition-opacity rounded-xl h-12"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Regenerate Preview
                    </Button>
                  ) : (
                    <Button 
                      type="button"
                      variant="default"
                          disabled={!formData.faceId || (isCustomFaceInQueue && !faceGenerationStatus.isReady)}
                      onClick={handleGeneratePreview}
                          className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 transition-opacity rounded-xl h-12"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Generate Video Preview
                    </Button>
                  )}
                  
                  {videoPreview && (
                        <motion.div 
                          className="mt-4"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                      <video 
                        src={videoPreview.mp4Url}
                        controls
                            className="w-full rounded-xl shadow-md"
                      />
                        </motion.div>
                  )}
                </div>
              </div>
              
              {/* Right: Voice Selection */}
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
              </div>
            </motion.div>
          
          {/* Processing Status Section - moved below preview and voice */}
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
                  
                  {/* Progress bar */}
                  {!faceGenerationStatus.isReady && !faceGenerationStatus.failed && (
                    <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: `${faceGenerationStatus.progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                  
                  {faceGenerationStatus.failed ? (
                    <div className="flex gap-3 mt-3">
                      <Button
                        type="button"
                        onClick={clearFaceGeneration}
                        className="rounded-full bg-red-50 text-red-500 hover:bg-red-100 px-4 py-2 text-sm flex items-center gap-2 transition-colors duration-300"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          clearFaceGeneration();
                          fileInputRef.current?.click();
                        }}
                        className="rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 px-4 py-2 text-sm flex items-center gap-2 transition-colors duration-300"
                      >
                        <Upload className="h-4 w-4" />
                        Try with New Image
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Submit buttons */}
          <motion.div 
            className="flex justify-end space-x-4 pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-full text-gray-700 transition-all duration-300"
            >
              Cancel
            </Button>
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
            <Button 
              type="submit"
                disabled={loading || (isCustomFaceInQueue && !faceGenerationStatus.isReady)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2
                  ${loading 
                    ? 'bg-indigo-400 hover:bg-indigo-400 cursor-not-allowed' 
                    : isCustomFaceInQueue && !faceGenerationStatus.isReady
                    ? 'bg-indigo-300 hover:bg-indigo-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl shadow-lg'
                  }`}
            >
              {loading ? (
                <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-5 w-5" />
                    </motion.div>
                  Creating...
                </>
                ) : isCustomFaceInQueue && !faceGenerationStatus.isReady ? (
                  <>
                    <Loader2 className="h-5 w-5" />
                    Waiting for Face Generation...
                  </>
              ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Create AI Persona
                  </>
              )}
            </Button>
            </motion.div>
          </motion.div>
        </div>
      </form>
    </div>
  )
} 