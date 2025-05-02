"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProductVideoUpload } from "@/components/create/ProductVideoUpload"
import { Wand2, Loader2, RefreshCw, Trash2, Film, Save } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScenePrompt } from "@/lib/kling-api"
import { toast } from "@/components/ui/use-toast"
import { ProductVideo } from "@/lib/types"
import Image from "next/image"
import { Spinner } from "@/components/ui/spinner"
import { useInterval } from "../../hooks/use-interval"

interface ProductVideoManagerProps {
  personaId: string
  initialProductDescription: string
  initialProductImageUrl: string
}

interface VideoWithTask extends ProductVideo {
  taskId?: string;
}

export function ProductVideoManager({
  personaId,
  initialProductDescription,
  initialProductImageUrl
}: ProductVideoManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoWithTask[]>([])
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([])
  const [isPolling, setIsPolling] = useState(false)
  const [sceneDescriptions, setSceneDescriptions] = useState<string[]>([])
  const [productImage, setProductImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(initialProductImageUrl)
  const [productDescription, setProductDescription] = useState<string>(initialProductDescription)
  const [scenesGenerated, setScenesGenerated] = useState<ScenePrompt[]>([])
  const [productInfoChanged, setProductInfoChanged] = useState(false)
  
  // Track changes to product info
  useEffect(() => {
    const descriptionChanged = productDescription !== initialProductDescription;
    const imageChanged = (productImage !== null || previewImage !== initialProductImageUrl);
    setProductInfoChanged(descriptionChanged || imageChanged);
  }, [productDescription, productImage, previewImage, initialProductDescription, initialProductImageUrl]);
  
  // Add polling functionality to check for completed videos
  useInterval(
    async () => {
      if (pendingTaskIds.length === 0) {
        setIsPolling(false);
        return;
      }
      
      try {
        // Check status of each pending task
        const updatedVideos = [...videos];
        let updatedTaskIds = [...pendingTaskIds];
        let changes = false;
        
        for (const taskId of pendingTaskIds) {
          const response = await fetch(`/api/personas/${personaId}/videos/task/${taskId}`);
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.status === "completed" && data.videoUrl) {
            // Update the video in our list
            const videoIndex = updatedVideos.findIndex(v => v.taskId === taskId);
            
            if (videoIndex >= 0) {
              updatedVideos[videoIndex] = {
                ...updatedVideos[videoIndex],
                videoUrl: data.videoUrl,
                status: "completed"
              };
              
              changes = true;
              updatedTaskIds = updatedTaskIds.filter(id => id !== taskId);
              
              toast({
                title: "Video Ready",
                description: "A video has finished processing",
              });
            }
          }
        }
        
        if (changes) {
          setVideos(updatedVideos);
          setPendingTaskIds(updatedTaskIds);
        }
        
        // Stop polling if no more pending tasks
        if (updatedTaskIds.length === 0) {
          setIsPolling(false);
        }
      } catch (err) {
        console.error("Error polling for video updates:", err);
      }
    },
    isPolling ? 10000 : null // Poll every 10 seconds if active
  );
  
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
        
        // Check for any videos with taskIds that are pending
        const pendingVideos = data.filter((v: VideoWithTask) => v.taskId && v.status !== "completed");
        
        if (pendingVideos.length > 0) {
          setPendingTaskIds(pendingVideos.map((v: VideoWithTask) => v.taskId as string));
          setIsPolling(true);
        }
      } catch (err) {
        console.error('Failed to fetch videos:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch videos')
      }
    }
    
    fetchVideos()
  }, [personaId])
  
  // Save product information
  const handleSaveProductInfo = async () => {
    if (!productDescription) {
      setError('Product description is required')
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      // Upload image if changed
      let imageUrl = initialProductImageUrl;
      
      if (productImage) {
        // Create FormData to upload image
        const formData = new FormData();
        formData.append('image', productImage);
        formData.append('personaId', personaId);
        
        const uploadResponse = await fetch('/api/upload/product-image', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload product image');
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.imageUrl;
      }
      
      // Update persona with product info
      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productDescription,
          productImageUrl: imageUrl || initialProductImageUrl
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update product information');
      }
      
      toast({
        title: "Success",
        description: "Product information saved successfully",
      });
      
      setProductInfoChanged(false);
    } catch (err) {
      console.error('Failed to save product info:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product information');
      
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to save product information',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGenerateVideo = async () => {
    if (isGenerating) return;
    setError("");
    setIsGenerating(true);
    
    try {
      // Validate product description
      if (!productDescription) {
        throw new Error("Please enter a product description");
      }
      
      // Warn about unsaved changes
      if (productInfoChanged) {
        throw new Error("Please save your product information first");
      }
      
      // Determine the image URL to use
      let imageUrl = initialProductImageUrl;
      
      // If no previous image exists but there is a preview, warn user to save first
      if (!initialProductImageUrl && previewImage) {
        throw new Error("Please save your product image before generating videos");
      }
      
      // If no image exists at all, show error
      if (!imageUrl && !previewImage) {
        throw new Error("Please upload a product image");
      }
      
      console.log("Generating videos with image:", imageUrl);
      
      // First generate scenes using OpenAI
      const productName = "Your Product"; // You can extract this from description or have a separate field
      
      const sceneResponse = await fetch('/api/ai/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription,
          productName
        })
      })
      
      if (!sceneResponse.ok) {
        const errorData = await sceneResponse.json();
        throw new Error(`Failed to generate scenes: ${errorData.error || sceneResponse.status}`);
      }
      
      const sceneData = await sceneResponse.json()
      const scenes = sceneData.scenes || []
      
      if (!scenes.length) {
        throw new Error("No scene descriptions generated");
      }
      
      // Set the scenes in state for display
      setScenesGenerated(scenes)
      
      // Transform ScenePrompt[] to string[] for the API
      const sceneStrings = scenes.map((scene: ScenePrompt) => scene.prompt)
      setSceneDescriptions(sceneStrings)
      
      console.log(`Sending ${sceneStrings.length} scenes for video generation`);
      
      // Call API to generate videos
      const response = await fetch(`/api/personas/${personaId}/generate-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sceneDescriptions: sceneStrings,
          productImageUrl: imageUrl
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error generating videos: ${errorData.error || response.status}`);
      }
      
      const newVideos = await response.json();
      
      if (!newVideos || !Array.isArray(newVideos) || newVideos.length === 0) {
        throw new Error("No videos were generated");
      }
      
      console.log(`Successfully generated ${newVideos.length} videos`);
      setVideos((prev) => [...newVideos, ...prev]);
      
      toast({
        title: "Success",
        description: `${newVideos.length} videos generated successfully`,
      });
    } catch (err) {
      console.error('Failed to generate videos:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate videos';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
      
      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
    } catch (err) {
      console.error('Failed to delete video:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete video')
      
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to delete video',
        variant: "destructive",
      });
    }
  }
  
  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Product Info Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <ProductVideoUpload
          productDescription={productDescription}
          setProductDescription={setProductDescription}
          productImage={productImage}
          setProductImage={setProductImage}
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
          isGenerating={isGenerating}
          scenePrompts={scenesGenerated}
        />
        
        {/* Save product info button */}
        {productInfoChanged && (
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleSaveProductInfo} 
              disabled={isSaving || !productDescription}
              className="bg-gradient-to-r from-blue-500 to-indigo-500"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Product Info
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* Video Generation Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">Generate Product Videos</h2>
        
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">
            Generate AI videos showcasing your product or service
          </p>
          
          <Button 
            onClick={handleGenerateVideo} 
            disabled={isGenerating || !productDescription || (!initialProductImageUrl && !previewImage) || productInfoChanged}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
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
            <div key={video.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
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
                    <Trash2 className="h-4 w-4 mr-1" />
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
    </div>
  )
} 