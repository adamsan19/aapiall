import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const perPage = Number.parseInt(searchParams.get("per_page") || "30")

  const timeout = 10000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Try Doodapi first
    const doodUrl = `https://doodapi.com/api/file/list?key=112623ifbcbltzajwjrpjx&per_page=${perPage}&page=${page}`

    try {
      const doodResponse = await fetch(doodUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      if (doodResponse.ok) {
        const data = await doodResponse.json()
        clearTimeout(timeoutId)
        return NextResponse.json({ ...data, api_source: "doodapi" })
      }
    } catch (doodError) {
      console.log("Doodapi failed, trying Lulustream...")
    }

    // Try Lulustream
    const luluUrl = `https://api.lulustream.com/api/file/list?key=37943j35tc5i1bg3gje5y&per_page=${perPage}&page=${page}`

    try {
      const luluResponse = await fetch(luluUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      if (luluResponse.ok) {
        const data = await luluResponse.json()
        clearTimeout(timeoutId)
        return NextResponse.json({ ...data, api_source: "lulustream" })
      }
    } catch (luluError) {
      console.log("Lulustream failed, generating mock data...")
    }

    // Generate mock data if all APIs fail
    const mockVideos = Array.from({ length: perPage }, (_, i) => {
      const id = `mock_${page}_${i + 1}_${Date.now()}`
      return {
        file_code: id,
        filecode: id,
        title: `Sample Video ${page}-${i + 1}`,
        size: Math.floor(Math.random() * 100000000) + 10000000, // 10MB - 100MB
        length: Math.floor(Math.random() * 3600) + 300, // 5min - 1hour
        views: Math.floor(Math.random() * 50000),
        single_img: `/placeholder.svg?height=360&width=640`,
        splash_img: `/placeholder.svg?height=360&width=640`,
        protected_embed: `https://dodl.pages.dev/${id}`,
        download_url: `https://doodstream.com/d/${id}`,
        uploaded: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        canplay: true,
      }
    })

    return NextResponse.json({
      status: 200,
      msg: "OK",
      result: {
        files: mockVideos,
        total_pages: 100, // Mock total pages
        results_total: 3000, // Mock total results
        per_page_limit: perPage,
        current_page: page,
      },
      api_source: "mock",
    })
  } catch (error) {
    clearTimeout(timeoutId)
    console.error("API Error:", error)

    // Return mock data on error
    const mockVideos = Array.from({ length: perPage }, (_, i) => {
      const id = `error_${page}_${i + 1}_${Date.now()}`
      return {
        file_code: id,
        filecode: id,
        title: `Sample Video ${page}-${i + 1}`,
        size: Math.floor(Math.random() * 100000000) + 10000000,
        length: Math.floor(Math.random() * 3600) + 300,
        views: Math.floor(Math.random() * 50000),
        single_img: `/placeholder.svg?height=360&width=640`,
        splash_img: `/placeholder.svg?height=360&width=640`,
        protected_embed: `https://dodl.pages.dev/${id}`,
        download_url: `https://doodstream.com/d/${id}`,
        uploaded: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        canplay: true,
      }
    })

    return NextResponse.json({
      status: 200,
      msg: "OK (Mock Data)",
      result: {
        files: mockVideos,
        total_pages: 100,
        results_total: 3000,
        per_page_limit: perPage,
        current_page: page,
      },
      api_source: "mock",
    })
  }
}
