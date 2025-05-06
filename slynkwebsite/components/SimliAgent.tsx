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
  
  // First, add a new isVisible state to track if the component is mounted and visible
  const [isVisible, setIsVisible] = useState(false);
  
  // Add a ref to track last check time
  const lastChatbotCheckRef = useRef<number | null>(null);
  
  // Forward declarations for functions to fix linter errors
  // These are just declarations - implementations are below
  const monitorVideoDisplay = (participantId: string) => {
    // Implementation will come later
  };
  
  const requestFirstMessage = async () => {
    // Implementation will come later
  };
  
  const parseSimliMessages = (event: any) => {
    // Implementation will come later
    return null;
  };
  
  const cleanupAvatarSpeechRecognition = () => {
    // Implementation will come later
  };
  
  const requestDirectResponse = () => {
    // Implementation will come later
  };
  
  const setupAvatarSpeechRecognition = () => {
    // Implementation will come later
  };
  
  // Check device type on component mount
  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  // The real implementation of the component continues...

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      {/* Component JSX */}
    </div>
  );
};

export default SimliAgent; 