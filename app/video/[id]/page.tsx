import type { Metadata } from "next"
import VideoPlayer from "../../../components/VideoPlayer"
import { videoService } from "../../../services/VideoService"

interface VideoPageProps {
  params: Promise<{ id: string }>
}

// Generate SEO-optimized slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

// Format duration for schema
function formatDurationForSchema(duration: string): string {
  const parts = duration.split(":")
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return `PT${hours}H${minutes}M${seconds}S`
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts
    return `PT${minutes}M${seconds}S`
  }
  return "PT0M0S"
}

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const video = await videoService.getVideo(id)
    const slug = generateSlug(video.title)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://videostream.app"

    // Create SEO-optimized title (50-60 characters)
    const seoTitle = `${video.title.slice(0, 35)} - Video ${video.source} | VideoStream`

    // Create SEO-optimized description (120-160 characters)
    const seoDescription = `Nonton ${video.title} gratis! Durasi ${video.length}, ${video.views.toLocaleString()} views, kualitas HD. Download sekarang juga!`

    return {
      title: seoTitle,
      description: seoDescription,
      keywords: [
        ...video.tag,
        "video streaming",
        "nonton gratis",
        "download video",
        video.source,
        "HD quality",
        "viral video",
      ].join(", "),
      authors: [{ name: "VideoStream Team" }],
      openGraph: {
        title: seoTitle,
        description: seoDescription,
        images: [
          {
            url: video.single_img,
            width: 1200,
            height: 630,
            alt: video.title,
          },
        ],
        type: "video.movie",
        url: `${baseUrl}/video/${id}/${slug}`,
        siteName: "VideoStream",
        videos: [
          {
            url: video.protected_embed,
            width: 1280,
            height: 720,
            type: "text/html",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description: seoDescription,
        images: [video.single_img],
        creator: "@videostream",
        site: "@videostream",
      },
      alternates: {
        canonical: `${baseUrl}/video/${id}/${slug}`,
      },
      other: {
        "og:video:duration": video.length,
        "og:video:release_date": video.uploaded,
        "video:duration": video.length,
        "video:release_date": video.uploaded,
      },
    }
  } catch (error) {
    return {
      title: "Video Not Found - VideoStream",
      description: "The requested video could not be found on VideoStream.",
      robots: "noindex, nofollow",
    }
  }
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params

  let video = null
  let relatedVideos = []

  try {
    video = await videoService.getVideo(id)
    relatedVideos = await videoService.getRelatedVideos(video, 6)
  } catch (error) {
    console.error("Error loading video:", error)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://videostream.app"
  const slug = video ? generateSlug(video.title) : ""

  return (
    <>
      {/* Schema Markup */}
      {video && (
        <>
          {/* VideoObject Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "VideoObject",
                name: video.title,
                description: video.description,
                thumbnailUrl: video.single_img,
                uploadDate: video.uploaded,
                duration: formatDurationForSchema(video.length),
                contentUrl: video.protected_dl,
                embedUrl: video.protected_embed,
                interactionStatistic: {
                  "@type": "InteractionCounter",
                  interactionType: { "@type": "WatchAction" },
                  userInteractionCount: video.views,
                },
                publisher: {
                  "@type": "Organization",
                  name: "VideoStream",
                  logo: {
                    "@type": "ImageObject",
                    url: `${baseUrl}/logo.png`,
                  },
                },
                potentialAction: {
                  "@type": "WatchAction",
                  target: `${baseUrl}/video/${id}/${slug}`,
                },
              }),
            }}
          />

          {/* BreadcrumbList Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Beranda",
                    item: baseUrl,
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Video Viral",
                    item: `${baseUrl}/popular`,
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: video.title,
                    item: `${baseUrl}/video/${id}/${slug}`,
                  },
                ],
              }),
            }}
          />

          {/* ItemList Schema for Related Videos */}
          {relatedVideos.length > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  name: "Video Terkait",
                  itemListElement: relatedVideos.map((relatedVideo, index) => ({
                    "@type": "VideoObject",
                    position: index + 1,
                    name: relatedVideo.title,
                    description: relatedVideo.description,
                    thumbnailUrl: relatedVideo.single_img,
                    uploadDate: relatedVideo.uploaded,
                    duration: formatDurationForSchema(relatedVideo.length),
                    url: `${baseUrl}/video/${relatedVideo.file_code}/${generateSlug(relatedVideo.title)}`,
                  })),
                }),
              }}
            />
          )}
        </>
      )}

      {/* Preload critical resources */}
      {video && (
        <>
          <link rel="preload" href={video.single_img} as="image" />
          <link rel="prefetch" href={video.protected_embed} />
        </>
      )}

      <div className="min-h-screen bg-background">
        <main className="py-8">
          <VideoPlayer videoId={id} />
        </main>
      </div>
    </>
  )
}
