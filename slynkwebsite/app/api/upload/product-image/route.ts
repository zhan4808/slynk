import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

// Handle product image uploads
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const personaId = formData.get("personaId") as string;
    const image = formData.get("image") as File;

    if (!personaId) {
      return NextResponse.json({ error: "Persona ID is required" }, { status: 400 });
    }

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Verify that the persona belongs to the user
    const persona = await prisma.aIPersona.findUnique({
      where: {
        id: personaId,
        userId: session.user.id as string,
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found or not authorized" }, { status: 404 });
    }

    // Validate the image
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Generate a unique filename
    const fileName = `${personaId}-product-${uuidv4()}.${image.type.split("/")[1]}`;
    const dirPath = join(process.cwd(), "public", "uploads", "products");
    const filePath = join(dirPath, fileName);
    const publicPath = `/uploads/products/${fileName}`;
    
    // Create full URL for Kling API to access
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const fullPublicUrl = `${baseUrl}${publicPath}`;

    // Ensure directory exists
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error("Error creating directory:", error);
    }

    // Read the file as array buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save the file to the filesystem
    await writeFile(filePath, buffer);

    // Update the persona with the new product image URL
    await prisma.aIPersona.update({
      where: { id: personaId },
      data: { productImageUrl: fullPublicUrl },
    });

    return NextResponse.json({ 
      success: true, 
      imageUrl: fullPublicUrl
    });
  } catch (error) {
    console.error("Error uploading product image:", error);
    return NextResponse.json({ 
      error: "Failed to upload product image" 
    }, { status: 500 });
  }
} 