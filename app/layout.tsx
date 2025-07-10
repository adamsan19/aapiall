import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "../components/Header"
import PreloadManager from "../components/PreloadManager"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Video Streaming Platform",
  description: "Progressive Web App for video streaming with advanced caching and offline support",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  keywords: "video, streaming, pwa, offline, cache",
  authors: [{ name: "VideoStream Team" }],
  openGraph: {
    title: "Video Streaming Platform",
    description: "Progressive Web App for video streaming",
    type: "website",
    siteName: "VideoStream",
  },
  twitter: {
    card: "summary_large_image",
    title: "Video Streaming Platform",
    description: "Progressive Web App for video streaming",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VideoStream" />
        <link rel="apple-touch-icon" href="/placeholder.svg?height=180&width=180" />

        {/* Preload critical resources */}
        <link rel="preload" href="/placeholder.svg?height=360&width=640" as="image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for external APIs */}
        <link rel="dns-prefetch" href="https://doodapi.com" />
        <link rel="dns-prefetch" href="https://api.lulustream.com" />
        <link rel="dns-prefetch" href="https://sdsd-8n8.pages.dev" />
      </head>
      <body className={inter.className}>
        <PreloadManager />
        <Header />
        <main className="min-h-screen">{children}</main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                      
                      // Request notification permission
                      if ('Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission();
                      }
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
              
              // Theme initialization
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
