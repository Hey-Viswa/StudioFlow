import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { requestForToken, onMessageListener } from '../lib/firebase';
import { toast } from 'sonner';

/**
 * Hook to manage push notification tokens
 */
export const usePushToken = () => {
    const { user } = useUser();
    const { getToken } = useAuth();
    const [token, setToken] = useState(null);
    const [permission, setPermission] = useState(Notification.permission);

    useEffect(() => {
        if (permission === 'granted' && user?.id) {
            setupToken();
        }
    }, [permission, user?.id]);

    const setupToken = async () => {
        try {
            const currentToken = await requestForToken();
            if (currentToken) {
                setToken(currentToken);
                await registerTokenInBackend(currentToken);
            }
        } catch (error) {
            console.error('Error setting up push token:', error);
        }
    };

    const registerTokenInBackend = async (fcmToken) => {
        try {
            const apiToken = await getToken();
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            await fetch(`${apiUrl}/notifications/register-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiToken}`
                },
                body: JSON.stringify({
                    token: fcmToken,
                    platform: 'web'
                })
            });
            console.log('✅ Device token registered with backend');
        } catch (error) {
            console.error('Failed to register token with backend:', error);
        }
    };

    const requestPermission = async () => {
        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                toast.success('Notifications enabled!');
                setupToken();
            } else {
                toast.error('Notification permission denied');
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            toast.error('Failed to enable notifications');
        }
    };

    return { token, permission, requestPermission };
};
