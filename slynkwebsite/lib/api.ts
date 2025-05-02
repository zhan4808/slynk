// API functions for persona management

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  firstMessage?: string;
  faceId: string;
  voice: string;
  useCustomVoice: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaFormData {
  name: string;
  description: string;
  systemPrompt: string;
  firstMessage?: string;
  faceId: string;
  voice: string;
  useCustomVoice: boolean;
  isCustomFaceInQueue?: boolean;
}

// Function to create a new persona
export async function createPersona(params: PersonaFormData): Promise<Persona> {
  console.log('Creating persona with data:', params);
  
  try {
    // Make the API call with JSON data
    const response = await fetch('/api/personas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    // Enhanced error handling
    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      
      try {
        // Try to parse as JSON
        errorObj = JSON.parse(errorText);
      } catch (e) {
        // If not JSON, use the raw text
        console.error('Non-JSON error from server:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      throw new Error(errorObj.error || 'Failed to create AI persona');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error in createPersona:', error);
    throw error;
  }
} 