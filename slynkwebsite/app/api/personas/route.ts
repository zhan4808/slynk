import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { mockApi } from "@/lib/mock-api";
import { createSimliAgent } from "@/lib/simli-api";

// Helper to determine if we should use mock API - only in development with missing DB
const useMockApi = process.env.USE_MOCK_API === "true" || 
                  (process.env.NODE_ENV === "development" && 
                  (!process.env.DATABASE_URL || !process.env.DIRECT_URL));

// Get all AI personas for the current user
export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "You must be logged in to view personas" },
      { status: 401 }
    );
    }

  try {
    const personas = await prisma.aIPersona.findMany({
      where: {
        user: {
          email: session.user.email
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ personas });
  } catch (error) {
    console.error("Error fetching personas:", error);
    return NextResponse.json(
      { error: "Failed to fetch personas" },
      { status: 500 }
    );
  }
}

// Create a new AI persona
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // @ts-ignore - NextAuth types issue
    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID is missing from session" }, { status: 400 });
    }
    
    // Check if the user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!userExists) {
      // Create the user if they don't exist
      try {
        await prisma.user.create({
          data: {
            id: userId,
            name: session.user.name || "User",
            email: session.user.email || "unknown@example.com",
            image: session.user.image || null,
          },
        });
      } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
    }
    
    // Get JSON data
    let data;
    try {
      data = await req.json();
      console.log("Received persona creation data:", {
        name: data.name,
        description: data.description?.substring(0, 30) + "...",
        productName: data.productName,
        productDescription: data.productDescription?.substring(0, 30) + "...",
        productLink: data.productLink,
        faceId: data.faceId,
        isCustomFaceInQueue: data.isCustomFaceInQueue
      });
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request" }, { status: 400 });
    }
    
    // Check if faceId is a UUID (character_uid format)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.faceId);
    const isCustomFaceInQueue = data.isCustomFaceInQueue || isUuid;
    
    // Create metadata object for storing face information
    const metadata: any = {};
    if (isCustomFaceInQueue) {
      metadata.originalCharacterId = data.faceId;
      metadata.customFaceInProgress = true;
      metadata.queuedAt = new Date().toISOString();
    }

    // First create the AI persona in our database
    try {
      console.log("Creating persona in database with the following data:", {
        name: data.name,
        description: data.description?.substring(0, 30) + "...",
        systemPrompt: data.systemPrompt?.substring(0, 30) + "...",
        firstMessage: data.firstMessage?.substring(0, 30) + "...",
        productName: data.productName,
        productDescription: data.productDescription?.substring(0, 30) + "...",
        productLink: data.productLink,
        faceId: data.faceId,
        isCustomFaceInQueue,
        metadata: Object.keys(metadata).length > 0 ? "has metadata" : "no metadata",
        userId
      });

      const persona = await prisma.aIPersona.create({
        data: {
          name: data.name,
          description: data.description || '',
          systemPrompt: data.systemPrompt || null,
          firstMessage: data.firstMessage || null,
          productName: data.productName || null,
          productDescription: data.productDescription || null,
          productLink: data.productLink || null,
          // Store the original faceId (character_uid for queued faces)
          faceId: data.faceId || '',
          isCustomFaceInQueue: isCustomFaceInQueue || false,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          userId,
        },
      });
      
      console.log("Successfully created persona in database with ID:", persona.id);

      // Check if we should also create a Simli Agent through their API
      if (!useMockApi && process.env.SIMLI_ENABLE_AGENT_CREATION === "true") {
        try {
          // Create the agent in Simli using improved agent creation function
          const simliAgent = await createSimliAgent({
            faceId: data.faceId, // Pass the original faceId - our function will handle the UUID case
            name: data.name,
            firstMessage: data.firstMessage,
            prompt: data.systemPrompt,
            voiceProvider: "cartesia", // Default to Cartesia for better compatibility
            voiceId: data.voice, // Pass the voice ID from request data
            language: "en" // Default to English
          });

          // Update our persona record with the Simli agent ID and additional metadata
          await prisma.aIPersona.update({
            where: { id: persona.id },
            data: { 
              simliAgentId: simliAgent.id,
              // Merge existing metadata with agent details
              metadata: {
                ...metadata,
                simliAgentCreated: true,
                simliAgentDetails: JSON.stringify(simliAgent),
                // Store the originalCharacterId from the agent if it exists
                originalCharacterId: simliAgent.originalCharacterId || metadata.originalCharacterId
              }
            }
          });

          console.log(`Created Simli agent with ID ${simliAgent.id} for persona ${persona.id}`);
        } catch (error) {
          // Log but don't fail if agent creation has issues
          console.error("Error creating Simli agent:", error);
        }
      }

      return NextResponse.json({ id: persona.id });
    } catch (dbError) {
      console.error("Error creating AI persona in database:", dbError);
      return NextResponse.json({ 
        error: "Failed to create AI persona in database", 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Unhandled error creating AI persona:", error);
    return NextResponse.json({ 
      error: "Failed to create AI persona", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 