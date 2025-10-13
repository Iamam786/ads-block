import { Card } from "../components/ui/card"
export default function Features() {

    return (
        <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card border-border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                    </svg>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">No Ads</h3>
                <p className="text-sm text-muted-foreground text-balance">
                    Watch videos without any interruptions or advertisements
                </p>
            </Card>

            <Card className="p-6 bg-card border-border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Fast Loading</h3>
                <p className="text-sm text-muted-foreground text-balance">
                    Optimized embed player for quick video loading and playback
                </p>
            </Card>

            <Card className="p-6 bg-card border-border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Privacy Focused</h3>
                <p className="text-sm text-muted-foreground text-balance">
                    Uses youtube-nocookie.com for enhanced privacy protection
                </p>
            </Card>
        </div>
    )
}