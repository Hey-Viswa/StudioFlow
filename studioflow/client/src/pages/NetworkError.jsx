import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function NetworkError() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-8 relative w-64 h-64 mx-auto">
                <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <WifiOff className="w-32 h-32 text-muted-foreground/50" />
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-4 h-4 bg-destructive rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="absolute bottom-10 left-0 w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                <div className="absolute top-10 left-10 w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-2">Connection Lost</h1>
            <p className="text-muted-foreground max-w-[500px] mb-8">
                We're having trouble connecting to the server. This could be due to a poor internet connection or a temporary server issue.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => window.location.reload()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                </Button>
            </div>
        </div>
    )
}
