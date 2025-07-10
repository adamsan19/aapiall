"use client"

import type React from "react"

import { useEffect } from "react"
import { videoService } from "../services/VideoService"

const PreloadManager: React.FC = () => {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload first page of videos
      videoService.getListFiles(1, 30).catch(console.warn)

      // Preload popular videos
      videoService.getPopularVideos(10).catch(console.warn)

      // Preload fonts
      const fontPreloads = ["https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"]

      fontPreloads.forEach((href) => {
        const link = document.createElement("link")
        link.rel = "preload"
        link.as = "style"
        link.href = href
        document.head.appendChild(link)
      })

      // Preload critical images
      const criticalImages = ["/placeholder.svg?height=360&width=640", "/placeholder.svg?height=192&width=192"]

      criticalImages.forEach((src) => {
        const img = new Image()
        img.src = src
      })
    }

    // DNS prefetch for external domains
    const dnsPrefetch = [
      "https://doodapi.com",
      "https://api.lulustream.com",
      "https://sdsd-8n8.pages.dev",
      "https://dodl.pages.dev",
      "https://luvluv.pages.dev",
      "https://doodstream.com",
      "https://lulustream.com",
    ]

    dnsPrefetch.forEach((href) => {
      const link = document.createElement("link")
      link.rel = "dns-prefetch"
      link.href = href
      document.head.appendChild(link)
    })

    // Start preloading after a short delay
    const timer = setTimeout(preloadCriticalResources, 1000)

    return () => clearTimeout(timer)
  }, [])

  return null
}

export default PreloadManager
