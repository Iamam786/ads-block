"use client"
import { Card } from "../components/ui/card"
import { Play, ListMusic } from "lucide-react"

export default function PopularVideos({ setVideoId, setSearchInput, setAudioMode, setIsPlaylist, player }: any) {
    const items = [
        { id: "0lSwWhBnt9U", title: "Qasida Burda Sharif", thumbnail: "qaseida_burda.webp", type: "video" },
        { id: "bs3h5uFw10g", title: "La Ilah Illah", thumbnail: "https://img.youtube.com/vi/bs3h5uFw10g/maxresdefault.jpg", type: "video" },
        { id: "PLhBNEiUn7foa0VxKdAVwzve8X504SpCwF", title: "Top Music Playlist", thumbnail: "/playlist-thumb.jpg", type: "playlist" },
    ]

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-foreground">Try these videos & playlists</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {items.map((item) => (
                    <Card
                        key={item.id}
                        className="overflow-hidden bg-card border-border hover:border-primary transition-all cursor-pointer group"
                        onClick={() => {
                            setVideoId(item.id)
                            setSearchInput(item.id)
                            setAudioMode(false)
                            setIsPlaylist(item.type === "playlist")
                            if (player) player.destroy()
                        }}
                    >
                        <div className="relative aspect-video bg-muted">
                            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                                    {item.type === "playlist" ? (
                                        <ListMusic className="h-6 w-6 text-primary-foreground" />
                                    ) : (
                                        <Play className="h-6 w-6 text-primary-foreground ml-1" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                {item.title}
                            </h3>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
