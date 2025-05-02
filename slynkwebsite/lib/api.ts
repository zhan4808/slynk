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
}

interface CreatePersonaParams extends PersonaFormData {
  image?: File;
  voiceFile?: File;
}

// Function to create a new persona
export async function createPersona(params: CreatePersonaParams): Promise<Persona> {
  const { image, voiceFile, ...formData } = params;
  
  // In a real implementation, this would send data to your backend API
  console.log('Creating persona with data:', formData);
  
  // Create formData for file upload if we have any files
  const apiFormData = new FormData();
  
  // Add all the form fields
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined) {
      apiFormData.append(key, String(value));
    }
  });
  
  // Add files if they exist
  if (image) {
    console.log('Image file uploaded:', image.name);
    apiFormData.append('image', image);
  }
  
  if (voiceFile) {
    console.log('Voice file uploaded:', voiceFile.name);
    apiFormData.append('voiceFile', voiceFile);
  }
  
  // Make the actual API call
  const response = await fetch('/api/personas', {
    method: 'POST',
    body: apiFormData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create persona');
  }
  
  return response.json();
} 