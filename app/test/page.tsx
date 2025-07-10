import VideoServiceTest from "../../components/VideoServiceTest"

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">VideoService Test Suite</h1>
          <p className="text-muted-foreground mt-2">Test all VideoService functionality</p>
        </div>
      </header>

      <main className="py-8">
        <VideoServiceTest />
      </main>
    </div>
  )
}
