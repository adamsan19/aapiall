"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Video } from "../types"
import { videoService } from "../services/VideoService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Clock, Star, Eye } from "lucide-react"
import Link from "next/link"

const VideoCategories: React.FC = () => {
  const [popularVideos, setPopularVideos] = useState<Video[]>([])
  const [recentVideos, setRecentVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [popular, recent] = await Promise.all([
          videoService.getPopularVideos(20),
          videoService.getRecentVideos(20),
        ])
        setPopularVideos(popular)
        setRecentVideos(recent)
      } catch (error) {
        console.error("Error loading category data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const VideoGrid: React.FC<{ videos: Video[]; showViews?: boolean }> = ({ videos, showViews = false }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <Link key={video.file_code} href={`/video/${video.file_code}`}>
          <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden relative">
                <img
                  src={video.single_img || "/placeholder.svg?height=360&width=640"}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
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
                  {showViews && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{video.views.toLocaleString()}</span>
                    </div>
                  )}
                  {video.uploaded && <span>{new Date(video.uploaded).toLocaleDateString()}</span>}
                </div>

                <Badge variant="secondary" className="text-xs">
                  {video.source}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Video Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="popular" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Most Popular Videos</h3>
                <Badge variant="outline">{popularVideos.length} videos</Badge>
              </div>
              <VideoGrid videos={popularVideos} showViews={true} />
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recently Added</h3>
                <Badge variant="outline">{recentVideos.length} videos</Badge>
              </div>
              <VideoGrid videos={recentVideos} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default VideoCategories
