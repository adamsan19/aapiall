import type { Video, ApiResponse, CacheItem, SearchResult } from "../types"

// Cache durations (in milliseconds)
const CACHE_DURATION_VIDEO = 12 * 3600 * 1000 // 12 hours
const CACHE_DURATION_LIST = 1 * 3600 * 1000 // 1 hour
const CACHE_DURATION_SEARCH_FULL = 1 * 3600 * 1000 // 1 hour
const CACHE_DURATION_SEARCH_TERM = 30 * 60 * 1000 // 30 minutes
const CACHE_DURATION_ALL_VIDEOS = 30 * 60 * 1000 // 30 minutes for complete data

// Cache key for complete video data
const ALL_VIDEOS_CACHE_KEY = "all_videos_complete"

class VideoService {
  private static instance: VideoService
  private cache: Map<string, CacheItem<any>> = new Map()
  private existingTitles: Set<string> = new Set()
  private isLoadingAllVideos = false
  private allVideosPromise: Promise<Video[]> | null = null

  private constructor() {
    this.initializeCache()
    // Start background loading of all videos
    this.initializeBackgroundLoading()
  }

  public static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService()
    }
    return VideoService.instance
  }

  private initializeCache(): void {
    // Load cache from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const savedCache = localStorage.getItem("video_cache")
        if (savedCache) {
          const parsed = JSON.parse(savedCache)
          this.cache = new Map(parsed)
        }
      } catch (error) {
        console.warn("Failed to load cache from localStorage:", error)
      }
    }
  }

  private initializeBackgroundLoading(): void {
    // Start loading all videos in background after a short delay
    if (typeof window !== "undefined") {
      setTimeout(() => {
        this.getAllVideos().catch((error) => {
          console.warn("Background loading failed:", error)
        })
      }, 2000) // 2 second delay
    }
  }

  private saveCache(): void {
    if (typeof window !== "undefined") {
      try {
        const cacheArray = Array.from(this.cache.entries())
        localStorage.setItem("video_cache", JSON.stringify(cacheArray))
      } catch (error) {
        console.warn("Failed to save cache to localStorage:", error)
      }
    }
  }

  // ========== COMPLETE DATA LOADING ==========

  public async getAllVideos(): Promise<Video[]> {
    const cached = this.getCache<Video[]>(ALL_VIDEOS_CACHE_KEY)
    if (cached && cached.length > 0) {
      return cached
    }

    // Prevent multiple simultaneous requests
    if (this.isLoadingAllVideos && this.allVideosPromise) {
      return this.allVideosPromise
    }

    this.isLoadingAllVideos = true
    this.allVideosPromise = this.loadAllVideosInternal()

    try {
      const result = await this.allVideosPromise
      return result
    } finally {
      this.isLoadingAllVideos = false
      this.allVideosPromise = null
    }
  }

  private async loadAllVideosInternal(): Promise<Video[]> {
    let allVideos: Video[] = []
    let currentPage = 1
    let totalPages = 1
    const perPage = 100 // Maximum allowed by API
    const maxPages = 50 // Safety limit to prevent infinite loops

    console.log("Starting to load all videos...")

    try {
      while (currentPage <= totalPages && currentPage <= maxPages) {
        console.log(`Loading page ${currentPage}/${totalPages}...`)

        const response = await this.getListFiles(currentPage, perPage)

        if (response.result?.files && response.result.files.length > 0) {
          allVideos = [...allVideos, ...response.result.files]
          console.log(`Loaded ${response.result.files.length} videos from page ${currentPage}`)
        }

        // Update total pages if available
        if (response.result?.total_pages && response.result.total_pages !== totalPages) {
          totalPages = Math.min(response.result.total_pages, maxPages)
          console.log(`Updated total pages to: ${totalPages}`)
        }

        // Break if no more videos
        if (!response.result?.files || response.result.files.length === 0) {
          console.log("No more videos found, stopping...")
          break
        }

        currentPage++

        // Add small delay to prevent overwhelming the API
        if (currentPage <= totalPages) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      console.log(`Completed loading all videos. Total: ${allVideos.length}`)

      // Remove duplicates based on file_code
      const uniqueVideos = this.removeDuplicateVideos(allVideos)
      console.log(`After deduplication: ${uniqueVideos.length} unique videos`)

      // Cache the complete dataset
      this.setCache(ALL_VIDEOS_CACHE_KEY, uniqueVideos, CACHE_DURATION_ALL_VIDEOS)

      return uniqueVideos
    } catch (error) {
      console.error("Error loading all videos:", error)
      // Return whatever we've collected so far
      const uniqueVideos = this.removeDuplicateVideos(allVideos)
      if (uniqueVideos.length > 0) {
        this.setCache(ALL_VIDEOS_CACHE_KEY, uniqueVideos, CACHE_DURATION_ALL_VIDEOS)
      }
      return uniqueVideos
    }
  }

  private removeDuplicateVideos(videos: Video[]): Video[] {
    const seen = new Set<string>()
    const unique: Video[] = []

    for (const video of videos) {
      if (video.file_code && !seen.has(video.file_code)) {
        seen.add(video.file_code)
        unique.push(video)
      }
    }

    return unique
  }

  // ========== ENHANCED CORE FUNCTIONALITY ==========

  public async getVideo(id: string): Promise<Video> {
    if (!id || id.trim() === "") {
      throw new Error("Video ID is required")
    }

    // Priority 1: Check mobile cache
    const mobileCacheKey = `mobile_video_${this.md5(id)}`
    const mobileCache = this.getCache(mobileCacheKey)
    if (mobileCache && !mobileCache.error && mobileCache.file_code) {
      return mobileCache
    }

    // Priority 2: Check home cache
    const homeCache = await this.searchInHomeCache(id)
    if (homeCache) {
      this.setCache(mobileCacheKey, homeCache, CACHE_DURATION_VIDEO)
      return homeCache
    }

    // Priority 3: Check complete cache
    try {
      const allVideos = await this.getAllVideos()
      const found = allVideos.find((v) => v.file_code === id)
      if (found) {
        this.setCache(mobileCacheKey, found, CACHE_DURATION_VIDEO)
        return found
      }
    } catch (error) {
      console.warn("Error checking complete cache:", error)
    }

    // Get old cache (without expiry check)
    const oldCache = this.getCacheWithoutExpiry(mobileCacheKey)

    try {
      // Use internal API route as fallback
      const response = await fetch(`/api/video/${id}`, {
        cache: "no-cache",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.result && Array.isArray(data.result) && data.result.length > 0) {
        const videoData = this.normalizeVideoFromAPI(data.result[0], data.api_source)
        this.setCache(mobileCacheKey, videoData, CACHE_DURATION_VIDEO)
        return videoData
      }

      // Return old cache if available
      if (oldCache && !oldCache.error && oldCache.file_code) {
        return oldCache
      }

      throw new Error("Video not found")
    } catch (error) {
      console.error("Error fetching video:", error)

      // Return old cache if available
      if (oldCache && !oldCache.error && oldCache.file_code) {
        return oldCache
      }

      throw new Error("Failed to fetch video from all APIs or video not found")
    }
  }

  public async getListFiles(page = 1, perPage = 100): Promise<ApiResponse> {
    const listCacheKey = `list_page_${page}_per_${perPage}`
    const cached = this.getCache(listCacheKey)
    if (cached && cached.result?.files?.length > 0) {
      return cached
    }

    const oldCache = this.getCacheWithoutExpiry(listCacheKey)

    try {
      // Use internal API route
      const response = await fetch(`/api/videos?page=${page}&per_page=${perPage}`, {
        cache: "no-cache",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Normalize the response
      const normalizedFiles =
        data.result?.files?.map((file: any) => this.normalizeVideoFromAPI(file, data.api_source)) || []

      const result: ApiResponse = {
        server_time: new Date().toISOString(),
        status: data.status || 200,
        msg: data.msg || "OK",
        result: {
          per_page_limit: perPage,
          total_pages: data.result?.total_pages || 1,
          current_page: page,
          results_total: data.result?.results_total || normalizedFiles.length,
          files: normalizedFiles,
        },
        api_source: data.api_source || "unknown",
      }

      if (normalizedFiles.length > 0) {
        this.setCache(listCacheKey, result, CACHE_DURATION_LIST)
        return result
      }

      if (oldCache && oldCache.result?.files?.length > 0) {
        return oldCache
      }

      return result
    } catch (error) {
      console.error("Error fetching video list:", error)

      if (oldCache && oldCache.result?.files?.length > 0) {
        return oldCache
      }

      // Return empty result instead of throwing
      return {
        server_time: new Date().toISOString(),
        status: 500,
        msg: "Failed to fetch videos",
        result: {
          per_page_limit: perPage,
          total_pages: 1,
          current_page: page,
          results_total: 0,
          files: [],
        },
        api_source: "error",
      }
    }
  }

  public async getSearch(query = ""): Promise<SearchResult[]> {
    const originalQuery = query.trim()
    if (!originalQuery) return []

    // Save recent search
    this.saveRecentSearch(originalQuery)

    const fullQueryCacheKey = `search_full_${this.md5(originalQuery.toLowerCase())}`
    const cached = this.getCache(fullQueryCacheKey)
    if (cached) return cached

    const oldCache = this.getCacheWithoutExpiry(fullQueryCacheKey)

    // Priority 1: Check complete cache for better search results
    try {
      const allVideos = await this.getAllVideos()
      if (allVideos.length > 0) {
        const results = this.searchInCompleteData(allVideos, originalQuery)
        if (results.length > 0) {
          this.setCache(fullQueryCacheKey, results, CACHE_DURATION_SEARCH_FULL)
          return results
        }
      }
    } catch (error) {
      console.warn("Error searching complete cache:", error)
    }

    // Priority 2: Use API search as fallback
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(originalQuery)}`, {
        cache: "no-cache",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Search API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const results = data.result || []
      const scoredItems: SearchResult[] = results.map((item: any) => {
        const normalizedItem = this.normalizeVideoFromAPI(item, data.api_source)
        const relevance = this.calculateRelevance(normalizedItem, originalQuery)
        return { ...normalizedItem, relevance }
      })

      // Sort by relevance
      scoredItems.sort((a, b) => b.relevance - a.relevance)

      if (scoredItems.length > 0) {
        this.setCache(fullQueryCacheKey, scoredItems, CACHE_DURATION_SEARCH_FULL)
        return scoredItems
      }

      if (oldCache && oldCache.length > 0) {
        return oldCache
      }

      return []
    } catch (error) {
      console.error("Error searching videos:", error)

      if (oldCache && oldCache.length > 0) {
        return oldCache
      }
      return []
    }
  }

  private searchInCompleteData(allVideos: Video[], query: string): SearchResult[] {
    const fullQueryLower = query.toLowerCase()
    const searchTerms = fullQueryLower.split(" ").filter((term) => term.length > 0)

    const results = allVideos.filter((video) => {
      const titleLower = video.title.toLowerCase()
      const descriptionLower = video.description.toLowerCase()
      const fileCodeLower = video.file_code.toLowerCase()

      // Check if any search term matches
      return (
        titleLower.includes(fullQueryLower) ||
        descriptionLower.includes(fullQueryLower) ||
        fileCodeLower.includes(fullQueryLower) ||
        searchTerms.some(
          (term) =>
            titleLower.includes(term) || descriptionLower.includes(term) || video.tag.some((tag) => tag.includes(term)),
        )
      )
    })

    // Calculate relevance and sort
    const scoredResults: SearchResult[] = results
      .map((video) => ({
        ...video,
        relevance: this.calculateRelevance(video, query),
      }))
      .sort((a, b) => b.relevance - a.relevance)

    return scoredResults.slice(0, 100) // Limit to top 100 results
  }

  private calculateRelevance(video: Video, query: string): number {
    const titleLower = video.title.toLowerCase()
    const queryLower = query.toLowerCase()
    const searchTerms = queryLower.split(" ")
    let relevance = 0

    // Exact query match in title
    if (titleLower.includes(queryLower)) {
      relevance += 20
    }

    // Title starts with query
    if (titleLower.startsWith(queryLower)) {
      relevance += 15
    }

    // Individual term matches
    for (const term of searchTerms) {
      if (titleLower.includes(term)) {
        relevance += 5
      }
      if (video.description.toLowerCase().includes(term)) {
        relevance += 2
      }
      if (video.tag.some((tag) => tag.toLowerCase().includes(term))) {
        relevance += 3
      }
      if (video.file_code.toLowerCase().includes(term)) {
        relevance += 1
      }
    }

    // Boost for higher view count
    relevance += Math.min(video.views / 1000, 10)

    return relevance
  }

  // ========== UTILITY METHODS ==========

  public async getVideosByCategory(category: string): Promise<Video[]> {
    try {
      const allVideos = await this.getAllVideos()
      return allVideos.filter((video) => video.tag.some((tag) => tag.toLowerCase().includes(category.toLowerCase())))
    } catch (error) {
      console.error("Error getting videos by category:", error)
      return []
    }
  }

  public async getPopularVideos(limit = 20): Promise<Video[]> {
    try {
      const allVideos = await this.getAllVideos()
      return allVideos.sort((a, b) => b.views - a.views).slice(0, limit)
    } catch (error) {
      console.error("Error getting popular videos:", error)
      return []
    }
  }

  public async getRecentVideos(limit = 20): Promise<Video[]> {
    try {
      const allVideos = await this.getAllVideos()
      return allVideos.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime()).slice(0, limit)
    } catch (error) {
      console.error("Error getting recent videos:", error)
      return []
    }
  }

  public async getRelatedVideos(video: Video, limit = 10): Promise<Video[]> {
    try {
      const allVideos = await this.getAllVideos()
      const related = allVideos
        .filter((v) => v.file_code !== video.file_code)
        .map((v) => ({
          ...v,
          relevance: this.calculateSimilarity(video, v),
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit)

      return related
    } catch (error) {
      console.error("Error getting related videos:", error)
      return []
    }
  }

  private calculateSimilarity(video1: Video, video2: Video): number {
    let similarity = 0

    // Check common tags
    const commonTags = video1.tag.filter((tag) => video2.tag.includes(tag))
    similarity += commonTags.length * 5

    // Check title similarity
    const words1 = video1.title.toLowerCase().split(" ")
    const words2 = video2.title.toLowerCase().split(" ")
    const commonWords = words1.filter((word) => words2.includes(word))
    similarity += commonWords.length * 2

    // Same source bonus
    if (video1.source === video2.source) {
      similarity += 3
    }

    return similarity
  }

  public getLoadingProgress(): {
    isLoading: boolean
    totalVideos: number
    hasCompleteData: boolean
  } {
    const allVideosCache = this.getCache<Video[]>(ALL_VIDEOS_CACHE_KEY)
    return {
      isLoading: this.isLoadingAllVideos,
      totalVideos: allVideosCache ? allVideosCache.length : 0,
      hasCompleteData: Boolean(allVideosCache && allVideosCache.length > 0),
    }
  }

  public async refreshAllVideos(): Promise<Video[]> {
    // Clear the cache and reload
    this.cache.delete(ALL_VIDEOS_CACHE_KEY)
    return this.getAllVideos()
  }

  // ========== EXISTING METHODS (unchanged) ==========

  private async searchInHomeCache(id: string): Promise<Video | null> {
    try {
      // Search in recent list caches
      for (let page = 1; page <= 5; page++) {
        const cacheKey = `list_page_${page}_per_30`
        const listCache = this.getCacheWithoutExpiry(cacheKey)
        if (listCache && listCache.result?.files) {
          const found = listCache.result.files.find((file: any) => file.file_code === id)
          if (found) {
            return found
          }
        }
      }
      return null
    } catch (error) {
      return null
    }
  }

  private normalizeVideoFromAPI(item: any, source: string): Video {
    if (!item) {
      throw new Error("Invalid video item")
    }

    const fileCode = item.file_code || item.filecode || ""
    if (!fileCode) {
      throw new Error("Missing file code")
    }

    const rawTitle = item.title || item.file_title || "Untitled Video"
    const cleanTitle = this.cleanAndFormatTitle(rawTitle)
    const titleWords = this.extractTitleWords(rawTitle)
    const description = this.generateLongSeoDescription(rawTitle, titleWords)

    return {
      protected_embed: item.protected_embed || this.generateEmbedUrl(fileCode, source),
      size: item.size ? this.formatBytes(Number(item.size)) : "",
      length: item.length ? this.formatDuration(item.length) : "00:00:00",
      protected_dl: item.download_url || this.generateDownloadUrl(fileCode, source),
      views: Number(item.views || item.file_views) || 0,
      single_img: item.single_img || item.player_img || `/placeholder.svg?height=360&width=640`,
      title: cleanTitle,
      status: item.status || "active",
      uploaded: item.uploaded || item.file_created || new Date().toISOString(),
      last_view: item.last_view || "",
      splash_img: item.splash_img || item.single_img || item.player_img || `/placeholder.svg?height=360&width=640`,
      filecode: fileCode,
      file_code: fileCode,
      canplay: item.canplay !== false,
      source: source || "unknown",
      tag: titleWords,
      description: description,
    }
  }

  private generateEmbedUrl(fileCode: string, source: string): string {
    switch (source) {
      case "doodapi":
        return `https://dodl.pages.dev/${fileCode}`
      case "lulustream":
        return `https://luvluv.pages.dev/${fileCode}`
      case "sdsd":
        return `https://sdsd-8n8.pages.dev/${fileCode}`
      default:
        return `https://dodl.pages.dev/${fileCode}`
    }
  }

  private generateDownloadUrl(fileCode: string, source: string): string {
    switch (source) {
      case "doodapi":
        return `https://doodstream.com/d/${fileCode}`
      case "lulustream":
        return `https://lulustream.com/dl/${fileCode}`
      default:
        return `https://doodstream.com/d/${fileCode}`
    }
  }

  private cleanAndFormatTitle(title: string | null): string {
    if (!title) return "Untitled Video"

    // Clean the title
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Process words - remove duplicates
    const words = cleanTitle.split(" ")
    const uniqueWords: string[] = []
    const usedWords = new Set<string>()

    for (const word of words) {
      const lowerWord = word.toLowerCase()
      if (!usedWords.has(lowerWord) && word.length > 0) {
        const formattedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        uniqueWords.push(formattedWord)
        usedWords.add(lowerWord)
      }
    }

    // Add random words if too short
    if (uniqueWords.length < 8) {
      const needed = 8 - uniqueWords.length
      const randomWords = this.getRandomWords(needed)

      for (const word of randomWords) {
        const lowerWord = word.toLowerCase()
        if (!usedWords.has(lowerWord)) {
          uniqueWords.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          usedWords.add(lowerWord)
          if (uniqueWords.length >= 8) break
        }
      }
    }

    // Trim to exactly 8 words
    let finalTitle = uniqueWords.slice(0, 8).join(" ")

    // Ensure unique among existing titles
    let counter = 1
    const originalTitle = finalTitle
    while (this.existingTitles.has(finalTitle)) {
      finalTitle = `${originalTitle} ${counter}`
      counter++
    }

    this.existingTitles.add(finalTitle)
    return finalTitle
  }

  private extractTitleWords(title: string): string[] {
    const words = title
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0)

    const excludedWords = new Set(["dan", "atau", "yang", "di", "ke", "dari", "untuk", "dengan", "ini", "itu"])

    return Array.from(new Set(words.filter((w) => w.length > 2 && !excludedWords.has(w)))).slice(0, 15)
  }

  private getRandomWords(count?: number): string[] {
    const words = [
      "sotwe",
      "bokep",
      "twitter",
      "simontok",
      "terbaru",
      "video",
      "viral",
      "streaming",
      "indo",
      "telegram",
      "full",
      "album",
      "doodstream",
      "lulustream",
      "download",
      "hd",
      "quality",
      "movie",
      "film",
      "content",
    ]

    if (count) {
      const shuffled = [...words].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    }
    return words
  }

  public getCacheStats(): {
    totalItems: number
    cacheSize: string
    oldestItem: string | null
    newestItem: string | null
    allVideosCount: number
    isLoadingAll: boolean
  } {
    const items = Array.from(this.cache.entries())
    const allVideosCache = this.getCache(ALL_VIDEOS_CACHE_KEY)

    let oldestTime = Number.POSITIVE_INFINITY
    let newestTime = 0
    let oldestKey = null
    let newestKey = null

    for (const [key, item] of items) {
      if (item.expiry < oldestTime) {
        oldestTime = item.expiry
        oldestKey = key
      }
      if (item.expiry > newestTime) {
        newestTime = item.expiry
        newestKey = key
      }
    }

    const sizeInBytes = JSON.stringify(items).length

    return {
      totalItems: items.length,
      cacheSize: this.formatBytes(sizeInBytes),
      oldestItem: oldestKey,
      newestItem: newestKey,
      allVideosCount: allVideosCache ? allVideosCache.length : 0,
      isLoadingAll: this.isLoadingAllVideos,
    }
  }

  public clearCache(): void {
    this.cache.clear()
    this.existingTitles.clear()
    if (typeof window !== "undefined") {
      localStorage.removeItem("video_cache")
    }
  }

  public clearExpiredCache(): number {
    const now = Date.now()
    let cleared = 0

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
        cleared++
      }
    }

    this.saveCache()
    return cleared
  }

  private formatDuration(duration: number | string): string {
    if (!duration) return "00:00:00"

    let seconds: number

    if (typeof duration === "string") {
      if (duration.includes(":")) {
        const parts = duration.split(":").map(Number)
        if (parts.length === 3) {
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
        } else if (parts.length === 2) {
          seconds = parts[0] * 60 + parts[1]
        } else {
          seconds = Number(duration) || 0
        }
      } else {
        seconds = Number(duration) || 0
      }
    } else {
      seconds = Number(duration) || 0
    }

    if (isNaN(seconds) || seconds < 0) {
      return "00:00:00"
    }

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":")
  }

  private formatBytes(bytes: number | string, precision = 2): string {
    const numBytes = Number(bytes)

    if (!numBytes || numBytes < 0 || isNaN(numBytes)) return "0 B"

    const units = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(numBytes) / Math.log(1024))
    const size = numBytes / Math.pow(1024, i)

    return `${size.toFixed(precision)} ${units[Math.min(i, units.length - 1)]}`
  }

  private generateLongSeoDescription(title: string, tags: string[]): string {
    const keywords = [...tags, ...this.getRandomWords(10)]
    const baseTitle = this.cleanAndFormatTitle(title)

    const paragraphs = [
      `${baseTitle} - Streaming dan download video terbaru. Temukan berbagai video menarik dengan kualitas terbaik dan update setiap hari.`,
      `Video ini cocok untuk kamu yang mencari hiburan, edukasi, dan konten viral terkini dengan kata kunci: ${keywords.slice(0, 10).join(", ")}.`,
      `Jangan lewatkan kesempatan untuk menonton dan mengunduh video favoritmu di sini. Selamat menikmati!`,
    ]

    return paragraphs.join("\n\n")
  }

  private saveRecentSearch(keyword: string): void {
    if (typeof window !== "undefined") {
      try {
        const recent = JSON.parse(localStorage.getItem("recent_searches") || "[]")
        const updated = [keyword, ...recent.filter((k: string) => k !== keyword)].slice(0, 10)
        localStorage.setItem("recent_searches", JSON.stringify(updated))
      } catch (error) {
        console.warn("Failed to save recent search:", error)
      }
    }
  }

  // ========== CACHE MANAGEMENT ==========

  private getCache<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  private getCacheWithoutExpiry<T>(key: string): T | null {
    const item = this.cache.get(key)
    return item ? item.data : null
  }

  private setCache<T>(key: string, data: T, duration: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + duration,
    })
    this.saveCache()
  }

  private md5(str: string): string {
    // Simple hash function for cache keys
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }
}

export const videoService = VideoService.getInstance()
