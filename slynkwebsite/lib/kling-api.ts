import { getKlingAuthToken, isKlingConfigured } from './kling-auth'

const KLING_API_URL = 'https://api.klingai.com'

interface VideoGenerationConfig {
  model: string
  mode: 'std' | 'pro'
  duration: '5' | '10'
  imageUrl: string
  prompt: string
  negativPrompt?: string
  cfgScale?: number
}

export interface ScenePrompt {
  title: string
  description: string
  prompt: string
}

// Interface for video generation parameters
export interface VideoGenerationParams {
  imageUrl: string
  voiceover: string
  personaImageUrl?: string
}

// Interface for video generation result
export interface VideoResult {
  videoUrl: string
  thumbnailUrl?: string
  taskId?: string
}

// Generate a video with the given parameters
export async function generateVideo(params: VideoGenerationParams): Promise<VideoResult> {
  try {
    if (isKlingConfigured()) {
      // Create a task to generate a video
      const taskId = await createKlingVideoTask({
        model: 'kling-v1-6',
        mode: 'std',
        duration: '5',
        imageUrl: params.imageUrl,
        prompt: params.voiceover
      })
      
      // For demo purposes, return a mock URL immediately
      // In production, you would poll for task completion
      return {
        videoUrl: `https://example.com/videos/mock-${Date.now()}.mp4`,
        thumbnailUrl: params.imageUrl,
        taskId
      }
    } else {
      // Use mock video generation
      // In a real implementation, we would wait for the task to complete
      return {
        videoUrl: `https://example.com/videos/mock-${Date.now()}.mp4`,
        thumbnailUrl: params.imageUrl
      }
    }
  } catch (error) {
    console.error("Error generating video:", error)
    throw error
  }
}

// Generate 3 different scene prompts from a product description using an LLM
export async function generateScenePrompts(
  productDescription: string, 
  productName: string
): Promise<ScenePrompt[]> {
  try {
    // Make a request to OpenAI API
    const response = await fetch('/api/ai/generate-scenes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productDescription,
        productName
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate scene prompts')
    }
    
    const data = await response.json()
    return data.scenes
  } catch (error) {
    console.error('Error generating scene prompts:', error)
    
    // Return fallback scenes if API call fails
    return [
      {
        title: "Product Overview",
        description: "A general overview of the product highlighting its main features.",
        prompt: `A professional product showcase of ${productName}. The camera slowly rotates around the product, highlighting its key features with subtle lighting changes. The background is clean and minimal.`
      },
      {
        title: "In Action",
        description: "Shows the product being used in its intended environment.",
        prompt: `${productName} being used in a real-world setting. The scene shows people using and enjoying the product, demonstrating its practical benefits and features.`
      },
      {
        title: "Lifestyle Shot",
        description: "Product integrated into an aspirational lifestyle setting.",
        prompt: `A lifestyle scene featuring ${productName} as part of an attractive, aspirational setting. The scene evokes positive emotions and shows how the product enhances the user's life.`
      }
    ]
  }
}

// Create a task to generate a video from an image
export async function createKlingVideoTask(
  config: VideoGenerationConfig
): Promise<string> {
  try {
    if (!isKlingConfigured()) {
      throw new Error('Kling API is not configured')
    }
    
    const token = await getKlingAuthToken()
    
    const response = await fetch(`${KLING_API_URL}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_name: config.model || 'kling-v1-6',
        mode: config.mode || 'std',
        duration: config.duration || '5',
        image: config.imageUrl,
        prompt: config.prompt,
        negative_prompt: config.negativPrompt || '',
        cfg_scale: config.cfgScale || 0.5
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create video task: ${error.message || JSON.stringify(error)}`)
    }
    
    const data = await response.json()
    return data.task_id
  } catch (error) {
    console.error('Error creating Kling video task:', error)
    throw error
  }
}

// Check the status of a video generation task
export async function checkKlingTaskStatus(
  taskId: string
): Promise<{ status: string; url?: string }> {
  try {
    if (!isKlingConfigured()) {
      throw new Error('Kling API is not configured')
    }
    
    const token = await getKlingAuthToken()
    
    const response = await fetch(`${KLING_API_URL}/v1/videos/image2video/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to check task status: ${error.message || JSON.stringify(error)}`)
    }
    
    const data = await response.json()
    
    // Return status and video URL if available
    return {
      status: data.status,
      url: data.result?.url
    }
  } catch (error) {
    console.error('Error checking Kling task status:', error)
    throw error
  }
}

// Generate videos for multiple scenes
export async function generateProductVideos(
  productDescription: string,
  productName: string,
  imageUrl: string
): Promise<string[]> {
  try {
    // 1. Generate scene prompts
    const scenes = await generateScenePrompts(productDescription, productName)
    
    // 2. Create tasks for each scene
    const taskIds = await Promise.all(
      scenes.map(scene => 
        createKlingVideoTask({
          model: 'kling-v1-6',
          mode: 'std',
          duration: '5',
          imageUrl,
          prompt: scene.prompt
        })
      )
    )
    
    return taskIds
  } catch (error) {
    console.error('Error generating product videos:', error)
    throw error
  }
} 