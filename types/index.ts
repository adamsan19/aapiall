export interface Video {
  file_code: string
  title: string
  description: string
  length: string
  views: number
  single_img: string
  splash_img: string
  protected_embed: string
  protected_dl: string
  uploaded: string
  status: string
  canplay: boolean
  source: string
  tag: string[]
  size: string
}

export interface ApiResponse {
  status: number
  msg: string
  result: {
    files: Video[]
    total_pages: number
    current_page: number
    results_total: number
    per_page_limit: number
  }
  api_source: string
  server_time: string
}

export interface CacheItem<T> {
  data: T
  expiry: number
}

export interface SearchResult extends Video {
  relevance: number
}
