import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
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
    
    // Fetch all videos for this persona
    const videos = await prisma.productVideo.findMany({
      where: {
        personaId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(videos)
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    )
  }
} 