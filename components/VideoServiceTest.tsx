"use client"

import type React from "react"
import { useState } from "react"
import { videoService } from "../services/VideoService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const VideoServiceTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [testVideoId, setTestVideoId] = useState("7ixrqjykx4wd")

  const addResult = (test: string, result: any, success: boolean) => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        result,
        success,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }

  const testGetVideo = async () => {
    setLoading(true)
    try {
      console.log("Testing getVideo with ID:", testVideoId)
      const video = await videoService.getVideo(testVideoId)
      addResult("getVideo", video, true)
      console.log("getVideo success:", video)
    } catch (error) {
      addResult("getVideo", error instanceof Error ? error.message : "Unknown error", false)
      console.error("getVideo error:", error)
    }
    setLoading(false)
  }

  const testGetListFiles = async () => {
    setLoading(true)
    try {
      console.log("Testing getListFiles...")
      const list = await videoService.getListFiles(1, 10)
      addResult("getListFiles", `${list.result.files.length} videos loaded`, true)
      console.log("getListFiles success:", list)
    } catch (error) {
      addResult("getListFiles", error instanceof Error ? error.message : "Unknown error", false)
      console.error("getListFiles error:", error)
    }
    setLoading(false)
  }

  const testSearch = async () => {
    setLoading(true)
    try {
      console.log("Testing search...")
      const results = await videoService.getSearch("video")
      addResult("getSearch", `${results.length} results found`, true)
      console.log("getSearch success:", results)
    } catch (error) {
      addResult("getSearch", error instanceof Error ? error.message : "Unknown error", false)
      console.error("getSearch error:", error)
    }
    setLoading(false)
  }

  const testCacheStats = () => {
    try {
      const stats = videoService.getCacheStats()
      addResult("getCacheStats", stats, true)
      console.log("Cache stats:", stats)
    } catch (error) {
      addResult("getCacheStats", error instanceof Error ? error.message : "Unknown error", false)
      console.error("getCacheStats error:", error)
    }
  }

  const testClearCache = () => {
    try {
      videoService.clearCache()
      addResult("clearCache", "Cache cleared successfully", true)
      console.log("Cache cleared")
    } catch (error) {
      addResult("clearCache", error instanceof Error ? error.message : "Unknown error", false)
      console.error("clearCache error:", error)
    }
  }

  const testClearExpiredCache = () => {
    try {
      const cleared = videoService.clearExpiredCache()
      addResult("clearExpiredCache", `${cleared} expired items cleared`, true)
      console.log("Expired cache cleared:", cleared)
    } catch (error) {
      addResult("clearExpiredCache", error instanceof Error ? error.message : "Unknown error", false)
      console.error("clearExpiredCache error:", error)
    }
  }

  const runAllTests = async () => {
    setTestResults([])
    await testGetVideo()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await testGetListFiles()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await testSearch()
    await new Promise((resolve) => setTimeout(resolve, 500))
    testCacheStats()
    testClearExpiredCache()
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>VideoService Test Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              value={testVideoId}
              onChange={(e) => setTestVideoId(e.target.value)}
              placeholder="Enter video ID to test"
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button onClick={testGetVideo} disabled={loading} size="sm">
              Test getVideo
            </Button>
            <Button onClick={testGetListFiles} disabled={loading} size="sm">
              Test getListFiles
            </Button>
            <Button onClick={testSearch} disabled={loading} size="sm">
              Test getSearch
            </Button>
            <Button onClick={testCacheStats} disabled={loading} size="sm">
              Cache Stats
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button onClick={testClearCache} variant="outline" size="sm">
              Clear Cache
            </Button>
            <Button onClick={testClearExpiredCache} variant="outline" size="sm">
              Clear Expired
            </Button>
            <Button onClick={runAllTests} disabled={loading} variant="secondary" size="sm">
              Run All Tests
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={clearResults} variant="ghost" size="sm">
              Clear Results
            </Button>
            {loading && <Badge variant="secondary">Testing...</Badge>}
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results ({testResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? "default" : "destructive"}>{result.test}</Badge>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <Badge variant={result.success ? "secondary" : "destructive"}>
                      {result.success ? "✓ Success" : "✗ Failed"}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                      {typeof result.result === "object"
                        ? JSON.stringify(result.result, null, 2)
                        : String(result.result)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Endpoints Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Doodapi:</span>
              <Badge variant="secondary">https://doodapi.com/api/</Badge>
            </div>
            <div className="flex justify-between">
              <span>Lulustream:</span>
              <Badge variant="secondary">https://api.lulustream.com/api/</Badge>
            </div>
            <div className="flex justify-between">
              <span>SDSD:</span>
              <Badge variant="secondary">https://sdsd-8n8.pages.dev/api/</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VideoServiceTest
