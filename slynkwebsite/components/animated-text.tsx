"use client"

import React, { useState, useEffect } from "react"

interface AnimatedTextProps {
  words: string[]
  typingSpeed?: number
  deletingSpeed?: number
  delayBetweenWords?: number
  className?: string
}

export function AnimatedText({
  words,
  typingSpeed = 100,
  deletingSpeed = 80,
  delayBetweenWords = 1500,
  className = "",
}: AnimatedTextProps) {
  const [displayText, setDisplayText] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      // Current word we're processing
      const currentWord = words[wordIndex]
      
      // Update display text based on current indices
      if (!isDeleting) {
        // Adding characters
        if (charIndex < currentWord.length) {
          setDisplayText(currentWord.substring(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        } else {
          // Finished typing the word - pause before deleting
          setIsDeleting(true)
          clearTimeout(timer)
          setTimeout(() => {
            setIsDeleting(true)
          }, delayBetweenWords)
        }
      } else {
        // Removing characters
        if (charIndex > 0) {
          setDisplayText(currentWord.substring(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        } else {
          // Move to next word
          setIsDeleting(false)
          setWordIndex((wordIndex + 1) % words.length)
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)
    
    return () => clearTimeout(timer)
  }, [charIndex, delayBetweenWords, deletingSpeed, isDeleting, typingSpeed, wordIndex, words])

  return (
    <span className={className}>
      {displayText}
      <span className="inline-block ml-[1px] w-[2px] h-[1.1em] bg-pink-400 relative top-[0.2em] animate-blink"></span>
    </span>
  )
}
