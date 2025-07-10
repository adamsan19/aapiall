"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { SearchResult } from "../types"
import { videoService } from "../services/VideoService"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Play, Eye, X } from "lucide-react"
import Link from "next/link"

const SearchComponent: React.FC = () => {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showRecent, setShowRecent] = useState(false)

  useEffect(() => {
    // Load recent searches
    if (typeof window !== "undefined") {
      try {
        const recent = JSON.parse(localStorage.getItem("recent_searches") || "[]")
        setRecentSearches(recent)
      } catch (error) {
        console.warn("Failed to load recent searches:", error)
      }
    }
  }, [])

  const handleSearch = async (searchQuery?: string) => {
    const searchTerm = searchQuery || query
    if (!searchTerm.trim()) return

    setLoading(true)
    setShowRecent(false)

    try {
      const searchResults = await videoService.getSearch(searchTerm)
      setResults(searchResults)

      // Update recent searches
      const updated = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 10)
      setRecentSearches(updated)

      if (typeof window !== "undefined") {
        localStorage.setItem("recent_searches", JSON.stringify(updated))
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    if (typeof window !== "undefined") {
      localStorage.removeItem("recent_searches")
    }
  }

  const removeRecentSearch = (searchToRemove: string) => {
    const updated = recentSearches.filter((s) => s !== searchToRemove)
    setRecentSearches(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("recent_searches", JSON.stringify(updated))
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowRecent(true)}
              placeholder="Search videos..."
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <Button onClick={() => handleSearch()} disabled={loading || !query.trim()}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Recent Searches Dropdown */}
        {showRecent && recentSearches.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-10 max-h-60 overflow-y-auto">
            <CardContent className="p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Recent Searches</span>
                <Button variant="ghost" size="sm" onClick={clearRecentSearches} className="text-xs">
                  Clear All
                </Button>
              </div>
              {recentSearches.map((search, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer group"
                >
                  <span
                    className="flex-1 text-sm"
                    onClick={() => {
                      setQuery(search)
                      handleSearch(search)
                    }}
                  >
                    {search}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRecentSearch(search)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <p className="text-gray-600">{results.length} videos found</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((video) => (
              <Link key={video.file_code} href={`/video/${video.file_code}`}>
                <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden relative">
                      {video.single_img ? (
                        <img
                          src={video.single_img || "/placeholder.svg"}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <Play className="w-8 h-8 text-gray-500" />
                        </div>
                      )}

                      {video.length && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {video.length}
                        </div>
                      )}

                      {video.relevance > 0 && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            Match: {video.relevance}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary mb-2">{video.title}</h3>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{video.views.toLocaleString()}</span>
                        </div>
                        {video.uploaded && (
                          <>
                            <span>•</span>
                            <span>{new Date(video.uploaded).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>

                      <Badge variant="outline" className="text-xs">
                        {video.source}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium mb-2">No Results Found</h3>
            <p className="text-gray-600">
              No videos found for "{query}". Try different keywords or check your spelling.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Click outside to hide recent searches */}
      {showRecent && <div className="fixed inset-0 z-0" onClick={() => setShowRecent(false)} />}
    </div>
  )
}

export default SearchComponent
