import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateVideo } from "@/lib/kling-api"

// Check if Kling API is configured
const isKlingConfigured = () => {
  return !!(process.env.KLING_API_KEY && process.env.KLING_API_KEY.length > 10);
}

// Mock video generation for demo purposes when Kling API keys aren't configured
async function mockVideoGeneration(prompt: string, imageUrl?: string): Promise<{
  videoUrl: string
  thumbnailUrl: string
}> {
  // For demo purposes, return sample videos
  const videoIds = [
    'BigBuckBunny',
    'ElephantsDream',
    'ForBiggerBlazes',
    'ForBiggerEscapes',
    'ForBiggerFun',
    'ForBiggerJoyrides',
    'ForBiggerMeltdowns',
    'Sintel',
    'SubaruOutbackOnStreetAndDirt',
    'TearsOfSteel'
  ]
  
  const randomId = videoIds[Math.floor(Math.random() * videoIds.length)]
  
  return {
    videoUrl: `https://storage.googleapis.com/gtv-videos-bucket/sample/${randomId}.mp4`,
    thumbnailUrl: `https://storage.googleapis.com/gtv-videos-bucket/sample/images/${randomId}.jpg`
  }
}

// Generate a video title based on a prompt
function generateVideoTitle(index: number, description: string): string {
  const titles = [
    "Product Overview",
    "Feature Demonstration",
    "How It Works",
    "Customer Benefits",
    "See It In Action",
    "Product Highlights",
    "Why Choose Us",
    "Quick Demo",
    "Introducing",
    "The Solution For You"
  ]
  
  // Use the index to pick a title, or fall back to random if index is out of bounds
  const baseTitle = (index >= 0 && index < titles.length) 
    ? titles[index] 
    : titles[Math.floor(Math.random() * titles.length)]
  
  // Extract product name from description (first few words)
  const words = description.split(' ')
  const productName = words.slice(0, Math.min(3, words.length)).join(' ')
  
  return `${baseTitle}: ${productName}`
}

export async function POST(
  request: NextRequest,
  context: { params: { personaId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    
    // Use await with params to properly handle dynamic route parameters
    const { personaId } = await context.params
    
    // First check if persona belongs to this user
    const persona = await prisma.aIPersona.findUnique({
      where: {
        id: personaId,
        user: {
          email: session.user.email
        }
      }
    })
    
    if (!persona) {
      return NextResponse.json(
        { error: "Persona not found or not authorized" },
        { status: 404 }
      )
    }
    
    // Check if product description and image exist
    if (!persona.productDescription || !persona.productImageUrl) {
      return NextResponse.json(
        { error: "No product description or image found. Please add them first." },
        { status: 400 }
      )
    }
    
    // Parse the request body
    const data = await request.json()
    const { sceneDescriptions, productImageUrl } = data
    
    if (!sceneDescriptions || !Array.isArray(sceneDescriptions) || sceneDescriptions.length === 0) {
      return NextResponse.json(
        { error: "Scene descriptions are required" },
        { status: 400 }
      )
    }
    
    // Use provided image URL or fallback to the one stored with persona
    const rawImageUrl = productImageUrl || persona.productImageUrl;
    
    if (!rawImageUrl) {
      return NextResponse.json(
        { error: "Product image URL is required" },
        { status: 400 }
      )
    }
    
    // Ensure image URL is absolute for the Kling API
    const imageUrl = rawImageUrl.startsWith('http') 
      ? rawImageUrl 
      : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${rawImageUrl}`;
    
    // Check if we should use mock videos to avoid duplicates
    const forceMock = process.env.FORCE_MOCK_VIDEOS === 'true';
    let useMockVideos = !isKlingConfigured() || forceMock;
    
    // If we're using mock videos, just generate one instead of duplicates
    if (useMockVideos) {
      // Choose the best scene description as the main one
      const bestScene = sceneDescriptions[0];
      
      // Call the Kling API (which will return a mock video)
      const videoResult = await generateVideo({
        imageUrl,
        voiceover: bestScene,
        personaImageUrl: persona.adImageUrl
      });
      
      // Save just one video in the database
      const video = await prisma.productVideo.create({
        data: {
          title: `Product Video: ${persona.name}`,
          description: bestScene,
          videoUrl: videoResult.videoUrl,
          thumbnailUrl: videoResult.thumbnailUrl || imageUrl,
          personaId,
          taskId: videoResult.taskId,
          status: "completed"
        }
      });
      
      return NextResponse.json([video]);
    }
    
    // For real videos, generate one for each scene
    // Generate videos for each scene
    const videoPromises = sceneDescriptions.map(async (scene, index) => {
      try {
        // Generate a title based on the scene
        const title = `Video ${index + 1}: ${scene.substring(0, 30)}${scene.length > 30 ? '...' : ''}`
        
        // Call the Kling API to generate the video
        const videoResult = await generateVideo({
          imageUrl,
          voiceover: scene,
          personaImageUrl: persona.adImageUrl, // Optional
        })
        
        // Save the video in the database
        const video = await prisma.productVideo.create({
          data: {
            title,
            description: scene,
            videoUrl: videoResult.videoUrl,
            thumbnailUrl: videoResult.thumbnailUrl || imageUrl,
            personaId,
            taskId: videoResult.taskId,
            status: videoResult.taskId ? "processing" : "completed"
          }
        })
        
        return video
      } catch (error) {
        console.error(`Error generating video for scene ${index}:`, error)
        throw error
      }
    })
    
    // Wait for all videos to be generated
    const videos = await Promise.all(videoPromises)
    
    return NextResponse.json(videos)
    
  } catch (error) {
    console.error("Error generating videos:", error)
    return NextResponse.json(
      { error: `Failed to generate videos: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 