"use client"

import { useState, useEffect } from "react"
import { ProductVideo } from "@/lib/types"
import SimliAgent from "@/components/SimliAgent"
import { ProductVideoPlayer } from "@/components/ProductVideoPlayer"
import { findRelevantVideo, isProductQuestion } from "@/lib/video-matching"

interface ProductVideoChatProps {
  personaId: string
  personaData: {
    name: string
    systemPrompt: string
    firstMessage: string
    faceId?: string
  }
  videos: ProductVideo[]
  layout?: "horizontal" | "vertical" // Layout orientation
}

export function ProductVideoChat({
  personaId,
  personaData,
  videos,
  layout = "horizontal"
}: ProductVideoChatProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [transcript, setTranscript] = useState<{speaker: string, text: string}[]>([])
  const [lastUserMessage, setLastUserMessage] = useState("")
  const [hasTriggeredVideo, setHasTriggeredVideo] = useState(false)
  
  // Handle user messages to find relevant videos
  const handleUserMessage = (message: string) => {
    setLastUserMessage(message)
    
    // Reset video trigger flag for new message
    setHasTriggeredVideo(false)
  }
  
  // Process agent responses to check if we should show a relevant video
  useEffect(() => {
    // Only proceed if:
    // 1. We have a transcript with at least two entries (user + agent)
    // 2. The last message is from the agent (not the user)
    // 3. We haven't already triggered a video for this conversation turn
    // 4. The previous user message was product-related
    if (
      transcript.length >= 2 && 
      transcript[transcript.length - 1].speaker === personaData.name &&
      !hasTriggeredVideo &&
      lastUserMessage &&
      isProductQuestion(lastUserMessage)
    ) {
      // Find the most relevant video to the last user message
      const relevantVideo = findRelevantVideo(lastUserMessage, videos)
      
      if (relevantVideo && relevantVideo.score > 0.3) {
        // Find the index of this video in our array
        const videoIndex = videos.findIndex(v => v.id === relevantVideo.video.id)
        if (videoIndex !== -1) {
          setCurrentVideoIndex(videoIndex)
          setHasTriggeredVideo(true)
        }
      }
    }
  }, [transcript, lastUserMessage, hasTriggeredVideo, videos, personaData.name])
  
  // Handle transcript updates from the SimliAgent
  const handleTranscriptUpdate = (updatedTranscript: {speaker: string, text: string}[]) => {
    setTranscript(updatedTranscript)
  }
  
  return (
    <div className={`flex gap-6 h-full ${layout === "horizontal" ? "flex-row" : "flex-col"}`}>
      {/* Simli Agent Section */}
      <div className={`${layout === "horizontal" ? "w-1/2" : "w-full"} rounded-xl overflow-hidden transition-all duration-300`}>
        <SimliAgent 
          personaId={personaId}
          personaData={personaData}
          onMessageSent={handleUserMessage}
          onTranscriptUpdate={handleTranscriptUpdate}
        />
      </div>
      
      {/* Product Video Section */}
      {videos.length > 0 && (
        <div 
          className={`${layout === "horizontal" ? "w-1/2" : "w-full h-96 mt-4"} rounded-xl overflow-hidden transition-all duration-300 bg-gray-100`}
        >
          <ProductVideoPlayer 
            videos={videos}
            currentVideoIndex={currentVideoIndex}
            setCurrentVideoIndex={setCurrentVideoIndex}
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  )
} 