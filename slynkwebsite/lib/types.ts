/**
 * Global type definitions for the Slynk application
 */

// Persona data structure
export interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  firstMessage: string;
  faceId?: string;
  voice?: string;
  useCustomVoice?: boolean;
  productName?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  qaData?: QAPair[];
}

// Question-Answer pairs for persona training
export interface QAPair {
  id: string;
  question: string;
  answer: string;
  personaId: string;
}

// Chat message structure
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  personaId: string;
  sessionId: string;
}

// Session data structure
export interface Session {
  id: string;
  personaId: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  messages: ChatMessage[];
}

// Simli API interfaces
export interface SimliSessionResponse {
  sessionId: string;
  status: string;
  message?: string;
}

export interface SimliSessionOptions {
  faceId: string;
  voice?: string;
  useCustomVoice?: boolean;
  systemPrompt: string;
}

// UI component props
export interface VideoComponentProps {
  id: string;
  name: string;
}

export interface SimliAgentProps {
  personaId: string;
  personaData: {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    faceId?: string;
    voice?: string;
    useCustomVoice?: boolean;
    productName?: string;
  };
  onStart?: () => void;
  onClose?: () => void;
} 