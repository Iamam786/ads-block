"use client"
export default function Header() {
    return (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">
                        <span className="text-primary">Ad-Free</span> YouTube Viewer
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm text-muted-foreground">No Ads</span>
                    </div>
                </div>
            </div>
        </header>
    )
}
