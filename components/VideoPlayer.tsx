"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Video } from "../types"
import { videoService } from "../services/VideoService"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Download, Eye, Clock, Calendar, Share2, Heart, ThumbsUp, ExternalLink } from 'lucide-react'
import Link from "next/link"
import OptimizedImage from "./ui/optimized-image"

interface VideoPlayerProps {
  videoId: string
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId }) => {
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const loadVideo = async (retry = false) => {
    try {
      setLoading(true)
      setError(null)
      if (retry) {
        setIsRetrying(true)
      }

      console.log(`Loading video ${videoId}${retry ? ` (retry ${retryCount + 1})` : ""}`)

      const videoData = await videoService.getVideo(videoId)

      if (!videoData || !videoData.file_code) {
        throw new Error("Invalid video data received")
      }

      setVideo(videoData)
      setRetryCount(0)
      setLikeCount(Math.floor(videoData.views * 0.1)) // Simulate like count

      // Load related videos using the new method
      try {
        const related = await videoService.getRelatedVideos(videoData, 12)
        setRelatedVideos(related)
      } catch (relatedError) {
        console.warn("Failed to load related videos:", relatedError)
        // Fallback to search-based related videos
        try {
          const searchRelated = await videoService.getSearch(videoData.title.split(" ").slice(0, 2).join(" "))
          setRelatedVideos(searchRelated.filter((v) => v.file_code !== videoId).slice(0, 12))
        } catch (searchError) {
          console.warn("Failed to load search-based related videos:", searchError)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load video"
      setError(errorMessage)
      console.error("Video loading error:", err)

      if (retry) {
        setRetryCount((prev) => prev + 1)
      }
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }

  const handleRetry = () => {
    if (retryCount < 3) {
      loadVideo(true)
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))
  }

  const handleShare = async () => {
    if (navigator.share && video) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: window.location.href,
        })
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  useEffect(() => {
    if (videoId) {
      loadVideo()
    }
  }, [videoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Video</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
              {retryCount < 3 && (
                <Button onClick={handleRetry} disabled={isRetrying} variant="outline">
                  {isRetrying ? "Retrying..." : `Retry (${3 - retryCount} left)`}
                </Button>
              )}
            </div>
            {retryCount >= 3 && (
              <p className="text-sm text-gray-500 mt-2">Maximum retry attempts reached. Please try again later.</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!video) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Video Not Found</h2>
            <p className="text-gray-600">The requested video could not be found.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span>/</span>
        <Link href="/popular" className="hover:text-foreground">
          Video Viral
        </Link>
        <span>/</span>
        <span className="text-foreground">{video.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Video Player */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                <iframe
                  src={video.protected_embed}
                  title={video.title}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{video.views.toLocaleString()} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{video.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(video.uploaded).toLocaleDateString()}</span>
                    </div>
                    {video.size && (
                      <div className="flex items-center gap-1">
                        <span>Size: {video.size}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleLike} variant={isLiked ? "default" : "outline"} size="sm">
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    {likeCount.toLocaleString()}
                  </Button>
                  <Button onClick={handleShare} variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={video.protected_dl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={video.protected_embed} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Watch External
                    </a>
                  </Button>
                  <Badge variant="secondary">{video.source}</Badge>
                </div>

                {/* Description */}
                {video.description && (
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Deskripsi</h2>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="text-muted-foreground whitespace-pre-line">{video.description}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {video.tag.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {video.tag.map((tag, index) => (
                        <Link key={index} href={`/search?q=${encodeURIComponent(tag)}`}>
                          <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground cursor-pointer">
                            #{tag}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Related Videos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video Terkait</CardTitle>
              <CardDescription>Video yang mungkin Anda suka</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {relatedVideos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {relatedVideos.map((relatedVideo, index) => (
                    <Link key={relatedVideo.file_code} href={`/video/${relatedVideo.file_code}`}>
                      <Card className="group cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex gap-3 p-3">
                            <div className="w-32 h-20 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                              <OptimizedImage
                                src={relatedVideo.single_img}
                                alt={relatedVideo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                priority={index < 4}
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                {relatedVideo.title}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  <span>{relatedVideo.views.toLocaleString()}</span>
                                </div>
                                <span>•</span>
                                <span>{relatedVideo.length}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-xs">
                                  {relatedVideo.source}
                                </Badge>
                                {relatedVideo.uploaded && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(relatedVideo.uploaded).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No related videos found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download</CardTitle>
              <CardDescription>Download video ini untuk ditonton offline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <a href={video.protected_dl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download HD ({video.size || "Unknown Size"})
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Klik tombol di atas untuk mengunduh video dalam kualitas terbaik
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
