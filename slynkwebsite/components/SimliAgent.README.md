# SimliAgent Component

The SimliAgent is a complex React component that integrates with the Simli API to provide interactive AI-powered video avatars.

## Overview

The component establishes a connection to a Daily.co video room and integrates with Simli's API to render a video avatar that responds to user chat input, with optional voice input capabilities.

## Features

- Real-time video avatar rendering with lip sync
- Text-based chat interface
- Voice input with speech recognition (browser dependent)
- Audio monitoring to detect speaking/silence
- Automatic session management
- Retry mechanisms for video/audio failures

## Dependencies

- Daily.co SDK for video
- Simli API for avatar generation
- Browser speech recognition API
- Framer Motion for animations

## Usage

```tsx
import SimliAgent from '@/components/SimliAgent';

// Basic implementation
<SimliAgent
  personaId="your-persona-id"
  personaData={{
    name: "AI Assistant",
    systemPrompt: "You are a helpful AI assistant.",
    firstMessage: "Hello! How can I help you today?",
    faceId: "optional-face-id",  // Optional, defaults to DEFAULT_FACE_ID
    voice: "optional-voice-id",  // Optional
    useCustomVoice: false,       // Optional
    productName: "Your Product"  // Optional
  }}
  onStart={() => console.log("SimliAgent started")}
  onClose={() => console.log("SimliAgent closed")}
/>
```

## Architecture

The component is structured in several main parts:

1. **Video Rendering**: Handles connections to Daily.co and renders the video avatar
2. **Audio Management**: Manages audio input/output and speech detection
3. **Chat Interface**: Handles user input and displays messages
4. **Session Management**: Manages the connection to Simli's API

## Troubleshooting

Common issues include:

- Video not displaying: Check network connectivity and Simli API status
- Audio not working: Browser permissions may need to be granted
- Speech recognition not starting: Only available in compatible browsers (Chrome, Edge, Safari)

## Browser Compatibility

- Best experience: Chrome, Edge
- Partial support: Safari (some audio features limited)
- Limited support: Firefox (no speech recognition)
- Mobile support: Limited functionality on iOS/Android

## Codebase Organization

Related utilities have been extracted to separate files:

- `lib/browser-detection.ts`: Browser and device detection utilities
- `lib/audio-monitoring.ts`: Audio level monitoring
- `lib/types.ts`: TypeScript type definitions

## Optimizations

For performance, the component:

- Uses memoization to prevent unnecessary re-renders
- Implements cleanup functions to prevent memory leaks
- Manages audio context creation to work around browser limitations 