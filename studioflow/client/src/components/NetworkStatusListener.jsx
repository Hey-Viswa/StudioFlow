import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function NetworkStatusListener() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleOnline = () => {
            toast.success('Back online!');
            // If currently on network error page, go back
            if (location.pathname === '/network-error') {
                // Check if there's a state to go back to, otherwise default to dashboard or home
                const from = location.state?.from?.pathname || '/dashboard';
                navigate(from, { replace: true });
            }
        };

        const handleOffline = () => {
            toast.error('No internet connection');
            // Only navigate if not already there
            if (location.pathname !== '/network-error') {
                navigate('/network-error', { state: { from: location } });
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [navigate, location]);

    return null;
}
