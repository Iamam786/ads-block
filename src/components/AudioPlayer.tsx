"use client"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Slider } from "../components/ui/slider"
import { Play, Pause, Volume2, Music } from "lucide-react"


export default function AudioPlayer({
    playerRef,
    isPlaying,
    volume,
    handleVolumeChange,
    togglePlayPause,
    currentTime,
    duration,
    handleSeek,
    formatTime,
}: any) {
    return (
        <Card className="overflow-hidden bg-card border-border p-8">
            <div className="flex flex-col items-center">
                <div className="h-48 w-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8">
                    <Music className="h-24 w-24 text-primary" />
                </div>

                <h3 className="text-xl font-semibold mb-2">Audio Only Mode</h3>
                <p className="text-sm text-muted-foreground mb-8">Playing audio in background</p>

                {/* Audio Controls */}
                <div className="w-full max-w-md space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <Slider
                            value={[currentTime]}
                            max={duration || 100}
                            step={1}
                            onValueChange={handleSeek}
                            className="w-full cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Play/Pause Button */}
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            onClick={togglePlayPause}
                            size="lg"
                            className="h-16 cursor-pointer w-16 rounded-full bg-primary hover:bg-primary/90"
                        >
                            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                        </Button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-3">
                        <Volume2 className="h-5 w-5 text-muted-foreground" />
                        <Slider
                            value={[volume]}
                            max={100}
                            step={1}
                            onValueChange={handleVolumeChange}
                            className="flex-1 cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">{volume}%</span>
                    </div>
                </div>

                {/* Hidden YouTube player for audio */}
                <div ref={playerRef} className="hidden" />
            </div>
        </Card>
    )
}
