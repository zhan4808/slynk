"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ProductVideo {
  id: string
  title: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
}

interface ProductVideoPlayerProps {
  videos: ProductVideo[]
  currentVideoIndex: number
  setCurrentVideoIndex: (index: number) => void
  className?: string
}

export function ProductVideoPlayer({
  videos,
  currentVideoIndex,
  setCurrentVideoIndex,
  className = ""
}: ProductVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)

  const currentVideo = videos[currentVideoIndex]

  useEffect(() => {
    // Reset video player when video changes
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setProgress(0)
      setCurrentTime(0)
      
      // Auto-play when changing videos
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error("Error auto-playing video:", err)
          setIsPlaying(false)
        })
    }
  }, [currentVideoIndex, currentVideo])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      setProgress((video.currentTime / video.duration) * 100)
    }

    const handleDurationChange = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(100)
      
      // Auto-advance to next video
      if (currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentVideoIndex, videos.length, setCurrentVideoIndex])

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Error playing video:", err))
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    
    videoRef.current.currentTime = clickPosition * videoRef.current.duration
    setProgress(clickPosition * 100)
  }

  const toggleFullscreen = () => {
    if (!playerRef.current) return

    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Error entering fullscreen:", err))
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error("Error exiting fullscreen:", err))
    }
  }

  const nextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1)
    }
  }

  const prevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1)
    }
  }

  // Format time as MM:SS
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`
  }

  if (!currentVideo) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">No videos available</p>
      </div>
    )
  }

  return (
    <div 
      ref={playerRef} 
      className={`relative bg-black rounded-lg overflow-hidden shadow-lg ${className}`}
    >
      {/* Video player */}
      <video
        ref={videoRef}
        src={currentVideo.videoUrl}
        poster={currentVideo.thumbnailUrl}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
      />

      {/* Video controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress bar */}
        <div 
          className="h-1 bg-gray-500 rounded-full mb-2 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-purple-500 rounded-full" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Time display */}
        <div className="flex justify-between text-xs text-white/80 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button 
              onClick={togglePlay}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            
            {/* Mute/Unmute */}
            <button 
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Previous/Next video buttons */}
            <button 
              onClick={prevVideo}
              disabled={currentVideoIndex === 0}
              className={`p-2 rounded-full transition-colors text-white ${
                currentVideoIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="text-white text-xs px-2">
              {currentVideoIndex + 1}/{videos.length}
            </div>
            
            <button 
              onClick={nextVideo}
              disabled={currentVideoIndex === videos.length - 1}
              className={`p-2 rounded-full transition-colors text-white ${
                currentVideoIndex === videos.length - 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <ChevronRight size={18} />
            </button>
            
            {/* Fullscreen */}
            <button 
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Video title & description */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <h3 className="text-white font-medium truncate">{currentVideo.title}</h3>
        {currentVideo.description && (
          <p className="text-white/80 text-sm line-clamp-2 mt-1">{currentVideo.description}</p>
        )}
      </div>
    </div>
  )
} 