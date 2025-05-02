import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkKlingTaskStatus } from "@/lib/kling-api"

export async function GET(
  request: NextRequest,
  context: { params: { personaId: string; taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    
    // Get params
    const { personaId, taskId } = context.params
    
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
    
    // Find the video with this task ID
    const video = await prisma.productVideo.findFirst({
      where: {
        personaId,
        taskId
      }
    })
    
    if (!video) {
      return NextResponse.json(
        { error: "Video not found for this task" },
        { status: 404 }
      )
    }
    
    // Check the status of the task with Kling API
    const taskStatus = await checkKlingTaskStatus(taskId)
    
    // Update the video if status has changed
    if (taskStatus.status === "completed" && taskStatus.url) {
      await prisma.productVideo.update({
        where: {
          id: video.id
        },
        data: {
          videoUrl: taskStatus.url,
          status: "completed"
        }
      })
      
      return NextResponse.json({
        status: "completed",
        videoUrl: taskStatus.url
      })
    }
    
    return NextResponse.json({
      status: taskStatus.status,
      videoUrl: video.videoUrl
    })
  } catch (error) {
    console.error("Error checking video task status:", error)
    return NextResponse.json(
      { error: `Failed to check task status: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 