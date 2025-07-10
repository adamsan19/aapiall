import VideoList from "../components/VideoList"
import LoadingProgress from "../components/LoadingProgress"
import VideoCategories from "../components/VideoCategories"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 space-y-8">
          <LoadingProgress />
          <VideoCategories />
          <VideoList />
        </div>
      </div>
    </div>
  )
}
