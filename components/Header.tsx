"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Menu,
  X,
  Home,
  TrendingUp,
  Clock,
  Settings,
  Download,
  Heart,
  User,
  Moon,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react"
import { videoService } from "../services/VideoService"

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [cacheStats, setCacheStats] = useState<any>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Navigation items
  const navigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/popular", label: "Popular", icon: TrendingUp },
    { href: "/recent", label: "Recent", icon: Clock },
    { href: "/favorites", label: "Favorites", icon: Heart },
    { href: "/downloads", label: "Downloads", icon: Download },
    { href: "/search", label: "Search", icon: Search },
  ]

  // Initialize
  useEffect(() => {
    // Load recent searches
    const recent = JSON.parse(localStorage.getItem("recent_searches") || "[]")
    setRecentSearches(recent)

    // Load theme preference
    const theme = localStorage.getItem("theme")
    setIsDarkMode(theme === "dark")

    // Online/offline status
    setIsOnline(navigator.onLine)
    window.addEventListener("online", () => setIsOnline(true))
    window.addEventListener("offline", () => setIsOnline(false))

    // Update cache stats
    const updateStats = () => {
      const stats = videoService.getCacheStats()
      setCacheStats(stats)
    }
    updateStats()
    const interval = setInterval(updateStats, 5000)

    return () => {
      window.removeEventListener("online", () => setIsOnline(true))
      window.removeEventListener("offline", () => setIsOnline(false))
      clearInterval(interval)
    }
  }, [])

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await videoService.getSearch(query)
      setSearchResults(results.slice(0, 8)) // Limit to 8 results
      setShowSearchResults(true)
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setShowSearchResults(false)
      setIsMenuOpen(false)
    }
  }

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setSearchQuery(search)
    router.push(`/search?q=${encodeURIComponent(search)}`)
    setShowSearchResults(false)
    setIsMenuOpen(false)
  }

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
    document.documentElement.classList.toggle("dark", newTheme)
  }

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">VS</span>
              </div>
              <span className="font-bold text-xl hidden sm:inline-block">VideoStream</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.slice(0, 4).map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant={isActive ? "default" : "ghost"} size="sm" className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>

            {/* Search Bar */}
            <div ref={searchRef} className="relative flex-1 max-w-md mx-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  className="pr-10"
                />
                <Button type="submit" size="sm" variant="ghost" className="absolute right-0 top-0 h-full px-3">
                  <Search className="w-4 h-4" />
                </Button>
              </form>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
                  <CardContent className="p-2">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground px-2">Search Results</div>
                        {searchResults.map((video) => (
                          <Link
                            key={video.file_code}
                            href={`/video/${video.file_code}`}
                            onClick={() => setShowSearchResults(false)}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg"
                          >
                            <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                              <img
                                src={video.single_img || "/placeholder.svg"}
                                alt={video.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm line-clamp-1">{video.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {video.views.toLocaleString()} views • {video.source}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : recentSearches.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground px-2">Recent Searches</div>
                        {recentSearches.slice(0, 5).map((search, index) => (
                          <button
                            key={index}
                            onClick={() => handleRecentSearchClick(search)}
                            className="w-full text-left p-2 hover:bg-muted rounded-lg text-sm"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">No results found</div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {/* Online Status */}
              <div className="hidden sm:flex items-center gap-1">
                {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              </div>

              {/* Cache Stats */}
              {cacheStats && (
                <Badge variant="outline" className="hidden lg:inline-flex text-xs">
                  {cacheStats.allVideosCount} videos cached
                </Badge>
              )}

              {/* Theme Toggle */}
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Mobile Menu Toggle */}
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                      <Button variant={isActive ? "default" : "ghost"} className="w-full justify-start gap-2">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}

                {/* Mobile-only items */}
                <div className="pt-4 border-t space-y-2">
                  <Link href="/settings" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Button>
                  </Link>
                  <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <User className="w-4 h-4" />
                      Profile
                    </Button>
                  </Link>
                </div>

                {/* Status Info */}
                <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <div className="flex items-center gap-1">
                      {isOnline ? (
                        <>
                          <Wifi className="w-4 h-4 text-green-500" />
                          <span className="text-green-500">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4 text-red-500" />
                          <span className="text-red-500">Offline</span>
                        </>
                      )}
                    </div>
                  </div>
                  {cacheStats && (
                    <div className="flex items-center justify-between">
                      <span>Cached Videos:</span>
                      <span>{cacheStats.allVideosCount}</span>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop for mobile menu */}
      {isMenuOpen && <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />}
    </>
  )
}

export default Header
