import SearchComponent from "../../components/SearchComponent"

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Search Videos</h1>
          <p className="text-muted-foreground mt-2">Find your favorite videos using our advanced search</p>
        </div>
      </header>

      <main className="py-8">
        <SearchComponent />
      </main>
    </div>
  )
}
