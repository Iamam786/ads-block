"use client"
import { Search, Play } from "lucide-react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"

export default function SearchBar({ searchInput, setSearchInput, handleSearch }: any) {
    return (
        <div className="max-w-3xl mx-auto mb-12">
            <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Paste YouTube URL or Video ID..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-12 h-14 text-lg bg-card border-border focus:border-primary transition-colors"
                    />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Play className="h-5 w-5 mr-2" />
                    Watch
                </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-4 text-center">
                Supports: youtube.com/watch?v=..., youtu.be/..., or direct video ID
            </p>
        </div>
    )
}
