import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  context: { params: { personaId: string, videoId: string } }
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
    const { personaId, videoId } = await context.params
    
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
    
    // Check if the video exists and belongs to the persona
    const video = await prisma.productVideo.findUnique({
      where: {
        id: videoId,
        personaId
      }
    })
    
    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }
    
    // Delete the video
    await prisma.productVideo.delete({
      where: {
        id: videoId
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error("Error deleting video:", error)
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    )
  }
} 