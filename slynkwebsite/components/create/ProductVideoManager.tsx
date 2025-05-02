"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProductVideoUpload } from "@/components/create/ProductVideoUpload"
import { Wand2, Loader2, RefreshCw, Trash2, Film } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScenePrompt } from "@/lib/kling-api"
import { toast } from "@/components/ui/use-toast"
import { ProductVideo } from "@/lib/types"
import Image from "next/image"
import { Spinner } from "@/components/ui/spinner"

interface ProductVideoManagerProps {
  personaId: string
  productDescription: string
  productImageUrl: string
}

export function ProductVideoManager({
  personaId,
  productDescription,
  productImageUrl
}: ProductVideoManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videos, setVideos] = useState<ProductVideo[]>([])
  const [sceneDescriptions, setSceneDescriptions] = useState<string[]>([])
  const [productImage, setProductImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(productImageUrl)
  const [scenesGenerated, setScenesGenerated] = useState<ScenePrompt[]>([])
  
  // Load existing videos
  useEffect(() => {
    if (!personaId) return
    
    const fetchVideos = async () => {
      try {
        const response = await fetch(`/api/personas/${personaId}/videos`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Error fetching videos: ${response.status} - ${errorData.error || 'Unknown error'}`)
        }
        
        const data = await response.json()
        setVideos(data)
      } catch (err) {
        console.error('Failed to fetch videos:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch videos')
      }
    }
    
    fetchVideos()
  }, [personaId])
  
  const handleGenerateVideo = async () => {
    if (!productDescription || !productImageUrl) {
      setError('Product description and image are required')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Generate scene descriptions first
      // Extract product name from description (first few words)
      const words = productDescription.split(' ')
      const productName = words.slice(0, Math.min(3, words.length)).join(' ')
      
      const sceneResponse = await fetch('/api/ai/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription,
          productName
        })
      })
      
      if (!sceneResponse.ok) {
        throw new Error("Failed to generate scenes")
      }
      
      const sceneData = await sceneResponse.json()
      const scenes = sceneData.scenes || []
      
      // Set the scenes in state for display
      setScenesGenerated(scenes)
      
      // Transform ScenePrompt[] to string[] for the API
      const sceneStrings = scenes.map(scene => scene.prompt)
      setSceneDescriptions(sceneStrings)
      
      // Call API to generate videos
      const response = await fetch(`/api/personas/${personaId}/generate-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sceneDescriptions: sceneStrings,
          productDescription,
          productImageUrl
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Error generating videos: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }
      
      const newVideos = await response.json()
      setVideos((prev) => [...newVideos, ...prev])
    } catch (err) {
      console.error('Failed to generate videos:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate videos')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleDeleteVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/personas/${personaId}/videos/${videoId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Error deleting video: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }
      
      // Remove the deleted video from the list
      setVideos((prev) => prev.filter(video => video.id !== videoId))
    } catch (err) {
      console.error('Failed to delete video:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete video')
    }
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Product Videos</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Generate product videos using AI
        </p>
        
        <Button 
          onClick={handleGenerateVideo} 
          disabled={isGenerating || !productDescription || !productImageUrl}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Videos
            </>
          )}
        </Button>
      </div>
      
      {/* Video list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div key={video.id} className="border rounded-lg overflow-hidden">
            <video 
              src={video.videoUrl} 
              poster={video.thumbnailUrl} 
              controls
              className="w-full h-48 object-cover"
            />
            <div className="p-3">
              <h3 className="font-medium truncate">{video.title}</h3>
              <p className="text-sm text-gray-500 truncate">{video.description}</p>
              <div className="mt-2 flex justify-end">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeleteVideo(video.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {videos.length === 0 && !isGenerating && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No videos generated yet.
          </div>
        )}
      </div>
    </div>
  )
} 