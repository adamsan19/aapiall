import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || ""

  if (!query.trim()) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  const timeout = 10000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Try Doodapi search
    const doodUrl = `https://doodapi.com/api/search/videos?key=112623ifbcbltzajwjrpjx&search_term=${encodeURIComponent(query)}`

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
      console.log("Doodapi search failed, generating mock results...")
    }

    // Generate mock search results if API fails
    const mockResults = Array.from({ length: 10 }, (_, i) => {
      const id = `search_${query}_${i + 1}_${Date.now()}`
      return {
        file_code: id,
        filecode: id,
        title: `${query} Video Result ${i + 1}`,
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
      msg: "OK (Mock Search Results)",
      result: mockResults,
      api_source: "mock",
    })
  } catch (error) {
    clearTimeout(timeoutId)
    console.error("Search API Error:", error)

    // Return mock results on error
    const mockResults = Array.from({ length: 5 }, (_, i) => {
      const id = `error_search_${query}_${i + 1}_${Date.now()}`
      return {
        file_code: id,
        filecode: id,
        title: `${query} Sample Result ${i + 1}`,
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
      msg: "OK (Mock Search Results)",
      result: mockResults,
      api_source: "mock",
    })
  }
}
