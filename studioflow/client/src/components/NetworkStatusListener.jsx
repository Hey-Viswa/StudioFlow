import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export default function NetworkStatusListener() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const location = useLocation();

    useEffect(() => {
        const handleOnline = () => {
            toast.success('Back online!');
            setIsOffline(false);
        };

        const handleOffline = () => {
            toast.error('No internet connection');
            setIsOffline(true);
        };

        const handleApiError = () => {
            setIsOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        // window.addEventListener('api-network-error', handleApiError); // Removed: Let individual components handle API errors via Toast

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            // window.removeEventListener('api-network-error', handleApiError);
        };
    }, []);

    // Don't show overlay if we are already on the dedicated error page (legacy support)
    if (location.pathname === '/network-error') return null;

    if (!isOffline) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
            <div className="mb-8 relative w-64 h-64 mx-auto">
                <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <WifiOff className="w-32 h-32 text-muted-foreground/50" />
                </div>
                <div className="absolute top-0 right-0 w-4 h-4 bg-destructive rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="absolute bottom-10 left-0 w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                <div className="absolute top-10 left-10 w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-2">Connection Lost</h1>
            <p className="text-muted-foreground max-w-[500px] mb-8">
                We're having trouble connecting to the server. Your work is saved locally and will be synced when connection is restored.
            </p>

            <Button 
                onClick={() => {
                    if (navigator.onLine) {
                        setIsOffline(false);
                        toast.success('Connection restored!');
                    } else {
                        toast.error('Still offline. Please check your connection.');
                    }
                }} 
                className="gap-2"
            >
                <RefreshCw className="h-4 w-4" />
                Try Again
            </Button>
        </div>
    );
}
