"use client"

import { useState, useEffect } from "react"
import { useParams, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, SplitSquareVertical } from "lucide-react"
import { DynamicNavbar } from "@/components/dynamic-navbar"
import { ProductVideoChat } from "@/components/ProductVideoChat"
import { ProductVideo } from "@/lib/types"

// Placeholder for demo videos if none are available
const DEMO_VIDEOS = [
  {
    id: "demo-1",
    title: "Product Overview",
    description: "A high-level overview of our amazing product",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    personaId: "demo",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    keywords: "overview product introduction demo features"
  },
  {
    id: "demo-2",
    title: "Feature Demonstration",
    description: "See our product in action with this detailed feature demo",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    personaId: "demo",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    keywords: "demo features detail showcase functionality"
  }
];

export default function ChatPage() {
  const { personaId } = useParams() as { personaId: string };
  const [persona, setPersona] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [showSplitView, setShowSplitView] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  useEffect(() => {
    async function loadPersona() {
      try {
        setLoading(true);
        const response = await fetch(`/api/personas/${personaId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch persona data");
        }
        
        const data = await response.json();
        setPersona(data);
        
        // Set system prompt and first message
        setSystemPrompt(data.systemPrompt || "");
        setFirstMessage(data.firstMessage || `Hello, I'm ${data.name}. How can I help you today?`);
        
        // Load product videos
        const videoResponse = await fetch(`/api/personas/${personaId}/videos`);
        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          setVideos(videoData.length > 0 ? videoData : DEMO_VIDEOS);
        } else {
          // Use demo videos if no videos are available
          setVideos(DEMO_VIDEOS);
        }
      } catch (error) {
        console.error("Error loading persona:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (personaId) {
      loadPersona();
    }
  }, [personaId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-pink-500 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-4 text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!persona) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <DynamicNavbar />
      <div className="flex-1 flex flex-col pt-24">
        <div className="container mx-auto max-w-7xl px-4 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              Conversation with {persona.name}
            </h1>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full border-2 border-gray-200 hover:border-gray-300"
                onClick={() => setShowSplitView(!showSplitView)}
              >
                <SplitSquareVertical size={18} />
              </Button>
              
              <Link href="/dashboard">
                <Button variant="outline" className="rounded-full border-2 border-gray-200 hover:border-gray-300">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="h-[70vh]">
            <ProductVideoChat
              personaId={personaId}
              personaData={{
                name: persona.name,
                systemPrompt: systemPrompt,
                firstMessage: firstMessage,
                faceId: persona.faceId
              }}
              videos={videos}
              layout={showSplitView ? "horizontal" : "vertical"}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 