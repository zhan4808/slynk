import React, { useEffect, useRef, useState } from "react";
import { useParticipant } from "@daily-co/daily-react";

interface VideoBoxProps {
  id: string;
}

const VideoBox: React.FC<VideoBoxProps> = ({ id }) => {
  const participant = useParticipant(id);
  const videoTrack = participant?.tracks?.video;
  const audioTrack = participant?.tracks?.audio;
  const isLocal = participant?.local === true;
  const [videoConnected, setVideoConnected] = useState(false);
  const [videoLoadAttempts, setVideoLoadAttempts] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const videoElement = useRef<HTMLVideoElement>(null);
  
  // Debug output for VideoBox
  useEffect(() => {
    console.log(`VideoBox for ${id}:`, {
      participantExists: !!participant,
      videoTrackExists: !!videoTrack,
      videoTrackState: videoTrack?.state,
      hasVideoTrack: !!videoTrack?.track,
      trackSubscribed: videoTrack?.subscribed,
      audioTrackExists: !!audioTrack,
      audioTrackState: audioTrack?.state
    });
    
    // Extra debugging for the track
    if (videoTrack) {
      console.log("Video track details:", {
        state: videoTrack.state,
        subscribed: videoTrack.subscribed,
        blocked: videoTrack.blocked,
        id: videoTrack.persistentTrack
      });
    }
  }, [id, participant, videoTrack, audioTrack]);
  
  // Handle track state changes
  useEffect(() => {
    console.log(`Video track state changed for ${id}:`, videoTrack?.state);
    
    if (videoTrack?.state === 'playable') {
      setVideoConnected(true);
    } else {
      setVideoConnected(false);
      setVideoLoaded(false); // Reset video loaded state when track is not playable
    }
  }, [id, videoTrack?.state]);
  
  // Auto-retry video loading if needed
  useEffect(() => {
    if (!videoConnected && videoTrack && videoLoadAttempts < 5) { // Increase max attempts
      const retryTimer = setTimeout(() => {
        console.log(`Retry video attachment attempt #${videoLoadAttempts + 1}`);
        setVideoLoadAttempts(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [videoConnected, videoTrack, videoLoadAttempts]);
  
  // Verify that video actually has dimensions (not just a black frame)
  const verifyVideoDimensions = () => {
    if (!videoElement.current) return false;
    
    const videoWidth = videoElement.current.videoWidth;
    const videoHeight = videoElement.current.videoHeight;
    
    console.log(`Checking video dimensions: ${videoWidth}x${videoHeight}`);
    
    // Consider video loaded only if it has actual dimensions
    if (videoWidth > 0 && videoHeight > 0) {
      console.log("Video has valid dimensions");
      setVideoLoaded(true);
      return true;
    }
    
    console.log("Video has invalid dimensions");
    setVideoLoaded(false);
    return false;
  };
  
  // Check if the video element has rendered anything
  const checkVideoRendering = () => {
    if (!videoElement.current) return false;
    
    try {
      // Try to analyze if video is actually showing content
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return false;
      
      canvas.width = videoElement.current.videoWidth;
      canvas.height = videoElement.current.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(videoElement.current, 0, 0);
      
      // Try to analyze if the frame is just black
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Check if frame is just black or nearly black
        let totalPixels = data.length / 4; // RGBA values
        let blackPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          // Check if pixel is dark (near black)
          if (data[i] < 20 && data[i+1] < 20 && data[i+2] < 20) {
            blackPixels++;
          }
        }
        
        // If more than 95% pixels are black, consider it a black frame
        const blackPercent = (blackPixels / totalPixels) * 100;
        console.log(`Black pixels: ${blackPercent.toFixed(2)}% of total`);
        
        if (blackPercent > 95) {
          console.log("Video appears to be just a black frame");
          return false;
        }
      } catch (e) {
        console.error("Error analyzing video frame:", e);
        return false;
      }
      
      return true;
    } catch (e) {
      console.error("Error checking video rendering:", e);
      return false;
    }
  };
  
  // Handle video element attachment
  useEffect(() => {
    if (!videoElement.current || !videoTrack) return;
    
    console.log(`Attempting to attach video for ${id}. Track state:`, videoTrack.state);
    
    if (videoTrack.state === 'playable') {
      try {
        console.log(`Attaching video track for ${id}`);
        
        // Clear any existing video source
        try {
          // Force clean any existing video sources
          if (videoElement.current.srcObject) {
            const stream = videoElement.current.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            videoElement.current.srcObject = null;
          }
        } catch (e) {
          console.error("Error cleaning video element:", e);
        }
        
        // Ensure video track is enabled
        if (videoTrack.track) {
          videoTrack.track.enabled = true;
        }
        
        // Use MediaStream directly instead of trying to call attach
        if (videoTrack.track) {
          const stream = new MediaStream([videoTrack.track]);
          
          // Important: Only add audio if video has been validated
          // We'll add audio to the stream later once video is actually loaded
          
          videoElement.current.srcObject = stream;
          
          // When video metadata is loaded, check if video is actually visible
          videoElement.current.onloadedmetadata = () => {
            console.log("Video metadata loaded");
            
            // Get video actual dimensions to make sure they are valid
            const videoWidth = videoElement.current?.videoWidth || 0;
            const videoHeight = videoElement.current?.videoHeight || 0;
            
            console.log(`Video dimensions: ${videoWidth}x${videoHeight}`);
            
            // Check if video dimensions are valid
            if (videoWidth > 0 && videoHeight > 0) {
              console.log("Video has valid dimensions, attempting to play");
              
              // Set a timeout to ensure video element is ready
              setTimeout(() => {
                videoElement.current?.play()
                  .then(() => {
                    console.log("Video is now playing after metadata loaded");
                    setVideoConnected(true);
                    
                    // Add additional check to verify actual video content
                    setTimeout(() => {
                      if (verifyVideoDimensions() && checkVideoRendering()) {
                        setVideoLoaded(true);
                        
                        // Only now add audio to ensure it's synchronized
                        if (audioTrack?.state === 'playable' && audioTrack.track) {
                          console.log("Video confirmed loaded, adding audio track to stream");
                          try {
                            const currentStream = videoElement.current?.srcObject as MediaStream;
                            if (currentStream) {
                              // Add audio track to the existing stream
                              currentStream.addTrack(audioTrack.track);
                            }
                          } catch (e) {
                            console.error("Error adding audio track to video stream:", e);
                          }
                        }
                      } else {
                        console.log("Video appears empty or not visible, not adding audio yet");
                        setVideoLoaded(false);
                        // Force a retry
                        setVideoLoadAttempts(prev => prev + 1);
                      }
                    }, 500); // Check half a second after play starts
                  })
                  .catch(e => console.error("Error playing video after metadata loaded:", e));
              }, 100);
            } else {
              console.error("Video has invalid dimensions, will retry");
              setVideoConnected(false);
              setVideoLoaded(false);
              // Trigger a retry by updating the load attempt counter
              setVideoLoadAttempts(prev => prev + 1);
            }
          };
          
          videoElement.current.oncanplay = () => {
            console.log("Video can play event triggered");
            setVideoConnected(true);
            
            // Additional verification a bit after canplay
            setTimeout(() => {
              verifyVideoDimensions();
            }, 500);
          };
          
          videoElement.current.onerror = (e) => {
            console.error("Video element error:", e);
            setVideoConnected(false);
            setVideoLoaded(false);
          };
          
          // Force the video to play
          videoElement.current.play()
            .then(() => {
              console.log("Video is playing");
              setVideoConnected(true);
              
              // Verify video is actually loaded with content
              setTimeout(() => {
                verifyVideoDimensions();
              }, 200);
            })
            .catch(err => {
              console.error("Error playing video:", err);
              // Try once more with user interaction
              const playPromise = videoElement.current?.play();
              if (playPromise) {
                playPromise.catch(e => console.error("Second attempt to play failed:", e));
              }
            });
        }
      } catch (error) {
        console.error("Error attaching video track:", error);
        setVideoConnected(false);
        setVideoLoaded(false);
      }
    } else {
      setVideoConnected(false);
      setVideoLoaded(false);
    }
    
    return () => {
      if (videoElement.current) {
        try {
          console.log(`Cleaning up video element for ${id}`);
          
          // Just clear the srcObject directly instead of trying to call detach
          if (videoElement.current.srcObject) {
            const stream = videoElement.current.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            videoElement.current.srcObject = null;
          }
          
          setVideoConnected(false);
          setVideoLoaded(false);
        } catch (error) {
          console.error("Error cleaning up video element:", error);
        }
      }
    };
  }, [id, videoTrack, audioTrack, videoLoadAttempts]);

  // Set up periodic verification of video content
  useEffect(() => {
    if (!videoConnected || !videoElement.current) return;
    
    // Periodically check if video is still loaded properly
    const verificationInterval = setInterval(() => {
      const isValid = verifyVideoDimensions() && checkVideoRendering();
      setVideoLoaded(isValid);
      
      if (!isValid && videoLoadAttempts < 5) {
        console.log("Video verification failed, triggering reload");
        setVideoLoadAttempts(prev => prev + 1);
      }
    }, 3000);
    
    return () => clearInterval(verificationInterval);
  }, [videoConnected, videoLoadAttempts]);

  if (!participant) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white">
        <div className="text-center p-4">
          <p>No video participant found</p>
          <p className="text-xs text-gray-400 mt-1">Participant ID: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
      <video
        autoPlay
        playsInline
        preload="auto"
        muted={isLocal}
        ref={videoElement}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {!videoConnected && (
        <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center text-white">
          <div className="text-center p-4">
            <p>Waiting for video...</p>
            <p className="text-xs text-gray-300 mt-2">
              Video state: {videoTrack?.state || "no track"}
            </p>
            {videoLoadAttempts > 0 && (
              <p className="text-xs text-gray-300 mt-1">
                Retry attempt: {videoLoadAttempts}/5
              </p>
            )}
          </div>
        </div>
      )}
      
      {videoConnected && !videoLoaded && (
        <div className="absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center text-white">
          <div className="text-center p-4">
            <p>Optimizing video quality...</p>
            <div className="mt-2 flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoBox; 