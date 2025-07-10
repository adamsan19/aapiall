"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { videoService } from "../services/VideoService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, Clock } from "lucide-react"

const LoadingProgress: React.FC = () => {
  const [progress, setProgress] = useState({
    isLoading: false,
    totalVideos: 0,
    hasCompleteData: false,
  })
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const updateProgress = () => {
    const progressData = videoService.getLoadingProgress()
    const stats = videoService.getCacheStats()
    setProgress(progressData)
    setCacheStats(stats)
  }

  useEffect(() => {
    updateProgress()
    const interval = setInterval(updateProgress, 2000) // Update every 2 seconds
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await videoService.refreshAllVideos()
      updateProgress()
    } catch (error) {
      console.error("Failed to refresh:", error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Loading Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={progress.hasCompleteData ? "default" : "secondary"}>
              {progress.hasCompleteData ? "Complete" : "Loading"}
            </Badge>
            {progress.isLoading && (
              <Badge variant="outline" className="animate-pulse">
                Loading...
              </Badge>
            )}
          </div>
          <Button onClick={handleRefresh} disabled={refreshing || progress.isLoading} size="sm" variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {progress.isLoading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Loading all videos...</span>
              <span>{progress.totalVideos} videos loaded</span>
            </div>
            <Progress value={progress.totalVideos > 0 ? Math.min((progress.totalVideos / 3000) * 100, 100) : 0} />
          </div>
        )}

        {cacheStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">{cacheStats.allVideosCount}</div>
              <div className="text-muted-foreground">Total Videos</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{cacheStats.totalItems}</div>
              <div className="text-muted-foreground">Cache Items</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{cacheStats.cacheSize}</div>
              <div className="text-muted-foreground">Cache Size</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{cacheStats.isLoadingAll ? "Yes" : "No"}</div>
              <div className="text-muted-foreground">Loading</div>
            </div>
          </div>
        )}

        {progress.hasCompleteData && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Clock className="w-4 h-4" />
            All video data loaded and cached. Search and browsing will be faster.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default LoadingProgress
