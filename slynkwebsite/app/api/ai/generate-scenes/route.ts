import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ScenePrompt } from '@/lib/kling-api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `You are a creative director specialized in creating compelling product videos. 
Your task is to create 3 different scenes for a product video based on the product description and name provided.
Each scene should have:
1. A short, descriptive title (1-3 words)
2. A brief description of the scene concept (1 sentence)
3. A detailed prompt that can be used to generate the video using an AI video generation system

Make the scenes varied - one could be a general product showcase, another showing the product in use, and a third showing the lifestyle benefit.
The prompts should be detailed enough to create a compelling, professional-looking scene.

Format your response as a JSON array of scenes, with each scene having "title", "description", and "prompt" fields.
Do not include any other text in your response besides the JSON.`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { productDescription, productName } = await req.json();
    
    if (!productDescription || !productName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Generate scene prompts using OpenAI
    const userPrompt = `Create 3 varied and creative scenes for a video about this product:
Name: ${productName}
Description: ${productDescription}

Return only a JSON array of scenes.`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      const parsedContent = JSON.parse(content);
      const scenes = parsedContent.scenes || [];
      
      if (!Array.isArray(scenes) || scenes.length === 0) {
        throw new Error('Invalid response format');
      }
      
      // Validate that each scene has the required fields
      const validatedScenes: ScenePrompt[] = scenes.map(scene => ({
        title: scene.title || 'Scene',
        description: scene.description || 'Product video scene',
        prompt: scene.prompt || `Video showcasing ${productName}`
      }));
      
      return NextResponse.json({ scenes: validatedScenes });
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      
      // Fallback scenes
      const fallbackScenes: ScenePrompt[] = [
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
      ];
      
      return NextResponse.json({ scenes: fallbackScenes });
    }
  } catch (error) {
    console.error('Error in generate-scenes API:', error);
    return NextResponse.json({ error: 'Failed to generate scenes' }, { status: 500 });
  }
} 