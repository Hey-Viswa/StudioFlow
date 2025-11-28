import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function NetworkError() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-8">
                <img
                    src="/Error-page.svg"
                    alt="Connection Lost"
                    className="w-full max-w-[400px] h-auto mx-auto"
                />
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
