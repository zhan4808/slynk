"use client";

import React, { useRef, useState, useEffect, KeyboardEvent, useCallback } from "react";
import { DailyProvider, useDaily } from "@daily-co/daily-react";
import Daily, { DailyCall } from "@daily-co/daily-js";
import { RecoilRoot } from "recoil";
import VideoBox from "@/components/ui/VideoBox";
import { cn } from "@/lib/utils";
import { DEFAULT_FACE_ID, startE2ESession } from "@/lib/simli-api";
import { Mic, MicOff, Send, Volume2, VolumeX, RefreshCw } from "lucide-react";
import { CircularSpinner } from "@/components/ui/circular-spinner";
import { motion } from "framer-motion";
import { isMobile, isIOS, isSafari } from "@/lib/browser-detection";
import { createAudioMonitor } from "@/lib/audio-monitoring";
import { SimliAgentProps, VideoComponentProps } from "@/lib/types";

// Setup Speech Recognition with browser compatibility - using type assertions to avoid TypeScript errors
const isBrowser = typeof window !== 'undefined';
const SpeechRecognitionAPI = isBrowser ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
const SpeechGrammarListAPI = isBrowser ? ((window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList) : null;

// Global reference to prevent duplicate instances
let globalCallObject: DailyCall | null = null;

// Component to handle video rendering with Daily context
const VideoComponent = ({ id, name }: VideoComponentProps) => {
  const daily = useDaily();
  const [retryCount, setRetryCount] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // Add retry mechanism for video connection
  const retryVideoConnection = useCallback(() => {
    if (!daily) return;
    
    console.log(`Attempting to retry video connection for ${id}...`);
    setRetryCount(prev => prev + 1);
    
    // Force refresh participants data
    const participants = daily.participants();
    const participant = participants[id];
    
    if (participant) {
      // Try to re-subscribe to tracks
      try {
        daily.updateParticipant(id, {
          setSubscribedTracks: true
        });
      } catch (err: any) {
        console.error("Error updating participant:", err);
      }
      
      // Wait a moment and then clear error if fixed
      setTimeout(() => {
        const refreshedParticipants = daily.participants();
        const refreshedParticipant = refreshedParticipants[id];
        
        if (refreshedParticipant) {
          const videoTrack = refreshedParticipant?.tracks?.video;
        
          if (videoTrack?.state === 'playable') {
            setVideoError(null);
          }
        }
      }, 1500);
    }
  }, [daily, id]);
  
  useEffect(() => {
    console.log("VideoComponent mounted for ID:", id);
    console.log("Daily object available:", !!daily);
    
    // Log all participants for debugging
    if (daily) {
      const participants = daily.participants();
      console.log("All participants:", participants);
      console.log("Looking for participant with ID:", id);
      console.log("Found participant:", participants[id]);
      
      // Monitor video track state changes
      const checkVideoState = () => {
        const currentParticipants = daily.participants();
        const participant = currentParticipants[id];
        
        if (participant && participant.tracks && participant.tracks.video) {
          const videoTrack = participant.tracks.video;
          
          if (videoTrack.state === 'interrupted' || videoTrack.state === 'blocked' || videoTrack.state === 'off') {
            setVideoError(`Video track is ${videoTrack.state}`);
          } else if (videoTrack.state === 'playable') {
            setVideoError(null);
          }
        }
      };
      
      // Initial check
      checkVideoState();
      
      // Set up interval for periodic checking
      const videoCheckInterval = setInterval(checkVideoState, 5000);
      
      return () => {
        clearInterval(videoCheckInterval);
      };
    }
  }, [daily, id]);
  
  return (
    <div className="relative w-full h-full">
      <VideoBox id={id} />
      
      {videoError && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white p-4">
          <p className="text-center mb-4">Video connection issue: {videoError}</p>
          <button
            onClick={retryVideoConnection}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            <RefreshCw size={16} />
            Retry Video ({retryCount})
          </button>
        </div>
      )}
    </div>
  );
};

// Main SimliAgent component
const SimliAgent: React.FC<SimliAgentProps> = ({ 
  personaId, 
  personaData, 
  onStart = () => {}, 
  onClose = () => {} 
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const myCallObjRef = useRef<DailyCall | null>(null);
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{speaker: string, text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isAudioFixing, setIsAudioFixing] = useState(false);
  
  // Audio setup
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  // Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const avatarAudioStreamRef = useRef<MediaStream | null>(null);
  const avatarAudioContextRef = useRef<AudioContext | null>(null);
  const isRecognizingRef = useRef<boolean>(false);
  const [isListeningToAvatar, setIsListeningToAvatar] = useState<boolean>(false);
  const harkInstanceRef = useRef<any>(null);
  const lastAvatarSpeechRef = useRef<string>("");
  const lastTranscriptRequestRef = useRef<number>(0);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState<boolean>(false);
  
  // New state for waiting for API response
  const [waitingForSimliResponse, setWaitingForSimliResponse] = useState<boolean>(false);
  
  // New pending transcript ref to accumulate potential text
  const pendingTranscriptRef = useRef<string>("");
  
  // Track device type for UI adjustments
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  
  // Check device type on component mount
  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);
  
  // Define a global filter patterns list for consistency
  const commandFilterPatterns = [
    "get-transcript", 
    "getTranscript", 
    "Please send transcript", 
    "get_transcript", 
    "get-latest-response",
    "get_latest_response", 
    "request-transcript", 
    "transcript-request",
    "get_response",
    "get-response",
    "get-agent-response",
    "get_agent_response",
    "get_last_utterance",
    "action:"
  ];

  // Utility function to safely initialize audio context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        // Create audio context
        const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = newAudioContext;
        setAudioContext(newAudioContext);
        
        // Set global window.audioContext for other utilities
        if (!window.audioContext) {
          window.audioContext = newAudioContext;
        }
        
        addDebugInfo(`Audio context initialized: ${newAudioContext.state}`);
        
        // Resume audio context if suspended
        if (newAudioContext.state === 'suspended') {
          newAudioContext.resume().then(() => {
            addDebugInfo("AudioContext resumed immediately");
          }).catch(err => {
            addDebugInfo(`Failed to resume AudioContext: ${err.message}`);
          });
        }
        
        return newAudioContext;
      } catch (err) {
        console.error("Error initializing audio context:", err);
        addDebugInfo(`Audio context initialization error: ${err}`);
        return null;
      }
    } else if (audioContextRef.current.state === 'suspended') {
      // If context exists but is suspended, try to resume it
      audioContextRef.current.resume().then(() => {
        addDebugInfo("Existing AudioContext resumed");
      }).catch(err => {
        addDebugInfo(`Failed to resume existing AudioContext: ${err.message}`);
      });
    }
    
    return audioContextRef.current;
  };

  // Init audio context on first interaction
  const initAudio = () => {
    const newContext = initAudioContext();
    
    if (newContext) {
      // Create audio element if it doesn't exist
      if (!audioElementRef.current) {
        const audioEl = new Audio();
        audioEl.autoplay = true;
        audioEl.controls = false;
        audioEl.volume = 1.0;
        audioEl.muted = false;
        
        // Add to DOM to ensure it works in some browsers
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        
        // Create a dummy buffer to play to initialize audio
        const buffer = newContext.createBuffer(1, 1, 22050);
        const source = newContext.createBufferSource();
        source.buffer = buffer;
        source.connect(newContext.destination);
        
        // On iOS/Safari, audio playback must be triggered by user interaction
        if (isIOS() || isSafari()) {
          addDebugInfo("iOS/Safari detected, deferring audio start until user interaction");
          
          // We'll start the source later when user interacts
          audioElementRef.current = audioEl;
          
          // Set up one-time click listener to initialize audio
          const initAudioOnInteraction = () => {
            source.start();
            addDebugInfo("Audio initialized via user interaction");
            document.removeEventListener('click', initAudioOnInteraction);
            document.removeEventListener('touchstart', initAudioOnInteraction);
          };
          
          document.addEventListener('click', initAudioOnInteraction, { once: true });
          document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
        } else {
          // Start immediately on other browsers
          source.start();
          audioElementRef.current = audioEl;
          addDebugInfo("Audio element created and initialized");
        }
      }
      
      // Only play test tone on desktop - can be disruptive on mobile
      if (!isMobile()) {
        // Test audio with a quick beep to validate audio setup
        const oscillator = newContext.createOscillator();
        const gainNode = newContext.createGain();
        
        oscillator.type = "sine";
        oscillator.frequency.value = 523.25; // C5
        gainNode.gain.value = 0.1; // Low volume
        
        oscillator.connect(gainNode);
        gainNode.connect(newContext.destination);
        
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          addDebugInfo("Audio test beep played");
        }, 200);
      }
    }
  };

  // Add debug logging
  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => `${prev}\n${message}`);
  };

  // Clean up Daily instance and intervals on unmount
  useEffect(() => {
    return () => {
      // Clean up on component unmount
      if (myCallObjRef.current) {
        addDebugInfo("Component unmounting - cleaning up Daily instance");
        myCallObjRef.current.leave().then(() => {
          myCallObjRef.current?.destroy();
          myCallObjRef.current = null;
          
          // Reset global reference if it's our instance
          if (globalCallObject === myCallObjRef.current) {
            globalCallObject = null;
          }
        }).catch(err => {
          console.error("Error leaving Daily call on unmount:", err);
        });
      }
      
      // Clean up audio context
      if (audioContext) {
        audioContext.close().catch(e => console.error("Error closing audio context:", e));
      }
      
      // Clear audio check interval
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      
      // Stop microphone stream if active
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        micStreamRef.current = null;
      }
      
      // Clean up speech recognition
      cleanupAvatarSpeechRecognition();
    };
  }, [audioContext]);

  // Function to ensure clean Daily state before starting
  const cleanupExistingDaily = async () => {
    // If there's a global instance, clean it up first
    if (globalCallObject) {
      addDebugInfo("Cleaning up existing Daily instance");
      try {
        // Always try to leave the call, catch any errors
        try {
          await globalCallObject.leave();
        } catch (e) {
          console.log("Error leaving call, may already be disconnected:", e);
        }

        // Always destroy the call object
        globalCallObject.destroy();
        globalCallObject = null;
      } catch (error) {
        console.error("Error cleaning up existing Daily instance:", error);
      }
    }
  };
  
  // Enhanced avatar speech detection
  const setupAvatarAudioMonitoring = () => {
    if (!callObject || !chatbotId) {
      addDebugInfo("Cannot set up audio monitoring: missing dependencies");
      return;
    }

    try {
      // Get the avatar's audio track
      const participants = callObject.participants();
      const chatbot = Object.values(participants).find(
        (p: any) => p.user_name === 'Chatbot'
      );
      
      if (!chatbot) {
        addDebugInfo("Chatbot participant not found for audio monitoring");
        return;
      }
      
      const audioTrack = chatbot.tracks?.audio?.track;
      if (!audioTrack) {
        addDebugInfo("No audio track found for audio monitoring");
        return;
      }
      
      addDebugInfo("Setting up advanced audio monitoring for avatar");
      
      // Create a MediaStream from the audio track
      const avatarStream = new MediaStream([audioTrack]);
      avatarAudioStreamRef.current = avatarStream;
      
      // Create audio monitoring instance
      const options = {
        threshold: -70,  // Lower threshold to detect softer speech
        interval: 100    // Check every 100ms
      };
      
      const speechEvents = createAudioMonitor(avatarStream, options);
      
      speechEvents.on('speaking', () => {
        addDebugInfo("Avatar speaking detected");
        setIsAvatarSpeaking(true);
        setIsProcessing(true);
        setWaitingForSimliResponse(true);
        
        // Force video element to be visible and ensure audio playing
        if (audioElementRef.current) {
          audioElementRef.current.muted = false;
          audioElementRef.current.volume = 1.0;
          addDebugInfo(`Audio element volume set to ${audioElementRef.current.volume}`);
        }
        
        // Schedule transcription requests, but avoid flooding
        if (Date.now() - lastTranscriptRequestRef.current > 2000) {
          requestMultipleTranscripts();
          lastTranscriptRequestRef.current = Date.now();
        }
      });
      
      speechEvents.on('stopped_speaking', () => {
        addDebugInfo("Avatar speaking stopped");
        setIsAvatarSpeaking(false);
        
        // When speech stops, try to get the transcript with a slight delay
        setTimeout(() => {
          requestMultipleTranscripts();
          lastTranscriptRequestRef.current = Date.now();
          
          // Add another delayed request to catch any lag in the API
          setTimeout(() => {
            requestDirectResponse();
          }, 1000);
        }, 500);
      });
      
      harkInstanceRef.current = speechEvents;
      
      // Reset the standard speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          addDebugInfo(`Error stopping speech recognition: ${e}`);
        }
      }
      
      // Setup direct audio capture with speech recognition fallback
      setupCombinedTranscriptionSystem();
      
    } catch (error) {
      addDebugInfo(`Error in setupAvatarAudioMonitoring: ${error}`);
    }
  };

  // Combine multiple transcription approaches
  const setupCombinedTranscriptionSystem = () => {
    // 1. Set up event listeners for Simli messages
    if (callObject) {
      callObject.on('app-message', (event: any) => {
        if (!event || !event.data) return;
        
        try {
          // Log the full message data periodically for debugging
          if (Math.random() < 0.1) { // Only log ~10% of messages to avoid spam
            console.log('Message data sample:', event);
          }
          
          // Extract any useful text from the message
          const extractedText = extractTextFromMessage(event.data);
          if (extractedText && extractedText.trim() !== "") {
            addPotentialTranscript(extractedText);
          }
        } catch (err) {
          console.error("Error processing app message:", err);
        }
      });
    }
    
    // 2. Try browser's speech recognition if available
    if (SpeechRecognitionAPI) {
      setupAvatarSpeechRecognition();
    }
  };

  // Extract any text from various message formats
  const extractTextFromMessage = (data: any): string | null => {
    if (!data) return null;
    
    // Skip messages that are likely internal command messages    
    // Check for command messages before processing
    if (data.type && typeof data.type === 'string') {
      const typeLC = data.type.toLowerCase();
      if (typeLC === 'get-transcript' || 
          typeLC === 'request-transcript' || 
          typeLC === 'transcript-request' ||
          typeLC === 'get-latest-response' ||
          typeLC === 'avatar-speech' || 
          typeLC === 'get-agent-response') {
        // This is a command message, not actual content
        return null;
      }
    }

    // Check for action fields that indicate this is a command
    if (data.action && typeof data.action === 'string') {
      return null; // Any message with an action field is likely a command
    }
    
    // Direct text properties
    if (typeof data.text === 'string' && data.text.trim() !== "") {
      // Skip if it matches a command pattern
      if (commandFilterPatterns.some(pattern => data.text.toLowerCase().includes(pattern.toLowerCase()))) {
        return null;
      }
      return data.text;
    }
    
    if (typeof data.message === 'string' && data.message.trim() !== "") {
      // Skip if it matches a command pattern
      if (commandFilterPatterns.some(pattern => data.message.toLowerCase().includes(pattern.toLowerCase()))) {
        return null;
      }
      return data.message;
    }
    
    if (typeof data.transcript === 'string' && data.transcript.trim() !== "") {
      if (commandFilterPatterns.some(pattern => data.transcript.toLowerCase().includes(pattern.toLowerCase()))) {
        return null;
      }
      return data.transcript;
    }
    
    if (typeof data.content === 'string' && data.content.trim() !== "") {
      if (commandFilterPatterns.some(pattern => data.content.toLowerCase().includes(pattern.toLowerCase()))) {
        return null;
      }
      return data.content;
    }
    
    // Response objects
    if (data.response) {
      if (typeof data.response === 'string') {
        // Skip if it matches a command pattern
        if (commandFilterPatterns.some(pattern => data.response.toLowerCase().includes(pattern.toLowerCase()))) {
          return null;
        }
        return data.response;
      }
      
      if (typeof data.response === 'object') {
        if (data.response.text && !commandFilterPatterns.some(pattern => data.response.text.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.response.text;
        
        if (data.response.message && !commandFilterPatterns.some(pattern => data.response.message.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.response.message;
        
        if (data.response.content && !commandFilterPatterns.some(pattern => data.response.content.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.response.content;
      }
    }
    
    // Nested data
    if (data.data) {
      return extractTextFromMessage(data.data);
    }
    
    // Check for any string property that might contain transcript
    for (const key in data) {
      if (typeof data[key] === 'string' && 
          data[key].length > 10 && 
          key !== 'type' && 
          key !== 'trackType' &&
          key !== 'action') {
        
        // Skip if it matches a command pattern
        if (commandFilterPatterns.some(pattern => data[key].toLowerCase().includes(pattern.toLowerCase()))) {
          continue;
        }
        
        return data[key];
      }
    }
    
    return null;
  };

  // Add potential transcript text with deduplication
  const addPotentialTranscript = (text: string) => {
    if (!text || text.trim() === "") return;
    
    // Don't add very short fragments
    if (text.length < 5) return;
    
    // Skip if the text matches any of our filter patterns
    if (commandFilterPatterns.some(pattern => text.toLowerCase().includes(pattern.toLowerCase()))) {
      addDebugInfo(`Skipping command message: ${text}`);
      return;
    }
    
    // Skip if this is just an echo of what the user just said
    if (transcript.length > 0 && 
        transcript[transcript.length - 1].speaker === 'You' && 
        (transcript[transcript.length - 1].text === text || 
         similarity(transcript[transcript.length - 1].text, text) > 0.8)) {
      addDebugInfo(`Skipping echo of user input: ${text.substring(0, 30)}...`);
      return;
    }
    
    // Check for duplicates by comparing with last added text
    if (lastAvatarSpeechRef.current === text) return;
    
    // Add to pending transcript
    pendingTranscriptRef.current = text;
    
    // Add to transcript after a short delay to allow for potential better versions
    setTimeout(() => {
      if (pendingTranscriptRef.current === text) {
        const speaker = personaData.name;
        addDebugInfo(`Adding actual avatar transcript: ${text.substring(0, 30)}...`);
        
        setTranscript(prev => {
          // Skip if already in transcript
          if (prev.length > 0 && 
              prev[prev.length - 1].speaker === speaker && 
              prev[prev.length - 1].text === text) {
            return prev;
          }
          
          // Update last added text
          lastAvatarSpeechRef.current = text;
          setIsProcessing(false);
          setWaitingForSimliResponse(false);
          
          return [...prev, { speaker, text }];
        });
        
        // Clear pending transcript
        pendingTranscriptRef.current = "";
      }
    }, 300);
  };

  // Helper function to check text similarity for better echo detection
  const similarity = (s1: string, s2: string): number => {
    // Convert to lowercase for case-insensitive comparison
    const a = s1.toLowerCase();
    const b = s2.toLowerCase();
    
    // If either string is empty, return 0
    if (a.length === 0 || b.length === 0) return 0;
    
    // If strings are identical, return 1
    if (a === b) return 1;
    
    // If one string contains the other, it's likely an echo
    if (a.includes(b) || b.includes(a)) return 0.9;
    
    // Count matching words
    const aWords = a.split(/\s+/);
    const bWords = b.split(/\s+/);
    
    let matches = 0;
    for (const word of aWords) {
      if (word.length > 3 && bWords.includes(word)) {
        matches++;
      }
    }
    
    // Return a similarity score based on matching words
    return matches / Math.max(aWords.length, bWords.length);
  };

  // Request transcripts using multiple methods
  const requestMultipleTranscripts = () => {
    if (!callObject || !chatbotId) return;
    
    // Only send messages if call has been joined
    if (callObject.participants() && Object.keys(callObject.participants()).length > 0) {
      addDebugInfo("Multiple transcript requests sent");
      
      // 1. Try standard transcript request
      try {
        callObject.sendAppMessage({
          type: 'get-transcript',
          action: 'get_transcript'
        }, chatbotId);
        addDebugInfo("Sent request type: get-transcript");
      } catch (e) {
        addDebugInfo(`Error sending transcript request: ${e}`);
      }
      
      // 2. Try to get the latest response
      try {
        callObject.sendAppMessage({
          type: 'get-latest-response',
          action: 'get_latest_response'
        }, chatbotId);
        addDebugInfo("Sent request type: get-latest-response");
      } catch (e) {
        addDebugInfo(`Error sending latest response request: ${e}`);
      }
      
      // 3. Try request-transcript format
      try {
        callObject.sendAppMessage({
          type: 'request-transcript',
          text: 'getTranscript'
        }, chatbotId);
        addDebugInfo("Sent request type: request-transcript");
      } catch (e) {
        addDebugInfo(`Error sending request-transcript: ${e}`);
      }
      
      // 4. Try transcript-request format
      try {
        callObject.sendAppMessage({
          type: 'transcript-request',
          message: 'Please send transcript'
        }, chatbotId);
        addDebugInfo("Sent request type: transcript-request");
      } catch (e) {
        addDebugInfo(`Error sending transcript-request: ${e}`);
      }
      
      // Mark that we're waiting for a response
      setWaitingForSimliResponse(true);
    } else {
      addDebugInfo("Not sending transcript requests - call not joined yet");
    }
  };

  // Modified send message function to mark that we're waiting for a response
  const sendMessage = async () => {
    if (!message.trim() || !callObject || !chatbotId || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Add user message to transcript
      const userMessage = { speaker: 'You', text: message };
      setTranscript(prev => {
        // Avoid duplicate messages
        if (prev.length > 0 && 
            prev[prev.length - 1].speaker === 'You' && 
            prev[prev.length - 1].text === message) {
          return prev;
        }
        return [...prev, userMessage];
      });
      
      // Send message to chatbot
      addDebugInfo(`Sending message to chatbot: ${message}`);
      
      // Custom app message to Simli backend
      callObject.sendAppMessage({
        type: 'chat-message',
        text: message
      }, chatbotId);
      
      // Clear input
      setMessage("");
      
      // Mark that we're waiting for a response
      setWaitingForSimliResponse(true);
      
      // Set a fallback timer to reset processing state if no response is received
      setTimeout(() => {
        setIsProcessing(prev => {
          if (prev) {
            addDebugInfo("Resetting processing state after timeout");
            return false;
          }
          return prev;
        });
        setWaitingForSimliResponse(false);
      }, 15000); // 15 second timeout
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
      setIsProcessing(false);
      setWaitingForSimliResponse(false);
    }
  };

  // Enhanced transcript button function
  const forceTranscriptRequest = () => {
    requestMultipleTranscripts();
    
    // After a delay, force add a transcript if none was received
    setTimeout(() => {
      if (waitingForSimliResponse) {
        setWaitingForSimliResponse(false);
        setIsProcessing(false);
        
        // If we have pending text, add it
        if (pendingTranscriptRef.current && pendingTranscriptRef.current.trim() !== "") {
          addPotentialTranscript(pendingTranscriptRef.current);
        } else {
          // Add a fallback message
          setTranscript(prev => {
            const speaker = personaData.name;
            const text = "I'm sorry, I couldn't get the transcript. Please try again.";
            
            // Skip if already in transcript
            if (prev.length > 0 && 
                prev[prev.length - 1].speaker === speaker && 
                prev[prev.length - 1].text === text) {
              return prev;
            }
            
            return [...prev, { speaker, text }];
          });
        }
      }
    }, 3000);
  };

  // Toggle audio output mute state
  const toggleAudioMute = () => {
    if (callObject) {
      addDebugInfo(`Toggling audio output: ${isAudioMuted ? "unmuting" : "muting"}`);
      
      const participants = callObject.participants();
      const chatbot = Object.values(participants).find(
        (p: any) => p.user_name === 'Chatbot'
      );
      
      if (chatbot) {
        const audioTrack = chatbot.tracks?.audio;
        if (audioTrack && audioTrack.track) {
          // Toggle the track enabled property
          audioTrack.track.enabled = isAudioMuted;
          setIsAudioMuted(!isAudioMuted);
          
          // Also mute the audio element if it exists
          if (audioElementRef.current) {
            audioElementRef.current.muted = !isAudioMuted;
          }
          
          addDebugInfo(`Audio ${!isAudioMuted ? 'muted' : 'unmuted'}`);
        }
      }
    }
  };

  // Handle enter key in text input
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * Create a new Simli room and join it using Daily
   */
  const handleJoinRoom = async () => {
    // Reset states
    setIsLoading(true);
    setError(null);
    setDebugInfo("");
    setTranscript([]);
    
    // Initialize audio on user interaction
    initAudio();
    
    // For mobile devices, explicitly request microphone permission first
    if (isMobile()) {
      addDebugInfo("Mobile device detected, explicitly requesting microphone permissions");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        addDebugInfo("Microphone permission granted on mobile");
        
        // Keep the stream active to maintain permissions
        micStreamRef.current = stream;
        
        // On iOS/Safari we need to make sure audio context is running
        if ((isIOS() || isSafari()) && audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
          addDebugInfo("Audio context resumed on iOS/Safari");
        }
      } catch (err) {
        addDebugInfo(`Error getting microphone permission: ${err}`);
        setError("Microphone permission is required for conversation. Please allow microphone access and try again.");
        setIsLoading(false);
        return;
      }
    }
    
    addDebugInfo(`Starting Simli session for persona: ${personaId}`);

    try {
      // First clean up any existing Daily instances
      await cleanupExistingDaily();
      
      addDebugInfo("Requesting session token from API...");
      const tokenResponse = await fetch("/api/simli/create-session-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": "my-super-secret-demo-key"
        }
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Failed to create token: ${tokenResponse.status}`);
      }
      
      const tokenData = await tokenResponse.json();
      const simliApiKey = tokenData.sessionToken;
      
      addDebugInfo(`Token received: ${simliApiKey ? "✓" : "✗"}`);
      addDebugInfo(`Is mock token: ${tokenData.isMock ? "Yes" : "No"}`);

      if (tokenData.isMock) {
        addDebugInfo("Using a mock token - Simli API will not work properly. Set SIMLI_API_KEY in your environment.");
      }
      
      // Start E2E Session with Simli
      addDebugInfo("Starting E2E Session with Simli...");
      
      const sessionData = await startE2ESession({
        apiKey: simliApiKey,
        // Use the provided faceId or fallback to default
        faceId: personaData.faceId || DEFAULT_FACE_ID,
        systemPrompt: personaData.systemPrompt,
        firstMessage: personaData.firstMessage,
        voiceId: personaData.voice, // Pass voice ID if available
        useCustomVoice: personaData.useCustomVoice, // Pass custom voice flag if available
      });
      
      // Add a check to ensure roomUrl exists before calling substring
      const roomUrl = sessionData?.roomUrl;
      addDebugInfo(`Simli session started successfully. Room URL: ${roomUrl ? roomUrl.substring(0, 30) + '...' : 'undefined'}`);
      
      if (!roomUrl) {
        throw new Error("No room URL returned from Simli API");
      }
      
      addDebugInfo("Creating Daily call object...");
      // Create a new Daily call object
      const newCallObject = Daily.createCallObject({
        audioSource: true, // Enable microphone
        videoSource: false, // No camera needed from user
        dailyConfig: {
          // Use only valid configuration options
          userMediaAudioConstraints: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
            // For mobile we need different settings, but avoid TypeScript issues
            // by using simpler configuration acceptable to Daily.js
            ...(isMobile() ? {
              // Mobile-friendly settings
              autoGainControl: { ideal: true },
              echoCancellation: { ideal: true },
              noiseSuppression: { ideal: true }
            } : {})
          }
        }
      });
      
      // Set as global instance to prevent duplicates
      globalCallObject = newCallObject;

      // Setting user name
      newCallObject.setUserName("User");
      
      // Register event listener for transcript
      newCallObject.on('app-message', (event: any) => {
        const eventData = JSON.stringify(event.data).substring(0, 150) + (JSON.stringify(event.data).length > 150 ? '...' : '');
        addDebugInfo(`Received app-message from ${event.fromId}: ${eventData}`);
        
        // Process all incoming messages
        if (event?.data) {
          try {
            // Log all data structure for debugging
            console.log('Full message data:', event);
            
            // User voice transcription
            if (event.data.trackType === 'cam-audio' && event.data.text) {
              // Only add final transcriptions to avoid fragments
              if (event.data.is_final) {
                const speaker = 'You';
                const text = event.data.text;
                
                addDebugInfo(`Adding voice transcript to chat - ${speaker}: ${text}`);
                setTranscript(prev => {
                  // Avoid duplicate messages
                  if (prev.length > 0 && 
                      prev[prev.length - 1].speaker === speaker && 
                      prev[prev.length - 1].text === text) {
                    return prev;
                  }
                  return [...prev, { speaker, text }];
                });
                
                // If we're processing the user's message, consider the next response to be processing
                setIsProcessing(true);
                setWaitingForSimliResponse(true);
              }
            }
            
            // Avatar speech recognition (what the avatar is saying)
            else if (event.data.trackType === 'avatar-speech' || 
                    (event.data.agentResponse === true) || 
                    (event.data.type === 'agent-speech')) {
              
              const speaker = personaData.name;
              const text = event.data.text || event.data.message || event.data.transcript || "";
              
              // Skip command messages
              if (text && text.trim() !== "" && 
                  !commandFilterPatterns.some(pattern => text.toLowerCase().includes(pattern.toLowerCase()))) {
                
                // Skip if this appears to be an echo of what the user just said
                if (transcript.length > 0 && 
                    transcript[transcript.length - 1].speaker === 'You' && 
                    (transcript[transcript.length - 1].text === text || 
                     similarity(transcript[transcript.length - 1].text, text) > 0.8)) {
                  addDebugInfo(`Skipping echo of user message: ${text.substring(0, 30)}...`);
                  return;
                }
                
                addDebugInfo(`Adding avatar speech to transcript - ${speaker}: ${text}`);
                setTranscript(prev => {
                  // Avoid duplicate messages
                  if (prev.length > 0 && 
                      prev[prev.length - 1].speaker === speaker && 
                      prev[prev.length - 1].text === text) {
                    return prev;
                  }
                  return [...prev, { speaker, text }];
                });
                setIsProcessing(false);
                setWaitingForSimliResponse(false);
              }
            }
            
            // Try to extract potential avatar speech from any message from the chatbot
            else if (event.fromId === 'Chatbot') {
              const potentialText = parseSimliMessages(event);
              
              if (potentialText && typeof potentialText === 'string' && potentialText.trim() !== "") {
                // Skip if this is just an echo of what the user just said
                const isEchoOfUserMessage = transcript.length > 0 && 
                                           transcript[transcript.length - 1].speaker === 'You' && 
                                           (transcript[transcript.length - 1].text === potentialText || 
                                            similarity(transcript[transcript.length - 1].text, potentialText) > 0.8);
                
                if (!isEchoOfUserMessage) {
                  const speaker = personaData.name;
                  addDebugInfo(`Extracted potential avatar speech: ${potentialText.substring(0, 50)}...`);
                  
                  setTranscript(prev => {
                    // Avoid duplicate messages
                    if (prev.length > 0 && 
                        prev[prev.length - 1].speaker === speaker && 
                        prev[prev.length - 1].text === potentialText) {
                      return prev;
                    }
                    return [...prev, { speaker, text: potentialText }];
                  });
                  setIsProcessing(false);
                  setWaitingForSimliResponse(false);
                } else {
                  addDebugInfo(`Skipping echo of user message: ${potentialText.substring(0, 30)}...`);
                }
              }
            }
          } catch (err) {
            addDebugInfo(`Error processing message: ${err}`);
          }
        }
      });

      // Register event listeners for participant join and track start events 
      newCallObject.on('participant-joined', (event: any) => {
        const userName = event.participant.user_name;
        addDebugInfo(`Participant joined: ${userName} (${event.participant.session_id})`);
        
        if (userName === "Chatbot") {
          addDebugInfo(`Chatbot detected with ID: ${event.participant.session_id}`);
          setChatbotId(event.participant.session_id);
          setIsLoading(false);
          setIsAvatarVisible(true);
          onStart();
          
          // Request first message after chatbot joins
          requestFirstMessage();
        }
      });

      // Add track-started handler specifically for audio tracks
      newCallObject.on('track-started', (event: any) => {
        const trackInfo = {
          kind: event.track.kind,
          participant: event.participant.user_name,
          state: event.participant.tracks?.[event.track.kind]?.state || 'unknown',
          id: event.track.id
        };
        
        addDebugInfo(`Track started: ${JSON.stringify(trackInfo)}`);
        
        // If audio track starts for the Chatbot, ensure it plays automatically
        if (event.track.kind === 'audio' && event.participant.user_name === 'Chatbot') {
          addDebugInfo("Chatbot audio track detected - setting up automatic playback");
          
          // Make sure audio context is running
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
              addDebugInfo("AudioContext resumed when audio track started");
            }).catch(err => {
              addDebugInfo(`Error resuming audio context: ${err.message}`);
            });
          }
          
          // Connect track directly to audio element
          try {
            if (audioElementRef.current && event.track) {
              // Create MediaStream from the audio track
              const stream = new MediaStream([event.track]);
              
              // Set up audio element
              audioElementRef.current.srcObject = stream;
              audioElementRef.current.muted = false;
              audioElementRef.current.volume = 1.0;
              
              // Try to play immediately
              audioElementRef.current.play()
                .then(() => {
                  addDebugInfo("Audio started automatically when track became available");
                  setToastMessage("Audio connected successfully");
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 3000);
                })
                .catch(e => {
                  addDebugInfo(`Audio autoplay failed: ${e.message}`);
                  
                  // If autoplay is blocked due to browser policies, we need user interaction
                  if (e.name === 'NotAllowedError') {
                    addDebugInfo("Will try to start audio on next user interaction");
                    
                    // Set up a one-time handler for user interaction
                    const startAudioOnInteraction = () => {
                      if (audioElementRef.current) {
                        audioElementRef.current.play()
                          .then(() => {
                            addDebugInfo("Audio started after user interaction");
                            setToastMessage("Audio connected");
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          })
                          .catch(err => addDebugInfo(`Audio still failed: ${err.message}`));
                      }
                      document.removeEventListener('click', startAudioOnInteraction);
                      document.removeEventListener('touchstart', startAudioOnInteraction);
                    };
                    
                    document.addEventListener('click', startAudioOnInteraction, { once: true });
                    document.addEventListener('touchstart', startAudioOnInteraction, { once: true });
                    
                    // Notify user they need to interact
                    setToastMessage("Tap anywhere to start audio");
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 5000);
                  }
                });
            }
          } catch (err) {
            addDebugInfo(`Error connecting audio track automatically: ${err}`);
          }
        }
      });
      
      // Additional events for debugging
      newCallObject.on('track-stopped', (event: any) => {
        addDebugInfo(`Track stopped: ${event.participant.user_name} - ${event.track.kind}`);
      });
      
      // Error handling
      newCallObject.on('error', (event: any) => {
        console.error("Daily error:", event);
        addDebugInfo(`Daily error: ${JSON.stringify(event)}`);
        setError(`Failed to connect: ${event.errorMsg || "Unknown Daily.co error"}`);
        setIsLoading(false);
      });
      
      // Network and connection issues
      newCallObject.on('network-connection', (event: any) => {
        addDebugInfo(`Network connection: ${event.type} - Quality: ${event.quality}`);
      });

      // Add an event listener for video-playback-started
      newCallObject.on('app-message', (event: any) => {
        if (event?.data?.type === 'video-playback-started') {
          addDebugInfo("Video playback started successfully");
        }
      });

      try {
        addDebugInfo(`Joining Daily room: ${roomUrl.substring(0, 30)}...`);
        // Join the Daily room
        await newCallObject.join({ 
          url: roomUrl,
        });

        // Enable audio after joining
        newCallObject.setLocalAudio(true);

        // Ensure audio output is enabled for remote participants
        newCallObject.setSubscribeToTracksAutomatically(true);
        
        addDebugInfo("Joined Daily room successfully");
        myCallObjRef.current = newCallObject;
        setCallObject(newCallObject);
        
        // Enhance the ensureAudioEnabled function with more diagnostics
        const ensureAudioEnabled = () => {
          // Skip if component is not visible or call object is not available
          if (!isVisible || !newCallObject) {
            return;
          }

          // Find the Chatbot participant
          const participants = newCallObject.participants();
          const chatbot = Object.values(participants).find(
            (p: any) => p.user_name === 'Chatbot'
          );
          
          if (chatbot) {
            const audioTrack = chatbot.tracks?.audio;
            if (audioTrack) {
              // Log detailed diagnostic info
              addDebugInfo(`Audio track status: state=${audioTrack.state}, subscribed=${audioTrack.subscribed}, enabled=${audioTrack.track?.enabled || false}`);
              
              if (audioTrack.state === 'playable') {
                addDebugInfo("Chatbot audio track is playable - ensuring it's connected");
                
                // Ensure audio context is active
                if (audioContext && audioContext.state === 'suspended') {
                  // Try to resume the context without user interaction first
                  audioContext.resume().then(() => {
                    addDebugInfo("Audio context resumed automatically");
                  }).catch(err => {
                    addDebugInfo(`Failed to auto-resume audio context: ${err instanceof Error ? err.message : String(err)}`);
                  });
                }
                
                // Ensure the audio track is enabled
                if (audioTrack.track) {
                  audioTrack.track.enabled = true;
                  
                  // Connect to audio element
                    if (audioElementRef.current) {
                    try {
                      // Create a fresh MediaStream with the audio track
                      const stream = new MediaStream([audioTrack.track]);
                      
                      // Setup the audio element
                      audioElementRef.current.srcObject = stream;
                      audioElementRef.current.muted = false;
                      audioElementRef.current.volume = 1.0;
                      
                      // Try playing immediately without waiting for user interaction
                      const playPromise = audioElementRef.current.play();
                      if (playPromise !== undefined) {
                        playPromise.then(() => {
                          addDebugInfo("Audio is now playing automatically!");
                          
                          // Show a success toast
                          setToastMessage("Audio connected");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                          
                          // Once playing successfully, we can reduce the frequency of checks
                          if (audioIntervalRef.current) {
                            clearInterval(audioIntervalRef.current);
                            audioIntervalRef.current = setInterval(ensureAudioEnabled, 5000); // Less frequent checks
                          }
                        }).catch(e => {
                          // Handle autoplay restrictions
                          addDebugInfo(`Autoplay failed: ${e instanceof Error ? e.message : String(e)}`);
                        });
                    }
                  } catch (err) {
                      addDebugInfo(`Error connecting to audio track: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  } else {
                    // Create an audio element if one doesn't exist
                    try {
                      const audioEl = new Audio();
                      audioEl.autoplay = true;
                      audioEl.controls = false;
                      audioEl.volume = 1.0;
                      audioEl.muted = false;
                      
                      // Add to DOM
                      audioEl.style.display = 'none';
                      document.body.appendChild(audioEl);
                      
                      // Connect the new audio element to the track
                      const stream = new MediaStream([audioTrack.track]);
                      audioEl.srcObject = stream;
                      audioElementRef.current = audioEl;
                      
                      // Try to play
                      audioEl.play().then(() => {
                        addDebugInfo("Created and started new audio element");
                      }).catch(err => {
                        addDebugInfo(`New audio element play failed: ${err instanceof Error ? err.message : String(err)}`);
                      });
                    } catch (err) {
                      addDebugInfo(`Error creating new audio element: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  }
                }
              } else {
                addDebugInfo(`Audio track not playable yet. Current state: ${audioTrack.state}`);
              }
            } else {
              addDebugInfo("Chatbot has no audio track yet - waiting");
            }
          } else {
            // Only log this message occasionally to reduce noise
            const now = Date.now();
            if (!lastChatbotCheckRef.current || now - lastChatbotCheckRef.current > 10000) {
              addDebugInfo("Chatbot participant not found in room yet");
              lastChatbotCheckRef.current = now;
            }
          }
        };
        
        // Call initially and set up a periodic check
        ensureAudioEnabled();
        const initialCheckInterval = setInterval(ensureAudioEnabled, 500); // Check every 500ms initially
        
        // Switch to less frequent checks after 10 seconds
          setTimeout(() => {
          if (initialCheckInterval) {
            clearInterval(initialCheckInterval);
        const audioCheckInterval = setInterval(ensureAudioEnabled, 2000);
        audioIntervalRef.current = audioCheckInterval;
          }
        }, 10000);
      } catch (dailyJoinError) {
        console.error("Error joining Daily room:", dailyJoinError);
        addDebugInfo(`Error joining Daily room: ${dailyJoinError instanceof Error ? dailyJoinError.message : String(dailyJoinError)}`);
        setError(`Failed to join room: ${dailyJoinError instanceof Error ? dailyJoinError.message : String(dailyJoinError)}`);
        setIsLoading(false);
        
        // Clean up the failed call object
        try {
          newCallObject.destroy();
          globalCallObject = null;
        } catch (cleanupError) {
          console.error("Error cleaning up Daily call object:", cleanupError);
        }
        return;
      }
    } catch (error) {
      console.error("Error starting Simli session:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      setIsLoading(false);
    }
  };  

  /**
   * Leave the room
   */
  const handleLeaveRoom = async () => {
    if (callObject) {
      addDebugInfo("Leaving room...");
      await callObject.leave();
      callObject.destroy();
      
      // Reset global reference
      if (globalCallObject === callObject) {
        globalCallObject = null;
      }
      
      setCallObject(null);
      myCallObjRef.current = null;
      onClose();
      setIsAvatarVisible(false);
      setIsLoading(false);
    }
  };

  /**
   * Mute or unmute local audio
   */
  const toggleMute = async () => {
    if (callObject) {
      const currentAudioState = callObject.localAudio();
      addDebugInfo(`Toggling microphone: ${currentAudioState ? "muting" : "unmuting"}`);
      
      if (!currentAudioState) {
        // For mobile, make sure we have microphone permissions before unmuting
        if (isMobile() && !micStreamRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;
            addDebugInfo("Obtained microphone permission for unmuting");
            
            // Make sure audio context is running
            if (audioContext && audioContext.state === 'suspended') {
              await audioContext.resume();
              addDebugInfo("AudioContext resumed when unmuting on mobile");
            }
          } catch (err) {
            addDebugInfo(`Error getting microphone permission: ${err}`);
            // Show error but don't exit - the Daily call might still have access
          }
        }
      }
      
      callObject.setLocalAudio(!currentAudioState);
      setIsMuted(currentAudioState);
      
      // Ensure audio context is running
      if (!currentAudioState && audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          addDebugInfo("AudioContext resumed when unmuting");
        });
      }
    }
  };

  // Add a function to request a first message from the chatbot after joining
  const requestFirstMessage = async () => {
    if (callObject && chatbotId) {
      // Wait a moment for connections to stabilize
      setTimeout(() => {
        addDebugInfo("Requesting first message from chatbot");
        
        // Send a special message to trigger first response
        try {
          // Check if call is joined before sending
          if (callObject.participants() && Object.keys(callObject.participants()).length > 0) {
            callObject.sendAppMessage({
              type: 'request-greeting',
              text: 'start'
            }, chatbotId);
            
            // Mark that we're waiting for a response
            setWaitingForSimliResponse(true);
            
            // Request transcript after greeting
            setTimeout(() => {
              // Use different request formats to increase chances of receiving a response
              callObject.sendAppMessage({
                type: 'avatar-speech',
                action: 'get_response'
              }, chatbotId);
              
              callObject.sendAppMessage({
                type: 'request-transcript',
                action: 'full_transcript'
              }, chatbotId);
            }, 4000);
          } else {
            addDebugInfo("Not sending greeting request - call not joined yet");
          }
        } catch (err) {
          addDebugInfo(`Error requesting first message: ${err}`);
        }
      }, 2000);
    }
  };

  // Add function to request transcript
  const requestTranscript = () => {
    if (callObject && chatbotId) {
      addDebugInfo("Requesting current transcript");
      try {
        callObject.sendAppMessage({
          type: 'request-transcript',
          text: 'getTranscript'
        }, chatbotId);
        
        // Set processing state briefly to show activity
        setIsProcessing(true);
        setTimeout(() => setIsProcessing(false), 3000);
      } catch (err) {
        addDebugInfo(`Error requesting transcript: ${err}`);
      }
    }
  };

  // Parse Simli messages for potential transcript content
  const parseSimliMessages = (event: any) => {
    if (!event || !event.data) return null;
    
    try {
      // Skip messages that are likely internal command messages
      
      // The data could contain the text the avatar is speaking
      const data = event.data;
      
      // Skip if type indicates an internal command
      if (data.type && typeof data.type === 'string') {
        const typeLC = data.type.toLowerCase();
        if (typeLC === 'get-transcript' || 
            typeLC === 'request-transcript' || 
            typeLC === 'transcript-request' ||
            typeLC === 'get-latest-response' ||
            typeLC === 'avatar-speech' ||
            typeLC === 'get-agent-response') {
          return null;
        }
      }
      
      // Skip if it has an action field
      if (data.action && typeof data.action === 'string') {
        return null;
      }
      
      // Check various places where the text might be hiding
      if (data.message && typeof data.message === 'string') {
        if (commandFilterPatterns.some(pattern => data.message.toLowerCase().includes(pattern.toLowerCase()))) {
          return null;
        }
        return data.message;
      }
      
      if (data.text && typeof data.text === 'string') {
        if (commandFilterPatterns.some(pattern => data.text.toLowerCase().includes(pattern.toLowerCase()))) {
          return null;
        }
        return data.text;
      }
      
      if (data.transcript && typeof data.transcript === 'string') {
        if (commandFilterPatterns.some(pattern => data.transcript.toLowerCase().includes(pattern.toLowerCase()))) {
          return null;
        }
        return data.transcript;
      }
      
      if (data.content && typeof data.content === 'string') {
        if (commandFilterPatterns.some(pattern => data.content.toLowerCase().includes(pattern.toLowerCase()))) {
          return null;
        }
        return data.content;
      }
      
      // Check for response formats
      if (data.response) {
        if (typeof data.response === 'string') {
          if (commandFilterPatterns.some(pattern => data.response.toLowerCase().includes(pattern.toLowerCase()))) {
            return null;
          }
          return data.response;
        }
        if (typeof data.response === 'object') {
          if (data.response.text && !commandFilterPatterns.some(pattern => data.response.text.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.response.text;
          
          if (data.response.message && !commandFilterPatterns.some(pattern => data.response.message.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.response.message;
          
          if (data.response.content && !commandFilterPatterns.some(pattern => data.response.content.toLowerCase().includes(pattern.toLowerCase()))) 
            return data.response.content;
        }
      }
      
      // Check for nested structures
      if (data.data && typeof data.data === 'object') {
        if (data.data.text && !commandFilterPatterns.some(pattern => data.data.text.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.data.text;
        if (data.data.message && !commandFilterPatterns.some(pattern => data.data.message.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.data.message;
        if (data.data.transcript && !commandFilterPatterns.some(pattern => data.data.transcript.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.data.transcript;
        if (data.data.content && !commandFilterPatterns.some(pattern => data.data.content.toLowerCase().includes(pattern.toLowerCase()))) 
          return data.data.content;
      }
      
      return null;
    } catch (e) {
      console.error("Error parsing Simli message:", e);
      return null;
    }
  };

  // Add a function to request text data directly from Simli's API
  const requestBotResponse = () => {
    if (callObject && chatbotId) {
      try {
        // Send a special message to request the current transcript
        callObject.sendAppMessage({
          type: 'get-latest-response',
          action: 'get_transcript'
        }, chatbotId);
        
        addDebugInfo("Requested latest response from chatbot");
      } catch (err) {
        addDebugInfo(`Error requesting bot response: ${err}`);
      }
    }
  };

  // Add function to set up audio processing pipeline for the avatar
  const setupAvatarSpeechRecognition = () => {
    if (!callObject || !chatbotId || !SpeechRecognitionAPI) {
      addDebugInfo("Cannot set up speech recognition: missing dependencies");
      return;
    }

    try {
      // Get the avatar's audio track
      const participants = callObject.participants();
      const chatbot = Object.values(participants).find(
        (p: any) => p.user_name === 'Chatbot'
      );
      
      if (!chatbot) {
        addDebugInfo("Chatbot participant not found for speech recognition");
        return;
      }
      
      const audioTrack = chatbot.tracks?.audio?.track;
      if (!audioTrack) {
        addDebugInfo("No audio track found for speech recognition");
        return;
      }
      
      addDebugInfo("Setting up speech recognition for avatar audio");
      
      // Create a MediaStream from the audio track
      const avatarStream = new MediaStream([audioTrack]);
      avatarAudioStreamRef.current = avatarStream;
      
      // Create a new audio context for processing
      if (typeof AudioContext !== 'undefined') {
        const avatarAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        avatarAudioContextRef.current = avatarAudioCtx;
      }
      
      // Create a recognition instance
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Set up recognition event handlers
        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;
          
          addDebugInfo(`Avatar speech recognized: ${transcript} (${isFinal ? 'final' : 'interim'})`);
          
          if (isFinal) {
            // Add to transcript
            const speaker = personaData.name;
            setTranscript(prev => {
              // Avoid duplicate messages
              if (prev.length > 0 && 
                  prev[prev.length - 1].speaker === speaker && 
                  prev[prev.length - 1].text === transcript) {
                return prev;
              }
              return [...prev, { speaker, text: transcript }];
            });
          }
        };
        
        recognition.onerror = (event: any) => {
          addDebugInfo(`Speech recognition error: ${event.error}`);
          isRecognizingRef.current = false;
          setIsListeningToAvatar(false);
        };
        
        recognition.onend = () => {
          addDebugInfo("Speech recognition ended - attempting to restart");
          if (isRecognizingRef.current) {
            // Restart recognition if it's still supposed to be running
            try {
              recognition.start();
              addDebugInfo("Speech recognition restarted");
            } catch (e) {
              addDebugInfo(`Failed to restart speech recognition: ${e}`);
            }
          }
        };
        
        // Store the recognition instance
        recognitionRef.current = recognition;
        
        // Start recognition
        try {
          recognition.start();
          isRecognizingRef.current = true;
          setIsListeningToAvatar(true);
          addDebugInfo("Avatar speech recognition started");
        } catch (e) {
          addDebugInfo(`Failed to start speech recognition: ${e}`);
        }
      } else {
        addDebugInfo("Speech recognition API not available in this browser");
      }
    } catch (error) {
      addDebugInfo(`Error setting up avatar speech recognition: ${error}`);
    }
  };

  // Add function to clean up speech recognition
  const cleanupAvatarSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        addDebugInfo("Cleaning up avatar speech recognition");
        recognitionRef.current.stop();
        isRecognizingRef.current = false;
        setIsListeningToAvatar(false);
      } catch (e) {
        addDebugInfo(`Error stopping speech recognition: ${e}`);
      }
    }
    
    if (avatarAudioContextRef.current) {
      try {
        avatarAudioContextRef.current.close();
        avatarAudioContextRef.current = null;
      } catch (e) {
        addDebugInfo(`Error closing avatar audio context: ${e}`);
      }
    }
    
    avatarAudioStreamRef.current = null;
  };

  // Initialize speech recognition when avatar appears
  useEffect(() => {
    if (isAvatarVisible && callObject && chatbotId) {
      // Set a timeout to let the tracks initialize properly
      setTimeout(() => {
        setupAvatarAudioMonitoring();
      }, 2000);
    }
    
    return () => {
      cleanupAvatarSpeechRecognition();
      
      // Also clean up hark instance
      if (harkInstanceRef.current) {
        harkInstanceRef.current.stop();
        harkInstanceRef.current = null;
      }
    };
  }, [isAvatarVisible, callObject, chatbotId]);

  // New function to request a direct response with no filtering
  const requestDirectResponse = () => {
    if (!callObject || !chatbotId) return;
    
    // Only send if call is joined
    if (callObject.participants() && Object.keys(callObject.participants()).length > 0) {
      try {
        // Try a different format specifically for getting the actual response
        callObject.sendAppMessage({
          type: 'get-agent-response',
          action: 'get_last_utterance'
        }, chatbotId);
        
        callObject.sendAppMessage({
          type: 'avatar-speech',
          action: 'get_response'
        }, chatbotId);
        
        addDebugInfo("Sent direct response request");
      } catch (e) {
        addDebugInfo(`Error sending direct response request: ${e}`);
      }
    }
  };

  // Function to reset and restart the Simli session
  const resetSimliSession = async () => {
    try {
      setIsLoading(true);
      
      // First clean up existing session
      if (callObject || myCallObjRef.current) {
        addDebugInfo("Cleaning up existing Simli session before restart");
        await cleanupExistingDaily();
      }
      
      // Reset states
      setChatbotId(null);
      setError(null);
      
      // Start new session
      addDebugInfo("Restarting Simli session...");
      await handleJoinRoom();
      
      addDebugInfo("Simli session restarted successfully");
    } catch (err) {
      console.error("Error resetting Simli session:", err);
      setError(`Failed to restart session: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up event listeners for reload button
  useEffect(() => {
    const handleReset = () => {
      console.log("Resetting Simli session through custom event");
      resetSimliSession();
    };
    
    window.addEventListener('simli-reset', handleReset);
    
    return () => {
      window.removeEventListener('simli-reset', handleReset);
    };
  }, []);

  // Component mount effect
  useEffect(() => {
    console.log("SimliAgent component mounted for persona:", personaId);
    
    // Initialize audio context if needed
    initAudio();
    
    // Clean up any existing Daily sessions
    cleanupExistingDaily().then(() => {
      // Join the Daily room
      handleJoinRoom();
    });
    
    // Component cleanup
    return () => {
      console.log("SimliAgent component unmounting...");
      cleanupAvatarSpeechRecognition();
      handleLeaveRoom();
    };
  }, [personaId]);

  // First, add a new isVisible state to track if the component is mounted and visible
  const [isVisible, setIsVisible] = useState(false);

  // Set isVisible to true when component mounts and false when it unmounts
  useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(false);
    };
  }, []);

  // Add a ref to track last check time
  const lastChatbotCheckRef = useRef<number | null>(null);

  // Handle for Mobile Audio Test Button
  const handleMobileAudioTest = async () => {
    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = newAudioContext;
        setAudioContext(newAudioContext);
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.1;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        
        // Show success toast
        setToastMessage("Audio test successful!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }, 500);
    } catch (err) {
      console.error("Audio test failed:", err);
      setToastMessage("Audio test failed. Please try again.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      {/* Toast notification */}
      {showToast && (
        <motion.div 
          className="fixed top-4 right-4 z-50 bg-white shadow-lg border border-gray-200 rounded-xl p-3 max-w-sm"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-sm text-gray-700">{toastMessage}</p>
        </motion.div>
      )}
      
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8">
      {!isAvatarVisible ? (
          // Start conversation UI
          <motion.div 
            className="flex flex-col items-center justify-center h-full w-full py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div 
              className="w-28 h-28 rounded-full flex items-center justify-center mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center shadow-inner">
            <img 
              src="/conversation-icon.svg" 
              alt="Start conversation" 
                  className="w-14 h-14 text-pink-500"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ec4899' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z'%3E%3C/path%3E%3C/svg%3E";
              }}
            />
          </div>
            </motion.div>
            
            <motion.h2 
              className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Start a conversation
            </motion.h2>
            
            <motion.p 
              className="text-gray-500 text-center mb-8 max-w-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Begin talking with {personaData.name} - ask questions about {personaData.productName || "their expertise"}.
            </motion.p>
          
          {isMobileDevice && (
              <motion.div 
                className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 max-w-sm w-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <p className="text-sm text-blue-700 mb-2 font-medium flex items-center">
                  <span className="bg-blue-100 p-1 rounded-full mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </span> 
                  You'll need to allow microphone access
              </p>
              <p className="text-xs text-blue-600">
                When prompted, please tap "Allow" to enable your microphone.
              </p>
              </motion.div>
          )}
          
            <motion.button
            onClick={handleJoinRoom}
            disabled={isLoading}
            className={cn(
                "w-full max-w-sm h-14 disabled:bg-gray-300 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-6 rounded-xl",
                "flex justify-center items-center shadow-lg transition-all duration-300 hover:shadow-pink-200"
            )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <span className="flex items-center">
                  <CircularSpinner size="sm" variant="outline" className="mr-3" />
                Connecting...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13"></path>
                  <path d="M22 2 15 22 11 13 2 9 22 2z"></path>
                </svg>
                Start Conversation
              </span>
            )}
            </motion.button>
          
          {error && (
              <motion.div 
                className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 max-w-sm w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={resetSimliSession} 
                className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full transition-colors"
              >
                Try Again
              </button>
              </motion.div>
          )}
          </motion.div>
      ) : (
          // Conversation UI - Wrap this in a motion div
          <motion.div 
            className="grid md:grid-cols-7 grid-cols-1 gap-6 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
          {/* Video container */}
            <motion.div 
              className="md:col-span-4 bg-white p-6 rounded-3xl shadow-lg border border-gray-100"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
                  {personaData.name}
                </h2>
                
              <div className="flex gap-2 items-center">
                  <motion.button
                  onClick={toggleMute}
                  className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200",
                      isMuted ? "bg-gray-100 text-gray-500" : "bg-pink-50 text-pink-600 hover:bg-pink-100"
                  )}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </motion.button>
                
                  <motion.button
                  onClick={toggleAudioMute}
                  className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200",
                      isAudioMuted ? "bg-gray-100 text-gray-500" : "bg-pink-50 text-pink-600 hover:bg-pink-100"
                  )}
                  title={isAudioMuted ? "Unmute Speaker" : "Mute Speaker"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                  {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </motion.button>
                  
                  <motion.button
                    onClick={() => window.dispatchEvent(new CustomEvent('simli-reset'))}
                    className="flex items-center justify-center h-10 w-10 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-all duration-200"
                    title="Reload AI agent"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RefreshCw size={18} />
                  </motion.button>
              </div>
            </div>
            
              <div className="overflow-hidden rounded-2xl h-[400px]">
            <RecoilRoot>
              <DailyProvider callObject={callObject as DailyCall}>
                <VideoComponent id={chatbotId || ""} name={personaData.name} />
              </DailyProvider>
            </RecoilRoot>
              </div>
            
            {/* Mobile-specific controls */}
            {isMobileDevice && (
                <motion.div 
                  className="mt-4 bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 rounded-xl p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-pink-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                    Audio Troubleshooting
                  </h3>
                <div className="flex flex-wrap gap-2">
                    <motion.button
                    onClick={async () => {
                      // Request microphone permission and initiate audio
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        micStreamRef.current = stream;
                        
                        // Resume audio context
                        if (audioContext && audioContext.state === 'suspended') {
                          await audioContext.resume();
                        }
                        
                        // Unmute if currently muted
                        if (isMuted && callObject) {
                          callObject.setLocalAudio(true);
                          setIsMuted(false);
                        }
                        
                          // Show success toast
                          setToastMessage("Microphone access granted!");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                      } catch (err) {
                          console.error("Failed to get microphone access:", err);
                          setToastMessage("Failed to access microphone. Please check your browser permissions.");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                      }
                    }}
                      className="text-xs bg-white text-pink-600 border border-pink-200 px-3 py-2 rounded-lg shadow-sm hover:bg-pink-50 transition-colors flex items-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                  >
                      <Mic size={14} className="mr-1" /> Test Mic
                    </motion.button>
                  
                    <motion.button
                      onClick={async () => {
                        try {
                          if (!audioContextRef.current) {
                            const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                            audioContextRef.current = newAudioContext;
                            setAudioContext(newAudioContext);
                            if (!window.audioContext) {
                              window.audioContext = newAudioContext;
                            }
                          }
                          
                          if (audioContextRef.current.state === 'suspended') {
                            await audioContextRef.current.resume();
                          }
                          
                          const oscillator = audioContextRef.current.createOscillator();
                          const gainNode = audioContextRef.current.createGain();
                          
                          oscillator.type = 'sine';
                          oscillator.frequency.value = 440;
                          gainNode.gain.value = 0.1;
                          
                          oscillator.connect(gainNode);
                          gainNode.connect(audioContextRef.current.destination);
                          
                          oscillator.start();
                          
                          setTimeout(() => {
                            oscillator.stop();
                            
                            // Show success toast
                            setToastMessage("Audio test successful!");
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          }, 500);
                              } catch (err) {
                          console.error("Audio test failed:", err);
                          setToastMessage("Audio test failed. Please try again.");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                        }
                      }}
                      className="text-xs bg-white text-pink-600 border border-pink-200 px-3 py-2 rounded-lg shadow-sm hover:bg-pink-50 transition-colors flex items-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Volume2 size={14} className="mr-1" /> Test Sound
                    </motion.button>
                    
                    <motion.button
                      onClick={() => {
                        if (isAudioFixing) return;
                        
                        setIsAudioFixing(true);
                        
                        // Attempt to fix audio
                        initAudio();
                        
                        setTimeout(() => {
                          setIsAudioFixing(false);
                          
                          // Show success toast
                          setToastMessage("Audio system reinitialized!");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                        }, 2000);
                      }}
                      disabled={isAudioFixing}
                      className="text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-2 rounded-lg shadow-sm hover:from-pink-600 hover:to-purple-600 disabled:opacity-70 transition-colors flex items-center"
                      whileHover={{ scale: isAudioFixing ? 1 : 1.02 }}
                      whileTap={{ scale: isAudioFixing ? 1 : 0.98 }}
                    >
                      {isAudioFixing ? (
                        <>
                          <CircularSpinner size="sm" variant="outline" className="mr-1" /> Fixing...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} className="mr-1" /> Fix Audio
                        </>
                      )}
                    </motion.button>
                </div>
                </motion.div>
            )}
            
            <div className="flex justify-center mt-5">
                <motion.button
                onClick={handleLeaveRoom}
                  className="flex items-center justify-center h-11 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl transition-colors shadow-sm hover:shadow"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
              >
                End Conversation
                </motion.button>
              
              {!isMobileDevice && (
                  <motion.button
                  onClick={() => {
                    // Force initialize audio
                    initAudio();
                    
                    // Force enable audio for the chatbot if possible
                    if (callObject) {
                      const participants = callObject.participants();
                      const chatbot = Object.values(participants).find(
                        (p: any) => p.user_name === 'Chatbot'
                      );
                      
                      if (chatbot) {
                        const audioTrack = chatbot.tracks?.audio;
                        if (audioTrack && audioTrack.track) {
                          audioTrack.track.enabled = true;
                          addDebugInfo("Manually enabled audio track");
                          
                          // Try direct connection to audio element
                          if (audioElementRef.current) {
                            try {
                              const stream = new MediaStream([audioTrack.track]);
                              audioElementRef.current.srcObject = stream;
                              audioElementRef.current.play()
                                .then(() => addDebugInfo("Manual audio connection established"))
                                .catch(e => addDebugInfo(`Manual audio play failed: ${e.message}`));
                            } catch (err) {
                              addDebugInfo(`Manual audio connection error: ${err}`);
                            }
                          }
                        }
                      }
                    }
                    
                    // Setup audio monitoring again
                    setupAvatarAudioMonitoring();
                  }}
                    className="flex items-center justify-center h-11 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl transition-colors ml-3 shadow-sm hover:shadow"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                  <Volume2 size={16} className="mr-2" />
                  Fix Audio
                  </motion.button>
              )}
            </div>
            </motion.div>
          
          {/* Conversation transcript */}
          <motion.div 
            className="md:col-span-3 bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col h-[600px] overflow-hidden"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="p-6 pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Conversation</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4" id="transcript-container">
              {transcript.map((item, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "p-3 rounded-xl text-sm max-w-[90%]",
                    item.speaker === 'You' 
                      ? "ml-auto bg-blue-50 border border-blue-100 text-gray-800" 
                      : "bg-gray-50 border border-gray-100 text-gray-800"
                  )}
                >
                  <p className="font-medium text-xs mb-1">{item.speaker}</p>
                  <p>{item.text}</p>
                </div>
              ))}
              {isAvatarSpeaking && (
                <div className="bg-gray-50 border border-gray-100 text-gray-800 p-3 rounded-xl text-sm">
                  <p className="font-medium text-xs mb-1">{personaData.name}</p>
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              )}
              {isProcessing && !isAvatarSpeaking && (
                <div className="bg-gray-50 border border-gray-100 text-gray-800 p-3 rounded-xl text-sm">
                  <p className="font-medium text-xs mb-1">{personaData.name}</p>
                  <div className="flex items-center">
                    <CircularSpinner size="sm" variant="default" className="text-gray-500" />
                    <span className="ml-2 text-gray-500">Processing...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all outline-none"
                  disabled={isProcessing || !isAvatarVisible || isMuted}
                />
                <motion.button
                  onClick={sendMessage}
                  disabled={isProcessing || !isAvatarVisible || isMuted || !message.trim()}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg",
                    message.trim() ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
                  )}
                  whileHover={{ scale: message.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: message.trim() ? 0.95 : 1 }}
                >
                  <Send size={16} />
                </motion.button>
              </div>
              
              {isMuted && (
                <p className="text-xs text-red-500 mt-2">
                  Your microphone is muted. Unmute to speak or type a message.
                </p>
              )}
            </div>
          </motion.div>
          </motion.div>
      )}
      </div>
      
      {/* Debug info section - hidden in production */}
      {process.env.NODE_ENV !== 'production' && debugInfo && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <h4 className="font-medium text-sm text-gray-700">Debug Info:</h4>
            <button 
              onClick={() => setDebugInfo("")} 
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <pre className="whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};

export default SimliAgent; 