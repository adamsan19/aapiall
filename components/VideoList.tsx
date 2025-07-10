"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Video, ApiResponse } from "../types"
import { videoService } from "../services/VideoService"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import OptimizedImage from "./ui/optimized-image"

interface VideoListProps {
  initialPage?: number
  perPage?: number
}

const VideoList: React.FC<VideoListProps> = ({ initialPage = 1, perPage = 30 }) => {
  const [videos, setVideos] = useState<Video[]>([])
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadVideos = async (page: number) => {
    try {
      setLoading(true)
      setError(null)

      const response: ApiResponse = await videoService.getListFiles(page, perPage)

      setVideos(response.result.files)
      setTotalPages(response.result.total_pages)
      setCurrentPage(response.result.current_page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos")
      console.error("Video list loading error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos(currentPage)
  }, [currentPage])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = 5
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    // Previous button
    pages.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>,
    )

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>,
      )
    }

    // Next button
    pages.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>,
    )

    return pages
  }

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error && videos.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Videos</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => loadVideos(currentPage)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Video Gallery</h1>
        <p className="text-gray-600">
          Page {currentPage} of {totalPages} • {videos.length} videos
        </p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {videos.map((video, index) => (
          <Link key={video.file_code} href={`/video/${video.file_code}`}>
            <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden relative">
                  <OptimizedImage
                    src={video.single_img}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    priority={index < 6} // Prioritize first 6 images
                  />

                  {video.length && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.length}
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary mb-2">{video.title}</h3>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{video.views.toLocaleString()}</span>
                    </div>
                    {video.size && <span>{video.size}</span>}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {video.source}
                    </Badge>
                    {video.uploaded && (
                      <span className="text-xs text-gray-400">{new Date(video.uploaded).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && <div className="flex justify-center items-center gap-2">{renderPagination()}</div>}

      {/* Loading indicator for page changes */}
      {loading && videos.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          Loading...
        </div>
      )}
    </div>
  )
}

export default VideoList
