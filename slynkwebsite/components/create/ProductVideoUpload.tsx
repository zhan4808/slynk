"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, X, Film, ImageIcon, Wand2, Loader2 } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ScenePrompt } from "@/lib/kling-api"

interface ProductVideoUploadProps {
  productDescription: string
  setProductDescription: (description: string) => void
  productImage: File | null
  setProductImage: (image: File | null) => void
  previewImage: string | null
  setPreviewImage: (url: string | null) => void
  isGenerating?: boolean
  scenePrompts?: ScenePrompt[]
}

export function ProductVideoUpload({
  productDescription,
  setProductDescription,
  productImage,
  setProductImage,
  previewImage,
  setPreviewImage,
  isGenerating = false,
  scenePrompts = []
}: ProductVideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProductImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-800">
          <Film className="h-5 w-5 text-purple-500" />
          Product/Service Information
        </h3>
        
        {isGenerating && (
          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 flex gap-1 items-center">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating videos...
          </Badge>
        )}
      </div>
      
      <div className="space-y-6">
        <div>
          <Label htmlFor="productDescription" className="text-sm font-medium text-gray-700 mb-2 block">
            Product/Service Description
          </Label>
          <Textarea
            id="productDescription"
            name="productDescription"
            placeholder="Describe the product or service you want to advertise. Be detailed about features, benefits, and target audience."
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className="min-h-32 text-sm"
            disabled={isGenerating}
          />
          <p className="text-xs text-gray-500 mt-2">
            This detailed description will be used to generate videos advertising your product or service.
          </p>
        </div>
        
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Product/Service Reference Image
          </Label>
          
          <div className="flex flex-col items-center gap-4">
            {previewImage ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative rounded-lg overflow-hidden w-48 h-48 shadow-sm"
              >
                <Image 
                  src={previewImage} 
                  alt="Product preview" 
                  width={192}
                  height={192}
                  className="object-cover w-full h-full"
                />
                {!isGenerating && (
                  <button
                    onClick={() => {
                      setProductImage(null)
                      setPreviewImage(null)
                    }}
                    className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white transition-colors"
                  >
                    <X size={16} className="text-gray-700" />
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div 
                className="w-48 h-48 border-2 border-dashed border-purple-300 rounded-lg flex items-center justify-center bg-white bg-opacity-50 cursor-pointer hover:border-purple-400 transition-all duration-300"
                onClick={() => !isGenerating && fileInputRef.current?.click()}
                whileHover={{ scale: isGenerating ? 1 : 1.02, boxShadow: isGenerating ? "none" : "0 10px 25px -5px rgba(124, 58, 237, 0.1)" }}
                whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                transition={{ duration: 0.2 }}
                style={{ opacity: isGenerating ? 0.7 : 1 }}
              >
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-purple-400" />
                  <p className="mt-2 text-sm text-gray-600">Upload product image</p>
                </div>
              </motion.div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isGenerating}
            />
            
            <Button 
              type="button" 
              variant="outline"
              onClick={() => !isGenerating && fileInputRef.current?.click()}
              className="rounded-full border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 text-purple-600 transition-all duration-300"
              disabled={isGenerating}
            >
              {previewImage ? "Change Image" : "Upload Image"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Upload a high-quality image of your product or service.
          </p>
        </div>
        
        {/* Scene generation info */}
        {isGenerating && scenePrompts.length > 0 && (
          <div className="mt-8 border rounded-lg p-4 bg-purple-50 border-purple-200">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-purple-700 mb-3">
              <Wand2 className="h-4 w-4" />
              Generating 3 Video Scenes
            </h4>
            
            <div className="space-y-3">
              {scenePrompts.map((scene, index) => (
                <div key={index} className="bg-white p-3 rounded border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-100 text-purple-700 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      {index + 1}
                    </div>
                    <h5 className="font-medium text-sm">{scene.title}</h5>
                    <div className="ml-auto">
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{scene.description}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 bg-white p-3 rounded border border-purple-100">
              <p className="text-xs text-gray-600">
                Using Kling AI to transform your product image into three distinct video scenes based on your product description. 
                This process typically takes 1-2 minutes. The AI will create consistent 
                videos that maintain your product's visual identity while presenting it in different contexts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 