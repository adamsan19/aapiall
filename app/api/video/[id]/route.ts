import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
  }

  const timeout = 5000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Try Doodapi first
    const doodUrl = `https://doodapi.com/api/file/info?key=112623ifbcbltzajwjrpjx&file_code=${id}`

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
    const luluUrl = `https://api.lulustream.com/api/file/info?key=37943j35tc5i1bg3gje5y&file_code=${id}`

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
      console.log("Lulustream failed, trying SDSD...")
    }

    // Try SDSD
    const sdsdUrl = `https://sdsd-8n8.pages.dev/api/info?file_code=${id}`

    try {
      const sdsdResponse = await fetch(sdsdUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      if (sdsdResponse.ok) {
        const data = await sdsdResponse.json()
        clearTimeout(timeoutId)
        return NextResponse.json({ ...data, api_source: "sdsd" })
      }
    } catch (sdsdError) {
      console.log("SDSD failed")
    }

    // Return mock data if all APIs fail
    return NextResponse.json({
      status: 200,
      result: [
        {
          filecode: id,
          file_code: id,
          title: `Sample Video ${id}`,
          size: 52428800, // 50MB
          length: 1800, // 30 minutes
          views: Math.floor(Math.random() * 10000),
          single_img: `/placeholder.svg?height=360&width=640`,
          splash_img: `/placeholder.svg?height=360&width=640`,
          protected_embed: `https://dodl.pages.dev/${id}`,
          download_url: `https://doodstream.com/d/${id}`,
          uploaded: new Date().toISOString(),
          status: "active",
          canplay: true,
        },
      ],
      api_source: "mock",
    })
  } catch (error) {
    clearTimeout(timeoutId)
    console.error("API Error:", error)

    // Return mock data on error
    return NextResponse.json({
      status: 200,
      result: [
        {
          filecode: id,
          file_code: id,
          title: `Sample Video ${id}`,
          size: 52428800,
          length: 1800,
          views: Math.floor(Math.random() * 10000),
          single_img: `/placeholder.svg?height=360&width=640`,
          splash_img: `/placeholder.svg?height=360&width=640`,
          protected_embed: `https://dodl.pages.dev/${id}`,
          download_url: `https://doodstream.com/d/${id}`,
          uploaded: new Date().toISOString(),
          status: "active",
          canplay: true,
        },
      ],
      api_source: "mock",
    })
  }
}
