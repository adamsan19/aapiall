"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallbackSrc?: string
  className?: string
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = "/placeholder.svg?height=360&width=640",
  className,
  priority = false,
  onLoad,
  onError,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observerRef.current?.disconnect()
          }
        })
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
      },
    )

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [priority, isInView])

  // Preload image when in view
  useEffect(() => {
    if (!isInView) return

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      setIsLoading(false)
      setHasError(false)
      onLoad?.()
    }

    img.onerror = () => {
      if (currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc)
        setHasError(true)
        onError?.()
      } else {
        setIsLoading(false)
        setHasError(true)
      }
    }

    img.src = currentSrc
  }, [currentSrc, fallbackSrc, isInView, onLoad, onError])

  const handleImageError = () => {
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(true)
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
    onLoad?.()
  }

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={currentSrc || "/placeholder.svg"}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            hasError && "filter grayscale",
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...props}
        />
      )}

      {/* Error indicator */}
      {hasError && <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Error</div>}
    </div>
  )
}

export default OptimizedImage
